import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service';

export async function getSynonyms(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.getSynonyms(req.query.language as string) }); }
  catch (e) { next(e); }
}

export async function createSynonym(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.createSynonym(req.body) }); }
  catch (e) { next(e); }
}

export async function updateSynonym(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.updateSynonym(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteSynonym(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.deleteSynonym(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getStopWords(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.getStopWords(req.query.language as string) }); }
  catch (e) { next(e); }
}

export async function createStopWord(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.createStopWord(req.body) }); }
  catch (e) { next(e); }
}

export async function deleteStopWord(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.deleteStopWord(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getFilterTemplates(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.getFilterTemplates() }); }
  catch (e) { next(e); }
}

export async function createFilterTemplate(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.createFilterTemplate(req.body) }); }
  catch (e) { next(e); }
}

export async function updateFilterTemplate(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.updateFilterTemplate(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteFilterTemplate(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.deleteFilterTemplate(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getIndexJobs(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.getIndexJobs() }); }
  catch (e) { next(e); }
}

export async function triggerReindex(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await searchService.triggerReindex(req.body.filters) }); }
  catch (e) { next(e); }
}

export async function searchProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, ...filters } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    res.json({ success: true, data: await searchService.searchProducts(q as string, filters, page, limit) });
  } catch (e) { next(e); }
}
