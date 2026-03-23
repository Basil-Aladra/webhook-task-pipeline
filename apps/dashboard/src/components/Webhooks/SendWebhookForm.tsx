import { PipelineListItem } from "../../hooks/useDashboard";

type SendResult = {
  type: "success" | "error";
  message: string;
} | null;

type SendWebhookFormProps = {
  activePipelines: PipelineListItem[];
  selectedPipelineId: string;
  setSelectedPipelineId: (value: string) => void;
  webhookPayloadText: string;
  setWebhookPayloadText: (value: string) => void;
  idempotencyKey: string;
  setIdempotencyKey: (value: string) => void;
  sendingWebhook: boolean;
  sendResult: SendResult;
  onSendWebhook: () => void;
};

export function SendWebhookForm({
  activePipelines,
  selectedPipelineId,
  setSelectedPipelineId,
  webhookPayloadText,
  setWebhookPayloadText,
  idempotencyKey,
  setIdempotencyKey,
  sendingWebhook,
  sendResult,
  onSendWebhook,
}: SendWebhookFormProps): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Send Webhook</h2>
        <p className="ui-subtitle">Queue a test event quickly to demonstrate end-to-end processing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Active Pipeline</label>
          <select
            value={selectedPipelineId}
            onChange={(event) => setSelectedPipelineId(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Select an active pipeline</option>
            {activePipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
          {activePipelines.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              No active pipelines available. Activate one from the Pipelines API.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Webhook Payload (JSON)</label>
          <textarea
            value={webhookPayloadText}
            onChange={(event) => setWebhookPayloadText(event.target.value)}
            rows={8}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Idempotency Key (Optional)
          </label>
          <input
            type="text"
            value={idempotencyKey}
            onChange={(event) => setIdempotencyKey(event.target.value)}
            placeholder="Optional idempotency key"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={onSendWebhook}
            disabled={sendingWebhook}
            className="ui-btn-primary"
          >
            {sendingWebhook ? "Sending..." : "Send Webhook"}
          </button>
        </div>

        {sendResult?.type === "success" && (
          <div className="ui-feedback-success">
            {sendResult.message}
          </div>
        )}

        {sendResult?.type === "error" && (
          <div className="ui-feedback-error">
            Error: {sendResult.message}
          </div>
        )}
      </div>
    </section>
  );
}
