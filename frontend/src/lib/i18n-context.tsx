import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { get } from './api-enhanced';

type TranslationMap = Record<string, string>;

interface I18nContextValue {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string, fallback?: string) => string;
  translations: TranslationMap;
  availableLanguages: Array<{ code: string; name: string; nativeName: string | null; isRtl: boolean; flagUrl: string | null }>;
  isLoading: boolean;
  dir: 'ltr' | 'rtl';
}

const defaultTranslations: TranslationMap = {};

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  translations: defaultTranslations,
  availableLanguages: [],
  isLoading: false,
  dir: 'ltr',
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem('i18n_language') || 'en');
  const [translations, setTranslations] = useState<TranslationMap>(defaultTranslations);
  const [availableLanguages, setAvailableLanguages] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTranslations = useCallback(async (lang: string) => {
    try {
      const res = await get(`/translations/frontend/${lang}`);
      if (res?.data) setTranslations(res.data);
    } catch {
      setTranslations({});
    }
  }, []);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await get('/translations/languages');
      if (res?.data) setAvailableLanguages(res.data.filter((l: any) => l.isActive));
    } catch {
      // Fallback languages
      setAvailableLanguages([
        { code: 'en', name: 'English', nativeName: 'English', isRtl: false },
        { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', isRtl: false },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true },
        { code: 'fr', name: 'French', nativeName: 'Français', isRtl: false },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português', isRtl: false },
        { code: 'zh', name: 'Chinese', nativeName: '中文', isRtl: false },
        { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', isRtl: false },
        { code: 'so', name: 'Somali', nativeName: 'Soomaali', isRtl: false },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    setIsLoading(true);
    fetchTranslations(language).finally(() => setIsLoading(false));
  }, [language, fetchTranslations]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    localStorage.setItem('i18n_language', code);
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  }, [translations]);

  const currentLang = availableLanguages.find((l) => l.code === language);
  const dir = currentLang?.isRtl ? 'rtl' as const : 'ltr' as const;

  const value: I18nContextValue = {
    language,
    setLanguage,
    t,
    translations,
    availableLanguages,
    isLoading,
    dir,
  };

  return (
    <I18nContext.Provider value={value}>
      <div dir={dir}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export default I18nContext;