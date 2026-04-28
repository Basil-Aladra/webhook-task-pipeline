import { useMemo } from "react";
import { ActivityIcon, AlertIcon, NotificationIcon, RefreshIcon } from "../Layout/Icons";
import { LogEntry } from "../../hooks/useDashboard";

type NotificationsPageProps = {
  notifications: LogEntry[];
  loadingNotifications: boolean;
  notificationsError: string;
  soundEnabled: boolean;
  onSoundEnabledChange: (value: boolean) => void;
  onRefresh: () => void;
};

type NotificationSeverity = "high" | "medium";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function shortId(value: string | null): string {
  if (!value) return "-";
  return value.length > 12 ? `${value.slice(0, 10)}...` : value;
}

function getNotificationSeverity(entry: LogEntry): NotificationSeverity {
  return entry.level === "error" ? "high" : "medium";
}

function getValidationAlertType(entry: LogEntry): string | null {
  const rawType = entry.context?.validationAlertType;
  return typeof rawType === "string" && rawType.trim() ? rawType : null;
}

function getNotificationTitle(entry: LogEntry): string {
  const validationAlertType = getValidationAlertType(entry);

  if (validationAlertType === "unexpected_fields") {
    return "Unexpected Payload Fields Rejected";
  }

  if (validationAlertType === "invalid_enum") {
    return "Invalid Payload Value Rejected";
  }

  if (validationAlertType === "invalid_type_or_shape") {
    return "Strict Payload Validation Failed";
  }

  if (entry.message === "Webhook validation failed") {
    return "Webhook Request Validation Failed";
  }

  return "Operational Alert";
}

function getNotificationReason(entry: LogEntry): string {
  const contextError = entry.context?.error;

  if (contextError && typeof contextError === "object") {
    const message = (contextError as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return entry.message;
}

function getSeverityClass(severity: NotificationSeverity): string {
  return severity === "high" ? "ui-badge-danger" : "ui-badge-warn";
}

function formatAlertType(value: string | null): string {
  if (!value) {
    return "validation event";
  }

  return value.split("_").join(" ");
}

export function NotificationsPage({
  notifications,
  loadingNotifications,
  notificationsError,
  soundEnabled,
  onSoundEnabledChange,
  onRefresh,
}: NotificationsPageProps): JSX.Element {
  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      ),
    [notifications],
  );
  const highSeverityCount = sortedNotifications.filter((entry) => getNotificationSeverity(entry) === "high").length;

  return (
    <section className="ui-panel overflow-hidden">
      <div className="ui-section-header">
        <div>
          <p className="ui-kicker">Security and validation</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Notifications</h2>
          <p className="mt-2 ui-subtitle">
            High-value alerts derived from persisted logs for validation failures and suspicious input events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => onSoundEnabledChange(event.target.checked)}
            />
            <span className="inline-flex items-center gap-2">
              <NotificationIcon className="h-4 w-4" />
              Sound alerts
            </span>
          </label>
          <button type="button" onClick={onRefresh} className="ui-btn-primary">
            <RefreshIcon className="ui-btn-icon" />
            Refresh Notifications
          </button>
        </div>
      </div>

      <div className="ui-panel-body space-y-5">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="ui-metric-tile">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <AlertIcon className="h-3.5 w-3.5" />
              Total alerts
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{sortedNotifications.length}</p>
            <p className="mt-2 text-sm text-slate-500">Validation failures and suspicious runtime events.</p>
          </div>
          <div className="ui-metric-tile">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <ActivityIcon className="h-3.5 w-3.5" />
              High severity
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{highSeverityCount}</p>
            <p className="mt-2 text-sm text-slate-500">Alerts that need immediate inspection or operator action.</p>
          </div>
          <div className="ui-metric-tile">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <NotificationIcon className="h-3.5 w-3.5" />
              Sound monitoring
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-950">{soundEnabled ? "Enabled" : "Muted"}</p>
            <p className="mt-2 text-sm text-slate-500">
              Audio cue for new high-severity notifications discovered by polling.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <AlertIcon className="h-4 w-4" />
            Showing {sortedNotifications.length} alert(s)
          </p>
          <div className="flex items-center gap-2">
            <span className="ui-badge ui-badge-danger">high</span>
            <span className="ui-badge ui-badge-warn">medium</span>
          </div>
        </div>

        {loadingNotifications && <div className="ui-feedback-info">Loading notifications...</div>}
        {notificationsError && <div className="ui-feedback-error">{notificationsError}</div>}

        {!loadingNotifications && !notificationsError && sortedNotifications.length === 0 && (
          <div className="ui-empty-state">
            <span className="ui-empty-icon">
              <NotificationIcon className="h-5 w-5" />
            </span>
            <p className="ui-empty-state-title mt-4">No active notifications</p>
            <p className="ui-empty-state-text">
              Validation and security alerts will appear here when the system detects noteworthy events.
            </p>
          </div>
        )}

        {!loadingNotifications && !notificationsError && sortedNotifications.length > 0 && (
          <div className="space-y-4">
            {sortedNotifications.map((entry) => {
              const severity = getNotificationSeverity(entry);

              return (
                <article key={entry.id} className="ui-panel-muted p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ui-card-icon h-9 w-9 rounded-xl">
                          <AlertIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{getNotificationTitle(entry)}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`ui-badge ${getSeverityClass(severity)}`}>{severity}</span>
                            <span className="ui-badge ui-badge-neutral">{entry.source}</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-700">{getNotificationReason(entry)}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 xl:min-w-[200px]">
                      <p className="ui-kicker">Timestamp</p>
                      <p className="mt-2 text-sm text-slate-700">{formatDate(entry.timestamp)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="ui-kicker">Job ID</p>
                      <p className="mt-2 font-mono text-xs text-slate-700">{shortId(entry.jobId)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="ui-kicker">Alert Type</p>
                      <div className="mt-2">
                        <span className={`ui-badge ${getSeverityClass(severity)}`}>{formatAlertType(getValidationAlertType(entry))}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="ui-kicker">Pipeline ID</p>
                      <p className="mt-2 font-mono text-xs text-slate-700">{shortId(entry.pipelineId)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
