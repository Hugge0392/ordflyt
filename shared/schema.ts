import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, pgEnum, boolean, uniqueIndex, index, check, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role enum
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'LARARE', 'ELEV']);

// Assignment type enum
export const assignmentTypeEnum = pgEnum('assignment_type', [
  'reading_lesson',
  'word_class_practice', 
  'published_lesson',
  'custom_exercise'
]);

// Progress status enum
export const progressStatusEnum = pgEnum('progress_status', [
  'not_started',
  'in_progress',
  'completed',
  'submitted'
]);

// Feedback type enum
export const feedbackTypeEnum = pgEnum('feedback_type', [
  'lesson_completion',
  'progress_comment',
  'behavior_note',
  'achievement',
  'concern'
]);

// Error report status enum
export const errorReportStatusEnum = pgEnum('error_report_status', [
  'pending',
  'reviewed',
  'resolved',
  'dismissed'
]);

// Error report type enum
export const errorReportTypeEnum = pgEnum('error_report_type', [
  'wrong_word_class',
  'missing_word',
  'spelling_error',
  'other'
]);

// Activity type enum for student progress tracking
export const activityTypeEnum = pgEnum('activity_type', [
  'grammar',
  'wordclass', 
  'reading',
  'test'
]);

// Student activity type enum
export const studentActivityTypeEnum = pgEnum('student_activity_type', [
  'login',
  'logout',
  'start_lesson',
  'complete_lesson',
  'answer_question'
]);

// Vocabulary exercise type enum
export const vocabularyExerciseTypeEnum = pgEnum('vocabulary_exercise_type', [
  'flashcards',
  'multiple_choice',
  'fill_in_blank',
  'matching',
  'word_association',
  'sentence_completion',
  'definition_matching',
  'synonym_antonym',
  'image_matching',
  'spelling',
  'true_false'
]);

// Vocabulary attempt status enum
export const vocabularyAttemptStatusEnum = pgEnum('vocabulary_attempt_status', [
  'not_started',
  'in_progress',
  'completed',
  'passed',
  'failed'
]);

// Blog category enum - SEO optimized categories
export const blogCategoryEnum = pgEnum('blog_category', [
  // Läsförståelse (Highest SEO priority)
  'lasforstaelse-strategier',
  'lasforstaelse-ovningar',
  'lasforstaelse-texttyper',
  'lasforstaelse-aldersanpassat',

  // Grammatik
  'grammatik-ordklasser',
  'grammatik-meningsbyggnad',
  'grammatik-interpunktion',

  // Skrivande
  'skrivande-genrer',
  'skrivande-process',
  'skrivande-verktyg',

  // Källkritik
  'kallkritik-metoder',
  'kallkritik-digitala-kallor',
  'kallkritik-faktagranskning',

  // Pedagogik (För lärare)
  'pedagogik-metodik',
  'pedagogik-digitala-verktyg',
  'pedagogik-bedomning',

  // Allmänt
  'allmant'
]);

// Users table - core authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default('ELEV'),
  mfaSecret: text("mfa_secret"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  emailVerified: boolean("email_verified").default(false),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  mustChangePassword: boolean("must_change_password").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  usernameIdx: uniqueIndex("username_idx").on(table.username),
  emailIdx: uniqueIndex("email_idx").on(table.email),
}));

// Sessions table - server-side session storage
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar("session_token", { length: 512 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
}, (table) => ({
  sessionTokenIdx: uniqueIndex("session_token_idx").on(table.sessionToken),
  userIdIdx: index("user_sessions_idx").on(table.userId), // Changed from uniqueIndex to index to allow multiple concurrent sessions
}));

// Failed login attempts for rate limiting
export const failedLogins = pgTable("failed_logins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  attemptTime: timestamp("attempt_time").defaultNow(),
  reason: varchar("reason", { length: 255 }),
});

// Audit log for security events
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT, MFA_ENABLED, etc.
  subjectType: varchar("subject_type", { length: 100 }),
  subjectId: varchar("subject_id"),
  ipAddressHash: varchar("ip_address_hash", { length: 64 }), // SHA256 hashed IP
  userAgent: text("user_agent"),
  details: jsonb("details").$type<Record<string, any>>(),
  success: boolean("success").default(true),
});

// CSRF tokens
export const csrfTokens = pgTable("csrf_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 512 }).notNull().unique(),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
});

// Classes for teacher-student relationships
export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  term: varchar("term", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

// Students linked to classes
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alias: varchar("alias", { length: 255 }).notNull(),
  classId: varchar("class_id").notNull().references(() => classes.id),
  userId: varchar("user_id").references(() => users.id),
  claimToken: varchar("claim_token", { length: 512 }),
  claimTokenExpires: timestamp("claim_token_expires"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// One-time codes for license redemption
export const oneTimeCodes = pgTable("one_time_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  redeemedAt: timestamp("redeemed_at"),
  redeemedBy: varchar("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email verification tokens for teacher registration
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(), // 'registration_verify', 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  userId: varchar("user_id").references(() => users.id), // null for registration, set for password reset
  createdAt: timestamp("created_at").defaultNow(),
});

// Teacher registration requests before account creation
export const teacherRegistrations = pgTable("teacher_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  schoolName: varchar("school_name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  emailVerified: boolean("email_verified").default(false),
  userId: varchar("user_id").references(() => users.id), // Set after account creation
  status: varchar("status", { length: 50 }).default('pending_verification'), // 'pending_verification', 'verified', 'account_created'
  verificationToken: varchar("verification_token", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

// Teacher licenses
export const teacherLicenses = pgTable("teacher_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  licenseKey: varchar("license_key", { length: 64 }).notNull().unique(),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  oneTimeCodeId: varchar("one_time_code_id").references(() => oneTimeCodes.id),
});

// Classes created by teachers
export const teacherClasses = pgTable("teacher_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  licenseId: varchar("license_id").notNull().references(() => teacherLicenses.id, { onDelete: 'cascade' }),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  term: varchar("term", { length: 50 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

// Student accounts created by teachers
export const studentAccounts = pgTable("student_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  studentName: varchar("student_name", { length: 255 }).notNull(),
  classId: varchar("class_id").notNull().references(() => teacherClasses.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  mustChangePassword: boolean("must_change_password").default(true),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Secure setup codes for student first-time login (expires after 24 hours)
export const studentSetupCodes = pgTable("student_setup_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  codeHash: varchar("code_hash", { length: 255 }).notNull(), // hashed setup code for validation
  clearCode: varchar("clear_code", { length: 255 }), // plain text code for teacher viewing - only stored until used
  createdBy: varchar("created_by").notNull().references(() => users.id), // teacher who created the code
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 30 days from creation
  usedAt: timestamp("used_at"), // null until used
  isActive: boolean("is_active").default(true),
}, (table) => ({
  studentIdIdx: index("student_setup_codes_student_id_idx").on(table.studentId),
  createdByIdx: index("student_setup_codes_created_by_idx").on(table.createdBy),
}));

// Student sessions table - separate authentication for students
export const studentSessions = pgTable("student_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  sessionToken: varchar("session_token", { length: 512 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  sessionTokenIdx: uniqueIndex("student_session_token_idx").on(table.sessionToken),
  studentIdIdx: index("student_sessions_student_id_idx").on(table.studentId),
}));

// License activity log
export const licenseLog = pgTable("license_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").references(() => teacherLicenses.id),
  action: varchar("action", { length: 50 }).notNull(), // 'created', 'redeemed', 'revoked', 'renewed', 'code_generated', 'code_generation_failed'
  details: jsonb("details"),
  performedBy: varchar("performed_by").references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wordClasses = pgTable("word_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  swedishName: text("swedish_name").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
});

export const sentences = pgTable("sentences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  words: jsonb("words").notNull().$type<Word[]>(),
  level: integer("level").notNull().default(1),
  wordClassType: text("word_class_type"), // Which word class this sentence is for
});

export const gameProgresses = pgTable("game_progresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  score: integer("score").notNull().default(0),
  level: integer("level").notNull().default(1),
  correctAnswers: integer("correct_answers").notNull().default(0),
  wrongAnswers: integer("wrong_answers").notNull().default(0),
  currentSentenceIndex: integer("current_sentence_index").notNull().default(0),
  completedSentences: jsonb("completed_sentences").notNull().$type<string[]>().default([]),
  completedLevels: jsonb("completed_levels").notNull().$type<{[wordClass: string]: number}>().default({}),
  correctAnswersByWordClass: jsonb("correct_answers_by_word_class").notNull().$type<{[wordClass: string]: number}>().default({}),
});

export interface Word {
  text: string;
  wordClass: string;
  isPunctuation?: boolean;
}

// Insert schemas for authentication tables
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  lastActivityAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  timestamp: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for license system
export const insertOneTimeCodeSchema = createInsertSchema(oneTimeCodes).omit({
  id: true,
  createdAt: true,
});

export const insertTeacherLicenseSchema = createInsertSchema(teacherLicenses).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for email verification and teacher registration
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
});

export const insertTeacherRegistrationSchema = createInsertSchema(teacherRegistrations).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});

export const insertTeacherClassSchema = createInsertSchema(teacherClasses).omit({
  id: true,
  createdAt: true,
});

export const insertStudentAccountSchema = createInsertSchema(studentAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSessionSchema = createInsertSchema(studentSessions).omit({
  id: true,
  createdAt: true,
});

export const insertLicenseLogSchema = createInsertSchema(licenseLog).omit({
  id: true,
  createdAt: true,
});

// Types for authentication
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// Types for license system
export type OneTimeCode = typeof oneTimeCodes.$inferSelect;
export type InsertOneTimeCode = z.infer<typeof insertOneTimeCodeSchema>;
export type TeacherLicense = typeof teacherLicenses.$inferSelect;
export type InsertTeacherLicense = z.infer<typeof insertTeacherLicenseSchema>;

// Types for email verification and teacher registration
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type TeacherRegistration = typeof teacherRegistrations.$inferSelect;
export type InsertTeacherRegistration = z.infer<typeof insertTeacherRegistrationSchema>;

export type TeacherClass = typeof teacherClasses.$inferSelect;
export type InsertTeacherClass = z.infer<typeof insertTeacherClassSchema>;
export type StudentAccount = typeof studentAccounts.$inferSelect;
export type InsertStudentAccount = z.infer<typeof insertStudentAccountSchema>;
export type StudentSession = typeof studentSessions.$inferSelect;
export type InsertStudentSession = z.infer<typeof insertStudentSessionSchema>;
export type LicenseLog = typeof licenseLog.$inferSelect;
export type InsertLicenseLog = z.infer<typeof insertLicenseLogSchema>;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = z.infer<typeof insertAuditLogSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export const insertWordClassSchema = createInsertSchema(wordClasses).omit({
  id: true,
});

export const insertSentenceSchema = createInsertSchema(sentences).omit({
  id: true,
});

export const insertGameProgressSchema = createInsertSchema(gameProgresses).omit({
  id: true,
});

export type InsertWordClass = z.infer<typeof insertWordClassSchema>;
export type WordClass = typeof wordClasses.$inferSelect;

export type InsertSentence = z.infer<typeof insertSentenceSchema>;
export type Sentence = typeof sentences.$inferSelect;

export type InsertGameProgress = z.infer<typeof insertGameProgressSchema>;
export type GameProgress = typeof gameProgresses.$inferSelect;

// Error reports table
export const errorReports = pgTable("error_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sentenceId: varchar("sentence_id").references(() => sentences.id),
  sentenceText: text("sentence_text").notNull(),
  reportType: errorReportTypeEnum("report_type").notNull(),
  description: text("description").notNull(),
  reportedWord: varchar("reported_word"),
  expectedWordClass: varchar("expected_word_class"),
  actualWordClass: varchar("actual_word_class"),
  playerEmail: varchar("player_email"),
  status: errorReportStatusEnum("status").default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
}, (table) => ({
  statusIdx: index("error_reports_status_idx").on(table.status),
  typeIdx: index("error_reports_type_idx").on(table.reportType),
  createdAtIdx: index("error_reports_created_at_idx").on(table.createdAt),
}));

export const insertErrorReportSchema = createInsertSchema(errorReports).omit({
  id: true,
  createdAt: true,
});

export type InsertErrorReport = z.infer<typeof insertErrorReportSchema>;
export type ErrorReport = typeof errorReports.$inferSelect;

// Published lessons table
export const publishedLessons = pgTable("published_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: varchar("description"),
  wordClass: varchar("word_class"), // vilken ordklass lektionen tillhör
  difficulty: varchar("difficulty").default("medium"), // easy, medium, hard
  background: varchar("background").default("beach"), // bakgrund för lektionen
  content: jsonb("content").notNull(), // hela lektionsstrukturen
  fileName: varchar("file_name"), // Namn på den genererade filen (valfri)
  filePath: varchar("file_path"), // Sökväg till filen (valfri)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPublishedLessonSchema = createInsertSchema(publishedLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  fileName: true,  // Filnamn genereras på servern
  filePath: true,  // Sökväg genereras på servern
});

