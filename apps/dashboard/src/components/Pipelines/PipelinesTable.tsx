import type { MouseEvent } from "react";
import { PipelineListItem } from "../../hooks/useDashboard";
import { CopyIcon, EyeIcon, PauseIcon, PipelineIcon, PlayIcon, PlusIcon, ShieldIcon } from "../Layout/Icons";
import { useToast } from "../Toast/ToastProvider";

type CreatePipelineResult = {
  type: "success" | "error";
  message: string;
} | null;

type PipelinesTableProps = {
  pipelines: PipelineListItem[];
  createPipelineResult: CreatePipelineResult;
  selectedPipelineId: string;
  togglingPipelineStatusId?: string;
  onOpenCreateModal: () => void;
  onSelectPipeline: (pipeline: PipelineListItem) => void;
  onManageSecret: (pipeline: PipelineListItem) => void;
  onTogglePipelineStatus: (pipeline: PipelineListItem) => Promise<"active" | "paused" | "archived">;
};

function statusClass(status: PipelineListItem["status"]): string {
  if (status === "active") return "ui-badge-success";
  if (status === "paused") return "ui-badge-warn";
  return "ui-badge-neutral";
}

export function PipelinesTable({
  pipelines,
  createPipelineResult,
  selectedPipelineId,
  togglingPipelineStatusId,
  onOpenCreateModal,
  onSelectPipeline,
  onManageSecret,
  onTogglePipelineStatus,
}: PipelinesTableProps): JSX.Element {
  const { showToast } = useToast();

  const handleToggleStatus = async (event: MouseEvent<HTMLButtonElement>, pipeline: PipelineListItem) => {
    event.stopPropagation();

    try {
      const nextStatus = await onTogglePipelineStatus(pipeline);
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
    <section className="ui-panel overflow-hidden">
      <div className="ui-section-header">
        <div>
          <p className="ui-kicker">Pipeline management</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Pipelines</h2>
          <p className="mt-2 ui-subtitle">
            Manage webhook endpoints, validation steps, transforms, and subscriber delivery configuration.
          </p>
        </div>
        <button type="button" onClick={onOpenCreateModal} className="ui-btn-primary">
          <PlusIcon className="ui-btn-icon" />
          Create Pipeline
        </button>
      </div>

      <div className="ui-panel-body space-y-4">
        {createPipelineResult?.type === "success" && (
          <div className="ui-feedback-success">{createPipelineResult.message}</div>
        )}

        {pipelines.length === 0 ? (
          <div className="ui-empty-state">
            <p className="ui-empty-state-title">No pipelines yet</p>
            <p className="ui-empty-state-text">
              Create your first pipeline to configure webhook ingestion, processing, and subscriber delivery.
            </p>
          </div>
        ) : (
          <div className="ui-table-shell">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="ui-table-head-cell">Name</th>
                    <th className="ui-table-head-cell">Status</th>
                    <th className="ui-table-head-cell">Webhook Path</th>
                    <th className="ui-table-head-cell">Secret</th>
                    <th className="ui-table-head-cell">Actions</th>
                    <th className="ui-table-head-cell">Subscribers</th>
                    <th className="ui-table-head-cell">Status Action</th>
                    <th className="ui-table-head-cell">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pipelines.map((pipeline) => (
                    <tr
                      key={pipeline.id}
                      className={`ui-table-row cursor-pointer ${
                        selectedPipelineId === pipeline.id ? "bg-slate-50 ring-1 ring-inset ring-slate-200" : ""
                      }`}
                      onClick={() => onSelectPipeline(pipeline)}
                    >
                      <td className="ui-table-cell">
                        <div className="flex items-start gap-3">
                          <span className="ui-card-icon h-10 w-10 rounded-xl">
                            <PipelineIcon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{pipeline.name}</p>
                            <p className="mt-1 font-mono text-xs text-slate-500">{pipeline.id.slice(0, 12)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="ui-table-cell">
                        <span className={`ui-badge capitalize ${statusClass(pipeline.status)}`}>{pipeline.status}</span>
                      </td>
                      <td className="ui-table-cell font-mono text-xs text-slate-600">
                        /api/v1/webhooks/{pipeline.webhookPath}
                      </td>
                      <td className="ui-table-cell">
                        <span className={`ui-badge ${pipeline.hasWebhookSecret ? "ui-badge-success" : "ui-badge-neutral"}`}>
                          {pipeline.hasWebhookSecret ? "Configured" : "Not set"}
                        </span>
                      </td>
                      <td className="ui-table-cell">{pipeline.actionsCount ?? 0}</td>
                      <td className="ui-table-cell">{pipeline.subscribersCount ?? 0}</td>
                      <td className="ui-table-cell">
                        {pipeline.status !== "archived" && (
                          <button
                            type="button"
                            onClick={(event) => {
                              void handleToggleStatus(event, pipeline);
                            }}
                            disabled={togglingPipelineStatusId === pipeline.id}
                            className={pipeline.status === "active" ? "ui-btn-secondary" : "ui-btn-primary"}
                          >
                            {pipeline.status === "active" ? (
                              <PauseIcon className="ui-btn-icon" />
                            ) : (
                              <PlayIcon className="ui-btn-icon" />
                            )}
                            {togglingPipelineStatusId === pipeline.id
                              ? "Updating..."
                              : pipeline.status === "active"
                                ? "Pause"
                                : "Activate"}
                          </button>
                        )}
                      </td>
                      <td className="ui-table-cell">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectPipeline(pipeline);
                            }}
                            className="ui-btn-secondary"
                          >
                            <EyeIcon className="ui-btn-icon" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onManageSecret(pipeline);
                            }}
                            className="ui-btn-secondary"
                          >
                            <ShieldIcon className="ui-btn-icon" />
                            Manage Secret
                          </button>
                        </div>
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
