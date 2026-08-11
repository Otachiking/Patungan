/**
 * Data Access Layer — all DB operations go through here.
 * Uses Supabase client. Server-side friendly (no 'use client').
 */

import { supabase } from './supabase';
import type {
  CreateProjectInput,
  Item,
  ItemParticipant,
  Person,
  Project,
  ProjectWithRelations,
  ReceiptImage,
  UpsertItemInput,
  UpsertPersonInput,
} from './types';

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(input: CreateProjectInput): Promise<ProjectWithRelations> {
  // 1. Create project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      title: input.title,
      currency: input.currency ?? 'IDR',
      tax_rate: input.tax_rate ?? 0,
      pin: input.pin ?? Math.floor(1000 + Math.random() * 9000).toString(),
    })
    .select()
    .single();

  if (projErr || !project) throw new Error(projErr?.message ?? 'Failed to create project');

  // 2. Create persons
  const personInserts = input.person_names.map((name, i) => ({
    project_id: project.id,
    name: name.trim(),
    order: i,
  }));

  const { data: persons, error: personErr } = await supabase
    .from('persons')
    .insert(personInserts)
    .select();

  if (personErr || !persons) throw new Error(personErr?.message ?? 'Failed to create persons');

  return { ...project, persons, items: [] };
}

export async function getProject(id: string): Promise<ProjectWithRelations | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) return null;

  const { data: persons } = await supabase
    .from('persons')
    .select('*')
    .eq('project_id', id)
    .order('order');

  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('project_id', id)
    .order('order');

  const { data: participants } = await supabase
    .from('item_participants')
    .select('*')
    .in('item_id', (items ?? []).map((i: Item) => i.id));

  const participantsByItem: Record<string, ItemParticipant[]> = {};
  for (const p of participants ?? []) {
    if (!participantsByItem[p.item_id]) participantsByItem[p.item_id] = [];
    participantsByItem[p.item_id].push({ person_id: p.person_id, weight: p.weight });
  }

  const itemsWithParticipants: Item[] = (items ?? []).map((item: Item) => ({
    ...item,
    participants: participantsByItem[item.id] ?? [],
  }));

  return {
    ...project,
    persons: persons ?? [],
    items: itemsWithParticipants,
  };
}

export async function getProjectBySlug(slug: string): Promise<ProjectWithRelations | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('share_slug', slug)
    .single();

  if (error || !project) return null;
  return getProject(project.id);
}

// ─── Persons ──────────────────────────────────────────────────────────────────

export async function upsertPerson(person: UpsertPersonInput): Promise<Person> {
  const { data, error } = await supabase
    .from('persons')
    .upsert(person)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to upsert person');
  return data;
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('persons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function upsertItem(
  item: UpsertItemInput,
  participants: ItemParticipant[]
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .upsert({ ...item })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to upsert item');

  // Replace participants
  await supabase.from('item_participants').delete().eq('item_id', data.id);

  if (participants.length > 0) {
    const { error: pErr } = await supabase.from('item_participants').insert(
      participants.map((p) => ({ item_id: data.id, ...p }))
    );
    if (pErr) throw new Error(pErr.message);
  }

  return { ...data, participants };
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Edit Token Verification ──────────────────────────────────────────────────

export function getStoredEditToken(projectId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`edit_token_${projectId}`);
}

export function storeEditToken(projectId: string, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`edit_token_${projectId}`, token);
}

export function removeStoredEditToken(projectId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`edit_token_${projectId}`);
}

export function verifyEditToken(project: Project, token: string | null): boolean {
  if (!token) return false;
  return project.edit_token === token || project.pin === token;
}

// ─── Local History (project IDs this device has created/visited) ──────────────

const HISTORY_KEY = 'ptptlah-history';
const MAX_HISTORY = 20;

/** Lightweight local record — just the project ID list */
export function addToHistoryIds(projectId: string): void {
  if (typeof window === 'undefined') return;
  const ids = getHistoryIds().filter((id) => id !== projectId);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([projectId, ...ids].slice(0, MAX_HISTORY)));
}

export function getHistoryIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const stringIds = parsed as string[];
    const validIds = stringIds.filter(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
    
    // Clean up if there are invalid IDs in localStorage
    if (validIds.length !== stringIds.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(validIds));
    }
    
    return validIds;
  } catch {
    return [];
  }
}

/** Richer history entry fetched from DB */
export interface HistorySummary {
  id: string;
  title: string;
  date: string;
  personCount: number;
  itemCount: number;
  totalSpend: number;
}

/** Batch-fetch project summaries from DB for the stored IDs */
export async function fetchHistorySummaries(): Promise<HistorySummary[]> {
  const ids = getHistoryIds();
  if (ids.length === 0) return [];

  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, title, created_at')
    .in('id', ids);

  if (projErr) {
    console.warn('History fetch failed:', projErr);
    return [];
  }
  if (!projects || projects.length === 0) {
    return [];
  }

  // Fetch person counts
  const { data: persons } = await supabase
    .from('persons')
    .select('project_id')
    .in('project_id', ids);

  // Fetch items for total spend
  const { data: items } = await supabase
    .from('items')
    .select('project_id, price, qty')
    .in('project_id', ids);

  // Aggregate
  const personCounts: Record<string, number> = {};
  const itemCounts: Record<string, number> = {};
  const totalSpends: Record<string, number> = {};

  for (const p of persons ?? []) {
    personCounts[p.project_id] = (personCounts[p.project_id] ?? 0) + 1;
  }
  for (const item of items ?? []) {
    itemCounts[item.project_id] = (itemCounts[item.project_id] ?? 0) + 1;
    totalSpends[item.project_id] = (totalSpends[item.project_id] ?? 0) + item.price * (item.qty ?? 1);
  }

  // Sort by original localStorage order
  const summaries: HistorySummary[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    personCount: personCounts[p.id] ?? 0,
    itemCount: itemCounts[p.id] ?? 0,
    totalSpend: totalSpends[p.id] ?? 0,
  }));

  // Sort by original localStorage order
  summaries.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return summaries;
}

