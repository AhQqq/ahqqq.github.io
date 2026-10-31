import { evaluateFocusBonuses, focusCreationLevelReason, focusRequirementMet, normalizeFocusBonusChoices, originFamilyId } from './focusBonuses.js';
import type { FocusData } from './focusBonuses.js';
import { getModifier } from './attributeModifier.js';
import { evaluateScoreRedistribution } from './scoreRedistribution.js';
import { evaluateFocusAllowances } from './focusAllowances.js';
import type { FocusBudget } from './focusAllowances.js';
import { evaluateFocusTraditions } from './focusTraditions.js';
import { evaluateFocusBaseAc } from './focusArmorClass.js';
import { SAVE_IDS, validConditionalSaves, validSaveModifiers } from './savingThrows.js';
import type { FocusSaveEffects } from './savingThrows.js';
import { refundGrantedFocusPicks } from './artFocusGrants.js';
import type { FocusGrant, FocusGrantSource } from './artFocusGrants.js';

export type FocusInstance = { instanceId: string; focusId: string; parentInstanceId?: string; grantedBy?: FocusGrantSource[]; boundSkillId?: string };
export type FocusRuleChoice = { packageId?: string; attributeId?: string; retainedAttribute?: string; traditionId?: string; scoreDie?: number; scoreTransfers?: unknown };
export type FocusRuleChoices = Record<string, FocusRuleChoice>;
export type FocusHitPointAdjustment = { instanceId: string; focusId: string; name: string; value: number };
export type BaseAttackAdjustment = { instanceId: string; focusId: string; value: number };
type FocusClass = { id: string; archetype: string };
type Tagged = { id: string; tags: string[] };

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const own = (value: unknown, key: string): unknown => record(value) && Object.hasOwn(value, key) ? value[key] : undefined;
const parentFocusId = (focus: FocusData) => (focus.level ?? 1) > 1
  ? focus.requirements.find((rule) => rule.condition === 'has_focus')?.id : undefined;

export function readFocusInstances(source: unknown, legacyIds: unknown, foci: FocusData[]): { instances: FocusInstance[]; issues: string[] } {
  const issues: string[] = [];
  if (source === undefined) {
    if (legacyIds !== undefined && (!Array.isArray(legacyIds) || legacyIds.some((id) => typeof id !== 'string'))) {
      return { instances: [] as FocusInstance[], issues: ['Invalid legacy focus selections.'] };
    }
    const instances = [...new Set((legacyIds ?? []) as string[])].map((focusId) => {
      const focus = foci.find((item) => item.id === focusId);
      const parent = focus && parentFocusId(focus);
      return { instanceId: focusId, focusId, ...(parent ? { parentInstanceId: parent } : {}) };
    });
    return { instances, issues };
  }
  if (!Array.isArray(source)) return { instances: [] as FocusInstance[], issues: ['Focus instances must be a list.'] };
  const instances: FocusInstance[] = [];
  for (const item of source) {
    if (!record(item) || typeof item.instanceId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.instanceId) ||
        ['__proto__', 'prototype', 'constructor'].includes(item.instanceId) || typeof item.focusId !== 'string' ||
        (item.parentInstanceId !== undefined && typeof item.parentInstanceId !== 'string')) {
      issues.push('Malformed focus instance; remove it and select the focus again.');
      continue;
    }
    instances.push({ instanceId: item.instanceId, focusId: item.focusId,
      ...(typeof item.parentInstanceId === 'string' ? { parentInstanceId: item.parentInstanceId } : {}) });
  }
  return { instances, issues };
}

