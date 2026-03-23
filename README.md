# Webhook-Driven Task Processing Pipeline

A TypeScript monorepo that ingests webhooks, queues jobs in PostgreSQL, processes them asynchronously, and delivers results to subscriber URLs with retry tracking.

## 1. Project Title + One-Line Description

**Webhook-Driven Task Processing Pipeline**: a TypeScript monorepo that ingests webhooks, queues jobs in PostgreSQL, processes them asynchronously, and delivers results with retry tracking.

## 2. Architecture Overview

```text
Webhook Sender
     |
     v
POST /api/v1/webhooks/:webhookPath
     |
     v
API Service (Express)
 - validate request
 - create queued job
 - return 202 quickly
     |
     v
PostgreSQL (jobs table)
     |
     v
Worker Service
 - fetch next job (FOR UPDATE SKIP LOCKED)
 - run processors (transform -> enrich -> filter)
 - save result / errors
     |
     v
Delivery Service
 - POST result to pipeline subscribers
 - store delivery attempts
 - retry with backoff
     |
     v
Subscriber URLs
```

### Components

- `API Service`: Pipeline management, webhook ingestion, job tracking APIs.
- `PostgreSQL`: Source of truth for pipelines, jobs, status history, and delivery attempts.
- `Worker Service`: Background processor and delivery executor.
- `GitHub Actions`: CI checks (typecheck, build, docker build).

## 3. Tech Stack

- TypeScript (Node.js 20)
- Express.js
- PostgreSQL (`pg`)
- Zod validation
- Docker + Docker Compose
- GitHub Actions
- Monorepo with npm workspaces

## 4. Project Structure

```text
.
|- apps/
|  |- api/                 # Express API service
|  |  |- src/
|  |     |- db/            # DB pool + migration runner
|  |     |- modules/
|  |        |- pipelines/  # Pipeline CRUD
|  |        |- webhooks/   # Webhook ingestion endpoint
|  |        |- jobs/       # Job tracking APIs
|  |- worker/              # Background worker service
|     |- src/
|        |- db/            # DB pool + pipeline lookups
|        |- modules/
|           |- jobs/       # Job pickup and status updates
|           |- processors/ # transform, enrich, filter
|           |- delivery/   # HTTP delivery + retry persistence
|           |- worker/     # Polling runner + orchestration
|- packages/
|  |- shared/              # Shared package/types scaffold
|- infra/
|  |- postgres/
|     |- migrations/       # SQL schema migrations
|     |- seeds/            # Demo seed data
|- .github/workflows/      # CI workflow
|- docker-compose.yml
|- README.md
```

## 5. Getting Started

### Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Node.js 20+
- npm

### Clone and setup

```bash
git clone <your-repo-url>
cd finalprojectfts
cp .env.example .env
```

### Run with Docker (recommended)

```bash
docker compose up --build
```

Services:

- API: `http://localhost:3000`
- Postgres: `localhost:5432`

### Run locally (development)

```bash
npm install
npm run migrate -w @webhook-pipeline/api
npx ts-node apps/api/src/main.ts
npx ts-node apps/worker/src/main.ts
```

Run API and worker in separate terminals.

### Seed repeatable demo scenarios

Seed three built-in demo pipelines:

- `demo-success`
- `demo-retryable-failure`
- `demo-final-failure`

```bash
npm run demo:seed
```

This creates pipelines wired to built-in subscriber endpoints exposed by the API, so you can demo success, retryable failure, and immediate final failure without external webhook receivers.

If you are seeding from a different runtime network location, set:

```bash
DEMO_SUBSCRIBER_BASE_URL=http://localhost:3000 npm run demo:seed
```

Suggested demo payload:

```json
{
  "payload": {
    "orderId": "demo-1001",
    "customerName": "Alice",
    "amount": 42.5,
    "status": "new"
  },
  "idempotencyKey": "demo-evt-1001"
}
```

### Demo walkthrough

1. Seed the demo pipelines:

```bash
npm run demo:seed
```

2. Use these pipelines for the main scenarios:

- `demo-success`: successful delivery
- `demo-retryable-failure`: retryable failure with pending retries
- `demo-final-failure`: immediate final failure / dead-letter path

3. Send a sample webhook from the dashboard:

- open `Overview`
- in `Send Webhook`, choose one of the demo pipelines
- click `Load Demo Payload`
- click `Send Webhook`

Or use `curl`:

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/demo-success \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "orderId": "demo-1001",
      "customerName": "Alice",
      "amount": 42.5,
      "status": "new"
    },
    "idempotencyKey": "demo-evt-1001"
  }'
```

4. Inspect the result in the dashboard:

- `Overview`: latest job appears quickly
- `Jobs`: open the Job Inspector
- `Job Inspector -> Delivery Diagnostics`: inspect request body, response code, failure reason, and next retry time
- `Job Inspector -> Operator Actions`: inspect manual action audit entries
- `Logs`: inspect persisted API / worker / delivery logs
- `Dead Letters`: inspect final delivery failures

5. Demonstrate manual actions:

- on `demo-retryable-failure`:
  - use `Retry Delivery`
  - use `Cancel Retry`
- on a failed or completed job:
  - use `Replay Job`

After each action, show:

- the updated delivery diagnostics
- the `Operator Actions` section in the Job Inspector
- the lifecycle timeline entry
- the matching audit log on the `Logs` page

## 6. API Reference

Base URL: `http://localhost:3000/api/v1`

### Pipelines

