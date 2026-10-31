import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { classChoiceReason, evaluateClassChoices } from '../../shared/classSelection.js';
import { artChoiceReason, artGroupKey, evaluateArtChoices, getArtPlans, normalizeArtChoices, restoreArtChoices, toggleArtChoice } from '../../shared/artSelection.js';
import type { ArtChoices, ArtClass, ArtOption, StartingArts } from '../../shared/artSelection.js';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';

const dir = join(process.cwd(), '..', 'frontend', 'data');
const classes = JSON.parse(readFileSync(join(dir, 'classes.json'), 'utf8')) as ArtClass[];
const rules = JSON.parse(readFileSync(join(dir, 'starting_arts.json'), 'utf8')) as StartingArts;
const arts = readdirSync(join(dir, 'arts')).filter((file) => file.endsWith('_arts.json'))
  .flatMap((file) => JSON.parse(readFileSync(join(dir, 'arts', file), 'utf8')) as ArtOption[]);
const evaluate = (source: unknown, pair: string[], config = rules) => evaluateArtChoices(source, pair, classes, config, arts);
const picks = (...ids: string[]) => ({ groups: {}, chosen: ids });
const base = () => ({
  ...createArrayAllocation(), name: 'Arts tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: ['warrior', 'expert'], focus: ['alert1'], freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});

test('full-class eligibility and pairing exclusions apply to every ordered class pair', () => {
  const eligible = new Set(['invoker', 'high', 'necro', 'elem', 'warrior', 'expert']);
  for (const a of classes) {
    assert.equal(a.can_be_full_class, eligible.has(a.id), a.id);
    for (const b of classes) {
      const hasMageslayerMagePair = (a.id === 'mageslayer' && b.archetype === 'mage') ||
        (b.id === 'mageslayer' && a.archetype === 'mage');
      const invokerExclusions = ['high', 'elem', 'necro'];
      const hasInvokerCasterPair = (a.id === 'invoker' && invokerExclusions.includes(b.id)) ||
        (b.id === 'invoker' && invokerExclusions.includes(a.id));
      const expected = (a.id !== b.id || eligible.has(a.id)) && !hasMageslayerMagePair && !hasInvokerCasterPair;
      assert.equal(evaluateClassChoices([a.id, b.id], classes).complete, expected, a.id + '/' + b.id);
      assert.equal(!classChoiceReason(a.id, b.id, classes), expected);
    }
  }
});

test('malformed, unknown, missing and excess class slots are invalid', () => {
  for (const source of [undefined, null, {}, 'high', [], ['high'], ['warrior', 'expert', 'high'], ['missing', 'high'], [42, 'expert']]) {
    assert.equal(evaluateClassChoices(source, classes).complete, false);
    assert.equal(evaluateCharacter({ ...base(), classChoices: source }).valid, false);
  }
});

test('all configured arts rules reference their own catalogues and all legal art classes are covered', () => {
  for (const option of classes.filter((item) => item.arts)) {
    const partial = getArtPlans([option.id, 'warrior'], classes, rules, arts)[0]!;
    assert.equal(partial.configured, true, partial.issues.join('\n'));
    if (option.can_be_full_class) {
      const full = getArtPlans([option.id, option.id], classes, rules, arts)[0]!;
      assert.equal(full.configured, true, full.issues.join('\n'));
    }
  }
  assert.equal(evaluate(undefined, ['warrior', 'expert']).complete, true);
  assert.equal(evaluate(undefined, ['invoker', 'warrior']).required, 0);
});

test('High Mage uses one partial or two full art picks, while Necromancer always uses one', () => {
  assert.equal(evaluate({ high: picks('arcane_lexicon') }, ['high', 'warrior']).complete, true);
  assert.equal(evaluate({ high: picks('arcane_lexicon') }, ['high', 'high']).complete, false);
  const full = evaluate({ high: picks('arcane_lexicon', 'counter_magic') }, ['high', 'high']);
  assert.equal(full.complete, true);
  assert.equal(full.classes.length, 1);
  assert.equal(full.required, 2);
  for (const pair of [['necro', 'warrior'], ['necro', 'necro']]) {
    assert.equal(evaluate({ necro: picks('bonetalker') }, pair).complete, true);
    assert.equal(evaluate({ necro: picks('bonetalker', 'cold_flesh') }, pair).complete, false);
  }
});

test('mixed-class choices belong to each distinct class and ignore slot order', () => {
  const chosen = { high: picks('arcane_lexicon'), necro: picks('bonetalker') };
  assert.equal(evaluate(chosen, ['high', 'necro']).complete, true);
  assert.equal(evaluate(chosen, ['necro', 'high']).complete, true);
  assert.equal(evaluate({ high: picks('arcane_lexicon', 'counter_magic') }, ['high', 'necro']).complete, false);
  assert.equal(evaluate({ high: picks('bonetalker'), necro: picks('arcane_lexicon') }, ['high', 'necro']).complete, false);
});

test('Elementalist gets two fixed grants plus one choice, never doubled for full classes', () => {
  for (const pair of [['elem', 'expert'], ['elem', 'elem']]) {
    const result = evaluate({ elem: picks('elemental_blast') }, pair);
    assert.equal(result.complete, true, result.issues.join('\n'));
    assert.deepEqual(result.classes[0]!.fixed, ['elemental_resilience', 'elemental_sparks']);
    assert.equal(result.classes[0]!.learned.length, 3);
    assert.equal(evaluate({ elem: picks('elemental_sparks') }, pair).complete, false);
  }
});

test('fixed-only Mageslayer requires no choices and fixed arts cannot be forged', () => {
  const result = evaluate(undefined, ['mageslayer', 'expert']);
  assert.equal(result.complete, true);
  assert.deepEqual(result.classes[0]!.learned, ['antimage', 'magebane']);
  assert.equal(evaluate({ mageslayer: picks('absolute_negation') }, ['mageslayer', 'expert']).complete, false);
  assert.equal(evaluate({ mageslayer: { fixed: ['absolute_negation'] } }, ['mageslayer', 'expert']).complete, false);
});

test('Accursed supports an ID-less restricted group plus an independent additional pick', () => {
  const chosen = { accursed: { groups: { 'index:0': ['accursed_blade'] }, chosen: ['accursed_bolt'] } };
  const result = evaluate(chosen, ['accursed', 'warrior']);
  assert.equal(result.complete, true, result.issues.join('\n'));
  assert.equal(result.required, 2);
  assert.equal(evaluate({ accursed: picks('accursed_blade', 'accursed_bolt') }, ['accursed', 'warrior']).complete, false);
  assert.equal(evaluate({ accursed: { groups: { 'index:0': ['accursed_blade', 'accursed_bolt'] }, chosen: [] } }, ['accursed', 'warrior']).complete, false);
  assert.equal(evaluate({ accursed: { groups: { 'index:0': ['bewitching_distraction'] }, chosen: ['accursed_bolt'] } }, ['accursed', 'warrior']).complete, false);
});

test('duplicate arts cannot fill multiple allowances', () => {
  assert.equal(evaluate({ high: picks('arcane_lexicon', 'arcane_lexicon') }, ['high', 'high']).complete, false);
  const duplicate = { accursed: { groups: { 'index:0': ['accursed_blade'] }, chosen: ['accursed_blade'] } };
  const result = evaluate(duplicate, ['accursed', 'expert']);
  assert.equal(result.complete, false);
  assert.deepEqual(result.classes[0]!.learned, ['accursed_blade']);
});

test('optional exclusive groups block unchosen alternatives from the additional allowance', () => {
  const config = structuredClone(rules);
  const group = config[0]!.classes.accursed!.partial!.choice_groups[0]!;
  group.exclusive = true;
  group.id = 'attack';
  assert.equal(artGroupKey(group, 0), 'id:attack');
  const chosen = { accursed: { groups: { 'id:attack': ['accursed_blade'] }, chosen: ['accursed_bolt'] } };
  assert.equal(evaluate(chosen, ['accursed', 'expert'], config).complete, false);
  chosen.accursed.chosen = ['bewitching_distraction'];
  assert.equal(evaluate(chosen, ['accursed', 'expert'], config).complete, true);
});

test('unknown, malformed, stale and prototype-like API selections cannot bypass validation', () => {
  for (const source of [null, [], 5, 'arts', { high: null }, { high: { chosen: 'arcane_lexicon' } },
    { high: picks('unknown') }, { high: { groups: { bogus: [] }, chosen: ['arcane_lexicon'] } },
    { high: { groups: [], chosen: ['arcane_lexicon'] } }, { high: picks('arcane_lexicon', 'counter_magic') },
    { healer: picks('healing_touch') }, JSON.parse('{"__proto__": {"chosen": ["arcane_lexicon"]}}')]) {
    assert.equal(evaluate(source, ['high', 'expert']).complete, false, JSON.stringify(source));
  }
  assert.equal(evaluate({ high: picks('arcane_lexicon') }, ['warrior', 'expert']).complete, false);
});

test('partial-only duplicate classes never gain full or fallback arts', () => {
  const result = evaluate({ healer: picks('empowered_healer') }, ['healer', 'healer']);
  assert.equal(result.complete, false);
  assert.deepEqual(result.classes[0]!.learned, []);
  assert.match(result.issues.join(' '), /partial-only/);
  const character = evaluateCharacter({ ...base(), classChoices: ['healer', 'healer'] });
  assert.equal(character.valid, false);
  assert.equal(character.stepStatus.find((step) => step.key === 'class')!.complete, false);
});

test('missing full-class rules are incomplete, never replaced with partial rules', () => {
  const config = structuredClone(rules);
  delete config[0]!.classes.high!.full;
  const result = evaluate({ high: picks('arcane_lexicon') }, ['high', 'high'], config);
  assert.equal(result.complete, false);
  assert.match(result.issues.join(' '), /not configured/);
  assert.deepEqual(result.classes[0]!.learned, []);
});

test('class changes and draft restoration preserve legal choices and remove excess or unavailable choices', () => {
  const source = { high: picks('arcane_lexicon', 'counter_magic'), necro: picks('bonetalker') };
  assert.deepEqual(normalizeArtChoices(source, ['high', 'necro'], classes, rules, arts),
    { high: picks('arcane_lexicon'), necro: picks('bonetalker') });
  assert.deepEqual(normalizeArtChoices(source, ['warrior', 'expert'], classes, rules, arts), {});
  assert.deepEqual(normalizeArtChoices(source, ['high', 'high'], classes, rules, arts), { high: source.high });
  const restored = restoreArtChoices(source, ['high', 'warrior'], classes, rules, arts);
  assert.match(restored.notice, /rechecked/);
  assert.deepEqual(restored.choices, { high: picks('arcane_lexicon') });
  assert.equal(restoreArtChoices(restored.choices, ['high', 'warrior'], classes, rules, arts).notice, '');
  assert.equal(restoreArtChoices(undefined, ['high', 'warrior'], classes, rules, arts).notice, '');
  for (const value of [null, 2, [], 'arts', { high: { groups: null, chosen: [false, 'missing', 'arcane_lexicon'] } }]) {
    const clean = normalizeArtChoices(value, ['high', 'high'], classes, rules, arts);
    assert.ok(clean.high!.chosen.length <= 2);
  }
});

test('selection controls enforce counts and duplicates while allowing removal', () => {
  const pair = ['accursed', 'warrior'];
  let choices: ArtChoices = {};
  const toggle = (key: string | null, id: string) => choices = toggleArtChoice(choices, 'accursed', key, id, pair, classes, rules, arts);
  toggle('index:0', 'accursed_blade');
  toggle(null, 'accursed_blade');
  assert.deepEqual(choices.accursed!.chosen, []);
  toggle(null, 'accursed_bolt');
  toggle(null, 'bewitching_distraction');
  assert.deepEqual(choices.accursed!.chosen, ['accursed_bolt']);
  const plan = getArtPlans(pair, classes, rules, arts)[0]!;
  assert.match(artChoiceReason(plan, choices.accursed!, 'index:0', 'accursed_bolt'), /Already selected/);
  toggle(null, 'accursed_bolt');
  toggle('index:0', 'accursed_blade');
  assert.deepEqual(choices.accursed, { groups: { 'index:0': [] }, chosen: [] });
});

test('art IDs are scoped to their catalogue so Bard and Priest shared IDs do not overwrite one another', () => {
  const result = evaluate({ bard: picks('battle_cry'), priest: picks('a_thousand_tongues', 'armor_of_god') }, ['bard', 'priest']);
  assert.equal(result.complete, true);
  assert.equal(result.classes.length, 2);
  assert.ok(result.classes.every((entry) => entry.learned.includes('a_thousand_tongues')));
});

test('the API includes derived arts and their checkpoint before the final spell stage', () => {
  const chosen = { healer: picks('empowered_healer') };
  const result = evaluateCharacter({ ...base(), classChoices: ['healer', 'expert'], artChoicesByClass: chosen });
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.artSelection.classes[0]!.learned, ['healing_touch', 'empowered_healer']);
  assert.deepEqual(result.stepStatus.slice(-2).map((step) => step.key), ['arts', 'spells']);
  assert.equal(result.stepStatus.find((step) => step.key === 'arts')!.complete, true);
  const incomplete = evaluateCharacter({ ...base(), classChoices: ['healer', 'expert'] });
  assert.equal(incomplete.valid, false);
  assert.equal(incomplete.stepStatus.find((step) => step.key === 'arts')!.complete, false);
});
