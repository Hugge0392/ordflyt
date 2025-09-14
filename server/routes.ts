import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { emailService } from "./emailService";
import emailTestRoutes from "./emailTestRoutes";
import { requireAuth, requireRole, requireCsrf, requireTeacherLicense } from "./auth";

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
import { insertSentenceSchema, insertErrorReportSchema, insertPublishedLessonSchema, insertReadingLessonSchema, insertKlassKampGameSchema, insertLessonAssignmentSchema, insertStudentLessonProgressSchema } from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { KlassKampWebSocket } from "./klasskamp-websocket";
import { ClassroomWebSocket } from "./classroom-websocket";
import { ttsService } from "./ttsService";
import { registerMigrationRoutes } from "./migration/migrationRoutes";

// Analytics validation schemas\nconst analyticsExportSchema = z.object({\n  format: z.enum(['csv', 'json']).default('json'),\n  type: z.enum(['teacher', 'class', 'student']),\n  classId: z.string().optional(),\n  studentId: z.string().optional(),\n  dateRange: z.object({\n    start: z.string().optional(),\n    end: z.string().optional()\n  }).optional()\n});\n\nconst performanceComparisonSchema = z.object({\n  compareBy: z.enum(['class', 'assignment', 'timeframe']).optional(),\n  classIds: z.array(z.string()).optional(),\n  assignmentIds: z.array(z.string()).optional(),\n  timeRange: z.object({\n    start: z.string(),\n    end: z.string()\n  }).optional()\n});\n\nconst progressTrendsSchema = z.object({\n  start: z.string(),\n  end: z.string(),\n  granularity: z.enum(['day', 'week', 'month']).default('week')\n});\n\nconst completionRatesSchema = z.object({\n  groupBy: z.enum(['class', 'assignment', 'student']).default('class')\n});\n\n// CSV conversion helper functions\nfunction convertTeacherAnalyticsToCSV(data: any): string {\n  const headers = ['Metric', 'Value'];\n  const rows = [\n    ['Total Students', data.overview.totalStudents],\n    ['Total Classes', data.overview.totalClasses],\n    ['Active Assignments', data.overview.activeAssignments],\n    ['Completed Assignments', data.overview.completedAssignments],\n    ['Average Score', data.overview.averageScore],\n    ['Average Completion Rate', data.overview.averageCompletionRate],\n    ['Total Time Spent (min)', data.overview.totalTimeSpent]\n  ];\n  \n  let csv = headers.join(',') + '\\n';\n  rows.forEach(row => {\n    csv += row.join(',') + '\\n';\n  });\n  \n  // Add class breakdown\n  csv += '\\nClass Breakdown\\n';\n  csv += 'Class Name,Student Count,Average Score,Completion Rate,Struggling Students\\n';\n  data.classBreakdown.forEach((cls: any) => {\n    csv += `${cls.className},${cls.studentCount},${cls.averageScore},${cls.completionRate},${cls.strugglingStudents}\\n`;\n  });\n  \n  return csv;\n}\n\nfunction convertClassAnalyticsToCSV(data: any): string {\n  let csv = 'Student Performance\\n';\n  csv += 'Student Name,Average Score,Completion Rate,Time Spent,Assignments Completed,Last Activity,Needs Help\\n';\n  data.studentPerformance.forEach((student: any) => {\n    csv += `${student.studentName},${student.averageScore},${student.completionRate},${student.timeSpent},${student.assignmentsCompleted},${student.lastActivity || 'N/A'},${student.needsHelp}\\n`;\n  });\n  return csv;\n}\n\nfunction convertStudentAnalyticsToCSV(data: any): string {\n  let csv = 'Student Analytics\\n';\n  csv += 'Metric,Value\\n';\n  csv += `Average Score,${data.averageScore}\\n`;\n  csv += `Completion Rate,${data.completionRate}\\n`;\n  csv += `Time Spent,${data.timeSpent}\\n`;\n  csv += `Assignments Completed,${data.assignmentsCompleted}\\n`;\n  return csv;\n}\n\nconst updateProgressSchema = z.object({
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

  // Get single reading lesson
  app.get("/api/reading-lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getReadingLessonById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Reading lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching reading lesson:", error);
      res.status(500).json({ message: "Failed to fetch reading lesson" });
    }
  });

  // Get published reading lessons
  app.get("/api/reading-lessons/published", async (req, res) => {
    try {
      const lessons = await storage.getPublishedReadingLessons();
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching published reading lessons:", error);
      res.status(500).json({ message: "Failed to fetch published reading lessons" });
    }
  });

  // Get single reading lesson
  app.get("/api/reading-lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getReadingLesson(req.params.id);
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
  
  // Create new lesson assignment
  app.post("/api/assignments", requireAuth, requireTeacherLicense, requireCsrf, async (req, res) => {
    try {
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
      const teacherId = req.user?.id;
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
      const teacherId = req.user?.id;
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
      const userId = req.user.id;
      
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
      
      const hasAccess = teacherClasses.some(tc => tc.classId === classId);
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
          eq(schema.teacherClasses.classId, studentAccount[0].classId)
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
          
          const hasClassAccess = teacherClasses.some(tc => tc.classId === classId);
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
              eq(schema.teacherClasses.classId, studentAccount[0].classId)
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
  
  // Store reference to ClassroomWebSocket for classroom APIs
  (app as any).classroomWebSocket = classroomWebSocket;
  
  return httpServer;
}
