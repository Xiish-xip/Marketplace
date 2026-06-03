import { Router } from 'express';
import { authenticate } from '../../common/middleware';
import * as controller from './referrals.controller';

const router = Router();

// Public routes
router.get('/program', controller.getReferralProgram);

// User routes (authenticated)
router.get('/my', authenticate, controller.getUserReferrals);
router.get('/stats', authenticate, controller.getReferralStats);
router.post('/generate-code', authenticate, controller.generateReferralCode);

export default router;
