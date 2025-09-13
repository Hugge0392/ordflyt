import {
  type WordClass,
  type Sentence,
  type GameProgress,
  type ErrorReport,
  type PublishedLesson,
  type LessonDraft,
  type ReadingLesson,
  type Word,
  type InsertSentence,
  type InsertWordClass,
  type InsertGameProgress,
  type InsertErrorReport,
  type InsertPublishedLesson,
  type InsertLessonDraft,
  type InsertReadingLesson,
  type KlassKampGame,
  type KlassKampPlayer,
  type KlassKampAnswer,
  type InsertKlassKampGame,
  type InsertKlassKampPlayer,
  type InsertKlassKampAnswer,
  type PreReadingQuestion,
  type ReadingQuestion,
  type WordDefinition,
  type LegacyPage,
  type RichPage,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import { wordClasses, sentences, gameProgresses, errorReports, publishedLessons, lessonDrafts, readingLessons, klassKampGames, klassKampPlayers, klassKampAnswers } from "@shared/schema";

export interface IStorage {
  getWordClasses(): Promise<WordClass[]>;
  getSentences(): Promise<Sentence[]>;
  getSentencesByLevel(level: number): Promise<Sentence[]>;
  getSentencesByWordClassAndLevel(
    wordClass: string,
    level: number,
  ): Promise<Sentence[]>;
  getGameProgress(): Promise<GameProgress>;
  updateGameProgress(progress: Partial<GameProgress>): Promise<GameProgress>;
  resetGameProgress(): Promise<GameProgress>;

  // Admin methods
  createSentence(sentence: InsertSentence): Promise<Sentence>;
  updateSentence(
    id: string,
    sentence: Partial<InsertSentence>,
  ): Promise<Sentence>;
  deleteSentence(id: string): Promise<void>;
  getSentenceById(id: string): Promise<Sentence | undefined>;

  // Error report methods
  createErrorReport(report: InsertErrorReport): Promise<ErrorReport>;
  getErrorReports(): Promise<ErrorReport[]>;
  updateErrorReport(id: string, report: Partial<ErrorReport>): Promise<ErrorReport>;
  deleteErrorReport(id: string): Promise<void>;

  // Published lesson methods
  createPublishedLesson(lesson: InsertPublishedLesson): Promise<PublishedLesson>;
  getPublishedLessons(): Promise<PublishedLesson[]>;
  getPublishedLesson(id: string): Promise<PublishedLesson | undefined>;
  getPublishedLessonsByWordClass(wordClass: string): Promise<PublishedLesson[]>;
  updatePublishedLesson(id: string, lesson: Partial<InsertPublishedLesson>): Promise<PublishedLesson>;
  deletePublishedLesson(id: string): Promise<void>;

  // Draft lesson methods
  createLessonDraft(draft: InsertLessonDraft): Promise<LessonDraft>;
  getLessonDrafts(): Promise<LessonDraft[]>;
  getLessonDraft(id: string): Promise<LessonDraft | undefined>;
  updateLessonDraft(id: string, draft: Partial<InsertLessonDraft>): Promise<LessonDraft>;
  deleteLessonDraft(id: string): Promise<void>;

  // Reading lesson methods
  createReadingLesson(lesson: InsertReadingLesson): Promise<ReadingLesson>;
  getReadingLessons(): Promise<ReadingLesson[]>;
  getReadingLesson(id: string): Promise<ReadingLesson | undefined>;
  getReadingLessonById(id: string): Promise<ReadingLesson | undefined>;
  updateReadingLesson(id: string, lesson: Partial<InsertReadingLesson>): Promise<ReadingLesson>;
  deleteReadingLesson(id: string): Promise<void>;
  getPublishedReadingLessons(): Promise<ReadingLesson[]>;
  
  // Migration methods
  getUnmigratedReadingLessons(): Promise<ReadingLesson[]>;
  getMigratedReadingLessons(): Promise<ReadingLesson[]>;
  getMigrationStatistics(): Promise<{
    total: number;
    migrated: number;
    unmigrated: number;
  }>;

  // KlassKamp methods
  createKlassKampGame(game: InsertKlassKampGame): Promise<KlassKampGame>;
  getKlassKampGameByCode(code: string): Promise<KlassKampGame | undefined>;
  updateKlassKampGame(id: string, game: Partial<InsertKlassKampGame>): Promise<KlassKampGame>;
  addKlassKampPlayer(player: InsertKlassKampPlayer): Promise<KlassKampPlayer>;
  getKlassKampPlayers(gameId: string): Promise<KlassKampPlayer[]>;
  updateKlassKampPlayer(id: string, player: Partial<InsertKlassKampPlayer>): Promise<KlassKampPlayer>;
  addKlassKampAnswer(answer: InsertKlassKampAnswer): Promise<KlassKampAnswer>;
  getSentencesByWordClass(wordClassId: string): Promise<Sentence[]>;
}

export class MemStorage implements IStorage {
  private wordClasses: Map<string, WordClass> = new Map();
  private sentences: Map<string, Sentence> = new Map();
  private gameProgress: GameProgress;
  private errorReports: Map<string, ErrorReport> = new Map();
  private publishedLessons: Map<string, PublishedLesson> = new Map();
  private lessonDrafts: Map<string, LessonDraft> = new Map();
  private readingLessons: Map<string, ReadingLesson> = new Map();
  private klassKampGames: Map<string, KlassKampGame> = new Map();
  private klassKampPlayers: Map<string, KlassKampPlayer> = new Map();
  private klassKampAnswers: Map<string, KlassKampAnswer> = new Map();

  constructor() {
    this.gameProgress = this.createEmptyProgress();
    this.initializeData();
  }

  private createEmptyProgress(): GameProgress {
    return {
      id: randomUUID(),
      score: 0,
      level: 1,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentSentenceIndex: 0,
      completedSentences: [],
      completedLevels: {},
      correctAnswersByWordClass: {},
    };
  }

  private initializeData() {
    const wordClassesData: Omit<WordClass, "id">[] = [
      {
        name: "noun",
        swedishName: "Substantiv",
        description: "ting, namn, personer",
        color: "#10B981",
      },
      {
        name: "verb",
        swedishName: "Verb",
        description: "handlingsord",
        color: "#4F46E5",
      },
      {
        name: "adjective",
        swedishName: "Adjektiv",
        description: "beskrivande ord",
        color: "#F59E0B",
      },
      {
        name: "adverb",
        swedishName: "Adverb",
        description: "beskriver verb",
        color: "#8B5CF6",
      },
      {
        name: "pronoun",
        swedishName: "Pronomen",
        description: "jag, du, han",
        color: "#EC4899",
      },
      {
        name: "preposition",
        swedishName: "Preposition",
        description: "till, från, på",
        color: "#6B7280",
      },
      {
        name: "conjunction",
        swedishName: "Konjunktion",
        description: "och, men, eller",
        color: "#EF4444",
      },
      {
        name: "interjection",
        swedishName: "Interjektion",
        description: "oj, ah, hej",
        color: "#F97316",
      },
      {
        name: "numeral",
        swedishName: "Räkneord",
        description: "ett, två, första",
        color: "#06B6D4",
      },
    ];

    for (const data of wordClassesData) {
      this.wordClasses.set(randomUUID(), { ...data, id: randomUUID() });
    }

    // TODO: Lägg in alla dina sentences här
    const sentencesData: Omit<Sentence, "id">[] = [
  
    ];

    for (const data of sentencesData) {
      this.sentences.set(randomUUID(), { ...data, id: randomUUID() });
    }
  }

  async getWordClasses(): Promise<WordClass[]> {
    return Array.from(this.wordClasses.values());
  }

  async getSentences(): Promise<Sentence[]> {
    return Array.from(this.sentences.values());
  }

  async getSentencesByLevel(level: number): Promise<Sentence[]> {
    return Array.from(this.sentences.values()).filter((s) => s.level === level);
  }

  async getSentencesByWordClassAndLevel(
    wordClass: string,
    level: number,
  ): Promise<Sentence[]> {
    let filtered = Array.from(this.sentences.values()).filter(
      (s) => s.wordClassType === wordClass && s.level === level,
    );
    filtered = this.shuffleArray(filtered);
    if (level === 1) filtered = filtered.slice(0, 10);
    return filtered;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async getGameProgress(): Promise<GameProgress> {
    return { ...this.gameProgress };
  }

  async updateGameProgress(
    progress: Partial<GameProgress>,
  ): Promise<GameProgress> {
    this.gameProgress = { ...this.gameProgress, ...progress };
    return { ...this.gameProgress };
  }

  async resetGameProgress(): Promise<GameProgress> {
    this.gameProgress = this.createEmptyProgress();
    return { ...this.gameProgress };
  }

  // Admin methods for sentences
  async createSentence(sentence: InsertSentence): Promise<Sentence> {
    const id = randomUUID();
    const newSentence: Sentence = { 
      ...sentence, 
      id,
      level: sentence.level || 1,
      wordClassType: sentence.wordClassType || null,
      words: sentence.words as Word[]
    };
    this.sentences.set(id, newSentence);
    return newSentence;
  }

  async updateSentence(id: string, sentence: Partial<InsertSentence>): Promise<Sentence> {
    const existing = this.sentences.get(id);
    if (!existing) throw new Error("Sentence not found");
    const updated: Sentence = { 
      ...existing, 
      ...sentence,
      words: sentence.words ? (sentence.words as Word[]) : existing.words
    };
    this.sentences.set(id, updated);
    return updated;
  }

  async deleteSentence(id: string): Promise<void> {
    this.sentences.delete(id);
  }

  async getSentenceById(id: string): Promise<Sentence | undefined> {
    return this.sentences.get(id);
  }

  // Error report methods
  async createErrorReport(report: InsertErrorReport): Promise<ErrorReport> {
    const id = randomUUID();
    const newReport: ErrorReport = { 
      ...report, 
      id, 
      createdAt: new Date(), 
      reviewedAt: null,
      status: report.status || "pending",
      sentenceId: report.sentenceId || null,
      reportedWord: report.reportedWord || null,
      expectedWordClass: report.expectedWordClass || null,
      actualWordClass: report.actualWordClass || null,
      playerEmail: report.playerEmail || null,
      reviewNotes: report.reviewNotes || null
    };
    this.errorReports.set(id, newReport);
    return newReport;
  }

  async getErrorReports(): Promise<ErrorReport[]> {
    return Array.from(this.errorReports.values());
  }

  async updateErrorReport(id: string, report: Partial<ErrorReport>): Promise<ErrorReport> {
    const existing = this.errorReports.get(id);
    if (!existing) throw new Error("Error report not found");
    const updated = { ...existing, ...report };
    this.errorReports.set(id, updated);
    return updated;
  }

  async deleteErrorReport(id: string): Promise<void> {
    this.errorReports.delete(id);
  }

  // Published lesson methods
  async createPublishedLesson(lesson: InsertPublishedLesson): Promise<PublishedLesson> {
    const id = randomUUID();
    const newLesson: PublishedLesson = { 
      ...lesson, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date(), 
      fileName: null, 
      filePath: null,
      description: lesson.description || null,
      wordClass: lesson.wordClass || null,
      difficulty: lesson.difficulty || "medium",
      background: lesson.background || "beach"
    };
    this.publishedLessons.set(id, newLesson);
    return newLesson;
  }

  async getPublishedLessons(): Promise<PublishedLesson[]> {
    return Array.from(this.publishedLessons.values());
  }

  async getPublishedLesson(id: string): Promise<PublishedLesson | undefined> {
    return this.publishedLessons.get(id);
  }

  async getPublishedLessonsByWordClass(wordClass: string): Promise<PublishedLesson[]> {
    return Array.from(this.publishedLessons.values()).filter(l => l.wordClass === wordClass);
  }

  async updatePublishedLesson(id: string, lesson: Partial<InsertPublishedLesson>): Promise<PublishedLesson> {
    const existing = this.publishedLessons.get(id);
    if (!existing) throw new Error("Published lesson not found");
    const updated = { ...existing, ...lesson, updatedAt: new Date() };
    this.publishedLessons.set(id, updated);
    return updated;
  }

  async deletePublishedLesson(id: string): Promise<void> {
    this.publishedLessons.delete(id);
  }

  // Draft lesson methods
  async createLessonDraft(draft: InsertLessonDraft): Promise<LessonDraft> {
    const id = randomUUID();
    const newDraft: LessonDraft = { 
      ...draft, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date(),
      description: draft.description || null,
      wordClass: draft.wordClass || null,
      difficulty: draft.difficulty || "medium",
      background: draft.background || "beach"
    };
    this.lessonDrafts.set(id, newDraft);
    return newDraft;
  }

  async getLessonDrafts(): Promise<LessonDraft[]> {
    return Array.from(this.lessonDrafts.values());
  }

  async getLessonDraft(id: string): Promise<LessonDraft | undefined> {
    return this.lessonDrafts.get(id);
  }

  async updateLessonDraft(id: string, draft: Partial<InsertLessonDraft>): Promise<LessonDraft> {
    const existing = this.lessonDrafts.get(id);
    if (!existing) throw new Error("Lesson draft not found");
    const updated = { ...existing, ...draft, updatedAt: new Date() };
    this.lessonDrafts.set(id, updated);
    return updated;
  }

  async deleteLessonDraft(id: string): Promise<void> {
    this.lessonDrafts.delete(id);
  }

  // Reading lesson methods
  async createReadingLesson(lesson: InsertReadingLesson): Promise<ReadingLesson> {
    const id = randomUUID();
    const newLesson: ReadingLesson = { 
      ...lesson, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date(),
      description: lesson.description || null,
      subject: lesson.subject || null,
      readingTime: lesson.readingTime || null,
      featuredImage: lesson.featuredImage || null,
      numberOfPages: lesson.numberOfPages ?? 1,
      preReadingQuestions: (lesson.preReadingQuestions || []) as PreReadingQuestion[],
      questions: (lesson.questions || []) as ReadingQuestion[],
      wordDefinitions: (lesson.wordDefinitions || []) as WordDefinition[],
      pages: (lesson.pages || []) as LegacyPage[],
      richPages: (lesson.richPages || []) as RichPage[],
      migrated: lesson.migrated || false,
      isPublished: lesson.isPublished || 0
    };
    this.readingLessons.set(id, newLesson);
    return newLesson;
  }

  async getReadingLessons(): Promise<ReadingLesson[]> {
    return Array.from(this.readingLessons.values());
  }

  async getReadingLesson(id: string): Promise<ReadingLesson | undefined> {
    return this.readingLessons.get(id);
  }

  async getReadingLessonById(id: string): Promise<ReadingLesson | undefined> {
    return this.getReadingLesson(id);
  }

  async updateReadingLesson(id: string, lesson: Partial<InsertReadingLesson>): Promise<ReadingLesson> {
    const existing = this.readingLessons.get(id);
    if (!existing) throw new Error("Reading lesson not found");
    const updated: ReadingLesson = { 
      ...existing, 
      ...lesson, 
      updatedAt: new Date(),
      featuredImage: lesson.featuredImage !== undefined ? lesson.featuredImage : existing.featuredImage,
      preReadingQuestions: (lesson.preReadingQuestions || existing.preReadingQuestions) as PreReadingQuestion[],
      questions: (lesson.questions || existing.questions) as ReadingQuestion[],
      wordDefinitions: (lesson.wordDefinitions || existing.wordDefinitions) as WordDefinition[],
      pages: lesson.pages !== undefined ? (lesson.pages as LegacyPage[]) : existing.pages,
      richPages: lesson.richPages !== undefined ? (lesson.richPages as RichPage[]) : existing.richPages,
      migrated: lesson.migrated !== undefined ? lesson.migrated : existing.migrated
    };
    this.readingLessons.set(id, updated);
    return updated;
  }

  async deleteReadingLesson(id: string): Promise<void> {
    this.readingLessons.delete(id);
  }

  async getPublishedReadingLessons(): Promise<ReadingLesson[]> {
    return Array.from(this.readingLessons.values()).filter(l => l.isPublished === 1);
  }

  // KlassKamp methods
  async createKlassKampGame(game: InsertKlassKampGame): Promise<KlassKampGame> {
    const id = randomUUID();
    const newGame: KlassKampGame = {
      ...game,
      id,
      status: game.status || "waiting",
      wordClassId: game.wordClassId || null,
      currentQuestionIndex: game.currentQuestionIndex || null,
      questionCount: game.questionCount || null,
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null
    };
    this.klassKampGames.set(id, newGame);
    return newGame;
  }

  async getKlassKampGameByCode(code: string): Promise<KlassKampGame | undefined> {
    return Array.from(this.klassKampGames.values()).find(g => g.code === code);
  }

  async updateKlassKampGame(id: string, game: Partial<InsertKlassKampGame>): Promise<KlassKampGame> {
    const existing = this.klassKampGames.get(id);
    if (!existing) throw new Error("KlassKamp game not found");
    const updated = { ...existing, ...game };
    this.klassKampGames.set(id, updated);
    return updated;
  }

  async addKlassKampPlayer(player: InsertKlassKampPlayer): Promise<KlassKampPlayer> {
    const id = randomUUID();
    const newPlayer: KlassKampPlayer = {
      ...player,
      id,
      score: player.score || null,
      correctAnswers: player.correctAnswers || null,
      isConnected: player.isConnected || null,
      joinedAt: new Date()
    };
    this.klassKampPlayers.set(id, newPlayer);
    return newPlayer;
  }

  async getKlassKampPlayers(gameId: string): Promise<KlassKampPlayer[]> {
    return Array.from(this.klassKampPlayers.values()).filter(p => p.gameId === gameId);
  }

  async updateKlassKampPlayer(id: string, player: Partial<InsertKlassKampPlayer>): Promise<KlassKampPlayer> {
    const existing = this.klassKampPlayers.get(id);
    if (!existing) throw new Error("KlassKamp player not found");
    const updated = { ...existing, ...player };
    this.klassKampPlayers.set(id, updated);
    return updated;
  }

  async addKlassKampAnswer(answer: InsertKlassKampAnswer): Promise<KlassKampAnswer> {
    const id = randomUUID();
    const newAnswer: KlassKampAnswer = {
      ...answer,
      id,
      selectedWords: answer.selectedWords ? (answer.selectedWords as string[]) : null,
      points: answer.points || null,
      answeredAt: new Date()
    };
    this.klassKampAnswers.set(id, newAnswer);
    return newAnswer;
  }

  async getSentencesByWordClass(wordClassId: string): Promise<Sentence[]> {
    return Array.from(this.sentences.values()).filter(s => s.wordClassType === wordClassId);
  }

  // Migration methods implementation for MemStorage
  async getUnmigratedReadingLessons(): Promise<ReadingLesson[]> {
    return Array.from(this.readingLessons.values()).filter(lesson => !lesson.migrated);
  }

  async getMigratedReadingLessons(): Promise<ReadingLesson[]> {
    return Array.from(this.readingLessons.values()).filter(lesson => lesson.migrated);
  }

  async getMigrationStatistics(): Promise<{
    total: number;
    migrated: number;
    unmigrated: number;
  }> {
    const allLessons = Array.from(this.readingLessons.values());
    const migrated = allLessons.filter(lesson => lesson.migrated);
    const unmigrated = allLessons.filter(lesson => !lesson.migrated);
    
    return {
      total: allLessons.length,
      migrated: migrated.length,
      unmigrated: unmigrated.length
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getWordClasses(): Promise<WordClass[]> {
    return await db.select().from(wordClasses);
  }

  async getSentences(): Promise<Sentence[]> {
    return await db.select().from(sentences);
  }

  async getSentencesByLevel(level: number): Promise<Sentence[]> {
    return await db.select().from(sentences).where(eq(sentences.level, level));
  }

  async getSentencesByWordClassAndLevel(
    wordClass: string,
    level: number,
  ): Promise<Sentence[]> {
    // For level 3 (and level 4 which uses same sentences as level 3), combine sentences without the target word class AND sentences with multiple instances
    if (level === 3 || level === 4) {
      // Get sentences that DON'T have the target word class
      const sentencesWithoutTarget = await db
        .select()
        .from(sentences)
        .where(and(
          isNull(sentences.wordClassType),
          eq(sentences.level, 3)
        ));
      
      // Filter to only sentences that actually don't contain the target word class
      const filteredWithoutTarget = sentencesWithoutTarget.filter(sentence => {
        const hasTargetWordClass = sentence.words.some(word => 
          !word.isPunctuation && word.wordClass === wordClass
        );
        return !hasTargetWordClass;
      });
      
      // Get sentences with multiple instances of the target word class
      const sentencesWithTarget = await db
        .select()
        .from(sentences)
        .where(and(
          eq(sentences.wordClassType, wordClass),
          eq(sentences.level, 3)
        ));
      
      // Filter to sentences that have multiple instances of the target word class
      const filteredWithMultiple = sentencesWithTarget.filter(sentence => {
        const targetWordCount = sentence.words.filter(word => 
          !word.isPunctuation && word.wordClass === wordClass
        ).length;
        return targetWordCount >= 2;
      });
      
      // Combine both types of sentences
      let result = [...filteredWithoutTarget, ...filteredWithMultiple];
      result = this.shuffleArray(result);
      // Return different amounts based on level
      if (level === 3) {
        return result.slice(0, 10); // 10 questions for level 3
      } else {
        return result.slice(0, 15); // 15 questions for level 4 (final exam)
      }
    }
    
    let result = await db
      .select()
      .from(sentences)
      .where(and(eq(sentences.wordClassType, wordClass), eq(sentences.level, level)));
    result = this.shuffleArray(result);
    
    // Limit sentences per level
    if (level === 1 || level === 2 || level === 3) {
      result = result.slice(0, 10); // 10 questions for levels 1-3
    }
    return result;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async getGameProgress(): Promise<GameProgress> {
    const result = await db.select().from(gameProgresses).limit(1);
    if (!result.length) {
      const newProgress = await db
        .insert(gameProgresses)
        .values({
          score: 0,
          level: 1,
          correctAnswers: 0,
          wrongAnswers: 0,
          currentSentenceIndex: 0,
          completedSentences: [],
          completedLevels: {},
          correctAnswersByWordClass: {},
        })
        .returning();
      return newProgress[0];
    }
    return result[0];
  }

  async updateGameProgress(
    progress: Partial<GameProgress>,
  ): Promise<GameProgress> {
    const current = await this.getGameProgress();
    const updated = await db
      .update(gameProgresses)
      .set(progress)
      .where(eq(gameProgresses.id, current.id))
      .returning();
    return updated[0];
  }

  async resetGameProgress(): Promise<GameProgress> {
    await db.delete(gameProgresses);
    const newProgress = await db
      .insert(gameProgresses)
      .values({
        score: 0,
        level: 1,
        correctAnswers: 0,
        wrongAnswers: 0,
        currentSentenceIndex: 0,
        completedSentences: [],
        completedLevels: {},
        correctAnswersByWordClass: {},
      })
      .returning();
    return newProgress[0];
  }

  async createSentence(sentence: InsertSentence): Promise<Sentence> {
    const sentenceData = {
      ...sentence,
      words: sentence.words as Word[]
    };
    const result = await db.insert(sentences).values(sentenceData).returning();
    return result[0];
  }

  async updateSentence(
    id: string,
    sentence: Partial<InsertSentence>,
  ): Promise<Sentence> {
    const updateData: any = { ...sentence };
    if (sentence.words) {
      updateData.words = sentence.words as Word[];
    }
    const result = await db
      .update(sentences)
      .set(updateData)
      .where(eq(sentences.id, id))
      .returning();
    return result[0];
  }

  async deleteSentence(id: string): Promise<void> {
    await db.delete(sentences).where(eq(sentences.id, id));
  }

  async getSentenceById(id: string): Promise<Sentence | undefined> {
    const result = await db
      .select()
      .from(sentences)
      .where(eq(sentences.id, id));
    return result[0];
  }

  // Error report methods
  async createErrorReport(report: InsertErrorReport): Promise<ErrorReport> {
    const [errorReport] = await db.insert(errorReports).values(report).returning();
    return errorReport;
  }

  async getErrorReports(): Promise<ErrorReport[]> {
    return await db.select().from(errorReports).orderBy(errorReports.createdAt);
  }

  async updateErrorReport(id: string, report: Partial<ErrorReport>): Promise<ErrorReport> {
    const [updatedReport] = await db.update(errorReports)
      .set(report)
      .where(eq(errorReports.id, id))
      .returning();
    return updatedReport;
  }

  async deleteErrorReport(id: string): Promise<void> {
    await db.delete(errorReports).where(eq(errorReports.id, id));
  }

  // Published lesson methods
  async createPublishedLesson(lesson: InsertPublishedLesson): Promise<PublishedLesson> {
    const [newLesson] = await db.insert(publishedLessons).values(lesson).returning();
    return newLesson;
  }

  async getPublishedLessons(): Promise<PublishedLesson[]> {
    return await db.select().from(publishedLessons);
  }

  async getPublishedLesson(id: string): Promise<PublishedLesson | undefined> {
    const result = await db.select().from(publishedLessons).where(eq(publishedLessons.id, id));
    return result[0];
  }

  async getPublishedLessonsByWordClass(wordClass: string): Promise<PublishedLesson[]> {
    return await db.select().from(publishedLessons).where(eq(publishedLessons.wordClass, wordClass));
  }

  async updatePublishedLesson(id: string, lesson: Partial<InsertPublishedLesson>): Promise<PublishedLesson> {
    const [updatedLesson] = await db.update(publishedLessons)
      .set({ ...lesson, updatedAt: new Date() })
      .where(eq(publishedLessons.id, id))
      .returning();
    return updatedLesson;
  }

  async deletePublishedLesson(id: string): Promise<void> {
    await db.delete(publishedLessons).where(eq(publishedLessons.id, id));
  }

  // Helper function to convert timestamp strings to Date objects
  private convertTimestamps(data: any): any {
    const result = { ...data };
    
    // Convert common timestamp fields that might come as strings from frontend
    if (result.createdAt && typeof result.createdAt === 'string') {
      result.createdAt = new Date(result.createdAt);
    }
    if (result.updatedAt && typeof result.updatedAt === 'string') {
      result.updatedAt = new Date(result.updatedAt);
    }
    
    return result;
  }

  // Draft lesson methods
  async createLessonDraft(draft: InsertLessonDraft): Promise<LessonDraft> {
    const draftData = this.convertTimestamps({
      ...draft,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const [newDraft] = await db.insert(lessonDrafts).values(draftData).returning();
    return newDraft;
  }

  async getLessonDrafts(): Promise<LessonDraft[]> {
    return await db.select().from(lessonDrafts).orderBy(lessonDrafts.updatedAt);
  }

  async getLessonDraft(id: string): Promise<LessonDraft | undefined> {
    const [draft] = await db.select().from(lessonDrafts).where(eq(lessonDrafts.id, id));
    return draft;
  }

  async updateLessonDraft(id: string, draft: Partial<InsertLessonDraft>): Promise<LessonDraft> {
    const updateData = this.convertTimestamps({
      ...draft,
      updatedAt: new Date()
    });
    const [updatedDraft] = await db.update(lessonDrafts)
      .set(updateData)
      .where(eq(lessonDrafts.id, id))
      .returning();
    return updatedDraft;
  }

  async deleteLessonDraft(id: string): Promise<void> {
    await db.delete(lessonDrafts).where(eq(lessonDrafts.id, id));
  }

  // Reading lesson methods
  async createReadingLesson(lesson: InsertReadingLesson): Promise<ReadingLesson> {
    const lessonData = {
      ...lesson,
      preReadingQuestions: (lesson.preReadingQuestions || []) as any[],
      questions: (lesson.questions || []) as any[],
      wordDefinitions: (lesson.wordDefinitions || []) as any[],
      pages: (lesson.pages || []) as any[],
      richPages: (lesson.richPages || []) as any[]
    };
    const [newLesson] = await db.insert(readingLessons).values(lessonData).returning();
    return newLesson;
  }

  async getReadingLessons(): Promise<ReadingLesson[]> {
    return await db.select().from(readingLessons).orderBy(readingLessons.updatedAt);
  }

  async getReadingLesson(id: string): Promise<ReadingLesson | undefined> {
    const [lesson] = await db.select().from(readingLessons).where(eq(readingLessons.id, id));
    return lesson;
  }

  async getReadingLessonById(id: string): Promise<ReadingLesson | undefined> {
    return this.getReadingLesson(id);
  }

  async updateReadingLesson(id: string, lesson: Partial<InsertReadingLesson>): Promise<ReadingLesson> {
    console.log('[STORAGE UPDATE] Updating lesson:', {
      id,
      title: lesson.title,
      contentLength: lesson.content?.length || 0,
      pagesCount: lesson.pages?.length || 0,
      hasContent: !!lesson.content
    });

    // Ensure content is preserved - never save empty content unless explicitly requested
    const updateData: any = {
      ...lesson,
      updatedAt: new Date()
    };

    // Only remove content from update if it's specifically undefined (not if it's empty string which might be intentional)
    if (updateData.content === undefined) {
      console.log('[STORAGE UPDATE] Content is undefined, removing from update to preserve existing');
      delete updateData.content;
    } else if (updateData.content === '' && Object.keys(updateData).length > 3) {
      // If this is a bulk update with empty content, preserve existing content
      console.log('[STORAGE UPDATE] WARNING: Bulk update with empty content - preserving existing content');
      delete updateData.content;
    } else if (updateData.content === '') {
      console.log('[STORAGE UPDATE] Content-only update with empty string - allowing overwrite');
    } else if (updateData.content && updateData.content.length > 0) {
      console.log('[STORAGE UPDATE] Saving content with', updateData.content.length, 'characters');
    }

    console.log('[STORAGE UPDATE] Final update data:', {
      fields: Object.keys(updateData),
      contentLength: updateData.content?.length || 'preserved',
      pagesCount: updateData.pages?.length || 0
    });

    const [updatedLesson] = await db.update(readingLessons)
      .set(updateData)
      .where(eq(readingLessons.id, id))
      .returning();
    
    if (!updatedLesson) {
      throw new Error(`Reading lesson with id ${id} not found`);
    }
    
    console.log('[STORAGE UPDATE] Updated lesson result:', {
      id: updatedLesson.id,
      title: updatedLesson.title,
      contentLength: updatedLesson.content?.length || 0,
      pagesCount: updatedLesson.pages?.length || 0
    });
    
    return updatedLesson;
  }

  async deleteReadingLesson(id: string): Promise<void> {
    await db.delete(readingLessons).where(eq(readingLessons.id, id));
  }

  async getPublishedReadingLessons(): Promise<ReadingLesson[]> {
    return await db.select().from(readingLessons).where(eq(readingLessons.isPublished, 1));
  }

  // Migration methods implementation
  async getUnmigratedReadingLessons(): Promise<ReadingLesson[]> {
    return await db.select().from(readingLessons).where(eq(readingLessons.migrated, false));
  }

  async getMigratedReadingLessons(): Promise<ReadingLesson[]> {
    return await db.select().from(readingLessons).where(eq(readingLessons.migrated, true));
  }

  async getMigrationStatistics(): Promise<{
    total: number;
    migrated: number;
    unmigrated: number;
  }> {
    const total = await db.select().from(readingLessons);
    const migrated = await db.select().from(readingLessons).where(eq(readingLessons.migrated, true));
    const unmigrated = await db.select().from(readingLessons).where(eq(readingLessons.migrated, false));
    
    return {
      total: total.length,
      migrated: migrated.length,
      unmigrated: unmigrated.length
    };
  }

  // KlassKamp methods implementation
  async createKlassKampGame(game: InsertKlassKampGame): Promise<KlassKampGame> {
    const [result] = await db.insert(klassKampGames).values(game).returning();
    return result;
  }

  async getKlassKampGameByCode(code: string): Promise<KlassKampGame | undefined> {
    const [result] = await db.select().from(klassKampGames).where(eq(klassKampGames.code, code));
    return result;
  }

  async updateKlassKampGame(id: string, game: Partial<InsertKlassKampGame>): Promise<KlassKampGame> {
    const [result] = await db.update(klassKampGames)
      .set(game)
      .where(eq(klassKampGames.id, id))
      .returning();
    return result;
  }

  async addKlassKampPlayer(player: InsertKlassKampPlayer): Promise<KlassKampPlayer> {
    const [result] = await db.insert(klassKampPlayers).values(player).returning();
    return result;
  }

  async getKlassKampPlayers(gameId: string): Promise<KlassKampPlayer[]> {
    const results = await db.select().from(klassKampPlayers).where(eq(klassKampPlayers.gameId, gameId));
    return results;
  }

  async updateKlassKampPlayer(id: string, player: Partial<InsertKlassKampPlayer>): Promise<KlassKampPlayer> {
    const [result] = await db.update(klassKampPlayers)
      .set(player)
      .where(eq(klassKampPlayers.id, id))
      .returning();
    return result;
  }

  async addKlassKampAnswer(answer: InsertKlassKampAnswer): Promise<KlassKampAnswer> {
    const answerData = {
      ...answer,
      selectedWords: answer.selectedWords ? (answer.selectedWords as string[]) : null
    };
    const [result] = await db.insert(klassKampAnswers).values(answerData).returning();
    return result;
  }

  async getSentencesByWordClass(wordClassId: string): Promise<Sentence[]> {
    const results = await db.select().from(sentences).where(eq(sentences.wordClassType, wordClassId));
    return results;
  }
}

export const storage = new DatabaseStorage();

// Export db for direct access where needed
export { db };
