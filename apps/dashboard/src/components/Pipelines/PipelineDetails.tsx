import { PipelineDetails as PipelineDetailsType, PipelineListItem } from "../../hooks/useDashboard";
import {
  ActivityIcon,
  AlertIcon,
  CheckIcon,
  ClockIcon,
  KeyIcon,
  PipelineIcon,
  PlayIcon,
  SendIcon,
  SettingsIcon,
  ShieldIcon,
} from "../Layout/Icons";
import { useToast } from "../Toast/ToastProvider";

type PipelineDetailsProps = {
  selectedPipelineId: string;
  selectedPipeline: PipelineDetailsType | null;
  loadingPipelineDetails: boolean;
  pipelineDetailsError: string;
  operationalStats: {
    jobsCount: number;
    failedJobsCount: number;
    latestActivityAt: string | null;
  };
  togglingPipelineStatusId?: string;
  onManageSecret: (pipeline: PipelineListItem) => void;
  onSendTestWebhook: (pipeline: PipelineListItem) => void;
  onViewJobs: (pipeline: PipelineListItem) => void;
  onTogglePipelineStatus: (pipeline: PipelineListItem) => Promise<"active" | "paused" | "archived">;
  onClearSelection?: () => void;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "{}";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function pipelineStatusClass(status: PipelineDetailsType["status"]): string {
  if (status === "active") return "ui-badge-success";
  if (status === "paused") return "ui-badge-warn";
  return "ui-badge-neutral";
}

export function PipelineDetails({
  selectedPipelineId,
  selectedPipeline,
  loadingPipelineDetails,
  pipelineDetailsError,
  operationalStats,
  togglingPipelineStatusId,
  onManageSecret,
  onSendTestWebhook,
  onViewJobs,
  onTogglePipelineStatus,
  onClearSelection,
}: PipelineDetailsProps): JSX.Element {
  const { showToast } = useToast();
  const pipelineSummary = selectedPipeline
    ? {
        id: selectedPipeline.id,
        name: selectedPipeline.name,
        status: selectedPipeline.status,
        webhookPath: selectedPipeline.webhookPath,
        hasWebhookSecret: selectedPipeline.hasWebhookSecret,
        actionsCount: selectedPipeline.actions.length,
        subscribersCount: selectedPipeline.subscribers.length,
      }
    : null;

  const handleToggleStatus = async () => {
    if (!pipelineSummary) {
      return;
    }

    try {
      const nextStatus = await onTogglePipelineStatus(pipelineSummary);
      showToast({
        type: "success",
        message: nextStatus === "active" ? "Pipeline activated" : "Pipeline paused",
      });
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update pipeline status.",
      });
    }
  };

  return (
    <section className="ui-panel overflow-hidden xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-5 py-5 backdrop-blur-xl sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ui-kicker">Pipeline control</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Pipeline Inspector</h2>
            <p className="mt-2 ui-subtitle">
              Review webhook configuration, processing steps, subscriber targets, and operational state.
            </p>
          </div>
          {onClearSelection && (
            <button type="button" onClick={onClearSelection} className="ui-btn-secondary">
              Close
            </button>
          )}
        </div>

        {selectedPipelineId && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="ui-badge ui-badge-neutral">Selected Pipeline</span>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
              {selectedPipelineId}
            </span>
            {selectedPipeline && (
              <span className={`ui-badge capitalize ${pipelineStatusClass(selectedPipeline.status)}`}>
                {selectedPipeline.status}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {!selectedPipelineId && (
          <div className="ui-empty-state">
            <span className="ui-empty-icon">
              <PipelineIcon className="h-5 w-5" />
            </span>
            <p className="ui-empty-state-title mt-4">No pipeline selected</p>
            <p className="ui-empty-state-text">
              Choose a pipeline from the table to inspect processing steps, subscribers, and control actions.
            </p>
          </div>
        )}

        {selectedPipelineId && loadingPipelineDetails && (
          <div className="ui-empty-state">
            <span className="ui-empty-icon">
              <ActivityIcon className="h-5 w-5" />
            </span>
            <p className="ui-empty-state-title mt-4">Loading pipeline details</p>
            <p className="ui-empty-state-text">Fetching actions, subscriber configuration, and recent activity.</p>
          </div>
        )}

        {selectedPipelineId && pipelineDetailsError && (
          <div className="ui-feedback-error">
            <p className="font-medium">Failed to load pipeline details</p>
            <p className="mt-1">{pipelineDetailsError}</p>
          </div>
        )}

        {selectedPipelineId && selectedPipeline && !loadingPipelineDetails && (
          <div className="space-y-6">
            <section className="ui-inspector-hero">
              <div className="relative">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ui-card-icon-soft">
                        <PipelineIcon className="h-4 w-4" />
                      </span>
                      <span className={`ui-badge capitalize ${pipelineStatusClass(selectedPipeline.status)}`}>
                        {selectedPipeline.status}
                      </span>
                      <span
                        className={`ui-badge ${
                          selectedPipeline.hasWebhookSecret ? "ui-badge-success" : "ui-badge-neutral"
                        }`}
                      >
                        {selectedPipeline.hasWebhookSecret ? "Secret configured" : "No secret"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                      {selectedPipeline.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {selectedPipeline.description || "No description provided for this pipeline."}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="ui-data-card-muted">
                        <p className="ui-kicker">Webhook endpoint</p>
                        <p className="mt-2 break-all font-mono text-xs text-slate-700">
                          /api/v1/webhooks/{selectedPipeline.webhookPath}
                        </p>
                      </div>
                      <div className="ui-data-card-muted">
                        <p className="ui-kicker">Delivery readiness</p>
                        <p className="mt-2 text-sm font-medium text-slate-800">
                          {selectedPipeline.subscribers.length} subscriber(s) and {selectedPipeline.actions.length} action
                          step(s)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[320px] lg:grid-cols-1">
                    <div className="ui-metric-tile">
                      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <ActivityIcon className="h-3.5 w-3.5" />
                        Total jobs
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {operationalStats.jobsCount}
                      </p>
                    </div>
                    <div className="ui-metric-tile">
                      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <AlertIcon className="h-3.5 w-3.5" />
                        Failed jobs
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {operationalStats.failedJobsCount}
                      </p>
                    </div>
                    <div className="ui-metric-tile">
                      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <ClockIcon className="h-3.5 w-3.5" />
                        Latest activity
                      </p>
                      <p className="mt-3 text-sm font-medium leading-6 text-slate-800">
                        {formatDate(operationalStats.latestActivityAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="ui-inspector-section">
              <div className="ui-inspector-section-header">
                <div>
                  <p className="ui-kicker">Operator workflow</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Quick Actions</h3>
                  <p className="mt-2 ui-subtitle">
                    Move directly into delivery security, test traffic, or job triage without leaving this context.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pipelineSummary?.status !== "archived" && pipelineSummary && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleStatus();
                    }}
                    disabled={togglingPipelineStatusId === pipelineSummary.id}
                    className={`ui-data-card text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] ${
                      pipelineSummary.status === "active" ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"
                    }`}
                  >
                    <span className="ui-card-icon">
                      {pipelineSummary.status === "active" ? <ClockIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                    </span>
                    <p className="mt-4 text-sm font-semibold text-slate-950">
                      {togglingPipelineStatusId === pipelineSummary.id
                        ? "Updating pipeline state"
                        : pipelineSummary.status === "active"
                          ? "Pause Pipeline"
                          : "Activate Pipeline"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {pipelineSummary.status === "active"
                        ? "Stop new webhook processing temporarily while preserving the configuration."
                        : "Bring this pipeline back into active traffic handling."}
                    </p>
                  </button>
                )}

                {pipelineSummary && (
                  <>
                    <button type="button" onClick={() => onManageSecret(pipelineSummary)} className="ui-data-card text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                      <span className="ui-card-icon">
                        <KeyIcon className="h-4 w-4" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-slate-950">Manage Webhook Secret</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Configure or rotate the signing secret used for inbound request verification.
                      </p>
                    </button>

                    <button type="button" onClick={() => onSendTestWebhook(pipelineSummary)} className="ui-data-card text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                      <span className="ui-card-icon">
                        <SendIcon className="h-4 w-4" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-slate-950">Send Test Webhook</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Jump into the quick-send flow with this pipeline already selected.
                      </p>
                    </button>

                    <button type="button" onClick={() => onViewJobs(pipelineSummary)} className="ui-data-card text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                      <span className="ui-card-icon">
                        <ActivityIcon className="h-4 w-4" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-slate-950">View Related Jobs</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Open the execution stream already filtered to this pipeline for fast triage.
                      </p>
                    </button>
                  </>
                )}
              </div>
            </section>

            <section className="ui-inspector-section">
              <div className="ui-inspector-section-header">
                <div>
                  <p className="ui-kicker">Processing chain</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Actions</h3>
                  <p className="mt-2 ui-subtitle">
                    Ordered processor steps that shape, validate, and route each payload through the pipeline.
                  </p>
                </div>
                <span className="ui-badge ui-badge-neutral">{selectedPipeline.actions.length} step(s)</span>
              </div>

              {selectedPipeline.actions.length > 0 ? (
                <div className="space-y-4">
                  {selectedPipeline.actions.map((action) => (
                    <article key={action.id} className="ui-data-card">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="ui-badge ui-badge-neutral">Step {action.orderIndex}</span>
                            <span className="ui-badge ui-badge-info capitalize">{action.actionType}</span>
                            {!action.enabled && <span className="ui-badge ui-badge-neutral">Disabled</span>}
                          </div>
                          <p className="mt-3 text-sm text-slate-600">
                            Processor configuration applied before delivery subscribers are invoked.
                          </p>
                        </div>
                        <span className="ui-card-icon h-10 w-10 rounded-2xl">
                          <SettingsIcon className="h-4 w-4" />
                        </span>
                      </div>
                      <pre className="ui-code-block mt-4">{formatJson(action.config)}</pre>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="ui-empty-state">
                  <span className="ui-empty-icon">
                    <SettingsIcon className="h-5 w-5" />
                  </span>
                  <p className="ui-empty-state-title mt-4">No actions configured</p>
                  <p className="ui-empty-state-text">
                    Add processing steps so payloads can be validated or transformed before delivery.
                  </p>
                </div>
              )}
            </section>

            <section className="ui-inspector-section">
              <div className="ui-inspector-section-header">
                <div>
                  <p className="ui-kicker">Delivery targets</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Subscribers</h3>
                  <p className="mt-2 ui-subtitle">
                    Outbound endpoints, retry posture, and runtime delivery constraints for this pipeline.
                  </p>
                </div>
                <span className="ui-badge ui-badge-neutral">{selectedPipeline.subscribers.length} endpoint(s)</span>
              </div>

              {selectedPipeline.subscribers.length > 0 ? (
                <div className="space-y-4">
                  {selectedPipeline.subscribers.map((subscriber) => (
                    <article key={subscriber.id} className="ui-data-card">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`ui-badge ${subscriber.enabled ? "ui-badge-success" : "ui-badge-neutral"}`}>
                              {subscriber.enabled ? "Enabled" : "Disabled"}
                            </span>
                            <span className="ui-badge ui-badge-neutral">Subscriber #{subscriber.id}</span>
                          </div>
                          <p className="mt-3 break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-6 text-slate-700">
                            {subscriber.targetUrl}
                          </p>
                        </div>

                        <span className="ui-card-icon h-10 w-10 rounded-2xl">
                          {subscriber.enabled ? <CheckIcon className="h-4 w-4" /> : <ShieldIcon className="h-4 w-4" />}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="ui-metric-tile-muted">
                          <p className="ui-kicker">Timeout</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{subscriber.timeoutMs} ms</p>
                        </div>
                        <div className="ui-metric-tile-muted">
                          <p className="ui-kicker">Max retries</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{subscriber.maxRetries}</p>
                        </div>
                        <div className="ui-metric-tile-muted">
                          <p className="ui-kicker">Retry backoff</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{subscriber.retryBackoffMs} ms</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="ui-empty-state">
                  <span className="ui-empty-icon">
                    <SendIcon className="h-5 w-5" />
                  </span>
                  <p className="ui-empty-state-title mt-4">No subscribers configured</p>
                  <p className="ui-empty-state-text">
                    Add at least one subscriber target to deliver processed payloads out of the pipeline.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
