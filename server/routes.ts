import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { LessonGenerator } from "./lessonGenerator";
import { z } from "zod";
import { insertSentenceSchema, insertErrorReportSchema, insertPublishedLessonSchema, insertReadingLessonSchema, insertKlassKampGameSchema } from "@shared/schema";
import { KlassKampWebSocket } from "./klasskamp-websocket";

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
  app.patch("/api/game-progress", async (req, res) => {
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
  app.post("/api/game-progress/reset", async (req, res) => {
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
  app.post("/api/admin/sentences", async (req, res) => {
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
  app.put("/api/admin/sentences/:id", async (req, res) => {
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
  app.delete("/api/admin/sentences/:id", async (req, res) => {
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
  app.post("/api/error-reports", async (req, res) => {
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
  app.patch("/api/admin/error-reports/:id", async (req, res) => {
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
  app.delete("/api/admin/error-reports/:id", async (req, res) => {
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

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/lesson-images", async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.imageURL);
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error processing lesson image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Published lesson endpoints
  app.post("/api/lessons/publish", async (req, res) => {
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

  app.put("/api/lessons/published/:id", async (req, res) => {
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

  app.delete("/api/lessons/published/:id", async (req, res) => {
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
  app.post("/api/lessons/drafts", async (req, res) => {
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

  app.put("/api/lessons/drafts/:id", async (req, res) => {
    try {
      const draft = await storage.updateLessonDraft(req.params.id, req.body);
      res.json(draft);
    } catch (error) {
      console.error("Failed to update lesson draft:", error);
      res.status(500).json({ message: "Failed to update lesson draft" });
    }
  });

  app.delete("/api/lessons/drafts/:id", async (req, res) => {
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
  app.post("/api/reading-lessons", async (req, res) => {
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
  app.put("/api/reading-lessons/:id", async (req, res) => {
    try {
      const validatedData = insertReadingLessonSchema.parse(req.body);
      const lesson = await storage.updateReadingLesson(req.params.id, validatedData);
      res.json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid reading lesson data", errors: error.errors });
      }
      console.error("Error updating reading lesson:", error);
      res.status(500).json({ message: "Failed to update reading lesson" });
    }
  });

  // Delete reading lesson
  app.delete("/api/reading-lessons/:id", async (req, res) => {
    try {
      await storage.deleteReadingLesson(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reading lesson:", error);
      res.status(500).json({ message: "Failed to delete reading lesson" });
    }
  });

  // Serve generated lesson files statically
  app.use('/generated-lessons', express.static(path.join(process.cwd(), 'generated-lessons')));

  // Removed duplicate - object storage upload endpoint is defined above

  app.put("/api/lesson-images", async (req, res) => {
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
  app.post("/api/klasskamp/create", async (req, res) => {
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

  const httpServer = createServer(app);
  
  // Initialize KlassKamp WebSocket server
  new KlassKampWebSocket(httpServer);
  
  return httpServer;
}
