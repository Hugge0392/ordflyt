import { Router } from "express";
import { db } from "./db";
import { users, sessions, auditLog, failedLogins, emailVerificationTokens, teacherRegistrations, teacherLicenses, schools, teacherSchoolMemberships, insertTeacherRegistrationSchema, insertEmailVerificationTokenSchema } from "@shared/schema";
import { eq, and, gte, isNull } from "drizzle-orm";
import { findOneTimeCode, hashCode, redeemOneTimeCode, createTeacherLicense, logLicenseActivity } from "./licenseDb";
import argon2 from "argon2";
import {
  hashPassword,
  verifyPassword,
  createSession,
  generateCsrfToken,
  logAuditEvent,
  checkLoginAttempts,
  recordFailedLogin,
  loginRateLimit,
  requireAuth,
  requireCsrf,
  generateDeviceFingerprint,
  hashIpAddress,
  rotateSession
} from "./auth";
import { logRequestInfo } from "./productionCheck";
import { emailService } from "./emailService";
import crypto from "crypto";

const router = Router();

// Login endpoint
router.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];
  const deviceFingerprint = generateDeviceFingerprint(req);
  
  // Log request info for debugging in production
  logRequestInfo(req);
  
  // Input validation
  if (!username || !password) {
    await logAuditEvent('LOGIN_ATTEMPT', null, false, ipAddress, userAgent, { reason: 'Missing credentials' });
    return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
  }
  
  try {
    // Check rate limiting
    const canAttempt = await checkLoginAttempts(username, ipAddress, deviceFingerprint);
    if (!canAttempt) {
      await logAuditEvent('LOGIN_BLOCKED', null, false, ipAddress, userAgent, { reason: 'Too many attempts' });
      return res.status(429).json({ error: 'För många inloggningsförsök, försök igen senare' });
    }
    
    // Get user - but don't reveal if user exists or not
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    // Verify password with constant time to prevent timing attacks
    let validPassword = false;
    if (user) {
      // SECURITY: Only allow hardcoded test credentials in development mode with explicit warnings
      if (process.env.NODE_ENV === 'development' && 
          ((username === 'admin' && password === 'admin') ||
           (username === 'larare' && password === 'larare') ||
           (username === 'elev' && password === 'elev'))) {
        console.warn(`🚨 SECURITY WARNING: Using hardcoded test credentials for user '${username}' - ONLY ALLOWED IN DEVELOPMENT!`);
        await logAuditEvent('HARDCODED_LOGIN', user.id, true, ipAddress, userAgent, { 
          username, 
          warning: 'Development hardcoded credentials used' 
        });
        validPassword = true;
      } else {
        try {
          validPassword = await verifyPassword(password, user.passwordHash);
        } catch (error) {
          console.error('Password verification error:', error);
          validPassword = false;
        }
      }
    }
    
    // Always verify something even if user doesn't exist (prevent timing attacks)
    if (!user) {
      // Dummy verification to maintain constant time
      await verifyPassword(password, '$argon2id$v=19$m=65536,t=3,p=4$fakesalt$fakehash');
    }
    
    if (!user || !validPassword) {
      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Invalid credentials');
      await logAuditEvent('LOGIN_FAILED', null, false, ipAddress, userAgent, { username });
      // Generic error message to prevent user enumeration
      return res.status(401).json({ error: 'Felaktiga inloggningsuppgifter' });
    }
    
    // Check if user is active
    if (!user.isActive) {
      await logAuditEvent('LOGIN_BLOCKED', user.id, false, ipAddress, userAgent, { reason: 'User inactive' });
      return res.status(401).json({ error: 'Felaktiga inloggningsuppgifter' });
    }
    
    // Create session
    const session = await createSession(user.id, ipAddress, userAgent, deviceFingerprint, user.role);
    
    // Generate CSRF token
    const csrfToken = await generateCsrfToken(session.id);
    
    // Log successful login
    await logAuditEvent('LOGIN_SUCCESS', user.id, true, ipAddress, userAgent, { role: user.role });
    
    // Set secure cookie with production-safe settings
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' as const : 'strict' as const, // More lenient in production
      maxAge: user.role === 'ELEV' ? 60 * 60 * 1000 : 30 * 60 * 1000, // 1h for students, 30min for teachers/admins
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ordflyt.se' : undefined // Allow subdomain access in production
    };
    
    console.log('Setting session cookie for login with options:', {
      ...cookieOptions,
      domain: cookieOptions.domain || 'default',
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      userRole: user.role
    });
    
    res.cookie('sessionToken', session.sessionToken, cookieOptions);
    
    // Determine redirect based on role
    let redirectPath = '/';
    switch (user.role) {
      case 'ADMIN':
        redirectPath = '/admin';
        break;
      case 'LARARE':
        redirectPath = '/teacher';
        break;
      case 'ELEV':
      default:
        redirectPath = '/menu';
        break;
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      csrfToken,
      redirectPath
    });
    
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAuditEvent('LOGIN_ERROR', null, false, ipAddress, userAgent, { error: errorMessage });
    res.status(500).json({ error: 'Ett fel uppstod vid inloggning' });
  }
});

