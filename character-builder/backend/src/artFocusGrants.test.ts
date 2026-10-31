import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { focusInstanceLockReasons } from '../../frontend/src/focusSelection.js';
import type { FocusOption } from '../../frontend/src/focusSelection.js';
import { resolveArtFocusGrants, refundGrantedFocusPicks } from '../../shared/artFocusGrants.js';
import { evaluateFocusCreation, evaluateFocusInstances, pruneFocusInstances, readFocusInstances } from '../../shared/focusCreation.js';
import type { ArtClass, ArtOption, StartingArts } from '../../shared/artSelection.js';

const data = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
const classes = data<Array<ArtClass & { name: string }>>('classes');
const rules = data<StartingArts>('starting_arts');
const foci = data<FocusOption[]>('foci');
const artsDir = new URL('../../frontend/data/arts/', import.meta.url);
const arts = readdirSync(artsDir).filter((file) => file.endsWith('_arts.json'))
  .flatMap((file) => JSON.parse(readFileSync(new URL(file, artsDir), 'utf8')) as ArtOption[]);
const pair = ['mageslayer', 'expert'];
const selectedClasses = classes.filter((item) => pair.includes(item.id));
const instance = (focusId: string) => ({ instanceId: focusId, focusId });
const resolve = (choices: unknown = undefined, ids: unknown = pair, config = rules, catalogue = arts) =>
  resolveArtFocusGrants(choices, ids, classes, config, catalogue, foci);
const draft = () => ({ ...createArrayAllocation(), name: 'Antimage tester', goal: 'Explore',
  classChoices: pair, background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick',
  backgroundPicks: ['notice', 'trade'], freeSkill: 'administer',
  startingEquipment: { method: 'package', packageId: 'armored_warrior' }, focusInstances: [instance('alert1')] });
const budget = [{ id: 'warrior', val: 1 }, { id: 'expert', val: 1 }, { id: 'free', val: 1 }];

test('the fixed Antimage art grants level-1 Nullifier with a stable art source in either slot', () => {
  assert.deepEqual(arts.find((art) => art.id === 'antimage')!.focus_grants, ['nullifier1']);
  assert.ok(!arts.find((art) => art.id === 'antimage')!.description.includes('무화사'));
  const { grants, issues } = resolve();
  assert.deepEqual(issues, []);
  assert.deepEqual(grants, [{ instanceId: 'art-focus:nullifier1', focusId: 'nullifier1',
    grantedBy: [{ kind: 'art', classId: 'mageslayer', artId: 'antimage', name: '항마도' }] }]);
  assert.deepEqual(resolve(undefined, [...pair].reverse()).grants, grants);
  const result = evaluateCharacter(draft());
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.focusSelection.grantedInstances, grants);
  assert.equal(result.focusSelection.limit, 3);
  assert.equal(result.focusSelection.allowances.assignments.length, 1);
  assert.equal(result.savingThrows.conditional.length, 1);
  assert.deepEqual(result.savingThrows.conditional[0]!.grantedBy, grants[0]!.grantedBy);
  assert.deepEqual(result.savingThrows.targets, result.savingThrows.attributeTargets);
  assert.equal(result.focusRuleNotes.filter((note) => note.instanceId === grants[0]!.instanceId).length, 1);
});

test('free grants never consume typed picks and replace paid duplicates before budget checks', () => {
  const paid = ['alert1', 'impervious_defense1', 'halfmen1'].map(instance);
  const source = { ...draft(), focusInstances: [...paid, instance('nullifier1')] };
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.focusSelection.instances, paid);
  assert.deepEqual(result.focusSelection.refundedInstances, [instance('nullifier1')]);
  assert.equal(result.focusSelection.allowances.assignments.length, 3);
  assert.equal(result.focusSelection.extraPicks, 0);
  assert.equal(result.savingThrows.conditional.length, 1);
  const { grants } = resolve();
  assert.deepEqual(pruneFocusInstances(source.focusInstances, foci, selectedClasses, budget, grants), paid);
  assert.deepEqual(refundGrantedFocusPicks(source.focusInstances, grants), paid);
  const withoutPicks = evaluateFocusInstances([], undefined, foci, selectedClasses, 0, grants);
  assert.deepEqual(withoutPicks.applied, grants);
  assert.equal(withoutPicks.allowances.assignments.length, 0);
  const unfunded = evaluateFocusInstances([instance('alert1')], undefined, foci, selectedClasses, 0, grants);
  assert.equal(unfunded.complete, false);
  assert.deepEqual(unfunded.applied, grants);
});

test('removing the class removes only the derived grant, not unrelated paid choices', () => {
  const original = { ...draft(), focusInstances: [instance('alert1'), instance('nullifier1')] };
  const cleaned = refundGrantedFocusPicks(original.focusInstances, resolve().grants);
  const result = evaluateCharacter({ ...original, classChoices: ['warrior', 'expert'], focusInstances: cleaned });
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.focusSelection.instances, [instance('alert1')]);
  assert.deepEqual(result.focusSelection.grantedInstances, []);
  assert.deepEqual(result.savingThrows.conditional, []);
  assert.ok(!result.focusRuleNotes.some((note) => note.text.includes('무화자')));
  const repurchased = evaluateCharacter({ ...original, classChoices: ['warrior', 'expert'] });
  assert.equal(repurchased.focusSelection.allowances.assignments.length, 2);
  assert.equal(repurchased.savingThrows.conditional.length, 1);
});

