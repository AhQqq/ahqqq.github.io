import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateStartingEquipment, restoreStartingEquipment } from '../../shared/startingEquipment.js';
import type { EquipmentDefinition, EquipmentPackage } from '../../shared/startingEquipment.js';
import { evaluateCharacter } from './character.js';

const data = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
const packages = data<EquipmentPackage[]>('starting_equipment');
const equipment = data<EquipmentDefinition[]>('equipment');
const evaluate = (source: unknown) => evaluateStartingEquipment(source, packages, equipment);
const packageChoice = (packageId: string) => ({ method: 'package', packageId });

test('all six packages grant their exact listed items and silver without class restrictions', () => {
  const silver = [0, 0, 20, 20, 0, 80];
  assert.equal(packages.length, 6);
  for (const [index, option] of packages.entries()) {
    const result = evaluate(packageChoice(option.id));
    assert.equal(result.complete, true, result.issues.join('\n'));
    assert.equal(result.package?.id, option.id);
    assert.deepEqual(result.items.map(({ id, count, encumbrance }) => ({ id, count, encumbrance })), option.items);
    assert.equal(result.silver, silver[index]);
    const api = evaluateCharacter({ classChoices: ['warrior', 'warrior'], startingEquipment: packageChoice(option.id) });
    assert.deepEqual(api.equipmentSelection, result);
    assert.equal(api.stepStatus.find((step) => step.key === 'equipment')?.complete, true);
  }
});

test('row loads are not multiplied by quantity; null never becomes a complete numeric load', () => {
  const rogue = evaluate(packageChoice('roguish_wanderer'));
  assert.equal(rogue.items.find((item) => item.id === 'throwing_knife')?.count, 5);
  assert.equal(rogue.items.find((item) => item.id === 'throwing_knife')?.encumbrance, 1);
  assert.equal(rogue.encumbrance.listed, 12);
  const mage = evaluate(packageChoice('mage_healer_or_scholar'));
  assert.equal(mage.items.find((item) => item.id === 'dagger')?.count, 2);
  assert.equal(mage.items.find((item) => item.id === 'dagger')?.encumbrance, 2);
  assert.equal(mage.encumbrance.listed, 14);
  const peasant = evaluate(packageChoice('adventuring_peasant'));
  assert.equal(peasant.items.find((item) => item.id === 'war_clothing')?.encumbrance, 0);
  assert.deepEqual(peasant.encumbrance, { listed: 9, complete: false, unlisted: ['mule_and_small_cart'] });
});

test('silver rolls derive 3d6 times ten and never grant package items', () => {
  for (const [rolls, silver] of [[[1, 1, 1], 30], [[6, 6, 6], 180], [[1, 2, 3], 60]] as const) {
    const result = evaluate({ method: 'silver', rolls: [...rolls] });
    assert.equal(result.complete, true);
    assert.equal(result.silver, silver);
    assert.deepEqual(result.items, []);
    assert.equal(result.package, null);
  }
  const original = evaluate(packageChoice('mage_healer_or_scholar'));
  assert.equal(original.silver, 80);
  assert.equal(evaluate({ method: 'silver', rolls: [1, 2, 3] }).silver, 60);
  assert.equal(evaluate(packageChoice('armored_warrior')).silver, 0);
  assert.equal(original.silver, 80);
});

test('missing, malformed, mixed, and cached grant payloads grant nothing', () => {
  for (const source of [undefined, null, [], '', { method: '' }, { method: 'other' },
    packageChoice('missing'), packageChoice(''), { method: 'package', packageId: 2 },
    { ...packageChoice('armored_warrior'), rolls: [6, 6, 6] },
    { ...packageChoice('armored_warrior'), items: [{ id: 'longbow', count: 99 }], silver: 9999 },
    { method: 'silver', rolls: [6, 6, 6], packageId: 'armored_warrior' },
    { method: 'silver', rolls: [6, 6, 6], silver: 9999 },
    ...[[], [1], [1, 2], [1, 2, 3, 4], [0, 1, 2], [1, 2, 7], [1, 2, 1.5], [1, 2, '3'], null, '123'].map((rolls) => ({ method: 'silver', rolls }))]) {
    const result = evaluate(source);
    assert.equal(result.complete, false, JSON.stringify(source));
    assert.deepEqual(result.items, []);
    assert.equal(result.silver, null);
    assert.ok(result.issues.length);
  }
});

