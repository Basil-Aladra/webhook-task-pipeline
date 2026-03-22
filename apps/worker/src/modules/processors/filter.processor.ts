import { logger } from '../../shared/logger';

import { IProcessor, ProcessorInput, ProcessorOutput } from './processor.interface';

type FilterConfig = {
  removeFields?: string[];
};

// Filter processor: removes top-level fields listed in config.removeFields.
export class FilterProcessor implements IProcessor {
  async process(input: ProcessorInput): Promise<ProcessorOutput> {
    logger.info('Running processor', {
      jobId: input.jobId,
      actionType: input.actionType ?? 'filter',
    });

    const config = input.config as FilterConfig;
    const removeFields = Array.isArray(config.removeFields) ? config.removeFields : [];

    const filtered = { ...input.payload };

    for (const field of removeFields) {
      delete filtered[field];
    }

    return {
      result: filtered,
    };
  }
}
