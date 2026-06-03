import { Request, Response, NextFunction } from 'express';
import { cacheService } from './cache.service';

export async function getConfigs(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.getConfigs() }); }
  catch (e) { next(e); }
}

export async function createConfig(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.createConfig(req.body) }); }
  catch (e) { next(e); }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.updateConfig(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function getQueues(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.getQueues() }); }
  catch (e) { next(e); }
}

export async function createQueue(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.createQueue(req.body) }); }
  catch (e) { next(e); }
}

export async function getRateLimits(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.getRateLimits() }); }
  catch (e) { next(e); }
}

export async function createRateLimit(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.createRateLimit(req.body) }); }
  catch (e) { next(e); }
}

export async function updateRateLimit(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.updateRateLimit(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteRateLimit(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.deleteRateLimit(req.params.id) }); }
  catch (e) { next(e); }
}

export async function clearCache(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await cacheService.clearCache() }); }
  catch (e) { next(e); }
}