import { useEffect, useMemo, useState } from "react";
import { JobDetails as JobDetailsType } from "../../hooks/useDashboard";
import {
  ActivityIcon,
  AlertIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  JobsIcon,
  NotificationIcon,
  RefreshIcon,
  SendIcon,
} from "../Layout/Icons";
import { useToast } from "../Toast/ToastProvider";

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
  tone: "queued" | "processing" | "completed" | "failed" | "retry" | "action";
};

type OperatorActionMeta = {
  title: string;
  outcomeLabel: string;
  outcomeClassName: string;
  tone: TimelineItem["tone"];
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
  if (tone === "action") return "bg-violet-500";
  return "bg-orange-500";
}

function operatorLogTone(level: "info" | "warn" | "error"): TimelineItem["tone"] {
  if (level === "warn" || level === "error") {
    return "failed";
  }

  return "action";
}

function getOperatorActionMeta(
  entry: NonNullable<JobDetailsType["operatorActionLogs"]>[number],
): OperatorActionMeta {
  const message = entry.message.toLowerCase();
  const tone = operatorLogTone(entry.level);

  if (message.includes("manual job replay")) {
    if (message.includes("rejected") || message.includes("failed")) {
      return {
        title: "Replay Job",
        outcomeLabel: message.includes("rejected") ? "Rejected" : "Failed",
        outcomeClassName: "ui-badge-danger",
        tone,
      };
    }

    return {
      title: "Replay Job",
      outcomeLabel: "Queued",
      outcomeClassName: "ui-badge-success",
      tone: "action",
    };
  }

  if (message.includes("manual job retry")) {
    if (message.includes("rejected") || message.includes("failed")) {
      return {
        title: "Retry Job",
        outcomeLabel: message.includes("rejected") ? "Rejected" : "Failed",
        outcomeClassName: "ui-badge-danger",
        tone,
      };
    }

    return {
      title: "Retry Job",
      outcomeLabel: "Scheduled",
      outcomeClassName: "ui-badge-success",
      tone: "action",
    };
  }

  if (message.includes("manual delivery retry cancel")) {
    if (message.includes("rejected") || message.includes("failed")) {
      return {
        title: "Cancel Retry",
        outcomeLabel: message.includes("rejected") ? "Rejected" : "Failed",
        outcomeClassName: "ui-badge-danger",
        tone,
      };
    }

    return {
      title: "Cancel Retry",
      outcomeLabel: "Applied",
      outcomeClassName: "bg-orange-100 text-orange-700",
      tone: "action",
    };
  }

  if (message.includes("manual delivery retry")) {
    if (message.includes("rejected") || message.includes("failed")) {
      return {
        title: "Retry Delivery",
        outcomeLabel: message.includes("rejected") ? "Rejected" : "Failed",
        outcomeClassName: "ui-badge-danger",
        tone,
      };
    }

    return {
      title: "Retry Delivery",
      outcomeLabel: "Scheduled",
      outcomeClassName: "ui-badge-success",
      tone: "action",
    };
  }

  return {
    title: "Operator Action",
    outcomeLabel: entry.level === "warn" || entry.level === "error" ? "Attention" : "Applied",
    outcomeClassName:
      entry.level === "warn" || entry.level === "error"
        ? "ui-badge-danger"
        : "bg-violet-100 text-violet-700",
    tone,
  };
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

  const operatorItems: TimelineItem[] = (selectedJob.operatorActionLogs || []).map((entry) => {
    const meta = getOperatorActionMeta(entry);

    return {
      id: `operator-${entry.id}`,
      label: meta.title,
      timestamp: entry.timestamp,
      message: entry.message,
      tone: meta.tone,
    };
  });

  return [...statusItems, ...deliveryItems, ...operatorItems].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

function timelineBadgeClass(tone: TimelineItem["tone"]): string {
  if (tone === "queued") return "ui-badge-neutral";
  if (tone === "processing") return "ui-badge-info";
  if (tone === "completed") return "ui-badge-success";
  if (tone === "action") return "bg-violet-100 text-violet-700";
  if (tone === "failed") return "ui-badge-danger";
  return "bg-orange-100 text-orange-700";
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
  const operatorActionLogs = selectedJob?.operatorActionLogs || [];
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
    <section className="ui-panel overflow-hidden xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-5 py-5 backdrop-blur-xl sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ui-kicker">Operational diagnostics</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Job Inspector</h2>
            <p className="mt-2 ui-subtitle">
              Follow payload execution, audit manual actions, and inspect every delivery attempt in one panel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedJob && canReplay && onReplayJob && (
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    title: "Replay Job",
                    description:
                      "This will queue a new copy of the job for full reprocessing. The original job stays unchanged for audit purposes.",
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
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
              {selectedJobId}
            </span>
            {selectedStatus && (
              <span className={`ui-badge capitalize ${statusClass(selectedStatus)}`}>{selectedStatus}</span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
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
          <div className="ui-empty-state">
            <span className="ui-empty-icon">
              <JobsIcon className="h-5 w-5" />
            </span>
            <p className="ui-empty-state-title mt-4">No job selected</p>
            <p className="ui-empty-state-text">
              Choose a job from the table to open its lifecycle, payload, delivery diagnostics, and recovery actions.
            </p>
          </div>
        )}

        {selectedJobId && loadingJobDetails && (
          <div className="ui-empty-state">
            <span className="ui-empty-icon">
              <ActivityIcon className="h-5 w-5" />
            </span>
            <p className="ui-empty-state-title mt-4">Loading job details</p>
            <p className="ui-empty-state-text">Fetching payload data, status history, and delivery attempts.</p>
          </div>
        )}

        {selectedJobId && jobDetailsError && (
          <div className="ui-feedback-error">
            <p className="font-medium">Failed to load job details</p>
            <p className="mt-1">{jobDetailsError}</p>
          </div>
        )}

        {selectedJobId && selectedJob && !loadingJobDetails && (
          <div className="space-y-6">
            <section className="ui-inspector-hero">
              <div className="relative">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ui-card-icon-soft">
                        <JobsIcon className="h-4 w-4" />
                      </span>
                      <span className={`ui-badge capitalize ${statusClass(selectedJob.status)}`}>{selectedJob.status}</span>
                      <span className="ui-badge ui-badge-neutral">
                        {deliveryAttempts.length} delivery attempt(s)
                      </span>
                    </div>

                    <h3 className="mt-4 break-all text-2xl font-semibold tracking-tight text-slate-950">
                      {selectedJob.id}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Job payload, processing outcomes, manual operator audit, and per-attempt delivery diagnostics.
                    </p>
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[320px] lg:grid-cols-1">
                    <div className="ui-metric-tile">
                      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <CheckIcon className="h-3.5 w-3.5" />
                        Delivered
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {successfulAttemptsCount}
                      </p>
                    </div>
                    <div className="ui-metric-tile">
                      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <RefreshIcon className="h-3.5 w-3.5" />
                        Retry pending
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {retryPendingCount}
                      </p>
                    </div>
                    <div className="ui-metric-tile">
                      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <AlertIcon className="h-3.5 w-3.5" />
                        Final failures
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {finalFailureCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="ui-inspector-section">
              <div className="ui-inspector-section-header">
                <div>
                  <p className="ui-kicker">Payload inspection</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Request and Result</h3>
                  <p className="mt-2 ui-subtitle">
                    Compare the original job payload with the output produced by the processor chain.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="ui-data-card">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="ui-card-icon">
                      <InfoIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Payload JSON</p>
                      <p className="text-sm text-slate-500">Stored event body before processing.</p>
                    </div>
                  </div>
                  <pre className="ui-code-block">{formatJson(selectedJob.payload)}</pre>
                </div>

                <div className="ui-data-card">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="ui-card-icon">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Result Payload JSON</p>
                      <p className="text-sm text-slate-500">Processor output that continued into delivery.</p>
                    </div>
                  </div>
                  <pre className="ui-code-block">{formatJson(selectedJob.result_payload)}</pre>
                </div>
              </div>
            </section>

            <section className="ui-inspector-section">
              <div className="ui-inspector-section-header">
                <div>
                  <p className="ui-kicker">Manual controls</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Operator Actions</h3>
                  <p className="mt-2 ui-subtitle">
                    Replay, retry, and cancellation events logged against this job for audit visibility.
                  </p>
                </div>
                <span className="ui-badge ui-badge-neutral">{operatorActionLogs.length} action(s)</span>
              </div>

              {operatorActionLogs.length ? (
                <div className="space-y-4">
                  {operatorActionLogs.map((entry) => {
                    const meta = getOperatorActionMeta(entry);

                    return (
                      <article key={entry.id} className="ui-data-card">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="ui-card-icon h-10 w-10 rounded-2xl">
                                <NotificationIcon className="h-4 w-4" />
                              </span>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-950">{meta.title}</h4>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`ui-badge ${meta.outcomeClassName}`}>{meta.outcomeLabel}</span>
                                  <span
                                    className={`ui-badge uppercase ${
                                      entry.level === "info"
                                        ? "ui-badge-info"
                                        : entry.level === "warn"
                                          ? "ui-badge-warn"
                                          : "ui-badge-danger"
                                    }`}
                                  >
                                    {entry.level}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-slate-700">{entry.message}</p>
                          </div>

                          <div className="ui-metric-tile-muted xl:min-w-[220px]">
                            <p className="ui-kicker">Recorded</p>
                            <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(entry.timestamp)}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="ui-empty-state">
                  <span className="ui-empty-icon">
                    <NotificationIcon className="h-5 w-5" />
                  </span>
                  <p className="ui-empty-state-title mt-4">No operator actions recorded</p>
                  <p className="ui-empty-state-text">
                    Replay, retry, and cancellation actions will appear here when applied to this job.
                  </p>
                </div>
              )}
            </section>

            <section className="ui-inspector-section">
              <div className="ui-inspector-section-header">
                <div>
                  <p className="ui-kicker">Execution history</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Lifecycle Timeline</h3>
                  <p className="mt-2 ui-subtitle">
                    Ordered status changes, delivery retries, and operator actions rendered as one unified sequence.
                  </p>
                </div>
              </div>

              {timelineItems.length ? (
                <ol className="space-y-0">
                  {timelineItems.map((item, index) => {
                    const isLast = index === timelineItems.length - 1;

                    return (
                      <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
                        <div className="relative flex w-6 justify-center">
                          {!isLast && <span className="absolute top-3 h-full w-px bg-slate-200" />}
                          <span className={`relative z-10 mt-1 block h-3.5 w-3.5 rounded-full ${timelineToneClass(item.tone)}`} />
                        </div>

                        <div className="ui-data-card-muted min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold capitalize text-slate-900">{item.label}</span>
                            <span className={`ui-badge capitalize ${timelineBadgeClass(item.tone)}`}>{item.tone}</span>
                          </div>
                          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                            {formatDate(item.timestamp)}
                          </p>
                          {item.message && <p className="mt-3 text-sm leading-6 text-slate-600">{item.message}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="ui-empty-state">
                  <span className="ui-empty-icon">
                    <ClockIcon className="h-5 w-5" />
                  </span>
                  <p className="ui-empty-state-title mt-4">No lifecycle history available</p>
                  <p className="ui-empty-state-text">
                    Status changes and delivery activity will appear here once the job moves through the system.
                  </p>
                </div>
              )}
            </section>

            <section className="ui-inspector-section">
              <div className="ui-inspector-section-header">
                <div>
                  <p className="ui-kicker">Outbound delivery</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Delivery Diagnostics</h3>
                  <p className="mt-2 ui-subtitle">
                    Inspect destination targets, retry posture, HTTP outcomes, failure reasons, and request payloads.
                  </p>
                </div>
                <span className="ui-badge ui-badge-neutral">{deliveryAttempts.length} attempt(s)</span>
              </div>

              {deliveryAttempts.length ? (
                <div className="space-y-4">
                  {deliveryAttempts.map((attempt) => {
                    const outcome = getDeliveryOutcome(attempt);
                    const isApplyingAttemptAction = deliveryActionAttemptId === attempt.id;
                    const canRetryDeliveryAttempt =
                      attempt.status === "failed_retryable" || attempt.status === "failed_final";
                    const canCancelRetry = attempt.status === "failed_retryable";

                    return (
                      <article key={attempt.id} className="ui-data-card">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="ui-card-icon h-10 w-10 rounded-2xl">
                                {attempt.status === "succeeded" ? (
                                  <CheckIcon className="h-4 w-4" />
                                ) : attempt.status === "failed_final" ? (
                                  <AlertIcon className="h-4 w-4" />
                                ) : (
                                  <SendIcon className="h-4 w-4" />
                                )}
                              </span>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-950">Attempt #{attempt.attempt_no}</h4>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`ui-badge ${deliveryStatusClass(attempt.status)}`}>{attempt.status}</span>
                                  <span className={`ui-badge ${outcome.className}`}>{outcome.label}</span>
                                </div>
                              </div>
                            </div>

                            <p className="mt-4 break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-6 text-slate-700">
                              {attempt.target_url}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 xl:min-w-[250px]">
                            <div className="ui-metric-tile-muted">
                              <p className="ui-kicker">HTTP response</p>
                              <p className="mt-2 text-lg font-semibold text-slate-950">
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
                                        "This will immediately re-queue this failed delivery attempt for the worker.",
                                      confirmLabel: "Retry Delivery",
                                      confirmClassName: "ui-btn-secondary",
                                      action: async () => {
                                        await onRetryDeliveryAttempt(selectedJob.id, attempt.id);
                                      },
                                    })
                                  }
                                  disabled={isManualActionPending}
                                  className="ui-btn-secondary flex-1"
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
                                        "This will stop any further retry for this attempt. If the job depends on this retry, it may be marked as failed delivery.",
                                      confirmLabel: "Cancel Retry",
                                      confirmClassName: "ui-btn-danger",
                                      action: async () => {
                                        await onCancelDeliveryRetry(selectedJob.id, attempt.id);
                                      },
                                    })
                                  }
                                  disabled={isManualActionPending}
                                  className="ui-btn-danger flex-1"
                                >
                                  {isApplyingAttemptAction ? "Applying..." : "Cancel Retry"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                          <div className="ui-metric-tile-muted">
                            <p className="ui-kicker">Started</p>
                            <p className="mt-2 text-sm text-slate-700">{formatDate(attempt.started_at)}</p>
                          </div>
                          <div className="ui-metric-tile-muted">
                            <p className="ui-kicker">Finished</p>
                            <p className="mt-2 text-sm text-slate-700">{formatDate(attempt.finished_at)}</p>
                          </div>
                          <div className="ui-metric-tile-muted">
                            <p className="ui-kicker">Scheduled</p>
                            <p className="mt-2 text-sm text-slate-700">{formatDate(attempt.scheduled_at ?? null)}</p>
                          </div>
                          <div className="ui-metric-tile-muted">
                            <p className="ui-kicker">Duration</p>
                            <p className="mt-2 text-sm text-slate-700">{formatDuration(attempt.duration_ms)}</p>
                          </div>
                          <div className="ui-metric-tile-muted">
                            <p className="ui-kicker">Next retry</p>
                            <p className="mt-2 text-sm text-slate-700">
                              {attempt.next_retry_at ? formatDate(attempt.next_retry_at) : "-"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                          <div className="space-y-4">
                            <div className="ui-data-card-muted">
                              <p className="ui-kicker">Failure reason</p>
                              <p className="mt-2 text-sm leading-6 text-slate-700">
                                {attempt.error_message?.trim() || "No failure recorded."}
                              </p>
                            </div>

                            <div className="ui-data-card-muted">
                              <p className="ui-kicker">Response body</p>
                              <pre className="ui-code-block mt-3 max-h-44">
                                {attempt.response_body?.trim() || "No response body recorded."}
                              </pre>
                            </div>
                          </div>

                          <div className="ui-data-card-muted">
                            <p className="ui-kicker">Request payload</p>
                            <pre className="ui-code-block mt-3 max-h-64">{formatJson(attempt.request_payload)}</pre>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="ui-empty-state">
                  <span className="ui-empty-icon">
                    <SendIcon className="h-5 w-5" />
                  </span>
                  <p className="ui-empty-state-title mt-4">No delivery attempts available</p>
                  <p className="ui-empty-state-text">
                    Delivery attempts will appear here when the job reaches the outbound delivery stage.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {confirmAction && (
        <div className="ui-modal-backdrop z-[80]">
          <div className="ui-modal-shell max-w-md p-5">
            <div>
              <p className="ui-kicker">Confirm action</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">{confirmAction.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{confirmAction.description}</p>
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
