import { Router } from 'express';
import {
  demoSubscriberFinalFailureHandler,
  demoSubscriberRetryableFailureHandler,
  demoSubscriberSuccessHandler,
} from './demo.controller';

const demoRouter = Router();

// Lightweight local subscriber endpoints for repeatable demos.
demoRouter.post('/demo/subscribers/success', demoSubscriberSuccessHandler);
demoRouter.post('/demo/subscribers/retryable-failure', demoSubscriberRetryableFailureHandler);
demoRouter.post('/demo/subscribers/final-failure', demoSubscriberFinalFailureHandler);

export default demoRouter;
