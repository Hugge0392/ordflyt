import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { hashPassword } from './auth';
import { db } from './db';
import { users, teacherRegistrations } from '@shared/schema';
import { emailService } from './emailService';
import { 
  findOneTimeCode,
  redeemOneTimeCode,
  createTeacherLicense,
  getActiveLicense,
  hashCode,
  getTeacherClasses,
  createTeacherClass,
  createStudentAccounts,
  getStudentByUsername,
  getStudentById,
  updateStudentPassword,
  logLicenseActivity,
  createOneTimeCode,
  generateSecurePassword,
  createStudentSetupCode,
  validateAndUseSetupCode,
  getActiveSetupCode,
  getStudentsByClassId,
  updateStudent,
  updateTeacherClass,
  deleteStudent,
  resetStudentPassword,
  verifyClassOwnership,
  verifyStudentOwnership,
  licenseDb
} from './licenseDb';
import { requireAuth, requireRole, requireSchoolAccess, requireTeacherLicense, requireCsrf } from './auth';
import { Request, Response } from 'express';
import { oneTimeCodes, teacherLicenses, teacherClasses, studentAccounts } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();


// Validation schemas
const redeemCodeSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Ogiltig kodformat'),
});

const createClassSchema = z.object({
  name: z.string().min(1, 'Klassnamn krävs').max(255, 'Klassnamn för långt'),
  term: z.string().optional(),
  description: z.string().optional(),
  studentNames: z.array(z.string().min(1)).min(1, 'Minst en elev krävs'),
});

const studentLoginSchema = z.object({
  username: z.string().min(1, 'Användarnamn krävs'),
  password: z.string().min(1, 'Lösenord krävs'),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Lösenord måste vara minst 6 tecken'),
});

const generateCodeSchema = z.object({
  recipientEmail: z.string().email('Ogiltig e-postadress'),
  validityDays: z.number().min(1).max(365).default(30),
});

// Additional validation schemas for new endpoints
const addStudentsSchema = z.object({
  studentNames: z.array(z.string().min(1, 'Elevnamn krävs')).min(1, 'Minst en elev krävs'),
});

const updateStudentSchema = z.object({
  name: z.string().min(1, 'Namn krävs').max(255, 'Namn för långt').optional(),
  isActive: z.boolean().optional(),
});

const updateClassSchema = z.object({
  name: z.string().min(1, 'Klassnamn krävs').max(255, 'Klassnamn för långt').optional(),
  isArchived: z.boolean().optional(),
});

// Middleware för att kontrollera aktiv licens
async function requireActiveLicense(req: any, res: Response, next: Function) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Inte inloggad' });
    }

    const license = await getActiveLicense(userId);
    if (!license) {
      return res.status(403).json({ 
        error: 'Ingen aktiv licens',
        message: 'Du behöver en giltig licens för att komma åt denna funktion. Gå till /license för att lösa in din kod.' 
      });
    }

    req.license = license;
    next();
  } catch (error) {
    console.error('License check error:', error);
    return res.status(500).json({ error: 'Serverfel vid licenskontroll' });
  }
}

