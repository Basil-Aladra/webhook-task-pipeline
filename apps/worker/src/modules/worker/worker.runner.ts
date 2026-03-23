import { logger } from '../../shared/logger';
import { markWorkerHeartbeat } from '../health/worker-health';

import { getPipelineSubscribers, getSubscriberById } from '../../db/pipelines.repository';
import {
  deliverJobResults,
  deliverToSubscriber,
} from '../delivery/delivery.service';
import {
  addJobStatusHistory,
  computeDeliveryOutcomeForJob,
  fetchNextJob,
  getJobById,
  recoverExpiredProcessingJobs,
  updateJobStatus,
} from '../jobs/jobs.repository';
import { JobStatus } from '../jobs/jobs.types';
import { processJob } from './worker.service';
import { claimNextRetryableDeliveryAttempt } from '../delivery/delivery.repository';

const workerActor = 'worker';
let isPolling = false;
let emptyPollCount = 0;

async function pollDeliveryRetries(): Promise<boolean> {
  const claimedAttempt = await claimNextRetryableDeliveryAttempt();
  if (!claimedAttempt) {
    return false;
  }

  const job = await getJobById(claimedAttempt.jobId);
  if (!job) {
    logger.warn('Retry skipped: job not found', {
      jobId: claimedAttempt.jobId,
      attemptId: claimedAttempt.attemptId,
    });
    return true;
  }

  if (!job.resultPayload) {
    logger.warn('Retry skipped: job has no result payload yet', {
      jobId: job.id,
      attemptId: claimedAttempt.attemptId,
    });
    return true;
  }

  const subscriber = await getSubscriberById(claimedAttempt.subscriberId);
  if (!subscriber) {
    logger.warn('Retry skipped: subscriber not found', {
      subscriberId: claimedAttempt.subscriberId,
      attemptId: claimedAttempt.attemptId,
    });
    return true;
  }

  if (!subscriber.enabled) {
    logger.warn('Retry skipped: subscriber disabled', {
      subscriberId: subscriber.id,
      attemptId: claimedAttempt.attemptId,
    });
    return true;
  }

  logger.info('Retry delivery started', {
    jobId: job.id,
    pipelineId: job.pipelineId,
    subscriberId: subscriber.id,
    previousFailedAttemptId: claimedAttempt.attemptId,
    previousFailedAttemptNo: claimedAttempt.attemptNo,
  });

  await deliverToSubscriber(job, subscriber, job.resultPayload);

  const deliveryOutcome = await computeDeliveryOutcomeForJob(job.id);
  if (!deliveryOutcome) {
    return true;
  }

  const { currentStatus, enabledSubscribersCount, succeededSubscribersCount, hasFailedFinal } =
    deliveryOutcome;

  let targetStatus: JobStatus | null = null;
  if (hasFailedFinal) {
    targetStatus = JobStatus.FailedDelivery;
  } else if (
    succeededSubscribersCount === enabledSubscribersCount
  ) {
    targetStatus = JobStatus.Completed;
  }

  if (targetStatus && targetStatus !== currentStatus) {
    if (targetStatus === JobStatus.Completed) {
      await updateJobStatus(job.id, JobStatus.Completed, {
        completedAt: new Date(),
      });

      await addJobStatusHistory(
        job.id,
        currentStatus,
        JobStatus.Completed,
        null,
        workerActor,
      );
    } else if (targetStatus === JobStatus.FailedDelivery) {
      await updateJobStatus(job.id, JobStatus.FailedDelivery, {
        lastError: {
          message: 'One or more subscribers failed permanently.',
          jobId: job.id,
        },
        completedAt: new Date(),
      });

      await addJobStatusHistory(
        job.id,
        currentStatus,
        JobStatus.FailedDelivery,
        'One or more subscribers failed permanently.',
        workerActor,
      );
    }
  }

  return true;
}

