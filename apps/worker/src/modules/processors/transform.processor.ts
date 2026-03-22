import { logger } from '../../shared/logger';

import { IProcessor, ProcessorInput, ProcessorOutput } from './processor.interface';

function uppercaseStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }

  if (Array.isArray(value)) {
    return value.map((item) => uppercaseStrings(item));
  }

  if (value && typeof value === 'object') {
    const mappedEntries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
      return [key, uppercaseStrings(nestedValue)] as const;
    });

    return Object.fromEntries(mappedEntries);
  }

  return value;
}

// Transform processor: converts all string values to uppercase.
export class TransformProcessor implements IProcessor {
  async process(input: ProcessorInput): Promise<ProcessorOutput> {
    logger.info('Running processor', {
      jobId: input.jobId,
      actionType: input.actionType ?? 'transform',
    });

    const transformed = uppercaseStrings(input.payload) as Record<string, unknown>;

    return {
      result: transformed,
    };
  }
}
