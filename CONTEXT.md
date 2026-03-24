# Project Features Overview
This document tracks the implemented capabilities of the Webhook-Driven Task Processing Pipeline. It combines the baseline project context with feature-level notes so future contributors and AI assistants can understand the current backend, worker, security, and dashboard behavior without relying on assumptions.

# CONTEXT.md

## 1. Project Overview
- **Project name:** Webhook-Driven Task Processing Pipeline
- **Purpose:** This monorepo implements a webhook ingestion system that accepts incoming events, stores them as jobs in PostgreSQL, processes them asynchronously in a worker, and delivers processed results to subscriber URLs with retry tracking. It also includes a React dashboard for monitoring pipelines, jobs, metrics, logs, worker health, security settings, and demo administration flows.
- **Stack:** TypeScript, SQL, Express.js, React 18, Vite, Tailwind CSS, PostgreSQL, `pg`, Zod, Docker, Docker Compose, GitHub Actions, npm workspaces, Prettier.

## 2. Folder Structure
Source tree below excludes dependency/build/tool-metadata directories: `.git`, `node_modules`, build output, `.zencoder`, and `.zenflow`.

```text
.
|- .env                             # Local runtime variables (not committed to VCS)
|- .env.example                     # Example environment variables for local/Docker runs
|- .github/
|  |- workflows/
|     |- ci.yml                     # CI pipeline: typecheck, build, docker image build
|- .gitignore                       # Ignore rules for Node, env files, build output, editors
|- README.md                        # Project README and setup guide
|- docker-compose.yml               # PostgreSQL + API + two worker containers
|- package-lock.json                # Root npm lockfile
|- package.json                     # Root workspaces and shared scripts
|- prettier.config.cjs              # Prettier formatting rules
|- tsconfig.json                    # Root TS compiler defaults
|- apps/
|  |- api/
|  |  |- Dockerfile                 # API image build
|  |  |- package.json               # API dependencies and scripts
|  |  |- tsconfig.json              # API TS config
|  |  |- src/
|  |     |- db/
|  |     |  |- migrate.ts           # SQL migration runner
|  |     |  |- seed-demo.ts         # Seeds repeatable demo pipelines
|  |     |  |- pool.ts              # PostgreSQL pool for API
|  |     |- main.ts                 # Express app bootstrap and route mounting
|  |     |- middleware/
|  |     |  |- apiKeyAuth.ts        # API key auth for management/query routes
|  |     |  |- rateLimiter.ts       # API and webhook rate limiters
|  |     |  |- verifyWebhookSignature.ts # Optional HMAC verification for webhooks
|  |     |- modules/
|  |     |  |- auth/
|  |     |  |  |- auth.controller.ts # API key creation handler
|  |     |  |  |- auth.routes.ts     # POST /auth/keys
|  |     |  |  |- auth.service.ts    # API key generation and hashing
|  |     |  |- admin/
|  |     |  |  |- admin.controller.ts # Demo/admin reset handler
|  |     |  |  |- admin.repository.ts # Runtime-data reset SQL
|  |     |  |  |- admin.routes.ts     # POST /admin/reset-runtime-data
|  |     |  |- demo/
|  |     |  |  |- demo.controller.ts # Built-in demo subscriber endpoints
|  |     |  |  |- demo.routes.ts     # POST /demo/subscribers/*
|  |     |  |- jobs/
|  |     |  |  |- jobs.controller.ts # Job list/detail/dead-letter/operator-action handlers
|  |     |  |  |- jobs.repository.ts # Job queries and manual replay/retry mutations
|  |     |  |  |- jobs.routes.ts     # Job routes
|  |     |  |  |- jobs.types.ts      # Job query/path schemas
|  |     |  |- logs/
|  |     |  |  |- logs.controller.ts # Logs list handler
|  |     |  |  |- logs.repository.ts # Logs filtering SQL
|  |     |  |  |- logs.routes.ts     # GET /logs
|  |     |  |  |- logs.types.ts      # Logs query schemas
|  |     |  |- metrics/
|  |     |  |  |- metrics.controller.ts # Metrics endpoint handler
|  |     |  |  |- metrics.repository.ts # Aggregate metrics SQL
|  |     |  |  |- metrics.routes.ts     # GET /metrics
|  |     |  |- pipelines/
|  |     |  |  |- pipelines.controller.ts # Pipeline CRUD handlers
|  |     |  |  |- pipelines.repository.ts # Pipeline SQL
|  |     |  |  |- pipelines.routes.ts     # Pipeline routes
|  |     |  |  |- pipelines.service.ts    # Pipeline transactions and domain errors
|  |     |  |  |- pipelines.types.ts      # Pipeline Zod schemas
|  |     |  |- webhooks/
|  |     |     |- webhooks.controller.ts # Webhook ingestion handler
|  |     |     |- webhooks.repository.ts # Webhook job enqueue SQL
|  |     |     |- webhooks.routes.ts     # Public webhook route
|  |     |     |- webhooks.service.ts    # Queue-only webhook ingestion flow
|  |     |     |- webhooks.types.ts      # Webhook body/path schemas
|  |     |- shared/
|  |        |- logger.ts               # Local structured logger copy
|  |- dashboard/
|  |  |- index.html                    # Legacy standalone dashboard file (still present)
|  |  |- package.json                  # Dashboard scripts and frontend deps
|  |  |- postcss.config.js             # PostCSS config
|  |  |- tailwind.config.js            # Tailwind content config
|  |  |- tsconfig.json                 # Dashboard TS config
|  |  |- vite.config.ts                # Vite config
|  |  |- src/
|  |     |- App.tsx                    # Hash-based page shell and page switching
|  |     |- index.css                  # Shared Tailwind utility classes
|  |     |- main.tsx                   # React entry point
|  |     |- api/
|  |     |  |- client.ts               # API base URL and fetch helper with x-api-key
|  |     |- components/
|  |     |  |- DeadLetter/
|  |     |  |  |- DeadLetterQueue.tsx  # Dead-letter page table and retry button
|  |     |  |- Jobs/
|  |     |  |  |- JobDetails.tsx       # Job inspector content rendered inside drawer
|  |     |  |  |- JobsTable.tsx        # Jobs page table and status filter
|  |     |  |- Layout/
|  |     |  |  |- Drawer.tsx           # Reusable off-canvas drawer
|  |     |  |  |- Header.tsx           # Sidebar navigation and quick API key field
|  |     |  |- Logs/
|  |     |  |  |- LogsPage.tsx         # Logs page backed by GET /logs
|  |     |  |- Pipelines/
|  |     |  |  |- CreatePipelineModal.tsx # Create pipeline modal
|  |     |  |  |- PipelineDetails.tsx     # Pipeline inspector drawer content
|  |     |  |  |- PipelineSecretModal.tsx # Webhook secret management modal
|  |     |  |  |- PipelinesTable.tsx      # Pipelines page table
|  |     |  |- Settings/
|  |     |  |  |- SettingsPage.tsx     # Local dashboard settings page
|  |     |  |- Stats/
|  |     |  |  |- StatsSection.tsx     # Overview metrics cards
|  |     |  |- Toast/
|  |     |  |  |- ToastProvider.tsx    # Minimal toast context/state
|  |     |  |  |- ToastViewport.tsx    # Fixed top-right toast stack
|  |     |  |- Webhooks/
|  |     |     |- SendWebhookForm.tsx  # Quick webhook send form with demo helper actions
|  |     |- hooks/
|  |        |- useDashboard.ts         # Main dashboard state, localStorage, and data loading
|  |- worker/
|     |- Dockerfile                    # Worker image build
|     |- package.json                  # Worker deps/scripts
|     |- tsconfig.json                 # Worker TS config
|     |- src/
|        |- main.ts                    # Worker bootstrap
|        |- db/
|        |  |- pipelines.repository.ts # Pipeline/subscriber lookup for worker
|        |  |- pool.ts                 # PostgreSQL pool for worker
|        |- modules/
|        |  |- delivery/
|        |  |  |- delivery.repository.ts # Delivery attempt persistence and claim logic
|        |  |  |- delivery.service.ts    # Delivery orchestration, retry scheduling, Discord formatting
|        |  |  |- http.client.ts         # Built-in fetch wrapper with timeout
|        |  |- health/
|        |  |  |- worker-health.server.ts # Internal worker health HTTP endpoint
|        |  |  |- worker-health.ts        # In-memory worker heartbeat state
|        |  |- jobs/
|        |  |  |- jobs.recovery.test.ts  # Focused stale-job recovery test
|        |  |  |- jobs.repository.ts     # Job pickup, recovery, status updates
|        |  |  |- jobs.types.ts          # Worker job types and enum
|        |  |- processors/
|        |  |  |- enrich.processor.ts    # Enrich action
|        |  |  |- filter.processor.ts    # Filter action
|        |  |  |- processor.interface.ts # Processor contracts
|        |  |  |- processor.registry.ts  # Action type -> processor map
|        |  |  |- transform.processor.ts # Transform action
|        |  |- worker/
|        |     |- worker.runner.ts       # Poll loop, retry claims, delivery state transitions
|        |     |- worker.service.ts      # Runs ordered pipeline actions
|        |- shared/
|           |- logger.ts               # Local structured logger copy
|- infra/
|  |- postgres/
|     |- migrations/
|     |  |- 001_create_pipelines.sql
|     |  |- 002_create_pipeline_actions.sql
|     |  |- 003_create_pipeline_subscribers.sql
|     |  |- 004_create_jobs.sql
|     |  |- 005_create_job_status_history.sql
|     |  |- 006_create_delivery_attempts.sql
|     |  |- 007_add_webhook_secret.sql
|     |  |- 008_create_api_keys.sql
|     |  |- 009_create_logs.sql          # Persisted structured logs
|     |- seeds/
|        |- 001_demo_pipeline.sql      # Legacy demo SQL seed file
|- packages/
|  |- shared/
|     |- package.json                  # Shared package manifest
|     |- tsconfig.json                 # Shared package TS config
|     |- src/
|        |- index.ts                   # Shared exports
|        |- logger.ts                  # Shared structured logger implementation
```

