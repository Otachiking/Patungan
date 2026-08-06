'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { createProject, storeEditToken, saveToHistory, getHistory, type HistoryEntry } from '@/lib/db';
import { getInitials, getAvatarColor } from '@/lib/avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [personsInput, setPersonsInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [errors, setErrors] = useState<{ title?: string; persons?: string; global?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  function getValidNames() {
    return personsInput
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  }

  const currentNames = getValidNames();
  const displayNames = Array.from({ length: Math.max(3, currentNames.length) }, (_, i) => currentNames[i] || '');

  function validate() {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = t.landing.emptyTitleError;
    const validNames = getValidNames();
    if (validNames.length < 2) errs.persons = t.landing.minPersonsError;
    return errs;
  }

  async function handleStart() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const validNames = getValidNames();
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

      const project = await createProject({
        title: title.trim(),
        currency: 'IDR',
        tax_rate: 0,
        person_names: validNames,
        pin: generatedPin,
      });

      storeEditToken(project.id, project.edit_token);

      // Save to local history
      saveToHistory({
        id: project.id,
        title: project.title,
        date: project.date ?? new Date().toISOString().split('T')[0],
        personCount: validNames.length,
        createdAt: new Date().toISOString(),
      });

      router.push(`/p/${project.id}/edit`);
    } catch (e) {
      console.error(e);
      setErrors({ global: t.common.error });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#EDE9DF] flex flex-col items-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-stamp/10 rounded-full border border-stamp/20">
          <span className="text-stamp text-xs font-mono font-semibold uppercase tracking-widest">
            PtPtLah
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-tinta leading-tight">
          {t.landing.heading}
        </h1>
        <p className="mt-3 text-tinta-pudar text-base sm:text-lg max-w-sm mx-auto leading-relaxed">
          {t.landing.subheading}
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md bg-kertas rounded-3xl border border-tinta/10 shadow-lg p-6 space-y-5 animate-fade-up">
        {/* Title */}
        <Input
          label={t.landing.eventTitleLabel}
          placeholder={t.landing.eventTitlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          id="event-title-input"
          autoFocus
        />

        {/* Date */}
        <Input
          label={t.landing.eventDateLabel}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          id="event-date-input"
        />

        {/* Persons */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-tinta">{t.landing.participantsLabel}</label>
          
          {/* Avatars */}
          <div className="flex gap-2 justify-center items-center overflow-x-auto mt-4 pb-2 scrollbar-hide snap-x">
            {displayNames.map((name, i) => {
              const hasName = name.trim().length > 0;
              const initials = hasName ? getInitials(name) : String.fromCharCode(65 + i);
              const color = hasName ? getAvatarColor(i) : undefined;
              
              return (
                <div 
                  key={i} 
                  className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg snap-center
                    ${hasName ? 'text-white shadow-sm' : 'bg-tinta/10 text-white'}`}
                  style={hasName ? { backgroundColor: color } : {}}
                >
                  {initials}
                </div>
              );
            })}
          </div>

          <textarea
            id="persons-input"
            rows={2}
            placeholder={locale === 'id'
              ? 'Tulis nama dan gunakan tanda koma (,) untuk peserta selanjutnya'
              : 'Type names separated by commas (,)'}
            value={personsInput}
            onChange={(e) => setPersonsInput(e.target.value)}
            className="w-full border rounded-xl px-3 py-2.5 text-tinta bg-white
                       placeholder:text-tinta-pudar/50 border-tinta/20
                       focus:outline-none focus:ring-2 focus:ring-stamp/30 focus:border-stamp
                       transition-all duration-150 text-sm resize-none"
          />
          {errors.persons && <p className="text-xs text-red-600">{errors.persons}</p>}
        </div>

        {/* Global error */}
        {errors.global && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{errors.global}</p>
        )}

        {/* CTA */}
        <Button
          onClick={handleStart}
          loading={loading}
          fullWidth
          size="lg"
          id="start-btn"
        >
          {t.landing.startBtn} →
        </Button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-md mt-8 animate-fade-up">
          <h2 className="text-sm font-semibold text-tinta-pudar font-mono uppercase tracking-wide mb-3 px-1">
            {t.history.title}
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
            {history.map((entry) => (
              <Link
                key={entry.id}
                href={`/p/${entry.id}`}
                className="block bg-kertas rounded-2xl border border-tinta/10 hover:border-tinta/25 hover:shadow-sm transition-all duration-150 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-tinta text-sm truncate">{entry.title}</p>
                    <p className="text-xs text-tinta-pudar font-mono mt-0.5">
                      {entry.personCount} {t.history.persons}
                      {' · '}
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString(
                        locale === 'id' ? 'id-ID' : 'en-US',
                        { day: 'numeric', month: 'short', year: 'numeric' }
                      )}
                    </p>
                  </div>
                  <span className="text-tinta-pudar/40 text-sm shrink-0">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 text-center space-y-1">
        <p className="text-xs text-tinta-pudar font-mono opacity-70">{t.footer.tagline}</p>
        <p className="text-xs text-tinta-pudar font-mono opacity-40">{t.footer.madeWith} PtPtLah</p>
      </div>
    </main>
  );
}

