import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as controller from './search.controller';
import { validateBody, validateQuery } from '../../common/validation-middleware';
import {
	searchProductsQuerySchema,
	createSynonymSchema,
	updateSynonymSchema,
	createStopWordSchema,
	createFilterTemplateSchema,
	updateFilterTemplateSchema,
} from './search.validation';

const router = Router();

// Public
router.get('/products', validateQuery(searchProductsQuerySchema), controller.searchProducts);
router.get('/filter-templates', controller.getFilterTemplates);
router.get('/synonyms', controller.getSynonyms);
router.get('/stop-words', controller.getStopWords);

// Admin
router.post('/synonyms', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(createSynonymSchema), controller.createSynonym);
router.put('/synonyms/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(updateSynonymSchema), controller.updateSynonym);
router.delete('/synonyms/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.deleteSynonym);
router.post('/stop-words', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(createStopWordSchema), controller.createStopWord);
router.delete('/stop-words/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.deleteStopWord);
router.post('/filter-templates', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(createFilterTemplateSchema), controller.createFilterTemplate);
router.put('/filter-templates/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(updateFilterTemplateSchema), controller.updateFilterTemplate);
router.delete('/filter-templates/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.deleteFilterTemplate);
router.post('/reindex', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.triggerReindex);
router.get('/index-jobs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.getIndexJobs);

export default router;
