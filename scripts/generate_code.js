#!/usr/bin/env node

/**
 * Admin script for generating one-time license codes
 * Usage: node scripts/generate_code.js <teacher-email> [validity-days]
 * Example: node scripts/generate_code.js teacher@school.se 30
 */

import { createOneTimeCode, licenseDb } from '../server/licenseDb.ts';
import { oneTimeCodes } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function generateCode() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Fel: E-postadress krävs');
    console.log('Användning: node scripts/generate_code.js <lararens-email> [giltighet-dagar]');
    console.log('Exempel: node scripts/generate_code.js anna.svensson@skolan.se 30');
    process.exit(1);
  }

  const teacherEmail = args[0];
  const validityDays = args[1] ? parseInt(args[1]) : 30;

  // Validera e-postformat
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(teacherEmail)) {
    console.error('❌ Fel: Ogiltig e-postadress format');
    process.exit(1);
  }

  // Validera giltighetsperiod
  if (isNaN(validityDays) || validityDays < 1 || validityDays > 365) {
    console.error('❌ Fel: Giltighetsperiod måste vara mellan 1-365 dagar');
    process.exit(1);
  }

  try {
    // Kontrollera om det redan finns en aktiv kod för denna e-post
    const existingCodes = await licenseDb
      .select()
      .from(oneTimeCodes)
      .where(
        eq(oneTimeCodes.recipientEmail, teacherEmail)
      );

    const activeCodes = existingCodes.filter(code => 
      !code.redeemedAt && new Date() < code.expiresAt
    );

    if (activeCodes.length > 0) {
      console.error(`❌ Fel: Det finns redan en aktiv kod för ${teacherEmail}`);
      console.log(`   Koden går ut: ${activeCodes[0].expiresAt.toLocaleDateString('sv-SE')}`);
      process.exit(1);
    }

    // Generera ny kod
    const result = await createOneTimeCode(teacherEmail, validityDays);
    
    console.log('✅ Engångskod genererad framgångsrikt!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`📧 Mottagare: ${teacherEmail}`);
    console.log(`🔑 Kod: ${result.clearTextCode}`);
    console.log(`📅 Giltig till: ${new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE')}`);
    console.log(`🆔 ID: ${result.id}`);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('⚠️  VIKTIGT: Koden visas bara här en gång!');
    console.log('   Skicka koden säkert till läraren.');
    console.log('   Läraren ska gå till /license för att lösa in koden.');

  } catch (error) {
    console.error('❌ Databasfel:', error.message);
    console.error('   Kontrollera databasanslutningen och försök igen.');
    process.exit(1);
  } finally {
    // Stäng databasanslutning
    process.exit(0);
  }
}

// Kör om scriptet anropas direkt
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCode().catch(error => {
    console.error('❌ Oväntat fel:', error.message);
    process.exit(1);
  });
}

export { generateCode };