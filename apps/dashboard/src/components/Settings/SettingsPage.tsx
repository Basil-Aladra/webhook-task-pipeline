import { useMemo, useState } from "react";
import { API_BASE } from "../../api/client";
import {
  ActivityIcon,
  AlertIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  RefreshIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  XIcon,
} from "../Layout/Icons";
import { useToast } from "../Toast/ToastProvider";

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
  onResetRuntimeData: (confirmedApiKey: string) => Promise<{
    deletedDeliveryAttempts: number;
    deletedJobStatusHistory: number;
    deletedJobs: number;
    deletedLogs: number;
    message: string;
  }>;
  workerHealth: {
    status: "running" | "unknown";
    workerId: string | null;
    lastHeartbeat: string | null;
    uptimeSeconds: number | null;
  };
  loadingWorkerHealth: boolean;
  workerHealthError: string;
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

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) {
    return "-";
  }

  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
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
  onResetRuntimeData,
  workerHealth,
  loadingWorkerHealth,
  workerHealthError,
}: SettingsPageProps): JSX.Element {
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string>("");
  const [actionFeedbackType, setActionFeedbackType] = useState<"success" | "info">("info");
  const [showResetDemoDataModal, setShowResetDemoDataModal] = useState<boolean>(false);
  const [resetDemoDataApiKey, setResetDemoDataApiKey] = useState<string>("");
  const [resetDemoDataLoading, setResetDemoDataLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const envLabel = useMemo(() => environmentLabel(), []);

  const handleCopyApiKey = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(apiKey);
        showToast({
          type: "success",
          message: "API key copied.",
        });
      } else {
        showToast({
          type: "info",
          message: "Clipboard API not available in this browser.",
        });
      }
    } catch {
      showToast({
        type: "error",
        message: "Failed to copy API key.",
      });
    }
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

  const handleConfirmResetDemoData = async () => {
    const confirmedApiKey = resetDemoDataApiKey.trim();

    if (!confirmedApiKey) {
      showToast({
        type: "error",
        message: "Enter an API key to confirm the reset.",
      });
      return;
    }

    setResetDemoDataLoading(true);

    try {
      const result = await onResetRuntimeData(confirmedApiKey);
      showToast({
        type: "success",
        message: `${result.message} Deleted ${result.deletedJobs} jobs and ${result.deletedLogs} logs.`,
      });
      setShowResetDemoDataModal(false);
      setResetDemoDataApiKey("");
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to reset demo data.",
      });
    } finally {
      setResetDemoDataLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="ui-panel overflow-hidden px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-3">
              <span className="ui-card-icon">
                <SettingsIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
                <p className="mt-1 text-sm text-slate-500">Manage system configuration and behavior</p>
              </div>
            </div>
          </div>
          <span className="ui-badge ui-badge-neutral">Environment: {envLabel.charAt(0).toUpperCase() + envLabel.slice(1)}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <section className="ui-panel px-5 py-5 sm:px-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="ui-card-icon">
                <KeyIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">API Settings</h3>
                <p className="ui-subtitle">Manage API access used by the dashboard</p>
              </div>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className="ui-field-shell">
                <label htmlFor="settings-api-key" className="ui-form-label">
                  API Key
                </label>
                <input
                  id="settings-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  placeholder="Enter API key"
                  autoComplete="off"
                  className="ui-input ui-input-mono"
                />
                <p className="ui-form-help">
                  Stored locally in this browser and used for protected dashboard API requests.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowApiKey((value) => !value)} className="ui-btn-secondary">
                  {showApiKey ? <EyeOffIcon className="ui-btn-icon" /> : <EyeIcon className="ui-btn-icon" />}
                  {showApiKey ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={handleCopyApiKey} className="ui-btn-secondary">
                  <CopyIcon className="ui-btn-icon" />
                  Copy
                </button>
              </div>
            </form>
          </section>

          <section className="ui-panel px-5 py-5 sm:px-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="ui-card-icon">
                <RefreshIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Refresh Settings</h3>
                <p className="ui-subtitle">Control automatic dashboard refresh behavior</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
              <div className="ui-field-shell">
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

              <div className="ui-field-shell">
                <label htmlFor="settings-refresh-interval" className="ui-form-label">
                  Interval
                </label>
                <select
                  id="settings-refresh-interval"
                  value={refreshIntervalMs}
                  onChange={(event) => onRefreshIntervalChange(Number(event.target.value))}
                  disabled={!autoRefreshEnabled}
                  className="ui-select disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                </select>
              </div>
            </div>
          </section>

          <section className="ui-panel px-5 py-5 sm:px-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="ui-card-icon">
                <ActivityIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Retry Settings</h3>
                <p className="ui-subtitle">Configure retry-related demo preferences</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="ui-field-shell">
                <label htmlFor="settings-max-retries" className="ui-form-label">
                  Max Retry Attempts
                </label>
                <input
                  id="settings-max-retries"
                  type="number"
                  min={0}
                  max={20}
                  value={retryMaxAttempts}
                  onChange={(event) => onRetryMaxAttemptsChange(Math.max(0, Number(event.target.value) || 0))}
                  className="ui-input"
                />
              </div>

              <div className="ui-field-shell">
                <label htmlFor="settings-retry-delay" className="ui-form-label">
                  Retry Delay (seconds)
                </label>
                <input
                  id="settings-retry-delay"
                  type="number"
                  min={0}
                  step={1}
                  value={retryDelaySeconds}
                  onChange={(event) => onRetryDelayChange(Math.max(0, Number(event.target.value) || 0))}
                  className="ui-input"
                />
              </div>
            </div>

            <div className="mt-4 ui-feedback-info">
              These values are dashboard-side preferences for demo configuration only. They do not update backend retry rules.
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="ui-panel px-5 py-5 sm:px-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="ui-card-icon">
                <ServerIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">System Info</h3>
                <p className="ui-subtitle">Read-only environment and connection details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="ui-field-shell">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">API Base URL</p>
                <p className="mt-2 break-all font-mono text-sm text-slate-800">{API_BASE}</p>
              </div>

              <div className="ui-field-shell">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Environment</p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-800">{envLabel}</p>
              </div>

              <div className="ui-field-shell">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Worker Status</p>
                    <div className="mt-2">
                      {loadingWorkerHealth ? (
                        <span className="ui-badge ui-badge-neutral">Loading...</span>
                      ) : (
                        <span className={`ui-badge ${workerHealth.status === "running" ? "ui-badge-success" : "ui-badge-neutral"}`}>
                          {workerHealth.status === "running" ? "Running" : "Unknown"}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="ui-card-icon h-10 w-10 rounded-xl">
                    <ShieldIcon className="h-4 w-4" />
                  </span>
                </div>
                {workerHealth.workerId && (
                  <p className="mt-3 text-xs text-slate-500">Worker ID: {workerHealth.workerId}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Last heartbeat: {loadingWorkerHealth ? "Loading..." : formatRelativeTime(workerHealth.lastHeartbeat)}
                </p>
                {typeof workerHealth.uptimeSeconds === "number" && (
                  <p className="mt-1 text-xs text-slate-500">Uptime: {workerHealth.uptimeSeconds}s</p>
                )}
                {workerHealthError && <p className="mt-2 text-xs text-red-600">{workerHealthError}</p>}
              </div>
            </div>
          </section>

          <section className="ui-panel px-5 py-5 sm:px-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="ui-card-icon">
                <AlertIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Actions</h3>
                <p className="ui-subtitle">Quick reset utilities</p>
              </div>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={handleResetDashboardState} className="ui-btn-secondary w-full">
                <RefreshIcon className="ui-btn-icon" />
                Reset Dashboard State
              </button>
              <button type="button" onClick={handleClearLocalSettings} className="ui-btn-danger w-full">
                <XIcon className="ui-btn-icon" />
                Clear Local Settings
              </button>
              <button
                type="button"
                onClick={() => setShowResetDemoDataModal(true)}
                className="ui-btn-danger w-full"
              >
                <AlertIcon className="ui-btn-icon" />
                Reset Demo Data
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

      {showResetDemoDataModal && (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-shell max-w-lg p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="ui-card-icon">
                <AlertIcon className="h-5 w-5 text-red-600" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reset Demo Data</h3>
                <p className="mt-1 text-sm text-slate-500">
                  This action permanently clears runtime demo data only. Pipeline configuration and secrets are preserved.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              The following data will be deleted:
              <ul className="mt-2 list-disc pl-5">
                <li>jobs</li>
                <li>job status history</li>
                <li>delivery attempts</li>
                <li>logs</li>
              </ul>
            </div>

            <div className="mb-4 ui-field-shell">
              <label htmlFor="reset-demo-data-api-key" className="ui-form-label">
                Confirm with API Key
              </label>
              <input
                id="reset-demo-data-api-key"
                type="password"
                value={resetDemoDataApiKey}
                onChange={(event) => setResetDemoDataApiKey(event.target.value)}
                placeholder="Enter API key"
                autoComplete="off"
                className="ui-input"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowResetDemoDataModal(false);
                  setResetDemoDataApiKey("");
                }}
                className="ui-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmResetDemoData();
                }}
                disabled={resetDemoDataLoading}
                className="ui-btn-danger"
              >
                <AlertIcon className="ui-btn-icon" />
                {resetDemoDataLoading ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