// Logout endpoint
router.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    if (req.session) {
      // Delete session from database
      await db.delete(sessions).where(eq(sessions.id, req.session.id));
      
      // Log logout event
      await logAuditEvent(
        'LOGOUT',
        req.user?.id || null,
        true,
        req.ip || 'unknown',
        req.headers['user-agent']
      );
    }
    
    // Clear cookie with proper domain settings
    res.clearCookie('sessionToken', {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ordflyt.se' : undefined
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ett fel uppstod vid utloggning' });
  }
});

// Teacher registration endpoint - WITH SECURITY HARDENING AND TEACHER PROFILE SUPPORT
router.post("/api/auth/register", loginRateLimit, async (req, res) => {
  const { 
    username, 
    email, 
    password, 
    code, 
    oneTimeCode, 
    firstName, 
    lastName, 
    schoolName 
  } = req.body;
  const actualCode = code || oneTimeCode; // Support both field names
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];
  
  try {
    // Validate input (actualCode is now optional)
    if (!username || !email || !password || !firstName || !lastName || !schoolName) {
      return res.status(400).json({ error: 'Alla obligatoriska fält krävs (användarnamn, email, lösenord, förnamn, efternamn, skolnamn)' });
    }

    // Validate teacher profile data using schema
    try {
      const teacherProfileData = {
        email,
        firstName,
        lastName,
        schoolName,
        emailVerified: true,
        status: 'account_created' as const
      };
      
      // Validate using insertTeacherRegistrationSchema
      insertTeacherRegistrationSchema.parse(teacherProfileData);
    } catch (validationError: any) {
      return res.status(400).json({ 
        error: 'Ogiltiga profiluppgifter', 
        details: validationError.message 
      });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
      return res.status(400).json({ error: 'Ogiltigt användarnamn format' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ogiltig e-postadress' });
    }

    // Validate password strength
    if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ error: 'Lösenordet uppfyller inte kraven' });
    }

    // Check if username already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ error: 'Användarnamnet är redan taget' });
    }

    // Handle one-time code validation (optional)
    let validatedCode = null;
    let license = null;
    const hasCode = actualCode && actualCode.trim().length > 0;
    
    if (hasCode) {
      // Find and validate one-time code
      const codeHash = hashCode(actualCode);
      const oneTimeCode = await findOneTimeCode(codeHash);

      if (!oneTimeCode) {
        await logLicenseActivity(null, 'registration_failed', { 
          reason: 'invalid_code',
          attempted_username: username,
          attempted_email: email
        }, undefined, ipAddress);
        return res.status(400).json({ error: 'Ogiltig engångskod' });
      }

      // Check if code is already redeemed
      if (oneTimeCode.redeemedAt) {
        await logLicenseActivity(null, 'registration_failed', { 
          reason: 'code_already_redeemed',
          attempted_username: username,
          attempted_email: email,
          code_id: oneTimeCode.id
        }, undefined, ipAddress);
        return res.status(400).json({ error: 'Koden har redan använts' });
      }

      // Check if code has expired
      if (new Date() > oneTimeCode.expiresAt) {
        await logLicenseActivity(null, 'registration_failed', { 
          reason: 'code_expired',
          attempted_username: username,
          attempted_email: email,
          code_id: oneTimeCode.id
        }, undefined, ipAddress);
        return res.status(400).json({ error: 'Koden har gått ut' });
      }

      // Validate email matches code
      if (oneTimeCode.recipientEmail !== email) {
        await logLicenseActivity(null, 'registration_failed', { 
          reason: 'email_mismatch',
          attempted_username: username,
          attempted_email: email,
          code_email: oneTimeCode.recipientEmail,
          code_id: oneTimeCode.id
        }, undefined, ipAddress);
        return res.status(400).json({ 
          error: 'E-postadressen matchar inte koden',
          message: `Koden är utställd för ${oneTimeCode.recipientEmail}`
        });
      }
      
      validatedCode = oneTimeCode;
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    
    const [newUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
      role: 'LARARE',
      isActive: true,
      emailVerified: true,
      mustChangePassword: false
    }).returning();

    // CRITICAL FIX: Create teacher profile record with all profile data
    const [teacherProfile] = await db.insert(teacherRegistrations).values({
      email,
      firstName,
      lastName,
      schoolName,
      emailVerified: true,
      userId: newUser.id,
      status: 'account_created'
    }).returning();

    // Handle license creation if code was provided
    if (hasCode && validatedCode) {
      // Redeem the code and create license
      await redeemOneTimeCode(validatedCode.id, newUser.id);
      license = await createTeacherLicense(newUser.id, validatedCode.id);

      // Log successful licensed registration
      await logLicenseActivity(license.id, 'teacher_registered', { 
        username,
        email,
        code_id: validatedCode.id,
        registration_type: 'licensed'
      }, newUser.id, ipAddress);
    } else {
      // Log successful free registration (no license)
      await logLicenseActivity(null, 'free_registration', { 
        username,
        email,
        registration_type: 'free',
        note: 'Registered without one-time code'
      }, newUser.id, ipAddress);
    }

    // Create session and log the user in
    const deviceFingerprint = generateDeviceFingerprint(req);
    const sessionData = await createSession(newUser.id, ipAddress, userAgent, deviceFingerprint, 'LARARE');

    // Set session cookie with production-safe settings  
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' as const : 'strict' as const,
      maxAge: 30 * 60 * 1000, // 30 minutes for teachers
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ordflyt.se' : undefined
    };
    
    console.log('Setting session cookie for registration with options:', {
      ...cookieOptions,
      domain: cookieOptions.domain || 'default'
    });
    
    res.cookie('sessionToken', sessionData.sessionToken, cookieOptions);

    // Log audit event
    await logAuditEvent('REGISTRATION', newUser.id, true, ipAddress, userAgent, { email });

    // Send registration confirmation email
    try {
      await emailService.sendRegistrationConfirmation(
        newUser.email || email,
        newUser.username
      );
      
      // Log successful email send
      await logLicenseActivity(null, 'registration_email_sent', {
        recipient_email: newUser.email,
        user_id: newUser.id,
        email_type: 'registration_confirmation'
      }, newUser.id, ipAddress);
      
    } catch (emailError: any) {
      console.error('Failed to send registration confirmation email:', emailError);
      
      // Log email failure but don't fail the registration
      await logLicenseActivity(null, 'registration_email_failed', {
        recipient_email: newUser.email,
        user_id: newUser.id,
        error: emailError.message
      }, newUser.id, ipAddress);
    }

    // Determine success message based on registration type
    const successMessage = hasCode && validatedCode 
      ? 'Lärarkonto skapat framgångsrikt med licens! En bekräftelse har skickats till din e-post.'
      : 'Lärarkonto skapat framgångsrikt! Du registrerades som testanvändare. En bekräftelse har skickats till din e-post.';
    
    res.json({
      success: true,
      message: successMessage,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      hasLicense: hasCode && validatedCode,
      redirectPath: '/teacher'
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Log failed registration
    await logLicenseActivity(null, 'registration_failed', { 
      reason: 'server_error',
      error: error.message,
      attempted_username: username,
      attempted_email: email
    }, undefined, ipAddress);

    res.status(500).json({ error: 'Serverfel vid registrering' });
  }
});

