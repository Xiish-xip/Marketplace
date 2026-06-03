import { Request, Response, NextFunction } from 'express';
import { PageBuilderService } from './page-builder.service';

const service = new PageBuilderService();

export async function getComponentTypes(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.getComponentTypes(); res.json({ data }); }
  catch (err) { next(err); }
}

export async function getComponentType(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.getComponentType(req.params.type); res.json({ data }); }
  catch (err) { next(err); }
}

export async function seedComponents(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.seedDefaultComponents(); res.json(result); }
  catch (err) { next(err); }
}

export async function getAllLayouts(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getAllLayouts(req.query); res.json(result); }
  catch (err) { next(err); }
}

export async function getLayoutBySlug(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.getLayoutBySlug(req.params.slug); res.json({ data }); }
  catch (err) { next(err); }
}

export async function getLayoutById(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.getLayoutById(req.params.id); res.json({ data }); }
  catch (err) { next(err); }
}

export async function createLayout(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.createLayout(req.body); res.status(201).json({ data }); }
  catch (err) { next(err); }
}

export async function updateLayout(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.updateLayout(req.params.id, req.body); res.json({ data }); }
  catch (err) { next(err); }
}

export async function deleteLayout(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.deleteLayout(req.params.id); res.json(result); }
  catch (err) { next(err); }
}

export async function duplicateLayout(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.duplicateLayout(req.params.id); res.json({ data }); }
  catch (err) { next(err); }
}

export async function addSection(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.addSection(req.params.layoutId, req.body); res.status(201).json({ data }); }
  catch (err) { next(err); }
}

export async function updateSection(req: Request, res: Response, next: NextFunction) {
  try { const data = await service.updateSection(req.params.id, req.body); res.json({ data }); }
  catch (err) { next(err); }
}

export async function deleteSection(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.deleteSection(req.params.id); res.json(result); }
  catch (err) { next(err); }
}

export async function reorderSections(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.reorderSections(req.params.layoutId, req.body.sectionIds); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function getLayoutTree(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getLayoutTree(req.params.id); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function saveLayoutTree(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.saveLayoutTree(req.params.id, req.body.tree); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function getPublishedLayoutTree(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getPublishedLayoutTree(req.params.slug); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function getActiveHeaderTree(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getActiveHeaderTree(); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function getActiveFooterTree(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getActiveFooterTree(); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function getPublishedLayout(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getPublishedLayout(req.params.slug); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function getAllTemplates(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getAllTemplates(req.query); res.json(result); }
  catch (err) { next(err); }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.createTemplate(req.body); res.status(201).json({ data: result }); }
  catch (err) { next(err); }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.updateTemplate(req.params.id, req.body); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.deleteTemplate(req.params.id); res.json(result); }
  catch (err) { next(err); }
}

export async function getSiteSettings(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.getSiteSettings(); res.json({ data: result }); }
  catch (err) { next(err); }
}

export async function updateSiteSettings(req: Request, res: Response, next: NextFunction) {
  try { const result = await service.updateSiteSettings(req.body); res.json({ data: result }); }
  catch (err) { next(err); }
}