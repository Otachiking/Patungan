'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/i18n';
import { getProject, upsertItem, deleteItem, upsertPerson, deletePerson, getStoredEditToken, verifyEditToken, storeEditToken, removeStoredEditToken } from '@/lib/db';
import { calculateSettlementFull } from '@/lib/engine';
import type { Item, ItemParticipant, Person, ProjectWithRelations, UpsertItemInput } from '@/lib/types';
import { PersonList } from '@/components/PersonList';
import { ItemList } from '@/components/ItemList';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { Button } from '@/components/ui/Button';
import { ReceiptDivider } from '@/components/ui/ReceiptDivider';

export default function EditorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { t } = useTranslation();

  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const pendingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const [lastDeleted, setLastDeleted] = useState<{ id: string, name: string, type: 'person' | 'item' } | null>(null);

  useEffect(() => {
    return () => {
      Object.values(pendingTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (project && verifyEditToken(project, pinInput)) {
      storeEditToken(id, pinInput);
      setCanEdit(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  const load = useCallback(async () => {
    const data = await getProject(id);
    if (!data) {
      router.replace('/');
      return;
    }
    setProject(data);

    const token = getStoredEditToken(id);
    setCanEdit(verifyEditToken(data, token));
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Item handlers ────────────────────────────────────────────────────────

  async function handleSaveItem(
    itemData: UpsertItemInput,
    participants: ItemParticipant[]
  ) {
    await upsertItem({ ...itemData, project_id: id }, participants);
    await load();
  }

  async function handleDeleteItem(itemId: string) {
    const item = project?.items.find((i) => i.id === itemId);
    if (!item) return;

    setPendingDeletes((prev) => new Set(prev).add(itemId));
    setLastDeleted({ id: itemId, name: item.name, type: 'item' });

    pendingTimeouts.current[itemId] = setTimeout(async () => {
      await deleteItem(itemId);
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setLastDeleted(null);
      await load();
    }, 5000);
  }

  // ─── Person handlers ──────────────────────────────────────────────────────

  async function handleAddPerson(name: string) {
    if (!project) return;
    await upsertPerson({
      project_id: id,
      name,
      order: project.persons.length,
    });
    await load();
  }

  async function handleDeletePerson(personId: string) {
    const person = project?.persons.find((p) => p.id === personId);
    if (!person) return;
    
    setPendingDeletes((prev) => new Set(prev).add(personId));
    setLastDeleted({ id: personId, name: person.name, type: 'person' });

    pendingTimeouts.current[personId] = setTimeout(async () => {
      await deletePerson(personId);
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(personId);
        return next;
      });
      setLastDeleted(null);
      await load();
    }, 5000);
  }

  function handleUndo(id: string) {
    if (pendingTimeouts.current[id]) {
      clearTimeout(pendingTimeouts.current[id]);
      delete pendingTimeouts.current[id];
    }
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setLastDeleted(null);
  }

  async function handleRenamePerson(personId: string, name: string) {
    const person = project?.persons.find((p) => p.id === personId);
    if (!person) return;
    await upsertPerson({ ...person, name });
    await load();
  }

  // ─── Settlement preview ───────────────────────────────────────────────────

  const visiblePersons = project?.persons.filter(p => !pendingDeletes.has(p.id)) || [];
  const visibleItems = project?.items.filter(i => !pendingDeletes.has(i.id)) || [];

  const settlement = project
    ? calculateSettlementFull(project, visiblePersons, visibleItems)
    : null;

  const subtotal = visibleItems.reduce((s, i) => s + (i.price * (i.qty ?? 1)), 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-tinta-pudar font-mono text-sm animate-pulse">{t.common.loading}</div>
      </main>
    );
  }

  if (!project) return null;

  if (!canEdit) {
    return (
      <main className="min-h-screen bg-[#EDE9DF] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-lg max-w-sm w-full text-center space-y-4 animate-fade-up">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl">
            🔒
          </div>
          <h2 className="font-display font-bold text-xl text-tinta">{t.editor.pinModalTitle}</h2>
          <p className="text-sm text-tinta-pudar">{t.editor.pinModalDesc}</p>
          <form onSubmit={handlePinSubmit} className="space-y-4 mt-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder={t.editor.pinModalPlaceholder}
              className="w-full text-center text-3xl tracking-[0.5em] font-mono border border-tinta/20 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-stamp focus:border-stamp transition-all"
            />
            {pinError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{t.editor.pinModalError}</p>}
            <Button type="submit" fullWidth size="lg">{t.editor.pinModalSubmit}</Button>
          </form>
          <div className="mt-4 pt-4 border-t border-tinta/10">
            <Link href={`/p/${id}`} className="text-sm text-tinta-pudar hover:text-tinta underline underline-offset-4">
              Kembali ke Ringkasan
            </Link>
          </div>
        </div>
      </main>
    );
  }

  function handleLogout() {
    removeStoredEditToken(id);
    setCanEdit(false);
    setPinInput('');
  }

  return (
    <main className="min-h-screen bg-[#EDE9DF] pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-kertas/90 backdrop-blur-sm border-b border-tinta/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-tinta-pudar uppercase tracking-wide hidden sm:block">PtPtLah</p>
              {project.pin && (
                <span className="text-[10px] font-mono bg-tinta/10 text-tinta px-1.5 py-0.5 rounded-md" title="PIN Akses Edit">
                  PIN: {project.pin}
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-tinta text-base sm:text-lg leading-tight truncate">
              {project.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLogout}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm"
              title="Kunci Akses Edit"
            >
              🔒
            </button>
            <Link href={`/p/${id}`}>
              <Button size="sm" id="see-summary-btn" className="text-xs sm:text-sm px-3 sm:px-4">
                <span className="hidden sm:inline">{t.editor.seeResultBtn} →</span>
                <span className="sm:hidden">Ringkasan →</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-5 pb-10">
        <div className="flex flex-col lg:grid lg:grid-cols-[7fr_3fr] gap-5 items-start">

          {/* PESERTA (Mobile: 1st, Desktop: Right Col, Top) */}
          <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 bg-kertas rounded-2xl border border-tinta/10 shadow-sm overflow-hidden animate-fade-up w-full" style={{ animationDelay: '0.05s' }}>
            <PersonList
              persons={visiblePersons}
              items={visibleItems}
              onAdd={handleAddPerson}
              onDelete={handleDeletePerson}
              onRename={handleRenamePerson}
              readOnly={!canEdit}
            />
          </div>

          {/* ITEM (Mobile: 2nd, Desktop: Left Col, Span 2 Rows) */}
          <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 bg-kertas rounded-2xl border border-tinta/10 shadow-sm px-5 py-5 animate-fade-up w-full" style={{ animationDelay: '0.1s' }}>
            <h2 className="font-display font-semibold text-tinta mb-4">🧾 Item</h2>
            <ItemList
              items={visibleItems}
              persons={visiblePersons}
              onSave={handleSaveItem}
              onDelete={handleDeleteItem}
              projectId={id}
              readOnly={!canEdit}
            />
          </div>

          {/* PREVIEW TOTAL (Mobile: 3rd, Desktop: Right Col, Bottom) */}
          {settlement && visibleItems.length > 0 && (
            <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-2 bg-kertas rounded-2xl border border-tinta/10 shadow-sm px-5 py-4 space-y-2 animate-fade-up w-full" style={{ animationDelay: '0.15s' }}>
              <h2 className="font-display font-semibold text-tinta mb-2">📊 Preview Total</h2>
              <ReceiptDivider />
              <div className="flex justify-between text-sm text-tinta-pudar">
                <span className="font-mono uppercase text-xs tracking-wide">Subtotal</span>
                <MoneyDisplay amount={subtotal} size="sm" color="muted" />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-dashed border-tinta/15">
                <span className="font-mono uppercase text-sm tracking-wide font-bold text-tinta">Total</span>
                <MoneyDisplay amount={settlement.total_expense} size="lg" className="font-bold" />
              </div>

              <ReceiptDivider label="Settlement" />
              {settlement.transactions.length === 0 ? (
                <p className="text-xs text-lunas text-center">✅ Tidak ada yang perlu transfer</p>
              ) : (
                <div className="space-y-1">
                  {settlement.transactions.map((txn, i) => {
                    const from = visiblePersons.find((p) => p.id === txn.from_person_id);
                    const to = visiblePersons.find((p) => p.id === txn.to_person_id);
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-tinta">{from?.name} → {to?.name}</span>
                        <MoneyDisplay amount={txn.amount} size="sm" color="negative" />
                      </div>
                    );
                  })}
                </div>
              )}

              {visibleItems.length > 0 && (
                <Link href={`/p/${id}`} className="block mt-3">
                  <Button fullWidth size="sm" id="goto-summary-btn">
                    {t.editor.seeResultBtn} →
                  </Button>
                </Link>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Undo Toast */}
      {lastDeleted && pendingDeletes.has(lastDeleted.id) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-tinta text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-fade-up overflow-hidden">
          <span className="text-sm font-medium z-10">
            {lastDeleted.type === 'person' ? 'Peserta' : 'Item'} <span className="font-bold">"{lastDeleted.name}"</span> dihapus.
          </span>
          <button 
            onClick={() => handleUndo(lastDeleted.id)}
            className="text-sm font-bold text-stamp hover:text-stamp-light underline decoration-2 underline-offset-2 transition-colors z-10"
          >
            Undo
          </button>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full animate-shrink-x origin-left" />
        </div>
      )}
    </main>
  );
}
