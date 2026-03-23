import { Router } from 'express';
import { getWorkerHealthHandler } from './worker.controller';

const workerRouter = Router();

workerRouter.get('/worker/health', getWorkerHealthHandler);

export default workerRouter;
