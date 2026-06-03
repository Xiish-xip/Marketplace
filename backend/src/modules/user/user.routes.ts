import { Router } from 'express';
import { authenticate } from '../../common/middleware';
import * as userController from './user.controller';

const router = Router();

// ── Public routes (no auth needed) ──
router.get('/profile/:id', userController.getPublicProfile);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

// ── Auth-protected routes ──
router.use(authenticate);

// User profile
router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Addresses
router.get('/addresses', userController.getAddresses);
router.post('/addresses', userController.createAddress);
router.put('/addresses/:id', userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

// Preferences
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);

// Follow system
router.post('/:id/follow', userController.followUser);
router.post('/:id/unfollow', userController.unfollowUser);

export default router;
