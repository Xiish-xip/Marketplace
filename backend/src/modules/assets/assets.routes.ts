import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize, optionalAuth } from '../../common/middleware';
import * as assetsController from './assets.controller';
import { config } from '../../common/config';

export const assetsRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
});

assetsRoutes.get('/', optionalAuth, assetsController.getAssets);
assetsRoutes.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), upload.single('file'), assetsController.uploadAsset);
assetsRoutes.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), assetsController.updateAsset);
assetsRoutes.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), assetsController.deleteAsset);
assetsRoutes.post('/bulk-delete', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), assetsController.bulkDelete);
assetsRoutes.get('/:id', optionalAuth, assetsController.getAsset);

export default assetsRoutes;