import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';

test('combat values use final attributes and zero starting strain', () => {
  const result = evaluateCharacter(baseDraft());
  assert.equal(result.derived.movementSpeed, 30);
  assert.equal(result.derived.initiative, result.modifiers.DEX);
  assert.deepEqual(result.derived.systemStrain, { current: 0, maximum: result.attributes.CON });
  assert.ok(result.focusRuleNotes.some(note => note.text.includes('우선권')));
});

test('strain maximum includes validated focus bonuses', () => {
  const focus = readCharacterData().FOCI.find(focus => focus.derived_bonus?.system_strain_max === 2)!;
  const draft = baseDraft();
  draft.focusInstances = [{ instanceId: 'strain', focusId: focus.id }];
  const result = evaluateCharacter(draft);
  assert.equal(result.derived.systemStrainMaxBonus, 2);
  assert.equal(result.derived.systemStrain.maximum, result.attributes.CON + 2);
  assert.equal(result.derived.initiative, result.modifiers.DEX);
  assert.equal(result.derived.systemStrain.current, 0);
});
