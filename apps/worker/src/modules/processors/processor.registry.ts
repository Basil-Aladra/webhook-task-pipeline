import { EnrichProcessor } from './enrich.processor';
import { FilterProcessor } from './filter.processor';
import { IProcessor } from './processor.interface';
import { TransformProcessor } from './transform.processor';
import { ValidateProcessor } from './validate.processor';

const processorRegistry: Record<string, IProcessor> = {
  validate: new ValidateProcessor(),
  transform: new TransformProcessor(),
  enrich: new EnrichProcessor(),
  filter: new FilterProcessor(),
};

// Returns a processor instance for the given action type.
export function getProcessor(actionType: string): IProcessor {
  const processor = processorRegistry[actionType];

  if (!processor) {
    throw new Error(`Unknown processor action type: ${actionType}`);
  }

  return processor;
}
