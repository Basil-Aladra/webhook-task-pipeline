import { useEffect, useState } from "react";
import "./index.css";
import { DeadLetterQueue } from "./components/DeadLetter/DeadLetterQueue";
import { JobDetails } from "./components/Jobs/JobDetails";
import { JobsTable } from "./components/Jobs/JobsTable";
import { Drawer } from "./components/Layout/Drawer";
import { Header } from "./components/Layout/Header";
import {
  ActivityIcon,
  AlertIcon,
  ClockIcon,
  DashboardIcon,
  JobsIcon,
  LogsIcon,
  NotificationIcon,
  PipelineIcon,
  RefreshIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
} from "./components/Layout/Icons";
import { LogsPage } from "./components/Logs/LogsPage";
import { NotificationsPage } from "./components/Notifications/NotificationsPage";
import { NotificationSoundMonitor } from "./components/Notifications/NotificationSoundMonitor";
import { CreatePipelineModal } from "./components/Pipelines/CreatePipelineModal";
import { PipelineDetails } from "./components/Pipelines/PipelineDetails";
import { PipelineSecretModal } from "./components/Pipelines/PipelineSecretModal";
import { PipelinesTable } from "./components/Pipelines/PipelinesTable";
import { SettingsPage } from "./components/Settings/SettingsPage";
import { StatsSection } from "./components/Stats/StatsSection";
import { ToastProvider } from "./components/Toast/ToastProvider";
import { SendWebhookForm } from "./components/Webhooks/SendWebhookForm";
import { useDashboard } from "./hooks/useDashboard";

type DashboardPage = "overview" | "pipelines" | "jobs" | "dead-letters" | "logs" | "notifications" | "settings";

function getPageFromHash(hash: string): DashboardPage {
  if (hash === "#/pipelines") return "pipelines";
  if (hash === "#/jobs") return "jobs";
  if (hash === "#/dead-letters") return "dead-letters";
  if (hash === "#/logs") return "logs";
  if (hash === "#/notifications") return "notifications";
  if (hash === "#/settings") return "settings";
  return "overview";
}

function getHashForPage(page: DashboardPage): string {
  if (page === "pipelines") return "#/pipelines";
  if (page === "jobs") return "#/jobs";
  if (page === "dead-letters") return "#/dead-letters";
  if (page === "logs") return "#/logs";
  if (page === "notifications") return "#/notifications";
  if (page === "settings") return "#/settings";
  return "#/";
}

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function jobStatusClass(status: string): string {
  if (status === "queued") return "ui-badge-info";
  if (status === "processing") return "ui-badge-warn";
  if (status === "processed") return "bg-purple-100 text-purple-700";
  if (status === "completed") return "ui-badge-success";
  if (status === "failed_processing") return "ui-badge-danger";
  return "bg-orange-100 text-orange-700";
}

function getPageDescription(page: DashboardPage): string {
  if (page === "overview") {
    return "Monitor pipeline health, send test events, and review the latest operational activity from one place.";
  }

  if (page === "pipelines") {
    return "Manage delivery pipelines, inspect configuration, and keep subscriber setup clean and secure.";
  }

  if (page === "jobs") {
    return "Track execution, inspect delivery diagnostics, and act on failures without leaving the dashboard.";
  }

  if (page === "dead-letters") {
    return "Review permanently failed deliveries and recover them deliberately.";
  }

  if (page === "logs") {
    return "Inspect runtime activity across API, worker, and delivery services with focused filtering.";
  }

  if (page === "notifications") {
    return "Surface important validation and operational alerts with lightweight audio cues.";
  }

  return "Control dashboard behavior, local preferences, and operator utilities.";
}