// Keep backward compat aliases
export type HistoryEntry = HistorySummary;
export const saveToHistory = (entry: { id: string }) => addToHistoryIds(entry.id);
export const getHistory = (): HistorySummary[] => []; // use fetchHistorySummaries instead

// ─── Demo / Sample Data Seed (DEV ONLY) ───────────────────────────────────────

/**
 * Seeds a sample project for development/testing.
 * Only callable when NODE_ENV !== 'production'.
 * Triggered via URL param: ?demo=true
 */
export async function seedDemoProject(): Promise<string> {
  const sampleTitle = 'Makan Malam Bareng Gengs 🍜';
  const sampleNames = ['Budi', 'Siti', 'Andi', 'Rara', 'Joko'];
  const pin = '1234';

  const project = await createProject({
    title: sampleTitle,
    currency: 'IDR',
    tax_rate: 0, // No tax
    person_names: sampleNames,
    pin,
  });

  const persons = project.persons;
  const pid = project.id;

  // 15 Sample items
  const sampleItems = [
    { name: 'Bakso Malang', price: 35000, qty: 2, paidBy: 0, participants: [0, 1, 2, 3] },
    { name: 'Es Teh Manis', price: 8000, qty: 4, paidBy: 1, participants: [0, 1, 2, 3] },
    { name: 'Ayam Goreng', price: 28000, qty: 1, paidBy: 0, participants: [0, 2] },
    { name: 'Nasi Putih', price: 5000, qty: 4, paidBy: 2, participants: [0, 1, 2, 3] },
    { name: 'Kerupuk', price: 3000, qty: 2, paidBy: 3, participants: [1, 3] },
    { name: 'Sate Ayam', price: 45000, qty: 1, paidBy: 4, participants: [0, 1, 2, 3, 4] },
    { name: 'Nasi Goreng Spesial', price: 40000, qty: 2, paidBy: 2, participants: [2, 4] },
    { name: 'Mie Goreng Seafood', price: 42000, qty: 1, paidBy: 1, participants: [1, 3] },
    { name: 'Jus Alpukat', price: 15000, qty: 3, paidBy: 3, participants: [2, 3, 4] },
    { name: 'Jus Jeruk', price: 12000, qty: 2, paidBy: 0, participants: [0, 1] },
    { name: 'Kopi Hitam', price: 10000, qty: 1, paidBy: 4, participants: [4] },
    { name: 'Teh Tawar', price: 4000, qty: 5, paidBy: 0, participants: [0, 1, 2, 3, 4] },
    { name: 'Pisang Goreng', price: 15000, qty: 1, paidBy: 1, participants: [0, 1, 2, 3, 4] },
    { name: 'Roti Bakar', price: 20000, qty: 1, paidBy: 2, participants: [3, 4] },
    { name: 'Gorengan Campur', price: 10000, qty: 2, paidBy: 3, participants: [0, 1, 2, 3, 4] },
  ];

  // Bulk insert items
  const itemInserts = sampleItems.map((si, i) => ({
    project_id: pid,
    name: si.name,
    price: si.price,
    qty: si.qty,
    paid_by_person_id: persons[si.paidBy].id,
    order: i,
  }));

  const { data: dbItems, error: itemErr } = await supabase
    .from('items')
    .insert(itemInserts)
    .select();

  if (!itemErr && dbItems && dbItems.length === sampleItems.length) {
    // Bulk insert participants
    const participantInserts = [];
    for (let i = 0; i < sampleItems.length; i++) {
      const dbItem = dbItems[i];
      const si = sampleItems[i];
      for (const pIdx of si.participants) {
        participantInserts.push({ item_id: dbItem.id, person_id: persons[pIdx].id, weight: 1 });
      }
    }
    await supabase.from('item_participants').insert(participantInserts);
  }

  storeEditToken(pid, project.edit_token);
  addToHistoryIds(pid);
  return pid;
}

// ─── Receipt Images (Gallery) ──────────────────────────────────────────────────

const RECEIPT_BUCKET = 'receipt-images';

export async function getReceiptImages(projectId: string): Promise<ReceiptImage[]> {
  const { data, error } = await supabase
    .from('receipt_images')
    .select('*')
    .eq('project_id', projectId)
    .order('order');
  if (error) return [];
  return data as ReceiptImage[];
}

/** Compress an image file client-side before upload. Max width/height: 1920px, quality: 0.82 */
async function compressImage(file: File, maxPx = 1920, quality = 0.82): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
    };
    img.src = url;
  });
}

export async function uploadReceiptImage(
  projectId: string,
  file: File,
  order: number
): Promise<ReceiptImage | null> {
  // Compress before upload
  const compressed = await compressImage(file);
  const ext = 'jpg';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `projects/${projectId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(storagePath, compressed, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const { data, error } = await supabase
    .from('receipt_images')
    .insert({ project_id: projectId, storage_path: storagePath, public_url: publicUrl, order })
    .select()
    .single();

  if (error) return null;
  return data as ReceiptImage;
}

export async function deleteReceiptImage(image: ReceiptImage): Promise<void> {
  await supabase.storage.from(RECEIPT_BUCKET).remove([image.storage_path]);
  await supabase.from('receipt_images').delete().eq('id', image.id);
}