export type PublishedLesson = typeof publishedLessons.$inferSelect;
export type InsertPublishedLesson = z.infer<typeof insertPublishedLessonSchema>;

// Draft lessons table - för att spara utkast under utveckling
export const lessonDrafts = pgTable("lesson_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: varchar("description"),
  wordClass: varchar("word_class"),
  difficulty: varchar("difficulty").default("medium"),
  background: varchar("background").default("beach"), // bakgrund för lektionen
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLessonDraftSchema = createInsertSchema(lessonDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LessonDraft = typeof lessonDrafts.$inferSelect;
export type InsertLessonDraft = z.infer<typeof insertLessonDraftSchema>;

// Rich document types for ProseMirror format
export interface RichDoc {
  type: string;
  content?: any[];
  attrs?: Record<string, any>;
}

export interface RichPage {
  id: string;
  doc: RichDoc; // ProseMirror JSON document
  meta?: {
    wordCount?: number;
  };
}

// Legacy page format for backward compatibility
export interface LegacyPage {
  id: string;
  content: string;
  imagesAbove?: string[];
  imagesBelow?: string[];
  questions?: ReadingQuestion[];
}

// Reading comprehension lessons table
export const readingLessons = pgTable("reading_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  
  // Legacy content field - kept for backward compatibility
  content: text("content").notNull(), // The main text content (can include HTML for rich formatting)
  
  // Updated pages field - supports both legacy and rich document formats
  pages: jsonb("pages").$type<RichPage[] | LegacyPage[]>().default([]), // Rich document pages or legacy pages
  
  // Rich document pages - new format with ProseMirror JSON
  richPages: jsonb("rich_pages").$type<RichPage[]>().default([]), // Array of rich document pages
  
  // Block-based pages - newest format with separate TextBlock and ImageBlock components
  blockPages: jsonb("block_pages").$type<RichPage[]>().default([]), // Array of block-based pages
  
  // Migration tracking
  migrated: boolean("migrated").default(false), // Track if content has been migrated to rich format
  
  featuredImage: text("featured_image"), // URL to featured/header image

  gradeLevel: varchar("grade_level").notNull(), // e.g. "4-6", "7-9" 
  subject: varchar("subject"), // e.g. "Svenska", "Naturkunskap"
  readingTime: integer("reading_time"), // estimated reading time in minutes
  numberOfPages: integer("number_of_pages").default(1), // how many pages this lesson should have
  preReadingQuestions: jsonb("pre_reading_questions").notNull().$type<PreReadingQuestion[]>().default([]),
  questions: jsonb("questions").notNull().$type<ReadingQuestion[]>().default([]),
  wordDefinitions: jsonb("word_definitions").notNull().$type<WordDefinition[]>().default([]),
  isPublished: integer("is_published").default(0), // 0 = draft, 1 = published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface PreReadingQuestion {
  id: string;
  question: string;
  purpose: string; // why this question is asked before reading
}

export interface ReadingQuestion {
  id: string;
  type: "multiple_choice" | "multiple-choice" | "open_ended" | "open" | "true_false" | "true-false";
  question: string;
  options?: string[]; // for multiple choice (legacy)
  alternatives?: string[]; // for multiple choice (current)
  correctAnswer?: string | number | boolean; // for multiple choice (index) or true/false
  explanation?: string; // optional explanation for the answer
  pageNumber?: number; // which page this question belongs to
}

export interface WordDefinition {
  word: string;
  definition: string;
  context?: string; // the sentence context where the word appears
}

export const insertReadingLessonSchema = createInsertSchema(readingLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ReadingLesson = typeof readingLessons.$inferSelect;
export type InsertReadingLesson = z.infer<typeof insertReadingLessonSchema>;

// Vocabulary system tables

// Vocabulary sets - core vocabulary lesson containers
export const vocabularySets = pgTable("vocabulary_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Visual styling
  themeColor: varchar("theme_color", { length: 7 }).default('#3B82F6'), // hex color code
  frameColor: varchar("frame_color", { length: 7 }).default('#1F2937'), // hex color code
  orderNumbersColor: varchar("order_numbers_color", { length: 7 }).default('#F59E0B'), // hex color code
  
  // Optional banner image
  bannerImage: text("banner_image"), // URL to banner image
  
  // Optional link to existing lesson
  lessonId: varchar("lesson_id").references(() => readingLessons.id),
  
  // Publishing and status
  isPublished: boolean("is_published").default(false),
  
  // Metadata for flexibility
  metadata: jsonb("metadata").$type<VocabularySetMetadata>(),
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  titleIdx: index("vocabulary_sets_title_idx").on(table.title),
  publishedIdx: index("vocabulary_sets_published_idx").on(table.isPublished),
  lessonIdx: index("vocabulary_sets_lesson_idx").on(table.lessonId),
}));

// Vocabulary words - individual words in each set
export const vocabularyWords = pgTable("vocabulary_words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  setId: varchar("set_id").notNull().references(() => vocabularySets.id, { onDelete: 'cascade' }),
  
  // Core word data
  term: varchar("term", { length: 255 }).notNull(),
  definition: text("definition").notNull(),
  
  // Optional enrichment data
  synonym: varchar("synonym", { length: 255 }),
  antonym: varchar("antonym", { length: 255 }),
  example: text("example"), // example sentence using the word
  imageUrl: text("image_url"), // URL to associated image
  
  // Audio pronunciation (optional)
  pronunciationUrl: text("pronunciation_url"),
  phonetic: varchar("phonetic", { length: 255 }), // phonetic spelling
  
  // Ordering within set
  orderIndex: integer("order_index").default(0),
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  setOrderIdx: index("vocabulary_words_set_order_idx").on(table.setId, table.orderIndex),
  termIdx: index("vocabulary_words_term_idx").on(table.term),
  setIdx: index("vocabulary_words_set_idx").on(table.setId),
  // Unique constraint: setId + term must be unique
  uniqueSetTerm: uniqueIndex("vocabulary_words_set_term_unique").on(table.setId, table.term),
}));

// Vocabulary exercises - different exercise types per set
export const vocabularyExercises = pgTable("vocabulary_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  setId: varchar("set_id").notNull().references(() => vocabularySets.id, { onDelete: 'cascade' }),
  
  // Exercise configuration
  type: vocabularyExerciseTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"), // description for the exercise
  instructions: text("instructions"), // instructions for the exercise
  
  // Exercise configuration in JSON for flexibility
  config: jsonb("config").$type<ExerciseConfig>().notNull(),
  
  // Ordering for exercise sequence
  orderIndex: integer("order_index").default(0),
  
  // Exercise settings
  timeLimit: integer("time_limit"), // time limit in seconds (optional)
  pointsPerCorrect: integer("points_per_correct").default(10),
  minPassingScore: integer("min_passing_score").default(70), // percentage
  allowRetries: boolean("allow_retries").default(true),
  
  // Publishing status
  isActive: boolean("is_active").default(true),
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  setOrderIdx: index("vocabulary_exercises_set_order_idx").on(table.setId, table.orderIndex),
  typeIdx: index("vocabulary_exercises_type_idx").on(table.type),
  setIdx: index("vocabulary_exercises_set_idx").on(table.setId),
  activeIdx: index("vocabulary_exercises_active_idx").on(table.isActive),
  // Check constraint: orderIndex must be >= 0
  orderIndexCheck: check("vocabulary_exercises_order_index_check", sql`order_index >= 0`),
}));

// Vocabulary attempts - student progress tracking
export const vocabularyAttempts = pgTable("vocabulary_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  exerciseId: varchar("exercise_id").notNull().references(() => vocabularyExercises.id, { onDelete: 'cascade' }),
  
  // Attempt tracking
  status: vocabularyAttemptStatusEnum("status").notNull().default('not_started'),
  score: integer("score").default(0), // points earned
  percent: integer("percent").default(0), // 0-100 percentage score
  
  // Time tracking
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms").default(0), // duration in milliseconds
  
  // Answer data in JSON for flexibility
  answers: jsonb("answers").$type<VocabularyAnswerData>(),
  attemptNumber: integer("attempt_number").default(1), // attempt number for this exercise
  
  // Streak and reward tracking (added for integration)
  streakAtStart: integer("streak_at_start").default(0),
  streakAtEnd: integer("streak_at_end").default(0),
  coinsEarned: integer("coins_earned").default(0),
  experienceEarned: integer("experience_earned").default(0),
  rewardedAt: timestamp("rewarded_at"), // Prevents double-awarding rewards
  
  // IDEMPOTENCY: Prevents duplicate submissions
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentExerciseIdx: index("vocabulary_attempts_student_exercise_idx").on(table.studentId, table.exerciseId),
  statusIdx: index("vocabulary_attempts_status_idx").on(table.status),
  studentIdx: index("vocabulary_attempts_student_idx").on(table.studentId),
  exerciseIdx: index("vocabulary_attempts_exercise_idx").on(table.exerciseId),
  completedIdx: index("vocabulary_attempts_completed_idx").on(table.completedAt),
  // Composite index for comprehensive querying
  studentExerciseStatusIdx: index("vocabulary_attempts_student_exercise_status_idx").on(table.studentId, table.exerciseId, table.status),
  // Index for reward tracking
  rewardedIdx: index("vocabulary_attempts_rewarded_idx").on(table.rewardedAt),
  // Unique constraint on idempotency key for duplicate prevention
  idempotencyIdx: uniqueIndex("vocabulary_attempts_idempotency_idx").on(table.idempotencyKey),
}));

// Vocabulary streaks - tracks daily streaks and achievements per student for vocabulary exercises
export const vocabularyStreaks = pgTable("vocabulary_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  
  // Daily streak tracking
  currentStreak: integer("current_streak").default(0), // current consecutive days
  longestStreak: integer("longest_streak").default(0), // best streak ever
  lastStudyDate: timestamp("last_study_date"),
  streakStartDate: timestamp("streak_start_date"),
  
  // Achievement tracking
  achievements: jsonb("achievements").$type<VocabularyAchievement[]>().default([]),
  
  // Statistics
  totalDaysStudied: integer("total_days_studied").default(0),
  totalExercisesCompleted: integer("total_exercises_completed").default(0),
  totalCorrectAnswers: integer("total_correct_answers").default(0),
  totalCoinsEarned: integer("total_coins_earned").default(0),
  
  // Milestone tracking
  milestones: jsonb("milestones").$type<VocabularyMilestone[]>().default([]),
  nextMilestoneAt: integer("next_milestone_at").default(3), // next milestone streak length
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentIdx: uniqueIndex("vocabulary_streaks_student_idx").on(table.studentId),
  currentStreakIdx: index("vocabulary_streaks_current_streak_idx").on(table.currentStreak),
  lastStudyIdx: index("vocabulary_streaks_last_study_idx").on(table.lastStudyDate),
  longestStreakIdx: index("vocabulary_streaks_longest_streak_idx").on(table.longestStreak),
}));

// Vocabulary system interfaces and types

export interface VocabularySetMetadata {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number; // minutes
  gradeLevel?: string; // e.g., "4-6", "7-9"
  subject?: string; // e.g., "English", "Science"
  tags?: string[]; // categorization tags
  targetAudience?: string; // description of intended audience
  learningObjectives?: string[]; // what students should learn
}

// Exercise config discriminated union as requested by architect
export type ExerciseConfig = 
  | ({ type: 'flashcards' } & FlashcardsConfig)
  | ({ type: 'multiple_choice' } & MultipleChoiceConfig)
  | ({ type: 'fill_in_blank' } & FillInBlankConfig)
  | ({ type: 'matching' } & MatchingConfig)
  | ({ type: 'word_association' } & WordAssociationConfig)
  | ({ type: 'sentence_completion' } & SentenceCompletionConfig)
  | ({ type: 'definition_matching' } & DefinitionMatchingConfig)
  | ({ type: 'synonym_antonym' } & SynonymAntonymConfig)
  | ({ type: 'image_matching' } & ImageMatchingConfig)
  | ({ type: 'spelling' } & SpellingConfig);

// Legacy interface for backward compatibility
export interface VocabularyExerciseConfig {
  // Common settings for all exercise types
  wordIds?: string[]; // specific words to include in exercise
  wordCount?: number; // number of words to use
  randomOrder?: boolean; // randomize word order
  showDefinitions?: boolean; // show definitions
  showImages?: boolean; // show images if available
  
