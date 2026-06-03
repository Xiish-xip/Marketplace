import { Request, Response, NextFunction } from 'express';
import { supplierPortalService } from './supplier-portal.service';

function userId(req: Request) {
  return req.user?.userId || (req.user as any)?.id || '';
}

export const dashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.dashboard(userId(req), req.query.supplierId as string | undefined) });
  } catch (e) { next(e); }
};

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.listProducts(userId(req), req.query.supplierId as string | undefined) });
  } catch (e) { next(e); }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await supplierPortalService.createProduct(userId(req), req.body) });
  } catch (e) { next(e); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.updateProduct(userId(req), req.params.id, req.body) });
  } catch (e) { next(e); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.deleteProduct(userId(req), req.params.id) });
  } catch (e) { next(e); }
};

export const bulkUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.bulkUpload(userId(req), req.body) });
  } catch (e) { next(e); }
};

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.listOrders(userId(req), req.query.supplierId as string | undefined) });
  } catch (e) { next(e); }
};

export const acceptOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.updateOrderStatus(userId(req), req.params.id, 'ACCEPTED', req.body) });
  } catch (e) { next(e); }
};

export const rejectOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.updateOrderStatus(userId(req), req.params.id, 'REJECTED', req.body) });
  } catch (e) { next(e); }
};

export const shipOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.updateOrderStatus(userId(req), req.params.id, 'SHIPPED', req.body) });
  } catch (e) { next(e); }
};

export const generateLabel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.generateLabel(userId(req), req.params.id, req.body.carrierCode) });
  } catch (e) { next(e); }
};

export const payouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.payouts(userId(req), req.query.supplierId as string | undefined) });
  } catch (e) { next(e); }
};

export const analytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.analytics(userId(req), req.query.supplierId as string | undefined) });
  } catch (e) { next(e); }
};

export const messages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.messages(userId(req)) });
  } catch (e) { next(e); }
};

export const settings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.settings(userId(req), req.query.supplierId as string | undefined) });
  } catch (e) { next(e); }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await supplierPortalService.updateSettings(userId(req), req.body) });
  } catch (e) { next(e); }
};
