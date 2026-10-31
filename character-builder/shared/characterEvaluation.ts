import { evaluateAttributes } from './attributes.js';
import { evaluateClassChoices } from './classSelection.js';
import { classBuildName } from './classBuild.js';
import { evaluateArtChoices } from './artSelection.js';
import { evaluateSpellChoices } from './spellSelection.js';
import { evaluateCreationCore, evaluateCreationEffects } from './characterCreation.js';
import type { CharacterInput } from './characterCreation.js';
import type { CharacterData, ClassData } from './characterData.js';

export function evaluateCharacterWithData(draft: CharacterInput, data: CharacterData) {
  const { SKILLS, CLASSES, COMBINATIONS, SPELLS, STARTING_ARTS, ARTS } = data;
  const SKILL_IDS = new Set(SKILLS.map((skill) => skill.id));
  const CLASS_BY_ID = new Map(CLASSES.map((option) => [option.id, option]));
  const attributeEvaluation = evaluateAttributes(draft);
  const classEvaluation = evaluateClassChoices(draft.classChoices, CLASSES);
  const classChoices = classEvaluation.ids
    .map((classId) => CLASS_BY_ID.get(classId))
    .filter((classOption): classOption is ClassData => Boolean(classOption))
    .slice(0, 2);
  const core = evaluateCreationCore(draft, data, { attributes: attributeEvaluation.attributes, classes: classChoices });
  const { progressionKey, progression, backgroundEvaluation, backgroundAttributes, artFocusGrants, focusCreation, skillAllocation } = core;
  const { classAbilities, focusAbilities, abilitySelection, baseModifiers, modifiers, savingThrows, equipmentInventory,
    hitDiceEvaluation, hitDice, hitDie, hitPoints, hitPointBreakdown, progressionAttackBonus, baseAttackBonus, focusTraditions, focusEffort, movementSpeed, initiative, reactionRollModifier, systemStrain } =
    evaluateCreationEffects(draft, data, core, classEvaluation);
  const selectedFocus = focusCreation.instances;
  const focusLimit = focusCreation.limit;
  const focusBonuses = focusCreation.bonuses;
  const equipmentSelection = equipmentInventory.starting;
  const armorClass = equipmentInventory.armorClass;
  const selectedSkills = Object.values(skillAllocation.states).filter((skill) => skill.allotments > 0).map((skill) => skill.id);
  const skillGrantCounts = Object.fromEntries(Object.values(skillAllocation.states).map((skill) => [skill.id, skill.allotments]));
  const skillScopeComplete = (scope: string) => !skillAllocation.issues.some((issue) => issue.scope === scope);
  const artEvaluation = evaluateArtChoices(draft.artChoicesByClass, classEvaluation.ids, CLASSES, STARTING_ARTS, ARTS, focusTraditions, focusCreation.applied);
  const spellEvaluation = evaluateSpellChoices(draft.spellChoicesByClassSlot, classEvaluation.ids, SPELLS, draft.spellChoices, focusTraditions);

  // Preserve API issue ordering and the existing per-source deduplication policy.
  const issues = [...attributeEvaluation.issues, ...classEvaluation.issues];
  issues.push(...classAbilities.issues.filter((issue) => !issues.includes(issue)));
  if (classChoices.length === 2 && !progression) {
    issues.push(`No progression table found for selected class archetypes: ${progressionKey || "unknown"}.`);
  }
  issues.push(...backgroundEvaluation.issues, ...artFocusGrants.issues, ...focusCreation.issues, ...focusAbilities.issues);
  issues.push(...equipmentInventory.issues);
  issues.push(...hitDiceEvaluation.issues.filter((issue) => !issues.includes(issue)));
  issues.push(...skillAllocation.issues.map((issue) => issue.message));
  if (!draft.freeSkill) issues.push('Choose a free skill.');
  issues.push(...artEvaluation.issues.filter((issue) => !issues.includes(issue)));
  issues.push(...spellEvaluation.issues);

  const stepStatus = [
    {
      key: "attributes",
      label: "1-2. Attributes and modifiers",
      complete: attributeEvaluation.complete,
    },
    {
      key: "background",
      label: "3-4. Background and background skills",
      complete: backgroundEvaluation.complete && skillScopeComplete('background'),
    },
    {
      key: "class",
      label: "5-6. Class and foci",
      complete:
        classEvaluation.complete &&
        abilitySelection.complete &&
        hitDiceEvaluation.complete &&
        Boolean(progression) &&
        selectedFocus.length >= 1 &&
        selectedFocus.length <= focusLimit &&
        focusCreation.complete && artFocusGrants.issues.length === 0 &&
        skillScopeComplete('class') && skillScopeComplete('focus'),
    },
    {
      key: "freeSkill",
      label: "7. Free skill",
      complete: Boolean(draft.freeSkill) && SKILL_IDS.has(draft.freeSkill ?? "") && skillScopeComplete('freeSkill'),
    },
    {
      key: "combat",
      label: "8-9, 12. Hit points, attack, and saves",
      complete: hitDiceEvaluation.complete && hitDie > 0,
    },
    {
      key: 'equipment',
      label: '10. Starting equipment or silver',
      complete: equipmentInventory.complete,
    },
    {
      key: 'armorClass',
      label: '11. Equipped armor, shield, and Armor Class',
      complete: armorClass.complete,
    },
    {
      key: "identity",
      label: "13. Name and goal",
      complete: Boolean(draft.name?.trim()) && Boolean(draft.goal?.trim()),
    },
    {
      key: 'arts',
      label: '14. Class arts',
      complete: classEvaluation.complete && artEvaluation.complete,
    },
    {
      key: 'spells',
      label: '15. First-level spells (final stage)',
      complete: spellEvaluation.complete,
    },
  ];

  const assumptions = [
    "Backgrounds, classes, foci, skills, equipment, arts, and spells are validated against frontend/data JSON files.",
    "Class selection uses two slots; only classes marked can_be_full_class may fill both slots.",
    "Class pairing exclusions are checked in both directions using incompatible_classes and incompatible_archetypes.",
    "Starting arts are applied once per distinct class, using partial or full rules. Fixed grants, restricted choices, and additional picks are separate.",
    "Base hit dice, attack bonus, and focus count come from progression_tables.json; applicable encoded ability overrides determine effective hit dice before HP is calculated.",
    "AC uses the highest eligible armor or focus base after encoded armor adjustments, then applies the usual shield rule and final DEX. Worn armor penalties remain. Legacy armor bonuses are ignored.",
    "Starting equipment grants one fixed package or the sum of three saved d6 rolls multiplied by 10 silver, never both. Client-supplied grants and money totals are not authoritative.",
    "Catalogue purchases use 10 copper per silver and cannot exceed starting funds. Missing prices are not free items. Package grants cannot be sold for extra starting funds.",
    "Only owned equipment may be equipped. A held shield conflicts with an active two-handed weapon. Armor penalties affect Sneak/Exert checks, not learned skill levels.",
    "Package row encumbrance already includes quantity. Catalogue purchase lots apply explicit groups of three or five; ambiguous footnotes remain flagged. These subtotals are not carried-load limits: storage, transport, and coin loads are not tracked.",
    "Equipment statistics and property descriptions are reference rules. Unencoded focus/art armor exceptions, attack rolls, damage modifiers, reloads, and situational effects require manual adjudication.",
    "Class skill bonuses apply once per distinct class. Skills start at -1 and cannot exceed level 1 at creation.",
    "Named abilities resolve from one catalogue using class, exact class-pair, and eligible focus grants; descriptions do not automatically apply effects.",
    "A third fixed skill allotment from a focus gives that skill 2 advancement points; other forced overflow requires manual review.",
    "Only one origin family is allowed, including linked upgrades. Each instance or upgrade costs a pick; repeatable choices belong to specific instances.",
    "Positive focus save bonuses lower the displayed save target. Situational effects and crafting are recorded as play notes, not simulated.",
    "This builder creates level-1 characters only. Each spellcasting class slot learns two first-level spells from its own allowed schools, with no duplicate spells.",
  ];

  return {
    characterLevel: 1,
    valid: issues.length === 0,
    issues,
    assumptions,
    fullClass: classBuildName(draft.classChoices, CLASSES, COMBINATIONS),
    classAbilities,
    abilitySelection,
    hitDiceEvaluation,
    equipmentSelection,
    equipmentInventory,
    armorClass,
    savingThrows,
    attributes: focusCreation.scores,
    allocatedAttributes: attributeEvaluation.attributes,
    backgroundAttributes: backgroundAttributes.attributes,
    backgroundAttributeBonuses: backgroundAttributes.bonuses,
    focusScoreChanges: focusCreation.scoreChanges,
    focusRuleNotes: focusCreation.notes,
    focusTraditions,
    focusEffort,
    focusSelection: { instances: selectedFocus, limit: focusLimit, baseLimit: focusCreation.baseLimit,
      grantedInstances: focusCreation.grantedInstances, refundedInstances: focusCreation.refundedInstances,
      extraPicks: focusCreation.extraPicks, allowances: focusCreation.allowances,
      complete: focusCreation.complete && artFocusGrants.issues.length === 0, issues: [...focusCreation.issues, ...artFocusGrants.issues] },
    baseModifiers,
    focusModifierBonuses: focusBonuses.modifierBonuses,
    focusModifierContributions: focusBonuses.modifierContributions,
    modifierCaps: focusBonuses.modifierCaps,
    focusBonuses: focusBonuses.details,
    modifiers,
    derived: {
      movementSpeed, initiative, reactionRollModifier, systemStrain,
      hitPoints,
      hitPointBreakdown,
      hitDie,
      hitDice,
      baseHitDice: hitDiceEvaluation.baseHitDice,
      hitDiceAdjustments: hitDiceEvaluation.adjustments,
      focusLimit,
      physicalSave: savingThrows.targets.physical,
      evasionSave: savingThrows.targets.evasion,
      mentalSave: savingThrows.targets.mental,
      luckSave: savingThrows.targets.luck,
      ac: armorClass.value,
      progressionAttackBonus,
      baseAttackBonusAdjustment: focusCreation.derived.baseAttackBonusAdjustment,
      baseAttackAdjustments: focusCreation.derived.baseAttackAdjustments,
      baseAttackBonus,
      focusAttackBonus: focusCreation.derived.attack,
      attackBonus: baseAttackBonus + focusCreation.derived.attack,
      saveBonuses: savingThrows.bonuses,
      encumbranceStrengthBonus: focusCreation.derived.encumbranceStrengthBonus,
      systemStrainMaxBonus: focusCreation.derived.systemStrainMaxBonus,
    },
    selectedSkills,
    skillGrantCounts,
    skillStates: skillAllocation.states,
    skillIssues: skillAllocation.issues,
    spellSelection: spellEvaluation,
    artSelection: artEvaluation,
    stepStatus,
  };
}

export type CharacterEvaluation = ReturnType<typeof evaluateCharacterWithData>;