## 3. Architecture
- The API server accepts public webhooks at `POST /api/v1/webhooks/:webhookPath`, validates them, optionally verifies an HMAC signature, inserts a queued row into `jobs`, records the first status-history entry, and returns `202 Accepted` immediately.
- The worker service polls PostgreSQL, reserves work with `FOR UPDATE SKIP LOCKED`, runs pipeline actions in order, stores `result_payload` or `last_error`, then performs outbound subscriber deliveries and records each attempt.
- Failed final deliveries remain visible as `failed_delivery`; retryable delivery attempts are retried by the worker using the `delivery_attempts` table. The API also exposes a manual retry endpoint for failed jobs.
- There are two main runtime processes:
  - **API server** in `apps/api/src/main.ts`
  - **Worker service** in `apps/worker/src/main.ts`
- The dashboard is a separate frontend client, not part of the core backend runtime.

```text
Webhook Sender
    |
    v
POST /api/v1/webhooks/:webhookPath
    |
    v
API Service
  - validate body
  - verify signature if webhook_secret exists
  - insert jobs(status='queued')
  - insert job_status_history(to_status='queued')
  - return 202
    |
    v
PostgreSQL
  pipelines
  pipeline_actions
  pipeline_subscribers
  jobs
  job_status_history
  delivery_attempts
  logs
  api_keys
    |
    v
Worker Service
  - recover expired processing locks
  - claim retryable delivery attempts
  - or fetch next queued job with SKIP LOCKED
  - run processors in order
  - update job status/history
  - deliver to subscribers
    |
    v
Subscriber URLs
```

## 4. Database Schema

### Tables

