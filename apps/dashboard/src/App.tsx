import { useEffect, useState } from "react";
import "./index.css";
import { DeadLetterQueue } from "./components/DeadLetter/DeadLetterQueue";
import { JobDetails } from "./components/Jobs/JobDetails";
import { JobsTable } from "./components/Jobs/JobsTable";
import { Drawer } from "./components/Layout/Drawer";
import { Header } from "./components/Layout/Header";
import { LogsPage } from "./components/Logs/LogsPage";
import { CreatePipelineModal } from "./components/Pipelines/CreatePipelineModal";
import { PipelineDetails } from "./components/Pipelines/PipelineDetails";
import { PipelineSecretModal } from "./components/Pipelines/PipelineSecretModal";
import { PipelinesTable } from "./components/Pipelines/PipelinesTable";
import { SettingsPage } from "./components/Settings/SettingsPage";
import { StatsSection } from "./components/Stats/StatsSection";
import { ToastProvider } from "./components/Toast/ToastProvider";
import { SendWebhookForm } from "./components/Webhooks/SendWebhookForm";
import { useDashboard } from "./hooks/useDashboard";

type DashboardPage = "overview" | "pipelines" | "jobs" | "dead-letters" | "logs" | "settings";

function getPageFromHash(hash: string): DashboardPage {
  if (hash === "#/pipelines") return "pipelines";
  if (hash === "#/jobs") return "jobs";
  if (hash === "#/dead-letters") return "dead-letters";
  if (hash === "#/logs") return "logs";
  if (hash === "#/settings") return "settings";
  return "overview";
}

function getHashForPage(page: DashboardPage): string {
  if (page === "pipelines") return "#/pipelines";
  if (page === "jobs") return "#/jobs";
  if (page === "dead-letters") return "#/dead-letters";
  if (page === "logs") return "#/logs";
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
              : "Settings";
  const pageViewLabel =
    currentPage === "overview"
      ? "Operations View"
      : currentPage === "logs"
        ? "Observability View"
        : currentPage === "settings"
          ? "Configuration View"
          : "Management View";
  const showOverviewDataStates = currentPage !== "logs" && currentPage !== "settings";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
        <Header
          apiKey={dashboard.apiKey}
          onApiKeyChange={dashboard.setApiKey}
          currentPage={currentPage}
          onNavigate={navigateTo}
          autoRefreshEnabled={dashboard.autoRefreshEnabled}
          refreshIntervalMs={dashboard.refreshIntervalMs}
        />

        <div className="min-w-0 flex-1">
          <main className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dashboard</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{pageTitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="ui-badge ui-badge-neutral">{pageViewLabel}</span>
                <span className={`ui-badge ${dashboard.autoRefreshEnabled ? "ui-badge-info" : "ui-badge-neutral"}`}>
                  {dashboard.autoRefreshEnabled
                    ? `Auto-refresh ${dashboard.refreshIntervalMs / 1000}s`
                    : "Manual refresh"}
                </span>
              </div>
            </div>
          </div>

          {currentPage === "overview" && (
            <>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <StatsSection
                    stats={dashboard.stats}
                    metrics={dashboard.metrics}
                    lastUpdatedAt={dashboard.lastUpdatedAt}
                    onRefresh={dashboard.refreshOverview}
                  />
                </div>
                <div className="xl:col-span-1">
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
                </div>
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Latest Jobs</h2>
                    <p className="ui-subtitle">Most recent 5 jobs for quick status checks.</p>
                  </div>
                  <button type="button" onClick={() => navigateTo("jobs")} className="ui-btn-secondary">
                    Open Jobs Page
                  </button>
                </div>

                {latestJobs.length === 0 ? (
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
                        {latestJobs.map((job) => (
                          <tr
                            key={job.id}
                            className="ui-table-row cursor-pointer"
                            onClick={() => {
                              dashboard.setSelectedJobId(job.id);
                              navigateTo("jobs");
                            }}
                          >
                            <td className="px-3 py-2 font-mono text-xs">{shortId(job.id)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{shortId(job.pipeline_id)}</td>
                            <td className="px-3 py-2">
                              <span className={`ui-badge capitalize ${jobStatusClass(job.status)}`}>
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
