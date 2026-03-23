import { Request, Response } from 'express';
import { logger } from '../../shared/logger';

type WorkerHealthResponse = {
  data: {
    status: 'running' | 'unknown';
    workerId: string | null;
    lastHeartbeat: string | null;
    uptimeSeconds: number | null;
  };
};

async function fetchWorkerHealthFromCandidates(): Promise<WorkerHealthResponse['data']> {
  const envUrl = process.env.WORKER_HEALTH_URL;
  const candidates = [
    envUrl,
    'http://localhost:3001/internal/worker/health',
    'http://worker:3001/internal/worker/health',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        continue;
      }

      const json = (await response.json()) as WorkerHealthResponse;
      if (json?.data) {
        return json.data;
      }
    } catch {
      // Try next candidate URL.
    }
  }

  return {
    status: 'unknown',
    workerId: null,
    lastHeartbeat: null,
    uptimeSeconds: null,
  };
}

export async function getWorkerHealthHandler(_req: Request, res: Response): Promise<void> {
  try {
    const workerHealth = await fetchWorkerHealthFromCandidates();

    res.status(200).json({
      data: workerHealth,
    });
  } catch (error) {
    logger.error('Worker health API error', {}, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  }
}
