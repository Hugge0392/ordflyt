import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq, and } from 'drizzle-orm';
import { users, classes, students, studentAccounts } from '@shared/schema';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  maxUses: 7500,
  allowExitOnIdle: false,
  idleTimeoutMillis: 30 * 1000,
});

const db = drizzle({ client: pool });

async function fixDevConnections() {
  console.log('=== FIXING DEV TEACHER-STUDENT CONNECTIONS ===');

  // Get the correct class IDs
  const correctStudentClassId = '8367950a-82d7-4789-beb7-ccb2a57a765f'; // Dev Test Klass from classes table
  const correctTeacherClassId = 'c071ce49-ebf1-49ca-a939-833ccb5fb5fd'; // Test Klass from teacherClasses table
  const testElevUserId = 'a78c06fe-815a-4feb-adeb-1177699f4913';

  try {
    // 1. Create testelev in users table if it doesn't exist
    console.log('1. Checking if testelev exists in users table...');
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, testElevUserId))
      .limit(1);

    if (!existingUser) {
      console.log('Creating testelev in users table...');
      await db.insert(users).values({
        id: testElevUserId,
        username: 'testelev',
        email: 'testelev@dev.test',
        passwordHash: '$2b$10$0YWnm/ckrzmLhUHHnWZHaOdfkWNeTkFZzjRJ6QFzgVSDGHCoBCRZa', // hash for 'test123'
        role: 'ELEV',
        isActive: true,
        emailVerified: true,
        mustChangePassword: false
      });
      console.log('✅ testelev created in users table');
    } else {
      console.log('✅ testelev already exists in users table');
    }

    // 2. Update testelev in studentAccounts to point to correct teacherClass
    console.log('2. Updating testelev in studentAccounts...');
    await db
      .update(studentAccounts)
      .set({
        classId: correctTeacherClassId,
        studentName: 'Test Elev'
      })
      .where(eq(studentAccounts.id, testElevUserId));
    console.log('✅ testelev updated in studentAccounts');

    // 3. Remove any existing membership in students table for testelev
    console.log('3. Removing any existing class memberships for testelev...');
    await db
      .delete(students)
      .where(eq(students.userId, testElevUserId));
    console.log('✅ Existing memberships removed');

    // 4. Add testelev to the correct class in students table (uses classes table ID)
    console.log('4. Adding testelev to correct class...');
    await db.insert(students).values({
      alias: 'Test Elev',
      classId: correctStudentClassId,
      userId: testElevUserId
    });
    console.log('✅ testelev added to Dev Test Klass');

    // 5. Remove the wrong student (Anna Test) from Dev Test Klass
    console.log('5. Removing Anna Test from Dev Test Klass...');
    await db
      .delete(students)
      .where(and(
        eq(students.classId, correctStudentClassId),
        eq(students.userId, '550e8400-e29b-41d4-a716-446655440003')
      ));
    console.log('✅ Anna Test removed from Dev Test Klass');

    console.log('\n=== VERIFICATION ===');

    // Verify the fix
    const [verifyStudent] = await db
      .select()
      .from(students)
      .where(and(
        eq(students.classId, correctStudentClassId),
        eq(students.userId, testElevUserId)
      ))
      .limit(1);

    if (verifyStudent) {
      console.log('✅ testelev is now properly connected to Dev Test Klass:', {
        alias: verifyStudent.alias,
        classId: verifyStudent.classId,
        userId: verifyStudent.userId
      });
    } else {
      console.log('❌ testelev is still not connected properly');
    }

    const studentsInClass = await db
      .select()
      .from(students)
      .where(eq(students.classId, correctStudentClassId));

    console.log(`Dev Test Klass now has ${studentsInClass.length} students:`);
    studentsInClass.forEach(student => {
      console.log(`  - ${student.alias} (${student.userId})`);
    });

  } catch (error) {
    console.error('Error fixing connections:', error);
  } finally {
    await pool.end();
  }
}

fixDevConnections().catch(console.error);