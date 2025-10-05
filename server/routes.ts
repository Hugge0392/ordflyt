import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { emailService } from "./emailService";
import emailTestRoutes from "./emailTestRoutes";
import { requireAuth, requireAnyAuth, requireRole, requireCsrf, requireTeacherLicense, requireStudentAuth, logAuditEvent } from "./auth";

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}
import { LessonGenerator } from "./lessonGenerator";
import { z } from "zod";
import { insertSentenceSchema, insertErrorReportSchema, insertPublishedLessonSchema, insertReadingLessonSchema, insertKlassKampGameSchema, insertLessonAssignmentSchema, insertStudentLessonProgressSchema, insertTeacherFeedbackSchema, insertExportJobSchema, insertExportTemplateSchema, insertExportHistorySchema, insertStudentProgressSchema, insertStudentActivitySchema, insertLessonCategorySchema, insertLessonTemplateSchema, insertTeacherLessonCustomizationSchema, insertStudentCurrencySchema, insertShopItemSchema, insertStudentPurchaseSchema, insertStudentAvatarSchema, insertStudentRoomSchema, insertHandRaisingSchema, insertCurrencyTransactionSchema, insertVocabularySetSchema, insertVocabularyWordSchema, insertVocabularyExerciseSchema, insertVocabularyAttemptSchema, vocabularyStatsResponseSchema, insertBlogPostSchema, insertNewsletterSubscriptionSchema } from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

// Destructure commonly used tables from schema for easier access
const { 
  studentLessonProgress, 
  lessonAssignments, 
  studentAccounts,
  readingLessons,
  lessonTemplates,
  lessonCategories,
  studentCurrency,
  shopItems,
  studentPurchases,
  studentAvatars,
  studentRooms,
  vocabularySets,
  vocabularyWords,
  studentProgress: studentProgressTable,
  blogPosts
} = schema;
import { KlassKampWebSocket } from "./klasskamp-websocket";
import { ClassroomWebSocket } from "./classroom-websocket";

// In-memory storage for student progress (would be replaced with database in production)
interface StudentProgress {
  studentId: string;
  studentName?: string;
  assignmentId: string;
  assignmentTitle?: string;
  lessonId?: string;
  completedAt: string;
  timeSpent: number;
  score: number;
  answers: any;
  needsHelp?: boolean;
}

const studentProgressStorage = new Map<string, StudentProgress[]>();
import { ttsService } from "./ttsService";
import { registerMigrationRoutes } from "./migration/migrationRoutes";
import { pdfExportService } from "./pdfExportService";

// Helper function to calculate estimated records for export jobs
async function calculateEstimatedRecords(type: string, classId?: string, studentId?: string): Promise<number> {
  try {
    switch (type) {
      case 'student':
        if (studentId) {
          const progress = await storage.getStudentProgressByStudentId(studentId);
          return progress.length;
        }
        return 50; // default estimate
      case 'class':
        if (classId) {
          const students = await storage.getStudentsByClassId(classId);
          return students.length * 20; // estimate progress records per student
        }
        return 200; // default estimate
      case 'teacher':
        const classes = await storage.getTeacherClasses();
        return classes.length * 100; // estimate records per class
      default:
        return 100;
    }
  } catch (error) {
    console.warn('Failed to calculate estimated records, using default', error);
    return 100;
  }
}

// Analytics validation schemas
const analyticsExportSchema = z.object({
  format: z.enum(['csv', 'json']).default('json'),
  type: z.enum(['teacher', 'class', 'student']),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional()
  }).optional()
});

const performanceComparisonSchema = z.object({
  compareBy: z.enum(['class', 'assignment', 'timeframe']).optional(),
  classIds: z.array(z.string()).optional(),
  assignmentIds: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
});

const progressTrendsSchema = z.object({
  start: z.string(),
  end: z.string(),
  granularity: z.enum(['day', 'week', 'month']).default('week')
});

const completionRatesSchema = z.object({
  groupBy: z.enum(['class', 'assignment', 'student']).default('class')
});

// Vocabulary stats validation schema
const vocabularyStatsQuerySchema = z.object({
  ids: z.string().optional().transform((str) => {
    if (!str) return [];
    return str.split(',').filter(Boolean);
  })
});

// Vocabulary PDF export validation schemas
const vocabularyPDFExportSchema = z.object({
  exportType: z.enum(['teacher', 'student', 'answer_key', 'complete']).default('teacher'),
  format: z.enum(['A4', 'Letter']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  colorScheme: z.enum(['default', 'professional', 'colorful', 'monochrome']).default('professional'),
  language: z.enum(['sv', 'en']).default('sv'),
  includeExercises: z.boolean().default(true),
  includeImages: z.boolean().default(true),
  includePhonetics: z.boolean().default(true),
  includeSynonymsAntonyms: z.boolean().default(true),
  exerciseTypes: z.array(z.string()).optional(),
  customHeader: z.object({
    schoolName: z.string().optional(),
    className: z.string().optional(),
    teacherName: z.string().optional(),
    date: z.string().optional()
  }).optional()
});

const batchVocabularyPDFExportSchema = z.object({
  setIds: z.array(z.string()).min(1, "At least one vocabulary set ID is required"),
  exportType: z.enum(['teacher', 'student', 'answer_key', 'complete']).default('teacher'),
  format: z.enum(['A4', 'Letter']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  colorScheme: z.enum(['default', 'professional', 'colorful', 'monochrome']).default('professional'),
  language: z.enum(['sv', 'en']).default('sv'),
  includeExercises: z.boolean().default(true),
  includeImages: z.boolean().default(true),
  includePhonetics: z.boolean().default(true),
  includeSynonymsAntonyms: z.boolean().default(true),
  customHeader: z.object({
    schoolName: z.string().optional(),
    className: z.string().optional(),
    teacherName: z.string().optional(),
    date: z.string().optional()
  }).optional()
});

const exerciseWorksheetPDFExportSchema = z.object({
  exerciseId: z.string(),
  exportType: z.enum(['teacher', 'student', 'answer_key']).default('student'),
  format: z.enum(['A4', 'Letter']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  colorScheme: z.enum(['default', 'professional', 'colorful', 'monochrome']).default('professional'),
  language: z.enum(['sv', 'en']).default('sv'),
  customHeader: z.object({
    schoolName: z.string().optional(),
    className: z.string().optional(),
    teacherName: z.string().optional(),
    date: z.string().optional()
  }).optional()
});

// CSV conversion helper functions
function convertTeacherAnalyticsToCSV(data: any): string {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Students', data.overview.totalStudents],
    ['Total Classes', data.overview.totalClasses],
    ['Active Assignments', data.overview.activeAssignments],
    ['Completed Assignments', data.overview.completedAssignments],
    ['Average Score', data.overview.averageScore],
    ['Average Completion Rate', data.overview.averageCompletionRate],
    ['Total Time Spent (min)', data.overview.totalTimeSpent]
  ];
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.join(',') + '\n';
  });
  
  // Add class breakdown
  csv += '\nClass Breakdown\n';
  csv += 'Class Name,Student Count,Average Score,Completion Rate,Struggling Students\n';
  data.classBreakdown.forEach((cls: any) => {
    csv += `${cls.className},${cls.studentCount},${cls.averageScore},${cls.completionRate},${cls.strugglingStudents}\n`;
  });
  
  return csv;
}

function convertClassAnalyticsToCSV(data: any): string {
  let csv = 'Student Performance\n';
  csv += 'Student Name,Average Score,Completion Rate,Time Spent,Assignments Completed,Last Activity,Needs Help\n';
  data.studentPerformance.forEach((student: any) => {
    csv += `${student.studentName},${student.averageScore},${student.completionRate},${student.timeSpent},${student.assignmentsCompleted},${student.lastActivity || 'N/A'},${student.needsHelp}\n`;
  });
  return csv;
}

function convertStudentAnalyticsToCSV(data: any): string {
  let csv = 'Student Analytics\n';
  csv += 'Metric,Value\n';
  csv += `Average Score,${data.averageScore}\n`;
  csv += `Completion Rate,${data.completionRate}\n`;
  csv += `Time Spent,${data.timeSpent}\n`;
  csv += `Assignments Completed,${data.assignmentsCompleted}\n`;
  return csv;
}

const updateProgressSchema = z.object({
  score: z.number().optional(),
  level: z.number().optional(),
  correctAnswers: z.number().optional(),
  wrongAnswers: z.number().optional(),
  currentSentenceIndex: z.number().optional(),
  completedSentences: z.array(z.string()).optional(),
  completedLevels: z.record(z.string(), z.number()).optional(),
  correctAnswersByWordClass: z.record(z.string(), z.number()).optional(),
});

