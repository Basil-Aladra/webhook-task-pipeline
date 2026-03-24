import { useMemo } from "react";
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="ui-subtitle">
            High-value alerts derived from persisted logs for validation and suspicious input events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => onSoundEnabledChange(event.target.checked)}
            />
            Sound alerts
          </label>
          <button type="button" onClick={onRefresh} className="ui-btn-primary">
            Refresh Notifications
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {sortedNotifications.length} alert(s)</p>
        <div className="flex items-center gap-2">
          <span className="ui-badge ui-badge-danger">high</span>
          <span className="ui-badge ui-badge-warn">medium</span>
        </div>
      </div>

      {loadingNotifications && <div className="ui-feedback-info">Loading notifications...</div>}

      {notificationsError && <div className="ui-feedback-error">{notificationsError}</div>}

      {!loadingNotifications && !notificationsError && sortedNotifications.length === 0 && (
        <div className="ui-feedback-empty">No alert-worthy notifications found.</div>
      )}

      {!loadingNotifications && !notificationsError && sortedNotifications.length > 0 && (
        <div className="space-y-3">
          {sortedNotifications.map((entry) => {
            const severity = getNotificationSeverity(entry);

            return (
              <article key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {getNotificationTitle(entry)}
                      </h3>
                      <span className={`ui-badge ${getSeverityClass(severity)}`}>
                        {severity}
                      </span>
                      <span className="ui-badge ui-badge-neutral">{entry.source}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{getNotificationReason(entry)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Timestamp</p>
                    <p className="mt-1 text-sm text-slate-700">{formatDate(entry.timestamp)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Job ID</p>
                    <p className="mt-1 font-mono text-xs text-slate-700">{shortId(entry.jobId)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Alert Type</p>
                    <div className="mt-1">
                      <span className={`ui-badge ${getSeverityClass(severity)}`}>
                        {formatAlertType(getValidationAlertType(entry))}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
