import type { SkillGrant } from './skillAllocation.js';
import type { ConditionalSaveModifier, SaveModifiers } from './savingThrows.js';

type TaggedOption = { id: string; tags: string[] };
type OptionFilter = { ids?: string[]; tags?: string[] };

export type ModifierCapOverride = { min?: number; max?: number };
export const DEFAULT_MODIFIER_CAPS = { min: -2, max: 2 };

export type FocusBonus = {
  action: string;
  id?: string;
  ids?: string[];
  count?: number;
  value?: number;
  cap_override?: ModifierCapOverride;
  filter?: OptionFilter;
  exclude?: OptionFilter;
};

export type FocusData = {
  id: string;
  name: string;
  bonus: FocusBonus[];
  requirements: Array<{ condition: string; id: string }>;
  ability_ids?: string[];
  manual_review?: string[];
  type?: string;
  tags?: string[];
  level?: number;
  repeatable?: boolean;
  // Catalogue-only companion choices; the level-1 creator does not evaluate them.
  benefit_choices?: {
    target: 'familiar';
    choose: number;
    unique_within_instance: boolean;
    unique_across_instances: boolean;
    options: Array<{
      id: string;
      name: string;
      description: string;
      selection?: { kind: 'background'; count: 1 };
    }>;
  };
  skill_focus_grant?: { focus_id: string; bonus_index: number; skill_allotments: 1 };
  unique_skill?: boolean;
  extra_focus_picks?: number;
  base_ac?: { base: number; armor_rule: 'higher'; better_armor_bonus?: number } & (
    { level_divisor: number; rounding: 'up' } | { level_divisor?: never; rounding?: never }
  );
  tradition_choice?: {
    class_id: 'invoker'; options: string[]; effort: { skill_id: string; minimum: number };
  };
  packages?: {
    required: boolean;
    options: Array<{ id: string; name: string; description: string; bonus: FocusBonus[] }>;
  };
  score_effect?: { kind: 'raise_to'; value: number; tags: string[]; optional: boolean } |
    { kind: 'cap_except_one'; value: number } |
    { kind: 'threshold_replace'; attribute_id: string; threshold: number; below: number; at_or_above: number } |
    { kind: 'reroll'; attribute_id: string; sides: number; bonus: number } |
    { kind: 'redistribute'; target: number };
  derived_bonus?: { base_attack_bonus?: number; attack?: number; saves?: SaveModifiers;
    movement_speed?: number; initiative?: number; reaction_roll?: number; encumbrance_str?: number; system_strain_max?: number; hit_points_per_level?: number; hit_die_penalty?: number };
  conditional_saves?: ConditionalSaveModifier[];
  sheet_notes?: string[];
};

export type FocusBonusChoice = {
  bonusIndex: number;
  slotIndex: number;
  kind: "skill" | "attribute_modifier";
  value: number;
  options: string[];
  selected: string;
  limits: string;
};

export function focusCreationLevelReason(focus: Pick<FocusData, 'name' | 'level'>): string {
  return (focus.level ?? 1) === 1 ? '' : `${focus.name}: only level-1 foci can be selected at character creation.`;
}

export function focusRequirementMet(rule: FocusData['requirements'][number], classes: Array<{ id: string; archetype: string }>, eligible: ReadonlySet<string>, selected: ReadonlySet<string>) {
  const hasClass = classes.some((item) => item.id === rule.id || item.archetype === rule.id);
  if (rule.condition === 'is_class') return hasClass;
  if (rule.condition === 'not_class') return !hasClass;
  if (rule.condition === 'has_focus') return eligible.has(rule.id);
  if (rule.condition === 'not_focus') return !selected.has(rule.id);
  return false;
}

export function originFamilyId(focus: FocusData, foci: FocusData[]): string {
  let root = focus;
  while ((root.level ?? 1) > 1) {
    const links = root.requirements.filter((rule) => rule.condition === 'has_focus');
    const parent = links.length === 1 ? foci.find((item) => item.id === links[0]!.id) : undefined;
    if (!parent || parent.type !== 'origin' || parent.level !== root.level! - 1) break;
    root = parent;
  }
  return root.id;
}

