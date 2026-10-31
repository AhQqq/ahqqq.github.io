import { applyBackgroundAttributeGrants, evaluateBackground } from './background.js';
import type { BackgroundDraft } from './background.js';
import type { AttributeDraft, AttributeScores } from './attributes.js';
import type { CharacterData, ClassData, ProgressionTable } from './characterData.js';
import { evaluateFocusCreation } from './focusCreation.js';
import { resolveArtFocusGrants } from './artFocusGrants.js';
import { evaluateCreationSkills } from './skillAllocation.js';
import { calculateSavingThrows } from './savingThrows.js';
import { evaluateClassAbilities } from './classAbilities.js';
import { resolveFocusAbilities } from './focusAbilities.js';
import { mergeAbilityEvaluations } from './abilities.js';
import { evaluateEquipmentInventory } from './equipment.js';
import { evaluateHitDiceEffects, firstLevelHitPoints, parseHitDice } from './abilityEffects.js';
import { evaluateFocusEffort } from './focusTraditions.js';
import { evaluateClassChoices } from './classSelection.js';
import { evaluateArtDefenses } from './artDefenses.js';

// Submitted choices remain untrusted. Normalization for editing is a caller concern.
export type CharacterInput = BackgroundDraft & AttributeDraft & {
  name?: string;
  goal?: string;
  background?: string;
  classChoices?: unknown;
  classBonusChoices?: unknown;
  focus?: string[];
  focusInstances?: unknown;
  focusRuleChoices?: unknown;
  focusBonusChoices?: unknown;
  freeSkill?: string;
  selectedSkills?: string[];
  spellChoicesByClassSlot?: unknown;
  spellChoices?: unknown;
  artChoicesByClass?: unknown;
  startingEquipment?: unknown;
  equipmentPurchases?: unknown;
  equipmentLoadout?: unknown;
  armor?: unknown;
  notes?: string;
};

export function progressionForClasses(classes: Array<{ archetype: string }>, tables: ProgressionTable[]) {
  const byId = new Map(tables.filter((table) => table.id !== 'am+e').map((table) => [table.id, table]));
  const shorthand = classes.map((option) => option.archetype[0]).sort().join('+');
  const reverse = shorthand.split('+').reverse().join('+');
  const key = byId.has(shorthand) ? shorthand : byId.has(reverse) ? reverse : '';
  return { key, progression: byId.get(key) };
}

export function evaluateCreationCore(draft: CharacterInput, data: CharacterData,
  context: { attributes: AttributeScores; classes: ClassData[] }) {
  const { SKILLS, ATTRIBUTES, CLASSES, BACKGROUNDS, FOCI, STARTING_ARTS, ARTS, PROGRESSION_TABLES } = data;
  const { key: progressionKey, progression } = progressionForClasses(context.classes, PROGRESSION_TABLES);
  const backgroundEvaluation = evaluateBackground(draft, BACKGROUNDS, SKILLS, ATTRIBUTES);
  const backgroundAttributes = applyBackgroundAttributeGrants(context.attributes, backgroundEvaluation.attributeGrants);
  // Art grants refund paid duplicates before allowances and focus effects are evaluated.
  const artFocusGrants = resolveArtFocusGrants(draft.artChoicesByClass, draft.classChoices, CLASSES, STARTING_ARTS, ARTS, FOCI);
  const focusCreation = evaluateFocusCreation({ instances: draft.focusInstances, legacyIds: draft.focus, grants: artFocusGrants.grants,
    bonusChoices: draft.focusBonusChoices, ruleChoices: draft.focusRuleChoices, foci: FOCI, classes: context.classes,
    allowSkillFocusGrants: evaluateClassChoices(draft.classChoices, CLASSES).complete,
    baseLimit: progression?.focus ?? [], skills: SKILLS, attributes: ATTRIBUTES, scores: backgroundAttributes.attributes });
  const skillAllocation = evaluateCreationSkills(backgroundEvaluation.skillGrants, context.classes,
    focusCreation.bonuses.skillGrants, draft.freeSkill ?? '', SKILLS.map((skill) => skill.id), draft.classBonusChoices);
  return { progressionKey, progression, backgroundEvaluation, backgroundAttributes, artFocusGrants, focusCreation, skillAllocation };
}

export type CreationCore = ReturnType<typeof evaluateCreationCore>;

