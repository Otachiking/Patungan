'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import type { Person } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PersonBadge } from './ui/PersonBadge';

interface PersonListProps {
  persons: Person[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  readOnly?: boolean;
}

export function PersonList({ persons, onAdd, onDelete, onRename, readOnly = false }: PersonListProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onAdd(trimmed);
      setNewName('');
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onRename(id, trimmed);
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {persons.map((person, i) => (
          <div
            key={person.id}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-tinta/10 group"
          >
            {editingId === person.id ? (
              <>
                <input
                  className="flex-1 text-sm border-0 outline-none bg-transparent text-tinta"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(person.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={() => handleRename(person.id)} loading={loading}>
                  {t.common.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  {t.common.cancel}
                </Button>
              </>
            ) : (
              <>
                <PersonBadge name={person.name} index={i} size="sm" className="flex-1" />
                {!readOnly && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(person.id); setEditName(person.name); }}
                      className="p-1 rounded-lg text-tinta-pudar hover:text-tinta hover:bg-tinta/5 transition-colors"
                      title={t.common.edit}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(person.id)}
                      className="p-1 rounded-lg text-tinta-pudar hover:text-red-600 hover:bg-red-50 transition-colors"
                      title={t.common.delete}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder={t.landing.personNamePlaceholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1"
            id="add-person-input"
          />
          <Button
            size="md"
            variant="secondary"
            onClick={handleAdd}
            loading={loading}
            disabled={!newName.trim()}
            id="add-person-btn"
          >
            + Tambah
          </Button>
        </div>
      )}
    </div>
  );
}
