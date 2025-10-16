import type { Express } from "express";
import { storage } from "../storage";
import { readingLessonMigrator } from "./htmlToRichDoc";
import type { ReadingLesson } from "@shared/schema";

interface MigrationResult {
  success: boolean;
  lessonId: string;
  lessonTitle: string;
  pagesCreated: number;
  migrationLog: string[];
  error?: string;
}

interface BatchMigrationResult {
  totalLessons: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
  overallLog: string[];
}

/**
 * Register migration-related API routes
 */
export function registerMigrationRoutes(app: Express) {
  
  /**
   * GET /api/migration/status
   * Get overall migration status and statistics
   */
  app.get("/api/migration/status", async (req, res) => {
    try {
      const lessons = await storage.getReadingLessons();
      
      const stats = {
        totalLessons: lessons.length,
        migrated: lessons.filter(l => l.migrated).length,
        unmigrated: lessons.filter(l => !l.migrated).length,
        lessons: lessons.map(l => ({
          id: l.id,
          title: l.title,
          migrated: l.migrated || false,
          hasPages: !!(l.pages && l.pages.length > 0),
          hasRichPages: !!(l.richPages && l.richPages.length > 0),
          contentLength: l.content?.length || 0
        }))
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Failed to get migration status:', error);
      res.status(500).json({ 
        message: "Failed to get migration status",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/migration/migrate-lesson/:id
   * Migrate a single reading lesson by ID
   */
  app.post("/api/migration/migrate-lesson/:id", async (req, res) => {
    const { id } = req.params;
    const { force = false } = req.body;

    try {
      // Get the lesson
      const lesson = await storage.getReadingLesson(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Check if already migrated (unless force is true)
      if (lesson.migrated && !force) {
        return res.status(400).json({ 
          message: "Lesson already migrated. Use force=true to re-migrate.",
          lessonId: id,
          lessonTitle: lesson.title
        });
      }

      // Perform migration
      const migrationResult = await migrateSingleLesson(lesson, force);
      
      if (migrationResult.success) {
        res.json({
          message: "Lesson migrated successfully",
          ...migrationResult
        });
      } else {
        res.status(500).json({
          message: "Migration failed",
          ...migrationResult
        });
      }

    } catch (error) {
      console.error(`Failed to migrate lesson ${id}:`, error);
      res.status(500).json({ 
        message: "Migration failed with error",
        lessonId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/migration/migrate-all-lessons
   * Migrate all unmigrated reading lessons
   */
  app.post("/api/migration/migrate-all-lessons", async (req, res) => {
    const { force = false, skipMigrated = true } = req.body;

    try {
      const lessons = await storage.getReadingLessons();
      
      // Filter lessons to migrate
      const lessonsToMigrate = skipMigrated 
        ? lessons.filter(l => !l.migrated)
        : lessons;

      const batchResult: BatchMigrationResult = {
        totalLessons: lessonsToMigrate.length,
        successful: 0,
        failed: 0,
        results: [],
        overallLog: [
          `Starting batch migration of ${lessonsToMigrate.length} lessons`,
          `Force migration: ${force}`,
          `Skip already migrated: ${skipMigrated}`
        ]
      };

      // Migrate each lesson
      for (let i = 0; i < lessonsToMigrate.length; i++) {
        const lesson = lessonsToMigrate[i];
        batchResult.overallLog.push(`\n--- Migrating lesson ${i + 1}/${lessonsToMigrate.length}: ${lesson.title} ---`);
        
        try {
          const result = await migrateSingleLesson(lesson, force);
          batchResult.results.push(result);
          
          if (result.success) {
            batchResult.successful++;
            batchResult.overallLog.push(`✓ Successfully migrated: ${lesson.title}`);
          } else {
            batchResult.failed++;
            batchResult.overallLog.push(`✗ Failed to migrate: ${lesson.title} - ${result.error}`);
          }
        } catch (error) {
          batchResult.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          batchResult.overallLog.push(`✗ Error migrating: ${lesson.title} - ${errorMsg}`);
          
          batchResult.results.push({
            success: false,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            pagesCreated: 0,
            migrationLog: [],
            error: errorMsg
          });
        }
      }

      batchResult.overallLog.push(`\n--- Batch Migration Complete ---`);
      batchResult.overallLog.push(`Total: ${batchResult.totalLessons}, Success: ${batchResult.successful}, Failed: ${batchResult.failed}`);

      res.json({
        message: "Batch migration completed",
        ...batchResult
      });

    } catch (error) {
      console.error('Failed to perform batch migration:', error);
      res.status(500).json({ 
        message: "Batch migration failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/migration/rollback-lesson/:id
   * Rollback a lesson migration (clear richPages, set migrated to false)
   */
  app.post("/api/migration/rollback-lesson/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const lesson = await storage.getReadingLesson(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      if (!lesson.migrated) {
        return res.status(400).json({ 
          message: "Lesson is not migrated, nothing to rollback",
          lessonId: id,
          lessonTitle: lesson.title
        });
      }

      // Rollback migration
      await storage.updateReadingLesson(id, {
        richPages: [],
        migrated: false
      });

      res.json({
        message: "Migration rolled back successfully",
        lessonId: id,
        lessonTitle: lesson.title
      });

    } catch (error) {
      console.error(`Failed to rollback lesson ${id}:`, error);
      res.status(500).json({ 
        message: "Rollback failed",
        lessonId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/migration/lesson-preview/:id
   * Preview how a lesson would look after migration (without saving)
   */
  app.get("/api/migration/lesson-preview/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const lesson = await storage.getReadingLesson(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Perform migration without saving
      const { richPages, migrationLog } = readingLessonMigrator.migrateLesson(lesson);
      const validation = readingLessonMigrator.validateMigration(richPages);

      res.json({
        lessonId: id,
        lessonTitle: lesson.title,
        originalFormat: {
          hasContent: !!lesson.content,
          contentLength: lesson.content?.length || 0,
          hasPages: !!(lesson.pages && lesson.pages.length > 0),
          pagesCount: Array.isArray(lesson.pages) ? lesson.pages.length : 0
        },
        migratedFormat: {
          richPagesCount: richPages.length,
          totalWordCount: richPages.reduce((sum, page) => sum + (page.meta?.wordCount || 0), 0),
          validation
        },
        richPages,
        migrationLog
      });

    } catch (error) {
      console.error(`Failed to preview migration for lesson ${id}:`, error);
      res.status(500).json({ 
        message: "Preview failed",
        lessonId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Helper function to migrate a single lesson
 */
async function migrateSingleLesson(lesson: ReadingLesson, force: boolean = false): Promise<MigrationResult> {
  try {
    // Check if already migrated
    if (lesson.migrated && !force) {
      return {
        success: false,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        pagesCreated: 0,
        migrationLog: [],
        error: "Lesson already migrated"
      };
    }

    // Perform migration
    const { richPages, migrationLog } = readingLessonMigrator.migrateLesson(lesson);
    
    // Validate migration
    const validation = readingLessonMigrator.validateMigration(richPages);
    if (!validation.valid) {
      return {
        success: false,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        pagesCreated: 0,
        migrationLog,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Save migrated lesson
    await storage.updateReadingLesson(lesson.id, {
      richPages,
      migrated: true
    });

    return {
      success: true,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      pagesCreated: richPages.length,
      migrationLog
    };

  } catch (error) {
    return {
      success: false,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      pagesCreated: 0,
      migrationLog: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}