test('grants follow validated learned arts rather than a hardcoded class check', () => {
  const optional: StartingArts = [{ character_level: 1, classes: { mageslayer: {
    partial: { fixed: ['magebane'], choose: 1, choice_groups: [] },
  } } }];
  const choices = (id: string) => ({ mageslayer: { groups: {}, chosen: [id] } });
  assert.equal(resolve(choices('antimage'), pair, optional).grants.length, 1);
  assert.deepEqual(resolve(choices('absolute_negation'), pair, optional).grants, []);
  assert.deepEqual(resolve({ mageslayer: { groups: {}, chosen: ['antimage', 'absolute_negation'] } }, pair, optional).grants, []);
  assert.deepEqual(resolve(undefined, pair, [{ character_level: 1, classes: {} }]).grants, []);
  const noArt = [{ character_level: 1, classes: { mageslayer: { partial: { fixed: ['magebane'], choose: 0, choice_groups: [] } } } }];
  assert.deepEqual(resolve(undefined, pair, noArt).grants, []);
  assert.deepEqual(resolve({ mageslayer: { fixed: ['antimage'] } }).grants, []);
});

test('multiple validated art sources coalesce into one focus and one conditional bonus', () => {
  const catalogue = arts.map((art) => art.id === 'magebane' ? { ...art, focus_grants: ['nullifier1'] } : art);
  const { grants } = resolve(undefined, pair, rules, catalogue);
  assert.equal(grants.length, 1);
  assert.equal(grants[0]!.grantedBy.length, 2);
  const result = evaluateFocusCreation({ instances: [], grants, foci, classes: selectedClasses,
    baseLimit: 0, skills: [], attributes: [], scores: {} });
  assert.equal(result.saveEffects.conditional.length, 1);
  assert.equal(result.notes.length, 1);
  const onlyMagebane = arts.map((art) => {
    if (art.id === 'antimage') {
      const { focus_grants: _grants, ...withoutGrant } = art;
      return withoutGrant;
    }
    return art.id === 'magebane' ? { ...art, focus_grants: ['nullifier1'] } : art;
  });
  assert.equal(resolve(undefined, pair, rules, onlyMagebane).grants[0]!.grantedBy.length, 1);
});

test('invalid classes, forged sources and higher-level entries cannot turn into free grants', () => {
  for (const ids of [[], ['mageslayer'], ['mageslayer', 'mageslayer'], ['mageslayer', 'high'],
    ['mageslayer', 'duelist'], ['mageslayer', 'expert', 'warrior'], ['unknown', 'mageslayer']]) {
    assert.deepEqual(resolve(undefined, ids).grants, []);
    assert.deepEqual(evaluateCharacter({ ...draft(), classChoices: ids }).focusSelection.grantedInstances, []);
  }
  const source = { ...draft(), classChoices: ['warrior', 'expert'], grants: resolve().grants,
    grantedInstances: resolve().grants, artChoicesByClass: { mageslayer: { fixed: ['antimage'] } } };
  assert.deepEqual(evaluateCharacter(source).focusSelection.grantedInstances, []);
  const forged = { ...instance('nullifier1'), grantedBy: resolve().grants[0]!.grantedBy };
  const paid = evaluateCharacter({ ...draft(), classChoices: ['warrior', 'expert'], focusInstances: [forged] });
  assert.equal(paid.focusSelection.allowances.assignments.length, 1);
  assert.deepEqual(paid.focusSelection.instances, [instance('nullifier1')]);
  assert.ok(readFocusInstances(resolve().grants, undefined, foci).issues.length > 0);
  const upgraded = evaluateCharacter({ ...draft(), focusInstances: [instance('alert1'), instance('nullifier1'),
    { ...instance('nullifier2'), parentInstanceId: 'nullifier1' }] });
  assert.equal(upgraded.focusSelection.complete, false);
  assert.equal(upgraded.focusSelection.extraPicks, 0);
  assert.deepEqual(upgraded.focusSelection.grantedInstances.map((item) => item.focusId), ['nullifier1']);
  assert.equal(upgraded.savingThrows.conditional.length, 1);
});

test('bad grant metadata fails closed rather than providing an arbitrary replacement focus', () => {
  for (const focus_grants of [null, 'nullifier1', [], ['missing'], ['nullifier2'], [1], ['nullifier1', 'nullifier1']]) {
    const catalogue = arts.map((art) => art.id === 'antimage' ? { ...art, focus_grants } : art) as ArtOption[];
    const result = resolve(undefined, pair, rules, catalogue);
    assert.ok(result.issues.length > 0);
    assert.deepEqual(result.grants, []);
  }
  const blocked = foci.map((focus) => focus.id === 'nullifier1' ? { ...focus, requirements: [{ condition: 'not_class', id: 'warrior' }] } : focus);
  const result = resolveArtFocusGrants(undefined, pair, classes, rules, arts, blocked);
  assert.ok(result.issues.length > 0);
  assert.deepEqual(result.grants, []);
});

test('restored and legacy drafts refund duplicates, and the catalogue locks the automatic focus', () => {
  const source = { ...draft(), focusInstances: [instance('alert1'), instance('nullifier1')] };
  const restored = evaluateCharacter(JSON.parse(JSON.stringify(source)));
  const { focusInstances: _instances, ...legacy } = source;
  const migrated = evaluateCharacter({ ...legacy, focus: ['alert1', 'nullifier1'] });
  assert.deepEqual(restored.focusSelection, migrated.focusSelection);
  assert.equal(restored.focusSelection.instances.length, 1);
  const grant = resolve().grants;
  const focus = foci.find((item) => item.id === 'nullifier1')!;
  assert.match(focusInstanceLockReasons(focus, [], foci, selectedClasses, classes, budget, grant).join(' '), /자동 습득/);
  assert.ok(focusInstanceLockReasons(foci.find((item) => item.id === 'nullifier2')!, [], foci, selectedClasses, classes, budget, grant)
    .some((reason) => reason.includes('only level-1')));
});