// Get current user endpoint
router.get("/api/auth/me", requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Ej inloggad' });
  }
  
  // Generate new CSRF token
  const csrfToken = await generateCsrfToken(req.session!.id);
  
  const response: any = {
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      email: req.user.email,
    },
    csrfToken
  };

  // Add teacher context and school information if available
  if (req.teacherContext) {
    response.teacherContext = req.teacherContext;
  }
  
  if (req.school) {
    response.school = req.school;
  }

  res.json(response);
});

// Session validation endpoint
router.get("/api/auth/validate", requireAuth, async (req, res) => {
  res.json({ valid: true, role: req.user?.role });
});

// Initialize test users (ONLY FOR DEVELOPMENT) - Fixed version
router.post("/api/auth/init-test-users", async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  
  try {
    // Delete existing users first
    await db.delete(users);
    
    // Create test users using the existing hashPassword function
    const testUsers = [
      { username: 'admin', password: 'admin', role: 'ADMIN' as const },
      { username: 'larare', password: 'larare', role: 'LARARE' as const },
      { username: 'elev', password: 'elev', role: 'ELEV' as const },
    ];
    
    for (const testUser of testUsers) {
      const passwordHash = await hashPassword(testUser.password);
      
      console.log(`Creating user ${testUser.username} with hash: ${passwordHash.substring(0, 50)}...`);
      
      await db.insert(users).values({
        username: testUser.username,
        passwordHash,
        role: testUser.role,
        isActive: true,
        emailVerified: false,
      });
    }
    
    res.json({ success: true, message: 'Test users created' });
  } catch (error) {
    console.error('Error creating test users:', error);
    res.status(500).json({ error: 'Failed to create test users' });
  }
});

