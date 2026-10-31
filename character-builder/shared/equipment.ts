import { evaluateStartingEquipment } from './startingEquipment.js';
import type { EquipmentDefinition, EquipmentEvaluation, EquipmentPackage, EquipmentProperty, GrantedEquipment } from './startingEquipment.js';
import type { FocusBaseAcEvaluation, FocusBaseAcSource } from './focusArmorClass.js';

// Confirmed by the translator; the source page does not specify exchange rates.
export const COPPER_PER_SILVER = 10;
export type EquipmentPurchase = { id: string; count: number };
export type EquipmentLoadout = { armorId: string; shieldId: string; weaponId: string };
export type OwnedEquipment = GrantedEquipment & { packageCount: number; purchasedCount: number };
export type ArmorClassEvaluation = {
  value: number | null; complete: boolean; base: number | null; shieldBonus: number;
  baseSource: { kind: 'armor' | 'shield' | 'focus' | 'art'; id: string; name: string; instanceId?: string;
    armorBonus?: { instanceId: string; focusId: string; name: string; value: number } } | null;
  focusBases: FocusBaseAcSource[];
  dexterity: number; armor: EquipmentDefinition | null; shield: EquipmentDefinition | null;
  weapon: EquipmentDefinition | null; skillPenalties: { sneak: number; exert: number };
  issues: string[];
};
export type InventoryEvaluation = {
  starting: EquipmentEvaluation; purchases: EquipmentPurchase[]; loadout: EquipmentLoadout;
  items: OwnedEquipment[]; spentCopper: number | null; remainingCopper: number | null;
  encumbrance: { listed: number; complete: boolean; reviewIds: string[] };
  complete: boolean; issues: string[]; armorClass: ArmorClassEvaluation;
};
export const emptyLoadout = (): EquipmentLoadout => ({ armorId: '', shieldId: '', weaponId: '' });
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const nonnegative = (value: unknown): value is number => integer(value) && value >= 0;

function readPurchases(source: unknown): { choices: EquipmentPurchase[]; issues: string[] } {
  if (source === undefined) return { choices: [], issues: [] };
  if (!Array.isArray(source) || source.some((row) => !record(row) || typeof row.id !== 'string' || !row.id ||
      !integer(row.count) || row.count <= 0 || Object.keys(row).some((key) => !['id', 'count'].includes(key)))) {
    return { choices: [], issues: ['Equipment purchases must contain only item IDs and positive integer quantities.'] };
  }
  const choices = source.map((row) => ({ id: row.id as string, count: row.count as number }));
  return { choices, issues: new Set(choices.map((row) => row.id)).size === choices.length ? [] : ['Combine duplicate purchase rows into one quantity per item.'] };
}

function readLoadout(source: unknown): { choice: EquipmentLoadout; issues: string[] } {
  if (source === undefined) return { choice: emptyLoadout(), issues: [] };
  if (!record(source) || ['armorId', 'shieldId', 'weaponId'].some((key) => typeof source[key] !== 'string') ||
      Object.keys(source).some((key) => !['armorId', 'shieldId', 'weaponId'].includes(key))) {
    return { choice: emptyLoadout(), issues: ['Equipped choices must contain only armorId, shieldId, and weaponId strings.'] };
  }
  return { choice: { armorId: source.armorId as string, shieldId: source.shieldId as string, weaponId: source.weaponId as string }, issues: [] };
}

export function restoreEquipmentInventory(purchases: unknown, loadout: unknown) {
  const parsedPurchases = readPurchases(purchases);
  const parsedLoadout = readLoadout(loadout);
  return {
    purchases: parsedPurchases.issues.length ? [] : parsedPurchases.choices,
    loadout: parsedLoadout.issues.length ? emptyLoadout() : parsedLoadout.choice,
    notice: [...(parsedPurchases.issues.length ? ['Malformed saved purchases were cleared.'] : []),
      ...(parsedLoadout.issues.length ? ['Malformed saved equipped choices were cleared.'] : [])].join(' '),
  };
}

export function equipmentPriceCopper(item: EquipmentDefinition): number | null {
  const price = item.price;
  if (item.availability !== 'purchase' || !price || !nonnegative(price.amount) || price.amount === 0 ||
      !['silver', 'copper'].includes(price.currency)) return null;
  const value = price.amount * (price.currency === 'silver' ? COPPER_PER_SILVER : 1);
  return Number.isSafeInteger(value) ? value : null;
}

function purchasedLoad(item: EquipmentDefinition, count: number): number | null {
  if (!nonnegative(item.encumbrance?.value)) return null;
  const groupSize = item.propertyIds.includes('numerous') ? 5 : item.propertyIds.includes('bundle_of_three') ? 3 : 1;
  const value = item.encumbrance.value * Math.ceil(count / groupSize);
  return Number.isSafeInteger(value) ? value : null;
}

