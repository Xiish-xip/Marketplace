import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { DeliveryController } from './delivery.controller';
import { validateBody, validateQuery } from '../../common/validation-middleware';
import {
	registerDeliveryPersonSchema,
	updateLocationSchema,
	updateAvailabilitySchema,
	createDeliverySchema,
	updateDeliveryPersonSchema,
} from './delivery.validation';

const router = Router();
const controller = new DeliveryController();

router.post('/register', authenticate, authorize('CUSTOMER', 'SELLER', 'DELIVERY', 'ADMIN', 'SUPER_ADMIN'), validateBody(registerDeliveryPersonSchema), controller.register.bind(controller));
router.get('/profile/me', authenticate, authorize('DELIVERY'), controller.getProfile.bind(controller));
router.patch('/location', authenticate, authorize('DELIVERY'), validateBody(updateLocationSchema), controller.updateLocation.bind(controller));
router.patch('/availability', authenticate, authorize('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), validateBody(updateAvailabilitySchema), controller.updateAvailability.bind(controller));

router.get('/available', authenticate, authorize('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), controller.getAvailable.bind(controller));
router.get('/my', authenticate, authorize('DELIVERY'), controller.getMyDeliveries.bind(controller));
router.get('/persons', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.getPersons.bind(controller));
router.get('/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.getStats.bind(controller));
router.patch('/persons/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.updatePerson.bind(controller));

// Admin-only list
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.getAll.bind(controller));

// Named routes — these MUST come before /:id to avoid being matched as an ID
router.get('/seller', authenticate, authorize('SELLER'), controller.getSellerDeliveries.bind(controller));
router.get('/seller/mine', authenticate, authorize('SELLER'), controller.getSellerDeliveries.bind(controller));
router.get('/order/:orderId', authenticate, controller.getByOrder.bind(controller));
router.post('/order/:orderId', authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN'), controller.create.bind(controller));

// Dynamic routes with :id parameter — these come last to avoid catching named routes
router.get('/:id', authenticate, controller.getById.bind(controller));
router.post('/:orderId', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validateBody(createDeliverySchema), controller.create.bind(controller));
router.put('/:id/accept', authenticate, authorize('DELIVERY'), controller.accept.bind(controller));
router.post('/:id/accept', authenticate, authorize('DELIVERY'), controller.accept.bind(controller));
router.put('/:id/pickup', authenticate, authorize('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), controller.pickUp.bind(controller));
router.post('/:id/pickup', authenticate, authorize('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), controller.pickUp.bind(controller));
router.post('/:id/pick-up', authenticate, authorize('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), controller.pickUp.bind(controller));
router.put('/:id/deliver', authenticate, authorize('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), controller.deliver.bind(controller));
router.post('/:id/deliver', authenticate, authorize('DELIVERY', 'ADMIN', 'SUPER_ADMIN'), controller.deliver.bind(controller));
router.put('/:id/confirm', authenticate, controller.confirmReceived.bind(controller));

router.get('/payouts/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.getPayouts.bind(controller));
router.get('/payouts/my', authenticate, authorize('DELIVERY'), controller.getMyPayouts.bind(controller));
router.put('/payouts/:id/pay', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), controller.markPayoutPaid.bind(controller));

export default router;