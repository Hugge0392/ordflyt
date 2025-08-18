import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
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
  updateStudentPassword,
  logLicenseActivity
} from './licenseDb';
import { requireAuth } from './auth';
import { Request, Response } from 'express';

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

// POST /api/license/redeem - Lösa in engångskod
router.post('/redeem', requireAuth, async (req: any, res: Response) => {
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
      }, userId, req.ip);
      
      return res.status(400).json({ error: 'Ogiltig kod' });
    }

    // Kontrollera om koden redan är använd
    if (oneTimeCode.redeemedAt) {
      await logLicenseActivity(null, 'redeem_failed', { 
        reason: 'code_already_used',
        attempted_by: userId,
        user_email: userEmail,
        code_id: oneTimeCode.id
      }, userId, req.ip);

      return res.status(400).json({ error: 'Koden har redan använts' });
    }

    // Kontrollera om koden har gått ut
    if (new Date() > oneTimeCode.expiresAt) {
      await logLicenseActivity(null, 'redeem_failed', { 
        reason: 'code_expired',
        attempted_by: userId,
        user_email: userEmail,
        code_id: oneTimeCode.id
      }, userId, req.ip);

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
      }, userId, req.ip);

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
    }, userId, req.ip);

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
    }, req.user?.id, req.ip);

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
router.get('/classes', requireAuth, requireActiveLicense, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const classes = await getTeacherClasses(userId);

    res.json({ classes });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

// POST /api/license/classes - Skapa ny klass
router.post('/classes', requireAuth, requireActiveLicense, async (req: any, res: Response) => {
  try {
    const { name, term, description, studentNames } = createClassSchema.parse(req.body);
    const userId = req.user.id;
    const license = req.license;

    // Skapa klass
    const teacherClass = await createTeacherClass(name, userId, license.id, term, description);

    // Generera användarnamn och lösenord för elever
    const students = studentNames.map((studentName: string, index: number) => {
      const baseUsername = studentName.toLowerCase()
        .replace(/[åä]/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/[^a-z]/g, '')
        .substring(0, 8);
      
      const username = `${baseUsername}${String(index + 1).padStart(2, '0')}`;
      const password = generateSecurePassword();
      const passwordHash = bcrypt.hashSync(password, 12);

      return {
        name: studentName,
        username,
        password, // Sparas tillfälligt för CSV-export
        passwordHash
      };
    });

    // Skapa elevkonton i databasen
    const createdStudents = await createStudentAccounts(
      students.map(s => ({ name: s.name, username: s.username, passwordHash: s.passwordHash })),
      teacherClass.id
    );

    // Kombinera data för response
    const studentsWithPasswords = createdStudents.map((student, index) => ({
      ...student,
      clearPassword: students[index].password // Bara för att visa i UI
    }));

    res.json({
      success: true,
      message: 'Klass skapad!',
      class: teacherClass,
      students: studentsWithPasswords
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

// Hjälpfunktion för att generera säkra lösenord
function generateSecurePassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

export default router;