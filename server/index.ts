import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import authRoutes from "./authRoutes";
import licenseRoutes from './licenseRoutes';
import { securityHeaders, apiRateLimit } from "./auth";
import { initializeDatabase } from "./initDatabase";
import { checkProductionEnvironment, logRequestInfo } from "./productionCheck";
import { ClassroomWebSocket } from "./classroom-websocket";
import { startAutomaticBackups } from "./licenseDb";

const app = express();

// Trust proxy for Replit environment
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Kontrollera produktionsmiljö
  checkProductionEnvironment();
  
  // Logga viktig bootstrap-information
  console.log('🔧 Bootstrap info:', {
    nodeEnv: process.env.NODE_ENV,
    replitDeployment: process.env.REPLIT_DEPLOYMENT,
    adminPasswordPresent: !!process.env.ADMIN_PASSWORD,
    isProduction: process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1'
  });
  
  // Initialisera databasen med nödvändiga användare
  await initializeDatabase();
  
  // Starta automatiska säkerhetskopior för kritisk data
  startAutomaticBackups();
  console.log('🔐 Kritisk datasäkerhet aktiverad med automatiska backuper');
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
