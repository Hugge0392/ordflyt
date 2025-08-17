import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  reportType: varchar("report_type").notNull(), // 'wrong_word_class', 'missing_word', 'spelling_error', 'other'
  description: text("description").notNull(),
  reportedWord: varchar("reported_word"),
  expectedWordClass: varchar("expected_word_class"),
  actualWordClass: varchar("actual_word_class"),
  playerEmail: varchar("player_email"),
  status: varchar("status").default("pending"), // 'pending', 'reviewed', 'resolved', 'dismissed'
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

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

// Reading comprehension lessons table
export const readingLessons = pgTable("reading_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  content: text("content").notNull(), // The main text content (can include HTML for rich formatting)
  pages: jsonb("pages").$type<{id: string, content: string}[]>().default([]), // For paginated content
  featuredImage: text("featured_image"), // URL to featured/header image
  gradeLevel: varchar("grade_level").notNull(), // e.g. "4-6", "7-9" 
  subject: varchar("subject"), // e.g. "Svenska", "Naturkunskap"
  readingTime: integer("reading_time"), // estimated reading time in minutes
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
  type: "multiple_choice" | "open_ended" | "true_false";
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer?: string | number; // for multiple choice (index) or true/false
  explanation?: string; // optional explanation for the answer
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
