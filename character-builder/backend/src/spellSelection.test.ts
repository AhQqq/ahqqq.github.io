import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  availableSpells, canLearnSpell, ELEMENTAL_MAGIC, evaluateSpellChoices, HIGH_MAGIC,
  isFirstLevelSpell, isSpellcaster, NECROMANCER_MAGIC, normalizeSpellChoices,
  restoreSpellChoices, spellSelectionReason, toggleSpellChoice,
} from '../../shared/spellSelection.js';
import type { SpellChoices, SpellOption } from '../../shared/spellSelection.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { evaluateCharacter } from './character.js';

function data<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(`../../frontend/data/${file}.json`, import.meta.url), 'utf8')) as T;
}
const spells = data<SpellOption[]>('spells');
const classes = data<Array<{ id: string; spells: boolean }>>('classes');
const high = availableSpells(spells, 'high');
const elemental = availableSpells(spells, 'elem').filter((spell) => spell.category === ELEMENTAL_MAGIC);
const necromancer = availableSpells(spells, 'necro').filter((spell) => spell.category === NECROMANCER_MAGIC);
const h = (index: number) => high[index]!.id;
const e = (index: number) => elemental[index]!.id;
const n = (index: number) => necromancer[index]!.id;
const base = () => ({
  ...createArrayAllocation(), name: 'Spell tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: ['warrior', 'expert'], focus: ['alert1'], freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});

test('the source catalogue has 21 first-level spells and no higher-level entries pass the filter', () => {
  assert.equal(spells.filter(isFirstLevelSpell).length, 21);
  for (const level of [1, '1', '1\ub808\ubca8', ' 1\ub808\ubca8 ']) assert.equal(isFirstLevelSpell({ level }), true);
  for (const level of [0, 2, 10, '10\ub808\ubca8', '2\ub808\ubca8', '', '1garbage', '1.5', 'level 1']) {
    assert.equal(isFirstLevelSpell({ level }), false);
  }
});

test('only the four named classes are spellcasters; Invoker metadata agrees', () => {
  for (const option of classes) {
    const expected = ['invoker', 'high', 'elem', 'necro'].includes(option.id);
    assert.equal(isSpellcaster(option.id), expected);
    assert.equal(option.spells, expected);
  }
  assert.equal(isSpellcaster('constructor'), false);
  assert.equal(isSpellcaster(undefined), false);
});

test('all four spellcasters share High Magic but only their own specialist schools', () => {
  for (const id of ['high', 'invoker', 'elem', 'necro']) {
    assert.ok(high.every((spell) => canLearnSpell(spell, id)));
    assert.ok(availableSpells(spells, id).every(isFirstLevelSpell));
  }
  assert.deepEqual(availableSpells(spells, 'invoker'), high);
  assert.ok(availableSpells(spells, 'high').every((spell) => spell.category === HIGH_MAGIC));
  assert.equal(canLearnSpell(elemental[0]!, 'necro'), false);
  assert.equal(canLearnSpell(necromancer[0]!, 'elem'), false);
  assert.deepEqual(availableSpells(spells, 'duelist'), []);
  assert.deepEqual(availableSpells(spells, 'mageslayer'), []);
});

test('a partial spellcaster needs two picks in its actual slot, regardless of slot order', () => {
  assert.equal(evaluateSpellChoices([[], [h(0), h(1)]], ['warrior', 'high'], spells).complete, true);
  assert.equal(evaluateSpellChoices([[h(0), h(1)], []], ['high', 'warrior'], spells).complete, true);
  for (const picks of [[], [h(0)], [h(0), h(1), h(2)]]) {
    assert.equal(evaluateSpellChoices([picks, []], ['invoker', 'expert'], spells).complete, false);
  }
});

test('full casters learn four different spells with two per slot, not one pooled allowance', () => {
  const valid = evaluateSpellChoices([[h(0), h(1)], [h(2), h(3)]], ['high', 'high'], spells);
  assert.equal(valid.complete, true);
  assert.equal(valid.required, 4);
  assert.equal(evaluateSpellChoices([[h(0), h(1), h(2)], [h(3)]], ['high', 'high'], spells).complete, false);
  assert.equal(evaluateSpellChoices([[h(0), h(1)], []], ['high', 'high'], spells).complete, false);
});

test('mixed specialist picks remain attached to their own class, while any slot may use High Magic', () => {
  for (const picks of [[[e(0), e(1)], [n(0), n(1)]], [[e(0), h(0)], [n(0), h(1)]], [[h(0), h(1)], [h(2), h(3)]]]) {
    assert.equal(evaluateSpellChoices(picks, ['elem', 'necro'], spells).complete, true);
  }
  assert.equal(evaluateSpellChoices([[n(0), n(1)], [e(0), e(1)]], ['elem', 'necro'], spells).complete, false);
  assert.equal(evaluateSpellChoices([[e(0), e(1)], [e(2), h(0)]], ['elem', 'invoker'], spells).complete, false);
});

test('higher-level spell IDs are rejected even if their schools are allowed', () => {
  for (const spell of spells.filter((item) => !isFirstLevelSpell(item))) {
    const classId = spell.category === ELEMENTAL_MAGIC ? 'elem' : spell.category === NECROMANCER_MAGIC ? 'necro' : 'high';
    const result = evaluateSpellChoices([[spell.id, h(0)], []], [classId, 'warrior'], spells);
    assert.equal(result.complete, false);
    assert.ok(result.issues.some((issue) => issue.includes('only first-level')));
    assert.ok(!result.selected.flat().includes(spell.id));
  }
});

test('duplicate spells are rejected within one slot and across both slots', () => {
  for (const picks of [[[h(0), h(0)], [h(1), h(2)]], [[h(0), h(1)], [h(0), h(2)]]]) {
    assert.equal(evaluateSpellChoices(picks, ['high', 'high'], spells).complete, false);
  }
});

test('noncasters require no spells and cannot submit picks', () => {
  assert.equal(evaluateSpellChoices(undefined, ['warrior', 'expert'], spells).complete, true);
  assert.equal(evaluateSpellChoices([[], []], ['warrior', 'expert'], spells).required, 0);
  assert.equal(evaluateSpellChoices([[h(0)], []], ['warrior', 'expert'], spells).complete, false);
});

test('malformed or legacy API payloads cannot bypass per-slot validation', () => {
  for (const source of [null, {}, 'spells', [], [[], [], []], [null, []], [[{}, 123], []], [['missing', h(0)], []]]) {
    assert.equal(evaluateSpellChoices(source, ['high', 'warrior'], spells).complete, false);
  }
  const valid = [[h(0), h(1)], []];
  assert.equal(evaluateSpellChoices(valid, ['high', 'warrior'], spells, [h(2)]).complete, false);
  assert.equal(evaluateSpellChoices(valid, ['high', 'warrior'], spells, []).complete, true);
});

test('selection guards prevent overflow and duplicates but always permit removal', () => {
  let picks: SpellChoices = [[], []];
  picks = toggleSpellChoice(picks, 0, h(0), ['high', 'high'], spells);
  picks = toggleSpellChoice(picks, 0, h(1), ['high', 'high'], spells);
  assert.deepEqual(toggleSpellChoice(picks, 0, h(2), ['high', 'high'], spells), picks);
  assert.match(spellSelectionReason(high[0]!, 1, picks, ['high', 'high']), /Already learned in slot A/);
  assert.deepEqual(toggleSpellChoice(picks, 1, h(0), ['high', 'high'], spells), picks);
  assert.deepEqual(toggleSpellChoice(picks, 0, h(0), ['high', 'high'], spells), [[h(1)], []]);
  assert.deepEqual(toggleSpellChoice([[], []], 0, e(0), ['high', 'warrior'], spells), [[], []]);
});

test('class changes preserve eligible picks in place without moving them to another allowance', () => {
  const picks = [[e(0), h(0)], [n(0), h(1)]];
  assert.deepEqual(normalizeSpellChoices(picks, ['high', 'necro'], spells), [[h(0)], [n(0), h(1)]]);
  assert.deepEqual(normalizeSpellChoices(picks, ['warrior', 'necro'], spells), [[], [n(0), h(1)]]);
  assert.deepEqual(normalizeSpellChoices(picks, ['warrior', 'expert'], spells), [[], []]);
});

test('modern saved drafts preserve all four eligible picks and ignore stale flat lists', () => {
  const choices = [[h(0), h(1)], [h(2), h(3)]];
  const restored = restoreSpellChoices(choices, [e(0)], ['high', 'high'], spells);
  assert.deepEqual(restored.choices, choices);
  assert.equal(restored.notice, '');
  assert.deepEqual(restoreSpellChoices([[], []], [h(0)], ['high', 'high'], spells).choices, [[], []]);
});

test('legacy migration reserves specialist picks before allocating flexible High Magic', () => {
  const restored = restoreSpellChoices(undefined, [h(0), h(1), e(0), e(1)], ['elem', 'high'], spells);
  assert.deepEqual(restored.choices, [[e(0), e(1)], [h(0), h(1)]]);
  assert.match(restored.notice, /Older spell selections/);
  assert.equal(evaluateSpellChoices(restored.choices, ['elem', 'high'], spells).complete, true);
});

test('restoration safely discards high-level, unknown, duplicate, wrong-school and excess picks', () => {
  const higher = spells.find((spell) => !isFirstLevelSpell(spell))!.id;
  const restored = restoreSpellChoices([[higher, e(0), h(0), h(0), h(1), h(2)], [h(1), h(3)]], undefined, ['high', 'high'], spells);
  assert.deepEqual(restored.choices, [[h(0), h(1)], [h(3)]]);
  assert.match(restored.notice, /removed/);
  assert.deepEqual(restoreSpellChoices(undefined, [higher, 'missing', h(0), h(0)], ['high', 'warrior'], spells).choices, [[h(0)], []]);
  for (const source of [null, {}, [null, ['missing']], 'bad']) {
    assert.deepEqual(normalizeSpellChoices(source, ['high', 'high'], spells), [[], []]);
  }
});

test('whole-character validation recognizes Invoker and makes spell learning the final checkpoint', () => {
  const result = evaluateCharacter({ ...base(), classChoices: ['invoker', 'expert'], spellChoicesByClassSlot: [[h(0), h(1)], []] });
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.equal(result.characterLevel, 1);
  assert.equal(result.stepStatus.at(-1)?.key, 'spells');
  assert.equal(result.stepStatus.at(-1)?.complete, true);
  assert.equal(result.spellSelection.required, 2);
});

test('whole-character validation does not accept the former one-spell minimum or forged pools', () => {
  for (const draft of [
    { spellChoicesByClassSlot: [[h(0)], []] },
    { spellChoices: [h(0), h(1)] },
    { spellChoicesByClassSlot: [[e(0), h(0)], []] },
  ]) {
    const result = evaluateCharacter({ ...base(), classChoices: ['high', 'warrior'], ...draft });
    assert.equal(result.valid, false);
    assert.equal(result.stepStatus.at(-1)?.complete, false);
  }
  const full = evaluateCharacter({ ...base(), classChoices: ['high', 'high'],
    artChoicesByClass: { high: { groups: {}, chosen: ['arcane_lexicon', 'counter_magic'] } },
    spellChoicesByClassSlot: [[h(0), h(1)], [h(2), h(3)]] });
  assert.equal(full.valid, true, full.issues.join('\n'));
});
