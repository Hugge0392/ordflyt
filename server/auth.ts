import { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import crypto from "crypto";
import { createHmac } from "crypto";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { users, sessions, auditLog, failedLogins, csrfTokens, schools, teacherSchoolMemberships, teacherLicenses, studentAccounts, studentSessions } from "@shared/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { User, Session, School, StudentAccount, StudentSession } from "@shared/schema";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      student?: StudentAccount;
      studentSession?: StudentSession;
      csrfToken?: string;
      deviceFingerprint?: string;
      school?: School;
      teacherContext?: {
        schoolId?: string;
        schoolName?: string;
        isTeacher: boolean;
        licenseId?: string;
      };
    }
  }
}

// Constants for security
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour for normal users
const TEACHER_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes for teachers/admins
const STUDENT_SESSION_DURATION = 45 * 60 * 1000; // 45 minutes for students
const CSRF_TOKEN_DURATION = 60 * 60 * 1000; // 1 hour
const MAX_LOGIN_ATTEMPTS = process.env.NODE_ENV === 'production' ? 20 : 100; // Increased to 20 attempts in production
const LOGIN_COOLDOWN = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 1 * 60 * 1000; // 1 minute in dev, 5 in production

// Environment variables for security - use fixed values for development
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_session_secret_12345';
const PEPPER = process.env.PASSWORD_PEPPER || 'dev_pepper_12345';

console.log('Security config loaded:', {
  nodeEnv: process.env.NODE_ENV,
  hasSessionSecret: !!process.env.SESSION_SECRET,
  hasPepper: !!process.env.PASSWORD_PEPPER,
  pepperFallback: PEPPER.substring(0, 10) + '...',
  sessionSecretPreview: SESSION_SECRET.substring(0, 10) + '...'
});

// Hash IP addresses for privacy
export function hashIpAddress(ip: string): string {
  return createHmac('sha256', SESSION_SECRET)
    .update(ip)
    .digest('hex');
}

