import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

/**
 * Initialiserar databasen med nödvändiga standardanvändare
 * Körs automatiskt vid serverstart
 */
export async function initializeDatabase() {
  try {
    console.log('Kontrollerar admin-användare...');
    
    // Kontrollera om admin-användare finns
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);

    const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
    
    if (!existingAdmin) {
      console.log('Ingen admin-användare hittades');
      
      // Använd miljövariabel för lösenord, fallback till 'admin' i utveckling
      const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? null : 'admin');
      
      if (!adminPassword) {
        console.warn('⚠️  ADMIN_PASSWORD environment variable is not set in production');
        console.warn('   Admin user will be created automatically on first login attempt');
        console.warn('   Just try to login with username: admin, password: <ADMIN_PASSWORD>');
        console.warn('   See ADMIN_LOGIN_FIX.md for instructions');
        return;
      }
      
      console.log('Skapar admin-användare...');
      const adminPasswordHash = await hashPassword(adminPassword);
      await db.insert(users).values({
        username: 'admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isActive: true,
        emailVerified: false,
        email: 'admin@ordflyt.se'
      });
      
      if (isProduction) {
        console.log('✅ Produktions-admin skapad med säkert lösenord från ADMIN_PASSWORD');
      } else {
        console.log('✅ Utvecklings-admin skapad (admin/admin)');
      }
    } else {
      console.log('✅ Admin-användare finns redan');
      
      // In production, verify that the admin password matches ADMIN_PASSWORD
      if (isProduction && process.env.ADMIN_PASSWORD) {
        console.log('   Admin password will be auto-synced with ADMIN_PASSWORD on next login if needed');
      }
    }

    // I utvecklingsläge, skapa även test-användare
    if (process.env.NODE_ENV !== 'production') {
      const testUsers = [
        { username: 'larare', password: 'larare', role: 'LARARE' as const, email: 'larare@test.se' },
        { username: 'elev', password: 'elev', role: 'ELEV' as const, email: 'elev@test.se' },
      ];

      for (const testUser of testUsers) {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.username, testUser.username))
          .limit(1);

        if (!existing) {
          const passwordHash = await hashPassword(testUser.password);
          
          await db.insert(users).values({
            username: testUser.username,
            passwordHash,
            role: testUser.role,
            isActive: true,
            emailVerified: false,
            email: testUser.email
          });
          
          console.log(`Test-användare ${testUser.username} skapad`);
        }
      }
    }

    console.log('Databasinitialisering klar');
  } catch (error) {
    console.error('Fel vid databasinitialisering:', error);
    // Låt inte detta stoppa servern från att starta
  }
}