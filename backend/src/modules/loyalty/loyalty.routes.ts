import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../common/middleware';
import { validateBody, validateQuery, validateParams } from '../../common/validation-middleware';
import { loyaltyService } from './loyalty.service';
import { prisma } from '../../common/prisma';
import { createLoyaltyTransactionSchema, redeemLoyaltyPointsSchema, loyaltyQuerySchema } from './loyalty.validation';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

router.get('/transactions', validateQuery(loyaltyQuerySchema), async (req, res, next) => { try { res.json({ success: true, data: await loyaltyService.getTransactions(req.query.userId as string) }); } catch (e) { next(e); } });
router.post('/transactions', ...admin, validateBody(createLoyaltyTransactionSchema), async (req, res, next) => { try { res.json({ success: true, data: await loyaltyService.createTransaction(req.body) }); } catch (e) { next(e); } });
router.get('/points', authenticate, async (req, res, next) => { try { const user = req.user as any; res.json({ success: true, data: await loyaltyService.getUserPoints(user.userId) }); } catch (e) { next(e); } });

router.get('/my-status', authenticate, async (req, res, next) => {
  try {
    const user = req.user as any;
    const points = await loyaltyService.getUserPoints(user.userId);
    const transactions = await loyaltyService.getTransactions(user.userId);
    res.json({
      success: true,
      data: {
        points: points.balance,
        lifetimePoints: points.earnedPoints,
        earnedPoints: points.earnedPoints,
        redeemedPoints: points.redeemedPoints,
        tier: { name: points.balance > 1000 ? 'Gold' : points.balance > 500 ? 'Silver' : 'Bronze', benefits: [] },
        transactions,
      },
    });
  } catch (e) { next(e); }
});

router.get('/rewards', authenticate, async (req, res, next) => {
  try {
    // Temporarily return empty rewards array; rewards can be configured via admin in the future
    res.json({ success: true, data: [] });
  } catch (e) { next(e); }
});

router.get('/referrals', ...admin, async (req, res, next) => { try { res.json({ success: true, data: await loyaltyService.getReferrals(req.query.referrerId as string) }); } catch (e) { next(e); } });
router.post('/referrals', authenticate, async (req, res, next) => { try { const user = req.user as any; res.json({ success: true, data: await loyaltyService.createReferral({ ...req.body, referrerId: user.userId }) }); } catch (e) { next(e); } });
router.put('/referrals/:id/complete', ...admin, validateParams(z.object({ id: z.string().uuid() })), async (req, res, next) => { try { res.json({ success: true, data: await loyaltyService.completeReferral(req.params.id) }); } catch (e) { next(e); } });

router.get('/stats', ...admin, async (req, res, next) => { try { res.json({ success: true, data: await loyaltyService.getStats() }); } catch (e) { next(e); } });

export default router;