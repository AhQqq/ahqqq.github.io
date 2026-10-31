import { evaluateArtChoices } from './artSelection.js';
import type { ArtClass, ArtOption, StartingArts } from './artSelection.js';
import { evaluateClassChoices } from './classSelection.js';
import { focusCreationLevelReason, focusRequirementMet } from './focusBonuses.js';
import type { FocusData } from './focusBonuses.js';

export type FocusGrantSource = { kind: 'art'; classId: string; artId: string; name: string } |
  { kind: 'focus'; instanceId: string; focusId: string; name: string; skillId: string };
export type FocusGrant = { instanceId: string; focusId: string; grantedBy: FocusGrantSource[]; boundSkillId?: string };

// Resolve native class arts first. Borrowed traditions must not create a focus -> art -> focus cycle.
export function resolveArtFocusGrants(choices: unknown, classIds: unknown, classes: ArtClass[], rules: StartingArts,
  arts: ArtOption[], foci: FocusData[]) {
  const grants: FocusGrant[] = [];
  const issues: string[] = [];
  const classSelection = evaluateClassChoices(classIds, classes);
  if (!classSelection.complete) return { grants, issues };
  const selection = evaluateArtChoices(choices, classSelection.ids, classes, rules, arts);
  const selectedClasses = classes.filter((item) => classSelection.ids.includes(item.id));
  for (const learned of selection.classes) {
    if (!learned.complete) continue;
    for (const artId of learned.learned) {
      const entries = arts.filter((item) => item.id === artId && item.class_id === learned.classId);
      const art = entries[0];
      if (!art || art.focus_grants === undefined) continue;
      if (entries.length !== 1 || !Array.isArray(art.focus_grants) || !art.focus_grants.length ||
          art.focus_grants.some((id) => typeof id !== 'string') || new Set(art.focus_grants).size !== art.focus_grants.length) {
        issues.push(`${art.name}: invalid focus grants in arts data.`);
        continue;
      }
      for (const focusId of art.focus_grants) {
        const definitions = foci.filter((item) => item.id === focusId);
        const focus = definitions[0];
        if (definitions.length !== 1 || !focus || focusCreationLevelReason(focus)) {
          issues.push(`${art.name}: grants must reference an existing level-1 focus.`);
          continue;
        }
        if (!focus.requirements.filter((rule) => rule.condition === 'is_class' || rule.condition === 'not_class')
          .every((rule) => focusRequirementMet(rule, selectedClasses, new Set(), new Set()))) {
          issues.push(`${art.name}: the granted focus does not meet class requirements.`);
          continue;
        }
        let grant = grants.find((item) => item.focusId === focusId);
        if (!grant) {
          // Colons cannot be submitted as player-owned instance IDs.
          grant = { instanceId: `art-focus:${focusId}`, focusId, grantedBy: [] };
          grants.push(grant);
        }
        grant.grantedBy.push({ kind: 'art', classId: learned.classId, artId, name: art.name });
      }
    }
  }
  return { grants, issues };
}

export function refundGrantedFocusPicks<T extends { focusId: string; parentInstanceId?: string }>(instances: T[], grants: FocusGrant[]) {
  return instances.filter((instance) => instance.parentInstanceId || !grants.some((grant) => !grant.boundSkillId && grant.focusId === instance.focusId));
}
