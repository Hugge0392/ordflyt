import {
  type WordClass,
  type Sentence,
  type GameProgress,
  type ErrorReport,
  type PublishedLesson,
  type LessonDraft,
  type VocabularyPublishedLesson,
  type VocabularyLessonDraft,
  type InsertVocabularyPublishedLesson,
  type InsertVocabularyLessonDraft,
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
  type LessonAssignment,
  type InsertLessonAssignment,
  type StudentLessonProgress,
  type InsertStudentLessonProgress,
  type TeacherFeedback,
  type InsertTeacherFeedback,
  type TeacherAnalytics,
  type ClassAnalytics,
  type StudentAnalytics,
  type AssignmentAnalytics,
  type PerformanceComparison,
  type PerformanceComparisonOptions,
  type ProgressTrends,
  type TimeRange,
  type CompletionRateData,
  type TimeSpentAnalytics,
  type StrugglingStudentData,
  type TopPerformerData,
  type ExportJob,
  type InsertExportJob,
  type ExportTemplate,
  type InsertExportTemplate,
  type ExportHistoryEntry,
  type InsertExportHistoryEntry,
  type StudentProgressReport,
  type ClassDataBackup,
  type BulkExportRequest,
  type ExportProgress,
  type ExportSummary,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type StudentProgress,
  type InsertStudentProgress,
  type StudentActivity,
  type InsertStudentActivity,
  type VocabularySet,
  type InsertVocabularySet,
  type VocabularyWord,
  type InsertVocabularyWord,
  type VocabularyExercise,
  type InsertVocabularyExercise,
  type VocabularyAttempt,
  type InsertVocabularyAttempt,
  type VocabularyStreak,
  type InsertVocabularyStreak,
  type FlashcardProgress,
  type InsertFlashcardProgress,
  type FlashcardStreak,
  type InsertFlashcardStreak,
  type FlashcardSession,
  type InsertFlashcardSession,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, isNull, isNotNull, gte, lte, sql, or } from "drizzle-orm";
