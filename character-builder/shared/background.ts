import type { SkillGrant } from './skillAllocation.js';

type Action = { action: string; id?: string; count?: number };
type TaggedOption = { id: string; tags: string[] };

export type BackgroundAttributeGrant = { key: string; attributeId: string; count: number };

export type BackgroundData = {
  id: string;
  name: string;
  free_skill: Action[];
  growth: Action[];
  learn: Action[];
};

export type BackgroundDraft = {
  background?: string;
  backgroundSkill?: string;
  backgroundMethod?: string;
  backgroundPicks?: string[];
  backgroundRollTables?: string[];
  backgroundRollResults?: Array<{
    table?: string;
    roll?: number;
    choiceId?: string;
  }>;
};

function skillOptions(action: Action, skills: TaggedOption[]) {
  if (action.action === "fixed_skill") return skills.filter((skill) => skill.id === action.id);
  if (action.action === "tag_skill") {
    return skills.filter((skill) => action.id === "any" || skill.tags.includes(action.id ?? ""));
  }
  return [];
}

export function evaluateBackground(
  draft: BackgroundDraft,
  backgrounds: BackgroundData[],
  skills: TaggedOption[],
  attributes: TaggedOption[],
) {
  const issues: string[] = [];
  const grants: string[] = [];
  const skillGrants: SkillGrant[] = [];
  const attributeGrants: BackgroundAttributeGrant[] = [];
  const background = backgrounds.find((item) => item.id === draft.background);
  if (!background) {
    return { complete: false, issues: ["Choose a valid background."], skills: grants, skillGrants, attributeGrants };
  }

  for (const [index, action] of background.free_skill.entries()) {
    const options = skillOptions(action, skills);
    const selected = action.action === "fixed_skill" ? options[0]?.id ?? ""
      : options.some((skill) => skill.id === draft.backgroundSkill) ? draft.backgroundSkill! : "";
    skillGrants.push({ key: `background:free:${index}`, skillId: selected, scope: 'background',
      kind: action.action === 'fixed_skill' ? 'fixed' : 'choice', label: 'Background free skill' });
    if (action.action === "fixed_skill" && options[0]) {
      grants.push(options[0].id);
      if (draft.backgroundSkill && draft.backgroundSkill !== options[0].id) {
        issues.push("The background's fixed free skill cannot be changed.");
      }
    } else if (options.some((skill) => skill.id === draft.backgroundSkill)) {
      grants.push(draft.backgroundSkill!);
    } else {
      issues.push("Choose the background's free skill from its allowed options.");
    }
  }

  if (draft.backgroundMethod === "pick") {
    const allowed = new Set(background.learn
      .filter((action) => !(action.action === "tag_skill" && action.id === "any"))
      .flatMap((action) => skillOptions(action, skills))
      .map((skill) => skill.id));
    const picks = Array.isArray(draft.backgroundPicks) ? draft.backgroundPicks : [];
    for (let index = 0; index < 2; index++) {
      const id = picks[index] ?? '';
      skillGrants.push({ key: `background:pick:${index}`, skillId: allowed.has(id) ? id : '',
        scope: 'background', kind: 'choice', label: `Background pick ${index + 1}` });
    }
    if (picks.length !== 2) issues.push("Pick exactly two additional learning-table skills.");
    picks.forEach((id, index) => {
      if (!allowed.has(id)) {
        issues.push(`Background pick ${index + 1} must be a learning-table skill, excluding Any Skill.`);
      } else if (index < 2) {
        grants.push(id);
      }
    });
  } else if (draft.backgroundMethod === "roll") {
    const tables = Array.isArray(draft.backgroundRollTables) ? draft.backgroundRollTables : [];
    const results = Array.isArray(draft.backgroundRollResults) ? draft.backgroundRollResults : [];
    if (tables.length !== 3 || tables.some((table) => table !== "growth" && table !== "learn")) {
      issues.push("Allocate exactly three rolls between the growth and learning tables.");
    }
    if (results.length !== 3) issues.push("Roll all three allocated background dice.");
    results.forEach((result, index) => {
      if (!result || index >= 3 || result.table !== tables[index] ||
          (result.table !== "growth" && result.table !== "learn")) {
        issues.push(`Background roll ${index + 1} does not match its allocated table.`);
        return;
      }
      const rows = background[result.table];
      const roll = result.roll;
      if (typeof roll !== "number" || !Number.isInteger(roll) || roll < 1 || roll > rows.length) {
        issues.push(`Background roll ${index + 1} must be between 1 and ${rows.length}.`);
        return;
      }
      // Resolve the actual table row; never trust client-supplied action or skill caches.
      const action = rows[roll - 1]!;
      const options = skillOptions(action, skills);
      if (action.action === 'fixed_skill' || action.action === 'tag_skill') {
        const selected = action.action === 'fixed_skill' ? options[0]?.id ?? ''
          : options.some((skill) => skill.id === result.choiceId) ? result.choiceId! : '';
        skillGrants.push({ key: `background:roll:${index}`, skillId: selected, scope: 'background',
          kind: action.action === 'fixed_skill' ? 'fixed' : 'choice', label: `Background roll ${index + 1}` });
      }
      if (action.action === "fixed_skill" && options[0]) {
        grants.push(options[0].id);
      } else if (action.action === "tag_skill" && options.some((skill) => skill.id === result.choiceId)) {
        grants.push(result.choiceId!);
      } else if (action.action === "tag_attr" && attributes.some((attribute) =>
        attribute.id === result.choiceId && (action.id === "any" || attribute.tags.includes(action.id ?? "")))) {
        if (!Number.isSafeInteger(action.count) || action.count! <= 0) {
          issues.push(`Background roll ${index + 1} has an invalid attribute increase.`);
        } else {
          attributeGrants.push({ key: `background:roll:${index}`, attributeId: result.choiceId!, count: action.count! });
        }
      } else {
        issues.push(`Resolve background roll ${index + 1} using its allowed options.`);
      }
    });
  } else {
    issues.push("Choose whether to pick two background skills or roll three times.");
  }

  return { complete: issues.length === 0, issues, skills: grants, skillGrants, attributeGrants };
}

export function applyBackgroundAttributeGrants<K extends string>(
  scores: Record<K, number>,
  grants: BackgroundAttributeGrant[],
) {
  const attributes = { ...scores };
  const bonuses: Partial<Record<K, number>> = {};
  for (const grant of grants) {
    const id = grant.attributeId as K;
    if (!Object.hasOwn(attributes, id) || !Number.isSafeInteger(grant.count) || grant.count <= 0) continue;
    const before = attributes[id];
    if (!Number.isInteger(before) || before < 3 || before > 18) continue;
    // Always derive from the allocation, not a previously increased saved score.
    const increase = Math.min(grant.count, 18 - before);
    attributes[id] = before + increase;
    bonuses[id] = (bonuses[id] ?? 0) + increase;
  }
  return { attributes, bonuses };
}
