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

// ─── Local History (recently created events) ──────────────────────────────────

const HISTORY_KEY = 'ptptlah-history';
const MAX_HISTORY = 20;

export interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  personCount: number;
  createdAt: string; // ISO timestamp
}

export function saveToHistory(entry: HistoryEntry): void {
  if (typeof window === 'undefined') return;
  const existing: HistoryEntry[] = getHistory();
  const filtered = existing.filter((e) => e.id !== entry.id);
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}
