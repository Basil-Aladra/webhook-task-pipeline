import { useEffect, useRef } from "react";
import { API_BASE } from "../../api/client";
import { PipelineListItem } from "../../hooks/useDashboard";
import { useToast } from "../Toast/ToastProvider";

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
  const { showToast } = useToast();
  const lastToastKeyRef = useRef<string>("");
  const selectedPipeline = activePipelines.find((pipeline) => pipeline.id === selectedPipelineId) || null;
  const selectedWebhookUrl = selectedPipeline
    ? `${API_BASE}/webhooks/${encodeURIComponent(selectedPipeline.webhookPath)}`
    : "";
  const demoPayload = `{
  "orderId": "demo-1001",
  "customerName": "Alice",
  "amount": 42.5,
  "status": "new"
}`;

  useEffect(() => {
    if (!sendResult) {
      return;
    }

    const nextToastKey = `${sendResult.type}:${sendResult.message}`;
    if (lastToastKeyRef.current === nextToastKey) {
      return;
    }

    lastToastKeyRef.current = nextToastKey;
    showToast({
      type: sendResult.type === "success" ? "success" : "error",
      message: sendResult.type === "error" ? `Error: ${sendResult.message}` : sendResult.message,
    });
  }, [sendResult, showToast]);

  async function handleCopyWebhookUrl(): Promise<void> {
    if (!selectedWebhookUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedWebhookUrl);
      showToast({
        type: "success",
        message: "Webhook URL copied.",
      });
    } catch {
      showToast({
        type: "error",
        message: "Failed to copy webhook URL.",
      });
    }
  }

  function handleLoadDemoPayload(): void {
    setWebhookPayloadText(demoPayload);
    setIdempotencyKey(`demo-${Date.now()}`);
    showToast({
      type: "info",
      message: "Demo payload loaded.",
    });
  }

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

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Demo Helper</p>
              <p className="mt-1 text-sm text-slate-700">
                Use the selected pipeline endpoint and a ready-to-send sample payload.
              </p>
              <p className="mt-2 break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-slate-700">
                {selectedWebhookUrl || "Select an active pipeline to reveal its webhook URL."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCopyWebhookUrl()}
                disabled={!selectedWebhookUrl}
                className="ui-btn-secondary"
              >
                Copy Webhook URL
              </button>
              <button type="button" onClick={handleLoadDemoPayload} className="ui-btn-secondary">
                Load Demo Payload
              </button>
            </div>
          </div>
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
      </div>
    </section>
  );
}
