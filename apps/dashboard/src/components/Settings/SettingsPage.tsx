import { useMemo, useState } from "react";
import { API_BASE } from "../../api/client";

type SettingsPageProps = {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  autoRefreshEnabled: boolean;
  onAutoRefreshEnabledChange: (value: boolean) => void;
  refreshIntervalMs: number;
  onRefreshIntervalChange: (value: number) => void;
  retryMaxAttempts: number;
  onRetryMaxAttemptsChange: (value: number) => void;
  retryDelaySeconds: number;
  onRetryDelayChange: (value: number) => void;
  onResetDashboardState: () => void;
  onClearLocalSettings: () => void;
};

function environmentLabel(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.MODE) {
    return import.meta.env.MODE;
  }

  if (API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1")) {
    return "development";
  }

  return "production";
}

export function SettingsPage({
  apiKey,
  onApiKeyChange,
  autoRefreshEnabled,
  onAutoRefreshEnabledChange,
  refreshIntervalMs,
  onRefreshIntervalChange,
  retryMaxAttempts,
  onRetryMaxAttemptsChange,
  retryDelaySeconds,
  onRetryDelayChange,
  onResetDashboardState,
  onClearLocalSettings,
}: SettingsPageProps): JSX.Element {
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const [actionFeedback, setActionFeedback] = useState<string>("");
  const [actionFeedbackType, setActionFeedbackType] = useState<"success" | "info">("info");

  const envLabel = useMemo(() => environmentLabel(), []);

  const handleCopyApiKey = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(apiKey);
        setCopyFeedback("API key copied.");
      } else {
        setCopyFeedback("Clipboard API not available in this browser.");
      }
    } catch {
      setCopyFeedback("Failed to copy API key.");
    }

    window.setTimeout(() => {
      setCopyFeedback("");
    }, 2000);
  };

  const handleResetDashboardState = () => {
    onResetDashboardState();
    setActionFeedbackType("success");
    setActionFeedback("Dashboard state reset to defaults.");
    window.setTimeout(() => setActionFeedback(""), 2500);
  };

  const handleClearLocalSettings = () => {
    onClearLocalSettings();
    setActionFeedbackType("success");
    setActionFeedback("Local settings cleared.");
    window.setTimeout(() => setActionFeedback(""), 2500);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
            <p className="mt-1 text-sm text-slate-500">Manage system configuration and behavior</p>
          </div>
          <span className="ui-badge ui-badge-neutral">Environment: {envLabel.charAt(0).toUpperCase() + envLabel.slice(1)}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">API Settings</h3>
              <p className="ui-subtitle">Manage API access used by the dashboard</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="settings-api-key" className="mb-1 block text-sm font-medium text-slate-700">
                  API Key
                </label>
                <input
                  id="settings-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  placeholder="Enter API key"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Stored locally in this browser and used for protected dashboard API requests.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowApiKey((value) => !value)} className="ui-btn-secondary">
                  {showApiKey ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={handleCopyApiKey} className="ui-btn-secondary">
                  Copy
                </button>
              </div>

              {copyFeedback && (
                <div className={copyFeedback.includes("copied") ? "ui-feedback-success" : "ui-feedback-error"}>
                  {copyFeedback}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Refresh Settings</h3>
              <p className="ui-subtitle">Control automatic dashboard refresh behavior</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Auto Refresh</p>
                    <p className="mt-1 text-sm text-slate-500">Keep dashboards up to date automatically.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAutoRefreshEnabledChange(!autoRefreshEnabled)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      autoRefreshEnabled ? "bg-slate-800" : "bg-slate-300"
                    }`}
                    aria-pressed={autoRefreshEnabled}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        autoRefreshEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label htmlFor="settings-refresh-interval" className="mb-1 block text-sm font-medium text-slate-700">
                  Interval
                </label>
                <select
                  id="settings-refresh-interval"
                  value={refreshIntervalMs}
                  onChange={(event) => onRefreshIntervalChange(Number(event.target.value))}
                  disabled={!autoRefreshEnabled}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Retry Settings</h3>
              <p className="ui-subtitle">Configure retry-related demo preferences</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="settings-max-retries" className="mb-1 block text-sm font-medium text-slate-700">
                  Max Retry Attempts
                </label>
                <input
                  id="settings-max-retries"
                  type="number"
                  min={0}
                  max={20}
                  value={retryMaxAttempts}
                  onChange={(event) => onRetryMaxAttemptsChange(Math.max(0, Number(event.target.value) || 0))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label htmlFor="settings-retry-delay" className="mb-1 block text-sm font-medium text-slate-700">
                  Retry Delay (seconds)
                </label>
                <input
                  id="settings-retry-delay"
                  type="number"
                  min={0}
                  step={1}
                  value={retryDelaySeconds}
                  onChange={(event) => onRetryDelayChange(Math.max(0, Number(event.target.value) || 0))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="mt-4 ui-feedback-info">
              These values are dashboard-side preferences for demo configuration only. They do not update backend retry rules.
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:col-span-1">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">System Info</h3>
              <p className="ui-subtitle">Read-only environment and connection details</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">API Base URL</p>
                <p className="mt-2 break-all font-mono text-sm text-slate-800">{API_BASE}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Environment</p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-800">{envLabel}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Worker Status</p>
                <div className="mt-2">
                  <span className="ui-badge ui-badge-neutral">Unknown</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Actions</h3>
              <p className="ui-subtitle">Quick reset utilities</p>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={handleResetDashboardState} className="ui-btn-secondary w-full">
                Reset Dashboard State
              </button>
              <button type="button" onClick={handleClearLocalSettings} className="ui-btn-danger w-full">
                Clear Local Settings
              </button>
            </div>

            {actionFeedback && (
              <div className={`mt-4 ${actionFeedbackType === "success" ? "ui-feedback-success" : "ui-feedback-info"}`}>
                {actionFeedback}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
