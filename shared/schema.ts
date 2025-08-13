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
  difficulty: integer("difficulty").notNull().default(1), // 1-5 difficulty within the word class
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