// POST /api/license/activate - Combined Teacher Registration and License Activation
// This is the endpoint that tests expect to use for teacher registration with license codes
router.post('/activate', async (req: any, res: Response) => {
  const { 
    code,
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
    // Validate input
    if (!code || !username || !email || !password || !firstName || !lastName || !schoolName) {
      return res.status(400).json({ error: 'Alla fält krävs (kod, användarnamn, email, lösenord, förnamn, efternamn, skolnamn)' });
    }

    // Validate license code format  
    if (!code || !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return res.status(400).json({ error: 'Ogiltig kodformat' });
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

    // Validate license code
    const codeHash = hashCode(code);
    const oneTimeCode = await findOneTimeCode(codeHash);
    
    if (!oneTimeCode) {
      return res.status(400).json({ error: 'Ogiltig licenskod' });
    }

    // Check if already redeemed
    if (oneTimeCode.redeemedAt) {
      return res.status(400).json({ error: 'Licenskoden har redan använts' });
    }

    // Check if expired
    if (oneTimeCode.expiresAt && new Date() > oneTimeCode.expiresAt) {
      return res.status(400).json({ error: 'Licenskoden har gått ut' });
    }

    // Check if email matches license code (optional validation)
    if (oneTimeCode.recipientEmail && oneTimeCode.recipientEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Denna licens tillhör en annan email-adress' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    
    const [newUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
      role: 'LARARE', // Use correct role from schema
      isActive: true,
      emailVerified: true,
      mustChangePassword: false
    }).returning();

    // Create teacher profile record
    const [teacherProfile] = await db.insert(teacherRegistrations).values({
      email,
      firstName,
      lastName,
      schoolName,
      emailVerified: true,
      userId: newUser.id,
      status: 'account_created'
    }).returning();

    // Create teacher license
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const license = await createTeacherLicense(newUser.id, oneTimeCode.id, expiresAt);
    
    // Mark code as redeemed
    await redeemOneTimeCode(oneTimeCode.id, newUser.id);

    // Log successful registration with license activation
    await logLicenseActivity(license.id, 'registration_with_license', { 
      username,
      email,
      registration_type: 'license_activation',
      licenseCode: code.substring(0, 4) + '****'
    }, newUser.id, ipAddress);

    // Send registration confirmation email
    try {
      await emailService.sendRegistrationConfirmation(
        newUser.email || email,
        newUser.username
      );
    } catch (emailError: any) {
      console.error('Failed to send registration confirmation email:', emailError);
      // Don't fail the registration if email fails
    }

    res.json({
      success: true,
      message: 'Lärarkonto skapat och licens aktiverad framgångsrikt!',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      license: {
        expiresAt: license.expiresAt,
        isActive: license.isActive
      }
    });

  } catch (error: any) {
    console.error('License activation registration error:', error);
    
    await logLicenseActivity(null, 'registration_with_license_failed', { 
      reason: 'server_error',
      error: error.message,
      attempted_username: username,
      attempted_email: email
    }, undefined, ipAddress);

    res.status(500).json({ error: 'Serverfel vid registrering och licensaktivering' });
  }
});

// POST /api/license/redeem - Lösa in engångskod
router.post('/redeem', requireAuth, requireCsrf, async (req: any, res: Response) => {
  try {
    const { code } = redeemCodeSchema.parse(req.body);
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Kontrollera om användaren redan har en aktiv licens
    const existingLicense = await getActiveLicense(userId);
    if (existingLicense) {
      return res.status(400).json({ 
        error: 'Du har redan en aktiv licens',
        message: 'En användare kan bara ha en aktiv licens åt gången.' 
      });
    }

    // Hash:a och hitta koden
    const codeHash = hashCode(code);
    const oneTimeCode = await findOneTimeCode(codeHash);

    if (!oneTimeCode) {
      await logLicenseActivity(null, 'redeem_failed', { 
        reason: 'code_not_found',
        attempted_by: userId,
        user_email: userEmail
      }, userId, req.ip || 'unknown');
      
      return res.status(400).json({ error: 'Ogiltig kod' });
    }

    // Kontrollera om koden redan är använd
    if (oneTimeCode.redeemedAt) {
      await logLicenseActivity(null, 'redeem_failed', { 
        reason: 'code_already_used',
        attempted_by: userId,
        user_email: userEmail,
        code_id: oneTimeCode.id
      }, userId, req.ip || 'unknown');

      return res.status(400).json({ error: 'Koden har redan använts' });
    }

    // Kontrollera om koden har gått ut
    if (new Date() > oneTimeCode.expiresAt) {
      await logLicenseActivity(null, 'redeem_failed', { 
        reason: 'code_expired',
        attempted_by: userId,
        user_email: userEmail,
        code_id: oneTimeCode.id
      }, userId, req.ip || 'unknown');

      return res.status(400).json({ error: 'Koden har gått ut' });
    }

    // Kontrollera att koden är för rätt e-post (om användaren har e-post)
    if (userEmail && oneTimeCode.recipientEmail !== userEmail) {
      await logLicenseActivity(null, 'redeem_failed', { 
        reason: 'email_mismatch',
        attempted_by: userId,
        user_email: userEmail,
        code_email: oneTimeCode.recipientEmail,
        code_id: oneTimeCode.id
      }, userId, req.ip || 'unknown');

      return res.status(400).json({ 
        error: 'Koden är inte giltig för ditt konto',
        message: `Koden är utställd för ${oneTimeCode.recipientEmail}` 
      });
    }

    // Lös in koden och skapa licens
    await redeemOneTimeCode(oneTimeCode.id, userId);
    const license = await createTeacherLicense(userId, oneTimeCode.id);

    await logLicenseActivity(license.id, 'redeemed', { 
      user_email: userEmail,
      code_id: oneTimeCode.id,
      code_email: oneTimeCode.recipientEmail
    }, userId, req.ip || 'unknown');

    res.json({
      success: true,
      message: 'Licens aktiverad!',
      license: {
        key: license.licenseKey,
        expiresAt: license.expiresAt,
        isActive: license.isActive
      }
    });

  } catch (error: any) {
    console.error('Redeem error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }

    await logLicenseActivity(null, 'redeem_failed', { 
      reason: 'server_error',
      error: error.message,
      attempted_by: req.user?.id
    }, req.user?.id || 'unknown', req.ip || 'unknown');

    res.status(500).json({ error: 'Serverfel' });
  }
});

// GET /api/license/status - Kontrollera licensstatus
router.get('/status', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const license = await getActiveLicense(userId);

    if (!license) {
      return res.json({ 
        hasLicense: false,
        message: 'Ingen aktiv licens' 
      });
    }

    res.json({
      hasLicense: true,
      license: {
        key: license.licenseKey,
        expiresAt: license.expiresAt,
        isActive: license.isActive,
        createdAt: license.createdAt
      }
    });

  } catch (error) {
    console.error('License status error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// GET /api/license/classes - Hämta lärarens klasser
router.get('/classes', requireAuth, requireTeacherLicense, requireSchoolAccess(), async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const classes = await getTeacherClasses(userId);

    // Hämta elever för varje klass
    const classesWithStudents = await Promise.all(
      classes.map(async (classData) => {
        const students = await getStudentsByClassId(classData.id);
        return {
          ...classData,
          students: students || []
        };
      })
    );

    res.json({ classes: classesWithStudents });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/classes - Skapa ny klass
router.post('/classes', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { name, term, description, studentNames } = createClassSchema.parse(req.body);
    const userId = req.user.id;
    const licenseId = req.teacherContext.licenseId;

    // Skapa klass
    const teacherClass = await createTeacherClass(name, userId, licenseId, term, description);

    // In-memory tracker to prevent username collisions within the same request
    const usedUsernames = new Set<string>();
    
    // Generate usernames sequentially to prevent intra-request collisions
    const students = [];
    for (const studentName of studentNames) {
      const baseUsername = studentName.toLowerCase()
        .replace(/[åä]/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/[^a-z]/g, '')
        .substring(0, 8);
      
      // Generate unique username across the entire system and within this request
      let username = '';
      let counter = 1;
      let isUnique = false;
      
      while (!isUnique) {
        username = `${baseUsername}${String(counter).padStart(2, '0')}`;
        
        // Check if username already exists globally or in this request
        const existingUser = await licenseDb
          .select({ count: sql<number>`count(*)` })
          .from(studentAccounts)
          .where(eq(studentAccounts.username, username));
          
        const userExists = (existingUser[0]?.count || 0) > 0;
        const usedInThisRequest = usedUsernames.has(username);
        
        if (!userExists && !usedInThisRequest) {
          isUnique = true;
          usedUsernames.add(username);
        } else {
          counter++;
        }
      }
      
      const tempPassword = generateSecurePassword(); // Temporärt lösenord som måste ändras
      const passwordHash = await hashPassword(tempPassword);

      students.push({
        name: studentName,
        username,
        passwordHash
      });
    }

    // Skapa elevkonton i databasen
    const createdStudents = await createStudentAccounts(
      students.map(s => ({ name: s.name, username: s.username, passwordHash: s.passwordHash })),
      teacherClass.id
    );

    // Generera engångskoder för alla nya elever
    const studentsWithSetupCodes = await Promise.all(createdStudents.map(async (student) => {
      const { id: setupCodeId, clearCode } = await createStudentSetupCode(student.id, userId);
      return {
        ...student,
        setupCode: clearCode, // Visa engångskoden EN gång
        setupCodeId
      };
    }));

    res.json({
      success: true,
      message: 'Klass skapad!',
      class: teacherClass,
      students: studentsWithSetupCodes
    });

  } catch (error: any) {
    console.error('Create class error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Serverfel' });
  }
});

// GET /api/license/classes/:classId/students - Hämta elever för en specifik klass
router.get('/classes/:classId/students', requireAuth, requireTeacherLicense, requireSchoolAccess(), async (req: any, res: Response) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    // Kontrollera att läraren äger klassen
    const ownsClass = await verifyClassOwnership(classId, userId);
    if (!ownsClass) {
      return res.status(403).json({ error: 'Du har inte behörighet att komma åt denna klass' });
    }

    const students = await getStudentsByClassId(classId);
    res.json({ students });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/classes/:classId/students - Lägg till nya elever till befintlig klass
router.post('/classes/:classId/students', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { classId } = req.params;
    const { studentNames } = addStudentsSchema.parse(req.body);
    const userId = req.user.id;

    // Kontrollera att läraren äger klassen
    const ownsClass = await verifyClassOwnership(classId, userId);
    if (!ownsClass) {
      return res.status(403).json({ error: 'Du har inte behörighet att lägga till elever i denna klass' });
    }

    // In-memory tracker to prevent username collisions within the same request
    const usedUsernames = new Set<string>();
    
    // Generate usernames sequentially to prevent intra-request collisions
    const students = [];
    for (const studentName of studentNames) {
      const baseUsername = studentName.toLowerCase()
        .replace(/[åä]/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/[^a-z]/g, '')
        .substring(0, 8);
      
      // Generate unique username across the entire system and within this request
      let username = '';
      let counter = 1;
      let isUnique = false;
      
      while (!isUnique) {
        username = `${baseUsername}${String(counter).padStart(2, '0')}`;
        
        // Check if username already exists globally or in this request
        const existingUser = await licenseDb
          .select({ count: sql<number>`count(*)` })
          .from(studentAccounts)
          .where(eq(studentAccounts.username, username));
          
        const userExists = (existingUser[0]?.count || 0) > 0;
        const usedInThisRequest = usedUsernames.has(username);
        
        if (!userExists && !usedInThisRequest) {
          isUnique = true;
          usedUsernames.add(username);
        } else {
          counter++;
        }
      }
      
      const password = generateSecurePassword();
      const passwordHash = await hashPassword(password);

      students.push({
        name: studentName,
        username,
        password,
        passwordHash
      });
    }

    // Skapa elevkonton i databasen
    const createdStudents = await createStudentAccounts(
      students.map(s => ({ name: s.name, username: s.username, passwordHash: s.passwordHash })),
      classId
    );

    // Kombinera data för response
    const studentsWithPasswords = createdStudents.map((student, index) => ({
      ...student,
      clearPassword: students[index].password
    }));

    res.json({
      success: true,
      message: `${students.length} elever tillagda!`,
      students: studentsWithPasswords
    });

  } catch (error: any) {
    console.error('Add students error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Serverfel' });
  }
});