- `POST /pipelines`
- `GET /pipelines`
- `GET /pipelines/:pipelineId`
- `PATCH /pipelines/:pipelineId`
- `PUT /pipelines/:pipelineId/actions`
- `PUT /pipelines/:pipelineId/subscribers`
- `DELETE /pipelines/:pipelineId` (soft delete/archive)

### Webhooks

- `POST /webhooks/:webhookPath`

### Jobs

- `GET /jobs`
- `GET /jobs/:jobId`

### Example: Create pipeline

```bash
curl -X POST http://localhost:3000/api/v1/pipelines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Orders Pipeline",
    "webhookPath": "demo-orders",
    "status": "active",
    "actions": [
      {"orderIndex": 1, "actionType": "transform", "config": {}, "enabled": true},
      {"orderIndex": 2, "actionType": "enrich", "config": {}, "enabled": true},
      {"orderIndex": 3, "actionType": "filter", "config": {"removeFields": ["password"]}, "enabled": true}
    ],
    "subscribers": [
      {
        "targetUrl": "http://localhost:4000/webhooks/results",
        "enabled": true,
        "timeoutMs": 5000,
        "maxRetries": 3,
        "retryBackoffMs": 2000
      }
    ]
  }'
```

### Example: Ingest webhook

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/demo-orders \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "orderId": "abc-123",
      "customer": "alice",
      "password": "secret"
    },
    "idempotencyKey": "evt-1001"
  }'
```

Example response:

```json
{
  "data": {
    "jobId": "9e3183f5-9ef5-4980-b3c9-ef8cfcb7f125",
    "status": "queued",
    "message": "Job queued"
  }
}
```

### Example: List jobs

```bash
curl "http://localhost:3000/api/v1/jobs?page=1&limit=20&status=queued"
```

Example response:

```json
{
  "data": [
    {
      "id": "9e3183f5-9ef5-4980-b3c9-ef8cfcb7f125",
      "pipeline_id": "d6115aca-d882-4de7-bc2d-9e3cc6843d29",
      "status": "queued",
      "received_at": "2026-03-22T20:00:00.000Z",
      "started_at": null,
      "completed_at": null,
      "processing_attempt_count": 0,
      "created_at": "2026-03-22T20:00:00.000Z",
      "updated_at": "2026-03-22T20:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### Example: Job details

```bash
curl http://localhost:3000/api/v1/jobs/9e3183f5-9ef5-4980-b3c9-ef8cfcb7f125
```

Returns job fields + `statusHistory` + `deliveryAttempts`.

## 7. Processing Action Types

- `transform`
  - Converts all string values in the payload to uppercase.
- `enrich`
  - Adds metadata:
    - `processedAt` (ISO timestamp)
    - `source: "webhook-pipeline"`
- `filter`
  - Removes top-level fields listed in `config.removeFields`.
  - Example config: `{ "removeFields": ["password", "secret"] }`

## 8. Job Lifecycle

Status flow:

```text
queued -> processing -> processed -> completed
                           \-> failed_processing
                           \-> failed_delivery
```

### Status meanings

- `queued`: job created by webhook ingestion, waiting for worker.
- `processing`: worker reserved the job and is running processors.
- `processed`: processors succeeded; result is ready for delivery.
- `completed`: all enabled subscribers received result successfully.
- `failed_processing`: processor stage failed.
- `failed_delivery`: at least one subscriber reached final delivery failure.

## 9. Delivery & Retry Logic

1. Worker creates a delivery attempt record per subscriber.
2. Worker sends HTTP POST payload:
   - body: `{ jobId, pipelineId, payload }`
   - timeout: `subscriber.timeout_ms`
3. On `2xx`: attempt is marked `succeeded`.
4. On non-`2xx` or timeout/network error:
   - if `attemptNo < max_retries`: mark `failed_retryable`, set `next_retry_at = now + retry_backoff_ms`
   - else: mark `failed_final`

If any subscriber reaches `failed_final`, job becomes `failed_delivery`.

## 10. Design Decisions

### Why async processing (not synchronous webhook handling)?

Webhook senders should get fast acknowledgements. Heavy work in the request cycle causes timeouts and poor reliability. Returning `202` quickly keeps ingestion robust.

### Why PostgreSQL as queue (instead of Redis/RabbitMQ)?

For this project scope, PostgreSQL keeps architecture simple: one datastore, transactional consistency, fewer moving parts.

### Why `FOR UPDATE SKIP LOCKED`?

It allows multiple workers to poll safely without claiming the same job, while keeping locking logic inside the database.

### Why soft delete for pipelines?

Archiving preserves audit/history and avoids breaking existing job records and references.

### Why modular monorepo?

`apps/api`, `apps/worker`, and shared package structure keeps responsibilities clear while simplifying dependency management and CI.

## 11. CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml`

Pipeline stages:

1. `lint-and-typecheck`
   - install dependencies
   - typecheck API and worker
2. `build`
   - build shared, API, worker
3. `docker-build`
   - build API and worker Docker images

This ensures code quality and deployment readiness on every push/PR to `main`.

## 12. Future Improvements

- Authentication and API keys for admin/webhook endpoints
- Rate limiting for webhook ingestion
- Dashboard UI for pipelines/jobs/attempts
- Metrics endpoint (queue depth, success/failure rates)
- Multiple worker replicas and horizontal scaling tests
- Dead letter queue tooling and replay flow
- Automated retry worker loop for `failed_retryable` deliveries
