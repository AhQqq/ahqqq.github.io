export type EquipmentProperty = { id: string; name: string; category: 'weapon' | 'encumbrance' | 'shield'; description: string };
export type EquipmentDefinition = {
  id: string; name: string; type: 'item' | 'bundle';
  category: 'gear' | 'bundle' | 'weapon' | 'armor' | 'shield';
  availability: 'purchase' | 'grant_only' | 'inherent';
  price: { amount: number; currency: 'silver' | 'copper' } | null;
  encumbrance: { value: number | null; raw: string };
  propertyIds: string[];
  sources: { table: string; name: string; price: string; encumbrance: string }[];
  weapon?: { damage: string; shock: { damage: number; maxAc: number } | null;
    attributes: string[]; range: { normal: number; maximum: number; unit: 'ft' } | null };
  armor?: { baseAc: number; category: 'none' | 'light' | 'medium' | 'heavy'; skillPenalties: { sneak: number; exert: number } };
  shield?: { baseAc: number; armorBonus: number };
};
export type EquipmentGrant = { id: string; count: number; encumbrance: number | null };
export type EquipmentPackage = {
  id: string; name: string; englishName: string; items: EquipmentGrant[]; currency: { silver: number };
};
export type StartingEquipmentChoice = { method: '' } | { method: 'package'; packageId: string } |
  { method: 'silver'; rolls: number[] };
export type GrantedEquipment = Pick<EquipmentDefinition, 'id' | 'name' | 'type'> & EquipmentGrant;
export type EquipmentEvaluation = {
  choice: StartingEquipmentChoice;
  package: { id: string; name: string; englishName: string } | null;
  items: GrantedEquipment[];
  silver: number | null;
  encumbrance: { listed: number; complete: boolean; unlisted: string[] };
  complete: boolean;
  issues: string[];
};

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nonnegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function readEquipmentChoice(source: unknown): { choice: StartingEquipmentChoice; issues: string[] } {
  if (source === undefined) return { choice: { method: '' }, issues: [] };
  if (!record(source)) return { choice: { method: '' }, issues: ['Starting equipment must be a method selection.'] };
  const issues: string[] = [];
  let choice: StartingEquipmentChoice = { method: '' };
  let allowed = ['method'];
  if (source.method === 'package') {
    allowed = ['method', 'packageId'];
    if (typeof source.packageId !== 'string') issues.push('Choose a starting package by its ID.');
    choice = { method: 'package', packageId: typeof source.packageId === 'string' ? source.packageId : '' };
  } else if (source.method === 'silver') {
    allowed = ['method', 'rolls'];
    const valid = Array.isArray(source.rolls) && (source.rolls.length === 0 || source.rolls.length === 3) &&
      source.rolls.every((die) => Number.isInteger(die) && die >= 1 && die <= 6);
    if (!valid) issues.push('Starting silver requires exactly three d6 results, each an integer from 1 to 6.');
    choice = { method: 'silver', rolls: valid ? [...source.rolls as number[]] : [] };
  } else if (source.method !== '') issues.push('Unknown starting equipment method. Choose a package or roll silver.');
  if (Object.keys(source).some((key) => !allowed.includes(key))) {
    issues.push('Starting equipment must contain only the active method and its choice; do not combine package grants with a silver roll or submit cached items or money.');
  }
  return { choice, issues };
}

export function restoreStartingEquipment(source: unknown, legacyArmor: unknown) {
  const parsed = readEquipmentChoice(source);
  if (parsed.issues.length) return { choice: { method: '' } as StartingEquipmentChoice,
    notice: 'Saved equipment choices were malformed and were cleared. Choose a package or roll starting silver again.' };
  return { choice: parsed.choice, notice: source === undefined && legacyArmor !== undefined
    ? 'The old armor selector has been removed. It does not represent a starting package; choose a package or roll starting silver. Other character choices were retained.' : '' };
}

export function evaluateStartingEquipment(source: unknown, packages: EquipmentPackage[], equipment: EquipmentDefinition[]): EquipmentEvaluation {
  const { choice, issues } = readEquipmentChoice(source);
  const result: EquipmentEvaluation = { choice, package: null, items: [], silver: null,
    encumbrance: { listed: 0, complete: false, unlisted: [] }, complete: false, issues };
  if (issues.length) return result;
  if (choice.method === '') {
    issues.push('Choose a starting equipment package or roll starting silver.');
    return result;
  }
  if (choice.method === 'silver') {
    if (choice.rolls.length !== 3) { issues.push('Roll 3d6 for starting silver.'); return result; }
    result.silver = choice.rolls.reduce((total, die) => total + die, 0) * 10;
    result.encumbrance.complete = true;
    result.complete = true;
    return result;
  }

  const matches = Array.isArray(packages) ? packages.filter((item) => item?.id === choice.packageId) : [];
  const selected = matches.length === 1 ? matches[0] : undefined;
  if (!selected) {
    issues.push(choice.packageId ? `Unknown or ambiguous starting equipment package: ${choice.packageId}.` : 'Choose one starting equipment package.');
    return result;
  }
  if (typeof selected.name !== 'string' || !selected.name.trim() || typeof selected.englishName !== 'string' ||
      !Array.isArray(selected.items) || !selected.items.length || !nonnegativeInteger(selected.currency?.silver)) {
    issues.push(`Invalid starting equipment package data: ${choice.packageId}.`);
    return result;
  }
  const items: GrantedEquipment[] = [];
  const seen = new Set<string>();
  for (const row of selected.items) {
    if (!row || typeof row.id !== 'string' || !row.id || !nonnegativeInteger(row.count) || row.count < 1 ||
        (row.encumbrance !== null && !nonnegativeInteger(row.encumbrance))) {
      issues.push(`${selected.name}: invalid item count or row encumbrance in the package data.`);
      continue;
    }
    if (seen.has(row.id)) { issues.push(`${selected.name}: duplicate package item ${row.id}.`); continue; }
    seen.add(row.id);
    const definitions = Array.isArray(equipment) ? equipment.filter((item) => item?.id === row.id) : [];
    const definition = definitions.length === 1 ? definitions[0] : undefined;
    if (!definition || typeof definition.name !== 'string' || !definition.name.trim() || !['item', 'bundle'].includes(definition.type)) {
      issues.push(`${selected.name}: missing, ambiguous, or invalid equipment definition ${row.id}.`);
      continue;
    }
    items.push({ id: definition.id, name: definition.name, type: definition.type, count: row.count, encumbrance: row.encumbrance });
  }
  // Encumbrance already describes the whole grant row, not a per-item weight.
  const listed = items.reduce((sum, item) => sum + (item.encumbrance ?? 0), 0);
  if (!Number.isSafeInteger(listed)) issues.push(`${selected.name}: invalid listed encumbrance total.`);
  if (issues.length) return result;
  result.package = { id: selected.id, name: selected.name, englishName: selected.englishName };
  result.items = items;
  result.silver = selected.currency.silver;
  result.encumbrance = { listed, complete: items.every((item) => item.encumbrance !== null),
    unlisted: items.filter((item) => item.encumbrance === null).map((item) => item.id) };
  result.complete = true;
  return result;
}