export function evaluateCreationEffects(draft: CharacterInput, data: CharacterData, core: CreationCore,
  classEvaluation: ReturnType<typeof evaluateClassChoices>) {
  const { CLASSES, FOCI, ABILITIES, CLASS_ABILITY_RULES, STARTING_EQUIPMENT, EQUIPMENT, EQUIPMENT_PROPERTIES } = data;
  const { focusCreation, skillAllocation, progression } = core;
  const classAbilities = evaluateClassAbilities(draft.classChoices, CLASSES, ABILITIES, CLASS_ABILITY_RULES);
  // An invalid pair must not activate class-dependent focus abilities, AC or traditions.
  const focusAbilities = resolveFocusAbilities(classEvaluation.complete ? focusCreation.applied : [], FOCI, ABILITIES);
  const abilitySelection = mergeAbilityEvaluations(classAbilities, focusAbilities);
  const baseModifiers = focusCreation.baseModifiers as AttributeScores;
  const modifiers = { ...baseModifiers };
  for (const key of Object.keys(modifiers) as Array<keyof typeof modifiers>) {
    modifiers[key] += focusCreation.bonuses.modifierBonuses[key] ?? 0;
  }
  const savingThrows = calculateSavingThrows(modifiers, focusCreation.saveEffects);
  const abilityHitDice = evaluateHitDiceEffects(progression?.hd ?? '', draft.classChoices, CLASSES, abilitySelection.abilities);
  const artDefenses = evaluateArtDefenses(draft, data, classEvaluation.ids, classEvaluation.complete, abilityHitDice.hitDice);
  const hitDiceEvaluation = { ...abilityHitDice, hitDice: abilityHitDice.complete ? artDefenses.hitDice : abilityHitDice.hitDice,
    adjustments: [...abilityHitDice.adjustments, ...(abilityHitDice.complete ? artDefenses.adjustments : [])],
    issues: [...abilityHitDice.issues, ...artDefenses.issues], complete: abilityHitDice.complete && artDefenses.issues.length === 0 };
  const defenseBases = { ...focusCreation.baseAc, sources: [...focusCreation.baseAc.sources, ...artDefenses.sources],
    issues: [...focusCreation.baseAc.issues, ...artDefenses.issues], complete: focusCreation.baseAc.complete && artDefenses.issues.length === 0 };
  const equipmentInventory = evaluateEquipmentInventory({ startingEquipment: draft.startingEquipment,
    purchases: draft.equipmentPurchases, loadout: draft.equipmentLoadout, dexterity: modifiers.DEX },
    STARTING_EQUIPMENT, EQUIPMENT, EQUIPMENT_PROPERTIES, classEvaluation.complete ? defenseBases : undefined);

  // Focus penalties affect the resolved die result, after class/art HD floors.
  if (hitDiceEvaluation.complete && classEvaluation.complete) for (const penalty of focusCreation.derived.hitDiePenalties) {
    const dice = parseHitDice(hitDiceEvaluation.hitDice);
    if (!dice) continue;
    const flat = dice.flat + penalty.value;
    const adjusted = `${dice.count}d${dice.sides}${flat > 0 ? '+' : ''}${flat || ''}`;
    hitDiceEvaluation.adjustments.push({ abilityId: penalty.focusId, name: penalty.name,
      englishName: penalty.name,
      from: hitDiceEvaluation.hitDice, to: adjusted });
    hitDiceEvaluation.hitDice = adjusted;
  }
  const hitDice = hitDiceEvaluation.hitDice;
  const hitDie = parseHitDice(hitDice)?.sides ?? 0;
  const focusHitPointsBonus = classEvaluation.complete ? focusCreation.derived.hitPointsBonus : 0;
  const hitPoints = firstLevelHitPoints(hitDice, modifiers.CON, focusHitPointsBonus);
  const hitDiceMaximum = parseHitDice(hitDice)?.maximum ?? 0;
  const hitPointBreakdown = { hitDiceMaximum, constitutionModifier: modifiers.CON, focusBonus: focusHitPointsBonus,
    sources: classEvaluation.complete ? focusCreation.derived.hitPointAdjustments : [],
    minimumAdjustment: hitPoints - (hitDiceMaximum + modifiers.CON + focusHitPointsBonus) };
  const progressionAttackBonus = Number((progression?.ab ?? '').replace('+', '')) || 0;
  const baseAttackBonus = progressionAttackBonus + focusCreation.derived.baseAttackBonusAdjustment;
  const movementSpeed = 30 + (classEvaluation.complete ? focusCreation.derived.movementSpeedBonus : 0);
  const reactionRollModifier = classEvaluation.complete ? focusCreation.derived.reactionRollBonus : 0;
  const initiative = modifiers.DEX + (classEvaluation.complete ? focusCreation.derived.initiativeBonus : 0);
  // Creation starts at zero strain; the maximum uses the final score, not its modifier.
  const systemStrain = { current: 0, maximum: focusCreation.scores.CON +
    (classEvaluation.complete ? focusCreation.derived.systemStrainMaxBonus : 0) };
  const focusTraditions = classEvaluation.complete ? focusCreation.traditions : [];
  const focusEffort = evaluateFocusEffort(focusTraditions, skillAllocation.states);
  return { classAbilities, focusAbilities, abilitySelection, baseModifiers, modifiers, savingThrows, equipmentInventory,
    hitDiceEvaluation, hitDice, hitDie, hitPoints, hitPointBreakdown, progressionAttackBonus, baseAttackBonus, focusTraditions, focusEffort, movementSpeed, initiative, reactionRollModifier, systemStrain };
}
