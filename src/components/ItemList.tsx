'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import type { Item, ItemParticipant, Person, UpsertItemInput } from '@/lib/types';
import { MoneyDisplay } from './ui/MoneyDisplay';
import { Button } from './ui/Button';
import { getInitials, getAvatarColor } from '@/lib/avatar';
import { ItemForm } from './ItemForm';

interface ItemListProps {
  items: Item[];
  persons: Person[];
  onSave: (item: UpsertItemInput, participants: ItemParticipant[]) => Promise<void>;
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
    <div className="space-y-2">
      {items.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-tinta-pudar">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-sm">{t.editor.noItemsYet}</p>
        </div>
      )}

      {items.map((item) => {
        const payer = personMap[item.paid_by_person_id];
        const payerIndex = personIndex[item.paid_by_person_id] ?? 0;
        const isEditing = editingId === item.id;

        return (
          <div key={item.id} className="rounded-2xl border border-tinta/10 overflow-hidden">
            {/* Header — always visible (click to toggle) */}
            <div
              className={`bg-white p-4 transition-all duration-150 ${!readOnly ? 'cursor-pointer' : ''} ${isEditing ? 'bg-tinta/[0.025] border-b border-tinta/10' : 'hover:bg-tinta/[0.02]'}`}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => !readOnly && setEditingId(isEditing ? null : item.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-tinta text-base leading-tight">
                  {item.name}{' '}
                  {(item.qty ?? 1) > 1 && (
                    <span className="text-sm font-normal text-tinta-pudar">(x{item.qty})</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {!readOnly && !isEditing && hoveredId === item.id && (
                    <span className="text-[11px] text-tinta-pudar/50 italic hidden sm:block">{t.common.edit}</span>
                  )}
                  {isEditing && !readOnly && (
                    <span className="text-[11px] text-stamp/70 font-mono hidden sm:block">▲ {t.editor.cancelBtn}</span>
                  )}
                  <MoneyDisplay amount={item.price * (item.qty ?? 1)} size="md" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
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
                {item.participants.length > 0 && (
                  <span className="text-xs text-tinta-pudar font-mono ml-auto whitespace-nowrap">
                    {item.participants.length} orang ≈ @Rp{Math.ceil((item.price * (item.qty ?? 1)) / item.participants.length).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
            </div>

            {/* Expanded inline edit form — below the header */}
            {isEditing && !readOnly && (
              <div className="bg-kertas p-4 animate-fade-up">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-semibold text-tinta text-sm uppercase tracking-wide opacity-60">
                    ✏️ {t.editor.editItemBtn}
                  </h3>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleDelete(item.id);
                      setEditingId(null);
                    }}
                    loading={deletingId === item.id}
                    className="h-7 py-0 text-xs px-2.5"
                  >
                    🗑 {t.editor.deleteItemBtn}
                  </Button>
                </div>
                <ItemForm
                  persons={persons}
                  initialItem={item}
                  onSave={async (data, participants) => {
                    await onSave(data, participants);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  projectId={projectId}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Subtotal */}
      {items.length > 0 && !showAddForm && (
        <div className="flex justify-between items-center pt-2 px-1">
          <span className="text-sm text-tinta-pudar font-mono uppercase tracking-wide">
            {t.editor.subtotalRow}
          </span>
          <MoneyDisplay amount={subtotal} size="md" />
        </div>
      )}

      {/* Inline Add form */}
      {showAddForm && !readOnly && (
        <div className="bg-kertas rounded-2xl border border-tinta/10 p-4 animate-fade-up">
          <ItemForm
            persons={persons}
            onSave={async (data, participants) => {
              await onSave(data, participants);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
            projectId={projectId}
          />
        </div>
      )}

      {/* Add button */}
      {!readOnly && !showAddForm && editingId === null && (
        <Button
          variant="secondary"
          fullWidth
          autoFocus={items.length === 0}
          onClick={() => {
            setEditingId(null);
            setShowAddForm(true);
          }}
          id="add-item-btn"
        >
          ＋ {t.editor.addItemBtn}
        </Button>
      )}
    </div>
  );
}

