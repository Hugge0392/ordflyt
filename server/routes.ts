import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { emailService } from "./emailService";
import emailTestRoutes from "./emailTestRoutes";
import { requireAuth, requireRole, requireCsrf } from "./auth";

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
import { insertSentenceSchema, insertErrorReportSchema, insertPublishedLessonSchema, insertReadingLessonSchema, insertKlassKampGameSchema } from "@shared/schema";
import { KlassKampWebSocket } from "./klasskamp-websocket";
import { ttsService } from "./ttsService";
import { registerMigrationRoutes } from "./migration/migrationRoutes";

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

  const httpServer = createServer(app);
  
  // Initialize KlassKamp WebSocket server
  new KlassKampWebSocket(httpServer);
  
  return httpServer;
}
