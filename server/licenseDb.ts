import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import crypto from 'crypto';
import * as schema from "@shared/schema";
import { eq, and, gt, isNull, or } from 'drizzle-orm';
import { hashPassword } from './auth';

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

export function generateSecurePassword(): string {
  // Generate secure password with readable characters (no confusing 0/O, 1/l)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }
  
  return password;
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
        or(
          isNull(schema.teacherLicenses.expiresAt),  // No expiration date
          gt(schema.teacherLicenses.expiresAt, new Date())  // Not yet expired
        )
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

// Store password temporarily for teacher access
export async function storePasswordForAccess(
  studentId: string,
  clearPassword: string,
  accessedBy: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Expire after 1 hour

  // Delete any existing password access for this student
  await licenseDb
    .delete(schema.studentPasswordAccess)
    .where(eq(schema.studentPasswordAccess.studentId, studentId));

  // Insert new password access
  await licenseDb.insert(schema.studentPasswordAccess).values({
    studentId,
    clearPassword,
    accessedBy,
    expiresAt,
  });
}

// Get stored password for teacher access
export async function getPasswordForAccess(
  studentId: string,
  accessedBy: string
): Promise<string | null> {
  const [passwordAccess] = await licenseDb
    .select()
    .from(schema.studentPasswordAccess)
    .where(
      and(
        eq(schema.studentPasswordAccess.studentId, studentId),
        eq(schema.studentPasswordAccess.accessedBy, accessedBy),
        gt(schema.studentPasswordAccess.expiresAt, new Date())
      )
    )
    .limit(1);

  return passwordAccess?.clearPassword || null;
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

// Get students by class ID
export async function getStudentsByClassId(classId: string) {
  return await licenseDb
    .select()
    .from(schema.studentAccounts)
    .where(eq(schema.studentAccounts.classId, classId));
}

// Update student information (name, isActive)
export async function updateStudent(
  studentId: string,
  updates: {
    studentName?: string;
    isActive?: boolean;
  }
): Promise<schema.StudentAccount> {
  const [updatedStudent] = await licenseDb
    .update(schema.studentAccounts)
    .set(updates)
    .where(eq(schema.studentAccounts.id, studentId))
    .returning();

  return updatedStudent;
}

// Update class information (name, archived status)
export async function updateTeacherClass(
  classId: string,
  updates: {
    name?: string;
    description?: string;
    archivedAt?: Date | null;
  }
): Promise<schema.TeacherClass> {
  const [updatedClass] = await licenseDb
    .update(schema.teacherClasses)
    .set(updates)
    .where(eq(schema.teacherClasses.id, classId))
    .returning();

  return updatedClass;
}

// Delete student account
export async function deleteStudent(studentId: string): Promise<void> {
  // Delete associated password access records first
  await licenseDb
    .delete(schema.studentPasswordAccess)
    .where(eq(schema.studentPasswordAccess.studentId, studentId));

  // Delete student account
  await licenseDb
    .delete(schema.studentAccounts)
    .where(eq(schema.studentAccounts.id, studentId));
}

// Reset student password and return new password
export async function resetStudentPassword(studentId: string): Promise<string> {
  const newPassword = generateSecurePassword();
  const passwordHash = await hashPassword(newPassword);

  await licenseDb
    .update(schema.studentAccounts)
    .set({
      passwordHash,
      mustChangePassword: true,
    })
    .where(eq(schema.studentAccounts.id, studentId));

  return newPassword;
}

// Get teacher classes including archived ones (for admin purposes)
export async function getAllTeacherClasses(teacherId: string) {
  return await licenseDb
    .select()
    .from(schema.teacherClasses)
    .where(eq(schema.teacherClasses.teacherId, teacherId));
}

// Check if teacher owns a class
export async function verifyClassOwnership(classId: string, teacherId: string): Promise<boolean> {
  const [classRecord] = await licenseDb
    .select()
    .from(schema.teacherClasses)
    .where(
      and(
        eq(schema.teacherClasses.id, classId),
        eq(schema.teacherClasses.teacherId, teacherId)
      )
    )
    .limit(1);

  return !!classRecord;
}

// Check if teacher owns a student
export async function verifyStudentOwnership(studentId: string, teacherId: string): Promise<boolean> {
  const [studentRecord] = await licenseDb
    .select()
    .from(schema.studentAccounts)
    .innerJoin(
      schema.teacherClasses,
      eq(schema.studentAccounts.classId, schema.teacherClasses.id)
    )
    .where(
      and(
        eq(schema.studentAccounts.id, studentId),
        eq(schema.teacherClasses.teacherId, teacherId)
      )
    )
    .limit(1);

  return !!studentRecord;
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