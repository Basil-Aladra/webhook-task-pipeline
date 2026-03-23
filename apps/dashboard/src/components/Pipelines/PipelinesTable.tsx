import { PipelineListItem } from "../../hooks/useDashboard";

type CreatePipelineResult = {
  type: "success" | "error";
  message: string;
} | null;

type PipelinesTableProps = {
  pipelines: PipelineListItem[];
  createPipelineResult: CreatePipelineResult;
  onOpenCreateModal: () => void;
};

function statusClass(status: PipelineListItem["status"]): string {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "paused") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-700";
}

export function PipelinesTable({
  pipelines,
  createPipelineResult,
  onOpenCreateModal,
}: PipelinesTableProps): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pipelines</h2>
          <p className="ui-subtitle">Manage webhook endpoints, actions, and subscribers.</p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="ui-btn-primary"
        >
          Create Pipeline
        </button>
      </div>

      {createPipelineResult?.type === "success" && (
        <div className="mb-4 ui-feedback-success">
          {createPipelineResult.message}
        </div>
      )}

      {pipelines.length === 0 ? (
        <p className="ui-feedback-empty">No pipelines found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="ui-table-head-cell">Name</th>
                <th className="ui-table-head-cell">Status</th>
                <th className="ui-table-head-cell">Webhook Path</th>
                <th className="ui-table-head-cell">Actions Count</th>
                <th className="ui-table-head-cell">
                  Subscribers Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pipelines.map((pipeline) => (
                <tr key={pipeline.id} className="ui-table-row">
                  <td className="px-3 py-2">{pipeline.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`ui-badge capitalize ${statusClass(pipeline.status)}`}
                    >
                      {pipeline.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">/api/v1/webhooks/{pipeline.webhookPath}</td>
                  <td className="px-3 py-2">{pipeline.actionsCount ?? 0}</td>
                  <td className="px-3 py-2">{pipeline.subscribersCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
