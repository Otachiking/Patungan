'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/i18n';
import { getProject, getProjectBySlug, upsertItem, deleteItem, upsertPerson, deletePerson, getStoredEditToken, verifyEditToken, storeEditToken, removeStoredEditToken, updateProject } from '@/lib/db';
import { calculateSettlementFull } from '@/lib/engine';
import type { Item, ItemParticipant, Person, ProjectWithRelations, UpsertItemInput } from '@/lib/types';
import { PersonList } from '@/components/PersonList';
import { ItemList } from '@/components/ItemList';
import { ReceiptGallery } from '@/components/ReceiptGallery';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { Button } from '@/components/ui/Button';
import { ReceiptDivider } from '@/components/ui/ReceiptDivider';
import { LockKeyhole, House, ReceiptText, CircleDollarSign, CheckCircle, Paperclip, ArrowRight } from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const { t } = useTranslation();

  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  // Dynamic page title
  useEffect(() => {
    if (project?.title) {
      document.title = `SpillTheBill – ${project.title}`;
    } else {
      document.title = 'SpillTheBill';
    }
    return () => { document.title = 'SpillTheBill'; };
  }, [project?.title]);

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
    let data = await getProject(id);
    if (!data) {
      // Try by slug
      data = await getProjectBySlug(id);
    }
    
    if (!data) {
      router.replace('/');
      return;
    }
    setProject(data);

    // Check URL for token first
    const urlToken = searchParams.get('t');
    if (urlToken && verifyEditToken(data, urlToken)) {
      storeEditToken(data.id, urlToken);
      // Clean up URL to avoid leaving token in address bar
      router.replace(`/p/${id}/edit`);
    }
    // BYPASS PIN: Always allow editing
    setCanEdit(true);
    
    setLoading(false);
  }, [id, router, searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canEdit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;
      
      if (e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        document.getElementById('add-item-btn')?.click();
      }
      if (e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        document.getElementById('add-person-btn')?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canEdit]);

  async function handleRenameTitle() {
    if (!project || !editTitle.trim() || !canEdit) {
      setIsEditingTitle(false);
      return;
    }
    await updateProject(project.id, { title: editTitle.trim() });
    setProject({ ...project, title: editTitle.trim() });
    setIsEditingTitle(false);
  }

  // ─── Item handlers ────────────────────────────────────────────────────────

  function handleSaveItem(item: UpsertItemInput, parts: ItemParticipant[]) {
    return new Promise<void>((resolve) => {
      const optimisticId = item.id || crypto.randomUUID();
      const optimisticItem = {
        id: optimisticId,
        project_id: item.project_id || id,
        name: item.name,
        price: item.price,
        qty: item.qty ?? 1,
        paid_by_person_id: item.paid_by_person_id,
        order: item.order ?? Math.floor(Date.now() / 1000),
        created_at: new Date().toISOString(),
        participants: parts
      };

      setProject(prev => {
        if (!prev) return prev;
        const newItems = prev.items.filter(i => i.id !== item.id);
        newItems.push(optimisticItem as any);
        newItems.sort((a, b) => b.order - a.order);
        return { ...prev, items: newItems };
      });

      // Resolve immediately for snappy UI
      resolve();

      // Background save
      upsertItem(item, parts)
        .then(savedItem => {
          setProject(prev => {
            if (!prev) return prev;
            const newItems = prev.items.map(i => i.id === optimisticId || i.id === item.id ? savedItem : i);
            return { ...prev, items: newItems };
          });
        })
        .catch(async e => {
          console.error('Failed to save item:', e);
          await load(); // Revert on failure
        });
    });
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
      <main className="min-h-screen bg-page-bg flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-lg max-w-sm w-full text-center space-y-4 animate-fade-up">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl">
            <LockKeyhole size={32} />
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
    <main className="min-h-screen bg-page-bg pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-kertas/90 backdrop-blur-sm border-b border-tinta/10 px-4 py-3">
        <div className="max-w-5xl mx-auto relative flex items-center justify-between min-h-[32px] gap-2">
          <Link href="/" className="shrink-0 text-tinta-pudar hover:text-tinta transition-colors flex items-center justify-center h-8 px-2.5 sm:px-3 z-10 bg-white/50 backdrop-blur-sm rounded-full border border-tinta/10 hover:bg-white/80 gap-1.5" title={t.common.home}>
            <House size={18} />
            <span className="hidden sm:inline text-xs font-medium font-body">{t.common.home}</span>
          </Link>
          
          <div className="flex-1 min-w-0 text-center px-2 z-0 flex justify-center">
            {isEditingTitle ? (
              <input
                className="font-display font-bold text-tinta text-base sm:text-lg text-center bg-white border border-tinta/20 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-stamp max-w-[200px]"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                onBlur={handleRenameTitle}
                autoFocus
              />
            ) : (
              <h1 
                className="font-display font-bold text-tinta text-base sm:text-lg leading-tight truncate cursor-pointer hover:opacity-70 transition-opacity text-center w-full"
                onClick={() => {
                  if (!canEdit) return;
                  setEditTitle(project.title);
                  setIsEditingTitle(true);
                }}
                title={canEdit ? "Edit Nama Acara" : ""}
              >
                {project.title}
              </h1>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-end z-10">
            <Link href={`/p/${id}`}>
              <Button size="sm" id="see-summary-btn" className="text-xs sm:text-sm px-3 sm:px-4">
                <span className="hidden sm:inline">{t.editor.seeResultBtn}</span>
                <span className="sm:hidden">Ringkasan</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-5 pb-10">
        <div className="flex flex-col lg:grid lg:grid-cols-[7fr_3fr] lg:grid-rows-[auto_1fr] gap-5 items-start">

          {/* PESERTA (Mobile: 1st, Desktop: Right Col, Top) */}
          <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 space-y-3 w-full min-w-0 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="bg-kertas rounded-2xl border border-tinta/10 shadow-sm overflow-hidden min-w-0">
              <PersonList
                persons={visiblePersons}
                items={visibleItems}
                onAdd={handleAddPerson}
                onDelete={handleDeletePerson}
                onRename={handleRenamePerson}
                readOnly={!canEdit}
              />
            </div>
          </div>

          {/* ITEM (Mobile: 2nd, Desktop: Left Col, Span 2 Rows) */}
          <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 bg-kertas rounded-2xl border border-tinta/10 shadow-sm px-5 py-5 w-full min-w-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="font-display font-semibold text-tinta mb-4 flex items-center gap-2"><ReceiptText size={18} /> Item</h2>
            <ItemList
              items={visibleItems}
              persons={visiblePersons}
              onSave={handleSaveItem}
              onDelete={handleDeleteItem}
              projectId={id}
              readOnly={!canEdit}
            />
          </div>

          {/* PREVIEW TOTAL & GALLERY (Mobile: 3rd & 4th, Desktop: Right Col, Middle/Bottom, Sticky) */}
          <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-2 flex flex-col gap-5 w-full min-w-0 animate-fade-up lg:sticky lg:top-20 self-start" style={{ animationDelay: '0.15s' }}>
            {settlement && visibleItems.length > 0 && (
              <div className="bg-kertas rounded-2xl border border-tinta/10 shadow-sm px-5 py-4 space-y-2">
                <h2 className="font-display font-semibold text-tinta mb-2 flex items-center gap-2"><CircleDollarSign size={18} /> Preview Total</h2>
                <ReceiptDivider />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-mono uppercase text-sm tracking-wide font-bold text-tinta">Total</span>
                  <MoneyDisplay amount={settlement.total_expense} size="lg" className="font-bold" />
                </div>

                <ReceiptDivider label="Settlement" />
                {settlement.transactions.length === 0 ? (
                  <p className="text-xs text-lunas flex items-center justify-center gap-1"><CheckCircle size={14} /> Tidak ada yang perlu transfer</p>
                ) : (
                  <div className="space-y-1">
                    {settlement.transactions.map((txn, i) => {
                      const from = visiblePersons.find((p) => p.id === txn.from_person_id);
                      const to = visiblePersons.find((p) => p.id === txn.to_person_id);
                      return (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-tinta flex items-center gap-1">{from?.name} <ArrowRight size={14} className="text-tinta-pudar" /> {to?.name}</span>
                          <MoneyDisplay amount={txn.amount} size="sm" color="negative" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {visibleItems.length > 0 && (
                  <Link href={`/p/${id}`} className="block mt-3">
                    <Button fullWidth size="md" id="goto-summary-btn">
                      {t.editor.seeResultBtn}
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* GALLERY */}
            <div className="bg-kertas rounded-2xl border border-tinta/10 shadow-sm p-4 w-full">
              <h2 className="font-display font-semibold text-tinta text-sm mb-3 flex items-center gap-2"><Paperclip size={16} /> {t.editor.documentation}</h2>
              <ReceiptGallery projectId={id} readOnly={!canEdit} />
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-4 pb-6 text-center">
        <p className="text-xs font-mono text-tinta-pudar opacity-70">
          SpillTheBill v1.5.2 ©2026 by <a href="https://instagram.com/otachiking" target="_blank" rel="noopener noreferrer" className="underline">Otachiking</a>
        </p>
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
