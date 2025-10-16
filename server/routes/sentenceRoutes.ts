import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireRole, requireCsrf } from '../auth';
import { insertSentenceSchema } from '@shared/schema';
import { logger } from '../logger';

const router = Router();

// Public sentence routes
router.get("/sentences", async (req, res) => {
  try {
    const sentences = await storage.getSentences();
    res.json(sentences);
  } catch (error: any) {
    logger.error('Failed to get sentences', { error: error.message });
    res.status(500).json({ error: "Failed to get sentences" });
  }
});

router.get("/sentences/level/:level", async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    if (isNaN(level) || level < 1 || level > 5) {
      return res.status(400).json({ error: "Invalid level. Must be between 1 and 5." });
    }

    const sentences = await storage.getSentencesByLevel(level);
    res.json(sentences);
  } catch (error: any) {
    logger.error('Failed to get sentences by level', { error: error.message });
    res.status(500).json({ error: "Failed to get sentences by level" });
  }
});

router.get("/sentences/wordclass/:wordClass/level/:level", async (req, res) => {
  try {
    const { wordClass } = req.params;
    const level = parseInt(req.params.level);

    if (isNaN(level) || level < 1 || level > 5) {
      return res.status(400).json({ error: "Invalid level. Must be between 1 and 5." });
    }

    const sentences = await storage.getSentencesByWordClassAndLevel(wordClass, level);

    if (sentences.length === 0) {
      return res.status(404).json({
        error: `No sentences found for word class '${wordClass}' at level ${level}`
      });
    }

    res.json(sentences);
  } catch (error: any) {
    logger.error('Failed to get sentences by word class and level', {
      error: error.message,
      wordClass: req.params.wordClass,
      level: req.params.level
    });
    res.status(500).json({ error: "Failed to get sentences" });
  }
});

// Admin sentence routes
router.get("/admin/sentences", async (req, res) => {
  try {
    const sentences = await storage.getAllSentences();
    res.json(sentences);
  } catch (error: any) {
    logger.error('Failed to get all sentences', { error: error.message });
    res.status(500).json({ error: "Failed to get sentences" });
  }
});

router.get("/admin/sentences/:id", async (req, res) => {
  try {
    const sentence = await storage.getSentenceById(req.params.id);
    if (!sentence) {
      return res.status(404).json({ error: "Sentence not found" });
    }
    res.json(sentence);
  } catch (error: any) {
    logger.error('Failed to get sentence by id', {
      error: error.message,
      sentenceId: req.params.id
    });
    res.status(500).json({ error: "Failed to get sentence" });
  }
});

router.post("/admin/sentences", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    const validatedData = insertSentenceSchema.parse(req.body);
    const sentence = await storage.createSentence(validatedData);
    res.json(sentence);
  } catch (error: any) {
    logger.error('Failed to create sentence', { error: error.message });
    res.status(500).json({ error: "Failed to create sentence" });
  }
});

router.put("/admin/sentences/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    const validatedData = insertSentenceSchema.parse(req.body);
    const sentence = await storage.updateSentence(req.params.id, validatedData);
    res.json(sentence);
  } catch (error: any) {
    logger.error('Failed to update sentence', {
      error: error.message,
      sentenceId: req.params.id
    });
    res.status(500).json({ error: "Failed to update sentence" });
  }
});

router.delete("/admin/sentences/:id", requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    await storage.deleteSentence(req.params.id);
    res.json({ message: "Sentence deleted successfully" });
  } catch (error: any) {
    logger.error('Failed to delete sentence', {
      error: error.message,
      sentenceId: req.params.id
    });
    res.status(500).json({ error: "Failed to delete sentence" });
  }
});

export default router;