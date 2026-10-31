import { evaluateClassChoices } from './classSelection.js';
import type { SelectableClass } from './classSelection.js';
import type { GrantedAbility } from './abilities.js';

export type HitDiceAdjustment = { abilityId: string; name: string; englishName: string; from: string; to: string };

export function parseHitDice(value: unknown) {
  const match = typeof value === 'string' ? /^(\d+)d(\d+)([+-]\d+)?$/.exec(value) : null;
  if (!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const flat = Number(match[3] ?? 0);
  const maximum = count * sides + flat;
  if (count < 1 || sides < 1 || ![count, sides, flat, count * sides, maximum].every(Number.isSafeInteger)) return null;
  return { count, sides, flat, maximum, expression: `${count}d${sides}${flat > 0 ? '+' : ''}${flat || ''}` };
}

export function firstLevelHitPoints(hitDice: string, constitutionModifier: number, focusBonus = 0) {
  return Math.max(1, (parseHitDice(hitDice)?.maximum ?? 0) + constitutionModifier + focusBonus);
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const pairKey = (ids: string[]) => JSON.stringify([...ids].sort());

// Inputs are freshly resolved grants, not ability IDs or effect values from a saved draft.
export function evaluateHitDiceEffects(baseHitDice: string, classChoices: unknown, classes: SelectableClass[], abilities: GrantedAbility[]) {
  const selection = evaluateClassChoices(classChoices, classes);
  const fallback = { baseHitDice, hitDice: baseHitDice, adjustments: [] as HitDiceAdjustment[] };
  if (!selection.complete) return { ...fallback, issues: selection.issues, complete: false };
  const issues: string[] = [];
  if (!parseHitDice(baseHitDice)) issues.push('Invalid base hit dice in the progression table.');
  const candidates: HitDiceAdjustment[] = [];
  for (const ability of abilities) {
    if (ability.effects === undefined) continue;
    if (!Array.isArray(ability.effects)) {
      issues.push(`${ability.englishName}: effects must be a list.`);
      continue;
    }
    for (const raw of ability.effects as unknown[]) {
      if (!record(raw) || raw.type !== 'override_hit_dice') {
        issues.push(`${ability.englishName}: unsupported or malformed ability effect.`);
        continue;
      }
      const pair = record(raw.when) ? raw.when.class_pair : undefined;
      const condition = evaluateClassChoices(pair, classes);
      const dice = parseHitDice(raw.value);
      if (!record(raw.when) || Object.keys(raw.when).some((key) => key !== 'class_pair') || !condition.complete || !dice) {
        issues.push(`${ability.englishName}: invalid override_hit_dice condition or dice expression.`);
        continue;
      }
      if (pairKey(selection.ids) !== pairKey(condition.ids)) continue;
      candidates.push({ abilityId: ability.id, name: ability.name, englishName: ability.englishName, from: baseHitDice, to: dice.expression });
    }
  }
  const values = [...new Set(candidates.map((item) => item.to))].sort();
  if (values.length > 1) issues.push(`Conflicting hit-dice overrides: ${values.join(', ')}. Resolve the ability data before completing the character.`);
  // An invalid configuration must not apply a partial or order-dependent override.
  if (issues.length) return { ...fallback, issues: [...new Set(issues)], complete: false };
  const adjustments = [...new Map(candidates.map((item) => [item.abilityId, item])).values()]
    .sort((left, right) => left.abilityId.localeCompare(right.abilityId));
  return { baseHitDice, hitDice: values[0] ?? baseHitDice, adjustments, issues, complete: true };
}