// PATCH /api/license/students/:studentId - Uppdatera elevinformation
router.patch('/students/:studentId', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;
    const updates = updateStudentSchema.parse(req.body);
    const userId = req.user.id;

    // Kontrollera att läraren äger eleven
    const ownsStudent = await verifyStudentOwnership(studentId, userId);
    if (!ownsStudent) {
      return res.status(403).json({ error: 'Du har inte behörighet att uppdatera denna elev' });
    }

    // Skapa uppdateringsobjekt med rätt fältnamn
    const updateData: { studentName?: string; isActive?: boolean } = {};
    if (updates.name !== undefined) {
      updateData.studentName = updates.name;
    }
    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }

    const updatedStudent = await updateStudent(studentId, updateData);

    res.json({
      success: true,
      message: 'Elev uppdaterad!',
      student: updatedStudent
    });

  } catch (error: any) {
    console.error('Update student error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/students/:studentId/reset-password - Återställ elevlösenord (genererar ny engångskod)
router.post('/students/:studentId/reset-password', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;

    // Kontrollera att läraren äger eleven
    const ownsStudent = await verifyStudentOwnership(studentId, userId);
    if (!ownsStudent) {
      return res.status(403).json({ error: 'Du har inte behörighet att återställa inloggningen för denna elev' });
    }

    // Återställ lösenord till system-genererat (elev måste ändra vid nästa login)
    await resetStudentPassword(studentId);
    
    // Generera ny engångskod för inloggning
    const { id: setupCodeId, clearCode } = await createStudentSetupCode(studentId, userId);

    res.json({
      success: true,
      message: 'Elevens inloggning återställd! Ny engångskod genererad.',
      setupCode: clearCode, // Visa koden EN gång
      setupCodeId,
      expiresIn: '24 timmar'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// PATCH /api/license/classes/:classId - Uppdatera klassinformation
router.patch('/classes/:classId', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { classId } = req.params;
    const updates = updateClassSchema.parse(req.body);
    const userId = req.user.id;

    // Kontrollera att läraren äger klassen
    const ownsClass = await verifyClassOwnership(classId, userId);
    if (!ownsClass) {
      return res.status(403).json({ error: 'Du har inte behörighet att uppdatera denna klass' });
    }

    // Skapa uppdateringsobjekt
    const updateData: { name?: string; archivedAt?: Date | null } = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.isArchived !== undefined) {
      updateData.archivedAt = updates.isArchived ? new Date() : null;
    }

    const updatedClass = await updateTeacherClass(classId, updateData);

    res.json({
      success: true,
      message: 'Klass uppdaterad!',
      class: updatedClass
    });

  } catch (error: any) {
    console.error('Update class error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({ error: 'Serverfel' });
  }
});

// DELETE /api/license/students/:studentId - Ta bort elev från klass
router.delete('/students/:studentId', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;

    // Kontrollera att läraren äger eleven
    const ownsStudent = await verifyStudentOwnership(studentId, userId);
    if (!ownsStudent) {
      return res.status(403).json({ error: 'Du har inte behörighet att ta bort denna elev' });
    }

    await deleteStudent(studentId);

    res.json({
      success: true,
      message: 'Elev borttagen!'
    });

  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// Hjälpfunktion för att generera säkra lösenord
// Admin endpoints för att hantera licenser och koder

// GET /api/license/admin/codes - Visa alla engångskoder (Admin only)
router.get('/admin/codes', requireAuth, requireRole('ADMIN'), async (req: any, res: Response) => {
  try {
    const codes = await licenseDb
      .select({
        id: oneTimeCodes.id,
        recipientEmail: oneTimeCodes.recipientEmail,
        createdAt: oneTimeCodes.createdAt,
        expiresAt: oneTimeCodes.expiresAt,
        redeemedAt: oneTimeCodes.redeemedAt,
        redeemedBy: oneTimeCodes.redeemedBy,
      })
      .from(oneTimeCodes)
      .orderBy(desc(oneTimeCodes.createdAt))
      .limit(50);

    res.json({ codes });
  } catch (error) {
    console.error('Get codes error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/admin/generate - Generera ny engångskod (Admin only)
router.post('/admin/generate', requireAuth, requireRole('ADMIN'), requireCsrf, async (req: any, res: Response) => {
  try {
    const { recipientEmail, validityDays } = generateCodeSchema.parse(req.body);
    const userId = req.user.id;

    // Kontrollera om det redan finns en aktiv kod för denna e-post
    const existingCodes = await licenseDb
      .select()
      .from(oneTimeCodes)
      .where(eq(oneTimeCodes.recipientEmail, recipientEmail));

    const activeCodes = existingCodes.filter(code => 
      !code.redeemedAt && new Date() < code.expiresAt
    );

    if (activeCodes.length > 0) {
      return res.status(400).json({ 
        error: 'Aktiv kod finns redan',
        message: `Det finns redan en aktiv kod för ${recipientEmail}. Koden går ut: ${activeCodes[0].expiresAt.toLocaleDateString('sv-SE')}`
      });
    }

    // Generera ny kod
    const result = await createOneTimeCode(recipientEmail, validityDays);
    
    // Logga aktivitet
    await logLicenseActivity(null, 'code_generated', {
      recipient_email: recipientEmail,
      validity_days: validityDays,
      code_id: result.id
    }, userId, req.ip || 'unknown');

    // Generate registration link with embedded code
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${req.get('host')}` 
      : `http://${req.get('host')}`;
    const registrationLink = `${baseUrl}/registrera-larare?code=${result.clearTextCode}`;
    
    // Send email with registration code
    let emailSent = false;
    let emailError = null;
    
    try {
      await emailService.sendTeacherRegistrationCode(
        recipientEmail,
        result.clearTextCode,
        registrationLink
      );
      emailSent = true;
      
      // Log successful email send
      await logLicenseActivity(null, 'email_sent', {
        recipient_email: recipientEmail,
        code_id: result.id,
        email_type: 'registration_code'
      }, userId, req.ip || 'unknown');
      
    } catch (error: any) {
      console.error('Failed to send registration email:', error);
      emailError = error.message;
      
      // Log email failure but don't fail the code generation
      await logLicenseActivity(null, 'email_failed', {
        recipient_email: recipientEmail,
        code_id: result.id,
        error: error.message
      }, userId, req.ip || 'unknown');
    }

    // Create appropriate response message
    let message;
    if (emailSent) {
      message = 'Engångskod genererad och e-post skickad!';
    } else {
      message = `Engångskod genererad, men e-post kunde inte skickas (${emailError}). Koden visas nedan:`;
    }

    res.json({
      success: true,
      message,
      emailSent,
      code: {
        id: result.id,
        code: result.clearTextCode,
        recipientEmail,
        expiresAt: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
        validityDays,
        registrationLink
      }
    });

  } catch (error: any) {
    console.error('Generate code error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }

    await logLicenseActivity(null, 'code_generation_failed', { 
      error: error.message,
      attempted_by: req.user?.id
    }, req.user?.id || 'unknown', req.ip || 'unknown');

    res.status(500).json({ error: 'Serverfel vid generering av kod' });
  }
});

// DELETE /api/license/admin/codes/:id - Ta bort engångskod (Admin only)
router.delete('/admin/codes/:id', requireAuth, requireRole('ADMIN'), requireCsrf, async (req: any, res: Response) => {
  try {
    const codeId = req.params.id;
    const userId = req.user.id;

    // Kontrollera om koden finns
    const [code] = await licenseDb
      .select()
      .from(oneTimeCodes)
      .where(eq(oneTimeCodes.id, codeId))
      .limit(1);

    if (!code) {
      return res.status(404).json({ error: 'Kod hittades inte' });
    }

    // Ta bort koden
    await licenseDb
      .delete(oneTimeCodes)
      .where(eq(oneTimeCodes.id, codeId));

    // Logga aktivitet
    await logLicenseActivity(null, 'code_deleted', {
      code_id: codeId,
      recipient_email: code.recipientEmail,
      was_redeemed: !!code.redeemedAt
    }, userId, req.ip || 'unknown');

    res.json({ 
      success: true, 
      message: 'Engångskod borttagen' 
    });

  } catch (error: any) {
    console.error('Delete code error:', error);
    res.status(500).json({ error: 'Serverfel vid borttagning av kod' });
  }
});

// DELETE /api/license/admin/licenses/:id - Ta bort lärarlicens (Admin only)  
router.delete('/admin/licenses/:id', requireAuth, requireRole('ADMIN'), requireCsrf, async (req: any, res: Response) => {
  try {
    const licenseId = req.params.id;
    const userId = req.user.id;

    // Kontrollera om licensen finns (använd getActiveLicense istället)
    const license = await getActiveLicense(licenseId);

    if (!license) {
      return res.status(404).json({ error: 'Licens hittades inte' });
    }

    // Kontrollera om läraren har klasser (använd getTeacherClasses)
    const classes = await getTeacherClasses(license.teacherId);

    if (classes.length > 0) {
      return res.status(400).json({ 
        error: 'Kan inte ta bort licens',
        message: `Läraren har ${classes.length} aktiv(a) klass(er). Ta bort klasserna först.`
      });
    }

    // Ta bort licensen (detta kräver en funktion i licenseDb)
    // För nu returnera ett fel som säger att funktionen inte är implementerad
    return res.status(501).json({ 
      error: 'Funktionen är inte implementerad än',
      message: 'Borttagning av licenser kommer i nästa uppdatering'
    });

  } catch (error: any) {
    console.error('Delete license error:', error);
    res.status(500).json({ error: 'Serverfel vid borttagning av licens' });
  }
});

// GET /api/license/classes/:classId/students - Hämta elever i en klass
router.get('/classes/:classId/students', requireAuth, requireTeacherLicense, requireSchoolAccess(), async (req: any, res: Response) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;
    
    // Verify teacher owns this class
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna klass' });
    }
    
    // Get students in the class
    const students = await licenseDb
      .select({
        id: studentAccounts.id,
        username: studentAccounts.username,
        studentName: studentAccounts.studentName,
        mustChangePassword: studentAccounts.mustChangePassword,
        failedLoginAttempts: studentAccounts.failedLoginAttempts,
        lastLogin: studentAccounts.lastLogin,
        createdAt: studentAccounts.createdAt,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.classId, classId));
    
    res.json({ students });
  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/classes/:classId/students - Lägg till elev i klass
router.post('/classes/:classId/students', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { classId } = req.params;
    const { studentName } = req.body;
    const userId = req.user.id;
    
    if (!studentName || typeof studentName !== 'string') {
      return res.status(400).json({ error: 'Elevnamn krävs' });
    }
    
    // Verify teacher owns this class
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna klass' });
    }
    
    // Generate username and password
    const baseUsername = studentName.toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z]/g, '')
      .substring(0, 8);
    
    // Generate unique username across the entire system
    let username = '';
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique) {
      username = `${baseUsername}${String(counter).padStart(2, '0')}`;
      
      // Check if username already exists globally
      const existingUser = await licenseDb
        .select({ count: sql<number>`count(*)` })
        .from(studentAccounts)
        .where(eq(studentAccounts.username, username));
        
      const userExists = (existingUser[0]?.count || 0) > 0;
      
      if (!userExists) {
        isUnique = true;
      } else {
        counter++;
      }
    }
    const password = generateSecurePassword();
    const passwordHash = await hashPassword(password);
    
    // Create student account
    const [newStudent] = await licenseDb.insert(studentAccounts).values({
      studentName,
      username,
      passwordHash,
      classId,
      mustChangePassword: true,
    }).returning();
    
    res.json({
      success: true,
      student: {
        ...newStudent,
        clearPassword: password // Only for initial display
      }
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// PUT /api/license/students/:studentId/reset-password - Återställ elevlösenord
router.put('/students/:studentId/reset-password', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    
    // Get student and verify teacher has access to this student's class
    const [student] = await licenseDb
      .select({
        id: studentAccounts.id,
        classId: studentAccounts.classId,
        studentName: studentAccounts.studentName,
        username: studentAccounts.username,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.id, studentId))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ error: 'Elev hittades inte' });
    }
    
    // Verify teacher owns the class this student belongs to
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === student.classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna elev' });
    }
    
    // Generate new password
    const newPassword = generateSecurePassword();
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update student password
    await updateStudentPassword(studentId, newPasswordHash);
    
    // Generate new setup code for secure login instead of storing password
    const { id: setupCodeId, clearCode: setupCode } = await createStudentSetupCode(studentId, userId);
    
    res.json({
      success: true,
      message: 'Elevens inloggning återställd! Ny engångskod genererad.',
      student: {
        id: student.id,
        username: student.username,
        studentName: student.studentName,
        setupCode: setupCode, // Secure setup code instead of password
        setupCodeId,
        expiresIn: '24 timmar'
      }
    });
  } catch (error) {
    console.error('Reset student password error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// DELETE /api/license/students/:studentId - Ta bort elev
router.delete('/students/:studentId', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    
    // Get student and verify teacher has access
    const [student] = await licenseDb
      .select({
        id: studentAccounts.id,
        classId: studentAccounts.classId,
        studentName: studentAccounts.studentName,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.id, studentId))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ error: 'Elev hittades inte' });
    }
    
    // Verify teacher owns the class
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === student.classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet att ta bort denna elev' });
    }
    
    // Delete student account
    await licenseDb
      .delete(studentAccounts)
      .where(eq(studentAccounts.id, studentId));
    
    res.json({
      success: true,
      message: 'Elev borttagen'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});


// POST /api/license/classes/:classId/students - Lägg till ny elev i klass
router.post('/classes/:classId/students', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { classId } = req.params;
    const { studentName } = z.object({ studentName: z.string().min(1) }).parse(req.body);
    const userId = req.user.id;
    
    // Verify teacher owns this class
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna klass' });
    }
    
    // Generate unique username
    const baseUsername = studentName.toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z]/g, '')
      .substring(0, 8);
    
    let username = baseUsername;
    let counter = 1;
    
    // Ensure unique username
    while (await getStudentByUsername(username)) {
      username = `${baseUsername}${String(counter).padStart(2, '0')}`;
      counter++;
    }
    
    // Generate secure password
    const clearPassword = generateSecurePassword();
    const passwordHash = await hashPassword(clearPassword);
    
    // Create student account
    const [student] = await createStudentAccounts(
      [{ name: studentName, username, passwordHash }],
      classId
    );
    
    // Generate setup code for secure first-time login instead of storing password
    const { id: setupCodeId, clearCode: setupCode } = await createStudentSetupCode(student.id, userId);
    
    res.json({
      success: true,
      message: 'Elev skapad',
      student: {
        id: student.id,
        username: student.username,
        studentName: student.studentName,
        setupCode: setupCode, // Return secure setup code instead of password
        setupCodeId,
        expiresIn: '24 timmar'
      }
    });
    
  } catch (error: any) {
    console.error('Add student error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({ error: 'Serverfel' });
  }
});

