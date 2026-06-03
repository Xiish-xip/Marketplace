import { Request, Response, NextFunction } from 'express';
import { currenciesService } from './currencies.service';

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.getSettings({ includeApiKey: false }) }); }
  catch (e) { next(e); }
}

export async function getAdminSettings(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.getSettings({ includeApiKey: true }) }); }
  catch (e) { next(e); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.updateSettings(req.body) }); }
  catch (e) { next(e); }
}

export async function getRates(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.getRates() }); }
  catch (e) { next(e); }
}

export async function getAllRates(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.getAllRates() }); }
  catch (e) { next(e); }
}

export async function getCurrenciesInfo(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: currenciesService.getCurrenciesInfo() }); }
  catch (e) { next(e); }
}

export async function testProviderConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key is required' });
    const result = await currenciesService.testProviderConnection(apiKey);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

export async function detectCurrency(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip || req.socket.remoteAddress || '8.8.8.8';
    // For local dev, simulate a default location
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()) : ip;
    // If running locally, forward to a public IP for testing
    const lookupIp = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1'
      ? '' // let ipapi return empty for local - fallback to base currency
      : clientIp;
    const result = await currenciesService.detectCurrencyByIp(lookupIp || '8.8.8.8');
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

export async function upsertRate(req: Request, res: Response, next: NextFunction) {
  try {
    const { fromCurrency, toCurrency, rate, autoRefresh, refreshInterval } = req.body;
    res.json({ success: true, data: await currenciesService.upsertRate({ fromCurrency, toCurrency, rate, autoRefresh, refreshInterval })});
  } catch (e) { next(e); }
}

export async function updateRate(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.updateRate(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteRate(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.deleteRate(req.params.id) }); }
  catch (e) { next(e); }
}

export async function convert(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, from, to } = req.body;
    res.json({ success: true, data: await currenciesService.convert(amount, from, to) });
  } catch (e) { next(e); }
}

export async function getLanguages(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.getLanguages() }); }
  catch (e) { next(e); }
}

export async function createLanguage(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.createLanguage(req.body) }); }
  catch (e) { next(e); }
}

export async function updateLanguage(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.updateLanguage(req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function deleteLanguage(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.deleteLanguage(req.params.id) }); }
  catch (e) { next(e); }
}

export async function getTranslations(req: Request, res: Response, next: NextFunction) {
  try { res.json({ success: true, data: await currenciesService.getTranslations(req.query.language as string) }); }
  catch (e) { next(e); }
}

export async function upsertTranslation(req: Request, res: Response, next: NextFunction) {
  try {
    const { key, group, translations } = req.body;
    res.json({ success: true, data: await currenciesService.upsertTranslation(key, group, translations) });
  } catch (e) { next(e); }
}
