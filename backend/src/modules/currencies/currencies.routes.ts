import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as controller from './currencies.controller';

const router = Router();

// Public endpoints
router.get('/settings', controller.getSettings);
router.get('/rates', controller.getRates);
router.get('/all-rates', controller.getAllRates); // All exchange rates from base currency
router.get('/info', controller.getCurrenciesInfo); // All available currencies with symbols
router.get('/detect', controller.detectCurrency); // Detect currency by IP
router.post('/test-provider', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.testProviderConnection);
router.get('/languages', controller.getLanguages);
router.get('/translations', controller.getTranslations);
router.post('/convert', controller.convert);

// Admin only
router.get('/settings/admin', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.getAdminSettings);
router.put('/settings', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.updateSettings);
router.post('/rates', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.upsertRate);
router.put('/rates/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.updateRate);
router.delete('/rates/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.deleteRate);
router.post('/languages', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.createLanguage);
router.put('/languages/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.updateLanguage);
router.delete('/languages/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.deleteLanguage);
router.post('/translations', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.upsertTranslation);

export default router;
