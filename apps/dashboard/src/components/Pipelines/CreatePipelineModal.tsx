import { PipelineIcon, PlusIcon, XIcon } from "../Layout/Icons";

type CreatePipelineStatus = "paused" | "active";
type ActionType = "validate" | "transform" | "enrich" | "filter";

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
    <div className="ui-modal-backdrop">
      <div className="ui-modal-shell flex max-h-[calc(100vh-2rem)] max-w-5xl flex-col overflow-hidden">
        <div className="ui-section-header">
          <div className="flex items-start gap-3">
            <span className="ui-card-icon">
              <PipelineIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="ui-kicker">Pipeline setup</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Create Pipeline</h3>
              <p className="mt-2 ui-subtitle">Set up one action and one subscriber for quick demo-ready onboarding.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
            <div className="ui-field-section lg:col-span-2">
              <div className="mb-4">
                <p className="ui-kicker">Basics</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">Pipeline identity</h4>
                <p className="mt-1 text-sm text-slate-500">Name the pipeline and define the public webhook route.</p>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="ui-field-group">
                  <label className="ui-form-label">Pipeline Name</label>
                  <input
                    type="text"
                    value={createPipelineName}
                    onChange={(event) => setCreatePipelineName(event.target.value)}
                    className="ui-input"
                  />
                </div>

                <div className="ui-field-group">
                  <label className="ui-form-label">Webhook Path</label>
                  <input
                    type="text"
                    value={createPipelineWebhookPath}
                    onChange={(event) => setCreatePipelineWebhookPath(event.target.value)}
                    placeholder="e.g. my-pipeline"
                    className="ui-input ui-input-mono"
                  />
                </div>
              </div>
            </div>

            <div className="ui-field-section lg:col-span-2">
              <div className="mb-4">
                <p className="ui-kicker">Context</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">Description</h4>
                <p className="mt-1 text-sm text-slate-500">Add short operator-facing context for the pipeline.</p>
              </div>
              <div className="ui-field-group">
                <label className="ui-form-label">Description</label>
                <textarea
                  value={createPipelineDescription}
                  onChange={(event) => setCreatePipelineDescription(event.target.value)}
                  rows={4}
                  className="ui-textarea"
                />
              </div>
            </div>

            <div className="ui-field-section">
              <div className="mb-4">
                <p className="ui-kicker">Runtime</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">Pipeline state</h4>
              </div>
              <div className="ui-field-group">
                <label className="ui-form-label">Status</label>
                <select
                  value={createPipelineStatus}
                  onChange={(event) => setCreatePipelineStatus(event.target.value as CreatePipelineStatus)}
                  className="ui-select"
                >
                  <option value="paused">paused</option>
                  <option value="active">active</option>
                </select>
              </div>
            </div>

            <div className="ui-field-section">
              <div className="mb-4">
                <p className="ui-kicker">Processor</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">Primary action</h4>
              </div>
              <div className="ui-field-group">
                <label className="ui-form-label">Action Type</label>
                <select
                  value={createPipelineActionType}
                  onChange={(event) => setCreatePipelineActionType(event.target.value as ActionType)}
                  className="ui-select"
                >
                  <option value="validate">validate</option>
                  <option value="transform">transform</option>
                  <option value="enrich">enrich</option>
                  <option value="filter">filter</option>
                </select>
                <p className="ui-form-help">
                  Use <span className="font-mono">validate</span> to fail invalid payloads before other processors run.
                </p>
              </div>
            </div>

            <div className="ui-field-section lg:col-span-2">
              <div className="mb-4">
                <p className="ui-kicker">Configuration</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">Action config</h4>
                <p className="mt-1 text-sm text-slate-500">Provide JSON configuration for the selected processor.</p>
              </div>
              <div className="ui-field-group">
                <label className="ui-form-label">Action Config</label>
                <textarea
                  value={createPipelineActionConfigText}
                  onChange={(event) => setCreatePipelineActionConfigText(event.target.value)}
                  rows={7}
                  className="ui-textarea ui-textarea-mono bg-slate-50"
                />
              </div>
            </div>

            <div className="ui-field-section lg:col-span-2">
              <div className="mb-4">
                <p className="ui-kicker">Delivery</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">Subscriber target</h4>
                <p className="mt-1 text-sm text-slate-500">Set the destination URL that receives processed payloads.</p>
              </div>
              <div className="ui-field-group">
                <label className="ui-form-label">Subscriber URL</label>
                <input
                  type="text"
                  value={createPipelineSubscriberUrl}
                  onChange={(event) => setCreatePipelineSubscriberUrl(event.target.value)}
                  placeholder="https://example.com/webhook"
                  className="ui-input"
                />
              </div>
            </div>

            {createPipelineError && (
              <div className="ui-feedback-error lg:col-span-2">Error: {createPipelineError}</div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={onCancel} className="ui-btn-secondary w-full sm:w-auto">
              <XIcon className="ui-btn-icon" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={creatingPipeline}
              className="ui-btn-primary w-full sm:w-auto"
            >
              <PlusIcon className="ui-btn-icon" />
              {creatingPipeline ? "Creating..." : "Create Pipeline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
