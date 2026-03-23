type CreatePipelineStatus = "paused" | "active";
type ActionType = "transform" | "enrich" | "filter";

type CreatePipelineModalProps = {
  open: boolean;
  creatingPipeline: boolean;
  createPipelineError: string;
  createPipelineName: string;
  setCreatePipelineName: (value: string) => void;
  createPipelineWebhookPath: string;
  setCreatePipelineWebhookPath: (value: string) => void;
  createPipelineDescription: string;
  setCreatePipelineDescription: (value: string) => void;
  createPipelineStatus: CreatePipelineStatus;
  setCreatePipelineStatus: (value: CreatePipelineStatus) => void;
  createPipelineActionType: ActionType;
  setCreatePipelineActionType: (value: ActionType) => void;
  createPipelineActionConfigText: string;
  setCreatePipelineActionConfigText: (value: string) => void;
  createPipelineSubscriberUrl: string;
  setCreatePipelineSubscriberUrl: (value: string) => void;
  onCancel: () => void;
  onCreate: () => void;
};

export function CreatePipelineModal({
  open,
  creatingPipeline,
  createPipelineError,
  createPipelineName,
  setCreatePipelineName,
  createPipelineWebhookPath,
  setCreatePipelineWebhookPath,
  createPipelineDescription,
  setCreatePipelineDescription,
  createPipelineStatus,
  setCreatePipelineStatus,
  createPipelineActionType,
  setCreatePipelineActionType,
  createPipelineActionConfigText,
  setCreatePipelineActionConfigText,
  createPipelineSubscriberUrl,
  setCreatePipelineSubscriberUrl,
  onCancel,
  onCreate,
}: CreatePipelineModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Create Pipeline</h3>
        <p className="mb-4 ui-subtitle">Set up one action and one subscriber for quick demo setup.</p>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Pipeline Name</label>
            <input
              type="text"
              value={createPipelineName}
              onChange={(event) => setCreatePipelineName(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Webhook Path</label>
            <input
              type="text"
              value={createPipelineWebhookPath}
              onChange={(event) => setCreatePipelineWebhookPath(event.target.value)}
              placeholder="e.g. my-pipeline"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={createPipelineDescription}
              onChange={(event) => setCreatePipelineDescription(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={createPipelineStatus}
                onChange={(event) => setCreatePipelineStatus(event.target.value as CreatePipelineStatus)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="paused">paused</option>
                <option value="active">active</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Action Type</label>
              <select
                value={createPipelineActionType}
                onChange={(event) => setCreatePipelineActionType(event.target.value as ActionType)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="transform">transform</option>
                <option value="enrich">enrich</option>
                <option value="filter">filter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action Config</label>
            <textarea
              value={createPipelineActionConfigText}
              onChange={(event) => setCreatePipelineActionConfigText(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Subscriber URL</label>
            <input
              type="text"
              value={createPipelineSubscriberUrl}
              onChange={(event) => setCreatePipelineSubscriberUrl(event.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          {createPipelineError && (
            <div className="ui-feedback-error">
              Error: {createPipelineError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="ui-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={creatingPipeline}
              className="ui-btn-primary"
            >
              {creatingPipeline ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
