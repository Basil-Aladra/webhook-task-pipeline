// Job statuses stored in the jobs table.
export enum JobStatus {
  Queued = 'queued',
  Processing = 'processing',
  Processed = 'processed',
  Completed = 'completed',
  FailedProcessing = 'failed_processing',
  FailedDelivery = 'failed_delivery',
}

// Shape of a job used by worker logic.
export type Job = {
  id: string;
  pipelineId: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  availableAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  lockExpiresAt: string | null;
  processingAttemptCount: number;
  resultPayload: Record<string, unknown> | null;
  lastError: Record<string, unknown> | null;
  receivedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Extra fields supported when updating job status.
export type UpdateJobStatusExtra = {
  resultPayload?: Record<string, unknown>;
  lastError?: Record<string, unknown>;
  completedAt?: string | Date | null;
};
