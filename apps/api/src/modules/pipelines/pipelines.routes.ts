import { Router } from 'express';

import {
  createPipelineHandler,
  deletePipelineHandler,
  getAllPipelinesHandler,
  getPipelineByIdHandler,
  replacePipelineActionsHandler,
  replacePipelineSubscribersHandler,
  updatePipelineHandler,
} from './pipelines.controller';

const pipelinesRouter = Router();

// Create pipeline.
pipelinesRouter.post('/pipelines', createPipelineHandler);

// List pipelines with optional filters and pagination.
pipelinesRouter.get('/pipelines', getAllPipelinesHandler);

// Get one pipeline by ID.
pipelinesRouter.get('/pipelines/:pipelineId', getPipelineByIdHandler);

// Partial pipeline update.
pipelinesRouter.patch('/pipelines/:pipelineId', updatePipelineHandler);

// Replace all actions for a pipeline.
pipelinesRouter.put('/pipelines/:pipelineId/actions', replacePipelineActionsHandler);

// Replace all subscribers for a pipeline.
pipelinesRouter.put('/pipelines/:pipelineId/subscribers', replacePipelineSubscribersHandler);

// Soft-delete (archive) a pipeline.
pipelinesRouter.delete('/pipelines/:pipelineId', deletePipelineHandler);

export default pipelinesRouter;
