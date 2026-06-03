import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../common/middleware';
import { validateBody, validateQuery, validateParams } from '../../common/validation-middleware';
import * as controller from './analytics.controller';
import { analyticsQuerySchema, customReportSchema, updateCustomReportSchema } from './analytics.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

// Dashboard widgets
router.get('/widgets', ...admin, controller.getWidgets);
router.post('/widgets', ...admin, validateBody(customReportSchema), controller.createWidget);
router.put('/widgets/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), validateBody(updateCustomReportSchema), controller.updateWidget);
router.delete('/widgets/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), controller.deleteWidget);

// Report templates
router.get('/reports', ...admin, controller.getReports);
router.post('/reports', ...admin, validateBody(customReportSchema), controller.createReport);

// Events
router.get('/events', ...admin, validateQuery(analyticsQuerySchema), controller.getEvents);
router.post('/events', validateBody(z.object({ name: z.string().min(1), payload: z.record(z.any()) })), controller.createEvent);

// Dashboard summary stats
router.get('/summary', ...admin, controller.getSummary);

router.post('/export', ...admin, validateBody(z.object({ format: z.enum(['csv','json']).optional().default('csv'), query: z.record(z.any()).optional() })), controller.exportCSV);

export default router;
