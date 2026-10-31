import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { evaluateFocusCreation, evaluateFocusInstances } from '../../shared/focusCreation.js';
import type { FocusData } from '../../shared/focusBonuses.js';
import { evaluateFocusBaseAc } from '../../shared/focusArmorClass.js';
import { emptyLoadout, evaluateEquipmentInventory } from '../../shared/equipment.js';
import type { EquipmentDefinition, EquipmentPackage, EquipmentProperty } from '../../shared/startingEquipment.js';

const data = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
const foci = data<FocusData[]>('foci');
const equipment = data<EquipmentDefinition[]>('equipment');
const properties = data<EquipmentProperty[]>('equipment_properties');
const packages = data<EquipmentPackage[]>('starting_equipment');
const classes = data<Array<{ id: string; archetype: string }>>('classes');
const defense = { instanceId: 'defense', focusId: 'impervious_defense1' };
const definition = foci.find((item) => item.id === defense.focusId)!;
const focusBaseAc = evaluateFocusBaseAc([defense], foci);
const fixture: EquipmentPackage = {
  id: 'ac_fixture', name: 'AC fixture', englishName: 'AC fixture', currency: { silver: 0 },
  items: ['partial_armor', 'mail_armor', 'plate_armor', 'composite_armor', 'large_shield', 'small_shield', 'staff']
    .map((id) => ({ id, count: 1, encumbrance: 1 })),
};
const worn = (armorId = '', shieldId = '', weaponId = '') => ({ armorId, shieldId, weaponId });
const draft = () => ({
  ...createArrayAllocation(), name: 'Defense tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: ['warrior', 'warrior'], focusInstances: [defense], freeSkill: 'administer',
  startingEquipment: { method: 'package', packageId: 'armored_warrior' }, equipmentLoadout: emptyLoadout(),
});

test('Impervious Defense encodes an alternative base, with upward-rounded half character level', () => {
  assert.deepEqual(definition.base_ac, { base: 15, level_divisor: 2, rounding: 'up', armor_rule: 'higher' });
  for (const [level, expected] of [[1, 16], [2, 16], [3, 17], [4, 17], [5, 18]]) {
    const result = evaluateFocusBaseAc([defense], foci, level);
    assert.equal(result.complete, true);
    assert.deepEqual(result.sources, [{ ...defense, name: definition.name, baseAc: expected }]);
  }
  for (const level of [0, -1, 1.5, NaN, Infinity]) assert.equal(evaluateFocusBaseAc([defense], foci, level).complete, false);
  assert.deepEqual(evaluateFocusBaseAc([], foci).sources, []);
});

test('invalid base AC metadata blocks AC instead of inventing a value', () => {
  const rule = definition.base_ac!;
  for (const invalid of [null, { ...rule, base: -1 }, { ...rule, base: 15.5 },
    { ...rule, level_divisor: 0 }, { ...rule, rounding: 'down' }, { ...rule, armor_rule: 'add' },
    { ...rule, base: Number.MAX_SAFE_INTEGER }]) {
    const catalogue = [{ ...definition, base_ac: invalid }] as FocusData[];
    const result = evaluateFocusBaseAc([defense], catalogue);
    assert.equal(result.complete, false);
    assert.deepEqual(result.sources, []);
    const creation = evaluateFocusCreation({ instances: [defense], foci: catalogue,
      classes: classes.filter((item) => item.id === 'warrior'), baseLimit: [{ id: 'free', val: 1 }],
      skills: [], attributes: [], scores: {} });
    assert.equal(creation.complete, false);
    const inventory = evaluateEquipmentInventory({ dexterity: 0 }, packages, equipment, properties, result);
    assert.equal(inventory.armorClass.complete, false);
    assert.equal(inventory.armorClass.value, null);
  }
});

test('focus base works before equipment is selected and does not complete the equipment checkpoint', () => {
  for (const dexterity of [-2, 0, 1, 2, 3]) {
    const result = evaluateEquipmentInventory({ dexterity, startingEquipment: { method: '' } }, packages, equipment, properties, focusBaseAc);
    assert.equal(result.complete, false);
    assert.equal(result.armorClass.complete, true);
    assert.equal(result.armorClass.value, 16 + dexterity);
    assert.equal(result.armorClass.baseSource?.instanceId, defense.instanceId);
  }
  const result = evaluateCharacter({ ...draft(), startingEquipment: { method: '' } });
  assert.equal(result.derived.ac, 16 + result.modifiers.DEX);
  assert.equal(result.stepStatus.find((step) => step.key === 'equipment')?.complete, false);
  assert.equal(result.stepStatus.find((step) => step.key === 'armorClass')?.complete, true);
});

test('armor and focus bases never stack; shields and final DEX apply after the comparison', () => {
  for (const [armorId, armorBase] of [['', 10], ['partial_armor', 14], ['mail_armor', 16], ['plate_armor', 17], ['composite_armor', 19]] as const) {
    for (const shieldId of ['', 'small_shield', 'large_shield']) {
      for (const dexterity of [-2, 0, 3]) {
        const result = evaluateEquipmentInventory({ startingEquipment: { method: 'package', packageId: fixture.id },
          loadout: worn(armorId, shieldId), dexterity }, [fixture], equipment, properties, focusBaseAc).armorClass;
        assert.equal(result.complete, true, result.issues.join('\n'));
        assert.equal(result.base, Math.max(16, armorBase));
        assert.equal(result.shieldBonus, shieldId ? 1 : 0);
        assert.equal(result.value, Math.max(16, armorBase) + (shieldId ? 1 : 0) + dexterity);
        assert.equal(result.baseSource?.kind, armorBase > 16 ? 'armor' : 'focus');
        assert.deepEqual(result.skillPenalties, equipment.find((item) => item.id === (armorId || 'unarmored'))!.armor!.skillPenalties);
        assert.equal(result.focusBases[0]!.baseAc, 16);
      }
    }
  }
  const higherShield = equipment.map((item) => item.id === 'large_shield' ? { ...item, shield: { baseAc: 20, armorBonus: 1 } } : item);
  const result = evaluateEquipmentInventory({ startingEquipment: { method: 'package', packageId: fixture.id },
    loadout: worn('', 'large_shield'), dexterity: 1 }, [fixture], higherShield, properties, focusBaseAc).armorClass;
  assert.equal(result.base, 20);
  assert.equal(result.baseSource?.kind, 'shield');
  assert.equal(result.shieldBonus, 0);
  assert.equal(result.value, 21);
});

