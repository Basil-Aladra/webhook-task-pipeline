import dotenv from 'dotenv';
import { Client } from 'pg';
import { logger } from '../shared/logger';

dotenv.config();

type DemoPipelineSeed = {
  name: string;
  webhookPath: string;
  description: string;
  subscriberPath: string;
  maxRetries: number;
};

const DEMO_PIPELINES: DemoPipelineSeed[] = [
  {
    name: 'Demo Orders Pipeline',
    webhookPath: 'demo-orders',
    description: 'Legacy demo pipeline kept in sync with the built-in success scenario.',
    subscriberPath: '/api/v1/demo/subscribers/success',
    maxRetries: 3,
  },
  {
    name: 'Demo Success Pipeline',
    webhookPath: 'demo-success',
    description: 'Delivers successfully to the built-in demo subscriber.',
    subscriberPath: '/api/v1/demo/subscribers/success',
    maxRetries: 3,
  },
  {
    name: 'Demo Retryable Failure Pipeline',
    webhookPath: 'demo-retryable-failure',
    description: 'Forces a retryable delivery failure for retry diagnostics and operator actions.',
    subscriberPath: '/api/v1/demo/subscribers/retryable-failure',
    maxRetries: 3,
  },
  {
    name: 'Demo Final Failure Pipeline',
    webhookPath: 'demo-final-failure',
    description: 'Fails immediately with maxRetries=1 so dead-letter behavior is easy to demo.',
    subscriberPath: '/api/v1/demo/subscribers/final-failure',
    maxRetries: 1,
  },
];

function getDemoSubscriberBaseUrl(): string {
  const explicitBaseUrl = process.env.DEMO_SUBSCRIBER_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, '');
  }

  const apiPort = Number(process.env.API_PORT) || 3000;
  return `http://localhost:${apiPort}`;
}

async function seedPipeline(
  client: Client,
  baseUrl: string,
  pipeline: DemoPipelineSeed,
): Promise<void> {
  const upsertPipelineResult = await client.query<{ id: string }>(
    `
      INSERT INTO pipelines (name, status, webhook_path, description)
      VALUES ($1, 'active', $2, $3)
      ON CONFLICT (webhook_path)
      DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        description = EXCLUDED.description,
        updated_at = now()
      RETURNING id
    `,
    [pipeline.name, pipeline.webhookPath, pipeline.description],
  );

  const pipelineId = upsertPipelineResult.rows[0]?.id;

  if (!pipelineId) {
    throw new Error(`Failed to seed pipeline ${pipeline.webhookPath}.`);
  }

  await client.query('DELETE FROM pipeline_actions WHERE pipeline_id = $1', [pipelineId]);
  await client.query('DELETE FROM pipeline_subscribers WHERE pipeline_id = $1', [pipelineId]);

  await client.query(
    `
      INSERT INTO pipeline_actions (pipeline_id, order_index, action_type, config, enabled)
      VALUES
        ($1, 1, 'validate', '{}'::jsonb, true),
        ($1, 2, 'transform', $2::jsonb, true),
        ($1, 3, 'enrich', $3::jsonb, true)
    `,
    [
      pipelineId,
      JSON.stringify({ rename: { customerName: 'customerName' } }),
      JSON.stringify({ add: { seededScenario: pipeline.webhookPath } }),
    ],
  );

  await client.query(
    `
      INSERT INTO pipeline_subscribers (
        pipeline_id,
        target_url,
        enabled,
        timeout_ms,
        max_retries,
        retry_backoff_ms
      )
      VALUES ($1, $2, true, 5000, $3, 2000)
    `,
    [pipelineId, `${baseUrl}${pipeline.subscriberPath}`, pipeline.maxRetries],
  );

  logger.info('Seeded demo pipeline', {
    pipelineId,
    webhookPath: pipeline.webhookPath,
    targetUrl: `${baseUrl}${pipeline.subscriberPath}`,
  });
}

async function runDemoSeed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Add it to your .env file.');
  }

  const client = new Client({ connectionString: databaseUrl });
  const subscriberBaseUrl = getDemoSubscriberBaseUrl();

  await client.connect();

  try {
    await client.query('BEGIN');

    for (const pipeline of DEMO_PIPELINES) {
      await seedPipeline(client, subscriberBaseUrl, pipeline);
    }

    await client.query('COMMIT');

    logger.info('Demo pipelines seeded successfully', {
      count: DEMO_PIPELINES.length,
      subscriberBaseUrl,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

runDemoSeed().catch((error) => {
  logger.error('Demo seed failed', {}, error);
  process.exit(1);
});
