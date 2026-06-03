import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../common/middleware';
import { validateBody, validateQuery, validateParams } from '../../common/validation-middleware';
import * as controller from './sync.controller';
import { startSyncSchema, syncStatusQuerySchema, syncConfigSchema } from './sync.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

router.get('/jobs', ...admin, validateQuery(syncStatusQuerySchema), controller.getJobs);
router.post('/jobs', ...admin, validateBody(startSyncSchema), controller.createJob);
router.put('/jobs/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), validateBody(syncConfigSchema), controller.updateJob);
router.delete('/jobs/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), controller.deleteJob);
router.get('/logs', ...admin, controller.getLogs);
router.get('/errors', ...admin, controller.getErrors);

export default router;
