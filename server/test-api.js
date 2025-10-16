import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq, and, isNull } from 'drizzle-orm';
import { teacherClasses, studentAccounts } from '@shared/schema';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  maxUses: 7500,
  allowExitOnIdle: false,
  idleTimeoutMillis: 30 * 1000,
});

const db = drizzle({ client: pool });

async function testAPI() {
  const teacherId = '550e8400-e29b-41d4-a716-446655440002';

  console.log('=== TESTING API FUNCTIONS ===');

  // 1. Test getTeacherClasses (what the API uses)
  console.log('1. getTeacherClasses result:');
  const classes = await db
    .select()
    .from(teacherClasses)
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        isNull(teacherClasses.archivedAt)
      )
    );

  console.log(`Found ${classes.length} teacher classes:`);
  classes.forEach(cls => {
    console.log(`  - ${cls.name} (${cls.id})`);
  });

  // 2. Test getStudentsByClassId for each class (what the API uses)
  console.log('\n2. getStudentsByClassId for each class:');
  for (const cls of classes) {
    const students = await db
      .select()
      .from(studentAccounts)
      .where(eq(studentAccounts.classId, cls.id));

    console.log(`Class "${cls.name}" (${cls.id}) has ${students.length} students:`);
    students.forEach(student => {
      console.log(`    - ${student.studentName} (${student.username})`);
    });
  }

  await pool.end();
}

testAPI().catch(console.error);