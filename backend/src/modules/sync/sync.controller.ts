import { Request, Response, NextFunction } from 'express';
import { syncService } from './sync.service';

export async function getJobs(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await syncService.getJobs() }); }
  catch (e) { next(e); }
}

export async function createJob(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await syncService.createJob(req.body) }); }
  catch (e) { next(e); }
}

export async function updateJob(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await syncService.updateJob(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteJob(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await syncService.deleteJob(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getLogs(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await syncService.getLogs() }); }
  catch (e) { next(e); }
}

export async function getErrors(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await syncService.getErrors() }); }
  catch (e) { next(e); }
}