#### `pipelines`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('active','paused','archived'))`
- `webhook_path TEXT NOT NULL UNIQUE`
- `description TEXT`
- `webhook_secret TEXT DEFAULT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `pipeline_actions`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `pipeline_id UUID NOT NULL REFERENCES pipelines(id)`
- `order_index INT NOT NULL`
- `action_type TEXT NOT NULL CHECK (action_type IN ('transform','enrich','filter'))`
- `config JSONB NOT NULL DEFAULT '{}'::jsonb`
- `enabled BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `pipeline_subscribers`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `pipeline_id UUID NOT NULL REFERENCES pipelines(id)`
- `target_url TEXT NOT NULL`
- `enabled BOOLEAN NOT NULL DEFAULT true`
- `timeout_ms INT NOT NULL DEFAULT 5000`
- `max_retries INT NOT NULL DEFAULT 3`
- `retry_backoff_ms INT NOT NULL DEFAULT 2000`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `jobs`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `pipeline_id UUID NOT NULL REFERENCES pipelines(id)`
- `status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','processed','completed','failed_processing','failed_delivery'))`
- `payload JSONB NOT NULL`
- `idempotency_key TEXT`
- `available_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `locked_at TIMESTAMPTZ`
- `locked_by TEXT`
- `lock_expires_at TIMESTAMPTZ`
- `processing_attempt_count INT NOT NULL DEFAULT 0`
- `result_payload JSONB`
- `last_error JSONB`
- `received_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `started_at TIMESTAMPTZ`
- `completed_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `job_status_history`
- `id BIGSERIAL PRIMARY KEY`
- `job_id UUID NOT NULL REFERENCES jobs(id)`
- `from_status TEXT`
- `to_status TEXT NOT NULL`
- `reason TEXT`
- `actor TEXT NOT NULL DEFAULT 'system'`
- `metadata JSONB`
- `changed_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `delivery_attempts`
- `id BIGSERIAL PRIMARY KEY`
- `job_id UUID NOT NULL REFERENCES jobs(id)`
- `subscriber_id UUID NOT NULL REFERENCES pipeline_subscribers(id)`
- `attempt_no INT NOT NULL DEFAULT 1`
- `status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','succeeded','failed_retryable','failed_final'))`
- `scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `started_at TIMESTAMPTZ`
- `finished_at TIMESTAMPTZ`
- `request_payload JSONB`
- `response_status_code INT`
- `response_body TEXT`
- `error_message TEXT`
- `next_retry_at TIMESTAMPTZ`
- `duration_ms INT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `api_keys`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name TEXT NOT NULL`
- `key_hash TEXT NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `last_used_at TIMESTAMPTZ`
- `revoked_at TIMESTAMPTZ`

#### `logs`
- `id BIGSERIAL PRIMARY KEY`
- `timestamp TIMESTAMPTZ NOT NULL DEFAULT now()`
- `level TEXT NOT NULL CHECK (level IN ('info','warn','error'))`
- `source TEXT NOT NULL CHECK (source IN ('api','worker','delivery','system'))`
- `message TEXT NOT NULL`
- `job_id UUID`
- `pipeline_id UUID`
- `correlation_id TEXT`
- `context JSONB NOT NULL DEFAULT '{}'::jsonb`

### Relationships
- `pipeline_actions.pipeline_id -> pipelines.id`
- `pipeline_subscribers.pipeline_id -> pipelines.id`
- `jobs.pipeline_id -> pipelines.id`
- `job_status_history.job_id -> jobs.id`
- `delivery_attempts.job_id -> jobs.id`
- `delivery_attempts.subscriber_id -> pipeline_subscribers.id`
- `logs` stores optional references to `job_id` and `pipeline_id` but does not currently declare foreign keys for them in SQL

### Constraints and Indexes
- `CREATE EXTENSION IF NOT EXISTS pgcrypto`
- `pipelines.webhook_path` is unique
- `pipeline_actions` unique constraint on `(pipeline_id, order_index)`
- `jobs` partial unique index on `(pipeline_id, idempotency_key)` where `idempotency_key IS NOT NULL`
- `delivery_attempts` unique constraint on `(job_id, subscriber_id, attempt_no)`
- Indexes:
  - `jobs_status_available_at_idx` on `(status, available_at)`
  - `jobs_pipeline_id_created_at_idx` on `(pipeline_id, created_at)`
  - `job_status_history_job_id_changed_at_idx` on `(job_id, changed_at)`
  - `delivery_attempts_job_id_status_next_retry_at_idx` on `(job_id, status, next_retry_at)`
  - `idx_logs_timestamp_desc` on `(timestamp DESC)`
  - `idx_logs_level_source_timestamp` on `(level, source, timestamp DESC)`
  - `idx_logs_job_id_timestamp` on `(job_id, timestamp DESC)`
  - `idx_logs_pipeline_id_timestamp` on `(pipeline_id, timestamp DESC)`

## 5. API Endpoints

