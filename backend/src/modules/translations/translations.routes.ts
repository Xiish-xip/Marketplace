import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../common/middleware';
import { validateBody, validateQuery, validateParams } from '../../common/validation-middleware';
import { translationsController } from './translations.controller';
import { createTranslationSchema, updateTranslationSchema, translationQuerySchema, addLanguageSchema, updateLanguageSchema } from './translations.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

// Languages
router.get('/languages', validateQuery(translationQuerySchema), async (req, res, next) => { translationsController.getLanguages(req, res, next); });
router.post('/languages', ...admin, validateBody(addLanguageSchema), async (req, res, next) => { translationsController.createLanguage(req, res, next); });
router.put('/languages/:code', ...admin, validateParams(z.object({ code: z.string().min(2).max(8) })), validateBody(updateLanguageSchema), async (req, res, next) => { translationsController.updateLanguage(req, res, next); });
router.delete('/languages/:code', ...admin, validateParams(z.object({ code: z.string().min(2).max(8) })), async (req, res, next) => { translationsController.deleteLanguage(req, res, next); });

// Translation keys
router.get('/keys', ...admin, async (req, res, next) => { translationsController.getTranslationKeys(req, res, next); });
router.get('/groups', ...admin, async (req, res, next) => { translationsController.getGroups(req, res, next); });
router.post('/keys', ...admin, validateBody(createTranslationSchema), async (req, res, next) => { translationsController.createTranslationKey(req, res, next); });
router.put('/keys/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), validateBody(updateTranslationSchema), async (req, res, next) => { translationsController.updateTranslationKey(req, res, next); });
router.delete('/keys/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), async (req, res, next) => { translationsController.deleteTranslationKey(req, res, next); });

// Translation values
router.put('/values/:keyId', ...admin, validateParams(z.object({ keyId: z.string().uuid() })), validateBody(updateTranslationSchema), async (req, res, next) => { translationsController.setTranslationValue(req, res, next); });
router.delete('/values/:id', ...admin, validateParams(z.object({ id: z.string().uuid() })), async (req, res, next) => { translationsController.deleteTranslationValue(req, res, next); });

// Public frontend translations
router.get('/frontend/:lang', async (req, res, next) => { translationsController.getFrontendTranslations(req, res, next); });

// Admin bulk
router.get('/all', async (req, res, next) => { translationsController.getAllTranslations(req, res, next); });
router.post('/bulk-import', ...admin, validateBody(z.object({ namespace: z.string().min(1).max(100), language: z.string().length(2), translations: z.record(z.string()) })), async (req, res, next) => { translationsController.bulkImport(req, res, next); });

export default router;