export function evaluateFocusInstances(source: unknown, legacyIds: unknown, foci: FocusData[], classes: FocusClass[], budget: FocusBudget, grants: FocusGrant[] = []) {
  const parsed = readFocusInstances(source, legacyIds, foci);
  const instances = refundGrantedFocusPicks(parsed.instances, grants);
  const refundedInstances = parsed.instances.filter((item) => !instances.includes(item));
  const allInstances: FocusInstance[] = [...grants, ...instances];
  const issues = [...parsed.issues];
  const byId = new Map(foci.map((focus) => [focus.id, focus]));
  const requested = new Set(allInstances.map((item) => item.focusId));
  const invalid = new Set<string>();
  const origins = allInstances.filter((item) => byId.get(item.focusId)?.type === 'origin');
  if (new Set(origins.map((item) => originFamilyId(byId.get(item.focusId)!, foci))).size > 1) {
    issues.push('Only one origin focus family is allowed. Linked upgrades count as the same family but cost another pick.');
    origins.forEach((item) => invalid.add(item.instanceId));
  }
  for (const instance of allInstances) {
    const focus = byId.get(instance.focusId);
    if (!focus) { issues.push(`Unknown focus: ${instance.focusId}.`); invalid.add(instance.instanceId); continue; }
    const levelReason = focusCreationLevelReason(focus);
    if (levelReason) { issues.push(levelReason); invalid.add(instance.instanceId); continue; }
    if (allInstances.filter((item) => item.instanceId === instance.instanceId).length > 1) {
      issues.push(`Duplicate focus instance ID: ${instance.instanceId}.`); invalid.add(instance.instanceId);
    }
    if (!focus.repeatable && allInstances.filter((item) => item.focusId === instance.focusId).length > 1) {
      issues.push(`${focus.name} cannot be selected more than once.`); invalid.add(instance.instanceId);
    }
    const parentId = parentFocusId(focus);
    const parent = allInstances.find((item) => item.instanceId === instance.parentInstanceId);
    if (parentId ? !parent || parent.focusId !== parentId || parent === instance : Boolean(instance.parentInstanceId)) {
      issues.push(`${focus.name}: select a valid parent focus instance for this upgrade.`); invalid.add(instance.instanceId);
    }
    if (parentId && allInstances.filter((item) => item.focusId === instance.focusId && item.parentInstanceId === instance.parentInstanceId).length > 1) {
      issues.push(`${focus.name}: a focus instance can receive this upgrade only once.`); invalid.add(instance.instanceId);
    }
    if (focus.extra_focus_picks !== undefined && (!Number.isSafeInteger(focus.extra_focus_picks) || focus.extra_focus_picks < 0)) {
      issues.push(`${focus.name}: invalid extra focus allowance in foci.json.`); invalid.add(instance.instanceId);
    }
  }
  const eligible = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    const eligibleDefinitions = new Set(allInstances.filter((item) => eligible.has(item.instanceId)).map((item) => item.focusId));
    for (const instance of allInstances) {
      if (invalid.has(instance.instanceId) || eligible.has(instance.instanceId)) continue;
      const focus = byId.get(instance.focusId)!;
      if (instance.parentInstanceId && !eligible.has(instance.parentInstanceId)) continue;
      if (!focus.requirements.every((rule) => focusRequirementMet(rule, classes, eligibleDefinitions, requested))) continue;
      eligible.add(instance.instanceId); changed = true;
    }
  }
  const eligibleInstances = instances.filter((item) => eligible.has(item.instanceId));
  const grantedInstances = grants.filter((item) => eligible.has(item.instanceId));
  for (const item of allInstances) if (!eligible.has(item.instanceId) && !invalid.has(item.instanceId)) {
    issues.push(`Focus requirements not met: ${byId.get(item.focusId)?.name ?? item.focusId}.`);
  }
  const extraPicks = [...grantedInstances, ...eligibleInstances].reduce((sum, item) => sum + (byId.get(item.focusId)?.extra_focus_picks ?? 0), 0);
  const allowances = evaluateFocusAllowances(eligibleInstances, foci, budget, extraPicks);
  const { baseLimit, limit } = allowances;
  issues.push(...allowances.issues);
  if (instances.length > limit) issues.push(`Too many foci selected: ${instances.length}/${limit}.`);
  const applied: FocusInstance[] = [...grantedInstances, ...(instances.length <= limit && allowances.complete ? eligibleInstances : [])];
  return { instances, eligibleInstances, grantedInstances, refundedInstances, baseLimit, extraPicks, limit, allowances, issues: [...new Set(issues)],
    complete: issues.length === 0, applied };
}

export function pruneFocusInstances(instances: FocusInstance[], foci: FocusData[], classes: FocusClass[], budget: FocusBudget, grants: FocusGrant[] = []) {
  let kept = instances;
  for (;;) {
    const result = evaluateFocusInstances(kept, undefined, foci, classes, budget, grants);
    const next = result.eligibleInstances.filter((item) => !result.allowances.unassigned.includes(item.instanceId));
    if (next.length === kept.length) return next;
    kept = next;
  }
}