| Method | Path | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/health` | Health check used by Docker healthcheck | None | `{ status: "ok" }` |
| `POST` | `/api/v1/auth/keys` | Create a new API key; no auth required | `{ name }` | `201 { data: { id, name, key }, warning }` |
| `POST` | `/api/v1/pipelines` | Create a pipeline with optional actions/subscribers; requires `x-api-key` | `{ name, webhookPath, description?, webhookSecret?, status, actions?, subscribers? }` | `201 { data: pipeline }` |
| `GET` | `/api/v1/pipelines` | List pipelines; requires `x-api-key` | Query: `status?`, `page`, `limit` | `200 { data: pipelines[], meta }` |
| `GET` | `/api/v1/pipelines/:pipelineId` | Get a single pipeline with actions/subscribers; requires `x-api-key` | None | `200 { data: pipeline }` |
| `PATCH` | `/api/v1/pipelines/:pipelineId` | Partial pipeline update; requires `x-api-key` | Any subset of `{ name, webhookPath, description, webhookSecret, status }` | `200 { data: pipeline }` |
| `PUT` | `/api/v1/pipelines/:pipelineId/actions` | Replace all actions for a pipeline; requires `x-api-key` | `{ actions: [...] }` | `200 { data: pipeline }` |
| `PUT` | `/api/v1/pipelines/:pipelineId/subscribers` | Replace all subscribers for a pipeline; requires `x-api-key` | `{ subscribers: [...] }` | `200 { data: pipeline }` |
| `POST` | `/api/v1/pipelines/:pipelineId/webhook-secret/rotate` | Generate or rotate a pipeline webhook secret; requires `x-api-key` | None | `200 { data: { pipelineId, webhookSecret, hasWebhookSecret } }` |
| `DELETE` | `/api/v1/pipelines/:pipelineId` | Soft-delete by archiving pipeline; requires `x-api-key` | None | `200 { data: archivedPipeline }` |
| `POST` | `/api/v1/webhooks/:webhookPath` | Public webhook ingestion; rate-limited; optional signature verification | `{ payload: object, idempotencyKey? }` | `202 { data: { jobId, status: "queued", message } }` |
| `POST` | `/api/v1/demo/subscribers/success` | Built-in local subscriber endpoint that always returns success for demo flows | Generic delivery JSON body | `200 { data: { scenario: "success", message } }` |
| `POST` | `/api/v1/demo/subscribers/retryable-failure` | Built-in local subscriber endpoint that always returns a retryable failure for demos | Generic delivery JSON body | `500 { error: { code: "DEMO_RETRYABLE_FAILURE", message } }` |
| `POST` | `/api/v1/demo/subscribers/final-failure` | Built-in local subscriber endpoint that always fails; use with low retry count for dead-letter demos | Generic delivery JSON body | `500 { error: { code: "DEMO_FINAL_FAILURE", message } }` |
| `GET` | `/api/v1/jobs` | List jobs; requires `x-api-key` | Query: `pipelineId?`, `status?`, `page`, `limit` | `200 { data: jobs[], meta }` |
| `GET` | `/api/v1/jobs/dead-letter` | List jobs with `failed_delivery`; requires `x-api-key` | None | `200 { data: deadLetterJobs[], meta: { total } }` |
| `GET` | `/api/v1/jobs/:jobId` | Get full job details; requires `x-api-key` | None | `200 { data: jobWithStatusHistoryAndDeliveryAttempts }` |
| `POST` | `/api/v1/jobs/:jobId/retry` | Manually retry `failed_processing` or `failed_delivery` jobs; requires `x-api-key` | None | `200 { data: { jobId, status, message } }` |
| `POST` | `/api/v1/jobs/:jobId/replay` | Create a fresh queued copy of a completed/failed job; requires `x-api-key` | None | `200 { data: { originalJobId, newJobId, status, message } }` |
| `POST` | `/api/v1/jobs/:jobId/delivery-attempts/:attemptId/retry` | Re-arm a failed delivery attempt immediately; requires `x-api-key` | None | `200 { data: { jobId, attemptId, status, message } }` |
| `POST` | `/api/v1/jobs/:jobId/delivery-attempts/:attemptId/cancel-retry` | Cancel a pending delivery retry and finalize failure if needed; requires `x-api-key` | None | `200 { data: { jobId, attemptId, status, message } }` |
| `GET` | `/api/v1/logs` | Query persisted structured logs; requires `x-api-key` | Query: `level?`, `source?`, `jobId?`, `pipelineId?`, `search?`, `limit` | `200 { data: logs[], meta: { total, limit } }` |
| `GET` | `/api/v1/metrics` | Aggregate dashboard metrics; requires `x-api-key` | None | `200 { data: metrics }` |
| `GET` | `/api/v1/worker/health` | Proxy worker heartbeat/uptime info; requires `x-api-key` | None | `200 { data: { status, workerId, lastHeartbeat, uptimeSeconds } }` |
| `POST` | `/api/v1/admin/reset-runtime-data` | Delete runtime demo data while keeping pipelines/config; requires `x-api-key` | None | `200 { data: { deletedDeliveryAttempts, deletedJobStatusHistory, deletedJobs, deletedLogs, message } }` |

Common error shape:

```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## 6. Processing Actions

### `transform`
- **Implementation:** `apps/worker/src/modules/processors/transform.processor.ts`
- **Behavior:** Recursively converts all string values to uppercase.
- **Example input:**

```json
{
  "orderId": "abc-123",
  "customer": {
    "name": "alice"
  }
}
```

- **Example output:**

```json
{
  "orderId": "ABC-123",
  "customer": {
    "name": "ALICE"
  }
}
```

### `enrich`
- **Implementation:** `apps/worker/src/modules/processors/enrich.processor.ts`
- **Behavior:** Adds `metadata.processedAt` and `metadata.source = "webhook-pipeline"`.
- **Example input:**

```json
{
  "orderId": "123"
}
```

- **Example output:**

```json
{
  "orderId": "123",
  "metadata": {
    "processedAt": "2026-03-23T12:00:00.000Z",
    "source": "webhook-pipeline"
  }
}
```

### `filter`
- **Implementation:** `apps/worker/src/modules/processors/filter.processor.ts`
- **Behavior:** Removes top-level fields listed in `config.removeFields`.
- **Example config:**

```json
{
  "removeFields": ["password", "secret"]
}
```

- **Example input:**

```json
{
  "orderId": "123",
  "password": "hidden",
  "secret": "token"
}
```

- **Example output:**

```json
{
  "orderId": "123"
}
```

