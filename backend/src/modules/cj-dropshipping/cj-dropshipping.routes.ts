import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as ctrl from './cj-dropshipping.controller';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

// ─── Configuration ───
router.post('/test-connection', ...admin, ctrl.testConnection);
router.post('/configure', ...admin, ctrl.configureSupplier);
router.get('/config', ...admin, ctrl.getConfig);

// ─── Dashboard ───
router.get('/suppliers/:supplierId/dashboard', ...admin, ctrl.getDashboard);

// ─── Products ───
router.get('/suppliers/:supplierId/products/search', ...admin, ctrl.searchProducts);
router.get('/suppliers/:supplierId/products/:pid', ...admin, ctrl.getProductDetail);
router.get('/suppliers/:supplierId/categories', ...admin, ctrl.getCategories);
router.post('/suppliers/:supplierId/import', ...admin, ctrl.importProducts);
router.post('/suppliers/:supplierId/sync-pricing', ...admin, ctrl.syncPricing);
router.post('/suppliers/:supplierId/push-to-store', ...admin, ctrl.pushToStore);
router.get('/suppliers/:supplierId/mappings', ...admin, ctrl.listMappings);

// ─── Warehouses & Shipping ───
router.get('/suppliers/:supplierId/warehouses', ...admin, ctrl.getWarehouses);
router.get('/suppliers/:supplierId/shipping', ...admin, ctrl.getShippingMethods);
router.post('/suppliers/:supplierId/shipping/calculate', ...admin, ctrl.calculateShipping);

// ─── Orders ───
router.get('/suppliers/:supplierId/orders', ...admin, ctrl.listOrders);
router.get('/suppliers/:supplierId/orders/:orderNumber', ...admin, ctrl.getOrderDetail);
router.get('/suppliers/:supplierId/orders/:orderNumber/tracking', ...admin, ctrl.getTrackingInfo);
router.post('/suppliers/:supplierId/orders/:orderId/place', ...admin, ctrl.placeOrder);
router.get('/suppliers/:supplierId/dropship-orders', ...admin, ctrl.listDropshipOrders);

// ─── Webhooks ───
router.post('/webhook', ctrl.receiveWebhook); // Public endpoint for CJ to call
router.post('/suppliers/:supplierId/webhook/register', ...admin, ctrl.registerWebhook);

export default router;