  // Exercise type specific settings
  multipleChoice?: MultipleChoiceConfig;
  flashcards?: FlashcardsConfig;
  fillInBlank?: FillInBlankConfig;
  matching?: MatchingConfig;
  wordAssociation?: WordAssociationConfig;
  sentenceCompletion?: SentenceCompletionConfig;
  definitionMatching?: DefinitionMatchingConfig;
  synonymAntonym?: SynonymAntonymConfig;
  imageMatching?: ImageMatchingConfig;
  spelling?: SpellingConfig;
}

export interface MultipleChoiceConfig {
  questionType: 'definition' | 'synonym' | 'antonym' | 'example';
  optionCount: number; // number of answer choices
  showHints?: boolean;
  allowPartialCredit?: boolean;
}

export interface FlashcardsConfig {
  showTerm: boolean; // show term first or definition first
  autoFlip?: boolean; // automatically flip cards
  flipDelay?: number; // seconds before auto flip
  shuffleCards?: boolean;
}

export interface FillInBlankConfig {
  sentenceType: 'example' | 'definition' | 'custom';
  blankPosition: 'random' | 'beginning' | 'middle' | 'end';
  provideWordBank?: boolean;
  showFirstLetter?: boolean;
}

export interface MatchingConfig {
  matchType: 'term_definition' | 'synonym_antonym' | 'image_term';
  columns: number; // number of columns for layout
  allowDragDrop?: boolean;
}

export interface WordAssociationConfig {
  associationType: 'synonym' | 'antonym' | 'category' | 'theme';
  responseFormat: 'single_word' | 'multiple_choice' | 'free_text';
  timeLimit?: number; // seconds per word
}

export interface SentenceCompletionConfig {
  sentenceSource: 'examples' | 'custom' | 'generated';
  completionType: 'single_word' | 'phrase' | 'multiple_choice';
  showContext?: boolean;
}

export interface DefinitionMatchingConfig {
  presentationStyle: 'grid' | 'list' | 'cards';
  allowPartialMatching?: boolean;
  showProgressIndicator?: boolean;
}

export interface SynonymAntonymConfig {
  focusType: 'synonyms' | 'antonyms' | 'both';
  responseFormat: 'selection' | 'typing' | 'drag_drop';
  showWordType?: boolean; // show if it's noun, verb, etc.
}

export interface ImageMatchingConfig {
  imageLayout: 'grid' | 'carousel' | 'single';
  matchDirection: 'image_to_word' | 'word_to_image' | 'both';
  showImageHints?: boolean;
}

export interface SpellingConfig {
  inputMethod: 'typing' | 'letter_selection' | 'drag_drop';
  showPhonetics?: boolean;
  allowAudioHints?: boolean;
  scrambleLetters?: boolean;
}

export interface VocabularyAnswerData {
  responses: VocabularyResponse[]; // individual responses for each question
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  hintsUsed: number;
  timePerQuestion?: number[]; // time spent on each question in seconds
  streakCount: number; // longest streak achieved
  sessionStartTime?: string; // ISO timestamp
  sessionEndTime?: string; // ISO timestamp
}

export interface VocabularyResponse {
  questionId: string; // unique identifier for the question
  wordId: string; // vocabulary word this question is about
  questionType: string; // type of question asked
  userAnswer: any; // user's answer (can be string, number, array, etc.)
  correctAnswer: any; // the correct answer
  isCorrect: boolean;
  timeSpent: number; // seconds spent on this question
  hintsUsed: number; // number of hints used for this question
  attemptNumber: number; // attempt number for this question
  timestamp: string; // ISO timestamp when answered
}

// Vocabulary achievement system interfaces
export interface VocabularyAchievement {
  id: string;
  type: 'streak' | 'accuracy' | 'speed' | 'completion' | 'milestone';
  title: string; // e.g., "3-dagar i rad", "Perfekt poäng", "Blixtsnabb"
  description: string;
  earnedAt: string; // ISO timestamp
  coinsAwarded: number;
  criteria: {
    streakDays?: number;
    accuracy?: number; // percentage
    completedExercises?: number;
    averageTime?: number; // milliseconds
    exerciseType?: string;
  };
}

export interface VocabularyMilestone {
  id: string;
  type: 'daily_streak' | 'weekly_streak' | 'monthly_streak' | 'total_exercises' | 'perfect_scores';
  name: string; // e.g., "3-dagars streak", "7-dagars streak"
  description: string;
  threshold: number; // streak days or exercise count
  coinsReward: number;
  reached: boolean;
  reachedAt?: string; // ISO timestamp
  nextThreshold?: number; // next milestone
}

// Insert schemas for vocabulary system
export const insertVocabularySetSchema = createInsertSchema(vocabularySets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVocabularyWordSchema = createInsertSchema(vocabularyWords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVocabularyExerciseSchema = createInsertSchema(vocabularyExercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVocabularyAttemptSchema = createInsertSchema(vocabularyAttempts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVocabularyStreakSchema = createInsertSchema(vocabularyStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types for vocabulary system
export type VocabularySet = typeof vocabularySets.$inferSelect;
export type InsertVocabularySet = z.infer<typeof insertVocabularySetSchema>;
export type VocabularyWord = typeof vocabularyWords.$inferSelect;
export type InsertVocabularyWord = z.infer<typeof insertVocabularyWordSchema>;
export type VocabularyExercise = typeof vocabularyExercises.$inferSelect;
export type InsertVocabularyExercise = z.infer<typeof insertVocabularyExerciseSchema>;
export type VocabularyAttempt = typeof vocabularyAttempts.$inferSelect;
export type InsertVocabularyAttempt = z.infer<typeof insertVocabularyAttemptSchema>;
export type VocabularyStreak = typeof vocabularyStreaks.$inferSelect;
export type InsertVocabularyStreak = z.infer<typeof insertVocabularyStreakSchema>;

// Flashcard system extensions

// Mastery level enum for individual word progress
export const masteryLevelEnum = pgEnum('mastery_level', [
  'learning',    // Just started learning this word
  'familiar',    // Seen it a few times, getting familiar
  'mastered'     // Consistently gets it right
]);

// Learning mode enum for flashcard sessions
export const learningModeEnum = pgEnum('learning_mode', [
  'study',       // Browse without scoring
  'practice',    // Self-assessment with easy/hard feedback
  'test',        // Formal assessment with scoring
  'mixed'        // Random order with spaced repetition
]);

// Flashcard progress - tracks individual word progress per student
export const flashcardProgress = pgTable("flashcard_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  wordId: varchar("word_id").notNull().references(() => vocabularyWords.id, { onDelete: 'cascade' }),
  setId: varchar("set_id").notNull().references(() => vocabularySets.id, { onDelete: 'cascade' }),
  
  // Progress tracking
  masteryLevel: masteryLevelEnum("mastery_level").notNull().default('learning'),
  timesReviewed: integer("times_reviewed").default(0),
  timesCorrect: integer("times_correct").default(0),
  timesIncorrect: integer("times_incorrect").default(0),
  currentStreak: integer("current_streak").default(0), // consecutive correct answers
  bestStreak: integer("best_streak").default(0), // best streak ever for this word
  
  // Spaced repetition algorithm data
  easinessFactor: doublePrecision("easiness_factor").default(2.5), // SM-2 algorithm easiness factor
  intervalDays: integer("interval_days").default(1), // days until next review
  nextReviewDate: timestamp("next_review_date").defaultNow(),
  lastReviewDate: timestamp("last_review_date"),
  
  // Performance metrics
  averageResponseTime: integer("average_response_time").default(0), // milliseconds
  lastResponseTime: integer("last_response_time").default(0), // milliseconds
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentWordIdx: uniqueIndex("flashcard_progress_student_word_idx").on(table.studentId, table.wordId),
  studentSetIdx: index("flashcard_progress_student_set_idx").on(table.studentId, table.setId),
  masteryIdx: index("flashcard_progress_mastery_idx").on(table.masteryLevel),
  nextReviewIdx: index("flashcard_progress_next_review_idx").on(table.nextReviewDate),
  studentIdx: index("flashcard_progress_student_idx").on(table.studentId),
  wordIdx: index("flashcard_progress_word_idx").on(table.wordId),
}));

// Flashcard streaks - tracks daily streaks and achievements per student
export const flashcardStreaks = pgTable("flashcard_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  
  // Daily streak tracking
  currentStreak: integer("current_streak").default(0), // current consecutive days
  longestStreak: integer("longest_streak").default(0), // best streak ever
  lastStudyDate: timestamp("last_study_date"),
  streakStartDate: timestamp("streak_start_date"),
  
  // Achievement tracking
  achievements: jsonb("achievements").$type<FlashcardAchievement[]>().default([]),
  
  // Statistics
  totalDaysStudied: integer("total_days_studied").default(0),
  totalCardsReviewed: integer("total_cards_reviewed").default(0),
  totalCorrectAnswers: integer("total_correct_answers").default(0),
  totalSessionsCompleted: integer("total_sessions_completed").default(0),
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentIdx: uniqueIndex("flashcard_streaks_student_idx").on(table.studentId),
  currentStreakIdx: index("flashcard_streaks_current_streak_idx").on(table.currentStreak),
  lastStudyIdx: index("flashcard_streaks_last_study_idx").on(table.lastStudyDate),
}));

// Flashcard sessions - tracks completed flashcard study sessions
export const flashcardSessions = pgTable("flashcard_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  setId: varchar("set_id").notNull().references(() => vocabularySets.id, { onDelete: 'cascade' }),
  
  // Session configuration
  mode: learningModeEnum("mode").notNull(),
  totalCards: integer("total_cards").notNull(),
  targetCards: integer("target_cards"), // user-selected number of cards to review
  
  // Session results
  cardsCompleted: integer("cards_completed").default(0),
  cardsCorrect: integer("cards_correct").default(0),
  cardsIncorrect: integer("cards_incorrect").default(0),
  cardsSkipped: integer("cards_skipped").default(0),
  
  // Performance metrics
  totalTime: integer("total_time").default(0), // total session time in milliseconds
  averageTimePerCard: integer("average_time_per_card").default(0), // milliseconds
  accuracy: doublePrecision("accuracy").default(0), // percentage
  
  // Streak and reward tracking
  streakAtStart: integer("streak_at_start").default(0),
  streakAtEnd: integer("streak_at_end").default(0),
  coinsEarned: integer("coins_earned").default(0),
  experienceEarned: integer("experience_earned").default(0),
  rewardedAt: timestamp("rewarded_at"), // Prevents double-awarding rewards
  
  // Session timing
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  
  // Session data (detailed card-by-card results)
  sessionData: jsonb("session_data").$type<FlashcardSessionData>(),
  
  // Standard tracking fields
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  studentIdx: index("flashcard_sessions_student_idx").on(table.studentId),
  setIdx: index("flashcard_sessions_set_idx").on(table.setId),
  modeIdx: index("flashcard_sessions_mode_idx").on(table.mode),
  completedIdx: index("flashcard_sessions_completed_idx").on(table.completedAt),
  studentDateIdx: index("flashcard_sessions_student_date_idx").on(table.studentId, table.startedAt),
}));

// Flashcard system interfaces and types

export interface FlashcardAchievement {
  id: string;
  type: 'streak' | 'mastery' | 'speed' | 'accuracy' | 'volume';
  title: string; // e.g., "3-Day Streak", "Lightning Fast", "Perfect Score"
  description: string;
  earnedAt: string; // ISO timestamp
  criteria: {
    streakDays?: number;
    masteredWords?: number;
    averageTime?: number; // milliseconds
    accuracy?: number; // percentage
    cardsReviewed?: number;
  };
}

export interface FlashcardSessionData {
  cards: FlashcardCardResult[];
  sessionConfig: {
    shuffled: boolean;
    showDefinitionFirst: boolean;
    autoAdvance: boolean;
    timeLimit?: number;
  };
}

export interface FlashcardCardResult {
  wordId: string;
  term: string;
  definition: string;
  userRating?: 'easy' | 'hard' | 'again'; // for practice mode
  isCorrect?: boolean; // for test mode
  responseTime: number; // milliseconds
  hintsUsed: number;
  skipped: boolean;
  masteryLevelBefore: 'learning' | 'familiar' | 'mastered';
  masteryLevelAfter: 'learning' | 'familiar' | 'mastered';
  timestamp: string; // ISO timestamp when answered
}

// Enhanced flashcard config extending the existing one
export interface EnhancedFlashcardsConfig extends FlashcardsConfig {
  // Spaced repetition settings
  useSpacedRepetition?: boolean;
  reviewOverdueOnly?: boolean; // only show cards due for review
  
  // Session configuration
  cardLimit?: number; // max cards per session
  timeLimit?: number; // session time limit in minutes
  autoAdvance?: boolean; // automatically advance after answer
  
