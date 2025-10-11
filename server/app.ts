// Export Express app without starting server
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./vite";
import authRoutes from "./authRoutes";
import licenseRoutes from './licenseRoutes';
import { securityHeaders, apiRateLimit } from "./auth";
import { initializeDatabase } from "./initDatabase";
import { startAutomaticBackups } from "./licenseDb";

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

    // Security headers first
    app.use(securityHeaders);

    // Cookie parser for session handling
    app.use(cookieParser());

    // Body parsing
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Rate limiting for API endpoints
    app.use('/api/', apiRateLimit);

    // Authentication routes (before other routes)
    app.use(authRoutes);

    // License management routes
    app.use('/api/license', licenseRoutes);

    // Initialize database
    await initializeDatabase();

    // Start automatic backups
    startAutomaticBackups();

    // Register all routes
    await registerRoutes(app);

    // Serve static files in production
    serveStatic(app);

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    appInstance = app;
    return app;
  })();

  return initPromise;
}
