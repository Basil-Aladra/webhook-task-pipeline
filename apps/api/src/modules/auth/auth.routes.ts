import { Router } from 'express';

import { createApiKeyHandler } from './auth.controller';

const authRouter = Router();

// No auth required to create the first key.
authRouter.post('/auth/keys', createApiKeyHandler);

export default authRouter;

