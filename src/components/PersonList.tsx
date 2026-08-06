'use client';

import { useState, useRef } from 'react';
import { useTranslation } from '@/i18n';
import type { Person } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PersonBadge } from './ui/PersonBadge';
import { getInitials, getAvatarColor } from '@/lib/avatar';

interface PersonListProps {
  persons: Person[];
  items?: Array<{ paid_by_person_id: string; participants: Array<{ person_id: string }> }>;
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  readOnly?: boolean;
}

export function PersonList({ persons, items = [], onAdd, onDelete, onRename, readOnly = false }: PersonListProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startAddPerson = () => {
    setEditingId('new');
    setNewName('');
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
      }
    }, 50);
  };

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

  function handleDeleteWithWarning(person: Person) {
    const paidItems = items.filter(i => i.paid_by_person_id === person.id);
    const involvedItems = items.filter(i => i.participants.some(p => p.person_id === person.id));
    
    if (paidItems.length > 0) {
      const msg = `"${person.name}" membayar ${paidItems.length} item. Hapus peserta ini akan bermasalah — edit dulu siapa yang membayar item tersebut, atau konfirmasi hapus paksa?`;
      if (!window.confirm(msg)) return;
    } else if (involvedItems.length > 0) {
      const msg = `"${person.name}" ikut menanggung ${involvedItems.length} item. Peserta ini akan dikeluarkan dari semua item tersebut. Lanjutkan?`;
      if (!window.confirm(msg)) return;
    }
    onDelete(person.id);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-tinta/10">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-tinta">
            {t.editor.personSectionTitle}
          </span>
          <span className="text-xs font-mono bg-tinta/10 text-tinta-pudar px-2 py-0.5 rounded-full">
            {persons.length}
          </span>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={startAddPerson}
            className="text-sm font-semibold text-tinta hover:text-stamp transition-colors flex items-center gap-1"
          >
            Tambah Peserta <span className="text-lg leading-none">+</span>
          </button>
        )}
      </div>

      {/* List */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-5 pb-5 pt-5 scrollbar-hide snap-x"
      >
      {persons.map((person, i) => {
        const isEditing = editingId === person.id;
        
        return (
          <div 
            key={person.id}
            className="group shrink-0 flex flex-col items-center gap-2 snap-center relative w-16"
            onMouseEnter={() => setHoveredId(person.id)}
            onMouseLeave={() => setHoveredId(null)}
            onTouchStart={() => setHoveredId(person.id === hoveredId ? null : person.id)}
          >
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-sm"
              style={{ backgroundColor: getAvatarColor(i) }}
            >
              {getInitials(person.name)}
            </div>
            
            {isEditing ? (
              <input
                className="w-20 text-center text-xs border border-tinta/30 outline-none rounded bg-white text-tinta absolute top-16 z-10"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(person.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => handleRename(person.id)}
                autoFocus
              />
            ) : (
              <div className="h-4 flex items-center justify-center w-full relative">
                <span className={`text-sm font-medium text-tinta truncate max-w-full absolute transition-opacity duration-150 ${hoveredId === person.id && !readOnly ? 'opacity-0' : 'opacity-100'}`}>
                  {person.name}
                </span>
                
                {!readOnly && (
                  <div className={`flex items-center gap-1 text-xs text-tinta-pudar transition-opacity absolute ${hoveredId === person.id ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                      onClick={() => { setEditingId(person.id); setEditName(person.name); }}
                      className="hover:text-tinta transition-colors"
                      title={t.common.edit}
                    >
                      ✏️
                    </button>
                    <span className="text-[10px] text-tinta/20">|</span>
                    <button 
                      onClick={() => handleDeleteWithWarning(person)}
                      className="hover:text-red-500 transition-colors"
                      title={t.common.delete}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add New Button */}
      {!readOnly && (
        <div className="shrink-0 flex flex-col items-center gap-2 snap-center w-16 relative">
          <button
            onClick={startAddPerson}
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl text-tinta bg-black/5 shadow-sm hover:bg-black/10 transition-colors"
            title="Tambah Peserta"
          >
            +
          </button>
          
          {editingId === 'new' ? (
            <input
              className="w-20 text-center text-xs border border-tinta/30 outline-none rounded bg-white text-tinta absolute top-16 z-10"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={() => { if (newName.trim()) handleAdd(); else setEditingId(null); }}
              autoFocus
              placeholder="Nama"
            />
          ) : (
            <div className="h-4 flex items-center justify-center w-full">
              <span className="text-sm font-medium text-tinta truncate max-w-full">
                Tambah
              </span>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
