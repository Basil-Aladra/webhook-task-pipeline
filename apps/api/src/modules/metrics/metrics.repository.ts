import { pool } from '../../db/pool';

type CountRow = {
  count: number;
};

type JobsByStatusRow = {
  status: string;
  count: number;
};

type AverageProcessingTimeRow = {
  average_processing_time_ms: number | null;
};

export type MetricsResult = {
  totalPipelines: number;
  activePipelines: number;
  totalJobs: number;
  jobsByStatus: {
    queued: number;
    processing: number;
    processed: number;
    completed: number;
    failed_processing: number;
    failed_delivery: number;
  };
  totalDeliveryAttempts: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageProcessingTimeMs: number | null;
};

// Returns dashboard-style aggregate metrics for pipelines, jobs, and deliveries.
export async function getMetrics(): Promise<MetricsResult> {
  const totalPipelinesQuery = 'SELECT COUNT(*)::int AS count FROM pipelines';
  const activePipelinesQuery = "SELECT COUNT(*)::int AS count FROM pipelines WHERE status = $1";
  const totalJobsQuery = 'SELECT COUNT(*)::int AS count FROM jobs';
  const jobsByStatusQuery = `
    SELECT status, COUNT(*)::int AS count
    FROM jobs
    GROUP BY status
  `;
  const totalDeliveryAttemptsQuery = 'SELECT COUNT(*)::int AS count FROM delivery_attempts';
  const successfulDeliveriesQuery = `
    SELECT COUNT(*)::int AS count
    FROM delivery_attempts
    WHERE status = $1
  `;
  const failedDeliveriesQuery = `
    SELECT COUNT(*)::int AS count
    FROM delivery_attempts
    WHERE status = $1
  `;
  const averageProcessingTimeQuery = `
    SELECT
      ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000))::int
        AS average_processing_time_ms
    FROM jobs
    WHERE status = $1
      AND started_at IS NOT NULL
      AND completed_at IS NOT NULL
  `;

  const [
    totalPipelinesResult,
    activePipelinesResult,
    totalJobsResult,
    jobsByStatusResult,
    totalDeliveryAttemptsResult,
    successfulDeliveriesResult,
    failedDeliveriesResult,
    averageProcessingTimeResult,
  ] = await Promise.all([
    pool.query<CountRow>(totalPipelinesQuery, []),
    pool.query<CountRow>(activePipelinesQuery, ['active']),
    pool.query<CountRow>(totalJobsQuery, []),
    pool.query<JobsByStatusRow>(jobsByStatusQuery, []),
    pool.query<CountRow>(totalDeliveryAttemptsQuery, []),
    pool.query<CountRow>(successfulDeliveriesQuery, ['succeeded']),
    pool.query<CountRow>(failedDeliveriesQuery, ['failed_final']),
    pool.query<AverageProcessingTimeRow>(averageProcessingTimeQuery, ['completed']),
  ]);

  const jobsByStatus: MetricsResult['jobsByStatus'] = {
    queued: 0,
    processing: 0,
    processed: 0,
    completed: 0,
    failed_processing: 0,
    failed_delivery: 0,
  };

  for (const row of jobsByStatusResult.rows) {
    if (row.status in jobsByStatus) {
      jobsByStatus[row.status as keyof MetricsResult['jobsByStatus']] = row.count;
    }
  }

  return {
    totalPipelines: totalPipelinesResult.rows[0]?.count ?? 0,
    activePipelines: activePipelinesResult.rows[0]?.count ?? 0,
    totalJobs: totalJobsResult.rows[0]?.count ?? 0,
    jobsByStatus,
    totalDeliveryAttempts: totalDeliveryAttemptsResult.rows[0]?.count ?? 0,
    successfulDeliveries: successfulDeliveriesResult.rows[0]?.count ?? 0,
    failedDeliveries: failedDeliveriesResult.rows[0]?.count ?? 0,
    averageProcessingTimeMs: averageProcessingTimeResult.rows[0]?.average_processing_time_ms ?? null,
  };
}
