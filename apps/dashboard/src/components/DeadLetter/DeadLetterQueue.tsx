import { AlertIcon, RefreshIcon } from "../Layout/Icons";
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
    <section className="ui-panel overflow-hidden">
      <div className="ui-section-header">
        <div>
          <p className="ui-kicker">Failure recovery</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Dead Letter Queue</h2>
          <p className="mt-2 ui-subtitle">
            Jobs that reached final delivery failure and now require explicit operator action.
          </p>
        </div>
        <span className="ui-badge ui-badge-danger">{deadLetterJobs.length} item(s)</span>
      </div>

      <div className="ui-panel-body space-y-5">
        {retryJobResult && (
          <div className={retryJobResult.type === "success" ? "ui-feedback-success" : "ui-feedback-error"}>
            {retryJobResult.message}
          </div>
        )}

        {deadLetterJobs.length === 0 ? (
          <div className="ui-empty-state">
            <p className="ui-empty-state-title">Dead letter queue is clear</p>
            <p className="ui-empty-state-text">
              No permanently failed jobs need operator recovery right now.
            </p>
          </div>
        ) : (
          <div className="ui-table-shell">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
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
                      <td className="ui-table-cell font-mono text-xs text-slate-700">{shortId(job.id)}</td>
                      <td className="ui-table-cell font-mono text-xs text-slate-700">{shortId(job.pipeline_id)}</td>
                      <td className="ui-table-cell text-slate-600">{formatDate(job.created_at)}</td>
                      <td className="ui-table-cell">{job.deliveryAttemptsCount}</td>
                      <td className="ui-table-cell">
                        {onRetryJob && (
                          <button
                            type="button"
                            onClick={() => onRetryJob(job.id)}
                            disabled={retryingJobId === job.id}
                            className="ui-btn-secondary"
                          >
                            <RefreshIcon className="ui-btn-icon" />
                            {retryingJobId === job.id ? "Retrying..." : "Retry Job"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
