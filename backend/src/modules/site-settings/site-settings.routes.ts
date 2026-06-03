import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { siteSettingsService } from './site-settings.service';

const router = Router();
const adminAuth = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

router.get('/', ...adminAuth, async (req, res, next) => {
  try {
    const settings = await siteSettingsService.get();
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

router.put('/', ...adminAuth, async (req, res, next) => {
  try {
    const settings = await siteSettingsService.update(req.body);
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

router.get('/public', async (req, res, next) => {
  try {
    const settings = await siteSettingsService.get();
    // Strip internal fields, keep only public-safe ones
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

export default router;