export function eligibleSelectedFoci(ids: string[], foci: FocusData[], classes: Array<{ id: string; archetype: string }>) {
  const selected = foci.filter((focus) => ids.includes(focus.id));
  const requested = new Set(ids);
  const originConflict = new Set(selected.filter((focus) => focus.type === 'origin').map((focus) => originFamilyId(focus, foci))).size > 1;
  const eligible = new Set<string>();
  // Resolve prerequisites from eligible selections, not merely client-supplied IDs.
  let changed = true;
  while (changed) {
    changed = false;
    for (const focus of selected) {
      if (eligible.has(focus.id)) continue;
      if (focusCreationLevelReason(focus)) continue;
      if (originConflict && focus.type === 'origin') continue;
      if (focus.requirements.every((requirement) => focusRequirementMet(requirement, classes, eligible, requested))) {
        eligible.add(focus.id);
        changed = true;
      }
    }
  }
  const byId = new Map(selected.map((focus) => [focus.id, focus]));
  return [...new Set(ids)].filter((id) => eligible.has(id)).map((id) => byId.get(id)!);
}

function choiceOptions(bonus: FocusBonus, catalog: TaggedOption[]) {
  return catalog.filter((item) =>
    (!bonus.ids || bonus.ids.includes(item.id)) &&
    (!bonus.filter?.ids || bonus.filter.ids.includes(item.id)) &&
    (!bonus.filter?.tags?.length || bonus.filter.tags.some((tag) => item.tags.includes(tag))) &&
    !bonus.exclude?.ids?.includes(item.id) &&
    !bonus.exclude?.tags?.some((tag) => item.tags.includes(tag)))
    .map((item) => item.id);
}

function readChoices(choices: unknown, focusId: string, bonusIndex: number): unknown {
  if (!choices || typeof choices !== "object" || Array.isArray(choices)) return undefined;
  const focusChoices = (choices as Record<string, unknown>)[focusId];
  if (!focusChoices || typeof focusChoices !== "object" || Array.isArray(focusChoices)) return undefined;
  return (focusChoices as Record<string, unknown>)[String(bonusIndex)];
}

export function normalizeFocusBonusChoices(source: unknown, selectedIds: string[], foci: FocusData[]): Record<string, Record<string, string[]>> {
  const result: Record<string, Record<string, string[]>> = {};
  for (const focus of foci) {
    if (!selectedIds.includes(focus.id)) continue;
    focus.bonus.forEach((bonus, index) => {
      if (bonus.action !== 'choice_skill' && bonus.action !== 'choice_attribute_modifier') return;
      const slots = readChoices(source, focus.id, index);
      if (!Array.isArray(slots)) return;
      const choices = result[focus.id] ??= {};
      choices[String(index)] = slots.slice(0, bonus.count ?? 1).map((slot) => typeof slot === 'string' ? slot : '');
    });
  }
  return result;
}

export function modifierLimitText(bonus: FocusBonus): string {
  const cap = bonus.cap_override;
  return [cap?.min === undefined ? '' : `minimum ${cap.min}`,
    cap?.max === undefined ? '' : `maximum ${cap.max >= 0 ? '+' : ''}${cap.max}`].filter(Boolean).join(', ');
}

function validCapOverride(value: unknown): value is ModifierCapOverride {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const cap = value as Record<string, unknown>;
  const keys = Object.keys(cap);
  return keys.length > 0 && keys.every((key) => key === 'min' || key === 'max') &&
    (!('min' in cap) || (typeof cap.min === 'number' && Number.isInteger(cap.min) && cap.min <= DEFAULT_MODIFIER_CAPS.min)) &&
    (!('max' in cap) || (typeof cap.max === 'number' && Number.isInteger(cap.max) && cap.max >= DEFAULT_MODIFIER_CAPS.max));
}

