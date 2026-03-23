import { useEffect, useMemo, useState } from "react";
import { useToast } from "../Toast/ToastProvider";
import { JobDetails as JobDetailsType } from "../../hooks/useDashboard";

type JobDetailsProps = {
  selectedJobId: string;
  selectedJob: JobDetailsType | null;
  loadingJobDetails: boolean;
  jobDetailsError: string;
  retryingJobId?: string;
  retryJobResult?: { type: "success" | "error"; message: string } | null;
  replayingJobId?: string;
  replayJobResult?: { type: "success" | "error"; message: string } | null;
  deliveryActionAttemptId?: number | null;
  deliveryActionResult?: { type: "success" | "error"; message: string } | null;
  onRetryJob?: (jobId: string) => void | Promise<void>;
  onReplayJob?: (jobId: string) => void | Promise<void>;
  onRetryDeliveryAttempt?: (jobId: string, attemptId: number) => void | Promise<void>;
  onCancelDeliveryRetry?: (jobId: string, attemptId: number) => void | Promise<void>;
  onClearSelection?: () => void;
};

type TimelineItem = {
  id: string;
  label: string;
  timestamp: string;
  message?: string;
  tone: "queued" | "processing" | "completed" | "failed" | "retry";
};

type ConfirmActionState = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  action: () => Promise<void>;
} | null;

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

function deliveryStatusClass(status: string): string {
  if (status === "scheduled") return "ui-badge-neutral";
  if (status === "in_progress") return "ui-badge-info";
  if (status === "succeeded") return "ui-badge-success";
  if (status === "failed_retryable") return "bg-orange-100 text-orange-700";
  if (status === "failed_final") return "ui-badge-danger";
  return "ui-badge-neutral";
}

function getDeliveryOutcome(attempt: JobDetailsType["deliveryAttempts"][number]): {
  label: string;
  className: string;
} {
  if (attempt.status === "succeeded") {
    return { label: "Delivered", className: "ui-badge-success" };
  }

  if (attempt.status === "failed_retryable") {
    return { label: "Will Retry", className: "bg-orange-100 text-orange-700" };
  }

  if (attempt.status === "failed_final") {
    return { label: "Final Failure", className: "ui-badge-danger" };
  }

  if (attempt.status === "in_progress") {
    return { label: "In Progress", className: "ui-badge-info" };
  }

  return { label: "Pending", className: "ui-badge-neutral" };
}

