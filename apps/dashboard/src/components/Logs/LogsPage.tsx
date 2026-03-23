import { LogEntry, LogLevel, LogSource } from "../../hooks/useDashboard";

type LogsPageProps = {
  logs: LogEntry[];
  loadingLogs: boolean;
  logsError: string;
  logsLevelFilter: "" | LogLevel;
  setLogsLevelFilter: (value: "" | LogLevel) => void;
  logsSourceFilter: "" | LogSource;
  setLogsSourceFilter: (value: "" | LogSource) => void;
  logsSearchText: string;
  setLogsSearchText: (value: string) => void;
  onRefresh: () => void;
  onClearFilters: () => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function levelClass(level: LogLevel): string {
  if (level === "error") return "bg-red-100 text-red-700";
  if (level === "warn") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function sourceClass(source: LogSource): string {
  if (source === "worker") return "bg-indigo-100 text-indigo-700";
  if (source === "delivery") return "bg-teal-100 text-teal-700";
  if (source === "api") return "bg-cyan-100 text-cyan-700";
  return "bg-slate-200 text-slate-700";
}

function shortId(value: string | null): string {
  if (!value) return "-";
  return value.length > 12 ? `${value.slice(0, 10)}...` : value;
}

export function LogsPage({
  logs,
  loadingLogs,
  logsError,
  logsLevelFilter,
  setLogsLevelFilter,
  logsSourceFilter,
  setLogsSourceFilter,
  logsSearchText,
  setLogsSearchText,
  onRefresh,
  onClearFilters,
}: LogsPageProps): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Logs</h2>
          <p className="ui-subtitle">
            Timeline of job lifecycle and delivery events for observability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClearFilters} className="ui-btn-secondary">
            Clear Filters
          </button>
          <button type="button" onClick={onRefresh} className="ui-btn-primary">
            Refresh Logs
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Filters</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Level</label>
            <select
              value={logsLevelFilter}
              onChange={(event) => setLogsLevelFilter(event.target.value as "" | LogLevel)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">All Levels</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
            <select
              value={logsSourceFilter}
              onChange={(event) => setLogsSourceFilter(event.target.value as "" | LogSource)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">All Services</option>
              <option value="api">api</option>
              <option value="worker">worker</option>
              <option value="delivery">delivery</option>
              <option value="system">system</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
            <input
              type="text"
              value={logsSearchText}
              onChange={(event) => setLogsSearchText(event.target.value)}
              placeholder="message, job id, pipeline id..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {logs.length} log entries</p>
        <div className="flex items-center gap-2">
          <span className="ui-badge ui-badge-info">info</span>
          <span className="ui-badge ui-badge-warn">warn</span>
          <span className="ui-badge ui-badge-danger">error</span>
        </div>
      </div>

      {loadingLogs && <div className="ui-feedback-info">Loading logs...</div>}

      {logsError && <div className="ui-feedback-error">{logsError}</div>}

      {!loadingLogs && !logsError && logs.length === 0 && (
        <div className="ui-feedback-empty">No logs found for the selected filters.</div>
      )}

      {!loadingLogs && !logsError && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="ui-table-head-cell">Timestamp</th>
                <th className="ui-table-head-cell">Level</th>
                <th className="ui-table-head-cell">Source</th>
                <th className="ui-table-head-cell">Message</th>
                <th className="ui-table-head-cell">Job ID</th>
                <th className="ui-table-head-cell">Pipeline ID</th>
                <th className="ui-table-head-cell">Correlation ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((entry) => (
                <tr key={entry.id} className="ui-table-row">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`ui-badge uppercase ${levelClass(entry.level)}`}
                    >
                      {entry.level}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`ui-badge ${sourceClass(entry.source)}`}
                    >
                      {entry.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{entry.message}</td>
                  <td className="px-3 py-2 font-mono text-xs">{shortId(entry.jobId)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{shortId(entry.pipelineId)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{shortId(entry.correlationId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
