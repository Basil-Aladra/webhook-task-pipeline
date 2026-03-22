import { z } from 'zod';

// Webhook payload must be a JSON object (not an array/null).
const webhookPayloadSchema = z
  .record(z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: 'payload must be a JSON object',
  });

// Request body schema for webhook ingestion.
export const ingestWebhookRequestSchema = z.object({
  payload: webhookPayloadSchema,
  idempotencyKey: z.string().max(255).optional(),
});

// Route params schema for webhook path.
export const webhookPathParamSchema = z.object({
  webhookPath: z.string().min(1),
});

export type IngestWebhookRequest = z.infer<typeof ingestWebhookRequestSchema>;
