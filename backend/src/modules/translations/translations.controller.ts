import { translationsService } from './translations.service';

export class TranslationsController {
  async getLanguages(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.getLanguages() }); } catch (e) { next(e); }
  }
  async createLanguage(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.createLanguage(req.body) }); } catch (e) { next(e); }
  }
  async updateLanguage(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.updateLanguage(req.params.code, req.body) }); } catch (e) { next(e); }
  }
  async deleteLanguage(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.deleteLanguage(req.params.code) }); } catch (e) { next(e); }
  }
  async getTranslationKeys(req: any, res: any, next: any) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      res.json({ success: true, data: await translationsService.getTranslationKeys(req.query.group as string, req.query.search as string, page, limit) });
    } catch (e) { next(e); }
  }
  async getGroups(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.getGroups() }); } catch (e) { next(e); }
  }
  async createTranslationKey(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.createTranslationKey(req.body) }); } catch (e) { next(e); }
  }
  async updateTranslationKey(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.updateTranslationKey(req.params.id, req.body) }); } catch (e) { next(e); }
  }
  async deleteTranslationKey(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.deleteTranslationKey(req.params.id) }); } catch (e) { next(e); }
  }
  async setTranslationValue(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.setTranslationValue(req.params.keyId, req.body.language, req.body.value) }); } catch (e) { next(e); }
  }
  async deleteTranslationValue(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.deleteTranslationValue(req.params.id) }); } catch (e) { next(e); }
  }
  async getAllTranslations(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.getAllTranslations(req.query.language as string) }); } catch (e) { next(e); }
  }
  async getFrontendTranslations(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.getFrontendTranslations(req.params.lang) }); } catch (e) { next(e); }
  }
  async bulkImport(req: any, res: any, next: any) {
    try { res.json({ success: true, data: await translationsService.bulkImport(req.body.translations) }); } catch (e) { next(e); }
  }
}

export const translationsController = new TranslationsController();