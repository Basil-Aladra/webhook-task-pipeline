import { z } from 'zod';

export const logLevelSchema = z.enum(['info', 'warn', 'error']);
export const logSourceSchema = z.enum(['api', 'worker', 'delivery', 'system']);

export const listLogsQuerySchema = z.object({
  level: logLevelSchema.optional(),
  source: logSourceSchema.optional(),
  jobId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;
