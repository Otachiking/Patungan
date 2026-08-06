'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/i18n';

/**
 * Floating language toggle pill.
 * - Click to toggle ID <> EN
 * - Keyboard shortcut: Alt+L
 */
export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  function toggle() {
    setLocale(locale === 'id' ? 'en' : 'id');
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return (
    <button
      onClick={toggle}
      title="Toggle language (Alt+L)"
      className="
        fixed bottom-5 right-4 z-50
        flex items-center gap-1.5
        px-3 py-1.5
        bg-kertas/90 backdrop-blur-sm
        border border-tinta/15
        rounded-full shadow-md
        text-xs font-mono font-semibold text-tinta-pudar
        hover:text-tinta hover:border-tinta/30
        transition-all duration-200
        hover:shadow-lg
        active:scale-95
      "
    >
      <span className={locale === 'id' ? 'text-tinta' : 'text-tinta/40'}>ID</span>
      <span className="text-tinta/20">|</span>
      <span className={locale === 'en' ? 'text-tinta' : 'text-tinta/40'}>EN</span>
    </button>
  );
}
