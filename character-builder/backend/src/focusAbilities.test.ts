import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { abilityById, mergeAbilityEvaluations, resolveAbilityGrants } from '../../shared/abilities.js';
import type { AbilityDefinition } from '../../shared/abilities.js';
import { evaluateFocusInstances } from '../../shared/focusCreation.js';
import type { FocusInstance } from '../../shared/focusCreation.js';
import { resolveFocusAbilities } from '../../shared/focusAbilities.js';
import type { FocusData } from '../../shared/focusBonuses.js';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';

const dir = join(process.cwd(), '..', 'frontend', 'data');
const foci = JSON.parse(readFileSync(join(dir, 'foci.json'), 'utf8')) as FocusData[];
const abilities = JSON.parse(readFileSync(join(dir, 'abilities.json'), 'utf8')) as AbilityDefinition[];
const warriors = [{ id: 'warrior', archetype: 'warrior' }, { id: 'warrior', archetype: 'warrior' }];
const mappings = { accipiter1: 'accipiter_flight', ghoul1: 'ghoulish_vigor', harbinger1: 'harbingers_face' };
const base = () => ({
  ...createArrayAllocation(), name: 'Focus ability tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: ['warrior', 'warrior'], freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});

test('named focus abilities reference shared definitions without embedded copies', () => {
  for (const focus of foci) {
    assert.equal('specialAbility' in focus, false, focus.id);
    assert.equal('specialAbilityDescription' in focus, false, focus.id);
    for (const id of focus.ability_ids ?? []) assert.ok(abilityById(id, abilities), `${focus.id}: ${id}`);
  }
  for (const [focusId, abilityId] of Object.entries(mappings)) {
    const focus = foci.find((item) => item.id === focusId)!;
    assert.deepEqual(focus.ability_ids, [abilityId]);
    const ability = abilityById(abilityId, abilities)!;
    assert.ok(ability.name && ability.englishName && ability.desc && ability.src);
    assert.equal(focus.bonus.length, focusId === 'ghoul1' ? 2 : 3);
  }
});

test('each eligible focus grants its ability with stable instance provenance in the API', () => {
  for (const [focusId, abilityId] of Object.entries(mappings)) {
    const instance = { instanceId: 'chosen-origin', focusId };
    const result = evaluateCharacter({ ...base(), focusInstances: [instance] });
    const grant = result.abilitySelection.abilities.find((item) => item.id === abilityId)!;
    assert.deepEqual(grant.sources, [{ type: 'focus', focusId, instanceId: instance.instanceId }]);
    assert.equal(grant.desc, abilityById(abilityId, abilities)!.desc);
    assert.deepEqual(result.classAbilities.abilities.map((item) => item.id), ['killing_blow', 'veterans_luck']);
  }
});

test('focus origin conflicts, excess picks and illegal class pairs never grant focus abilities', () => {
  const badSelections: FocusInstance[][] = [
    [{ instanceId: 'a', focusId: 'accipiter1' }, { instanceId: 'b', focusId: 'ghoul1' }],
    [{ instanceId: 'a', focusId: 'accipiter1' }, { instanceId: 'b', focusId: 'alert1' }, { instanceId: 'c', focusId: 'die_hard1' }],
  ];
  for (const focusInstances of badSelections) {
    const result = evaluateCharacter({ ...base(), focusInstances });
    assert.equal(result.abilitySelection.abilities.some((item) => item.sources.some((source) => source.type === 'focus')), false);
    assert.equal(result.valid, false);
  }
  const invalidClasses = evaluateCharacter({ ...base(), classChoices: ['wise', 'wise'],
    focusInstances: [{ instanceId: 'a', focusId: 'accipiter1' }] });
  assert.deepEqual(invalidClasses.abilitySelection.abilities, []);
});

test('creation-level restrictions exclude upgrade ability sources while retaining a valid parent grant', () => {
  const definitions: FocusData[] = [
    { id: 'parent', name: 'Parent', type: 'origin', level: 1, bonus: [], ability_ids: ['accipiter_flight'], requirements: [] },
    { id: 'upgrade', name: 'Upgrade', type: 'origin', level: 2, bonus: [], ability_ids: ['accipiter_flight'],
      requirements: [{ condition: 'has_focus', id: 'parent' }] },
    { id: 'restricted', name: 'Restricted', bonus: [], ability_ids: ['ghoulish_vigor'], requirements: [{ condition: 'is_class', id: 'expert' }] },
  ];
  const root = { instanceId: 'root', focusId: 'parent' };
  const child = { instanceId: 'child', focusId: 'upgrade', parentInstanceId: 'root' };
  const resolve = (instances: FocusInstance[]) => resolveFocusAbilities(
    evaluateFocusInstances(instances, undefined, definitions, warriors, 2).applied, definitions, abilities);
  const upgraded = resolve([root, child]);
  assert.equal(upgraded.abilities.length, 1);
  assert.equal(upgraded.abilities[0]!.sources.length, 1);
  assert.deepEqual(upgraded, resolve([root]));
  assert.equal(resolve([root]).abilities[0]!.sources.length, 1);
  assert.deepEqual(resolve([child]).abilities, []);
  assert.deepEqual(resolve([{ instanceId: 'restricted', focusId: 'restricted' }]).abilities, []);
});

test('class and focus sources share one ability entry without mutating earlier evaluations', () => {
  const classGrant = resolveAbilityGrants([{ id: 'killing_blow', source: { type: 'class', classIds: ['warrior'] } }], abilities);
  const focusGrant = resolveAbilityGrants([{ id: 'killing_blow', source: { type: 'focus', focusId: 'example', instanceId: 'instance' } }], abilities);
  const merged = mergeAbilityEvaluations(classGrant, focusGrant, focusGrant);
  assert.equal(merged.abilities.length, 1);
  assert.equal(merged.abilities[0]!.sources.length, 2);
  assert.equal(classGrant.abilities[0]!.sources.length, 1);
  assert.equal(focusGrant.abilities[0]!.sources.length, 1);
  assert.equal(mergeAbilityEvaluations(classGrant).abilities[0]!.sources.length, 1);
});

test('missing, duplicate or malformed ability references are visible configuration issues', () => {
  const focus: FocusData = { id: 'example', name: 'Example', bonus: [], requirements: [], ability_ids: ['missing'] };
  const instance = { instanceId: 'instance', focusId: focus.id };
  const missing = resolveFocusAbilities([instance], [focus], abilities);
  assert.equal(missing.complete, false);
  assert.deepEqual(missing.abilities, []);
  assert.match(missing.issues.join(' '), /missing/);
  const malformed = { ...focus, ability_ids: 'accipiter_flight' } as unknown as FocusData;
  assert.equal(resolveFocusAbilities([instance], [malformed], abilities).complete, false);
  const duplicateCatalogue = [...abilities, abilityById('accipiter_flight', abilities)!];
  assert.equal(abilityById('accipiter_flight', duplicateCatalogue), undefined);
  assert.equal(resolveFocusAbilities([instance], [{ ...focus, ability_ids: ['accipiter_flight'] }], duplicateCatalogue).complete, false);
});

test('legacy and restored drafts derive focus abilities and discard cached or deselected grants', () => {
  const draft = JSON.parse(JSON.stringify({ ...base(), focus: ['accipiter1'],
    abilitySelection: { abilities: [{ id: 'ghoulish_vigor' }] } }));
  const restored = evaluateCharacter(draft);
  assert.ok(restored.abilitySelection.abilities.some((item) => item.id === 'accipiter_flight'));
  assert.equal(restored.abilitySelection.abilities.some((item) => item.id === 'ghoulish_vigor'), false);
  const removed = evaluateCharacter({ ...draft, focusInstances: [] });
  assert.equal(removed.abilitySelection.abilities.some((item) => item.id === 'accipiter_flight'), false);
  assert.deepEqual(draft.abilitySelection.abilities, [{ id: 'ghoulish_vigor' }]);
});
