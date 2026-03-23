import { z } from 'zod';

// Allowed pipeline statuses.
export const pipelineStatusSchema = z.enum(['active', 'paused', 'archived']);

// Allowed action types supported by the worker.
export const actionTypeSchema = z.enum(['transform', 'enrich', 'filter']);

// Each processing action in the pipeline configuration.
export const createPipelineActionSchema = z.object({
  orderIndex: z.number().int().min(1),
  actionType: actionTypeSchema,
  config: z.record(z.unknown()),
  enabled: z.boolean().default(true),
});

// Each result subscriber endpoint.
export const createPipelineSubscriberSchema = z.object({
  targetUrl: z.string().url(),
  enabled: z.boolean().default(true),
  timeoutMs: z.number().int().min(1000).max(30000).default(5000),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryBackoffMs: z.number().int().min(100).max(60000).default(2000),
});

// Request body schema for creating a full pipeline definition.
export const createPipelineRequestSchema = z.object({
  name: z.string().min(3).max(100),
  webhookPath: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'webhookPath must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  // Optional secret used to verify incoming webhook requests.
  webhookSecret: z.string().max(255).nullable().optional(),
  status: pipelineStatusSchema.default('paused'),
  actions: z.array(createPipelineActionSchema).max(50).optional(),
  subscribers: z.array(createPipelineSubscriberSchema).max(20).optional(),
});

// Request body schema for partial pipeline updates.
export const updatePipelineRequestSchema = z
  .object({
    name: z.string().min(3).max(100).optional(),
    webhookPath: z
      .string()
      .min(3)
      .max(120)
      .regex(
        /^[a-z0-9-]+$/,
        'webhookPath must contain only lowercase letters, numbers, and hyphens',
      )
      .optional(),
    description: z.string().max(500).nullable().optional(),
    // Optional secret; set to `null` to clear.
    webhookSecret: z.string().max(255).nullable().optional(),
    status: pipelineStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

// Request body schema for replacing all actions in a pipeline.
export const replacePipelineActionsRequestSchema = z.object({
  actions: z
    .array(createPipelineActionSchema)
    .max(50)
    .superRefine((actions, ctx) => {
      const seen = new Set<number>();

      actions.forEach((action, index) => {
        if (seen.has(action.orderIndex)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'actions.orderIndex values must be unique.',
            path: [index, 'orderIndex'],
          });
        }

        seen.add(action.orderIndex);
      });
    }),
});

// Request body schema for replacing all subscribers in a pipeline.
export const replacePipelineSubscribersRequestSchema = z.object({
  subscribers: z.array(createPipelineSubscriberSchema).max(20),
});

// Query schema for listing pipelines with optional filters.
export const listPipelinesQuerySchema = z.object({
  status: pipelineStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Path params schema for pipeline routes.
export const pipelineIdParamSchema = z.object({
  pipelineId: z.string().uuid(),
});

export type CreatePipelineRequest = z.infer<typeof createPipelineRequestSchema>;
export type CreatePipelineAction = z.infer<typeof createPipelineActionSchema>;
export type CreatePipelineSubscriber = z.infer<typeof createPipelineSubscriberSchema>;
export type UpdatePipelineRequest = z.infer<typeof updatePipelineRequestSchema>;
export type ReplacePipelineActionsRequest = z.infer<typeof replacePipelineActionsRequestSchema>;
export type ReplacePipelineSubscribersRequest = z.infer<typeof replacePipelineSubscribersRequestSchema>;
export type ListPipelinesQuery = z.infer<typeof listPipelinesQuerySchema>;
export type PipelineStatus = z.infer<typeof pipelineStatusSchema>;