test('bad package metadata and unresolved equipment references fail atomically', () => {
  const source = packageChoice('armored_warrior');
  const original = packages.find((item) => item.id === 'armored_warrior')!;
  const badPackages = [
    { ...original, items: [] },
    { ...original, items: [...original.items, { id: 'missing', count: 1, encumbrance: 1 }] },
    { ...original, items: [...original.items, original.items[0]!] },
    { ...original, items: [{ ...original.items[0]!, count: 0 }] },
    { ...original, items: [{ ...original.items[0]!, encumbrance: -1 }] },
    { ...original, currency: { silver: -1 } },
  ];
  for (const option of badPackages) {
    const result = evaluateStartingEquipment(source, [option], equipment);
    assert.equal(result.complete, false);
    assert.deepEqual(result.items, []);
    assert.equal(result.silver, null);
  }
  assert.equal(evaluateStartingEquipment(source, [original, original], equipment).complete, false);
  const duplicate = equipment.find((item) => item.id === 'partial_armor')!;
  assert.equal(evaluateStartingEquipment(source, packages, [...equipment, duplicate]).complete, false);
});

test('restoration preserves valid choices, requires a new choice for legacy armor, and flags malformed input', () => {
  for (const choice of [packageChoice('adventuring_peasant'), { method: 'silver', rolls: [2, 4, 6] }]) {
    const saved = JSON.parse(JSON.stringify(choice));
    const restored = restoreStartingEquipment(saved, undefined);
    assert.deepEqual(restored.choice, choice);
    assert.equal(restored.notice, '');
    assert.deepEqual(evaluate(restored.choice), evaluate(choice));
  }
  const legacy = { name: 'Mail shirt', acBonus: 3 };
  const restored = restoreStartingEquipment(undefined, legacy);
  assert.deepEqual(restored.choice, { method: '' });
  assert.match(restored.notice, /old armor/);
  assert.deepEqual(legacy, { name: 'Mail shirt', acBonus: 3 });
  const malformed = restoreStartingEquipment({ method: 'silver', rolls: [99, 1, 2] }, undefined);
  assert.deepEqual(malformed.choice, { method: '' });
  assert.match(malformed.notice, /malformed/);
  const unknown = restoreStartingEquipment(packageChoice('deleted_package'), undefined);
  assert.deepEqual(unknown.choice, packageChoice('deleted_package'));
  assert.equal(evaluate(unknown.choice).complete, false);
});

test('API ignores legacy armor and cached grants, and defaults owned but unequipped armor to unarmored AC', () => {
  const input = { startingEquipment: packageChoice('armored_warrior'), armor: { name: 'Forged armor', acBonus: 9999 },
    equipmentSelection: { items: [{ id: 'longbow', count: 99 }], silver: 9999 } };
  const result = evaluateCharacter(input);
  assert.equal(result.equipmentSelection.complete, true);
  assert.equal(result.equipmentSelection.silver, 0);
  assert.equal(result.equipmentSelection.items.some((item) => item.id === 'longbow'), false);
  assert.equal(result.derived.ac, 10 + result.modifiers.DEX);
  assert.equal(result.armorClass.complete, true);
  assert.equal(result.stepStatus.find((step) => step.key === 'armorClass')?.complete, true);
  assert.equal(result.stepStatus.find((step) => step.key === 'equipment')?.complete, true);
  const legacy = evaluateCharacter({ armor: input.armor });
  assert.equal(legacy.equipmentSelection.complete, false);
  assert.equal(legacy.derived.ac, 10 + legacy.modifiers.DEX);
  assert.equal(legacy.armorClass.complete, true);
});
