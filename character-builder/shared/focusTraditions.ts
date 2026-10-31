import type { FocusData } from './focusBonuses.js';
import type { FocusInstance } from './focusCreation.js';

export type MagicTraditionId = 'high' | 'elem' | 'necro';
export type FocusTraditionGrant = {
  instanceId: string; focusId: string; classId: 'invoker'; traditionId: MagicTraditionId;
  mode: 'partial' | 'full'; effortSkillId: string; minimumEffort: number;
};
const TRADITIONS: string[] = ['high', 'elem', 'necro'];
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Call only with funded, eligible focus instances; never accept grants from a saved draft.
export function evaluateFocusTraditions(applied: FocusInstance[], choices: unknown, foci: FocusData[], classIds: string[]) {
  const grants: FocusTraditionGrant[] = [];
  const issues: string[] = [];
  for (const instance of applied) {
    const focus = foci.find((item) => item.id === instance.focusId);
    const rule = focus?.tradition_choice;
    if (!focus || !rule) continue;
    if (rule.class_id !== 'invoker' || !Array.isArray(rule.options) || !rule.options.length ||
        rule.options.some((id) => !TRADITIONS.includes(id)) || new Set(rule.options).size !== rule.options.length ||
        rule.effort?.skill_id !== 'magic' || !Number.isSafeInteger(rule.effort.minimum) || rule.effort.minimum < 1) {
      issues.push(`${focus.name}: invalid tradition rule configuration.`);
      continue;
    }
    const count = classIds.filter((id) => id === rule.class_id).length;
    if (classIds.length !== 2 || count < 1 || count > 2) {
      issues.push(`${focus.name}: a valid Invoker class selection is required.`);
      continue;
    }
    const choice = record(choices) && Object.hasOwn(choices, instance.instanceId) ? choices[instance.instanceId] : undefined;
    const traditionId = record(choice) && Object.hasOwn(choice, 'traditionId') ? choice.traditionId : undefined;
    if (typeof traditionId !== 'string' || !rule.options.includes(traditionId)) {
      issues.push(`${focus.name}: choose one allowed magical tradition.`);
      continue;
    }
    grants.push({ instanceId: instance.instanceId, focusId: focus.id, classId: rule.class_id,
      traditionId: traditionId as MagicTraditionId, mode: count === 2 ? 'full' : 'partial',
      effortSkillId: rule.effort.skill_id, minimumEffort: rule.effort.minimum });
  }
  return { grants, issues, complete: issues.length === 0 };
}

export function evaluateFocusEffort(grants: FocusTraditionGrant[], skills: Record<string, { level: number }>) {
  return grants.map((grant) => {
    const level = skills[grant.effortSkillId]?.level;
    const skillLevel = typeof level === 'number' && Number.isSafeInteger(level) ? level : -1;
    return { ...grant, skillLevel, maximum: Math.max(grant.minimumEffort, skillLevel) };
  });
}
