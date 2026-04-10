// Structured logging utility for better observability

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  requestId?: string;
  duration?: number;
}

class Logger {
  private requestId: string | null = null;

  setRequestId(id: string) {
    this.requestId = id;
  }

  clearRequestId() {
    this.requestId = null;
  }

  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.requestId ? `[${entry.requestId}]` : '',
      entry.message,
    ].filter(Boolean);

    if (entry.context) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.duration) {
      parts.push(`(${entry.duration}ms)`);
    }

    return parts.join(' ');
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, duration?: number) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId: this.requestId || undefined,
      duration,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(formatted);
        }
        break;
      default:
        console.log(formatted);
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  // For timing operations
  time(label: string) {
    return {
      end: (message?: string, context?: Record<string, any>) => {
        const duration = Date.now();
        this.log('info', message || label, context, duration);
      },
    };
  }
}

// Singleton instance
export const logger = new Logger();

// Helper for request-scoped logging
export function withRequestId<T>(requestId: string, fn: () => T): T {
  logger.setRequestId(requestId);
  try {
    return fn();
  } finally {
    logger.clearRequestId();
  }
}

// Generate a simple request ID
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
