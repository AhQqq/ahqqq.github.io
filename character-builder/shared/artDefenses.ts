import { evaluateArtChoices } from './artSelection.js';
import { parseHitDice } from './abilityEffects.js';
import type { HitDiceAdjustment } from './abilityEffects.js';
import type { CharacterData } from './characterData.js';
import type { CharacterInput } from './characterCreation.js';
import type { FocusBaseAcSource } from './focusArmorClass.js';

export function evaluateArtDefenses(draft: CharacterInput, data: CharacterData, classIds: string[], validClasses: boolean, currentHitDice: string) {
  const sources: FocusBaseAcSource[] = [];
  const adjustments: HitDiceAdjustment[] = [];
  const issues: string[] = [];
  let hitDice = currentHitDice;
  if (!validClasses) return { sources, adjustments, issues, hitDice };
  const selection = evaluateArtChoices(draft.artChoicesByClass, classIds, data.CLASSES, data.STARTING_ARTS, data.ARTS);
  for (const group of selection.classes) for (const id of group.learned) {
    const art = data.ARTS.find((item) => item.class_id === group.classId && item.id === id);
    if (!art) continue;
    if (art.minimum_hit_dice !== undefined) {
      const minimum = parseHitDice(art.minimum_hit_dice);
      const current = parseHitDice(hitDice);
      if (!minimum || minimum.maximum < 1) issues.push(`${art.name}: invalid minimum hit dice in arts data.`);
      else if (current && current.maximum < minimum.maximum) {
        adjustments.push({ abilityId: art.id, name: art.name, englishName: art.eng_name, from: hitDice, to: minimum.expression });
        hitDice = minimum.expression;
      }
    }
    if (art.unarmored_base_ac !== undefined) {
      if (!Number.isSafeInteger(art.unarmored_base_ac) || art.unarmored_base_ac < 0) issues.push(`${art.name}: invalid unarmored AC in arts data.`);
      else sources.push({ instanceId: `art:${group.classId}:${id}`, focusId: id, name: art.name,
        baseAc: art.unarmored_base_ac, sourceKind: 'art', requiresUnarmored: true });
    }
  }
  return issues.length ? { sources: [], adjustments: [], issues, hitDice: currentHitDice } : { sources, adjustments, issues, hitDice };
}
