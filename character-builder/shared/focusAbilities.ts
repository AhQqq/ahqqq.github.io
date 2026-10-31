import { resolveAbilityGrants } from './abilities.js';
import type { AbilityDefinition, AbilityGrant } from './abilities.js';
import type { FocusData } from './focusBonuses.js';
import type { FocusInstance } from './focusCreation.js';

// Call only with the evaluator's applied instances, never the raw saved selection.
export function resolveFocusAbilities(applied: FocusInstance[], foci: FocusData[], catalogue: AbilityDefinition[]) {
  const grants: AbilityGrant[] = [];
  const issues: string[] = [];
  for (const instance of applied) {
    const focus = foci.find((item) => item.id === instance.focusId);
    if (!focus) {
      issues.push(`Unknown ability-granting focus: ${instance.focusId}.`);
      continue;
    }
    if (focus.ability_ids === undefined) continue;
    if (!Array.isArray(focus.ability_ids) || focus.ability_ids.some((id) => typeof id !== 'string' || !id.trim())) {
      issues.push(`${focus.name}: ability_ids must be a list of nonempty ability IDs.`);
      continue;
    }
    for (const id of focus.ability_ids) {
      grants.push({ id, source: { type: 'focus', focusId: focus.id, instanceId: instance.instanceId } });
    }
  }
  const resolved = resolveAbilityGrants(grants, catalogue);
  return { ...resolved, issues: [...issues, ...resolved.issues], complete: issues.length === 0 && resolved.complete };
}
