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

    if (!existingAdmin) {
      console.log('Skapar admin-användare...');
      
      // I produktion, kräv explicit lösenord via miljövariabel
      if (process.env.NODE_ENV === 'production') {
        const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
        if (!adminPassword) {
          console.error('⚠️  ADMIN_BOOTSTRAP_PASSWORD krävs i produktion för att skapa admin-användare');
          return;
        }
        
        const adminPasswordHash = await hashPassword(adminPassword);
        await db.insert(users).values({
          username: 'admin',
          passwordHash: adminPasswordHash,
          role: 'ADMIN',
          isActive: true,
          emailVerified: false,
          email: 'admin@ordflyt.se'
        });
        
        console.log('✅ Admin-användare skapad med säkert lösenord från miljövariabel');
      } else {
        // Endast i utveckling använd standardlösenord
        const adminPasswordHash = await hashPassword('admin');
        await db.insert(users).values({
          username: 'admin',
          passwordHash: adminPasswordHash,
          role: 'ADMIN',
          isActive: true,
          emailVerified: false,
          email: 'admin@ordflyt.se'
        });
        
        console.log('✅ Utvecklings-admin skapad (admin/admin)');
      }
    } else {
      console.log('Admin-användare finns redan');
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