type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  environment?: string;
  vercelUrl?: string;
  deploymentId?: string;
  region?: string;
  requestId?: string;
}

interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel;
  private isVercel: boolean;
  private isProduction: boolean;
  private context: LogContext = {};

  constructor() {
    // Detect environment
    this.isVercel = process.env.VERCEL === '1';
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Set log level based on environment
    // In production, log info and above; in development, log debug and above
    this.logLevel = this.isProduction ? 'info' : 'debug';
    
    // Allow override via environment variable
    if (process.env.LOG_LEVEL) {
      this.logLevel = process.env.LOG_LEVEL as LogLevel;
    }
  }

  // Set context for all subsequent logs (useful for request tracing)
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  // Clear context
  clearContext(): void {
    this.context = {};
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(level: LogLevel, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.isProduction ? 'production' : 'development',
    };

    // Add Vercel-specific metadata if available
    if (this.isVercel) {
      entry.vercelUrl = process.env.VERCEL_URL;
      entry.deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
      entry.region = process.env.VERCEL_REGION;
    }

    // Add context if available
    if (Object.keys(this.context).length > 0) {
      entry.requestId = this.context.requestId;
      Object.assign(entry, this.context);
    }

    // Add additional data if provided
    if (data) {
      entry.data = data;
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    // In Vercel production, use JSON format for better log analysis
    if (this.isVercel && this.isProduction) {
      const logJson = JSON.stringify(entry);
      
      if (entry.level === 'error') {
        console.error(logJson);
      } else if (entry.level === 'warn') {
        console.warn(logJson);
      } else {
        console.log(logJson);
      }
    } else {
      // In development, use human-readable format
      const { timestamp, level, message, data, requestId } = entry;
      const reqId = requestId ? ` [${requestId}]` : '';
      const logLine = `[${timestamp}]${reqId} ${level.toUpperCase()}: ${message}`;

      if (level === 'error') {
        console.error(logLine, data || '');
      } else if (level === 'warn') {
        console.warn(logLine, data || '');
      } else {
        console.log(logLine, data || '');
      }
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatLog('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.output(this.formatLog('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatLog('warn', message, data));
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      // Always log errors with full details
      const errorData = data instanceof Error 
        ? {
            message: data.message,
            stack: data.stack,
            name: data.name,
            ...data
          }
        : data;
      
      this.output(this.formatLog('error', message, errorData));
    }
  }

  // Utility method to log HTTP requests
  logRequest(method: string, path: string, statusCode: number, duration: number, userId?: string): void {
    this.info(`${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      userId
    });
  }

  // Utility method to create a child logger with specific context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }
}

export const logger = new Logger();
export default logger;