import { Router } from 'express';
import { storage } from '../storage';
import { logger } from '../logger';
import { requireAuth, requireRole, requireCsrf } from '../auth';
import { z } from 'zod';
import { insertVocabularyPublishedLessonSchema, insertVocabularyLessonDraftSchema } from '@shared/schema';

const router = Router();

// ===== VOCABULARY PUBLISHED LESSONS =====

// Get all published vocabulary lessons
router.get('/vocabulary-lessons/published', async (req, res) => {
  try {
    const lessons = await storage.getVocabularyPublishedLessons();
    res.json(lessons);
  } catch (error: any) {
    logger.error('Failed to get published vocabulary lessons', { error: error.message });
    res.status(500).json({ error: 'Failed to get published vocabulary lessons' });
  }
});

// Get published vocabulary lesson by ID
router.get('/vocabulary-lessons/published/:id', async (req, res) => {
  try {
    const lesson = await storage.getVocabularyPublishedLesson(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error: any) {
    logger.error('Failed to get published vocabulary lesson', { error: error.message, lessonId: req.params.id });
    res.status(500).json({ error: 'Failed to get published vocabulary lesson' });
  }
});

// Get published vocabulary lessons by category
router.get('/vocabulary-lessons/published/category/:category', async (req, res) => {
  try {
    const lessons = await storage.getVocabularyPublishedLessonsByCategory(req.params.category);
    res.json(lessons);
  } catch (error: any) {
    logger.error('Failed to get published vocabulary lessons by category', { error: error.message, category: req.params.category });
    res.status(500).json({ error: 'Failed to get published vocabulary lessons by category' });
  }
});

// Publish a vocabulary lesson
router.post('/vocabulary-lessons/publish', requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    const validatedData = insertVocabularyPublishedLessonSchema.parse(req.body);
    const lesson = await storage.createVocabularyPublishedLesson(validatedData);
    logger.info('Vocabulary lesson published', { lessonId: lesson.id, title: lesson.title });
    res.status(201).json(lesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid lesson data', details: error.errors });
    }
    logger.error('Failed to publish vocabulary lesson', { error: error.message });
    res.status(500).json({ error: 'Failed to publish vocabulary lesson' });
  }
});

// Update published vocabulary lesson
router.put('/vocabulary-lessons/published/:id', requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    const validatedData = insertVocabularyPublishedLessonSchema.partial().parse(req.body);
    const lesson = await storage.updateVocabularyPublishedLesson(req.params.id, validatedData);
    logger.info('Vocabulary lesson updated', { lessonId: lesson.id, title: lesson.title });
    res.json(lesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid lesson data', details: error.errors });
    }
    logger.error('Failed to update published vocabulary lesson', { error: error.message, lessonId: req.params.id });
    res.status(500).json({ error: 'Failed to update published vocabulary lesson' });
  }
});

// Delete published vocabulary lesson
router.delete('/vocabulary-lessons/published/:id', requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    await storage.deleteVocabularyPublishedLesson(req.params.id);
    logger.info('Vocabulary lesson deleted', { lessonId: req.params.id });
    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete published vocabulary lesson', { error: error.message, lessonId: req.params.id });
    res.status(500).json({ error: 'Failed to delete published vocabulary lesson' });
  }
});

// ===== VOCABULARY LESSON DRAFTS =====

// Get all vocabulary lesson drafts
router.get('/vocabulary-lessons/drafts', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const drafts = await storage.getVocabularyLessonDrafts();
    res.json(drafts);
  } catch (error: any) {
    logger.error('Failed to get vocabulary lesson drafts', { error: error.message });
    res.status(500).json({ error: 'Failed to get vocabulary lesson drafts' });
  }
});

// Get vocabulary lesson draft by ID
router.get('/vocabulary-lessons/drafts/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const draft = await storage.getVocabularyLessonDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    res.json(draft);
  } catch (error: any) {
    logger.error('Failed to get vocabulary lesson draft', { error: error.message, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to get vocabulary lesson draft' });
  }
});

// Create vocabulary lesson draft
router.post('/vocabulary-lessons/drafts', requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    const validatedData = insertVocabularyLessonDraftSchema.parse(req.body);
    const draft = await storage.createVocabularyLessonDraft(validatedData);
    logger.info('Vocabulary lesson draft created', { draftId: draft.id, title: draft.title });
    res.status(201).json(draft);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid draft data', details: error.errors });
    }
    logger.error('Failed to create vocabulary lesson draft', { error: error.message });
    res.status(500).json({ error: 'Failed to create vocabulary lesson draft' });
  }
});

// Update vocabulary lesson draft
router.put('/vocabulary-lessons/drafts/:id', requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    const validatedData = insertVocabularyLessonDraftSchema.partial().parse(req.body);
    const draft = await storage.updateVocabularyLessonDraft(req.params.id, validatedData);
    logger.info('Vocabulary lesson draft updated', { draftId: draft.id, title: draft.title });
    res.json(draft);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid draft data', details: error.errors });
    }
    logger.error('Failed to update vocabulary lesson draft', { error: error.message, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to update vocabulary lesson draft' });
  }
});

// Delete vocabulary lesson draft
router.delete('/vocabulary-lessons/drafts/:id', requireAuth, requireRole('ADMIN'), requireCsrf, async (req, res) => {
  try {
    await storage.deleteVocabularyLessonDraft(req.params.id);
    logger.info('Vocabulary lesson draft deleted', { draftId: req.params.id });
    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete vocabulary lesson draft', { error: error.message, draftId: req.params.id });
    res.status(500).json({ error: 'Failed to delete vocabulary lesson draft' });
  }
});

export default router;

