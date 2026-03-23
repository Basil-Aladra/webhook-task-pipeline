import { Router } from 'express';

import { getMetricsHandler } from './metrics.controller';

const metricsRouter = Router();

// Aggregate system metrics for dashboard/monitoring use.
metricsRouter.get('/metrics', getMetricsHandler);

export default metricsRouter;
