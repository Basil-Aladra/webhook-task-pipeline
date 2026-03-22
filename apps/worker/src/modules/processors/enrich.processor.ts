import { logger } from '../../shared/logger';

import { IProcessor, ProcessorInput, ProcessorOutput } from './processor.interface';

// Enrich processor: adds metadata about processing time and source.
export class EnrichProcessor implements IProcessor {
  async process(input: ProcessorInput): Promise<ProcessorOutput> {
    logger.info('Running processor', {
      jobId: input.jobId,
      actionType: input.actionType ?? 'enrich',
    });

    const now = new Date().toISOString();

    return {
      result: {
        ...input.payload,
        metadata: {
          processedAt: now,
          source: 'webhook-pipeline',
        },
      },
    };
  }
}
