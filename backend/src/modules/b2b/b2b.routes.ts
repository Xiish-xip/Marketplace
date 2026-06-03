import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../common/middleware';
import { validateBody, validateQuery, validateParams } from '../../common/validation-middleware';
import * as controller from './b2b.controller';
import { createB2bBuyerSchema, updateB2bBuyerSchema, b2bQuoteSchema, b2bQuerySchema } from './b2b.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

router.get('/accounts', ...admin, validateQuery(b2bQuerySchema), controller.getAccounts);
router.post('/accounts', ...admin, validateBody(createB2bBuyerSchema), controller.createAccount);
router.put('/accounts/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), validateBody(updateB2bBuyerSchema), controller.updateAccount);
router.delete('/accounts/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), controller.deleteAccount);
router.get('/bulk-pricing', ...admin, controller.getBulkPricing);
router.post('/bulk-pricing', ...admin, validateBody(b2bQuoteSchema), controller.createBulkPricing);
router.get('/purchase-orders', ...admin, controller.getPurchaseOrders);
router.post('/purchase-orders', ...admin, validateBody(b2bQuoteSchema), controller.createPurchaseOrder);
router.put('/purchase-orders/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), controller.updatePurchaseOrder);
router.get('/quote-requests', ...admin, controller.getQuoteRequests);
router.post('/quote-requests', ...admin, validateBody(b2bQuoteSchema), controller.createQuoteRequest);
router.put('/quote-requests/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), controller.updateQuoteRequest);

// User endpoints
router.get('/my-dashboard', authenticate, controller.getUserDashboard);

export default router;
