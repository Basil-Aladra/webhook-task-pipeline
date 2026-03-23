import { Metrics, Stats } from "../../hooks/useDashboard";

type StatsSectionProps = {
  stats: Stats;
  metrics: Metrics;
  lastUpdatedAt: Date | null;
  onRefresh: () => void;
};

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({ label, value }: StatCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export function StatsSection({
  stats,
  metrics,
  lastUpdatedAt,
  onRefresh,
}: StatsSectionProps): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stats</h2>
          <p className="ui-subtitle">High-level health snapshot for pipelines, jobs, and deliveries.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="ui-btn-primary"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pipelines" value={stats.totalPipelines} />
        <StatCard label="Total Jobs" value={stats.totalJobs} />
        <StatCard label="Completed Jobs" value={stats.completedJobs} />
        <StatCard label="Failed Jobs" value={stats.failedJobs} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Pipelines" value={metrics.activePipelines} />
        <StatCard label="Successful Deliveries" value={metrics.successfulDeliveries} />
        <StatCard label="Failed Deliveries" value={metrics.failedDeliveries} />
        <StatCard label="Total Delivery Attempts" value={metrics.totalDeliveryAttempts} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">Jobs by Status</p>
        <div className="flex flex-wrap gap-2">
          <span className="ui-badge ui-badge-info">
            queued: {metrics.jobsByStatus.queued}
          </span>
          <span className="ui-badge ui-badge-warn">
            processing: {metrics.jobsByStatus.processing}
          </span>
          <span className="ui-badge bg-purple-100 text-purple-700">
            processed: {metrics.jobsByStatus.processed}
          </span>
          <span className="ui-badge ui-badge-success">
            completed: {metrics.jobsByStatus.completed}
          </span>
          <span className="ui-badge ui-badge-danger">
            failed_processing: {metrics.jobsByStatus.failed_processing}
          </span>
          <span className="ui-badge bg-orange-100 text-orange-700">
            failed_delivery: {metrics.jobsByStatus.failed_delivery}
          </span>
        </div>
      </div>

      {lastUpdatedAt && (
        <p className="mt-3 text-xs text-slate-500">Last updated: {lastUpdatedAt.toLocaleTimeString()}</p>
      )}
    </section>
  );
}