export function removeFocusInstance(instances: FocusInstance[], id: string, foci: FocusData[], classes: FocusClass[], budget: FocusBudget, grants: FocusGrant[] = []) {
  const removed = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of instances) if (item.parentInstanceId && removed.has(item.parentInstanceId) && !removed.has(item.instanceId)) {
      removed.add(item.instanceId); changed = true;
    }
  }
  return pruneFocusInstances(instances.filter((item) => !removed.has(item.instanceId)), foci, classes, budget, grants);
}

export function normalizeFocusRuleChoices(source: unknown, instances: FocusInstance[]): FocusRuleChoices {
  return Object.fromEntries(instances.map((item) => {
    const raw = own(source, item.instanceId);
    const choice: FocusRuleChoice = {};
    for (const key of ['packageId', 'attributeId', 'retainedAttribute', 'traditionId'] as const) {
      const value = own(raw, key);
      if (typeof value === 'string') choice[key] = value;
    }
    if (own(raw, 'scoreTransfers') !== undefined) choice.scoreTransfers = own(raw, 'scoreTransfers');
    const die = own(raw, 'scoreDie');
    if (typeof die === 'number') choice.scoreDie = die;
    return [item.instanceId, choice];
  }));
}

export function instanceFocusData(instances: FocusInstance[], foci: FocusData[]) {
  return instances.flatMap((instance) => {
    const focus = foci.find((item) => item.id === instance.focusId);
    return focus ? [{ ...focus, id: instance.instanceId }] : [];
  });
}

// Saved gnome drafts predating the skill choice implicitly granted Sneak.
// Only restore missing slots; explicit empty or invalid choices need user input.
export function restoreFocusBonusChoices(source: unknown, instances: FocusInstance[], foci: FocusData[]) {
  const choices = normalizeFocusBonusChoices(source, instances.map((item) => item.instanceId), instanceFocusData(instances, foci));
  for (const instance of instances) {
    if (instance.focusId !== 'gnomes1' || own(own(source, instance.instanceId), '0') !== undefined) continue;
    const bonus = foci.find((focus) => focus.id === instance.focusId)?.bonus[0];
    if (bonus?.action !== 'choice_skill' || !bonus.ids?.includes('sneak')) continue;
    (choices[instance.instanceId] ??= {})['0'] = ['sneak'];
  }
  return choices;
}

// A bound grant never enters saved instances and cannot grant further nested foci.
function boundSkillGrants(instances: FocusInstance[], choices: unknown, foci: FocusData[], skills: Tagged[], attributes: Tagged[]) {
  const grants: FocusGrant[] = [];
  const issues: string[] = [];
  for (const instance of instances) {
    const definition = foci.find((item) => item.id === instance.focusId)!;
    const rule = definition.skill_focus_grant;
    if (rule === undefined) continue;
    const target = rule && foci.find((item) => item.id === rule.focus_id);
    if (!rule || rule.skill_allotments !== 1 || !Number.isSafeInteger(rule.bonus_index) || rule.bonus_index < 0 ||
        definition.bonus[rule.bonus_index]?.action !== 'choice_skill' || (definition.bonus[rule.bonus_index]?.count ?? 1) !== 1 ||
        !target || focusCreationLevelReason(target) || !target.repeatable || !target.unique_skill || target.requirements.length ||
        target.skill_focus_grant || target.bonus.length !== 1 || target.bonus[0]?.action !== 'choice_skill' || (target.bonus[0]?.count ?? 1) !== 1) {
      issues.push(`${definition.name}: invalid bound skill focus grant in foci.json.`);
      continue;
    }
    const slots = own(own(choices, instance.instanceId), String(rule.bonus_index));
    if (!Array.isArray(slots) || slots.length !== 1 || typeof slots[0] !== 'string' || !slots[0]) continue;
    const skillId = slots[0];
    const parent = evaluateFocusBonuses([{ ...definition, id: instance.instanceId, bonus: [definition.bonus[rule.bonus_index]!] }],
      { [instance.instanceId]: { 0: [skillId] } }, skills, attributes);
    const child = evaluateFocusBonuses([target], { [target.id]: { 0: [skillId] } }, skills, attributes);
    if (!parent.complete || !child.complete) continue;
    grants.push({ instanceId: `focus-skill:${instance.instanceId}:${target.id}`, focusId: target.id, boundSkillId: skillId,
      grantedBy: [{ kind: 'focus', instanceId: instance.instanceId, focusId: definition.id, name: definition.name, skillId }] });
  }
  return { grants, issues };
}

