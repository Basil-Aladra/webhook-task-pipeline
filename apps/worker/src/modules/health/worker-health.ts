type WorkerHealthStatus = 'running' | 'unknown';

type WorkerHealthSnapshot = {
  status: WorkerHealthStatus;
  workerId: string;
  lastHeartbeat: string | null;
  uptimeSeconds: number;
};

const startedAt = Date.now();
const workerId = process.env.WORKER_ID || 'worker-1';
let lastHeartbeatAt: number | null = null;

export function markWorkerHeartbeat(): void {
  lastHeartbeatAt = Date.now();
}

export function getWorkerHealthSnapshot(): WorkerHealthSnapshot {
  return {
    status: lastHeartbeatAt ? 'running' : 'unknown',
    workerId,
    lastHeartbeat: lastHeartbeatAt ? new Date(lastHeartbeatAt).toISOString() : null,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };
}
