import { focusCreationLevelReason } from './focusBonuses.js';
import type { FocusData } from './focusBonuses.js';
import type { FocusInstance } from './focusCreation.js';

export type FocusBaseAcSource = { instanceId: string; focusId: string; name: string; baseAc: number; betterArmorBonus?: number; sourceKind?: 'art'; requiresUnarmored?: boolean };
export type FocusBaseAcEvaluation = { sources: FocusBaseAcSource[]; issues: string[]; complete: boolean };

// Resolve only eligible, funded instances; saved totals are never a source of AC.
export function evaluateFocusBaseAc(applied: FocusInstance[], foci: FocusData[], characterLevel = 1): FocusBaseAcEvaluation {
  const sources: FocusBaseAcSource[] = [];
  const issues: string[] = [];
  if (!Number.isSafeInteger(characterLevel) || characterLevel < 1) {
    return { sources, issues: ['Base AC rules require a positive integer character level.'], complete: false };
  }
  for (const instance of applied) {
    const focus = foci.find((item) => item.id === instance.focusId);
    if (!focus || focusCreationLevelReason(focus) || focus.base_ac === undefined) continue;
    const rule = focus.base_ac;
    if (!rule || !Number.isSafeInteger(rule.base) || rule.base < 0 ||
        (rule.level_divisor === undefined ? rule.rounding !== undefined :
          !Number.isSafeInteger(rule.level_divisor) || rule.level_divisor < 1 || rule.rounding !== 'up') ||
        rule.armor_rule !== 'higher' || (rule.better_armor_bonus !== undefined &&
          (!Number.isSafeInteger(rule.better_armor_bonus) || rule.better_armor_bonus < 1))) {
      issues.push(`${focus.name}: invalid base AC rule in foci.json.`);
      continue;
    }
    const baseAc = rule.base + (rule.level_divisor === undefined ? 0 : Math.ceil(characterLevel / rule.level_divisor));
    if (!Number.isSafeInteger(baseAc)) {
      issues.push(`${focus.name}: invalid base AC rule in foci.json.`);
      continue;
    }
    sources.push({ instanceId: instance.instanceId, focusId: focus.id, name: focus.name, baseAc,
      ...(rule.better_armor_bonus === undefined ? {} : { betterArmorBonus: rule.better_armor_bonus }) });
  }
  return { sources, issues, complete: issues.length === 0 };
}
