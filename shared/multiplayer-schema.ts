import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { pgTable, text, integer, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

// Game Room Schema
export const gameRooms = pgTable('game_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // 6-digit room code
  name: text('name').notNull(),
  hostId: text('host_id').notNull(),
  status: text('status').$type<'waiting' | 'playing' | 'finished'>().notNull().default('waiting'),
  currentQuestion: integer('current_question').notNull().default(0),
  questions: jsonb('questions').$type<GameQuestion[]>().notNull().default([]),
  settings: jsonb('settings').$type<GameSettings>().notNull().default({
    questionTime: 20,
    showAnswers: true,
    allowLateJoin: false
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Game Participants Schema
export const gameParticipants = pgTable('game_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => gameRooms.id, { onDelete: 'cascade' }),
  nickname: text('nickname').notNull(),
  score: integer('score').notNull().default(0),
  isHost: boolean('is_host').notNull().default(false),
  isConnected: boolean('is_connected').notNull().default(true),
  joinedAt: timestamp('joined_at').notNull().defaultNow()
});

// Game Answers Schema
export const gameAnswers = pgTable('game_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => gameRooms.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id').notNull().references(() => gameParticipants.id, { onDelete: 'cascade' }),
  questionIndex: integer('question_index').notNull(),
  answer: text('answer').notNull(),
  timeUsed: integer('time_used').notNull(), // seconds
  isCorrect: boolean('is_correct').notNull(),
  points: integer('points').notNull().default(0),
  answeredAt: timestamp('answered_at').notNull().defaultNow()
});

// Types
export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  explanation?: string;
}

export interface GameSettings {
  questionTime: number; // seconds
  showAnswers: boolean;
  allowLateJoin: boolean;
}

export interface PlayerStats {
  nickname: string;
  score: number;
  correctAnswers: number;
  averageTime: number;
  streak: number;
}

// Zod Schemas
export const insertGameRoomSchema = createInsertSchema(gameRooms);
export const insertGameParticipantSchema = createInsertSchema(gameParticipants);
export const insertGameAnswerSchema = createInsertSchema(gameAnswers);

export type GameRoom = typeof gameRooms.$inferSelect;
export type GameParticipant = typeof gameParticipants.$inferSelect;
export type GameAnswer = typeof gameAnswers.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type InsertGameParticipant = z.infer<typeof insertGameParticipantSchema>;
export type InsertGameAnswer = z.infer<typeof insertGameAnswerSchema>;

// WebSocket message types
export interface WebSocketMessage {
  type: 'join' | 'leave' | 'answer' | 'next_question' | 'game_start' | 'game_end' | 'player_update';
  roomCode?: string;
  data?: any;
}

export interface GameState {
  room: GameRoom;
  participants: GameParticipant[];
  currentQuestion?: GameQuestion;
  timeRemaining?: number;
  showResults?: boolean;
  leaderboard?: PlayerStats[];
}