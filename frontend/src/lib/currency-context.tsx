import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAllCurrencyRates, useCurrencySettings, useCurrenciesInfo, useDetectedCurrency } from './query-hooks';
import { getSocket } from './socket';

interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

interface CurrencySettings {
  baseCurrency: string;
  displayCurrencies: string[];
  roundingDecimals: number;
  symbolPosition: 'before' | 'after';
  thousandSeparator: string;
  decimalSeparator: string;
  provider: string;
  geoDetectionEnabled: boolean;
  currencies: string[];
}

interface CurrencyState {
  /** The currency selected by the user (or detected) */
  activeCurrency: string;
  /** The base currency from settings (what products are priced in) */
  baseCurrency: string;
  /** All available currencies with symbols */
  currencies: CurrencyInfo[];
  /** Exchange rates from base to all others */
  rates: Record<string, number>;
  /** Settings from admin panel */
  settings: CurrencySettings | null;
  /** Loading states */
  isLoading: boolean;
  /** Convert an amount from base currency to active currency */
  convert: (amount: number) => number;
  /** Format a number in the active currency */
  format: (amount: number, showCode?: boolean) => string;
  /** Format a number with original base currency indication */
  formatWithOriginal: (amount: number, originalCode?: string) => string;
  /** Set the active currency */
  setActiveCurrency: (code: string) => void;
  /** Get symbol for a currency */
  getSymbol: (code: string) => string;
}

const CurrencyContext = createContext<CurrencyState>({
  activeCurrency: 'USD',
  baseCurrency: 'USD',
  currencies: [],
  rates: {},
  settings: null,
  isLoading: true,
  convert: (amount) => amount,
  format: (amount) => `${amount}`,
  formatWithOriginal: (amount) => `${amount}`,
  setActiveCurrency: () => {},
  getSymbol: (code) => code,
});

const STORAGE_KEY = 'marketplace-currency';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: settingsData, isLoading: settingsLoading } = useCurrencySettings();
  const { data: ratesData, isLoading: ratesLoading } = useAllCurrencyRates();
  const { data: currenciesData, isLoading: currenciesLoading } = useCurrenciesInfo();
  const { data: detectedData } = useDetectedCurrency();

  const [activeCurrency, setActiveCurrencyState] = useState<string>(() => {
    // On initial load, try localStorage
    return localStorage.getItem(STORAGE_KEY) || 'USD';
  });

  const settings: CurrencySettings | null = useMemo(() => {
    if (!settingsData?.data) return null;
    const s = settingsData.data;
    return {
      baseCurrency: s.baseCurrency || 'USD',
      displayCurrencies: s.currencies || ['USD', 'EUR', 'GBP'],
      roundingDecimals: s.roundingDecimals ?? 2,
      symbolPosition: s.symbolPosition || 'before',
      thousandSeparator: s.thousandSeparator || ',',
      decimalSeparator: s.decimalSeparator || '.',
      provider: s.provider || 'manual',
      geoDetectionEnabled: s.geoDetectionEnabled || false,
      currencies: s.currencies || ['USD', 'EUR', 'GBP'],
    };
  }, [settingsData]);

  const baseCurrency = settings?.baseCurrency || 'USD';
  const rates = useMemo(() => ratesData?.data?.rates || {}, [ratesData]);
  const currencies: CurrencyInfo[] = useMemo(() => currenciesData?.data || [], [currenciesData]);

  useEffect(() => {
    const handleRatesUpdated = (payload: { base: string; rates?: Record<string, number>; updatedAt: string }) => {
      queryClient.setQueryData(['currency-rates', 'all'], (current: any) => {
        if (!current?.data || !payload.rates) return current;
        return {
          ...current,
          data: {
            ...current.data,
            base: payload.base || current.data.base,
            rates: { ...current.data.rates, ...payload.rates },
            updatedAt: payload.updatedAt,
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['currency-rates', 'all'] });
    };

    const s = getSocket();
    if (!s) return;
    s.on('currency-rates-updated', handleRatesUpdated);
    return () => {
      s.off('currency-rates-updated', handleRatesUpdated);
    };
  }, [queryClient]);

  // Auto-detect currency on first load if geo detection is enabled
  useEffect(() => {
    if (!settingsLoading && settings?.geoDetectionEnabled && detectedData?.data?.currency) {
      const detected = detectedData.data.currency;
      const stored = localStorage.getItem(STORAGE_KEY);
      // Only auto-detect if no user preference stored
      if (!stored) {
        setActiveCurrencyState(detected);
      }
    }
  }, [settings, settingsLoading, detectedData]);

  const setActiveCurrency = useCallback((code: string) => {
    setActiveCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const convert = useCallback((amount: number): number => {
    if (activeCurrency === baseCurrency || !rates[activeCurrency]) return amount;
    return amount * (rates[activeCurrency] || 1);
  }, [activeCurrency, baseCurrency, rates]);

  const getSymbol = useCallback((code: string): string => {
    const found = currencies.find((c) => c.code === code);
    return found?.symbol || code;
  }, [currencies]);

  const format = useCallback((amount: number, showCode: boolean = false): string => {
    const decimals = settings?.roundingDecimals ?? 2;
    const thSep = settings?.thousandSeparator || ',';
    const decSep = settings?.decimalSeparator || '.';
    const converted = convert(amount);
    const formatted = Math.abs(converted).toFixed(decimals)
      .replace('.', decSep)
      .replace(/\B(?=(\d{3})+(?!\d))/g, thSep);
    const symbol = getSymbol(activeCurrency);
    if (settings?.symbolPosition === 'after') {
      return showCode ? `${formatted} ${activeCurrency}` : `${formatted} ${symbol}`;
    }
    return showCode ? `${activeCurrency} ${formatted}` : `${symbol}${formatted}`;
  }, [convert, activeCurrency, settings, getSymbol]);

  const formatWithOriginal = useCallback((amount: number, originalCode?: string): string => {
    const code = originalCode || baseCurrency;
    if (activeCurrency === code) return format(amount);
    const converted = convert(amount);
    const decimals = settings?.roundingDecimals ?? 2;
    const thSep = settings?.thousandSeparator || ',';
    const decSep = settings?.decimalSeparator || '.';
    const formatted = Math.abs(converted).toFixed(decimals)
      .replace('.', decSep)
      .replace(/\B(?=(\d{3})+(?!\d))/g, thSep);
    const symbol = getSymbol(activeCurrency);
    const baseSymbol = getSymbol(code);
    const baseFormatted = `${baseSymbol}${Math.abs(amount).toFixed(decimals)}`;
    if (settings?.symbolPosition === 'after') {
      return `${formatted} ${symbol} (~${baseFormatted})`;
    }
    return `${symbol}${formatted} (~${baseFormatted})`;
  }, [convert, activeCurrency, baseCurrency, settings, getSymbol]);

  const value = useMemo(() => ({
    activeCurrency,
    baseCurrency,
    currencies,
    rates,
    settings,
    isLoading: settingsLoading || ratesLoading || currenciesLoading,
    convert,
    format,
    formatWithOriginal,
    setActiveCurrency,
    getSymbol,
  }), [activeCurrency, baseCurrency, currencies, rates, settings, settingsLoading, ratesLoading, currenciesLoading, convert, format, formatWithOriginal, setActiveCurrency, getSymbol]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export default CurrencyContext;
