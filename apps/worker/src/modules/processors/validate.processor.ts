import { z } from 'zod';
import { logger } from '../../shared/logger';
import { IProcessor, ProcessorInput, ProcessorOutput } from './processor.interface';

const orderPayloadSchema = z.object({
  orderId: z.string().min(1, 'orderId must be a string'),
  customerName: z.string().min(1, 'customerName must be a string'),
  amount: z.number({
    invalid_type_error: 'amount must be a number',
    required_error: 'amount must be a number',
  }),
  status: z.enum(['new', 'paid', 'cancelled']).optional(),
});

function buildValidationErrorMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'payload';
      return `${field}: ${issue.message}`;
    })
    .join('; ');
}

// Validate processor: enforces a minimal order payload contract before other processors run.
export class ValidateProcessor implements IProcessor {
  async process(input: ProcessorInput): Promise<ProcessorOutput> {
    logger.info('Running processor', {
      jobId: input.jobId,
      actionType: input.actionType ?? 'validate',
    });

    const parsedPayload = orderPayloadSchema.safeParse(input.payload);

    if (!parsedPayload.success) {
      throw new Error(`Validation failed: ${buildValidationErrorMessage(parsedPayload.error)}`);
    }

    return {
      result: parsedPayload.data,
    };
  }
}