import { wordClasses, sentences, gameProgresses, errorReports, publishedLessons, lessonDrafts, vocabularyPublishedLessons, vocabularyLessonDrafts, readingLessons, klassKampGames, klassKampPlayers, klassKampAnswers, lessonAssignments, studentLessonProgress, teacherFeedback, exportJobs, exportTemplates, exportHistory, teacherClasses, studentAccounts, users, schools, passwordResetTokens, studentProgress, studentActivity, vocabularySets, vocabularyWords, vocabularyExercises, vocabularyAttempts, flashcardProgress, flashcardStreaks, flashcardSessions } from "@shared/schema";

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

  // Vocabulary published lesson methods
  createVocabularyPublishedLesson(lesson: InsertVocabularyPublishedLesson): Promise<VocabularyPublishedLesson>;
  getVocabularyPublishedLessons(): Promise<VocabularyPublishedLesson[]>;
  getVocabularyPublishedLesson(id: string): Promise<VocabularyPublishedLesson | undefined>;
  getVocabularyPublishedLessonsByCategory(category: string): Promise<VocabularyPublishedLesson[]>;
  updateVocabularyPublishedLesson(id: string, lesson: Partial<InsertVocabularyPublishedLesson>): Promise<VocabularyPublishedLesson>;
  deleteVocabularyPublishedLesson(id: string): Promise<void>;

  // Vocabulary draft lesson methods
  createVocabularyLessonDraft(draft: InsertVocabularyLessonDraft): Promise<VocabularyLessonDraft>;
  getVocabularyLessonDrafts(): Promise<VocabularyLessonDraft[]>;
  getVocabularyLessonDraft(id: string): Promise<VocabularyLessonDraft | undefined>;
  updateVocabularyLessonDraft(id: string, draft: Partial<InsertVocabularyLessonDraft>): Promise<VocabularyLessonDraft>;
  deleteVocabularyLessonDraft(id: string): Promise<void>;

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

  // Lesson assignment methods
  createLessonAssignment(assignment: InsertLessonAssignment): Promise<LessonAssignment>;
  getLessonAssignments(teacherId: string): Promise<LessonAssignment[]>;
  getLessonAssignmentsByClass(classId: string): Promise<LessonAssignment[]>;
  getLessonAssignmentsByStudent(studentId: string): Promise<LessonAssignment[]>;
  getCompletedLessonAssignmentsByStudent(studentId: string): Promise<LessonAssignment[]>;
  getLessonAssignment(id: string): Promise<LessonAssignment | undefined>;
  updateLessonAssignment(id: string, assignment: Partial<InsertLessonAssignment>): Promise<LessonAssignment>;
  deleteLessonAssignment(id: string): Promise<void>;
  getActiveLessonAssignments(teacherId: string): Promise<LessonAssignment[]>;

  // Student progress methods  
  createStudentLessonProgress(progress: InsertStudentLessonProgress): Promise<StudentLessonProgress>;
  getStudentLessonProgress(studentId: string, assignmentId: string): Promise<StudentLessonProgress | undefined>;
  getStudentProgressByAssignment(assignmentId: string): Promise<StudentLessonProgress[]>;
  updateStudentLessonProgress(id: string, progress: Partial<InsertStudentLessonProgress>): Promise<StudentLessonProgress>;
  getClassProgressSummary(classId: string): Promise<{ studentId: string; assignments: { assignmentId: string; status: string; score: number | null; completedAt: Date | null }[] }[]>;

  // Teacher feedback methods
  createTeacherFeedback(feedback: InsertTeacherFeedback): Promise<TeacherFeedback>;
  getTeacherFeedback(teacherId: string): Promise<TeacherFeedback[]>;
  getStudentFeedback(studentId: string): Promise<TeacherFeedback[]>;
  getFeedbackByAssignment(assignmentId: string): Promise<TeacherFeedback[]>;
  getFeedbackByProgress(progressId: string): Promise<TeacherFeedback[]>;
  getTeacherFeedbackById(id: string): Promise<TeacherFeedback | undefined>;
  updateTeacherFeedback(id: string, feedback: Partial<InsertTeacherFeedback>): Promise<TeacherFeedback>;
  deleteTeacherFeedback(id: string): Promise<void>;
  markFeedbackAsRead(id: string, studentId: string): Promise<TeacherFeedback>;
  getFeedbackRequiringFollowUp(teacherId: string): Promise<TeacherFeedback[]>;
  getUnreadFeedbackCount(studentId: string): Promise<number>;

  // Analytics methods
  getTeacherAnalytics(teacherId: string): Promise<TeacherAnalytics>;
  getClassAnalytics(classId: string): Promise<ClassAnalytics>;
  getStudentAnalytics(studentId: string): Promise<StudentAnalytics>;
  getAssignmentAnalytics(assignmentId: string): Promise<AssignmentAnalytics>;
  getPerformanceComparison(teacherId: string, options?: PerformanceComparisonOptions): Promise<PerformanceComparison>;
  getProgressTrends(teacherId: string, timeRange: TimeRange): Promise<ProgressTrends>;
  getCompletionRates(teacherId: string, groupBy: 'class' | 'assignment' | 'student'): Promise<CompletionRateData[]>;
  getTimeSpentAnalytics(teacherId: string): Promise<TimeSpentAnalytics>;
  getStrugglingStudents(teacherId: string): Promise<StrugglingStudentData[]>;
  getTopPerformers(teacherId: string): Promise<TopPerformerData[]>;

  // Export system methods
  createExportJob(job: InsertExportJob): Promise<ExportJob>;
  getExportJob(id: string): Promise<ExportJob | undefined>;
  getExportJobsByTeacher(teacherId: string): Promise<ExportJob[]>;
  getExportJobsBySchool(schoolId: string): Promise<ExportJob[]>;
  updateExportJob(id: string, job: Partial<InsertExportJob>): Promise<ExportJob>;
  deleteExportJob(id: string): Promise<void>;
  getActiveExportJobs(): Promise<ExportJob[]>;
  getExpiredExportJobs(): Promise<ExportJob[]>;

  // Export templates methods
  createExportTemplate(template: InsertExportTemplate): Promise<ExportTemplate>;
  getExportTemplate(id: string): Promise<ExportTemplate | undefined>;
  getExportTemplatesByTeacher(teacherId: string): Promise<ExportTemplate[]>;
  getExportTemplatesBySchool(schoolId: string): Promise<ExportTemplate[]>;
  getPublicExportTemplates(): Promise<ExportTemplate[]>;
  updateExportTemplate(id: string, template: Partial<InsertExportTemplate>): Promise<ExportTemplate>;
  deleteExportTemplate(id: string): Promise<void>;

  // Export history methods
  createExportHistoryEntry(entry: InsertExportHistoryEntry): Promise<ExportHistoryEntry>;
  getExportHistory(jobId: string): Promise<ExportHistoryEntry[]>;
  getExportHistoryByTeacher(teacherId: string): Promise<ExportHistoryEntry[]>;

  // Export data aggregation methods
  generateStudentProgressReport(studentId: string, teacherId: string, dateRange?: { start: string; end: string }): Promise<StudentProgressReport>;
  generateClassDataBackup(classId: string, teacherId: string, includeInactive?: boolean): Promise<ClassDataBackup>;
  getExportableStudentData(studentIds: string[], teacherId: string): Promise<any[]>;
  getExportableClassData(classIds: string[], teacherId: string): Promise<any[]>;
  getExportableAssignmentData(assignmentIds: string[], teacherId: string): Promise<any[]>;

  // Password reset token methods
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  findPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(tokenId: string): Promise<void>;
  cleanupExpiredPasswordResetTokens(): Promise<void>;

  // Student progress tracking methods
  createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress>;
  getStudentProgress(studentId: string): Promise<StudentProgress[]>;
  getStudentProgressByStudentId(studentId: string): Promise<StudentProgress[]>;
  getStudentProgressByLesson(studentId: string, lessonId: string): Promise<StudentProgress[]>;
  getClassProgress(classId: string): Promise<StudentProgress[]>;
  
  // Teacher and class management methods
  getTeacherClasses(teacherId?: string): Promise<any[]>;
  getStudentsByClassId(classId: string): Promise<any[]>;
  
  // Student activity tracking methods
  logStudentActivity(activity: InsertStudentActivity): Promise<StudentActivity>;
  getStudentActivities(studentId: string, limit?: number): Promise<StudentActivity[]>;
  getClassActivities(classId: string, limit?: number): Promise<StudentActivity[]>;
  
  // Analytics methods for progress tracking
  getStudentProgressAnalytics(studentId: string): Promise<{
    totalActivities: number;
    averageScore: number;
    totalTimeSpent: number;
    activityBreakdown: { activityType: string; count: number; averageScore: number }[];
    recentProgress: StudentProgress[];
  }>;
  getClassProgressAnalytics(classId: string): Promise<{
    totalStudents: number;
    averageScore: number;
    totalActivitiesCompleted: number;
    studentBreakdown: { studentId: string; studentName: string; averageScore: number; activitiesCount: number }[];
    activityTypeBreakdown: { activityType: string; count: number; averageScore: number }[];
    recentActivities: StudentActivity[];
  }>;

  // Vocabulary sets methods
  createVocabularySet(set: InsertVocabularySet): Promise<VocabularySet>;
  getVocabularySets(): Promise<VocabularySet[]>;
  getVocabularySet(id: string): Promise<VocabularySet | undefined>;
  updateVocabularySet(id: string, set: Partial<InsertVocabularySet>): Promise<VocabularySet>;
  deleteVocabularySet(id: string): Promise<void>;
  getPublishedVocabularySets(): Promise<VocabularySet[]>;

  // Vocabulary words methods
  createVocabularyWord(word: InsertVocabularyWord): Promise<VocabularyWord>;
  getVocabularyWords(setId: string): Promise<VocabularyWord[]>;
  getVocabularyWord(id: string): Promise<VocabularyWord | undefined>;
  updateVocabularyWord(id: string, word: Partial<InsertVocabularyWord>): Promise<VocabularyWord>;
  deleteVocabularyWord(id: string): Promise<void>;

  // Vocabulary exercises methods
  createVocabularyExercise(exercise: InsertVocabularyExercise): Promise<VocabularyExercise>;
  getVocabularyExercises(setId: string): Promise<VocabularyExercise[]>;
  getVocabularyExercise(id: string): Promise<VocabularyExercise | undefined>;
  updateVocabularyExercise(id: string, exercise: Partial<InsertVocabularyExercise>): Promise<VocabularyExercise>;
  deleteVocabularyExercise(id: string): Promise<void>;
  getActiveVocabularyExercises(setId: string): Promise<VocabularyExercise[]>;

  // Vocabulary attempts methods
  createVocabularyAttempt(attempt: InsertVocabularyAttempt): Promise<VocabularyAttempt>;
  getVocabularyAttempts(exerciseId: string): Promise<VocabularyAttempt[]>;
  getStudentVocabularyAttempts(studentId: string, exerciseId: string): Promise<VocabularyAttempt[]>;
  getVocabularyAttempt(id: string): Promise<VocabularyAttempt | undefined>;
  updateVocabularyAttempt(id: string, attempt: Partial<InsertVocabularyAttempt>): Promise<VocabularyAttempt>;

  // Vocabulary streak methods
  createVocabularyStreak(streak: InsertVocabularyStreak): Promise<VocabularyStreak>;
  getVocabularyStreak(studentId: string): Promise<VocabularyStreak | undefined>;
  updateVocabularyStreak(id: string, streak: Partial<InsertVocabularyStreak>): Promise<VocabularyStreak>;

  // Flashcard progress methods
  createFlashcardProgress(progress: InsertFlashcardProgress): Promise<FlashcardProgress>;
  getFlashcardProgress(studentId: string, wordId: string): Promise<FlashcardProgress | undefined>;
  getStudentFlashcardProgress(studentId: string, setId?: string): Promise<FlashcardProgress[]>;
  updateFlashcardProgress(id: string, progress: Partial<InsertFlashcardProgress>): Promise<FlashcardProgress>;
  getWordsForReview(studentId: string, setId: string, limit?: number): Promise<FlashcardProgress[]>;

  // Flashcard streak methods
  createFlashcardStreak(streak: InsertFlashcardStreak): Promise<FlashcardStreak>;
  getFlashcardStreak(studentId: string): Promise<FlashcardStreak | undefined>;
  updateFlashcardStreak(id: string, streak: Partial<InsertFlashcardStreak>): Promise<FlashcardStreak>;

  // Flashcard session methods
  createFlashcardSession(session: InsertFlashcardSession): Promise<FlashcardSession>;
  getFlashcardSessions(studentId: string, setId?: string): Promise<FlashcardSession[]>;
  getFlashcardSession(id: string): Promise<FlashcardSession | undefined>;
  updateFlashcardSession(id: string, session: Partial<InsertFlashcardSession>): Promise<FlashcardSession>;
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
  private lessonAssignments: Map<string, LessonAssignment> = new Map();
  private studentLessonProgress: Map<string, StudentLessonProgress> = new Map();
  private teacherFeedback: Map<string, TeacherFeedback> = new Map();
  private exportJobs: Map<string, ExportJob> = new Map();
  private exportTemplates: Map<string, ExportTemplate> = new Map();
  private exportHistory: Map<string, ExportHistoryEntry> = new Map();
  private passwordResetTokens: Map<string, PasswordResetToken> = new Map();
  private studentProgress: Map<string, StudentProgress> = new Map();
  private studentActivity: Map<string, StudentActivity> = new Map();
  private vocabularySets: Map<string, VocabularySet> = new Map();
  private vocabularyWords: Map<string, VocabularyWord> = new Map();
  private vocabularyExercises: Map<string, VocabularyExercise> = new Map();
  private vocabularyAttempts: Map<string, VocabularyAttempt> = new Map();
  private vocabularyStreaks: Map<string, VocabularyStreak> = new Map();
  private flashcardProgress: Map<string, FlashcardProgress> = new Map();
  private flashcardStreaks: Map<string, FlashcardStreak> = new Map();
  private flashcardSessions: Map<string, FlashcardSession> = new Map();

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

    // Sentences are now loaded from database instead of hardcoded array
    const sentencesData: Omit<Sentence, "id">[] = [];

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
      blockPages: (lesson.blockPages || []) as RichPage[],
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
      blockPages: lesson.blockPages !== undefined ? (lesson.blockPages as RichPage[]) : existing.blockPages,
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

  // Export system methods - stub implementations for MemStorage
  async createExportJob(job: InsertExportJob): Promise<ExportJob> {
    throw new Error("Export jobs not implemented in MemStorage");
  }

  async getExportJob(id: string): Promise<ExportJob | undefined> {
    throw new Error("Export jobs not implemented in MemStorage");
  }

  async getExportJobsByTeacher(teacherId: string): Promise<ExportJob[]> {
    return [];
  }

  async getExportJobsBySchool(schoolId: string): Promise<ExportJob[]> {
    return [];
  }

  async updateExportJob(id: string, job: Partial<InsertExportJob>): Promise<ExportJob> {
    throw new Error("Export jobs not implemented in MemStorage");
  }

  async deleteExportJob(id: string): Promise<void> {
    // No-op for MemStorage
  }

  async getActiveExportJobs(): Promise<ExportJob[]> {
    return [];
  }

  async getExpiredExportJobs(): Promise<ExportJob[]> {
    return [];
  }

  async createExportTemplate(template: InsertExportTemplate): Promise<ExportTemplate> {
    throw new Error("Export templates not implemented in MemStorage");
  }

  async getExportTemplate(id: string): Promise<ExportTemplate | undefined> {
    return undefined;
  }

  async getExportTemplatesByTeacher(teacherId: string): Promise<ExportTemplate[]> {
    return [];
  }

  async getExportTemplatesBySchool(schoolId: string): Promise<ExportTemplate[]> {
    return [];
  }

  async getPublicExportTemplates(): Promise<ExportTemplate[]> {
    return [];
  }

  async updateExportTemplate(id: string, template: Partial<InsertExportTemplate>): Promise<ExportTemplate> {
    throw new Error("Export templates not implemented in MemStorage");
  }

  async deleteExportTemplate(id: string): Promise<void> {
    // No-op for MemStorage
  }

  async createExportHistoryEntry(entry: InsertExportHistoryEntry): Promise<ExportHistoryEntry> {
    throw new Error("Export history not implemented in MemStorage");
  }

  async getExportHistory(jobId: string): Promise<ExportHistoryEntry[]> {
    return [];
  }

  async getExportHistoryByTeacher(teacherId: string): Promise<ExportHistoryEntry[]> {
    return [];
  }

  async generateStudentProgressReport(studentId: string, teacherId: string, dateRange?: { start: string; end: string }): Promise<StudentProgressReport> {
    throw new Error("Student progress reports not implemented in MemStorage");
  }

  async generateClassDataBackup(classId: string, teacherId: string, includeInactive?: boolean): Promise<ClassDataBackup> {
    throw new Error("Class data backup not implemented in MemStorage");
  }

  async getExportableStudentData(studentIds: string[], teacherId: string): Promise<any[]> {
    return [];
  }

  async getExportableClassData(classIds: string[], teacherId: string): Promise<any[]> {
    return [];
  }

  async getExportableAssignmentData(assignmentIds: string[], teacherId: string): Promise<any[]> {
    return [];
  }

  // Password reset token methods - stub implementations for MemStorage
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    throw new Error("Password reset tokens not implemented in MemStorage");
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return undefined;
  }

  async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    // No-op for MemStorage
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    // No-op for MemStorage
  }

  // Student progress tracking methods (not implemented in MemStorage - use DatabaseStorage)
  async createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    throw new Error("Student progress tracking not implemented in MemStorage - use DatabaseStorage");
  }

  async getStudentProgress(studentId: string): Promise<StudentProgress[]> {
    return [];
  }

  async getStudentProgressByStudentId(studentId: string): Promise<StudentProgress[]> {
    return [];
  }

  async getStudentProgressByLesson(studentId: string, lessonId: string): Promise<StudentProgress[]> {
    return [];
  }

  async getClassProgress(classId: string): Promise<StudentProgress[]> {
    return [];
  }

  // Teacher and class management methods (not implemented in MemStorage - use DatabaseStorage)
  async getTeacherClasses(teacherId?: string): Promise<any[]> {
    return [];
  }

  async getStudentsByClassId(classId: string): Promise<any[]> {
    return [];
  }

  // Student activity tracking methods (not implemented in MemStorage - use DatabaseStorage)
  async logStudentActivity(activity: InsertStudentActivity): Promise<StudentActivity> {
    throw new Error("Student activity tracking not implemented in MemStorage - use DatabaseStorage");
  }

  async getStudentActivities(studentId: string, limit?: number): Promise<StudentActivity[]> {
    return [];
  }

  async getClassActivities(classId: string, limit?: number): Promise<StudentActivity[]> {
    return [];
  }

  // Analytics methods for progress tracking (not implemented in MemStorage - use DatabaseStorage)
  async getStudentProgressAnalytics(studentId: string): Promise<{
    totalActivities: number;
    averageScore: number;
    totalTimeSpent: number;
    activityBreakdown: { activityType: string; count: number; averageScore: number }[];
    recentProgress: StudentProgress[];
  }> {
    return {
      totalActivities: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      activityBreakdown: [],
      recentProgress: [],
    };
  }

  async getClassProgressAnalytics(classId: string): Promise<{
    totalStudents: number;
    averageScore: number;
    totalActivitiesCompleted: number;
    studentBreakdown: { studentId: string; studentName: string; averageScore: number; activitiesCount: number }[];
    activityTypeBreakdown: { activityType: string; count: number; averageScore: number }[];
    recentActivities: StudentActivity[];
  }> {
    return {
      totalStudents: 0,
      averageScore: 0,
      totalActivitiesCompleted: 0,
      studentBreakdown: [],
      activityTypeBreakdown: [],
      recentActivities: [],
    };
  }

  // Vocabulary sets methods
  async createVocabularySet(set: InsertVocabularySet): Promise<VocabularySet> {
    const id = randomUUID();
    const newSet: VocabularySet = {
      id,
      ...set,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.vocabularySets.set(id, newSet);
    return newSet;
  }

  async getVocabularySets(): Promise<VocabularySet[]> {
    return Array.from(this.vocabularySets.values());
  }

  async getVocabularySet(id: string): Promise<VocabularySet | undefined> {
    return this.vocabularySets.get(id);
  }

  async updateVocabularySet(id: string, set: Partial<InsertVocabularySet>): Promise<VocabularySet> {
    const existing = this.vocabularySets.get(id);
    if (!existing) {
      throw new Error(`Vocabulary set with id ${id} not found`);
    }
    const updated: VocabularySet = {
      ...existing,
      ...set,
      updatedAt: new Date(),
    };
    this.vocabularySets.set(id, updated);
    return updated;
  }

  async deleteVocabularySet(id: string): Promise<void> {
    this.vocabularySets.delete(id);
    // Get exercises for this set first (needed for deleting attempts)
    const exercisesToDelete = Array.from(this.vocabularyExercises.values())
      .filter(exercise => exercise.setId === id);
    
    // Delete associated words
    Array.from(this.vocabularyWords.values())
      .filter(word => word.setId === id)
      .forEach(word => this.vocabularyWords.delete(word.id));
    
    // Delete associated exercises and their attempts
    exercisesToDelete.forEach(exercise => {
      // Delete attempts for this exercise
      Array.from(this.vocabularyAttempts.values())
        .filter(attempt => attempt.exerciseId === exercise.id)
        .forEach(attempt => this.vocabularyAttempts.delete(attempt.id));
      // Delete the exercise
      this.vocabularyExercises.delete(exercise.id);
    });
  }

  async getPublishedVocabularySets(): Promise<VocabularySet[]> {
    return Array.from(this.vocabularySets.values()).filter(set => set.isPublished);
  }

  // Vocabulary words methods
  async createVocabularyWord(word: InsertVocabularyWord): Promise<VocabularyWord> {
    const id = randomUUID();
    const newWord: VocabularyWord = {
      id,
      ...word,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.vocabularyWords.set(id, newWord);
    return newWord;
  }

  async getVocabularyWords(setId: string): Promise<VocabularyWord[]> {
    return Array.from(this.vocabularyWords.values())
      .filter(word => word.setId === setId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getVocabularyWord(id: string): Promise<VocabularyWord | undefined> {
    return this.vocabularyWords.get(id);
  }

  async updateVocabularyWord(id: string, word: Partial<InsertVocabularyWord>): Promise<VocabularyWord> {
    const existing = this.vocabularyWords.get(id);
    if (!existing) {
      throw new Error(`Vocabulary word with id ${id} not found`);
    }
    const updated: VocabularyWord = {
      ...existing,
      ...word,
      updatedAt: new Date(),
    };
    this.vocabularyWords.set(id, updated);
    return updated;
  }

  async deleteVocabularyWord(id: string): Promise<void> {
    this.vocabularyWords.delete(id);
  }

  // Vocabulary exercises methods
  async createVocabularyExercise(exercise: InsertVocabularyExercise): Promise<VocabularyExercise> {
    const id = randomUUID();
    const newExercise: VocabularyExercise = {
      id,
      ...exercise,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.vocabularyExercises.set(id, newExercise);
    return newExercise;
  }

  async getVocabularyExercises(setId: string): Promise<VocabularyExercise[]> {
    return Array.from(this.vocabularyExercises.values())
      .filter(exercise => exercise.setId === setId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getVocabularyExercise(id: string): Promise<VocabularyExercise | undefined> {
    return this.vocabularyExercises.get(id);
  }

  async updateVocabularyExercise(id: string, exercise: Partial<InsertVocabularyExercise>): Promise<VocabularyExercise> {
    const existing = this.vocabularyExercises.get(id);
    if (!existing) {
      throw new Error(`Vocabulary exercise with id ${id} not found`);
    }
    const updated: VocabularyExercise = {
      ...existing,
      ...exercise,
      updatedAt: new Date(),
    };
    this.vocabularyExercises.set(id, updated);
    return updated;
  }

  async deleteVocabularyExercise(id: string): Promise<void> {
    this.vocabularyExercises.delete(id);
    // Also delete associated attempts
    Array.from(this.vocabularyAttempts.values())
      .filter(attempt => attempt.exerciseId === id)
      .forEach(attempt => this.vocabularyAttempts.delete(attempt.id));
  }

  async getActiveVocabularyExercises(setId: string): Promise<VocabularyExercise[]> {
    return Array.from(this.vocabularyExercises.values())
      .filter(exercise => exercise.setId === setId && exercise.isActive)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // Vocabulary attempts methods
  async createVocabularyAttempt(attempt: InsertVocabularyAttempt): Promise<VocabularyAttempt> {
    const id = randomUUID();
    const newAttempt: VocabularyAttempt = {
      id,
      ...attempt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.vocabularyAttempts.set(id, newAttempt);
    return newAttempt;
  }

  async getVocabularyAttempts(exerciseId: string): Promise<VocabularyAttempt[]> {
    return Array.from(this.vocabularyAttempts.values())
      .filter(attempt => attempt.exerciseId === exerciseId);
  }

  async getStudentVocabularyAttempts(studentId: string, exerciseId: string): Promise<VocabularyAttempt[]> {
    return Array.from(this.vocabularyAttempts.values())
      .filter(attempt => attempt.studentId === studentId && attempt.exerciseId === exerciseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getVocabularyAttempt(id: string): Promise<VocabularyAttempt | undefined> {
    return this.vocabularyAttempts.get(id);
  }

  async updateVocabularyAttempt(id: string, attempt: Partial<InsertVocabularyAttempt>): Promise<VocabularyAttempt> {
    const existing = this.vocabularyAttempts.get(id);
    if (!existing) {
      throw new Error(`Vocabulary attempt with id ${id} not found`);
    }
    const updated: VocabularyAttempt = {
      ...existing,
      ...attempt,
      updatedAt: new Date(),
    };
    this.vocabularyAttempts.set(id, updated);
    return updated;
  }

  // Vocabulary streak methods
  async createVocabularyStreak(streak: InsertVocabularyStreak): Promise<VocabularyStreak> {
    const id = randomUUID();
    const newStreak: VocabularyStreak = {
      id,
      ...streak,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.vocabularyStreaks.set(id, newStreak);
    return newStreak;
  }

  async getVocabularyStreak(studentId: string): Promise<VocabularyStreak | undefined> {
    return Array.from(this.vocabularyStreaks.values())
      .find(streak => streak.studentId === studentId);
  }

  async updateVocabularyStreak(id: string, streak: Partial<InsertVocabularyStreak>): Promise<VocabularyStreak> {
    const existing = this.vocabularyStreaks.get(id);
    if (!existing) {
      throw new Error(`Vocabulary streak with id ${id} not found`);
    }
    const updated: VocabularyStreak = {
      ...existing,
      ...streak,
      updatedAt: new Date(),
    };
    this.vocabularyStreaks.set(id, updated);
    return updated;
  }

  // Flashcard progress methods
  async createFlashcardProgress(progress: InsertFlashcardProgress): Promise<FlashcardProgress> {
    const id = randomUUID();
    const newProgress: FlashcardProgress = {
      id,
      ...progress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.flashcardProgress.set(id, newProgress);
    return newProgress;
  }

  async getFlashcardProgress(studentId: string, wordId: string): Promise<FlashcardProgress | undefined> {
    return Array.from(this.flashcardProgress.values())
      .find(progress => progress.studentId === studentId && progress.wordId === wordId);
  }

  async getStudentFlashcardProgress(studentId: string, setId?: string): Promise<FlashcardProgress[]> {
    return Array.from(this.flashcardProgress.values())
      .filter(progress => {
        if (progress.studentId !== studentId) return false;
        if (setId && progress.setId !== setId) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateFlashcardProgress(id: string, progress: Partial<InsertFlashcardProgress>): Promise<FlashcardProgress> {
    const existing = this.flashcardProgress.get(id);
    if (!existing) {
      throw new Error(`Flashcard progress with id ${id} not found`);
    }
    const updated: FlashcardProgress = {
      ...existing,
      ...progress,
      updatedAt: new Date(),
    };
    this.flashcardProgress.set(id, updated);
    return updated;
  }

  async getWordsForReview(studentId: string, setId: string, limit: number = 20): Promise<FlashcardProgress[]> {
    const now = new Date();
    return Array.from(this.flashcardProgress.values())
      .filter(progress => {
        if (progress.studentId !== studentId || progress.setId !== setId) return false;
        return progress.nextReviewDate <= now;
      })
      .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime())
      .slice(0, limit);
  }

  // Flashcard streak methods
  async createFlashcardStreak(streak: InsertFlashcardStreak): Promise<FlashcardStreak> {
    const id = randomUUID();
    const newStreak: FlashcardStreak = {
      id,
      ...streak,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.flashcardStreaks.set(id, newStreak);
    return newStreak;
  }

  async getFlashcardStreak(studentId: string): Promise<FlashcardStreak | undefined> {
    return Array.from(this.flashcardStreaks.values())
      .find(streak => streak.studentId === studentId);
  }

  async updateFlashcardStreak(id: string, streak: Partial<InsertFlashcardStreak>): Promise<FlashcardStreak> {
    const existing = this.flashcardStreaks.get(id);
    if (!existing) {
      throw new Error(`Flashcard streak with id ${id} not found`);
    }
    const updated: FlashcardStreak = {
      ...existing,
      ...streak,
      updatedAt: new Date(),
    };
    this.flashcardStreaks.set(id, updated);
    return updated;
  }

  // Flashcard session methods
  async createFlashcardSession(session: InsertFlashcardSession): Promise<FlashcardSession> {
    const id = randomUUID();
    const newSession: FlashcardSession = {
      id,
      ...session,
      createdAt: new Date(),
    };
    this.flashcardSessions.set(id, newSession);
    return newSession;
  }

  async getFlashcardSessions(studentId: string, setId?: string): Promise<FlashcardSession[]> {
    return Array.from(this.flashcardSessions.values())
      .filter(session => {
        if (session.studentId !== studentId) return false;
        if (setId && session.setId !== setId) return false;
        return true;
      })
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getFlashcardSession(id: string): Promise<FlashcardSession | undefined> {
    return this.flashcardSessions.get(id);
  }

  async updateFlashcardSession(id: string, session: Partial<InsertFlashcardSession>): Promise<FlashcardSession> {
    const existing = this.flashcardSessions.get(id);
    if (!existing) {
      throw new Error(`Flashcard session with id ${id} not found`);
    }
    const updated: FlashcardSession = {
      ...existing,
      ...session,
    };
    this.flashcardSessions.set(id, updated);
    return updated;
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

  // Vocabulary published lesson methods
  async createVocabularyPublishedLesson(lesson: InsertVocabularyPublishedLesson): Promise<VocabularyPublishedLesson> {
    const [newLesson] = await db.insert(vocabularyPublishedLessons).values(lesson).returning();
    return newLesson;
  }

  async getVocabularyPublishedLessons(): Promise<VocabularyPublishedLesson[]> {
    return await db.select().from(vocabularyPublishedLessons);
  }

  async getVocabularyPublishedLesson(id: string): Promise<VocabularyPublishedLesson | undefined> {
    const result = await db.select().from(vocabularyPublishedLessons).where(eq(vocabularyPublishedLessons.id, id));
    return result[0];
  }

  async getVocabularyPublishedLessonsByCategory(category: string): Promise<VocabularyPublishedLesson[]> {
    return await db.select().from(vocabularyPublishedLessons).where(eq(vocabularyPublishedLessons.category, category));
  }

  async updateVocabularyPublishedLesson(id: string, lesson: Partial<InsertVocabularyPublishedLesson>): Promise<VocabularyPublishedLesson> {
    const [updatedLesson] = await db.update(vocabularyPublishedLessons)
      .set({ ...lesson, updatedAt: new Date() })
      .where(eq(vocabularyPublishedLessons.id, id))
      .returning();
    return updatedLesson;
  }

  async deleteVocabularyPublishedLesson(id: string): Promise<void> {
    await db.delete(vocabularyPublishedLessons).where(eq(vocabularyPublishedLessons.id, id));
  }

  // Vocabulary draft lesson methods
  async createVocabularyLessonDraft(draft: InsertVocabularyLessonDraft): Promise<VocabularyLessonDraft> {
    const draftData = this.convertTimestamps({
      ...draft,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const [newDraft] = await db.insert(vocabularyLessonDrafts).values(draftData).returning();
    return newDraft;
  }

  async getVocabularyLessonDrafts(): Promise<VocabularyLessonDraft[]> {
    return await db.select().from(vocabularyLessonDrafts).orderBy(vocabularyLessonDrafts.updatedAt);
  }

  async getVocabularyLessonDraft(id: string): Promise<VocabularyLessonDraft | undefined> {
    const [draft] = await db.select().from(vocabularyLessonDrafts).where(eq(vocabularyLessonDrafts.id, id));
    return draft;
  }

  async updateVocabularyLessonDraft(id: string, draft: Partial<InsertVocabularyLessonDraft>): Promise<VocabularyLessonDraft> {
    const updateData = this.convertTimestamps({
      ...draft,
      updatedAt: new Date()
    });
    const [updatedDraft] = await db.update(vocabularyLessonDrafts)
      .set(updateData)
      .where(eq(vocabularyLessonDrafts.id, id))
      .returning();
    return updatedDraft;
  }

  async deleteVocabularyLessonDraft(id: string): Promise<void> {
    await db.delete(vocabularyLessonDrafts).where(eq(vocabularyLessonDrafts.id, id));
  }

  // Reading lesson methods
  async createReadingLesson(lesson: InsertReadingLesson): Promise<ReadingLesson> {
    const lessonData = {
      ...lesson,
      preReadingQuestions: (lesson.preReadingQuestions || []) as any[],
      questions: (lesson.questions || []) as any[],
      wordDefinitions: (lesson.wordDefinitions || []) as any[],
      pages: (lesson.pages || []) as any[],
      richPages: (lesson.richPages || []) as any[],
      blockPages: (lesson.blockPages || []) as any[]
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

  // Lesson assignment methods
  async createLessonAssignment(assignment: InsertLessonAssignment): Promise<LessonAssignment> {
    const assignmentData = {
      ...assignment,
      settings: assignment.settings as any // Type assertion to handle JSONB type
    };
    const [newAssignment] = await db.insert(lessonAssignments).values([assignmentData]).returning();
    return newAssignment;
  }

  async getLessonAssignments(teacherId: string): Promise<LessonAssignment[]> {
    return await db.select().from(lessonAssignments).where(eq(lessonAssignments.teacherId, teacherId));
  }

  async getLessonAssignmentsByClass(classId: string): Promise<LessonAssignment[]> {
    return await db.select().from(lessonAssignments).where(eq(lessonAssignments.classId, classId));
  }

  async getLessonAssignmentsByStudent(studentId: string): Promise<LessonAssignment[]> {
    // First get the student's class ID
    const [student] = await db
      .select({ classId: studentAccounts.classId })
      .from(studentAccounts)
      .where(eq(studentAccounts.id, studentId))
      .limit(1);

    if (!student) {
      return []; // Student not found
    }

    // Get all assignments that are either:
    // 1. Directly assigned to this student (studentId = studentId)
    // 2. Assigned to the student's class (classId = student's classId)
    // AND filter out assignments that have already been completed by this student
    const allAssignments = await db
      .select()
      .from(lessonAssignments)
      .where(
        and(
          or(
            eq(lessonAssignments.studentId, studentId),
            eq(lessonAssignments.classId, student.classId)
          ),
          eq(lessonAssignments.isActive, true)
        )
      );

    // Filter out assignments that have already been completed by this student
    const assignmentsWithProgress = await db
      .select({
        assignmentId: studentLessonProgress.assignmentId,
        status: studentLessonProgress.status
      })
      .from(studentLessonProgress)
      .where(eq(studentLessonProgress.studentId, studentId));

    const completedAssignmentIds = new Set(
      assignmentsWithProgress
        .filter(p => p.status === 'completed' || p.status === 'submitted')
        .map(p => p.assignmentId)
    );

    // Return only assignments that haven't been completed yet
    return allAssignments.filter(assignment =>
      !completedAssignmentIds.has(assignment.id)
    );
  }

  async getLessonAssignment(id: string): Promise<LessonAssignment | undefined> {
    const result = await db.select().from(lessonAssignments).where(eq(lessonAssignments.id, id));
    return result[0];
  }

  async getCompletedLessonAssignmentsByStudent(studentId: string): Promise<LessonAssignment[]> {
    // Get completed assignments for this student
    const completedAssignmentIds = await db
      .select({
        assignmentId: studentLessonProgress.assignmentId
      })
      .from(studentLessonProgress)
      .where(
        and(
          eq(studentLessonProgress.studentId, studentId),
          or(
            eq(studentLessonProgress.status, 'completed'),
            eq(studentLessonProgress.status, 'submitted')
          )
        )
      );

    if (completedAssignmentIds.length === 0) {
      return [];
    }

    // Get the actual assignment details
    const assignmentIds = completedAssignmentIds.map(p => p.assignmentId);

    // Use IN clause instead of ANY for better compatibility
    const results = [];
    for (const assignmentId of assignmentIds) {
      const assignment = await db
        .select()
        .from(lessonAssignments)
        .where(
          and(
            eq(lessonAssignments.id, assignmentId),
            eq(lessonAssignments.isActive, true)
          )
        )
        .limit(1);

      if (assignment.length > 0) {
        results.push(assignment[0]);
      }
    }

    return results;
  }

  async updateLessonAssignment(id: string, assignment: Partial<InsertLessonAssignment>): Promise<LessonAssignment> {
    const updateData = {
      ...assignment,
      updatedAt: new Date(),
      settings: assignment.settings ? (assignment.settings as any) : undefined
    };
    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);
    
    const [updatedAssignment] = await db.update(lessonAssignments)
      .set(updateData)
      .where(eq(lessonAssignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteLessonAssignment(id: string): Promise<void> {
    await db.delete(lessonAssignments).where(eq(lessonAssignments.id, id));
  }

  async getActiveLessonAssignments(teacherId: string): Promise<LessonAssignment[]> {
    return await db.select().from(lessonAssignments).where(
      and(
        eq(lessonAssignments.teacherId, teacherId),
        eq(lessonAssignments.isActive, true)
      )
    );
  }

  // Student progress methods
  async createStudentLessonProgress(progress: InsertStudentLessonProgress): Promise<StudentLessonProgress> {
    const progressData = {
      ...progress,
      progressData: progress.progressData as any // Type assertion to handle JSONB type
    };
    const [newProgress] = await db.insert(studentLessonProgress).values([progressData]).returning();
    return newProgress;
  }

  async getStudentLessonProgress(studentId: string, assignmentId: string): Promise<StudentLessonProgress | undefined> {
    const result = await db.select().from(studentLessonProgress).where(
      and(
        eq(studentLessonProgress.studentId, studentId),
        eq(studentLessonProgress.assignmentId, assignmentId)
      )
    );
    return result[0];
  }

  async getStudentProgressByAssignment(assignmentId: string): Promise<StudentLessonProgress[]> {
    return await db.select().from(studentLessonProgress).where(eq(studentLessonProgress.assignmentId, assignmentId));
  }

  async updateStudentLessonProgress(id: string, progress: Partial<InsertStudentLessonProgress>): Promise<StudentLessonProgress> {
    const updateData = {
      ...progress,
      updatedAt: new Date(),
      progressData: progress.progressData ? (progress.progressData as any) : undefined
    };
    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);
    
    const [updatedProgress] = await db.update(studentLessonProgress)
      .set(updateData)
      .where(eq(studentLessonProgress.id, id))
      .returning();
    return updatedProgress;
  }

  async getClassProgressSummary(classId: string): Promise<{ studentId: string; assignments: { assignmentId: string; status: string; score: number | null; completedAt: Date | null }[] }[]> {
    // This is a complex query that would need to join multiple tables
    // For now, return empty array - would need to implement proper joins in production
    return [];
  }

  // ===============================
  // COMPREHENSIVE ANALYTICS METHODS  
  // ===============================

  async getTeacherAnalytics(teacherId: string): Promise<TeacherAnalytics> {
    try {
      // Optimized: Get all overview data with a single efficient query using joins and aggregations
      const overviewQuery = await db
        .select({
          totalClasses: sql<number>`COUNT(DISTINCT ${teacherClasses.id})`,
          totalStudents: sql<number>`COUNT(DISTINCT ${studentAccounts.id})`,
          totalActiveAssignments: sql<number>`COUNT(DISTINCT ${lessonAssignments.id})`,
          totalCompletedAssignments: sql<number>`COUNT(DISTINCT CASE WHEN ${studentLessonProgress.status} = 'completed' THEN ${studentLessonProgress.id} END)`,
          totalTimeSpent: sql<number>`COALESCE(SUM(${studentLessonProgress.timeSpent}), 0)`,
          averageScore: sql<number>`COALESCE(AVG(CASE WHEN ${studentLessonProgress.score} IS NOT NULL THEN ${studentLessonProgress.score} END), 0)`
        })
        .from(teacherClasses)
        .leftJoin(studentAccounts, eq(studentAccounts.classId, teacherClasses.id))
        .leftJoin(lessonAssignments, and(
          eq(lessonAssignments.teacherId, teacherId),
          eq(lessonAssignments.classId, teacherClasses.id),
          eq(lessonAssignments.isActive, true)
        ))
        .leftJoin(studentLessonProgress, and(
          eq(studentLessonProgress.studentId, studentAccounts.id),
          eq(studentLessonProgress.assignmentId, lessonAssignments.id)
        ))
        .where(and(
          eq(teacherClasses.teacherId, teacherId),
          isNull(teacherClasses.archivedAt)
        ));

      const overview = overviewQuery[0];
      const averageCompletionRate = overview.totalActiveAssignments > 0 && overview.totalStudents > 0
        ? Math.round((overview.totalCompletedAssignments / (overview.totalActiveAssignments * overview.totalStudents)) * 100)
        : 0;

      // Optimized: Get class breakdown with a single query per class using aggregations
      const classBreakdownQuery = await db
        .select({
          classId: teacherClasses.id,
          className: teacherClasses.name,
          studentCount: sql<number>`COUNT(DISTINCT ${studentAccounts.id})`,
          averageScore: sql<number>`COALESCE(AVG(CASE WHEN ${studentLessonProgress.score} IS NOT NULL THEN ${studentLessonProgress.score} END), 0)`,
          completedAssignments: sql<number>`COUNT(DISTINCT CASE WHEN ${studentLessonProgress.status} = 'completed' THEN ${studentLessonProgress.id} END)`,
          totalAssignments: sql<number>`COUNT(DISTINCT ${lessonAssignments.id})`
        })
        .from(teacherClasses)
        .leftJoin(studentAccounts, eq(studentAccounts.classId, teacherClasses.id))
        .leftJoin(lessonAssignments, and(
          eq(lessonAssignments.teacherId, teacherId),
          eq(lessonAssignments.classId, teacherClasses.id),
          eq(lessonAssignments.isActive, true)
        ))
        .leftJoin(studentLessonProgress, and(
          eq(studentLessonProgress.studentId, studentAccounts.id),
          eq(studentLessonProgress.assignmentId, lessonAssignments.id)
        ))
        .where(and(
          eq(teacherClasses.teacherId, teacherId),
          isNull(teacherClasses.archivedAt)
        ))
        .groupBy(teacherClasses.id, teacherClasses.name);

      const classBreakdown = classBreakdownQuery.map(row => ({
        classId: row.classId,
        className: row.className,
        studentCount: row.studentCount,
        averageScore: Math.round(row.averageScore),
        completionRate: row.totalAssignments > 0 && row.studentCount > 0 
          ? Math.round((row.completedAssignments / (row.studentCount * row.totalAssignments)) * 100)
          : 0,
        strugglingStudents: 0 // Temporarily set to 0 to fix the aggregate function error
      }));

      // Optimized: Generate recent activity (last 7 days) with a single aggregated query
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivityQuery = await db
        .select({
          date: sql<string>`DATE(${studentLessonProgress.completedAt})`,
          completions: sql<number>`COUNT(*)`,
          averageScore: sql<number>`COALESCE(AVG(${studentLessonProgress.score}), 0)`
        })
        .from(studentLessonProgress)
        .innerJoin(lessonAssignments, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
        .where(and(
          eq(lessonAssignments.teacherId, teacherId),
          gte(studentLessonProgress.completedAt, sevenDaysAgo),
          eq(studentLessonProgress.status, 'completed')
        ))
        .groupBy(sql`DATE(${studentLessonProgress.completedAt})`)
        .orderBy(sql`DATE(${studentLessonProgress.completedAt})`);

      const recentActivityArray = recentActivityQuery.map(row => ({
        date: row.date,
        completions: row.completions,
        averageScore: Math.round(row.averageScore)
      }));

      return {
        overview: {
          totalStudents: overview.totalStudents,
          totalClasses: overview.totalClasses,
          activeAssignments: overview.totalActiveAssignments,
          completedAssignments: overview.totalCompletedAssignments,
          averageCompletionRate,
          averageScore: Math.round(overview.averageScore),
          totalTimeSpent: Math.round(overview.totalTimeSpent)
        },
        recentActivity: recentActivityArray,
        classBreakdown
      };
    } catch (error) {
      console.error('Error fetching teacher analytics:', error);
      throw error;
    }
  }

  async getClassAnalytics(classId: string): Promise<ClassAnalytics> {
    try {
      // Get class info
      const classInfo = await db
        .select()
        .from(teacherClasses)
        .where(eq(teacherClasses.id, classId))
        .limit(1);

      if (classInfo.length === 0) {
        throw new Error('Class not found');
      }

      const teacherClass = classInfo[0];

      // Get students in this class
      const students = await db
        .select()
        .from(studentAccounts)
        .where(eq(studentAccounts.classId, classId));

      // Get assignments for this class
      const assignments = await db
        .select()
        .from(lessonAssignments)
        .where(and(
          eq(lessonAssignments.classId, classId),
          eq(lessonAssignments.isActive, true)
        ));

      let classTimeSpent = 0;
      let classScoreSum = 0;
      let classScoreCount = 0;
      let completedAssignments = 0;
      const studentPerformance = [];
      const assignmentBreakdown = [];

      // Calculate student performance
      for (const student of students) {
        const studentProgress = await db
          .select()
          .from(studentLessonProgress)
          .where(eq(studentLessonProgress.studentId, student.id));

        const completed = studentProgress.filter(p => p.status === 'completed');
        const scores = studentProgress.filter(p => p.score !== null).map(p => p.score!);
        const timeSpent = studentProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
        const needsHelp = studentProgress.some(p => p.needsHelp);

        const averageScore = scores.length > 0 
          ? scores.reduce((a, b) => a + b, 0) / scores.length 
          : 0;
        const completionRate = assignments.length > 0 
          ? completed.length / assignments.length 
          : 0;

        studentPerformance.push({
          studentId: student.id,
          studentName: student.studentName,
          averageScore: Math.round(averageScore),
          completionRate: Math.round(completionRate * 100),
          timeSpent: Math.round(timeSpent),
          assignmentsCompleted: completed.length,
          lastActivity: student.lastLogin?.toISOString() || null,
          needsHelp
        });

        classTimeSpent += timeSpent;
        if (scores.length > 0) {
          classScoreSum += averageScore;
          classScoreCount++;
        }
        completedAssignments += completed.length;
      }

      // Calculate assignment breakdown
      for (const assignment of assignments) {
        const assignmentProgress = await db
          .select()
          .from(studentLessonProgress)
          .where(eq(studentLessonProgress.assignmentId, assignment.id));

        const completed = assignmentProgress.filter(p => p.status === 'completed');
        const scores = assignmentProgress.filter(p => p.score !== null).map(p => p.score!);
        const struggling = assignmentProgress.filter(p => 
          p.needsHelp || (p.score !== null && p.score < 60)
        );

        assignmentBreakdown.push({
          assignmentId: assignment.id,
          title: assignment.title,
          assignmentType: assignment.assignmentType,
          completionRate: students.length > 0 
            ? Math.round((completed.length / students.length) * 100)
            : 0,
          averageScore: scores.length > 0 
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0,
          strugglingStudentCount: struggling.length
        });
      }

      // Generate progress trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const progressTrends = await db
        .select({
          date: studentLessonProgress.completedAt,
          score: studentLessonProgress.score,
          timeSpent: studentLessonProgress.timeSpent
        })
        .from(studentLessonProgress)
        .innerJoin(lessonAssignments, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
        .where(and(
          eq(lessonAssignments.classId, classId),
          gte(studentLessonProgress.completedAt, thirtyDaysAgo),
          eq(studentLessonProgress.status, 'completed')
        ));

      // Group trends by date
      const trendsByDate: { [date: string]: { completions: number; scores: number[]; timeSpent: number } } = {};
      progressTrends.forEach(trend => {
        if (trend.date) {
          const dateStr = trend.date.toISOString().split('T')[0];
          if (!trendsByDate[dateStr]) {
            trendsByDate[dateStr] = { completions: 0, scores: [], timeSpent: 0 };
          }
          trendsByDate[dateStr].completions++;
          if (trend.score !== null) {
            trendsByDate[dateStr].scores.push(trend.score);
          }
          trendsByDate[dateStr].timeSpent += trend.timeSpent || 0;
        }
      });

      const trendsArray = Object.entries(trendsByDate).map(([date, data]) => ({
        date,
        completions: data.completions,
        averageScore: data.scores.length > 0 
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0,
        timeSpent: Math.round(data.timeSpent)
      }));

      return {
        classInfo: {
          id: teacherClass.id,
          name: teacherClass.name,
          studentCount: students.length,
          averageScore: classScoreCount > 0 
            ? Math.round(classScoreSum / classScoreCount)
            : 0,
          averageCompletionRate: Math.round(
            assignments.length > 0 && students.length > 0
              ? (completedAssignments / (assignments.length * students.length)) * 100
              : 0
          ),
          totalTimeSpent: Math.round(classTimeSpent)
        },
        studentPerformance,
        assignmentBreakdown,
        progressTrends: trendsArray
      };
    } catch (error) {
      console.error('Error fetching class analytics:', error);
      throw error;
    }
  }

  // ===============================
  // COMPREHENSIVE ANALYTICS METHODS IMPLEMENTATION
  // ===============================

  async getStudentAnalytics(studentId: string): Promise<StudentAnalytics> {
    try {
      // Get student info with class name
      const studentQuery = await db
        .select({
          id: studentAccounts.id,
          studentName: studentAccounts.studentName,
          className: teacherClasses.name,
          lastLogin: studentAccounts.lastLogin
        })
        .from(studentAccounts)
        .innerJoin(teacherClasses, eq(studentAccounts.classId, teacherClasses.id))
        .where(eq(studentAccounts.id, studentId));

      if (studentQuery.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentQuery[0];

      // Get student's progress and performance data
      const progressQuery = await db
        .select({
          assignmentId: studentLessonProgress.assignmentId,
          score: studentLessonProgress.score,
          timeSpent: studentLessonProgress.timeSpent,
          status: studentLessonProgress.status,
          completedAt: studentLessonProgress.completedAt,
          assignmentTitle: lessonAssignments.title,
          assignmentType: lessonAssignments.assignmentType
        })
        .from(studentLessonProgress)
        .innerJoin(lessonAssignments, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
        .where(eq(studentLessonProgress.studentId, studentId))
        .orderBy(studentLessonProgress.completedAt);

      // Calculate overall metrics
      const completedProgress = progressQuery.filter(p => p.status === 'completed');
      const totalAssignments = progressQuery.length;
      const completedAssignments = completedProgress.length;
      const scoresWithValues = completedProgress.filter(p => p.score !== null);
      
      const overallScore = scoresWithValues.length > 0 
        ? Math.round(scoresWithValues.reduce((sum, p) => sum + (p.score || 0), 0) / scoresWithValues.length)
        : 0;
      
      const completionRate = totalAssignments > 0 
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0;
      
      const totalTimeSpent = Math.round(progressQuery.reduce((sum, p) => sum + (p.timeSpent || 0), 0));
      
      const lastActivity = progressQuery.length > 0 && progressQuery[progressQuery.length - 1].completedAt
        ? progressQuery[progressQuery.length - 1].completedAt!.toISOString()
        : null;

      // Build performance history
      const performanceHistory = completedProgress.map(p => ({
        date: p.completedAt!.toISOString().split('T')[0],
        assignmentTitle: p.assignmentTitle,
        assignmentType: p.assignmentType,
        score: p.score || 0,
        timeSpent: p.timeSpent || 0,
        status: p.status
      }));

      // Analyze weak areas by assignment type
      const assignmentTypeStats = new Map<string, { scores: number[], completed: number, total: number }>();
      
      progressQuery.forEach(p => {
        if (!assignmentTypeStats.has(p.assignmentType)) {
          assignmentTypeStats.set(p.assignmentType, { scores: [], completed: 0, total: 0 });
        }
        const stats = assignmentTypeStats.get(p.assignmentType)!;
        stats.total++;
        if (p.status === 'completed') {
          stats.completed++;
          if (p.score !== null) {
            stats.scores.push(p.score);
          }
        }
      });

      const weakAreas = Array.from(assignmentTypeStats.entries()).map(([type, stats]) => {
        const averageScore = stats.scores.length > 0
          ? Math.round(stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length)
          : 0;
        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        
        return {
          assignmentType: type,
          averageScore,
          completionRate,
          needsAttention: averageScore < 70 || completionRate < 80
        };
      });

      // Generate progress trajectory (monthly cumulative scores)
      const monthlyData = new Map<string, { scores: number[], count: number }>();
      completedProgress.forEach(p => {
        if (p.completedAt && p.score !== null) {
          const monthKey = p.completedAt.toISOString().substring(0, 7); // YYYY-MM
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { scores: [], count: 0 });
          }
          monthlyData.get(monthKey)!.scores.push(p.score);
          monthlyData.get(monthKey)!.count++;
        }
      });

      const progressTrajectory = Array.from(monthlyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => {
          const monthlyAverage = Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length);
          return {
            date,
            cumulativeScore: overallScore, // Simplified - in real implementation would be true cumulative
            monthlyAverage
          };
        });

      // Analyze strengths and challenges
      const strengths: string[] = [];
      const challenges: string[] = [];

      weakAreas.forEach(area => {
        if (area.averageScore >= 85 && area.completionRate >= 90) {
          strengths.push(`Excellent performance in ${area.assignmentType}`);
        } else if (area.needsAttention) {
          if (area.averageScore < 70) {
            challenges.push(`Low scores in ${area.assignmentType} (${area.averageScore}%)`);
          }
          if (area.completionRate < 80) {
            challenges.push(`Low completion rate in ${area.assignmentType} (${area.completionRate}%)`);
          }
        }
      });

      if (completionRate >= 90) strengths.push('Consistent assignment completion');
      if (overallScore >= 85) strengths.push('High overall academic performance');
      if (totalTimeSpent < (completedAssignments * 30)) strengths.push('Efficient learning pace');
      
      if (completionRate < 70) challenges.push('Inconsistent assignment completion');
      if (overallScore < 60) challenges.push('Needs improvement in overall performance');

      return {
        studentInfo: {
          id: student.id,
          name: student.studentName,
          className: student.className,
          overallScore,
          completionRate,
          totalTimeSpent,
          assignmentsCompleted: completedAssignments,
          lastActivity
        },
        performanceHistory,
        weakAreas,
        progressTrajectory,
        strengthsAndChallenges: {
          strengths,
          challenges
        }
      };
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      throw error;
    }
  }

  async getAssignmentAnalytics(assignmentId: string): Promise<AssignmentAnalytics> {
    try {
      // Get assignment info
      const assignmentQuery = await db
        .select()
        .from(lessonAssignments)
        .where(eq(lessonAssignments.id, assignmentId));

      if (assignmentQuery.length === 0) {
        throw new Error('Assignment not found');
      }

      const assignment = assignmentQuery[0];

      // Get all student progress for this assignment
      const progressQuery = await db
        .select({
          studentId: studentLessonProgress.studentId,
          studentName: studentAccounts.studentName,
          status: studentLessonProgress.status,
          score: studentLessonProgress.score,
          timeSpent: studentLessonProgress.timeSpent,
          completedAt: studentLessonProgress.completedAt
        })
        .from(studentLessonProgress)
        .innerJoin(studentAccounts, eq(studentLessonProgress.studentId, studentAccounts.id))
        .where(eq(studentLessonProgress.assignmentId, assignmentId));

      // Get total student count for this assignment (from class)
      const classStudentsQuery = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(studentAccounts)
        .where(eq(studentAccounts.classId, assignment.classId || ''));

      const totalStudents = classStudentsQuery[0]?.count || progressQuery.length;

      // Calculate completion stats
      const completed = progressQuery.filter(p => p.status === 'completed').length;
      const inProgress = progressQuery.filter(p => p.status === 'in_progress').length;
      const notStarted = totalStudents - progressQuery.length;
      const overdue = assignment.dueDate 
        ? progressQuery.filter(p => p.status !== 'completed' && new Date() > assignment.dueDate!).length
        : 0;

      const completionRate = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;
      
      const scoresWithValues = progressQuery.filter(p => p.score !== null);
      const averageScore = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((sum, p) => sum + (p.score || 0), 0) / scoresWithValues.length)
        : 0;

      const averageTimeSpent = progressQuery.length > 0
        ? Math.round(progressQuery.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / progressQuery.length)
        : 0;

      // Build student results
      const studentResults = progressQuery.map(p => ({
        studentId: p.studentId,
        studentName: p.studentName,
        status: p.status,
        score: p.score,
        timeSpent: p.timeSpent || 0,
        completedAt: p.completedAt?.toISOString() || null,
        needsHelp: (p.score !== null && p.score < 60) || (p.timeSpent && p.timeSpent > averageTimeSpent * 1.5)
      }));

      // Performance distribution
      const scoreRanges = [
        { range: '90-100%', min: 90, max: 100 },
        { range: '80-89%', min: 80, max: 89 },
        { range: '70-79%', min: 70, max: 79 },
        { range: '60-69%', min: 60, max: 69 },
        { range: 'Below 60%', min: 0, max: 59 }
      ];

      const performanceDistribution = scoreRanges.map(range => {
        const count = scoresWithValues.filter(p => {
          const score = p.score!;
          return score >= range.min && score <= range.max;
        }).length;

        return {
          scoreRange: range.range,
          studentCount: count
        };
      });

      return {
        assignmentInfo: {
          id: assignment.id,
          title: assignment.title,
          assignmentType: assignment.assignmentType,
          dueDate: assignment.dueDate?.toISOString() || null,
          studentCount: totalStudents
        },
        completionStats: {
          completed,
          inProgress,
          notStarted,
          overdue,
          completionRate,
          averageScore,
          averageTimeSpent
        },
        studentResults,
        performanceDistribution
      };
    } catch (error) {
      console.error('Error fetching assignment analytics:', error);
      throw error;
    }
  }

  async getPerformanceComparison(teacherId: string, options?: PerformanceComparisonOptions): Promise<PerformanceComparison> {
    try {
      const comparisonType = options?.comparisonType || 'class';
      
      // Get teacher's classes for baseline
      const classes = await db
        .select()
        .from(teacherClasses)
        .where(and(
          eq(teacherClasses.teacherId, teacherId),
          isNull(teacherClasses.archivedAt)
        ));

      if (classes.length === 0) {
        throw new Error('No classes found for teacher');
      }

      // Use first class as baseline or specified class
      const baselineClass = classes[0];
      const baselineAnalytics = await this.getClassAnalytics(baselineClass.id);

      const baseline = {
        name: baselineClass.name,
        averageScore: baselineAnalytics.classInfo.averageScore,
        completionRate: baselineAnalytics.classInfo.averageCompletionRate,
        studentCount: baselineAnalytics.classInfo.studentCount
      };

      const comparisons = [];

      if (comparisonType === 'class') {
        // Compare with other classes
        for (const cls of classes.slice(1)) {
          const classAnalytics = await this.getClassAnalytics(cls.id);
          const scoreDiff = classAnalytics.classInfo.averageScore - baseline.averageScore;
          const percentageDifference = baseline.averageScore > 0 
            ? Math.round((scoreDiff / baseline.averageScore) * 100)
            : 0;

          comparisons.push({
            name: cls.name,
            averageScore: classAnalytics.classInfo.averageScore,
            completionRate: classAnalytics.classInfo.averageCompletionRate,
            studentCount: classAnalytics.classInfo.studentCount,
            percentageDifference
          });
        }
      }

      // Generate insights
      const bestPerforming = comparisons.length > 0
        ? comparisons.reduce((best, current) => 
            current.averageScore > best.averageScore ? current : best, comparisons[0]
          )?.name || baseline.name
        : baseline.name;

      const needsImprovement = comparisons.length > 0
        ? comparisons.reduce((worst, current) => 
            current.averageScore < worst.averageScore ? current : worst, comparisons[0]
          )?.name || ''
        : '';

      const trends = [];
      if (comparisons.some(c => c.averageScore > baseline.averageScore)) {
        trends.push('Some classes showing higher performance than baseline');
      }
      if (comparisons.some(c => c.completionRate < 80)) {
        trends.push('Several classes have completion rates below 80%');
      }

      return {
        comparisonType,
        baseline,
        comparisons,
        insights: {
          bestPerforming,
          needsImprovement,
          trends
        }
      };
    } catch (error) {
      console.error('Error fetching performance comparison:', error);
      throw error;
    }
  }

  async getProgressTrends(teacherId: string, timeRange: TimeRange): Promise<ProgressTrends> {
    try {
      const startDate = new Date(timeRange.start);
      const endDate = new Date(timeRange.end);

      // Get progress data within time range
      const progressQuery = await db
        .select({
          date: sql<string>`DATE(${studentLessonProgress.completedAt})`,
          completions: sql<number>`COUNT(*)`,
          averageScore: sql<number>`AVG(${studentLessonProgress.score})`,
          timeSpent: sql<number>`SUM(${studentLessonProgress.timeSpent})`,
          activeStudents: sql<number>`COUNT(DISTINCT ${studentLessonProgress.studentId})`
        })
        .from(studentLessonProgress)
        .innerJoin(lessonAssignments, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
        .where(and(
          eq(lessonAssignments.teacherId, teacherId),
          gte(studentLessonProgress.completedAt, startDate),
          lte(studentLessonProgress.completedAt, endDate),
          eq(studentLessonProgress.status, 'completed')
        ))
        .groupBy(sql`DATE(${studentLessonProgress.completedAt})`)
        .orderBy(sql`DATE(${studentLessonProgress.completedAt})`);

      const trends = progressQuery.map(row => ({
        date: row.date,
        completions: row.completions,
        averageScore: Math.round(row.averageScore || 0),
        timeSpent: Math.round(row.timeSpent || 0),
        activeStudents: row.activeStudents
      }));

      // Calculate overall trend
      let overallTrend: { direction: 'improving' | 'declining' | 'stable'; percentage: number };
      
      if (trends.length >= 2) {
        const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
        const secondHalf = trends.slice(Math.floor(trends.length / 2));
        
        const firstAvgScore = firstHalf.reduce((sum, t) => sum + t.averageScore, 0) / firstHalf.length;
        const secondAvgScore = secondHalf.reduce((sum, t) => sum + t.averageScore, 0) / secondHalf.length;
        
        const change = secondAvgScore - firstAvgScore;
        const percentage = firstAvgScore > 0 ? Math.abs(Math.round((change / firstAvgScore) * 100)) : 0;
        
        if (Math.abs(change) < 2) {
          overallTrend = { direction: 'stable', percentage: 0 };
        } else if (change > 0) {
          overallTrend = { direction: 'improving', percentage };
        } else {
          overallTrend = { direction: 'declining', percentage };
        }
      } else {
        overallTrend = { direction: 'stable', percentage: 0 };
      }

      // Generate insights
      const bestPeriod = trends.length > 0
        ? trends.reduce((best, current) => 
            current.averageScore > best.averageScore ? current : best, trends[0]
          ).date
        : '';

      const challengingPeriod = trends.length > 0
        ? trends.reduce((worst, current) => 
            current.averageScore < worst.averageScore ? current : worst, trends[0]
          ).date
        : '';

      const recommendations = [];
      if (overallTrend.direction === 'declining') {
        recommendations.push('Consider reviewing teaching strategies and providing additional support');
        recommendations.push('Analyze challenging assignments to identify improvement areas');
      } else if (overallTrend.direction === 'improving') {
        recommendations.push('Continue current successful teaching practices');
        recommendations.push('Consider sharing successful strategies with other educators');
      } else {
        recommendations.push('Monitor for patterns and consider implementing engagement strategies');
      }

      return {
        timeRange,
        overallTrend,
        trends,
        insights: {
          bestPeriod,
          challengingPeriod,
          recommendations
        }
      };
    } catch (error) {
      console.error('Error fetching progress trends:', error);
      throw error;
    }
  }

  async getCompletionRates(teacherId: string, groupBy: 'class' | 'assignment' | 'student'): Promise<CompletionRateData[]> {
    try {
      const data: CompletionRateData[] = [];

      if (groupBy === 'class') {
        // Get completion rates by class
        const classQuery = await db
          .select({
            id: teacherClasses.id,
            name: teacherClasses.name,
            totalAssignments: sql<number>`COUNT(DISTINCT ${lessonAssignments.id})`,
            completedAssignments: sql<number>`COUNT(DISTINCT CASE WHEN ${studentLessonProgress.status} = 'completed' THEN ${studentLessonProgress.id} END)`,
            averageScore: sql<number>`AVG(CASE WHEN ${studentLessonProgress.score} IS NOT NULL THEN ${studentLessonProgress.score} END)`
          })
          .from(teacherClasses)
          .leftJoin(lessonAssignments, eq(lessonAssignments.classId, teacherClasses.id))
          .leftJoin(studentLessonProgress, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
          .where(and(
            eq(teacherClasses.teacherId, teacherId),
            isNull(teacherClasses.archivedAt)
          ))
          .groupBy(teacherClasses.id, teacherClasses.name);

        classQuery.forEach(row => {
          const completionRate = row.totalAssignments > 0 
            ? Math.round((row.completedAssignments / row.totalAssignments) * 100)
            : 0;

          data.push({
            id: row.id,
            name: row.name,
            total: row.totalAssignments,
            completed: row.completedAssignments,
            completionRate,
            averageScore: Math.round(row.averageScore || 0),
            category: 'class'
          });
        });
      }

      return data;
    } catch (error) {
      console.error('Error fetching completion rates:', error);
      throw error;
    }
  }

  async getTimeSpentAnalytics(teacherId: string): Promise<TimeSpentAnalytics> {
    try {
      // Get time spent data for teacher's students
      const timeQuery = await db
        .select({
          timeSpent: studentLessonProgress.timeSpent,
          assignmentType: lessonAssignments.assignmentType,
          completedAt: studentLessonProgress.completedAt,
          studentId: studentLessonProgress.studentId,
          studentName: studentAccounts.studentName
        })
        .from(studentLessonProgress)
        .innerJoin(lessonAssignments, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
        .innerJoin(studentAccounts, eq(studentLessonProgress.studentId, studentAccounts.id))
        .where(and(
          eq(lessonAssignments.teacherId, teacherId),
          eq(studentLessonProgress.status, 'completed'),
          isNotNull(studentLessonProgress.timeSpent)
        ));

      const totalMinutes = timeQuery.reduce((sum, row) => sum + (row.timeSpent || 0), 0);
      const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
      const averageSessionLength = timeQuery.length > 0 
        ? Math.round(totalMinutes / timeQuery.length)
        : 0;

      // Time distribution by assignment type
      const typeStats = new Map<string, number>();
      timeQuery.forEach(row => {
        if (row.assignmentType && row.timeSpent) {
          typeStats.set(row.assignmentType, (typeStats.get(row.assignmentType) || 0) + row.timeSpent);
        }
      });

      const timeDistribution = Array.from(typeStats.entries()).map(([type, minutes]) => ({
        assignmentType: type,
        hours: Math.round(minutes / 60 * 100) / 100,
        percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0
      }));

      // Daily activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyStats = new Map<string, { minutes: number, sessions: number }>();
      timeQuery
        .filter(row => row.completedAt && row.completedAt >= thirtyDaysAgo)
        .forEach(row => {
          const date = row.completedAt!.toISOString().split('T')[0];
          if (!dailyStats.has(date)) {
            dailyStats.set(date, { minutes: 0, sessions: 0 });
          }
          const stats = dailyStats.get(date)!;
          stats.minutes += row.timeSpent || 0;
          stats.sessions += 1;
        });

      const dailyActivity = Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        hours: Math.round(stats.minutes / 60 * 100) / 100,
        sessions: stats.sessions
      }));

      // Efficiency metrics
      const studentStats = new Map<string, { totalTime: number, sessions: number, name: string }>();
      timeQuery.forEach(row => {
        if (!studentStats.has(row.studentId)) {
          studentStats.set(row.studentId, { totalTime: 0, sessions: 0, name: row.studentName });
        }
        const stats = studentStats.get(row.studentId)!;
        stats.totalTime += row.timeSpent || 0;
        stats.sessions += 1;
      });

      const studentAverages = Array.from(studentStats.entries()).map(([id, stats]) => ({
        studentId: id,
        studentName: stats.name,
        averageTime: stats.sessions > 0 ? Math.round(stats.totalTime / stats.sessions) : 0
      }));

      const sortedByTime = [...studentAverages].sort((a, b) => a.averageTime - b.averageTime);
      const fastLearners = sortedByTime.slice(0, 3);
      const needsMoreTime = sortedByTime.slice(-3).reverse();

      return {
        totalHours,
        averageSessionLength,
        timeDistribution,
        dailyActivity,
        efficiencyMetrics: {
          fastLearners,
          needsMoreTime
        }
      };
    } catch (error) {
      console.error('Error fetching time spent analytics:', error);
      throw error;
    }
  }

  async getStrugglingStudents(teacherId: string): Promise<StrugglingStudentData[]> {
    try {
      // Get all students and their performance data
      const studentsQuery = await db
        .select({
          studentId: studentAccounts.id,
          studentName: studentAccounts.studentName,
          className: teacherClasses.name,
          lastLogin: studentAccounts.lastLogin
        })
        .from(studentAccounts)
        .innerJoin(teacherClasses, eq(studentAccounts.classId, teacherClasses.id))
        .where(and(
          eq(teacherClasses.teacherId, teacherId),
          isNull(teacherClasses.archivedAt)
        ));

      const strugglingStudents: StrugglingStudentData[] = [];

      for (const student of studentsQuery) {
        // Get student's progress data
        const progressQuery = await db
          .select({
            score: studentLessonProgress.score,
            timeSpent: studentLessonProgress.timeSpent,
            status: studentLessonProgress.status,
            completedAt: studentLessonProgress.completedAt
          })
          .from(studentLessonProgress)
          .innerJoin(lessonAssignments, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
          .where(and(
            eq(studentLessonProgress.studentId, student.studentId),
            eq(lessonAssignments.teacherId, teacherId)
          ));

        if (progressQuery.length === 0) continue;

        // Calculate metrics
        const completedAssignments = progressQuery.filter(p => p.status === 'completed');
        const scoresWithValues = completedAssignments.filter(p => p.score !== null);
        
        const completionRate = progressQuery.length > 0 
          ? Math.round((completedAssignments.length / progressQuery.length) * 100)
          : 0;
        
        const averageScore = scoresWithValues.length > 0
          ? Math.round(scoresWithValues.reduce((sum, p) => sum + (p.score || 0), 0) / scoresWithValues.length)
          : 0;
        
        const averageTimeSpent = completedAssignments.length > 0
          ? Math.round(completedAssignments.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / completedAssignments.length)
          : 0;

        const daysSinceLastActivity = student.lastLogin
          ? Math.floor((Date.now() - student.lastLogin.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Identify concerns
        const concerns = {
          lowCompletionRate: completionRate < 70,
          lowAverageScore: averageScore < 60,
          longTimeSpent: averageTimeSpent > 60, // More than 1 hour average
          frequentHelp: false, // Would need help request tracking
          recentInactivity: daysSinceLastActivity > 7
        };

        // Only include if student has concerning metrics
        const hasConcerns = Object.values(concerns).some(concern => concern);
        
        if (hasConcerns) {
          const recommendations = [];
          if (concerns.lowCompletionRate) {
            recommendations.push('Schedule one-on-one meeting to discuss assignment difficulties');
          }
          if (concerns.lowAverageScore) {
            recommendations.push('Provide additional practice materials and remedial exercises');
          }
          if (concerns.longTimeSpent) {
            recommendations.push('Review study strategies and provide time management guidance');
          }
          if (concerns.recentInactivity) {
            recommendations.push('Contact student/parents about recent absence from activities');
          }

          strugglingStudents.push({
            studentId: student.studentId,
            studentName: student.studentName,
            className: student.className,
            concerns,
            metrics: {
              completionRate,
              averageScore,
              averageTimeSpent,
              helpRequests: 0, // Would need implementation
              daysSinceLastActivity
            },
            recommendations
          });
        }
      }

      return strugglingStudents;
    } catch (error) {
      console.error('Error fetching struggling students:', error);
      throw error;
    }
  }

  async getTopPerformers(teacherId: string): Promise<TopPerformerData[]> {
    try {
      // Get all students and their performance data
      const studentsQuery = await db
        .select({
          studentId: studentAccounts.id,
          studentName: studentAccounts.studentName,
          className: teacherClasses.name
        })
        .from(studentAccounts)
        .innerJoin(teacherClasses, eq(studentAccounts.classId, teacherClasses.id))
        .where(and(
          eq(teacherClasses.teacherId, teacherId),
          isNull(teacherClasses.archivedAt)
        ));

      const topPerformers: TopPerformerData[] = [];

      for (const student of studentsQuery) {
        // Get student's progress data
        const progressQuery = await db
          .select({
            score: studentLessonProgress.score,
            timeSpent: studentLessonProgress.timeSpent,
            status: studentLessonProgress.status,
            completedAt: studentLessonProgress.completedAt
          })
          .from(studentLessonProgress)
          .innerJoin(lessonAssignments, eq(studentLessonProgress.assignmentId, lessonAssignments.id))
          .where(and(
            eq(studentLessonProgress.studentId, student.studentId),
            eq(lessonAssignments.teacherId, teacherId)
          ));

        if (progressQuery.length === 0) continue;

        // Calculate metrics
        const completedAssignments = progressQuery.filter(p => p.status === 'completed');
        const scoresWithValues = completedAssignments.filter(p => p.score !== null);
        
        const completionRate = progressQuery.length > 0 
          ? Math.round((completedAssignments.length / progressQuery.length) * 100)
          : 0;
        
        const averageScore = scoresWithValues.length > 0
          ? Math.round(scoresWithValues.reduce((sum, p) => sum + (p.score || 0), 0) / scoresWithValues.length)
          : 0;
        
        const averageTimeSpent = completedAssignments.length > 0
          ? Math.round(completedAssignments.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / completedAssignments.length)
          : 0;

        // Calculate streak days (consecutive completion days)
        const completionDates = completedAssignments
          .filter(p => p.completedAt)
          .map(p => p.completedAt!.toISOString().split('T')[0])
          .sort();
        
        let streakDays = 0;
        if (completionDates.length > 0) {
          // Simplified streak calculation
          streakDays = Math.min(completionDates.length, 30); // Cap at 30 days
        }

        // Identify achievements
        const achievements = {
          highCompletionRate: completionRate >= 90,
          highAverageScore: averageScore >= 85,
          efficientLearning: averageTimeSpent <= 30 && averageScore >= 80,
          consistentProgress: streakDays >= 7,
          helpingOthers: false // Would need implementation
        };

        // Only include if student has outstanding performance
        const achievementCount = Object.values(achievements).filter(Boolean).length;
        
        if (achievementCount >= 2) {
          const recognitions = [];
          if (achievements.highCompletionRate) {
            recognitions.push('Outstanding assignment completion rate');
          }
          if (achievements.highAverageScore) {
            recognitions.push('Excellent academic performance');
          }
          if (achievements.efficientLearning) {
            recognitions.push('Efficient and effective learner');
          }
          if (achievements.consistentProgress) {
            recognitions.push('Consistent daily progress');
          }

          topPerformers.push({
            studentId: student.studentId,
            studentName: student.studentName,
            className: student.className,
            achievements,
            metrics: {
              completionRate,
              averageScore,
              averageTimeSpent,
              streakDays,
              assignmentsAheadOfSchedule: 0 // Would need implementation
            },
            recognitions
          });
        }
      }

      // Sort by overall performance (combination of score and completion rate)
      topPerformers.sort((a, b) => {
        const scoreA = (a.metrics.averageScore + a.metrics.completionRate) / 2;
        const scoreB = (b.metrics.averageScore + b.metrics.completionRate) / 2;
        return scoreB - scoreA;
      });

      return topPerformers.slice(0, 10); // Return top 10 performers
    } catch (error) {
      console.error('Error fetching top performers:', error);
      throw error;
    }
  }

  // Export system methods for DatabaseStorage
  async createExportJob(job: InsertExportJob): Promise<ExportJob> {
    const jobData = {
      ...job,
      includedFields: job.includedFields as any, // Type assertion for JSONB array field
      exportSettings: job.exportSettings as any // Type assertion for JSONB field
    };
    const [newJob] = await db.insert(exportJobs).values([jobData]).returning();
    return newJob;
  }

  async getExportJob(id: string): Promise<ExportJob | undefined> {
    const result = await db.select().from(exportJobs).where(eq(exportJobs.id, id));
    return result[0];
  }

  async getExportJobsByTeacher(teacherId: string): Promise<ExportJob[]> {
    return await db.select().from(exportJobs).where(eq(exportJobs.teacherId, teacherId));
  }

  async getExportJobsBySchool(schoolId: string): Promise<ExportJob[]> {
    return await db.select().from(exportJobs).where(eq(exportJobs.schoolId, schoolId));
  }

  async updateExportJob(id: string, job: Partial<InsertExportJob>): Promise<ExportJob> {
    const updateData = {
      ...job,
      updatedAt: new Date(),
      includedFields: job.includedFields ? (job.includedFields as any) : undefined,
      exportSettings: job.exportSettings ? (job.exportSettings as any) : undefined
    };
    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);
    
    const [updatedJob] = await db.update(exportJobs)
      .set(updateData)
      .where(eq(exportJobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteExportJob(id: string): Promise<void> {
    await db.delete(exportJobs).where(eq(exportJobs.id, id));
  }

  async getActiveExportJobs(): Promise<ExportJob[]> {
    return await db.select().from(exportJobs).where(eq(exportJobs.status, 'processing'));
  }

  async getExpiredExportJobs(): Promise<ExportJob[]> {
    return await db.select().from(exportJobs).where(
      and(
        eq(exportJobs.status, 'completed'),
        sql`${exportJobs.expiresAt} < NOW()`
      )
    );
  }

  async createExportTemplate(template: InsertExportTemplate): Promise<ExportTemplate> {
    const templateData = {
      ...template,
      includedFields: template.includedFields as any, // Type assertion for JSONB array field
      templateSettings: template.templateSettings as any // Type assertion for JSONB field
    };
    const [newTemplate] = await db.insert(exportTemplates).values([templateData]).returning();
    return newTemplate;
  }

  async getExportTemplate(id: string): Promise<ExportTemplate | undefined> {
    const result = await db.select().from(exportTemplates).where(eq(exportTemplates.id, id));
    return result[0];
  }

  async getExportTemplatesByTeacher(teacherId: string): Promise<ExportTemplate[]> {
    return await db.select().from(exportTemplates).where(
      and(
        eq(exportTemplates.teacherId, teacherId),
        eq(exportTemplates.isActive, true)
      )
    );
  }

  async getExportTemplatesBySchool(schoolId: string): Promise<ExportTemplate[]> {
    return await db.select().from(exportTemplates).where(
      and(
        eq(exportTemplates.schoolId, schoolId),
        eq(exportTemplates.isActive, true)
      )
    );
  }

  async getPublicExportTemplates(): Promise<ExportTemplate[]> {
    return await db.select().from(exportTemplates).where(
      and(
        eq(exportTemplates.isPublic, true),
        eq(exportTemplates.isActive, true)
      )
    );
  }

  async updateExportTemplate(id: string, template: Partial<InsertExportTemplate>): Promise<ExportTemplate> {
    const updateData = {
      ...template,
      updatedAt: new Date(),
      includedFields: template.includedFields ? (template.includedFields as any) : undefined,
      templateSettings: template.templateSettings ? (template.templateSettings as any) : undefined
    };
    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);
    
    const [updatedTemplate] = await db.update(exportTemplates)
      .set(updateData)
      .where(eq(exportTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteExportTemplate(id: string): Promise<void> {
    await db.delete(exportTemplates).where(eq(exportTemplates.id, id));
  }

  async createExportHistoryEntry(entry: InsertExportHistoryEntry): Promise<ExportHistoryEntry> {
    const [newEntry] = await db.insert(exportHistory).values(entry).returning();
    return newEntry;
  }

  async getExportHistory(jobId: string): Promise<ExportHistoryEntry[]> {
    return await db.select().from(exportHistory).where(eq(exportHistory.jobId, jobId));
  }

  async getExportHistoryByTeacher(teacherId: string): Promise<ExportHistoryEntry[]> {
    return await db.select().from(exportHistory).where(eq(exportHistory.teacherId, teacherId));
  }

  async generateStudentProgressReport(studentId: string, teacherId: string, dateRange?: { start: string; end: string }): Promise<StudentProgressReport> {
    // Get comprehensive student analytics
    const studentAnalytics = await this.getStudentAnalytics(studentId);
    
    // Add export metadata
    const exportMetadata = {
      generatedAt: new Date().toISOString(),
      generatedBy: teacherId,
      reportPeriod: dateRange || { start: '', end: '' },
      teacherComments: '',
      nextSteps: []
    };

    // Add parent meeting specific data
    const parentMeetingData = {
      keyHighlights: [],
      areasOfConcern: [],
      homeRecommendations: [],
      followUpActions: []
    };

    // Add visualization configs
    const visualizations = {
      progressChart: { type: 'line' as const, title: 'Progress Over Time', data: [] },
      comparisonChart: { type: 'bar' as const, title: 'Class Comparison', data: [] },
      trendsChart: { type: 'line' as const, title: 'Learning Trends', data: [] }
    };

    return {
      ...studentAnalytics,
      exportMetadata,
      parentMeetingData,
      visualizations
    };
  }

  async generateClassDataBackup(classId: string, teacherId: string, includeInactive?: boolean): Promise<ClassDataBackup> {
    // Get class information
    const [teacherClass] = await db
      .select()
      .from(teacherClasses)
      .where(eq(teacherClasses.id, classId));

    if (!teacherClass) {
      throw new Error('Class not found');
    }

    // Get teacher and school information
    const [teacher] = await db
      .select()
      .from(users)
      .where(eq(users.id, teacherId));

    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, teacherClass.schoolId || ''));

    const classInfo = {
      id: teacherClass.id,
      name: teacherClass.name,
      teacherName: teacher?.username || 'Unknown',
      schoolName: school?.name || 'Unknown',
      term: new Date().getFullYear().toString(),
      studentCount: 0
    };

    const exportMetadata = {
      exportedAt: new Date().toISOString(),
      exportedBy: teacherId,
      dataRange: { start: '', end: '' },
      includesFields: ['progress', 'assignments', 'feedback']
    };

    // Get students, assignments, and analytics
    const students: any[] = [];
    const assignments: any[] = [];
    const analytics = await this.getClassAnalytics(classId);
    
    const teacherNotes = {
      classNotes: '',
      studentSpecificNotes: []
    };

    return {
      classInfo,
      exportMetadata,
      students,
      assignments,
      analytics,
      teacherNotes
    };
  }

  async getExportableStudentData(studentIds: string[], teacherId: string): Promise<any[]> {
    // Implement basic student data export
    const studentData = [];
    
    for (const studentId of studentIds) {
      const [student] = await db
        .select()
        .from(studentAccounts)
        .where(eq(studentAccounts.id, studentId));

      if (student) {
        studentData.push({
          id: student.id,
          studentName: student.studentName,
          username: student.username,
          classId: student.classId,
          lastLogin: student.lastLogin
        });
      }
    }

    return studentData;
  }

  async getExportableClassData(classIds: string[], teacherId: string): Promise<any[]> {
    // Implement basic class data export
    const classData = [];
    
    for (const classId of classIds) {
      const analytics = await this.getClassAnalytics(classId);
      classData.push(analytics);
    }

    return classData;
  }

  async getExportableAssignmentData(assignmentIds: string[], teacherId: string): Promise<any[]> {
    // Implement basic assignment data export
    const assignmentData = [];
    
    for (const assignmentId of assignmentIds) {
      const [assignment] = await db
        .select()
        .from(lessonAssignments)
        .where(eq(lessonAssignments.id, assignmentId));

      if (assignment) {
        assignmentData.push(assignment);
      }
    }

    return assignmentData;
  }

  // Password reset token methods
  // Note: token should already be hashed by the caller (authRoutes.ts)
  async createPasswordResetToken(userId: string, hashedToken: string, expiresAt: Date): Promise<PasswordResetToken> {
    const tokenData: InsertPasswordResetToken = {
      userId,
      tokenHash: hashedToken, // Store the pre-hashed token
      expiresAt,
      usedAt: null
    };
    
    const [newToken] = await db.insert(passwordResetTokens).values(tokenData).returning();
    return newToken;
  }

  // Find token using hashed token
  async findPasswordResetToken(hashedToken: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.tokenHash, hashedToken),
        isNull(passwordResetTokens.usedAt),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
    
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(
        or(
          sql`${passwordResetTokens.expiresAt} < NOW()`,
          isNotNull(passwordResetTokens.usedAt)
        )
      );
  }

  // Student progress tracking methods
  async createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    const [newProgress] = await db.insert(studentProgress).values(progress).returning();
    return newProgress;
  }

  async getStudentProgress(studentId: string): Promise<StudentProgress[]> {
    return await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId))
      .orderBy(sql`${studentProgress.completedAt} DESC`);
  }

  async getStudentProgressByStudentId(studentId: string): Promise<StudentProgress[]> {
    return await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId))
      .orderBy(sql`${studentProgress.completedAt} DESC`);
  }

  async getStudentProgressByLesson(studentId: string, lessonId: string): Promise<StudentProgress[]> {
    return await db
      .select()
      .from(studentProgress)
      .where(and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.lessonId, lessonId)
      ))
      .orderBy(sql`${studentProgress.completedAt} DESC`);
  }

  async getClassProgress(classId: string): Promise<StudentProgress[]> {
    return await db
      .select({
        id: studentProgress.id,
        studentId: studentProgress.studentId,
        lessonId: studentProgress.lessonId,
        activityType: studentProgress.activityType,
        score: studentProgress.score,
        maxScore: studentProgress.maxScore,
        timeSpent: studentProgress.timeSpent,
        completedAt: studentProgress.completedAt,
        metadata: studentProgress.metadata,
      })
      .from(studentProgress)
      .innerJoin(studentAccounts, eq(studentProgress.studentId, studentAccounts.id))
      .where(eq(studentAccounts.classId, classId))
      .orderBy(sql`${studentProgress.completedAt} DESC`);
  }

  // Student activity tracking methods
  async logStudentActivity(activity: InsertStudentActivity): Promise<StudentActivity> {
    const [newActivity] = await db.insert(studentActivity).values(activity).returning();
    return newActivity;
  }

  async getStudentActivities(studentId: string, limit: number = 50): Promise<StudentActivity[]> {
    return await db
      .select()
      .from(studentActivity)
      .where(eq(studentActivity.studentId, studentId))
      .orderBy(sql`${studentActivity.createdAt} DESC`)
      .limit(limit);
  }

  async getClassActivities(classId: string, limit: number = 100): Promise<StudentActivity[]> {
    return await db
      .select({
        id: studentActivity.id,
        studentId: studentActivity.studentId,
        type: studentActivity.type,
        payload: studentActivity.payload,
        createdAt: studentActivity.createdAt,
      })
      .from(studentActivity)
      .innerJoin(studentAccounts, eq(studentActivity.studentId, studentAccounts.id))
      .where(eq(studentAccounts.classId, classId))
      .orderBy(sql`${studentActivity.createdAt} DESC`)
      .limit(limit);
  }

  // Analytics methods for progress tracking
  async getStudentProgressAnalytics(studentId: string): Promise<{
    totalActivities: number;
    averageScore: number;
    totalTimeSpent: number;
    activityBreakdown: { activityType: string; count: number; averageScore: number }[];
    recentProgress: StudentProgress[];
  }> {
    const progressData = await this.getStudentProgress(studentId);
    const recentProgress = progressData.slice(0, 10);
    
    const totalActivities = progressData.length;
    const totalTimeSpent = progressData.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const averageScore = totalActivities > 0 
      ? progressData.reduce((sum, p) => sum + (p.score || 0) / (p.maxScore || 1) * 100, 0) / totalActivities 
      : 0;

    // Create activity breakdown
    const activityMap = new Map<string, { count: number; totalScore: number; totalMaxScore: number }>();
    progressData.forEach(p => {
      const key = p.activityType || 'unknown';
      const existing = activityMap.get(key) || { count: 0, totalScore: 0, totalMaxScore: 0 };
      activityMap.set(key, {
        count: existing.count + 1,
        totalScore: existing.totalScore + (p.score || 0),
        totalMaxScore: existing.totalMaxScore + (p.maxScore || 1)
      });
    });

    const activityBreakdown = Array.from(activityMap.entries()).map(([activityType, data]) => ({
      activityType,
      count: data.count,
      averageScore: data.totalMaxScore > 0 ? (data.totalScore / data.totalMaxScore * 100) : 0
    }));

    return {
      totalActivities,
      averageScore,
      totalTimeSpent,
      activityBreakdown,
      recentProgress
    };
  }

  async getClassProgressAnalytics(classId: string): Promise<{
    totalStudents: number;
    averageScore: number;
    totalActivitiesCompleted: number;
    studentBreakdown: { studentId: string; studentName: string; averageScore: number; activitiesCount: number }[];
    activityTypeBreakdown: { activityType: string; count: number; averageScore: number }[];
    recentActivities: StudentActivity[];
  }> {
    const classProgress = await this.getClassProgress(classId);
    const classActivities = await this.getClassActivities(classId, 20);
    
    // Get all students in the class for breakdown
    const students = await db
      .select()
      .from(studentAccounts)
      .where(eq(studentAccounts.classId, classId));
    
    const totalStudents = students.length;
    const totalActivitiesCompleted = classProgress.length;
    
    // Calculate average score
    const averageScore = totalActivitiesCompleted > 0
      ? classProgress.reduce((sum, p) => sum + (p.score || 0) / (p.maxScore || 1) * 100, 0) / totalActivitiesCompleted
      : 0;

    // Student breakdown
    const studentMap = new Map<string, { count: number; totalScore: number; totalMaxScore: number; name: string }>();
    students.forEach(student => {
      studentMap.set(student.id, { 
        count: 0, 
        totalScore: 0, 
        totalMaxScore: 0, 
        name: student.studentName 
      });
    });

    classProgress.forEach(p => {
      const existing = studentMap.get(p.studentId);
      if (existing) {
        existing.count += 1;
        existing.totalScore += (p.score || 0);
        existing.totalMaxScore += (p.maxScore || 1);
      }
    });

    const studentBreakdown = Array.from(studentMap.entries()).map(([studentId, data]) => ({
      studentId,
      studentName: data.name,
      averageScore: data.totalMaxScore > 0 ? (data.totalScore / data.totalMaxScore * 100) : 0,
      activitiesCount: data.count
    }));

    // Activity type breakdown
    const activityTypeMap = new Map<string, { count: number; totalScore: number; totalMaxScore: number }>();
    classProgress.forEach(p => {
      const key = p.activityType || 'unknown';
      const existing = activityTypeMap.get(key) || { count: 0, totalScore: 0, totalMaxScore: 0 };
      activityTypeMap.set(key, {
        count: existing.count + 1,
        totalScore: existing.totalScore + (p.score || 0),
        totalMaxScore: existing.totalMaxScore + (p.maxScore || 1)
      });
    });

    const activityTypeBreakdown = Array.from(activityTypeMap.entries()).map(([activityType, data]) => ({
      activityType,
      count: data.count,
      averageScore: data.totalMaxScore > 0 ? (data.totalScore / data.totalMaxScore * 100) : 0
    }));

    return {
      totalStudents,
      averageScore,
      totalActivitiesCompleted,
      studentBreakdown,
      activityTypeBreakdown,
      recentActivities: classActivities
    };
  }

  // Vocabulary sets methods
  async createVocabularySet(set: InsertVocabularySet): Promise<VocabularySet> {
    const [newSet] = await db.insert(vocabularySets).values(set).returning();
    return newSet;
  }

  async getVocabularySets(): Promise<VocabularySet[]> {
    return await db.select().from(vocabularySets);
  }

  async getVocabularySet(id: string): Promise<VocabularySet | undefined> {
    const [result] = await db.select().from(vocabularySets).where(eq(vocabularySets.id, id));
    return result;
  }

  async updateVocabularySet(id: string, set: Partial<InsertVocabularySet>): Promise<VocabularySet> {
    const [updated] = await db
      .update(vocabularySets)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(vocabularySets.id, id))
      .returning();
    return updated;
  }

  async deleteVocabularySet(id: string): Promise<void> {
    await db.delete(vocabularySets).where(eq(vocabularySets.id, id));
  }

  async getPublishedVocabularySets(): Promise<VocabularySet[]> {
    return await db.select().from(vocabularySets).where(eq(vocabularySets.isPublished, true));
  }

  // Vocabulary words methods
  async createVocabularyWord(word: InsertVocabularyWord): Promise<VocabularyWord> {
    const [newWord] = await db.insert(vocabularyWords).values(word).returning();
    return newWord;
  }

  async getVocabularyWords(setId: string): Promise<VocabularyWord[]> {
    return await db
      .select()
      .from(vocabularyWords)
      .where(eq(vocabularyWords.setId, setId))
      .orderBy(vocabularyWords.orderIndex);
  }

  async getVocabularyWord(id: string): Promise<VocabularyWord | undefined> {
    const [result] = await db.select().from(vocabularyWords).where(eq(vocabularyWords.id, id));
    return result;
  }

  async updateVocabularyWord(id: string, word: Partial<InsertVocabularyWord>): Promise<VocabularyWord> {
    const [updated] = await db
      .update(vocabularyWords)
      .set({ ...word, updatedAt: new Date() })
      .where(eq(vocabularyWords.id, id))
      .returning();
    return updated;
  }

  async deleteVocabularyWord(id: string): Promise<void> {
    await db.delete(vocabularyWords).where(eq(vocabularyWords.id, id));
  }

  // Vocabulary exercises methods
  async createVocabularyExercise(exercise: InsertVocabularyExercise): Promise<VocabularyExercise> {
    const [newExercise] = await db.insert(vocabularyExercises).values(exercise).returning();
    return newExercise;
  }

  async getVocabularyExercises(setId: string): Promise<VocabularyExercise[]> {
    return await db
      .select()
      .from(vocabularyExercises)
      .where(eq(vocabularyExercises.setId, setId))
      .orderBy(vocabularyExercises.orderIndex);
  }

  async getVocabularyExercise(id: string): Promise<VocabularyExercise | undefined> {
    const [result] = await db.select().from(vocabularyExercises).where(eq(vocabularyExercises.id, id));
    return result;
  }

  async updateVocabularyExercise(id: string, exercise: Partial<InsertVocabularyExercise>): Promise<VocabularyExercise> {
    const [updated] = await db
      .update(vocabularyExercises)
      .set({ ...exercise, updatedAt: new Date() })
      .where(eq(vocabularyExercises.id, id))
      .returning();
    return updated;
  }

  async deleteVocabularyExercise(id: string): Promise<void> {
    await db.delete(vocabularyExercises).where(eq(vocabularyExercises.id, id));
  }

  async getActiveVocabularyExercises(setId: string): Promise<VocabularyExercise[]> {
    return await db
      .select()
      .from(vocabularyExercises)
      .where(and(eq(vocabularyExercises.setId, setId), eq(vocabularyExercises.isActive, true)))
      .orderBy(vocabularyExercises.orderIndex);
  }

  // Vocabulary attempts methods
  async createVocabularyAttempt(attempt: InsertVocabularyAttempt): Promise<VocabularyAttempt> {
    const [newAttempt] = await db.insert(vocabularyAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getVocabularyAttempts(exerciseId: string): Promise<VocabularyAttempt[]> {
    return await db
      .select()
      .from(vocabularyAttempts)
      .where(eq(vocabularyAttempts.exerciseId, exerciseId));
  }

  async getStudentVocabularyAttempts(studentId: string, exerciseId: string): Promise<VocabularyAttempt[]> {
    return await db
      .select()
      .from(vocabularyAttempts)
      .where(and(eq(vocabularyAttempts.studentId, studentId), eq(vocabularyAttempts.exerciseId, exerciseId)))
      .orderBy(sql`${vocabularyAttempts.createdAt} DESC`);
  }

  async getVocabularyAttempt(id: string): Promise<VocabularyAttempt | undefined> {
    const [result] = await db.select().from(vocabularyAttempts).where(eq(vocabularyAttempts.id, id));
    return result;
  }

  async updateVocabularyAttempt(id: string, attempt: Partial<InsertVocabularyAttempt>): Promise<VocabularyAttempt> {
    const [updated] = await db
      .update(vocabularyAttempts)
      .set({ ...attempt, updatedAt: new Date() })
      .where(eq(vocabularyAttempts.id, id))
      .returning();
    return updated;
  }

  // Vocabulary streak methods
  async createVocabularyStreak(streak: InsertVocabularyStreak): Promise<VocabularyStreak> {
    const [newStreak] = await db.insert(vocabularyStreaks).values(streak).returning();
    return newStreak;
  }

  async getVocabularyStreak(studentId: string): Promise<VocabularyStreak | undefined> {
    const [result] = await db
      .select()
      .from(vocabularyStreaks)
      .where(eq(vocabularyStreaks.studentId, studentId));
    return result;
  }

  async updateVocabularyStreak(id: string, streak: Partial<InsertVocabularyStreak>): Promise<VocabularyStreak> {
    const [updated] = await db
      .update(vocabularyStreaks)
      .set({ ...streak, updatedAt: new Date() })
      .where(eq(vocabularyStreaks.id, id))
      .returning();
    return updated;
  }

  // Flashcard progress methods
  async createFlashcardProgress(progress: InsertFlashcardProgress): Promise<FlashcardProgress> {
    const [newProgress] = await db.insert(flashcardProgress).values(progress).returning();
    return newProgress;
  }

  async getFlashcardProgress(studentId: string, wordId: string): Promise<FlashcardProgress | undefined> {
    const [result] = await db
      .select()
      .from(flashcardProgress)
      .where(and(eq(flashcardProgress.studentId, studentId), eq(flashcardProgress.wordId, wordId)));
    return result;
  }

  async getStudentFlashcardProgress(studentId: string, setId?: string): Promise<FlashcardProgress[]> {
    const conditions = [eq(flashcardProgress.studentId, studentId)];
    if (setId) {
      conditions.push(eq(flashcardProgress.setId, setId));
    }
    return await db
      .select()
      .from(flashcardProgress)
      .where(and(...conditions))
      .orderBy(sql`${flashcardProgress.updatedAt} DESC`);
  }

  async updateFlashcardProgress(id: string, progress: Partial<InsertFlashcardProgress>): Promise<FlashcardProgress> {
    const [updated] = await db
      .update(flashcardProgress)
      .set({ ...progress, updatedAt: new Date() })
      .where(eq(flashcardProgress.id, id))
      .returning();
    return updated;
  }

  async getWordsForReview(studentId: string, setId: string, limit: number = 20): Promise<FlashcardProgress[]> {
    return await db
      .select()
      .from(flashcardProgress)
      .where(and(
        eq(flashcardProgress.studentId, studentId),
        eq(flashcardProgress.setId, setId),
        lte(flashcardProgress.nextReviewDate, new Date())
      ))
      .orderBy(flashcardProgress.nextReviewDate)
      .limit(limit);
  }

  // Flashcard streak methods
  async createFlashcardStreak(streak: InsertFlashcardStreak): Promise<FlashcardStreak> {
    const [newStreak] = await db.insert(flashcardStreaks).values(streak).returning();
    return newStreak;
  }

  async getFlashcardStreak(studentId: string): Promise<FlashcardStreak | undefined> {
    const [result] = await db
      .select()
      .from(flashcardStreaks)
      .where(eq(flashcardStreaks.studentId, studentId));
    return result;
  }

  async updateFlashcardStreak(id: string, streak: Partial<InsertFlashcardStreak>): Promise<FlashcardStreak> {
    const [updated] = await db
      .update(flashcardStreaks)
      .set({ ...streak, updatedAt: new Date() })
      .where(eq(flashcardStreaks.id, id))
      .returning();
    return updated;
  }

  // Flashcard session methods
  async createFlashcardSession(session: InsertFlashcardSession): Promise<FlashcardSession> {
    const [newSession] = await db.insert(flashcardSessions).values(session).returning();
    return newSession;
  }

  async getFlashcardSessions(studentId: string, setId?: string): Promise<FlashcardSession[]> {
    const conditions = [eq(flashcardSessions.studentId, studentId)];
    if (setId) {
      conditions.push(eq(flashcardSessions.setId, setId));
    }
    return await db
      .select()
      .from(flashcardSessions)
      .where(and(...conditions))
      .orderBy(sql`${flashcardSessions.startedAt} DESC`);
  }

  async getFlashcardSession(id: string): Promise<FlashcardSession | undefined> {
    const [result] = await db.select().from(flashcardSessions).where(eq(flashcardSessions.id, id));
    return result;
  }

  async updateFlashcardSession(id: string, session: Partial<InsertFlashcardSession>): Promise<FlashcardSession> {
    const [updated] = await db
      .update(flashcardSessions)
      .set(session)
      .where(eq(flashcardSessions.id, id))
      .returning();
    return updated;
  }

  // Teacher feedback methods
  async createTeacherFeedback(feedback: InsertTeacherFeedback): Promise<TeacherFeedback> {
    const [newFeedback] = await db.insert(teacherFeedback).values(feedback).returning();
    return newFeedback;
  }

  async getTeacherFeedback(teacherId: string): Promise<TeacherFeedback[]> {
    return await db
      .select()
      .from(teacherFeedback)
      .where(eq(teacherFeedback.teacherId, teacherId))
      .orderBy(sql`${teacherFeedback.createdAt} DESC`);
  }

  async getStudentFeedback(studentId: string): Promise<TeacherFeedback[]> {
    return await db
      .select()
      .from(teacherFeedback)
      .where(eq(teacherFeedback.studentId, studentId))
      .orderBy(sql`${teacherFeedback.createdAt} DESC`);
  }

  async getFeedbackByAssignment(assignmentId: string): Promise<TeacherFeedback[]> {
    return await db
      .select()
      .from(teacherFeedback)
      .where(eq(teacherFeedback.assignmentId, assignmentId))
      .orderBy(sql`${teacherFeedback.createdAt} DESC`);
  }

  async getFeedbackByProgress(progressId: string): Promise<TeacherFeedback[]> {
    return await db
      .select()
      .from(teacherFeedback)
      .where(eq(teacherFeedback.progressId, progressId))
      .orderBy(sql`${teacherFeedback.createdAt} DESC`);
  }

  async getTeacherFeedbackById(id: string): Promise<TeacherFeedback | undefined> {
    const [result] = await db
      .select()
      .from(teacherFeedback)
      .where(eq(teacherFeedback.id, id));
    return result;
  }

  async updateTeacherFeedback(id: string, feedback: Partial<InsertTeacherFeedback>): Promise<TeacherFeedback> {
    const [updated] = await db
      .update(teacherFeedback)
      .set({ ...feedback, updatedAt: new Date() })
      .where(eq(teacherFeedback.id, id))
      .returning();
    return updated;
  }

  async deleteTeacherFeedback(id: string): Promise<void> {
    await db.delete(teacherFeedback).where(eq(teacherFeedback.id, id));
  }

  async markFeedbackAsRead(id: string, studentId: string): Promise<TeacherFeedback> {
    const [updated] = await db
      .update(teacherFeedback)
      .set({ studentHasRead: true, updatedAt: new Date() })
      .where(and(eq(teacherFeedback.id, id), eq(teacherFeedback.studentId, studentId)))
      .returning();
    return updated;
  }

  async getFeedbackRequiringFollowUp(teacherId: string): Promise<TeacherFeedback[]> {
    return await db
      .select()
      .from(teacherFeedback)
      .where(and(
        eq(teacherFeedback.teacherId, teacherId),
        eq(teacherFeedback.requiresFollowUp, true)
      ))
      .orderBy(sql`${teacherFeedback.createdAt} DESC`);
  }

  async getUnreadFeedbackCount(studentId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(teacherFeedback)
      .where(and(
        eq(teacherFeedback.studentId, studentId),
        eq(teacherFeedback.studentHasRead, false)
      ));
    return result[0]?.count || 0;
  }

  // Teacher and class management methods
  async getTeacherClasses(teacherId?: string): Promise<any[]> {
    if (teacherId) {
      return await db
        .select()
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, teacherId),
            isNull(teacherClasses.archivedAt)
          )
        )
        .orderBy(sql`${teacherClasses.createdAt} DESC`);
    } else {
      return await db
        .select()
        .from(teacherClasses)
        .where(isNull(teacherClasses.archivedAt))
        .orderBy(sql`${teacherClasses.createdAt} DESC`);
    }
  }

  async getStudentsByClassId(classId: string): Promise<any[]> {
    return await db
      .select()
      .from(studentAccounts)
      .where(eq(studentAccounts.classId, classId))
      .orderBy(sql`${studentAccounts.createdAt} DESC`);
  }
}

export const storage = new DatabaseStorage();

// Export db for direct access where needed
export { db };