// Generate device fingerprint from request
export function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const screenResolution = req.headers['x-screen-resolution'] || '';
  
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${screenResolution}`;
  return createHmac('sha256', SESSION_SECRET)
    .update(fingerprintData)
    .digest('hex');
}

// Hash password with Argon2id
export async function hashPassword(password: string): Promise<string> {
  // Add pepper before hashing
  const pepperedPassword = password + PEPPER;
  return await argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const pepperedPassword = password + PEPPER;
  try {
    return await argon2.verify(hash, pepperedPassword);
  } catch {
    return false;
  }
}

// Generate secure random token
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Log audit event
export async function logAuditEvent(
  action: string,
  userId: string | null,
  success: boolean,
  ipAddress: string,
  userAgent: string | undefined,
  details?: Record<string, any>
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      action,
      userId,
      success,
      ipAddressHash: hashIpAddress(ipAddress),
      userAgent,
      details,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Check if user has exceeded login attempts
export async function checkLoginAttempts(
  username: string,
  ipAddress: string,
  deviceFingerprint: string
): Promise<boolean> {
  const recentAttempts = await db
    .select({ count: sql<number>`count(*)` })
    .from(failedLogins)
    .where(
      and(
        eq(failedLogins.ipAddress, ipAddress),
        gte(failedLogins.attemptTime, new Date(Date.now() - LOGIN_COOLDOWN))
      )
    );

  const attemptCount = recentAttempts[0]?.count || 0;
  return attemptCount < MAX_LOGIN_ATTEMPTS;
}

// Record failed login attempt
export async function recordFailedLogin(
  username: string | null,
  ipAddress: string,
  deviceFingerprint: string,
  reason: string
): Promise<void> {
  await db.insert(failedLogins).values({
    username,
    ipAddress,
    deviceFingerprint,
    reason,
  });
}

// Get teacher's school context
export async function getTeacherSchoolContext(userId: string): Promise<{
  schoolId?: string;
  schoolName?: string;
  isTeacher: boolean;
  licenseId?: string;
} | null> {
  try {
    // First check if user is a teacher through licenses
    const [license] = await db
      .select({
        id: teacherLicenses.id,
        isActive: teacherLicenses.isActive,
      })
      .from(teacherLicenses)
      .where(
        and(
          eq(teacherLicenses.teacherId, userId),
          eq(teacherLicenses.isActive, true)
        )
      )
      .limit(1);

    if (!license) {
      return { isTeacher: false };
    }

    // Check teacher-school memberships for school info
    const [membership] = await db
      .select({
        schoolId: teacherSchoolMemberships.schoolId,
        schoolName: schools.name,
      })
      .from(teacherSchoolMemberships)
      .innerJoin(schools, eq(teacherSchoolMemberships.schoolId, schools.id))
      .where(
        and(
          eq(teacherSchoolMemberships.teacherId, userId),
          eq(teacherSchoolMemberships.isActive, true)
        )
      )
      .limit(1);

    if (membership) {
      return {
        schoolId: membership.schoolId,
        schoolName: membership.schoolName,
        isTeacher: true,
        licenseId: license.id,
      };
    }

    return {
      isTeacher: true,
      licenseId: license.id,
    };
  } catch (error) {
    console.error('Error fetching teacher school context:', error);
    return null;
  }
}

// Create session
export async function createSession(
  userId: string,
  ipAddress: string,
  userAgent: string | undefined,
  deviceFingerprint: string,
  role: string
): Promise<Session> {
  // Allow multiple concurrent sessions - don't delete existing ones
  // Users can now log in from multiple devices simultaneously
  
  const sessionToken = generateSecureToken();
  const duration = (role === 'LARARE' || role === 'ADMIN') ? TEACHER_SESSION_DURATION : SESSION_DURATION;
  
  const [session] = await db.insert(sessions).values({
    userId,
    sessionToken,
    ipAddress,
    userAgent,
    deviceFingerprint,
    expiresAt: new Date(Date.now() + duration),
  }).returning();
  
  return session;
}

// Rotate session (for security after login)
export async function rotateSession(oldSessionId: string): Promise<Session> {
  const [oldSession] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, oldSessionId))
    .limit(1);
    
  if (!oldSession) {
    throw new Error('Session not found');
  }
  
  // Delete old session
  await db.delete(sessions).where(eq(sessions.id, oldSessionId));
  
  // Create new session with new token
  const newSessionToken = generateSecureToken();
  const [newSession] = await db.insert(sessions).values({
    userId: oldSession.userId,
    sessionToken: newSessionToken,
    ipAddress: oldSession.ipAddress,
    userAgent: oldSession.userAgent,
    deviceFingerprint: oldSession.deviceFingerprint,
    expiresAt: new Date(Date.now() + SESSION_DURATION),
  }).returning();
  
  return newSession;
}

// Validate session
export async function validateSession(sessionToken: string): Promise<Session | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.sessionToken, sessionToken),
        gte(sessions.expiresAt, new Date())
      )
    )
    .limit(1);
    
  if (session) {
    // Update last activity
    await db
      .update(sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(sessions.id, session.id));
  }
  
  return session || null;
}

// Generate CSRF token
export async function generateCsrfToken(sessionId: string): Promise<string> {
  const token = generateSecureToken();
  
  await db.insert(csrfTokens).values({
    token,
    sessionId,
    expiresAt: new Date(Date.now() + CSRF_TOKEN_DURATION),
  });
  
  return token;
}

// Validate CSRF token
export async function validateCsrfToken(token: string, sessionId: string): Promise<boolean> {
  const [csrfToken] = await db
    .select()
    .from(csrfTokens)
    .where(
      and(
        eq(csrfTokens.token, token),
        eq(csrfTokens.sessionId, sessionId),
        eq(csrfTokens.used, false),
        gte(csrfTokens.expiresAt, new Date())
      )
    )
    .limit(1);
    
  if (csrfToken) {
    // Mark as used
    await db
      .update(csrfTokens)
      .set({ used: true })
      .where(eq(csrfTokens.id, csrfToken.id));
    return true;
  }
  
  return false;
}

// Student Session Management Functions
// Create student session
export async function createStudentSession(
  studentId: string,
  ipAddress: string,
  userAgent: string | undefined,
  deviceFingerprint: string
): Promise<StudentSession> {
  // Allow multiple concurrent sessions - don't delete existing ones
  // Students can now log in from multiple devices simultaneously
  
  const sessionToken = generateSecureToken();
  
  const [session] = await db.insert(studentSessions).values({
    studentId,
    sessionToken,
    ipAddress,
    userAgent,
    deviceFingerprint,
    expiresAt: new Date(Date.now() + STUDENT_SESSION_DURATION),
  }).returning();
  
  return session;
}

// Validate student session
export async function validateStudentSession(sessionToken: string): Promise<StudentSession | null> {
  const [session] = await db
    .select()
    .from(studentSessions)
    .where(
      and(
        eq(studentSessions.sessionToken, sessionToken),
        gte(studentSessions.expiresAt, new Date())
      )
    )
    .limit(1);
    
  return session || null;
}

// Check student login attempts (similar to regular users)
export async function checkStudentLoginAttempts(
  username: string,
  ipAddress: string,
  deviceFingerprint: string
): Promise<boolean> {
  const recentAttempts = await db
    .select({ count: sql<number>`count(*)` })
    .from(failedLogins)
    .where(
      and(
        eq(failedLogins.username, username),
        eq(failedLogins.ipAddress, ipAddress),
        gte(failedLogins.attemptTime, new Date(Date.now() - LOGIN_COOLDOWN))
      )
    );

  const attemptCount = recentAttempts[0]?.count || 0;
  return attemptCount < MAX_LOGIN_ATTEMPTS;
}

// Student authentication middleware
export async function requireStudentAuth(req: Request, res: Response, next: NextFunction) {
  const studentSessionToken = req.cookies?.studentSessionToken;
  
  if (!studentSessionToken) {
    return res.status(401).json({ error: 'Ej inloggad som elev' });
  }
  
  const studentSession = await validateStudentSession(studentSessionToken);
  
  if (!studentSession) {
    res.clearCookie('studentSessionToken');
    return res.status(401).json({ error: 'Elevsessionen har upphört' });
  }
  
  // Get student account
  const [student] = await db
    .select()
    .from(studentAccounts)
    .where(eq(studentAccounts.id, studentSession.studentId))
    .limit(1);
    
  if (!student) {
    return res.status(401).json({ error: 'Elevkontot finns inte' });
  }
  
  // Check if account is locked
  if (student.lockedUntil && new Date() < student.lockedUntil) {
    return res.status(423).json({ 
      error: 'Kontot är låst. Försök igen senare.', 
      lockedUntil: student.lockedUntil.toISOString() 
    });
  }
  
  req.student = student;
  req.studentSession = studentSession;
  req.deviceFingerprint = generateDeviceFingerprint(req);
  
  next();
}

// Combined authentication middleware (supports both users and students)
export async function requireAnyAuth(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.sessionToken;
  const studentSessionToken = req.cookies?.studentSessionToken;
  
  // Try regular user authentication first
  if (sessionToken) {
    const session = await validateSession(sessionToken);
    
    if (session) {
      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
        
      if (user && user.isActive) {
        req.user = user;
        req.session = session;
        req.deviceFingerprint = generateDeviceFingerprint(req);
        
        // Add school context for teachers
        if (user.role === 'LARARE' || user.role === 'ADMIN') {
          const teacherContext = await getTeacherSchoolContext(user.id);
          if (teacherContext) {
            req.teacherContext = teacherContext;
            
            // If teacher has school, also fetch full school object
            if (teacherContext.schoolId) {
              const [school] = await db
                .select()
                .from(schools)
                .where(eq(schools.id, teacherContext.schoolId))
                .limit(1);
              
              if (school) {
                req.school = school;
              }
            }
          }
        }
        
        return next();
      }
    }
  }
  
  // Try student authentication if regular auth failed
  if (studentSessionToken) {
    const studentSession = await validateStudentSession(studentSessionToken);
    
    if (studentSession) {
      // Get student account
      const [student] = await db
        .select()
        .from(studentAccounts)
        .where(eq(studentAccounts.id, studentSession.studentId))
        .limit(1);
        
      if (student) {
        // Check if account is locked
        if (student.lockedUntil && new Date() < student.lockedUntil) {
          return res.status(423).json({ 
            error: 'Kontot är låst. Försök igen senare.', 
            lockedUntil: student.lockedUntil.toISOString() 
          });
        }
        
        req.student = student;
        req.studentSession = studentSession;
        req.deviceFingerprint = generateDeviceFingerprint(req);
        
        return next();
      }
    }
  }
  
  return res.status(401).json({ error: 'Ej inloggad' });
}

// Authentication middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Development bypass for testing
  if (process.env.NODE_ENV !== 'production') {
    const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
    const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;

    if (devBypass === 'true' && devRole === 'LARARE') {
      // Mock teacher user for development
      req.user = {
        id: '550e8400-e29b-41d4-a716-446655440002', // Real teacher ID that has Test Klass
        username: 'dev.teacher',
        email: 'dev.teacher@test.com',
        role: 'LARARE',
        passwordHash: 'mock-hash',
        isActive: true,
        createdAt: new Date(),
        isVerified: true
      } as any;
      // Mock teacher context for development
      req.teacherContext = {
        schoolId: 'dev-school-id',
        schoolName: 'Dev Test School',
        isTeacher: true,
        licenseId: 'dev-license-id'
      };
      req.deviceFingerprint = generateDeviceFingerprint(req);
      return next();
    }
  }

  const sessionToken = req.cookies?.sessionToken;

  if (!sessionToken) {
    return res.status(401).json({ error: 'Ej inloggad' });
  }
  
  const session = await validateSession(sessionToken);
  
  if (!session) {
    res.clearCookie('sessionToken');
    return res.status(401).json({ error: 'Sessionen har upphört' });
  }
  
  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
    
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Användaren finns inte eller är inaktiv' });
  }
  
  req.user = user;
  req.session = session;
  req.deviceFingerprint = generateDeviceFingerprint(req);
  
  // Add school context for teachers
  if (user.role === 'LARARE' || user.role === 'ADMIN') {
    const teacherContext = await getTeacherSchoolContext(user.id);
    if (teacherContext) {
      req.teacherContext = teacherContext;
      
      // If teacher has school, also fetch full school object
      if (teacherContext.schoolId) {
        const [school] = await db
          .select()
          .from(schools)
          .where(eq(schools.id, teacherContext.schoolId))
          .limit(1);
        
        if (school) {
          req.school = school;
        }
      }
    }
  }
  
  next();
}

// Role-based access control middleware
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Ej inloggad' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized access attempt
      await logAuditEvent(
        'UNAUTHORIZED_ACCESS',
        req.user.id,
        false,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        { attemptedPath: req.path, userRole: req.user.role, requiredRoles: allowedRoles }
      );
      
      return res.status(403).json({ error: 'Otillräcklig behörighet' });
    }
    
    next();
  };
}

// CSRF protection middleware for state-changing operations
export async function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(401).json({ error: 'Ej inloggad' });
  }
  
  const csrfToken = req.headers['x-csrf-token'] as string || req.body?.csrfToken;
  
  if (!csrfToken) {
    return res.status(403).json({ error: 'CSRF-token saknas' });
  }
  
  const isValid = await validateCsrfToken(csrfToken, req.session.id);
  
  if (!isValid) {
    await logAuditEvent(
      'CSRF_VALIDATION_FAILED',
      req.user?.id || null,
      false,
      req.ip || 'unknown',
      req.headers['user-agent'],
      { path: req.path }
    );
    
    return res.status(403).json({ error: 'Ogiltig CSRF-token' });
  }
  
  next();
}

// Rate limiting configurations
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 1000, // More lenient even in production
  message: 'För många inloggningsförsök, försök igen senare',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development', // Skip rate limiting in dev
  handler: async (req, res) => {
    console.log('Rate limit exceeded for IP:', req.ip, 'User-Agent:', req.headers['user-agent']);
    await logAuditEvent(
      'RATE_LIMIT_EXCEEDED',
      null,
      false,
      req.ip || 'unknown',
      req.headers['user-agent'],
      { path: req.path }
    );
    res.status(429).json({ error: 'För många inloggningsförsök, försök igen senare' });
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'För många förfrågningar',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development', // Skip rate limiting in dev
});

// School-scoped authorization middleware - ensures teachers can only access their school's data
export function requireSchoolAccess(schoolIdParam?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Ej inloggad' });
    }

    // Development bypass for testing
    if (process.env.NODE_ENV !== 'production') {
      const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
      const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;

      if (devBypass === 'true' && devRole === 'LARARE') {
        return next();
      }
    }

    // Admins have access to all schools
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Students don't need school access (they access their own data)
    if (req.user.role === 'ELEV') {
      return next();
    }
    
    // Teachers need school context
    if (req.user.role === 'LARARE') {
      if (!req.teacherContext?.isTeacher) {
        await logAuditEvent(
          'UNAUTHORIZED_SCHOOL_ACCESS',
          req.user.id,
          false,
          req.ip || 'unknown',
          req.headers['user-agent'],
          { reason: 'No teacher context', attemptedPath: req.path }
        );
        return res.status(403).json({ error: 'Ingen behörighet - lärarkonto krävs' });
      }
      
      // If schoolId is specified in route params, verify teacher has access to that school
      const targetSchoolId = schoolIdParam ? req.params[schoolIdParam] : req.teacherContext.schoolId;
      
      if (targetSchoolId && req.teacherContext.schoolId && req.teacherContext.schoolId !== targetSchoolId) {
        await logAuditEvent(
          'UNAUTHORIZED_SCHOOL_ACCESS',
          req.user.id,
          false,
          req.ip || 'unknown',
          req.headers['user-agent'],
          { 
            reason: 'School access denied',
            teacherSchoolId: req.teacherContext.schoolId,
            attemptedSchoolId: targetSchoolId,
            attemptedPath: req.path
          }
        );
        return res.status(403).json({ error: 'Ingen behörighet - kan endast komma åt din egen skolas data' });
      }
    }
    
    next();
  };
}

// Middleware to require teacher with active license
export async function requireTeacherLicense(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Ej inloggad' });
  }

  // Development bypass for testing
  if (process.env.NODE_ENV !== 'production') {
    const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
    const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;

    if (devBypass === 'true' && devRole === 'LARARE') {
      return next();
    }
  }

  if (req.user.role !== 'LARARE' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Lärarbehörighet krävs' });
  }

  // Admins bypass license requirement
  if (req.user.role === 'ADMIN') {
    return next();
  }
  
  if (!req.teacherContext?.isTeacher || !req.teacherContext?.licenseId) {
    await logAuditEvent(
      'LICENSE_ACCESS_DENIED',
      req.user.id,
      false,
      req.ip || 'unknown',
      req.headers['user-agent'],
      { reason: 'No active teacher license', attemptedPath: req.path }
    );
    return res.status(403).json({ 
      error: 'Aktiv lärarlicens krävs',
      message: 'Gå till /license för att aktivera din licens'
    });
  }
  
  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy - more lenient for production
  const csp = process.env.NODE_ENV === 'production' 
    ? "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
      "style-src 'self' 'unsafe-inline' https:; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https:; " +
      "media-src 'self' blob:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none';"
    : "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "media-src 'self' blob:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';";
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()'
  );
  
  // Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // No cache for authenticated pages
  if (req.user) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}