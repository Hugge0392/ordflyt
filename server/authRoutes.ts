import { Router } from "express";
import { db } from "./db";
import { users, sessions, auditLog, failedLogins, emailVerificationTokens, teacherRegistrations, teacherLicenses, schools, teacherSchoolMemberships, passwordResetTokens, insertTeacherRegistrationSchema, insertEmailVerificationTokenSchema, studentAccounts, studentSessions, teacherClasses } from "@shared/schema";
import { eq, and, gte, isNull, isNotNull, or } from "drizzle-orm";
import { findOneTimeCode, hashCode, redeemOneTimeCode, createTeacherLicense, logLicenseActivity, validateAndUseSetupCode, getStudentByUsername, updateStudentPassword } from "./licenseDb";
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
  requireRole,
  requireCsrf,
  generateDeviceFingerprint,
  hashIpAddress,
  rotateSession,
  createStudentSession,
  validateStudentSession,
  checkStudentLoginAttempts,
  requireStudentAuth
} from "./auth";
import { logRequestInfo } from "./productionCheck";
import { emailService } from "./emailService";
import crypto from "crypto";

// Helper function to hash reset tokens for secure storage
function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const router = Router();

// Debug endpoint - SECURED for admin access only and blocked in production
router.get("/api/debug/environment", requireAuth, requireRole('ADMIN'), async (req, res) => {
  // Block in production for security
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
  if (isProduction) {
    return res.status(404).json({ error: 'Endpoint not available in production' });
  }

  const debugInfo = {
    nodeEnv: process.env.NODE_ENV,
    replitDeployment: process.env.REPLIT_DEPLOYMENT,
    isProduction,
    adminPasswordPresent: !!process.env.ADMIN_PASSWORD,
    databaseUrlPresent: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString(),
    hasAdminUser: false,
    requestedBy: req.user?.username
  };
  
  try {
    // Check if admin user exists in database
    const [adminUser] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);
    
    debugInfo.hasAdminUser = !!adminUser;
    
    console.log('🔧 SECURED DEBUG ENDPOINT CALLED by:', req.user?.username, debugInfo);
    
    // Log audit event for debug access
    await logAuditEvent('DEBUG_ACCESS', req.user?.id || null, true, req.ip || 'unknown', req.headers['user-agent'], { endpoint: '/api/debug/environment' });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
  }
  
  res.json(debugInfo);
});