  // Learning preferences
  showDefinitionFirst?: boolean; // show definition first instead of term
  enableHints?: boolean;
  allowSkipping?: boolean;
  
  // Progress tracking
  trackDetailedProgress?: boolean;
  updateMasteryLevels?: boolean;
  awardCoins?: boolean;
  streakBonusMultiplier?: number;
}

// Insert schemas for flashcard system
export const insertFlashcardProgressSchema = createInsertSchema(flashcardProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFlashcardStreakSchema = createInsertSchema(flashcardStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFlashcardSessionSchema = createInsertSchema(flashcardSessions).omit({
  id: true,
  createdAt: true,
});

// TypeScript types for flashcard system
export type FlashcardProgress = typeof flashcardProgress.$inferSelect;
export type InsertFlashcardProgress = z.infer<typeof insertFlashcardProgressSchema>;
export type FlashcardStreak = typeof flashcardStreaks.$inferSelect;
export type InsertFlashcardStreak = z.infer<typeof insertFlashcardStreakSchema>;
export type FlashcardSession = typeof flashcardSessions.$inferSelect;
export type InsertFlashcardSession = z.infer<typeof insertFlashcardSessionSchema>;

// Klasskamp (multiplayer game) tables
export const klassKampGames = pgTable("klasskamp_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 6 }).notNull().unique(),
  teacherName: varchar("teacher_name", { length: 255 }).notNull(),
  wordClassId: varchar("word_class_id").references(() => wordClasses.id),
  status: varchar("status", { length: 20 }).notNull().default('waiting'), // waiting, playing, finished
  currentQuestionIndex: integer("current_question_index").default(0),
  questionCount: integer("question_count").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at")
});

export const klassKampPlayers = pgTable("klasskamp_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => klassKampGames.id, { onDelete: 'cascade' }),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  score: integer("score").default(0),
  correctAnswers: integer("correct_answers").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
  isConnected: boolean("is_connected").default(true)
});

export const klassKampAnswers = pgTable("klasskamp_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => klassKampGames.id, { onDelete: 'cascade' }),
  playerId: varchar("player_id").notNull().references(() => klassKampPlayers.id, { onDelete: 'cascade' }),
  sentenceId: varchar("sentence_id").notNull().references(() => sentences.id),
  selectedWords: jsonb("selected_words").$type<string[]>().default([]),
  isCorrect: boolean("is_correct").notNull(),
  timeUsed: integer("time_used").notNull(), // milliseconds
  points: integer("points").default(0),
  answeredAt: timestamp("answered_at").defaultNow()
});

// Zod schemas for klasskamp
export const insertKlassKampGameSchema = createInsertSchema(klassKampGames);
export const insertKlassKampPlayerSchema = createInsertSchema(klassKampPlayers);
export const insertKlassKampAnswerSchema = createInsertSchema(klassKampAnswers);

// Additional export types for klasskamp
export type KlassKampGame = typeof klassKampGames.$inferSelect;
export type InsertKlassKampGame = z.infer<typeof insertKlassKampGameSchema>;
export type KlassKampPlayer = typeof klassKampPlayers.$inferSelect;
export type InsertKlassKampPlayer = z.infer<typeof insertKlassKampPlayerSchema>;
export type KlassKampAnswer = typeof klassKampAnswers.$inferSelect;
export type InsertKlassKampAnswer = z.infer<typeof insertKlassKampAnswerSchema>;

// Classroom management enums
export const classroomSessionStatusEnum = pgEnum('classroom_session_status', [
  'active',
  'paused',
  'ended'
]);

export const classroomMessageTypeEnum = pgEnum('classroom_message_type', [
  'instruction',
  'announcement',
  'alert',
  'timer_warning',
  'break_time',
  'attention'
]);

export const timerTypeEnum = pgEnum('timer_type', [
  'countdown',
  'stopwatch',
  'break_timer',
  'exercise_timer',
  'attention_timer'
]);

export const timerStatusEnum = pgEnum('timer_status', [
  'stopped',
  'running',
  'paused',
  'completed'
]);

export const screenControlStatusEnum = pgEnum('screen_control_status', [
  'unlocked',
  'locked',
  'attention_mode',
  'break_mode'
]);

export const classroomActivityTypeEnum = pgEnum('classroom_activity_type', [
  'lesson',
  'exercise',
  'test',
  'break',
  'group_work',
  'discussion'
]);

export const classroomModeEnum = pgEnum('classroom_mode', [
  'instruction',
  'exercise',
  'test',
  'break',
  'group_work',
  'silent'
]);

// Classroom sessions - active classroom management sessions
export const classroomSessions = pgTable("classroom_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  classId: varchar("class_id").notNull().references(() => teacherClasses.id, { onDelete: 'cascade' }),
  sessionName: varchar("session_name", { length: 255 }).notNull(),
  currentMode: classroomModeEnum("current_mode").default('instruction'),
  status: classroomSessionStatusEnum("status").default('active'),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  settings: jsonb("settings").$type<ClassroomSettings>().default({}),
}, (table) => ({
  teacherIdx: index("classroom_sessions_teacher_idx").on(table.teacherId),
  classIdx: index("classroom_sessions_class_idx").on(table.classId),
  statusIdx: index("classroom_sessions_status_idx").on(table.status),
}));

// Classroom messages - messages sent to students
export const classroomMessages = pgTable("classroom_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => classroomSessions.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  messageType: classroomMessageTypeEnum("message_type").notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  targetStudentIds: jsonb("target_student_ids").$type<string[]>().default([]), // empty array means all students
  displayDuration: integer("display_duration"), // milliseconds, null means permanent
  isUrgent: boolean("is_urgent").default(false),
  requiresAcknowledgment: boolean("requires_acknowledgment").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  sessionIdx: index("classroom_messages_session_idx").on(table.sessionId),
  typeIdx: index("classroom_messages_type_idx").on(table.messageType),
  sentAtIdx: index("classroom_messages_sent_at_idx").on(table.sentAt),
}));

// Classroom timers - timer configurations and states
export const classroomTimers = pgTable("classroom_timers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => classroomSessions.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: timerTypeEnum("type").notNull(),
  duration: integer("duration"), // total duration in milliseconds (null for stopwatch)
  elapsed: integer("elapsed").default(0), // elapsed time in milliseconds
  status: timerStatusEnum("status").default('stopped'),
  displayStyle: varchar("display_style", { length: 50 }).default('digital'), // digital, progress_bar, circular
  showOnStudentScreens: boolean("show_on_student_screens").default(true),
  playAudioOnComplete: boolean("play_audio_on_complete").default(true),
  warningThresholds: jsonb("warning_thresholds").$type<number[]>().default([]), // warning times in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  pausedAt: timestamp("paused_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  sessionIdx: index("classroom_timers_session_idx").on(table.sessionId),
  statusIdx: index("classroom_timers_status_idx").on(table.status),
}));

// Student screen controls - lock/unlock states for student screens
export const studentScreenControls = pgTable("student_screen_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => classroomSessions.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  status: screenControlStatusEnum("status").default('unlocked'),
  restrictedUrls: jsonb("restricted_urls").$type<string[]>().default([]),
  allowedUrls: jsonb("allowed_urls").$type<string[]>().default([]),
  lockMessage: text("lock_message"),
  lastStatusChange: timestamp("last_status_change").defaultNow(),
  controlledBy: varchar("controlled_by").references(() => users.id),
}, (table) => ({
  sessionIdx: index("student_screen_controls_session_idx").on(table.sessionId),
  studentIdx: index("student_screen_controls_student_idx").on(table.studentId),
  statusIdx: index("student_screen_controls_status_idx").on(table.status),
  uniqueSessionStudent: uniqueIndex("student_screen_controls_session_student").on(table.sessionId, table.studentId),
}));

// Classroom activities - synchronized activities across students
export const classroomActivities = pgTable("classroom_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => classroomSessions.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: classroomActivityTypeEnum("type").notNull(),
  description: text("description"),
  lessonId: varchar("lesson_id").references(() => readingLessons.id),
  assignmentId: varchar("assignment_id").references(() => lessonAssignments.id),
  targetStudentIds: jsonb("target_student_ids").$type<string[]>().default([]), // empty array means all students
  isActive: boolean("is_active").default(false),
  autoStart: boolean("auto_start").default(false),
  timeLimit: integer("time_limit"), // in milliseconds
  settings: jsonb("settings").$type<ActivitySettings>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
}, (table) => ({
  sessionIdx: index("classroom_activities_session_idx").on(table.sessionId),
  typeIdx: index("classroom_activities_type_idx").on(table.type),
  activeIdx: index("classroom_activities_active_idx").on(table.isActive),
}));

// Student connection status - track which students are connected to classroom
export const studentConnections = pgTable("student_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => classroomSessions.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  isConnected: boolean("is_connected").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  connectionCount: integer("connection_count").default(0), // number of times connected this session
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  connectedAt: timestamp("connected_at"),
  disconnectedAt: timestamp("disconnected_at"),
}, (table) => ({
  sessionIdx: index("student_connections_session_idx").on(table.sessionId),
  studentIdx: index("student_connections_student_idx").on(table.studentId),
  connectedIdx: index("student_connections_connected_idx").on(table.isConnected),
  uniqueSessionStudent: uniqueIndex("student_connections_session_student").on(table.sessionId, table.studentId),
}));

// Message acknowledgments - track student acknowledgments
export const messageAcknowledgments = pgTable("message_acknowledgments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => classroomMessages.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
}, (table) => ({
  messageIdx: index("message_acknowledgments_message_idx").on(table.messageId),
  studentIdx: index("message_acknowledgments_student_idx").on(table.studentId),
  uniqueMessageStudent: uniqueIndex("message_acknowledgments_message_student").on(table.messageId, table.studentId),
}));

// Classroom audit log - track all classroom management actions
export const classroomAuditLog = pgTable("classroom_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => classroomSessions.id, { onDelete: 'cascade' }),
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // TIMER_START, MESSAGE_SEND, SCREEN_LOCK, etc.
  targetType: varchar("target_type", { length: 50 }), // student, class, activity, timer, etc.
  targetId: varchar("target_id"),
  targetStudentIds: jsonb("target_student_ids").$type<string[]>().default([]),
  details: jsonb("details").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
}, (table) => ({
  sessionIdx: index("classroom_audit_log_session_idx").on(table.sessionId),
  performedByIdx: index("classroom_audit_log_performed_by_idx").on(table.performedBy),
  actionIdx: index("classroom_audit_log_action_idx").on(table.action),
  timestampIdx: index("classroom_audit_log_timestamp_idx").on(table.timestamp),
}));

// TypeScript interfaces for complex JSON fields
export interface ClassroomSettings {
  autoConnectStudents?: boolean;
  allowStudentChat?: boolean;
  defaultTimerStyle?: string;
  emergencyContactInfo?: string;
  classroomRules?: string[];
  breakDuration?: number; // in minutes
  attentionModeTimeout?: number; // in minutes
}

export interface ActivitySettings {
  showProgressToStudents?: boolean;
  allowCollaboration?: boolean;
  randomizeQuestions?: boolean;
  showHints?: boolean;
  maxAttempts?: number;
  passThreshold?: number; // percentage
}

// Zod schemas for classroom management
export const insertClassroomSessionSchema = createInsertSchema(classroomSessions).omit({
  id: true,
  startedAt: true,
  lastActivityAt: true,
});

export const insertClassroomMessageSchema = createInsertSchema(classroomMessages).omit({
  id: true,
  sentAt: true,
});

export const insertClassroomTimerSchema = createInsertSchema(classroomTimers).omit({
  id: true,
  createdAt: true,
});

export const insertStudentScreenControlSchema = createInsertSchema(studentScreenControls).omit({
  id: true,
  lastStatusChange: true,
});

export const insertClassroomActivitySchema = createInsertSchema(classroomActivities).omit({
  id: true,
  createdAt: true,
});

export const insertStudentConnectionSchema = createInsertSchema(studentConnections).omit({
  id: true,
  lastSeen: true,
  connectedAt: true,
  disconnectedAt: true,
});

export const insertMessageAcknowledgmentSchema = createInsertSchema(messageAcknowledgments).omit({
  id: true,
  acknowledgedAt: true,
});

export const insertClassroomAuditLogSchema = createInsertSchema(classroomAuditLog).omit({
  id: true,
  timestamp: true,
});

