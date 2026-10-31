import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluateFocusBaseAc } from '../../shared/focusArmorClass.js';
import { evaluateFocusCreation, evaluateFocusInstances, readFocusInstances, normalizeFocusRuleChoices } from '../../shared/focusCreation.js';
import { normalizeFocusBonusChoices } from '../../shared/focusBonuses.js';
import type { FocusData } from '../../shared/focusBonuses.js';
import { emptyLoadout, evaluateEquipmentInventory, restoreEquipmentInventory } from '../../shared/equipment.js';
import type { EquipmentPackage } from '../../shared/startingEquipment.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { evaluateCreationEffects } from '../../shared/characterCreation.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';

const data = readCharacterData();
const lizard = { instanceId: 'lizard', focusId: 'lizardmen1' };
const defense = { instanceId: 'defense', focusId: 'impervious_defense1' };
const definition = data.FOCI.find((item) => item.id === lizard.focusId)!;
const sources = evaluateFocusBaseAc([lizard], data.FOCI);
const fixture: EquipmentPackage = {
  id: 'lizard_ac', name: 'AC test', englishName: 'AC test', currency: { silver: 0 },
  items: data.EQUIPMENT.filter((item) => item.armor || item.shield || ['short_sword', 'staff'].includes(item.id))
    .map((item) => ({ id: item.id, count: 1, encumbrance: 1 })),
};
const worn = (armorId = '', shieldId = '', weaponId = '') => ({ armorId, shieldId, weaponId });
const equip = (armorId = '', shieldId = '', dexterity = 0, focusSources = sources, weaponId = '') =>
  evaluateEquipmentInventory({ startingEquipment: { method: 'package', packageId: fixture.id },
    loadout: worn(armorId, shieldId, weaponId), dexterity }, [fixture], data.EQUIPMENT, data.EQUIPMENT_PROPERTIES, focusSources).armorClass;
const draft = () => ({ ...baseDraft(), classChoices: ['warrior', 'warrior'], focusInstances: [lizard],
  focusBonusChoices: { lizard: { 2: ['STR'], 3: ['DEX'] } } });

test('Lizardmen grants fixed base 13, independent of character level and weapon use', () => {
  for (const level of [1, 2, 20]) {
    assert.deepEqual(evaluateFocusBaseAc([lizard], data.FOCI, level).sources,
      [{ ...lizard, name: definition.name, baseAc: 13, betterArmorBonus: 1 }]);
  }
  for (const weapon of ['', 'short_sword', 'staff']) assert.equal(equip('', '', 0, sources, weapon).value, 13);
  const incomplete = evaluateEquipmentInventory({ dexterity: -1 }, data.STARTING_EQUIPMENT, data.EQUIPMENT, data.EQUIPMENT_PROPERTIES, sources);
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.armorClass.value, 12);
});

test('armor below/equal/above 13, shields, DEX and armor penalties follow the confirmed order', () => {
  for (const [armorId, armorBase] of [['', 10], ['war_clothing', 11], ['leather_coat', 12], ['linen_cuirass', 13],
    ['partial_armor', 14], ['mail_armor', 16], ['plate_armor', 17]] as const) {
    for (const shieldId of ['', 'small_shield', 'large_shield']) for (const dex of [-2, 0, 3]) {
      const result = equip(armorId, shieldId, dex);
      const naturalOrArmor = armorBase > 13 ? armorBase + 1 : 13;
      const shieldBase = shieldId === 'large_shield' ? 14 : shieldId === 'small_shield' ? 13 : 0;
      const expectedBase = Math.max(naturalOrArmor, shieldBase);
      const expectedShield = shieldId && naturalOrArmor >= shieldBase ? 1 : 0;
      assert.equal(result.complete, true, result.issues.join(' '));
      assert.equal(result.base, expectedBase);
      assert.equal(result.shieldBonus, expectedShield);
      assert.equal(result.value, expectedBase + expectedShield + dex);
      assert.deepEqual(result.skillPenalties, data.EQUIPMENT.find((item) => item.id === (armorId || 'unarmored'))!.armor!.skillPenalties);
      assert.equal(result.baseSource?.kind, shieldBase > naturalOrArmor ? 'shield' : armorBase > 13 ? 'armor' : 'focus');
      assert.equal(result.baseSource?.armorBonus?.value, armorBase > 13 ? 1 : undefined);
    }
  }
});

test('Lizardmen armor bonus competes with Impervious Defense and never improves its base', () => {
  for (const applied of [[lizard, defense], [defense, lizard]]) {
    const combined = evaluateFocusBaseAc(applied, data.FOCI);
    for (const [armorId, expected] of [['', 16], ['linen_cuirass', 16], ['partial_armor', 16], ['mail_armor', 17], ['plate_armor', 18]] as const) {
      const result = equip(armorId, '', 0, combined);
      assert.equal(result.base, expected);
      assert.equal(result.baseSource?.kind, expected === 16 ? 'focus' : 'armor');
      assert.equal(result.baseSource?.armorBonus?.focusId, expected === 16 ? undefined : 'lizardmen1');
    }
  }
});

