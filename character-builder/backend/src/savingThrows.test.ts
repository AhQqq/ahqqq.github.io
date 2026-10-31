import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { evaluateFocusCreation } from '../../shared/focusCreation.js';
import type { FocusData } from '../../shared/focusBonuses.js';
import { calculateSavingThrows, SAVE_IDS } from '../../shared/savingThrows.js';

const data = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
const foci = data<FocusData[]>('foci');
const classes = data<Array<{ id: string; archetype: string }>>('classes').filter((item) => ['warrior', 'expert'].includes(item.id));
const skills = data<Array<{ id: string; tags: string[] }>>('skills');
const attributes = data<Array<{ id: string; tags: string[] }>>('attributes');
const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
const zero = { physical: 0, evasion: 0, mental: 0, luck: 0 };
const instance = (focusId: string) => ({ instanceId: focusId, focusId });
const draft = (focusId?: string) => ({
  attributeMethod: 'rolled', attributes: scores, name: 'Save tester', goal: 'Explore',
  classChoices: ['warrior', 'expert'], background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick',
  backgroundPicks: ['notice', 'trade'], freeSkill: 'administer',
  startingEquipment: { method: 'package', packageId: 'armored_warrior' },
  focusInstances: focusId ? [instance(focusId)] : [],
  focusBonusChoices: { oni1: { 0: ['punch'] }, usagi_beastfolk1: { 0: ['sneak'], 2: ['CON'] }, penal1: { 0: ['STR'] } },
});
const creation = (catalogue: FocusData[], ids = catalogue.map((focus) => focus.id), baseLimit = 3) => evaluateFocusCreation({
  instances: ids.map(instance), foci: catalogue, classes, baseLimit, skills, attributes, scores,
});
const simple: FocusData = { id: 'save_test', name: 'Save test', bonus: [], requirements: [], level: 1 };

test('level-1 save bases use the better final modifier of each pair, with no focus adjustments', () => {
  const result = calculateSavingThrows({ STR: -2, CON: 1, DEX: 3, INT: 2, WIS: -2, CHA: -1 }, { sources: [], conditional: [] });
  assert.deepEqual(result.targets, { physical: 14, evasion: 12, mental: 16, luck: 15 });
  assert.deepEqual(result.bonuses, zero);
  assert.deepEqual(result.attributeTargets, result.targets);
  assert.deepEqual(evaluateCharacter(draft()).savingThrows.targets, { physical: 15, evasion: 15, mental: 15, luck: 15 });
});

test('four origin penalties raise Mental targets by two, independently of their attribute changes', () => {
  for (const [focusId, expectedBase] of [['oni1', 15], ['focus_0511', 15], ['halfmen1', 15], ['focus_0531', 14]] as const) {
    const result = evaluateCharacter(draft(focusId));
    assert.equal(result.valid, true, result.issues.join('\n'));
    assert.equal(result.savingThrows.attributeTargets.mental, expectedBase);
    assert.equal(result.derived.mentalSave, expectedBase + 2);
    assert.deepEqual(result.derived.saveBonuses, { ...zero, mental: -2 });
    assert.deepEqual(result.savingThrows.sources, [{ ...instance(focusId), name: foci.find((focus) => focus.id === focusId)!.name,
      saves: { mental: -2 } }]);
    for (const id of ['physical', 'evasion', 'luck'] as const) assert.equal(result.savingThrows.targets[id], result.savingThrows.attributeTargets[id]);
  }
  const oni = evaluateCharacter({ ...draft('oni1'), attributes: { ...scores, WIS: 3, CHA: 3 } });
  assert.equal(oni.modifiers.WIS, -2);
  assert.equal(oni.savingThrows.attributeTargets.mental, 17);
  assert.equal(oni.derived.mentalSave, 19);
  const charismatic = evaluateCharacter({ ...draft('oni1'), attributes: { ...scores, WIS: 18, CHA: 18 } });
  assert.equal(charismatic.modifiers.WIS, 1);
  assert.equal(charismatic.modifiers.CHA, 2);
  assert.equal(charismatic.derived.mentalSave, 15);
});

