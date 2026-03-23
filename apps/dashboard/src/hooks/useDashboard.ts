import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";

type PipelineStatus = "active" | "paused" | "archived";
type JobStatus =
  | "queued"
  | "processing"
  | "processed"
  | "completed"
  | "failed_processing"
  | "failed_delivery";
type ActionType = "transform" | "enrich" | "filter";
type CreatePipelineStatus = "paused" | "active";
export type DashboardPage = "overview" | "pipelines" | "jobs" | "dead-letters" | "logs" | "settings";
export type LogLevel = "info" | "warn" | "error";
export type LogSource = "api" | "worker" | "delivery" | "system";

type ApiListResponse<T> = {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
};

type ApiSingleResponse<T> = {
  data: T;
};

type ResetRuntimeDataResponse = {
  deletedDeliveryAttempts: number;
  deletedJobStatusHistory: number;
  deletedJobs: number;
  deletedLogs: number;
  message: string;
};

export type Stats = {
  totalPipelines: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
};

export type Metrics = {
  activePipelines: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  totalDeliveryAttempts: number;
  jobsByStatus: Record<JobStatus, number>;
};

export type WorkerHealth = {
  status: "running" | "unknown";
  workerId: string | null;
  lastHeartbeat: string | null;
  uptimeSeconds: number | null;
};

export type PipelineListItem = {
  id: string;
  name: string;
  status: PipelineStatus;
  webhookPath: string;
  hasWebhookSecret: boolean;
  actionsCount: number;
  subscribersCount: number;
};

export type PipelineDetails = {
  id: string;
  name: string;
  status: PipelineStatus;
  webhookPath: string;
  description: string | null;
  hasWebhookSecret: boolean;
  createdAt: string;
  updatedAt: string;
  actions: Array<{
    id: string;
    pipelineId: string;
    orderIndex: number;
    actionType: ActionType;
    config: Record<string, unknown>;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  subscribers: Array<{
    id: string;
    pipelineId: string;
    targetUrl: string;
    enabled: boolean;
    timeoutMs: number;
    maxRetries: number;
    retryBackoffMs: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type JobListItem = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  created_at: string;
};

export type DeliveryAttempt = {
  id: number;
  subscriber_id: string;
  attempt_no: number;
  target_url: string;
  status: string;
  request_payload?: Record<string, unknown> | null;
  response_status_code: number | null;
  response_body?: string | null;
  error_message?: string | null;
  next_retry_at?: string | null;
  duration_ms?: number | null;
  scheduled_at?: string | null;
  created_at?: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type StatusHistoryItem = {
  id: number;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  actor: string;
  changed_at: string;
};

export type JobDetails = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  idempotency_key?: string | null;
  payload: Record<string, unknown>;
  result_payload: Record<string, unknown> | null;
  statusHistory: StatusHistoryItem[];
  deliveryAttempts: DeliveryAttempt[];
};

export type DeadLetterJob = {
  id: string;
  pipeline_id: string;
  created_at: string;
  deliveryAttemptsCount: number;
};

export type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  jobId: string | null;
  pipelineId: string | null;
  correlationId: string | null;
};

type SendResult = {
  type: "success" | "error";
  message: string;
} | null;

const DEFAULT_STATS: Stats = {
  totalPipelines: 0,
  totalJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
};

const DEFAULT_METRICS: Metrics = {
  activePipelines: 0,
  successfulDeliveries: 0,
  failedDeliveries: 0,
  totalDeliveryAttempts: 0,
  jobsByStatus: {
    queued: 0,
    processing: 0,
    processed: 0,
    completed: 0,
    failed_processing: 0,
    failed_delivery: 0,
  },
};

const DEFAULT_WORKER_HEALTH: WorkerHealth = {
  status: "unknown",
  workerId: null,
  lastHeartbeat: null,
  uptimeSeconds: null,
};

const DEFAULT_WEBHOOK_PAYLOAD = `{
  "orderId": "123",
  "customerName": "John",
  "amount": 99.99
}`;

const STORAGE_KEYS = {
  apiKey: "dashboardApiKey",
  autoRefreshEnabled: "dashboardAutoRefreshEnabled",
  refreshIntervalMs: "dashboardRefreshIntervalMs",
  retryMaxAttempts: "dashboardRetryMaxAttempts",
  retryDelayMs: "dashboardRetryDelayMs",
} as const;

const DEFAULT_AUTO_REFRESH_ENABLED = true;
const DEFAULT_REFRESH_INTERVAL_MS = 10000;
const DEFAULT_RETRY_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 2000;

function getStoredValue<T>(key: string, fallback: T, parser: (value: string) => T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return fallback;
    }

    return parser(stored);
  } catch {
    return fallback;
  }
}

