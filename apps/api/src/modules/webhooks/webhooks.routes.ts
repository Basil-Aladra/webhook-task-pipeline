import { Router } from 'express';

import { ingestWebhookHandler } from './webhooks.controller';

const webhooksRouter = Router();

// Public ingestion endpoint for pipeline webhooks.
webhooksRouter.post('/webhooks/:webhookPath', ingestWebhookHandler);

export default webhooksRouter;
