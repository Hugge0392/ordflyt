// Export Express app without starting server
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import authRoutes from "./authRoutes";
import licenseRoutes from './licenseRoutes';
import debugRoutes from './routes/debugRoutes';
import { securityHeaders, apiRateLimit } from "./auth";
import { initializeDatabase } from "./initDatabase";
import { startAutomaticBackups } from "./licenseDb";
import { requestLogger, errorLogger } from './middleware/requestLogger';
import { logger } from './logger';

let appInstance: express.Application | null = null;
let initPromise: Promise<express.Application> | null = null;

export async function getApp(): Promise<express.Application> {
  // Return cached instance if already initialized
  if (appInstance) return appInstance;

  // If initialization is in progress, wait for it
  if (initPromise) return initPromise;

  // Start initialization
  initPromise = (async () => {
    const app = express();

    // Trust proxy for production environment
    app.set('trust proxy', true);

    // Request logging middleware (before everything else)
    app.use(requestLogger);

    // Security headers first
    app.use(securityHeaders);

    // Cookie parser for session handling
    app.use(cookieParser());

    // Body parsing
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Rate limiting for API endpoints
    app.use('/api/', apiRateLimit);

    // Debug routes (must be after rate limiting but accessible)
    app.use('/api/debug', debugRoutes);

    // Authentication routes (before other routes)
    app.use(authRoutes);

    // License management routes
    app.use('/api/license', licenseRoutes);

    // Initialize database
    await initializeDatabase();

    // Start automatic backups (only where file system is available)
    const isServerless = process.env.VERCEL === '1';
    if (!isServerless) {
      startAutomaticBackups();
      logger.info('🔐 Automatic backups enabled');
    } else {
      logger.info('ℹ️ Automatic backups disabled (serverless environment)');
    }

    // Register all routes
    await registerRoutes(app);

    // Serve static files in production
    serveStatic(app);

    // Error logging middleware
    app.use(errorLogger);

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Log error if not already logged
      logger.error('Unhandled error', {
        status,
        message,
        stack: err.stack,
        url: _req.url,
        method: _req.method
      });

      res.status(status).json({ message });
    });

    appInstance = app;
    return app;
  })();

  return initPromise;
}
