import { Request, Response, NextFunction } from 'express';
import { dropshipService } from './dropship.service';

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await dropshipService.getSuppliers(); res.json({ success: true, data }); } catch (e) { next(e); }
};
export const getMappings = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await dropshipService.getMappings(req.query.supplierId as string); res.json({ success: true, data }); } catch (e) { next(e); }
};
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await dropshipService.getOrders(req.query.supplierId as string); res.json({ success: true, data }); } catch (e) { next(e); }
};
export const getAutomations = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await dropshipService.getAutomations(req.query.supplierId as string); res.json({ success: true, data }); } catch (e) { next(e); }
};
export const createAutomation = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await dropshipService.createAutomation(req.body); res.json({ success: true, data }); } catch (e) { next(e); }
};