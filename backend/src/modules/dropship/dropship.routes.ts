import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { dropshipService } from './dropship.service';
import { integrationEngine } from '../providers/integration-engine';
import { fulfillmentEngine } from './fulfillment-engine';
import { inventorySyncEngine } from './inventory-sync-engine';
import { pricingEngine } from './pricing-engine';
import { shippingEngine } from './shipping-engine';
import { returnsEngine } from './returns-engine';
import { financeEngine } from './finance-engine';
import { dropshipAnalyticsEngine } from './analytics-engine';
import { dropshipAutomationEngine } from './automation-engine';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];
const seller = [authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN')];
const authenticated = [authenticate];
const customer = [authenticate, authorize('CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN')];

function actor(req: any) {
  return {
    userId: req.user?.userId || req.user?.id,
    role: req.user?.role,
  };
}

// ═══════════════════════════════════════════════
//  SELLER DROPSHIPPING ACCESS
// ═══════════════════════════════════════════════

// Check seller dropship access
router.get('/access', ...seller, async (req, res, next) => {
  try {
    const userId = actor(req).userId;
    res.json({ success: true, data: await dropshipService.getSellerAccess(userId) });
  } catch (e) { next(e); }
});

// Get seller's application
router.get('/application', ...seller, async (req, res, next) => {
  try {
    const userId = actor(req).userId;
    const access = await dropshipService.getSellerAccess(userId);
    res.json({ success: true, data: access.application });
  } catch (e) { next(e); }
});

// Apply for dropshipping access
router.post('/apply', ...seller, async (req, res, next) => {
  try {
    const userId = actor(req).userId;
    res.status(201).json({ success: true, data: await dropshipService.applyForAccess(userId, req.body) });
  } catch (e) { next(e); }
});

// Seller dashboard
router.get('/seller-dashboard', ...seller, async (req, res, next) => {
  try {
    const userId = actor(req).userId;
    const access = await dropshipService.getSellerAccess(userId);
    res.json({ success: true, data: await dropshipService.getSellerDashboard(access.sellerId) });
  } catch (e) { next(e); }
});

// Seller connections
router.get('/my-connections', ...seller, async (req, res, next) => {
  try {
    const userId = actor(req).userId;
    const access = await dropshipService.getSellerAccess(userId);
    res.json({ success: true, data: await dropshipService.getSellerConnections(access.sellerId) });
  } catch (e) { next(e); }
});

// Seller orders
router.get('/my-orders', ...seller, async (req, res, next) => {
  try {
    const userId = actor(req).userId;
    const access = await dropshipService.getSellerAccess(userId);
    const orders = await dropshipService.getSellerOrders(access.sellerId);
    res.json({ success: true, data: { orders } });
  } catch (e) { next(e); }
});

// Seller search provider catalog
router.post('/connections/:id/search', ...seller, async (req, res, next) => {
  try {
    const { prisma } = require('../../common/prisma');
    const connection = await prisma.providerConnection.findUnique({
      where: { id: req.params.id },
      include: { adapter: true },
    });
    if (!connection) return res.status(404).json({ success: false, message: 'Connection not found' });

    const adapter = integrationEngine.getAdapter(connection.adapter.provider);
    const config = {
      ...JSON.parse(connection.config || '{}'),
      ...JSON.parse(connection.credentials || '{}'),
    };

    const result = await adapter.searchProducts(config, {
      keyword: req.body.keyword,
      categoryId: req.body.categoryId,
      page: Number(req.body.page) || 1,
      pageSize: Math.min(Number(req.body.pageSize) || 20, 50),
    });

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Seller import products
router.post('/connections/:id/import-products', ...seller, async (req, res, next) => {
  try {
    const result = await integrationEngine.importProducts(req.params.id, {
      keyword: req.body.keyword,
      maxProducts: Math.min(Number(req.body.maxProducts) || 20, 50),
    });
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Seller test connection
router.post('/connections/:id/test', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await integrationEngine.testConnection(req.params.id) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  FULFILLMENT AUTOMATION
// ═══════════════════════════════════════════════

router.post('/fulfillment/auto-route/:orderId', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await fulfillmentEngine.autoRouteOrder(req.params.orderId, req.body || {}) });
  } catch (e) { next(e); }
});

router.post('/fulfillment/batch-process', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await fulfillmentEngine.batchProcess(req.body.orderIds || [], req.body.options || req.body || {}) });
  } catch (e) { next(e); }
});

