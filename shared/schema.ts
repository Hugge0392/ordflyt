import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, pgEnum, boolean, uniqueIndex, index, check } from "drizzle-orm/pg-core";
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
  userIdIdx: uniqueIndex("user_sessions_idx").on(table.userId),
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
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
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
  mustChangePassword: boolean("must_change_password").default(true),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

// Insert schemas for license system
export const insertOneTimeCodeSchema = createInsertSchema(oneTimeCodes).omit({
  id: true,
  createdAt: true,
});

export const insertTeacherLicenseSchema = createInsertSchema(teacherLicenses).omit({
  id: true,
  createdAt: true,
});

export const insertTeacherClassSchema = createInsertSchema(teacherClasses).omit({
  id: true,
  createdAt: true,
});

export const insertStudentAccountSchema = createInsertSchema(studentAccounts).omit({
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
export type TeacherClass = typeof teacherClasses.$inferSelect;
export type InsertTeacherClass = z.infer<typeof insertTeacherClassSchema>;
export type StudentAccount = typeof studentAccounts.$inferSelect;
export type InsertStudentAccount = z.infer<typeof insertStudentAccountSchema>;
export type LicenseLog = typeof licenseLog.$inferSelect;
export type InsertLicenseLog = z.infer<typeof insertLicenseLogSchema>;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = z.infer<typeof insertAuditLogSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

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
