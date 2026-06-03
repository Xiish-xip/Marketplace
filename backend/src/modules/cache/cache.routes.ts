import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as controller from './cache.controller';
import { validateBody } from '../../common/validation-middleware';
import { setCacheSchema, clearCacheSchema } from './cache.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

router.get('/configs', ...admin, controller.getConfigs);
router.post('/configs', ...admin, validateBody(setCacheSchema), controller.createConfig);
router.put('/configs/:id', ...admin, validateBody(setCacheSchema), controller.updateConfig);
router.get('/queues', ...admin, controller.getQueues);
router.post('/queues', ...admin, validateBody(setCacheSchema), controller.createQueue);
router.get('/rate-limits', ...admin, controller.getRateLimits);
router.post('/rate-limits', ...admin, validateBody(setCacheSchema), controller.createRateLimit);
router.put('/rate-limits/:id', ...admin, validateBody(setCacheSchema), controller.updateRateLimit);
router.delete('/rate-limits/:id', ...admin, controller.deleteRateLimit);
router.post('/clear', ...admin, validateBody(clearCacheSchema), controller.clearCache);

export default router;
