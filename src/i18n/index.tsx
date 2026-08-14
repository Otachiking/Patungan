'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import en from './en';
import id from './id';
import type { TranslationKeys } from './id';

export type Locale = 'id' | 'en';

const translations: Record<Locale, TranslationKeys> = { id, en };

interface I18nContextType {
  t: TranslationKeys;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  t: id,
  locale: 'id',
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('spillthebill-locale') as Locale) || 'id';
    }
    return 'id';
  });

  function setLocale(l: Locale) {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spillthebill-locale', l);
    }
  }

  const t = translations[locale];

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

// ─── Utility: format Rupiah ────────────────────────────────────────────────────

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRupiahShort(amount: number): string {
  // "Rp82.200" format (used in components)
  return `Rp${new Intl.NumberFormat('id-ID').format(amount)}`;
}
