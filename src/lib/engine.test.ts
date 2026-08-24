/**
 * Unit tests for the SpillTheBill calculation engine.
 * Run with: npx vitest run src/lib/engine.test.ts
 *
 * Test cases (per §13 PROJECT.md):
 * 1. Equal split — 3 people, 1 item
 * 2. Multi-creditor settlement
 * 3. Rounding remainder — total must match exactly
 * 4. Proportional tax (11%)
 * 5. Edge cases: 1 person, 0 items
 */

import { describe, expect, it } from 'vitest';
import {
  applyLargestRemainder,
  calculateBalances,
  calculateSettlement,
  calculateSettlementFull,
} from './engine';
import type { Item, Person, PersonBalance, Project } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePerson(id: string): Person {
  return { id, project_id: 'proj1', name: id, order: 0 };
}

function makeItem(overrides: Partial<Item> & Pick<Item, 'id' | 'price' | 'paid_by_person_id' | 'participants'>): Item {
  return {
    project_id: 'proj1',
    name: 'Item',
    order: 0,
    ...overrides,
  };
}

const NO_TAX: Pick<Project, 'tax_rate'> = { tax_rate: 0 };
const TAX_11: Pick<Project, 'tax_rate'> = { tax_rate: 0.11 };

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('applyLargestRemainder', () => {
  it('distributes exactly to integer total', () => {
    const shares = { a: 33.333, b: 33.333, c: 33.334 };
    const result = applyLargestRemainder(shares, 100);
    expect(result.a + result.b + result.c).toBe(100);
    expect(Object.values(result).every((v) => Number.isInteger(v))).toBe(true);
  });

  it('handles single person', () => {
    const result = applyLargestRemainder({ a: 99.9 }, 100);
    expect(result.a).toBe(100);
  });

  it('handles empty input', () => {
    expect(applyLargestRemainder({}, 100)).toEqual({});
  });

  it('is deterministic (same result on repeated calls)', () => {
    const shares = { alice: 33.333, bob: 33.333, carol: 33.334 };
    const r1 = applyLargestRemainder(shares, 100);
    const r2 = applyLargestRemainder(shares, 100);
    expect(r1).toEqual(r2);
  });
});

describe('calculateBalances — equal split', () => {
  it('3 people, 1 item (Rp90.000 dibagi 3)', () => {
    const persons = [makePerson('alice'), makePerson('bob'), makePerson('carol')];
    const items = [
      makeItem({
        id: 'i1',
        price: 90000,
        paid_by_person_id: 'alice',
        participants: [
          { person_id: 'alice', weight: 1 },
          { person_id: 'bob', weight: 1 },
          { person_id: 'carol', weight: 1 },
        ],
      }),
    ];

    const balances = calculateBalances(NO_TAX, persons, items);

    // Each person owes 30000
    expect(balances['alice'].expense).toBe(30000);
    expect(balances['bob'].expense).toBe(30000);
    expect(balances['carol'].expense).toBe(30000);

    // Alice paid 90000, net = +60000 (creditor)
    expect(balances['alice'].net).toBe(60000);
    // Bob and Carol net = -30000 (debtors)
    expect(balances['bob'].net).toBe(-30000);
    expect(balances['carol'].net).toBe(-30000);

    // Grand total expense == item price
    const totalExpense = Object.values(balances).reduce((s, b) => s + b.expense, 0);
    expect(totalExpense).toBe(90000);
  });

  it('2 people, 2 items with different payers', () => {
    const persons = [makePerson('alice'), makePerson('bob')];
    // Alice pays item1 (Rp60000), Bob pays item2 (Rp40000)
    // Both split both items equally
    const items = [
      makeItem({
        id: 'i1',
        price: 60000,
        paid_by_person_id: 'alice',
        participants: [
          { person_id: 'alice', weight: 1 },
          { person_id: 'bob', weight: 1 },
        ],
      }),
      makeItem({
        id: 'i2',
        price: 40000,
        paid_by_person_id: 'bob',
        participants: [
          { person_id: 'alice', weight: 1 },
          { person_id: 'bob', weight: 1 },
        ],
      }),
    ];

    const balances = calculateBalances(NO_TAX, persons, items);

    // Each person's expense = 50000
    expect(balances['alice'].expense).toBe(50000);
    expect(balances['bob'].expense).toBe(50000);

    // Alice paid 60000 → net +10000
    expect(balances['alice'].net).toBe(10000);
    // Bob paid 40000 → net -10000
    expect(balances['bob'].net).toBe(-10000);
  });
});