// Debug endpoint för att rensa rate limiting (endast utveckling)
router.post("/api/auth/clear-rate-limit", async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  
  try {
    // Rensa failed logins
    await db.delete(failedLogins);
    
    res.json({ 
      success: true, 
      message: 'Rate limiting rensad - du kan nu försöka logga in igen'
    });
  } catch (error) {
    console.error('Error clearing rate limit:', error);
    res.status(500).json({ error: 'Failed to clear rate limit' });
  }
});

// Debug endpoint för att kontrollera rate limit status
router.get("/api/auth/rate-limit-status", async (req, res) => {
  try {
    const ipAddress = req.ip || 'unknown';
    
    const recentAttempts = await db
      .select()
      .from(failedLogins)
      .where(
        and(
          eq(failedLogins.ipAddress, ipAddress),
          gte(failedLogins.attemptTime, new Date(Date.now() - 15 * 60 * 1000))
        )
      );

    res.json({
      ip: ipAddress,
      recentAttempts: recentAttempts.length,
      maxAllowed: process.env.NODE_ENV === 'production' ? 5 : 20,
      cooldownMinutes: process.env.NODE_ENV === 'production' ? 15 : 5,
      attempts: recentAttempts.map(attempt => ({
        username: attempt.username,
        time: attempt.attemptTime,
        reason: attempt.reason
      }))
    });
  } catch (error) {
    console.error('Error checking rate limit status:', error);
    res.status(500).json({ error: 'Failed to check rate limit status' });
  }
});

