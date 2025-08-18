import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import crypto from 'crypto';
import * as schema from "@shared/schema";
import { eq, and, gt, isNull } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const licenseDb = drizzle({ client: pool, schema });

// Utility functions for ID generation and hashing
export function generateSecureId(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateReadableCode(): string {
  // Generate 4x4 character code with dashes (XXXX-XXXX-XXXX-XXXX)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-';
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
    }
  }
  
  return code;
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateLicenseKey(): string {
  // Generate secure license key
  return generateSecureId(32);
}

// Database operations for license system

// One-time codes
export async function createOneTimeCode(
  recipientEmail: string,
  validityDays: number = 30
): Promise<{ id: string, clearTextCode: string }> {
  const clearTextCode = generateReadableCode();
  const codeHash = hashCode(clearTextCode);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  const [code] = await licenseDb.insert(schema.oneTimeCodes).values({
    codeHash,
    recipientEmail,
    expiresAt,
  }).returning();

  return { id: code.id, clearTextCode };
}

export async function findOneTimeCode(codeHash: string) {
  const [code] = await licenseDb
    .select()
    .from(schema.oneTimeCodes)
    .where(eq(schema.oneTimeCodes.codeHash, codeHash))
    .limit(1);
  
  return code;
}

export async function redeemOneTimeCode(
  codeId: string,
  teacherId: string
): Promise<void> {
  await licenseDb
    .update(schema.oneTimeCodes)
    .set({
      redeemedAt: new Date(),
      redeemedBy: teacherId,
    })
    .where(eq(schema.oneTimeCodes.id, codeId));
}

// Teacher licenses
export async function createTeacherLicense(
  teacherId: string,
  oneTimeCodeId: string,
  expiresAt?: Date
): Promise<schema.TeacherLicense> {
  const licenseKey = generateLicenseKey();
  
  const [license] = await licenseDb.insert(schema.teacherLicenses).values({
    teacherId,
    licenseKey,
    oneTimeCodeId,
    expiresAt,
    isActive: true,
  }).returning();

  // Log license creation
  await logLicenseActivity(license.id, 'created', {
    teacherId,
    oneTimeCodeId,
  }, teacherId);

  return license;
}

export async function getActiveLicense(teacherId: string) {
  const [license] = await licenseDb
    .select()
    .from(schema.teacherLicenses)
    .where(
      and(
        eq(schema.teacherLicenses.teacherId, teacherId),
        eq(schema.teacherLicenses.isActive, true),
        // License is active (either no expiration or not yet expired)
        schema.teacherLicenses.expiresAt ? 
          gt(schema.teacherLicenses.expiresAt, new Date()) :
          isNull(schema.teacherLicenses.expiresAt)
      )
    )
    .limit(1);
  
  return license;
}

export async function revokeLicense(
  licenseId: string,
  performedBy: string
): Promise<void> {
  await licenseDb
    .update(schema.teacherLicenses)
    .set({ isActive: false })
    .where(eq(schema.teacherLicenses.id, licenseId));

  await logLicenseActivity(licenseId, 'revoked', {}, performedBy);
}

// Teacher classes
export async function createTeacherClass(
  name: string,
  teacherId: string,
  licenseId: string,
  term?: string,
  description?: string
): Promise<schema.TeacherClass> {
  const [teacherClass] = await licenseDb.insert(schema.teacherClasses).values({
    name,
    teacherId,
    licenseId,
    term,
    description,
  }).returning();

  return teacherClass;
}

export async function getTeacherClasses(teacherId: string) {
  return await licenseDb
    .select()
    .from(schema.teacherClasses)
    .where(
      and(
        eq(schema.teacherClasses.teacherId, teacherId),
        isNull(schema.teacherClasses.archivedAt)
      )
    );
}

// Student accounts
export async function createStudentAccounts(
  students: Array<{ name: string; username: string; passwordHash: string }>,
  classId: string
): Promise<schema.StudentAccount[]> {
  const studentData = students.map(student => ({
    studentName: student.name,
    username: student.username,
    passwordHash: student.passwordHash,
    classId,
    mustChangePassword: true,
  }));

  return await licenseDb.insert(schema.studentAccounts).values(studentData).returning();
}

export async function getStudentByUsername(username: string) {
  const [student] = await licenseDb
    .select()
    .from(schema.studentAccounts)
    .where(eq(schema.studentAccounts.username, username))
    .limit(1);
  
  return student;
}

export async function updateStudentPassword(
  studentId: string,
  newPasswordHash: string
): Promise<void> {
  await licenseDb
    .update(schema.studentAccounts)
    .set({
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    })
    .where(eq(schema.studentAccounts.id, studentId));
}

// License logging
export async function logLicenseActivity(
  licenseId: string | null,
  action: string,
  details: any,
  performedBy?: string,
  ipAddress?: string
): Promise<void> {
  await licenseDb.insert(schema.licenseLog).values({
    licenseId,
    action,
    details,
    performedBy,
    ipAddress,
  });
}

export default licenseDb;