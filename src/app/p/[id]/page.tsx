'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/i18n';
import { getProject, getStoredEditToken, verifyEditToken } from '@/lib/db';
import { calculateSettlementFull } from '@/lib/engine';
import type { ProjectWithRelations } from '@/lib/types';
import { SummaryReceipt } from '@/components/SummaryReceipt';
import { Button } from '@/components/ui/Button';

export default function SummaryPage() {
  const params = useParams();
  const id = params.id as string;
  const { t } = useTranslation();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const data = await getProject(id);
    setProject(data);

    if (data) {
      const token = getStoredEditToken(id);
      setCanEdit(verifyEditToken(data, token));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFinalize() {
    if (!window.confirm(t.summary.finalizeConfirm)) return;
    setShowStamp(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-tinta-pudar font-mono text-sm animate-pulse">{t.common.loading}</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-tinta-pudar">{t.common.notFound}</p>
      </main>
    );
  }

  const settlement = calculateSettlementFull(project, project.persons, project.items);

  return (
    <main className="min-h-screen bg-[#EDE9DF] pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-kertas/90 backdrop-blur-sm border-b border-tinta/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-tinta-pudar hover:text-tinta transition-colors text-sm font-mono">
            ← {t.common.back}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyLink}
              id="copy-link-btn"
            >
              {copied ? `✓ ${t.common.copied}` : `🔗 ${t.common.copyLink}`}
            </Button>
            {canEdit && (
              <Link href={`/p/${id}/edit`}>
                <Button size="sm" variant="secondary" id="edit-event-btn">
                  ✏️ {t.summary.editBtn}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Receipt */}
        <div ref={receiptRef} className="relative">
          <SummaryReceipt
            items={project.items}
            persons={project.persons}
            balances={settlement.balances}
            transactions={settlement.transactions}
            totalExpense={settlement.total_expense}
            totalTax={settlement.total_tax}
            taxRate={project.tax_rate}
            title={project.title}
            date={project.date}
          />

          {/* LUNAS Stamp overlay — §12 signature moment */}
          {showStamp && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="animate-stamp">
                <div
                  className="
                    w-40 h-40 rounded-full border-[6px] border-lunas flex items-center justify-center
                    text-lunas font-mono font-bold text-3xl tracking-widest
                    rotate-[-20deg] opacity-80
                  "
                  style={{ textShadow: '0 0 20px #3F7D5C40' }}
                >
                  LUNAS
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {canEdit && !showStamp && (
            <Button
              variant="secondary"
              fullWidth
              onClick={handleFinalize}
              id="finalize-btn"
            >
              🔒 {t.summary.finalizeBtn}
            </Button>
          )}
          <Button
            variant="ghost"
            fullWidth
            onClick={handleCopyLink}
            id="share-link-btn"
          >
            🔗 Bagikan Ringkasan Ini
          </Button>
        </div>
      </div>
    </main>
  );
}