test('preview/API agree with final modifier choices, removal and saved-draft restoration', () => {
  for (const armorId of ['', 'partial_armor']) for (const shieldId of ['', 'large_shield']) {
    const source = { ...draft(), equipmentLoadout: worn(armorId, shieldId, 'short_sword') };
    const api = evaluateCharacter(source);
    assert.equal(api.valid, true, api.issues.join(' '));
    assert.equal(api.modifiers.DEX, -1);
    const core = evaluatePreviewCore(source, data);
    const preview = evaluateCreationEffects(source, data, core, evaluateClassChoices(source.classChoices, data.CLASSES));
    assert.deepEqual(api.armorClass, preview.equipmentInventory.armorClass);
    assert.deepEqual(core.focusCreation.bonuses.skills, ['stab', 'survive']);
    const saved = JSON.parse(JSON.stringify(source));
    const restoredInstances = readFocusInstances(saved.focusInstances, saved.focus, data.FOCI).instances;
    const restoredInventory = restoreEquipmentInventory(saved.equipmentPurchases, saved.equipmentLoadout);
    const restored = evaluateCharacter({ ...saved, focusInstances: restoredInstances,
      focusBonusChoices: normalizeFocusBonusChoices(saved.focusBonusChoices, ['lizard'], [{ ...definition, id: 'lizard' }]),
      focusRuleChoices: normalizeFocusRuleChoices(saved.focusRuleChoices, restoredInstances),
      equipmentPurchases: restoredInventory.purchases, equipmentLoadout: restoredInventory.loadout });
    assert.deepEqual(restored.armorClass, api.armorClass);
    const changed = evaluateCharacter({ ...source, focusBonusChoices: { lizard: { 2: ['CHA'], 3: ['CHA'] } } });
    assert.equal(changed.modifiers.DEX, 0);
    assert.equal(changed.derived.ac, api.derived.ac! + 1);
    const removed = evaluateCharacter({ ...source, focusInstances: [] });
    assert.deepEqual(removed.armorClass.focusBases, []);
    assert.equal(removed.armorClass.baseSource?.armorBonus, undefined);
    assert.equal(removed.derived.ac, (armorId ? 14 : shieldId ? 14 : 10) + (armorId && shieldId ? 1 : 0));
  }
  const forged = evaluateCharacter({ ...draft(), characterLevel: 99, baseAc: 99, armorClass: { value: 99 } });
  assert.equal(forged.armorClass.base, 13);
  const legacy = evaluateCharacter({ ...draft(), focusInstances: undefined, focus: ['lizardmen1'],
    focusBonusChoices: { lizardmen1: { 2: ['STR'], 3: ['DEX'] } } });
  assert.equal(legacy.armorClass.base, 13);
});

test('invalid loadouts and ineligible Lizardmen never grant armor benefits', () => {
  const conflict = equip('', 'large_shield', 0, sources, 'staff');
  assert.equal(conflict.value, null);
  for (const changed of [{ classChoices: ['healer', 'healer'] },
    { focusInstances: [lizard, { ...lizard, instanceId: 'duplicate' }] },
    { focusInstances: [lizard, { instanceId: 'dwarf', focusId: 'dwarves1' }] },
    { focusInstances: [{ instanceId: 'upgrade', focusId: 'lizardmen2' }] }]) {
    const result = evaluateCharacter({ ...draft(), ...changed });
    assert.equal(result.valid, false);
    assert.deepEqual(result.armorClass.focusBases, []);
  }
  const unfunded = evaluateFocusInstances([lizard], undefined, data.FOCI, data.CLASSES.filter((item) => item.id === 'warrior'), []);
  assert.deepEqual(evaluateFocusBaseAc(unfunded.applied, data.FOCI).sources, []);
  for (const loadout of [null, { ...emptyLoadout(), armorId: 'plate_armor' }]) {
    assert.equal(evaluateCharacter({ ...draft(), equipmentLoadout: loadout }).armorClass.value, null);
  }
});

test('malformed fixed AC and armor-bonus metadata block AC', () => {
  for (const bad of [null, { base: -13, armor_rule: 'higher' }, { base: 13, rounding: 'up', armor_rule: 'higher' },
    ...[0, -1, 0.5, '1', null].map((bonus) => ({ ...definition.base_ac, better_armor_bonus: bonus }))]) {
    const catalogue = [{ ...definition, base_ac: bad }] as FocusData[];
    const evaluated = evaluateFocusBaseAc([lizard], catalogue);
    assert.equal(evaluated.complete, false);
    assert.deepEqual(evaluated.sources, []);
    assert.equal(equip('', '', 0, evaluated).value, null);
    assert.equal(evaluateFocusCreation({ instances: [lizard], foci: catalogue, classes: [], baseLimit: 1,
      skills: data.SKILLS, attributes: data.ATTRIBUTES, scores: draft().attributes! }).complete, false);
  }
});
