import { Request, Response } from 'express';
import { badgesService } from './badges.service';
import { asyncHandler } from '../../common/middleware';

// ─── Badge Type Management (Admin) ───

export const getBadgeTypes = asyncHandler(async (_req: Request, res: Response) => {
  const types = await badgesService.getBadgeTypes();
  res.json({ success: true, data: types });
});

export const createBadgeType = asyncHandler(async (req: Request, res: Response) => {
  const type = await badgesService.createBadgeType(req.body);
  res.status(201).json({ success: true, data: type });
});

export const updateBadgeType = asyncHandler(async (req: Request, res: Response) => {
  const type = await badgesService.updateBadgeType(req.params.id, req.body);
  res.json({ success: true, data: type });
});

export const deleteBadgeType = asyncHandler(async (req: Request, res: Response) => {
  const result = await badgesService.deleteBadgeType(req.params.id);
  res.json({ success: true, data: result });
});

// ─── User Badge Management (Admin) ───

export const getAllUserBadges = asyncHandler(async (req: Request, res: Response) => {
  const badges = await badgesService.getAllUserBadges(req.query as any);
  res.json({ success: true, data: badges });
});

export const giveBadge = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  const badge = await badgesService.giveBadge(req.body.userId, req.body.badgeTypeId, user.userId, req.body.reason);
  res.json({ success: true, data: badge });
});

export const revokeBadge = asyncHandler(async (req: Request, res: Response) => {
  const badge = await badgesService.revokeBadge(req.params.id);
  res.json({ success: true, data: badge });
});

export const toggleBadgeVisibility = asyncHandler(async (req: Request, res: Response) => {
  const badge = await badgesService.toggleVisibility(req.params.id);
  res.json({ success: true, data: badge });
});

// ─── User endpoints ───

export const applyForBadge = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  const badge = await badgesService.applyForBadge(user.userId, req.body.badgeTypeSlug);
  res.json({ success: true, data: badge });
});

export const getUserBadges = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  const badges = await badgesService.getUserBadges(user.userId);
  res.json({ success: true, data: badges });
});

export const getAvailableBadgeTypes = asyncHandler(async (req: Request, res: Response) => {
  const types = await badgesService.getAvailableBadgeTypes(req.query.category as string);
  res.json({ success: true, data: types });
});