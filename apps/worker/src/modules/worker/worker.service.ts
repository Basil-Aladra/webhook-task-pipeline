import { getPipelineWithActions } from '../../db/pipelines.repository';
import { Job } from '../jobs/jobs.types';
import { getProcessor } from '../processors/processor.registry';

export type ProcessJobSuccess = {
  success: true;
  resultPayload: Record<string, unknown>;
};

export type ProcessJobFailure = {
  success: false;
  error: Record<string, unknown>;
};

export type ProcessJobResult = ProcessJobSuccess | ProcessJobFailure;

// Runs pipeline actions in order and returns the final payload.
export async function processJob(job: Job): Promise<ProcessJobResult> {
  try {
    const pipelineWithActions = await getPipelineWithActions(job.pipelineId);

    if (!pipelineWithActions) {
      throw new Error(`Pipeline not found for job ${job.id}`);
    }

    const enabledActions = pipelineWithActions.actions
      .filter((action) => action.enabled)
      // Validation should always run before payload mutation processors, even if configured later.
      .sort((left, right) => {
        if (left.actionType === right.actionType) {
          return left.orderIndex - right.orderIndex;
        }

        if (left.actionType === 'validate') {
          return -1;
        }

        if (right.actionType === 'validate') {
          return 1;
        }

        return left.orderIndex - right.orderIndex;
      });

    let currentPayload: Record<string, unknown> = { ...job.payload };

    for (const action of enabledActions) {
      const processor = getProcessor(action.actionType);
      const output = await processor.process({
        payload: currentPayload,
        config: action.config,
        jobId: job.id,
        actionType: action.actionType,
      });

      currentPayload = output.result;
    }

    return {
      success: true,
      resultPayload: currentPayload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error';

    return {
      success: false,
      error: {
        message,
      },
    };
  }
}
