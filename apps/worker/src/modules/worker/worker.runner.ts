import { logger } from '../../shared/logger';

import { getPipelineSubscribers } from '../../db/pipelines.repository';
import { deliverJobResults } from '../delivery/delivery.service';
import { addJobStatusHistory, fetchNextJob, updateJobStatus } from '../jobs/jobs.repository';
import { JobStatus } from '../jobs/jobs.types';
import { processJob } from './worker.service';

const workerActor = 'worker';
let isPolling = false;
let emptyPollCount = 0;

// Polls once: tries to reserve and process exactly one queued job.
export async function poll(): Promise<void> {
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

  logger.info('Worker started', {
    pollIntervalMs,
  });

  void safePoll();

  setInterval(() => {
    void safePoll();
  }, pollIntervalMs);
}
