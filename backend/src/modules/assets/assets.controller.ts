import { Request, Response } from 'express';
import { assetsService } from './assets.service';
import { asyncHandler } from '../../common/middleware';
import { NotFoundError } from '../../common/errors';

export const getAssets = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 24;
  const user = req.user as any;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const result = await assetsService.getAssets({
    ...req.query as any,
    page,
    limit,
  });
  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await assetsService.getAssetById(req.params.id);
  res.json({ success: true, data: asset });
});

export const uploadAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await assetsService.uploadFile(req.file!, req.body, req.user as any);
  res.status(201).json({ success: true, data: asset });
});

export const updateAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await assetsService.updateAsset(req.params.id, req.body);
  res.json({ success: true, data: asset });
});

export const deleteAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await assetsService.deleteAsset(req.params.id);
  res.json({ success: true, data: asset });
});

export const bulkDelete = asyncHandler(async (req: Request, res: Response) => {
  const result = await assetsService.bulkDelete(req.body.ids || []);
  res.json({ success: true, data: result });
});