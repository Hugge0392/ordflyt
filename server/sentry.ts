// Optional Sentry integration for enhanced error tracking
// To enable:
// 1. npm install @sentry/node @sentry/profiling-node
// 2. Add SENTRY_DSN to environment variables
// 3. Uncomment the imports in app.ts

import { logger } from './logger';

// Type-safe empty Sentry object when not installed
const EmptySentry = {
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  Handlers: {
    requestHandler: () => (_req: any, _res: any, next: any) => next(),
    tracingHandler: () => (_req: any, _res: any, next: any) => next(),
    errorHandler: () => (_err: any, _req: any, _res: any, next: any) => next(_err),
  }
};

let Sentry: typeof EmptySentry = EmptySentry;

// Try to import Sentry if installed
try {
  // @ts-ignore - Optional dependency
  const SentryModule = await import('@sentry/node');
  // @ts-ignore
  const { ProfilingIntegration } = await import('@sentry/profiling-node');
  
  Sentry = SentryModule as any;
  
  // Initialize Sentry if DSN is provided
  if (process.env.SENTRY_DSN) {
    (Sentry as any).init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        new ProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Add context to errors
      beforeSend(event, hint) {
        // Don't send errors in development unless explicitly enabled
        if (process.env.NODE_ENV !== 'production' && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }
        
        // Log that we're sending to Sentry
        logger.debug('Sending error to Sentry', {
          eventId: event.event_id,
          message: event.message,
        });
        
        return event;
      },
    });
    
    logger.info('✅ Sentry error tracking enabled', {
      environment: process.env.NODE_ENV,
      dsn: process.env.SENTRY_DSN?.substring(0, 20) + '...'
    });
  } else {
    logger.info('ℹ️ Sentry not configured (SENTRY_DSN not set)');
  }
} catch (error) {
  // Sentry not installed, that's okay
  logger.info('ℹ️ Sentry not installed (optional)');
}

export { Sentry };

// Helper function to capture exceptions
export function captureException(error: Error, context?: Record<string, any>) {
  logger.error('Exception captured', { error, context });
  
  if (Sentry && Sentry.captureException) {
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined
    });
  }
}

// Helper function to capture messages
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (Sentry && Sentry.captureMessage) {
    Sentry.captureMessage(message, level);
  }
}



