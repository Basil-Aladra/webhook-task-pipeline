import { PipelineDetails as PipelineDetailsType, PipelineListItem } from "../../hooks/useDashboard";
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Details Panel</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Pipeline Inspector</h2>
            <p className="ui-subtitle">
              Review webhook configuration, processing steps, subscribers, and activity.
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
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
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

      <div className="space-y-6 p-4">
        {!selectedPipelineId && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No pipeline selected</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose a pipeline from the table to inspect its configuration in this panel.
            </p>
          </div>
        )}

        {selectedPipelineId && loadingPipelineDetails && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">Loading pipeline details...</p>
            <p className="mt-1 text-sm text-slate-500">Fetching actions, subscribers, and recent activity.</p>
          </div>
        )}

        {selectedPipelineId && pipelineDetailsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6">
            <p className="text-sm font-medium text-red-700">Failed to load pipeline details</p>
            <p className="mt-1 text-sm text-red-600">{pipelineDetailsError}</p>
          </div>
        )}

        {selectedPipelineId && selectedPipeline && !loadingPipelineDetails && (
          <div className="space-y-6">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pipeline Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedPipeline.name}</p>
                <p className="mt-2 font-mono text-xs text-slate-600">
                  /api/v1/webhooks/{selectedPipeline.webhookPath}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <div className="mt-2">
                    <span className={`ui-badge capitalize ${pipelineStatusClass(selectedPipeline.status)}`}>
                      {selectedPipeline.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Webhook Secret</p>
                  <div className="mt-2">
                    <span
                      className={`ui-badge ${
                        selectedPipeline.hasWebhookSecret ? "ui-badge-success" : "ui-badge-neutral"
                      }`}
                    >
                      {selectedPipeline.hasWebhookSecret ? "Configured" : "Not set"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedPipeline.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Jobs Count</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{operationalStats.jobsCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Failed Jobs</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{operationalStats.failedJobsCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest Activity</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatDate(operationalStats.latestActivityAt)}
                </p>
              </div>
            </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
                  <p className="ui-subtitle">Jump to related workflows without leaving the pipeline context.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pipelineSummary && (
                    <>
                      {pipelineSummary.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleToggleStatus();
                          }}
                          disabled={togglingPipelineStatusId === pipelineSummary.id}
                          className={pipelineSummary.status === "active" ? "ui-btn-secondary" : "ui-btn-primary"}
                        >
                          {togglingPipelineStatusId === pipelineSummary.id
                            ? "Updating..."
                            : pipelineSummary.status === "active"
                              ? "Pause Pipeline"
                              : "Activate Pipeline"}
                        </button>
                      )}
                      <button type="button" onClick={() => onManageSecret(pipelineSummary)} className="ui-btn-secondary">
                        Manage Secret
                      </button>
                    <button type="button" onClick={() => onSendTestWebhook(pipelineSummary)} className="ui-btn-secondary">
                      Send Test Webhook
                    </button>
                    <button type="button" onClick={() => onViewJobs(pipelineSummary)} className="ui-btn-primary">
                      View Jobs
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Processing Actions</h3>
              {selectedPipeline.actions.length > 0 ? (
                <div className="space-y-3">
                  {selectedPipeline.actions.map((action) => (
                    <div key={action.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ui-badge ui-badge-neutral">Step {action.orderIndex}</span>
                        <span className="ui-badge ui-badge-info capitalize">{action.actionType}</span>
                        {!action.enabled && <span className="ui-badge ui-badge-neutral">Disabled</span>}
                      </div>
                      <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                        {formatJson(action.config)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ui-feedback-empty">No processing actions configured.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Subscribers</h3>
              {selectedPipeline.subscribers.length > 0 ? (
                <div className="space-y-3">
                  {selectedPipeline.subscribers.map((subscriber) => (
                    <div key={subscriber.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ui-badge ui-badge-neutral">{subscriber.enabled ? "Enabled" : "Disabled"}</span>
                        <span className="font-mono text-xs text-slate-700 break-all">{subscriber.targetUrl}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Timeout</p>
                          <p className="mt-1 text-slate-800">{subscriber.timeoutMs} ms</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Max Retries</p>
                          <p className="mt-1 text-slate-800">{subscriber.maxRetries}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Backoff</p>
                          <p className="mt-1 text-slate-800">{subscriber.retryBackoffMs} ms</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ui-feedback-empty">No subscribers configured.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
