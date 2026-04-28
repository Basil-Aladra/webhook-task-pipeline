import { CalendarIcon, FilterIcon, LogsIcon, RefreshIcon, SearchIcon, XIcon } from "../Layout/Icons";
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
  logsPipelineFilter: string;
  setLogsPipelineFilter: (value: string) => void;
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
  if (level === "error") return "ui-badge-danger";
  if (level === "warn") return "ui-badge-warn";
  return "ui-badge-info";
}

function sourceClass(source: LogSource): string {
  if (source === "worker") return "bg-indigo-100 text-indigo-700";
  if (source === "delivery") return "bg-teal-100 text-teal-700";
  if (source === "api") return "bg-cyan-100 text-cyan-700";
  return "ui-badge-neutral";
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
  logsPipelineFilter,
  setLogsPipelineFilter,
  onRefresh,
  onClearFilters,
}: LogsPageProps): JSX.Element {
  const safeLogsPipelineFilter = logsPipelineFilter ?? "";
  const safeLogsSearchText = logsSearchText ?? "";

  const activeFilters = [
    logsLevelFilter ? `Level: ${logsLevelFilter}` : "",
    logsSourceFilter ? `Source: ${logsSourceFilter}` : "",
    safeLogsPipelineFilter.trim() ? `Pipeline: ${safeLogsPipelineFilter.trim()}` : "",
    safeLogsSearchText.trim() ? `Search: ${safeLogsSearchText.trim()}` : "",
  ].filter(Boolean);

  return (
    <section className="ui-panel overflow-hidden">
      <div className="ui-section-header">
        <div>
          <p className="ui-kicker">Observability</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Logs</h2>
          <p className="mt-2 ui-subtitle">
            Trace API, worker, and delivery activity with filters tuned for operational debugging.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClearFilters} className="ui-btn-secondary">
            <XIcon className="ui-btn-icon" />
            Clear Filters
          </button>
          <button type="button" onClick={onRefresh} className="ui-btn-primary">
            <RefreshIcon className="ui-btn-icon" />
            Refresh Logs
          </button>
        </div>
      </div>

      <div className="ui-panel-body space-y-5">
        <div className="ui-panel-muted p-5">
          <div className="mb-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FilterIcon className="h-4 w-4 text-slate-500" />
              Filters
            </p>
            <p className="mt-1 text-sm text-slate-500">Focus the log stream by severity, source, message content, or pipeline scope.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <div className="ui-field-shell p-3.5">
              <label className="ui-form-label">Level</label>
              <select
                value={logsLevelFilter}
                onChange={(event) => setLogsLevelFilter(event.target.value as "" | LogLevel)}
                className="ui-select"
              >
                <option value="">All Levels</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>
            </div>

            <div className="ui-field-shell p-3.5">
              <label className="ui-form-label">Service</label>
              <select
                value={logsSourceFilter}
                onChange={(event) => setLogsSourceFilter(event.target.value as "" | LogSource)}
                className="ui-select"
              >
                <option value="">All Services</option>
                <option value="api">api</option>
                <option value="worker">worker</option>
                <option value="delivery">delivery</option>
                <option value="system">system</option>
              </select>
            </div>

            <div className="ui-field-shell p-3.5">
              <label className="ui-form-label">Search</label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={safeLogsSearchText}
                  onChange={(event) => setLogsSearchText(event.target.value)}
                  placeholder="message, job id, pipeline id..."
                  className="ui-input pl-10"
                />
              </div>
            </div>

            <div className="ui-field-shell p-3.5">
              <label className="ui-form-label">Pipeline ID</label>
              <input
                type="text"
                value={safeLogsPipelineFilter}
                onChange={(event) => setLogsPipelineFilter(event.target.value)}
                placeholder="optional pipeline UUID"
                className="ui-input ui-input-mono"
              />
            </div>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filterLabel) => (
              <span key={filterLabel} className="ui-badge ui-badge-neutral">
                {filterLabel}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 text-sm text-slate-500">
            <LogsIcon className="h-4 w-4" />
            Showing {logs.length} log entries
          </p>
          <div className="flex items-center gap-2">
            <span className="ui-badge ui-badge-info">info</span>
            <span className="ui-badge ui-badge-warn">warn</span>
            <span className="ui-badge ui-badge-danger">error</span>
          </div>
        </div>

        {loadingLogs && <div className="ui-feedback-info">Loading logs...</div>}
        {logsError && <div className="ui-feedback-error">{logsError}</div>}

        {!loadingLogs && !logsError && logs.length === 0 && (
          <div className="ui-empty-state">
            <p className="ui-empty-state-title">No logs found</p>
            <p className="ui-empty-state-text">
              Adjust the filters or refresh the log stream to inspect runtime activity.
            </p>
          </div>
        )}

        {!loadingLogs && !logsError && logs.length > 0 && (
          <div className="ui-table-shell">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
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
                      <td className="ui-table-cell whitespace-nowrap text-slate-600">{formatDate(entry.timestamp)}</td>
                      <td className="ui-table-cell">
                        <span className={`ui-badge uppercase ${levelClass(entry.level)}`}>{entry.level}</span>
                      </td>
                      <td className="ui-table-cell">
                        <span className={`ui-badge ${sourceClass(entry.source)}`}>{entry.source}</span>
                      </td>
                      <td className="ui-table-cell text-slate-700">{entry.message}</td>
                      <td className="ui-table-cell font-mono text-xs text-slate-600">{shortId(entry.jobId)}</td>
                      <td className="ui-table-cell font-mono text-xs text-slate-600">{shortId(entry.pipelineId)}</td>
                      <td className="ui-table-cell font-mono text-xs text-slate-600">{shortId(entry.correlationId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
