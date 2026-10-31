import type { FocusGrantSource } from './artFocusGrants.js';

export const SAVE_IDS = ['physical', 'evasion', 'mental', 'luck'] as const;
export type SaveId = typeof SAVE_IDS[number];
export type SaveModifiers = Partial<Record<SaveId, number>>;
export type ConditionalSaveModifier = { condition: string; saves: SaveModifiers; scope?: string };
export type SaveSource = { instanceId: string; focusId: string; name: string; saves: SaveModifiers; grantedBy?: FocusGrantSource[] };
export type ConditionalSaveSource = SaveSource & ConditionalSaveModifier;
export type FocusSaveEffects = { sources: SaveSource[]; conditional: ConditionalSaveSource[] };

export function validSaveModifiers(value: unknown): value is SaveModifiers {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(value).every(([key, bonus]) => SAVE_IDS.includes(key as SaveId) && Number.isSafeInteger(bonus));
}

export function validConditionalSaves(value: unknown): value is ConditionalSaveModifier[] {
  return Array.isArray(value) && value.every((rule: unknown) => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return false;
    const entry = rule as Record<string, unknown>;
    return typeof entry.condition === 'string' && Boolean(entry.condition.trim()) && validSaveModifiers(entry.saves) &&
      Object.values(entry.saves).some(Boolean) &&
      (entry.scope === undefined || (typeof entry.scope === 'string' && Boolean(entry.scope.trim())));
  });
}

// A positive saving-roll bonus lowers the target. Conditional effects never enter this total.
export function calculateSavingThrows(modifiers: Record<string, number>, effects: FocusSaveEffects) {
  const attributeTargets = {
    physical: 15 - Math.max(modifiers.STR ?? 0, modifiers.CON ?? 0),
    evasion: 15 - Math.max(modifiers.DEX ?? 0, modifiers.INT ?? 0),
    mental: 15 - Math.max(modifiers.WIS ?? 0, modifiers.CHA ?? 0),
    luck: 15,
  };
  const bonuses = { physical: 0, evasion: 0, mental: 0, luck: 0 };
  const targets = { ...attributeTargets };
  for (const id of SAVE_IDS) {
    bonuses[id] = effects.sources.reduce((total, source) => total + (source.saves[id] ?? 0), 0);
    targets[id] -= bonuses[id];
  }
  return { attributeTargets, bonuses, targets, sources: effects.sources, conditional: effects.conditional };
}

export type SavingThrows = ReturnType<typeof calculateSavingThrows>;