router.get('/fulfillment/queue', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await fulfillmentEngine.getQueue(req.query as any) });
  } catch (e) { next(e); }
});

router.get('/fulfillment/:id', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await fulfillmentEngine.getFulfillment(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/fulfillment/:id/hold', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await fulfillmentEngine.holdFulfillment(req.params.id, req.body.reason) });
  } catch (e) { next(e); }
});

router.post('/fulfillment/:id/release', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await fulfillmentEngine.releaseFulfillment(req.params.id) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  INVENTORY SYNC
// ═══════════════════════════════════════════════

router.post('/sync/start', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await inventorySyncEngine.startScheduledSync(req.body || {}) });
  } catch (e) { next(e); }
});

router.post('/sync/stop', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: inventorySyncEngine.stopScheduledSync(req.body.key || req.body.connectionId || 'all') });
  } catch (e) { next(e); }
});

router.post('/sync/connections/:id', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await inventorySyncEngine.forceSyncConnection(req.params.id, req.body.type || 'INVENTORY') });
  } catch (e) { next(e); }
});

router.post('/sync/products', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await inventorySyncEngine.forceSyncProducts(req.body.mappingIds || []) });
  } catch (e) { next(e); }
});

router.get('/sync/jobs', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await inventorySyncEngine.getJobs(req.query as any) });
  } catch (e) { next(e); }
});

router.get('/sync/alerts', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await inventorySyncEngine.getAlerts({ ...(req.query as any), openOnly: req.query.openOnly === 'true' }) });
  } catch (e) { next(e); }
});

router.post('/back-in-stock/:mappingId', ...customer, async (req, res, next) => {
  try {
    res.json({ success: true, data: await inventorySyncEngine.subscribeBackInStock(req.params.mappingId, actor(req).userId, req.body.email) });
  } catch (e) { next(e); }
});

router.get('/inventory/health/:supplierId', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await inventorySyncEngine.supplierHealth(req.params.supplierId) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  SMART PRICING
// ═══════════════════════════════════════════════

router.get('/pricing-rules/evaluate/:mappingId', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.evaluatePrice(req.params.mappingId, req.query as any) });
  } catch (e) { next(e); }
});

router.post('/pricing-rules/recalculate', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.recalculatePrices(req.body || {}) });
  } catch (e) { next(e); }
});

router.get('/pricing-rules', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.listRules(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/pricing-rules', ...admin, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await pricingEngine.createRule(req.body) });
  } catch (e) { next(e); }
});

router.get('/pricing-rules/:id', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.getRule(req.params.id) });
  } catch (e) { next(e); }
});

router.put('/pricing-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.updateRule(req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.delete('/pricing-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.deleteRule(req.params.id) });
  } catch (e) { next(e); }
});

router.get('/pricing/margin-report', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.marginReport(req.query as any) });
  } catch (e) { next(e); }
});

router.get('/pricing/competitor/:productSku', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.competitorPrices(req.params.productSku) });
  } catch (e) { next(e); }
});

router.post('/pricing/competitor/track', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await pricingEngine.trackCompetitor(req.body) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  SHIPPING & LOGISTICS
// ═══════════════════════════════════════════════

router.get('/shipping-zones', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.listZones(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/shipping-zones', ...admin, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await shippingEngine.createZone(req.body) });
  } catch (e) { next(e); }
});

router.get('/shipping-zones/:id', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.getZone(req.params.id) });
  } catch (e) { next(e); }
});

router.put('/shipping-zones/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.updateZone(req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.delete('/shipping-zones/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.deleteZone(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/shipping/rates', ...authenticated, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.calculateRates(req.body) });
  } catch (e) { next(e); }
});

router.post('/shipping/label', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.generateLabel(req.body) });
  } catch (e) { next(e); }
});

router.post('/shipping/labels/batch', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.generateBatchLabels(req.body.items || []) });
  } catch (e) { next(e); }
});

