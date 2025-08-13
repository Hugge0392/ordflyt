import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertSentenceSchema } from "@shared/schema";

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
      
      // Allow access to level 1 always, or if previous level is completed
      if (level === 1 || level <= completedLevel + 1) {
        const sentences = await storage.getSentencesByWordClassAndLevel(wordClass, level);
        console.log(`🎯 DEBUG: Access granted to level ${level}. Found ${sentences.length} sentences.`);
        res.json(sentences);
      } else {
        console.log(`🎯 DEBUG: Access denied to level ${level}. Must complete level ${level - 1} first.`);
        res.status(403).json({ 
          message: `Du måste klara nivå ${level - 1} först innan du kan spela nivå ${level}`,
          requiredLevel: level - 1,
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

  const httpServer = createServer(app);
  return httpServer;
}