function hasValidProperties(item: EquipmentDefinition, properties: EquipmentProperty[]) {
  return Array.isArray(item.propertyIds) && item.propertyIds.every((id) =>
    properties.filter((property) => property.id === id && typeof property.description === 'string').length === 1);
}

export function evaluateEquipmentInventory(input: {
  startingEquipment?: unknown; purchases?: unknown; loadout?: unknown; dexterity: number;
}, packages: EquipmentPackage[], equipment: EquipmentDefinition[], properties: EquipmentProperty[], focusBaseAc?: FocusBaseAcEvaluation): InventoryEvaluation {
  const starting = evaluateStartingEquipment(input.startingEquipment, packages, equipment);
  const purchases = readPurchases(input.purchases);
  const loadout = readLoadout(input.loadout);
  const issues = [...starting.issues, ...purchases.issues];
  const byId = (id: string) => {
    const matches = equipment.filter((item) => item.id === id);
    return matches.length === 1 ? matches[0] : undefined;
  };
  let spent = 0;
  const bought: { definition: EquipmentDefinition; count: number }[] = [];
  for (const row of purchases.choices) {
    const item = byId(row.id);
    const price = item ? equipmentPriceCopper(item) : null;
    if (!item || price === null || !hasValidProperties(item, properties)) {
      issues.push(`Cannot purchase ${item?.name ?? row.id}: missing, ambiguous, unpriced, or invalid catalogue data.`);
      continue;
    }
    const cost = price * row.count;
    if (!Number.isSafeInteger(cost) || !Number.isSafeInteger(spent + cost)) {
      issues.push(`Invalid purchase total for ${item.name}.`);
      continue;
    }
    spent += cost;
    bought.push({ definition: item, count: row.count });
  }
  const funds = starting.silver === null ? null : starting.silver * COPPER_PER_SILVER;
  if (funds !== null && (!Number.isSafeInteger(funds) || spent > funds)) {
    issues.push('Equipment purchases exceed the available starting funds.');
  }
  const complete = issues.length === 0 && starting.complete;
  const items: OwnedEquipment[] = starting.items.map((item) => ({ ...item, packageCount: item.count, purchasedCount: 0 }));
  // Invalid carts never grant partial purchases or a spendable remainder.
  if (complete) for (const { definition, count } of bought) {
    const load = purchasedLoad(definition, count);
    const existing = items.find((item) => item.id === definition.id);
    if (existing) {
      existing.count += count;
      existing.purchasedCount = count;
      existing.encumbrance = existing.encumbrance === null || load === null ? null : existing.encumbrance + load;
    } else items.push({ id: definition.id, name: definition.name, type: definition.type,
      count, encumbrance: load, packageCount: 0, purchasedCount: count });
  }
  const reviewIds = items.filter((item) => {
    const definition = byId(item.id);
    return item.encumbrance === null || (item.purchasedCount > 0 && definition?.propertyIds.some((id) =>
      id === 'negligible_load' || id === 'no_load_when_worn'));
  }).map((item) => item.id);
  const requiresOwnedEquipment = Boolean(
    (loadout.choice.armorId && loadout.choice.armorId !== 'unarmored') || loadout.choice.shieldId ||
    (loadout.choice.weaponId && loadout.choice.weaponId !== 'unarmed_attack'));
  // Inherent unarmored AC does not depend on completing starting equipment or purchases.
  const armorClass = evaluateEquipmentLoadout(loadout.choice, items, equipment, properties, input.dexterity,
    [...loadout.issues, ...(!complete && requiresOwnedEquipment ? ['Finish a valid starting equipment choice and purchases before calculating equipped AC.'] : [])], focusBaseAc);
  return {
    starting, purchases: purchases.choices, loadout: loadout.choice, items,
    spentCopper: complete ? spent : null, remainingCopper: complete && funds !== null ? funds - spent : null,
    encumbrance: { listed: items.reduce((sum, item) => sum + (item.encumbrance ?? 0), 0),
      complete: complete && reviewIds.length === 0, reviewIds },
    complete, issues: [...issues, ...armorClass.issues], armorClass,
  };
}

