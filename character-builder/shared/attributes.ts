import { getModifier } from './attributeModifier.js';
export { getModifier } from './attributeModifier.js';

export const ATTRIBUTE_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export const ARRAY_VALUES = [14, 12, 11, 10, 9, 7] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
export type AttributeScores = Record<AttributeKey, number>;

export type AttributeDraft = {
  attributeMethod?: string;
  attributes?: Partial<Record<AttributeKey, number>>;
  attributeOverride?: string;
};

export function evaluateAttributes(draft: AttributeDraft) {
  const issues: string[] = [];
  const attributes = {} as Record<AttributeKey, number>;
  for (const key of ATTRIBUTE_KEYS) {
    const score = draft.attributes?.[key];
    if (typeof score !== "number" || !Number.isInteger(score) || score < 3 || score > 18) {
      issues.push(`${key} must be an integer between 3 and 18.`);
      attributes[key] = 0;
    } else {
      attributes[key] = score;
    }
  }

  if (draft.attributeMethod === "array") {
    const actual = Object.values(attributes).sort((a, b) => a - b).join(",");
    if (actual !== [...ARRAY_VALUES].sort((a, b) => a - b).join(",")) {
      issues.push("Array allocation must use 14, 12, 11, 10, 9, and 7 exactly once.");
    }
  } else if (draft.attributeMethod !== "rolled") {
    issues.push("Choose fixed array or rolled attribute allocation.");
  }

  const override = draft.attributeOverride;
  if (override !== undefined && override !== "") {
    if (draft.attributeMethod !== "rolled") {
      issues.push("Only rolled attributes may use the optional replacement with 14.");
    } else if (!ATTRIBUTE_KEYS.some((key) => key === override)) {
      issues.push("Choose a single valid attribute to replace with 14.");
    } else if (attributes[override as AttributeKey] !== 0) {
      attributes[override as AttributeKey] = 14;
    }
  }

  const modifiers = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, getModifier(attributes[key])])) as Record<AttributeKey, number>;
  return { complete: issues.length === 0, issues, attributes, modifiers };
}
