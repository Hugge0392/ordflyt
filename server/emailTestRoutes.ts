import { Router } from 'express';
import { emailService } from './emailService';
import { requireAuth, requireRole } from './auth';
import { z } from 'zod';

const router = Router();

// Test email schema
const testEmailSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  testType: z.enum(['registration_code', 'confirmation'], {
    errorMap: () => ({ message: 'Ogiltig testtyp' })
  })
});

// POST /api/email/test - Test email functionality
router.post('/test', requireAuth, requireRole('ADMIN'), async (req: any, res) => {
  try {
    const { email, testType } = testEmailSchema.parse(req.body);
    const userId = req.user.id;
    const ipAddress = req.ip || 'unknown';

    console.log(`Testing email functionality: ${testType} to ${email}`);

    if (testType === 'registration_code') {
      // Send test registration code email
      const testCode = 'TEST-1234-5678-9ABC';
      const testLink = `${req.protocol}://${req.get('host')}/auth/register?code=${testCode}`;
      
      await emailService.sendTeacherRegistrationCode(
        email,
        testCode,
        testLink
      );

      res.json({
        success: true,
        message: `Test-registreringskod skickad till ${email}`,
        testData: {
          code: testCode,
          link: testLink,
          type: 'registration_code'
        }
      });

    } else if (testType === 'confirmation') {
      // Send test confirmation email
      const testTeacherName = 'Test Lärare';
      
      await emailService.sendRegistrationConfirmation(
        email,
        testTeacherName
      );

      res.json({
        success: true,
        message: `Test-bekräftelsemail skickad till ${email}`,
        testData: {
          teacherName: testTeacherName,
          type: 'confirmation'
        }
      });
    }

  } catch (error: any) {
    console.error('Email test error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Ogiltiga data',
        details: error.errors.map(e => e.message)
      });
    }

    // Check if it's a Postmark-specific error
    if (error.message?.includes('Email delivery failed')) {
      return res.status(500).json({ 
        error: 'E-postleverans misslyckades',
        details: 'Kontrollera Postmark-konfiguration och API-nyckel'
      });
    }

    res.status(500).json({ 
      error: 'Serverfel vid e-posttest',
      details: error.message
    });
  }
});

// GET /api/email/config - Check email configuration
router.get('/config', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const hasPostmarkToken = !!process.env.POSTMARK_API_TOKEN;
    const hasFromEmail = !!process.env.FROM_EMAIL;
    
    let configValid = false;
    let testResult = null;

    if (hasPostmarkToken && hasFromEmail) {
      try {
        configValid = await emailService.testEmailConfig();
        testResult = 'Konfiguration testad framgångsrikt';
      } catch (error) {
        testResult = `Konfigurationstest misslyckades: ${error}`;
      }
    }

    res.json({
      config: {
        hasPostmarkToken,
        hasFromEmail,
        fromEmail: process.env.FROM_EMAIL || 'Inte konfigurerad',
        configValid,
        testResult
      }
    });

  } catch (error) {
    console.error('Email config check error:', error);
    res.status(500).json({ error: 'Serverfel vid konfigurationskontroll' });
  }
});

export default router;