describe('calculateSettlement — debt simplification', () => {
  it('1 creditor, 2 debtors', () => {
    const balances: Record<string, PersonBalance> = {
      alice: { person_id: 'alice', subtotal: 30000, tax: 0, expense: 30000, paid: 90000, net: 60000 },
      bob: { person_id: 'bob', subtotal: 30000, tax: 0, expense: 30000, paid: 0, net: -30000 },
      carol: { person_id: 'carol', subtotal: 30000, tax: 0, expense: 30000, paid: 0, net: -30000 },
    };

    const txns = calculateSettlement(balances);

    expect(txns).toHaveLength(2);
    // Both bob and carol pay alice
    expect(txns.every((t) => t.to_person_id === 'alice')).toBe(true);
    expect(txns.find((t) => t.from_person_id === 'bob')?.amount).toBe(30000);
    expect(txns.find((t) => t.from_person_id === 'carol')?.amount).toBe(30000);
  });

  it('multi-creditor: 2 creditors, 2 debtors → minimized transactions', () => {
    // alice: +50000, dave: +30000, bob: -40000, carol: -40000
    const balances: Record<string, PersonBalance> = {
      alice: { person_id: 'alice', subtotal: 0, tax: 0, expense: 0, paid: 50000, net: 50000 },
      dave: { person_id: 'dave', subtotal: 0, tax: 0, expense: 0, paid: 30000, net: 30000 },
      bob: { person_id: 'bob', subtotal: 0, tax: 0, expense: 40000, paid: 0, net: -40000 },
      carol: { person_id: 'carol', subtotal: 0, tax: 0, expense: 40000, paid: 0, net: -40000 },
    };

    const txns = calculateSettlement(balances);

    // At most n-1 = 3 transactions
    expect(txns.length).toBeLessThanOrEqual(3);

    // Verify money is conserved: sum of from == sum of to
    const totalFrom = txns.reduce((s, t) => s + t.amount, 0);
    expect(totalFrom).toBe(80000); // total debt = 80000
  });

  it('returns empty array when no debts', () => {
    const balances: Record<string, PersonBalance> = {
      alice: { person_id: 'alice', subtotal: 0, tax: 0, expense: 100, paid: 100, net: 0 },
    };
    expect(calculateSettlement(balances)).toHaveLength(0);
  });
});

describe('calculateBalances — rounding remainder', () => {
  it('total expense always equals total item price (grand total exact match)', () => {
    // Rp100 split 3 ways: 33.33/33.33/33.34 — must sum to exactly 100
    const persons = [makePerson('a'), makePerson('b'), makePerson('c')];
    const items = [
      makeItem({
        id: 'i1',
        price: 100,
        paid_by_person_id: 'a',
        participants: [
          { person_id: 'a', weight: 1 },
          { person_id: 'b', weight: 1 },
          { person_id: 'c', weight: 1 },
        ],
      }),
    ];

    const balances = calculateBalances(NO_TAX, persons, items);
    const total = Object.values(balances).reduce((s, b) => s + b.expense, 0);
    expect(total).toBe(100);
  });

  it('handles large number with many decimal places', () => {
    const persons = [makePerson('a'), makePerson('b'), makePerson('c'), makePerson('d'), makePerson('e'), makePerson('f'), makePerson('g')];
    const items = [
      makeItem({
        id: 'i1',
        price: 1000000, // Rp1.000.000 split 7 ways
        paid_by_person_id: 'a',
        participants: persons.map((p) => ({ person_id: p.id, weight: 1 })),
      }),
    ];

    const balances = calculateBalances(NO_TAX, persons, items);
    const total = Object.values(balances).reduce((s, b) => s + b.expense, 0);
    expect(total).toBe(1000000);
  });
});

describe('calculateBalances — proportional tax (§7)', () => {
  it('PPN 11% distributed proportionally to subtotal', () => {
    // alice orders Rp100.000, bob orders Rp50.000
    // alice pays for her item, bob for his
    const persons = [makePerson('alice'), makePerson('bob')];
    const items = [
      makeItem({
        id: 'i1',
        price: 100000,
        paid_by_person_id: 'alice',
        participants: [{ person_id: 'alice', weight: 1 }],
      }),
      makeItem({
        id: 'i2',
        price: 50000,
        paid_by_person_id: 'bob',
        participants: [{ person_id: 'bob', weight: 1 }],
      }),
    ];

    const balances = calculateBalances(TAX_11, persons, items);
    const total_items = 150000;
    const total_tax = Math.round(total_items * 0.11); // 16500

    // Alice's subtotal is 2/3 of total → she pays 2/3 of tax
    // Bob's subtotal is 1/3 → he pays 1/3 of tax
    const tax_total = Object.values(balances).reduce((s, b) => s + b.tax, 0);
    expect(tax_total).toBe(total_tax);

    // Alice's tax should be ~2x Bob's
    expect(balances['alice'].tax).toBeGreaterThan(balances['bob'].tax);
    expect(balances['alice'].subtotal).toBe(100000);
    expect(balances['bob'].subtotal).toBe(50000);

    // Total expense = items + tax
    const total_expense = Object.values(balances).reduce((s, b) => s + b.expense, 0);
    expect(total_expense).toBe(total_items + total_tax);
  });
});

describe('edge cases', () => {
  it('1 person only — no settlement needed', () => {
    const persons = [makePerson('solo')];
    const items = [
      makeItem({
        id: 'i1',
        price: 50000,
        paid_by_person_id: 'solo',
        participants: [{ person_id: 'solo', weight: 1 }],
      }),
    ];

    const result = calculateSettlementFull(NO_TAX, persons, items);
    expect(result.transactions).toHaveLength(0);
    expect(result.balances['solo'].net).toBe(0);
  });

  it('0 items — all balances are zero', () => {
    const persons = [makePerson('alice'), makePerson('bob')];
    const balances = calculateBalances(NO_TAX, persons, []);

    expect(balances['alice'].expense).toBe(0);
    expect(balances['bob'].expense).toBe(0);
  });

  it('item with no participants is ignored', () => {
    const persons = [makePerson('alice')];
    const items = [
      makeItem({
        id: 'i1',
        price: 50000,
        paid_by_person_id: 'alice',
        participants: [], // no one shoulders this item
      }),
    ];

    const balances = calculateBalances(NO_TAX, persons, items);
    // Alice paid but no one shoulders expense
    expect(balances['alice'].expense).toBe(0);
    expect(balances['alice'].paid).toBe(50000);
    expect(balances['alice'].net).toBe(50000);
  });
});

