'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { createProject } from '@/lib/db';
import { storeEditToken } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LandingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxRateInput, setTaxRateInput] = useState('');
  const [personNames, setPersonNames] = useState(['', '']);
  const [errors, setErrors] = useState<{ title?: string; persons?: string; global?: string }>({});
  const [loading, setLoading] = useState(false);

  function addPerson() {
    setPersonNames((prev) => [...prev, '']);
  }

  function removePerson(i: number) {
    setPersonNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePerson(i: number, val: string) {
    setPersonNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));
  }

  function validate() {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = t.landing.emptyTitleError;
    const validNames = personNames.filter((n) => n.trim());
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
      const validNames = personNames.filter((n) => n.trim());
      const taxRate = taxRateInput ? parseFloat(taxRateInput) / 100 : 0;

      const project = await createProject({
        title: title.trim(),
        currency: 'IDR',
        tax_rate: isNaN(taxRate) ? 0 : taxRate,
        person_names: validNames,
      });

      storeEditToken(project.id, project.edit_token);
      router.push(`/p/${project.id}/edit`);
    } catch (e) {
      console.error(e);
      setErrors({ global: t.common.error });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#EDE9DF] flex flex-col items-center justify-center px-4 py-12">
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
        />

        {/* Date */}
        <Input
          label={t.landing.eventDateLabel}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          id="event-date-input"
        />

        {/* Tax rate */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-tinta">{t.landing.taxLabel}</label>
          <div className="relative">
            <input
              id="tax-rate-input"
              type="text"
              inputMode="decimal"
              placeholder={t.landing.taxPlaceholder}
              value={taxRateInput}
              onChange={(e) => setTaxRateInput(e.target.value)}
              className="w-full border rounded-xl pl-3 pr-8 py-2.5 text-tinta bg-white font-mono
                         placeholder:text-tinta-pudar/60 border-tinta/20
                         focus:outline-none focus:ring-2 focus:ring-stamp/30 focus:border-stamp
                         transition-all duration-150"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-pudar font-mono text-sm">%</span>
          </div>
          <p className="text-xs text-tinta-pudar">{t.landing.taxHint}</p>
        </div>

        {/* Persons */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-tinta">{t.landing.participantsLabel}</label>
          <div className="space-y-2">
            {personNames.map((name, i) => (
              <div key={i} className="flex gap-2 items-center animate-slide-in">
                <input
                  id={`person-name-${i}`}
                  type="text"
                  placeholder={`${t.landing.personNamePlaceholder} ${i + 1}`}
                  value={name}
                  onChange={(e) => updatePerson(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addPerson();
                  }}
                  className="flex-1 border rounded-xl px-3 py-2.5 text-tinta bg-white
                             placeholder:text-tinta-pudar/50 border-tinta/20
                             focus:outline-none focus:ring-2 focus:ring-stamp/30 focus:border-stamp
                             transition-all duration-150 text-sm"
                />
                {personNames.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePerson(i)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-tinta-pudar
                               hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
                    title="Hapus"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.persons && <p className="text-xs text-red-600">{errors.persons}</p>}
          <button
            type="button"
            onClick={addPerson}
            id="add-person-landing-btn"
            className="text-sm text-stamp hover:text-stamp-dark font-medium flex items-center gap-1 transition-colors"
          >
            + {t.landing.addPersonBtn}
          </button>
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

      {/* Bottom tagline */}
      <p className="mt-8 text-xs text-tinta-pudar font-mono text-center">
        Gratis · Tanpa akun · Open source
      </p>
    </main>
  );
}
