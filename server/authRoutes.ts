import { Router } from "express";
import { db } from "./db";
import { users, sessions, auditLog } from "@shared/schema";
import { eq } from "drizzle-orm";
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

const router = Router();

// Login endpoint
router.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];
  const deviceFingerprint = generateDeviceFingerprint(req);
  
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
    const validPassword = user ? await verifyPassword(password, user.passwordHash) : false;
    
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
    
    // Set secure cookie
    res.cookie('sessionToken', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: user.role === 'ELEV' ? 60 * 60 * 1000 : 30 * 60 * 1000, // 1h for students, 30min for teachers/admins
      path: '/'
    });
    
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
    
    // Clear cookie
    res.clearCookie('sessionToken');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ett fel uppstod vid utloggning' });
  }
});

// Get current user endpoint
router.get("/api/auth/me", requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Ej inloggad' });
  }
  
  // Generate new CSRF token
  const csrfToken = await generateCsrfToken(req.session!.id);
  
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      email: req.user.email,
    },
    csrfToken
  });
});

// Session validation endpoint
router.get("/api/auth/validate", requireAuth, async (req, res) => {
  res.json({ valid: true, role: req.user?.role });
});

// Initialize test users (ONLY FOR DEVELOPMENT)
router.post("/api/auth/init-test-users", async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  
  try {
    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Users already exist' });
    }
    
    // Create test users
    const testUsers = [
      { username: 'admin', password: 'admin', role: 'ADMIN' as const },
      { username: 'larare', password: 'larare', role: 'LARARE' as const },
      { username: 'elev', password: 'elev', role: 'ELEV' as const },
    ];
    
    for (const testUser of testUsers) {
      const passwordHash = await hashPassword(testUser.password);
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

export default router;