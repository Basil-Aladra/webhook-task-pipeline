import { pool } from '../db/pool';

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

type PersistedLogSource = 'api' | 'worker' | 'delivery' | 'system';

type PersistedLogEntry = BaseLogEntry & {
  source: PersistedLogSource;
  jobId: string | null;
  pipelineId: string | null;
  correlationId: string | null;
  context: LogContext;
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

function toPersistedSource(context: LogContext): PersistedLogSource {
  const value = context.source;

  if (value === 'worker' || value === 'delivery' || value === 'system') {
    return value;
  }

  return 'api';
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

async function persistLog(logEntry: PersistedLogEntry): Promise<void> {
  try {
    await pool.query(
      `
        INSERT INTO logs (timestamp, level, source, message, job_id, pipeline_id, correlation_id, context)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        logEntry.timestamp,
        logEntry.level,
        logEntry.source,
        logEntry.message,
        logEntry.jobId,
        logEntry.pipelineId,
        logEntry.correlationId,
        logEntry.context,
      ],
    );
  } catch {
    // Do not break runtime behavior if the logs table is unavailable.
  }
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

  // Structured JSON logs make filtering and debugging easier.
  console.log(JSON.stringify(logEntry));

  const { source: _source, jobId, pipelineId, correlationId, requestId, ...remainingContext } = context;
  void persistLog({
    ...baseEntry,
    source: toPersistedSource(context),
    jobId: toNullableString(jobId),
    pipelineId: toNullableString(pipelineId),
    correlationId: toNullableString(correlationId) ?? toNullableString(requestId),
    context: errorContext ? { ...remainingContext, error: errorContext } : remainingContext,
  });
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
