import { evaluateClassChoices } from './classSelection.js';
import type { SelectableClass } from './classSelection.js';
import { resolveAbilityGrants } from './abilities.js';
import type { AbilityDefinition, AbilityEvaluation, AbilityGrant } from './abilities.js';
export type { AbilityDefinition, AbilitySource, GrantedAbility } from './abilities.js';

export type AbilityClass = SelectableClass & {
  bonus?: Array<{ action: string; id?: string }>;
};

export type ClassAbilityRules = {
  character_level: number;
  combinations: Array<{ classes: [string, string]; grant: string[] }>;
};

export type ClassAbilityEvaluation = AbilityEvaluation;

const pairKey = (ids: string[]) => JSON.stringify([...ids].sort());

export function evaluateClassAbilities(
  source: unknown, classes: AbilityClass[], catalogue: AbilityDefinition[], rules: ClassAbilityRules,
): ClassAbilityEvaluation {
  const selection = evaluateClassChoices(source, classes);
  if (!selection.complete) return { abilities: [], issues: selection.issues, complete: false };
  if (rules.character_level !== 1) {
    return { abilities: [], issues: ['Class ability rules must target character level 1.'], complete: false };
  }

  const issues: string[] = [];
  const grants: AbilityGrant[] = [];

  for (const id of new Set(selection.ids)) {
    const option = classes.find((item) => item.id === id)!;
    for (const bonus of option.bonus ?? []) {
      if (bonus.action === 'fixed_ability') grants.push({ id: bonus.id, source: { type: 'class', classIds: [id] } });
    }
  }

  const seen = new Set<string>();
  for (const rule of rules.combinations) {
    if (!evaluateClassChoices(rule.classes, classes).complete || !Array.isArray(rule.grant)) {
      issues.push('Invalid class combination in ability grant rules.');
      continue;
    }
    const key = pairKey(rule.classes);
    if (seen.has(key)) {
      issues.push(`Duplicate class ability combination: ${rule.classes.join(' / ')}.`);
      continue;
    }
    seen.add(key);
    // Match both exact IDs, including multiplicity; an archetype is not a full class.
    if (key !== pairKey(selection.ids)) continue;
    for (const id of rule.grant) grants.push({ id, source: { type: 'combination', classIds: [...rule.classes].sort() } });
  }

  const resolved = resolveAbilityGrants(grants, catalogue);
  return { ...resolved, issues: [...issues, ...resolved.issues], complete: issues.length === 0 && resolved.complete };
}
