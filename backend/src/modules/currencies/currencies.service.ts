import { prisma } from '../../common/prisma';
import { emitCurrencyRatesUpdated } from '../../common/socket';

const CURRENCY_SETTINGS_BASE_FIELDS = [
  'baseCurrency',
  'displayCurrencies',
  'autoRefresh',
  'refreshInterval',
  'roundingDecimals',
  'symbolPosition',
  'thousandSeparator',
  'decimalSeparator',
] as const;

type CurrencySettingsExtras = {
  provider: string;
  apiKey: string | null;
  geoDetectionEnabled: boolean;
  geolocationProvider: string;
};

type CurrencySettingsExtraRow = {
  provider: string | null;
  api_key: string | null;
  geo_detection_enabled: boolean | null;
  geolocation_provider: string | null;
};

const DEFAULT_CURRENCY_SETTINGS_EXTRAS: CurrencySettingsExtras = {
  provider: 'manual',
  apiKey: null,
  geoDetectionEnabled: false,
  geolocationProvider: 'ipapi',
};

let currencySettingsExtraColumnsReady = false;

const CURRENCIES_SYMBOLS: Record<string, { symbol: string; code: string; name: string }> = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
  TZS: { symbol: 'TSh', code: 'TZS', name: 'Tanzanian Shilling' },
  KES: { symbol: 'KSh', code: 'KES', name: 'Kenyan Shilling' },
  UGX: { symbol: 'USh', code: 'UGX', name: 'Ugandan Shilling' },
  RWF: { symbol: 'FRw', code: 'RWF', name: 'Rwandan Franc' },
  ZAR: { symbol: 'R', code: 'ZAR', name: 'South African Rand' },
  NGN: { symbol: '₦', code: 'NGN', name: 'Nigerian Naira' },
  GHS: { symbol: 'GH₵', code: 'GHS', name: 'Ghanaian Cedi' },
  XAF: { symbol: 'FCFA', code: 'XAF', name: 'Central African CFA' },
  XOF: { symbol: 'CFA', code: 'XOF', name: 'West African CFA' },
  EGP: { symbol: 'E£', code: 'EGP', name: 'Egyptian Pound' },
  MAD: { symbol: 'DH', code: 'MAD', name: 'Moroccan Dirham' },
  CNY: { symbol: '¥', code: 'CNY', name: 'Chinese Yuan' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
  AED: { symbol: 'د.إ', code: 'AED', name: 'UAE Dirham' },
  SAR: { symbol: '﷼', code: 'SAR', name: 'Saudi Riyal' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
  CHF: { symbol: 'Fr', code: 'CHF', name: 'Swiss Franc' },
  BRL: { symbol: 'R$', code: 'BRL', name: 'Brazilian Real' },
  SEK: { symbol: 'kr', code: 'SEK', name: 'Swedish Krona' },
  NOK: { symbol: 'kr', code: 'NOK', name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', code: 'DKK', name: 'Danish Krone' },
  PLN: { symbol: 'zł', code: 'PLN', name: 'Polish Zloty' },
  TRY: { symbol: '₺', code: 'TRY', name: 'Turkish Lira' },
  RUB: { symbol: '₽', code: 'RUB', name: 'Russian Ruble' },
  MXN: { symbol: 'Mex$', code: 'MXN', name: 'Mexican Peso' },
  SGD: { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', code: 'HKD', name: 'Hong Kong Dollar' },
  MYR: { symbol: 'RM', code: 'MYR', name: 'Malaysian Ringgit' },
  THB: { symbol: '฿', code: 'THB', name: 'Thai Baht' },
  VND: { symbol: '₫', code: 'VND', name: 'Vietnamese Dong' },
  PHP: { symbol: '₱', code: 'PHP', name: 'Philippine Peso' },
  IDR: { symbol: 'Rp', code: 'IDR', name: 'Indonesian Rupiah' },
  PKR: { symbol: '₨', code: 'PKR', name: 'Pakistani Rupee' },
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD', GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  TZ: 'TZS', KE: 'KES', UG: 'UGX', RW: 'RWF', ZA: 'ZAR',
  NG: 'NGN', GH: 'GHS', EG: 'EGP', MA: 'MAD',
  CN: 'CNY', JP: 'JPY', IN: 'INR', PK: 'PKR',
  AE: 'AED', SA: 'SAR', AU: 'AUD', CA: 'CAD',
  CH: 'CHF', BR: 'BRL', SE: 'SEK', NO: 'NOK',
  DK: 'DKK', PL: 'PLN', TR: 'TRY', RU: 'RUB',
  MX: 'MXN', SG: 'SGD', HK: 'HKD', MY: 'MYR',
  TH: 'THB', VN: 'VND', PH: 'PHP', ID: 'IDR',
  CM: 'XAF', CI: 'XOF', SN: 'XOF', ML: 'XOF',
  CG: 'XAF', GA: 'XAF', CD: 'CDF',
};

class CurrencyRateProvider {
  private cache = new Map<string, { rates: Record<string, number>; timestamp: number }>();
  private cacheTtl = 28 * 60 * 1000; // 28 minutes default

  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  async fetchRates(provider: string, apiKey: string | null, baseCurrency: string): Promise<Record<string, number>> {
    const cacheKey = `${provider}:${baseCurrency}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.rates;
    }

    let rates: Record<string, number> = {};

    try {
      switch (provider) {
        case 'exchangerate-api': {
          if (!apiKey) throw new Error('API key required for exchangerate-api');
          const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`);
          const data: any = await res.json();
          if (data.result === 'success') {
            rates = data.conversion_rates;
            // Auto-save to DB for persistence
            await this.saveRatesToDb(baseCurrency, rates, 'exchangerate-api');
          } else {
            throw new Error(data['error-type'] || 'Unknown API error');
          }
          break;
        }
        case 'fixer': {
          if (!apiKey) throw new Error('API key required for Fixer');
          const res = await fetch(`https://data.fixer.io/api/latest?access_key=${apiKey}&base=${baseCurrency}`);
          const data: any = await res.json();
          if (data.success) rates = data.rates;
          break;
        }
        case 'openexchangerates': {
          if (!apiKey) throw new Error('API key required for Open Exchange Rates');
          const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${baseCurrency}`);
          const data: any = await res.json();
          if (data.rates) rates = data.rates;
          break;
        }
        default: {
          const dbRates = await prisma.currencyRate.findMany({ where: { fromCurrency: baseCurrency } });
          for (const r of dbRates) rates[r.toCurrency] = r.rate;
          break;
        }
      }
    } catch (err) {
      console.error(`[CurrencyProvider] Failed to fetch rates from ${provider}:`, (err as Error).message);
      const dbRates = await prisma.currencyRate.findMany({ where: { fromCurrency: baseCurrency } });
      for (const r of dbRates) rates[r.toCurrency] = r.rate;
    }

    if (Object.keys(rates).length > 0) {
      this.cache.set(cacheKey, { rates, timestamp: Date.now() });
    }

    return rates;
  }

  private async saveRatesToDb(baseCurrency: string, rates: Record<string, number>, provider: string) {
    for (const [toCurrency, rate] of Object.entries(rates)) {
      if (toCurrency === baseCurrency) continue;
      try {
        await prisma.currencyRate.upsert({
          where: { fromCurrency_toCurrency: { fromCurrency: baseCurrency, toCurrency } },
          create: { fromCurrency: baseCurrency, toCurrency, rate, provider, autoRefresh: true, refreshInterval: 1680, lastRefreshedAt: new Date() },
          update: { rate, provider, lastRefreshedAt: new Date() },
        });
      } catch { /* ignore duplicate key conflicts on concurrent writes */ }
    }
    emitCurrencyRatesUpdated({ base: baseCurrency, rates, updatedAt: new Date().toISOString() });
  }

  async testConnection(provider: string, apiKey: string): Promise<{ success: boolean; message: string; rates?: Record<string, number> }> {
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
      const data: any = await res.json();
      if (data.result === 'success') {
        return {
          success: true,
          message: `Connected! Base: USD, ${Object.keys(data.conversion_rates).length} currencies available. Last updated: ${data.time_last_update_utc || 'N/A'}`,
          rates: data.conversion_rates,
        };
      }
      return { success: false, message: data['error-type'] || 'Unknown error' };
    } catch (err) {
      return { success: false, message: `Connection failed: ${(err as Error).message}` };
    }
  }

  clearCache() {
    this.cache.clear();
  }

  /** Start auto-refresh at interval (default 28 minutes) */
  startAutoRefresh(provider: string, apiKey: string | null, baseCurrency: string, intervalMs: number = 28 * 60 * 1000) {
    this.stopAutoRefresh();
    this.cacheTtl = intervalMs;
    
    // Immediate fetch
    this.fetchRates(provider, apiKey, baseCurrency).catch(() => {});
    
    // Schedule periodic refresh
    this.autoRefreshTimer = setInterval(() => {
      this.fetchRates(provider, apiKey, baseCurrency).catch(() => {});
      console.log(`[CurrencyProvider] Auto-refreshed rates at ${new Date().toISOString()}`);
    }, intervalMs);
  }

  stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }
}

const rateProvider = new CurrencyRateProvider();

export class CurrenciesService {
  private getCurrentSettingsRecord() {
    return prisma.currencySettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  }

  private pickBaseSettingsData(data: Record<string, any>) {
    return CURRENCY_SETTINGS_BASE_FIELDS.reduce<Record<string, any>>((picked, field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) picked[field] = data[field];
      return picked;
    }, {});
  }

  private hasExtraSettingsData(data: Record<string, any>) {
    return ['provider', 'apiKey', 'geoDetectionEnabled', 'geolocationProvider'].some((field) =>
      Object.prototype.hasOwnProperty.call(data, field)
    );
  }

  private async ensureCurrencySettingsExtraColumns() {
    if (currencySettingsExtraColumnsReady) return;

    await prisma.$executeRawUnsafe(`
      ALTER TABLE currency_settings
        ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS api_key TEXT,
        ADD COLUMN IF NOT EXISTS geo_detection_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS geolocation_provider TEXT DEFAULT 'ipapi'
    `);
    currencySettingsExtraColumnsReady = true;
  }

  private normalizeExtraSettings(row?: Partial<CurrencySettingsExtraRow> | null): CurrencySettingsExtras {
    return {
      provider: row?.provider || DEFAULT_CURRENCY_SETTINGS_EXTRAS.provider,
      apiKey: row?.api_key || DEFAULT_CURRENCY_SETTINGS_EXTRAS.apiKey,
      geoDetectionEnabled: row?.geo_detection_enabled ?? DEFAULT_CURRENCY_SETTINGS_EXTRAS.geoDetectionEnabled,
      geolocationProvider: row?.geolocation_provider || DEFAULT_CURRENCY_SETTINGS_EXTRAS.geolocationProvider,
    };
  }

  private async getSettingsExtras(id: string): Promise<CurrencySettingsExtras> {
    await this.ensureCurrencySettingsExtraColumns();

    const rows = await prisma.$queryRaw<CurrencySettingsExtraRow[]>`
      SELECT provider, api_key, geo_detection_enabled, geolocation_provider
      FROM currency_settings
      WHERE id = ${id}
      LIMIT 1
    `;

    return this.normalizeExtraSettings(rows[0]);
  }

  private async updateSettingsExtras(id: string, data: Record<string, any>): Promise<CurrencySettingsExtras> {
    const current = await this.getSettingsExtras(id);
    const next: CurrencySettingsExtras = {
      provider: data.provider ?? current.provider,
      apiKey: data.apiKey === undefined ? current.apiKey : (data.apiKey || null),
      geoDetectionEnabled: data.geoDetectionEnabled ?? current.geoDetectionEnabled,
      geolocationProvider: data.geolocationProvider ?? current.geolocationProvider,
    };

    await prisma.$executeRaw`
      UPDATE currency_settings
      SET provider = ${next.provider},
          api_key = ${next.apiKey},
          geo_detection_enabled = ${next.geoDetectionEnabled},
          geolocation_provider = ${next.geolocationProvider}
      WHERE id = ${id}
    `;

    return next;
  }

  async getSettings(options: { includeApiKey?: boolean } = {}) {
    let settings = await this.getCurrentSettingsRecord();
    if (!settings) {
      settings = await prisma.currencySettings.create({ data: {} });
    }
    const extras = await this.getSettingsExtras(settings.id);
    const apiKey = options.includeApiKey === false ? null : extras.apiKey;
    return {
      ...settings,
      ...extras,
      apiKey,
      currencies: this.getCurrenciesList(settings.displayCurrencies),
    };
  }

  async updateSettings(data: Record<string, any>) {
    const existing = await this.getCurrentSettingsRecord();
    const baseData = this.pickBaseSettingsData(data);
    let updated: any;
    if (existing) {
      updated = Object.keys(baseData).length > 0
        ? await prisma.currencySettings.update({ where: { id: existing.id }, data: baseData })
        : existing;
    } else {
      updated = await prisma.currencySettings.create({ data: baseData });
    }

    const extras = this.hasExtraSettingsData(data)
      ? await this.updateSettingsExtras(updated.id, data)
      : await this.getSettingsExtras(updated.id);
    updated = { ...updated, ...extras };

    // If exchangerate-api provider and API key exists, start/restart auto-refresh
    if (updated.provider === 'exchangerate-api' && updated.apiKey && updated.autoRefresh) {
      rateProvider.startAutoRefresh(
        updated.provider,
        updated.apiKey,
        updated.baseCurrency || 'USD',
        28 * 60 * 1000
      );
    } else {
      rateProvider.stopAutoRefresh();
    }

    rateProvider.clearCache();
    emitCurrencyRatesUpdated({ base: updated.baseCurrency || 'USD', updatedAt: new Date().toISOString() });
    return updated;
  }

  /** Initialize the auto-refresh scheduler on server boot */
  async initAutoRefresh() {
    const settings = await this.getSettings();
    if (settings.provider === 'exchangerate-api' && settings.apiKey && settings.autoRefresh !== false) {
      rateProvider.startAutoRefresh(
        settings.provider,
        settings.apiKey,
        settings.baseCurrency || 'USD',
        28 * 60 * 1000
      );
      console.log('[CurrencyService] Auto-refresh scheduler started (28min interval)');
    }
  }

  /** Test the exchange rate API connection */
  async testProviderConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    return rateProvider.testConnection('exchangerate-api', apiKey);
  }

  async getRates() {
    return prisma.currencyRate.findMany({ orderBy: { fromCurrency: 'asc' } });
  }

  async upsertRate(data: { fromCurrency: string; toCurrency: string; rate: number; autoRefresh?: boolean; refreshInterval?: number }) {
    rateProvider.clearCache();
    const rate = await prisma.currencyRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: data.fromCurrency, toCurrency: data.toCurrency } },
      create: data,
      update: data,
    });
    emitCurrencyRatesUpdated({ base: data.fromCurrency, rates: { [data.toCurrency]: data.rate }, updatedAt: new Date().toISOString() });
    return rate;
  }

  async updateRate(id: string, data: Record<string, any>) {
    rateProvider.clearCache();
    const rate = await prisma.currencyRate.update({ where: { id }, data });
    emitCurrencyRatesUpdated({ base: rate.fromCurrency, rates: { [rate.toCurrency]: rate.rate }, updatedAt: new Date().toISOString() });
    return rate;
  }

  async deleteRate(id: string) {
    rateProvider.clearCache();
    const rate = await prisma.currencyRate.delete({ where: { id } });
    emitCurrencyRatesUpdated({ base: rate.fromCurrency, updatedAt: new Date().toISOString() });
    return rate;
  }

  async convert(amount: number, from: string, to: string): Promise<{ amount: number; rate: number }> {
    if (from === to) return { amount, rate: 1 };
    const rate = await prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    });
    if (!rate) throw new Error(`No exchange rate found for ${from} -> ${to}`);
    return { amount: amount * rate.rate, rate: rate.rate };
  }

  async getAllRates(): Promise<{ base: string; rates: Record<string, number>; updatedAt: string }> {
    const settings = await this.getSettings();
    const baseCurrency = settings.baseCurrency || 'USD';
    const provider = settings.provider || 'manual';
    const apiKey = settings.apiKey || null;
    const rates = await rateProvider.fetchRates(provider, apiKey, baseCurrency);
    return { base: baseCurrency, rates, updatedAt: new Date().toISOString() };
  }

  async detectCurrencyByIp(ip: string): Promise<{ currency: string; country: string; countryName: string }> {
    const settings = await this.getSettings();
    const geoProvider = settings.geolocationProvider || 'ipapi';
    const defaultCurrency = settings.baseCurrency || 'USD';
    try {
      let country = '';
      let countryName = '';
      if (geoProvider === 'ipapi' || geoProvider === 'ipapi.co') {
        const res = await fetch(`https://ipapi.co/${ip}/json/`);
        if (res.ok) {
          const data: any = await res.json();
          country = data.country_code || '';
          countryName = data.country_name || '';
        }
      } else if (geoProvider === 'ip2location') {
        const apiKey = settings.apiKey || '';
        const res = await fetch(`https://api.ip2location.io/?key=${apiKey}&ip=${ip}&format=json`);
        if (res.ok) {
          const data: any = await res.json();
          country = data.country_code || '';
          countryName = data.country_name || '';
        }
      }
      const currency = country ? COUNTRY_CURRENCY_MAP[country] || defaultCurrency : defaultCurrency;
      return { currency, country, countryName };
    } catch (err) {
      console.error('[CurrencyService] Geo detection error:', (err as Error).message);
      return { currency: defaultCurrency, country: '', countryName: '' };
    }
  }

  getCurrenciesInfo() {
    return Object.entries(CURRENCIES_SYMBOLS).map(([code, info]) => ({
      code,
      symbol: info.symbol,
      name: info.name,
    })).sort((a, b) => a.code.localeCompare(b.code));
  }

  formatCurrency(amount: number, currencyCode: string, settings?: any): string {
    const s = settings || { roundingDecimals: 2, thousandSeparator: ',', decimalSeparator: '.', symbolPosition: 'before' };
    const info = CURRENCIES_SYMBOLS[currencyCode] || { symbol: currencyCode, code: currencyCode, name: currencyCode };
    const decimals = s.roundingDecimals ?? 2;
    const formatted = Math.abs(amount).toFixed(decimals)
      .replace('.', s.decimalSeparator || '.')
      .replace(/\B(?=(\d{3})+(?!\d))/g, s.thousandSeparator || ',');
    const symbol = info.symbol || currencyCode;
    return s.symbolPosition === 'after' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  }

  private getCurrenciesList(displayCurrencies: string): string[] {
    try {
      const parsed = JSON.parse(displayCurrencies);
      return Array.isArray(parsed) ? parsed : ['USD', 'EUR', 'GBP', 'TZS'];
    } catch {
      return ['USD', 'EUR', 'GBP', 'TZS'];
    }
  }

  async getLanguages() {
    return prisma.siteLanguage.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createLanguage(data: { code: string; name: string; nativeName?: string; isRtl?: boolean; isDefault?: boolean; flagUrl?: string; sortOrder?: number }) {
    return prisma.siteLanguage.create({ data });
  }

  async updateLanguage(id: string, data: Record<string, any>) {
    return prisma.siteLanguage.update({ where: { id }, data });
  }

  async deleteLanguage(id: string) {
    return prisma.siteLanguage.delete({ where: { id } });
  }

  async getTranslations(language?: string) {
    return prisma.translationKey.findMany({
      include: { values: language ? { where: { language } } : true },
      orderBy: { group: 'asc' },
    });
  }

  async upsertTranslation(key: string, group: string, translations: Record<string, string>) {
    const existing = await prisma.translationKey.findUnique({ where: { key } });
    const keyRecord = existing
      ? await prisma.translationKey.update({ where: { id: existing.id }, data: { group } })
      : await prisma.translationKey.create({ data: { key, group } });
    for (const [language, value] of Object.entries(translations)) {
      await prisma.translationValue.upsert({
        where: { translationKeyId_language: { translationKeyId: keyRecord.id, language } },
        create: { translationKeyId: keyRecord.id, language, value },
        update: { value },
      });
    }
    return this.getTranslations();
  }
}

export const currenciesService = new CurrenciesService();
