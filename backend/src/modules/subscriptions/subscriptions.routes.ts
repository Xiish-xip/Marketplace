import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../common/middleware';
import { validateBody, validateQuery, validateParams } from '../../common/validation-middleware';
import * as controller from './subscriptions.controller';
import { createSubscriptionPlanSchema, updateSubscriptionPlanSchema, subscriptionQuerySchema } from './subscriptions.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

router.get('/plans', validateQuery(subscriptionQuerySchema), controller.getPlans);
router.post('/plans', ...admin, validateBody(createSubscriptionPlanSchema), controller.createPlan);
router.put('/plans/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), validateBody(updateSubscriptionPlanSchema), controller.updatePlan);
router.delete('/plans/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), controller.deletePlan);
router.get('/', ...admin, controller.getSubscriptions);

// User endpoints
router.get('/my', authenticate, controller.getUserSubscriptions);

export default router;
