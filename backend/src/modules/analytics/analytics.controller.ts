import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';

export async function getWidgets(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.getWidgets() }); }
  catch (e) { next(e); }
}

export async function createWidget(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.createWidget(req.body) }); }
  catch (e) { next(e); }
}

export async function updateWidget(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.updateWidget(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteWidget(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.deleteWidget(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getReports(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.getReports() }); }
  catch (e) { next(e); }
}

export async function createReport(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.createReport(req.body) }); }
  catch (e) { next(e); }
}

export async function getEvents(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.getEvents(req.query as any) }); }
  catch (e) { next(e); }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.createEvent(req.body) }); }
  catch (e) { next(e); }
}

export async function getSummary(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.getSummary() }); }
  catch (e) { next(e); }
}

export async function exportCSV(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await analyticsService.exportCSV() }); }
  catch (e) { next(e); }
}