import { Request, Response, NextFunction } from 'express';
import { b2bService } from './b2b.service';

export async function getAccounts(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.getAccounts() }); }
  catch (e) { next(e); }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.createAccount(req.body) }); }
  catch (e) { next(e); }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.updateAccount(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.deleteAccount(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getBulkPricing(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.getBulkPricing(req.query.accountId as string) }); }
  catch (e) { next(e); }
}

export async function createBulkPricing(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.createBulkPricing(req.body) }); }
  catch (e) { next(e); }
}

export async function getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.getPurchaseOrders(req.query.accountId as string) }); }
  catch (e) { next(e); }
}

export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.createPurchaseOrder(req.body) }); }
  catch (e) { next(e); }
}

export async function updatePurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.updatePurchaseOrder(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function getQuoteRequests(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.getQuoteRequests(req.query.accountId as string) }); }
  catch (e) { next(e); }
}

export async function createQuoteRequest(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.createQuoteRequest(req.body) }); }
  catch (e) { next(e); }
}

export async function updateQuoteRequest(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await b2bService.updateQuoteRequest(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function getUserDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    res.json({ success: true, data: await b2bService.getUserDashboard(user.userId) });
  }
  catch (e) { next(e); }
}