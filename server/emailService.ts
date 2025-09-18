import { ServerClient } from "postmark";

// Initialize Postmark client
const postmarkClient = new ServerClient(process.env.POSTMARK_API_TOKEN || "");
const fromEmail = process.env.FROM_EMAIL || "noreply@ordflyt.se";

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export class EmailService {
  private client: ServerClient;
  private fromEmail: string;
  private isConfigured: boolean;

  constructor() {
    // Make EmailService robust for development environment
    const postmarkToken = process.env.POSTMARK_API_TOKEN;
    const emailFrom = process.env.FROM_EMAIL;
    
    if (!postmarkToken || !emailFrom) {
      console.warn(
        `⚠️  EMAIL SERVICE WARNING: Missing email credentials (POSTMARK_API_TOKEN=${!!postmarkToken}, FROM_EMAIL=${!!emailFrom}). ` +
        'Email sending will be disabled but app will continue to work in development mode.'
      );
      this.isConfigured = false;
      this.client = new ServerClient(""); // Empty token for development
      this.fromEmail = emailFrom || "noreply@ordflyt.se";
    } else {
      console.log('✅ Email service configured with Postmark');
      this.isConfigured = true;
      this.client = postmarkClient;
      this.fromEmail = emailFrom;
    }
  }

  // Send teacher registration code email
  async sendTeacherRegistrationCode(
    toEmail: string, 
    registrationCode: string, 
    registrationLink: string
  ): Promise<void> {
    const subject = "Din lärarregistrering för Ordflyt.se";
    
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .code { background-color: #1e40af; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Välkommen till Ordflyt.se!</h1>
            </div>
            <div class="content">
              <h2>Din lärarregistrering</h2>
              <p>Du har fått denna engångskod för att registrera dig som lärare på Ordflyt.se:</p>
              
              <div class="code">${registrationCode}</div>
              
              <p>Eller klicka på länken nedan för att registrera dig direkt:</p>
              <a href="${registrationLink}" class="button">Registrera dig som lärare</a>
              
              <p><strong>Viktig information:</strong></p>
              <ul>
                <li>Denna kod är giltig i 24 timmar</li>
                <li>Koden kan endast användas en gång</li>
                <li>Efter registrering får du full tillgång till alla lärarverktyg</li>
              </ul>
              
              <p>Om du har frågor eller problem, kontakta oss genom att svara på detta e-postmeddelande.</p>
              
              <p>Välkommen till Ordflyt.se!</p>
            </div>
            <div class="footer">
              <p>Detta meddelande skickades från Ordflyt.se<br>
              Om du inte begärde denna registrering kan du ignorera detta e-postmeddelande.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Välkommen till Ordflyt.se!

Din lärarregistrering
===================

Du har fått denna engångskod för att registrera dig som lärare på Ordflyt.se:

REGISTRERINGSKOD: ${registrationCode}

Alternativt kan du klicka på denna länk för att registrera dig direkt:
${registrationLink}

VIKTIG INFORMATION:
- Denna kod är giltig i 24 timmar
- Koden kan endast användas en gång
- Efter registrering får du full tillgång till alla lärarverktyg

Om du har frågor eller problem, kontakta oss genom att svara på detta e-postmeddelande.

Välkommen till Ordflyt.se!

---
Detta meddelande skickades från Ordflyt.se
Om du inte begärde denna registrering kan du ignorera detta e-postmeddelande.
    `;

    await this.sendEmail(toEmail, subject, htmlBody, textBody);
  }

  // Send registration confirmation email
  async sendRegistrationConfirmation(
    toEmail: string, 
    teacherName: string
  ): Promise<void> {
    const subject = "Registrering bekräftad - Välkommen till Ordflyt.se!";
    
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .success { background-color: #dcfce7; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Registrering genomförd!</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>Grattis ${teacherName}!</strong> Din lärarregistrering på Ordflyt.se är nu klar.
              </div>
              
              <h2>Vad händer nu?</h2>
              <p>Du har nu full tillgång till alla lärarverktyg på Ordflyt.se:</p>
              
              <ul>
                <li><strong>Läsförståelse-admin:</strong> Skapa interaktiva läsuppgifter</li>
                <li><strong>Ordklass-verktyg:</strong> Grammatikövningar och spel</li>
                <li><strong>Elevhantering:</strong> Följ elevernas progress</li>
                <li><strong>Rapporter:</strong> Detaljerade resultatrapporter</li>
              </ul>
              
              <a href="https://ordflyt.se/admin" class="button">Logga in på lärarportalen</a>
              
              <h3>Kom igång snabbt:</h3>
              <ol>
                <li>Logga in med dina uppgifter</li>
                <li>Utforska lärarverktygen</li>
                <li>Skapa din första lektion</li>
                <li>Bjud in dina elever</li>
              </ol>
              
              <p>Om du behöver hjälp eller har frågor, tveka inte att kontakta oss!</p>
            </div>
            <div class="footer">
              <p>Tack för att du väljer Ordflyt.se för din undervisning!<br>
              Med vänliga hälsningar, Ordflyt-teamet</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Registrering genomförd!
=====================

Grattis ${teacherName}! Din lärarregistrering på Ordflyt.se är nu klar.

Vad händer nu?
Du har nu full tillgång till alla lärarverktyg på Ordflyt.se:

- Läsförståelse-admin: Skapa interaktiva läsuppgifter
- Ordklass-verktyg: Grammatikövningar och spel
- Elevhantering: Följ elevernas progress
- Rapporter: Detaljerade resultatrapporter

Logga in här: https://ordflyt.se/admin

Kom igång snabbt:
1. Logga in med dina uppgifter
2. Utforska lärarverktygen
3. Skapa din första lektion
4. Bjud in dina elever

Om du behöver hjälp eller har frågor, tveka inte att kontakta oss!

---
Tack för att du väljer Ordflyt.se för din undervisning!
Med vänliga hälsningar, Ordflyt-teamet
    `;

    await this.sendEmail(toEmail, subject, htmlBody, textBody);
  }

  // Send custom test email
  async sendCustomTestEmail(
    toEmail: string,
    subject: string,
    message: string
  ): Promise<void> {
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Test från Ordflyt.se</h1>
            </div>
            <div class="content">
              <p>${message.replace(/\n/g, '<br>')}</p>
              <p><em>Detta är ett testmeddelande skickat från Ordflyt.se admin-panel.</em></p>
            </div>
            <div class="footer">
              <p>Ordflyt.se - Språklärande för alla</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Test från Ordflyt.se
==================

${message}

---
Detta är ett testmeddelande skickat från Ordflyt.se admin-panel.
Ordflyt.se - Språklärande för alla
    `;

    await this.sendEmail(toEmail, subject, htmlBody, textBody);
  }

  // Send password reset email
  async sendPasswordReset(
    toEmail: string, 
    resetToken: string, 
    resetLink: string
  ): Promise<void> {
    const subject = "Återställ ditt lösenord för Ordflyt.se";
    
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .warning { background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Återställ lösenord</h1>
            </div>
            <div class="content">
              <p>Hej,</p>
              
              <p>Du har begärt att återställa ditt lösenord för Ordflyt.se. Klicka på knappen nedan för att skapa ett nytt lösenord:</p>
              
              <a href="${resetLink}" class="button">Återställ lösenord</a>
              
              <div class="warning">
                <strong>Säkerhetsinformation:</strong>
                <ul>
                  <li>Denna länk är giltig i 1 timme</li>
                  <li>Länken kan endast användas en gång</li>
                  <li>Om du inte begärde denna återställning, ignorera detta meddelande</li>
                </ul>
              </div>
              
              <p>Om knappen inte fungerar kan du kopiera och klistra in följande länk i din webbläsare:</p>
              <p style="word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">${resetLink}</p>
            </div>
            <div class="footer">
              <p>Detta meddelande skickades från Ordflyt.se<br>
              Om du inte begärde en lösenordsåterställning kan du ignorera detta e-postmeddelande.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Återställ lösenord
=================

Hej,

Du har begärt att återställa ditt lösenord för Ordflyt.se. 

Klicka på följande länk för att skapa ett nytt lösenord:
${resetLink}

SÄKERHETSINFORMATION:
- Denna länk är giltig i 1 timme
- Länken kan endast användas en gång
- Om du inte begärde denna återställning, ignorera detta meddelande

---
Detta meddelande skickades från Ordflyt.se
Om du inte begärde en lösenordsåterställning kan du ignorera detta e-postmeddelande.
    `;

    await this.sendEmail(toEmail, subject, htmlBody, textBody);
  }

  // Generic method to send emails
  private async sendEmail(
    to: string, 
    subject: string, 
    htmlBody: string, 
    textBody: string
  ): Promise<void> {
    // Graceful degradation when email service is not properly configured
    if (!this.isConfigured) {
      console.log(
        `📧 EMAIL SIMULATION (development mode): Would send email to ${to}\n` +
        `   Subject: ${subject}\n` +
        `   Text preview: ${textBody.substring(0, 200)}...`
      );
      return; // Don't actually send email, just log what would have been sent
    }

    try {
      const response = await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: "outbound"
      });

      console.log(`✅ Email sent successfully to ${to}:`, response.MessageID);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      
      // In development, don't crash the app - just log the failure
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔄 Email sending failed in development mode - continuing without sending');
        return;
      }
      
      // In production, still throw the error so calling code can handle it
      throw new Error(`Email delivery failed: ${error}`);
    }
  }

  // Send email verification for teacher registration
  async sendEmailVerification(
    toEmail: string, 
    verificationToken: string, 
    verificationLink: string
  ): Promise<void> {
    const subject = "Verifiera din email - Ordflyt.se";
    
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .token { background-color: #e5e7eb; padding: 10px; font-family: monospace; border-radius: 5px; margin: 15px 0; word-break: break-all; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verifiera din email</h1>
            </div>
            <div class="content">
              <h2>Hej och välkommen!</h2>
              <p>Tack för att du registrerar dig som lärare på Ordflyt.se. För att slutföra registreringen behöver du verifiera din email-adress.</p>
              
              <p>Klicka på knappen nedan för att verifiera din email:</p>
              <a href="${verificationLink}" class="button">Verifiera Email</a>
              
              <p>Om länken inte fungerar kan du kopiera och klistra in följande URL i din webbläsare:</p>
              <div class="token">${verificationLink}</div>
              
              <p><strong>Viktigt:</strong></p>
              <ul>
                <li>Denna verifieringslänk är giltig i 24 timmar</li>
                <li>Efter verifiering skapas ditt lärarkonto automatiskt</li>
                <li>Du kommer att få dina inloggningsuppgifter via email</li>
              </ul>
              
              <p>Vi ser fram emot att ha dig som en del av Ordflyt.se!</p>
            </div>
            <div class="footer">
              <p>Detta meddelande skickades från Ordflyt.se<br>
              Om du inte registrerade dig kan du ignorera detta e-postmeddelande.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Verifiera din email - Ordflyt.se
===============================

Hej och välkommen!

Tack för att du registrerar dig som lärare på Ordflyt.se. För att slutföra registreringen behöver du verifiera din email-adress.

Klicka på följande länk för att verifiera din email:
${verificationLink}

VIKTIGT:
- Denna verifieringslänk är giltig i 24 timmar
- Efter verifiering skapas ditt lärarkonto automatiskt
- Du kommer att få dina inloggningsuppgifter via email

Vi ser fram emot att ha dig som en del av Ordflyt.se!

---
Detta meddelande skickades från Ordflyt.se
Om du inte registrerade dig kan du ignorera detta e-postmeddelande.
    `;

    await this.sendEmail(toEmail, subject, htmlBody, textBody);
  }

  // Send welcome email with login credentials
  async sendWelcomeEmail(
    toEmail: string, 
    teacherName: string, 
    username: string, 
    temporaryPassword: string
  ): Promise<void> {
    const subject = "Välkommen till Ordflyt.se - Ditt konto är klart!";
    
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background-color: #1f2937; color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .credential-item { margin: 10px 0; }
            .credential-label { font-weight: bold; color: #10b981; }
            .credential-value { font-family: monospace; font-size: 16px; background-color: #374151; padding: 5px 10px; border-radius: 3px; margin-left: 10px; }
            .button { display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Välkommen till Ordflyt.se!</h1>
            </div>
            <div class="content">
              <h2>Hej ${teacherName}!</h2>
              <p>Fantastiskt! Din email är verifierad och ditt lärarkonto har skapats. Du har nu tillgång till alla verktyg på Ordflyt.se.</p>
              
              <h3>Dina inloggningsuppgifter:</h3>
              <div class="credentials">
                <div class="credential-item">
                  <span class="credential-label">Användarnamn:</span>
                  <span class="credential-value">${username}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Lösenord:</span>
                  <span class="credential-value">${temporaryPassword}</span>
                </div>
              </div>
              
              <a href="${process.env.FRONTEND_URL || 'https://ordflyt.se'}/login" class="button">Logga in nu</a>
              
              <div class="warning">
                <p><strong>Viktigt:</strong> Detta är ett tillfälligt lösenord. Du kommer att bli ombedd att ändra det vid första inloggningen.</p>
              </div>
              
              <h3>Vad kan du göra nu?</h3>
              <ul>
                <li>Utforska alla lektioner och övningar</li>
                <li>Skapa klasser och lägga till elever</li>
                <li>Tilldela lektioner till dina elever</li>
                <li>Följa upp elevernas framsteg</li>
                <li>Aktivera din licens för full funktionalitet</li>
              </ul>
              
              <p>För att få full tillgång till alla funktioner, aktivera din licenskod i lärardashboard när du har köpt en licens.</p>
              
              <p>Vi ser fram emot att ha dig som en del av Ordflyt.se-familjen!</p>
            </div>
            <div class="footer">
              <p>Detta meddelande skickades från Ordflyt.se<br>
              Vid frågor, kontakta oss genom att svara på detta meddelande.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Välkommen till Ordflyt.se!
==========================

Hej ${teacherName}!

Fantastiskt! Din email är verifierad och ditt lärarkonto har skapats. Du har nu tillgång till alla verktyg på Ordflyt.se.

DINA INLOGGNINGSUPPGIFTER:
Användarnamn: ${username}
Lösenord: ${temporaryPassword}

Logga in på: ${process.env.FRONTEND_URL || 'https://ordflyt.se'}/login

VIKTIGT: Detta är ett tillfälligt lösenord. Du kommer att bli ombedd att ändra det vid första inloggningen.

VAD KAN DU GÖRA NU?
- Utforska alla lektioner och övningar
- Skapa klasser och lägga till elever
- Tilldela lektioner till dina elever
- Följa upp elevernas framsteg
- Aktivera din licens för full funktionalitet

För att få full tillgång till alla funktioner, aktivera din licenskod i lärardashboard när du har köpt en licens.

Vi ser fram emot att ha dig som en del av Ordflyt.se-familjen!

---
Detta meddelande skickades från Ordflyt.se
Vid frågor, kontakta oss genom att svara på detta meddelande.
    `;

    await this.sendEmail(toEmail, subject, htmlBody, textBody);
  }

  // Test email configuration
  async testEmailConfig(): Promise<boolean> {
    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: this.fromEmail,
        Subject: "Ordflyt.se Email Test",
        TextBody: "This is a test email to verify Postmark configuration.",
        HtmlBody: "<p>This is a test email to verify Postmark configuration.</p>",
        MessageStream: "outbound"
      });
      return true;
    } catch (error) {
      console.error("Email configuration test failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();