'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import type { Item, ItemParticipant, Person, UpsertItemInput } from '@/lib/types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { getInitials, getAvatarColor } from '@/lib/avatar';

interface ItemFormProps {
  persons: Person[];
  initialItem?: Item;
  onSave: (
    item: UpsertItemInput,
    participants: ItemParticipant[]
  ) => Promise<void>;
  onCancel: () => void;
  projectId: string;
}

export function ItemForm({ persons, initialItem, onSave, onCancel, projectId }: ItemFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialItem?.name ?? '');
  const [price, setPrice] = useState(initialItem?.price.toString() ?? '');
  const [qty, setQty] = useState(initialItem?.qty?.toString() ?? '1');
  const [paidBy, setPaidBy] = useState(initialItem?.paid_by_person_id ?? persons[0]?.id ?? '');
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(initialItem?.participants.map((p) => p.person_id) ?? persons.map((p) => p.id))
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; price?: string; qty?: string; participants?: string }>({});

  // If no initial item, auto-check all persons
  useEffect(() => {
    if (!initialItem) {
      setParticipants(new Set(persons.map((p) => p.id)));
    }
  }, [persons, initialItem]);

  function toggleParticipant(personId: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }

  function validate() {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Nama item wajib diisi.';
    const priceNum = parseInt(price.replace(/\D/g, ''), 10);
    if (!priceNum || priceNum < 0) errs.price = 'Harga tidak valid.';
    const qtyNum = parseInt(qty.replace(/\D/g, ''), 10);
    if (!qtyNum || qtyNum <= 0) errs.qty = 'Qty harus lebih dari 0.';
    if (participants.size === 0) errs.participants = 'Pilih minimal 1 peserta.';
    return errs;
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      
      // Auto-focus first invalid field
      if (errs.name) document.getElementById('item-name-input')?.focus();
      else if (errs.price) document.getElementById('item-price-input')?.focus();
      else if (errs.qty) document.getElementById('item-qty-input')?.focus();
      else if (errs.participants) {
        // Scroll to participants area
        document.getElementById('item-participants-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    setErrors({});
    setLoading(true);

    const priceNum = parseInt(price.replace(/\D/g, ''), 10);
    const qtyNum = parseInt(qty.replace(/\D/g, ''), 10) || 1;
    const participantList: ItemParticipant[] = Array.from(participants).map((id) => ({
      person_id: id,
      weight: 1,
    }));

    try {
      await onSave(
        {
          id: initialItem?.id,
          project_id: projectId,
          name: name.trim(),
          price: priceNum,
          qty: qtyNum,
          paid_by_person_id: paidBy,
          order: initialItem?.order ?? Math.floor(Date.now() / 1000),
        },
        participantList
      );
    } finally {
      setLoading(false);
    }
  }

  const personOptions = persons.map((p) => ({ value: p.id, label: p.name }));
  const priceNum = parseInt(price.replace(/\D/g, ''), 10) || 0;
  const qtyNum = parseInt(qty.replace(/\D/g, ''), 10) || 1;
  const itemTotal = priceNum * qtyNum;
  const perPerson = participants.size > 0 ? Math.ceil(itemTotal / participants.size) : 0;

  function handleQtyKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseInt(qty.replace(/\D/g, ''), 10) || 1;
      if (current > 1) setQty((current - 1).toString());
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const current = parseInt(qty.replace(/\D/g, ''), 10) || 0;
      setQty((current + 1).toString());
    }
  }

  const handleEnterSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <form onSubmit={handleSave} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }} className="space-y-4">
      {/* Name */}
      <Input
        label={t.editor.itemNameLabel}
        placeholder={t.editor.itemNamePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleEnterSubmit}
        error={errors.name}
        id="item-name-input"
        autoFocus
      />

      <div className="grid grid-cols-[1fr_130px] gap-3">
        {/* Price */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-tinta">{t.editor.itemPriceLabel}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-pudar font-mono text-sm">Rp</span>
            <input
              id="item-price-input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={price ? parseInt(price.replace(/\D/g, ''), 10).toLocaleString('id-ID') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setPrice(raw);
              }}
              onKeyDown={handleEnterSubmit}
              className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-tinta bg-white font-mono
                placeholder:text-tinta-pudar/60 border-tinta/20
                focus:outline-none focus:ring-2 focus:ring-stamp/30 focus:border-stamp
                transition-all duration-150
                ${errors.price ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.price && <p className="text-xs text-red-600">{errors.price}</p>}
        </div>

        {/* Qty */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-tinta">Qty</label>
          <div className={`flex items-center border rounded-xl bg-white transition-all duration-150 ${errors.qty ? 'border-red-500' : 'border-tinta/20 focus-within:ring-2 focus-within:ring-stamp/30 focus-within:border-stamp'}`}>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                const current = parseInt(qty.replace(/\D/g, ''), 10) || 1;
                if (current > 1) setQty((current - 1).toString());
              }}
              className="px-3 py-2.5 text-tinta-pudar hover:text-tinta hover:bg-black/5 rounded-l-xl transition-colors"
            >
              −
            </button>
            <input
              id="item-qty-input"
              type="text"
              inputMode="numeric"
              value={qty}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setQty(raw);
              }}
              onKeyDown={(e) => {
                handleQtyKey(e);
                handleEnterSubmit(e);
              }}
              className="w-full min-w-0 text-center text-tinta font-mono focus:outline-none bg-transparent py-2.5"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                const current = parseInt(qty.replace(/\D/g, ''), 10) || 0;
                setQty((current + 1).toString());
              }}
              className="px-3 py-2.5 text-tinta-pudar hover:text-tinta hover:bg-black/5 rounded-r-xl transition-colors"
            >
              ＋
            </button>
          </div>
          {errors.qty && <p className="text-xs text-red-600">{errors.qty}</p>}
        </div>
      </div>

      {priceNum > 0 && qtyNum > 1 && (
        <div className="flex justify-end text-xs text-tinta-pudar font-mono">
          Subtotal: Rp{itemTotal.toLocaleString('id-ID')}
        </div>
      )}

      <Select
        label={t.editor.paidByLabel}
        options={personOptions}
        value={paidBy}
        onChange={(e) => setPaidBy(e.target.value)}
        id="item-paid-by-select"
      />

      {/* Participant checklist */}
      <div id="item-participants-section" className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-tinta">{t.editor.participantsLabel}</label>
          <button
            id="toggle-all-btn"
            type="button"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById(`participant-cb-${persons[0]?.id}`)?.focus();
              }
            }}
            onClick={() =>
              setParticipants(
                participants.size === persons.length
                  ? new Set()
                  : new Set(persons.map((p) => p.id))
              )
            }
            className="text-xs text-stamp hover:underline"
          >
            {participants.size === persons.length ? 'Hapus semua' : 'Pilih semua'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {persons.map((person, index) => {
            const checked = participants.has(person.id);
            const color = getAvatarColor(index);
            const initials = getInitials(person.name);

            return (
              <label
                key={person.id}
                className={`
                  flex-1 basis-[18%] min-w-[60px] flex flex-col items-center gap-2 p-3 rounded-2xl border cursor-pointer
                  transition-all duration-150 select-none outline-none
                  focus-within:ring-2 focus-within:ring-stamp focus-within:ring-offset-1
                  ${checked
                    ? 'bg-stamp/8 border-stamp/50 shadow-sm'
                    : 'bg-white border-tinta/15 opacity-55 hover:opacity-90 hover:border-tinta/30'
                  }
                `}
              >
                <input
                  id={`participant-cb-${person.id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleParticipant(person.id)}
                  onKeyDown={(e) => {
                    if (index === 0 && e.key === 'Tab' && e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('toggle-all-btn')?.focus();
                    }
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm transition-all duration-150 ${
                    checked ? 'scale-100 ring-2 ring-white ring-offset-1' : 'scale-90 grayscale opacity-70'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </div>
                <span className={`text-xs font-medium truncate w-full text-center ${checked ? 'text-tinta font-semibold' : 'text-tinta-pudar'}`}>
                  {person.name}
                </span>
              </label>
            );
          })}
        </div>
        {errors.participants && <p className="text-xs text-red-600">{errors.participants}</p>}

        {/* Per-person preview */}
        {priceNum > 0 && participants.size > 0 && (
          <p className="text-xs text-tinta-pudar text-right font-mono">
            {participants.size} orang ≈ @Rp{perPerson.toLocaleString('id-ID')}
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onCancel}
          fullWidth
          id="item-cancel-btn"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
              e.preventDefault();
              document.getElementById('item-save-btn')?.focus();
            }
          }}
        >
          {t.editor.cancelBtn}
        </Button>
        <Button
          type="submit"
          loading={loading}
          fullWidth
          id="item-save-btn"
          onKeyDown={(e) => {
            if (e.key === 'Tab' && e.shiftKey) {
              e.preventDefault();
              document.getElementById('item-cancel-btn')?.focus();
            }
          }}
        >
          {t.editor.saveItemBtn}
        </Button>
      </div>
    </form>
  );
}