// TEACHER REGISTRATION SYSTEM  
// Step 1: Teacher Registration with Email Verification
router.post("/api/auth/teacher/register", loginRateLimit, async (req, res) => {
  try {
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'];

    // Validate request body with Zod schema
    const validationResult = insertTeacherRegistrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      await logAuditEvent('TEACHER_REGISTRATION_VALIDATION_FAILED', null, false, ipAddress, userAgent, {
        errors: validationResult.error.issues
      });
      return res.status(400).json({ 
        error: 'Ogiltiga uppgifter',
        details: validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      });
    }

    const { email, firstName, lastName, schoolName, subject, phoneNumber } = validationResult.data;

    // Check if email already exists in users or teacher registrations
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return res.status(409).json({ error: 'Ett konto med denna email finns redan' });
    }

    const [existingRegistration] = await db
      .select()
      .from(teacherRegistrations)
      .where(eq(teacherRegistrations.email, email.toLowerCase()))
      .limit(1);

    if (existingRegistration) {
      // If email not verified, resend verification
      if (!existingRegistration.emailVerified) {
        // Invalidate old tokens for this email
        await db
          .update(emailVerificationTokens)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(emailVerificationTokens.email, email.toLowerCase()),
              eq(emailVerificationTokens.type, 'registration_verify'),
              isNull(emailVerificationTokens.usedAt)
            )
          );

        // Create new hashed token
        const clearTextToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await argon2.hash(clearTextToken);
        
        await db.insert(emailVerificationTokens).values({
          email: email.toLowerCase(),
          token: hashedToken,
          type: 'registration_verify',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          userId: null
        });

        // Update registration timestamp
        await db
          .update(teacherRegistrations)
          .set({ 
            createdAt: new Date() // Reset timestamp for new verification
          })
          .where(eq(teacherRegistrations.id, existingRegistration.id));

        // Send verification email with error handling
        try {
          const verificationLink = `${req.protocol}://${req.get('host')}/verifiera-email/${clearTextToken}`;
          await emailService.sendEmailVerification(email.toLowerCase(), clearTextToken, verificationLink);

          return res.json({ 
            success: true, 
            message: 'Verifieringslänk skickad till din email igen',
            needsVerification: true
          });
        } catch (emailError) {
          console.error('Email resend failed:', emailError);
          
          // In development, allow test emails to proceed
          const isDevelopment = process.env.NODE_ENV === 'development';
          const isTestEmail = email.includes('example.com') || email.includes('test');
          
          if (isDevelopment && isTestEmail) {
            return res.json({ 
              success: true, 
              message: `[DEV MODE] Verifieringslänk skulle ha skickats till ${email}. Token: ${clearTextToken}`,
              needsVerification: true,
              devToken: clearTextToken
            });
          }
          
          return res.status(500).json({ 
            error: 'Det uppstod ett problem med att skicka email. Försök igen senare.' 
          });
        }
      } else {
        return res.status(409).json({ error: 'En registrering med denna email är redan verifierad' });
      }
    }

    // Create teacher registration record (without token)
    const registrationData = {
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      schoolName: schoolName.trim(),
      subject: subject?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      status: 'pending_verification' as const
    };

    const [registration] = await db
      .insert(teacherRegistrations)
      .values(registrationData)
      .returning();

    // Create email verification token (hashed)
    const clearTextToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await argon2.hash(clearTextToken);
    
    await db.insert(emailVerificationTokens).values({
      email: email.toLowerCase(),
      token: hashedToken,
      type: 'registration_verify',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      userId: null // Not set until account created
    });

    // Send verification email with error handling
    try {
      const verificationLink = `${req.protocol}://${req.get('host')}/verifiera-email/${clearTextToken}`;
      await emailService.sendEmailVerification(email.toLowerCase(), clearTextToken, verificationLink);

      // Log audit event
      await logAuditEvent('TEACHER_REGISTRATION_REQUESTED', null, true, ipAddress, userAgent, {
        email: email.toLowerCase(),
        schoolName: schoolName.trim()
      });

      res.json({ 
        success: true, 
        message: 'Registrering mottagen! Kolla din email för verifieringslänk.',
        needsVerification: true
      });
    } catch (emailError) {
      console.error('Email verification sending failed:', emailError);
      
      // Handle email delivery errors gracefully
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isTestEmail = email.includes('example.com') || email.includes('test');
      
      // Log audit event even if email fails
      await logAuditEvent('TEACHER_REGISTRATION_EMAIL_FAILED', null, false, ipAddress, userAgent, {
        email: email.toLowerCase(),
        schoolName: schoolName.trim(),
        error: emailError instanceof Error ? emailError.message : 'Unknown email error',
        isDevelopment,
        isTestEmail
      });

      // In development with test emails, show success but note email issue
      if (isDevelopment && isTestEmail) {
        console.log(`[DEV MODE] Simulating email send to test address: ${email}`);
        return res.json({
          success: true,
          message: `Registrering mottagen! [DEV MODE] Email skulle ha skickats till ${email}. Token: ${clearTextToken}`,
          needsVerification: true,
          devToken: clearTextToken
        });
      }
      
      // Handle specific email provider errors
      if (emailError instanceof Error && emailError.message.includes('InactiveRecipientsError')) {
        return res.status(400).json({ 
          error: 'Email-adressen verkar vara inaktiv eller blockerad. Försök med en annan email-adress.' 
        });
      } else if (emailError instanceof Error && emailError.message.includes('422')) {
        return res.status(400).json({ 
          error: 'Email-adressen kunde inte verifieras. Kontrollera att den är korrekt och försök igen.' 
        });
      } else {
        return res.status(500).json({ 
          error: 'Det uppstod ett problem med att skicka email. Kontakta support om problemet kvarstår.' 
        });
      }
    }

  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ error: 'Serverfel vid registrering' });
  }
});

