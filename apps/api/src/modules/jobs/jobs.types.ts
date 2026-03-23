import { z } from 'zod';

// Allowed job statuses in the jobs table.
export const jobStatusSchema = z.enum([
  'queued',
  'processing',
  'processed',
  'completed',
  'failed_processing',
  'failed_delivery',
]);

// Query schema for listing jobs with optional filters and pagination.
export const listJobsQuerySchema = z.object({
  pipelineId: z.string().uuid().optional(),
  status: jobStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Path params schema for job routes.
export const jobIdParamSchema = z.object({
  jobId: z.string().uuid(),
});

// Path params schema for delivery-attempt control routes nested under jobs.
export const deliveryAttemptParamSchema = z.object({
  jobId: z.string().uuid(),
  attemptId: z.coerce.number().int().positive(),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
export type JobIdParam = z.infer<typeof jobIdParamSchema>;
export type DeliveryAttemptParam = z.infer<typeof deliveryAttemptParamSchema>;
