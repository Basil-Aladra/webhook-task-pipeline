import { JobDetails as JobDetailsType } from "../../hooks/useDashboard";

type JobDetailsProps = {
  selectedJobId: string;
  selectedJob: JobDetailsType | null;
  loadingJobDetails: boolean;
  jobDetailsError: string;
  retryingJobId?: string;
  retryJobResult?: { type: "success" | "error"; message: string } | null;
  onRetryJob?: (jobId: string) => void | Promise<void>;
  onClearSelection?: () => void;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function statusClass(status: JobDetailsType["status"]): string {
  if (status === "queued") return "bg-blue-100 text-blue-700";
  if (status === "processing") return "bg-amber-100 text-amber-700";
  if (status === "processed") return "bg-purple-100 text-purple-700";
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "failed_processing") return "bg-red-100 text-red-700";
  return "bg-orange-100 text-orange-700";
}

export function JobDetails({
  selectedJobId,
  selectedJob,
  loadingJobDetails,
  jobDetailsError,
  retryingJobId,
  retryJobResult,
  onRetryJob,
  onClearSelection,
}: JobDetailsProps): JSX.Element {
  const selectedStatus = selectedJob?.status;
  const canRetry =
    selectedJob?.status === "failed_delivery" || selectedJob?.status === "failed_processing";
  const isRetryingSelectedJob = Boolean(selectedJob && retryingJobId === selectedJob.id);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Details Panel</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Job Inspector</h2>
            <p className="ui-subtitle">Inspect payload, status timeline, and delivery attempts.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedJob && canRetry && onRetryJob && (
              <button
                type="button"
                onClick={() => onRetryJob(selectedJob.id)}
                disabled={isRetryingSelectedJob}
                className="ui-btn-primary"
              >
                {isRetryingSelectedJob ? "Retrying..." : "Retry Job"}
              </button>
            )}
            {onClearSelection && (
              <button type="button" onClick={onClearSelection} className="ui-btn-secondary">
                Close
              </button>
            )}
          </div>
        </div>

        {selectedJobId && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="ui-badge ui-badge-neutral">Selected Job</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
              {selectedJobId}
            </span>
            {selectedStatus && (
              <span className={`ui-badge capitalize ${statusClass(selectedStatus)}`}>
                {selectedStatus}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 p-4">
        {retryJobResult && selectedJobId && (
          <div className={retryJobResult.type === "success" ? "ui-feedback-success" : "ui-feedback-error"}>
            {retryJobResult.message}
          </div>
        )}

        {!selectedJobId && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No job selected</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose a job from the table to open its details in this panel.
            </p>
          </div>
        )}

        {selectedJobId && loadingJobDetails && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">Loading job details...</p>
            <p className="mt-1 text-sm text-slate-500">Fetching payload, status history, and delivery attempts.</p>
          </div>
        )}

        {selectedJobId && jobDetailsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6">
            <p className="text-sm font-medium text-red-700">Failed to load job details</p>
            <p className="mt-1 text-sm text-red-600">{jobDetailsError}</p>
          </div>
        )}

        {selectedJobId && selectedJob && !loadingJobDetails && (
          <div className="space-y-6">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Job ID</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-700">{selectedJob.id}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <div className="mt-2">
                    <span className={`ui-badge capitalize ${statusClass(selectedJob.status)}`}>
                      {selectedJob.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Delivery Attempts</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {selectedJob.deliveryAttempts?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Payload JSON</h3>
                <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                  {formatJson(selectedJob.payload)}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Result Payload JSON</h3>
                <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                  {formatJson(selectedJob.result_payload)}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Status History Timeline</h3>
              {selectedJob.statusHistory?.length ? (
                <ol className="space-y-2">
                  {selectedJob.statusHistory.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-medium text-slate-800">
                        {item.from_status ? `${item.from_status} -> ${item.to_status}` : item.to_status}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(item.changed_at)} | actor: {item.actor}
                      </p>
                      {item.reason && <p className="mt-1 text-xs text-slate-600">Reason: {item.reason}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="ui-feedback-empty">No status history available.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Delivery Attempts</h3>
              {selectedJob.deliveryAttempts?.length ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="ui-table-head-cell">Attempt</th>
                        <th className="ui-table-head-cell">Subscriber URL</th>
                        <th className="ui-table-head-cell">Status</th>
                        <th className="ui-table-head-cell">HTTP</th>
                        <th className="ui-table-head-cell">Started</th>
                        <th className="ui-table-head-cell">Finished</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedJob.deliveryAttempts.map((attempt) => (
                        <tr key={attempt.id} className="ui-table-row">
                          <td className="px-3 py-2">{attempt.attempt_no}</td>
                          <td className="px-3 py-2 font-mono text-xs">{attempt.target_url}</td>
                          <td className="px-3 py-2">
                            <span className="ui-badge ui-badge-neutral">{attempt.status}</span>
                          </td>
                          <td className="px-3 py-2">{attempt.response_status_code ?? "-"}</td>
                          <td className="px-3 py-2">{formatDate(attempt.started_at)}</td>
                          <td className="px-3 py-2">{formatDate(attempt.finished_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="ui-feedback-empty">No delivery attempts available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
