import { JobListItem } from "../../hooks/useDashboard";

type JobsTableProps = {
  jobs: JobListItem[];
  jobsStatusFilter: string;
  setJobsStatusFilter: (value: string) => void;
  onApplyFilter: () => void;
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
  if (status === "queued") return "bg-blue-100 text-blue-700";
  if (status === "processing") return "bg-amber-100 text-amber-700";
  if (status === "processed") return "bg-purple-100 text-purple-700";
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "failed_processing") return "bg-red-100 text-red-700";
  return "bg-orange-100 text-orange-700";
}

export function JobsTable({
  jobs,
  jobsStatusFilter,
  setJobsStatusFilter,
  onApplyFilter,
  jobsPipelineFilter,
  onClearPipelineFilter,
  selectedJobId,
  onSelectJob,
}: JobsTableProps): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Jobs</h2>
        <p className="ui-subtitle">Track processing status and inspect selected job details below.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {jobsPipelineFilter && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pipeline</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{jobsPipelineFilter.name}</span>
                {onClearPipelineFilter && (
                  <button type="button" onClick={onClearPipelineFilter} className="ui-btn-secondary">
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={jobsStatusFilter}
              onChange={(event) => setJobsStatusFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:w-56"
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

          <button
            type="button"
            onClick={onApplyFilter}
            className="ui-btn-primary"
          >
            Filter
          </button>
        </div>

        <p className="text-sm text-slate-500">Showing {jobs.length} jobs</p>
      </div>

      {jobs.length === 0 ? (
        <p className="ui-feedback-empty">No jobs found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
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
                    selectedJobId === job.id ? "bg-slate-100 ring-1 ring-inset ring-slate-200" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{shortId(job.id)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{shortId(job.pipeline_id)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`ui-badge capitalize ${statusClass(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatDate(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
