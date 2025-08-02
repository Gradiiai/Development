type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    if (this.isProduction) {
      // In production, only log warnings and errors
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private logToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, context || '');
        break;
      case 'info':
        console.info(prefix, message, context || '');
        break;
      case 'warn':
        console.warn(prefix, message, context || '');
        break;
      case 'error':
        console.error(prefix, message, context || '');
        break;
    }
  }

  private async logToExternalService(entry: LogEntry): Promise<void> {
    if (!this.isProduction) return;
    
    try {
      // TODO: Integrate with external logging service (e.g., LogRocket, Sentry, etc.)
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch (error) {
      // Fallback to console if external logging fails
      console.error('Failed to log to external service:', error);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.formatMessage('debug', message, context);
    this.logToConsole(entry);
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    
    const entry = this.formatMessage('info', message, context);
    this.logToConsole(entry);
    this.logToExternalService(entry);
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.formatMessage('warn', message, context);
    this.logToConsole(entry);
    this.logToExternalService(entry);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;
    
    const entry = {
      ...this.formatMessage('error', message, context),
      error: error || undefined,
    };
    
    this.logToConsole(entry);
    this.logToExternalService(entry);
  }

  // Utility methods for common logging scenarios
  apiRequest(method: string, url: string, context?: Record<string, any>): void {
    this.debug(`API Request: ${method} ${url}`, context);
  }

  apiResponse(method: string, url: string, status: number, context?: Record<string, any>): void {
    const message = `API Response: ${method} ${url} - ${status}`;
    if (status >= 400) {
      this.error(message, undefined, context);
    } else if (status >= 300) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  userAction(action: string, context?: Record<string, any>): void {
    this.info(`User Action: ${action}`, context);
  }

  performance(operation: string, duration: number, context?: Record<string, any>): void {
    const message = `Performance: ${operation} took ${duration}ms`;
    if (duration > 1000) {
      this.warn(message, context);
    } else {
      this.debug(message, context);
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;

// Performance monitoring utility
export class PerformanceMonitor {
  private startTimes = new Map<string, number>();

  start(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  end(operation: string, context?: Record<string, any>): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      logger.warn(`Performance monitor: No start time found for operation '${operation}'`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);
    
    logger.performance(operation, duration, context);
    return duration;
  }

  measure<T>(operation: string, fn: () => T, context?: Record<string, any>): T {
    this.start(operation);
    try {
      const result = fn();
      this.end(operation, context);
      return result;
    } catch (error) {
      this.end(operation, { ...context, error: true });
      throw error;
    }
  }

  async measureAsync<T>(operation: string, fn: () => Promise<T>, context?: Record<string, any>): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, context);
      return result;
    } catch (error) {
      this.end(operation, { ...context, error: true });
      throw error;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();