import { useEffect, useMemo, useState } from "react";
import { PipelineListItem } from "../../hooks/useDashboard";

type PipelineSecretResult = {
  type: "success" | "error";
  message: string;
  webhookSecret?: string;
} | null;

type PipelineSecretModalProps = {
  open: boolean;
  pipeline: PipelineListItem | null;
  rotatingWebhookSecret: boolean;
  pipelineSecretError: string;
  pipelineSecretResult: PipelineSecretResult;
  onClose: () => void;
  onRotateWebhookSecret: () => void;
};

export function PipelineSecretModal({
  open,
  pipeline,
  rotatingWebhookSecret,
  pipelineSecretError,
  pipelineSecretResult,
  onClose,
  onRotateWebhookSecret,
}: PipelineSecretModalProps): JSX.Element | null {
  const [showSecretValue, setShowSecretValue] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const webhookSecret = pipelineSecretResult?.webhookSecret ?? "";
  const actionLabel = pipeline?.hasWebhookSecret ? "Rotate Secret" : "Generate Secret";

  const maskedSecret = useMemo(() => {
    if (!webhookSecret) {
      return "";
    }

    return "•".repeat(Math.max(12, webhookSecret.length));
  }, [webhookSecret]);

  useEffect(() => {
    if (!open) {
      setShowSecretValue(false);
      setCopyMessage("");
      return;
    }

    setCopyMessage("");
  }, [open, webhookSecret]);

  if (!open || !pipeline) {
    return null;
  }

  const handleCopy = async () => {
    if (!webhookSecret) {
      return;
    }

    try {
      await navigator.clipboard.writeText(webhookSecret);
      setCopyMessage("Copied.");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      setCopyMessage("Copy failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Webhook Secret</h3>
            <p className="ui-subtitle">
              Manage the secret used to verify webhook signatures for this pipeline.
            </p>
          </div>
          <button type="button" onClick={onClose} className="ui-btn-secondary">
            Close
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">{pipeline.name}</p>
          <p className="mt-1 font-mono text-xs text-slate-600">
            /api/v1/webhooks/{pipeline.webhookPath}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`ui-badge ${
                pipeline.hasWebhookSecret ? "ui-badge-success" : "ui-badge-neutral"
              }`}
            >
              {pipeline.hasWebhookSecret ? "Secret configured" : "No secret configured"}
            </span>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Configure a webhook secret if you want the API to verify the incoming
          <span className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-700">
            x-webhook-signature
          </span>
          header. For safety, the raw secret is only shown immediately after generation or rotation.
        </div>

        {pipelineSecretResult?.type === "success" && (
          <div className="mb-4 ui-feedback-success">{pipelineSecretResult.message}</div>
        )}

        {pipelineSecretError && <div className="mb-4 ui-feedback-error">{pipelineSecretError}</div>}

        {webhookSecret && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Current generated secret</p>
                <p className="text-xs text-slate-500">Shown once after generate or rotate.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSecretValue((current) => !current)}
                  className="ui-btn-secondary"
                >
                  {showSecretValue ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={handleCopy} className="ui-btn-secondary">
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
              {showSecretValue ? webhookSecret : maskedSecret}
            </div>

            {copyMessage && <p className="mt-2 text-xs text-slate-500">{copyMessage}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="ui-btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onRotateWebhookSecret}
            disabled={rotatingWebhookSecret}
            className="ui-btn-primary"
          >
            {rotatingWebhookSecret ? "Saving..." : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
