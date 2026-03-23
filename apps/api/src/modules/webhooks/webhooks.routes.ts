import { Router } from 'express';

import { ingestWebhookHandler } from './webhooks.controller';
import { verifyWebhookSignature } from '../../middleware/verifyWebhookSignature';

const webhooksRouter = Router();

// Public ingestion endpoint for pipeline webhooks.
webhooksRouter.post('/webhooks/:webhookPath', verifyWebhookSignature, ingestWebhookHandler);

export default webhooksRouter;