## 7. Key Design Decisions
- **Webhook ingestion returns `202 Accepted`:** `apps/api/src/modules/webhooks/webhooks.controller.ts` only queues work and intentionally avoids synchronous processing. This matches the code and keeps webhook response time short.
- **PostgreSQL is both system of record and queue:** jobs, retries, status history, and delivery state all live in the same database. This simplifies intern-project operations and transactional behavior.
- **`FOR UPDATE SKIP LOCKED` is used for concurrency:** job pickup in `apps/worker/src/modules/jobs/jobs.repository.ts` and retry-claiming in `apps/worker/src/modules/delivery/delivery.repository.ts` both use row locking to prevent duplicate work across multiple workers.
- **JSONB is used for event payloads and flexible configs:** `jobs.payload`, `jobs.result_payload`, `jobs.last_error`, `pipeline_actions.config`, `job_status_history.metadata`, and `delivery_attempts.request_payload` are JSONB to support variable event shapes and action configs without schema churn.
- **Migrations rely on `IF NOT EXISTS`:** all migrations are written to be idempotent because `apps/api/src/db/migrate.ts` reruns every `.sql` file on startup and does not store migration history in a separate table.
- **Optional webhook signatures are per-pipeline:** `verifyWebhookSignature.ts` reads `pipelines.webhook_secret` by `webhook_path`; if no secret exists, verification is skipped.
- **API keys are stored hashed, not plaintext:** `auth.service.ts` generates `wpk_...` keys, stores only a SHA-256 hash, and `apiKeyAuth.ts` updates `last_used_at` on valid use.
- **Manual retry reuses existing worker flow:** `POST /jobs/:jobId/retry` does not process inline. It re-queues failed processing jobs or re-arms failed delivery attempts so the worker consumes them through existing logic.
- **Manual replay preserves audit history:** `POST /jobs/:jobId/replay` creates a brand-new queued job instead of mutating the original record, which keeps the original job timeline intact.
- **Demo scenarios are built into the API:** lightweight demo subscriber endpoints plus `apps/api/src/db/seed-demo.ts` provide repeatable success, retryable-failure, and final-failure flows without external receivers.
- **Current code does not use recursive `setTimeout`:** despite being a common polling pattern, `apps/worker/src/modules/worker/worker.runner.ts` currently uses `setInterval` plus an `isPolling` guard.
- **Current code does not implement exponential backoff:** retry scheduling uses fixed per-subscriber `retry_backoff_ms` via `computeNextRetryAt()` in `delivery.service.ts`.

## 8. Current Status

### Fully implemented and working in code
- PostgreSQL schema migrations for pipelines, subscribers, jobs, delivery attempts, webhook secrets, API keys, and persisted logs
- Express API bootstrap with CORS, rate limiting, API key auth, and webhook signature verification
- API key generation endpoint
- Full pipeline CRUD API, including action/subscriber replacement and webhook secret rotation
- Queue-only webhook ingestion with idempotency support
- Job list/detail/dead-letter APIs, manual retry API, replay API, per-attempt retry/cancel APIs, and job lifecycle history
- Metrics API, persisted Logs API, worker health API, built-in demo subscriber endpoints, and demo reset API
- Worker polling, job reservation, stale-lock recovery, ordered action processing, delivery attempts, retry scheduling, and Discord webhook formatting
- Structured logging persisted to PostgreSQL from API and worker
- React dashboard with pages for Overview, Pipelines, Jobs, Dead Letters, Logs, and Settings
- Drawer-based Job Details and Pipeline Details inspectors
- Webhook secret management, pipeline status toggle, advanced filtering, toast notifications, explicit operator-action audit visibility, and reset-demo-data flow in the dashboard
- Demo helper flows:
  - built-in demo subscriber endpoints
  - repeatable `seed:demo` script
  - Send Webhook helper with pipeline webhook URL copy and sample payload loader
- CI typechecks/builds API, worker, and dashboard, then builds Docker images

### Partially implemented
- `packages/shared` exists, but API and worker still use duplicated local logger files in `apps/api/src/shared/logger.ts` and `apps/worker/src/shared/logger.ts`.
- Retry settings in the dashboard Settings page are local UI preferences only; they do not change subscriber retry configuration stored in PostgreSQL.
- Legacy static dashboard file `apps/dashboard/index.html` still exists even though the React/Vite app in `apps/dashboard/src` is the primary UI.
- Worker health is proxied from a small internal worker HTTP server rather than being stored centrally.
- `infra/postgres/seeds/001_demo_pipeline.sql` still exists as a legacy SQL seed even though the primary repeatable demo setup now comes from `apps/api/src/db/seed-demo.ts`.

### Planned or implied but not yet built
- No migration tracking table
- No broad automated integration/E2E test suite beyond targeted typechecks and `jobs.recovery.test.ts`
- No subscriber authentication configuration beyond target URL and retry settings
- No per-user auth/RBAC model beyond shared API keys

## 9. Known Issues
- **Polling implementation uses `setInterval`:** `worker.runner.ts` uses `setInterval` plus an `isPolling` guard. It is safe for this project, but long polls can cause skipped intervals rather than rescheduling immediately after completion.
- **Fixed lock expiry plus separate heartbeat systems:** job locks and worker health heartbeats are separate concerns. A very long-running job can still be re-queued if it exceeds the 5-minute job lock TTL.
- **No migration bookkeeping:** `migrate.ts` reruns all SQL files every startup and relies entirely on idempotent SQL. This works now, but it is weaker than storing applied migrations.
- **Auth validation error handling is too broad:** `apps/api/src/modules/auth/auth.controller.ts` catches all errors and returns `500`, including invalid request bodies that should likely be `422`.
- **API key bootstrap endpoint is open:** `POST /api/v1/auth/keys` is intentionally unauthenticated. In a real deployment that should be gated or limited.
- **Shared logger duplication:** `packages/shared/src/logger.ts`, `apps/api/src/shared/logger.ts`, and `apps/worker/src/shared/logger.ts` duplicate the same structured logger implementation.
- **Dashboard API base URL is hardcoded:** `apps/dashboard/src/api/client.ts` always uses `http://localhost:3000/api/v1`, which is fine for local demo use but not flexible for environments.
- **Worker package includes unused dependencies:** `express`, `uuid`, and `zod` are listed in `apps/worker/package.json` but are not used by the worker code.
- **Worker health proxy depends on reachable internal worker URL:** `GET /api/v1/worker/health` tries configured candidate URLs and returns `unknown` if the worker health server is unreachable.

## 10. Rules for AI Assistants
- Always use TypeScript for new application code.
- Do not add new libraries without asking first.
- Do not change the database schema without creating a new migration file in `infra/postgres/migrations/`.
- Do not modify the overall `docker-compose.yml` service structure without asking first.
- Always maintain the existing folder structure and module boundaries.
- Explain every decision made, especially if it affects API contracts, job state transitions, retry behavior, or database writes.
- Base changes on the React dashboard in `apps/dashboard/src/*`; treat `apps/dashboard/index.html` as legacy.
- Preserve the existing response format conventions:
  - success list: `{ data: [...], meta: {...} }`
  - success single: `{ data: {...} }`
  - error: `{ error: { code, message, details? } }`