router.get('/tracking/:orderId', ...authenticated, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.getTracking(req.params.orderId) });
  } catch (e) { next(e); }
});

router.post('/tracking/webhook/:carrier', async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.handleTrackingWebhook(req.params.carrier, req.body) });
  } catch (e) { next(e); }
});

router.get('/shipping/customs/:dropshipOrderId', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.generateCustomsDocument(req.params.dropshipOrderId) });
  } catch (e) { next(e); }
});

router.post('/shipping/insurance/quote', ...authenticated, async (req, res, next) => {
  try {
    res.json({ success: true, data: await shippingEngine.insuranceQuote(req.body) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  RETURNS & REFUNDS
// ═══════════════════════════════════════════════

router.get('/returns/analytics', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.analytics(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/returns', ...customer, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await returnsEngine.createReturnRequest(actor(req), req.body) });
  } catch (e) { next(e); }
});

router.get('/returns', ...customer, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.listReturns(actor(req), req.query as any) });
  } catch (e) { next(e); }
});

router.get('/returns/:id', ...customer, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.getReturn(actor(req), req.params.id) });
  } catch (e) { next(e); }
});

router.post('/returns/:id/approve', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.approve(actor(req), req.params.id, req.body.notes) });
  } catch (e) { next(e); }
});

router.post('/returns/:id/reject', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.reject(actor(req), req.params.id, req.body.reason) });
  } catch (e) { next(e); }
});

router.post('/returns/:id/refund', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.refund(actor(req), req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.post('/returns/:id/label', ...customer, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.generateReturnLabel(actor(req), req.params.id, req.body.carrierCode) });
  } catch (e) { next(e); }
});

router.post('/returns/:id/dispute', ...customer, async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnsEngine.openDispute(actor(req), req.params.id, req.body.reason) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  FINANCIAL OPERATIONS
// ═══════════════════════════════════════════════

router.get('/finance/dashboard', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.dashboard() });
  } catch (e) { next(e); }
});

router.get('/finance/payouts', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.listPayouts(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/finance/payouts/process', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.processPendingPayouts(req.body || {}) });
  } catch (e) { next(e); }
});

router.get('/finance/payouts/:id', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.getPayout(req.params.id) });
  } catch (e) { next(e); }
});

router.get('/finance/invoices', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.listInvoices(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/finance/invoices/:id/generate-pdf', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.generateInvoicePdf(req.params.id) });
  } catch (e) { next(e); }
});

router.get('/finance/commissions', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.listCommissions(req.query as any) });
  } catch (e) { next(e); }
});

router.get('/finance/escrow/:orderId', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.escrowStatus(req.params.orderId) });
  } catch (e) { next(e); }
});

router.get('/finance/tax-rules', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.listTaxRules(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/finance/tax-rules', ...admin, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await financeEngine.createTaxRule(req.body) });
  } catch (e) { next(e); }
});

router.put('/finance/tax-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.updateTaxRule(req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.delete('/finance/tax-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.deleteTaxRule(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/finance/tax/calculate', ...authenticated, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.calculateTax(req.body) });
  } catch (e) { next(e); }
});

router.get('/finance/reconciliation', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.reconciliation(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/finance/chargebacks', ...admin, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await financeEngine.createChargeback(req.body) });
  } catch (e) { next(e); }
});

router.get('/finance/profit-report', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await financeEngine.profitReport(req.query as any) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  ANALYTICS & REPORTING
// ═══════════════════════════════════════════════

router.get('/analytics/dashboard', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.dashboard() });
  } catch (e) { next(e); }
});

router.get('/analytics/suppliers/:id/scorecard', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.supplierScorecard(req.params.id) });
  } catch (e) { next(e); }
});

router.get('/analytics/products', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.productPerformance(req.query as any) });
  } catch (e) { next(e); }
});

router.get('/analytics/shipping', ...seller, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.shippingAnalytics() });
  } catch (e) { next(e); }
});

router.get('/analytics/customers', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.customerAnalytics() });
  } catch (e) { next(e); }
});

router.get('/analytics/profit-loss', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.profitLoss(req.query as any) });
  } catch (e) { next(e); }
});

router.get('/analytics/inventory-forecast', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.inventoryForecast(req.query as any) });
  } catch (e) { next(e); }
});

