type LogLevel = 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

type LoggerErrorContext = {
  name?: string;
  message: string;
  stack?: string;
};

type BaseLogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
};

function serializeError(error: unknown): LoggerErrorContext | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  return {
    message: 'Unknown error',
  };
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}, error?: unknown): void {
  const baseEntry: BaseLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  const errorContext = level === 'error' ? serializeError(error) : undefined;

  const logEntry = {
    ...baseEntry,
    ...context,
    ...(errorContext ? { error: errorContext } : {}),
  };

  // Structured JSON log output for easy parsing and filtering.
  console.log(JSON.stringify(logEntry));
}

export const logger = {
  info(message: string, context: LogContext = {}): void {
    writeLog('info', message, context);
  },

  warn(message: string, context: LogContext = {}): void {
    writeLog('warn', message, context);
  },

  error(message: string, context: LogContext = {}, error?: unknown): void {
    writeLog('error', message, context, error);
  },
};

export type { LogContext, LogLevel };

