import { Request, Response } from 'express';
import { logger } from '../../shared/logger';
import { ZodError } from 'zod';

import {
  createPipeline as createPipelineService,
  deletePipeline as deletePipelineService,
  DuplicateWebhookPathError,
  getAllPipelines as getAllPipelinesService,
  getPipelineById as getPipelineByIdService,
  PipelineNotFoundError,
  replacePipelineActions as replacePipelineActionsService,
  replacePipelineSubscribers as replacePipelineSubscribersService,
  updatePipeline as updatePipelineService,
} from './pipelines.service';
import {
  createPipelineRequestSchema,
  listPipelinesQuerySchema,
  pipelineIdParamSchema,
  replacePipelineActionsRequestSchema,
  replacePipelineSubscribersRequestSchema,
  updatePipelineRequestSchema,
} from './pipelines.types';

function handlePipelinesError(error: unknown, res: Response): void {
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.issues,
      },
    });
    return;
  }

  if (error instanceof PipelineNotFoundError) {
    res.status(404).json({
      error: {
        code: 'PIPELINE_NOT_FOUND',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof DuplicateWebhookPathError) {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_WEBHOOK_PATH',
        message: error.message,
      },
    });
    return;
  }

  logger.error('Pipelines API error', {}, error);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}

// POST /pipelines
export async function createPipelineHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsedBody = createPipelineRequestSchema.parse(req.body);
    const createdPipeline = await createPipelineService(parsedBody);

    res.status(201).json({
      data: createdPipeline,
    });
  } catch (error) {
    handlePipelinesError(error, res);
  }
}

// GET /pipelines
export async function getAllPipelinesHandler(req: Request, res: Response): Promise<void> {
  try {
    const query = listPipelinesQuerySchema.parse(req.query);
    const result = await getAllPipelinesService(query);

    res.status(200).json({
      data: result.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
      },
    });
  } catch (error) {
    handlePipelinesError(error, res);
  }
}

// GET /pipelines/:pipelineId
export async function getPipelineByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const { pipelineId } = pipelineIdParamSchema.parse(req.params);
    const pipeline = await getPipelineByIdService(pipelineId);

    res.status(200).json({
      data: pipeline,
    });
  } catch (error) {
    handlePipelinesError(error, res);
  }
}

// PATCH /pipelines/:pipelineId
export async function updatePipelineHandler(req: Request, res: Response): Promise<void> {
  try {
    const { pipelineId } = pipelineIdParamSchema.parse(req.params);
    const parsedBody = updatePipelineRequestSchema.parse(req.body);
    const updatedPipeline = await updatePipelineService(pipelineId, parsedBody);

    res.status(200).json({
      data: updatedPipeline,
    });
  } catch (error) {
    handlePipelinesError(error, res);
  }
}

// PUT /pipelines/:pipelineId/actions
export async function replacePipelineActionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { pipelineId } = pipelineIdParamSchema.parse(req.params);
    const parsedBody = replacePipelineActionsRequestSchema.parse(req.body);
    const updatedPipeline = await replacePipelineActionsService(pipelineId, parsedBody.actions);

    res.status(200).json({
      data: updatedPipeline,
    });
  } catch (error) {
    handlePipelinesError(error, res);
  }
}

// PUT /pipelines/:pipelineId/subscribers
export async function replacePipelineSubscribersHandler(req: Request, res: Response): Promise<void> {
  try {
    const { pipelineId } = pipelineIdParamSchema.parse(req.params);
    const parsedBody = replacePipelineSubscribersRequestSchema.parse(req.body);
    const updatedPipeline = await replacePipelineSubscribersService(
      pipelineId,
      parsedBody.subscribers,
    );

    res.status(200).json({
      data: updatedPipeline,
    });
  } catch (error) {
    handlePipelinesError(error, res);
  }
}

// DELETE /pipelines/:pipelineId
export async function deletePipelineHandler(req: Request, res: Response): Promise<void> {
  try {
    const { pipelineId } = pipelineIdParamSchema.parse(req.params);
    const archivedPipeline = await deletePipelineService(pipelineId);

    res.status(200).json({
      data: archivedPipeline,
    });
  } catch (error) {
    handlePipelinesError(error, res);
  }
}