- Reuse existing worker flow instead of adding synchronous processing in the API.
- Keep migrations idempotent because the current migration runner reruns all `.sql` files on startup.

## Feature: Pipeline Status Toggle

### Description
The dashboard now allows users to switch pipelines between `active` and `paused` directly from the Pipelines table and the Pipeline Details drawer without opening an edit form.

### Backend Changes
- No new backend endpoint was added.
- The dashboard reuses the existing `PATCH /api/v1/pipelines/:pipelineId` pipeline update API with a partial body containing only `status`.

### Frontend Changes
- `apps/dashboard/src/hooks/useDashboard.ts`
  - added `handleTogglePipelineStatus()`
  - added `togglingPipelineStatusId` loading state
  - updates pipeline list state and selected pipeline details state after success
- `apps/dashboard/src/components/Pipelines/PipelinesTable.tsx`
  - added `Activate` / `Pause` action in the table
  - shows `Updating...` while the request is in flight
- `apps/dashboard/src/components/Pipelines/PipelineDetails.tsx`
  - added the same status action in the drawer quick-actions area
- `apps/dashboard/src/App.tsx`
  - wired the new props into the table and drawer

### How it works
When a user clicks the toggle action, the dashboard computes the next status (`active` or `paused`) and sends a `PATCH` request for that pipeline. On success, the dashboard updates both the Pipelines table row and the currently opened Pipeline Details drawer state so the UI stays in sync.

### Demo Usage
Open `#/pipelines`, click `Activate` on a paused pipeline or `Pause` on an active pipeline, and show the success toast plus the immediate status update in the table. Then open the same pipeline in the drawer and demonstrate the same toggle from the quick-actions section.

## Feature: Webhook Ingestion and Pipeline System

### Description
The system accepts webhooks through per-pipeline public endpoints, validates them, optionally verifies an HMAC signature, and queues them for asynchronous processing instead of handling them inline.

### Backend Changes
- `POST /api/v1/pipelines`, `GET /api/v1/pipelines`, `GET /api/v1/pipelines/:pipelineId`, `PATCH /api/v1/pipelines/:pipelineId`, `PUT /api/v1/pipelines/:pipelineId/actions`, `PUT /api/v1/pipelines/:pipelineId/subscribers`, `DELETE /api/v1/pipelines/:pipelineId`
- `POST /api/v1/webhooks/:webhookPath`
- Pipeline CRUD logic in `apps/api/src/modules/pipelines/*`
- Queue-only webhook ingestion in `apps/api/src/modules/webhooks/*`
- Optional HMAC verification in `apps/api/src/middleware/verifyWebhookSignature.ts`

### Frontend Changes
- Pipelines management page in `apps/dashboard/src/components/Pipelines/PipelinesTable.tsx`
- Create pipeline modal in `apps/dashboard/src/components/Pipelines/CreatePipelineModal.tsx`
- Quick Send Webhook form in `apps/dashboard/src/components/Webhooks/SendWebhookForm.tsx`

### How it works
Each pipeline defines a `webhook_path`, processing actions, and subscriber endpoints. A webhook request is validated, optionally verified against `webhook_secret`, inserted into `jobs` with `queued` status, and returned as `202 Accepted` without synchronous processing.

### Demo Usage
Create a pipeline in the dashboard, copy its webhook path, send a webhook from the Overview page, and show that the API immediately queues the job instead of processing it inline.

## Feature: Job Queue and Background Worker Processing

### Description
Queued jobs are processed by the worker service, which claims work safely from PostgreSQL, runs pipeline actions in order, and persists processing results.

### Backend Changes
- Worker polling and orchestration in `apps/worker/src/modules/worker/worker.runner.ts`
- Job reservation and state transitions in `apps/worker/src/modules/jobs/jobs.repository.ts`
- Ordered action execution in `apps/worker/src/modules/worker/worker.service.ts`
- Processor implementations in `apps/worker/src/modules/processors/*`

### Frontend Changes
- Overview metrics and latest jobs in the dashboard
- Jobs page and job inspector consume the resulting job data

### How it works
The worker uses `FOR UPDATE SKIP LOCKED` to claim one queued job at a time, marks it `processing`, runs `transform`, `enrich`, and `filter` actions in `order_index` order, and stores either `result_payload` or `last_error`.

### Demo Usage
Send a webhook, then show the Jobs page changing from `queued` to `processing` to `processed`/`completed` while the worker logs and status history update.

## Feature: Retry Mechanism and Dead-Letter Handling

### Description
Delivery retries are tracked explicitly, failed final deliveries remain visible as dead-letter jobs, and failed jobs can be retried manually from the API and dashboard.

### Backend Changes
- Delivery attempt persistence in `apps/worker/src/modules/delivery/delivery.repository.ts`
- Delivery orchestration and retry scheduling in `apps/worker/src/modules/delivery/delivery.service.ts`
- Manual retry endpoint `POST /api/v1/jobs/:jobId/retry`
- Dead-letter endpoint `GET /api/v1/jobs/dead-letter`

### Frontend Changes
- Dead Letters page in `apps/dashboard/src/components/DeadLetter/DeadLetterQueue.tsx`
- Retry actions in Dead Letter Queue and Job Details drawer

### How it works
Each subscriber delivery creates a `delivery_attempts` row. Retryable failures move to `failed_retryable` with `next_retry_at`; permanent failures become `failed_final`. Jobs with permanent delivery failure remain in `failed_delivery` and can be manually retried through the existing worker flow.

### Demo Usage
Use a failing subscriber URL to produce a `failed_delivery` job, show it on the Dead Letters page, then click `Retry` and demonstrate the job being re-armed and reprocessed.

## Feature: Job Lifecycle Tracking

### Description
Every significant job state transition is recorded so the system can explain how a job moved through the queue, processing, retries, and delivery outcomes.

### Backend Changes
- `job_status_history` table and repository queries in `apps/api/src/modules/jobs/jobs.repository.ts`
- Worker status-history inserts in `apps/worker/src/modules/jobs/jobs.repository.ts`
- Initial `queued` history creation in `apps/api/src/modules/webhooks/webhooks.repository.ts`

