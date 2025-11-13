import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import crypto from 'crypto';

// Generate unique request ID
function generateRequestId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Middleware to log all incoming requests
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  const startTime = Date.now();

  // Store request ID on request object for later use
  (req as any).requestId = requestId;

  // Create child logger with request context
  const reqLogger = logger.child({
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  });

  // Log incoming request
  reqLogger.info(`Incoming ${req.method} ${req.path}`);

  // Store original end function
  const originalEnd = res.end;

  // Override end function to log response
  (res.end as any) = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;
    
    // Log the response
    logger.logRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      (req as any).user?.id
    );

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  // Add request ID to response headers
  res.setHeader('X-Request-Id', requestId);

  next();
}

// Error logging middleware
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId;
  
  logger.error('Request error', {
    requestId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    params: req.params
  });

  next(err);
}




