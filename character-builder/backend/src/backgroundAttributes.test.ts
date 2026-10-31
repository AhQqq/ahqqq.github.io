import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';

const draft = () => ({
  name: 'Growth', goal: 'Explore', attributeMethod: 'rolled',
  attributes: { STR: 7, DEX: 12, CON: 12, INT: 7, WIS: 12, CHA: 7 }, attributeOverride: '',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'roll',
  backgroundRollTables: ['growth', 'growth', 'growth'],
  backgroundRollResults: [
    { table: 'growth', roll: 2, choiceId: 'CON' },
    { table: 'growth', roll: 3, choiceId: 'DEX' },
    { table: 'growth', roll: 4, choiceId: 'WIS' },
  ],
  classChoices: ['warrior', 'expert'], focusInstances: [], freeSkill: 'administer',
  startingEquipment: { method: 'silver', rolls: [1, 1, 1] },
});

test('growth crosses modifier thresholds and feeds HP, AC, and every affected save', () => {
  const source = draft();
  const result = evaluateCharacter(source);
  assert.deepEqual(result.allocatedAttributes, source.attributes);
  assert.deepEqual(result.backgroundAttributeBonuses, { CON: 2, DEX: 2, WIS: 2 });
  assert.deepEqual(result.attributes, { STR: 7, DEX: 14, CON: 14, INT: 7, WIS: 14, CHA: 7 });
  assert.equal(result.baseModifiers.CON, 1);
  assert.equal(result.modifiers.DEX, 1);
  assert.equal(result.modifiers.WIS, 1);
  assert.equal(result.derived.hitPoints, 9);
  assert.equal(result.derived.ac, 11);
  assert.equal(result.derived.physicalSave, 14);
  assert.equal(result.derived.evasionSave, 14);
  assert.equal(result.derived.mentalSave, 14);
  assert.equal(source.attributes.CON, 12);
  const restored = evaluateCharacter(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(restored.attributes, result.attributes);
  assert.deepEqual(restored.backgroundAttributeBonuses, result.backgroundAttributeBonuses);
});

test('changing the method, roll, or target removes previous growth instead of stacking it', () => {
  const source = draft();
  const picked = evaluateCharacter({ ...source, backgroundMethod: 'pick', backgroundPicks: ['connect', 'trade'] });
  assert.deepEqual(picked.attributes, source.attributes);
  assert.deepEqual(picked.backgroundAttributeBonuses, {});
  assert.equal(picked.derived.hitPoints, 8);
  assert.equal(picked.derived.ac, 10);
  const moved = evaluateCharacter({ ...source, backgroundRollResults: [
    { table: 'growth', roll: 2, choiceId: 'STR' }, ...source.backgroundRollResults.slice(1),
  ] });
  assert.equal(moved.attributes.CON, 12);
  assert.equal(moved.attributes.STR, 9);
  assert.equal(moved.derived.hitPoints, 8);
  const rerolled = evaluateCharacter({ ...source, backgroundRollResults: [
    { table: 'growth', roll: 5 }, ...source.backgroundRollResults.slice(1),
  ] });
  assert.equal(rerolled.attributes.CON, 12);
});

test('growth follows the optional 14 replacement and precedes focus modifier bonuses', () => {
  const result = evaluateCharacter({ ...draft(), attributeOverride: 'CON',
    focusInstances: [{ instanceId: 'developed', focusId: 'developed_attribute1' }],
    focusBonusChoices: { developed: { 0: ['CON'] } },
  });
  assert.equal(result.allocatedAttributes.CON, 14);
  assert.equal(result.backgroundAttributes.CON, 16);
  assert.equal(result.attributes.CON, 16);
  assert.equal(result.baseModifiers.CON, 1);
  assert.equal(result.focusModifierBonuses.CON, 1);
  assert.equal(result.modifiers.CON, 2);
  assert.equal(result.derived.hitPoints, 10);
});

test('focus score restrictions use growth-adjusted attributes', () => {
  const source = draft();
  const penal = evaluateCharacter({ ...source,
    focusInstances: [{ instanceId: 'penal', focusId: 'penal1' }],
    focusRuleChoices: { penal: { retainedAttribute: 'CON' } },
    focusBonusChoices: { penal: { 0: ['CHA'] } },
  });
  assert.equal(penal.backgroundAttributes.DEX, 14);
  assert.equal(penal.attributes.CON, 14);
  assert.equal(penal.attributes.DEX, 13);
  assert.equal(penal.attributes.WIS, 13);
  assert.ok(penal.focusScoreChanges.some((change) => change.id === 'DEX' && change.before === 14 && change.after === 13));
  const deepfolk = evaluateCharacter({ ...source,
    focusInstances: [{ instanceId: 'deepfolk', focusId: 'deepfolk1' }],
    focusRuleChoices: { deepfolk: { attributeId: 'CON' } },
  });
  assert.equal(deepfolk.attributes.CON, 14);
  assert.ok(deepfolk.issues.some((issue) => issue.includes('choose an eligible attribute')));
});
