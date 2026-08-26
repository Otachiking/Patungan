'use client';

import { useState, useRef } from 'react';
import { useTranslation } from '@/i18n';
import type { Person } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PersonBadge } from './ui/PersonBadge';
import { getInitials, getAvatarColor } from '@/lib/avatar';
import { Pencil, Trash2, Plus } from 'lucide-react';

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
            id="add-person-btn"
            type="button"
            onClick={startAddPerson}
            className="text-sm font-semibold text-tinta hover:text-stamp transition-colors flex items-center gap-1"
          >
            {t.editor.addPersonBtn} <Plus size={18} />
          </button>
        )}
      </div>

      {/* List */}
      <div 
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto px-5 pb-5 pt-5 scrollbar-hide snap-x"
      >
        {persons.map((person, i) => {
          const isEditing = editingId === person.id;
          
          return (
            <div 
              key={person.id}
              className="group shrink-0 flex flex-col items-center gap-2 snap-center relative w-16 md:w-20"
              onMouseEnter={() => setHoveredId(person.id)}
              onMouseLeave={() => setHoveredId(null)}
              onTouchStart={() => setHoveredId(person.id === hoveredId ? null : person.id)}
            >
              <div className="shrink-0 basis-[70px] flex flex-col items-center gap-2 relative">
                <div
                  className="group/avatar relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm md:text-xl text-white shadow-sm ring-2 ring-transparent transition-all cursor-pointer overflow-hidden"
                  style={{ backgroundColor: getAvatarColor(i) }}
                  title={person.name}
                >
                  {getInitials(person.name)}
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteWithWarning(person)}
                      className="absolute inset-0 bg-red-500/90 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity text-white"
                      title={t.common.delete}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                {isEditing ? (
                  <input
                    className="w-[120%] -ml-[10%] text-center text-[10px] md:text-xs border border-tinta/30 outline-none rounded bg-white text-tinta shadow-sm absolute top-10 md:top-14 z-10 py-0.5"
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
                  <div 
                    className="group/name relative w-full flex justify-center cursor-pointer"
                    onClick={() => !readOnly && (setEditingId(person.id), setEditName(person.name))}
                  >
                    <span className="text-[10px] md:text-xs font-medium text-tinta text-center leading-tight truncate px-1 max-w-full group-hover/name:opacity-0 transition-opacity">
                      {person.name}
                    </span>
                    {!readOnly && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-semibold text-tinta opacity-0 group-hover/name:opacity-100 transition-opacity bg-kertas/80 rounded backdrop-blur-[2px]">
                        <Pencil size={12} className="mr-0.5"/> Edit
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add New Button */}
        {!readOnly && (
          <div className="shrink-0 flex flex-col items-center gap-2 snap-center relative w-16 md:w-20">
            <button
              onClick={startAddPerson}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg md:text-2xl text-tinta bg-black/5 shadow-sm hover:bg-black/10 transition-colors"
              title={t.editor.addPersonBtn}
            >
              <Plus size={24} />
            </button>
            
            {editingId === 'new' ? (
              <input
                className="w-20 text-center text-xs border border-tinta/30 outline-none rounded bg-white text-tinta absolute top-10 md:top-14 z-10 shadow-sm"
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
              <div className="h-4 flex items-center justify-center w-full cursor-pointer hover:opacity-70 transition-opacity" onClick={startAddPerson}>
                <span className="text-[10px] md:text-xs font-medium text-tinta/40 truncate max-w-full">
                  {t.editor.addPersonBtn.split(' ')[0]} {/* Extract 'Tambah' or 'Add' */}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
