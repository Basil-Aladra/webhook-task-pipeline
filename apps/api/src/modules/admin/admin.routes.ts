import { Router } from 'express';
import { resetRuntimeDataHandler } from './admin.controller';

const adminRouter = Router();

adminRouter.post('/admin/reset-runtime-data', resetRuntimeDataHandler);

export default adminRouter;
