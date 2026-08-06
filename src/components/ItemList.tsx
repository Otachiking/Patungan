'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import type { Item, ItemParticipant, Person, UpsertItemInput } from '@/lib/types';
import { MoneyDisplay } from './ui/MoneyDisplay';
import { PersonBadge } from './ui/PersonBadge';
import { Button } from './ui/Button';
import { getInitials, getAvatarColor } from '@/lib/avatar';
import { ItemForm } from './ItemForm';

interface ItemListProps {
  items: Item[];
  persons: Person[];
  onSave: (
    item: UpsertItemInput,
    participants: ItemParticipant[]
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  projectId: string;
  readOnly?: boolean;
}

export function ItemList({ items, persons, onSave, onDelete, projectId, readOnly = false }: ItemListProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const personMap = Object.fromEntries(persons.map((p) => [p.id, p]));
  const personIndex = Object.fromEntries(persons.map((p, i) => [p.id, i]));

  const subtotal = items.reduce((s, i) => s + (i.price * (i.qty ?? 1)), 0);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Item rows */}
      {items.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-tinta-pudar">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-sm">{t.editor.noItemsYet}</p>
        </div>
      )}

      {items.map((item) => {
        const payer = personMap[item.paid_by_person_id];
        const payerIndex = personIndex[item.paid_by_person_id] ?? 0;

        return (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border p-4 transition-all duration-150 border-tinta/10 ${!readOnly ? 'hover:border-tinta/25 cursor-pointer active:scale-[0.98]' : ''}`}
            onClick={() => !readOnly && setEditingId(item.id)}
          >
            {/* Top row: name + price (desktop only for price) */}
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-tinta text-base leading-tight pr-8 sm:pr-0">
                {item.name} {(item.qty ?? 1) > 1 && <span className="text-sm font-normal text-tinta-pudar">(x{item.qty})</span>}
              </span>
              <MoneyDisplay amount={item.price * (item.qty ?? 1)} size="md" className="shrink-0 hidden sm:block" />
            </div>

            {/* Row 2: Payer + Participants + right actions */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2">
              {/* Left: Payer + Ditanggung */}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-xs text-tinta-pudar shrink-0">{t.editor.paidByShort}:</span>
                {payer && (
                  <span
                    className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm shrink-0"
                    style={{ backgroundColor: getAvatarColor(payerIndex) }}
                    title={payer.name}
                  >
                    {getInitials(payer.name)}
                  </span>
                )}
                <span className="text-tinta/30 text-xs mx-0.5 shrink-0">|</span>
                <span className="text-xs text-tinta-pudar shrink-0">{t.editor.sharedByShort}:</span>
                <div className="flex gap-1 items-center flex-wrap">
                  {item.participants.slice(0, 3).map((p) => {
                    const person = personMap[p.person_id];
                    const idx = personIndex[p.person_id] ?? 0;
                    return person ? (
                      <span
                        key={p.person_id}
                        className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm"
                        style={{ backgroundColor: getAvatarColor(idx) }}
                        title={person.name}
                      >
                        {getInitials(person.name)}
                      </span>
                    ) : null;
                  })}
                  {item.participants.length > 3 && (
                    <span className="text-[10px] font-semibold text-tinta-pudar bg-tinta/10 px-1.5 py-0.5 rounded">
                      +{item.participants.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: per-person price + total price (mobile) */}
              <div className="relative flex items-center justify-between sm:justify-end shrink-0 h-8 mt-1 sm:mt-0">
                {item.participants.length > 0 && (
                  <p className="text-xs text-tinta-pudar font-mono sm:absolute sm:right-0 whitespace-nowrap">
                    ≈ Rp{Math.ceil((item.price * (item.qty ?? 1)) / item.participants.length).toLocaleString('id-ID')} / {t.editor.perPersonShort}
                  </p>
                )}
                
                {/* Mobile price (hidden on desktop) */}
                <div className="sm:hidden">
                  <MoneyDisplay amount={item.price * (item.qty ?? 1)} size="md" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Subtotal row */}
      {items.length > 0 && (
        <div className="flex justify-between items-center pt-2 px-1">
          <span className="text-sm text-tinta-pudar font-mono uppercase tracking-wide">
            {t.editor.subtotalRow}
          </span>
          <MoneyDisplay amount={subtotal} size="md" />
        </div>
      )}

      {/* Add button */}
      {!readOnly && !showAddForm && (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setEditingId(null);
            setShowAddForm(true);
          }}
          id="add-item-btn"
        >
          ＋ {t.editor.addItemBtn}
        </Button>
      )}

      {/* Edit/Add Modal */}
      {(editingId || showAddForm) && !readOnly && (() => {
        const itemToEdit = editingId ? items.find(i => i.id === editingId) : undefined;
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center bg-tinta/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#EDE9DF] w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-slide-up">
              <div className="p-5 sm:p-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-display font-semibold text-tinta text-lg">
                    {itemToEdit ? 'Edit Item' : t.editor.addItemBtn}
                  </h3>
                  {itemToEdit && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        await handleDelete(itemToEdit.id);
                        setEditingId(null);
                      }}
                      loading={deletingId === itemToEdit.id}
                      className="h-8 py-0 text-xs px-3"
                    >
                      🗑️ Hapus
                    </Button>
                  )}
                </div>
                
                <ItemForm
                  persons={persons}
                  initialItem={itemToEdit}
                  onSave={async (data, participants) => {
                    await onSave(data, participants);
                    setEditingId(null);
                    setShowAddForm(false);
                  }}
                  onCancel={() => {
                    setEditingId(null);
                    setShowAddForm(false);
                  }}
                  projectId={projectId}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
