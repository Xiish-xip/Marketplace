import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { campaignController } from './campaign.controller';
import { validateBody } from '../../common/validation-middleware';
import { createCampaignSchema, updateCampaignSchema } from './campaign.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

router.get('/', ...admin, async (req, res, next) => { campaignController.list(req, res, next); });
router.get('/active', async (req, res, next) => { campaignController.active(req, res, next); });
router.get('/:id', async (req, res, next) => { campaignController.get(req, res, next); });
router.post('/', ...admin, validateBody(createCampaignSchema), async (req, res, next) => { campaignController.create(req, res, next); });
router.put('/:id', ...admin, validateBody(updateCampaignSchema), async (req, res, next) => { campaignController.update(req, res, next); });
router.delete('/:id', ...admin, async (req, res, next) => { campaignController.remove(req, res, next); });
router.post('/:id/products', ...admin, async (req, res, next) => { campaignController.addProduct(req, res, next); });
router.delete('/:id/products/:productId', ...admin, async (req, res, next) => { campaignController.removeProduct(req, res, next); });

export default router;