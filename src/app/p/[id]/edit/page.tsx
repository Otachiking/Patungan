'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/i18n';
import { getProject, upsertItem, deleteItem, upsertPerson, deletePerson, getStoredEditToken, verifyEditToken } from '@/lib/db';
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
  const [showPersons, setShowPersons] = useState(false);

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
    await deleteItem(itemId);
    await load();
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
    await deletePerson(personId);
    await load();
  }

  async function handleRenamePerson(personId: string, name: string) {
    const person = project?.persons.find((p) => p.id === personId);
    if (!person) return;
    await upsertPerson({ ...person, name });
    await load();
  }

  // ─── Settlement preview ───────────────────────────────────────────────────

  const settlement = project
    ? calculateSettlementFull(project, project.persons, project.items)
    : null;

  const subtotal = project?.items.reduce((s, i) => s + i.price, 0) ?? 0;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-tinta-pudar font-mono text-sm animate-pulse">{t.common.loading}</div>
      </main>
    );
  }

  if (!project) return null;

  return (
    <main className="min-h-screen bg-[#EDE9DF] pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-kertas/90 backdrop-blur-sm border-b border-tinta/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-mono text-tinta-pudar uppercase tracking-wide">PtPtLah</p>
            <h1 className="font-display font-bold text-tinta text-lg leading-tight truncate">
              {project.title}
            </h1>
          </div>
          <Link href={`/p/${id}`}>
            <Button size="sm" id="see-summary-btn">
              {t.editor.seeResultBtn} →
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">

        {/* Persons panel */}
        <div className="bg-kertas rounded-2xl border border-tinta/10 shadow-sm">
          <button
            type="button"
            onClick={() => setShowPersons((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            id="toggle-persons-btn"
          >
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-tinta">
                {t.editor.personSectionTitle}
              </span>
              <span className="text-xs font-mono bg-tinta/10 text-tinta-pudar px-2 py-0.5 rounded-full">
                {project.persons.length}
              </span>
            </div>
            <span className="text-tinta-pudar text-sm">{showPersons ? '▲' : '▼'}</span>
          </button>

          {showPersons && (
            <div className="px-5 pb-5">
              <PersonList
                persons={project.persons}
                onAdd={handleAddPerson}
                onDelete={handleDeletePerson}
                onRename={handleRenamePerson}
                readOnly={!canEdit}
              />
            </div>
          )}
        </div>

        {/* Items panel */}
        <div className="bg-kertas rounded-2xl border border-tinta/10 shadow-sm px-5 py-5">
          <h2 className="font-display font-semibold text-tinta mb-4">🧾 Item</h2>
          <ItemList
            items={project.items}
            persons={project.persons}
            onSave={handleSaveItem}
            onDelete={handleDeleteItem}
            projectId={id}
            readOnly={!canEdit}
          />
        </div>

        {/* Live total preview */}
        {settlement && project.items.length > 0 && (
          <div className="bg-kertas rounded-2xl border border-tinta/10 shadow-sm px-5 py-4 space-y-2">
            <h2 className="font-display font-semibold text-tinta mb-2">📊 Preview Total</h2>
            <ReceiptDivider />
            <div className="flex justify-between text-sm text-tinta-pudar">
              <span className="font-mono uppercase text-xs tracking-wide">Subtotal</span>
              <MoneyDisplay amount={subtotal} size="sm" color="muted" />
            </div>
            {project.tax_rate > 0 && (
              <div className="flex justify-between text-sm text-tinta-pudar">
                <span className="font-mono uppercase text-xs tracking-wide">
                  PPN {Math.round(project.tax_rate * 100)}%
                </span>
                <MoneyDisplay amount={settlement.total_tax} size="sm" color="muted" />
              </div>
            )}
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
                  const from = project.persons.find((p) => p.id === txn.from_person_id);
                  const to = project.persons.find((p) => p.id === txn.to_person_id);
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-tinta">{from?.name} → {to?.name}</span>
                      <MoneyDisplay amount={txn.amount} size="sm" color="negative" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CTA to summary */}
        {project.items.length > 0 && (
          <Link href={`/p/${id}`}>
            <Button fullWidth size="lg" id="goto-summary-btn">
              {t.editor.seeResultBtn} →
            </Button>
          </Link>
        )}
      </div>
    </main>
  );
}