// Export types for classroom management
export type ClassroomSession = typeof classroomSessions.$inferSelect;
export type InsertClassroomSession = z.infer<typeof insertClassroomSessionSchema>;
export type ClassroomMessage = typeof classroomMessages.$inferSelect;
export type InsertClassroomMessage = z.infer<typeof insertClassroomMessageSchema>;
export type ClassroomTimer = typeof classroomTimers.$inferSelect;
export type InsertClassroomTimer = z.infer<typeof insertClassroomTimerSchema>;
export type StudentScreenControl = typeof studentScreenControls.$inferSelect;
export type InsertStudentScreenControl = z.infer<typeof insertStudentScreenControlSchema>;
export type ClassroomActivity = typeof classroomActivities.$inferSelect;
export type InsertClassroomActivity = z.infer<typeof insertClassroomActivitySchema>;
export type StudentConnection = typeof studentConnections.$inferSelect;
export type InsertStudentConnection = z.infer<typeof insertStudentConnectionSchema>;
export type MessageAcknowledgment = typeof messageAcknowledgments.$inferSelect;
export type InsertMessageAcknowledgment = z.infer<typeof insertMessageAcknowledgmentSchema>;
export type ClassroomAuditLogEntry = typeof classroomAuditLog.$inferSelect;
export type InsertClassroomAuditLogEntry = z.infer<typeof insertClassroomAuditLogSchema>;

// Schools table - track which school teachers belong to (important for archiving when teachers leave)
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  district: varchar("district", { length: 255 }),
  municipality: varchar("municipality", { length: 255 }),
  address: text("address"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("school_name_idx").on(table.name),
}));

// Teacher-school memberships table - track which teachers belong to which schools
export const teacherSchoolMemberships = pgTable("teacher_school_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  role: varchar("role").default('teacher'), // 'teacher', 'substitute', 'admin', 'coordinator'
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  teacherSchoolIdx: uniqueIndex("teacher_school_memberships_idx").on(table.teacherId, table.schoolId),
  teacherIdx: index("teacher_memberships_idx").on(table.teacherId),
  schoolIdx: index("school_memberships_idx").on(table.schoolId),
}));

// Lesson assignments table - track which lessons/categories are assigned to which students or classes
export const lessonAssignments = pgTable("lesson_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Assignment can be to a specific student or entire class
  studentId: varchar("student_id").references(() => studentAccounts.id, { onDelete: 'cascade' }),
  classId: varchar("class_id").references(() => teacherClasses.id, { onDelete: 'cascade' }),
  
  // What's being assigned
  assignmentType: assignmentTypeEnum("assignment_type").notNull(),
  lessonId: varchar("lesson_id"), // can reference readingLessons.id, publishedLessons.id, etc.
  wordClass: varchar("word_class"), // for word class practice assignments
  
  // Assignment details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  instructions: text("instructions"), // special instructions for this assignment
  
  // Timing and availability
  availableFrom: timestamp("available_from"),
  dueDate: timestamp("due_date"),
  estimatedDuration: integer("estimated_duration"), // minutes
  
  // Configuration
  allowRetries: boolean("allow_retries").default(true),
  showCorrectAnswers: boolean("show_correct_answers").default(true),
  requireCompletion: boolean("require_completion").default(false),
  
  // Assignment settings in JSONB for flexibility
  settings: jsonb("settings").$type<AssignmentSettings>().default({}),
  
  // Status and tracking
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // CHECK constraint: exactly one of studentId or classId must be set
  assignmentTargetCheck: check('assignment_target_check', 
    sql`((student_id IS NULL) != (class_id IS NULL))`),
  // Indexes for performance
  teacherIdx: index("lesson_assignments_teacher_idx").on(table.teacherId),
  classIdx: index("lesson_assignments_class_idx").on(table.classId),
  studentIdx: index("lesson_assignments_student_idx").on(table.studentId),
  activeIdx: index("lesson_assignments_active_idx").on(table.isActive),
  dueDateIdx: index("lesson_assignments_due_date_idx").on(table.dueDate),
  assignmentTypeIdx: index("lesson_assignments_type_idx").on(table.assignmentType),
}));

export interface AssignmentSettings {
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  maxAttempts?: number;
  timeLimit?: number; // minutes
  showProgress?: boolean;
  allowSkipping?: boolean;
  customInstructions?: string;
  adaptiveDifficulty?: boolean;
  requireMinScore?: number; // percentage
}

// Student lesson progress table - track individual student progress on specific lessons
export const studentLessonProgress = pgTable("student_lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  assignmentId: varchar("assignment_id").references(() => lessonAssignments.id, { onDelete: 'cascade' }),
  
  // What lesson/exercise this progress is for
  lessonType: assignmentTypeEnum("lesson_type").notNull(), // 'reading_lesson', 'word_class_practice', 'published_lesson'
  lessonId: varchar("lesson_id"), // reference to specific lesson
  
  // Progress tracking
  status: progressStatusEnum("status").notNull().default('not_started'),
  progressPercentage: integer("progress_percentage").default(0), // 0-100
  currentStep: varchar("current_step"), // which part of the lesson they're on
  
  // Performance metrics
  score: integer("score").default(0),
  maxScore: integer("max_score"),
  correctAnswers: integer("correct_answers").default(0),
  totalQuestions: integer("total_questions").default(0),
  attemptCount: integer("attempt_count").default(0),
  
  // Time tracking
  timeSpent: integer("time_spent").default(0), // total minutes spent
  lastActivityAt: timestamp("last_activity_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Detailed progress data in JSONB for flexibility
  progressData: jsonb("progress_data").$type<LessonProgressData>().default({}),
  
  // Notes and feedback
  studentNotes: text("student_notes"), // student's own notes
  needsHelp: boolean("needs_help").default(false),
  flaggedForReview: boolean("flagged_for_review").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Partial unique indexes to prevent duplicate progress records
  studentAssignmentIdx: uniqueIndex("student_assignment_progress_idx")
    .on(table.studentId, table.assignmentId)
    .where(sql`assignment_id IS NOT NULL`),
  studentLessonIdx: uniqueIndex("student_lesson_progress_idx")
    .on(table.studentId, table.lessonId, table.lessonType)
    .where(sql`lesson_id IS NOT NULL`),
  // Performance indexes
  studentIdx: index("student_progress_student_idx").on(table.studentId),
  assignmentIdx: index("student_progress_assignment_idx").on(table.assignmentId),
  statusIdx: index("student_progress_status_idx").on(table.status),
  lastActivityIdx: index("student_progress_activity_idx").on(table.lastActivityAt),
  completedAtIdx: index("student_progress_completed_idx").on(table.completedAt),
}));

export interface LessonProgressData {
  questionsAnswered?: string[]; // IDs of questions answered
  pagesVisited?: number[]; // which pages have been visited
  bookmarkedPages?: number[]; // pages student has bookmarked
  highlightedText?: HighlightedText[]; // text student has highlighted
  wrongAnswers?: WrongAnswer[]; // track mistakes for analysis
  achievements?: string[]; // achievements unlocked
  toolsUsed?: string[]; // which accessibility tools were used
  sessionDurations?: number[]; // duration of each session in minutes
  difficultyAdjustments?: DifficultyAdjustment[]; // track adaptive difficulty changes
}

export interface HighlightedText {
  pageNumber: number;
  text: string;
  note?: string;
}

export interface WrongAnswer {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  timestamp: string;
}

export interface DifficultyAdjustment {
  timestamp: string;
  fromLevel: string;
  toLevel: string;
  reason: string;
}

// Teacher feedback table - allow teachers to leave comments/feedback on student work
export const teacherFeedback = pgTable("teacher_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  
  // What the feedback is about
  feedbackType: feedbackTypeEnum("feedback_type").notNull(),
  progressId: varchar("progress_id").references(() => studentLessonProgress.id, { onDelete: 'cascade' }),
  assignmentId: varchar("assignment_id").references(() => lessonAssignments.id, { onDelete: 'cascade' }),
  
  // Feedback content
  title: varchar("title", { length: 255 }),
  message: text("message").notNull(),
  
  // Feedback metadata
  priority: varchar("priority").default('normal'), // 'low', 'normal', 'high', 'urgent'
  isPositive: boolean("is_positive"), // true for praise, false for concerns, null for neutral
  isPrivate: boolean("is_private").default(false), // only visible to teacher and student
  
  // Student response
  studentHasRead: boolean("student_has_read").default(false),
  studentResponse: text("student_response"),
  studentRespondedAt: timestamp("student_responded_at"),
  
  // Follow-up tracking
  requiresFollowUp: boolean("requires_follow_up").default(false),
  followedUpAt: timestamp("followed_up_at"),
  followUpNotes: text("follow_up_notes"),
  
  // Feedback data for rich content
  feedbackData: jsonb("feedback_data").$type<FeedbackData>().default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface FeedbackData {
  attachments?: string[]; // URLs to attached files
  scoreDetails?: ScoreDetails; // detailed scoring information
  recommendedActions?: string[]; // suggested next steps
  tags?: string[]; // categorization tags
  relatedFeedback?: string[]; // IDs of related feedback entries
}

export interface ScoreDetails {
  areas: FeedbackArea[];
  overallRating: number; // 1-5 scale
  improvementAreas: string[];
  strengths: string[];
}

export interface FeedbackArea {
  name: string;
  score: number;
  comment: string;
}

// Student tool settings table - track which tools (AI help, voice, etc.) each student has access to
export const studentToolSettings = pgTable("student_tool_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  
  // Accessibility and support tools
  textToSpeechEnabled: boolean("text_to_speech_enabled").default(false),
  speechToTextEnabled: boolean("speech_to_text_enabled").default(false),
  aiAssistantEnabled: boolean("ai_assistant_enabled").default(false),
  dictionaryLookupEnabled: boolean("dictionary_lookup_enabled").default(true),
  
  // Visual accessibility
  fontSize: varchar("font_size").default('medium'), // 'small', 'medium', 'large', 'extra_large'
  fontFamily: varchar("font_family").default('default'), // 'default', 'dyslexia_friendly', 'sans_serif', 'serif'
  highContrastMode: boolean("high_contrast_mode").default(false),
  reducedAnimations: boolean("reduced_animations").default(false),
  
  // Learning support
  showHints: boolean("show_hints").default(true),
  allowSkipping: boolean("allow_skipping").default(false),
  extendedTimeAllowed: boolean("extended_time_allowed").default(false),
  timeMultiplier: integer("time_multiplier").default(100), // percentage (100 = normal, 150 = 50% extra time)
  
  // Progress and feedback
  showProgress: boolean("show_progress").default(true),
  immediateCorrection: boolean("immediate_correction").default(true),
  detailedFeedback: boolean("detailed_feedback").default(true),
  
  // Customization and preferences
  preferredBackground: varchar("preferred_background").default('beach'),
  preferredTheme: varchar("preferred_theme").default('light'),
  language: varchar("language").default('sv'), // 'sv' for Swedish, 'en' for English
  
  // Tool-specific settings in JSONB for flexibility
  toolSettings: jsonb("tool_settings").$type<StudentToolConfig>().default({}),
  
  // Permission and override settings
  teacherOverrides: jsonb("teacher_overrides").$type<TeacherOverrides>().default({}),
  parentalControls: jsonb("parental_controls").$type<ParentalControls>().default({}),
  
  // Tracking
  lastModifiedBy: varchar("last_modified_by").references(() => users.id), // teacher who last modified settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentSettingsIdx: uniqueIndex("student_tool_settings_idx").on(table.studentId),
}));

export interface StudentToolConfig {
  speechRate?: number; // 0.5 to 2.0 for text-to-speech
  speechVoice?: string; // preferred voice for TTS
  aiAssistantLevel?: 'basic' | 'intermediate' | 'advanced'; // how much AI help to provide
  keyboardShortcuts?: Record<string, string>; // custom keyboard shortcuts
  autoSave?: boolean; // automatically save progress
  reminderFrequency?: number; // minutes between progress reminders
  gamificationLevel?: 'minimal' | 'standard' | 'full'; // level of game elements
}

export interface TeacherOverrides {
  forcedSettings?: string[]; // settings that teacher has locked
  tempDisabledTools?: string[]; // temporarily disabled tools
  customInstructions?: string; // special instructions for this student
  monitoringLevel?: 'normal' | 'increased' | 'intensive'; // level of progress monitoring
}

