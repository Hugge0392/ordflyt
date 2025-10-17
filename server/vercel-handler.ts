// Vercel serverless handler
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./vite";
import authRoutes from "./authRoutes";
import licenseRoutes from './licenseRoutes';
import { securityHeaders, apiRateLimit } from "./auth";
import { initializeDatabase } from "./initDatabase";
import { startAutomaticBackups } from "./licenseDb";
import { checkProductionEnvironment } from "./productionCheck";

let isInitialized = false;
let app: express.Application;

async function initializeApp() {
  if (isInitialized) return app;

  // Check production environment configuration
  checkProductionEnvironment();

  app = express();

  // Trust proxy for Vercel environment
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

  isInitialized = true;
  return app;
}

// Export handler for Vercel
export default async function handler(req: Request, res: Response) {
  const app = await initializeApp();
  return app(req, res);
}