function formatDuration(durationMs: number | null | undefined): string {
  if (typeof durationMs !== "number" || Number.isNaN(durationMs)) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
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
  replayingJobId,
  replayJobResult,
  deliveryActionAttemptId,
  deliveryActionResult,
  onRetryJob,
  onReplayJob,
  onRetryDeliveryAttempt,
  onCancelDeliveryRetry,
  onClearSelection,
}: JobDetailsProps): JSX.Element {
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const selectedStatus = selectedJob?.status;
  const canRetry =
    selectedJob?.status === "failed_delivery" || selectedJob?.status === "failed_processing";
  const canReplay =
    selectedJob?.status === "processed" ||
    selectedJob?.status === "completed" ||
    selectedJob?.status === "failed_processing" ||
    selectedJob?.status === "failed_delivery";
  const isRetryingSelectedJob = Boolean(selectedJob && retryingJobId === selectedJob.id);
  const isReplayingSelectedJob = Boolean(selectedJob && replayingJobId === selectedJob.id);
  const timelineItems = selectedJob ? buildTimelineItems(selectedJob) : [];
  const deliveryAttempts = selectedJob?.deliveryAttempts || [];
  const successfulAttemptsCount = deliveryAttempts.filter((attempt) => attempt.status === "succeeded").length;
  const retryPendingCount = deliveryAttempts.filter((attempt) => attempt.status === "failed_retryable").length;
  const finalFailureCount = deliveryAttempts.filter((attempt) => attempt.status === "failed_final").length;
  const isManualActionPending = useMemo(
    () =>
      isConfirmingAction ||
      isRetryingSelectedJob ||
      isReplayingSelectedJob ||
      deliveryActionAttemptId !== null,
    [deliveryActionAttemptId, isConfirmingAction, isReplayingSelectedJob, isRetryingSelectedJob],
  );

  useEffect(() => {
    if (!replayJobResult) {
      return;
    }

    showToast({
      type: replayJobResult.type,
      message: replayJobResult.message,
    });
  }, [replayJobResult, showToast]);

  useEffect(() => {
    if (!retryJobResult) {
      return;
    }

    showToast({
      type: retryJobResult.type,
      message: retryJobResult.message,
    });
  }, [retryJobResult, showToast]);

  useEffect(() => {
    if (!deliveryActionResult) {
      return;
    }

    showToast({
      type: deliveryActionResult.type,
      message: deliveryActionResult.message,
    });
  }, [deliveryActionResult, showToast]);

  async function handleConfirmAction(): Promise<void> {
    if (!confirmAction) {
      return;
    }

    setIsConfirmingAction(true);

    try {
      await confirmAction.action();
      setConfirmAction(null);
    } finally {
      setIsConfirmingAction(false);
    }
  }

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
            {selectedJob && canReplay && onReplayJob && (
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    title: "Replay Job",
                    description:
                      "This will queue a new copy of the job for full reprocessing. The original job will remain unchanged for audit purposes.",
                    confirmLabel: "Replay Job",
                    confirmClassName: "ui-btn-secondary",
                    action: async () => {
                      await onReplayJob(selectedJob.id);
                    },
                  })
                }
                disabled={isManualActionPending}
                className="ui-btn-secondary"
              >
                {isReplayingSelectedJob ? "Replaying..." : "Replay Job"}
              </button>
            )}
            {selectedJob && canRetry && onRetryJob && (
              <button
                type="button"
                onClick={() => onRetryJob(selectedJob.id)}
                disabled={isManualActionPending}
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
        {replayJobResult && selectedJobId && (
          <div className={replayJobResult.type === "success" ? "ui-feedback-success" : "ui-feedback-error"}>
            {replayJobResult.message}
          </div>
        )}

        {retryJobResult && selectedJobId && (
          <div className={retryJobResult.type === "success" ? "ui-feedback-success" : "ui-feedback-error"}>
            {retryJobResult.message}
          </div>
        )}

        {deliveryActionResult && selectedJobId && (
          <div className={deliveryActionResult.type === "success" ? "ui-feedback-success" : "ui-feedback-error"}>
            {deliveryActionResult.message}
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
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Delivery Diagnostics</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Inspect subscriber targets, retry state, response details, and failure reasons.
                  </p>
                </div>
                <span className="ui-badge ui-badge-neutral">{deliveryAttempts.length} attempt(s)</span>
              </div>

              {deliveryAttempts.length ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Delivered</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{successfulAttemptsCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Retry Pending</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{retryPendingCount}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Final Failures</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{finalFailureCount}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {deliveryAttempts.map((attempt) => {
                      const outcome = getDeliveryOutcome(attempt);
                      const isApplyingAttemptAction = deliveryActionAttemptId === attempt.id;
                      const canRetryDeliveryAttempt =
                        attempt.status === "failed_retryable" || attempt.status === "failed_final";
                      const canCancelRetry = attempt.status === "failed_retryable";

                      return (
                        <article
                          key={attempt.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-900">
                                  Attempt #{attempt.attempt_no}
                                </h4>
                                <span className={`ui-badge ${deliveryStatusClass(attempt.status)}`}>
                                  {attempt.status}
                                </span>
                                <span className={`ui-badge ${outcome.className}`}>{outcome.label}</span>
                              </div>
                              <p className="mt-2 break-all font-mono text-xs text-slate-600">
                                {attempt.target_url}
                              </p>
                            </div>

                            <div className="flex flex-col items-stretch gap-2 sm:items-end">
                              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">HTTP</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {attempt.response_status_code ?? "-"}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {canRetryDeliveryAttempt && onRetryDeliveryAttempt && selectedJob && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({
                                        title: "Retry Delivery",
                                        description:
                                          "This will immediately re-queue this failed delivery attempt for the worker. Use it when you want to force another outbound delivery now.",
                                        confirmLabel: "Retry Delivery",
                                        confirmClassName: "ui-btn-secondary",
                                        action: async () => {
                                          await onRetryDeliveryAttempt(selectedJob.id, attempt.id);
                                        },
                                      })
                                    }
                                    disabled={isManualActionPending}
                                    className="ui-btn-secondary"
                                  >
                                    {isApplyingAttemptAction ? "Applying..." : "Retry Delivery"}
                                  </button>
                                )}
                                {canCancelRetry && onCancelDeliveryRetry && selectedJob && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({
                                        title: "Cancel Retry",
                                        description:
                                          "This will stop any further retry for this attempt. If the job is waiting on this retry, it may be marked as failed delivery.",
                                        confirmLabel: "Cancel Retry",
                                        confirmClassName: "ui-btn-danger",
                                        action: async () => {
                                          await onCancelDeliveryRetry(selectedJob.id, attempt.id);
                                        },
                                      })
                                    }
                                    disabled={isManualActionPending}
                                    className="ui-btn-danger"
                                  >
                                    {isApplyingAttemptAction ? "Applying..." : "Cancel Retry"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Started</p>
                              <p className="mt-1 text-sm text-slate-700">{formatDate(attempt.started_at)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Finished</p>
                              <p className="mt-1 text-sm text-slate-700">{formatDate(attempt.finished_at)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled</p>
                              <p className="mt-1 text-sm text-slate-700">{formatDate(attempt.scheduled_at ?? null)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Duration</p>
                              <p className="mt-1 text-sm text-slate-700">{formatDuration(attempt.duration_ms)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next Retry</p>
                              <p className="mt-1 text-sm text-slate-700">
                                {attempt.next_retry_at ? formatDate(attempt.next_retry_at) : "-"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Failure Reason
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                {attempt.error_message?.trim() || "No failure recorded."}
                              </p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Response Body
                              </p>
                              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                                {attempt.response_body?.trim() || "No response body recorded."}
                              </pre>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Request Payload
                              </p>
                              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                                {formatJson(attempt.request_payload)}
                              </pre>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="ui-feedback-empty">No delivery attempts available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Confirm Action</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{confirmAction.title}</h3>
              <p className="mt-3 text-sm text-slate-600">{confirmAction.description}</p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isConfirmingAction}
                className="ui-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                disabled={isConfirmingAction}
                className={confirmAction.confirmClassName}
              >
                {isConfirmingAction ? "Submitting..." : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