// PUT /api/license/students/:studentId/tool-settings - Uppdatera tillgänglighetsinställningar för elev
router.put('/students/:studentId/tool-settings', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;
    const userId = req.user.id;
    const toolSettings = req.body;
    
    // Get student and verify teacher has access
    const [student] = await licenseDb
      .select({
        id: studentAccounts.id,
        classId: studentAccounts.classId,
        studentName: studentAccounts.studentName,
        username: studentAccounts.username,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.id, studentId))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ error: 'Elev hittades inte' });
    }
    
    // Verify teacher owns the class this student belongs to
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === student.classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna elev' });
    }
    
    // Log settings update
    await logLicenseActivity(
      req.license.id, 
      'tool_settings_updated', 
      { 
        student_id: studentId,
        student_username: student.username,
        student_name: student.studentName,
        settings_updated: Object.keys(toolSettings)
      }, 
      userId, 
      req.ip || 'unknown'
    );
    
    res.json({
      success: true,
      message: 'Inställningar uppdaterade',
      student: {
        id: student.id,
        username: student.username,
        studentName: student.studentName
      }
    });
    
  } catch (error) {
    console.error('Update tool settings error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// CRITICAL MISSING ENDPOINTS - Required by frontend with exact specifications

// GET /api/license/students/:id/password - Hämta elevs lösenord för visning (med :id parameter)
router.get('/students/:id/password', requireAuth, requireTeacherLicense, requireSchoolAccess(), async (req: any, res: Response) => {
  try {
    const { id: studentId } = req.params;
    const userId = req.user.id;
    
    // Get student and verify teacher has access
    const [student] = await licenseDb
      .select({
        id: studentAccounts.id,
        classId: studentAccounts.classId,
        studentName: studentAccounts.studentName,
        username: studentAccounts.username,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.id, studentId))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ error: 'Elev hittades inte' });
    }
    
    // Verify teacher owns the class this student belongs to
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === student.classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna elev' });
    }
    
    // Check if there's an active setup code instead of stored password
    const activeSetupCode = await getActiveSetupCode(studentId, userId);
    
    if (!activeSetupCode.exists) {
      return res.status(404).json({ 
        error: 'Ingen aktiv engångskod',
        message: 'Det finns ingen aktiv engångskod för eleven. Generera en ny kod för säker inloggning.'
      });
    }
    
    // Log setup code access
    await logLicenseActivity(
      req.license.id, 
      'setup_code_info_viewed', 
      { 
        student_id: studentId,
        student_username: student.username,
        student_name: student.studentName
      }, 
      userId, 
      req.ip || 'unknown'
    );
    
    res.json({ 
      hasActiveSetupCode: true,
      studentId: student.id,
      username: student.username,
      expiresAt: activeSetupCode.expiresAt,
      createdAt: activeSetupCode.createdAt,
      message: 'Engångskod är aktiv - generera ny kod för att visa den'
    });
    
  } catch (error) {
    console.error('Get student password error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/students/:id/reset-password - Återställ elevlösenord (med POST och :id parameter)
router.post('/students/:id/reset-password', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { id: studentId } = req.params;
    const userId = req.user.id;
    
    // Get student and verify teacher has access to this student's class
    const [student] = await licenseDb
      .select({
        id: studentAccounts.id,
        classId: studentAccounts.classId,
        studentName: studentAccounts.studentName,
        username: studentAccounts.username,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.id, studentId))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ error: 'Elev hittades inte' });
    }
    
    // Verify teacher owns the class this student belongs to
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === student.classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna elev' });
    }
    
    // Generate new password
    const newPassword = generateSecurePassword();
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update student password
    await updateStudentPassword(studentId, newPasswordHash);
    
    // Generate new setup code for secure login instead of storing password
    const { id: setupCodeId, clearCode: setupCode } = await createStudentSetupCode(studentId, userId);
    
    // Log password reset activity
    await logLicenseActivity(
      req.license.id, 
      'password_reset_with_setup_code', 
      { 
        student_id: studentId,
        student_username: student.username,
        student_name: student.studentName,
        setup_code_id: setupCodeId
      }, 
      userId, 
      req.ip || 'unknown'
    );
    
    res.json({
      success: true,
      message: 'Elevens inloggning återställd! Ny engångskod genererad.',
      student: {
        id: student.id,
        username: student.username,
        studentName: student.studentName,
        setupCode: setupCode, // Secure setup code instead of password
        setupCodeId,
        expiresIn: '24 timmar'
      }
    });
  } catch (error) {
    console.error('Reset student password error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// DELETE /api/license/students/:id - Ta bort elev (med :id parameter)
router.delete('/students/:id', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { id: studentId } = req.params;
    const userId = req.user.id;
    
    // Get student and verify teacher has access
    const [student] = await licenseDb
      .select({
        id: studentAccounts.id,
        classId: studentAccounts.classId,
        studentName: studentAccounts.studentName,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.id, studentId))
      .limit(1);
    
    if (!student) {
      return res.status(404).json({ error: 'Elev hittades inte' });
    }
    
    // Verify teacher owns the class
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === student.classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet att ta bort denna elev' });
    }
    
    // Log deletion activity before actually deleting
    await logLicenseActivity(
      req.license.id, 
      'student_deleted', 
      { 
        student_id: studentId,
        student_name: student.studentName
      }, 
      userId, 
      req.ip || 'unknown'
    );
    
    // Delete student account
    await licenseDb
      .delete(studentAccounts)
      .where(eq(studentAccounts.id, studentId));
    
    res.json({
      success: true,
      message: 'Elev borttagen'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/students/:id/generate-setup-code - Generate new setup code for student
router.post('/students/:id/generate-setup-code', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { id: studentId } = req.params;
    const userId = req.user.id;
    const ipAddress = req.ip || 'unknown';

    // Get student details and verify access
    const student = await getStudentById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Eleven hittades inte' });
    }

    // Verify teacher owns the class
    const teacherClasses = await getTeacherClasses(userId);
    const ownsClass = teacherClasses.some(cls => cls.id === student.classId);
    
    if (!ownsClass) {
      return res.status(403).json({ error: 'Ingen behörighet för denna elev' });
    }

    // Generate new setup code (this will deactivate any existing codes)
    const { id: setupCodeId, clearCode } = await createStudentSetupCode(studentId, userId);

    // Log the action (use teacher's license ID if available)
    const licenseId = req.teacherContext?.licenseId || null;
    await logLicenseActivity(
      licenseId, 
      'generate_setup_code', 
      { 
        student_id: studentId,
        student_name: student.studentName,
        setup_code_id: setupCodeId
      }, 
      userId, 
      ipAddress
    );

    res.json({
      success: true,
      message: 'Ny engångskod genererad framgångsrikt',
      setupCode: clearCode,
      studentName: student.studentName,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    });

  } catch (error: any) {
    console.error('Generate setup code error:', error);
    res.status(500).json({ error: 'Serverfel vid generering av engångskod' });
  }
});

// POST /api/license/email-credentials - Skicka klasskoder via e-post
router.post('/email-credentials', requireAuth, requireTeacherLicense, requireSchoolAccess(), requireCsrf, async (req: any, res: Response) => {
  try {
    const { classId, forceRegenerate } = req.body;
    const userId = req.user.id;
    const ipAddress = req.ip || 'unknown';

    if (!classId) {
      return res.status(400).json({ error: 'Klass-ID krävs' });
    }

    // Get teacher's email from authenticated user
    const teacherEmail = req.user.email;
    if (!teacherEmail) {
      return res.status(400).json({ error: 'Ingen e-postadress registrerad på ditt lärarkonto' });
    }

    // Verify teacher owns this class and get class details
    const teacherClasses = await getTeacherClasses(userId);
    const ownedClass = teacherClasses.find(cls => cls.id === classId);
    
    if (!ownedClass) {
      return res.status(403).json({ error: 'Ingen behörighet till denna klass' });
    }

    const className = ownedClass.name;

    // Fetch students from database (trusted source)
    const students = await licenseDb
      .select({
        id: studentAccounts.id,
        studentName: studentAccounts.studentName,
        username: studentAccounts.username,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.classId, classId));

    // Check for existing setup codes first
    const studentsWithActiveCodesCheck = await Promise.all(
      students.map(async (student) => {
        const existingCode = await getActiveSetupCode(student.id, userId);
        return {
          student,
          hasActiveCode: existingCode.exists
        };
      })
    );

    const studentsWithActiveCodes = studentsWithActiveCodesCheck.filter(s => s.hasActiveCode);
    
    // If any students have active codes and forceRegenerate is not true, ask for confirmation
    if (studentsWithActiveCodes.length > 0 && !forceRegenerate) {
      return res.status(409).json({
        error: 'existing_codes_found',
        message: `${studentsWithActiveCodes.length} elever har redan aktiva koder. Generera nya koder kommer att invalidera befintliga koder och kan störa pågående inloggningar.`,
        studentsWithExistingCodes: studentsWithActiveCodes.length,
        classData: { id: classId, name: className }
      });
    }

    // Generate setup codes (either all new or regenerate existing ones)
    const studentsWithCodes = await Promise.all(
      students.map(async (student) => {
        try {
          const existingCodeCheck = studentsWithActiveCodesCheck.find(s => s.student.id === student.id);
          
          if (existingCodeCheck?.hasActiveCode && !forceRegenerate) {
            // This should not happen due to check above, but keep as safety
            throw new Error('Existing code found without force regenerate');
          }
          
          // Generate new code
          const { clearCode } = await createStudentSetupCode(student.id, userId);
          
          // Log the action appropriately
          await logLicenseActivity(
            null, 
            forceRegenerate ? 'setup_code_regenerated_for_email' : 'setup_code_generated_for_email', 
            { 
              student_id: student.id,
              student_name: student.studentName,
              force_regenerate: forceRegenerate,
              reason: forceRegenerate ? 'teacher_confirmed_regenerate' : 'no_active_code_found'
            }, 
            userId, 
            ipAddress
          );
          
          return {
            ...student,
            setupCode: clearCode
          };
        } catch (error) {
          console.error(`Failed to handle setup code for student ${student.id}:`, error);
          return {
            ...student,
            setupCode: 'Kunde inte hantera kod'
          };
        }
      })
    );

    if (studentsWithCodes.length === 0) {
      return res.status(400).json({ error: 'Inga elever hittades i denna klass' });
    }

    // Create email content
    const subject = `Inloggningsuppgifter för klass ${className}`;
    
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .student { background-color: white; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb; }
            .student-name { font-weight: bold; font-size: 16px; color: #1e40af; }
            .credentials { margin-top: 8px; font-family: monospace; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Inloggningsuppgifter - ${className}</h1>
            </div>
            <div class="content">
              <p>Här är inloggningsuppgifterna för eleverna i klass <strong>${className}</strong>:</p>
              
              ${studentsWithCodes.map(student => `
                <div class="student">
                  <div class="student-name">${student.studentName}</div>
                  <div class="credentials">
                    <strong>Användarnamn:</strong> ${student.username}<br>
                    <strong>Engångskod:</strong> ${student.setupCode}
                  </div>
                </div>
              `).join('')}
              
              <p><strong>Instruktioner för eleverna:</strong></p>
              <ol>
                <li>Gå till inloggningssidan</li>
                <li>Ange sitt användarnamn och engångskod</li>
                <li>Skapa ett nytt lösenord vid första inloggning</li>
                <li>Använd det nya lösenordet för framtida inloggningar</li>
              </ol>
              
              <p><strong>Viktigt:</strong> Engångskoderna fungerar endast vid första inloggning. Efter det använder eleverna sina egna lösenord.</p>
            </div>
            <div class="footer">
              <p>Detta meddelande skickades från Ordflyt.se<br>
              Genererat: ${new Date().toLocaleString('sv-SE')}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Inloggningsuppgifter - ${className}

Här är inloggningsuppgifterna för eleverna i klass ${className}:

${studentsWithCodes.map(student => `
${student.studentName}
Användarnamn: ${student.username}
Engångskod: ${student.setupCode}
`).join('\n')}

Instruktioner för eleverna:
1. Gå till inloggningssidan
2. Ange sitt användarnamn och engångskod
3. Skapa ett nytt lösenord vid första inloggning
4. Använd det nya lösenordet för framtida inloggningar

Viktigt: Engångskoderna fungerar endast vid första inloggning. Efter det använder eleverna sina egna lösenord.

Detta meddelande skickades från Ordflyt.se
Genererat: ${new Date().toLocaleString('sv-SE')}
    `;

    // Send email
    await emailService.sendCustomEmail(teacherEmail, subject, htmlBody, textBody);

    // Log the action
    const licenseId = req.teacherContext?.licenseId || null;
    await logLicenseActivity(
      licenseId, 
      'email_credentials', 
      { 
        class_id: classId,
        class_name: className,
        student_count: studentsWithCodes.length,
        recipient_email: teacherEmail
      }, 
      userId, 
      ipAddress
    );

    res.json({
      success: true,
      message: `Inloggningsuppgifter skickade till ${teacherEmail}`,
      studentCount: studentsWithCodes.length,
      regeneratedCodes: forceRegenerate ? studentsWithActiveCodes.length : 0
    });

  } catch (error: any) {
    console.error('Email credentials error:', error);
    res.status(500).json({ 
      error: 'Serverfel vid e-postutskick',
      details: error.message 
    });
  }
});

export default router;