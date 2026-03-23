import { Request, Response } from 'express';
import { z } from 'zod';

import { logger } from '../../shared/logger';
import { generateApiKey } from './auth.service';

const createApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

// POST /auth/keys
export async function createApiKeyHandler(req: Request, res: Response): Promise<void> {
  try {
    const parsedBody = createApiKeyRequestSchema.parse(req.body);

    const apiKey = await generateApiKey(parsedBody.name);

    res.status(201).json({
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // shown only once
      },
      warning: 'Store this key safely, it will not be shown again',
    });
  } catch (error) {
    logger.error('Auth API error', {}, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  }
}

