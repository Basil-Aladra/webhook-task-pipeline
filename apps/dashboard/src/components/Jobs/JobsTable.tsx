import { CalendarIcon, FilterIcon, JobsIcon, SearchIcon, XIcon } from "../Layout/Icons";
import { JobListItem } from "../../hooks/useDashboard";

type JobsTableProps = {
  jobs: JobListItem[];
  jobsStatusFilter: string;
  setJobsStatusFilter: (value: string) => void;
  jobsSearchText: string;
  setJobsSearchText: (value: string) => void;
  jobsCreatedDate: string;
  setJobsCreatedDate: (value: string) => void;
  appliedJobsStatusFilter?: string;
  appliedJobsSearchText?: string;
  appliedJobsCreatedDate?: string;
  onApplyFilter: () => void;
  onClearFilters?: () => void;
  jobsPipelineFilter?: { id: string; name: string } | null;
  onClearPipelineFilter?: () => void;
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
};

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusClass(status: JobListItem["status"]): string {
  if (status === "queued") return "ui-badge-info";
  if (status === "processing") return "ui-badge-warn";
  if (status === "processed") return "bg-purple-100 text-purple-700";
  if (status === "completed") return "ui-badge-success";
  if (status === "failed_processing") return "ui-badge-danger";
  return "bg-orange-100 text-orange-700";
}

export function JobsTable({
  jobs,
  jobsStatusFilter,
  setJobsStatusFilter,
  jobsSearchText,
  setJobsSearchText,
  jobsCreatedDate,
  setJobsCreatedDate,
  appliedJobsStatusFilter,
  appliedJobsSearchText,
  appliedJobsCreatedDate,
  onApplyFilter,
  onClearFilters,
  jobsPipelineFilter,
  onClearPipelineFilter,
  selectedJobId,
  onSelectJob,
}: JobsTableProps): JSX.Element {
  const activeFilters = [
    jobsPipelineFilter ? `Pipeline: ${jobsPipelineFilter.name}` : "",
    appliedJobsStatusFilter ? `Status: ${appliedJobsStatusFilter}` : "",
    appliedJobsSearchText ? `Search: ${appliedJobsSearchText}` : "",
    appliedJobsCreatedDate ? `Date: ${appliedJobsCreatedDate}` : "",
  ].filter(Boolean);

  return (
    <section className="ui-panel overflow-hidden">
      <div className="ui-section-header">
        <div>
          <p className="ui-kicker">Execution history</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Jobs</h2>
          <p className="mt-2 ui-subtitle">
            Track processing status, isolate failures quickly, and open any job in the inspector drawer.
          </p>
        </div>
      </div>

      <div className="ui-panel-body space-y-4">
        <div className="ui-panel-muted p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FilterIcon className="h-4 w-4 text-slate-500" />
                Filters
              </p>
              <p className="mt-1 text-sm text-slate-500">Narrow jobs by pipeline, status, identifiers, or creation date.</p>
            </div>
            {onClearFilters && (
              <button type="button" onClick={onClearFilters} className="ui-btn-secondary">
                <XIcon className="ui-btn-icon" />
                Clear Filters
              </button>
            )}
          </div>

          {jobsPipelineFilter && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="ui-kicker">Pipeline scope</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{jobsPipelineFilter.name}</p>
                </div>
                {onClearPipelineFilter && (
                  <button type="button" onClick={onClearPipelineFilter} className="ui-btn-secondary">
                    <XIcon className="ui-btn-icon" />
                    Clear Pipeline Filter
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]">
            <div className="ui-field-shell p-3.5">
              <label className="ui-form-label">Search</label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={jobsSearchText}
                  onChange={(event) => setJobsSearchText(event.target.value)}
                  placeholder="jobId or pipelineId"
                  className="ui-input pl-10"
                />
              </div>
            </div>

            <div className="ui-field-shell p-3.5">
              <label className="ui-form-label">Status</label>
              <select
                value={jobsStatusFilter}
                onChange={(event) => setJobsStatusFilter(event.target.value)}
                className="ui-select"
              >
                <option value="">All Statuses</option>
                <option value="queued">queued</option>
                <option value="processing">processing</option>
                <option value="processed">processed</option>
                <option value="completed">completed</option>
                <option value="failed_processing">failed_processing</option>
                <option value="failed_delivery">failed_delivery</option>
              </select>
            </div>

            <div className="ui-field-shell p-3.5">
              <label className="ui-form-label">Created Date</label>
              <div className="relative">
                <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={jobsCreatedDate}
                  onChange={(event) => setJobsCreatedDate(event.target.value)}
                  className="ui-input pl-10"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button type="button" onClick={onApplyFilter} className="ui-btn-primary w-full xl:w-auto">
                <FilterIcon className="ui-btn-icon" />
                Apply Filters
              </button>
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

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="ui-metric-tile">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <JobsIcon className="h-3.5 w-3.5" />
              Visible jobs
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{jobs.length}</p>
            <p className="mt-2 text-sm text-slate-500">Current result set after pipeline, status, and search filters.</p>
          </div>
          <div className="ui-metric-tile">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <FilterIcon className="h-3.5 w-3.5" />
              Active filters
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{activeFilters.length}</p>
            <p className="mt-2 text-sm text-slate-500">Clear filters quickly to return to the full execution stream.</p>
          </div>
          <div className="ui-metric-tile">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <SearchIcon className="h-3.5 w-3.5" />
              Focused job
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-950">
              {selectedJobId ? shortId(selectedJobId) : "None selected"}
            </p>
            <p className="mt-2 text-sm text-slate-500">Selecting a row opens the full lifecycle and delivery inspector.</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="ui-empty-state">
            <span className="ui-empty-icon">
              <JobsIcon className="h-5 w-5" />
            </span>
            <p className="ui-empty-state-title mt-4">No jobs found</p>
            <p className="ui-empty-state-text">
              Adjust the active filters or send a new webhook event to populate the job stream.
            </p>
          </div>
        ) : (
          <div className="ui-table-shell">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="ui-table-head-cell">Job ID</th>
                    <th className="ui-table-head-cell">Pipeline ID</th>
                    <th className="ui-table-head-cell">Status</th>
                    <th className="ui-table-head-cell">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => onSelectJob(job.id)}
                      className={`ui-table-row cursor-pointer ${
                        selectedJobId === job.id
                          ? "bg-[linear-gradient(90deg,_rgba(15,23,42,0.04),_rgba(99,102,241,0.08))] ring-1 ring-inset ring-slate-300/80"
                          : ""
                      }`}
                    >
                      <td className="ui-table-cell font-mono text-xs text-slate-700">{shortId(job.id)}</td>
                      <td className="ui-table-cell font-mono text-xs text-slate-700">{shortId(job.pipeline_id)}</td>
                      <td className="ui-table-cell">
                        <span className={`ui-badge capitalize ${statusClass(job.status)}`}>{job.status}</span>
                      </td>
                      <td className="ui-table-cell text-slate-600">{formatDate(job.created_at)}</td>
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
