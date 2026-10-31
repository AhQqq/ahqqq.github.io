import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { normalizeFocusRuleChoices } from '../../shared/focusCreation.js';
const data = readCharacterData();
const origin = { instanceId: 'chattel', focusId: 'chattel1' };
const draft = (scoreDie: unknown = 2, attribute = 'CON') => ({ ...baseDraft(),
  focusInstances: [origin], focusRuleChoices: { chattel: { scoreDie } },
  focusBonusChoices: { chattel: { 0: ['perform'], 1: [attribute] } } });

test('Chattel uses each saved d4 result in either allocation mode and shares preview calculations', () => {
  for (const attributeMethod of ['array', 'rolled'] as const) for (let die = 1; die <= 4; die++) {
    const source = { ...draft(die), attributeMethod };
    const original = structuredClone(source);
    const result = evaluateCharacter(source);
    assert.equal(result.valid, true, result.issues.join(' '));
    assert.equal(result.attributes.STR, die + 2);
    assert.equal(result.modifiers.STR, die === 1 ? -2 : -1);
    assert.equal(result.modifiers.CON, 1);
    assert.equal(result.derived.hitPoints, 9);
    assert.equal(result.savingThrows.targets.physical, 14);
    assert.equal(result.derived.focusAttackBonus, -2);
    assert.equal(result.derived.attackBonus, result.derived.baseAttackBonus - 2);
    const core = evaluatePreviewCore(source, data);
    assert.equal(core.focusCreation.scores.STR, die + 2);
    assert.equal(core.focusCreation.derived.attack, -2);
    assert.equal(core.skillAllocation.states.perform.allotments, 1);
    assert.deepEqual(source, original);
  }
});

test('Chattel replaces STR after optional 14 and background growth, then applies modifier bonuses', () => {
  const source = { ...draft(1), attributeMethod: 'rolled', attributeOverride: 'STR',
    backgroundMethod: 'roll', backgroundRollTables: ['growth', 'growth', 'growth'],
    backgroundRollResults: [{ table: 'growth', roll: 1, choiceId: 'STR' },
      { table: 'growth', roll: 4, choiceId: 'INT' }, { table: 'growth', roll: 6, choiceId: 'notice' }],
    focusInstances: [origin, { instanceId: 'developed', focusId: 'developed_attribute1' }],
    focusBonusChoices: { ...draft().focusBonusChoices, developed: { 0: ['STR'] } } };
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join(' '));
  assert.equal(result.backgroundAttributeBonuses.STR, 1);
  assert.equal(result.attributes.STR, 3);
  assert.equal(result.modifiers.STR, -1);
});

test('CON or CHA increases only its modifier and permits +3 with other modifier bonuses capped', () => {
  for (const attribute of ['CON', 'CHA']) {
    const source = { ...draft(4, attribute), attributeMethod: 'rolled',
      attributes: { STR: 14, DEX: 12, CON: 18, INT: 10, WIS: 9, CHA: 18 },
      focusInstances: [origin, { instanceId: 'developed', focusId: 'developed_attribute1' }],
      focusBonusChoices: { ...draft(4, attribute).focusBonusChoices, developed: { 0: [attribute] } } };
    const result = evaluateCharacter(source);
    assert.equal(result.valid, true, result.issues.join(' '));
    assert.equal(result.attributes[attribute], 18);
    assert.equal(result.modifiers[attribute], 3);
    assert.equal(result.derived.hitPoints, attribute === 'CON' ? 11 : 10);
    assert.equal(result.savingThrows.targets.mental, attribute === 'CHA' ? 12 : 13);
  }
});

test('missing or malformed dice and restricted bonus choices cannot complete creation', () => {
  for (const die of [undefined, null, '2', 0, 5, 1.5, NaN, Infinity, {}, []]) {
    const result = evaluateCharacter(draft(die === undefined ? null : die));
    assert.equal(result.valid, false);
    assert.equal(result.attributes.STR, 14);
    assert.ok(result.issues.some((issue) => issue.includes('score die')));
  }
  for (const skill of ['magic', 'shoot', 'stab', 'punch']) {
    const result = evaluateCharacter({ ...draft(), focusBonusChoices: { chattel: { 0: [skill], 1: ['CON'] } } });
    assert.equal(result.valid, false);
  }
  for (const attribute of ['', 'STR', 'DEX']) assert.equal(evaluateCharacter(draft(2, attribute)).valid, false);
  assert.equal(evaluateCharacter({ ...draft(), focusRuleChoices: {} }).valid, false);
});

test('saved dice survive normalization and repeated restoration; removal restores original scores and effects', () => {
  const saved = JSON.parse(JSON.stringify(draft(1)));
  const restored = { ...saved, focusRuleChoices: normalizeFocusRuleChoices(saved.focusRuleChoices, [origin]) };
  for (let i = 0; i < 3; i++) {
    const result = evaluateCharacter(restored);
    assert.equal(result.valid, true, result.issues.join(' '));
    assert.equal(result.attributes.STR, 3);
    assert.equal(restored.attributes.STR, 14);
    assert.equal(restored.focusRuleChoices.chattel.scoreDie, 1);
  }
  const removed = evaluateCharacter({ ...restored, focusInstances: [] });
  assert.equal(removed.attributes.STR, 14);
  assert.equal(removed.modifiers.CON, 0);
  assert.equal(removed.derived.hitPoints, 8);
  assert.equal(removed.derived.focusAttackBonus, 0);
  assert.deepEqual(removed.focusRuleNotes, []);
  for (const other of ['deepfolk1', 'penal1', 'focus_0421']) {
    const conflict = evaluateCharacter({ ...restored, focusInstances: [origin, { instanceId: 'other', focusId: other }] });
    assert.equal(conflict.valid, false);
    assert.equal(conflict.attributes.STR, 14);
    assert.equal(conflict.derived.focusAttackBonus, 0);
  }
});