// Simple HTML generator for reading lessons
function generateReadingLessonHTML(lesson: any): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lesson.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f8fafc;
        }
        .lesson-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .lesson-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .lesson-title {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .lesson-meta {
            opacity: 0.9;
            font-size: 1.1em;
        }
        .lesson-content {
            padding: 40px 30px;
        }
        .featured-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            border-radius: 8px;
            margin: 20px 0;
        }
        .pre-reading-questions {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
        }
        .questions-section {
            background: #f9fafb;
            padding: 30px;
            margin: 30px 0;
            border-radius: 8px;
        }
        .question {
            background: white;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .word-definitions {
            background: #fef7ff;
            border: 1px solid #e879f9;
            padding: 20px;
            margin: 30px 0;
            border-radius: 8px;
        }
        h2 { color: #374151; margin: 25px 0 15px 0; }
        h3 { color: #4b5563; margin: 20px 0 10px 0; }
        p { margin: 15px 0; }
        ul, ol { margin: 15px 0; padding-left: 30px; }
        blockquote { 
            border-left: 4px solid #d1d5db; 
            padding-left: 20px; 
            margin: 20px 0; 
            font-style: italic; 
            color: #6b7280; 
        }
        .page-break {
            border-top: 3px dashed #d1d5db;
            margin: 40px 0;
            padding: 20px 0;
            text-align: center;
            color: #9ca3af;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="lesson-container">
        <div class="lesson-header">
            <h1 class="lesson-title">${lesson.title}</h1>
            <div class="lesson-meta">
                ${lesson.gradeLevel ? `Årskurs ${lesson.gradeLevel}` : ''} • 
                ${lesson.subject || 'Svenska'} • 
                ${lesson.readingTime || 10} min
            </div>
        </div>
        
        <div class="lesson-content">
            ${lesson.featuredImage ? `<img src="${lesson.featuredImage}" alt="Utvald bild" class="featured-image" />` : ''}
            
            ${lesson.description ? `<p><strong>Beskrivning:</strong> ${lesson.description}</p>` : ''}
            
            ${lesson.preReadingQuestions && lesson.preReadingQuestions.length > 0 ? `
                <div class="pre-reading-questions">
                    <h3>Innan du läser - fundera på:</h3>
                    <ul>
                        ${lesson.preReadingQuestions.map((q: any) => `<li>${q.question}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="main-content">
                ${lesson.content || ''}
            </div>
            
            ${lesson.questions && lesson.questions.length > 0 ? `
                <div class="questions-section">
                    <h3>Frågor om texten</h3>
                    ${lesson.questions.map((q: any, index: number) => `
                        <div class="question">
                            <p><strong>Fråga ${index + 1}:</strong> ${q.question}</p>
                            ${q.alternatives ? `
                                <ul>
                                    ${q.alternatives.map((alt: string, i: number) => `
                                        <li${i === q.correctAnswer ? ' style="font-weight: bold; color: #059669;"' : ''}>${alt}</li>
                                    `).join('')}
                                </ul>
                            ` : ''}
                            ${q.explanation ? `<p><em>Förklaring: ${q.explanation}</em></p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${lesson.wordDefinitions && lesson.wordDefinitions.length > 0 ? `
                <div class="word-definitions">
                    <h3>Ordförklaringar</h3>
                    ${lesson.wordDefinitions.map((def: any) => `
                        <p><strong>${def.word}:</strong> ${def.definition}</p>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all word classes
  app.get("/api/word-classes", async (req, res) => {
    try {
      const wordClasses = await storage.getWordClasses();
      res.json(wordClasses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch word classes" });
    }
  });

  // Get all sentences
  app.get("/api/sentences", async (req, res) => {
    try {
      const sentences = await storage.getSentences();
      res.json(sentences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sentences" });
    }
  });

  // Get sentences by level
  app.get("/api/sentences/level/:level", async (req, res) => {
    try {
      const level = parseInt(req.params.level);
      if (isNaN(level)) {
        return res.status(400).json({ message: "Invalid level parameter" });
      }
      const sentences = await storage.getSentencesByLevel(level);
      res.json(sentences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sentences by level" });
    }
  });

  // Get sentences by word class and level
  app.get("/api/sentences/wordclass/:wordClass/level/:level", async (req, res) => {
    try {
      const { wordClass } = req.params;
      const level = parseInt(req.params.level);
      if (isNaN(level)) {
        return res.status(400).json({ message: "Invalid level parameter" });
      }
      
      // Add level access validation
      const gameProgress = await storage.getGameProgress();
      const completedLevel = gameProgress.completedLevels?.[wordClass] || 0;
      
      console.log(`🎯 DEBUG: Requested ${wordClass} level ${level}. Completed level: ${completedLevel}`);
      
      // Only allow levels 1-4 now
      if (level > 4) {
        return res.status(404).json({ message: "Nivån finns inte" });
      }
      
      // Allow access to level 1 always, or if previous level is completed
      if (level === 1 || level <= completedLevel + 1) {
        const sentences = await storage.getSentencesByWordClassAndLevel(wordClass, level);
        console.log(`🎯 DEBUG: Access granted to level ${level}. Found ${sentences.length} sentences.`);
        res.json(sentences);
      } else {
        const requiredLevel = level - 1;
        console.log(`🎯 DEBUG: Access denied to level ${level}. Must complete level ${requiredLevel} first.`);
        res.status(403).json({ 
          message: `Du måste klara nivå ${requiredLevel} först innan du kan spela nivå ${level}`,
          requiredLevel: requiredLevel,
          currentLevel: completedLevel
        });
      }
    } catch (error) {
      console.error(`🎯 DEBUG: Error fetching sentences:`, error);
      res.status(500).json({ message: "Failed to fetch sentences by word class and level" });
    }
  });

  // Get game progress
  app.get("/api/game-progress", async (req, res) => {
    try {
      const progress = await storage.getGameProgress();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game progress" });
    }
  });

  // Update game progress
  app.patch("/api/game-progress", requireCsrf, async (req, res) => {
    try {
      const validatedData = updateProgressSchema.parse(req.body);
      
      // Validate completed levels to prevent cheating
      if (validatedData.completedLevels) {
        const currentProgress = await storage.getGameProgress();
        
        for (const [wordClass, newLevel] of Object.entries(validatedData.completedLevels)) {
          const currentLevel = currentProgress.completedLevels?.[wordClass] || 0;
          const correctAnswers = currentProgress.correctAnswersByWordClass?.[wordClass] || 0;
          
          // Special validation for level 1 -> 2: Require 10 correct answers
          if (currentLevel === 1 && newLevel === 2 && correctAnswers < 10) {
            console.log(`🎯 DEBUG: Not enough correct answers for level 2 access: ${correctAnswers}/10`);
            return res.status(400).json({ 
              message: `Du behöver ${10 - correctAnswers} till korrekta svar på nivå 1 innan du kan gå vidare till nivå 2.`,
              wordClass,
              currentLevel,
              correctAnswers,
              requiredAnswers: 10
            });
          }
          
          // Only allow progression to next level or maintaining current level
          if (newLevel > currentLevel + 1) {
            console.log(`🎯 DEBUG: Invalid level progression attempt for ${wordClass}: ${currentLevel} -> ${newLevel}`);
            return res.status(400).json({ 
              message: `Du kan inte hoppa från nivå ${currentLevel} till nivå ${newLevel}. Du måste klara nivå ${currentLevel + 1} först.`,
              wordClass,
              currentLevel,
              attemptedLevel: newLevel
            });
          }
          
          console.log(`🎯 DEBUG: Level progression validated for ${wordClass}: ${currentLevel} -> ${newLevel}`);
        }
      }
      
      const progress = await storage.updateGameProgress(validatedData);
      console.log(`🎯 DEBUG: Progress updated successfully:`, progress.completedLevels);
      res.json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      console.error(`🎯 DEBUG: Error updating progress:`, error);
      res.status(500).json({ message: "Failed to update game progress" });
    }
  });

  // Reset game progress
  app.post("/api/game-progress/reset", requireCsrf, async (req, res) => {
    try {
      const progress = await storage.resetGameProgress();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to reset game progress" });
    }
  });

  // ===== ADMIN ENDPOINTS =====
  
  // Get all sentences for admin
  app.get("/api/admin/sentences", async (req, res) => {
    try {
      const sentences = await storage.getSentences();
      res.json(sentences);
    } catch (error) {
      console.error("Error fetching admin sentences:", error);
      res.status(500).json({ message: "Failed to fetch sentences" });
    }
  });

  // Get single sentence for editing
  app.get("/api/admin/sentences/:id", async (req, res) => {
    try {
      const sentence = await storage.getSentenceById(req.params.id);
      if (!sentence) {
        return res.status(404).json({ message: "Sentence not found" });
      }
      res.json(sentence);
    } catch (error) {
      console.error("Error fetching sentence:", error);
      res.status(500).json({ message: "Failed to fetch sentence" });
    }
  });

  // Create new sentence
  app.post("/api/admin/sentences", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validatedData = insertSentenceSchema.parse(req.body);
      const sentence = await storage.createSentence(validatedData);
      res.status(201).json(sentence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sentence data", errors: error.errors });
      }
      console.error("Error creating sentence:", error);
      res.status(500).json({ message: "Failed to create sentence" });
    }
  });

  // Update sentence
  app.put("/api/admin/sentences/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validatedData = insertSentenceSchema.partial().parse(req.body);
      const sentence = await storage.updateSentence(req.params.id, validatedData);
      res.json(sentence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sentence data", errors: error.errors });
      }
      console.error("Error updating sentence:", error);
      res.status(500).json({ message: "Failed to update sentence" });
    }
  });

  // Delete sentence
  app.delete("/api/admin/sentences/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      await storage.deleteSentence(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sentence:", error);
      res.status(500).json({ message: "Failed to delete sentence" });
    }
  });

  // ===== ERROR REPORT ENDPOINTS =====
  
  // Create error report
  app.post("/api/error-reports", requireCsrf, async (req, res) => {
    try {
      const validatedData = insertErrorReportSchema.parse(req.body);
      const errorReport = await storage.createErrorReport(validatedData);
      res.status(201).json(errorReport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid error report data", errors: error.errors });
      }
      console.error("Error creating error report:", error);
      res.status(500).json({ message: "Failed to create error report" });
    }
  });

  // Get all error reports (admin)
  app.get("/api/admin/error-reports", async (req, res) => {
    try {
      const errorReports = await storage.getErrorReports();
      res.json(errorReports);
    } catch (error) {
      console.error("Error fetching error reports:", error);
      res.status(500).json({ message: "Failed to fetch error reports" });
    }
  });

  // Update error report status (admin)
  app.patch("/api/admin/error-reports/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const updates = req.body;
      const errorReport = await storage.updateErrorReport(req.params.id, updates);
      res.json(errorReport);
    } catch (error) {
      console.error("Error updating error report:", error);
      res.status(500).json({ message: "Failed to update error report" });
    }
  });

  // Delete error report (admin)
  app.delete("/api/admin/error-reports/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      await storage.deleteErrorReport(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting error report:", error);
      res.status(500).json({ message: "Failed to delete error report" });
    }
  });

  // Object storage endpoints
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Direct upload endpoint using multer for file handling
  const multer = (await import('multer')).default;
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  app.post("/api/upload-direct", requireAuth, requireCsrf, upload.single('file'), async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      console.log("Direct upload received:", req.file.originalname, "size:", req.file.size);
      
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const { randomUUID } = await import('crypto');
      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/uploads/${objectId}`;
      
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Upload directly to bucket
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype || 'application/octet-stream',
        },
      });
      
      const objectPath = `/objects/uploads/${objectId}`;
      console.log("Direct upload successful, objectPath:", objectPath);
      
      res.json({ 
        success: true, 
        objectPath,
        url: objectPath // För Uppy-kompatibilitet
      });
    } catch (error) {
      console.error("Direct upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post("/api/objects/upload", requireAuth, requireCsrf, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      // Derivera ett /objects-path redan nu (utan att behöva roundtrip efteråt)
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Removed - no longer needed since objectPath is returned directly from /api/objects/upload

  // Published lesson endpoints
  app.post("/api/lessons/publish", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      console.log("Received publish request:", req.body);
      const validatedData = insertPublishedLessonSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      // Skapa bara en databas-post - ingen filgenerering behövs
      const lesson = await storage.createPublishedLesson(validatedData);
      console.log("Created published lesson:", lesson.id);
      
      res.json(lesson);
    } catch (error) {
      console.error("Failed to publish lesson:", error);
      res.status(500).json({ message: "Failed to publish lesson" });
    }
  });

  app.get("/api/lessons/published", async (req, res) => {
    try {
      const lessons = await storage.getPublishedLessons();
      res.json(lessons);
    } catch (error) {
      console.error("Failed to fetch published lessons:", error);
      res.status(500).json({ message: "Failed to fetch published lessons" });
    }
  });

  app.get("/api/lessons/published/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getPublishedLesson(id);
      if (!lesson) {
        return res.status(404).json({ message: "Published lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Failed to fetch published lesson:", error);
      res.status(500).json({ message: "Failed to fetch published lesson" });
    }
  });

  app.get("/api/lessons/published/wordclass/:wordClass", async (req, res) => {
    try {
      const { wordClass } = req.params;
      const lessons = await storage.getPublishedLessonsByWordClass(wordClass);
      res.json(lessons);
    } catch (error) {
      console.error("Failed to fetch published lessons by word class:", error);
      res.status(500).json({ message: "Failed to fetch published lessons by word class" });
    }
  });

  app.put("/api/lessons/published/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      console.log("Received update request for lesson:", req.params.id, req.body);
      const validatedData = insertPublishedLessonSchema.parse(req.body);
      
      // Uppdatera bara databas-posten - ingen filgenerering behövs
      const lesson = await storage.updatePublishedLesson(req.params.id, validatedData);
      console.log("Updated published lesson:", lesson.id);
      
      res.json(lesson);
    } catch (error) {
      console.error("Failed to update published lesson:", error);
      res.status(500).json({ message: "Failed to update published lesson" });
    }
  });

  app.delete("/api/lessons/published/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePublishedLesson(id);
      res.json({ message: "Lesson deleted successfully" });
    } catch (error) {
      console.error("Failed to delete published lesson:", error);
      res.status(500).json({ message: "Failed to delete published lesson" });
    }
  });

  // Draft lesson endpoints
  app.post("/api/lessons/drafts", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const draft = await storage.createLessonDraft(req.body);
      res.json(draft);
    } catch (error) {
      console.error("Failed to create lesson draft:", error);
      res.status(500).json({ message: "Failed to create lesson draft" });
    }
  });

  app.get("/api/lessons/drafts", async (req, res) => {
    try {
      const drafts = await storage.getLessonDrafts();
      res.json(drafts);
    } catch (error) {
      console.error("Failed to fetch lesson drafts:", error);
      res.status(500).json({ message: "Failed to fetch lesson drafts" });
    }
  });

  app.get("/api/lessons/drafts/:id", async (req, res) => {
    try {
      const draft = await storage.getLessonDraft(req.params.id);
      if (!draft) {
        return res.status(404).json({ message: "Lesson draft not found" });
      }
      res.json(draft);
    } catch (error) {
      console.error("Failed to fetch lesson draft:", error);
      res.status(500).json({ message: "Failed to fetch lesson draft" });
    }
  });

  app.put("/api/lessons/drafts/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const draft = await storage.updateLessonDraft(req.params.id, req.body);
      res.json(draft);
    } catch (error) {
      console.error("Failed to update lesson draft:", error);
      res.status(500).json({ message: "Failed to update lesson draft" });
    }
  });

  app.delete("/api/lessons/drafts/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      await storage.deleteLessonDraft(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lesson draft:", error);
      res.status(500).json({ message: "Failed to delete lesson draft" });
    }
  });

  // ===== READING LESSON ENDPOINTS =====

  // Create reading lesson
  app.post("/api/reading-lessons", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validatedData = insertReadingLessonSchema.parse(req.body);
      const lesson = await storage.createReadingLesson(validatedData);
      res.status(201).json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid reading lesson data", errors: error.errors });
      }
      console.error("Error creating reading lesson:", error);
      res.status(500).json({ message: "Failed to create reading lesson" });
    }
  });

  // Get all reading lessons
  app.get("/api/reading-lessons", async (req, res) => {
    try {
      const lessons = await storage.getReadingLessons();
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching reading lessons:", error);
      res.status(500).json({ message: "Failed to fetch reading lessons" });
    }
  });

  // Get published reading lessons (must be before the :id route)
  app.get("/api/reading-lessons/published", async (req, res) => {
    try {
      const lessons = await storage.getPublishedReadingLessons();
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching published reading lessons:", error);
      res.status(500).json({ message: "Failed to fetch published reading lessons" });
    }
  });

  // Get single reading lesson (handles both published and preview)
  app.get("/api/reading-lessons/:id", async (req, res) => {
    try {
      const isPreview = req.query.preview === 'true';
      const lesson = isPreview
        ? await storage.getReadingLessonById(req.params.id) // Allow access to unpublished for preview
        : await storage.getReadingLesson(req.params.id); // Only published lessons normally

      if (!lesson) {
        return res.status(404).json({ message: "Reading lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching reading lesson:", error);
      res.status(500).json({ message: "Failed to fetch reading lesson" });
    }
  });


  // Update reading lesson
  app.put("/api/reading-lessons/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      console.log('[API UPDATE] Received lesson update:', {
        id: req.params.id,
        title: req.body.title,
        contentLength: req.body.content?.length || 0,
        pagesCount: req.body.pages?.length || 0
      });
      
      // Use partial validation to allow updates of individual fields
      const validatedData = insertReadingLessonSchema.partial().parse(req.body);
      
      console.log('[API UPDATE] Validated data:', {
        title: validatedData.title,
        contentLength: validatedData.content?.length || 0,
        pagesCount: validatedData.pages?.length || 0
      });
      
      const lesson = await storage.updateReadingLesson(req.params.id, validatedData);
      
      console.log('[API UPDATE] Updated lesson:', {
        id: lesson.id,
        title: lesson.title,
        contentLength: lesson.content?.length || 0,
        pagesCount: lesson.pages?.length || 0
      });
      
      res.json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API UPDATE] Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid reading lesson data", errors: error.errors });
      }
      console.error("Error updating reading lesson:", error);
      res.status(500).json({ message: "Failed to update reading lesson" });
    }
  });

  // Delete reading lesson
  app.delete("/api/reading-lessons/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      await storage.deleteReadingLesson(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reading lesson:", error);
      res.status(500).json({ message: "Failed to delete reading lesson" });
    }
  });

  // Export reading lesson as HTML
  app.get("/api/reading-lessons/:id/export", async (req, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getReadingLesson(id);
      
      if (!lesson) {
        return res.status(404).json({ message: "Reading lesson not found" });
      }

      // Generate simple HTML export
      const htmlContent = generateReadingLessonHTML(lesson);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${lesson.title.replace(/\s+/g, '-').toLowerCase()}.html"`);
      res.send(htmlContent);
    } catch (error) {
      console.error("Failed to export reading lesson:", error);
      res.status(500).json({ message: "Failed to export reading lesson" });
    }
  });

  // Email test routes
  app.use('/api/email', emailTestRoutes);

  // Serve generated lesson files statically
  app.use('/generated-lessons', express.static(path.join(process.cwd(), 'generated-lessons')));

  // Removed duplicate - object storage upload endpoint is defined above

  app.put("/api/lesson-images", requireAuth, requireCsrf, async (req, res) => {
    try {
      const { imageURL } = req.body;
      if (!imageURL) {
        return res.status(400).json({ error: "imageURL is required" });
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetLessonImagePath(imageURL);

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error processing lesson image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof Error && error.name === "ObjectNotFoundError") {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // KlassKamp API endpoints
  app.post("/api/klasskamp/create", requireCsrf, async (req, res) => {
    try {
      const { teacherName, wordClassId, questionCount } = req.body;
      
      if (!teacherName || !wordClassId) {
        return res.status(400).json({ message: "Teacher name and word class required" });
      }

      // Generate unique 6-digit code
      let code: string;
      do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
      } while (await storage.getKlassKampGameByCode(code));

      const game = await storage.createKlassKampGame({
        code,
        teacherName,
        wordClassId,
        questionCount: questionCount || 10,
        status: 'waiting'
      });

      res.json({ gameId: game.id, code: game.code });
    } catch (error) {
      console.error('Error creating KlassKamp game:', error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.get("/api/klasskamp/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const game = await storage.getKlassKampGameByCode(code);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const players = await storage.getKlassKampPlayers(game.id);
      res.json({ game, players });
    } catch (error) {
      console.error('Error fetching KlassKamp game:', error);
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  // Text-to-Speech API endpoints
  app.post("/api/tts/synthesize", requireCsrf, async (req, res) => {
    try {
      const { text, voice, rate, pitch } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required and must be a string" });
      }

      if (text.length > 5000) {
        return res.status(400).json({ error: "Text is too long (max 5000 characters)" });
      }

      const audioBuffer = await ttsService.synthesizeSpeech({
        text,
        voice,
        rate,
        pitch
      });

      // Set proper audio headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Send the raw audio buffer
      res.send(audioBuffer);
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      
      // For audio endpoint errors, set text/plain to avoid confusing the frontend
      res.setHeader('Content-Type', 'text/plain');
      res.status(500).send('Speech synthesis failed');
    }
  });

  // Chunked TTS synthesis for faster startup
  app.post("/api/tts/synthesize-chunked", requireCsrf, async (req, res) => {
    try {
      const { text, voice, rate, pitch, maxChunkLength } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required and must be a string" });
      }

      if (text.length > 10000) {
        return res.status(400).json({ error: "Text is too long for chunked processing (max 10000 characters)" });
      }

      const chunks = await ttsService.synthesizeChunkedSpeech({
        text,
        voice,
        rate,
        pitch,
        maxChunkLength
      });

      // Create response with base64 encoded audio for JSON transport
      const responseChunks = chunks.map(chunk => ({
        index: chunk.index,
        text: chunk.text,
        audio: chunk.audioBuffer.toString('base64'),
        size: chunk.audioBuffer.length
      }));

      res.json({ 
        chunks: responseChunks,
        totalChunks: chunks.length,
        totalSize: chunks.reduce((sum, chunk) => sum + chunk.audioBuffer.length, 0)
      });

    } catch (error) {
      console.error('Error synthesizing chunked speech:', error);
      res.status(500).json({ error: "Chunked speech synthesis failed", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/tts/voices", (req, res) => {
    try {
      const voices = ttsService.getAvailableVoices();
      res.json({ voices });
    } catch (error) {
      console.error('Error getting available voices:', error);
      res.status(500).json({ error: "Failed to get available voices" });
    }
  });

  // Register migration routes
  registerMigrationRoutes(app);

  // ===== BLOG/LESSON MATERIALS ENDPOINTS =====
  
  // Blog posts query validation schema
  const blogPostsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    category: z.string().uuid().optional(),
  });

  // Get published blog posts (public)
  app.get("/api/blog/posts", async (req, res) => {
    try {
      const validation = blogPostsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: validation.error.errors 
        });
      }
      
      const { page, limit, category } = validation.data;
      const offset = (page - 1) * limit;

      let whereCondition = eq(schema.blogPosts.isPublished, true);
      if (category) {
        whereCondition = and(whereCondition, eq(schema.blogPosts.categoryId, category));
      }

      const posts = await db
        .select({
          id: schema.blogPosts.id,
          title: schema.blogPosts.title,
          slug: schema.blogPosts.slug,
          excerpt: schema.blogPosts.excerpt,
          heroImageUrl: schema.blogPosts.heroImageUrl,
          downloadFileName: schema.blogPosts.downloadFileName,
          downloadFileType: schema.blogPosts.downloadFileType,
          categoryId: schema.blogPosts.categoryId,
          tags: schema.blogPosts.tags,
          publishedAt: schema.blogPosts.publishedAt,
          authorName: schema.blogPosts.authorName,
          viewCount: schema.blogPosts.viewCount,
          downloadCount: schema.blogPosts.downloadCount,
        })
        .from(schema.blogPosts)
        .where(whereCondition)
        .orderBy(desc(schema.blogPosts.publishedAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.blogPosts)
        .where(whereCondition);

      res.json({
        posts,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  // Get single blog post by slug (public)
  app.get("/api/blog/posts/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;

      const post = await db
        .select()
        .from(schema.blogPosts)
        .where(and(eq(schema.blogPosts.slug, slug), eq(schema.blogPosts.isPublished, true)))
        .limit(1);

      if (!post[0]) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      // Increment view count
      await db
        .update(schema.blogPosts)
        .set({ viewCount: sql`${schema.blogPosts.viewCount} + 1` })
        .where(eq(schema.blogPosts.id, post[0].id));

      res.json(post[0]);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // Download file endpoint (tracks downloads)
  app.get("/api/blog/download/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;

      const post = await db
        .select({
          id: schema.blogPosts.id,
          downloadFileUrl: schema.blogPosts.downloadFileUrl,
          downloadFileName: schema.blogPosts.downloadFileName,
        })
        .from(schema.blogPosts)
        .where(and(eq(schema.blogPosts.slug, slug), eq(schema.blogPosts.isPublished, true)))
        .limit(1);

      if (!post[0] || !post[0].downloadFileUrl) {
        return res.status(404).json({ message: "Download not found" });
      }

      // Increment download count
      await db
        .update(schema.blogPosts)
        .set({ downloadCount: sql`${schema.blogPosts.downloadCount} + 1` })
        .where(eq(schema.blogPosts.id, post[0].id));

      // In a real app, you'd stream the file from cloud storage
      // For now, just redirect to the file URL
      res.redirect(post[0].downloadFileUrl);
    } catch (error) {
      console.error("Error handling download:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // ===== ADMIN BLOG ENDPOINTS =====

  // Helper function: Generate SEO-optimized slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/å/g, 'a')
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Helper function: Auto-generate meta description from content (first 150-160 chars)
  const generateMetaDescription = (content: string): string => {
    const textContent = content.replace(/<[^>]*>/g, ''); // Strip HTML
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);

    let description = '';
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (description.length + trimmed.length < 160) {
        description += (description ? '. ' : '') + trimmed;
      } else {
        break;
      }
    }

    return description.slice(0, 160);
  };

  // Get all blog posts (admin - includes unpublished)
  app.get("/api/admin/blog/posts", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const posts = await db
        .select()
        .from(schema.blogPosts)
        .orderBy(desc(schema.blogPosts.createdAt));

      res.json(posts);
    } catch (error) {
      console.error("Error fetching admin blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  // Get single blog post by slug (admin preview - includes unpublished)
  app.get("/api/admin/blog/posts/:slug/preview", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const slug = req.params.slug;

      const post = await db
        .select()
        .from(schema.blogPosts)
        .where(eq(schema.blogPosts.slug, slug))
        .limit(1);

      if (!post[0]) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.json(post[0]);
    } catch (error) {
      console.error("Error fetching blog post preview:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // Create new blog post (admin)
  app.post("/api/admin/blog/posts", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validation = insertBlogPostSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid blog post data",
          errors: validation.error.errors
        });
      }

      const data = validation.data;

      // Auto-generate slug from title if not provided
      if (!data.slug) {
        data.slug = generateSlug(data.title);
      }

      // Auto-generate meta description if not provided
      if (!data.metaDescription && data.content) {
        data.metaDescription = generateMetaDescription(data.content);
      }

      // Check if slug already exists
      const existingSlug = await db
        .select()
        .from(schema.blogPosts)
        .where(eq(schema.blogPosts.slug, data.slug))
        .limit(1);

      if (existingSlug[0]) {
        // Add unique suffix to slug
        data.slug = `${data.slug}-${Date.now()}`;
      }

      // Set author info from session
      const user = (req as any).user;
      data.authorId = user.id;
      data.authorName = user.username || "Ordflyt Team";

      const newPost = await db
        .insert(schema.blogPosts)
        .values(data)
        .returning();

      res.status(201).json(newPost[0]);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  // Update blog post (admin)
  app.put("/api/admin/blog/posts/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validation = insertBlogPostSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid blog post data",
          errors: validation.error.errors
        });
      }

      const data = validation.data;

      // Auto-generate slug if title changed
      if (data.title && !data.slug) {
        data.slug = generateSlug(data.title);
      }

      // Auto-generate meta description if content changed but no meta provided
      if (data.content && !data.metaDescription) {
        data.metaDescription = generateMetaDescription(data.content);
      }

      // If slug changed, check uniqueness
      if (data.slug) {
        const existingSlug = await db
          .select()
          .from(schema.blogPosts)
          .where(and(
            eq(schema.blogPosts.slug, data.slug),
            sql`${schema.blogPosts.id} != ${req.params.id}`
          ))
          .limit(1);

        if (existingSlug[0]) {
          return res.status(400).json({ message: "Slug already exists" });
        }
      }

      const updatedPost = await db
        .update(schema.blogPosts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.blogPosts.id, req.params.id))
        .returning();

      if (!updatedPost[0]) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.json(updatedPost[0]);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  // Delete blog post (admin)
  app.delete("/api/admin/blog/posts/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const deleted = await db
        .delete(schema.blogPosts)
        .where(eq(schema.blogPosts.id, req.params.id))
        .returning();

      if (!deleted[0]) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // Publish blog post (admin)
  app.post("/api/admin/blog/posts/:id/publish", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const updatedPost = await db
        .update(schema.blogPosts)
        .set({
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.blogPosts.id, req.params.id))
        .returning();

      if (!updatedPost[0]) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.json(updatedPost[0]);
    } catch (error) {
      console.error("Error publishing blog post:", error);
      res.status(500).json({ message: "Failed to publish blog post" });
    }
  });

  // Unpublish blog post (admin)
  app.post("/api/admin/blog/posts/:id/unpublish", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const updatedPost = await db
        .update(schema.blogPosts)
        .set({
          isPublished: false,
          updatedAt: new Date()
        })
        .where(eq(schema.blogPosts.id, req.params.id))
        .returning();

      if (!updatedPost[0]) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      res.json(updatedPost[0]);
    } catch (error) {
      console.error("Error unpublishing blog post:", error);
      res.status(500).json({ message: "Failed to unpublish blog post" });
    }
  });

  // Newsletter subscription endpoint (public)
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const validation = insertNewsletterSubscriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid subscription data", 
          errors: validation.error.errors 
        });
      }
      
      const { email, name, categories } = validation.data;

      // Check if already subscribed
      const existing = await db
        .select()
        .from(schema.newsletterSubscriptions)
        .where(eq(schema.newsletterSubscriptions.email, email))
        .limit(1);

      if (existing[0]) {
        if (existing[0].isActive) {
          return res.status(400).json({ message: "Already subscribed" });
        } else {
          // Reactivate subscription
          await db
            .update(schema.newsletterSubscriptions)
            .set({ 
              isActive: true, 
              unsubscribedAt: null,
              categories: categories || [],
              name: name || existing[0].name,
            })
            .where(eq(schema.newsletterSubscriptions.id, existing[0].id));
          
          return res.json({ message: "Subscription reactivated!" });
        }
      }

      // Create new subscription
      const newSubscription = await db
        .insert(schema.newsletterSubscriptions)
        .values({
          email,
          name: name || null,
          categories: categories || [],
          confirmedAt: new Date(), // Auto-confirm for now
        })
        .returning();

      res.status(201).json({ 
        message: "Successfully subscribed!", 
        subscription: newSubscription[0] 
      });
    } catch (error) {
      console.error("Error subscribing to newsletter:", error);
      res.status(500).json({ message: "Subscription failed" });
    }
  });

  // ===== LESSON ASSIGNMENT ENDPOINTS =====
  
  // Get all lessons available for assignment (browsing interface)
  app.get("/api/assignments/lessons", async (req, res) => {
    try {
      const { type, wordClass, difficulty, gradeLevel, search } = req.query;
      
      let lessons: any[] = [];
      
      // Get published lessons
      if (!type || type === 'published_lesson') {
        const publishedLessons = await storage.getPublishedLessons();
        lessons.push(...publishedLessons.map(lesson => ({
          ...lesson,
          type: 'published_lesson',
          lessonType: 'Interaktiv lektion',
          category: lesson.wordClass || 'Allmänt'
        })));
      }
      
      // Get reading lessons
      if (!type || type === 'reading_lesson') {
        const readingLessons = await storage.getPublishedReadingLessons();
        lessons.push(...readingLessons.map(lesson => ({
          ...lesson,
          type: 'reading_lesson',
          lessonType: 'Läsförståelse',
          category: lesson.subject || 'Svenska',
          difficulty: lesson.gradeLevel || 'medium'
        })));
      }
      
      // Apply filters
      if (wordClass) {
        lessons = lessons.filter(lesson => lesson.wordClass === wordClass);
      }
      if (difficulty) {
        lessons = lessons.filter(lesson => lesson.difficulty === difficulty);
      }
      if (gradeLevel) {
        lessons = lessons.filter(lesson => lesson.gradeLevel === gradeLevel);
      }
      if (search) {
        const searchLower = (search as string).toLowerCase();
        lessons = lessons.filter(lesson => 
          lesson.title?.toLowerCase().includes(searchLower) ||
          lesson.description?.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(lessons);
    } catch (error) {
      console.error("Failed to fetch lessons for assignment:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });
  
  // Create new lesson assignment with aggressive dev bypass
  app.post("/api/assignments", async (req, res) => {
    try {
      // AGGRESSIVE Development bypass - skip ALL middleware for dev mode
      const isDev = process.env.NODE_ENV === 'development';
      const isDevBypass = req.headers['x-dev-bypass'] === 'true';

      if (isDev && isDevBypass) {
        console.log('🚀 AGGRESSIVE DEV BYPASS: Skipping all auth for assignment creation');

        const teacherId = '550e8400-e29b-41d4-a716-446655440002';
        const validatedData = insertLessonAssignmentSchema.parse({
          ...req.body,
          teacherId,
          assignedAt: req.body.assignedAt ? new Date(req.body.assignedAt) : new Date(),
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });

        const assignment = await storage.createLessonAssignment(validatedData);
        return res.status(201).json(assignment);
      }

      // Normal flow with middleware (we need to re-add middleware manually)
      const authResult = await new Promise((resolve) => {
        requireAuth(req, res, (err) => resolve(err ? false : true));
      });

      if (!authResult) {
        return res.status(401).json({ message: "Ej inloggad" });
      }

      const licenseResult = await new Promise((resolve) => {
        requireTeacherLicense(req, res, (err) => resolve(err ? false : true));
      });

      if (!licenseResult) {
        return res.status(403).json({ message: "Lärarlicens krävs" });
      }

      const csrfResult = await new Promise((resolve) => {
        requireCsrf(req, res, (err) => resolve(err ? false : true));
      });

      if (!csrfResult) {
        return res.status(403).json({ message: "CSRF token krävs" });
      }

      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }
      
      const validatedData = insertLessonAssignmentSchema.parse({
        ...req.body,
        teacherId
      });
      
      const assignment = await storage.createLessonAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error("Failed to create lesson assignment:", error);
      res.status(500).json({ message: "Failed to create lesson assignment" });
    }
  });
  
  // Get assignments for a teacher
  app.get("/api/assignments", requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      let teacherId = req.user?.id;

      // Development bypass - override teacherId if dev headers are present
      if (process.env.NODE_ENV !== 'production') {
        const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
        const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;

        if (devBypass === 'true' && devRole === 'LARARE') {
          console.log('[routes] Dev bypass active for /api/assignments endpoint, using dev teacher ID');
          teacherId = '550e8400-e29b-41d4-a716-446655440002'; // Use our dev teacher ID
        }
      }

      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }
      
      const { active } = req.query;
      let assignments;
      
      if (active === 'true') {
        assignments = await storage.getActiveLessonAssignments(teacherId);
      } else {
        assignments = await storage.getLessonAssignments(teacherId);
      }
      
      res.json(assignments);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });
  
  // Get specific assignment
  app.get("/api/assignments/:id", requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const assignment = await storage.getLessonAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Verify teacher owns this assignment
      if (assignment.teacherId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(assignment);
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });
  
  // Update assignment
  app.put("/api/assignments/:id", requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const assignment = await storage.getLessonAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Verify teacher owns this assignment
      if (assignment.teacherId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertLessonAssignmentSchema.partial().parse(req.body);
      const updatedAssignment = await storage.updateLessonAssignment(req.params.id, validatedData);
      res.json(updatedAssignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error("Failed to update assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });
  
  // Delete assignment
  app.delete("/api/assignments/:id", requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const assignment = await storage.getLessonAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Verify teacher owns this assignment
      if (assignment.teacherId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteLessonAssignment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });
  
  // Get assignments for a class
  app.get("/api/assignments/class/:classId", requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const assignments = await storage.getLessonAssignmentsByClass(req.params.classId);

      // Verify teacher owns these assignments
      let teacherId = req.user?.id;

      // Development bypass - override teacherId if dev headers are present
      if (process.env.NODE_ENV !== 'production') {
        const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
        const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;

        if (devBypass === 'true' && devRole === 'LARARE') {
          console.log('[routes] Dev bypass active for /api/assignments/class/:classId endpoint, using dev teacher ID');
          teacherId = '550e8400-e29b-41d4-a716-446655440002'; // Use our dev teacher ID
        }
      }

      const filteredAssignments = assignments.filter(assignment => assignment.teacherId === teacherId);
      
      res.json(filteredAssignments);
    } catch (error) {
      console.error("Failed to fetch class assignments:", error);
      res.status(500).json({ message: "Failed to fetch class assignments" });
    }
  });
  
  // Get progress for an assignment
  app.get("/api/assignments/:id/progress", requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const assignment = await storage.getLessonAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Verify teacher owns this assignment
      if (assignment.teacherId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.getStudentProgressByAssignment(req.params.id);
      res.json(progress);
    } catch (error) {
      console.error("Failed to fetch assignment progress:", error);
      res.status(500).json({ message: "Failed to fetch assignment progress" });
    }
  });

  // Teacher dashboard endpoints
  app.get("/api/teacher/dashboard-stats", requireAuth, requireRole('LARARE', 'ADMIN'), async (req: any, res) => {
    try {
      let userId = req.user.id;

      // Development bypass - override userId if dev headers are present
      if (process.env.NODE_ENV !== 'production') {
        const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
        const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;

        if (devBypass === 'true' && devRole === 'LARARE') {
          console.log('[routes] Dev bypass active for /api/teacher/dashboard-stats endpoint, using dev teacher ID');
          userId = '550e8400-e29b-41d4-a716-446655440002'; // Use our dev teacher ID
        }
      }
      
      // This would normally come from license system, but let's provide basic stats
      const stats = {
        totalStudents: 0,
        totalClasses: 0,
        activeAssignments: 0,
        completedLessons: 0,
        averageProgress: 0,
        totalSchoolHours: 0,
      };

      // Get basic game progress stats if available
      const gameProgress = await storage.getGameProgress();
      if (gameProgress) {
        stats.completedLessons = gameProgress.completedLevels ? Object.keys(gameProgress.completedLevels).length : 0;
        stats.totalSchoolHours = Math.floor((stats.completedLessons * 10) / 60); // Estimate hours
        stats.averageProgress = gameProgress.score || 0;
      }

      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Kunde inte hämta statistik' });
    }
  });

  app.get("/api/teacher/recent-activity", requireAuth, requireRole('LARARE', 'ADMIN'), async (req: any, res) => {
    try {
      // This would normally come from student activity logs
      const recentActivity = [
        {
          id: '1',
          type: 'lesson_completed',
          studentName: 'Exempel Elev',
          activity: 'Slutförde Substantiv Nivå 1',
          timestamp: new Date().toISOString(),
          score: 85
        }
      ];

      res.json(recentActivity);
    } catch (error) {
      console.error('Recent activity error:', error);
      res.status(500).json({ error: 'Kunde inte hämta aktivitet' });
    }
  });

  // ===============================
  // COMPREHENSIVE ANALYTICS ENDPOINTS
  // ===============================

  // Teacher analytics overview
  app.get("/api/analytics/teacher", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const analytics = await storage.getTeacherAnalytics(teacherId);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to fetch teacher analytics:", error);
      res.status(500).json({ message: "Failed to fetch teacher analytics" });
    }
  });

  // Class analytics
  app.get("/api/analytics/class/:classId", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const { classId } = req.params;
      const teacherId = req.user?.id;
      
      // Verify teacher has access to this class
      const teacherClasses = await db
        .select()
        .from(schema.teacherClasses)
        .where(eq(schema.teacherClasses.teacherId, teacherId));
      
      const hasAccess = teacherClasses.some(tc => tc.id === classId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied: You do not have access to this class" });
      }
      
      const analytics = await storage.getClassAnalytics(classId);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to fetch class analytics:", error);
      res.status(500).json({ message: "Failed to fetch class analytics" });
    }
  });

  // Student analytics
  app.get("/api/analytics/student/:studentId", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const { studentId } = req.params;
      const teacherId = req.user?.id;
      
      // Verify teacher has access to this student
      const studentAccount = await db
        .select()
        .from(schema.studentAccounts)
        .where(eq(schema.studentAccounts.id, studentId))
        .limit(1);
      
      if (studentAccount.length === 0) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const teacherClasses = await db
        .select()
        .from(schema.teacherClasses)
        .where(and(
          eq(schema.teacherClasses.teacherId, teacherId),
          eq(schema.teacherClasses.id, studentAccount[0].classId)
        ));
      
      if (teacherClasses.length === 0) {
        return res.status(403).json({ message: "Access denied: You do not have access to this student" });
      }
      
      const analytics = await storage.getStudentAnalytics(studentId);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to fetch student analytics:", error);
      res.status(500).json({ message: "Failed to fetch student analytics" });
    }
  });

  // Assignment analytics
  app.get("/api/analytics/assignment/:assignmentId", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const { assignmentId } = req.params;
      const teacherId = req.user?.id;
      
      // Verify teacher owns this assignment
      const assignment = await storage.getLessonAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      if (assignment.teacherId !== teacherId) {
        return res.status(403).json({ message: "Access denied: You do not own this assignment" });
      }
      
      const analytics = await storage.getAssignmentAnalytics(assignmentId);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to fetch assignment analytics:", error);
      res.status(500).json({ message: "Failed to fetch assignment analytics" });
    }
  });

  // Performance comparison
  app.post("/api/analytics/performance-comparison", requireAuth, requireTeacherLicense, requireCsrf, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const validatedOptions = performanceComparisonSchema.parse(req.body);
      const comparison = await storage.getPerformanceComparison(teacherId, validatedOptions);
      res.json(comparison);
    } catch (error) {
      console.error("Failed to fetch performance comparison:", error);
      res.status(500).json({ message: "Failed to fetch performance comparison" });
    }
  });

  // Progress trends
  app.get("/api/analytics/progress-trends", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const validatedQuery = progressTrendsSchema.parse(req.query);
      const trends = await storage.getProgressTrends(teacherId, validatedQuery);
      res.json(trends);
    } catch (error) {
      console.error("Failed to fetch progress trends:", error);
      res.status(500).json({ message: "Failed to fetch progress trends" });
    }
  });

  // Completion rates
  app.get("/api/analytics/completion-rates", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const validatedQuery = completionRatesSchema.parse(req.query);
      const rates = await storage.getCompletionRates(teacherId, validatedQuery.groupBy);
      res.json(rates);
    } catch (error) {
      console.error("Failed to fetch completion rates:", error);
      res.status(500).json({ message: "Failed to fetch completion rates" });
    }
  });

  // Time spent analytics
  app.get("/api/analytics/time-spent", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const analytics = await storage.getTimeSpentAnalytics(teacherId);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to fetch time spent analytics:", error);
      res.status(500).json({ message: "Failed to fetch time spent analytics" });
    }
  });

  // Struggling students
  app.get("/api/analytics/struggling-students", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const strugglingStudents = await storage.getStrugglingStudents(teacherId);
      res.json(strugglingStudents);
    } catch (error) {
      console.error("Failed to fetch struggling students:", error);
      res.status(500).json({ message: "Failed to fetch struggling students" });
    }
  });

  // Top performers
  app.get("/api/analytics/top-performers", requireAuth, requireTeacherLicense, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const topPerformers = await storage.getTopPerformers(teacherId);
      res.json(topPerformers);
    } catch (error) {
      console.error("Failed to fetch top performers:", error);
      res.status(500).json({ message: "Failed to fetch top performers" });
    }
  });

  // Export analytics data
  app.post("/api/analytics/export", requireAuth, requireTeacherLicense, requireCsrf, async (req: any, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Teacher ID required" });
      }

      const validatedRequest = analyticsExportSchema.parse(req.body);
      const { format, type, classId, studentId, dateRange } = validatedRequest;
      
      // Generate export data based on type with proper authorization checks
      let exportData;
      switch (type) {
        case 'teacher':
          exportData = await storage.getTeacherAnalytics(teacherId);
          break;
        case 'class':
          if (!classId) {
            return res.status(400).json({ message: "Class ID required for class export" });
          }
          // Verify teacher has access to this class
          const teacherClasses = await db
            .select()
            .from(schema.teacherClasses)
            .where(eq(schema.teacherClasses.teacherId, teacherId));
          
          const hasClassAccess = teacherClasses.some(tc => tc.id === classId);
          if (!hasClassAccess) {
            return res.status(403).json({ message: "Access denied: You do not have access to this class" });
          }
          exportData = await storage.getClassAnalytics(classId);
          break;
        case 'student':
          if (!studentId) {
            return res.status(400).json({ message: "Student ID required for student export" });
          }
          // Verify teacher has access to this student
          const studentAccount = await db
            .select()
            .from(schema.studentAccounts)
            .where(eq(schema.studentAccounts.id, studentId))
            .limit(1);
          
          if (studentAccount.length === 0) {
            return res.status(404).json({ message: "Student not found" });
          }
          
          const teacherClassesForStudent = await db
            .select()
            .from(schema.teacherClasses)
            .where(and(
              eq(schema.teacherClasses.teacherId, teacherId),
              eq(schema.teacherClasses.id, studentAccount[0].classId)
            ));
          
          if (teacherClassesForStudent.length === 0) {
            return res.status(403).json({ message: "Access denied: You do not have access to this student" });
          }
          exportData = await storage.getStudentAnalytics(studentId);
          break;
        default:
          return res.status(400).json({ message: "Invalid export type" });
      }

      if (format === 'csv') {
        // Convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${Date.now()}.csv"`);
        
        // Convert analytics data to CSV
        let csvContent = '';
        if (type === 'teacher' && exportData) {
          csvContent = convertTeacherAnalyticsToCSV(exportData);
        } else if (type === 'class' && exportData) {
          csvContent = convertClassAnalyticsToCSV(exportData);
        } else if (type === 'student' && exportData) {
          csvContent = convertStudentAnalyticsToCSV(exportData);
        }
        res.send(csvContent);
      } else {
        // Return JSON by default
        res.json(exportData);
      }
    } catch (error) {
      console.error("Failed to export analytics:", error);
      res.status(500).json({ message: "Failed to export analytics" });
    }
  });

  // ===== STUDENT PROGRESS TRACKING API ROUTES =====
  
  // Student progress endpoints (for students to save their progress)
  app.post("/api/student/progress", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const studentId = req.student?.id;
      if (!studentId) {
        return res.status(401).json({ message: "Student ID required" });
      }
      
      const validatedData = insertStudentProgressSchema.parse({
        ...req.body,
        studentId
      });
      
      const progress = await storage.createStudentProgress(validatedData);
      res.status(201).json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      console.error("Failed to save student progress:", error);
      res.status(500).json({ message: "Failed to save student progress" });
    }
  });

  // Student activity logging (for students to log activities)
  app.post("/api/student/activity", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const studentId = req.student?.id;
      if (!studentId) {
        return res.status(401).json({ message: "Student ID required" });
      }
      
      const validatedData = insertStudentActivitySchema.parse({
        ...req.body,
        studentId
      });
      
      const activity = await storage.logStudentActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      console.error("Failed to log student activity:", error);
      res.status(500).json({ message: "Failed to log student activity" });
    }
  });

  // Teacher endpoints for accessing progress data
  
  // Get all teacher's classes with students
  app.get("/api/teacher/classes", requireAuth, requireRole('LARARE'), async (req, res) => {
    try {
      const teacherId = req.user!.id;

      // Get teacher's classes from classes table (not teacherClasses for licensing)
      const teacherClasses = await db
        .select({
          id: schema.classes.id,
          name: schema.classes.name,
          term: schema.classes.term,
          createdAt: schema.classes.createdAt
        })
        .from(schema.classes)
        .where(eq(schema.classes.teacherId, teacherId));

      // For each class, get the students
      const classesWithStudents = await Promise.all(
        teacherClasses.map(async (cls) => {
          const students = await db
            .select({
              id: schema.users.id,
              username: schema.users.username,
              alias: schema.students.alias
            })
            .from(schema.students)
            .innerJoin(schema.users, eq(schema.students.userId, schema.users.id))
            .where(eq(schema.students.classId, cls.id));

          return {
            ...cls,
            createdAt: cls.createdAt?.toISOString() || new Date().toISOString(),
            description: undefined, // Add undefined description to match interface
            students: students.map(student => ({
              id: student.id,
              username: student.username,
              alias: student.alias || student.username
            }))
          };
        })
      );

      res.json(classesWithStudents);
    } catch (error) {
      console.error("Error fetching teacher classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });
  
  // Get class progress (for teachers to see progress of all students in a class)
  app.get("/api/teacher/classes/:classId/progress", requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const { classId } = req.params;
      const teacherId = req.user?.id;
      
      // Verify teacher has access to this class
      const teacherClasses = await db
        .select()
        .from(schema.teacherClasses)
        .where(eq(schema.teacherClasses.teacherId, teacherId));
      
      const hasAccess = teacherClasses.some(tc => tc.id === classId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied: You do not have access to this class" });
      }
      
      const progress = await storage.getClassProgress(classId);
      res.json(progress);
    } catch (error) {
      console.error("Failed to fetch class progress:", error);
      res.status(500).json({ message: "Failed to fetch class progress" });
    }
  });

  // Get class progress analytics (detailed analytics for a class)
  app.get("/api/teacher/classes/:classId/analytics", requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const { classId } = req.params;
      const teacherId = req.user?.id;
      
      // Verify teacher has access to this class
      const teacherClasses = await db
        .select()
        .from(schema.teacherClasses)
        .where(eq(schema.teacherClasses.teacherId, teacherId));
      
      const hasAccess = teacherClasses.some(tc => tc.id === classId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied: You do not have access to this class" });
      }
      
      const analytics = await storage.getClassProgressAnalytics(classId);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to fetch class progress analytics:", error);
      res.status(500).json({ message: "Failed to fetch class progress analytics" });
    }
  });

  // Get individual student progress (for teachers to see detailed progress of one student)
  app.get("/api/teacher/students/:studentId/progress", requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const { studentId } = req.params;
      const teacherId = req.user?.id;
      
      // Verify teacher has access to this student
      const studentAccount = await db
        .select()
        .from(schema.studentAccounts)
        .where(eq(schema.studentAccounts.id, studentId))
        .limit(1);
      
      if (studentAccount.length === 0) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const teacherClasses = await db
        .select()
        .from(schema.teacherClasses)
        .where(and(
          eq(schema.teacherClasses.teacherId, teacherId),
          eq(schema.teacherClasses.id, studentAccount[0].classId)
        ));
      
      if (teacherClasses.length === 0) {
        return res.status(403).json({ message: "Access denied: You do not have access to this student" });
      }
      
      const progress = await storage.getStudentProgress(studentId);
      const analytics = await storage.getStudentProgressAnalytics(studentId);
      
      res.json({ progress, analytics });
    } catch (error) {
      console.error("Failed to fetch student progress:", error);
      res.status(500).json({ message: "Failed to fetch student progress" });
    }
  });

  // ===== CLASSROOM MANAGEMENT API ROUTES =====
  // Comprehensive backend APIs for real-time classroom control

  // Validation schemas for classroom management
  const createClassroomSessionSchema = z.object({
    classId: z.string(),
    sessionName: z.string().min(1).max(255),
    currentMode: z.enum(['instruction', 'exercise', 'test', 'break', 'group_work', 'silent']).optional(),
    settings: z.object({
      autoConnectStudents: z.boolean().optional(),
      allowStudentChat: z.boolean().optional(),
      defaultTimerStyle: z.string().optional(),
      emergencyContactInfo: z.string().optional(),
      classroomRules: z.array(z.string()).optional(),
      breakDuration: z.number().optional(),
      attentionModeTimeout: z.number().optional(),
    }).optional(),
  });

  const sendClassroomMessageSchema = z.object({
    sessionId: z.string(),
    messageType: z.enum(['instruction', 'announcement', 'alert', 'timer_warning', 'break_time', 'attention']),
    title: z.string().optional(),
    content: z.string().min(1),
    targetStudentIds: z.array(z.string()).optional(),
    displayDuration: z.number().optional(),
    isUrgent: z.boolean().optional(),
    requiresAcknowledgment: z.boolean().optional(),
  });

  const createTimerSchema = z.object({
    sessionId: z.string(),
    name: z.string().min(1).max(255),
    type: z.enum(['countdown', 'stopwatch', 'break_timer', 'exercise_timer', 'attention_timer']),
    duration: z.number().optional(),
    displayStyle: z.enum(['digital', 'progress_bar', 'circular']).optional(),
    showOnStudentScreens: z.boolean().optional(),
    playAudioOnComplete: z.boolean().optional(),
    warningThresholds: z.array(z.number()).optional(),
  });

  const screenControlSchema = z.object({
    sessionId: z.string(),
    action: z.enum(['lock_all', 'unlock_all', 'lock_students', 'unlock_students']),
    targetStudentIds: z.array(z.string()).optional(),
    lockMessage: z.string().optional(),
    restrictedUrls: z.array(z.string()).optional(),
    allowedUrls: z.array(z.string()).optional(),
  });

  // Classroom Session Management Routes
  
  // Create new classroom session
  app.post('/api/classroom/sessions', requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const data = createClassroomSessionSchema.parse(req.body);
      
      // Verify teacher has access to the class
      const [teacherClass] = await db.select()
        .from(schema.teacherClasses)
        .where(and(
          eq(schema.teacherClasses.id, data.classId),
          eq(schema.teacherClasses.teacherId, req.user!.id)
        ))
        .limit(1);

      if (!teacherClass) {
        return res.status(404).json({ error: 'Klass hittades inte eller du har inte behörighet' });
      }

      // Create classroom session (would use database when schema is migrated)
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // For now, store in memory via WebSocket service
      const classroomWS = (req.app as any).classroomWebSocket;
      
      // Create session state (this would go to database)
      const sessionData = {
        id: sessionId,
        teacherId: req.user!.id,
        classId: data.classId,
        sessionName: data.sessionName,
        currentMode: data.currentMode || 'instruction',
        status: 'active',
        startedAt: new Date(),
        settings: data.settings || {},
      };

      res.json({
        success: true,
        session: sessionData,
        message: 'Klassrumssession skapad framgångsrikt'
      });

    } catch (error: any) {
      console.error('Error creating classroom session:', error);
      res.status(400).json({ error: error.message || 'Kunde inte skapa klassrumssession' });
    }
  });

  // Get classroom sessions for teacher
  app.get('/api/classroom/sessions', requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      // Get teacher's classes
      const teacherClasses = await db.select()
        .from(schema.teacherClasses)
        .where(eq(schema.teacherClasses.teacherId, req.user!.id));

      const classroomWS = (req.app as any).classroomWebSocket;
      
      // For now, return active sessions from WebSocket service
      const activeSessions = teacherClasses.map(cls => {
        const state = classroomWS.getClassroomState(cls.id);
        return state ? {
          id: state.sessionId,
          teacherId: state.teacherId,
          classId: state.classId,
          className: cls.name,
          currentMode: state.mode,
          status: state.isActive ? 'active' : 'paused',
          connectedStudentsCount: state.connectedStudents.size,
          lastActivity: state.lastActivity,
        } : null;
      }).filter(Boolean);

      res.json({ sessions: activeSessions });

    } catch (error: any) {
      console.error('Error getting classroom sessions:', error);
      res.status(500).json({ error: 'Kunde inte hämta klassrumssessioner' });
    }
  });

  // Get specific classroom session status
  app.get('/api/classroom/sessions/:sessionId', requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const classroomWS = (req.app as any).classroomWebSocket;

      // Find classroom state by session ID
      let classroomState = null;
      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.sessionId === sessionId && state.teacherId === req.user!.id) {
          classroomState = state;
          break;
        }
      }

      if (!classroomState) {
        return res.status(404).json({ error: 'Klassrumssession hittades inte' });
      }

      const connectedStudents = Array.from(classroomState.connectedStudents.values()).map((student: any) => ({
        studentId: student.studentId,
        studentName: student.studentName,
        isConnected: true,
        isLocked: student.isLocked,
        lastActivity: student.lastActivity,
        currentActivity: student.currentActivity,
      }));

      const timers = Array.from(classroomState.timers.values()).map((timer: any) => ({
        id: timer.id,
        name: timer.name,
        type: timer.type,
        status: timer.status,
        elapsed: timer.elapsed,
        duration: timer.duration,
      }));

      res.json({
        session: {
          id: classroomState.sessionId,
          teacherId: classroomState.teacherId,
          classId: classroomState.classId,
          mode: classroomState.mode,
          isActive: classroomState.isActive,
          lastActivity: classroomState.lastActivity,
        },
        connectedStudents,
        timers,
        stats: {
          totalStudents: connectedStudents.length,
          lockedStudents: connectedStudents.filter((s: any) => s.isLocked).length,
          activeTimers: timers.filter((t: any) => t.status === 'running').length,
        }
      });

    } catch (error: any) {
      console.error('Error getting classroom session:', error);
      res.status(500).json({ error: 'Kunde inte hämta klassrumssession' });
    }
  });

  // Update classroom mode
  app.put('/api/classroom/sessions/:sessionId/mode', requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { mode } = req.body;

      if (!['instruction', 'exercise', 'test', 'break', 'group_work', 'silent'].includes(mode)) {
        return res.status(400).json({ error: 'Ogiltigt klassrumsläge' });
      }

      const classroomWS = (req.app as any).classroomWebSocket;
      
      // Find and update classroom state
      let updated = false;
      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.sessionId === sessionId && state.teacherId === req.user!.id) {
          state.mode = mode;
          state.lastActivity = new Date();
          updated = true;
          
          // Broadcast mode change to students
          classroomWS.broadcastToClass(classId, {
            type: 'classroom_mode_change',
            data: { newMode: mode, timestamp: Date.now() },
          });
          break;
        }
      }

      if (!updated) {
        return res.status(404).json({ error: 'Klassrumssession hittades inte' });
      }

      res.json({ success: true, newMode: mode });

    } catch (error: any) {
      console.error('Error updating classroom mode:', error);
      res.status(500).json({ error: 'Kunde inte uppdatera klassrumsläge' });
    }
  });

  // Message Broadcasting Routes

  // Send message to students
  app.post('/api/classroom/messages', requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const data = sendClassroomMessageSchema.parse(req.body);
      const classroomWS = (req.app as any).classroomWebSocket;

      // Verify teacher owns the session
      let sessionFound = false;
      let targetClassId = '';
      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.sessionId === data.sessionId && state.teacherId === req.user!.id) {
          sessionFound = true;
          targetClassId = classId;
          break;
        }
      }

      if (!sessionFound) {
        return res.status(404).json({ error: 'Klassrumssession hittades inte' });
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Broadcast message via WebSocket
      const message = {
        type: 'classroom_message' as const,
        data: {
          content: data.content,
          title: data.title,
          messageType: data.messageType,
          displayDuration: data.displayDuration,
          isUrgent: data.isUrgent || false,
          requiresAcknowledgment: data.requiresAcknowledgment || false,
          from: 'teacher',
          timestamp: Date.now(),
        },
        messageId,
        targetStudentIds: data.targetStudentIds,
      };

      if (data.targetStudentIds && data.targetStudentIds.length > 0) {
        (classroomWS as any).broadcastToSpecificStudents(targetClassId, data.targetStudentIds, message);
      } else {
        (classroomWS as any).broadcastToClass(targetClassId, message);
      }

      res.json({
        success: true,
        messageId,
        sentTo: data.targetStudentIds?.length || 'all',
        message: 'Meddelande skickat'
      });

    } catch (error: any) {
      console.error('Error sending classroom message:', error);
      res.status(400).json({ error: error.message || 'Kunde inte skicka meddelande' });
    }
  });

  // Timer Management Routes

  // Create timer
  app.post('/api/classroom/timers', requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const data = createTimerSchema.parse(req.body);
      const classroomWS = (req.app as any).classroomWebSocket;

      // Verify teacher owns the session
      let sessionFound = false;
      let targetClassId = '';
      let classroomState = null;
      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.sessionId === data.sessionId && state.teacherId === req.user!.id) {
          sessionFound = true;
          targetClassId = classId;
          classroomState = state;
          break;
        }
      }

      if (!sessionFound) {
        return res.status(404).json({ error: 'Klassrumssession hittades inte' });
      }

      const timerId = `timer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const timerConfig = {
        id: timerId,
        name: data.name,
        type: data.type,
        duration: data.duration,
        elapsed: 0,
        status: 'stopped' as const,
        displayStyle: data.displayStyle || 'digital',
        showOnStudentScreens: data.showOnStudentScreens !== false,
        playAudioOnComplete: data.playAudioOnComplete !== false,
        warningThresholds: data.warningThresholds || [],
        createdAt: new Date(),
      };

      // Add timer to classroom state
      classroomState.timers.set(timerId, timerConfig);

      // Broadcast timer creation to students
      (classroomWS as any).broadcastToClass(targetClassId, {
        type: 'timer_control',
        data: {
          action: 'create',
          timerId,
          timerState: timerConfig,
        },
      });

      res.json({
        success: true,
        timer: timerConfig,
        message: 'Timer skapad'
      });

    } catch (error: any) {
      console.error('Error creating timer:', error);
      res.status(400).json({ error: error.message || 'Kunde inte skapa timer' });
    }
  });

  // Control timer (start, pause, stop)
  app.put('/api/classroom/timers/:timerId', requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const { timerId } = req.params;
      const { action } = req.body; // start, pause, stop, delete

      if (!['start', 'pause', 'stop', 'delete'].includes(action)) {
        return res.status(400).json({ error: 'Ogiltig timer-åtgärd' });
      }

      const classroomWS = (req.app as any).classroomWebSocket;

      // Find timer in classroom states
      let timerFound = false;
      let targetClassId = '';
      let timer = null;

      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.teacherId === req.user!.id && state.timers.has(timerId)) {
          timerFound = true;
          targetClassId = classId;
          timer = state.timers.get(timerId);

          // Update timer state
          switch (action) {
            case 'start':
              timer.status = 'running';
              timer.startTime = Date.now();
              if (timer.pauseTime) {
                const pausedDuration = timer.pauseTime - (timer.startTime || 0);
                timer.elapsed += pausedDuration;
                timer.pauseTime = undefined;
              }
              break;
            case 'pause':
              if (timer.status === 'running') {
                timer.status = 'paused';
                timer.pauseTime = Date.now();
                timer.elapsed += Date.now() - (timer.startTime || 0);
              }
              break;
            case 'stop':
              timer.status = 'stopped';
              timer.elapsed = 0;
              timer.startTime = undefined;
              timer.pauseTime = undefined;
              break;
            case 'delete':
              state.timers.delete(timerId);
              break;
          }
          break;
        }
      }

      if (!timerFound) {
        return res.status(404).json({ error: 'Timer hittades inte' });
      }

      // Broadcast timer control to students
      (classroomWS as any).broadcastToClass(targetClassId, {
        type: 'timer_control',
        data: {
          action,
          timerId,
          timerState: action === 'delete' ? null : timer,
        },
      });

      res.json({
        success: true,
        action,
        timer: action === 'delete' ? null : timer,
        message: `Timer ${action === 'start' ? 'startad' : action === 'pause' ? 'pausad' : action === 'stop' ? 'stoppad' : 'borttagen'}`
      });

    } catch (error: any) {
      console.error('Error controlling timer:', error);
      res.status(500).json({ error: 'Kunde inte styra timer' });
    }
  });

  // Student Screen Control Routes

  // Control student screens
  app.post('/api/classroom/screen-control', requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const data = screenControlSchema.parse(req.body);
      const classroomWS = (req.app as any).classroomWebSocket;

      // Verify teacher owns the session
      let sessionFound = false;
      let targetClassId = '';
      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.sessionId === data.sessionId && state.teacherId === req.user!.id) {
          sessionFound = true;
          targetClassId = classId;
          break;
        }
      }

      if (!sessionFound) {
        return res.status(404).json({ error: 'Klassrumssession hittades inte' });
      }

      let message = {
        type: 'screen_control' as const,
        data: {
          action: data.action.includes('lock') ? 'lock' : 'unlock',
          message: data.lockMessage || (data.action.includes('lock') ? 'Skärmen är låst av läraren' : ''),
          restrictedUrls: data.restrictedUrls,
          allowedUrls: data.allowedUrls,
        },
      };

      let affectedCount = 0;

      // Apply screen control
      switch (data.action) {
        case 'lock_all':
          (classroomWS as any).broadcastToClass(targetClassId, message);
          (classroomWS as any).updateStudentLockStatus(targetClassId, true);
          affectedCount = (classroomWS as any).getConnectedStudents(targetClassId).length;
          break;
        case 'unlock_all':
          (classroomWS as any).broadcastToClass(targetClassId, message);
          (classroomWS as any).updateStudentLockStatus(targetClassId, false);
          affectedCount = (classroomWS as any).getConnectedStudents(targetClassId).length;
          break;
        case 'lock_students':
          if (data.targetStudentIds && data.targetStudentIds.length > 0) {
            (classroomWS as any).broadcastToSpecificStudents(targetClassId, data.targetStudentIds, message);
            (classroomWS as any).updateSpecificStudentLockStatus(data.targetStudentIds, true);
            affectedCount = data.targetStudentIds.length;
          }
          break;
        case 'unlock_students':
          if (data.targetStudentIds && data.targetStudentIds.length > 0) {
            (classroomWS as any).broadcastToSpecificStudents(targetClassId, data.targetStudentIds, message);
            (classroomWS as any).updateSpecificStudentLockStatus(data.targetStudentIds, false);
            affectedCount = data.targetStudentIds.length;
          }
          break;
      }

      res.json({
        success: true,
        action: data.action,
        affectedStudents: affectedCount,
        message: `Skärmkontroll tillämpat på ${affectedCount} elev${affectedCount !== 1 ? 'er' : ''}`
      });

    } catch (error: any) {
      console.error('Error controlling screens:', error);
      res.status(400).json({ error: error.message || 'Kunde inte kontrollera skärmar' });
    }
  });

  // Emergency attention
  app.post('/api/classroom/emergency-attention', requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
      const { sessionId, message: urgentMessage } = req.body;
      const classroomWS = (req.app as any).classroomWebSocket;

      // Verify teacher owns the session
      let sessionFound = false;
      let targetClassId = '';
      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.sessionId === sessionId && state.teacherId === req.user!.id) {
          sessionFound = true;
          targetClassId = classId;
          break;
        }
      }

      if (!sessionFound) {
        return res.status(404).json({ error: 'Klassrumssession hittades inte' });
      }

      // Send emergency attention to all students
      (classroomWS as any).broadcastToClass(targetClassId, {
        type: 'emergency_attention',
        data: {
          message: urgentMessage || 'UPPMÄRKSAMHET: Läraren behöver allas fokus',
          isUrgent: true,
          timestamp: Date.now(),
        },
      });

      res.json({
        success: true,
        message: 'Nöduppmärksamhet skickad till alla elever'
      });

    } catch (error: any) {
      console.error('Error sending emergency attention:', error);
      res.status(500).json({ error: 'Kunde inte skicka nöduppmärksamhet' });
    }
  });

  // Get classroom real-time status
  app.get('/api/classroom/status/:sessionId', requireAuth, requireTeacherLicense, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const classroomWS = (req.app as any).classroomWebSocket;

      // Find classroom state
      let classroomState = null;
      for (const [classId, state] of (classroomWS as any).classroomStates.entries()) {
        if (state.sessionId === sessionId && state.teacherId === req.user!.id) {
          classroomState = state;
          break;
        }
      }

      if (!classroomState) {
        return res.status(404).json({ error: 'Klassrumssession hittades inte' });
      }

      const connectedStudents = Array.from(classroomState.connectedStudents.values()).map((student: any) => ({
        studentId: student.studentId,
        studentName: student.studentName,
        isConnected: true,
        isLocked: student.isLocked,
        lastActivity: student.lastActivity,
        connectionId: student.connectionId,
      }));

      const timers = Array.from(classroomState.timers.values()).map((timer: any) => {
        // Calculate current elapsed time for running timers
        let currentElapsed = timer.elapsed;
        if (timer.status === 'running' && timer.startTime) {
          currentElapsed += Date.now() - timer.startTime;
        }

        return {
          id: timer.id,
          name: timer.name,
          type: timer.type,
          status: timer.status,
          elapsed: currentElapsed,
          duration: timer.duration,
          displayStyle: timer.displayStyle,
          showOnStudentScreens: timer.showOnStudentScreens,
          warningThresholds: timer.warningThresholds,
        };
      });

      res.json({
        session: {
          id: classroomState.sessionId,
          classId: classroomState.classId,
          mode: classroomState.mode,
          isActive: classroomState.isActive,
          lastActivity: classroomState.lastActivity,
        },
        connectedStudents,
        timers,
        stats: {
          totalConnected: connectedStudents.length,
          lockedScreens: connectedStudents.filter((s: any) => s.isLocked).length,
          runningTimers: timers.filter((t: any) => t.status === 'running').length,
          completedTimers: timers.filter((t: any) => t.status === 'completed').length,
        }
      });

    } catch (error: any) {
      console.error('Error getting classroom status:', error);
      res.status(500).json({ error: 'Kunde inte hämta klassrumsstatus' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket servers
  new KlassKampWebSocket(httpServer);
  const classroomWebSocket = new ClassroomWebSocket(httpServer);
  
  // ===============================
  // COMPREHENSIVE EXPORT SYSTEM ENDPOINTS
  // ===============================

  // Export validation schemas
  const createExportJobSchema = z.object({
    exportType: z.enum(['student_progress_report', 'parent_meeting_report', 'class_data_backup', 'administrative_report', 'assignment_overview', 'custom_report']),
    format: z.enum(['pdf', 'csv', 'excel', 'json', 'html']),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    classIds: z.array(z.string()).default([]),
    studentIds: z.array(z.string()).default([]),
    assignmentIds: z.array(z.string()).default([]),
    dateRange: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    dataFields: z.array(z.string()).default([]),
    filterCriteria: z.object({
      assignmentTypes: z.array(z.string()).optional(),
      progressStatus: z.array(z.string()).optional(),
      includeInactive: z.boolean().optional(),
      includeFeedback: z.boolean().optional(),
      includeTeacherComments: z.boolean().optional()
    }).optional(),
    templateId: z.string().optional(),
    customization: z.object({
      showCharts: z.boolean().optional(),
      showProgressGraphs: z.boolean().optional(),
      includeSummary: z.boolean().optional(),
      customTitle: z.string().optional(),
      colorScheme: z.enum(['default', 'professional', 'colorful', 'monochrome']).optional()
    }).optional()
  });

  const createExportTemplateSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    exportType: z.enum(['student_progress_report', 'parent_meeting_report', 'class_data_backup', 'administrative_report', 'assignment_overview', 'custom_report']),
    format: z.enum(['pdf', 'csv', 'excel', 'json', 'html']),
    dataFields: z.array(z.string()),
    defaultFilters: z.object({}).optional(),
    layoutConfig: z.object({}).optional(),
    styling: z.object({}).optional(),
    isPublic: z.boolean().default(false)
  });


  // ===== NEW LESSON SYSTEM & SHOP APIs =====

  // LESSON CATEGORIES
  app.get("/api/lesson-categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(schema.lessonCategories)
        .where(eq(schema.lessonCategories.isActive, true))
        .orderBy(schema.lessonCategories.sortOrder);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching lesson categories:", error);
      res.status(500).json({ message: "Failed to fetch lesson categories" });
    }
  });

  app.post("/api/lesson-categories", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validatedData = insertLessonCategorySchema.parse(req.body);
      const [category] = await db
        .insert(schema.lessonCategories)
        .values(validatedData)
        .returning();
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error creating lesson category:", error);
      res.status(500).json({ message: "Failed to create lesson category" });
    }
  });

  app.put("/api/lesson-categories/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const categoryId = req.params.id;
      const validatedData = insertLessonCategorySchema.partial().parse(req.body);
      
      const [updatedCategory] = await db
        .update(schema.lessonCategories)
        .set(validatedData)
        .where(eq(schema.lessonCategories.id, categoryId))
        .returning();
      
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error updating lesson category:", error);
      res.status(500).json({ message: "Failed to update lesson category" });
    }
  });

  app.delete("/api/lesson-categories/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      // Check if category has any templates
      const templatesWithCategory = await db
        .select()
        .from(schema.lessonTemplates)
        .where(eq(schema.lessonTemplates.categoryId, categoryId))
        .limit(1);
      
      if (templatesWithCategory.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete category with existing templates",
          details: "Move or delete all templates in this category first" 
        });
      }
      
      const [deletedCategory] = await db
        .delete(schema.lessonCategories)
        .where(eq(schema.lessonCategories.id, categoryId))
        .returning();
      
      if (!deletedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting lesson category:", error);
      res.status(500).json({ message: "Failed to delete lesson category" });
    }
  });

  // LESSON TEMPLATES  
  app.get("/api/lesson-templates", requireAnyAuth, async (req, res) => {
    try {
      const templates = await db
        .select()
        .from(schema.lessonTemplates)
        .innerJoin(schema.lessonCategories, eq(schema.lessonTemplates.categoryId, schema.lessonCategories.id))
        .where(eq(schema.lessonTemplates.isPublished, true))
        .orderBy(schema.lessonCategories.sortOrder, schema.lessonTemplates.title);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching lesson templates:", error);
      res.status(500).json({ message: "Failed to fetch lesson templates" });
    }
  });

  app.get("/api/lesson-templates/:id", requireAnyAuth, async (req, res) => {
    try {
      const [template] = await db
        .select()
        .from(schema.lessonTemplates)
        .innerJoin(schema.lessonCategories, eq(schema.lessonTemplates.categoryId, schema.lessonCategories.id))
        .where(eq(schema.lessonTemplates.id, req.params.id));
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching lesson template:", error);
      res.status(500).json({ message: "Failed to fetch lesson template" });
    }
  });

  app.post("/api/lesson-templates", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validatedData = insertLessonTemplateSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      const [template] = await db
        .insert(schema.lessonTemplates)
        .values(validatedData)
        .returning();
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error creating lesson template:", error);
      res.status(500).json({ message: "Failed to create lesson template" });
    }
  });

  // TEACHER LESSON CUSTOMIZATIONS
  app.get("/api/teacher/lesson-customizations", requireAuth, requireRole('LARARE'), async (req, res) => {
    try {
      const teacherId = req.user!.id;
      const customizations = await db
        .select()
        .from(schema.teacherLessonCustomizations)
        .innerJoin(schema.lessonTemplates, eq(schema.teacherLessonCustomizations.templateId, schema.lessonTemplates.id))
        .where(and(
          eq(schema.teacherLessonCustomizations.teacherId, teacherId),
          eq(schema.teacherLessonCustomizations.isActive, true)
        ));
      res.json(customizations);
    } catch (error) {
      console.error("Error fetching teacher customizations:", error);
      res.status(500).json({ message: "Failed to fetch customizations" });
    }
  });

  app.post("/api/teacher/lesson-customizations", requireAuth, requireRole('LARARE'), requireCsrf, async (req, res) => {
    try {
      const validatedData = insertTeacherLessonCustomizationSchema.parse({
        ...req.body,
        teacherId: req.user!.id
      });
      
      // Upsert - update if exists, insert if not
      const existing = await db
        .select()
        .from(schema.teacherLessonCustomizations)
        .where(and(
          eq(schema.teacherLessonCustomizations.teacherId, validatedData.teacherId),
          eq(schema.teacherLessonCustomizations.templateId, validatedData.templateId)
        ));

      let result;
      if (existing.length > 0) {
        [result] = await db
          .update(schema.teacherLessonCustomizations)
          .set({ ...validatedData, updatedAt: new Date() })
          .where(eq(schema.teacherLessonCustomizations.id, existing[0].id))
          .returning();
      } else {
        [result] = await db
          .insert(schema.teacherLessonCustomizations)
          .values(validatedData)
          .returning();
      }
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customization data", errors: error.errors });
      }
      console.error("Error saving lesson customization:", error);
      res.status(500).json({ message: "Failed to save customization" });
    }
  });

  // STUDENT ASSIGNMENTS
  app.get("/api/students/:studentId/assignments", requireStudentAuth, async (req, res) => {
    try {
      let studentId = req.params.studentId;

      // Development bypass - override studentId if dev headers are present
      if (process.env.NODE_ENV !== 'production') {
        const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
        const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;
        if (devBypass === 'true' && devRole === 'ELEV') {
          console.log('[routes] Dev bypass active for /api/students/:studentId/assignments endpoint, using dev student ID');
          studentId = 'a78c06fe-815a-4feb-adeb-1177699f4913'; // Use our dev student ID
        }
      }

      // Ensure student can only access their own assignments
      if (req.student?.id !== studentId && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Access denied" });
      }

      const assignments = await storage.getLessonAssignmentsByStudent(studentId);
      res.json(assignments);
    } catch (error) {
      console.error("Failed to fetch student assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // STUDENT CURRENCY
  app.get("/api/students/:studentId/currency", requireStudentAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      
      // Ensure student can only access their own currency
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let [currency] = await db
        .select()
        .from(schema.studentCurrency)
        .where(eq(schema.studentCurrency.studentId, studentId));

      // Initialize currency if doesn't exist
      if (!currency) {
        [currency] = await db
          .insert(schema.studentCurrency)
          .values({ studentId, currentCoins: 0, totalEarned: 0, totalSpent: 0 })
          .returning();
      }

      res.json(currency);
    } catch (error) {
      console.error("Error fetching student currency:", error);
      res.status(500).json({ message: "Failed to fetch currency" });
    }
  });

  // REMOVED: POST /api/students/:studentId/currency/award - This endpoint was a security vulnerability
  // Students could self-award unlimited coins. All rewards are now calculated server-side on session completion.

  // INTERNAL SECURE FUNCTION: Award currency (server-authoritative only)
  async function awardCurrencySecure(studentId: string, amount: number, description: string, sourceType: string, sourceId: string) {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // ATOMIC TRANSACTION: Everything happens inside transaction with SQL arithmetic
    const result = await db.transaction(async (tx) => {
      // Ensure currency record exists (upsert pattern)
      await tx
        .insert(schema.studentCurrency)
        .values({ 
          studentId, 
          currentCoins: 0, 
          totalEarned: 0, 
          totalSpent: 0 
        })
        .onConflictDoNothing(); // If exists, do nothing

      // Get current balance for transaction logging (inside transaction)
      const [currentCurrency] = await tx
        .select({
          currentCoins: schema.studentCurrency.currentCoins,
          totalEarned: schema.studentCurrency.totalEarned
        })
        .from(schema.studentCurrency)
        .where(eq(schema.studentCurrency.studentId, studentId));

      // Update currency using SQL arithmetic (fully atomic)
      const [updatedCurrency] = await tx
        .update(schema.studentCurrency)
        .set({
          currentCoins: sql`${schema.studentCurrency.currentCoins} + ${amount}`,
          totalEarned: sql`${schema.studentCurrency.totalEarned} + ${amount}`,
          lastEarned: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.studentCurrency.studentId, studentId))
        .returning();

      // Log transaction with atomically calculated balances
      await tx
        .insert(schema.currencyTransactions)
        .values({
          studentId,
          type: 'earned',
          amount: amount,
          description: description,
          sourceType: sourceType,
          sourceId: sourceId,
          balanceBefore: currentCurrency.currentCoins || 0,
          balanceAfter: (currentCurrency.currentCoins || 0) + amount
        });

      return updatedCurrency;
    });

    return result;
  }

  // INTERNAL SECURE FUNCTION: Ensure student ownership with teacher/admin bypass
  function ensureStudentOwnership(req: any, studentId: string) {
    // Allow teachers and admins to access any student data
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'LARARE')) {
      return true;
    }
    
    // For students, ensure they can only access their own data
    if (req.student && req.student.id === studentId) {
      return true;
    }
    
    return false;
  }

  // INTERNAL SECURE FUNCTION: Calculate flashcard session rewards (server-authoritative)
  function calculateFlashcardRewards(cardsCorrect: number, cardsCompleted: number, accuracy: number, streakAtStart: number, streakAtEnd: number, mode: string) {
    // Base coins: 10 + correct answers
    let coinsEarned = 10 + cardsCorrect;

    // Accuracy bonuses (server-verified)
    if (accuracy >= 90) coinsEarned += 5; // Bonus for excellence  
    if (accuracy >= 75) coinsEarned += 2; // Bonus for good performance

    // Streak milestone bonuses (calculated server-side, idempotent)
    let streakBonusCoins = 0;
    if (streakAtEnd === 7) {
      streakBonusCoins = 50; // 7-day streak bonus
    } else if (streakAtEnd === 30) {
      streakBonusCoins = 100; // 30-day streak bonus
    } else if (streakAtEnd > 0 && streakAtEnd % 10 === 0) {
      streakBonusCoins = 25; // Every 10-day streak gets 25 coins
    }

    const totalCoinsEarned = coinsEarned + streakBonusCoins;
    
    // Experience calculation (2 XP per correct answer)
    const experienceEarned = cardsCorrect * 2;

    return {
      coinsEarned: totalCoinsEarned,
      baseCoins: coinsEarned,
      streakBonusCoins,
      experienceEarned,
      totalReward: totalCoinsEarned
    };
  }

  // VOCABULARY EXERCISE REWARD CALCULATION
  function calculateVocabularyRewards(
    correctAnswers: number, 
    totalQuestions: number, 
    accuracyPercent: number, 
    exerciseType: string,
    streakAtStart: number, 
    streakAtEnd: number,
    completionBonus: boolean = true
  ) {
    // Base reward: 10 coins per completed exercise + bonus for correct answers
    let baseCoins = completionBonus ? 10 : 0;
    baseCoins += correctAnswers; // 1 coin per correct answer

    // Accuracy bonuses (matching requirements specification)
    let accuracyBonus = 0;
    if (accuracyPercent >= 90) {
      accuracyBonus += 5; // +5 coins for ≥90% accuracy
    } else if (accuracyPercent >= 75) {
      accuracyBonus += 2; // +2 coins for ≥75% accuracy
    }

    // Exercise type specific bonuses
    let exerciseTypeBonus = 0;
    const difficultyBonuses: Record<string, number> = {
      'true_false': 0,           // Easiest - no bonus
      'fill_in_blank': 1,        // Easy
      'matching': 1,             // Easy-Medium  
      'image_matching': 1,       // Easy-Medium
      'sentence_completion': 2,  // Medium
      'synonym_antonym': 2,      // Medium
      'crossword': 3,           // Hardest - biggest bonus
    };
    exerciseTypeBonus = difficultyBonuses[exerciseType] || 0;

    // Streak milestone bonuses (matching specification: 3-day, 7-day, 14-day, 30-day)
    let streakBonusCoins = 0;
    let milestoneReached = null;
    
    if (streakAtEnd === 3) {
      streakBonusCoins = 25; // 3-day streak milestone
      milestoneReached = '3-dagars streak';
    } else if (streakAtEnd === 7) {
      streakBonusCoins = 50; // 7-day streak milestone  
      milestoneReached = '7-dagars streak';
    } else if (streakAtEnd === 14) {
      streakBonusCoins = 75; // 14-day streak milestone
      milestoneReached = '14-dagars streak';
    } else if (streakAtEnd === 30) {
      streakBonusCoins = 100; // 30-day streak milestone
      milestoneReached = '30-dagars streak';
    } else if (streakAtEnd > 30 && streakAtEnd % 10 === 0) {
      streakBonusCoins = 25; // Every 10-day streak beyond 30
      milestoneReached = `${streakAtEnd}-dagars streak`;
    }

    const totalCoins = baseCoins + accuracyBonus + exerciseTypeBonus + streakBonusCoins;
    
    // Experience calculation (1 XP per correct answer + completion bonus)
    const experienceEarned = correctAnswers + (completionBonus ? 5 : 0);

    return {
      coinsEarned: totalCoins,
      baseCoins,
      accuracyBonus,
      exerciseTypeBonus,
      streakBonusCoins,
      experienceEarned,
      milestoneReached,
      streakAtEnd,
      achievementUnlocked: milestoneReached !== null
    };
  }

  // VOCABULARY STREAK TRACKING HELPERS
  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  function isConsecutiveDay(lastDate: Date, currentDate: Date): boolean {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(lastDate, yesterday);
  }

  function calculateNewStreak(lastStudyDate: Date | null, currentDate: Date, currentStreak: number): {
    newStreak: number;
    isNewDay: boolean;
    streakContinued: boolean;
    streakBroken: boolean;
  } {
    if (!lastStudyDate) {
      return {
        newStreak: 1,
        isNewDay: true,
        streakContinued: false,
        streakBroken: false
      };
    }

    if (isSameDay(lastStudyDate, currentDate)) {
      // Same day - no streak change
      return {
        newStreak: currentStreak,
        isNewDay: false,
        streakContinued: false,
        streakBroken: false
      };
    }

    if (isConsecutiveDay(lastStudyDate, currentDate)) {
      // Consecutive day - continue streak
      return {
        newStreak: currentStreak + 1,
        isNewDay: true,
        streakContinued: true,
        streakBroken: false
      };
    }

    // Gap in days - streak broken, start new
    return {
      newStreak: 1,
      isNewDay: true,
      streakContinued: false,
      streakBroken: true
    };
  }

  // SHOP ITEMS
  app.get("/api/shop/items", requireStudentAuth, async (req, res) => {
    try {
      const { category, subcategory } = req.query;
      let query = db.select().from(schema.shopItems).where(eq(schema.shopItems.isAvailable, true));
      
      if (category) {
        query = query.where(eq(schema.shopItems.category, category as string));
      }
      if (subcategory) {
        query = query.where(eq(schema.shopItems.subcategory, subcategory as string));
      }

      const items = await query.orderBy(schema.shopItems.sortOrder, schema.shopItems.price);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shop items:", error);
      res.status(500).json({ message: "Failed to fetch shop items" });
    }
  });

  app.post("/api/shop/items", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
    try {
      const validatedData = insertShopItemSchema.parse(req.body);
      const [item] = await db
        .insert(schema.shopItems)
        .values(validatedData)
        .returning();
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shop item data", errors: error.errors });
      }
      console.error("Error creating shop item:", error);
      res.status(500).json({ message: "Failed to create shop item" });
    }
  });

  // STUDENT PURCHASES
  app.post("/api/students/:studentId/purchases", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const { itemId } = req.body;

      // Ensure student can only make purchases for themselves
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if student already owns this item
      const existingPurchase = await db
        .select()
        .from(schema.studentPurchases)
        .where(and(
          eq(schema.studentPurchases.studentId, studentId),
          eq(schema.studentPurchases.itemId, itemId)
        ));

      if (existingPurchase.length > 0) {
        return res.status(400).json({ message: "Du äger redan denna vara" });
      }

      // Get item price
      const [item] = await db
        .select()
        .from(schema.shopItems)
        .where(eq(schema.shopItems.id, itemId));

      if (!item || !item.isAvailable) {
        return res.status(404).json({ message: "Varan finns inte eller är ej tillgänglig" });
      }

      // Get student currency
      const [currency] = await db
        .select()
        .from(schema.studentCurrency)
        .where(eq(schema.studentCurrency.studentId, studentId));

      if (!currency || (currency.currentCoins || 0) < item.price) {
        return res.status(400).json({ message: "Inte tillräckligt med mynt" });
      }

      // Process purchase in transaction
      const purchase = await db.transaction(async (tx) => {
        // Create purchase record
        const [newPurchase] = await tx
          .insert(schema.studentPurchases)
          .values({
            studentId,
            itemId,
            pricePaid: item.price
          })
          .returning();

        // Update currency
        const newBalance = (currency.currentCoins || 0) - item.price;
        await tx
          .update(schema.studentCurrency)
          .set({
            currentCoins: newBalance,
            totalSpent: (currency.totalSpent || 0) + item.price,
            lastSpent: new Date(),
            updatedAt: new Date()
          })
          .where(eq(schema.studentCurrency.studentId, studentId));

        // Log transaction
        await tx
          .insert(schema.currencyTransactions)
          .values({
            studentId,
            type: 'spent',
            amount: -item.price,
            description: `Köpte ${item.name}`,
            sourceType: 'shop_purchase',
            sourceId: itemId,
            balanceBefore: currency.currentCoins,
            balanceAfter: newBalance
          });

        return newPurchase;
      });

      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error processing purchase:", error);
      res.status(500).json({ message: "Köpet misslyckades" });
    }
  });

  app.get("/api/students/:studentId/purchases", requireStudentAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      
      // Ensure student can only access their own purchases
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const purchases = await db
        .select()
        .from(schema.studentPurchases)
        .innerJoin(schema.shopItems, eq(schema.studentPurchases.itemId, schema.shopItems.id))
        .where(eq(schema.studentPurchases.studentId, studentId))
        .orderBy(schema.studentPurchases.purchasedAt);

      res.json(purchases);
    } catch (error) {
      console.error("Error fetching student purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // STUDENT AVATARS
  app.get("/api/students/:studentId/avatar", requireStudentAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let [avatar] = await db
        .select()
        .from(schema.studentAvatars)
        .where(eq(schema.studentAvatars.studentId, studentId));

      // Initialize avatar if doesn't exist
      if (!avatar) {
        [avatar] = await db
          .insert(schema.studentAvatars)
          .values({ 
            studentId, 
            avatarData: {
              hair: { style: 'default', color: 'brown' },
              face: { eyes: 'normal', expression: 'happy' },
              clothing: { top: 'tshirt', bottom: 'jeans', shoes: 'sneakers', accessories: [] },
              colors: { skinTone: 'medium', hairColor: 'brown', eyeColor: 'brown' }
            }
          })
          .returning();
      }

      res.json(avatar);
    } catch (error) {
      console.error("Error fetching student avatar:", error);
      res.status(500).json({ message: "Failed to fetch avatar" });
    }
  });

  app.put("/api/students/:studentId/avatar", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { avatarData } = req.body;
      
      const [updated] = await db
        .update(schema.studentAvatars)
        .set({ 
          avatarData,
          updatedAt: new Date()
        })
        .where(eq(schema.studentAvatars.studentId, studentId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating student avatar:", error);
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // STUDENT ROOMS  
  app.get("/api/students/:studentId/room", requireStudentAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let [room] = await db
        .select()
        .from(schema.studentRooms)
        .where(eq(schema.studentRooms.studentId, studentId));

      // Initialize room if doesn't exist
      if (!room) {
        [room] = await db
          .insert(schema.studentRooms)
          .values({ 
            studentId,
            roomData: {
              furniture: [],
              decorations: [],
              lighting: [],
              background: {
                wallColor: '#f0f8ff',
                floorColor: '#d2b48c'
              }
            }
          })
          .returning();
      }

      res.json(room);
    } catch (error) {
      console.error("Error fetching student room:", error);
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  app.put("/api/students/:studentId/room", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { roomData } = req.body;
      
      const [updated] = await db
        .update(schema.studentRooms)
        .set({ 
          roomData,
          updatedAt: new Date()
        })
        .where(eq(schema.studentRooms.studentId, studentId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating student room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  // HAND RAISING SYSTEM
  app.post("/api/classes/:classId/raise-hand", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const { classId } = req.params;
      const studentId = req.student!.id;
      const { question, priority = 'normal' } = req.body;

      // Verify student belongs to this class
      const student = await db
        .select()
        .from(schema.studentAccounts)
        .where(and(
          eq(schema.studentAccounts.id, studentId),
          eq(schema.studentAccounts.classId, classId)
        ));

      if (!student.length) {
        return res.status(403).json({ message: "Du tillhör inte denna klass" });
      }

      // Check if student already has an active hand raising
      const existing = await db
        .select()
        .from(schema.handRaisings)
        .where(and(
          eq(schema.handRaisings.studentId, studentId),
          eq(schema.handRaisings.classId, classId),
          eq(schema.handRaisings.status, 'raised')
        ));

      if (existing.length > 0) {
        return res.status(400).json({ message: "Du har redan räckt upp handen" });
      }

      const [handRaising] = await db
        .insert(schema.handRaisings)
        .values({
          studentId,
          classId,
          question,
          priority,
          status: 'raised'
        })
        .returning();

      res.status(201).json(handRaising);
    } catch (error) {
      console.error("Error raising hand:", error);
      res.status(500).json({ message: "Kunde inte räcka upp hand" });
    }
  });

  app.get("/api/teacher/classes/:classId/raised-hands", requireAuth, requireRole('LARARE'), async (req, res) => {
    try {
      const { classId } = req.params;
      const teacherId = req.user!.id;

      // Verify teacher owns this class
      const teacherClass = await db
        .select()
        .from(schema.teacherClasses)
        .where(and(
          eq(schema.teacherClasses.id, classId),
          eq(schema.teacherClasses.teacherId, teacherId)
        ));

      if (!teacherClass.length) {
        return res.status(403).json({ message: "Du äger inte denna klass" });
      }

      const raisedHands = await db
        .select()
        .from(schema.handRaisings)
        .innerJoin(schema.studentAccounts, eq(schema.handRaisings.studentId, schema.studentAccounts.id))
        .where(and(
          eq(schema.handRaisings.classId, classId),
          eq(schema.handRaisings.status, 'raised')
        ))
        .orderBy(schema.handRaisings.priority, schema.handRaisings.raisedAt);

      res.json(raisedHands);
    } catch (error) {
      console.error("Error fetching raised hands:", error);
      res.status(500).json({ message: "Failed to fetch raised hands" });
    }
  });

  app.put("/api/teacher/hand-raisings/:id/acknowledge", requireAuth, requireRole('LARARE'), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      const teacherId = req.user!.id;

      const [updated] = await db
        .update(schema.handRaisings)
        .set({
          status: 'acknowledged',
          acknowledgedBy: teacherId,
          acknowledgedAt: new Date()
        })
        .where(eq(schema.handRaisings.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error acknowledging hand raising:", error);
      res.status(500).json({ message: "Failed to acknowledge hand raising" });
    }
  });

  // CURRENCY TRANSACTIONS
  app.get("/api/students/:studentId/transactions", requireStudentAuth, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      
      if (req.student?.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const transactions = await db
        .select()
        .from(schema.currencyTransactions)
        .where(eq(schema.currencyTransactions.studentId, studentId))
        .orderBy(schema.currencyTransactions.createdAt);

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching currency transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Store reference to ClassroomWebSocket for classroom APIs
  (app as any).classroomWebSocket = classroomWebSocket;

  // ========================================
  // VOCABULARY SYSTEM API ROUTES
  // ========================================

  // Vocabulary Sets Routes
  
  // GET /api/vocabulary/sets - Get all vocabulary sets
  app.get("/api/vocabulary/sets", requireAuth, async (req, res) => {
    try {
      const sets = await storage.getVocabularySets();
      res.json(sets);
    } catch (error) {
      console.error("Error fetching vocabulary sets:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary sets" });
    }
  });

  // GET /api/vocabulary/sets/published - Get published vocabulary sets
  app.get("/api/vocabulary/sets/published", async (req, res) => {
    try {
      const sets = await storage.getPublishedVocabularySets();
      res.json(sets);
    } catch (error) {
      console.error("Error fetching published vocabulary sets:", error);
      res.status(500).json({ error: "Failed to fetch published vocabulary sets" });
    }
  });

  // GET /api/vocabulary/sets/stats - Get vocabulary stats for multiple sets (efficient bulk fetching)
  app.get("/api/vocabulary/sets/stats", async (req, res) => {
    try {
      const validatedQuery = vocabularyStatsQuerySchema.parse(req.query);
      const setIds = validatedQuery.ids;

      // If no ids provided, return empty array
      if (setIds.length === 0) {
        return res.json([]);
      }

      // Fetch stats for all requested sets efficiently
      const statsPromises = setIds.map(async (setId) => {
        try {
          const [words, exercises] = await Promise.all([
            storage.getVocabularyWordsForSet(setId),
            storage.getVocabularyExercisesForSet(setId)
          ]);
          return {
            setId,
            wordCount: words.length,
            exerciseCount: exercises.length
          };
        } catch (error) {
          console.error(`Error fetching stats for set ${setId}:`, error);
          return {
            setId,
            wordCount: 0,
            exerciseCount: 0
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      const validatedResponse = vocabularyStatsResponseSchema.parse(stats);
      res.json(validatedResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Error fetching vocabulary stats:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary stats" });
    }
  });

  // GET /api/vocabulary/sets/:id - Get specific vocabulary set
  app.get("/api/vocabulary/sets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const set = await storage.getVocabularySet(id);
      if (!set) {
        return res.status(404).json({ error: "Vocabulary set not found" });
      }
      res.json(set);
    } catch (error) {
      console.error("Error fetching vocabulary set:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary set" });
    }
  });

  // Temporary local vocabulary schemas to bypass broken shared/schema imports
  const localVocabularySetSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    themeColor: z.string().regex(/^#[0-9A-F]{6}$/i).default("#3B82F6"),
    frameColor: z.string().regex(/^#[0-9A-F]{6}$/i).default("#1F2937"),
    orderNumbersColor: z.string().regex(/^#[0-9A-F]{6}$/i).default("#F59E0B"),
    bannerImage: z.string().optional(),
    isPublished: z.boolean().default(false),
  });

  const localVocabularyWordSchema = z.object({
    setId: z.string(),
    term: z.string().min(1).max(255),  // Frontend sends 'term' not 'word'
    definition: z.string().min(1),
    synonym: z.string().optional(),
    antonym: z.string().optional(),
    example: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner").optional(),
    orderIndex: z.number().int().min(0).default(0),
    // Additional fields that frontend sends
    imageUrl: z.string().optional(),
    pronunciationUrl: z.string().optional(),
    phonetic: z.string().optional(),
  });

  const localVocabularyExerciseSchema = z.object({
    setId: z.string(),
    type: z.enum(["matching", "fill_in_blank", "true_false", "multiple_choice", "flashcards"]),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    instructions: z.string().optional(),
    config: z.record(z.any()).default({}),
    orderIndex: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    timeLimit: z.number().int().min(0).optional(),
    passingScore: z.number().int().min(0).max(100).default(70),
    // Additional fields that frontend sends
    pointsPerCorrect: z.number().optional(),
    minPassingScore: z.number().int().min(0).max(100).optional(),
    allowRetries: z.boolean().optional(),
  });

  // POST /api/vocabulary/sets - Create new vocabulary set (Admin only)
  app.post("/api/vocabulary/sets", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      console.log("Creating vocabulary set with data:", req.body);
      const validatedData = localVocabularySetSchema.strict().parse(req.body);
      console.log("Validated data:", validatedData);
      const newSet = await storage.createVocabularySet(validatedData);
      console.log("Created vocabulary set:", newSet);
      res.status(201).json(newSet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating vocabulary set:", error);
      res.status(500).json({ error: "Failed to create vocabulary set" });
    }
  });

  // PUT /api/vocabulary/sets/:id - Update vocabulary set (Admin only)
  app.put("/api/vocabulary/sets/:id", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating vocabulary set with data:", req.body);
      const validatedData = localVocabularySetSchema.partial().strict().parse(req.body);
      console.log("Validated update data:", validatedData);
      const updatedSet = await storage.updateVocabularySet(id, validatedData);
      console.log("Updated vocabulary set:", updatedSet);
      res.json(updatedSet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Update validation error:", error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating vocabulary set:", error);
      res.status(500).json({ error: "Failed to update vocabulary set" });
    }
  });

  // DELETE /api/vocabulary/sets/:id - Delete vocabulary set (Admin only)
  app.delete("/api/vocabulary/sets/:id", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVocabularySet(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vocabulary set:", error);
      res.status(500).json({ error: "Failed to delete vocabulary set" });
    }
  });

  // Vocabulary Words Routes

  // GET /api/vocabulary/sets/:setId/words - Get words for a set
  app.get("/api/vocabulary/sets/:setId/words", requireAuth, async (req, res) => {
    try {
      const { setId } = req.params;
      const words = await storage.getVocabularyWords(setId);
      res.json(words);
    } catch (error) {
      console.error("Error fetching vocabulary words:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary words" });
    }
  });

  // GET /api/vocabulary/words/:id - Get specific vocabulary word
  app.get("/api/vocabulary/words/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const word = await storage.getVocabularyWord(id);
      if (!word) {
        return res.status(404).json({ error: "Vocabulary word not found" });
      }
      res.json(word);
    } catch (error) {
      console.error("Error fetching vocabulary word:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary word" });
    }
  });


  // POST /api/vocabulary/sets/:setId/words - Create new vocabulary word (Admin only)
  app.post("/api/vocabulary/sets/:setId/words", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { setId } = req.params;
      console.log("Creating vocabulary word with data:", { ...req.body, setId });
      const validatedData = localVocabularyWordSchema.strict().parse({ ...req.body, setId });
      console.log("Validated word data:", validatedData);
      const newWord = await storage.createVocabularyWord(validatedData);
      console.log("Created vocabulary word:", newWord);
      res.status(201).json(newWord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Word validation error:", error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating vocabulary word:", error);
      res.status(500).json({ error: "Failed to create vocabulary word" });
    }
  });

  // PUT /api/vocabulary/words/:id - Update vocabulary word (Admin only)
  app.put("/api/vocabulary/words/:id", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertVocabularyWordSchema.partial().strict().parse(req.body);
      const updatedWord = await storage.updateVocabularyWord(id, validatedData);
      res.json(updatedWord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating vocabulary word:", error);
      res.status(500).json({ error: "Failed to update vocabulary word" });
    }
  });

  // DELETE /api/vocabulary/words/:id - Delete vocabulary word (Admin only)
  app.delete("/api/vocabulary/words/:id", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVocabularyWord(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vocabulary word:", error);
      res.status(500).json({ error: "Failed to delete vocabulary word" });
    }
  });

  // Vocabulary Exercises Routes

  // GET /api/vocabulary/sets/:setId/exercises - Get exercises for a set
  app.get("/api/vocabulary/sets/:setId/exercises", requireAuth, async (req, res) => {
    try {
      const { setId } = req.params;
      const exercises = await storage.getVocabularyExercises(setId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching vocabulary exercises:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary exercises" });
    }
  });

  // GET /api/vocabulary/sets/:setId/exercises/active - Get active exercises for a set
  app.get("/api/vocabulary/sets/:setId/exercises/active", requireAuth, async (req, res) => {
    try {
      const { setId } = req.params;
      const exercises = await storage.getActiveVocabularyExercises(setId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching active vocabulary exercises:", error);
      res.status(500).json({ error: "Failed to fetch active vocabulary exercises" });
    }
  });

  // GET /api/vocabulary/exercises/:id - Get specific vocabulary exercise
  app.get("/api/vocabulary/exercises/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const exercise = await storage.getVocabularyExercise(id);
      if (!exercise) {
        return res.status(404).json({ error: "Vocabulary exercise not found" });
      }
      res.json(exercise);
    } catch (error) {
      console.error("Error fetching vocabulary exercise:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary exercise" });
    }
  });

  // POST /api/vocabulary/sets/:setId/exercises - Create new vocabulary exercise (Admin only)
  app.post("/api/vocabulary/sets/:setId/exercises", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { setId } = req.params;
      console.log("Creating vocabulary exercise with data:", req.body);
      const validatedData = localVocabularyExerciseSchema.strict().parse({ ...req.body, setId });
      console.log("Validated exercise data:", validatedData);
      const newExercise = await storage.createVocabularyExercise(validatedData);
      console.log("Created vocabulary exercise:", newExercise);
      res.status(201).json(newExercise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Exercise validation error:", error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating vocabulary exercise:", error);
      res.status(500).json({ error: "Failed to create vocabulary exercise" });
    }
  });

  // PUT /api/vocabulary/exercises/:id - Update vocabulary exercise (Admin only)
  app.put("/api/vocabulary/exercises/:id", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating vocabulary exercise with data:", req.body);
      const validatedData = localVocabularyExerciseSchema.partial().strict().parse(req.body);
      console.log("Validated exercise update data:", validatedData);
      const updatedExercise = await storage.updateVocabularyExercise(id, validatedData);
      console.log("Updated vocabulary exercise:", updatedExercise);
      res.json(updatedExercise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Exercise update validation error:", error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating vocabulary exercise:", error);
      res.status(500).json({ error: "Failed to update vocabulary exercise" });
    }
  });

  // DELETE /api/vocabulary/exercises/:id - Delete vocabulary exercise (Admin only)
  app.delete("/api/vocabulary/exercises/:id", requireAuth, requireRole("ADMIN"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVocabularyExercise(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vocabulary exercise:", error);
      res.status(500).json({ error: "Failed to delete vocabulary exercise" });
    }
  });

  // Vocabulary Attempts Routes

  // GET /api/vocabulary/exercises/:exerciseId/attempts - Get attempts for an exercise (Admin only)
  app.get("/api/vocabulary/exercises/:exerciseId/attempts", requireAuth, requireRole("ADMIN"), async (req, res) => {
    try {
      const { exerciseId } = req.params;
      const attempts = await storage.getVocabularyAttempts(exerciseId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching vocabulary attempts:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary attempts" });
    }
  });

  // GET /api/vocabulary/exercises/:exerciseId/attempts/student - Get student's attempts for an exercise
  app.get("/api/vocabulary/exercises/:exerciseId/attempts/student", requireStudentAuth, async (req, res) => {
    try {
      const { exerciseId } = req.params;
      const studentId = (req.user as any)?.id;
      if (!studentId) {
        return res.status(401).json({ error: "Student authentication required" });
      }
      const attempts = await storage.getStudentVocabularyAttempts(studentId, exerciseId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching student vocabulary attempts:", error);
      res.status(500).json({ error: "Failed to fetch student vocabulary attempts" });
    }
  });

  // GET /api/vocabulary/attempts/:id - Get specific vocabulary attempt
  app.get("/api/vocabulary/attempts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const attempt = await storage.getVocabularyAttempt(id);
      if (!attempt) {
        return res.status(404).json({ error: "Vocabulary attempt not found" });
      }
      
      // Students can only access their own attempts
      if (req.user?.role === 'ELEV' && attempt.studentId !== req.user?.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(attempt);
    } catch (error) {
      console.error("Error fetching vocabulary attempt:", error);
      res.status(500).json({ error: "Failed to fetch vocabulary attempt" });
    }
  });

  // SECURITY: SERVER-SIDE VOCABULARY ANSWER VALIDATION FUNCTION
  // CRITICAL FIX: Now validates against DATABASE-STORED exercise config, not client data
  function validateVocabularyAnswers(exerciseConfig: any, studentResponses: any[]): {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    validatedResponses: any[];
  } {
    if (!exerciseConfig || !studentResponses || !Array.isArray(studentResponses)) {
      return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, validatedResponses: [] };
    }

    let correctCount = 0;
    const validatedResponses = studentResponses.map((response, questionIndex) => {
      // SERVER-AUTHORITATIVE: Validate against DATABASE-STORED exercise config
      // NEVER trust client-supplied correctAnswer fields
      let isCorrect = false;
      
      try {
        // Validate based on exercise type using SERVER-STORED configuration
        switch (exerciseConfig.type) {
          case 'true_false':
            isCorrect = validateTrueFalseAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'fill_in_blank':  
            isCorrect = validateFillInBlankAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'matching':
            isCorrect = validateMatchingAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'image_matching':
            isCorrect = validateImageMatchingAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'sentence_completion':
            isCorrect = validateSentenceCompletionAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'synonym_antonym':
            isCorrect = validateSynonymAntonymAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'multiple_choice':
            isCorrect = validateMultipleChoiceAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'definition_matching':
            isCorrect = validateDefinitionMatchingAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'word_association':
            isCorrect = validateWordAssociationAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'spelling':
            isCorrect = validateSpellingAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'flashcards':
            isCorrect = validateFlashcardAnswer(exerciseConfig, response, questionIndex);
            break;
          case 'crossword':
            isCorrect = validateCrosswordAnswer(exerciseConfig, response, questionIndex);
            break;
          default:
            console.warn(`Unsupported exercise type: ${exerciseConfig.type}`);
            isCorrect = false;
        }
      } catch (error) {
        console.error(`Validation error for question ${questionIndex}:`, error);
        isCorrect = false; // Fail-safe: if validation fails, mark as incorrect
      }

      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: response.questionId || questionIndex,
        userAnswer: response.userAnswer,
        isCorrect, // SERVER-CALCULATED from database config, overriding any client value
        validatedAt: new Date().toISOString(),
        exerciseType: exerciseConfig.type
      };
    });

    const totalQuestions = studentResponses.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      totalQuestions,
      correctAnswers: correctCount,
      accuracy,
      validatedResponses
    };
  }

  // EXERCISE TYPE VALIDATORS - All validate against DATABASE config, not client data
  
  function validateTrueFalseAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctAnswer = question.correctAnswer; // From DATABASE config
    const userAnswer = response.userAnswer;
    
    // Convert to boolean for comparison
    const correctBool = typeof correctAnswer === 'boolean' ? correctAnswer : correctAnswer === 'true';
    const userBool = typeof userAnswer === 'boolean' ? userAnswer : userAnswer === 'true';
    
    return correctBool === userBool;
  }

  function validateFillInBlankAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctAnswers = Array.isArray(question.correctAnswers) 
      ? question.correctAnswers 
      : [question.correctAnswer];
    
    const userAnswer = String(response.userAnswer || '').toLowerCase().trim();
    
    return correctAnswers.some((correct: any) => 
      String(correct).toLowerCase().trim() === userAnswer
    );
  }

  function validateMatchingAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question || !question.pairs) return false;
    
    const correctPairs = question.pairs; // Array of {left: string, right: string}
    const userPairs = response.userAnswer; // Should be same format
    
    if (!Array.isArray(userPairs) || userPairs.length !== correctPairs.length) {
      return false;
    }
    
    // Check if all pairs match (order doesn't matter)
    return userPairs.every((userPair: any) => 
      correctPairs.some((correctPair: any) => 
        correctPair.left === userPair.left && correctPair.right === userPair.right
      )
    );
  }

  function validateImageMatchingAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctAnswer = question.correctImageId || question.correctAnswer;
    const userAnswer = response.userAnswer;
    
    return String(correctAnswer) === String(userAnswer);
  }

  function validateSentenceCompletionAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctAnswers = Array.isArray(question.correctAnswers) 
      ? question.correctAnswers 
      : [question.correctAnswer];
    
    const userAnswer = String(response.userAnswer || '').toLowerCase().trim();
    
    return correctAnswers.some((correct: any) => 
      String(correct).toLowerCase().trim() === userAnswer
    );
  }

  function validateSynonymAntonymAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctAnswers = Array.isArray(question.correctAnswers) 
      ? question.correctAnswers 
      : [question.correctAnswer];
    
    const userAnswer = String(response.userAnswer || '').toLowerCase().trim();
    
    return correctAnswers.some((correct: any) => 
      String(correct).toLowerCase().trim() === userAnswer
    );
  }

  function validateMultipleChoiceAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctAnswer = question.correctOptionIndex || question.correctAnswer;
    const userAnswer = response.userAnswer;
    
    return correctAnswer === userAnswer;
  }

  function validateDefinitionMatchingAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question || !question.matches) return false;
    
    const correctMatches = question.matches; // Array of {term: string, definition: string}
    const userMatches = response.userAnswer;
    
    if (!Array.isArray(userMatches) || userMatches.length !== correctMatches.length) {
      return false;
    }
    
    // Check if all matches are correct
    return userMatches.every((userMatch: any) => 
      correctMatches.some((correctMatch: any) => 
        correctMatch.term === userMatch.term && correctMatch.definition === userMatch.definition
      )
    );
  }

  function validateWordAssociationAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctAnswers = Array.isArray(question.correctAnswers) 
      ? question.correctAnswers 
      : [question.correctAnswer];
    
    const userAnswer = String(response.userAnswer || '').toLowerCase().trim();
    
    return correctAnswers.some((correct: any) => 
      String(correct).toLowerCase().trim() === userAnswer
    );
  }

  function validateSpellingAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    const correctSpelling = question.correctSpelling || question.word;
    const userSpelling = String(response.userAnswer || '').trim();
    
    // Exact match for spelling (case-insensitive)
    return correctSpelling.toLowerCase() === userSpelling.toLowerCase();
  }

  function validateFlashcardAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    // For flashcards, answer could be definition, synonym, or translation
    const correctAnswers = Array.isArray(question.correctAnswers) 
      ? question.correctAnswers 
      : [question.correctAnswer, question.definition, question.translation].filter(Boolean);
    
    const userAnswer = String(response.userAnswer || '').toLowerCase().trim();
    
    return correctAnswers.some((correct: any) => 
      String(correct).toLowerCase().trim() === userAnswer
    );
  }

  function validateCrosswordAnswer(config: any, response: any, questionIndex: number): boolean {
    const question = config.questions?.[questionIndex];
    if (!question) return false;
    
    // For crosswords, validate word placement and spelling
    const correctWord = question.word || question.correctAnswer;
    const userAnswer = String(response.userAnswer || '').toLowerCase().trim();
    
    // Support both word answers and coordinate-based answers
    if (question.position && response.position) {
      // Validate position matches (for crossword grid placement)
      const correctPosition = question.position;
      const userPosition = response.position;
      
      const positionMatch = correctPosition.row === userPosition.row && 
                           correctPosition.col === userPosition.col &&
                           correctPosition.direction === userPosition.direction;
      
      return positionMatch && correctWord.toLowerCase() === userAnswer;
    } else {
      // Simple word matching for crossword clues
      return correctWord.toLowerCase() === userAnswer;
    }
  }

  // POST /api/vocabulary/exercises/:exerciseId/attempts - Create new vocabulary attempt with SECURE server-side validation (Student only)
  app.post("/api/vocabulary/exercises/:exerciseId/attempts", requireStudentAuth, requireCsrf, async (req, res) => {
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'];
    
    try {
      const { exerciseId } = req.params;
      const studentId = (req.user as any)?.id;
      if (!studentId) {
        await logAuditEvent('VOCABULARY_ATTEMPT_UNAUTHORIZED', null, false, ipAddress, userAgent, { exerciseId });
        return res.status(401).json({ error: "Student authentication required" });
      }
      
      // Validate the incoming attempt data
      const validatedData = insertVocabularyAttemptSchema.strict().parse({ 
        ...req.body, 
        exerciseId, 
        studentId 
      });

      // IDEMPOTENCY CHECK: Prevent duplicate submissions
      if (validatedData.idempotencyKey) {
        const [existingAttempt] = await db
          .select()
          .from(schema.vocabularyAttempts)
          .where(eq(schema.vocabularyAttempts.idempotencyKey, validatedData.idempotencyKey))
          .limit(1);
          
        if (existingAttempt) {
          await logAuditEvent('VOCABULARY_ATTEMPT_DUPLICATE', studentId, false, ipAddress, userAgent, { 
            exerciseId, 
            idempotencyKey: validatedData.idempotencyKey,
            existingAttemptId: existingAttempt.id
          });
          return res.status(409).json({ 
            error: "Duplicate submission detected", 
            existingAttempt: existingAttempt 
          });
        }
      }

      // Only award rewards for completed attempts
      if (validatedData.status !== 'completed') {
        const newAttempt = await storage.createVocabularyAttempt(validatedData);
        return res.status(201).json(newAttempt);
      }

      // ATOMIC TRANSACTION: All operations must succeed together
      const result = await db.transaction(async (tx) => {
        // Get exercise details for reward calculation
        const exercise = await storage.getVocabularyExercise(exerciseId);
        if (!exercise) {
          throw new Error("Exercise not found");
        }

        // SECURITY: SERVER-SIDE VALIDATION - Never trust client-supplied performance metrics
        const clientAnswers = validatedData.answers || { responses: [] };
        const validation = validateVocabularyAnswers(exercise.config, clientAnswers.responses);
        
        // SERVER-CALCULATED metrics (ignore ALL client values)
        const totalQuestions = validation.totalQuestions;
        const correctAnswers = validation.correctAnswers;
        const accuracyPercent = validation.accuracy;

        // Get or create student's vocabulary streak record
        let streakRecord = await storage.getVocabularyStreak(studentId);
        const currentDate = new Date();
        
        if (!streakRecord) {
          // Create new streak record for first-time user
          streakRecord = await storage.createVocabularyStreak({
            studentId,
            currentStreak: 0,
            longestStreak: 0,
            lastStudyDate: null,
            totalDaysStudied: 0,
            totalExercisesCompleted: 0,
            totalCorrectAnswers: 0,
            totalCoinsEarned: 0,
            achievements: [],
            milestones: []
          });
        }

        // Calculate streak changes
        const streakAtStart = streakRecord.currentStreak;
        const streakCalc = calculateNewStreak(streakRecord.lastStudyDate, currentDate, streakAtStart);
        const streakAtEnd = streakCalc.newStreak;

        // Calculate rewards based on SERVER-VALIDATED performance and streaks
        const rewardInfo = calculateVocabularyRewards(
          correctAnswers,
          totalQuestions,
          accuracyPercent,
          exercise.type,
          streakAtStart,
          streakAtEnd,
          true // completion bonus
        );

        // Create the attempt record with SERVER-CALCULATED reward information and validated answers
        const attemptData = {
          ...validatedData,
          answers: {
            responses: validation.validatedResponses,
            totalQuestions,
            correctCount: correctAnswers,
            incorrectCount: totalQuestions - correctAnswers,
            skippedCount: 0,
            hintsUsed: 0,
            streakCount: 0
          },
          accuracy: accuracyPercent,
          streakAtStart,
          streakAtEnd,
          coinsEarned: rewardInfo.coinsEarned,
          experienceEarned: rewardInfo.experienceEarned,
          rewardedAt: new Date()
        };

        const newAttempt = await storage.createVocabularyAttempt(attemptData);

        // SECURITY: Award coins securely with atomic transaction (prevents double-awards)
        if (rewardInfo.coinsEarned > 0) {
          await awardCurrencySecure(
            studentId,
            rewardInfo.coinsEarned,
            `Ordförrådsövning: ${exercise.title}`,
            'vocabulary_exercise',
            exerciseId
          );
        }

        // Update vocabulary streak record
        const updatedStreak = await storage.updateVocabularyStreak(streakRecord.id, {
          currentStreak: streakAtEnd,
          longestStreak: Math.max(streakRecord.longestStreak, streakAtEnd),
          lastStudyDate: streakCalc.isNewDay ? currentDate : streakRecord.lastStudyDate,
          streakStartDate: streakAtEnd === 1 ? currentDate : streakRecord.streakStartDate,
          totalDaysStudied: streakCalc.isNewDay ? 
            (streakRecord.totalDaysStudied || 0) + 1 : 
            (streakRecord.totalDaysStudied || 0),
          totalExercisesCompleted: (streakRecord.totalExercisesCompleted || 0) + 1,
          totalCorrectAnswers: (streakRecord.totalCorrectAnswers || 0) + correctAnswers,
          totalCoinsEarned: (streakRecord.totalCoinsEarned || 0) + rewardInfo.coinsEarned,
          updatedAt: currentDate
        });

        // Check for new achievements and milestones
        const achievements = [...(streakRecord.achievements || [])];
        
        if (rewardInfo.achievementUnlocked && rewardInfo.milestoneReached) {
          const newAchievement = {
            id: `streak_${streakAtEnd}_${Date.now()}`,
            type: 'streak' as const,
            title: rewardInfo.milestoneReached,
            description: `Fantastiskt! Du har tränat ordförråd ${streakAtEnd} dagar i rad!`,
            earnedAt: currentDate.toISOString(),
            coinsAwarded: rewardInfo.streakBonusCoins,
            criteria: { streakDays: streakAtEnd }
          };
          achievements.push(newAchievement);

          // Update achievements in streak record
          await storage.updateVocabularyStreak(streakRecord.id, {
            achievements
          });
        }

        // AUDIT LOGGING: Log successful completion with server-calculated metrics
        await logAuditEvent('VOCABULARY_ATTEMPT_COMPLETED', studentId, true, ipAddress, userAgent, {
          exerciseId,
          attemptId: newAttempt.id,
          serverValidation: {
            totalQuestions,
            correctAnswers,
            accuracy: accuracyPercent,
            coinsEarned: rewardInfo.coinsEarned,
            streakAtStart,
            streakAtEnd
          },
          clientMetricsIgnored: true,
          idempotencyKey: validatedData.idempotencyKey
        });

        // Return comprehensive response with SERVER-CALCULATED reward information
        return {
          attempt: newAttempt,
          rewards: {
            coinsEarned: rewardInfo.coinsEarned,
            baseCoins: rewardInfo.baseCoins,
            accuracyBonus: rewardInfo.accuracyBonus,
            exerciseTypeBonus: rewardInfo.exerciseTypeBonus,
            streakBonusCoins: rewardInfo.streakBonusCoins,
            experienceEarned: rewardInfo.experienceEarned,
            totalReward: rewardInfo.coinsEarned,
            // Include server validation info for transparency (but not used for rewards)
            serverValidation: {
              totalQuestions,
              correctAnswers,
              accuracy: accuracyPercent,
              clientMetricsIgnored: true
            }
          },
          streak: {
            current: streakAtEnd,
            previous: streakAtStart,
            longest: updatedStreak.longestStreak,
            isNewDay: streakCalc.isNewDay,
            continued: streakCalc.streakContinued,
            broken: streakCalc.streakBroken
          },
          achievement: rewardInfo.achievementUnlocked ? {
            title: rewardInfo.milestoneReached,
            coinsAwarded: rewardInfo.streakBonusCoins,
            type: 'streak'
          } : null
        };
      });

      // Return the secure transaction result
      res.status(201).json(result);
    } catch (error) {
      // AUDIT LOGGING: Log all errors for security analysis
      await logAuditEvent('VOCABULARY_ATTEMPT_ERROR', studentId || null, false, ipAddress, userAgent, { 
        exerciseId: req.params.exerciseId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof z.ZodError ? 'validation' : 'system'
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid attempt data", details: error.errors });
      }
      console.error("Error creating vocabulary attempt:", error);
      res.status(500).json({ error: "Failed to create vocabulary attempt" });
    }
  });

  // PUT /api/vocabulary/attempts/:id - Update vocabulary attempt (Student only for their own attempts)
  app.put("/api/vocabulary/attempts/:id", requireAuth, requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First, get the existing attempt to check permissions
      const existingAttempt = await storage.getVocabularyAttempt(id);
      if (!existingAttempt) {
        return res.status(404).json({ error: "Vocabulary attempt not found" });
      }
      
      // Students can only update their own attempts
      if (req.user?.role === 'ELEV' && existingAttempt.studentId !== req.user?.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = insertVocabularyAttemptSchema.partial().strict().parse(req.body);
      const updatedAttempt = await storage.updateVocabularyAttempt(id, validatedData);
      res.json(updatedAttempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating vocabulary attempt:", error);
      res.status(500).json({ error: "Failed to update vocabulary attempt" });
    }
  });

  // ============================================================================
  // VOCABULARY PDF EXPORT ENDPOINTS
  // ============================================================================

  // POST /api/vocabulary/sets/:id/export/pdf - Export vocabulary set as PDF
  app.post("/api/vocabulary/sets/:id/export/pdf", requireAuth, requireRole("LARARE"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = vocabularyPDFExportSchema.parse(req.body);
      const teacherId = req.user!.id;
      
      // Fetch vocabulary set and related data
      const [vocabularySet, words, exercises] = await Promise.all([
        storage.getVocabularySet(id),
        storage.getVocabularyWordsForSet(id),
        storage.getVocabularyExercisesForSet(id)
      ]);

      if (!vocabularySet) {
        return res.status(404).json({ error: "Vocabulary set not found" });
      }

      // Security check: Ensure teacher has access to this vocabulary set
      if (vocabularySet.teacherId !== teacherId) {
        return res.status(403).json({ error: "Access denied: You do not have permission to export this vocabulary set" });
      }

      // Filter exercises by type if specified
      let filteredExercises = exercises;
      if (validatedData.exerciseTypes && validatedData.exerciseTypes.length > 0) {
        filteredExercises = exercises.filter(ex => validatedData.exerciseTypes!.includes(ex.type));
      }

      // Generate PDF
      const pdfBuffer = await pdfExportService.generateVocabularySetPDF(
        vocabularySet,
        words,
        filteredExercises,
        validatedData
      );

      // Set response headers for PDF download
      const filename = `${vocabularySet.title.replace(/[^a-zA-Z0-9-_]/g, '_')}_${validatedData.exportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid export parameters", details: error.errors });
      }
      console.error("Error generating vocabulary set PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF export" });
    }
  });

  // POST /api/vocabulary/exercises/:id/export/pdf - Export exercise worksheet as PDF
  app.post("/api/vocabulary/exercises/:id/export/pdf", requireAuth, requireRole("LARARE"), requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = exerciseWorksheetPDFExportSchema.parse(req.body);
      const teacherId = req.user!.id;
      
      // Fetch exercise and related data
      const exercise = await storage.getVocabularyExercise(id);
      if (!exercise) {
        return res.status(404).json({ error: "Exercise not found" });
      }

      const [vocabularySet, words] = await Promise.all([
        storage.getVocabularySet(exercise.setId),
        storage.getVocabularyWordsForSet(exercise.setId)
      ]);

      if (!vocabularySet) {
        return res.status(404).json({ error: "Vocabulary set not found" });
      }

      // Security check: Ensure teacher has access to this exercise's vocabulary set
      if (vocabularySet.teacherId !== teacherId) {
        return res.status(403).json({ error: "Access denied: You do not have permission to export this exercise" });
      }

      // Generate PDF
      const pdfBuffer = await pdfExportService.generateExerciseWorksheetPDF(
        vocabularySet,
        words,
        exercise,
        validatedData
      );

      // Set response headers for PDF download
      const filename = `${exercise.title.replace(/[^a-zA-Z0-9-_]/g, '_')}_${validatedData.exportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid export parameters", details: error.errors });
      }
      console.error("Error generating exercise worksheet PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF export" });
    }
  });

  // POST /api/vocabulary/export/batch/pdf - Export multiple vocabulary sets as PDF
  app.post("/api/vocabulary/export/batch/pdf", requireAuth, requireRole("LARARE"), requireCsrf, async (req, res) => {
    try {
      const validatedData = batchVocabularyPDFExportSchema.parse(req.body);
      const teacherId = req.user!.id;
      
      // Fetch all requested vocabulary sets and their data
      const vocabularyData = await Promise.all(
        validatedData.setIds.map(async (setId) => {
          try {
            const [set, words, exercises] = await Promise.all([
              storage.getVocabularySet(setId),
              storage.getVocabularyWordsForSet(setId),
              storage.getVocabularyExercisesForSet(setId)
            ]);
            
            if (!set) {
              console.warn(`Vocabulary set ${setId} not found, skipping`);
              return null;
            }

            // Security check: Ensure teacher has access to this vocabulary set
            if (set.teacherId !== teacherId) {
              console.warn(`Teacher ${teacherId} does not have access to vocabulary set ${setId}, skipping`);
              return null;
            }
            
            return { set, words, exercises };
          } catch (error) {
            console.error(`Error fetching vocabulary set ${setId}:`, error);
            return null;
          }
        })
      );

      // Filter out failed fetches
      const validVocabularyData = vocabularyData.filter(Boolean) as Array<{
        set: schema.VocabularySet;
        words: schema.VocabularyWord[];
        exercises: schema.VocabularyExercise[];
      }>;

      if (validVocabularyData.length === 0) {
        return res.status(404).json({ error: "No valid vocabulary sets found" });
      }

      // Generate PDF
      const pdfBuffer = await pdfExportService.generateBatchVocabularyPDF(
        validVocabularyData,
        validatedData
      );

      // Set response headers for PDF download
      const filename = `vocabulary_collection_${validatedData.exportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid export parameters", details: error.errors });
      }
      console.error("Error generating batch vocabulary PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF export" });
    }
  });

  // ===============================
  // Flashcard System API Routes
  // ===============================

  // Flashcard Progress Routes
  
  // GET /api/flashcard/progress/by-set/:studentId/:setId - Get flashcard progress for student by set
  app.get("/api/flashcard/progress/by-set/:studentId/:setId", requireStudentAuth, async (req, res) => {
    try {
      const { studentId, setId } = req.params;
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, studentId)) {
        return res.status(403).json({ error: "Access denied - you can only access your own flashcard progress" });
      }
      
      const progress = await storage.getStudentFlashcardProgress(studentId, setId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching flashcard progress by set:", error);
      res.status(500).json({ error: "Failed to fetch flashcard progress" });
    }
  });

  // GET /api/flashcard/progress/by-word/:studentId/:wordId - Get specific word progress
  app.get("/api/flashcard/progress/by-word/:studentId/:wordId", requireStudentAuth, async (req, res) => {
    try {
      const { studentId, wordId } = req.params;
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, studentId)) {
        return res.status(403).json({ error: "Access denied - you can only access your own flashcard progress" });
      }
      
      const progress = await storage.getFlashcardProgress(studentId, wordId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching word progress:", error);
      res.status(500).json({ error: "Failed to fetch word progress" });
    }
  });

  // POST /api/flashcard/progress - Create or update flashcard progress
  app.post("/api/flashcard/progress", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const validatedData = schema.insertFlashcardProgressSchema.parse(req.body);
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, validatedData.studentId)) {
        return res.status(403).json({ error: "Access denied - you can only modify your own flashcard progress" });
      }
      
      // Check if progress already exists for this student and word
      const existing = await storage.getFlashcardProgress(validatedData.studentId, validatedData.wordId);
      
      if (existing) {
        // Update existing progress
        const updated = await storage.updateFlashcardProgress(existing.id, validatedData);
        res.json(updated);
      } else {
        // Create new progress
        const newProgress = await storage.createFlashcardProgress(validatedData);
        res.json(newProgress);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid progress data", details: error.errors });
      }
      console.error("Error saving flashcard progress:", error);
      res.status(500).json({ error: "Failed to save flashcard progress" });
    }
  });

  // GET /api/flashcard/review/:studentId/:setId - Get words for review (spaced repetition)
  app.get("/api/flashcard/review/:studentId/:setId", requireStudentAuth, async (req, res) => {
    try {
      const { studentId, setId } = req.params;
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, studentId)) {
        return res.status(403).json({ error: "Access denied - you can only access your own review words" });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const wordsForReview = await storage.getWordsForReview(studentId, setId, limit);
      res.json(wordsForReview);
    } catch (error) {
      console.error("Error fetching words for review:", error);
      res.status(500).json({ error: "Failed to fetch words for review" });
    }
  });

  // Flashcard Streak Routes
  
  // GET /api/flashcard/streak/:studentId - Get current streak for student
  app.get("/api/flashcard/streak/:studentId", requireStudentAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, studentId)) {
        return res.status(403).json({ error: "Access denied - you can only access your own streak data" });
      }
      
      const streak = await storage.getFlashcardStreak(studentId);
      res.json(streak);
    } catch (error) {
      console.error("Error fetching flashcard streak:", error);
      res.status(500).json({ error: "Failed to fetch flashcard streak" });
    }
  });

  // POST /api/flashcard/streak - Create or update streak
  app.post("/api/flashcard/streak", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const validatedData = schema.insertFlashcardStreakSchema.parse(req.body);
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, validatedData.studentId)) {
        return res.status(403).json({ error: "Access denied - you can only modify your own streak data" });
      }
      
      // Check if streak already exists for this student
      const existing = await storage.getFlashcardStreak(validatedData.studentId);
      
      if (existing) {
        // Update existing streak
        const updated = await storage.updateFlashcardStreak(existing.id, validatedData);
        res.json(updated);
      } else {
        // Create new streak
        const newStreak = await storage.createFlashcardStreak(validatedData);
        res.json(newStreak);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid streak data", details: error.errors });
      }
      console.error("Error saving flashcard streak:", error);
      res.status(500).json({ error: "Failed to save flashcard streak" });
    }
  });

  // Flashcard Session Routes
  
  // GET /api/flashcard/sessions/:studentId/:setId? - Get flashcard sessions for student
  app.get("/api/flashcard/sessions/:studentId/:setId?", requireStudentAuth, async (req, res) => {
    try {
      const { studentId, setId } = req.params;
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, studentId)) {
        return res.status(403).json({ error: "Access denied - you can only access your own flashcard sessions" });
      }
      
      const sessions = await storage.getFlashcardSessions(studentId, setId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching flashcard sessions:", error);
      res.status(500).json({ error: "Failed to fetch flashcard sessions" });
    }
  });

  // POST /api/flashcard/sessions - Create new flashcard session
  app.post("/api/flashcard/sessions", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const validatedData = schema.insertFlashcardSessionSchema.parse(req.body);
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, validatedData.studentId)) {
        return res.status(403).json({ error: "Access denied - you can only create your own flashcard sessions" });
      }
      
      const newSession = await storage.createFlashcardSession(validatedData);
      res.json(newSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      console.error("Error creating flashcard session:", error);
      res.status(500).json({ error: "Failed to create flashcard session" });
    }
  });

  // PUT /api/flashcard/sessions/:id - Update flashcard session with ATOMIC IDEMPOTENT reward transaction
  app.put("/api/flashcard/sessions/:id", requireStudentAuth, requireCsrf, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = schema.insertFlashcardSessionSchema.partial().parse(req.body);
      
      // Get existing session to verify ownership and check completion status
      const existingSession = await storage.getFlashcardSession(id);
      if (!existingSession) {
        return res.status(404).json({ error: "Flashcard session not found" });
      }

      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, existingSession.studentId)) {
        return res.status(403).json({ error: "Access denied - you can only update your own sessions" });
      }

      // Check if this update is completing the session
      const isCompleting = !existingSession.completedAt && validatedData.completedAt;
      
      if (isCompleting) {
        // SERVER-AUTHORITATIVE CALCULATION: Recompute ALL metrics from session data, ignore client values
        let serverCardsCorrect = 0;
        let serverCardsCompleted = 0;
        let serverAccuracy = 0;
        
        if (existingSession.sessionData && existingSession.sessionData.cards) {
          const cardResults = existingSession.sessionData.cards;
          serverCardsCompleted = cardResults.length;
          serverCardsCorrect = cardResults.filter(card => 
            card.isCorrect === true || 
            card.userRating === 'easy' || 
            card.responseType === 'correct'
          ).length;
          serverAccuracy = serverCardsCompleted > 0 ? (serverCardsCorrect / serverCardsCompleted) * 100 : 0;
        }

        // Use server-calculated values, NEVER trust client data
        const streakAtStart = existingSession.streakAtStart || 0;
        const streakAtEnd = validatedData.streakAtEnd || existingSession.streakAtEnd || 0;
        const mode = existingSession.mode;

        // Server-authoritative reward calculation
        const rewardInfo = calculateFlashcardRewards(serverCardsCorrect, serverCardsCompleted, serverAccuracy, streakAtStart, streakAtEnd, mode);
        
        // Override ALL client-provided values with server-calculated ones
        validatedData.cardsCorrect = serverCardsCorrect;
        validatedData.cardsCompleted = serverCardsCompleted;
        validatedData.accuracy = serverAccuracy;
        validatedData.coinsEarned = rewardInfo.coinsEarned;
        validatedData.experienceEarned = rewardInfo.experienceEarned;
        validatedData.rewardedAt = new Date(); // Mark as rewarded to prevent double-awards

        // ATOMIC IDEMPOTENT TRANSACTION: Update session AND award currency in single transaction
        const result = await db.transaction(async (tx) => {
          // 1. CONDITIONAL UPDATE: Only update if not already rewarded (idempotent protection)
          const [updatedSession] = await tx
            .update(schema.flashcardSessions)
            .set(validatedData)
            .where(and(
              eq(schema.flashcardSessions.id, id),
              isNull(schema.flashcardSessions.rewardedAt) // Only update if not already rewarded
            ))
            .returning();

          // 2. If no rows updated, session was already rewarded (race condition protection)
          if (!updatedSession) {
            console.warn(`Attempted to re-award rewards for session ${id} - already completed by another request`);
            // Return 409 Conflict - indicates the resource was already processed
            throw new Error("ALREADY_REWARDED");
          }

          // 3. Award currency in SAME transaction if coins earned
          if (rewardInfo.coinsEarned > 0) {
            let description = `Flashcard session avslutad - ${rewardInfo.baseCoins} grundmynt`;
            if (rewardInfo.streakBonusCoins > 0) {
              description += ` + ${rewardInfo.streakBonusCoins} streak-bonus`;
            }

            // Get current currency or create if doesn't exist (within same transaction)
            let [currency] = await tx
              .select()
              .from(schema.studentCurrency)
              .where(eq(schema.studentCurrency.studentId, existingSession.studentId));

            if (!currency) {
              [currency] = await tx
                .insert(schema.studentCurrency)
                .values({ 
                  studentId: existingSession.studentId, 
                  currentCoins: 0, 
                  totalEarned: 0, 
                  totalSpent: 0 
                })
                .returning();
            }

            // Update currency atomically
            const newBalance = currency.currentCoins + rewardInfo.coinsEarned;
            await tx
              .update(schema.studentCurrency)
              .set({
                currentCoins: newBalance,
                totalEarned: currency.totalEarned + rewardInfo.coinsEarned,
                lastEarned: new Date(),
                updatedAt: new Date()
              })
              .where(eq(schema.studentCurrency.studentId, existingSession.studentId));

            // Log transaction atomically
            await tx
              .insert(schema.currencyTransactions)
              .values({
                studentId: existingSession.studentId,
                type: 'earned',
                amount: rewardInfo.coinsEarned,
                description: description,
                sourceType: 'flashcard_session',
                sourceId: id,
                balanceBefore: currency.currentCoins,
                balanceAfter: newBalance
              });
          }

          return { session: updatedSession, rewardInfo };
        });

        // Include reward information in response for client display
        res.json({
          ...result.session,
          rewardInfo: result.rewardInfo
        });
      } else {
        // Non-completing update - just update the session normally
        const updated = await storage.updateFlashcardSession(id, validatedData);
        res.json(updated);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      if (error.message === "ALREADY_REWARDED") {
        return res.status(409).json({ error: "Session rewards have already been awarded" });
      }
      console.error("Error updating flashcard session:", error);
      res.status(500).json({ error: "Failed to update flashcard session" });
    }
  });

  // GET /api/flashcard/sessions/:id - Get specific flashcard session
  app.get("/api/flashcard/sessions/:id", requireStudentAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getFlashcardSession(id);
      if (!session) {
        return res.status(404).json({ error: "Flashcard session not found" });
      }
      
      // SECURITY: Ensure student ownership with teacher/admin bypass
      if (!ensureStudentOwnership(req, session.studentId)) {
        return res.status(403).json({ error: "Access denied - you can only access your own flashcard sessions" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching flashcard session:", error);
      res.status(500).json({ error: "Failed to fetch flashcard session" });
    }
  });

  // Student progress tracking API
  app.post("/api/student-progress", async (req, res) => {
    try {
      let { studentId, assignmentId, lessonId, completedAt, timeSpent, score, answers } = req.body;

      // Development bypass - override studentId if dev headers are present
      if (process.env.NODE_ENV !== 'production') {
        const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
        const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;

        if (devBypass === 'true' && devRole === 'ELEV') {
          console.log('[routes] Dev bypass active for /api/student-progress endpoint, using dev student ID');
          studentId = 'a78c06fe-815a-4feb-adeb-1177699f4913'; // Use our dev student ID
        }
      }

      // Optional validation for authenticated users
      if (req.user?.id && req.user.id !== studentId) {
        return res.status(403).json({ error: "Du kan bara skicka in dina egna resultat" });
      }

      const now = new Date();
      const progressData = {
        studentId,
        assignmentId,
        lessonId,
        completedAt: completedAt || now.toISOString(),
        timeSpent: timeSpent || 0,
        score: score || 0,
        answers: answers || {},
        needsHelp: (score || 0) < 75 // Mark as needing help if score is below 75%
      };

      // First verify that the assignment exists and that the student has access to it
      const assignmentCheck = await db.execute(sql`
        SELECT la.id, la.title, la.is_active,
               sa.class_id as student_class_id
        FROM lesson_assignments la
        LEFT JOIN student_accounts sa ON sa.id = ${studentId}
        WHERE la.id = ${assignmentId}
        AND la.is_active = true
        AND (la.student_id = ${studentId} OR la.class_id = sa.class_id)
        LIMIT 1
      `);

      if (assignmentCheck.rows.length === 0) {
        console.error(`❌ Assignment not found or access denied: ${assignmentId} for student: ${studentId}`);

        // Check if assignment exists but student doesn't have access
        const assignmentExists = await db.execute(sql`
          SELECT id, is_active FROM lesson_assignments WHERE id = ${assignmentId} LIMIT 1
        `);

        if (assignmentExists.rows.length === 0) {
          return res.status(404).json({
            error: "Uppgiften finns inte",
            details: `Assignment ID ${assignmentId} was not found in the database`,
            assignmentId: assignmentId
          });
        } else {
          return res.status(403).json({
            error: "Du har inte behörighet att skicka in denna uppgift",
            details: `Student ${studentId} does not have access to assignment ${assignmentId}`,
            assignmentId: assignmentId
          });
        }
      }
      
      console.log(`✅ Assignment verified: ${assignmentId}`);
      
      // Check if this assignment is already completed by this student
      const existing = await db.execute(sql`
        SELECT id FROM student_lesson_progress 
        WHERE student_id = ${studentId} AND assignment_id = ${assignmentId}
        LIMIT 1
      `);

      let result;
      if (existing.rows.length > 0) {
        // Update existing record
        result = await db.execute(sql`
          UPDATE student_lesson_progress SET
            score = ${score || 0},
            time_spent = ${timeSpent || 0},
            completed_at = ${progressData.completedAt},
            progress_data = ${JSON.stringify(answers || {})},
            needs_help = ${progressData.needsHelp},
            updated_at = ${now.toISOString()}
          WHERE student_id = ${studentId} AND assignment_id = ${assignmentId}
          RETURNING id
        `);
      } else {
        // Insert new record
        result = await db.execute(sql`
          INSERT INTO student_lesson_progress (
            student_id,
            assignment_id, 
            lesson_id,
            lesson_type,
            status,
            score,
            max_score,
            time_spent,
            completed_at,
            progress_data,
            needs_help,
            created_at,
            updated_at
          ) VALUES (
            ${studentId},
            ${assignmentId},
            ${lessonId},
            'reading_lesson',
            'completed',
            ${score || 0},
            100,
            ${timeSpent || 0},
            ${progressData.completedAt},
            ${JSON.stringify(answers || {})},
            ${progressData.needsHelp},
            ${now.toISOString()},
            ${now.toISOString()}
          )
          RETURNING id
        `);
      }

      console.log('Student progress saved to database:', progressData);
      console.log(`Student ${studentId} completed assignment ${assignmentId} with score ${score}%`);

      res.json({
        message: "Framsteg sparat",
        progressId: result.rows[0]?.id || `progress_${Date.now()}`,
        ...progressData
      });
    } catch (error) {
      console.error("Error saving student progress:", error);
      
      // Enhanced error handling
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '23503') {
          // Foreign key constraint violation
          if (dbError.constraint?.includes('assignment_id')) {
            return res.status(404).json({ 
              error: "Uppgiften finns inte i systemet",
              details: "The assignment ID does not exist in the database",
              assignmentId: assignmentId
            });
          }
        }
      }
      
      res.status(500).json({ 
        error: "Kunde inte spara framsteg",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get completed assignments for a student
  app.get("/api/students/:studentId/completed-assignments", async (req, res) => {
    try {
      let studentId = req.params.studentId;

      // Development bypass - override studentId if dev headers are present
      if (process.env.NODE_ENV !== 'production') {
        const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
        const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;
        if (devBypass === 'true' && devRole === 'ELEV') {
          console.log('[routes] Dev bypass active for /api/students/:studentId/completed-assignments endpoint, using dev student ID');
          studentId = 'a78c06fe-815a-4feb-adeb-1177699f4913'; // Use our dev student ID
        }
      }

      // Optional validation for authenticated users
      if (req.user?.id && req.user.id !== studentId && req.user?.role !== 'teacher') {
        return res.status(403).json({ error: "Åtkomst nekad" });
      }

      // Get completed assignments from database using raw SQL (temporary fix for Drizzle schema issue)
      const allProgress = await db.execute(sql`
        SELECT 
          id,
          assignment_id as "assignmentId",
          lesson_id as "lessonId", 
          lesson_type as "lessonType",
          status,
          score,
          max_score as "maxScore",
          time_spent as "timeSpent",
          completed_at as "completedAt",
          progress_data as "progressData"
        FROM student_lesson_progress 
        WHERE student_id = ${studentId} 
        AND status = 'completed'
        ORDER BY completed_at DESC
      `);

      // Transform progress data to assignment format for frontend
      const completedAssignments = allProgress.rows.map((progress) => {
        return {
          id: progress.assignmentId || progress.lessonId || progress.id,
          title: progress.assignmentTitle || `Lektion ${progress.lessonId?.slice(0, 8)}...` || "Okänd uppgift",
          description: "Slutförd uppgift",
          assignmentType: progress.assignmentType || progress.lessonType || 'reading_lesson',
          timeLimit: progress.assignmentTimeLimit || 30,
          completedAt: progress.completedAt,
          score: progress.score || 0,
          maxScore: progress.maxScore,
          timeSpent: progress.timeSpent || 0 // Time in seconds
        };
      });

      console.log(`Returning ${completedAssignments.length} completed assignments for student ${studentId}`);
      res.json(completedAssignments);
    } catch (error) {
      console.error("Error fetching completed assignments:", error);
      res.status(500).json({ error: "Kunde inte hämta slutförda uppgifter" });
    }
  });

  // Teacher endpoint to view student progress
  app.get("/api/teacher/student-progress", async (req, res) => {
    try {
      const { classId, studentId } = req.query;
      let teacherId = req.user?.id;

      // Development bypass - override teacherId if dev headers are present
      if (process.env.NODE_ENV !== 'production') {
        const devBypass = req.headers['x-dev-bypass'] || req.cookies?.devBypass;
        const devRole = req.headers['x-dev-role'] || req.cookies?.devRole;
        if (devBypass === 'true' && devRole === 'LARARE') {
          console.log('[routes] Dev bypass active for /api/teacher/student-progress endpoint, using dev teacher ID');
          teacherId = '550e8400-e29b-41d4-a716-446655440002'; // Use our dev teacher ID
        }
      }

      // Get student progress with raw SQL for simplicity (temporary fix for Drizzle schema issue)
      let baseQuery = `
        SELECT 
          slp.id as "progressId",
          slp.student_id as "studentId", 
          slp.assignment_id as "assignmentId",
          slp.lesson_id as "lessonId",
          slp.status,
          slp.score,
          slp.max_score as "maxScore",
          slp.time_spent as "timeSpent",
          slp.completed_at as "completedAt",
          slp.progress_data as "progressData",
          la.title as "assignmentTitle",
          la.assignment_type as "assignmentType",
          sa.student_name as "studentName",
          sa.username as "studentUsername"
        FROM student_lesson_progress slp
        LEFT JOIN lesson_assignments la ON slp.assignment_id = la.id
        LEFT JOIN student_accounts sa ON slp.student_id = sa.id
        WHERE slp.status = 'completed'
      `;

      const params = [];
      let paramIndex = 1;

      // Filter by specific student if requested
      if (studentId && typeof studentId === 'string') {
        baseQuery += ` AND slp.student_id = $${paramIndex}`;
        params.push(studentId);
        paramIndex++;
      }

      // For simplicity, just get all completed assignments for now
      // TODO: Add class/teacher filtering later
      
      baseQuery += ` ORDER BY slp.completed_at DESC LIMIT 100`;

      const progressQuery = await db.execute(sql.raw(baseQuery, params));

      // Transform to expected format
      const allStudentProgress = progressQuery.rows.map((progress) => {
        // Determine if student needs help based on score
        const needsHelp = (progress.score || 0) < 70 || (progress.timeSpent || 0) > 1800; // Low score or took too long

        // Build student name
        let studentName = 'Okänd elev';
        if (progress.studentName) {
          studentName = progress.studentName;
        } else if (progress.studentUsername) {
          studentName = progress.studentUsername;
        } else if (progress.studentId) {
          studentName = `Elev ${progress.studentId.slice(0, 8)}`;
        }

        return {
          studentId: progress.studentId,
          studentName: studentName,
          assignmentId: progress.assignmentId || progress.lessonId,
          assignmentTitle: progress.assignmentTitle || `Lektion ${progress.lessonId?.slice(0, 8)}...` || "Okänd uppgift",
          completedAt: progress.completedAt || new Date(),
          score: progress.score || 0,
          timeSpent: progress.timeSpent || 0,
          needsHelp: needsHelp
        };
      });

      console.log(`Returning ${allStudentProgress.length} progress entries for teacher view (from database)`);
      res.json(allStudentProgress);
    } catch (error) {
      console.error("Error fetching student progress for teacher:", error);
      res.status(500).json({ error: "Kunde inte hämta elevframsteg" });
    }
  });


  return httpServer;
}