### Frontend Changes
- Job Details drawer in `apps/dashboard/src/components/Jobs/JobDetails.tsx`
- Timeline UI inside the job inspector using `statusHistory` and `deliveryAttempts`

### How it works
The API writes the first `queued` transition, the worker records processing and completion/failure transitions, and manual retry flows append additional entries. The dashboard merges these records into a vertical lifecycle timeline.

### Demo Usage
Open a completed or failed job in the Job Details drawer and walk through the timeline from `queued` to the final outcome, including retry events.

## Feature: Logs System

### Description
Structured runtime logs are persisted in PostgreSQL, exposed through a dedicated API, and displayed in a dashboard Logs page with filters.

### Backend Changes
- `logs` table in `infra/postgres/migrations/009_create_logs.sql`
- `GET /api/v1/logs`
- Logs repository/controller/routes in `apps/api/src/modules/logs/*`
- API and worker structured loggers persist to `logs` in `apps/api/src/shared/logger.ts` and `apps/worker/src/shared/logger.ts`

### Frontend Changes
- Logs page in `apps/dashboard/src/components/Logs/LogsPage.tsx`
- Logs data loading and API filter wiring in `apps/dashboard/src/hooks/useDashboard.ts`

### How it works
The API and worker still log JSON to stdout, but now also insert log rows into PostgreSQL with `level`, `source`, `message`, and optional job/pipeline/correlation references. The dashboard queries `/api/v1/logs` with filter parameters instead of reconstructing logs from job history.

### Demo Usage
Open `#/logs`, filter by `source=worker` or a `jobId`, then trigger a webhook and show new log entries appearing for ingestion, processing, and delivery.

## Feature: Worker Health Monitoring

### Description
The worker exposes a lightweight heartbeat and uptime signal, and the API proxies that information so the dashboard can display worker status.

### Backend Changes
- Internal worker health state in `apps/worker/src/modules/health/worker-health.ts`
- Internal worker health HTTP server in `apps/worker/src/modules/health/worker-health.server.ts`
- API endpoint `GET /api/v1/worker/health` in `apps/api/src/modules/worker/*`

### Frontend Changes
- Worker health display in the Settings page system-info card
- Health loading/error handling in `apps/dashboard/src/hooks/useDashboard.ts`

### How it works
The worker updates an in-memory heartbeat and uptime snapshot while running. A small internal HTTP endpoint returns this snapshot, and the API tries configured worker-health URLs and falls back to `unknown` if the worker is unreachable.

### Demo Usage
Open Settings while the worker is running to show `Running`, `lastHeartbeat`, and `uptimeSeconds`. Stop the worker and refresh to show the fallback `Unknown` state.

## Feature: Webhook Secret Management

### Description
Pipelines can manage webhook secrets safely from the dashboard without exposing stored secrets through normal read endpoints.

### Backend Changes
- Pipeline reads expose `hasWebhookSecret` instead of the raw secret
- Secret rotation endpoint `POST /api/v1/pipelines/:pipelineId/webhook-secret/rotate`
- Secret generation/rotation logic in `apps/api/src/modules/pipelines/pipelines.service.ts`

### Frontend Changes
- Secret status in the pipelines table
- Secret management modal in `apps/dashboard/src/components/Pipelines/PipelineSecretModal.tsx`
- Secret rotation/generation flow in `apps/dashboard/src/hooks/useDashboard.ts`

### How it works
Normal pipeline reads only reveal whether a secret exists. When a user explicitly rotates or generates a secret, the API returns the new raw secret once so the dashboard can show, hide, and copy it immediately.

### Demo Usage
Open the Pipelines page, click `Manage Secret`, generate or rotate a secret, and explain that the raw value is only revealed on that explicit action.

## Feature: Pipeline Details Drawer

### Description
Pipeline details are shown in a dedicated inspector drawer so users can inspect pipeline configuration without overcrowding the main pipelines table.

### Backend Changes
- No new backend endpoint; the feature reuses `GET /api/v1/pipelines/:pipelineId`
- Operational stats reuse existing jobs APIs filtered by `pipelineId`

### Frontend Changes
- `apps/dashboard/src/components/Pipelines/PipelineDetails.tsx`
- Selection and loading logic in `apps/dashboard/src/hooks/useDashboard.ts`
- Reusable drawer shell in `apps/dashboard/src/components/Layout/Drawer.tsx`

### How it works
Selecting a pipeline opens a right-side drawer that loads the full pipeline definition, including actions, subscribers, webhook-secret status, and lightweight operational counts such as total jobs and failed jobs.

### Demo Usage
Click a pipeline row, open the inspector, and show actions, subscriber URLs, secret status, and quick actions such as `Manage Secret` and `View Jobs`.

## Feature: Job Details Drawer with Timeline UI

### Description
The Jobs page uses an off-canvas inspector for selected jobs, including a vertical timeline that visualizes status transitions and delivery retries.

### Backend Changes
- No new endpoint; the drawer reuses `GET /api/v1/jobs/:jobId`
- Timeline data comes from existing `statusHistory` and `deliveryAttempts`

### Frontend Changes
- Reusable drawer in `apps/dashboard/src/components/Layout/Drawer.tsx`
- Job inspector in `apps/dashboard/src/components/Jobs/JobDetails.tsx`
- Dedicated Operator Actions section inside the job inspector for replay/retry/cancel audit entries

### How it works
The Jobs page table remains stable while the drawer opens over the page. The inspector shows payloads, result payloads, retry actions, delivery attempts, an explicit operator-audit section, and a color-coded timeline derived from job status history plus delivery attempt outcomes and manual action log entries.

### Demo Usage
Open a job from the Jobs page and show the right-side inspector opening as an off-canvas drawer. Use a failed job to highlight retry and failure timeline entries, then perform a manual operator action and show it appearing in both the Operator Actions section and the lifecycle timeline.

## Feature: Manual Operator Actions

### Description
Operators can act on failed or completed work directly from the dashboard by replaying jobs, retrying failed deliveries, or cancelling pending retries.

