import { useI18n } from '../lib/i18n-context';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
  const { language, setLanguage, availableLanguages } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = availableLanguages.find((l) => l.code === language);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{current?.nativeName || current?.name || language}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 max-h-64 overflow-y-auto">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                lang.code === language
                  ? 'bg-orange-50 text-orange-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {lang.code === language && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
              {lang.code !== language && <span className="w-3.5 shrink-0" />}
              <span className="truncate">{lang.nativeName || lang.name}</span>
              <span className="text-xs text-gray-400 ml-auto">{lang.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}