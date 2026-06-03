import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../common/middleware';
import { validateBody, validateQuery, validateParams } from '../../common/validation-middleware';
import * as badgesController from './badges.controller';
import { createBadgeSchema, updateBadgeSchema, assignBadgeSchema, badgeQuerySchema } from './badges.validation';

const router = Router();

// Public routes
router.get('/available', validateQuery(badgeQuerySchema), badgesController.getAvailableBadgeTypes);

// User routes (authenticated)
router.post('/apply', authenticate, validateBody(assignBadgeSchema), badgesController.applyForBadge);
router.get('/my', authenticate, badgesController.getUserBadges);

// Admin routes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateQuery(badgeQuerySchema), badgesController.getBadgeTypes);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(createBadgeSchema), badgesController.createBadgeType);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateParams(z.object({ id: z.string().uuid() })), validateBody(updateBadgeSchema), badgesController.updateBadgeType);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateParams(z.object({ id: z.string().uuid() })), badgesController.deleteBadgeType);
router.get('/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), badgesController.getAllUserBadges);
router.post('/give', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(assignBadgeSchema), badgesController.giveBadge);
router.put('/:id/revoke', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateParams(z.object({ id: z.string().uuid() })), badgesController.revokeBadge);
router.put('/:id/toggle-visibility', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateParams(z.object({ id: z.string().uuid() })), badgesController.toggleBadgeVisibility);

export default router;