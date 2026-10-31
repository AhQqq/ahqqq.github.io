import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateClassAbilities } from '../../shared/classAbilities.js';
import type { AbilityClass, AbilityDefinition, ClassAbilityRules } from '../../shared/classAbilities.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';

const dir = join(process.cwd(), '..', 'frontend', 'data');
const classes = JSON.parse(readFileSync(join(dir, 'classes.json'), 'utf8')) as AbilityClass[];
const abilities = JSON.parse(readFileSync(join(dir, 'abilities.json'), 'utf8')) as AbilityDefinition[];
const rules = JSON.parse(readFileSync(join(dir, 'fullclass_abilities.json'), 'utf8')) as ClassAbilityRules;
const evaluate = (pair: unknown) => evaluateClassAbilities(pair, classes, abilities, rules);
const ids = (pair: unknown) => evaluate(pair).abilities.map((item) => item.id);
const base = () => ({
  ...createArrayAllocation(), name: 'Ability tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  focus: ['alert1'], freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});

test('ability definitions and every configured grant reference are present and unique', () => {
  assert.equal(new Set(abilities.map((ability) => ability.id)).size, abilities.length);
  for (const ability of abilities) {
    assert.ok(ability.id && ability.name && ability.englishName && ability.desc && ability.src);
    if (ability.manual_review) assert.ok(ability.manual_review.every((note) => typeof note === 'string' && note.trim()));
  }
  assert.equal(rules.character_level, 1);
  const pairs = new Set<string>();
  for (const rule of rules.combinations) {
    assert.equal(evaluateClassChoices(rule.classes, classes).complete, true);
    const key = JSON.stringify([...rule.classes].sort());
    assert.equal(pairs.has(key), false);
    pairs.add(key);
    for (const id of rule.grant) assert.ok(abilities.some((ability) => ability.id === id), id);
  }
  for (const option of classes) for (const bonus of option.bonus ?? []) {
    if (bonus.action === 'fixed_ability') assert.ok(abilities.some((ability) => ability.id === bonus.id), bonus.id);
  }
});

test('full Warrior gains Killing Blow and Veterans Luck once with full-class provenance', () => {
  const result = evaluate(['warrior', 'warrior']);
  assert.equal(result.complete, true);
  assert.deepEqual(result.abilities.map((item) => item.id), ['killing_blow', 'veterans_luck']);
  for (const ability of result.abilities) {
    assert.deepEqual(ability.sources, [{ type: 'combination', classIds: ['warrior', 'warrior'] }]);
  }
});

test('full Expert gains Masterful Expertise as well as one existing Quick Learner grant', () => {
  const result = evaluate(['expert', 'expert']);
  assert.equal(result.complete, true);
  assert.deepEqual(ids(['expert', 'expert']), ['quick_learner', 'masterful_expertise']);
  assert.deepEqual(result.abilities[0]!.sources, [{ type: 'class', classIds: ['expert'] }]);
  assert.deepEqual(result.abilities[1]!.sources, [{ type: 'combination', classIds: ['expert', 'expert'] }]);
  assert.equal(result.abilities[1]!.manual_review?.length ?? 0, 0);
});

test('partial class grants remain available without turning skills into abilities', () => {
  assert.deepEqual(ids(['warrior', 'expert']), ['quick_learner']);
  assert.deepEqual(ids(['expert', 'warrior']), ['quick_learner']);
  assert.deepEqual(ids(['warrior', 'duelist']), ['flaw_of_fragility']);
  assert.deepEqual(ids(['high', 'high']), []);
  assert.deepEqual(ids(['wise', 'bard']), []);
  assert.deepEqual(ids(['warrior', 'mageslayer']), []);
});

test('incomplete, malformed and illegal pairs never grant abilities', () => {
  for (const pair of [undefined, null, [], ['warrior'], ['expert', 4], ['missing', 'expert'],
    ['warrior', 'warrior', 'expert'], ['wise', 'wise'], ['invoker', 'high'], ['mageslayer', 'duelist']]) {
    const result = evaluate(pair);
    assert.equal(result.complete, false);
    assert.deepEqual(result.abilities, []);
    assert.ok(result.issues.length);
  }
});

test('exact pair rules support legal mixed combinations in either order, not archetype matches', () => {
  const custom: ClassAbilityRules = { character_level: 1, combinations: [
    { classes: ['warrior', 'expert'], grant: ['killing_blow'] },
  ] };
  const forward = evaluateClassAbilities(['warrior', 'expert'], classes, abilities, custom);
  const reverse = evaluateClassAbilities(['expert', 'warrior'], classes, abilities, custom);
  assert.deepEqual(forward, reverse);
  assert.deepEqual(forward.abilities.map((item) => item.id), ['quick_learner', 'killing_blow']);
  assert.equal(evaluateClassAbilities(['warrior', 'bard'], classes, abilities, custom).abilities.length, 0);
});

test('duplicate ability grants are deduplicated while retaining distinct grant sources', () => {
  const customClasses = classes.map((option) => option.id === 'warrior'
    ? { ...option, bonus: [{ action: 'fixed_ability', id: 'killing_blow' }] } : option);
  const custom: ClassAbilityRules = { character_level: 1, combinations: [
    { classes: ['warrior', 'warrior'], grant: ['killing_blow', 'killing_blow'] },
  ] };
  const result = evaluateClassAbilities(['warrior', 'warrior'], customClasses, abilities, custom);
  assert.equal(result.complete, true);
  assert.equal(result.abilities.length, 1);
  assert.equal(result.abilities[0]!.sources.length, 2);
});

test('broken ability references or ambiguous rules produce configuration issues', () => {
  const custom: ClassAbilityRules = { character_level: 1, combinations: [
    { classes: ['warrior', 'warrior'], grant: ['not-an-ability'] },
  ] };
  const missing = evaluateClassAbilities(['warrior', 'warrior'], classes, abilities, custom);
  assert.equal(missing.complete, false);
  assert.deepEqual(missing.abilities, []);
  assert.match(missing.issues[0]!, /not-an-ability/);
  const duplicate = evaluateClassAbilities(['warrior', 'warrior'], classes, [...abilities, abilities.find((a) => a.id === 'killing_blow')!], rules);
  assert.equal(duplicate.complete, false);
  assert.equal(duplicate.abilities.some((a) => a.id === 'killing_blow'), false);
  const repeatedRule = evaluateClassAbilities(['warrior', 'warrior'], classes, abilities,
    { ...rules, combinations: [...rules.combinations, rules.combinations[0]!] });
  assert.equal(repeatedRule.complete, false);
  assert.match(repeatedRule.issues.join(' '), /Duplicate/);
  const unsupportedLevel = evaluateClassAbilities(['warrior', 'warrior'], classes, abilities, { ...rules, character_level: 2 });
  assert.equal(unsupportedLevel.complete, false);
  assert.deepEqual(unsupportedLevel.abilities, []);
  const badPair = evaluateClassAbilities(['warrior', 'warrior'], classes, abilities,
    { character_level: 1, combinations: [{ classes: ['wise', 'wise'], grant: ['killing_blow'] }] });
  assert.equal(badPair.complete, false);
});

test('shared sheet evaluation and API agree for every ordered class pair', () => {
  for (const first of classes) for (const second of classes) {
    const pair = [first.id, second.id];
    const result = evaluateCharacter({ ...base(), classChoices: pair });
    assert.deepEqual(result.classAbilities, evaluate(pair), pair.join('/'));
    const granted = result.classAbilities.abilities.map((item) => item.id);
    assert.equal(granted.includes('killing_blow'), first.id === 'warrior' && second.id === 'warrior');
    assert.equal(granted.includes('veterans_luck'), first.id === 'warrior' && second.id === 'warrior');
    assert.equal(granted.includes('masterful_expertise'), first.id === 'expert' && second.id === 'expert');
  }
});

test('class changes and restored drafts recompute abilities without trusting cached client grants', () => {
  const draft = JSON.parse(JSON.stringify({ ...base(), classChoices: ['warrior', 'warrior'],
    classAbilities: { abilities: [{ id: 'masterful_expertise' }] } }));
  assert.deepEqual(evaluateCharacter(draft).classAbilities.abilities.map((item) => item.id), ['killing_blow', 'veterans_luck']);
  draft.classChoices = ['warrior', 'expert'];
  assert.deepEqual(evaluateCharacter(draft).classAbilities.abilities.map((item) => item.id), ['quick_learner']);
  draft.classChoices = ['expert', 'expert'];
  assert.deepEqual(evaluateCharacter(draft).classAbilities.abilities.map((item) => item.id), ['quick_learner', 'masterful_expertise']);
  assert.equal(evaluateCharacter(draft).classAbilities.complete, true);
  assert.deepEqual(draft.classAbilities.abilities, [{ id: 'masterful_expertise' }]);
});

test('ability evaluation does not mutate catalogues, pair rules or class selections', () => {
  const pair = ['expert', 'expert'];
  const before = JSON.stringify([pair, classes, abilities, rules]);
  evaluate(pair);
  assert.equal(JSON.stringify([pair, classes, abilities, rules]), before);
});
