import type { FocusData } from './focusBonuses.js';

export type FocusAllowanceType = 'warrior' | 'expert' | 'free';
export type FocusAllowance = { id: string; val: number };
// Numeric budgets remain available for isolated rule callers; the app passes progression grants.
export type FocusBudget = number | FocusAllowance[];
type FocusPick = { instanceId: string; focusId: string };

export const FOCUS_ALLOWANCE_LABELS: Record<FocusAllowanceType, string> = {
  warrior: 'Warrior (combat)', expert: 'Expert (non-combat)', free: 'Free (any focus)',
};
const TYPES: FocusAllowanceType[] = ['warrior', 'expert', 'free'];

export function compatibleFocusAllowances(focus: FocusData): FocusAllowanceType[] {
  return TYPES.filter((type) => type === 'free' || (Array.isArray(focus.tags) && focus.tags.includes(type === 'warrior' ? 'combat' : 'non-combat')));
}

export function evaluateFocusAllowances(instances: FocusPick[], foci: FocusData[], budget: FocusBudget, extraPicks = 0) {
  const issues: string[] = [];
  const totals: Record<FocusAllowanceType, number> = { warrior: 0, expert: 0, free: 0 };
  const grants = typeof budget === 'number' ? [{ id: 'free', val: budget }] : budget;
  if (!Array.isArray(grants) || grants.some((grant) => !grant || !TYPES.includes(grant.id as FocusAllowanceType) ||
      !Number.isSafeInteger(grant.val) || grant.val < 0) || !Number.isSafeInteger(extraPicks) || extraPicks < 0) {
    issues.push('Invalid focus allowance configuration.');
  } else {
    for (const grant of grants) totals[grant.id as FocusAllowanceType] += grant.val;
  }
  const baseLimit = totals.warrior + totals.expert + totals.free;
  totals.free += extraPicks;
  const limit = totals.warrior + totals.expert + totals.free;
  if (!Number.isSafeInteger(limit)) issues.push('Invalid focus allowance total.');
  const slots = issues.length ? [] : TYPES.flatMap((type) => Array<FocusAllowanceType>(Math.min(totals[type], instances.length)).fill(type));
  const owners = slots.map(() => -1);
  const byId = new Map(foci.map((focus) => [focus.id, focus]));
  const options = instances.map((item) => {
    const focus = byId.get(item.focusId);
    return focus ? compatibleFocusAllowances(focus) : [];
  });
  // Reassign flexible earlier picks rather than letting them block a restricted pick.
  const assign = (index: number, seen: Set<number>): boolean => {
    const compatible = slots.map((type, slot) => ({ type, slot })).filter(({ type, slot }) =>
      !seen.has(slot) && options[index]!.includes(type));
    for (const { slot } of compatible.filter(({ slot }) => owners[slot] === -1)) {
      owners[slot] = index;
      return true;
    }
    for (const { slot } of compatible) {
      if (seen.has(slot)) continue;
      seen.add(slot);
      if (assign(owners[slot]!, seen)) { owners[slot] = index; return true; }
    }
    return false;
  };
  instances.forEach((_, index) => assign(index, new Set()));
  const assignments = instances.flatMap((item, index) => {
    const slot = owners.indexOf(index);
    return slot < 0 ? [] : [{ instanceId: item.instanceId, type: slots[slot]! }];
  });
  const unassigned = instances.filter((item) => !assignments.some((assignment) => assignment.instanceId === item.instanceId));
  for (const item of unassigned) {
    const focus = byId.get(item.focusId);
    const allowed = focus ? compatibleFocusAllowances(focus).map((type) => FOCUS_ALLOWANCE_LABELS[type]).join(' or ') : 'a valid focus';
    issues.push(`${focus?.name ?? item.focusId}: no compatible focus allowance remaining. Requires ${allowed}.`);
  }
  const counts = TYPES.map((type) => {
    const used = assignments.filter((item) => item.type === type).length;
    return { type, total: totals[type], used, remaining: totals[type] - used };
  });
  return { baseLimit, limit, assignments, unassigned: unassigned.map((item) => item.instanceId), counts, issues, complete: issues.length === 0 };
}
