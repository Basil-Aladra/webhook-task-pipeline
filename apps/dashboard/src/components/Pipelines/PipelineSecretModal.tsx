import { useEffect, useMemo, useState } from "react";
import { CopyIcon, EyeIcon, EyeOffIcon, ShieldIcon, XIcon } from "../Layout/Icons";
import { PipelineListItem } from "../../hooks/useDashboard";
import { useToast } from "../Toast/ToastProvider";

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
  const { showToast } = useToast();

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
      return;
    }
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
      showToast({
        type: "success",
        message: "Webhook secret copied.",
      });
    } catch {
      showToast({
        type: "error",
        message: "Failed to copy webhook secret.",
      });
    }
  };

  return (
    <div className="ui-modal-backdrop">
      <div className="ui-modal-shell max-w-3xl overflow-hidden">
        <div className="ui-section-header">
          <div className="flex items-start gap-3">
            <span className="ui-card-icon">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="ui-kicker">Secret management</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Webhook Secret</h3>
              <p className="mt-2 ui-subtitle">
                Manage the secret used to verify incoming webhook signatures for this pipeline.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ui-btn-secondary">
            <XIcon className="ui-btn-icon" />
            Close
          </button>
        </div>

        <div className="ui-panel-body space-y-4">
          <div className="ui-panel-muted p-4">
            <p className="text-sm font-semibold text-slate-900">{pipeline.name}</p>
            <p className="mt-2 font-mono text-xs text-slate-600">/api/v1/webhooks/{pipeline.webhookPath}</p>
            <div className="mt-3">
              <span className={`ui-badge ${pipeline.hasWebhookSecret ? "ui-badge-success" : "ui-badge-neutral"}`}>
                {pipeline.hasWebhookSecret ? "Secret configured" : "No secret configured"}
              </span>
            </div>
          </div>

          <div className="ui-feedback-info">
            Configure a webhook secret if you want the API to verify the <span className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-700">x-webhook-signature</span>
            header. For safety, the raw secret is only shown immediately after generation or rotation.
          </div>

          {pipelineSecretResult?.type === "success" && (
            <div className="ui-feedback-success">{pipelineSecretResult.message}</div>
          )}

          {pipelineSecretError && <div className="ui-feedback-error">{pipelineSecretError}</div>}

          {webhookSecret && (
            <div className="ui-panel-soft p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Current generated secret</p>
                  <p className="mt-1 text-xs text-slate-500">Shown once after generate or rotate.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowSecretValue((current) => !current)} className="ui-btn-secondary">
                    {showSecretValue ? <EyeOffIcon className="ui-btn-icon" /> : <EyeIcon className="ui-btn-icon" />}
                    {showSecretValue ? "Hide" : "Show"}
                  </button>
                  <button type="button" onClick={handleCopy} className="ui-btn-secondary">
                    <CopyIcon className="ui-btn-icon" />
                    Copy
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
                {showSecretValue ? webhookSecret : maskedSecret}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={onClose} className="ui-btn-secondary">
              <XIcon className="ui-btn-icon" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onRotateWebhookSecret}
              disabled={rotatingWebhookSecret}
              className="ui-btn-primary"
            >
              <ShieldIcon className="ui-btn-icon" />
              {rotatingWebhookSecret ? "Saving..." : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
