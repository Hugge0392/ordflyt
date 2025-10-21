import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Middleware to check if debug endpoints are enabled
function requireDebugAccess(req: Request, res: Response, next: Function) {
  // Only allow in development or with specific debug token
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const debugToken = req.headers['x-debug-token'];
  const validToken = process.env.DEBUG_TOKEN;

  if (isDevelopment || (validToken && debugToken === validToken)) {
    next();
  } else {
    res.status(403).json({ error: 'Debug access denied' });
  }
}

router.use(requireDebugAccess);

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
        VERCEL_URL: process.env.VERCEL_URL,
      },
      database: 'checking...'
    };

    // Test database connection
    try {
      await db.execute(sql`SELECT 1`);
      health.database = 'connected';
    } catch (dbError) {
      health.database = `error: ${(dbError as Error).message}`;
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      status: 'error',
      error: (error as Error).message
    });
  }
});

// System info endpoint
router.get('/info', (req: Request, res: Response) => {
  const info = {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
    }
  };

  res.json(info);
});

// Database status endpoint
router.get('/db-status', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Test query
    await db.execute(sql`SELECT 1 as test`);
    
    const queryTime = Date.now() - startTime;

    // Get connection info if available
    const status = {
      status: 'connected',
      queryTime: `${queryTime}ms`,
      database: process.env.DATABASE_URL ? 'configured' : 'not configured',
      pool: 'active'
    };

    res.json(status);
  } catch (error) {
    logger.error('Database status check failed', error);
    res.status(500).json({
      status: 'error',
      error: (error as Error).message,
      stack: (error as Error).stack
    });
  }
});

// Test error endpoint (for testing error tracking)
router.get('/test-error', (req: Request, res: Response) => {
  const errorType = req.query.type || 'generic';

  logger.info('Testing error tracking', { errorType });

  switch (errorType) {
    case 'sync':
      throw new Error('Test synchronous error');
    
    case 'async':
      Promise.reject(new Error('Test async error')).catch(err => {
        logger.error('Test async error caught', err);
      });
      res.json({ message: 'Async error triggered, check logs' });
      break;
    
    case 'unhandled':
      setTimeout(() => {
        throw new Error('Test unhandled error');
      }, 100);
      res.json({ message: 'Unhandled error will be thrown in 100ms' });
      break;
    
    default:
      res.status(400).json({ error: 'Invalid error type' });
  }
});

// Log viewer endpoint (last N logs)
const recentLogs: any[] = [];
const MAX_LOGS = 100;

// Intercept console logs (be careful with this in production)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_LOG_CAPTURE === 'true') {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = function(...args: any[]) {
    recentLogs.push({
      timestamp: new Date().toISOString(),
      level: 'log',
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    });
    if (recentLogs.length > MAX_LOGS) recentLogs.shift();
    originalConsoleLog.apply(console, args);
  };

  console.error = function(...args: any[]) {
    recentLogs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    });
    if (recentLogs.length > MAX_LOGS) recentLogs.shift();
    originalConsoleError.apply(console, args);
  };

  console.warn = function(...args: any[]) {
    recentLogs.push({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    });
    if (recentLogs.length > MAX_LOGS) recentLogs.shift();
    originalConsoleWarn.apply(console, args);
  };
}

router.get('/logs', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const level = req.query.level as string;

  let logs = recentLogs;
  
  if (level) {
    logs = logs.filter(log => log.level === level);
  }

  res.json({
    count: logs.length,
    logs: logs.slice(-limit)
  });
});

export default router;

