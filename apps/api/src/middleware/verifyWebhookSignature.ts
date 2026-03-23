import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { pool } from '../db/pool';

type InvalidSignatureResponse = {
  error: {
    code: 'INVALID_SIGNATURE';
    message: 'Webhook signature verification failed';
  };
};

function invalidSignatureResponse(): InvalidSignatureResponse {
  return {
    error: {
      code: 'INVALID_SIGNATURE',
      message: 'Webhook signature verification failed',
    },
  };
}

function decodeProvidedSignature(signatureHeaderValue: string): Buffer | null {
  const trimmed = signatureHeaderValue.trim();
  const cleaned = trimmed.startsWith('sha256=') ? trimmed.slice('sha256='.length) : trimmed;

  // Most common format for HMAC signatures: hex digest.
  if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0) {
    return Buffer.from(cleaned, 'hex');
  }

  // Fallback: base64 digest.
  try {
    const buf = Buffer.from(cleaned, 'base64');
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

// Middleware that verifies `x-webhook-signature` for the pipeline's webhook_secret (if configured).
export async function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const webhookPath = req.params.webhookPath;

  // Fetch the per-pipeline secret by webhookPath.
  const pipelineResult = await pool.query<{ webhook_secret: string | null }>(
    `
      SELECT webhook_secret
      FROM pipelines
      WHERE webhook_path = $1
      LIMIT 1
    `,
    [webhookPath],
  );

  const webhookSecret = pipelineResult.rows[0]?.webhook_secret ?? null;

  // If the pipeline has no secret configured, skip verification.
  if (!webhookSecret) {
    next();
    return;
  }

  const providedSignatureHeader = req.header('x-webhook-signature');

  // If a secret is configured but no signature is present, reject the request.
  if (!providedSignatureHeader) {
    res.status(401).json(invalidSignatureResponse());
    return;
  }

  const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;

  if (!rawBody) {
    // We can't verify without the exact request bytes.
    res.status(401).json(invalidSignatureResponse());
    return;
  }

  const computedDigest = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest(); // 32-byte Buffer

  const providedDigest = decodeProvidedSignature(providedSignatureHeader);

  // Decode/length mismatch => invalid signature.
  if (!providedDigest || providedDigest.length !== computedDigest.length) {
    res.status(401).json(invalidSignatureResponse());
    return;
  }

  // Timing-safe comparison to avoid leaking info about partial matches.
  const isValid = crypto.timingSafeEqual(computedDigest, providedDigest);

  if (!isValid) {
    res.status(401).json(invalidSignatureResponse());
    return;
  }

  next();
}

