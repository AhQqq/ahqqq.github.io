import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { normalizeFocusRuleChoices } from '../../shared/focusCreation.js';
import { evaluateScoreRedistribution } from '../../shared/scoreRedistribution.js';
const data = readCharacterData();
const origin = { instanceId: 'elf', focusId: 'elves1' };
const draft = (scoreTransfers?: unknown) => ({ ...baseDraft(), focusInstances: [origin],
  focusRuleChoices: { elf: { scoreTransfers } }, focusBonusChoices: { elf: { 0: ['perform'] } } });

test('Elves optionally redistributes a fixed array without changing saved allocation or total', () => {
  for (const transfer of [undefined, {}, { STR: -2, CHA: 2 }, { STR: -1, DEX: -1, CHA: 2 }]) {
    const source = draft(transfer);
    const original = structuredClone(source);
    const result = evaluateCharacter(source);
    assert.equal(result.valid, true, result.issues.join(' '));
    assert.equal(result.attributes.CHA, transfer && Object.keys(transfer).length ? 9 : 7);
    assert.equal(Object.values(result.attributes).reduce((a,b) => a+b, 0), 63);
    const preview = evaluatePreviewCore(source, data);
    assert.deepEqual(preview.focusCreation.scores, result.attributes);
    assert.deepEqual(source, original);
  }
});

test('rolled low scores may be selected independently, with modifiers, HP, AC and saves recomputed', () => {
  const source = { ...draft({ STR: -6, CON: 6 }), attributeMethod: 'rolled',
    attributes: { STR: 18, DEX: 3, CON: 3, INT: 10, WIS: 9, CHA: 7 } };
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join(' '));
  assert.equal(result.attributes.CON, 9);
  assert.equal(result.attributes.DEX, 3);
  assert.equal(result.modifiers.CON, 0);
  assert.equal(result.derived.hitPoints, 8);
  assert.equal(result.savingThrows.targets.physical, 15);
  const dex = evaluateCharacter({ ...source, focusRuleChoices: { elf: { scoreTransfers: { STR: -6, DEX: 6 } } } });
  assert.equal(dex.attributes.DEX, 9);
  assert.equal(dex.derived.ac, result.derived.ac + 2);
  assert.equal(dex.derived.hitPoints, 6);
});

test('allocation replacement and growth precede redistribution and modifier bonuses follow', () => {
  const source = { ...draft({ STR: -1, CHA: 1 }), attributeMethod: 'rolled', attributeOverride: 'STR',
    backgroundMethod: 'roll', backgroundRollTables: ['growth', 'growth', 'growth'],
    backgroundRollResults: [{ table: 'growth', roll: 1, choiceId: 'CHA' },
      { table: 'growth', roll: 4, choiceId: 'INT' }, { table: 'growth', roll: 6, choiceId: 'perform' }],
    focusInstances: [origin, { instanceId: 'developed', focusId: 'developed_attribute1' }],
    focusBonusChoices: { elf: { 0: ['heal'] }, developed: { 0: ['CHA'] } } };
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join(' '));
  assert.equal(result.attributes.STR, 13);
  assert.equal(result.attributes.CHA, 9);
  assert.equal(result.modifiers.CHA, 1);
  const stale = evaluateCharacter({ ...source, backgroundMethod: 'pick' });
  assert.equal(stale.valid, false);
  assert.equal(stale.attributes.CHA, 7);
});

test('invalid redistribution is atomic and rejected, including malformed restored values', () => {
  for (const value of [null, [], 'skip', 0, { CHA: 2 }, { STR: -6, CHA: 6 }, { STR: -1, CHA: 1 },
    { STR: -3, CHA: 3 }, { STR: -2.5, CHA: 2.5 }, { STR: '-2', CHA: 2 },
    { STR: -2, CHA: 2, bogus: 0 }, { STR: NaN, CHA: 2 }, JSON.parse('{"__proto__":0}')]) {
    const source = draft(value);
    const restored = { ...source, focusRuleChoices: normalizeFocusRuleChoices(source.focusRuleChoices, [origin]) };
    const result = evaluateCharacter(restored);
    assert.equal(result.valid, false, JSON.stringify(value));
    assert.deepEqual(result.attributes, baseDraft().attributes);
    assert.ok(result.issues.some((issue) => issue.includes('score redistribution')));
  }
  assert.equal(evaluateScoreRedistribution({ STR: -1, CON: 1 }, { STR: 9, CON: 8 }, 9).valid, false);
  assert.equal(evaluateScoreRedistribution({ STR: -6, CON: 6 }, { STR: 15, CON: 3 }, 9).valid, true);
});

test('restoration keeps transfers stable and removal restores all scores; other origins and level 2 remain blocked', () => {
  const saved = JSON.parse(JSON.stringify(draft({ STR: -2, CHA: 2 })));
  for (let i=0; i<3; i++) {
    const result = evaluateCharacter(saved);
    assert.equal(result.attributes.STR, 12);
    assert.equal(result.attributes.CHA, 9);
    assert.equal(saved.attributes.CHA, 7);
  }
  const removed = evaluateCharacter({ ...saved, focusInstances: [] });
  assert.deepEqual(removed.attributes, baseDraft().attributes);
  assert.deepEqual(removed.focusRuleNotes, []);
  for (const other of ['chattel1', 'focus_0421', 'deepfolk1', 'penal1']) {
    const result = evaluateCharacter({ ...saved, focusInstances: [origin, { instanceId: 'other', focusId: other }] });
    assert.equal(result.valid, false);
    assert.deepEqual(result.attributes, baseDraft().attributes);
  }
  assert.equal(evaluateCharacter({ ...saved, focusInstances: [origin, { instanceId: 'up', focusId: 'elves2', parentInstanceId: 'elf' }] }).valid, false);
});

test('Elves preserves one free skill and Notice with existing duplicate skill limits', () => {
  const source = { ...draft(), backgroundPicks: ['craft', 'exert'], focusBonusChoices: { elf: { 0: ['notice'] } } };
  const core = evaluatePreviewCore(source, data);
  assert.equal(core.skillAllocation.states.notice.allotments, 2);
  assert.equal(core.skillAllocation.states.notice.level, 1);
  const overflow = evaluateCharacter({ ...draft(), focusBonusChoices: { elf: { 0: ['notice'] } } });
  assert.equal(overflow.valid, false);
  assert.ok(overflow.issues.some((issue) => issue.includes('already has two allotments')));
});
