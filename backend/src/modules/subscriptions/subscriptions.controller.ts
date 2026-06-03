import { Request, Response, NextFunction } from 'express';
import { subscriptionsService } from './subscriptions.service';

export async function getPlans(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await subscriptionsService.getPlans() }); }
  catch (e) { next(e); }
}

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await subscriptionsService.createPlan(req.body) }); }
  catch (e) { next(e); }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await subscriptionsService.updatePlan(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await subscriptionsService.deletePlan(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getSubscriptions(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await subscriptionsService.getSubscriptions() }); }
  catch (e) { next(e); }
}

export async function getUserSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    res.json({ success: true, data: await subscriptionsService.getUserSubscriptions(user.userId) });
  }
  catch (e) { next(e); }
}