'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/i18n';
import { getProject, getStoredEditToken, verifyEditToken, addToHistoryIds } from '@/lib/db';
import { calculateSettlementFull } from '@/lib/engine';
import { ReceiptGallery } from '@/components/ReceiptGallery';
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
      addToHistoryIds(id); // track visited projects
      document.title = `PtPtLah – ${data.title}`;
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { return () => { document.title = 'PtPtLah'; }; }, []);

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
          {canEdit ? (
            <Link href={`/p/${id}/edit`} className="text-tinta-pudar hover:text-tinta transition-colors text-sm font-mono font-medium shrink-0">
              ← ✏️ Edit Acara
            </Link>
          ) : (
            <Link href="/" className="text-tinta-pudar hover:text-tinta transition-colors text-sm font-mono font-medium shrink-0">
              ← {t.common.back}
            </Link>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopyLink}
            id="copy-link-header-btn"
            className="text-xs"
          >
            {copied ? `✓ ${t.common.copied}` : `🔗 ${t.common.copyLink}`}
          </Button>
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

        <div className="w-full max-w-[400px] mx-auto">
          {/* DOKUMENTASI STRUK */}
          <div className="w-full max-w-[400px] mt-6">
            <div className="bg-kertas rounded-2xl border border-tinta/10 shadow-sm p-4 w-full">
              <h2 className="font-display font-semibold text-tinta text-sm mb-3">📎 Dokumentasi Struk</h2>
              <ReceiptGallery projectId={id} readOnly={true} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full max-w-[400px] mt-6 px-1 flex flex-col gap-3 pb-10">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleCopyLink}
              id="share-link-btn"
            >
              {copied ? `✅ ${t.common.copied}` : `🔗 ${t.common.copyLink}`}
            </Button>

            {canEdit && !showStamp && (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleFinalize}
                id="finalize-btn"
                className="text-tinta-pudar"
              >
                🔒 {t.summary.finalizeBtn}
              </Button>
            )}

            {/* PtPtLah watermark footer */}
            <p className="text-center text-xs font-mono text-tinta-pudar opacity-40 pt-2">
              dibuat dengan PtPtLah
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