// Login endpoint
router.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];
  const deviceFingerprint = generateDeviceFingerprint(req);
  
  // Enhanced debugging for production
  const debugInfo = {
    username,
    passwordLength: password?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    replitDeployment: process.env.REPLIT_DEPLOYMENT,
    isProduction: process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1',
    adminPasswordPresent: !!process.env.ADMIN_PASSWORD,
    timestamp: new Date().toISOString()
  };
  
  console.log('🔐 PRODUCTION LOGIN DEBUG:', debugInfo);
  
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
    
    // Get user by username OR email - but don't reveal if user exists or not
    let [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, username),
          eq(users.email, username)
        )
      )
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
    
    // Special case: On-demand admin bootstrap/password update for production
    if (username === 'admin') {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (isProduction && adminPassword && password === adminPassword) {
        if (!user) {
          // Create admin user if it doesn't exist
          console.log('🔧 On-demand admin bootstrap triggered - creating admin user');
          
          try {
            const adminPasswordHash = await hashPassword(adminPassword);
            const [newAdmin] = await db.insert(users).values({
              username: 'admin',
              passwordHash: adminPasswordHash,
              role: 'ADMIN',
              isActive: true,
              emailVerified: false,
              email: 'admin@ordflyt.se'
            }).returning();
            
            await logAuditEvent('ADMIN_BOOTSTRAP_LOGIN', newAdmin.id, true, ipAddress, userAgent, { 
              reason: 'On-demand admin creation during login' 
            });
            
            console.log('✅ Admin user created successfully via on-demand bootstrap');
            user = newAdmin;
            validPassword = true;
          } catch (error) {
            console.error('❌ Failed to create admin user via bootstrap:', error);
          }
        } else if (!validPassword) {
          // Admin user exists but password doesn't match - update it
          console.log('🔧 Admin password mismatch - updating to ADMIN_PASSWORD');
          
          try {
            const adminPasswordHash = await hashPassword(adminPassword);
            await db.update(users)
              .set({ passwordHash: adminPasswordHash })
              .where(eq(users.username, 'admin'));
            
            await logAuditEvent('ADMIN_PASSWORD_UPDATE', user.id, true, ipAddress, userAgent, { 
              reason: 'Admin password updated to match ADMIN_PASSWORD' 
            });
            
            console.log('✅ Admin password updated successfully');
            validPassword = true;
          } catch (error) {
            console.error('❌ Failed to update admin password:', error);
          }
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
    const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'lax' as const : 'strict' as const, // More lenient in production
      maxAge: user.role === 'ELEV' ? 60 * 60 * 1000 : 30 * 60 * 1000, // 1h for students, 30min for teachers/admins
      path: '/',
      // Domain omitted to work with any deployment domain (replit.app, ordflyt.se, etc)
    };
    
    console.log('Setting session cookie for login with options:', {
      ...cookieOptions,
      domain: 'default (current domain)',
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
      path: '/'
      // Domain omitted to work with any deployment domain
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
    firstName, 
    lastName, 
    schoolName 
  } = req.body;
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

    // Check if email already exists
    const [existingEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail) {
      return res.status(400).json({ error: 'E-postadressen är redan registrerad' });
    }

    // Free registration - no code validation needed

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

    // Log successful free registration (no license required)
    await logLicenseActivity(null, 'free_registration', { 
      username,
      email,
      registration_type: 'free',
      note: 'Free teacher registration'
    }, newUser.id, ipAddress);

    // Create session and log the user in
    const deviceFingerprint = generateDeviceFingerprint(req);
    const sessionData = await createSession(newUser.id, ipAddress, userAgent, deviceFingerprint, 'LARARE');

    // Set session cookie with production-safe settings  
    const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' as const : 'strict' as const,
      maxAge: 30 * 60 * 1000, // 30 minutes for teachers
      path: '/'
      // Domain omitted to work with any deployment domain (replit.app, ordflyt.se, etc)
    };
    
    console.log('Setting session cookie for registration with options:', {
      ...cookieOptions,
      domain: 'default (current domain)'
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

    // Simple success message for free registration
    const successMessage = 'Lärarkonto skapat framgångsrikt! En bekräftelse har skickats till din e-post.';
    
    res.json({
      success: true,
      message: successMessage,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      hasLicense: false,
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

// Development/debug endpoint to verify admin user setup
router.get("/api/auth/verify-admin", async (req, res) => {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In production, require explicit debug token
    if (!isDevelopment) {
      const debugToken = String(req.query.debug || req.headers['x-debug-token'] || '');
      const expectedToken = process.env.ADMIN_DEBUG_TOKEN;
      
      if (!expectedToken || debugToken !== expectedToken) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
    
    // Check if admin user exists
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);
    
    if (!admin) {
      return res.json({
        adminExists: false,
        message: 'Admin-användare hittades inte i databasen'
      });
    }
    
    // Try to verify the password with 'admin' (development default)
    let passwordValid = false;
    try {
      passwordValid = await verifyPassword('admin', admin.passwordHash);
    } catch (error) {
      // Log error but don't expose details
      passwordValid = false;
    }
    
    res.json({
      adminExists: true,
      passwordValid,
      isActive: admin.isActive,
      role: admin.role,
      environment: process.env.NODE_ENV,
      message: passwordValid ? 
        'Admin-användare är korrekt konfigurerad' : 
        'Admin-användare kan inte verifieras med standardlösenord'
    });
    
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Serverfel vid verifiering' });
  }
});

// Password reset: Send reset email
router.post("/api/auth/forgot-password", loginRateLimit, async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];

  try {
    // Input validation
    if (!email || typeof email !== 'string') {
      await logAuditEvent('PASSWORD_RESET_REQUEST', null, false, ipAddress, userAgent, { 
        reason: 'Missing email' 
      });
      // Always return same response regardless of whether email exists (security)
      return res.json({ 
        success: true, 
        message: 'Om den angivna e-postadressen finns i systemet har ett återställningsmeddelande skickats.' 
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await logAuditEvent('PASSWORD_RESET_REQUEST', null, false, ipAddress, userAgent, { 
        reason: 'Invalid email format' 
      });
      // Always return same response (security)
      return res.json({ 
        success: true, 
        message: 'Om den angivna e-postadressen finns i systemet har ett återställningsmeddelande skickats.' 
      });
    }

    // Find user by email (but don't reveal if it exists or not)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (user && user.isActive) {
      try {
        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        // Hash the token before storing in database for security
        const hashedToken = hashResetToken(resetToken);
        
        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Clean up any existing unused tokens for this user
        await db
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(and(
            eq(passwordResetTokens.userId, user.id),
            isNull(passwordResetTokens.usedAt)
          ));

        // Create new reset token in database with hashed token
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash: hashedToken, // Store hashed token, not plaintext
          expiresAt,
          usedAt: null
        });

        // Send reset email
        const resetLink = `${process.env.FRONTEND_URL || 'https://ordflyt.se'}/reset-password/${resetToken}`;
        await emailService.sendPasswordReset(
          user.email || email,
          resetToken,
          resetLink
        );

        // Log successful password reset request
        await logAuditEvent('PASSWORD_RESET_REQUEST', user.id, true, ipAddress, userAgent, {
          email: email.toLowerCase()
        });

      } catch (error) {
        console.error('Password reset email error:', error);
        await logAuditEvent('PASSWORD_RESET_EMAIL_FAILED', user.id, false, ipAddress, userAgent, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Always return same response regardless of whether user exists (security)
    res.json({ 
      success: true, 
      message: 'Om den angivna e-postadressen finns i systemet har ett återställningsmeddelande skickats.' 
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    await logAuditEvent('PASSWORD_RESET_ERROR', null, false, ipAddress, userAgent, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Ett fel uppstod vid begäran om lösenordsåterställning' });
  }
});

// Password reset: Validate reset token
router.get("/api/auth/validate-reset-token/:token", loginRateLimit, async (req, res) => {
  const { token } = req.params;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];

  try {
    if (!token || typeof token !== 'string') {
      await logAuditEvent('PASSWORD_RESET_VALIDATE', null, false, ipAddress, userAgent, { 
        reason: 'Missing token' 
      });
      return res.status(400).json({ error: 'Ogiltig eller saknad token' });
    }

    // Hash the incoming token to compare with stored hash
    const hashedToken = hashResetToken(token);

    // Find valid, unused, non-expired token using hashed token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.tokenHash, hashedToken),
        isNull(passwordResetTokens.usedAt),
        gte(passwordResetTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!resetToken) {
      await logAuditEvent('PASSWORD_RESET_VALIDATE', null, false, ipAddress, userAgent, { 
        reason: 'Token not found or expired' 
      });
      return res.status(400).json({ error: 'Ogiltig eller utgången token' });
    }

    // Verify user still exists and is active
    const [user] = await db
      .select({ id: users.id, username: users.username, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, resetToken.userId))
      .limit(1);

    if (!user || !user.isActive) {
      await logAuditEvent('PASSWORD_RESET_VALIDATE', resetToken.userId, false, ipAddress, userAgent, { 
        reason: 'User not found or inactive' 
      });
      return res.status(400).json({ error: 'Ogiltig token - användare hittades inte' });
    }

    await logAuditEvent('PASSWORD_RESET_VALIDATE', user.id, true, ipAddress, userAgent);

    res.json({ 
      valid: true, 
      username: user.username 
    });

  } catch (error) {
    console.error('Token validation error:', error);
    await logAuditEvent('PASSWORD_RESET_VALIDATE_ERROR', null, false, ipAddress, userAgent, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Ett fel uppstod vid validering av token' });
  }
});

// Password reset: Reset password with token
router.post("/api/auth/reset-password", loginRateLimit, async (req, res) => {
  const { token, newPassword } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];

  try {
    // Input validation
    if (!token || !newPassword || typeof token !== 'string' || typeof newPassword !== 'string') {
      await logAuditEvent('PASSWORD_RESET_ATTEMPT', null, false, ipAddress, userAgent, { 
        reason: 'Missing token or password' 
      });
      return res.status(400).json({ error: 'Token och nytt lösenord krävs' });
    }

    // Validate password strength
    if (newPassword.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      await logAuditEvent('PASSWORD_RESET_ATTEMPT', null, false, ipAddress, userAgent, { 
        reason: 'Weak password' 
      });
      return res.status(400).json({ 
        error: 'Lösenordet måste vara minst 8 tecken långt och innehålla minst en stor bokstav, en liten bokstav och en siffra' 
      });
    }

    // Hash the incoming token to compare with stored hash
    const hashedToken = hashResetToken(token);

    // Find valid, unused, non-expired token using hashed token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.tokenHash, hashedToken),
        isNull(passwordResetTokens.usedAt),
        gte(passwordResetTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!resetToken) {
      await logAuditEvent('PASSWORD_RESET_ATTEMPT', null, false, ipAddress, userAgent, { 
        reason: 'Invalid or expired token' 
      });
      return res.status(400).json({ error: 'Ogiltig eller utgången token' });
    }

    // Verify user still exists and is active
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, resetToken.userId))
      .limit(1);

    if (!user || !user.isActive) {
      await logAuditEvent('PASSWORD_RESET_ATTEMPT', resetToken.userId, false, ipAddress, userAgent, { 
        reason: 'User not found or inactive' 
      });
      return res.status(400).json({ error: 'Ogiltig token - användare hittades inte' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password
    await db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        mustChangePassword: false
      })
      .where(eq(users.id, user.id));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Clean up all expired/used tokens
    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNotNull(passwordResetTokens.usedAt)
        )
      );

    // Log successful password reset
    await logAuditEvent('PASSWORD_RESET_SUCCESS', user.id, true, ipAddress, userAgent);

    res.json({ 
      success: true, 
      message: 'Lösenordet har återställts framgångsrikt. Du kan nu logga in med ditt nya lösenord.' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    await logAuditEvent('PASSWORD_RESET_ERROR', null, false, ipAddress, userAgent, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Ett fel uppstod vid återställning av lösenord' });
  }
});

// ============================================================================
// STUDENT AUTHENTICATION ENDPOINTS
// ============================================================================

// POST /api/student/login - Student login endpoint
router.post("/api/student/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];
  const deviceFingerprint = generateDeviceFingerprint(req);
  
  try {
    // Input validation
    if (!username || !password) {
      await logAuditEvent('STUDENT_LOGIN_ATTEMPT', null, false, ipAddress, userAgent, { reason: 'Missing credentials' });
      return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
    }

    // Check login attempts
    const canLogin = await checkStudentLoginAttempts(username, ipAddress, deviceFingerprint);
    if (!canLogin) {
      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Rate limited');
      await logAuditEvent('STUDENT_LOGIN_ATTEMPT', null, false, ipAddress, userAgent, { reason: 'Rate limited' });
      return res.status(429).json({ error: 'För många inloggningsförsök. Försök igen senare.' });
    }

    // Find student by username
    const [student] = await db
      .select()
      .from(studentAccounts)
      .where(eq(studentAccounts.username, username))
      .limit(1);

    if (!student) {
      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Student not found');
      await logAuditEvent('STUDENT_LOGIN_ATTEMPT', null, false, ipAddress, userAgent, { username, reason: 'Student not found' });
      return res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord' });
    }

    // Check if account is locked
    if (student.lockedUntil && new Date() < student.lockedUntil) {
      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Account locked');
      await logAuditEvent('STUDENT_LOGIN_ATTEMPT', student.id, false, ipAddress, userAgent, { reason: 'Account locked', lockedUntil: student.lockedUntil.toISOString() });
      return res.status(423).json({ 
        error: 'Kontot är låst. Försök igen senare.', 
        lockedUntil: student.lockedUntil.toISOString() 
      });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, student.passwordHash);
    if (!passwordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (student.failedLoginAttempts || 0) + 1;
      const shouldLockAccount = newFailedAttempts >= 5; // Lock after 5 failed attempts
      
      const updateData: any = {
        failedLoginAttempts: newFailedAttempts
      };
      
      if (shouldLockAccount) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }
      
      await db
        .update(studentAccounts)
        .set(updateData)
        .where(eq(studentAccounts.id, student.id));

      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Invalid password');
      await logAuditEvent('STUDENT_LOGIN_ATTEMPT', student.id, false, ipAddress, userAgent, { reason: 'Invalid password', failedAttempts: newFailedAttempts });
      
      const errorMessage = shouldLockAccount 
        ? 'För många misslyckade inloggningsförsök. Kontot har låsts i 30 minuter.'
        : 'Felaktigt användarnamn eller lösenord';
      
      return res.status(401).json({ error: errorMessage });
    }

    // Reset failed login attempts on successful login
    await db
      .update(studentAccounts)
      .set({ 
        failedLoginAttempts: 0, 
        lockedUntil: null,
        lastLogin: new Date() 
      })
      .where(eq(studentAccounts.id, student.id));

    // Create student session
    const session = await createStudentSession(
      student.id,
      ipAddress,
      userAgent,
      deviceFingerprint
    );

    // Set secure cookie
    const cookieOptions: any = {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 45 * 60 * 1000 // 45 minutes
    };

    // Add secure flag in production
    if (process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1') {
      cookieOptions.secure = true;
    }

    res.cookie('studentSessionToken', session.sessionToken, cookieOptions);

    // Log successful login
    await logAuditEvent('STUDENT_LOGIN_SUCCESS', student.id, true, ipAddress, userAgent, { 
      sessionId: session.id,
      mustChangePassword: student.mustChangePassword 
    });

    res.json({
      success: true,
      student: {
        id: student.id,
        username: student.username,
        studentName: student.studentName,
        classId: student.classId,
        mustChangePassword: student.mustChangePassword,
        lastLogin: student.lastLogin
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    await logAuditEvent('STUDENT_LOGIN_ERROR', null, false, ipAddress, userAgent, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Ett fel uppstod vid inloggning' });
  }
});

// POST /api/student/login-with-code - Student first-time login with setup code
router.post("/api/student/login-with-code", loginRateLimit, async (req, res) => {
  const { username, setupCode } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];
  const deviceFingerprint = generateDeviceFingerprint(req);
  
  try {
    // Input validation
    if (!username || !setupCode) {
      await logAuditEvent('STUDENT_SETUP_LOGIN_ATTEMPT', null, false, ipAddress, userAgent, { reason: 'Missing credentials' });
      return res.status(400).json({ error: 'Användarnamn och engångskod krävs' });
    }

    // Check login attempts
    const canLogin = await checkStudentLoginAttempts(username, ipAddress, deviceFingerprint);
    if (!canLogin) {
      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Rate limited');
      await logAuditEvent('STUDENT_SETUP_LOGIN_ATTEMPT', null, false, ipAddress, userAgent, { reason: 'Rate limited' });
      return res.status(429).json({ error: 'För många inloggningsförsök. Försök igen senare.' });
    }

    // Find student by username
    const student = await getStudentByUsername(username);
    if (!student) {
      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Student not found');
      await logAuditEvent('STUDENT_SETUP_LOGIN_ATTEMPT', null, false, ipAddress, userAgent, { username, reason: 'Student not found' });
      return res.status(401).json({ error: 'Felaktigt användarnamn eller engångskod' });
    }

    // Check if account is locked
    if (student.lockedUntil && new Date() < student.lockedUntil) {
      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Account locked');
      await logAuditEvent('STUDENT_SETUP_LOGIN_ATTEMPT', student.id, false, ipAddress, userAgent, { reason: 'Account locked', lockedUntil: student.lockedUntil.toISOString() });
      return res.status(423).json({ 
        error: 'Kontot är låst. Försök igen senare.', 
        lockedUntil: student.lockedUntil.toISOString() 
      });
    }

    // Validate and use setup code
    const { valid, setupCodeId } = await validateAndUseSetupCode(student.id, setupCode);
    if (!valid) {
      // Increment failed login attempts
      const newFailedAttempts = (student.failedLoginAttempts || 0) + 1;
      const shouldLockAccount = newFailedAttempts >= 5;
      
      const updateData: any = {
        failedLoginAttempts: newFailedAttempts
      };
      
      if (shouldLockAccount) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }
      
      await db
        .update(studentAccounts)
        .set(updateData)
        .where(eq(studentAccounts.id, student.id));

      await recordFailedLogin(username, ipAddress, deviceFingerprint, 'Invalid setup code');
      await logAuditEvent('STUDENT_SETUP_LOGIN_ATTEMPT', student.id, false, ipAddress, userAgent, { reason: 'Invalid setup code', failedAttempts: newFailedAttempts });
      
      const errorMessage = shouldLockAccount 
        ? 'För många misslyckade inloggningsförsök. Kontot har låsts i 30 minuter.'
        : 'Felaktigt användarnamn eller engångskod';
      
      return res.status(401).json({ error: errorMessage });
    }

    // Reset failed login attempts on successful login
    await db
      .update(studentAccounts)
      .set({ 
        failedLoginAttempts: 0, 
        lockedUntil: null,
        lastLogin: new Date() 
      })
      .where(eq(studentAccounts.id, student.id));

    // Create student session
    const session = await createStudentSession(
      student.id,
      ipAddress,
      userAgent,
      deviceFingerprint
    );

    // Set secure cookie
    const cookieOptions: any = {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 45 * 60 * 1000 // 45 minutes
    };

    // Add secure flag in production
    if (process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1') {
      cookieOptions.secure = true;
    }

    res.cookie('studentSessionToken', session.sessionToken, cookieOptions);

    // Log successful setup code login
    await logAuditEvent('STUDENT_SETUP_LOGIN_SUCCESS', student.id, true, ipAddress, userAgent, { 
      sessionId: session.id,
      setupCodeId,
      mustChangePassword: student.mustChangePassword 
    });

    res.json({
      success: true,
      message: 'Inloggning lyckades! Du måste nu ändra ditt lösenord.',
      student: {
        id: student.id,
        username: student.username,
        studentName: student.studentName,
        classId: student.classId,
        mustChangePassword: true, // Always require password change after setup code login
        lastLogin: student.lastLogin
      },
      requirePasswordChange: true
    });

  } catch (error) {
    console.error('Student setup code login error:', error);
    await logAuditEvent('STUDENT_SETUP_LOGIN_ERROR', null, false, ipAddress, userAgent, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Ett fel uppstod vid inloggning' });
  }
});

// POST /api/student/logout - Student logout endpoint
router.post("/api/student/logout", requireStudentAuth, async (req, res) => {
  try {
    if (req.studentSession) {
      // Delete session from database
      await db.delete(studentSessions).where(eq(studentSessions.id, req.studentSession.id));
      
      // Log logout event
      await logAuditEvent(
        'STUDENT_LOGOUT',
        req.student?.id || null,
        true,
        req.ip || 'unknown',
        req.headers['user-agent']
      );
    }
    
    // Clear cookie
    res.clearCookie('studentSessionToken', { path: '/' });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Student logout error:', error);
    res.status(500).json({ error: 'Ett fel uppstod vid utloggning' });
  }
});

// GET /api/student/me - Get current student profile
router.get("/api/student/me", requireStudentAuth, async (req, res) => {
  try {
    if (!req.student) {
      return res.status(401).json({ error: 'Ej inloggad som elev' });
    }

    // Get class information (optional, don't fail if class not found)
    let classInfo = null;
    try {
      const [foundClass] = await db
        .select({
          id: teacherClasses.id,
          name: teacherClasses.name
        })
        .from(teacherClasses)
        .where(eq(teacherClasses.id, req.student.classId))
        .limit(1);
      classInfo = foundClass;
    } catch (error) {
      console.warn('Could not fetch class info:', error);
    }

    res.json({
      student: {
        id: req.student.id,
        username: req.student.username,
        studentName: req.student.studentName,
        classId: req.student.classId,
        mustChangePassword: req.student.mustChangePassword,
        lastLogin: req.student.lastLogin,
        createdAt: req.student.createdAt
      },
      session: {
        id: req.studentSession?.id,
        expiresAt: req.studentSession?.expiresAt
      }
    });
  } catch (error) {
    console.error('Student profile error:', error);
    res.status(500).json({ error: 'Ett fel uppstod vid hämtning av elevprofil' });
  }
});

// POST /api/student/password - Change student password
router.post("/api/student/password", requireStudentAuth, requireCsrf, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.student) {
      return res.status(401).json({ error: 'Ej inloggad som elev' });
    }

    // Input validation
    if (!newPassword) {
      return res.status(400).json({ error: 'Nytt lösenord krävs' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 6 tecken långt' });
    }

    // If student must change password, don't require current password
    if (!req.student.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Nuvarande lösenord krävs' });
      }

      // Verify current password
      const currentPasswordValid = await verifyPassword(currentPassword, req.student.passwordHash);
      if (!currentPasswordValid) {
        await logAuditEvent('STUDENT_PASSWORD_CHANGE_FAILED', req.student.id, false, req.ip || 'unknown', req.headers['user-agent'], { reason: 'Invalid current password' });
        return res.status(401).json({ error: 'Felaktigt nuvarande lösenord' });
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and clear mustChangePassword flag
    await db
      .update(studentAccounts)
      .set({ 
        passwordHash: newPasswordHash,
        mustChangePassword: false
      })
      .where(eq(studentAccounts.id, req.student.id));

    // Log password change
    await logAuditEvent(
      'STUDENT_PASSWORD_CHANGED',
      req.student.id,
      true,
      req.ip || 'unknown',
      req.headers['user-agent'],
      { wasForced: req.student.mustChangePassword }
    );

    res.json({ 
      success: true,
      message: 'Lösenordet har ändrats'
    });

  } catch (error) {
    console.error('Student password change error:', error);
    await logAuditEvent('STUDENT_PASSWORD_CHANGE_ERROR', req.student?.id || null, false, req.ip || 'unknown', req.headers['user-agent'], { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Ett fel uppstod vid lösenordsändring' });
  }
});

export default router;