test('existing all-save bonuses retain the positive-roll/lower-target direction', () => {
  for (const [focusId, bonus] of [['usagi_beastfolk1', 1], ['penal1', 2]] as const) {
    const result = evaluateCharacter(draft(focusId));
    assert.equal(result.valid, true, result.issues.join('\n'));
    for (const id of SAVE_IDS) {
      assert.equal(result.derived.saveBonuses[id], bonus);
      assert.equal(result.savingThrows.targets[id], result.savingThrows.attributeTargets[id] - bonus);
    }
    assert.equal(result.savingThrows.sources[0]!.focusId, focusId);
  }
});

test('threat-specific penalties and magic bonuses never change ordinary save targets', () => {
  for (const focusId of ['laborer1', 'dwarves_21', 'nullifier1']) {
    const result = evaluateCharacter(draft(focusId));
    assert.equal(result.valid, true, result.issues.join('\n'));
    assert.deepEqual(result.derived.saveBonuses, zero);
    assert.deepEqual(result.savingThrows.targets, result.savingThrows.attributeTargets);
    assert.deepEqual(result.savingThrows.sources, []);
    assert.equal(result.savingThrows.conditional[0]!.focusId, focusId);
    assert.ok(result.savingThrows.conditional[0]!.condition.length > 0);
  }
  const laborer = evaluateCharacter(draft('laborer1'));
  assert.equal(laborer.derived.mentalSave, 16);
  assert.deepEqual(laborer.savingThrows.conditional[0]!.saves, { mental: -2 });
  const nullifier = evaluateCharacter(draft('nullifier1'));
  assert.equal(nullifier.savingThrows.conditional[0]!.scope, '자신과 20피트 이내 아군');
  assert.ok(nullifier.focusRuleNotes.some((note) => note.text.includes('첫 실패')));
  const together = evaluateCharacter({ ...draft(), focusInstances: [instance('dwarves_21'), instance('nullifier1')] });
  assert.equal(together.valid, true, together.issues.join('\n'));
  assert.equal(together.savingThrows.conditional.length, 2);
  assert.deepEqual(together.savingThrows.targets, together.savingThrows.attributeTargets);
});

test('the same shared preview drives API targets, including attribute effects and save sources', () => {
  for (const focusId of ['oni1', 'halfmen1', 'focus_0511', 'focus_0531', 'usagi_beastfolk1', 'penal1', 'laborer1', 'dwarves_21', 'nullifier1']) {
    const source = draft(focusId);
    const focused = evaluateFocusCreation({ instances: source.focusInstances, bonusChoices: source.focusBonusChoices,
      foci, classes, baseLimit: 3, skills, attributes, scores });
    const modifiers = Object.fromEntries(Object.entries(focused.baseModifiers).map(([id, value]) =>
      [id, value + (focused.bonuses.modifierBonuses[id] ?? 0)]));
    const result = evaluateCharacter(source);
    assert.deepEqual(result.savingThrows, calculateSavingThrows(modifiers, focused.saveEffects));
    assert.deepEqual(result.derived.saveBonuses, focused.derived.saves);
    assert.equal(result.derived.physicalSave, result.savingThrows.targets.physical);
    assert.equal(result.derived.evasionSave, result.savingThrows.targets.evasion);
    assert.equal(result.derived.mentalSave, result.savingThrows.targets.mental);
    assert.equal(result.derived.luckSave, result.savingThrows.targets.luck);
  }
});

