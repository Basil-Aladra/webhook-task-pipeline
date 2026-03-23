import { DeadLetterJob } from "../../hooks/useDashboard";

type DeadLetterQueueProps = {
  deadLetterJobs: DeadLetterJob[];
  retryingJobId?: string;
  retryJobResult?: { type: "success" | "error"; message: string } | null;
  onRetryJob?: (jobId: string) => void | Promise<void>;
};

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function DeadLetterQueue({
  deadLetterJobs,
  retryingJobId,
  retryJobResult,
  onRetryJob,
}: DeadLetterQueueProps): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dead Letter Queue</h2>
          <p className="ui-subtitle">Jobs that reached final delivery failure.</p>
        </div>
        <span className="ui-badge ui-badge-danger">
          {deadLetterJobs.length}
        </span>
      </div>

      {retryJobResult && <div className={retryJobResult.type === "success" ? "ui-feedback-success mb-4" : "ui-feedback-error mb-4"}>{retryJobResult.message}</div>}

      {deadLetterJobs.length === 0 ? (
        <p className="ui-feedback-empty">No failed jobs</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="ui-table-head-cell">Job ID</th>
                <th className="ui-table-head-cell">Pipeline ID</th>
                <th className="ui-table-head-cell">Created At</th>
                <th className="ui-table-head-cell">Delivery Attempts</th>
                <th className="ui-table-head-cell">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deadLetterJobs.map((job) => (
                <tr key={job.id} className="ui-table-row">
                  <td className="px-3 py-2 font-mono text-xs">{shortId(job.id)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{shortId(job.pipeline_id)}</td>
                  <td className="px-3 py-2">{formatDate(job.created_at)}</td>
                  <td className="px-3 py-2">{job.deliveryAttemptsCount}</td>
                  <td className="px-3 py-2">
                    {onRetryJob && (
                      <button
                        type="button"
                        onClick={() => onRetryJob(job.id)}
                        disabled={retryingJobId === job.id}
                        className="ui-btn-secondary"
                      >
                        {retryingJobId === job.id ? "Retrying..." : "Retry"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
