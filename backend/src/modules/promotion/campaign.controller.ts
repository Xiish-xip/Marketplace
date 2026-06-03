import { campaignService } from './campaign.service';

export class CampaignController {
  async list(req: any, res: any, next: any) {
    try { const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20; res.json({ success: true, data: await campaignService.getCampaigns(page, limit) }); } catch (e) { next(e); }
  }
  async active(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await campaignService.getActiveCampaigns() }); } catch (e) { next(e); }
  }
  async get(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await campaignService.getCampaign(req.params.id) }); } catch (e) { next(e); }
  }
  async create(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await campaignService.createCampaign(req.body) }); } catch (e) { next(e); }
  }
  async update(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await campaignService.updateCampaign(req.params.id, req.body) }); } catch (e) { next(e); }
  }
  async remove(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await campaignService.deleteCampaign(req.params.id) }); } catch (e) { next(e); }
  }
  async addProduct(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await campaignService.addProduct(req.params.id, req.body.productId) }); } catch (e) { next(e); }
  }
  async removeProduct(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await campaignService.removeProduct(req.params.id, req.params.productId) }); } catch (e) { next(e); }
  }
}

export const campaignController = new CampaignController();