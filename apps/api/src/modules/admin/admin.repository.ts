import { pool } from '../../db/pool';

export type ResetRuntimeDataResult = {
  deletedDeliveryAttempts: number;
  deletedJobStatusHistory: number;
  deletedJobs: number;
  deletedLogs: number;
};

export async function resetRuntimeData(): Promise<ResetRuntimeDataResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deleteDeliveryAttemptsResult = await client.query('DELETE FROM delivery_attempts');
    const deleteJobStatusHistoryResult = await client.query('DELETE FROM job_status_history');
    const deleteJobsResult = await client.query('DELETE FROM jobs');
    const deleteLogsResult = await client.query('DELETE FROM logs');

    await client.query('COMMIT');

    return {
      deletedDeliveryAttempts: deleteDeliveryAttemptsResult.rowCount ?? 0,
      deletedJobStatusHistory: deleteJobStatusHistoryResult.rowCount ?? 0,
      deletedJobs: deleteJobsResult.rowCount ?? 0,
      deletedLogs: deleteLogsResult.rowCount ?? 0,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