export default function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<DashboardPage>(() => getPageFromHash(window.location.hash));
  const dashboard = useDashboard(currentPage);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(getPageFromHash(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigateTo = (page: DashboardPage) => {
    const nextHash = getHashForPage(page);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    setCurrentPage(page);
  };

  const latestJobs = dashboard.jobs.slice(0, 5);
  const pageTitle =
    currentPage === "overview"
      ? "Overview"
      : currentPage === "pipelines"
        ? "Pipelines"
        : currentPage === "jobs"
          ? "Jobs"
          : currentPage === "dead-letters"
            ? "Dead Letters"
            : currentPage === "logs"
              ? "Logs & Observability"
              : currentPage === "notifications"
                ? "Notifications"
              : "Settings";
  const pageViewLabel =
    currentPage === "overview"
      ? "Operations View"
      : currentPage === "logs"
        ? "Observability View"
        : currentPage === "notifications"
          ? "Alerts View"
        : currentPage === "settings"
          ? "Configuration View"
          : "Management View";
  const pageDescription = getPageDescription(currentPage);
  const showOverviewDataStates =
    currentPage !== "logs" && currentPage !== "notifications" && currentPage !== "settings";
  const overviewJumpLinks = [
    {
      label: "Inspect jobs",
      description: "Open the execution inspector",
      icon: JobsIcon,
      page: "jobs" as DashboardPage,
    },
    {
      label: "Trace logs",
      description: "Review runtime activity",
      icon: LogsIcon,
      page: "logs" as DashboardPage,
    },
    {
      label: "Review alerts",
      description: "Validation and security signals",
      icon: NotificationIcon,
      page: "notifications" as DashboardPage,
    },
  ];

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_52%,_#f8fafc_100%)] text-slate-900 lg:flex">
        <NotificationSoundMonitor
          notifications={dashboard.notifications}
          soundEnabled={dashboard.notificationSoundEnabled}
        />

        <Header
          apiKey={dashboard.apiKey}
          onApiKeyChange={dashboard.setApiKey}
          currentPage={currentPage}
          onNavigate={navigateTo}
          autoRefreshEnabled={dashboard.autoRefreshEnabled}
          refreshIntervalMs={dashboard.refreshIntervalMs}
        />

        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            {currentPage === "overview" ? (
              <section className="relative overflow-hidden rounded-[32px] border border-slate-900/5 bg-[linear-gradient(135deg,_#0f172a_0%,_#111827_48%,_#1e293b_100%)] px-5 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:px-6 lg:px-8 lg:py-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.2),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(148,163,184,0.16),_transparent_28%)]" />
                <div className="absolute -right-24 top-6 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />

                <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.32fr)_minmax(340px,0.9fr)] xl:items-stretch">
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200 backdrop-blur">
                          <SparklesIcon className="h-3.5 w-3.5" />
                          Premium Control Center
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                          <ActivityIcon className="h-3.5 w-3.5" />
                          Live operations
                        </span>
                      </div>

                      <h2 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl xl:text-[3.5rem] xl:leading-[1.02]">
                        Command webhook ingestion, delivery health, and recovery from one surface.
                      </h2>
                      <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                        High-signal overview for queue health, delivery confidence, security alerts, and operator
                        actions. Send a live event, inspect failures, and move directly into recovery workflows.
                      </p>
                    </div>

                    <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                      <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                              <SendIcon className="h-3.5 w-3.5" />
                              Ready to demo
                            </p>
                            <h3 className="mt-3 text-lg font-semibold text-white">Fastest path to a live walkthrough</h3>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                            {dashboard.activePipelines.length} active endpoints
                          </span>
                        </div>
                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {overviewJumpLinks.map((item) => {
                            const Icon = item.icon;

                            return (
                              <button
                                key={item.page}
                                type="button"
                                onClick={() => navigateTo(item.page)}
                                className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/10"
                              >
                                <Icon className="h-4 w-4 text-slate-200" />
                                <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-300">{item.description}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            <RefreshIcon className="h-3.5 w-3.5" />
                            Sync cadence
                          </p>
                          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                            {dashboard.autoRefreshEnabled ? `${dashboard.refreshIntervalMs / 1000}s` : "Manual"}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {dashboard.autoRefreshEnabled
                              ? "Automated dashboard refresh is enabled."
                              : "Refresh sections manually when needed."}
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            <ClockIcon className="h-3.5 w-3.5" />
                            Last sync
                          </p>
                          <p className="mt-4 text-lg font-semibold text-white">
                            {dashboard.lastUpdatedAt ? dashboard.lastUpdatedAt.toLocaleTimeString() : "Not loaded"}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">Most recent snapshot of operational state.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                          <PipelineIcon className="h-5 w-5" />
                        </span>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                          Healthy
                        </span>
                      </div>
                      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Active pipelines
                      </p>
                      <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                        {dashboard.metrics.activePipelines}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Delivery routes currently ready to ingest and process new events.
                      </p>
                    </article>

                    <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                          <AlertIcon className="h-5 w-5" />
                        </span>
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                          Actionable
                        </span>
                      </div>
                      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Failed jobs
                      </p>
                      <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                        {dashboard.stats.failedJobs}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Execution failures that can be inspected, retried, or replayed from the dashboard.
                      </p>
                    </article>

                    <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                          <NotificationIcon className="h-5 w-5" />
                        </span>
                        <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-200">
                          Monitored
                        </span>
                      </div>
                      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Notifications
                      </p>
                      <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                        {dashboard.notifications.length}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        High-value validation and security events surfaced from persisted logs.
                      </p>
                    </article>

                    <article className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                          <LogsIcon className="h-5 w-5" />
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                          Recovery
                        </span>
                      </div>
                      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Dead letters
                      </p>
                      <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                        {dashboard.deadLetterJobs.length}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Final-delivery failures queued for operator intervention and replay workflows.
                      </p>
                    </article>
                  </div>
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
                  <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_55%)] lg:block" />
                  <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Webhook Pipeline Dashboard
                        </span>
                        <span className="ui-badge ui-badge-neutral">{pageViewLabel}</span>
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                        {pageTitle}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                        {pageDescription}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[360px]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <RefreshIcon className="h-3.5 w-3.5" />
                          Refresh Mode
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {dashboard.autoRefreshEnabled ? "Automatic" : "Manual"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {dashboard.autoRefreshEnabled
                            ? `Every ${dashboard.refreshIntervalMs / 1000} seconds`
                            : "Use refresh actions inside each section"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <PipelineIcon className="h-3.5 w-3.5" />
                          Active Pipelines
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                          {dashboard.metrics.activePipelines}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Ready to receive and process events</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <AlertIcon className="h-3.5 w-3.5" />
                          Failed Jobs
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                          {dashboard.stats.failedJobs}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Requires operator attention or replay</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {currentPage === "overview" && (
              <>
                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.26fr)_minmax(360px,0.92fr)]">
                <div className="space-y-6">
                  <StatsSection
                    stats={dashboard.stats}
                    metrics={dashboard.metrics}
                    lastUpdatedAt={dashboard.lastUpdatedAt}
                    onRefresh={dashboard.refreshOverview}
                  />
                </div>
                <div className="space-y-6">
                  <SendWebhookForm
                    activePipelines={dashboard.activePipelines}
                    selectedPipelineId={dashboard.selectedPipelineId}
                    setSelectedPipelineId={dashboard.setSelectedPipelineId}
                    webhookPayloadText={dashboard.webhookPayloadText}
                    setWebhookPayloadText={dashboard.setWebhookPayloadText}
                    idempotencyKey={dashboard.idempotencyKey}
                    setIdempotencyKey={dashboard.setIdempotencyKey}
                    sendingWebhook={dashboard.sendingWebhook}
                    sendResult={dashboard.sendResult}
                    onSendWebhook={dashboard.handleSendWebhook}
                  />

                    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_48px_rgba(15,23,42,0.08)]">
                      <div className="relative overflow-hidden p-6">
                        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_65%)]" />
                        <div className="relative">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <DashboardIcon className="h-3.5 w-3.5" />
                                Activity Snapshot
                              </p>
                              <h3 className="mt-2 text-lg font-semibold text-slate-950">Operational focus</h3>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                              Demo-ready
                            </span>
                          </div>

                          <div className="mt-5 grid gap-4">
                            <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_100%)] p-5">
                              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <SendIcon className="h-3.5 w-3.5" />
                                Suggested walkthrough
                              </p>
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                Start with a demo payload, inspect the newest job, then move to logs or alerts for a
                                complete narrative.
                              </p>
                              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => navigateTo("jobs")}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                  <JobsIcon className="h-4 w-4 text-slate-700" />
                                  <p className="mt-3 text-sm font-semibold text-slate-900">Open Jobs</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">Inspect timeline, diagnostics, and operator actions.</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigateTo("logs")}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                  <LogsIcon className="h-4 w-4 text-slate-700" />
                                  <p className="mt-3 text-sm font-semibold text-slate-900">Open Logs</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">Trace API, worker, and delivery events in sequence.</p>
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                  <NotificationIcon className="h-3.5 w-3.5" />
                                  Notifications
                                </p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                                  {dashboard.notifications.length}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Active validation and security alerts</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                  <LogsIcon className="h-3.5 w-3.5" />
                                  Dead Letters
                                </p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                                  {dashboard.deadLetterJobs.length}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Jobs waiting for intervention</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                  <SettingsIcon className="h-3.5 w-3.5" />
                                  Refresh Mode
                                </p>
                                <p className="mt-3 text-sm font-semibold text-slate-900">
                                  {dashboard.autoRefreshEnabled
                                    ? `Every ${dashboard.refreshIntervalMs / 1000}s`
                                    : "Manual refresh"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Current control-center sync cadence</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                </div>
              </div>

                <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_52px_rgba(15,23,42,0.08)]">
                  <div className="relative overflow-hidden border-b border-slate-200/80 px-6 py-6">
                    <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.08),_transparent_70%)]" />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <JobsIcon className="h-3.5 w-3.5" />
                          Recent activity
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Latest Jobs</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          Most recent jobs for quick triage. Select a row to inspect lifecycle, delivery attempts,
                          and operator actions.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                          {latestJobs.length} recent jobs
                        </span>
                        <button type="button" onClick={() => navigateTo("jobs")} className="ui-btn-secondary">
                          <JobsIcon className="ui-btn-icon" />
                          Open Jobs Page
                        </button>
                      </div>
                    </div>
                  </div>

                {latestJobs.length === 0 ? (
                  <div className="px-6 py-6">
                    <div className="ui-empty-state">
                      <span className="ui-empty-icon">
                        <JobsIcon className="h-5 w-5" />
                      </span>
                      <p className="ui-empty-state-title mt-4">No recent jobs yet</p>
                      <p className="ui-empty-state-text">
                        Send a webhook from the quick action panel to populate the latest activity stream.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pb-4 pt-4">
                    <div className="overflow-x-auto rounded-[24px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
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
                          {latestJobs.map((job) => (
                            <tr
                              key={job.id}
                              className="ui-table-row cursor-pointer"
                              onClick={() => {
                                dashboard.setSelectedJobId(job.id);
                                navigateTo("jobs");
                              }}
                            >
                              <td className="px-4 py-4 font-mono text-xs text-slate-700">{shortId(job.id)}</td>
                              <td className="px-4 py-4 font-mono text-xs text-slate-700">{shortId(job.pipeline_id)}</td>
                              <td className="px-4 py-4">
                                <span className={`ui-badge capitalize ${jobStatusClass(job.status)}`}>
                                  {job.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{formatDate(job.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </section>
              </>
            )}

          {currentPage === "pipelines" && (
            <>
              <PipelinesTable
                pipelines={dashboard.pipelines}
                createPipelineResult={dashboard.createPipelineResult}
                selectedPipelineId={dashboard.selectedPipelineDetailsId}
                togglingPipelineStatusId={dashboard.togglingPipelineStatusId}
                onOpenCreateModal={dashboard.handleOpenCreatePipelineModal}
                onSelectPipeline={dashboard.handleOpenPipelineDetails}
                onManageSecret={dashboard.handleOpenPipelineSecretModal}
                onTogglePipelineStatus={dashboard.handleTogglePipelineStatus}
              />

              <Drawer
                isOpen={Boolean(dashboard.selectedPipelineDetailsId)}
                onClose={dashboard.handleClosePipelineDetails}
              >
                <PipelineDetails
                  selectedPipelineId={dashboard.selectedPipelineDetailsId}
                  selectedPipeline={dashboard.selectedPipelineDetails}
                  loadingPipelineDetails={dashboard.loadingPipelineDetails}
                  pipelineDetailsError={dashboard.pipelineDetailsError}
                  operationalStats={dashboard.selectedPipelineOperationalStats}
                  togglingPipelineStatusId={dashboard.togglingPipelineStatusId}
                  onManageSecret={dashboard.handleOpenPipelineSecretModal}
                  onSendTestWebhook={(pipeline) => {
                    dashboard.setSelectedPipelineId(pipeline.id);
                    dashboard.handleClosePipelineDetails();
                    navigateTo("overview");
                  }}
                  onViewJobs={(pipeline) => {
                    void dashboard.handleViewJobsForPipeline(pipeline);
                    dashboard.handleClosePipelineDetails();
                    navigateTo("jobs");
                  }}
                  onTogglePipelineStatus={dashboard.handleTogglePipelineStatus}
                  onClearSelection={dashboard.handleClosePipelineDetails}
                />
              </Drawer>
            </>
          )}

          {currentPage === "jobs" && (
            <>
              <JobsTable
                jobs={dashboard.filteredJobs}
                jobsStatusFilter={dashboard.jobsStatusFilter}
                setJobsStatusFilter={dashboard.setJobsStatusFilter}
                jobsSearchText={dashboard.jobsSearchText}
                setJobsSearchText={dashboard.setJobsSearchText}
                jobsCreatedDate={dashboard.jobsCreatedDate}
                setJobsCreatedDate={dashboard.setJobsCreatedDate}
                appliedJobsStatusFilter={dashboard.appliedJobsStatusFilter}
                appliedJobsSearchText={dashboard.appliedJobsSearchText}
                appliedJobsCreatedDate={dashboard.appliedJobsCreatedDate}
                onApplyFilter={dashboard.handleApplyJobsFilter}
                onClearFilters={dashboard.clearJobsFilters}
                jobsPipelineFilter={dashboard.jobsPipelineFilter}
                onClearPipelineFilter={dashboard.clearJobsPipelineFilter}
                selectedJobId={dashboard.selectedJobId}
                onSelectJob={dashboard.setSelectedJobId}
              />

              <Drawer
                isOpen={Boolean(dashboard.selectedJobId)}
                onClose={() => dashboard.setSelectedJobId("")}
                className=""
              >
                <JobDetails
                  selectedJobId={dashboard.selectedJobId}
                  selectedJob={dashboard.selectedJob}
                  loadingJobDetails={dashboard.loadingJobDetails}
                  jobDetailsError={dashboard.jobDetailsError}
                  retryingJobId={dashboard.retryingJobId}
                  retryJobResult={dashboard.retryJobResult}
                  replayingJobId={dashboard.replayingJobId}
                  replayJobResult={dashboard.replayJobResult}
                  deliveryActionAttemptId={dashboard.deliveryActionAttemptId}
                  deliveryActionResult={dashboard.deliveryActionResult}
                  onRetryJob={dashboard.handleRetryJob}
                  onReplayJob={dashboard.handleReplayJob}
                  onRetryDeliveryAttempt={dashboard.handleRetryDeliveryAttempt}
                  onCancelDeliveryRetry={dashboard.handleCancelDeliveryRetry}
                  onClearSelection={() => dashboard.setSelectedJobId("")}
                />
              </Drawer>
            </>
          )}

          {currentPage === "dead-letters" && (
            <DeadLetterQueue
              deadLetterJobs={dashboard.deadLetterJobs}
              retryingJobId={dashboard.retryingJobId}
              retryJobResult={dashboard.retryJobResult}
              onRetryJob={dashboard.handleRetryJob}
            />
          )}

          {currentPage === "logs" && (
            <LogsPage
              logs={dashboard.filteredLogs}
              loadingLogs={dashboard.loadingLogs}
              logsError={dashboard.logsError}
              logsLevelFilter={dashboard.logsLevelFilter}
              setLogsLevelFilter={dashboard.setLogsLevelFilter}
              logsSourceFilter={dashboard.logsSourceFilter}
              setLogsSourceFilter={dashboard.setLogsSourceFilter}
              logsSearchText={dashboard.logsSearchText}
              setLogsSearchText={dashboard.setLogsSearchText}
              logsPipelineFilter={dashboard.logsPipelineFilter}
              setLogsPipelineFilter={dashboard.setLogsPipelineFilter}
              onRefresh={dashboard.refreshLogs}
              onClearFilters={() => {
                dashboard.setLogsLevelFilter("");
                dashboard.setLogsSourceFilter("");
                dashboard.setLogsSearchText("");
                dashboard.setLogsPipelineFilter("");
              }}
            />
          )}

          {currentPage === "notifications" && (
            <NotificationsPage
              notifications={dashboard.notifications}
              loadingNotifications={dashboard.loadingNotifications}
              notificationsError={dashboard.notificationsError}
              soundEnabled={dashboard.notificationSoundEnabled}
              onSoundEnabledChange={dashboard.setNotificationSoundEnabled}
              onRefresh={dashboard.refreshNotifications}
            />
          )}

          {currentPage === "settings" && (
            <SettingsPage
              apiKey={dashboard.apiKey}
              onApiKeyChange={dashboard.setApiKey}
              autoRefreshEnabled={dashboard.autoRefreshEnabled}
              onAutoRefreshEnabledChange={dashboard.setAutoRefreshEnabled}
              refreshIntervalMs={dashboard.refreshIntervalMs}
              onRefreshIntervalChange={dashboard.setRefreshIntervalMs}
              retryMaxAttempts={dashboard.retryMaxAttempts}
              onRetryMaxAttemptsChange={dashboard.setRetryMaxAttempts}
              retryDelaySeconds={Math.floor(dashboard.retryDelayMs / 1000)}
              onRetryDelayChange={(value) => dashboard.setRetryDelayMs(Math.max(0, value) * 1000)}
              onResetDashboardState={dashboard.resetDashboardSettings}
              onClearLocalSettings={dashboard.clearLocalSettings}
              onResetRuntimeData={dashboard.resetRuntimeData}
              workerHealth={dashboard.workerHealth}
              loadingWorkerHealth={dashboard.loadingWorkerHealth}
              workerHealthError={dashboard.workerHealthError}
            />
          )}

          {showOverviewDataStates && dashboard.loadingOverview && (
            <div className="ui-feedback-info">Loading dashboard data...</div>
          )}

          {showOverviewDataStates && dashboard.overviewError && (
            <div className="ui-feedback-error">{dashboard.overviewError}</div>
          )}
          </main>
        </div>

        <CreatePipelineModal
          open={dashboard.showCreatePipelineModal}
          creatingPipeline={dashboard.creatingPipeline}
          createPipelineError={dashboard.createPipelineError}
          createPipelineName={dashboard.createPipelineName}
          setCreatePipelineName={dashboard.setCreatePipelineName}
          createPipelineWebhookPath={dashboard.createPipelineWebhookPath}
          setCreatePipelineWebhookPath={dashboard.setCreatePipelineWebhookPath}
          createPipelineDescription={dashboard.createPipelineDescription}
          setCreatePipelineDescription={dashboard.setCreatePipelineDescription}
          createPipelineStatus={dashboard.createPipelineStatus}
          setCreatePipelineStatus={dashboard.setCreatePipelineStatus}
          createPipelineActionType={dashboard.createPipelineActionType}
          setCreatePipelineActionType={dashboard.setCreatePipelineActionType}
          createPipelineActionConfigText={dashboard.createPipelineActionConfigText}
          setCreatePipelineActionConfigText={dashboard.setCreatePipelineActionConfigText}
          createPipelineSubscriberUrl={dashboard.createPipelineSubscriberUrl}
          setCreatePipelineSubscriberUrl={dashboard.setCreatePipelineSubscriberUrl}
          onCancel={dashboard.handleCloseCreatePipelineModal}
          onCreate={dashboard.handleCreatePipeline}
        />

        <PipelineSecretModal
          open={dashboard.showPipelineSecretModal}
          pipeline={dashboard.selectedSecretPipeline}
          rotatingWebhookSecret={dashboard.rotatingWebhookSecret}
          pipelineSecretError={dashboard.pipelineSecretError}
          pipelineSecretResult={dashboard.pipelineSecretResult}
          onClose={dashboard.handleClosePipelineSecretModal}
          onRotateWebhookSecret={dashboard.handleRotateWebhookSecret}
        />
      </div>
    </ToastProvider>
  );
}