test('all alternative bases compete rather than adding together', () => {
  const additional = { ...definition, id: 'stronger', base_ac: { ...definition.base_ac!, base: 17 } };
  const sources = evaluateFocusBaseAc([defense, { instanceId: 'other', focusId: additional.id }], [...foci, additional]);
  const result = evaluateEquipmentInventory({ dexterity: 0 }, packages, equipment, properties, sources).armorClass;
  assert.equal(result.value, 18);
  assert.equal(result.baseSource?.id, additional.id);
});

test('focus does not bypass ownership, invalid loadouts, final DEX or shield-hand restrictions', () => {
  for (const loadout of [null, {}, { ...worn(), baseAc: 99 }, worn('plate_armor'), worn('', 'large_shield')]) {
    const result = evaluateEquipmentInventory({ loadout, dexterity: 0 }, packages, equipment, properties, focusBaseAc);
    assert.equal(result.armorClass.value, null);
  }
  assert.equal(evaluateEquipmentInventory({ dexterity: NaN }, packages, equipment, properties, focusBaseAc).armorClass.value, null);
  const conflict = evaluateEquipmentInventory({ startingEquipment: { method: 'package', packageId: fixture.id },
    loadout: worn('', 'large_shield', 'staff'), dexterity: 0 }, [fixture], equipment, properties, focusBaseAc);
  assert.equal(conflict.armorClass.value, null);
  assert.match(conflict.armorClass.issues.join(' '), /two-handed/);
});

test('the API and shared preview agree, include modifier bonuses and recalculate on removal', () => {
  const source = { ...draft(), equipmentLoadout: worn('partial_armor', 'large_shield', 'short_sword') };
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join('\n'));
  const preview = evaluateEquipmentInventory({ startingEquipment: source.startingEquipment, loadout: source.equipmentLoadout,
    dexterity: result.modifiers.DEX }, packages, equipment, properties, focusBaseAc);
  assert.deepEqual(result.armorClass, preview.armorClass);
  assert.equal(result.derived.ac, 17 + result.modifiers.DEX);
  const without = evaluateCharacter({ ...source, focusInstances: [] });
  assert.equal(without.derived.ac, 15 + without.modifiers.DEX);
  assert.deepEqual(without.armorClass.focusBases, []);
  const developed = evaluateCharacter({ ...draft(), attributeMethod: 'rolled',
    attributes: { STR: 10, DEX: 18, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    focusInstances: [defense, { instanceId: 'developed', focusId: 'developed_attribute1' }],
    focusBonusChoices: { developed: { 0: ['DEX'] } } });
  assert.equal(developed.modifiers.DEX, 3);
  assert.equal(developed.derived.ac, 19);
});

test('ineligible, repeated, unfunded and level-2 focus selections cannot grant base AC', () => {
  const unfunded = evaluateFocusInstances([defense], undefined, foci, classes.filter((item) => item.id === 'warrior'), []);
  assert.deepEqual(evaluateFocusBaseAc(unfunded.applied, foci).sources, []);
  for (const changed of [
    { classChoices: ['healer', 'healer'] },
    { focusInstances: [defense, { ...defense, instanceId: 'duplicate' }] },
    { focusInstances: [{ instanceId: 'upgrade', focusId: 'impervious_defense2' }] },
    { focusInstances: [defense, { instanceId: 'unknown', focusId: 'missing' }, { instanceId: 'excess', focusId: 'missing2' }] },
  ]) {
    const result = evaluateCharacter({ ...draft(), ...changed });
    assert.equal(result.valid, false);
    assert.deepEqual(result.armorClass.focusBases, []);
    assert.equal(result.derived.ac, 10 + result.modifiers.DEX);
  }
  const linked = evaluateCharacter({ ...draft(), focusInstances: [defense,
    { instanceId: 'upgrade', focusId: 'impervious_defense2', parentInstanceId: defense.instanceId }] });
  assert.equal(linked.focusSelection.complete, false);
  assert.equal(linked.armorClass.focusBases.length, 1);
  assert.equal(linked.derived.ac, 16 + linked.modifiers.DEX);
});

test('saved and client-supplied totals or character levels cannot override level-1 rules', () => {
  const restored = evaluateCharacter(JSON.parse(JSON.stringify(draft())));
  assert.equal(restored.armorClass.base, 16);
  const forged = { ...draft(), characterLevel: 20, baseAc: 99, armorClass: { value: 99 },
    focusBaseAc: { sources: [{ ...defense, baseAc: 99 }], issues: [], complete: true } };
  assert.equal(evaluateCharacter(forged).armorClass.base, 16);
  const removed = evaluateCharacter({ ...forged, focusInstances: [] });
  assert.equal(removed.derived.ac, 10 + removed.modifiers.DEX);
});
