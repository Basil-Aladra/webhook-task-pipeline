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
export type DashboardPage = "overview" | "pipelines" | "jobs" | "dead-letters" | "logs";
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

export type PipelineListItem = {
  id: string;
  name: string;
  status: PipelineStatus;
  webhookPath: string;
  actionsCount: number;
  subscribersCount: number;
};

export type JobListItem = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  created_at: string;
};

export type DeliveryAttempt = {
  id: number;
  attempt_no: number;
  target_url: string;
  status: string;
  response_status_code: number | null;
  error_message?: string | null;
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

const DEFAULT_WEBHOOK_PAYLOAD = `{
  "orderId": "123",
  "customerName": "John",
  "amount": 99.99
}`;

function mapStatusTransitionLevel(toStatus: string): LogLevel {
  if (toStatus === "failed_processing" || toStatus === "failed_delivery") {
    return "error";
  }
  if (toStatus === "processing") {
    return "warn";
  }
  return "info";
}

function mapDeliveryAttemptLevel(status: string): LogLevel {
  if (status === "failed_final") {
    return "error";
  }
  if (status === "failed_retryable") {
    return "warn";
  }
  return "info";
}

function mapActorToSource(actor: string): LogSource {
  const normalizedActor = actor.toLowerCase();
  if (normalizedActor.includes("worker")) return "worker";
  if (normalizedActor.includes("api")) return "api";
  return "system";
}

export function useDashboard(activePage: DashboardPage = "overview") {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("dashboardApiKey") || "";
    } catch {
      return "";
    }
  });

  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [deadLetterJobs, setDeadLetterJobs] = useState<DeadLetterJob[]>([]);
  const [jobsStatusFilter, setJobsStatusFilter] = useState<string>("");
  const [appliedJobsStatusFilter, setAppliedJobsStatusFilter] = useState<string>("");
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

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [loadingJobDetails, setLoadingJobDetails] = useState<boolean>(false);
  const [jobDetailsError, setJobDetailsError] = useState<string>("");
  const [retryingJobId, setRetryingJobId] = useState<string>("");
  const [retryJobResult, setRetryJobResult] = useState<SendResult>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string>("");
  const [logsLevelFilter, setLogsLevelFilter] = useState<"" | LogLevel>("");
  const [logsSourceFilter, setLogsSourceFilter] = useState<"" | LogSource>("");
  const [logsSearchText, setLogsSearchText] = useState<string>("");

  const activePipelines = useMemo(
    () => pipelines.filter((pipeline) => pipeline.status === "active"),
    [pipelines],
  );

  const filteredLogs = useMemo(() => {
    const normalizedSearch = logsSearchText.trim().toLowerCase();

    return logs.filter((entry) => {
      if (logsLevelFilter && entry.level !== logsLevelFilter) {
        return false;
      }

      if (logsSourceFilter && entry.source !== logsSourceFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        entry.message,
        entry.jobId || "",
        entry.pipelineId || "",
        entry.correlationId || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [logs, logsLevelFilter, logsSourceFilter, logsSearchText]);

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoadingOverview(true);
      }
      setOverviewError("");

      try {
        const jobsListPath = appliedJobsStatusFilter
          ? `/jobs?status=${encodeURIComponent(appliedJobsStatusFilter)}&page=1&limit=100`
          : "/jobs?page=1&limit=100";

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
    [apiKey, appliedJobsStatusFilter],
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
    setOverviewError("");

    try {
      const jobsPath = jobsStatusFilter
        ? `/jobs?status=${encodeURIComponent(jobsStatusFilter)}&page=1&limit=100`
        : "/jobs?page=1&limit=100";

      const jobsResponse = await apiRequest<ApiListResponse<JobListItem>>(jobsPath, { apiKey });
      setJobs(Array.isArray(jobsResponse.data) ? jobsResponse.data : []);
    } catch (error) {
      setOverviewError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data. Check API availability and CORS settings.",
      );
    }
  }, [apiKey, jobsStatusFilter]);

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

  const loadLogs = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoadingLogs(true);
      }
      setLogsError("");

      try {
        const jobsResponse = await apiRequest<ApiListResponse<JobListItem>>("/jobs?page=1&limit=30", {
          apiKey,
        });
        const recentJobs = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];

        const detailedJobs = await Promise.all(
          recentJobs.map(async (job) => {
            try {
              const response = await apiRequest<ApiSingleResponse<JobDetails>>(`/jobs/${job.id}`, { apiKey });
              return response.data;
            } catch {
              return null;
            }
          }),
        );

        const logEntries: LogEntry[] = [];
        let counter = 0;

        detailedJobs.forEach((job) => {
          if (!job) {
            return;
          }

          const correlationId = job.idempotency_key || null;

          (job.statusHistory || []).forEach((historyItem) => {
            const transition = historyItem.from_status
              ? `${historyItem.from_status} -> ${historyItem.to_status}`
              : historyItem.to_status;
            const reason = historyItem.reason ? ` (${historyItem.reason})` : "";

            logEntries.push({
              id: `${job.id}-history-${historyItem.id}-${counter++}`,
              timestamp: historyItem.changed_at,
              level: mapStatusTransitionLevel(historyItem.to_status),
              source: mapActorToSource(historyItem.actor),
              message: `Status transition ${transition}${reason}`,
              jobId: job.id,
              pipelineId: job.pipeline_id,
              correlationId,
            });
          });

          (job.deliveryAttempts || []).forEach((attempt) => {
            const responseInfo =
              typeof attempt.response_status_code === "number"
                ? ` (HTTP ${attempt.response_status_code})`
                : "";
            const errorInfo = attempt.error_message ? ` - ${attempt.error_message}` : "";
            const timestamp =
              attempt.finished_at || attempt.started_at || attempt.scheduled_at || attempt.created_at;

            if (!timestamp) {
              return;
            }

            logEntries.push({
              id: `${job.id}-delivery-${attempt.id}-${counter++}`,
              timestamp,
              level: mapDeliveryAttemptLevel(attempt.status),
              source: "delivery",
              message: `Delivery attempt #${attempt.attempt_no} ${attempt.status}${responseInfo}${errorInfo}`,
              jobId: job.id,
              pipelineId: job.pipeline_id,
              correlationId,
            });
          });
        });

        logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(logEntries.slice(0, 300));
      } catch (error) {
        setLogsError(error instanceof Error ? error.message : "Failed to load logs.");
      } finally {
        if (!silent) {
          setLoadingLogs(false);
        }
      }
    },
    [apiKey],
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

  useEffect(() => {
    try {
      localStorage.setItem("dashboardApiKey", apiKey);
    } catch {
      // localStorage can be blocked in some contexts.
    }
  }, [apiKey]);

  useEffect(() => {
    if (activePage !== "logs") {
      void loadOverview();
    }
  }, [activePage, loadOverview]);

  useEffect(() => {
    if (activePage === "logs") {
      void loadLogs();
    }
  }, [activePage, loadLogs]);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      setJobDetailsError("");
      return;
    }

    void loadJobDetails(selectedJobId);
  }, [selectedJobId, loadJobDetails]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (activePage === "logs") {
        void loadLogs(true);
        return;
      }

      void loadOverview(true);
      if (selectedJobId && activePage === "jobs") {
        void loadJobDetails(selectedJobId, true);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activePage, loadLogs, loadOverview, loadJobDetails, selectedJobId]);

  return {
    apiKey,
    setApiKey,
    stats,
    metrics,
    pipelines,
    jobs,
    deadLetterJobs,
    jobsStatusFilter,
    setJobsStatusFilter,
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
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    loadingJobDetails,
    jobDetailsError,
    retryingJobId,
    retryJobResult,
    handleRetryJob,
    loadingLogs,
    logsError,
    logsLevelFilter,
    setLogsLevelFilter,
    logsSourceFilter,
    setLogsSourceFilter,
    logsSearchText,
    setLogsSearchText,
    filteredLogs,
    refreshOverview: () => loadOverview(false),
    refreshLogs: () => loadLogs(false),
  };
}
