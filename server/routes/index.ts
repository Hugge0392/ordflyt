import type { Express } from "express";
import { createServer, type Server } from "http";
import gameRoutes from './gameRoutes';
import sentenceRoutes from './sentenceRoutes';
import { storage } from "../storage";
import { logger } from "../logger";

// Import the original routes temporarily
import { registerRoutes as originalRegisterRoutes } from '../routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Word classes route
  app.get("/api/word-classes", async (req, res) => {
    try {
      const wordClasses = await storage.getWordClasses();
      res.json(wordClasses);
    } catch (error: any) {
      logger.error('Failed to get word classes', { error: error.message });
      res.status(500).json({ error: "Failed to get word classes" });
    }
  });

  // Register modular routes
  app.use('/api', gameRoutes);
  app.use('/api', sentenceRoutes);

  // For now, also register the original routes to avoid breaking anything
  // TODO: Remove this once all routes are migrated
  const server = await originalRegisterRoutes(app);

  return server;
}

export { registerRoutes as default };