import { Request, Response, NextFunction } from 'express';
import { deliveryService } from './delivery.service';

export class DeliveryController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const person = await deliveryService.registerDeliveryPerson(req.user!.userId, req.body);
      res.json({ success: true, data: person });
    } catch (err) { next(err); }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude } = req.body;
      const person = await deliveryService.updateLocation(req.user!.userId, latitude, longitude);
      res.json({ success: true, data: person });
    } catch (err) { next(err); }
  }

  async updateAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const person = await deliveryService.updateStatus(req.user!.userId, req.body.isAvailable);
      res.json({ success: true, data: person });
    } catch (err) { next(err); }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const person = await deliveryService.getProfile(req.user!.userId);
      res.json({ success: true, data: person });
    } catch (err) { next(err); }
  }

  async getAvailable(req: Request, res: Response, next: NextFunction) {
    try {
      const deliveries = await deliveryService.getAvailableDeliveries();
      res.json({ success: true, data: deliveries });
    } catch (err) { next(err); }
  }

  async getMyDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const deliveries = await deliveryService.getMyDeliveries(req.user!.userId);
      res.json({ success: true, data: deliveries });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.getDeliveryById(req.params.id);
      res.json({ success: true, data: delivery });
    } catch (err) { next(err); }
  }

  async getByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.getDeliveryByOrder(req.params.orderId, req.user!);
      res.json({ success: true, data: delivery });
    } catch (err) { next(err); }
  }

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.acceptDelivery(req.params.id, req.user!.userId);
      res.json({ success: true, data: delivery });
    } catch (err) { next(err); }
  }

  async pickUp(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.markPickedUp(req.params.id);
      res.json({ success: true, data: delivery });
    } catch (err) { next(err); }
  }

  async deliver(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.markDelivered(req.params.id);
      res.json({ success: true, data: delivery });
    } catch (err) { next(err); }
  }

  async confirmReceived(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.confirmReceived(req.params.id, req.user!.userId);
      res.json({ success: true, data: delivery });
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.createDelivery(req.params.orderId, req.body);
      res.json({ success: true, data: delivery });
    } catch (err) { next(err); }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.getAllDeliveries(req.query as any);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }

  async getSellerDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.getSellerDeliveries(req.user!.userId, req.query as any);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }

  async getPersons(req: Request, res: Response, next: NextFunction) {
    try {
      const persons = await deliveryService.getDeliveryPersons();
      res.json({ success: true, data: persons });
    } catch (err) { next(err); }
  }

  async updatePerson(req: Request, res: Response, next: NextFunction) {
    try {
      const person = await deliveryService.updateDeliveryPerson(req.params.id, req.body);
      res.json({ success: true, data: person });
    } catch (err) { next(err); }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await deliveryService.getDeliveryStats();
      res.json({ success: true, data: stats });
    } catch (err) { next(err); }
  }

  async getPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.getPayouts(req.query as any);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }

  async getMyPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.getMyDeliveries(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async markPayoutPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const payout = await deliveryService.markPayoutPaid(req.params.id);
      res.json({ success: true, data: payout });
    } catch (err) { next(err); }
  }
}