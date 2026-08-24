/**
 * SpillTheBill — Calculation Engine
 *
 * Pure functions with zero side effects.
 * Can be unit-tested independently of UI/DB.
 * Implements §4 (balance), §5 (settlement), §6 (rounding), §7 (tax) from PROJECT.md.
 */

import type {
  Item,
  Person,
  PersonBalance,
  Project,
  SettlementResult,
  Transaction,
} from './types';

// ─── §6: Largest Remainder Method ────────────────────────────────────────────

/**
 * Given a map of raw (float) shares that sum to `total`,
 * returns integer shares that also sum exactly to `total`.
 */
export function applyLargestRemainder(
  shares: Record<string, number>,
  total: number
): Record<string, number> {
  const ids = Object.keys(shares);
  if (ids.length === 0) return {};

  const totalInt = Math.round(total);
  const floors: Record<string, number> = {};
  const remainders: Record<string, number> = {};

  for (const id of ids) {
    const floored = Math.floor(shares[id]);
    floors[id] = floored;
    remainders[id] = shares[id] - floored;
  }

  const floorSum = ids.reduce((s, id) => s + floors[id], 0);
  let leftover = totalInt - floorSum;

  // Sort by remainder descending (deterministic: tie-break by id)
  const sorted = [...ids].sort((a, b) => {
    const diff = remainders[b] - remainders[a];
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const result = { ...floors };
  for (const id of sorted) {
    if (leftover <= 0) break;
    result[id] += 1;
    leftover -= 1;
  }

  return result;
}

// ─── §4 + §7: Balance Calculation ────────────────────────────────────────────

/**
 * Calculates per-person balances from project data.
 * Balance is computed on-the-fly (not stored in DB).
 */
export function calculateBalances(
  project: Pick<Project, 'tax_rate'>,
  persons: Pick<Person, 'id'>[],
  items: Item[]
): Record<string, PersonBalance> {
  const personIds = persons.map((p) => p.id);

  // Initialize
  const rawSubtotals: Record<string, number> = {};
  const paid: Record<string, number> = {};
  for (const id of personIds) {
    rawSubtotals[id] = 0;
    paid[id] = 0;
  }

  // Accumulate per-item contributions
  for (const item of items) {
    const itemTotal = item.price * (item.qty ?? 1);
    // Always track who paid for this item, even if no one shoulders it
    if (item.paid_by_person_id in paid) {
      paid[item.paid_by_person_id] += itemTotal;
    }

    if (item.participants.length === 0) continue;

    const totalWeight = item.participants.reduce((s, p) => s + p.weight, 0);
    if (totalWeight === 0) continue;

    for (const participant of item.participants) {
      if (!(participant.person_id in rawSubtotals)) continue;
      rawSubtotals[participant.person_id] +=
        itemTotal * (participant.weight / totalWeight);
    }
  }

  // §6: Round subtotals using largest remainder
  // Only count items WITH participants — items with no participants have 0 expense for everyone
  const participatedItemsTotal = items
    .filter((i) => i.participants.length > 0 && i.participants.reduce((s, p) => s + p.weight, 0) > 0)
    .reduce((s, i) => s + i.price * (i.qty ?? 1), 0);
  const subtotals = applyLargestRemainder(rawSubtotals, participatedItemsTotal);

  // §7: Proportional tax distribution
  const totalSubtotal = Object.values(subtotals).reduce((s, v) => s + v, 0);
  const totalTax = Math.round(participatedItemsTotal * project.tax_rate);
  const rawTaxShares: Record<string, number> = {};

  for (const id of personIds) {
    rawTaxShares[id] =
      totalSubtotal > 0
        ? (subtotals[id] / totalSubtotal) * totalTax
        : totalTax / personIds.length;
  }
  const taxShares = applyLargestRemainder(rawTaxShares, totalTax);

  // Assemble final balances
  const balances: Record<string, PersonBalance> = {};
  for (const id of personIds) {
    const subtotal = subtotals[id] ?? 0;
    const tax = taxShares[id] ?? 0;
    const expense = subtotal + tax;
    const paidAmount = paid[id] ?? 0;
    balances[id] = {
      person_id: id,
      subtotal,
      tax,
      expense,
      paid: paidAmount,
      net: paidAmount - expense,
    };
  }

  return balances;
}

// ─── §5: Debt Simplification (Greedy) ────────────────────────────────────────

/**
 * Minimizes number of transfer transactions via greedy matching
 * of largest debtor to largest creditor.
 * Result: at most (n - 1) transactions for n people.
 */
export function calculateSettlement(
  balances: Record<string, PersonBalance>
): Transaction[] {
  // Work with mutable copies
  const debtors = Object.values(balances)
    .filter((b) => b.net < 0)
    .map((b) => ({ person_id: b.person_id, net: b.net }))
    .sort((a, b) => a.net - b.net); // most negative first

  const creditors = Object.values(balances)
    .filter((b) => b.net > 0)
    .map((b) => ({ person_id: b.person_id, net: b.net }))
    .sort((a, b) => b.net - a.net); // most positive first

  const transactions: Transaction[] = [];

  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const amount = Math.min(Math.abs(debtor.net), creditor.net);

    if (amount > 0) {
      transactions.push({
        from_person_id: debtor.person_id,
        to_person_id: creditor.person_id,
        amount,
      });
    }

    debtor.net += amount;
    creditor.net -= amount;

    if (Math.abs(debtor.net) < 1) di++;
    if (Math.abs(creditor.net) < 1) ci++;
  }

  return transactions;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Full calculation pipeline: balances + settlement.
 * This is the function called by UI components.
 */
export function calculateSettlementFull(
  project: Pick<Project, 'tax_rate'>,
  persons: Pick<Person, 'id'>[],
  items: Item[]
): SettlementResult {
  const balances = calculateBalances(project, persons, items);
  const transactions = calculateSettlement(balances);

  const total_expense = Object.values(balances).reduce(
    (s, b) => s + b.expense,
    0
  );
  const total_tax = Object.values(balances).reduce((s, b) => s + b.tax, 0);
  const total_paid = Object.values(balances).reduce((s, b) => s + b.paid, 0);

  return { balances, transactions, total_expense, total_tax, total_paid };
}