export interface ParentalControls {
  screenTimeLimit?: number; // daily limit in minutes
  allowedTimeSlots?: TimeSlot[]; // when student can access the system
  reportFrequency?: 'daily' | 'weekly' | 'monthly'; // how often to send progress reports
  contactMethods?: string[]; // how to contact parents (email, SMS, etc.)
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6 (Sunday = 0)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

// Classroom controls table - manage classroom screen states (locked/unlocked, active timers, etc.)
export const classroomControls = pgTable("classroom_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => teacherClasses.id, { onDelete: 'cascade' }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Classroom state management
  isLocked: boolean("is_locked").default(false), // are student screens locked?
  lockMessage: text("lock_message"), // message to show when locked
  
  // Timer management
  timerActive: boolean("timer_active").default(false),
  timerDuration: integer("timer_duration"), // total duration in seconds
  timerRemaining: integer("timer_remaining"), // remaining time in seconds
  timerStartedAt: timestamp("timer_started_at"),
  timerMessage: varchar("timer_message"),
  timerAutoLock: boolean("timer_auto_lock").default(false), // lock screens when timer ends
  
  // Attention management
  attentionRequest: boolean("attention_request").default(false), // teacher requesting attention
  attentionMessage: varchar("attention_message"),
  
  // Current activity control
  forcedActivity: varchar("forced_activity"), // force all students to specific activity
  forcedLessonId: varchar("forced_lesson_id"), // specific lesson all students must do
  allowFreeChoice: boolean("allow_free_choice").default(true),
  
  // Monitoring and visibility
  showStudentScreens: boolean("show_student_screens").default(false), // teacher can see student screens
  showProgressToClass: boolean("show_progress_to_class").default(false), // show class progress publicly
  anonymousMode: boolean("anonymous_mode").default(false), // hide student names from each other
  
  // Communication controls
  chatEnabled: boolean("chat_enabled").default(false),
  helpRequestsEnabled: boolean("help_requests_enabled").default(true),
  voiceChatEnabled: boolean("voice_chat_enabled").default(false),
  
  // Session management
  sessionName: varchar("session_name"), // name for current session
  sessionStartedAt: timestamp("session_started_at"),
  expectedEndTime: timestamp("expected_end_time"),
  
  // Real-time classroom data
  controlData: jsonb("control_data").$type<ClassroomControlData>().default({}),
  
  // Active student tracking
  activeStudents: jsonb("active_students").$type<string[]>().default([]), // student IDs currently online
  
  // History and logging
  lastAction: varchar("last_action"), // last action performed
  lastActionAt: timestamp("last_action_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  classControlIdx: uniqueIndex("classroom_controls_idx").on(table.classId),
}));

export interface ClassroomControlData {
  announcements?: Announcement[]; // current announcements
  breakSchedule?: BreakTime[]; // scheduled breaks
  collaborativeGroups?: StudentGroup[]; // grouped students for collaboration
  restrictedWebsites?: string[]; // websites that are blocked
  allowedApps?: string[]; // only these apps can be used
  currentTopic?: string; // what the class is currently studying
  learningObjectives?: string[]; // goals for the current session
  emergencyContacts?: EmergencyContact[]; // emergency contact information
}

export interface Announcement {
  id: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  showUntil: string; // ISO timestamp
  targetStudents?: string[]; // specific student IDs, or empty for all
}

export interface BreakTime {
  startTime: string; // HH:MM format
  duration: number; // minutes
  type: 'short' | 'lunch' | 'recess';
  message?: string;
}

export interface StudentGroup {
  id: string;
  name: string;
  studentIds: string[];
  activity?: string;
  color?: string; // for visual identification
}

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email?: string;
}

// Insert schemas for the new teacher dashboard tables
export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeacherFeedbackSchema = createInsertSchema(teacherFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentToolSettingsSchema = createInsertSchema(studentToolSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClassroomControlsSchema = createInsertSchema(classroomControls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schema for teacher-school memberships
export const insertTeacherSchoolMembershipSchema = createInsertSchema(teacherSchoolMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Lesson assignment schemas (after all table definitions)
export const insertLessonAssignmentSchema = createInsertSchema(lessonAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentLessonProgressSchema = createInsertSchema(studentLessonProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for the new teacher dashboard tables
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;

export type TeacherSchoolMembership = typeof teacherSchoolMemberships.$inferSelect;
export type InsertTeacherSchoolMembership = z.infer<typeof insertTeacherSchoolMembershipSchema>;

export type LessonAssignment = typeof lessonAssignments.$inferSelect;
export type InsertLessonAssignment = z.infer<typeof insertLessonAssignmentSchema>;
export type StudentLessonProgress = typeof studentLessonProgress.$inferSelect;
export type InsertStudentLessonProgress = z.infer<typeof insertStudentLessonProgressSchema>;
export type TeacherFeedback = typeof teacherFeedback.$inferSelect;
export type InsertTeacherFeedback = z.infer<typeof insertTeacherFeedbackSchema>;

export type StudentToolSettings = typeof studentToolSettings.$inferSelect;
export type InsertStudentToolSettings = z.infer<typeof insertStudentToolSettingsSchema>;

export type ClassroomControls = typeof classroomControls.$inferSelect;
export type InsertClassroomControls = z.infer<typeof insertClassroomControlsSchema>;

// Analytics data types for comprehensive student results dashboard
export interface TeacherAnalytics {
  overview: {
    totalStudents: number;
    totalClasses: number;
    activeAssignments: number;
    completedAssignments: number;
    averageCompletionRate: number;
    averageScore: number;
    totalTimeSpent: number; // minutes
  };
  recentActivity: {
    date: string;
    completions: number;
    averageScore: number;
  }[];
  classBreakdown: {
    classId: string;
    className: string;
    studentCount: number;
    averageScore: number;
    completionRate: number;
    strugglingStudents: number;
  }[];
}

export interface ClassAnalytics {
  classInfo: {
    id: string;
    name: string;
    studentCount: number;
    averageScore: number;
    averageCompletionRate: number;
    totalTimeSpent: number;
  };
  studentPerformance: {
    studentId: string;
    studentName: string;
    averageScore: number;
    completionRate: number;
    timeSpent: number;
    assignmentsCompleted: number;
    lastActivity: string | null;
    needsHelp: boolean;
  }[];
  assignmentBreakdown: {
    assignmentId: string;
    title: string;
    assignmentType: string;
    completionRate: number;
    averageScore: number;
    strugglingStudentCount: number;
  }[];
  progressTrends: {
    date: string;
    completions: number;
    averageScore: number;
    timeSpent: number;
  }[];
}

export interface StudentAnalytics {
  studentInfo: {
    id: string;
    name: string;
    className: string;
    overallScore: number;
    completionRate: number;
    totalTimeSpent: number;
    assignmentsCompleted: number;
    lastActivity: string | null;
  };
  performanceHistory: {
    date: string;
    assignmentTitle: string;
    assignmentType: string;
    score: number;
    timeSpent: number;
    status: string;
  }[];
  weakAreas: {
    assignmentType: string;
    averageScore: number;
    completionRate: number;
    needsAttention: boolean;
  }[];
  progressTrajectory: {
    date: string;
    cumulativeScore: number;
    monthlyAverage: number;
  }[];
  strengthsAndChallenges: {
    strengths: string[];
    challenges: string[];
  };
}

export interface AssignmentAnalytics {
  assignmentInfo: {
    id: string;
    title: string;
    assignmentType: string;
    dueDate: string | null;
    studentCount: number;
  };
  completionStats: {
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    completionRate: number;
    averageScore: number;
    averageTimeSpent: number;
  };
  studentResults: {
    studentId: string;
    studentName: string;
    status: string;
    score: number | null;
    timeSpent: number;
    completedAt: string | null;
    needsHelp: boolean;
  }[];
  performanceDistribution: {
    scoreRange: string;
    studentCount: number;
  }[];
}

export interface PerformanceComparisonOptions {
  classIds?: string[];
  assignmentTypes?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  comparisonType: 'class' | 'assignment_type' | 'time_period';
}

export interface PerformanceComparison {
  comparisonType: string;
  baseline: {
    name: string;
    averageScore: number;
    completionRate: number;
    studentCount: number;
  };
  comparisons: {
    name: string;
    averageScore: number;
    completionRate: number;
    studentCount: number;
    percentageDifference: number;
  }[];
  insights: {
    bestPerforming: string;
    needsImprovement: string;
    trends: string[];
  };
}

export interface TimeRange {
  start: string;
  end: string;
  granularity: 'day' | 'week' | 'month';
}

export interface ProgressTrends {
  timeRange: TimeRange;
  overallTrend: {
    direction: 'improving' | 'declining' | 'stable';
    percentage: number;
  };
  trends: {
    date: string;
    completions: number;
    averageScore: number;
    timeSpent: number;
    activeStudents: number;
  }[];
  insights: {
    bestPeriod: string;
    challengingPeriod: string;
    recommendations: string[];
  };
}

export interface CompletionRateData {
  id: string;
  name: string;
  total: number;
  completed: number;
  completionRate: number;
  averageScore: number;
  category: 'class' | 'assignment' | 'student';
}

export interface TimeSpentAnalytics {
  totalHours: number;
  averageSessionLength: number; // minutes
  timeDistribution: {
    assignmentType: string;
    hours: number;
    percentage: number;
  }[];
  dailyActivity: {
    date: string;
    hours: number;
    sessions: number;
  }[];
  efficiencyMetrics: {
    fastLearners: { studentId: string; studentName: string; averageTime: number }[];
    needsMoreTime: { studentId: string; studentName: string; averageTime: number }[];
  };
}

export interface StrugglingStudentData {
  studentId: string;
  studentName: string;
  className: string;
  concerns: {
    lowCompletionRate: boolean;
    lowAverageScore: boolean;
    longTimeSpent: boolean;
    frequentHelp: boolean;
    recentInactivity: boolean;
  };
  metrics: {
    completionRate: number;
    averageScore: number;
    averageTimeSpent: number;
    helpRequests: number;
    daysSinceLastActivity: number;
  };
  recommendations: string[];
}

export interface TopPerformerData {
  studentId: string;
  studentName: string;
  className: string;
  achievements: {
    highCompletionRate: boolean;
    highAverageScore: boolean;
    efficientLearning: boolean;
    consistentProgress: boolean;
    helpingOthers: boolean;
  };
  metrics: {
    completionRate: number;
    averageScore: number;
    averageTimeSpent: number;
    streakDays: number;
    assignmentsAheadOfSchedule: number;
  };
  recognitions: string[];
}

// ===============================
// DATA EXPORT SYSTEM MODELS
// ===============================

// Export types enum
export const exportTypeEnum = pgEnum('export_type', [
  'student_progress_report',
  'parent_meeting_report',
  'class_data_backup',
  'administrative_report',
  'assignment_overview',
  'custom_report'
]);

// Export formats enum
export const exportFormatEnum = pgEnum('export_format', [
  'pdf',
  'csv',
  'excel',
  'json',
  'html'
]);

// Export status enum
export const exportStatusEnum = pgEnum('export_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'expired'
]);

// Export jobs table - track export requests and processing
export const exportJobs = pgTable("export_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  
  // Export configuration
  exportType: exportTypeEnum("export_type").notNull(),
  format: exportFormatEnum("format").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Target scope
  classIds: jsonb("class_ids").$type<string[]>().default([]),
  studentIds: jsonb("student_ids").$type<string[]>().default([]),
  assignmentIds: jsonb("assignment_ids").$type<string[]>().default([]),
  
  // Filter criteria
  dateRange: jsonb("date_range").$type<ExportDateRange>(),
  dataFields: jsonb("data_fields").$type<string[]>().default([]), // which fields to include
  filterCriteria: jsonb("filter_criteria").$type<ExportFilterCriteria>().default({}),
  
  // Configuration and customization
  templateId: varchar("template_id").references(() => exportTemplates.id),
  customization: jsonb("customization").$type<ExportCustomization>().default({}),
  
  // Processing status
  status: exportStatusEnum("status").default('pending'),
  progress: integer("progress").default(0), // 0-100 percentage
  processingMessage: text("processing_message"),
  errorMessage: text("error_message"),
  
  // File management
  outputPath: text("output_path"), // path to generated file
  fileSize: integer("file_size"), // file size in bytes
  downloadCount: integer("download_count").default(0),
  expiresAt: timestamp("expires_at"), // when file expires for security
  
  // Metadata
  estimatedRecords: integer("estimated_records"), // estimated number of records to export
  actualRecords: integer("actual_records"), // actual number of records exported
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  teacherIdx: index("export_jobs_teacher_idx").on(table.teacherId),
  schoolIdx: index("export_jobs_school_idx").on(table.schoolId),
  statusIdx: index("export_jobs_status_idx").on(table.status),
  typeIdx: index("export_jobs_type_idx").on(table.exportType),
  createdAtIdx: index("export_jobs_created_at_idx").on(table.createdAt),
  expiresAtIdx: index("export_jobs_expires_at_idx").on(table.expiresAt),
}));

// Export templates table - reusable export configurations
export const exportTemplates = pgTable("export_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Template scope
  teacherId: varchar("teacher_id").references(() => users.id, { onDelete: 'cascade' }), // null = global template
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }), // null = system template
  
  // Template configuration
  exportType: exportTypeEnum("export_type").notNull(),
  format: exportFormatEnum("format").notNull(),
  dataFields: jsonb("data_fields").$type<string[]>().notNull(),
  defaultFilters: jsonb("default_filters").$type<ExportFilterCriteria>().default({}),
  
  // Template design
  layoutConfig: jsonb("layout_config").$type<ExportLayoutConfig>().default({}),
  styling: jsonb("styling").$type<ExportStyling>().default({}),
  
  // Usage and maintenance
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false), // can other teachers use this template
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  teacherIdx: index("export_templates_teacher_idx").on(table.teacherId),
  schoolIdx: index("export_templates_school_idx").on(table.schoolId),
  typeIdx: index("export_templates_type_idx").on(table.exportType),
  activeIdx: index("export_templates_active_idx").on(table.isActive),
  publicIdx: index("export_templates_public_idx").on(table.isPublic),
}));

