import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { evaluateCharacterWithData } from '../../shared/characterEvaluation.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { evaluateCreationEffects } from '../../shared/characterCreation.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
const data = readCharacterData();
const edge = { instanceId: 'edge', focusId: 'all_directions_edge_style1' };
const hard = { instanceId: 'hard', focusId: 'die_hard1' };
const draft = () => ({ ...baseDraft(), focusInstances: [edge, hard], focusBonusChoices: { edge: { 0: ['stab'] } } });

test('Edge modifies resolved HD while Die Hard adds HP, retaining distinct sources', () => {
  for (const [other, expected] of [['expert', '1d6'], ['warrior', '1d6'], ['duelist', '1d6-2'], ['vowed', '1d6']]) {
    const source = { ...draft(), classChoices: ['warrior', other] };
    const result = evaluateCharacter(source);
    assert.equal(result.derived.hitDice, expected);
    assert.equal(result.derived.hitPoints, other === 'duelist' ? 6 : 8);
    assert.ok(result.derived.hitDiceAdjustments.some((item) => item.abilityId === edge.focusId && item.name === '팔방의 날 유파'));
    assert.deepEqual(result.derived.hitPointBreakdown.sources, [{ ...hard, name: '끝까지 간다', value: 2 }]);
    const core = evaluatePreviewCore(source, data);
    const preview = evaluateCreationEffects(source, data, core, evaluateClassChoices(source.classChoices, data.CLASSES));
    assert.equal(preview.hitDice, expected);
    assert.equal(preview.hitPoints, result.derived.hitPoints);
  }
});

test('HP uses final CON, combines dwarf and Die Hard bonuses, and floors only after all effects', () => {
  const source = { ...draft(), attributeMethod: 'rolled', attributes: { STR: 14, DEX: 12, CON: 3, INT: 10, WIS: 9, CHA: 7 },
    focusInstances: [edge, hard, { instanceId: 'dwarf', focusId: 'dwarves_21' }] };
  // Synthetic extra free allowance isolates arithmetic; normal creation cannot buy all three here.
  const combinedData = { ...data, PROGRESSION_TABLES: data.PROGRESSION_TABLES.map((row) => ({ ...row, focus: [{ id: 'free' as const, val: 3 }] })) };
  const normal = evaluateCharacterWithData(source, combinedData);
  assert.equal(normal.valid, true, normal.issues.join(' '));
  assert.equal(normal.derived.hitPoints, 7);
  assert.equal(normal.derived.hitPointBreakdown.focusBonus, 3);
  const small = { ...combinedData, PROGRESSION_TABLES: combinedData.PROGRESSION_TABLES.map((row) => ({ ...row, hd: '1d1' })) };
  const result = evaluateCharacterWithData(source, small);
  assert.equal(result.derived.hitDice, '1d1-2');
  assert.equal(result.derived.hitPoints, 1);
  assert.equal(result.derived.hitPointBreakdown.minimumAdjustment, 1);
  const con = evaluateCharacterWithData({ ...source, attributes: { ...source.attributes, CON: 18 } }, combinedData);
  assert.equal(con.derived.hitPoints, 11);
});

test('restoration does not accumulate penalties and removing either focus restores its own contribution', () => {
  const source = JSON.parse(JSON.stringify(draft()));
  for (let i=0;i<3;i++) {
    const result = evaluateCharacter(source);
    assert.equal(result.derived.hitDice, '1d6');
    assert.equal(result.derived.hitPoints, 8);
  }
  const edgeOnly = evaluateCharacter({ ...source, focusInstances: [edge] });
  assert.equal(edgeOnly.derived.hitPoints, 6);
  const hardOnly = evaluateCharacter({ ...source, focusInstances: [hard] });
  assert.equal(hardOnly.derived.hitDice, '1d6+2');
  assert.equal(hardOnly.derived.hitPoints, 10);
  const neither = evaluateCharacter({ ...source, focusInstances: [] });
  assert.equal(neither.derived.hitPoints, 8);
  const ineligible = evaluateCharacter({ ...source, classChoices: ['expert', 'expert'] });
  assert.equal(ineligible.derived.hitDice, '1d6');
  assert.equal(ineligible.derived.hitPoints, 8);
});