export function evaluateFocusCreation(input: {
  instances?: unknown; legacyIds?: unknown; bonusChoices?: unknown; ruleChoices?: unknown;
  grants?: FocusGrant[]; allowSkillFocusGrants?: boolean;
  foci: FocusData[]; classes: FocusClass[]; baseLimit: FocusBudget; skills: Tagged[]; attributes: Tagged[]; scores: Record<string, number>;
}) {
  let selection = evaluateFocusInstances(input.instances, input.legacyIds, input.foci, input.classes, input.baseLimit, input.grants);
  const potential = boundSkillGrants(input.allowSkillFocusGrants === false ? [] : selection.eligibleInstances, input.bonusChoices, input.foci, input.skills, input.attributes);
  const refunded = selection.instances.filter((item) => !item.parentInstanceId && potential.grants.some((grant) =>
    grant.focusId === item.focusId && Array.isArray(own(own(input.bonusChoices, item.instanceId), '0')) &&
    (own(own(input.bonusChoices, item.instanceId), '0') as unknown[]).length === 1 &&
    (own(own(input.bonusChoices, item.instanceId), '0') as unknown[])[0] === grant.boundSkillId));
  if (refunded.length) {
    const candidate = evaluateFocusInstances(selection.instances.filter((item) => !refunded.includes(item)), undefined,
      input.foci, input.classes, input.baseLimit, input.grants);
    const active = boundSkillGrants(candidate.applied, input.bonusChoices, input.foci, input.skills, input.attributes);
    if (refunded.every((item) => active.grants.some((grant) => grant.focusId === item.focusId &&
        (own(own(input.bonusChoices, item.instanceId), '0') as unknown[])[0] === grant.boundSkillId))) {
      selection = { ...candidate, issues: [...selection.issues.filter((issue) => issue.startsWith('Malformed focus instance') || issue.startsWith('Invalid legacy')), ...candidate.issues],
        refundedInstances: [...selection.refundedInstances, ...refunded] };
    }
  }
  const bound = boundSkillGrants(input.allowSkillFocusGrants === false ? [] : selection.applied, input.bonusChoices, input.foci, input.skills, input.attributes);
  selection = { ...selection, applied: [...bound.grants, ...selection.applied],
    grantedInstances: [...selection.grantedInstances, ...bound.grants], issues: [...selection.issues, ...bound.issues] };
  const issues = [...selection.issues];
  const ruleChoices = normalizeFocusRuleChoices(input.ruleChoices, selection.instances);
  const traditions = evaluateFocusTraditions(selection.applied, input.ruleChoices, input.foci, input.classes.map((item) => item.id));
  issues.push(...traditions.issues);
  const baseAc = evaluateFocusBaseAc(selection.applied, input.foci);
  issues.push(...baseAc.issues);
  const scores = { ...input.scores };
  const scoreChanges: Array<{ instanceId: string; id: string; before: number; after: number }> = [];
  const notes: Array<{ instanceId: string; text: string }> = [];
  const saveEffects: FocusSaveEffects = { sources: [], conditional: [] };
  const derived = { hitDiePenalties: [] as FocusHitPointAdjustment[], hitPointsBonus: 0, hitPointAdjustments: [] as FocusHitPointAdjustment[], baseAttackBonusAdjustment: 0, baseAttackAdjustments: [] as BaseAttackAdjustment[],
    attack: 0, saves: { physical: 0, evasion: 0, mental: 0, luck: 0 }, movementSpeedBonus: 0, initiativeBonus: 0, reactionRollBonus: 0, encumbranceStrengthBonus: 0, systemStrainMaxBonus: 0 };
  const expanded = instanceFocusData(selection.applied, input.foci);
  // Keep submitted choice shapes intact for strict API validation; normalization is only a display preview.
  const choices: Record<string, unknown> = Object.fromEntries(selection.instances.map((item) => [item.instanceId, own(input.bonusChoices, item.instanceId)]));
  for (const grant of bound.grants) choices[grant.instanceId] = { 0: [grant.boundSkillId] };
  const choicePreview = normalizeFocusBonusChoices(choices, selection.applied.map((item) => item.instanceId), expanded);
  const usedSkills = new Map<string, Set<string>>();
  for (const instance of selection.applied) {
    const definition = input.foci.find((focus) => focus.id === instance.focusId)!;
    const focus = expanded.find((item) => item.id === instance.instanceId)!;
    const choice = ruleChoices[instance.instanceId] ?? {};
    if (definition.unique_skill) {
      const skill = choicePreview[instance.instanceId]?.['0']?.[0];
      const used = usedSkills.get(definition.id) ?? new Set<string>();
      if (skill && used.has(skill)) {
        issues.push(`${definition.name}: each instance must choose a different skill.`);
        const raw = choices[instance.instanceId];
        choices[instance.instanceId] = { ...(record(raw) ? raw : {}), '0': [''] };
        choicePreview[instance.instanceId]!['0'] = [''];
      } else if (skill) used.add(skill);
      usedSkills.set(definition.id, used);
    }
    if (definition.packages) {
      const packageId = choice.packageId ?? '';
      const option = definition.packages.options.find((item) => item.id === packageId);
      if (option) {
        focus.bonus = [...focus.bonus, ...option.bonus];
        notes.push({ instanceId: instance.instanceId, text: `${option.name}: ${option.description}` });
      } else if (packageId || definition.packages.required) issues.push(`${definition.name}: choose one valid package.`);
    }
    const effect = definition.score_effect;
    const changeScore = (id: string, after: number) => {
      const before = scores[id]!;
      if (before !== after) scoreChanges.push({ instanceId: instance.instanceId, id, before, after });
      scores[id] = after;
    };
    if (effect?.kind === 'redistribute') {
      const redistribution = evaluateScoreRedistribution(choice.scoreTransfers, input.scores, effect.target);
      if (!redistribution.valid) issues.push(`${definition.name}: invalid score redistribution; conserve points, raise selected low scores to ${effect.target}, and keep donors at least ${effect.target}.`);
      else for (const [id, delta] of Object.entries(redistribution.deltas)) changeScore(id, input.scores[id]! + delta);
    } else if (effect?.kind === 'reroll') {
      if (!input.attributes.some((item) => item.id === effect.attribute_id) ||
          !Number.isSafeInteger(effect.sides) || effect.sides < 1 || !Number.isSafeInteger(effect.bonus) ||
          effect.bonus + 1 < 3 || effect.bonus + effect.sides > 18) {
        issues.push(`${definition.name}: invalid score effect in foci.json.`);
      } else if (!Number.isInteger(choice.scoreDie) || choice.scoreDie! < 1 || choice.scoreDie! > effect.sides) {
        issues.push(`${definition.name}: roll and save a valid d${effect.sides} score die.`);
      } else changeScore(effect.attribute_id, choice.scoreDie! + effect.bonus);
    } else if (effect?.kind === 'threshold_replace') {
      // The threshold uses allocation + background growth, never a prior derived score.
      const before = input.scores[effect.attribute_id];
      if (!input.attributes.some((item) => item.id === effect.attribute_id) ||
          [effect.threshold, effect.below, effect.at_or_above, before].some((value) =>
            !Number.isInteger(value) || value! < 3 || value! > 18)) {
        issues.push(`${definition.name}: invalid score effect in foci.json.`);
      } else changeScore(effect.attribute_id, before! < effect.threshold ? effect.below : effect.at_or_above);
    } else if (effect && (!Number.isInteger(effect.value) || effect.value < 3 || effect.value > 18 ||
        (effect.kind === 'raise_to' && (!Array.isArray(effect.tags) || !effect.tags.length)))) {
      issues.push(`${definition.name}: invalid score effect in foci.json.`);
    } else if (effect?.kind === 'raise_to') {
      const options = input.attributes.filter((item) => effect.tags.some((tag) => item.tags.includes(tag)) &&
        Number.isInteger(scores[item.id]) && scores[item.id]! >= 3 && scores[item.id]! < effect.value).map((item) => item.id);
      if (effect.optional && choice.attributeId === 'none') { /* Explicitly declined. */ }
      else if (choice.attributeId && options.includes(choice.attributeId)) changeScore(choice.attributeId, effect.value);
      else issues.push(`${definition.name}: choose an eligible attribute${effect.optional ? ' or decline the optional increase' : ''}.`);
    } else if (effect?.kind === 'cap_except_one') {
      const high = Object.keys(scores).filter((id) => scores[id]! > effect.value);
      const retained = high.length <= 1 ? high[0] : choice.retainedAttribute;
      if (high.length > 1 && (!retained || !high.includes(retained))) issues.push(`${definition.name}: choose the one attribute allowed above ${effect.value}.`);
      else for (const id of high) if (id !== retained) changeScore(id, effect.value);
    }
    const extra = definition.derived_bonus;
    if (extra) {
      const values = [extra.reaction_roll, extra.hit_die_penalty, extra.movement_speed, extra.initiative, extra.base_attack_bonus, extra.attack, extra.encumbrance_str, extra.system_strain_max, extra.hit_points_per_level, ...Object.values(extra.saves ?? {})];
      if (values.some((value) => value !== undefined && !Number.isSafeInteger(value)) ||
          (extra.hit_points_per_level !== undefined && extra.hit_points_per_level < 1) ||
          (extra.hit_die_penalty !== undefined && extra.hit_die_penalty < 1) ||
          (extra.saves !== undefined && !validSaveModifiers(extra.saves))) issues.push(`${definition.name}: invalid derived bonus in foci.json.`);
      else {
        derived.baseAttackBonusAdjustment += extra.base_attack_bonus ?? 0;
        if (extra.base_attack_bonus) derived.baseAttackAdjustments.push({ instanceId: instance.instanceId, focusId: instance.focusId, value: extra.base_attack_bonus });
        // This builder evaluates character level 1; submitted levels are never used.
        if (extra.hit_die_penalty) derived.hitDiePenalties.push({ instanceId: instance.instanceId, focusId: instance.focusId,
          name: definition.name, value: -extra.hit_die_penalty });
        if (extra.hit_points_per_level) {
          derived.hitPointsBonus += extra.hit_points_per_level;
          derived.hitPointAdjustments.push({ instanceId: instance.instanceId, focusId: instance.focusId,
            name: definition.name, value: extra.hit_points_per_level });
        }
        derived.attack += extra.attack ?? 0;
        derived.movementSpeedBonus += extra.movement_speed ?? 0;
        derived.initiativeBonus += extra.initiative ?? 0;
        derived.reactionRollBonus += extra.reaction_roll ?? 0;
        derived.encumbranceStrengthBonus += extra.encumbrance_str ?? 0;
        derived.systemStrainMaxBonus += extra.system_strain_max ?? 0;
        if (extra.saves && Object.values(extra.saves).some(Boolean)) {
          saveEffects.sources.push({ ...instance, name: definition.name, saves: { ...extra.saves } });
          for (const id of SAVE_IDS) derived.saves[id] += extra.saves[id] ?? 0;
        }
      }
    }
    if (definition.conditional_saves !== undefined) {
      if (!validConditionalSaves(definition.conditional_saves)) issues.push(`${definition.name}: invalid conditional saves in foci.json.`);
      else for (const rule of definition.conditional_saves) {
        saveEffects.conditional.push({ ...instance, name: definition.name, ...rule, saves: { ...rule.saves } });
      }
    }
    const upgraded = selection.applied.some((item) => item.parentInstanceId === instance.instanceId);
    const owner = instance.parentInstanceId ?? instance.instanceId;
    const skill = choicePreview[owner]?.['0']?.[0] || 'unresolved skill';
    if (!upgraded) for (const note of definition.sheet_notes ?? []) notes.push({ instanceId: instance.instanceId, text: note.replaceAll('{skill}', skill) });
  }
  const baseModifiers = Object.fromEntries(Object.entries(scores).map(([id, value]) => [id, getModifier(value)]));
  // The parent supplies the sole skill allotment; the child supplies Specialist's rule only.
  for (const grant of bound.grants) expanded.find((focus) => focus.id === grant.instanceId)!.bonus = [];
  const bonuses = evaluateFocusBonuses(expanded, choices, input.skills, input.attributes, baseModifiers);
  issues.push(...bonuses.issues);
  return { ...selection, scores, scoreChanges, baseModifiers, bonuses, ruleChoices, derived, saveEffects, notes, traditions: traditions.grants, baseAc,
    issues: [...new Set(issues)], complete: issues.length === 0 };
}
