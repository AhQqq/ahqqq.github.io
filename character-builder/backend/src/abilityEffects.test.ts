import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateHitDiceEffects, firstLevelHitPoints, parseHitDice } from '../../shared/abilityEffects.js';
import { evaluateClassAbilities } from '../../shared/classAbilities.js';
import type { AbilityClass, ClassAbilityRules } from '../../shared/classAbilities.js';
import type { AbilityDefinition, AbilityEffect, GrantedAbility } from '../../shared/abilities.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { evaluateCharacter } from './character.js';

const dir = join(process.cwd(), '..', 'frontend', 'data');
const classes = JSON.parse(readFileSync(join(dir, 'classes.json'), 'utf8')) as AbilityClass[];
const abilities = JSON.parse(readFileSync(join(dir, 'abilities.json'), 'utf8')) as AbilityDefinition[];
const grants = JSON.parse(readFileSync(join(dir, 'fullclass_abilities.json'), 'utf8')) as ClassAbilityRules;
const progression = JSON.parse(readFileSync(join(dir, 'progression_tables.json'), 'utf8')) as Array<{ id: string; hd: string; ab: string }>;
const pair = ['warrior', 'duelist'];
const flaw = evaluateClassAbilities(pair, classes, abilities, grants).abilities.find((item) => item.id === 'flaw_of_fragility')!;
const base = () => ({
  ...createArrayAllocation(), name: 'Fragility tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: pair, focus: ['alert1'], freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});
const effect = (value: string): AbilityEffect => ({ type: 'override_hit_dice', when: { class_pair: ['warrior', 'duelist'] }, value });
const synthetic = (id: string, value: string): GrantedAbility => ({ ...flaw, id, effects: [effect(value)] });

test('Flaw of Fragility is encoded as an exact-pair HD override without a stale review warning', () => {
  assert.deepEqual(flaw.effects, [effect('1d6')]);
  assert.equal(flaw.manual_review?.length ?? 0, 0);
  assert.equal(progression.find((table) => table.id === 'm+w')!.hd, '1d6+2');
});

test('Warrior/Duelist uses 1d6 in either slot order with preserved base and provenance', () => {
  for (const classChoices of [pair, [...pair].reverse()]) {
    const result = evaluateCharacter({ ...base(), classChoices });
    assert.equal(result.derived.baseHitDice, '1d6+2');
    assert.equal(result.derived.hitDice, '1d6');
    assert.equal(result.derived.hitDie, 6);
    assert.equal(result.derived.hitPoints, 6);
    assert.equal(result.derived.baseAttackBonus, 1);
    assert.equal(result.derived.focusLimit, 2);
    assert.equal(result.hitDiceEvaluation.complete, true);
    assert.deepEqual(result.derived.hitDiceAdjustments, [{ abilityId: flaw.id, name: flaw.name,
      englishName: flaw.englishName, from: '1d6+2', to: '1d6' }]);
    assert.equal(result.stepStatus.find((step) => step.key === 'combat')!.complete, true);
    assert.equal(result.stepStatus.find((step) => step.key === 'class')!.complete, true);
  }
});

test('every other legal ordered class pair retains its normal progression hit dice', () => {
  for (const first of classes) for (const second of classes) {
    const classChoices = [first.id, second.id];
    if (!evaluateClassChoices(classChoices, classes).complete) continue;
    if (classChoices.includes('warrior') && classChoices.includes('duelist')) continue;
    if (classChoices.includes('vowed')) continue; // Covered by vowedDefenses.test.ts.
    const key = [first.archetype[0], second.archetype[0]].sort().join('+');
    const table = progression.find((row) => row.id === key || row.id === key.split('+').reverse().join('+'))!;
    const result = evaluateCharacter({ ...base(), classChoices });
    assert.equal(result.derived.baseHitDice, table.hd, classChoices.join('/'));
    assert.equal(result.derived.hitDice, table.hd, classChoices.join('/'));
    assert.deepEqual(result.derived.hitDiceAdjustments, [], classChoices.join('/'));
    assert.equal(result.derived.hitPoints, firstLevelHitPoints(table.hd, result.modifiers.CON));
  }
});

test('HP adds the final CON modifier after the override, including focus modifiers and caps', () => {
  for (const [score, modifier] of [[3, -2], [7, -1], [11, 0], [17, 1], [18, 2]] as const) {
    const result = evaluateCharacter({ ...base(), attributeMethod: 'rolled', attributes: { ...base().attributes, CON: score } });
    assert.equal(result.derived.hitPoints, 6 + modifier);
  }
  const boosted = evaluateCharacter({ ...base(), attributeMethod: 'rolled', attributes: { ...base().attributes, CON: 17 },
    focus: ['orcs1'], focusBonusChoices: { orcs1: { '1': ['punch'] } } });
  assert.equal(boosted.modifiers.CON, 2);
  assert.equal(boosted.derived.hitPoints, 8);
  assert.equal(firstLevelHitPoints('1d6', -9), 1);
});

test('class changes and draft reloads recompute from progression and ignore cached overrides', () => {
  const draft = JSON.parse(JSON.stringify({ ...base(), derived: { hitDice: '99d99', hitPoints: 999 },
    hitDiceEvaluation: { hitDice: '1d4' } }));
  assert.equal(evaluateCharacter(draft).derived.hitPoints, 6);
  draft.classChoices = ['warrior', 'high'];
  assert.equal(evaluateCharacter(draft).derived.hitDice, '1d6+2');
  assert.equal(evaluateCharacter(draft).derived.hitPoints, 8);
  draft.classChoices = ['expert', 'duelist'];
  assert.equal(evaluateCharacter(draft).derived.hitDice, '1d6');
  assert.deepEqual(evaluateCharacter(draft).derived.hitDiceAdjustments, []);
  draft.classChoices = ['duelist', 'warrior'];
  assert.equal(evaluateCharacter(draft).derived.hitPoints, 6);
  assert.equal(evaluateCharacter(JSON.parse(JSON.stringify(draft))).derived.hitPoints, 6);
  assert.equal(draft.derived.hitPoints, 999);
});

test('only granted effects apply and invalid class pairs cannot activate an override', () => {
  assert.equal(evaluateHitDiceEffects('1d6+2', pair, classes, []).hitDice, '1d6+2');
  assert.equal(evaluateHitDiceEffects('1d6+2', ['warrior', 'high'], classes, [flaw]).hitDice, '1d6+2');
  for (const invalid of [undefined, [], ['warrior'], ['warrior', 'duelist', 'expert'], ['duelist', 'duelist'], ['mageslayer', 'duelist']]) {
    const result = evaluateHitDiceEffects('1d6+2', invalid, classes, [flaw]);
    assert.equal(result.complete, false);
    assert.equal(result.hitDice, '1d6+2');
    assert.deepEqual(result.adjustments, []);
  }
  const result = evaluateCharacter({ ...base(), classChoices: ['mageslayer', 'duelist'] });
  assert.equal(result.stepStatus.find((step) => step.key === 'combat')!.complete, false);
});

test('equivalent overrides coalesce and retain each distinct ability source', () => {
  const sources = [synthetic('a', '1d6'), synthetic('b', '1d6+0'), synthetic('a', '1d6')];
  const forward = evaluateHitDiceEffects('1d6+2', pair, classes, sources);
  const reverse = evaluateHitDiceEffects('1d6+2', pair, classes, [...sources].reverse());
  assert.deepEqual(forward, reverse);
  assert.equal(forward.complete, true);
  assert.equal(forward.hitDice, '1d6');
  assert.deepEqual(forward.adjustments.map((item) => item.abilityId), ['a', 'b']);
});

test('conflicting overrides report an order-independent error and apply neither result', () => {
  const sources = [synthetic('a', '1d6'), synthetic('b', '1d4')];
  const forward = evaluateHitDiceEffects('1d6+2', pair, classes, sources);
  assert.deepEqual(forward, evaluateHitDiceEffects('1d6+2', pair, classes, [...sources].reverse()));
  assert.equal(forward.complete, false);
  assert.equal(forward.hitDice, '1d6+2');
  assert.deepEqual(forward.adjustments, []);
  assert.match(forward.issues.join(' '), /Conflicting hit-dice overrides/);
});

test('malformed effects never partially apply alongside a valid override', () => {
  for (const effects of [null, {}, [null], [{ type: 'unknown' }], [{ ...effect('1d6'), when: {} }],
    [{ ...effect('1d6'), when: { class_pair: ['warrior', 'duelist'], unsupported: true } }],
    [{ ...effect('1d6'), when: { class_pair: ['warrior', 'missing'] } }],
    [{ ...effect('1d6'), when: { class_pair: ['duelist', 'duelist'] } }], [effect('0d6')], [effect('1d0')], [effect('1d6+2d4')]]) {
    const bad = { ...flaw, id: 'bad', effects } as unknown as GrantedAbility;
    const result = evaluateHitDiceEffects('1d6+2', pair, classes, [flaw, bad]);
    assert.equal(result.complete, false, JSON.stringify(effects));
    assert.equal(result.hitDice, '1d6+2');
    assert.deepEqual(result.adjustments, []);
  }
});

test('dice parsing accepts bounded expressions and rejects malformed or unsafe values', () => {
  assert.deepEqual(parseHitDice('2d6-1'), { count: 2, sides: 6, flat: -1, maximum: 11, expression: '2d6-1' });
  assert.equal(firstLevelHitPoints('2d6-1', 2), 13);
  for (const value of ['', 'd6', '1d6 + 2', '0d6', '1d0', '1.5d6', '1d6+NaN', '9007199254740992d6', null, 6]) {
    assert.equal(parseHitDice(value), null, String(value));
  }
  const invalidBase = evaluateHitDiceEffects('', pair, classes, [flaw]);
  assert.equal(invalidBase.complete, false);
  assert.deepEqual(invalidBase.adjustments, []);
});

test('effect evaluation preserves original class choices, grants and progression values', () => {
  const before = JSON.stringify([pair, classes, flaw, progression]);
  evaluateHitDiceEffects('1d6+2', pair, classes, [flaw]);
  assert.equal(JSON.stringify([pair, classes, flaw, progression]), before);
});