test('removal, class restrictions, origin conflicts, typed budgets and level restrictions remove grants', () => {
  const source = draft('oni1');
  const removed = evaluateCharacter({ ...source, focusInstances: [] });
  assert.equal(removed.derived.mentalSave, 15);
  assert.deepEqual(removed.savingThrows.sources, []);
  const changed = evaluateCharacter({ ...draft('nullifier1'), classChoices: ['high', 'warrior'] });
  assert.deepEqual(changed.savingThrows.conditional, []);
  assert.equal(changed.focusSelection.complete, false);
  const conflict = evaluateCharacter({ ...draft(), focusInstances: [instance('oni1'), instance('halfmen1')] });
  assert.deepEqual(conflict.savingThrows.sources, []);
  assert.equal(conflict.focusSelection.complete, false);
  const upgraded = { ...simple, level: 2, derived_bonus: { saves: { mental: 4 } },
    conditional_saves: [{ condition: 'Magic', saves: { mental: 4 } }] };
  assert.deepEqual(creation([upgraded]).saveEffects, { sources: [], conditional: [] });
  const funded = { ...upgraded, level: 1 };
  assert.deepEqual(creation([funded], [funded.id], 0).saveEffects, { sources: [], conditional: [] });
  const wrongAllowance = evaluateFocusCreation({ instances: [instance('halfmen1')], foci, classes,
    baseLimit: [{ id: 'warrior', val: 1 }], skills, attributes, scores });
  assert.deepEqual(wrongAllowance.saveEffects.sources, []);
});

test('saved or forged target totals are ignored and legacy focus IDs recalculate identically', () => {
  const source = draft('halfmen1');
  const result = evaluateCharacter(source);
  assert.deepEqual(evaluateCharacter(JSON.parse(JSON.stringify(source))).savingThrows, result.savingThrows);
  const { focusInstances: _instances, ...legacy } = source;
  assert.deepEqual(evaluateCharacter({ ...legacy, focus: ['halfmen1'] }).savingThrows, result.savingThrows);
  const forged = { ...source, characterLevel: 20, savingThrows: { targets: { mental: 1 } },
    saveBonuses: { mental: 99 }, derived: { mentalSave: 1 }, conditionalSavesActive: true };
  assert.deepEqual(evaluateCharacter(forged).savingThrows, result.savingThrows);
  assert.equal(evaluateCharacter({ ...forged, focusInstances: [] }).derived.mentalSave, 15);
});

test('signed direct save adjustments stack without attribute caps, retain cancelling sources and ignore order', () => {
  const positive = { ...simple, derived_bonus: { saves: { mental: 4, physical: 1 } } };
  const negative = { ...simple, id: 'penalty', derived_bonus: { saves: { mental: -4, luck: -1 } } };
  const one = creation([positive]);
  assert.equal(calculateSavingThrows(one.baseModifiers, one.saveEffects).targets.mental, 11);
  const both = creation([positive, negative]);
  const result = calculateSavingThrows(both.baseModifiers, both.saveEffects);
  assert.deepEqual(result.targets, { physical: 14, evasion: 15, mental: 15, luck: 16 });
  assert.equal(result.sources.length, 2);
  const reversed = creation([negative, positive]);
  assert.deepEqual(calculateSavingThrows(reversed.baseModifiers, reversed.saveEffects).targets, result.targets);
});

test('malformed save metadata blocks completion without adding bogus or non-finite adjustments', () => {
  for (const saves of [null, [], 'mental', { unknown: 2 }, { mental: '2' }, { mental: 1.5 }, { mental: NaN }, { mental: Infinity }]) {
    const focus = { ...simple, derived_bonus: { saves } } as unknown as FocusData;
    const result = creation([focus]);
    assert.equal(result.complete, false);
    assert.deepEqual(result.derived.saves, zero);
    assert.deepEqual(result.saveEffects.sources, []);
  }
  for (const conditional_saves of [null, {}, [null], [{ condition: '', saves: { mental: 2 } }],
    [{ condition: 'Magic', saves: { other: 2 } }], [{ condition: 'Magic', saves: { mental: 2 }, scope: 5 }]]) {
    const focus = { ...simple, conditional_saves } as unknown as FocusData;
    const result = creation([focus]);
    assert.equal(result.complete, false);
    assert.deepEqual(result.saveEffects.conditional, []);
    assert.deepEqual(result.derived.saves, zero);
  }
});