// Step 2: Verify Email and Create Teacher Account
router.post("/api/auth/teacher/verify-email", loginRateLimit, async (req, res) => {
  try {
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'];

    // Validate request body
    if (!req.body.token || typeof req.body.token !== 'string') {
      await logAuditEvent('EMAIL_VERIFICATION_VALIDATION_FAILED', null, false, ipAddress, userAgent, {
        error: 'Missing or invalid token'
      });
      return res.status(400).json({ error: 'Verifieringstoken krävs' });
    }

    const { token } = req.body;

    // Find all active verification tokens for registration_verify type
    const verificationTokens = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.type, 'registration_verify'),
          gte(emailVerificationTokens.expiresAt, new Date()),
          isNull(emailVerificationTokens.usedAt)
        )
      );

    // Find matching token by comparing hashes
    let matchingToken = null;
    for (const dbToken of verificationTokens) {
      try {
        if (await argon2.verify(dbToken.token, token)) {
          matchingToken = dbToken;
          break;
        }
      } catch (error) {
        // Invalid hash format, continue to next token
        continue;
      }
    }

    if (!matchingToken) {
      await logAuditEvent('EMAIL_VERIFICATION_FAILED', null, false, ipAddress, userAgent, {
        error: 'Invalid or expired token'
      });
      return res.status(404).json({ error: 'Ogiltig eller utgången verifieringslänk' });
    }

    // Find registration by email
    const [registration] = await db
      .select()
      .from(teacherRegistrations)
      .where(eq(teacherRegistrations.email, matchingToken.email))
      .limit(1);

    if (!registration) {
      await logAuditEvent('EMAIL_VERIFICATION_FAILED', null, false, ipAddress, userAgent, {
        error: 'Registration not found for email',
        email: matchingToken.email
      });
      return res.status(404).json({ error: 'Registrering hittades inte' });
    }

    // Check if already verified
    if (registration.emailVerified) {
      return res.status(400).json({ error: 'Email redan verifierad' });
    }

    // Create teacher account
    const username = `larare_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const tempPassword = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 10);
    const hashedPassword = await hashPassword(tempPassword);

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        passwordHash: hashedPassword,
        role: 'LARARE',
        email: registration.email,
        emailVerified: true,
        isActive: true,
        mustChangePassword: true
      })
      .returning();

    // Find or create school
    let [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.name, registration.schoolName))
      .limit(1);

    if (!school) {
      [school] = await db
        .insert(schools)
        .values({
          name: registration.schoolName,
          isActive: true
        })
        .returning();
    }

    // Create teacher-school membership
    await db
      .insert(teacherSchoolMemberships)
      .values({
        teacherId: newUser.id,
        schoolId: school.id,
        role: 'LARARE',
        isActive: true
      });

    // Mark email verification token as used
    await db
      .update(emailVerificationTokens)
      .set({
        usedAt: new Date(),
        userId: newUser.id
      })
      .where(eq(emailVerificationTokens.id, matchingToken.id));

    // Update registration record
    await db
      .update(teacherRegistrations)
      .set({
        emailVerified: true,
        verifiedAt: new Date(),
        userId: newUser.id,
        status: 'account_created'
      })
      .where(eq(teacherRegistrations.id, registration.id));

    // Send welcome email with login credentials
    await emailService.sendWelcomeEmail(
      registration.email,
      `${registration.firstName} ${registration.lastName}`,
      username,
      tempPassword
    );

    // Log audit event
    await logAuditEvent('TEACHER_ACCOUNT_CREATED', newUser.id, true, ipAddress, userAgent, {
      email: registration.email,
      schoolName: registration.schoolName,
      registrationId: registration.id
    });

    res.json({ 
      success: true, 
      message: 'Email verifierad! Ditt konto har skapats. Kolla din email för inloggningsuppgifter.',
      accountCreated: true,
      username
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Serverfel vid email-verifiering' });
  }
});

// Step 3: Activate License Code
router.post("/api/auth/teacher/activate-license", requireAuth, requireCsrf, loginRateLimit, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'];

    // Check user role authorization
    if (!userId || !userRole || !['LÄRARE', 'ADMIN'].includes(userRole)) {
      await logAuditEvent('LICENSE_ACTIVATION_UNAUTHORIZED', userId || null, false, ipAddress, userAgent, {
        userRole: userRole || null,
        reason: 'Invalid role for license activation'
      });
      return res.status(403).json({ error: 'Otillräcklig behörighet för licensaktivering' });
    }

    // Validate license code
    if (!req.body.licenseCode || typeof req.body.licenseCode !== 'string') {
      await logAuditEvent('LICENSE_ACTIVATION_VALIDATION_FAILED', userId || null, false, ipAddress, userAgent, {
        error: 'Missing or invalid license code'
      });
      return res.status(400).json({ error: 'Licenskod krävs' });
    }

    const { licenseCode } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Inloggning krävs' });
    }

    // Verify user is a teacher
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, 'LARARE')))
      .limit(1);

    if (!user) {
      return res.status(403).json({ error: 'Endast lärare kan aktivera licenser' });
    }

    // Check if user already has an active license
    const [existingLicense] = await db
      .select()
      .from(teacherLicenses)
      .where(and(
        eq(teacherLicenses.teacherId, userId),
        eq(teacherLicenses.isActive, true)
      ))
      .limit(1);

    if (existingLicense && existingLicense.expiresAt && new Date() < new Date(existingLicense.expiresAt)) {
      return res.status(400).json({ 
        error: 'Du har redan en aktiv licens',
        expiresAt: existingLicense.expiresAt
      });
    }

    // Try to find and redeem license code
    try {
      const codeHash = hashCode(licenseCode);
      const code = await findOneTimeCode(codeHash);
      
      if (!code) {
        await logAuditEvent('LICENSE_ACTIVATION_FAILED', userId, false, ipAddress, userAgent, {
          licenseCode: licenseCode.substring(0, 4) + '****',
          error: 'Code not found'
        });
        return res.status(404).json({ error: 'Ogiltig licenskod' });
      }

      // Check if already redeemed
      if (code.redeemedAt) {
        await logAuditEvent('LICENSE_ACTIVATION_FAILED', userId, false, ipAddress, userAgent, {
          licenseCode: licenseCode.substring(0, 4) + '****',
          error: 'Code already redeemed'
        });
        return res.status(400).json({ error: 'Denna licenskod har redan använts' });
      }

      // Check if expired
      if (code.expiresAt && new Date() > new Date(code.expiresAt)) {
        await logAuditEvent('LICENSE_ACTIVATION_FAILED', userId, false, ipAddress, userAgent, {
          licenseCode: licenseCode.substring(0, 4) + '****',
          error: 'Code expired'
        });
        return res.status(400).json({ error: 'Licenskoden har gått ut' });
      }

      // Check if email matches (optional validation)
      if (code.recipientEmail && code.recipientEmail.toLowerCase() !== user.email?.toLowerCase()) {
        await logAuditEvent('LICENSE_ACTIVATION_FAILED', userId, false, ipAddress, userAgent, {
          licenseCode: licenseCode.substring(0, 4) + '****',
          error: 'Email mismatch'
        });
        return res.status(400).json({ error: 'Denna licens tillhör en annan email-adress' });
      }

      // Create teacher license (valid for 1 year by default)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      const license = await createTeacherLicense(userId, code.id, expiresAt);
      
      // Mark code as redeemed
      await redeemOneTimeCode(code.id, userId);
      
      await logAuditEvent('LICENSE_ACTIVATED', userId, true, ipAddress, userAgent, {
        licenseCode: licenseCode.substring(0, 4) + '****',
        expiresAt: license.expiresAt
      });

      res.json({
        success: true,
        message: 'Licens aktiverad framgångsrikt!',
        license: {
          expiresAt: license.expiresAt,
          isActive: license.isActive
        }
      });

    } catch (error) {
      console.error('License activation error:', error);
      await logAuditEvent('LICENSE_ACTIVATION_FAILED', userId, false, ipAddress, userAgent, {
        licenseCode: licenseCode.substring(0, 4) + '****',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({ error: 'Serverfel vid licensaktivering' });
    }

  } catch (error) {
    console.error('License activation error:', error);
    res.status(500).json({ error: 'Serverfel vid licensaktivering' });
  }
});

export default router;