export function useDashboard(activePage: DashboardPage = "overview") {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.apiKey) || "";
    } catch {
      return "";
    }
  });

  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() =>
    getStoredValue(STORAGE_KEYS.autoRefreshEnabled, DEFAULT_AUTO_REFRESH_ENABLED, (value) => value === "true"),
  );
  const [refreshIntervalMs, setRefreshIntervalMs] = useState<number>(() =>
    getStoredValue(STORAGE_KEYS.refreshIntervalMs, DEFAULT_REFRESH_INTERVAL_MS, (value) => {
      const parsed = Number(value);
      return [5000, 10000, 30000].includes(parsed) ? parsed : DEFAULT_REFRESH_INTERVAL_MS;
    }),
  );
  const [retryMaxAttempts, setRetryMaxAttempts] = useState<number>(() =>
    getStoredValue(STORAGE_KEYS.retryMaxAttempts, DEFAULT_RETRY_MAX_ATTEMPTS, (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(20, parsed)) : DEFAULT_RETRY_MAX_ATTEMPTS;
    }),
  );
  const [retryDelayMs, setRetryDelayMs] = useState<number>(() =>
    getStoredValue(STORAGE_KEYS.retryDelayMs, DEFAULT_RETRY_DELAY_MS, (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : DEFAULT_RETRY_DELAY_MS;
    }),
  );
  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [deadLetterJobs, setDeadLetterJobs] = useState<DeadLetterJob[]>([]);
  const [jobsStatusFilter, setJobsStatusFilter] = useState<string>("");
  const [appliedJobsStatusFilter, setAppliedJobsStatusFilter] = useState<string>("");
  const [jobsPipelineFilter, setJobsPipelineFilter] = useState<{ id: string; name: string } | null>(null);
  const [jobsSearchText, setJobsSearchText] = useState<string>("");
  const [appliedJobsSearchText, setAppliedJobsSearchText] = useState<string>("");
  const [jobsCreatedDate, setJobsCreatedDate] = useState<string>("");
  const [appliedJobsCreatedDate, setAppliedJobsCreatedDate] = useState<string>("");
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string>("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [webhookPayloadText, setWebhookPayloadText] = useState<string>(DEFAULT_WEBHOOK_PAYLOAD);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [sendingWebhook, setSendingWebhook] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<SendResult>(null);

  const [showCreatePipelineModal, setShowCreatePipelineModal] = useState<boolean>(false);
  const [creatingPipeline, setCreatingPipeline] = useState<boolean>(false);
  const [createPipelineError, setCreatePipelineError] = useState<string>("");
  const [createPipelineResult, setCreatePipelineResult] = useState<SendResult>(null);
  const [createPipelineName, setCreatePipelineName] = useState<string>("");
  const [createPipelineWebhookPath, setCreatePipelineWebhookPath] = useState<string>("");
  const [createPipelineDescription, setCreatePipelineDescription] = useState<string>("");
  const [createPipelineStatus, setCreatePipelineStatus] = useState<CreatePipelineStatus>("paused");
  const [createPipelineActionType, setCreatePipelineActionType] = useState<ActionType>("transform");
  const [createPipelineActionConfigText, setCreatePipelineActionConfigText] = useState<string>("{}");
  const [createPipelineSubscriberUrl, setCreatePipelineSubscriberUrl] = useState<string>("");
  const [showPipelineSecretModal, setShowPipelineSecretModal] = useState<boolean>(false);
  const [selectedSecretPipeline, setSelectedSecretPipeline] = useState<PipelineListItem | null>(null);
  const [rotatingWebhookSecret, setRotatingWebhookSecret] = useState<boolean>(false);
  const [pipelineSecretError, setPipelineSecretError] = useState<string>("");
  const [pipelineSecretResult, setPipelineSecretResult] = useState<{
    type: "success" | "error";
    message: string;
    webhookSecret?: string;
  } | null>(null);
  const [togglingPipelineStatusId, setTogglingPipelineStatusId] = useState<string>("");
  const [selectedPipelineDetailsId, setSelectedPipelineDetailsId] = useState<string>("");
  const [selectedPipelineDetails, setSelectedPipelineDetails] = useState<PipelineDetails | null>(null);
  const [loadingPipelineDetails, setLoadingPipelineDetails] = useState<boolean>(false);
  const [pipelineDetailsError, setPipelineDetailsError] = useState<string>("");
  const [selectedPipelineOperationalStats, setSelectedPipelineOperationalStats] = useState<{
    jobsCount: number;
    failedJobsCount: number;
    latestActivityAt: string | null;
  }>({
    jobsCount: 0,
    failedJobsCount: 0,
    latestActivityAt: null,
  });

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [loadingJobDetails, setLoadingJobDetails] = useState<boolean>(false);
  const [jobDetailsError, setJobDetailsError] = useState<string>("");
  const [retryingJobId, setRetryingJobId] = useState<string>("");
  const [retryJobResult, setRetryJobResult] = useState<SendResult>(null);
  const [replayingJobId, setReplayingJobId] = useState<string>("");
  const [replayJobResult, setReplayJobResult] = useState<SendResult>(null);
  const [deliveryActionAttemptId, setDeliveryActionAttemptId] = useState<number | null>(null);
  const [deliveryActionResult, setDeliveryActionResult] = useState<SendResult>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string>("");
  const [workerHealth, setWorkerHealth] = useState<WorkerHealth>(DEFAULT_WORKER_HEALTH);
  const [loadingWorkerHealth, setLoadingWorkerHealth] = useState<boolean>(false);
  const [workerHealthError, setWorkerHealthError] = useState<string>("");
  const [logsLevelFilter, setLogsLevelFilter] = useState<"" | LogLevel>("");
  const [logsSourceFilter, setLogsSourceFilter] = useState<"" | LogSource>("");
  const [logsSearchText, setLogsSearchText] = useState<string>("");
  const [logsPipelineFilter, setLogsPipelineFilter] = useState<string>("");

  const activePipelines = useMemo(
    () => pipelines.filter((pipeline) => pipeline.status === "active"),
    [pipelines],
  );

  const filteredLogs = useMemo(() => {
    return logs;
  }, [logs]);

  const filteredJobs = useMemo(() => {
    const normalizedSearch = appliedJobsSearchText.trim().toLowerCase();

    return jobs.filter((job) => {
      if (normalizedSearch) {
        const matchesJobId = job.id.toLowerCase().includes(normalizedSearch);
        const matchesPipelineId = job.pipeline_id.toLowerCase().includes(normalizedSearch);

        if (!matchesJobId && !matchesPipelineId) {
          return false;
        }
      }

      if (appliedJobsCreatedDate) {
        const jobDate = new Date(job.created_at);

        if (Number.isNaN(jobDate.getTime())) {
          return false;
        }

        const yyyy = jobDate.getFullYear();
        const mm = String(jobDate.getMonth() + 1).padStart(2, "0");
        const dd = String(jobDate.getDate()).padStart(2, "0");

        if (`${yyyy}-${mm}-${dd}` !== appliedJobsCreatedDate) {
          return false;
        }
      }

      return true;
    });
  }, [appliedJobsCreatedDate, appliedJobsSearchText, jobs]);

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoadingOverview(true);
      }
      setOverviewError("");

      try {
        const jobsListPath = appliedJobsStatusFilter
          ? `/jobs?${new URLSearchParams({
              ...(jobsPipelineFilter ? { pipelineId: jobsPipelineFilter.id } : {}),
              status: appliedJobsStatusFilter,
              page: "1",
              limit: "100",
            }).toString()}`
          : `/jobs?${new URLSearchParams({
              ...(jobsPipelineFilter ? { pipelineId: jobsPipelineFilter.id } : {}),
              page: "1",
              limit: "100",
            }).toString()}`;

        const [
          pipelinesSummary,
          pipelinesList,
          jobsSummary,
          jobsList,
          completedSummary,
          failedProcessingSummary,
          failedDeliverySummary,
          deadLetterJobsResponse,
          metricsResponse,
        ] = await Promise.all([
          apiRequest<ApiListResponse<PipelineListItem>>("/pipelines?page=1&limit=1", { apiKey }),
          apiRequest<ApiListResponse<PipelineListItem>>("/pipelines?page=1&limit=100", { apiKey }),
          apiRequest<ApiListResponse<JobListItem>>("/jobs?page=1&limit=1", { apiKey }),
          apiRequest<ApiListResponse<JobListItem>>(jobsListPath, { apiKey }),
          apiRequest<ApiListResponse<JobListItem>>("/jobs?page=1&limit=1&status=completed", { apiKey }),
          apiRequest<ApiListResponse<JobListItem>>("/jobs?page=1&limit=1&status=failed_processing", {
            apiKey,
          }),
          apiRequest<ApiListResponse<JobListItem>>("/jobs?page=1&limit=1&status=failed_delivery", {
            apiKey,
          }),
          apiRequest<ApiListResponse<JobListItem>>("/jobs?status=failed_delivery&page=1&limit=100", {
            apiKey,
          }),
          apiRequest<ApiSingleResponse<Metrics>>("/metrics", { apiKey }),
        ]);

        setStats({
          totalPipelines: pipelinesSummary.meta?.total || 0,
          totalJobs: jobsSummary.meta?.total || 0,
          completedJobs: completedSummary.meta?.total || 0,
          failedJobs: (failedProcessingSummary.meta?.total || 0) + (failedDeliverySummary.meta?.total || 0),
        });

        setPipelines(Array.isArray(pipelinesList.data) ? pipelinesList.data : []);
        setJobs(Array.isArray(jobsList.data) ? jobsList.data : []);

        const failedJobs = Array.isArray(deadLetterJobsResponse.data) ? deadLetterJobsResponse.data : [];

        const failedJobsWithAttempts = await Promise.all(
          failedJobs.map(async (job) => {
            try {
              const jobDetailsResponse = await apiRequest<ApiSingleResponse<JobDetails>>(`/jobs/${job.id}`, {
                apiKey,
              });
              const attempts = Array.isArray(jobDetailsResponse.data.deliveryAttempts)
                ? jobDetailsResponse.data.deliveryAttempts
                : [];

              return {
                id: job.id,
                pipeline_id: job.pipeline_id,
                created_at: job.created_at,
                deliveryAttemptsCount: attempts.length,
              };
            } catch {
              return {
                id: job.id,
                pipeline_id: job.pipeline_id,
                created_at: job.created_at,
                deliveryAttemptsCount: 0,
              };
            }
          }),
        );

        setDeadLetterJobs(failedJobsWithAttempts);
        setMetrics({
          activePipelines: metricsResponse.data?.activePipelines || 0,
          successfulDeliveries: metricsResponse.data?.successfulDeliveries || 0,
          failedDeliveries: metricsResponse.data?.failedDeliveries || 0,
          totalDeliveryAttempts: metricsResponse.data?.totalDeliveryAttempts || 0,
          jobsByStatus: {
            queued: metricsResponse.data?.jobsByStatus?.queued || 0,
            processing: metricsResponse.data?.jobsByStatus?.processing || 0,
            processed: metricsResponse.data?.jobsByStatus?.processed || 0,
            completed: metricsResponse.data?.jobsByStatus?.completed || 0,
            failed_processing: metricsResponse.data?.jobsByStatus?.failed_processing || 0,
            failed_delivery: metricsResponse.data?.jobsByStatus?.failed_delivery || 0,
          },
        });
        setLastUpdatedAt(new Date());
      } catch (error) {
        setOverviewError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data. Check API availability and CORS settings.",
        );
      } finally {
        if (!silent) {
          setLoadingOverview(false);
        }
      }
    },
    [apiKey, appliedJobsStatusFilter, jobsPipelineFilter],
  );

  const handleSendWebhook = useCallback(async () => {
    const selectedPipeline = pipelines.find((pipeline) => pipeline.id === selectedPipelineId);

    if (!selectedPipeline) {
      setSendResult({ type: "error", message: "Please select an active pipeline." });
      return;
    }

    let parsedPayload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(webhookPayloadText) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        setSendResult({ type: "error", message: "Payload must be a JSON object." });
        return;
      }
      parsedPayload = parsed as Record<string, unknown>;
    } catch {
      setSendResult({ type: "error", message: "Payload must be valid JSON." });
      return;
    }

    setSendingWebhook(true);
    setSendResult(null);

    try {
      const requestBody: { payload: Record<string, unknown>; idempotencyKey?: string } = {
        payload: parsedPayload,
      };
      const trimmedIdempotencyKey = idempotencyKey.trim();
      if (trimmedIdempotencyKey) {
        requestBody.idempotencyKey = trimmedIdempotencyKey;
      }

      const response = await apiRequest<ApiSingleResponse<{ jobId?: string }>>(
        `/webhooks/${encodeURIComponent(selectedPipeline.webhookPath)}`,
        {
          apiKey,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      setSendResult({
        type: "success",
        message: `Job queued: ${response.data?.jobId || "unknown"}`,
      });
      await loadOverview(false);
    } catch (error) {
      setSendResult({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSendingWebhook(false);
    }
  }, [apiKey, idempotencyKey, loadOverview, pipelines, selectedPipelineId, webhookPayloadText]);

  const handleApplyJobsFilter = useCallback(async () => {
    setAppliedJobsStatusFilter(jobsStatusFilter);
    setAppliedJobsSearchText(jobsSearchText.trim());
    setAppliedJobsCreatedDate(jobsCreatedDate);
    setOverviewError("");

    try {
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      if (jobsPipelineFilter) {
        queryParams.set("pipelineId", jobsPipelineFilter.id);
      }

      if (jobsStatusFilter) {
        queryParams.set("status", jobsStatusFilter);
      }

      const jobsPath = `/jobs?${queryParams.toString()}`;

      const jobsResponse = await apiRequest<ApiListResponse<JobListItem>>(jobsPath, { apiKey });
      setJobs(Array.isArray(jobsResponse.data) ? jobsResponse.data : []);
    } catch (error) {
      setOverviewError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data. Check API availability and CORS settings.",
      );
    }
  }, [apiKey, jobsCreatedDate, jobsPipelineFilter, jobsSearchText, jobsStatusFilter]);

  const resetCreatePipelineForm = useCallback(() => {
    setCreatePipelineName("");
    setCreatePipelineWebhookPath("");
    setCreatePipelineDescription("");
    setCreatePipelineStatus("paused");
    setCreatePipelineActionType("transform");
    setCreatePipelineActionConfigText("{}");
    setCreatePipelineSubscriberUrl("");
    setCreatePipelineError("");
  }, []);

  const handleOpenCreatePipelineModal = useCallback(() => {
    setCreatePipelineResult(null);
    setCreatePipelineError("");
    setShowCreatePipelineModal(true);
  }, []);

  const handleCloseCreatePipelineModal = useCallback(() => {
    setShowCreatePipelineModal(false);
    setCreatePipelineError("");
  }, []);

  const handleOpenPipelineSecretModal = useCallback((pipeline: PipelineListItem) => {
    setSelectedSecretPipeline(pipeline);
    setPipelineSecretError("");
    setPipelineSecretResult(null);
    setShowPipelineSecretModal(true);
  }, []);

  const handleClosePipelineSecretModal = useCallback(() => {
    setShowPipelineSecretModal(false);
    setSelectedSecretPipeline(null);
    setPipelineSecretError("");
    setPipelineSecretResult(null);
  }, []);

  const handleCreatePipeline = useCallback(async () => {
    const name = createPipelineName.trim();
    const webhookPath = createPipelineWebhookPath.trim();
    const description = createPipelineDescription.trim();
    const subscriberUrl = createPipelineSubscriberUrl.trim();

    if (!name) {
      setCreatePipelineError("Pipeline name is required.");
      return;
    }

    if (!webhookPath) {
      setCreatePipelineError("Webhook path is required.");
      return;
    }

    if (!subscriberUrl) {
      setCreatePipelineError("Subscriber URL is required.");
      return;
    }

    let parsedActionConfig: Record<string, unknown>;
    try {
      const parsed = JSON.parse(createPipelineActionConfigText) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        setCreatePipelineError("Action config must be a JSON object.");
        return;
      }
      parsedActionConfig = parsed as Record<string, unknown>;
    } catch {
      setCreatePipelineError("Action config must be valid JSON.");
      return;
    }

    setCreatingPipeline(true);
    setCreatePipelineError("");

    try {
      const requestBody = {
        name,
        webhookPath,
        description: description || undefined,
        status: createPipelineStatus,
        actions: [
          {
            orderIndex: 1,
            actionType: createPipelineActionType,
            config: parsedActionConfig,
            enabled: true,
          },
        ],
        subscribers: [
          {
            targetUrl: subscriberUrl,
            enabled: true,
          },
        ],
      };

      const response = await apiRequest<ApiSingleResponse<{ name?: string }>>("/pipelines", {
        apiKey,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      setCreatePipelineResult({
        type: "success",
        message: `Pipeline created: ${response.data?.name || name}`,
      });
      setShowCreatePipelineModal(false);
      resetCreatePipelineForm();
      await loadOverview(false);
    } catch (error) {
      setCreatePipelineError(error instanceof Error ? error.message : "Failed to create pipeline.");
    } finally {
      setCreatingPipeline(false);
    }
  }, [
    apiKey,
    createPipelineActionConfigText,
    createPipelineActionType,
    createPipelineDescription,
    createPipelineName,
    createPipelineStatus,
    createPipelineSubscriberUrl,
    createPipelineWebhookPath,
    loadOverview,
    resetCreatePipelineForm,
  ]);

  const loadJobDetails = useCallback(
    async (jobId: string, silent = false) => {
      if (!jobId) {
        setSelectedJob(null);
        return;
      }

      if (!silent) {
        setLoadingJobDetails(true);
      }
      setJobDetailsError("");

      try {
        const response = await apiRequest<ApiSingleResponse<JobDetails>>(`/jobs/${jobId}`, {
          apiKey,
        });
        setSelectedJob(response.data || null);
      } catch (error) {
        setSelectedJob(null);
        setJobDetailsError(error instanceof Error ? error.message : "Failed to load job details.");
      } finally {
        if (!silent) {
          setLoadingJobDetails(false);
        }
      }
    },
    [apiKey],
  );

  const loadPipelineDetails = useCallback(
    async (pipelineId: string, silent = false) => {
      if (!pipelineId) {
        setSelectedPipelineDetails(null);
        setSelectedPipelineOperationalStats({
          jobsCount: 0,
          failedJobsCount: 0,
          latestActivityAt: null,
        });
        return;
      }

      if (!silent) {
        setLoadingPipelineDetails(true);
      }
      setPipelineDetailsError("");

      try {
        const [pipelineResponse, jobsSummary, latestJobsResponse, failedProcessingSummary, failedDeliverySummary] =
          await Promise.all([
            apiRequest<ApiSingleResponse<PipelineDetails>>(`/pipelines/${pipelineId}`, {
              apiKey,
            }),
            apiRequest<ApiListResponse<JobListItem>>(`/jobs?pipelineId=${pipelineId}&page=1&limit=1`, {
              apiKey,
            }),
            apiRequest<ApiListResponse<JobListItem>>(`/jobs?pipelineId=${pipelineId}&page=1&limit=5`, {
              apiKey,
            }),
            apiRequest<ApiListResponse<JobListItem>>(
              `/jobs?pipelineId=${pipelineId}&status=failed_processing&page=1&limit=1`,
              { apiKey },
            ),
            apiRequest<ApiListResponse<JobListItem>>(
              `/jobs?pipelineId=${pipelineId}&status=failed_delivery&page=1&limit=1`,
              { apiKey },
            ),
          ]);

        setSelectedPipelineDetails(pipelineResponse.data || null);

        const latestActivityAt =
          Array.isArray(latestJobsResponse.data) && latestJobsResponse.data.length > 0
            ? latestJobsResponse.data[0].created_at
            : null;

        setSelectedPipelineOperationalStats({
          jobsCount: jobsSummary.meta?.total || 0,
          failedJobsCount:
            (failedProcessingSummary.meta?.total || 0) + (failedDeliverySummary.meta?.total || 0),
          latestActivityAt,
        });
      } catch (error) {
        setSelectedPipelineDetails(null);
        setSelectedPipelineOperationalStats({
          jobsCount: 0,
          failedJobsCount: 0,
          latestActivityAt: null,
        });
        setPipelineDetailsError(
          error instanceof Error ? error.message : "Failed to load pipeline details.",
        );
      } finally {
        if (!silent) {
          setLoadingPipelineDetails(false);
        }
      }
    },
    [apiKey],
  );

  const loadLogs = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoadingLogs(true);
      }
      setLogsError("");

      try {
        const searchParams = new URLSearchParams();
        searchParams.set("limit", "300");

        if (logsLevelFilter) {
          searchParams.set("level", logsLevelFilter);
        }

        if (logsSourceFilter) {
          searchParams.set("source", logsSourceFilter);
        }

        const trimmedPipelineId = logsPipelineFilter.trim();
        if (trimmedPipelineId) {
          searchParams.set("pipelineId", trimmedPipelineId);
        }

        const trimmedSearch = logsSearchText.trim();
        if (trimmedSearch) {
          searchParams.set("search", trimmedSearch);
        }

        const response = await apiRequest<ApiListResponse<LogEntry>>(`/logs?${searchParams.toString()}`, {
          apiKey,
        });

        setLogs(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setLogsError(error instanceof Error ? error.message : "Failed to load logs.");
      } finally {
        if (!silent) {
          setLoadingLogs(false);
        }
      }
    },
    [apiKey, logsLevelFilter, logsPipelineFilter, logsSearchText, logsSourceFilter],
  );

  const loadWorkerHealth = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoadingWorkerHealth(true);
      }
      setWorkerHealthError("");

      try {
        const response = await apiRequest<ApiSingleResponse<WorkerHealth>>("/worker/health", { apiKey });
        setWorkerHealth(response.data || DEFAULT_WORKER_HEALTH);
      } catch (error) {
        setWorkerHealth(DEFAULT_WORKER_HEALTH);
        setWorkerHealthError(error instanceof Error ? error.message : "Failed to load worker health.");
      } finally {
        if (!silent) {
          setLoadingWorkerHealth(false);
        }
      }
    },
    [apiKey],
  );

  const handleRotateWebhookSecret = useCallback(async () => {
    if (!selectedSecretPipeline) {
      setPipelineSecretError("Select a pipeline first.");
      return;
    }

    setRotatingWebhookSecret(true);
    setPipelineSecretError("");
    setPipelineSecretResult(null);

    try {
      const response = await apiRequest<
        ApiSingleResponse<{ pipelineId: string; webhookSecret: string; hasWebhookSecret: boolean }>
      >(`/pipelines/${selectedSecretPipeline.id}/webhook-secret/rotate`, {
        apiKey,
        method: "POST",
      });

      const nextPipeline = {
        ...selectedSecretPipeline,
        hasWebhookSecret: true,
      };

      setSelectedSecretPipeline(nextPipeline);
      setPipelines((current) =>
        current.map((pipeline) =>
          pipeline.id === nextPipeline.id ? { ...pipeline, hasWebhookSecret: true } : pipeline,
        ),
      );
      setSelectedPipelineDetails((current) =>
        current && current.id === nextPipeline.id
          ? {
              ...current,
              hasWebhookSecret: true,
            }
          : current,
      );
      setPipelineSecretResult({
        type: "success",
        message: selectedSecretPipeline.hasWebhookSecret
          ? "Webhook secret rotated. Copy it now because it is shown only once."
          : "Webhook secret generated. Copy it now because it is shown only once.",
        webhookSecret: response.data.webhookSecret,
      });
      await loadOverview(true);
    } catch (error) {
      setPipelineSecretError(
        error instanceof Error ? error.message : "Failed to update webhook secret.",
      );
    } finally {
      setRotatingWebhookSecret(false);
    }
  }, [apiKey, loadOverview, selectedSecretPipeline]);

  const handleTogglePipelineStatus = useCallback(
    async (pipeline: PipelineListItem): Promise<PipelineStatus> => {
      const nextStatus: PipelineStatus = pipeline.status === "active" ? "paused" : "active";
      setTogglingPipelineStatusId(pipeline.id);

      try {
        const response = await apiRequest<ApiSingleResponse<PipelineDetails>>(`/pipelines/${pipeline.id}`, {
          apiKey,
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        });

        const updatedPipeline = response.data;

        setPipelines((current) =>
          current.map((item) =>
            item.id === pipeline.id
              ? {
                  ...item,
                  status: updatedPipeline.status,
                  hasWebhookSecret: updatedPipeline.hasWebhookSecret,
                }
              : item,
          ),
        );

        setSelectedPipelineDetails((current) =>
          current && current.id === pipeline.id
            ? {
                ...current,
                status: updatedPipeline.status,
                hasWebhookSecret: updatedPipeline.hasWebhookSecret,
                updatedAt: updatedPipeline.updatedAt,
              }
            : current,
        );

        return updatedPipeline.status;
      } finally {
        setTogglingPipelineStatusId("");
      }
    },
    [apiKey],
  );

  const handleOpenPipelineDetails = useCallback((pipeline: PipelineListItem) => {
    setSelectedPipelineDetailsId(pipeline.id);
  }, []);

  const handleClosePipelineDetails = useCallback(() => {
    setSelectedPipelineDetailsId("");
    setSelectedPipelineDetails(null);
    setPipelineDetailsError("");
  }, []);

  const handleViewJobsForPipeline = useCallback(async (pipeline: PipelineListItem) => {
    setJobsPipelineFilter({
      id: pipeline.id,
      name: pipeline.name,
    });
    setAppliedJobsStatusFilter("");
    setJobsStatusFilter("");
    setSelectedJobId("");

    try {
      const response = await apiRequest<ApiListResponse<JobListItem>>(
        `/jobs?pipelineId=${pipeline.id}&page=1&limit=100`,
        { apiKey },
      );
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Failed to load pipeline jobs.");
    }
  }, [apiKey]);

  const clearJobsPipelineFilter = useCallback(async () => {
    setJobsPipelineFilter(null);

    try {
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      if (jobsStatusFilter) {
        queryParams.set("status", jobsStatusFilter);
      }

      const response = await apiRequest<ApiListResponse<JobListItem>>(`/jobs?${queryParams.toString()}`, {
        apiKey,
      });
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Failed to load jobs.");
    }
  }, [apiKey, jobsStatusFilter]);

  const clearJobsFilters = useCallback(async () => {
    setJobsStatusFilter("");
    setAppliedJobsStatusFilter("");
    setJobsSearchText("");
    setAppliedJobsSearchText("");
    setJobsCreatedDate("");
    setAppliedJobsCreatedDate("");
    setJobsPipelineFilter(null);
    setOverviewError("");

    try {
      const response = await apiRequest<ApiListResponse<JobListItem>>("/jobs?page=1&limit=100", {
        apiKey,
      });
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Failed to load jobs.");
    }
  }, [apiKey]);

  const resetRuntimeData = useCallback(
    async (confirmedApiKey: string): Promise<ResetRuntimeDataResponse> => {
      const response = await apiRequest<ApiSingleResponse<ResetRuntimeDataResponse>>(
        "/admin/reset-runtime-data",
        {
          apiKey: confirmedApiKey,
          method: "POST",
        },
      );

      setJobs([]);
      setDeadLetterJobs([]);
      setLogs([]);
      setSelectedJobId("");
      setSelectedJob(null);
      setJobDetailsError("");
      setSelectedPipelineOperationalStats((current) => ({
        ...current,
        jobsCount: 0,
        failedJobsCount: 0,
        latestActivityAt: null,
      }));

      await Promise.all([loadOverview(true), loadLogs(true)]);

      return response.data;
    },
    [loadLogs, loadOverview],
  );

  const handleRetryJob = useCallback(
    async (jobId: string) => {
      setRetryingJobId(jobId);
      setRetryJobResult(null);

      try {
        const response = await apiRequest<ApiSingleResponse<{ message?: string; status?: string }>>(
          `/jobs/${jobId}/retry`,
          {
            apiKey,
            method: "POST",
          },
        );

        setRetryJobResult({
          type: "success",
          message: response.data?.message || "Job retry triggered.",
        });

        await loadOverview(false);
        await loadJobDetails(jobId, false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to retry job.";

        setRetryJobResult({
          type: "error",
          message:
            message === "Request failed: 404"
              ? "Retry endpoint not available. Restart or rebuild the API service, then try again."
              : message,
        });
      } finally {
        setRetryingJobId("");
      }
    },
    [apiKey, loadJobDetails, loadOverview],
  );

  const handleReplayJob = useCallback(
    async (jobId: string) => {
      setReplayingJobId(jobId);
      setReplayJobResult(null);

      try {
        const response = await apiRequest<ApiSingleResponse<{ newJobId?: string; message?: string }>>(
          `/jobs/${jobId}/replay`,
          {
            apiKey,
            method: "POST",
          },
        );

        setReplayJobResult({
          type: "success",
          message:
            response.data?.message && response.data?.newJobId
              ? `${response.data.message} New job: ${response.data.newJobId}`
              : response.data?.message || "Job replay queued.",
        });

        await loadOverview(false);
      } catch (error) {
        setReplayJobResult({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to replay job.",
        });
      } finally {
        setReplayingJobId("");
      }
    },
    [apiKey, loadOverview],
  );

  const handleRetryDeliveryAttempt = useCallback(
    async (jobId: string, attemptId: number) => {
      setDeliveryActionAttemptId(attemptId);
      setDeliveryActionResult(null);

      try {
        const response = await apiRequest<ApiSingleResponse<{ message?: string }>>(
          `/jobs/${jobId}/delivery-attempts/${attemptId}/retry`,
          {
            apiKey,
            method: "POST",
          },
        );

        setDeliveryActionResult({
          type: "success",
          message: response.data?.message || "Delivery retry scheduled immediately.",
        });

        await loadOverview(false);
        await loadJobDetails(jobId, false);
      } catch (error) {
        setDeliveryActionResult({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to retry delivery attempt.",
        });
      } finally {
        setDeliveryActionAttemptId(null);
      }
    },
    [apiKey, loadJobDetails, loadOverview],
  );

  const handleCancelDeliveryRetry = useCallback(
    async (jobId: string, attemptId: number) => {
      setDeliveryActionAttemptId(attemptId);
      setDeliveryActionResult(null);

      try {
        const response = await apiRequest<ApiSingleResponse<{ message?: string }>>(
          `/jobs/${jobId}/delivery-attempts/${attemptId}/cancel-retry`,
          {
            apiKey,
            method: "POST",
          },
        );

        setDeliveryActionResult({
          type: "success",
          message: response.data?.message || "Delivery retry cancelled.",
        });

        await loadOverview(false);
        await loadJobDetails(jobId, false);
      } catch (error) {
        setDeliveryActionResult({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to cancel delivery retry.",
        });
      } finally {
        setDeliveryActionAttemptId(null);
      }
    },
    [apiKey, loadJobDetails, loadOverview],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
    } catch {
      // localStorage can be blocked in some contexts.
    }
  }, [apiKey]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.autoRefreshEnabled, String(autoRefreshEnabled));
      localStorage.setItem(STORAGE_KEYS.refreshIntervalMs, String(refreshIntervalMs));
      localStorage.setItem(STORAGE_KEYS.retryMaxAttempts, String(retryMaxAttempts));
      localStorage.setItem(STORAGE_KEYS.retryDelayMs, String(retryDelayMs));
    } catch {
      // localStorage can be blocked in some contexts.
    }
  }, [autoRefreshEnabled, refreshIntervalMs, retryDelayMs, retryMaxAttempts]);

  const resetDashboardSettings = useCallback(() => {
    setApiKey("");
    setAutoRefreshEnabled(DEFAULT_AUTO_REFRESH_ENABLED);
    setRefreshIntervalMs(DEFAULT_REFRESH_INTERVAL_MS);
    setRetryMaxAttempts(DEFAULT_RETRY_MAX_ATTEMPTS);
    setRetryDelayMs(DEFAULT_RETRY_DELAY_MS);
    setJobsStatusFilter("");
    setAppliedJobsStatusFilter("");
    setJobsSearchText("");
    setAppliedJobsSearchText("");
    setJobsCreatedDate("");
    setAppliedJobsCreatedDate("");
    setJobsPipelineFilter(null);
    setLogsPipelineFilter("");
    setSelectedJobId("");
    setSelectedPipelineId("");
    setSelectedSecretPipeline(null);
    setSendResult(null);
    setRetryJobResult(null);
    setCreatePipelineResult(null);
    setPipelineSecretResult(null);
    setOverviewError("");
    setLogsError("");
  }, []);

  const clearLocalSettings = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch {
      // localStorage can be blocked in some contexts.
    }

    resetDashboardSettings();
  }, [resetDashboardSettings]);

  useEffect(() => {
    if (activePage !== "logs" && activePage !== "settings") {
      void loadOverview();
    }
  }, [activePage, loadOverview]);

  useEffect(() => {
    if (activePage === "logs") {
      void loadLogs();
    }
  }, [activePage, loadLogs]);

  useEffect(() => {
    if (activePage === "settings") {
      void loadWorkerHealth();
    }
  }, [activePage, loadWorkerHealth]);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      setJobDetailsError("");
      return;
    }

    void loadJobDetails(selectedJobId);
  }, [selectedJobId, loadJobDetails]);

  useEffect(() => {
    if (!selectedPipelineDetailsId) {
      setSelectedPipelineDetails(null);
      setPipelineDetailsError("");
      setSelectedPipelineOperationalStats({
        jobsCount: 0,
        failedJobsCount: 0,
        latestActivityAt: null,
      });
      return;
    }

    void loadPipelineDetails(selectedPipelineDetailsId);
  }, [selectedPipelineDetailsId, loadPipelineDetails]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return;
    }

    const intervalId = setInterval(() => {
      if (activePage === "logs") {
        void loadLogs(true);
        return;
      }

      if (activePage === "settings") {
        void loadWorkerHealth(true);
        return;
      }

      void loadOverview(true);

      if (selectedJobId && activePage === "jobs") {
        void loadJobDetails(selectedJobId, true);
      }

      if (selectedPipelineDetailsId && activePage === "pipelines") {
        void loadPipelineDetails(selectedPipelineDetailsId, true);
      }
    }, refreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [activePage, autoRefreshEnabled, loadLogs, loadOverview, loadJobDetails, loadPipelineDetails, loadWorkerHealth, refreshIntervalMs, selectedJobId, selectedPipelineDetailsId]);

  return {
    apiKey,
    setApiKey,
    stats,
    metrics,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshIntervalMs,
    setRefreshIntervalMs,
    retryMaxAttempts,
    setRetryMaxAttempts,
    retryDelayMs,
    setRetryDelayMs,
    resetDashboardSettings,
    clearLocalSettings,
    pipelines,
    jobs,
    filteredJobs,
    deadLetterJobs,
    jobsStatusFilter,
    setJobsStatusFilter,
    jobsPipelineFilter,
    jobsSearchText,
    setJobsSearchText,
    jobsCreatedDate,
    setJobsCreatedDate,
    appliedJobsStatusFilter,
    appliedJobsSearchText,
    appliedJobsCreatedDate,
    loadingOverview,
    overviewError,
    lastUpdatedAt,
    selectedPipelineId,
    setSelectedPipelineId,
    webhookPayloadText,
    setWebhookPayloadText,
    idempotencyKey,
    setIdempotencyKey,
    sendingWebhook,
    sendResult,
    activePipelines,
    handleSendWebhook,
    handleApplyJobsFilter,
    clearJobsFilters,
    resetRuntimeData,
    showCreatePipelineModal,
    creatingPipeline,
    createPipelineError,
    createPipelineResult,
    createPipelineName,
    setCreatePipelineName,
    createPipelineWebhookPath,
    setCreatePipelineWebhookPath,
    createPipelineDescription,
    setCreatePipelineDescription,
    createPipelineStatus,
    setCreatePipelineStatus,
    createPipelineActionType,
    setCreatePipelineActionType,
    createPipelineActionConfigText,
    setCreatePipelineActionConfigText,
    createPipelineSubscriberUrl,
    setCreatePipelineSubscriberUrl,
    handleOpenCreatePipelineModal,
    handleCloseCreatePipelineModal,
    handleCreatePipeline,
    selectedPipelineDetailsId,
    selectedPipelineDetails,
    loadingPipelineDetails,
    pipelineDetailsError,
    selectedPipelineOperationalStats,
    handleOpenPipelineDetails,
    handleClosePipelineDetails,
    showPipelineSecretModal,
    selectedSecretPipeline,
    rotatingWebhookSecret,
    pipelineSecretError,
    pipelineSecretResult,
    togglingPipelineStatusId,
    handleOpenPipelineSecretModal,
    handleClosePipelineSecretModal,
    handleRotateWebhookSecret,
    handleTogglePipelineStatus,
    handleViewJobsForPipeline,
    clearJobsPipelineFilter,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    loadingJobDetails,
    jobDetailsError,
    retryingJobId,
    retryJobResult,
    handleRetryJob,
    replayingJobId,
    replayJobResult,
    handleReplayJob,
    deliveryActionAttemptId,
    deliveryActionResult,
    handleRetryDeliveryAttempt,
    handleCancelDeliveryRetry,
    loadingLogs,
    logsError,
    workerHealth,
    loadingWorkerHealth,
    workerHealthError,
    logsLevelFilter,
    setLogsLevelFilter,
    logsSourceFilter,
    setLogsSourceFilter,
    logsSearchText,
    setLogsSearchText,
    logsPipelineFilter,
    setLogsPipelineFilter,
    filteredLogs,
    refreshOverview: () => loadOverview(false),
    refreshLogs: () => loadLogs(false),
  };
}
