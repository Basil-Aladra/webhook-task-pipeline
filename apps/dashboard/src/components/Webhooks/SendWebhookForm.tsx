import { useEffect, useRef } from "react";
import { API_BASE } from "../../api/client";
import { PipelineListItem } from "../../hooks/useDashboard";
import { CopyIcon, SendIcon, SparklesIcon } from "../Layout/Icons";
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
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="ui-section-header">
        <div>
          <p className="ui-kicker">Quick action</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Send Webhook</h2>
          <p className="mt-2 ui-subtitle">
            Queue a test event quickly to demonstrate end-to-end ingestion, processing, and delivery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={handleLoadDemoPayload} className="ui-btn-secondary">
            <SparklesIcon className="ui-btn-icon" />
            Load Demo Payload
          </button>
          <button
            type="button"
            onClick={() => void handleCopyWebhookUrl()}
            disabled={!selectedWebhookUrl}
            className="ui-btn-secondary"
          >
            <CopyIcon className="ui-btn-icon" />
            Copy Webhook URL
          </button>
        </div>
      </div>

      <div className="ui-panel-body space-y-6">
        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="ui-kicker">Endpoint preview</p>
              <p className="mt-2 text-sm text-slate-600">
                Use the selected pipeline endpoint and a ready-to-send sample payload.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
              <SendIcon className="h-3.5 w-3.5" />
              Live webhook endpoint
            </div>
          </div>
          <p className="mt-4 break-all rounded-2xl border border-slate-200 bg-white px-3.5 py-3 font-mono text-xs text-slate-700">
            {selectedWebhookUrl || "Select an active pipeline to reveal its webhook URL."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,0.94fr)_minmax(0,1.06fr)]">
          <div className="space-y-6">
            <div className="ui-field-shell">
              <label className="ui-form-label">Active Pipeline</label>
              <select
                value={selectedPipelineId}
                onChange={(event) => setSelectedPipelineId(event.target.value)}
                className="ui-select"
              >
                <option value="">Select an active pipeline</option>
                {activePipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
              {activePipelines.length === 0 && (
                <p className="ui-form-help">No active pipelines available. Activate one from the Pipelines page first.</p>
              )}
            </div>

            <div className="ui-field-shell">
              <label className="ui-form-label">Idempotency Key (Optional)</label>
              <input
                type="text"
                value={idempotencyKey}
                onChange={(event) => setIdempotencyKey(event.target.value)}
                placeholder="Optional idempotency key"
                className="ui-input ui-input-mono"
              />
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
              <p className="ui-kicker">Delivery note</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The selected webhook payload is sent as-is. This is the fastest path to validate ingestion,
                processing, and downstream delivery during a live walkthrough.
              </p>
            </div>
          </div>

          <div className="ui-field-shell flex flex-col">
            <label className="ui-form-label">Webhook Payload (JSON)</label>
            <textarea
              value={webhookPayloadText}
              onChange={(event) => setWebhookPayloadText(event.target.value)}
              rows={14}
              className="ui-textarea ui-textarea-mono min-h-[340px] flex-1 bg-slate-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            This submits the exact webhook payload shown above to the selected pipeline endpoint.
          </p>
          <button
            type="button"
            onClick={onSendWebhook}
            disabled={sendingWebhook}
            className="ui-btn-primary min-w-[164px] self-start sm:self-auto"
          >
            <SendIcon className="ui-btn-icon" />
            {sendingWebhook ? "Sending..." : "Send Webhook"}
          </button>
        </div>
      </div>
    </section>
  );
}