### Backend Changes
- `POST /api/v1/jobs/:jobId/retry`
- `POST /api/v1/jobs/:jobId/replay`
- `POST /api/v1/jobs/:jobId/delivery-attempts/:attemptId/retry`
- `POST /api/v1/jobs/:jobId/delivery-attempts/:attemptId/cancel-retry`
- Transactional state handling and audit logging in `apps/api/src/modules/jobs/jobs.repository.ts` and `apps/api/src/modules/jobs/jobs.controller.ts`

### Frontend Changes
- Confirmation UX and action buttons in `apps/dashboard/src/components/Jobs/JobDetails.tsx`
- Action handlers and loading state in `apps/dashboard/src/hooks/useDashboard.ts`
- Toast-based success/error feedback for operator actions

### How it works
Replay creates a brand-new queued job so the original audit trail remains unchanged. Delivery retry re-arms a failed attempt immediately. Cancel retry finalizes a pending retry if needed. Each action validates current state, records audit logs, refreshes job details, and updates the dashboard view.

### Demo Usage
Open a failed job, click `Retry Delivery` or `Cancel Retry`, confirm the action, and show the updated delivery diagnostics. Then use `Replay Job` on a failed or completed job and show the new queued job plus the audit entry in the inspector and Logs page.

## Feature: Demo Seed and Built-In Demo Subscribers

### Description
The project includes built-in demo subscriber endpoints and a repeatable seed script so common success and failure scenarios can be reproduced quickly without external webhook receivers.

### Backend Changes
- Demo routes in `apps/api/src/modules/demo/demo.routes.ts`
- Demo controllers in `apps/api/src/modules/demo/demo.controller.ts`
- Repeatable demo seed script in `apps/api/src/db/seed-demo.ts`
- Root script `npm run demo:seed` delegates to `apps/api` demo seeding

### Frontend Changes
- The dashboard reuses the seeded pipelines directly; no dedicated demo page was added
- The Send Webhook form includes a small helper for loading a sample payload and copying the selected webhook URL

### How it works
`seed-demo.ts` creates three active demo pipelines: `demo-success`, `demo-retryable-failure`, and `demo-final-failure`. Each pipeline points to a built-in API subscriber endpoint that intentionally succeeds or fails, making retries, dead letters, and operator controls easy to demonstrate repeatedly.

### Demo Usage
Run `npm run demo:seed`, open the dashboard, and use the Send Webhook helper on the seeded pipelines to demonstrate successful delivery, retryable failure, final failure, and the follow-up operator actions.

## Feature: Advanced Filtering for Jobs and Logs

### Description
The dashboard supports stronger filtering and search for operational views without changing backend contracts unnecessarily.

### Backend Changes
- Jobs page continues to use existing jobs API filters (`pipelineId`, `status`)
- Logs page uses existing logs API filters (`level`, `source`, `jobId`, `pipelineId`, `search`)

### Frontend Changes
- Jobs filters in `apps/dashboard/src/components/Jobs/JobsTable.tsx`
- Logs filters in `apps/dashboard/src/components/Logs/LogsPage.tsx`
- Filter state and applied values in `apps/dashboard/src/hooks/useDashboard.ts`

### How it works
Jobs use a combination of backend filtering and client-side refinement for search/date matching. Logs use the real `/logs` API query params directly. Both pages surface active filters clearly and offer `Clear Filters`.

### Demo Usage
Filter jobs by status or pipeline, then switch to Logs and filter by `source=delivery` plus a pipeline ID to show targeted troubleshooting flows.

## Feature: Toast Notification System

### Description
The dashboard replaces blocking or inline-only feedback with reusable non-blocking toast notifications.

### Backend Changes
- No backend changes

### Frontend Changes
- `apps/dashboard/src/components/Toast/ToastProvider.tsx`
- `apps/dashboard/src/components/Toast/ToastViewport.tsx`
- Toast usage in Settings, Pipeline Secret management, Send Webhook, retry flows, and pipeline status toggles

### How it works
A lightweight toast provider manages short-lived messages rendered in a fixed top-right viewport. Toasts support success, error, and info states, auto-dismiss after a few seconds, and can be manually closed.

### Demo Usage
Copy an API key or webhook secret, send a webhook, or pause/activate a pipeline and show the corresponding toast without interrupting the workflow.

## Feature: Discord Webhook Delivery Support

### Description
The worker now formats deliveries specifically for Discord incoming webhooks while keeping the original generic delivery payload for non-Discord subscribers.

### Backend Changes
- Discord detection and payload formatting in `apps/worker/src/modules/delivery/delivery.service.ts`
- No schema or endpoint changes

### Frontend Changes
- No dedicated dashboard UI changes; the feature is visible through delivery outcomes and logs

### How it works
If a subscriber URL matches a Discord incoming webhook URL, the worker sends `{ content: "<formatted text>" }` instead of the generic `{ jobId, pipelineId, payload }` body. The message content is built from the processed payload fields such as `orderId`, `customerName`, `amount`, and `status`.

### Demo Usage
Configure a Discord webhook subscriber, send a test event, and show the formatted Discord message plus the successful delivery attempt in the dashboard.

## Feature: SQL Injection Protection and Query Hardening

### Description
Repository query builders were reviewed and hardened so dynamic SQL fragments are restricted to explicit allowlists rather than informal string assembly.

### Backend Changes
- Hardened repositories:
  - `apps/api/src/modules/logs/logs.repository.ts`
  - `apps/api/src/modules/jobs/jobs.repository.ts`
  - `apps/api/src/modules/pipelines/pipelines.repository.ts`
  - `apps/worker/src/modules/jobs/jobs.repository.ts`
  - `apps/worker/src/modules/delivery/delivery.repository.ts`
- Added explicit allowlist maps for dynamic filter/update column names

### Frontend Changes
- No frontend changes

### How it works
Values were already parameterized with PostgreSQL placeholders. The hardening work addresses the remaining maintenance risk by ensuring dynamic `WHERE` and `SET` fragments can only emit approved column names, preventing future feature changes from accidentally introducing SQL injection through string-built clauses.

### Demo Usage
This is not a visual demo feature. Mention it briefly as a backend hardening pass that preserved behavior while removing unsafe dynamic SQL patterns.
