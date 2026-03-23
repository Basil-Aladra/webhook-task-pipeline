import { Router } from 'express';
import { getLogsHandler } from './logs.controller';

const logsRouter = Router();

logsRouter.get('/logs', getLogsHandler);

export default logsRouter;
