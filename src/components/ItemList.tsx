'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import type { Item, ItemParticipant, Person, UpsertItemInput } from '@/lib/types';
import { MoneyDisplay } from './ui/MoneyDisplay';
import { PersonBadge } from './ui/PersonBadge';
import { Button } from './ui/Button';
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

  const personMap = Object.fromEntries(persons.map((p) => [p.id, p]));
  const personIndex = Object.fromEntries(persons.map((p, i) => [p.id, i]));

  const subtotal = items.reduce((s, i) => s + i.price, 0);

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

        if (editingId === item.id) {
          return (
            <ItemForm
              key={item.id}
              persons={persons}
              initialItem={item}
              onSave={async (data, participants) => {
                await onSave(data, participants);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              projectId={projectId}
            />
          );
        }

        return (
          <div
            key={item.id}
            className="group bg-white rounded-2xl border border-tinta/10 p-4 hover:border-tinta/25 transition-all duration-150"
          >
            {/* Top row: name + price */}
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-tinta text-base leading-tight">{item.name}</span>
              <MoneyDisplay amount={item.price} size="md" className="shrink-0" />
            </div>

            {/* Payer + participants */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-tinta-pudar">Bayar:</span>
              {payer && (
                <PersonBadge name={payer.name} index={payerIndex} size="sm" />
              )}
              <span className="text-xs text-tinta-pudar ml-1">→ Tanggung:</span>
              {item.participants.map((p) => {
                const person = personMap[p.person_id];
                const idx = personIndex[p.person_id] ?? 0;
                return person ? (
                  <PersonBadge key={p.person_id} name={person.name} index={idx} size="sm" />
                ) : null;
              })}
            </div>

            {/* Per-person split */}
            {item.participants.length > 0 && (
              <p className="text-xs text-tinta-pudar font-mono mt-1.5">
                ≈ Rp{Math.ceil(item.price / item.participants.length).toLocaleString('id-ID')} / orang
              </p>
            )}

            {/* Actions */}
            {!readOnly && (
              <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(item.id)}
                  id={`edit-item-${item.id}`}
                >
                  ✏️ {t.editor.editItemBtn}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(item.id)}
                  loading={deletingId === item.id}
                  id={`delete-item-${item.id}`}
                >
                  🗑️ {t.editor.deleteItemBtn}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add form inline */}
      {showAddForm && (
        <ItemForm
          persons={persons}
          onSave={async (data, participants) => {
            await onSave(data, participants);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          projectId={projectId}
        />
      )}

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
    </div>
  );
}
