import { Router } from 'express';
import { storage } from '../storage';
import { requireCsrf } from '../auth';
import { logger } from '../logger';

const router = Router();

// Game progress routes
router.get("/game-progress", async (req, res) => {
  try {
    const gameProgress = await storage.getGameProgress();
    res.json(gameProgress);
  } catch (error: any) {
    logger.error('Failed to get game progress', { error: error.message });
    res.status(500).json({ error: "Failed to get game progress" });
  }
});

router.patch("/game-progress", requireCsrf, async (req, res) => {
  try {
    const {
      wordClass,
      score,
      level,
      maxCorrectInARow,
      totalCorrectAnswers,
      totalIncorrectAnswers,
      totalTimeSpent,
      streak,
      hintsUsed,
      fastAnswers,
      lastActivityDate,
      version
    } = req.body;

    const updateData = {
      wordClass,
      score: parseInt(score),
      level: parseInt(level),
      maxCorrectInARow: parseInt(maxCorrectInARow || 0),
      totalCorrectAnswers: parseInt(totalCorrectAnswers || 0),
      totalIncorrectAnswers: parseInt(totalIncorrectAnswers || 0),
      totalTimeSpent: parseInt(totalTimeSpent || 0),
      streak: parseInt(streak || 0),
      hintsUsed: parseInt(hintsUsed || 0),
      fastAnswers: parseInt(fastAnswers || 0),
      lastActivityDate: new Date(lastActivityDate),
      version: parseInt(version || 1)
    };

    const updatedProgress = await storage.updateGameProgress(updateData);
    res.json(updatedProgress);
  } catch (error: any) {
    logger.error('Failed to update game progress', { error: error.message });
    res.status(500).json({ error: "Failed to update game progress" });
  }
});

router.post("/game-progress/reset", requireCsrf, async (req, res) => {
  try {
    await storage.resetGameProgress();
    res.json({ message: "Game progress reset successfully" });
  } catch (error: any) {
    logger.error('Failed to reset game progress', { error: error.message });
    res.status(500).json({ error: "Failed to reset game progress" });
  }
});

export default router;