// Polls once: tries to reserve and process exactly one queued job.
export async function poll(): Promise<void> {
  // Recover stale in-progress jobs first so they can be retried by any worker.
  const recoveredJobIds = await recoverExpiredProcessingJobs();
  if (recoveredJobIds.length > 0) {
    logger.warn('Recovered expired processing jobs', {
      recoveredCount: recoveredJobIds.length,
      jobIds: recoveredJobIds,
    });
  }

  // 1) Retry due failed delivery attempts first.
  const didRetry = await pollDeliveryRetries();
  if (didRetry) {
    return;
  }

  // 2) Otherwise, pick up the next queued processing job.
  const job = await fetchNextJob();

  if (!job) {
    emptyPollCount += 1;

    if (emptyPollCount % 10 === 0) {
      logger.info('No jobs found, waiting...', {
        emptyPollCount,
      });
    }

    return;
  }

  emptyPollCount = 0;

  logger.info('Job picked', {
    jobId: job.id,
    pipelineId: job.pipelineId,
  });

  // Record the reservation transition so the history timeline is complete.
  await addJobStatusHistory(
    job.id,
    JobStatus.Queued,
    JobStatus.Processing,
    null,
    workerActor,
  );

  const result = await processJob(job);

  if (result.success) {
    await updateJobStatus(job.id, JobStatus.Processed, {
      resultPayload: result.resultPayload,
    });

    await addJobStatusHistory(
      job.id,
      JobStatus.Processing,
      JobStatus.Processed,
      null,
      workerActor,
    );

    const subscribers = await getPipelineSubscribers(job.pipelineId);
    const deliveryOutcome = await deliverJobResults(job, subscribers, result.resultPayload);

    logger.info('Delivery results evaluated', {
      jobId: job.id,
      pipelineId: job.pipelineId,
      allSucceeded: deliveryOutcome.allSucceeded,
      deliveryResults: deliveryOutcome.results,
    });

    if (deliveryOutcome.allSucceeded) {
      await updateJobStatus(job.id, JobStatus.Completed, {
        completedAt: new Date(),
      });

      await addJobStatusHistory(
        job.id,
        JobStatus.Processed,
        JobStatus.Completed,
        null,
        workerActor,
      );

      logger.info('Job processed successfully', {
        jobId: job.id,
        pipelineId: job.pipelineId,
      });
      return;
    }

    const hasFailedFinal = deliveryOutcome.results.some(
      (deliveryResult) => !deliveryResult.success && !deliveryResult.retryable,
    );

    if (hasFailedFinal) {
      await updateJobStatus(job.id, JobStatus.FailedDelivery, {
        lastError: {
          message: 'One or more subscribers failed permanently.',
          deliveryResults: deliveryOutcome.results,
        },
        completedAt: new Date(),
      });

      await addJobStatusHistory(
        job.id,
        JobStatus.Processed,
        JobStatus.FailedDelivery,
        'One or more subscribers failed permanently.',
        workerActor,
      );

      logger.error(
        'Job failed during final delivery',
        {
          jobId: job.id,
          pipelineId: job.pipelineId,
          deliveryResults: deliveryOutcome.results,
        },
        new Error('One or more subscribers failed permanently.'),
      );
      return;
    }

    logger.warn('Job processed with retryable delivery failures', {
      jobId: job.id,
      pipelineId: job.pipelineId,
      deliveryResults: deliveryOutcome.results,
    });
    return;
  }

  await updateJobStatus(job.id, JobStatus.FailedProcessing, {
    lastError: result.error,
    completedAt: new Date(),
  });

  await addJobStatusHistory(
    job.id,
    JobStatus.Processing,
    JobStatus.FailedProcessing,
    typeof result.error.message === 'string' ? result.error.message : 'Processing failed',
    workerActor,
  );

  logger.error(
    'Job failed during processing',
    {
      jobId: job.id,
      pipelineId: job.pipelineId,
      error: result.error,
    },
    new Error(typeof result.error.message === 'string' ? result.error.message : 'Processing failed'),
  );
}

async function safePoll(): Promise<void> {
  if (isPolling) {
    return;
  }

  isPolling = true;

  try {
    await poll();
  } catch (error) {
    logger.error('Worker poll failed', {}, error);
  } finally {
    isPolling = false;
  }
}

// Starts the polling loop and keeps the worker alive.
export function start(): void {
  const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS) || 5000;
  const heartbeatIntervalMs = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS) || 5000;

  logger.info('Worker started', {
    pollIntervalMs,
    heartbeatIntervalMs,
  });

  markWorkerHeartbeat();
  void safePoll();

  setInterval(() => {
    markWorkerHeartbeat();
    void safePoll();
  }, pollIntervalMs);

  setInterval(() => {
    markWorkerHeartbeat();
  }, heartbeatIntervalMs);
}
