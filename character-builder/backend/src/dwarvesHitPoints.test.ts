import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { firstLevelHitPoints } from '../../shared/abilityEffects.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { evaluateCreationEffects } from '../../shared/characterCreation.js';
import { evaluateCharacterWithData } from '../../shared/characterEvaluation.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
import { readFocusInstances, normalizeFocusRuleChoices } from '../../shared/focusCreation.js';
import type { FocusData } from '../../shared/focusBonuses.js';
const data = readCharacterData();
const dwarf = { instanceId: 'dwarf', focusId: 'dwarves_21' };
const draft = () => ({ ...baseDraft(), focusInstances: [dwarf] });

test('Dwarves adds one HP after class dice and HD overrides, including final CON', () => {
  for (const [classes, dice, maximum] of [
    [['warrior', 'warrior'], '1d6+2', 8], [['expert', 'expert'], '1d6', 6],
    [['high', 'high'], '1d6-1', 5], [['warrior', 'duelist'], '1d6', 6],
    [['duelist', 'warrior'], '1d6', 6],
  ] as const) for (const [score, modifier] of [[3, -2], [7, -1], [11, 0], [14, 1], [18, 2]]) {
    const result = evaluateCharacter({ ...draft(), classChoices: [...classes], attributeMethod: 'rolled',
      attributes: { ...draft().attributes, CON: score } });
    assert.equal(result.derived.hitDice, dice);
    assert.equal(result.derived.hitPoints, maximum + modifier! + 1);
    assert.deepEqual(result.derived.hitPointBreakdown, { hitDiceMaximum: maximum, constitutionModifier: modifier,
      focusBonus: 1, sources: [{ ...dwarf, name: '드워프', value: 1 }], minimumAdjustment: 0 });
  }
  const boosted = evaluateCharacter({ ...draft(), attributeMethod: 'rolled', attributes: { ...draft().attributes, CON: 18 },
    focusInstances: [dwarf, { instanceId: 'developed', focusId: 'developed_attribute1' }],
    focusBonusChoices: { developed: { 0: ['CON'] } } });
  assert.equal(boosted.modifiers.CON, 3);
  assert.equal(boosted.derived.hitPoints, 12);
});

test('HP floors apply after the Dwarves bonus, not before', () => {
  assert.equal(firstLevelHitPoints('1d1', -2, 1), 1);
  assert.equal(firstLevelHitPoints('1d1', -1, 1), 1);
  assert.equal(firstLevelHitPoints('1d1', 0, 1), 2);
  const fixture = { ...data, PROGRESSION_TABLES: data.PROGRESSION_TABLES.map((row) => ({ ...row, hd: '1d1' })) };
  const result = evaluateCharacterWithData({ ...draft(), attributeMethod: 'rolled', attributes: { ...draft().attributes, CON: 3 } }, fixture);
  assert.equal(result.derived.hitPoints, 1);
  assert.equal(result.derived.hitPointBreakdown.minimumAdjustment, 1);
});

test('preview and API agree; HP, Craft and conditional magic saves restore and disappear correctly', () => {
  const source = draft();
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join(' '));
  const core = evaluatePreviewCore(source, data);
  const preview = evaluateCreationEffects(source, data, core, evaluateClassChoices(source.classChoices, data.CLASSES));
  assert.equal(preview.hitPoints, result.derived.hitPoints);
  assert.deepEqual(preview.hitPointBreakdown, result.derived.hitPointBreakdown);
  assert.equal(core.skillAllocation.states.craft?.allotments, 2);
  assert.deepEqual(result.savingThrows.conditional[0]?.saves, { physical: 2, evasion: 2, mental: 2, luck: 2 });
  const saved = JSON.parse(JSON.stringify({ ...source, characterLevel: 20, derived: { hitPoints: 999 }, hitPointsBonus: 999 }));
  const instances = readFocusInstances(saved.focusInstances, saved.focus, data.FOCI).instances;
  const restored = evaluateCharacter({ ...saved, focusInstances: instances,
    focusRuleChoices: normalizeFocusRuleChoices(saved.focusRuleChoices, instances) });
  assert.deepEqual(restored.derived.hitPointBreakdown, result.derived.hitPointBreakdown);
  assert.equal(restored.derived.hitPoints, 9);
  const legacy = evaluateCharacter({ ...source, focusInstances: undefined, focus: ['dwarves_21'] });
  assert.equal(legacy.derived.hitPoints, 9);
  const removed = evaluateCharacter({ ...saved, focusInstances: [] });
  assert.equal(removed.derived.hitPoints, 8);
  assert.deepEqual(removed.derived.hitPointBreakdown.sources, []);
  assert.deepEqual(removed.savingThrows.targets, result.savingThrows.targets);
  assert.deepEqual(removed.savingThrows.conditional, []);
});

test('the other dwarf origin, duplicates, unfunded, invalid classes and level 2 do not grant this bonus', () => {
  for (const changed of [
    { focusInstances: [{ instanceId: 'other', focusId: 'dwarves1' }] },
    { focusInstances: [dwarf, { ...dwarf, instanceId: 'duplicate' }] },
    { focusInstances: [dwarf, { instanceId: 'gnome', focusId: 'gnomes1' }] },
    { focusInstances: [{ instanceId: 'upgrade', focusId: 'dwarves_22' }] },
    { classChoices: ['healer', 'healer'] },
    { classChoices: ['high', 'high'], focusInstances: [{ instanceId: 'alert', focusId: 'alert1' }, dwarf] },
  ]) {
    const result = evaluateCharacter({ ...draft(), ...changed });
    assert.equal(result.derived.hitPointBreakdown.focusBonus, 0);
    assert.deepEqual(result.derived.hitPointBreakdown.sources, []);
  }
  const parentWithInvalidUpgrade = evaluateCharacter({ ...draft(), focusInstances: [dwarf,
    { instanceId: 'upgrade', focusId: 'dwarves_22', parentInstanceId: 'dwarf' }] });
  assert.equal(parentWithInvalidUpgrade.focusSelection.complete, false);
  assert.equal(parentWithInvalidUpgrade.derived.hitPointBreakdown.focusBonus, 1);
});

test('malformed HP metadata is rejected without a grant', () => {
  for (const bonus of [0, -1, 0.5, '1', null, Infinity]) {
    const fixture = { ...data, FOCI: data.FOCI.map((focus) => focus.id === dwarf.focusId
      ? { ...focus, derived_bonus: { hit_points_per_level: bonus } } as FocusData : focus) };
    const result = evaluateCharacterWithData(draft(), fixture);
    assert.equal(result.valid, false);
    assert.equal(result.focusSelection.complete, false);
    assert.equal(result.derived.hitPointBreakdown.focusBonus, 0);
  }
});