export function evaluateEquipmentLoadout(loadout: EquipmentLoadout, items: OwnedEquipment[],
  equipment: EquipmentDefinition[], properties: EquipmentProperty[], dexterity: number,
  initialIssues: string[] = [], focusBaseAc?: FocusBaseAcEvaluation): ArmorClassEvaluation {
  const issues = [...initialIssues, ...(focusBaseAc?.issues ?? [])];
  const focusBases = focusBaseAc?.sources ?? [];
  const lookup = (id: string, kind: 'armor' | 'shield' | 'weapon') => {
    const matches = equipment.filter((item) => item.id === id);
    const item = matches.length === 1 ? matches[0] : undefined;
    if (!item || !item[kind] || !hasValidProperties(item, properties)) {
      issues.push(`Unknown or invalid equipped ${kind}: ${id}.`);
      return null;
    }
    const inherent = (kind === 'armor' && id === 'unarmored') || (kind === 'weapon' && id === 'unarmed_attack');
    if (!inherent && !items.some((row) => row.id === id && row.count > 0)) {
      issues.push(`You do not own the equipped ${kind}: ${item.name}.`);
      return null;
    }
    return item;
  };
  const armor = lookup(loadout.armorId || 'unarmored', 'armor');
  const shield = loadout.shieldId ? lookup(loadout.shieldId, 'shield') : null;
  const weapon = lookup(loadout.weaponId || 'unarmed_attack', 'weapon');
  const armorData = armor?.armor;
  const shieldData = shield?.shield;
  if (!armorData || !nonnegative(armorData.baseAc) ||
      !integer(armorData.skillPenalties?.sneak) || armorData.skillPenalties.sneak > 0 ||
      !integer(armorData.skillPenalties?.exert) || armorData.skillPenalties.exert > 0) {
    issues.push('The equipped armor has invalid AC or skill penalty data.');
  }
  if (shield && (!shieldData || !nonnegative(shieldData.baseAc) || !nonnegative(shieldData.armorBonus))) {
    issues.push('The equipped shield has invalid AC data.');
  }
  if (!integer(dexterity)) issues.push('AC requires a valid final DEX modifier.');
  if (shield && weapon?.propertyIds.includes('two_handed')) {
    issues.push('A two-handed active weapon cannot be used with a held shield. Stow the shield or change the weapon.');
  }
  if (weapon?.shield && weapon.id !== shield?.id) {
    issues.push('To attack with a shield, select that same shield as your held shield.');
  }
  const complete = issues.length === 0;
  let base: number | null = null;
  let baseSource: ArmorClassEvaluation['baseSource'] = null;
  let shieldBonus = 0;
  if (complete && armor && armorData) {
    base = armorData.baseAc;
    baseSource = { kind: 'armor', id: armor.id, name: armor.name };
    // Each focus competes with the original armor base, not another focus's result.
    // A better-armor bonus belongs only to its armor candidate and never stacks.
    for (const source of focusBases) {
      if (source.requiresUnarmored && (armor.id !== 'unarmored' || shield)) continue;
      const improvesArmor = armor.id !== 'unarmored' && armorData.baseAc > source.baseAc && source.betterArmorBonus !== undefined;
      const candidate = improvesArmor ? armorData.baseAc + source.betterArmorBonus! : source.baseAc;
      if (!Number.isSafeInteger(candidate)) {
        issues.push('The equipped armor has invalid AC or skill penalty data.');
        continue;
      }
      if (candidate < base) continue;
      base = candidate;
      baseSource = improvesArmor
        ? { kind: 'armor', id: armor.id, name: armor.name, armorBonus: {
          instanceId: source.instanceId, focusId: source.focusId, name: source.name, value: source.betterArmorBonus! } }
        : { kind: source.sourceKind ?? 'focus', id: source.focusId, name: source.name, instanceId: source.instanceId };
    }
    if (shield && shieldData) {
      if (shieldData.baseAc > base) {
        base = shieldData.baseAc;
        baseSource = { kind: 'shield', id: shield.id, name: shield.name };
      } else shieldBonus = shieldData.armorBonus;
    }
  }
  if (issues.length) { base = null; baseSource = null; shieldBonus = 0; }
  return {
    value: base === null ? null : base + shieldBonus + dexterity,
    complete: issues.length === 0, base, baseSource, focusBases, shieldBonus, dexterity, armor, shield, weapon,
    skillPenalties: issues.length === 0 && armorData ? { ...armorData.skillPenalties } : { sneak: 0, exert: 0 }, issues,
  };
}

// Only UI actions prune choices; the API rejects stale/unowned loadouts instead of silently repairing them.
export function pruneEquipmentLoadout(loadout: EquipmentLoadout, items: OwnedEquipment[]): EquipmentLoadout {
  const owns = (id: string) => !id || id === 'unarmored' || id === 'unarmed_attack' || items.some((item) => item.id === id && item.count > 0);
  const next = { armorId: owns(loadout.armorId) ? loadout.armorId : '',
    shieldId: owns(loadout.shieldId) ? loadout.shieldId : '', weaponId: owns(loadout.weaponId) ? loadout.weaponId : '' };
  if (next.weaponId === loadout.shieldId && next.shieldId !== loadout.shieldId) next.weaponId = '';
  return next;
}
