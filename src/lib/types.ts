// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface Project {
  id: string;
  title: string;
  date: string; // ISO date string
  share_slug: string;
  edit_token: string;
  pin?: string;
  currency: string; // default "IDR"
  tax_rate: number; // e.g. 0.11 for 11%
  created_at: string;
}

export interface Person {
  id: string;
  project_id: string;
  name: string;
  order: number;
}

export interface ItemParticipant {
  person_id: string;
  weight: number; // default 1 (equal split), extensible for v2
}

export interface Item {
  id: string;
  project_id: string;
  name: string;
  price: number; // in smallest currency unit (Rupiah, integer)
  qty: number;
  paid_by_person_id: string;
  participants: ItemParticipant[];
  order: number;
}

// ─── Calculation Result Types ─────────────────────────────────────────────────

export interface PersonBalance {
  person_id: string;
  subtotal: number; // share of item prices (before tax)
  tax: number; // proportional tax share
  expense: number; // subtotal + tax (what they owe in total)
  paid: number; // what they actually paid upfront
  net: number; // paid - expense (positive = creditor, negative = debtor)
}

export interface Transaction {
  from_person_id: string; // debtor (pays)
  to_person_id: string; // creditor (receives)
  amount: number;
}

export interface SettlementResult {
  balances: Record<string, PersonBalance>;
  transactions: Transaction[];
  total_expense: number;
  total_tax: number;
  total_paid: number;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface ProjectWithRelations extends Project {
  persons: Person[];
  items: Item[];
}

export type CreateProjectInput = {
  title: string;
  currency?: string;
  tax_rate?: number;
  person_names: string[];
  pin?: string;
};

export type UpsertItemInput = Omit<Item, 'id' | 'created_at' | 'participants'> & { id?: string };
export type UpsertPersonInput = Omit<Person, 'id' | 'created_at'> & { id?: string };

export interface ReceiptImage {
  id: string;
  project_id: string;
  storage_path: string;
  public_url: string;
  uploaded_at: string;
  order: number;
}
