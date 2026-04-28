import type { LucideIcon } from "lucide-react";
import {
  ActivityIcon,
  ClockIcon,
  PipelineIcon,
  RefreshIcon,
  ServerIcon,
} from "../Layout/Icons";
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
  tone?: "neutral" | "success" | "warn" | "info";
  icon: LucideIcon;
};

function valueToneClass(tone: NonNullable<StatCardProps["tone"]>): string {
  if (tone === "success") return "text-emerald-700";
  if (tone === "warn") return "text-amber-700";
  if (tone === "info") return "text-blue-700";
  return "text-slate-950";
}

function StatCard({ label, value, tone = "neutral", icon: Icon }: StatCardProps): JSX.Element {
  const toneShellClass =
    tone === "success"
      ? "border-emerald-200/80 bg-[linear-gradient(180deg,_#ffffff_0%,_#ecfdf5_100%)]"
      : tone === "warn"
        ? "border-amber-200/80 bg-[linear-gradient(180deg,_#ffffff_0%,_#fffbeb_100%)]"
        : tone === "info"
          ? "border-blue-200/80 bg-[linear-gradient(180deg,_#ffffff_0%,_#eff6ff_100%)]"
          : "border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]";

  return (
    <article className={`rounded-[24px] border p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${toneShellClass}`}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-slate-700 shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight tabular-nums ${valueToneClass(tone)}`}>{value}</p>
    </article>
  );
}

export function StatsSection({
  stats,
  metrics,
  lastUpdatedAt,
  onRefresh,
}: StatsSectionProps): JSX.Element {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <div className="ui-section-header">
        <div>
          <p className="ui-kicker">System metrics</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Stats</h2>
          <p className="mt-2 ui-subtitle">
            High-level health snapshot for pipelines, jobs, and outbound delivery performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastUpdatedAt && (
            <p className="inline-flex items-center gap-2 text-xs text-slate-500">
              <ClockIcon className="h-4 w-4" />
              Updated {lastUpdatedAt.toLocaleTimeString()}
            </p>
          )}
          <button type="button" onClick={onRefresh} className="ui-btn-primary">
            <RefreshIcon className="ui-btn-icon" />
            Refresh
          </button>
        </div>
      </div>

      <div className="ui-panel-body space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <PipelineIcon className="h-4 w-4 text-slate-500" />
              Pipeline and job health
            </h3>
            <span className="ui-badge ui-badge-neutral">Primary metrics</span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Pipelines" value={stats.totalPipelines} icon={PipelineIcon} />
            <StatCard label="Total Jobs" value={stats.totalJobs} tone="info" icon={ServerIcon} />
            <StatCard label="Completed Jobs" value={stats.completedJobs} tone="success" icon={ActivityIcon} />
            <StatCard label="Failed Jobs" value={stats.failedJobs} tone="warn" icon={ServerIcon} />
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ActivityIcon className="h-4 w-4 text-slate-500" />
              Delivery health
            </h3>
            <span className="ui-badge ui-badge-neutral">Subscriber execution</span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Pipelines" value={metrics.activePipelines} tone="success" icon={PipelineIcon} />
            <StatCard label="Successful Deliveries" value={metrics.successfulDeliveries} tone="success" icon={ActivityIcon} />
            <StatCard label="Failed Deliveries" value={metrics.failedDeliveries} tone="warn" icon={ServerIcon} />
            <StatCard label="Total Delivery Attempts" value={metrics.totalDeliveryAttempts} tone="info" icon={ClockIcon} />
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ServerIcon className="h-4 w-4 text-slate-500" />
                Jobs by Status
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Live distribution across queueing, processing, completion, and failures.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="ui-badge ui-badge-info">queued: {metrics.jobsByStatus.queued}</span>
              <span className="ui-badge ui-badge-warn">processing: {metrics.jobsByStatus.processing}</span>
              <span className="ui-badge bg-purple-100 text-purple-700">processed: {metrics.jobsByStatus.processed}</span>
              <span className="ui-badge ui-badge-success">completed: {metrics.jobsByStatus.completed}</span>
              <span className="ui-badge ui-badge-danger">failed_processing: {metrics.jobsByStatus.failed_processing}</span>
              <span className="ui-badge bg-orange-100 text-orange-700">failed_delivery: {metrics.jobsByStatus.failed_delivery}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