export function evaluateFocusBonuses(foci: FocusData[], selections: unknown, skills: TaggedOption[], attributes: TaggedOption[], baseModifiers: Record<string, number> = {}) {
  const issues: string[] = [];
  const skillGrants: string[] = [];
  const skillAllotments: SkillGrant[] = [];
  const modifierBonuses: Record<string, number> = Object.fromEntries(attributes.map((attribute) => [attribute.id, 0]));
  const modifierContributions: Record<string, number> = { ...modifierBonuses };
  const modifierCaps: Record<string, { min: number; max: number }> = Object.fromEntries(
    attributes.map((attribute) => [attribute.id, { ...DEFAULT_MODIFIER_CAPS }]));
  const details = [...new Map(foci.map((focus) => [focus.id, focus])).values()].map((focus) => {
    const issueStart = issues.length;
    const grantedSkills: string[] = [];
    const modifierChanges: Array<{ id: string; value: number }> = [];
    const capOverrides: Array<ModifierCapOverride & { id: string }> = [];
    const choices: FocusBonusChoice[] = [];
    const addModifier = (id: string, bonus: FocusBonus) => {
      const value = bonus.value ?? 0;
      modifierContributions[id] = (modifierContributions[id] ?? 0) + value;
      if (bonus.value !== undefined) modifierChanges.push({ id, value });
      if (bonus.cap_override) {
        const cap = modifierCaps[id]!;
        cap.min = Math.min(cap.min, bonus.cap_override.min ?? cap.min);
        cap.max = Math.max(cap.max, bonus.cap_override.max ?? cap.max);
        capOverrides.push({ id, ...bonus.cap_override });
      }
    };
    focus.bonus.forEach((bonus, bonusIndex) => {
      const label = `${focus.name} bonus ${bonusIndex + 1}`;
      const count = bonus.count ?? 1;
      if (!Number.isInteger(count) || count < 1) {
        issues.push(`${label} has an invalid count in foci.json.`);
        return;
      }
      if (bonus.action === "attribute_modifier" || bonus.action === "choice_attribute_modifier") {
        if (bonus.value === undefined ? bonus.cap_override === undefined : !Number.isInteger(bonus.value)) {
          issues.push(`${label} has an invalid modifier value in foci.json.`);
          return;
        }
        if ('min_limit' in bonus || 'max_limit' in bonus) {
          issues.push(`${label} uses legacy modifier limits; replace them with cap_override in foci.json.`);
          return;
        }
        if (bonus.cap_override !== undefined && !validCapOverride(bonus.cap_override)) {
          issues.push(`${label} has an invalid modifier cap_override in foci.json.`);
          return;
        }
      }
      if (bonus.action === "fixed_skill") {
        if (skills.some((skill) => skill.id === bonus.id)) {
          grantedSkills.push(...Array<string>(count).fill(bonus.id!));
          for (let slot = 0; slot < count; slot++) {
            skillAllotments.push({ key: `focus:${focus.id}:${bonusIndex}:${slot}`, skillId: bonus.id!,
              scope: 'focus', kind: 'fixed', label });
          }
        }
        else issues.push(`${label} references an unknown skill in foci.json.`);
      } else if (bonus.action === "attribute_modifier") {
        if (attributes.some((attribute) => attribute.id === bonus.id)) addModifier(bonus.id!, bonus);
        else issues.push(`${label} references an unknown attribute in foci.json.`);
      } else if (bonus.action === "choice_skill" || bonus.action === "choice_attribute_modifier") {
        const kind = bonus.action === "choice_skill" ? "skill" : "attribute_modifier";
        const options = choiceOptions(bonus, kind === "skill" ? skills : attributes);
        const raw = readChoices(selections, focus.id, bonusIndex);
        const selected = Array.isArray(raw) ? raw : [];
        if (raw !== undefined && (!Array.isArray(raw) || selected.length > count)) issues.push(`${label} requires exactly ${count} choice(s).`);
        const used = new Set<string>();
        for (let slotIndex = 0; slotIndex < count; slotIndex++) {
          const id: unknown = selected[slotIndex];
          const valid = typeof id === "string" && options.includes(id) && !used.has(id);
          choices.push({ bonusIndex, slotIndex, kind, value: bonus.value ?? 0, options, selected: valid ? id : "", limits: modifierLimitText(bonus) });
          if (kind === 'skill') skillAllotments.push({ key: `focus:${focus.id}:${bonusIndex}:${slotIndex}`,
            skillId: valid ? id : '', scope: 'focus', kind: 'choice', label });
          if (!valid) {
            issues.push(`${label}: choose an allowed ${kind === "skill" ? "skill" : "attribute"} for choice ${slotIndex + 1}.`);
            continue;
          }
          used.add(id);
          if (kind === "skill") grantedSkills.push(id);
          else addModifier(id, bonus);
        }
      } else {
        issues.push(`${label} uses an unsupported bonus action: ${bonus.action}.`);
      }
    });
    skillGrants.push(...grantedSkills);
    return { focusId: focus.id, skills: grantedSkills, modifierChanges, capOverrides, choices,
      issues: issues.slice(issueStart), manualReview: focus.manual_review ?? [] };
  });
  // Resolve all target-specific exceptions and sum signed contributions before clamping once.
  for (const { id } of attributes) {
    const base = baseModifiers[id] ?? 0;
    const cap = modifierCaps[id]!;
    const final = Math.max(cap.min, Math.min(cap.max, base + modifierContributions[id]!));
    modifierBonuses[id] = final - base;
  }
  return { complete: issues.length === 0, issues, skills: skillGrants, skillGrants: skillAllotments,
    modifierBonuses, modifierContributions, modifierCaps, details };
}
