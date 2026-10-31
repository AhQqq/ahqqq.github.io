import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { evaluateCreationEffects } from '../../shared/characterCreation.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
import { evaluateFocusCreation, readFocusInstances } from '../../shared/focusCreation.js';
import { restoreAttributeAllocation } from '../../frontend/src/attributeAllocation.js';
import type { FocusData } from '../../shared/focusBonuses.js';
const data = readCharacterData();
const origin = { instanceId: 'self', focusId: 'focus_0421' };
const draft = (con = 11) => ({ ...baseDraft(), attributeMethod: 'rolled' as const,
  attributes: { STR: 10, DEX: 10, CON: con, INT: 10, WIS: 10, CHA: 10 }, focusInstances: [origin] });

test('Self-Carved replaces every valid CON at the 14 threshold and derives HP and saves', () => {
  for (let con = 3; con <= 18; con++) {
    const source = draft(con);
    const original = structuredClone(source);
    const result = evaluateCharacter(source);
    const expectedScore = con < 14 ? 14 : 18;
    const modifier = con < 14 ? 1 : 2;
    assert.equal(result.valid, true, result.issues.join(' '));
    assert.equal(result.attributes.CON, expectedScore);
    assert.equal(result.modifiers.CON, modifier);
    assert.equal(result.derived.hitPoints, 8 + modifier);
    assert.equal(result.savingThrows.targets.physical, 15 - modifier);
    assert.equal(result.derived.systemStrainMaxBonus, 2);
    const core = evaluatePreviewCore(source, data);
    const preview = evaluateCreationEffects(source, data, core, evaluateClassChoices(source.classChoices, data.CLASSES));
    assert.equal(preview.hitPoints, result.derived.hitPoints);
    assert.deepEqual(preview.savingThrows, result.savingThrows);
    assert.equal(core.skillAllocation.states.exert?.allotments, 1);
    assert.deepEqual(core.focusCreation.scoreChanges, con === 18 ? [] : [{ instanceId: 'self', id: 'CON', before: con, after: expectedScore }]);
    assert.deepEqual(source, original);
  }
});

test('background growth is included in the threshold, while modifier bonuses apply afterward', () => {
  for (const [con, expected] of [[12, 14], [13, 18]]) {
    const result = evaluateCharacter({ ...draft(con), backgroundMethod: 'roll',
      backgroundRollTables: ['growth', 'growth', 'growth'],
      backgroundRollResults: [{ table: 'growth', roll: 1, choiceId: 'CON' },
        { table: 'growth', roll: 4, choiceId: 'INT' }, { table: 'growth', roll: 6, choiceId: 'notice' }] });
    assert.equal(result.valid, true, result.issues.join(' '));
    assert.equal(result.backgroundAttributeBonuses.CON, 1);
    assert.equal(result.attributes.CON, expected);
  }
  const developed = { instanceId: 'developed', focusId: 'developed_attribute1' };
  for (const order of [[origin, developed], [developed, origin]]) {
    const result = evaluateCharacter({ ...draft(13), focusInstances: order, focusBonusChoices: { developed: { 0: ['CON'] } } });
    assert.equal(result.attributes.CON, 14);
    assert.equal(result.modifiers.CON, 2);
    assert.equal(result.derived.hitPoints, 10);
  }
});

test('fixed arrays, optional rolled replacement and modern/legacy restoration recompute exactly once', () => {
  const array = { ...baseDraft(), attributes: { STR: 11, DEX: 12, CON: 14, INT: 10, WIS: 9, CHA: 7 }, focusInstances: [origin] };
  assert.equal(evaluateCharacter(array).attributes.CON, 18);
  assert.equal(evaluateCharacter({ ...draft(3), attributeOverride: 'CON' }).attributes.CON, 18);
  const source = JSON.parse(JSON.stringify({ ...draft(13), derived: { systemStrainMaxBonus: 99 }, focusScores: { CON: 18 } }));
  const restored = { ...source, ...restoreAttributeAllocation(source),
    focusInstances: readFocusInstances(source.focusInstances, source.focus, data.FOCI).instances };
  for (let i = 0; i < 3; i++) {
    const result = evaluateCharacter(restored);
    assert.equal(result.attributes.CON, 14);
    assert.equal(result.derived.systemStrainMaxBonus, 2);
    assert.equal(restored.attributes.CON, 13);
  }
  const legacy = evaluateCharacter({ ...draft(13), focusInstances: undefined, focus: ['focus_0421'] });
  assert.equal(legacy.attributes.CON, 14);
  const removed = evaluateCharacter({ ...restored, focusInstances: [] });
  assert.equal(removed.attributes.CON, 13);
  assert.equal(removed.modifiers.CON, 0);
  assert.equal(removed.derived.hitPoints, 8);
  assert.equal(removed.savingThrows.targets.physical, 15);
  assert.equal(removed.derived.systemStrainMaxBonus, 0);
  assert.deepEqual(removed.focusRuleNotes, []);
});

test('other score-changing origins conflict in either order, and duplicate/unfunded origins grant nothing', () => {
  for (const other of ['deepfolk1', 'penal1']) for (const focusInstances of [
    [origin, { instanceId: 'other', focusId: other }], [{ instanceId: 'other', focusId: other }, origin],
  ]) {
    const result = evaluateCharacter({ ...draft(), focusInstances });
    assert.equal(result.focusSelection.complete, false);
    assert.equal(result.attributes.CON, 11);
    assert.equal(result.derived.systemStrainMaxBonus, 0);
  }
  for (const focusInstances of [[origin, { ...origin, instanceId: 'duplicate' }],
    [{ instanceId: 'alert', focusId: 'alert1' }, origin]]) {
    const result = evaluateCharacter({ ...draft(), classChoices: ['high', 'high'], focusInstances });
    assert.equal(result.attributes.CON, 11);
    assert.equal(result.derived.systemStrainMaxBonus, 0);
  }
});

test('malformed threshold metadata cannot change a score', () => {
  const definition = data.FOCI.find((focus) => focus.id === origin.focusId)!;
  for (const patch of [{ attribute_id: 'missing' }, { threshold: 0 }, { threshold: '14' }, { below: 19 }, { at_or_above: 17.5 }]) {
    const foci = [{ ...definition, score_effect: { ...definition.score_effect, ...patch } }] as FocusData[];
    const result = evaluateFocusCreation({ instances: [origin], foci, classes: data.CLASSES.filter((item) => item.id === 'warrior'),
      baseLimit: 1, attributes: data.ATTRIBUTES, skills: data.SKILLS, scores: draft().attributes });
    assert.equal(result.complete, false);
    assert.equal(result.scores.CON, 11);
    assert.deepEqual(result.scoreChanges, []);
  }
});
