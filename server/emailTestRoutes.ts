import { Router } from 'express';
import { emailService } from './emailService';
import { requireAuth, requireRole, requireCsrf } from './auth';
import { z } from 'zod';

const router = Router();

// Test email schema
const testEmailSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  testType: z.enum(['registration_code', 'confirmation', 'custom'], {
    errorMap: () => ({ message: 'Ogiltig testtyp' })
  }),
  customMessage: z.string().optional(),
  customSubject: z.string().optional()
});

// POST /api/email/test-domain - Test if email domain is compatible with sender domain
router.post('/test-domain', requireAuth, requireRole('ADMIN'), requireCsrf, async (req: any, res) => {
  try {
    const { email } = req.body;
    const fromEmail = process.env.FROM_EMAIL || 'noreply@ordflyt.se';
    
    const emailDomain = email.split('@')[1];
    const senderDomain = fromEmail.split('@')[1];
    
    const sameDomain = emailDomain === senderDomain;
    
    res.json({
      sameDomain,
      emailDomain,
      senderDomain,
      warning: !sameDomain ? 'Om ditt Postmark-konto väntar på godkännande kan detta e-posttest misslyckas.' : null
    });
  } catch (error) {
    res.status(400).json({ error: 'Ogiltig e-postadress' });
  }
});

// POST /api/email/test - Test email functionality
router.post('/test', requireAuth, requireRole('ADMIN'), requireCsrf, async (req: any, res) => {
  try {
    const { email, testType, customMessage, customSubject } = testEmailSchema.parse(req.body);
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

    } else if (testType === 'custom') {
      // Send custom test email
      const subject = customSubject || 'Test från Ordflyt.se';
      const message = customMessage || 'Detta är ett testmeddelande från Ordflyt.se e-postsystem.';

      await emailService.sendCustomTestEmail(email, subject, message);

      res.json({
        success: true,
        message: `Anpassat testmeddelande skickat till ${email}`,
        testData: {
          subject,
          message,
          type: 'custom'
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
      let errorDetails = 'Kontrollera Postmark-konfiguration och API-nyckel';
      
      // Check for pending approval error
      if (error.message?.includes('pending approval')) {
        errorDetails = 'Ditt Postmark-konto väntar på godkännande. Under denna tid kan du bara skicka e-post till adresser med samma domän som avsändaradressen (ordflyt.se). Kontakta Postmark för att få ditt konto godkänt.';
      }
      
      return res.status(422).json({ 
        error: 'E-postleverans misslyckades',
        details: errorDetails,
        isApprovalPending: error.message?.includes('pending approval') || false
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