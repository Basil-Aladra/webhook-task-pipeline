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

type TimelineItem = {
  id: string;
  label: string;
  timestamp: string;
  message?: string;
  tone: "queued" | "processing" | "completed" | "failed" | "retry";
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

function timelineToneClass(tone: TimelineItem["tone"]): string {
  if (tone === "queued") return "bg-slate-300";
  if (tone === "processing") return "bg-blue-500";
  if (tone === "completed") return "bg-emerald-500";
  if (tone === "failed") return "bg-red-500";
  return "bg-orange-500";
}

function mapStatusToTimelineTone(status: string): TimelineItem["tone"] {
  if (status === "queued") return "queued";
  if (status === "processing" || status === "processed") return "processing";
  if (status === "completed" || status === "succeeded") return "completed";
  if (status === "failed_processing" || status === "failed_delivery" || status === "failed_final") {
    return "failed";
  }
  if (status === "failed_retryable") return "retry";
  return "queued";
}

function buildTimelineItems(selectedJob: JobDetailsType): TimelineItem[] {
  const statusItems: TimelineItem[] = (selectedJob.statusHistory || []).map((item) => ({
    id: `status-${item.id}`,
    label: item.to_status,
    timestamp: item.changed_at,
    message: item.reason ? `${item.reason} | actor: ${item.actor}` : `actor: ${item.actor}`,
    tone: mapStatusToTimelineTone(item.to_status),
  }));

  const deliveryItems: TimelineItem[] = (selectedJob.deliveryAttempts || []).reduce<TimelineItem[]>(
    (items, attempt) => {
      const timestamp =
        attempt.finished_at || attempt.started_at || attempt.scheduled_at || attempt.created_at;

      if (!timestamp) {
        return items;
      }

      const extra =
        attempt.error_message ||
        (typeof attempt.response_status_code === "number"
          ? `HTTP ${attempt.response_status_code}`
          : undefined);

      items.push({
        id: `delivery-${attempt.id}`,
        label:
          attempt.status === "failed_retryable"
            ? `Retry attempt #${attempt.attempt_no}`
            : `Delivery attempt #${attempt.attempt_no} ${attempt.status}`,
        timestamp,
        message: extra,
        tone: mapStatusToTimelineTone(attempt.status),
      });

      return items;
    },
    [],
  );

  return [...statusItems, ...deliveryItems].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
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
  const timelineItems = selectedJob ? buildTimelineItems(selectedJob) : [];

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
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Lifecycle Timeline</h3>
              {timelineItems.length ? (
                <ol className="space-y-0">
                  {timelineItems.map((item, index) => {
                    const isLast = index === timelineItems.length - 1;

                    return (
                      <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                        <div className="relative flex w-5 justify-center">
                          {!isLast && <span className="absolute top-3 h-full w-px bg-slate-200" />}
                          <span
                            className={`relative z-10 mt-1 block h-3 w-3 rounded-full ${timelineToneClass(item.tone)}`}
                          />
                        </div>

                        <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium capitalize text-slate-800">{item.label}</span>
                            <span
                              className={`ui-badge capitalize ${
                                item.tone === "queued"
                                  ? "ui-badge-neutral"
                                  : item.tone === "processing"
                                    ? "ui-badge-info"
                                    : item.tone === "completed"
                                      ? "ui-badge-success"
                                      : item.tone === "failed"
                                        ? "ui-badge-danger"
                                        : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {item.tone}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(item.timestamp)}</p>
                          {item.message && <p className="mt-2 text-xs text-slate-600">{item.message}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="ui-feedback-empty">No lifecycle history available.</p>
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