// Export history table - track all export activities for audit
export const exportHistory = pgTable("export_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => exportJobs.id, { onDelete: 'cascade' }),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  
  // Action tracking
  action: varchar("action", { length: 50 }).notNull(), // 'created', 'started', 'completed', 'downloaded', 'failed'
  details: jsonb("details").$type<Record<string, any>>().default({}),
  
  // Request context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  jobIdx: index("export_history_job_idx").on(table.jobId),
  teacherIdx: index("export_history_teacher_idx").on(table.teacherId),
  actionIdx: index("export_history_action_idx").on(table.action),
  timestampIdx: index("export_history_timestamp_idx").on(table.timestamp),
}));

// TypeScript interfaces for export configuration
export interface ExportDateRange {
  start: string;
  end: string;
  granularity?: 'day' | 'week' | 'month';
}

export interface ExportFilterCriteria {
  assignmentTypes?: string[];
  progressStatus?: string[];
  scoreThreshold?: {
    min?: number;
    max?: number;
  };
  completionRateThreshold?: {
    min?: number;
    max?: number;
  };
  timeSpentThreshold?: {
    min?: number; // minutes
    max?: number; // minutes
  };
  includeInactive?: boolean;
  includeFeedback?: boolean;
  includeTeacherComments?: boolean;
  language?: 'sv' | 'en';
}

export interface ExportCustomization {
  showCharts?: boolean;
  showProgressGraphs?: boolean;
  showComparisons?: boolean;
  includeSummary?: boolean;
  includeRecommendations?: boolean;
  customTitle?: string;
  customHeader?: string;
  customFooter?: string;
  logoUrl?: string;
  schoolBranding?: boolean;
  colorScheme?: 'default' | 'professional' | 'colorful' | 'monochrome';
}

export interface ExportLayoutConfig {
  pageSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  columns?: number;
  sectionsOrder?: string[];
  includeTableOfContents?: boolean;
  includePageNumbers?: boolean;
}

export interface ExportStyling {
  fontFamily?: string;
  fontSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headerStyle?: 'simple' | 'professional' | 'colorful';
  tableStyle?: 'simple' | 'striped' | 'bordered' | 'minimal';
}

// Comprehensive export data models extending existing analytics

export interface StudentProgressReport extends StudentAnalytics {
  exportMetadata: {
    generatedAt: string;
    generatedBy: string;
    reportPeriod: ExportDateRange;
    teacherComments: string;
    nextSteps: string[];
  };
  parentMeetingData: {
    keyHighlights: string[];
    areasOfConcern: string[];
    homeRecommendations: string[];
    followUpActions: string[];
  };
  visualizations: {
    progressChart: ChartConfig;
    comparisonChart: ChartConfig;
    trendsChart: ChartConfig;
  };
}

export interface ClassDataBackup {
  classInfo: {
    id: string;
    name: string;
    teacherName: string;
    schoolName: string;
    term: string;
    studentCount: number;
  };
  exportMetadata: {
    exportedAt: string;
    exportedBy: string;
    dataRange: ExportDateRange;
    includesFields: string[];
  };
  students: StudentBackupData[];
  assignments: AssignmentBackupData[];
  analytics: ClassAnalytics;
  teacherNotes: {
    classNotes: string;
    studentSpecificNotes: { studentId: string; notes: string }[];
  };
}

export interface StudentBackupData {
  studentInfo: {
    id: string;
    username: string;
    studentName: string;
    enrollmentDate: string;
    lastActivity: string | null;
  };
  academicData: {
    overallScore: number;
    completionRate: number;
    totalTimeSpent: number;
    assignmentsCompleted: number;
    currentStatus: string;
  };
  progressRecords: {
    assignmentId: string;
    assignmentTitle: string;
    status: string;
    score: number | null;
    timeSpent: number;
    completedAt: string | null;
    attempts: number;
  }[];
  feedbackHistory: {
    feedbackId: string;
    feedbackType: string;
    message: string;
    isPositive: boolean;
    createdAt: string;
    teacherResponse?: string;
  }[];
}

export interface AssignmentBackupData {
  assignmentInfo: {
    id: string;
    title: string;
    assignmentType: string;
    description: string;
    createdAt: string;
    dueDate: string | null;
  };
  analytics: AssignmentAnalytics;
  configuration: {
    allowRetries: boolean;
    showCorrectAnswers: boolean;
    timeLimit: number | null;
    estimatedDuration: number | null;
  };
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  showLegend?: boolean;
}

export interface BulkExportRequest {
  exportType: string;
  format: string;
  targets: {
    studentIds?: string[];
    classIds?: string[];
    assignmentIds?: string[];
  };
  filters: ExportFilterCriteria;
  customization: ExportCustomization;
  templateId?: string;
  generateSeparateFiles?: boolean; // if true, creates one file per student/class
  emailResults?: boolean;
  emailAddresses?: string[];
}

export interface ExportProgress {
  jobId: string;
  status: string;
  progress: number;
  currentPhase: string;
  estimatedTimeRemaining?: number; // seconds
  recordsProcessed: number;
  totalRecords: number;
  message?: string;
}

export interface ExportSummary {
  jobId: string;
  title: string;
  exportType: string;
  format: string;
  status: string;
  recordCount: number;
  fileSize: number;
  downloadUrl?: string;
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
}

// Zod schemas for export system
export const insertExportJobSchema = createInsertSchema(exportJobs).omit({
  id: true,
  status: true,
  progress: true,
  processingStartedAt: true,
  processingCompletedAt: true,
  outputPath: true,
  fileSize: true,
  downloadCount: true,
  actualRecords: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExportTemplateSchema = createInsertSchema(exportTemplates).omit({
  id: true,
  usageCount: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExportHistorySchema = createInsertSchema(exportHistory).omit({
  id: true,
  timestamp: true,
});

// Export type definitions
export type ExportJob = typeof exportJobs.$inferSelect;
export type InsertExportJob = z.infer<typeof insertExportJobSchema>;
export type ExportTemplate = typeof exportTemplates.$inferSelect;
export type InsertExportTemplate = z.infer<typeof insertExportTemplateSchema>;
export type ExportHistoryEntry = typeof exportHistory.$inferSelect;
export type InsertExportHistoryEntry = z.infer<typeof insertExportHistorySchema>;

// Student progress tracking table
export const studentProgress = pgTable("student_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").notNull(), // identifies which lesson/activity
  activityType: activityTypeEnum("activity_type").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  timeSpent: integer("time_spent").notNull(), // time in seconds
  completedAt: timestamp("completed_at").defaultNow(),
  metadata: jsonb("metadata").$type<ProgressMetadata>().default({}), // extra data like attempts, difficulty level etc.
}, (table) => ({
  studentIdx: index("progress_tracking_student_idx").on(table.studentId),
  lessonIdx: index("progress_tracking_lesson_idx").on(table.lessonId),
  activityTypeIdx: index("progress_tracking_activity_type_idx").on(table.activityType),
  completedAtIdx: index("progress_tracking_completed_at_idx").on(table.completedAt),
}));

// Student activity logging table  
export const studentActivity = pgTable("student_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  type: studentActivityTypeEnum("type").notNull(),
  payload: jsonb("payload").$type<ActivityPayload>().default({}), // extra data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  studentIdx: index("student_activity_student_idx").on(table.studentId),
  typeIdx: index("student_activity_type_idx").on(table.type),
  createdAtIdx: index("student_activity_created_at_idx").on(table.createdAt),
}));

// Metadata interfaces for the progress tracking
export interface ProgressMetadata {
  attempts?: number;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  hintsUsed?: number;
  completionType?: 'full' | 'partial' | 'skip';
  errorCount?: number;
  toolsUsed?: string[];
  sessionData?: {
    startedAt?: string;
    pausedTimes?: number;
    deviceType?: string;
  };
}

export interface ActivityPayload {
  lessonId?: string;
  lessonTitle?: string;
  questionId?: string;
  answer?: any;
  score?: number;
  timeSpent?: number;
  sessionId?: string;
  deviceInfo?: {
    type?: string;
    browser?: string;
    screenSize?: string;
  };
  location?: {
    page?: string;
    component?: string;
  };
}

// Insert schemas for new tables
export const insertStudentProgressSchema = createInsertSchema(studentProgress).omit({
  id: true,
  completedAt: true,
});

export const insertStudentActivitySchema = createInsertSchema(studentActivity).omit({
  id: true,
  createdAt: true,
});

// Types for new tables
export type StudentProgress = typeof studentProgress.$inferSelect;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentActivity = typeof studentActivity.$inferSelect;
export type InsertStudentActivity = z.infer<typeof insertStudentActivitySchema>;

// =============================================================================
// NEW LESSON TEMPLATES & SHOP SYSTEM
// =============================================================================

// Lesson categories for organizing templates and lessons
export const lessonCategories = pgTable("lesson_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(), // e.g. "Ordklasser", "Grammatik"
  swedishName: varchar("swedish_name", { length: 255 }).notNull(), // Swedish display name
  description: text("description"),
  color: varchar("color", { length: 20 }).default('#3B82F6'), // Hex color for UI
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  parentId: varchar("parent_id"), // Self-referencing for subcategories
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("lesson_categories_name_idx").on(table.name),
  sortIdx: index("lesson_categories_sort_idx").on(table.sortOrder),
  parentIdx: index("lesson_categories_parent_idx").on(table.parentId),
}));

// Lesson templates - Admin creates these as base templates for teachers
export const lessonTemplates = pgTable("lesson_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: varchar("category_id").notNull().references(() => lessonCategories.id),
  difficulty: varchar("difficulty").default("medium"), // easy, medium, hard
  estimatedDuration: integer("estimated_duration"), // minutes
  
  // Template structure and content
  templateData: jsonb("template_data").$type<LessonTemplateData>().notNull(),
  
  // Teacher guidance and preview content  
  teacherGuide: jsonb("teacher_guide").$type<TeacherGuideContent>().notNull(),
  previewImages: jsonb("preview_images").$type<string[]>().default([]),
  
  // Reward settings (how much money student earns)
  rewardCoins: integer("reward_coins").default(50),
  bonusCoins: integer("bonus_coins").default(10), // extra for perfect score
  
  // Template settings
  isPublished: boolean("is_published").default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  tags: jsonb("tags").$type<string[]>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("lesson_templates_category_idx").on(table.categoryId),
  createdByIdx: index("lesson_templates_created_by_idx").on(table.createdBy),
  publishedIdx: index("lesson_templates_published_idx").on(table.isPublished),
}));

// Teacher lesson customizations - Teachers customize templates
export const teacherLessonCustomizations = pgTable("teacher_lesson_customizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: varchar("template_id").notNull().references(() => lessonTemplates.id, { onDelete: 'cascade' }),
  
  // Customization settings
  title: varchar("title", { length: 255 }), // override template title
  customInstructions: text("custom_instructions"),
  enabledComponents: jsonb("enabled_components").$type<string[]>(), // which parts are enabled
  customSettings: jsonb("custom_settings").$type<Record<string, any>>().default({}),
  
  // Publishing status
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  teacherTemplateIdx: uniqueIndex("teacher_lesson_customizations_idx").on(table.teacherId, table.templateId),
  teacherIdx: index("teacher_customizations_teacher_idx").on(table.teacherId),
}));

// Student currency system
export const studentCurrency = pgTable("student_currency", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  currentCoins: integer("current_coins").default(0),
  totalEarned: integer("total_earned").default(0),
  totalSpent: integer("total_spent").default(0),
  lastEarned: timestamp("last_earned"),
  lastSpent: timestamp("last_spent"),
  // Level and experience system
  level: integer("level").default(1),
  experience: integer("experience").default(0),
  experienceToNext: integer("experience_to_next").default(100),
  // Streak tracking
  streak: integer("streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentCurrencyIdx: uniqueIndex("student_currency_idx").on(table.studentId),
}));

