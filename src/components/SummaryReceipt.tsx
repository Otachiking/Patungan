'use client';

import { formatRupiahShort, useTranslation } from '@/i18n';
import type { Item, Person, PersonBalance, Transaction } from '@/lib/types';
import { MoneyDisplay } from './ui/MoneyDisplay';
import { PersonBadge } from './ui/PersonBadge';
import { ReceiptDivider, SectionHeader } from './ui/ReceiptDivider';

interface SettlementListProps {
  transactions: Transaction[];
  persons: Person[];
}

export function SettlementList({ transactions, persons }: SettlementListProps) {
  const { t } = useTranslation();
  const personMap = Object.fromEntries(persons.map((p) => [p.id, p]));
  const personIndex = Object.fromEntries(persons.map((p, i) => [p.id, i]));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-6 text-tinta-pudar text-sm">
        ✅ {t.summary.noSettlementNeeded}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((txn, i) => {
        const from = personMap[txn.from_person_id];
        const to = personMap[txn.to_person_id];
        const fromIdx = personIndex[txn.from_person_id] ?? 0;
        const toIdx = personIndex[txn.to_person_id] ?? 0;

        return (
          <div
            key={i}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-tinta/10"
          >
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {from && <PersonBadge name={from.name} index={fromIdx} size="sm" />}
              <span className="text-tinta-pudar text-sm">→</span>
              {to && <PersonBadge name={to.name} index={toIdx} size="sm" />}
            </div>
            <MoneyDisplay amount={txn.amount} size="lg" color="negative" className="font-bold" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Full Summary Receipt ─────────────────────────────────────────────────────

interface SummaryReceiptProps {
  items: Item[];
  persons: Person[];
  balances: Record<string, PersonBalance>;
  transactions: Transaction[];
  totalExpense: number;
  totalTax: number;
  taxRate: number;
  title: string;
  date: string;
}

export function SummaryReceipt({
  items,
  persons,
  balances,
  transactions,
  totalExpense,
  totalTax,
  taxRate,
  title,
  date,
}: SummaryReceiptProps) {
  const { t, locale } = useTranslation();
  const personMap = Object.fromEntries(persons.map((p) => [p.id, p]));
  const personIndex = Object.fromEntries(persons.map((p, i) => [p.id, i]));

  return (
    <div
      id="receipt-root"
      className="
        bg-kertas rounded-3xl border border-tinta/10 shadow-lg
        max-w-md mx-auto px-5 py-7 font-body
        relative overflow-hidden
      "
    >
      {/* Watermark texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[repeating-linear-gradient(45deg,#2A2A25_0,#2A2A25_1px,transparent_0,transparent_50%)] bg-[size:6px_6px]" />

      {/* Header */}
      <div className="text-center mb-5 relative">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-tinta-pudar mb-1">SpillTheBill</p>
        <h1 className="text-xl font-display font-bold text-tinta leading-snug">{title}</h1>
        <p className="text-xs font-mono text-tinta-pudar mt-1">
          {new Date(date + 'T00:00:00').toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <ReceiptDivider />

      {/* Items list */}
      <SectionHeader>{t.summary.itemsSection}</SectionHeader>
      <div className="space-y-3 mb-3">
        {items.map((item) => {
          const payer = personMap[item.paid_by_person_id];
          const totalPrice = item.price * (item.qty ?? 1);
          return (
            <div key={item.id} className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-tinta font-medium truncate">{item.name}</p>
                <p className="text-xs text-tinta-pudar">
                  {t.editor.paidByShort}: {payer?.name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-medium text-tinta">Rp{totalPrice.toLocaleString('id-ID')}</p>
                {item.participants.length > 0 && (
                  <p className="text-[11px] text-tinta-pudar">{t.summary.nPeople.replace('{n}', String(item.participants.length))}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total only — no subtotal row */}
      <div className="flex justify-between items-center border-t border-dashed border-tinta/15 pt-3">
        <span className="font-mono uppercase text-sm tracking-wide font-bold text-tinta">
          {t.editor.totalRow}
        </span>
        <MoneyDisplay amount={totalExpense} size="lg" className="font-bold" />
      </div>

      <ReceiptDivider label={t.summary.balanceSection} />

      {/* Per-person balances */}
      <div className="space-y-3">
        {persons.map((person) => {
          const bal = balances[person.id];
          if (!bal) return null;
          const idx = personIndex[person.id] ?? 0;
          const isCreditor = bal.net > 0;
          const isDebtor = bal.net < 0;

          return (
            <div key={person.id} className="bg-white rounded-xl border border-tinta/10 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <PersonBadge name={person.name} index={idx} />
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isCreditor
                      ? 'bg-lunas/10 text-lunas'
                      : isDebtor
                      ? 'bg-utang/10 text-utang'
                      : 'bg-tinta/10 text-tinta'
                  }`}
                >
                  {isCreditor ? t.summary.receiveLabel : isDebtor ? t.summary.payLabel : t.summary.settledLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                <span className="text-tinta-pudar">{t.summary.expenseLabel}</span>
                <MoneyDisplay amount={bal.expense} size="sm" color="muted" className="text-right" />

                <span className="text-tinta-pudar">{t.summary.paidLabel}</span>
                <MoneyDisplay amount={bal.paid} size="sm" color="muted" className="text-right" />

                <span className="font-semibold text-tinta">{t.summary.netLabel}</span>
                <MoneyDisplay
                  amount={bal.net}
                  size="sm"
                  color={isCreditor ? 'positive' : isDebtor ? 'negative' : 'default'}
                  showSign
                  className="text-right font-bold"
                />
              </div>
            </div>
          );
        })}
      </div>

      <ReceiptDivider label={t.summary.settlementSection} />

      {/* Settlement transactions */}
      <SettlementList transactions={transactions} persons={persons} />
    </div>
  );
}