router.get('/analytics/alerts', ...seller, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.listAlertRules() });
  } catch (e) { next(e); }
});

router.post('/analytics/alerts', ...admin, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await dropshipAnalyticsEngine.createAlertRule(req.body) });
  } catch (e) { next(e); }
});

router.put('/analytics/alerts/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.updateAlertRule(req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.delete('/analytics/alerts/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.deleteAlertRule(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/analytics/reports/generate', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.generateCustomReport(req.body) });
  } catch (e) { next(e); }
});

router.get('/analytics/reports/scheduled', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.scheduledReports() });
  } catch (e) { next(e); }
});

router.get('/analytics/export/:reportId', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAnalyticsEngine.exportReport(req.params.reportId, req.query.format as string) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  AUTOMATION & SMART ROUTING
// ═══════════════════════════════════════════════

router.get('/automation-rules', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.listAutomations(req.query as any) });
  } catch (e) { next(e); }
});

router.post('/automation-rules', ...admin, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await dropshipAutomationEngine.createAutomation(req.body) });
  } catch (e) { next(e); }
});

router.put('/automation-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.updateAutomation(req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.delete('/automation-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.deleteAutomation(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/automation-rules/:id/run', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.runAutomation(req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.post('/automation/payment-captured/:orderId', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.handlePaymentCaptured(req.params.orderId) });
  } catch (e) { next(e); }
});

router.post('/automation/onboarding/:applicationId', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.runSupplierOnboarding(req.params.applicationId) });
  } catch (e) { next(e); }
});

router.post('/automation/quality-check', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.runQualityCheck(req.body || {}) });
  } catch (e) { next(e); }
});

router.post('/automation/performance-reviews', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.generatePerformanceReviews() });
  } catch (e) { next(e); }
});

router.post('/automation/abandoned-cart-recovery', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.abandonedCartRecovery() });
  } catch (e) { next(e); }
});

router.get('/routing-rules', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.listRoutingRules() });
  } catch (e) { next(e); }
});

router.post('/routing-rules', ...admin, async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await dropshipAutomationEngine.createRoutingRule(req.body) });
  } catch (e) { next(e); }
});

router.put('/routing-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.updateRoutingRule(req.params.id, req.body) });
  } catch (e) { next(e); }
});

router.delete('/routing-rules/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.deleteRoutingRule(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/routing/preview', ...seller, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipAutomationEngine.routeProduct(req.body) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  ADMIN DROPSHIP APPLICATION MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/applications', ...admin, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    if (status === 'PENDING') {
      return res.json({ success: true, data: await dropshipService.getPendingApplications() });
    }
    res.json({ success: true, data: await dropshipService.getAllApplications(Number(page), Number(limit)) });
  } catch (e) { next(e); }
});

router.post('/applications/:id/approve', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipService.reviewApplication(req.params.id, 'APPROVED', req.body.adminNotes) });
  } catch (e) { next(e); }
});

router.post('/applications/:id/reject', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await dropshipService.reviewApplication(req.params.id, 'REJECTED', req.body.adminNotes) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  LEGACY ENDPOINTS
// ═══════════════════════════════════════════════

router.get('/suppliers', ...admin, async (req, res, next) => {
  try { const data = await dropshipService.getSuppliers(); res.json({ success: true, data }); } catch (e) { next(e); }
});

router.get('/mappings', ...admin, async (req, res, next) => {
  try { const data = await dropshipService.getMappings(req.query.supplierId as string); res.json({ success: true, data }); } catch (e) { next(e); }
});

router.get('/orders', ...admin, async (req, res, next) => {
  try { const data = await dropshipService.getOrders(req.query.supplierId as string); res.json({ success: true, data }); } catch (e) { next(e); }
});

router.get('/automations', ...admin, async (req, res, next) => {
  try { const data = await dropshipService.getAutomations(req.query.supplierId as string); res.json({ success: true, data }); } catch (e) { next(e); }
});

router.post('/automations', ...admin, async (req, res, next) => {
  try { const data = await dropshipService.createAutomation(req.body); res.json({ success: true, data }); } catch (e) { next(e); }
});

export default router;
