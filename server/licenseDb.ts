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

// Data backup and validation functions with persistent storage
import fs from 'fs/promises';
import path from 'path';

// Create backup directory if it doesn't exist
async function ensureBackupDir() {
  const backupDir = path.join(process.cwd(), 'backups');
  try {
    await fs.access(backupDir);
  } catch {
    await fs.mkdir(backupDir, { recursive: true });
    console.log('📁 Created backup directory:', backupDir);
  }
  return backupDir;
}

export async function backupCriticalData() {
  console.log('🔄 Starting critical data backup...');
  
  try {
    // Backup active teachers
    const activeTeachers = await licenseDb
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        role: schema.users.role,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt
      })
      .from(schema.users)
      .where(eq(schema.users.role, 'LARARE'));
    
    // Backup active classes
    const activeClasses = await licenseDb
      .select()
      .from(schema.teacherClasses)
      .where(isNull(schema.teacherClasses.archivedAt));
    
    // Backup student accounts
    const activeStudents = await licenseDb
      .select()
      .from(schema.studentAccounts)
      .where(eq(schema.studentAccounts.isActive, true));
    
    // Backup student progress
    const studentProgress = await licenseDb
      .select()
      .from(schema.studentLessonProgress);
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      counts: {
        teachers: activeTeachers.length,
        classes: activeClasses.length,
        students: activeStudents.length,
        progress: studentProgress.length
      },
      data: {
        teachers: activeTeachers,
        classes: activeClasses,
        students: activeStudents,
        progress: studentProgress
      }
    };
    
    // Write backup to persistent storage
    const backupDir = await ensureBackupDir();
    const filename = `critical-data-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(backupDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(backup, null, 2), 'utf8');
    
    // Keep only last 10 backups to prevent disk overflow
    await cleanupOldBackups(backupDir);
    
    console.log('✅ Critical data backup completed and saved:', {
      counts: backup.counts,
      filepath: filepath
    });
    
    return { ...backup, filepath };
    
  } catch (error) {
    console.error('❌ Critical data backup failed:', error);
    throw error;
  }
}

async function cleanupOldBackups(backupDir: string) {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('critical-data-backup-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.stat(path.join(backupDir, f)).then(s => s.mtime)
      }));
    
    if (backupFiles.length > 10) {
      const filesWithTime = await Promise.all(
        backupFiles.map(async f => ({ ...f, time: await f.time }))
      );
      
      filesWithTime
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(10) // Keep 10 newest, delete rest
        .forEach(async (f) => {
          await fs.unlink(f.path);
          console.log('🗑️ Cleaned up old backup:', f.name);
        });
    }
  } catch (error) {
    console.warn('⚠️ Backup cleanup failed:', error);
  }
}

// Schedule automatic backups every 6 hours
let backupInterval: NodeJS.Timeout | null = null;

export function startAutomaticBackups() {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  
  // Run backup immediately on start
  backupCriticalData().catch(error => {
    console.error('❌ Initial backup failed:', error);
  });
  
  // Schedule every 6 hours (21600000 ms)
  backupInterval = setInterval(() => {
    backupCriticalData().catch(error => {
      console.error('❌ Scheduled backup failed:', error);
    });
  }, 6 * 60 * 60 * 1000);
  
  console.log('🕐 Automatic backups scheduled every 6 hours');
}

export function stopAutomaticBackups() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('⏹️ Automatic backups stopped');
  }
}

export async function validateDataIntegrity() {
  console.log('🔍 Validating data integrity...');
  
  try {
    // Check for orphaned classes (classes without teachers)
    const orphanedClasses = await licenseDb
      .select({
        id: schema.teacherClasses.id,
        name: schema.teacherClasses.name,
        teacherId: schema.teacherClasses.teacherId
      })
      .from(schema.teacherClasses)
      .leftJoin(schema.users, eq(schema.teacherClasses.teacherId, schema.users.id))
      .where(
        and(
          isNull(schema.teacherClasses.archivedAt),
          isNull(schema.users.id)
        )
      );
    
    // Check for orphaned students (students without classes)
    const orphanedStudents = await licenseDb
      .select({
        id: schema.studentAccounts.id,
        studentName: schema.studentAccounts.studentName,
        classId: schema.studentAccounts.classId
      })
      .from(schema.studentAccounts)
      .leftJoin(schema.teacherClasses, eq(schema.studentAccounts.classId, schema.teacherClasses.id))
      .where(
        and(
          eq(schema.studentAccounts.isActive, true),
          isNull(schema.teacherClasses.id)
        )
      );
    
    const integrity = {
      timestamp: new Date().toISOString(),
      issues: {
        orphanedClasses: orphanedClasses.length,
        orphanedStudents: orphanedStudents.length
      },
      details: {
        orphanedClasses,
        orphanedStudents
      }
    };
    
    if (orphanedClasses.length > 0 || orphanedStudents.length > 0) {
      console.warn('⚠️ Data integrity issues found:', integrity.issues);
    } else {
      console.log('✅ Data integrity check passed');
    }
    
    return integrity;
    
  } catch (error) {
    console.error('❌ Data integrity validation failed:', error);
    throw error;
  }
}

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
  console.log(`[licenseDb] 📝 Creating class "${name}" for teacher ${teacherId} with license ${licenseId}`);
  
  const [teacherClass] = await licenseDb.insert(schema.teacherClasses).values({
    name,
    teacherId,
    licenseId,
    term,
    description,
  }).returning();

  console.log(`[licenseDb] ✅ Class created successfully:`, {
    id: teacherClass.id,
    name: teacherClass.name,
    teacherId: teacherClass.teacherId,
    createdAt: teacherClass.createdAt
  });

  return teacherClass;
}

export async function getTeacherClasses(teacherId: string) {
  console.log(`[licenseDb] 🔍 Getting classes for teacher ID: ${teacherId}`);
  
  const classes = await licenseDb
    .select()
    .from(schema.teacherClasses)
    .where(
      and(
        eq(schema.teacherClasses.teacherId, teacherId),
        isNull(schema.teacherClasses.archivedAt)
      )
    );
    
  console.log(`[licenseDb] ✅ Found ${classes.length} active classes for teacher ${teacherId}`);
  console.log(`[licenseDb] 📋 Classes:`, classes.map(c => ({ id: c.id, name: c.name, created: c.createdAt })));
  
  return classes;
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

// Secure setup code functions for student first-time login

export function generateSetupCode(): string {
  // Generate 6-character readable setup code (no confusing characters)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  
  return code;
}

export function hashSetupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Create setup code for student
export async function createStudentSetupCode(
  studentId: string,
  createdBy: string
): Promise<{ id: string, clearCode: string }> {
  const clearCode = generateSetupCode();
  const codeHash = hashSetupCode(clearCode);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Expire after 30 days

  // Deactivate any existing active codes for this student
  await licenseDb
    .update(schema.studentSetupCodes)
    .set({ isActive: false, clearCode: null }) // Also clear old clearCodes
    .where(
      and(
        eq(schema.studentSetupCodes.studentId, studentId),
        eq(schema.studentSetupCodes.isActive, true)
      )
    );

  // Insert new setup code
  const [setupCode] = await licenseDb.insert(schema.studentSetupCodes).values({
    studentId,
    codeHash,
    clearCode, // Store clearCode for teacher viewing
    createdBy,
    expiresAt,
    isActive: true,
  }).returning();

  // Log setup code generation
  await logLicenseActivity(null, 'setup_code_generated', {
    studentId,
    setupCodeId: setupCode.id,
    expiresAt,
  }, createdBy);

  return { id: setupCode.id, clearCode };
}

// Validate and use setup code
export async function validateAndUseSetupCode(
  studentId: string,
  clearCode: string
): Promise<{ valid: boolean, setupCodeId?: string }> {
  const codeHash = hashSetupCode(clearCode);
  
  const [setupCode] = await licenseDb
    .select()
    .from(schema.studentSetupCodes)
    .where(
      and(
        eq(schema.studentSetupCodes.studentId, studentId),
        eq(schema.studentSetupCodes.codeHash, codeHash),
        eq(schema.studentSetupCodes.isActive, true),
        isNull(schema.studentSetupCodes.usedAt),
        gt(schema.studentSetupCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!setupCode) {
    // Log failed validation attempt
    await logLicenseActivity(null, 'setup_code_validation_failed', {
      studentId,
      reason: 'invalid_or_expired',
    });
    return { valid: false };
  }

  // Mark code as used and clear clearCode for security
  await licenseDb
    .update(schema.studentSetupCodes)
    .set({
      usedAt: new Date(),
      isActive: false,
      clearCode: null, // Clear the plain text code once used
    })
    .where(eq(schema.studentSetupCodes.id, setupCode.id));

  // Log successful validation
  await logLicenseActivity(null, 'setup_code_used', {
    studentId,
    setupCodeId: setupCode.id,
  });

  return { valid: true, setupCodeId: setupCode.id };
}

// Get active setup code for student (for teacher display)
export async function getActiveSetupCode(
  studentId: string,
  accessedBy: string
): Promise<{ exists: boolean, clearCode?: string, expiresAt?: Date, createdAt?: Date }> {
  const [setupCode] = await licenseDb
    .select({
      clearCode: schema.studentSetupCodes.clearCode,
      expiresAt: schema.studentSetupCodes.expiresAt,
      createdAt: schema.studentSetupCodes.createdAt,
    })
    .from(schema.studentSetupCodes)
    .where(
      and(
        eq(schema.studentSetupCodes.studentId, studentId),
        eq(schema.studentSetupCodes.isActive, true),
        isNull(schema.studentSetupCodes.usedAt),
        gt(schema.studentSetupCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!setupCode) {
    return { exists: false };
  }

  // Log access to setup code info (for audit purposes)
  await logLicenseActivity(null, 'setup_code_info_accessed', {
    studentId,
    accessedBy,
  }, accessedBy);

  return {
    exists: true,
    clearCode: setupCode.clearCode ?? undefined,
    expiresAt: setupCode.expiresAt ?? undefined,
    createdAt: setupCode.createdAt ?? undefined,
  };
}

export async function getStudentByUsername(username: string) {
  const [student] = await licenseDb
    .select()
    .from(schema.studentAccounts)
    .where(eq(schema.studentAccounts.username, username))
    .limit(1);
  
  return student;
}

export async function getStudentById(studentId: string) {
  const [student] = await licenseDb
    .select()
    .from(schema.studentAccounts)
    .where(eq(schema.studentAccounts.id, studentId))
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
  // Delete student account directly (no more password access records to clean up)
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