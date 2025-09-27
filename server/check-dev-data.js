import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq, and } from 'drizzle-orm';
import {
  users,
  classes,
  teacherClasses,
  teacherLicenses,
  students,
  studentAccounts,
  teacherSchoolMemberships,
  schools
} from '@shared/schema';

neonConfig.webSocketConstructor = ws;

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  maxUses: 7500,
  allowExitOnIdle: false,
  idleTimeoutMillis: 30 * 1000,
});

const db = drizzle({ client: pool });

async function checkDevData() {
  console.log('=== DEV TEACHER CHECK ===');

  // 1. Check if dev teacher exists
  const [devTeacher] = await db
    .select()
    .from(users)
    .where(eq(users.id, '550e8400-e29b-41d4-a716-446655440002'))
    .limit(1);

  if (devTeacher) {
    console.log('✅ Dev teacher found:', {
      id: devTeacher.id,
      username: devTeacher.username,
      role: devTeacher.role,
      email: devTeacher.email
    });
  } else {
    console.log('❌ Dev teacher NOT found with ID 550e8400-e29b-41d4-a716-446655440002');
    return;
  }

  // 2. Check teacher license
  const [license] = await db
    .select()
    .from(teacherLicenses)
    .where(eq(teacherLicenses.teacherId, devTeacher.id))
    .limit(1);

  if (license) {
    console.log('✅ Teacher license found:', {
      id: license.id,
      teacherId: license.teacherId,
      isActive: license.isActive
    });
  } else {
    console.log('❌ Teacher license NOT found');
  }

  // 3. Check teacher classes (teacherClasses table)
  const teacherClassesList = await db
    .select()
    .from(teacherClasses)
    .where(eq(teacherClasses.teacherId, devTeacher.id));

  console.log(`Found ${teacherClassesList.length} teacher classes:`);
  teacherClassesList.forEach(tc => {
    console.log('  - TeacherClass:', {
      id: tc.id,
      name: tc.name,
      teacherId: tc.teacherId,
      licenseId: tc.licenseId,
      term: tc.term
    });
  });

  // 4. Check classes (classes table - for student assignments)
  const classesList = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, devTeacher.id));

  console.log(`Found ${classesList.length} classes for student assignments:`);
  classesList.forEach(cls => {
    console.log('  - Class:', {
      id: cls.id,
      name: cls.name,
      teacherId: cls.teacherId,
      term: cls.term
    });
  });

  // 5. Check school membership
  const [schoolMembership] = await db
    .select()
    .from(teacherSchoolMemberships)
    .where(eq(teacherSchoolMemberships.teacherId, devTeacher.id))
    .limit(1);

  if (schoolMembership) {
    console.log('✅ School membership found:', {
      teacherId: schoolMembership.teacherId,
      schoolId: schoolMembership.schoolId,
      isActive: schoolMembership.isActive
    });
  } else {
    console.log('❌ School membership NOT found');
  }

  console.log('\n=== DEV STUDENT CHECK ===');

  // 6. Check if testelev exists in users table
  const [testElevUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, 'testelev'))
    .limit(1);

  if (testElevUser) {
    console.log('✅ testelev user found:', {
      id: testElevUser.id,
      username: testElevUser.username,
      role: testElevUser.role,
      email: testElevUser.email
    });
  } else {
    console.log('❌ testelev user NOT found in users table');
  }

  // 7. Check if testelev exists in studentAccounts table
  const [testElevStudent] = await db
    .select()
    .from(studentAccounts)
    .where(eq(studentAccounts.username, 'testelev'))
    .limit(1);

  if (testElevStudent) {
    console.log('✅ testelev found in studentAccounts:', {
      id: testElevStudent.id,
      username: testElevStudent.username,
      studentName: testElevStudent.studentName,
      classId: testElevStudent.classId,
      isActive: testElevStudent.isActive
    });
  } else {
    console.log('❌ testelev NOT found in studentAccounts table');
  }

  // 8. Check students table (the junction table for class membership)
  const studentsInClasses = await db
    .select()
    .from(students)
    .where(eq(students.userId, testElevUser?.id || 'nonexistent'));

  console.log(`Found ${studentsInClasses.length} class memberships for testelev:`);
  studentsInClasses.forEach(student => {
    console.log('  - Student membership:', {
      id: student.id,
      alias: student.alias,
      classId: student.classId,
      userId: student.userId
    });
  });

  console.log('\n=== CROSS-REFERENCE CHECK ===');

  // 9. Check if student is in any of the teacher's classes
  for (const cls of classesList) {
    const studentsInThisClass = await db
      .select()
      .from(students)
      .where(eq(students.classId, cls.id));

    console.log(`Class "${cls.name}" (${cls.id}) has ${studentsInThisClass.length} students:`);
    studentsInThisClass.forEach(student => {
      console.log('  - Student:', {
        alias: student.alias,
        userId: student.userId,
        isTestElev: student.userId === testElevUser?.id
      });
    });
  }

  await pool.end();
}

checkDevData().catch(console.error);