// Shop items that students can purchase
export const shopItems = pgTable("shop_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // 'avatar', 'room', 'theme'
  subcategory: varchar("subcategory", { length: 100 }), // 'hair', 'clothes', 'furniture', etc.
  
  price: integer("price").notNull(),
  rarity: varchar("rarity").default("common"), // common, rare, epic, legendary
  
  // Item visual data
  iconUrl: varchar("icon_url"), // URL to item icon
  previewUrl: varchar("preview_url"), // URL to preview image
  itemData: jsonb("item_data").$type<ShopItemData>().notNull(),
  
  // Availability
  isAvailable: boolean("is_available").default(true),
  isPremium: boolean("is_premium").default(false),
  requiresLevel: integer("requires_level").default(1),
  
  // Metadata
  sortOrder: integer("sort_order").default(0),
  tags: jsonb("tags").$type<string[]>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("shop_items_category_idx").on(table.category),
  priceIdx: index("shop_items_price_idx").on(table.price),
  availableIdx: index("shop_items_available_idx").on(table.isAvailable),
}));

// Student purchases
export const studentPurchases = pgTable("student_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  itemId: varchar("item_id").notNull().references(() => shopItems.id, { onDelete: 'cascade' }),
  pricePaid: integer("price_paid").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
}, (table) => ({
  studentPurchaseIdx: uniqueIndex("student_purchases_idx").on(table.studentId, table.itemId),
  studentIdx: index("student_purchases_student_idx").on(table.studentId),
  purchasedAtIdx: index("student_purchases_date_idx").on(table.purchasedAt),
}));

// Student avatar customization
export const studentAvatars = pgTable("student_avatars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  
  // Avatar configuration
  avatarData: jsonb("avatar_data").$type<AvatarConfiguration>().notNull().default({
    hair: { style: "default", color: "brown" },
    face: { eyes: "default", expression: "neutral" },
    clothing: {
      top: "default",
      bottom: "default",
      shoes: "default",
      accessories: []
    },
    colors: {
      skinTone: "medium",
      hairColor: "brown",
      eyeColor: "brown"
    }
  }),
  currentOutfit: varchar("current_outfit"), // current outfit/combination ID
  savedOutfits: jsonb("saved_outfits").$type<SavedOutfit[]>().default([]),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentAvatarIdx: uniqueIndex("student_avatars_idx").on(table.studentId),
}));

// Student room decorations
export const studentRooms = pgTable("student_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  
  // Room configuration
  roomData: jsonb("room_data").$type<RoomConfiguration>().notNull().default({
    furniture: [],
    decorations: [],
    lighting: [],
    background: {
      wallColor: "#f0f0f0",
      floorColor: "#d4b896"
    }
  }),
  currentTheme: varchar("current_theme").default("default"),
  roomLayout: varchar("room_layout").default("standard"), // different room layouts
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  studentRoomIdx: uniqueIndex("student_rooms_idx").on(table.studentId),
}));

// Hand raising system for classroom interaction
export const handRaisings = pgTable("hand_raisings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  classId: varchar("class_id").notNull().references(() => teacherClasses.id, { onDelete: 'cascade' }),
  
  // Hand raising details
  question: text("question"), // optional question from student
  priority: varchar("priority").default("normal"), // normal, urgent
  status: varchar("status").default("raised"), // raised, acknowledged, resolved
  
  // Teacher response
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  teacherNotes: text("teacher_notes"),
  
  raisedAt: timestamp("raised_at").defaultNow(),
}, (table) => ({
  classStatusIdx: index("hand_raisings_class_status_idx").on(table.classId, table.status),
  studentIdx: index("hand_raisings_student_idx").on(table.studentId),
  raisedAtIdx: index("hand_raisings_raised_at_idx").on(table.raisedAt),
}));

// Currency transactions log
export const currencyTransactions = pgTable("currency_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => studentAccounts.id, { onDelete: 'cascade' }),
  
  type: varchar("type").notNull(), // 'earned', 'spent', 'bonus', 'admin_adjustment'
  amount: integer("amount").notNull(), // positive for earning, negative for spending
  description: varchar("description", { length: 255 }).notNull(),
  
  // Context
  sourceType: varchar("source_type"), // 'lesson_completion', 'shop_purchase', 'admin', etc.
  sourceId: varchar("source_id"), // ID of lesson, item, etc.
  
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  studentIdx: index("currency_transactions_student_idx").on(table.studentId),
  typeIdx: index("currency_transactions_type_idx").on(table.type),
  createdAtIdx: index("currency_transactions_date_idx").on(table.createdAt),
}));

// =============================================================================  
// BLOG/LESSON MATERIALS SYSTEM
// =============================================================================

// Blog posts/lesson materials for public content
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  excerpt: text("excerpt"), // Short description for previews
  content: text("content").notNull(), // Full text content

  // Featured image and downloadable file
  heroImageUrl: varchar("hero_image_url"),
  downloadFileUrl: varchar("download_file_url"),
  downloadFileName: varchar("download_file_name"),
  downloadFileType: varchar("download_file_type"), // pdf, pptx, docx, etc.

  // Categorization and metadata - SEO optimized
  // category: blogCategoryEnum("category").default('allmant'), // Main SEO category - TEMP DISABLED until migration
  categoryId: varchar("category_id").references(() => lessonCategories.id), // Legacy reference
  tags: jsonb("tags").$type<string[]>().default([]),

  // SEO and social sharing
  // metaTitle: varchar("meta_title", { length: 60 }), // Custom SEO title (max 60 chars) - TEMP DISABLED until migration
  metaDescription: text("meta_description"), // Custom SEO description (max 160 chars) - THIS ONE EXISTS IN DB
  // keywords: jsonb("keywords").$type<string[]>().default([]), // SEO keywords - TEMP DISABLED until migration
  // focusKeyphrase: varchar("focus_keyphrase", { length: 100 }), // Primary SEO keyword - TEMP DISABLED until migration
  // socialImageUrl: varchar("social_image_url"), // TEMP DISABLED until migration
  // relatedLessonIds: jsonb("related_lesson_ids").$type<string[]>().default([]), // For internal linking - TEMP DISABLED until migration
  
  // Publishing
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  
  // Author info (for future multi-author support)
  authorName: varchar("author_name").default("Ordflyt Team"),
  authorId: varchar("author_id").references(() => users.id),
  
  // Analytics
  viewCount: integer("view_count").default(0),
  downloadCount: integer("download_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("blog_posts_slug_idx").on(table.slug),
  categoryIdx: index("blog_posts_category_idx").on(table.categoryId),
  publishedIdx: index("blog_posts_published_idx").on(table.isPublished, table.publishedAt),
  authorIdx: index("blog_posts_author_idx").on(table.authorId),
}));

// Newsletter subscriptions for lesson material updates
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }), // Optional name
  
  // Subscription preferences
  isActive: boolean("is_active").default(true),
  frequency: varchar("frequency").default("weekly"), // weekly, monthly
  categories: jsonb("categories").$type<string[]>().default([]), // Subscribe to specific categories
  
  // Subscription metadata
  source: varchar("source").default("website"), // website, referral, etc.
  confirmationToken: varchar("confirmation_token"),
  confirmedAt: timestamp("confirmed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  
  // Analytics
  totalEmailsSent: integer("total_emails_sent").default(0),
  lastEmailSent: timestamp("last_email_sent"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("newsletter_subscriptions_email_idx").on(table.email),
  activeIdx: index("newsletter_subscriptions_active_idx").on(table.isActive),
  confirmedIdx: index("newsletter_subscriptions_confirmed_idx").on(table.confirmedAt),
}));

// Interface definitions for JSONB fields
export interface LessonTemplateData {
  components: LessonComponent[];
  settings: LessonSettings;
  structure: LessonStructure;
}

export interface LessonComponent {
  id: string;
  type: 'instruction' | 'exercise' | 'quiz' | 'reading' | 'practice';
  title: string;
  content: any;
  isRequired: boolean;
  estimatedMinutes: number;
  canDisable: boolean;
}

export interface LessonSettings {
  allowSkip: boolean;
  showProgress: boolean;
  timeLimit?: number;
  attemptsAllowed: number;
  minPassScore: number;
}

export interface LessonStructure {
  introduction: string;
  objectives: string[];
  prerequisites: string[];
  conclusion: string;
}

export interface TeacherGuideContent {
  overview: string;
  objectives: string[];
  preparation: string[];
  tips: string[];
  expectedDuration: number;
  troubleshooting: string[];
  extensions: string[];
  assessment: string;
}

export interface ShopItemData {
  // For avatar items
  avatarConfig?: {
    category: string; // 'hair', 'clothes', 'accessories'
    style: string;
    colors: string[];
    layerOrder: number;
  };
  // For room items
  roomConfig?: {
    type: string; // 'furniture', 'decoration', 'lighting'
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex: number;
  };
  // For themes
  themeConfig?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundUrl?: string;
    fontStyle?: string;
  };
}

export interface AvatarConfiguration {
  hair: { style: string; color: string };
  face: { eyes: string; expression: string };
  clothing: {
    top: string;
    bottom: string;
    shoes: string;
    accessories: string[];
  };
  colors: {
    skinTone: string;
    hairColor: string;
    eyeColor: string;
  };
}

export interface SavedOutfit {
  id: string;
  name: string;
  config: AvatarConfiguration;
  createdAt: string;
}

export interface RoomConfiguration {
  furniture: PlacedItem[];
  decorations: PlacedItem[];
  lighting: PlacedItem[];
  background: {
    wallColor: string;
    floorColor: string;
    wallTexture?: string;
    floorTexture?: string;
  };
}

export interface PlacedItem {
  itemId: string;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
}

// Insert schemas for new tables
export const insertLessonCategorySchema = createInsertSchema(lessonCategories).omit({
  id: true,
  createdAt: true,
});

export const insertLessonTemplateSchema = createInsertSchema(lessonTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeacherLessonCustomizationSchema = createInsertSchema(teacherLessonCustomizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentCurrencySchema = createInsertSchema(studentCurrency).omit({
  id: true,
  updatedAt: true,
});

export const insertShopItemSchema = createInsertSchema(shopItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentPurchaseSchema = createInsertSchema(studentPurchases).omit({
  id: true,
  purchasedAt: true,
});

export const insertStudentAvatarSchema = createInsertSchema(studentAvatars).omit({
  id: true,
  updatedAt: true,
});

export const insertStudentRoomSchema = createInsertSchema(studentRooms).omit({
  id: true,
  updatedAt: true,
});

export const insertHandRaisingSchema = createInsertSchema(handRaisings).omit({
  id: true,
  raisedAt: true,
});

export const insertCurrencyTransactionSchema = createInsertSchema(currencyTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  downloadCount: true,
  publishedAt: true,
  slug: true, // Auto-generated from title
  authorId: true, // Auto-set from session
  authorName: true, // Auto-set from session
});

export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalEmailsSent: true,
  lastEmailSent: true,
});

// Types for new tables
export type LessonCategory = typeof lessonCategories.$inferSelect;
export type InsertLessonCategory = z.infer<typeof insertLessonCategorySchema>;
export type LessonTemplate = typeof lessonTemplates.$inferSelect;
export type InsertLessonTemplate = z.infer<typeof insertLessonTemplateSchema>;
export type TeacherLessonCustomization = typeof teacherLessonCustomizations.$inferSelect;
export type InsertTeacherLessonCustomization = z.infer<typeof insertTeacherLessonCustomizationSchema>;
export type StudentCurrency = typeof studentCurrency.$inferSelect;
export type InsertStudentCurrency = z.infer<typeof insertStudentCurrencySchema>;
export type ShopItem = typeof shopItems.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type StudentPurchase = typeof studentPurchases.$inferSelect;
export type InsertStudentPurchase = z.infer<typeof insertStudentPurchaseSchema>;
export type StudentAvatar = typeof studentAvatars.$inferSelect;
export type InsertStudentAvatar = z.infer<typeof insertStudentAvatarSchema>;
export type StudentRoom = typeof studentRooms.$inferSelect;
export type InsertStudentRoom = z.infer<typeof insertStudentRoomSchema>;
export type HandRaising = typeof handRaisings.$inferSelect;
export type InsertHandRaising = z.infer<typeof insertHandRaisingSchema>;
export type CurrencyTransaction = typeof currencyTransactions.$inferSelect;
export type InsertCurrencyTransaction = z.infer<typeof insertCurrencyTransactionSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;

// Vocabulary stats types for efficient bulk fetching
export interface VocabularySetStats {
  setId: string;
  wordCount: number;
  exerciseCount: number;
}

// Response schema for vocabulary stats endpoint
export const vocabularyStatsResponseSchema = z.array(z.object({
  setId: z.string(),
  wordCount: z.number().int().min(0),
  exerciseCount: z.number().int().min(0)
}));

export type VocabularyStatsResponse = z.infer<typeof vocabularyStatsResponseSchema>;
