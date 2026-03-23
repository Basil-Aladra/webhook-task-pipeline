# CONTEXT.md

## 1. Project Overview
- **Project name:** Webhook-Driven Task Processing Pipeline
- **Purpose:** This monorepo implements a webhook ingestion system that accepts incoming events, stores them as jobs in PostgreSQL, processes them asynchronously in a worker, and delivers processed results to subscriber URLs with retry tracking. It also includes a React dashboard for monitoring pipelines, jobs, retries, metrics, logs-like timelines, and local UI settings.
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
|  |     |  |- jobs/
|  |     |  |  |- jobs.controller.ts # Job list/detail/dead-letter/retry handlers
|  |     |  |  |- jobs.repository.ts # Job queries and manual retry mutation
|  |     |  |  |- jobs.routes.ts     # Job routes
|  |     |  |  |- jobs.types.ts      # Job query/path schemas
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
|  |     |  |  |- LogsPage.tsx         # Logs-like page derived from jobs + attempts
|  |     |  |- Pipelines/
|  |     |  |  |- CreatePipelineModal.tsx # Create pipeline modal
|  |     |  |  |- PipelinesTable.tsx      # Pipelines page table
|  |     |  |- Settings/
|  |     |  |  |- SettingsPage.tsx     # Local dashboard settings page
|  |     |  |- Stats/
|  |     |  |  |- StatsSection.tsx     # Overview metrics cards
|  |     |  |- Webhooks/
|  |     |     |- SendWebhookForm.tsx  # Quick webhook send form
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
|        |  |  |- delivery.service.ts    # Delivery orchestration and retry scheduling
|        |  |  |- http.client.ts         # Built-in fetch wrapper with timeout
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
|     |- seeds/
|        |- 001_demo_pipeline.sql      # Demo pipeline, actions, subscriber seed
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

### Relationships
- `pipeline_actions.pipeline_id -> pipelines.id`
- `pipeline_subscribers.pipeline_id -> pipelines.id`
- `jobs.pipeline_id -> pipelines.id`
- `job_status_history.job_id -> jobs.id`
- `delivery_attempts.job_id -> jobs.id`
- `delivery_attempts.subscriber_id -> pipeline_subscribers.id`

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
| `DELETE` | `/api/v1/pipelines/:pipelineId` | Soft-delete by archiving pipeline; requires `x-api-key` | None | `200 { data: archivedPipeline }` |
| `POST` | `/api/v1/webhooks/:webhookPath` | Public webhook ingestion; rate-limited; optional signature verification | `{ payload: object, idempotencyKey? }` | `202 { data: { jobId, status: "queued", message } }` |
| `GET` | `/api/v1/jobs` | List jobs; requires `x-api-key` | Query: `pipelineId?`, `status?`, `page`, `limit` | `200 { data: jobs[], meta }` |
| `GET` | `/api/v1/jobs/dead-letter` | List jobs with `failed_delivery`; requires `x-api-key` | None | `200 { data: deadLetterJobs[], meta: { total } }` |
| `GET` | `/api/v1/jobs/:jobId` | Get full job details; requires `x-api-key` | None | `200 { data: jobWithStatusHistoryAndDeliveryAttempts }` |
| `POST` | `/api/v1/jobs/:jobId/retry` | Manually retry `failed_processing` or `failed_delivery` jobs; requires `x-api-key` | None | `200 { data: { jobId, status, message } }` |
| `GET` | `/api/v1/metrics` | Aggregate dashboard metrics; requires `x-api-key` | None | `200 { data: metrics }` |

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
- **Current code does not use recursive `setTimeout`:** despite being a common polling pattern, `apps/worker/src/modules/worker/worker.runner.ts` currently uses `setInterval` plus an `isPolling` guard.
- **Current code does not implement exponential backoff:** retry scheduling uses fixed per-subscriber `retry_backoff_ms` via `computeNextRetryAt()` in `delivery.service.ts`.

## 8. Current Status

### Fully implemented and working in code
- PostgreSQL schema migrations and demo seed
- Express API bootstrap, CORS, rate limiting, API key auth, webhook signature verification
- API key generation endpoint
- Full pipeline CRUD API
- Queue-only webhook ingestion with idempotency support
- Job list/detail/dead-letter APIs
- Metrics API
- Manual retry API for failed jobs
- Worker polling, job reservation, action processing, delivery attempts, retry scheduling
- Stale processing job recovery with status-history recording
- Two-worker Docker Compose setup
- React dashboard with pages for:
  - Overview
  - Pipelines
  - Jobs
  - Dead Letters
  - Logs
  - Settings
- Retry action exposed in dashboard Job Inspector and Dead Letter page
- CI typechecks/builds API, worker, and dashboard, then builds Docker images

### Partially implemented
- `packages/shared` exists, but API and worker use duplicated local logger files in `apps/api/src/shared/logger.ts` and `apps/worker/src/shared/logger.ts` instead of importing the workspace package.
- The Logs page is not backed by a real logs API. It synthesizes log entries from `jobs/:id` status history and delivery attempts.
- Settings page includes worker status, but it is a static `Unknown` badge because no worker health endpoint exists.
- Retry settings in the dashboard are local preferences only; they do not update pipeline subscriber retry config in the database.
- `webhookSecret` can be created/updated through the pipeline API, but pipeline read responses and the dashboard do not expose it.
- Legacy static dashboard file `apps/dashboard/index.html` still exists even though the React/Vite app in `apps/dashboard/src` is now the primary UI.

### Planned or implied but not yet built
- No dedicated backend `/logs` endpoint
- No worker health endpoint
- No migration tracking table
- No formal automated test suite beyond `jobs.recovery.test.ts`
- No subscriber authentication settings beyond basic target URL + retry config

## 9. Known Issues
- **Polling implementation differs from intended pattern:** the worker uses `setInterval`, not recursive `setTimeout`, in `worker.runner.ts`. The `isPolling` guard avoids overlap, but long polls can cause skipped intervals rather than rescheduling immediately after completion.
- **Fixed lock expiry with no heartbeat:** `fetchNextJob()` gives a 5-minute lock and `recoverExpiredProcessingJobs()` re-queues expired jobs. Long-running jobs can be recovered too aggressively if they exceed the lock duration.
- **No migration bookkeeping:** `migrate.ts` reruns all SQL files every startup and relies entirely on idempotent SQL. This works now, but it is weaker than storing applied migrations.
- **Auth validation error handling is too broad:** `apps/api/src/modules/auth/auth.controller.ts` catches all errors and returns `500`, including invalid request bodies that should likely be `422`.
- **API key bootstrap endpoint is open:** `POST /api/v1/auth/keys` is intentionally unauthenticated. In a real deployment that should be gated or limited.
- **Shared logger duplication:** `packages/shared/src/logger.ts`, `apps/api/src/shared/logger.ts`, and `apps/worker/src/shared/logger.ts` duplicate the same structured logger implementation.
- **Dashboard API base URL is hardcoded:** `apps/dashboard/src/api/client.ts` always uses `http://localhost:3000/api/v1`, which is fine for local demo use but not flexible for environments.
- **Worker package includes unused dependencies:** `express`, `uuid`, and `zod` are listed in `apps/worker/package.json` but are not used by the worker code.
- **Dead-letter route is implemented but not used by the dashboard:** the dashboard dead-letter page currently derives data from `/jobs?status=failed_delivery` and per-job lookups instead of calling `/jobs/dead-letter`.

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
