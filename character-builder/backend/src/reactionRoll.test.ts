import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { evaluateCreationEffects } from '../../shared/characterCreation.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
const data = readCharacterData();
const well = { instanceId: 'well', focusId: 'well_met1' };
const capy = { instanceId: 'capy', focusId: 'focus_0251' };
const draft = () => ({ ...baseDraft(), focusInstances: [well, capy], focusBonusChoices: { capy: { 0: ['connect'] } } });
test('reaction bonuses add independently, restore without accumulation and disappear on removal', () => {
  for (const instances of [[], [well], [capy], [well, capy]]) {
    const source = JSON.parse(JSON.stringify({ ...draft(), focusInstances: instances, derived: { reactionRollModifier: 99 } }));
    for (let i=0;i<2;i++) {
      const result = evaluateCharacter(source);
      assert.equal(result.derived.reactionRollModifier, instances.length);
      const core = evaluatePreviewCore(source, data);
      const effects = evaluateCreationEffects(source, data, core, evaluateClassChoices(source.classChoices, data.CLASSES));
      assert.equal(effects.reactionRollModifier, instances.length);
    }
  }
  const both = evaluateCharacter(draft());
  assert.equal(both.valid, true, both.issues.join(' '));
  assert.equal(both.modifiers.CHA, 0);
  assert.equal(both.skillStates.connect.allotments, 1);
});
test('invalid class, duplicate and unfunded focus selections do not grant reaction bonuses', () => {
  for (const source of [
    { ...draft(), classChoices: ['vowed', 'vowed'] },
    { ...draft(), classChoices: ['high', 'high'] },
    { ...draft(), focusInstances: [well, { ...well, instanceId: 'copy' }] },
  ]) assert.equal(evaluateCharacter(source).derived.reactionRollModifier, 0);
});
