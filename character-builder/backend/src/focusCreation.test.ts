import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { evaluateFocusCreation, evaluateFocusInstances, instanceFocusData, normalizeFocusRuleChoices, pruneFocusInstances, readFocusInstances, removeFocusInstance } from '../../shared/focusCreation.js';
import type { FocusInstance } from '../../shared/focusCreation.js';
import { normalizeFocusBonusChoices } from '../../shared/focusBonuses.js';
import { focusInstanceLabel, focusInstanceLockReasons, focusLockReasons } from '../../frontend/src/focusSelection.js';
import { evaluateFocusAllowances } from '../../shared/focusAllowances.js';
import type { FocusAllowance } from '../../shared/focusAllowances.js';
import type { FocusOption, FocusClass } from '../../frontend/src/focusSelection.js';

const data = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
const foci = data<FocusOption[]>('foci');
const classes = data<FocusClass[]>('classes');
const skills = data<Array<{ id: string; tags: string[] }>>('skills');
const attributes = data<Array<{ id: string; tags: string[] }>>('attributes');
const warrior = classes.filter((item) => ['warrior', 'expert'].includes(item.id));
const instance = (focusId: string, instanceId = focusId, parentInstanceId?: string): FocusInstance =>
  ({ instanceId, focusId, ...(parentInstanceId ? { parentInstanceId } : {}) });
const draft = () => ({ ...createArrayAllocation(), name: 'Focus test', goal: 'Explore',
  classChoices: ['warrior', 'expert'], background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick',
  backgroundPicks: ['notice', 'trade'], freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' }, focus: ['alert1'] });
const select = (instances: FocusInstance[], baseLimit = 3) => evaluateFocusInstances(instances, undefined, foci, warrior, baseLimit);
const creation = (instances: FocusInstance[], bonusChoices: unknown = {}, ruleChoices: unknown = {}) => evaluateFocusCreation({
  instances, bonusChoices, ruleChoices, foci, classes: warrior, baseLimit: 3, skills, attributes, scores: createArrayAllocation().attributes,
});

test('higher-level instances never grant effects or extra picks, even with valid parents and repeatability', () => {
  const root: FocusOption = { ...foci.find((item) => item.id === 'alert1')!, id: 'root', bonus: [], requirements: [], sheet_notes: ['Root note'] };
  const child: FocusOption = { ...root, id: 'child', name: 'Blocked upgrade', level: 2, repeatable: true,
    requirements: [{ condition: 'has_focus', id: 'root' }], extra_focus_picks: 2,
    bonus: [{ action: 'fixed_skill', id: 'alchemy', count: 1 }, { action: 'attribute_modifier', id: 'DEX', value: 1, cap_override: { max: 3 } }],
    derived_bonus: { attack: 5 }, score_effect: { kind: 'raise_to', value: 18, tags: ['phys'], optional: true }, sheet_notes: ['Blocked note'] };
  const input = { foci: [root, child], classes: warrior, baseLimit: 3, skills, attributes, scores: draft().attributes };
  const original = evaluateFocusCreation({ ...input, instances: [instance('root')] });
  for (const level of [2, 3]) {
    const catalogue = [root, { ...child, level }];
    const selected = [instance('root'), instance('child', 'child', 'root')];
    const result = evaluateFocusCreation({ ...input, foci: catalogue, instances: selected,
      ruleChoices: { child: { attributeId: 'CON' } } });
    assert.equal(result.complete, false);
    assert.ok(result.issues.some((issue) => issue.includes('only level-1')));
    assert.deepEqual(result.instances, selected);
    assert.deepEqual(result.applied, [instance('root')]);
    assert.equal(result.extraPicks, 0);
    assert.deepEqual(result.bonuses, original.bonuses);
    assert.deepEqual(result.scores, original.scores);
    assert.deepEqual(result.derived, original.derived);
    assert.deepEqual(result.notes, original.notes);
    assert.ok(focusInstanceLockReasons(catalogue[1]!, selected.slice(0, 1), catalogue, warrior, classes, 100)
      .some((reason) => reason.includes('only level-1')));
  }
});

test('Spirit Familiar level 2 records companion-only, globally distinct benefit choices', () => {
  const focus = foci.find((item) => item.id === 'spirit_familiar2')!;
  assert.equal(focus.level, 2);
  assert.equal(focus.repeatable, true);
  assert.deepEqual(focus.requirements, [{ condition: 'has_focus', id: 'spirit_familiar1' }]);
  assert.deepEqual(focus.bonus, []);
  assert.equal(focus.derived_bonus, undefined);
  assert.ok(focus.benefit_choices);
  const { options, ...rules } = focus.benefit_choices;
  assert.deepEqual(rules, { target: 'familiar', choose: 2, unique_within_instance: true, unique_across_instances: true });
  assert.deepEqual(options.map((option) => option.id), ['hit_points', 'attack', 'background', 'appearance', 'flight', 'speech']);
  assert.equal(new Set(options.map((option) => option.id)).size, 6);
  for (const option of options) {
    assert.ok(option.name.trim());
    assert.ok(option.description.trim());
    assert.ok(focus.effect.includes(option.description));
    assert.deepEqual(option.selection, option.id === 'background' ? { kind: 'background', count: 1 } : undefined);
  }
});

test('Spirit Familiar repeatable upgrade metadata never bypasses the creation-level ban', () => {
  const root = instance('spirit_familiar1', 'familiar');
  const upgrades = [instance('spirit_familiar2', 'benefits-a', root.instanceId), instance('spirit_familiar2', 'benefits-b', root.instanceId)];
  const selected = [root, ...upgrades];
  const original = creation([root]);
  const result = creation(selected);
  assert.equal(result.complete, false);
  assert.deepEqual(result.instances, selected);
  assert.deepEqual(result.applied, [root]);
  assert.ok(result.issues.some((issue) => issue.includes('only level-1')));
  assert.deepEqual(result.bonuses, original.bonuses);
  assert.deepEqual(result.scores, original.scores);
  assert.deepEqual(result.derived, original.derived);
  assert.deepEqual(result.notes, original.notes);
  assert.equal(result.extraPicks, original.extraPicks);
  const focus = foci.find((item) => item.id === 'spirit_familiar2')!;
  assert.ok(focusInstanceLockReasons(focus, [root], foci, warrior, classes, 100).some((reason) => reason.includes('only level-1')));
  assert.deepEqual(removeFocusInstance(selected, upgrades[0]!.instanceId, foci, warrior, 3), [root]);
  assert.deepEqual(removeFocusInstance(selected, root.instanceId, foci, warrior, 3), []);
});

test('API rejects both legacy and saved modern upgrades without hiding them', () => {
  for (const choices of [
    { focus: ['alert1', 'alert2'] },
    { focusInstances: [instance('alert1', 'root'), instance('alert2', 'child', 'root')] },
  ]) {
    const source = { ...draft(), ...choices, characterLevel: 2 };
    const result = evaluateCharacter(source);
    assert.equal(result.characterLevel, 1);
    assert.equal(result.valid, false);
    assert.equal(result.focusSelection.complete, false);
    assert.equal(result.focusSelection.instances.length, 2);
    assert.ok(result.issues.some((issue) => issue.includes('only level-1')));
    assert.equal(result.focusBonuses.length, 1);
    assert.equal(result.focusSelection.allowances.assignments.length, 1);
  }
});

test('legacy IDs migrate without losing choices or prerequisite ownership', () => {
  const legacy = ['specialist1', 'specialist2', 'developed_attribute1'];
  const migrated = readFocusInstances(undefined, legacy, foci);
  assert.deepEqual(migrated.instances, [instance('specialist1'), instance('specialist2', 'specialist2', 'specialist1'), instance('developed_attribute1')]);
  const choices = { specialist1: { 0: ['know'] }, developed_attribute1: { 0: ['STR'] } };
  const roundTrip = readFocusInstances(JSON.parse(JSON.stringify(migrated.instances)), ['penal1'], foci);
  assert.deepEqual(roundTrip.instances, migrated.instances);
  assert.deepEqual(normalizeFocusBonusChoices(choices, legacy, instanceFocusData(roundTrip.instances, foci)), choices);
  const restored = evaluateCharacter({ ...draft(), focus: legacy, focusBonusChoices: choices });
  assert.deepEqual(restored.focusSelection.instances, migrated.instances);
  assert.equal(restored.focusSelection.complete, false);
  assert.ok(restored.issues.some((issue) => issue.includes('only level-1')));
});

test('repeatable Developed Attribute instances have independent targets and share absolute caps', () => {
  const selected = [instance('developed_attribute1', 'a'), instance('developed_attribute1', 'b'), instance('developed_attribute1', 'c')];
  const same = creation(selected, { a: { 0: ['STR'] }, b: { 0: ['STR'] }, c: { 0: ['STR'] } });
  assert.equal(same.complete, true, same.issues.join('\n'));
  assert.equal(same.bonuses.modifierContributions.STR, 3);
  assert.equal(same.bonuses.modifierBonuses.STR, 2);
  assert.equal(same.bonuses.modifierCaps.STR?.max, 3);
  const separate = creation(selected.slice(0, 2), { a: { 0: ['STR'] }, b: { 0: ['DEX'] } });
  assert.equal(separate.bonuses.modifierBonuses.STR, 1);
  assert.equal(separate.bonuses.modifierBonuses.DEX, 1);
  const mage = evaluateFocusInstances(selected, undefined, foci, classes.filter((item) => item.id === 'high'), 3);
  assert.equal(mage.applied.length, 0);
  assert.equal(mage.complete, false);
});

test('nonrepeatable duplicates, duplicate instance IDs and malformed modern payloads fail closed', () => {
  for (const selected of [[instance('alert1', 'a'), instance('alert1', 'b')], [instance('developed_attribute1', 'a'), instance('developed_attribute1', 'a')]]) {
    const result = select(selected);
    assert.equal(result.complete, false);
    assert.equal(result.applied.length, 0);
  }
  for (const source of [null, {}, 'alert1', [null], [{ instanceId: '__proto__', focusId: 'alert1' }], [{ instanceId: 'x', focusId: 1 }]]) {
    const result = evaluateFocusInstances(source, ['alert1'], foci, warrior, 3);
    assert.equal(result.complete, false);
    assert.equal(result.instances.length, 0);
  }
});

test('Specialist instances require distinct legal skills and do not bypass creation skill caps', () => {
  const selected = [instance('specialist1', 'a'), instance('specialist1', 'b')];
  const funded = [...selected, instance('penal1', 'p')];
  const valid = evaluateCharacter({ ...draft(), focusInstances: funded, focusBonusChoices: { a: { 0: ['know'] }, b: { 0: ['connect'] }, p: { 0: ['CHA'] } } });
  assert.equal(valid.valid, true, valid.issues.join('\n'));
  assert.equal(valid.skillStates.know?.level, 0);
  assert.equal(valid.skillStates.connect?.level, 0);
  assert.equal(valid.focusBonuses.length, 3);
  const duplicate = evaluateCharacter({ ...draft(), focusInstances: funded, focusBonusChoices: { a: { 0: ['know'] }, b: { 0: ['know'] }, p: { 0: ['CHA'] } } });
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.issues.some((issue) => issue.includes('different skill')));
  assert.equal(duplicate.skillStates.know?.allotments, 1);
  const capped = evaluateCharacter({ ...draft(), backgroundPicks: ['craft', 'notice'], focusInstances: selected.slice(0, 1), focusBonusChoices: { a: { 0: ['craft'] } } });
  assert.equal(capped.skillStates.craft?.level, 1);
  assert.ok(capped.skillIssues.some((issue) => issue.key === 'focus:a:0:0'));
  const forbidden = creation(selected.slice(0, 1), { a: { 0: ['magic'] } });
  assert.equal(forbidden.complete, false);
  assert.equal(forbidden.bonuses.skills.includes('magic'), false);
});

test('saved Specialist upgrades remain removable but cannot replace level-1 notes or grant a skill', () => {
  const selected = [instance('specialist1', 'a'), instance('specialist1', 'b'), instance('specialist2', 'u', 'b')];
  assert.ok(focusInstanceLabel(selected[2]!, selected, foci).endsWith('(2번째) 2레벨'));
  const result = creation(selected, { a: { 0: ['know'] }, b: { 0: ['connect'] } });
  assert.equal(result.complete, false);
  assert.ok(result.issues.some((issue) => issue.includes('only level-1')));
  assert.equal(result.bonuses.skills.filter((id) => id === 'connect').length, 1);
  assert.ok(result.notes.some((note) => note.instanceId === 'a' && note.text.includes('3d6')));
  assert.equal(result.notes.some((note) => note.instanceId === 'u'), false);
  assert.ok(result.notes.some((note) => note.instanceId === 'b' && note.text.includes('3d6')));
  const unfunded = evaluateCharacter({ ...draft(), focusInstances: selected, focusBonusChoices: { a: { 0: ['know'] }, b: { 0: ['connect'] } } });
  assert.equal(unfunded.focusSelection.complete, false);
  assert.deepEqual(removeFocusInstance(selected, 'a', foci, warrior, 3), [selected[1]]);
  assert.deepEqual(removeFocusInstance(selected, 'b', foci, warrior, 3), [selected[0]]);
  assert.deepEqual(removeFocusInstance(selected, 'u', foci, warrior, 3), selected.slice(0, 2));
  const twice = select([...selected, instance('specialist2', 'u2', 'b')], 5);
  assert.equal(twice.complete, false);
  assert.equal(twice.applied.some((item) => item.focusId === 'specialist2'), false);
  assert.equal(select([instance('alert1', 'a'), instance('specialist2', 'u', 'a')]).complete, false);
  assert.equal(select([instance('specialist2', 'u', 'missing')]).complete, false);
});

test('separate origin families are mutually exclusive in UI and API, including Penal and Deepfolk', () => {
  for (const ids of [['deepfolk1', 'penal1'], ['penal1', 'deepfolk1'], ['orcs1', 'laborer1']]) {
    const result = select(ids.map((id) => instance(id)));
    assert.equal(result.complete, false);
    assert.equal(result.applied.length, 0);
    assert.equal(result.extraPicks, 0);
    const option = foci.find((item) => item.id === ids[1])!;
    assert.ok(focusLockReasons(option, [ids[0]!], foci, warrior, classes, 3).some((reason) => reason.includes('one origin')));
    const character = evaluateCharacter({ ...draft(), focus: ids });
    assert.equal(character.valid, false);
    assert.equal(character.derived.focusLimit, 3);
  }
});

test('Half-Elves modifiers require explicit opt-in and are always applied together', () => {
  const selected = [instance('elves_half_elves1', 'half')];
  const choices = { half: { 1: ['know'] } };
  const declined = creation(selected, choices);
  assert.equal(declined.complete, true);
  assert.equal(declined.bonuses.modifierBonuses.DEX, 0);
  const opted = creation(selected, choices, { half: { packageId: 'elven_parent' } });
  assert.equal(opted.complete, true);
  assert.equal(opted.bonuses.modifierBonuses.DEX, 1);
  assert.equal(opted.bonuses.modifierBonuses.CON, -1);
  assert.equal(creation(selected, choices, { half: { packageId: 'gravity_str' } }).complete, false);
  assert.equal(creation([], choices, { half: { packageId: 'elven_parent' } }).bonuses.modifierBonuses.DEX, 0);
});

test('linked origin upgrades are rejected at creation while their valid parent remains', () => {
  const selected = [instance('lizardmen1', 'root'), instance('lizardmen2', 'upgrade', 'root')];
  assert.equal(select(selected).complete, false);
  assert.deepEqual(select(selected).applied, [selected[0]]);
  assert.equal(select(selected, 1).complete, false);
  assert.equal(select([...selected, instance('deepfolk1')]).complete, false);
  assert.equal(select([selected[0]!, instance('lizardmen2', 'upgrade', 'missing')]).complete, false);
  const option = foci.find((item) => item.id === 'lizardmen2')!;
  assert.ok(focusLockReasons(option, ['lizardmen1'], foci, warrior, classes, 3).some((reason) => reason.includes('only level-1')));
  const upgraded = evaluateCharacter({ ...draft(), focus: ['lizardmen1', 'lizardmen2'], focusBonusChoices: { lizardmen1: { 2: ['STR'], 3: ['DEX'] } } });
  assert.equal(upgraded.focusSelection.complete, false);
  assert.ok(upgraded.focusSelection.issues.some((issue) => issue.includes('only level-1')));
  assert.equal(upgraded.focusSelection.instances.length, 2);
  assert.deepEqual(removeFocusInstance(selected, 'root', foci, warrior, 3), []);
});

test('API validation preserves malformed and excess bonus choices instead of normalizing them into validity', () => {
  for (const choice of [['STR', 'DEX'], 'STR', [2], null]) {
    const result = evaluateCharacter({ ...draft(), focus: ['developed_attribute1'], focusBonusChoices: { developed_attribute1: { 0: choice } } });
    assert.equal(result.valid, false);
    assert.equal(result.focusSelection.complete, false);
  }
});

test('Xenoblooded requires one package and both gravity orientations keep their linked penalties', () => {
  const selected = [instance('xenoblooded1', 'x')];
  assert.equal(creation(selected).complete, false);
  for (const id of ['heat', 'aquatic', 'radiation']) {
    const result = creation(selected, {}, { x: { packageId: id } });
    assert.equal(result.complete, true);
    assert.ok(Object.values(result.bonuses.modifierBonuses).every((value) => value === 0));
    assert.equal(result.notes.length, 1);
  }
  for (const [id, str, dex] of [['gravity_str', 1, -1], ['gravity_dex', -1, 1]] as const) {
    const result = creation(selected, {}, { x: { packageId: id } });
    assert.equal(result.bonuses.modifierBonuses.STR, str);
    assert.equal(result.bonuses.modifierBonuses.DEX, dex);
  }
  for (const packageId of ['unknown', ['heat', 'radiation'], null]) {
    assert.equal(creation(selected, {}, { x: { packageId } }).complete, false);
  }
});

test('Deepfolk raises only an eligible physical score and recalculates derived values without mutating allocation', () => {
  const source = draft();
  const chosen = evaluateCharacter({ ...source, focus: ['deepfolk1'], focusRuleChoices: { deepfolk1: { attributeId: 'CON' } } });
  assert.equal(chosen.valid, true, chosen.issues.join('\n'));
  assert.equal(chosen.attributes.CON, 14);
  assert.equal(chosen.allocatedAttributes.CON, 11);
  assert.equal(chosen.baseModifiers.CON, 1);
  assert.equal(chosen.derived.hitPoints, 9);
  assert.equal(source.attributes.CON, 11);
  for (const attributeId of ['', 'STR', 'INT', 'missing']) {
    const invalid = evaluateCharacter({ ...source, focus: ['deepfolk1'], focusRuleChoices: { deepfolk1: { attributeId } } });
    assert.equal(invalid.valid, false, attributeId);
    assert.deepEqual(invalid.attributes, source.attributes);
  }
  const declined = evaluateCharacter({ ...source, focus: ['deepfolk1'], focusRuleChoices: { deepfolk1: { attributeId: 'none' } } });
  assert.equal(declined.valid, true);
  assert.deepEqual(declined.attributes, source.attributes);
  const moved = evaluateCharacter({ ...source, focus: ['deepfolk1'], focusRuleChoices: { deepfolk1: { attributeId: 'DEX' } } });
  assert.equal(moved.attributes.CON, 11);
  assert.equal(moved.attributes.DEX, 14);
  assert.equal(moved.modifiers.DEX, 1);
  assert.equal(moved.derived.ac, 11);
  const removed = evaluateCharacter({ ...source, focusRuleChoices: { deepfolk1: { attributeId: 'CON' } } });
  assert.equal(removed.attributes.CON, 11);
});

test('Penal requires a retained attribute only when multiple original scores exceed 13', () => {
  const source = { ...draft(), attributeMethod: 'rolled', attributes: { STR: 18, DEX: 17, CON: 16, INT: 15, WIS: 14, CHA: 7 },
    focus: ['penal1'], focusBonusChoices: { penal1: { 0: ['CHA'] } } };
  assert.equal(evaluateCharacter(source).valid, false);
  const result = evaluateCharacter({ ...source, focusRuleChoices: { penal1: { retainedAttribute: 'CON' } } });
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.attributes, { STR: 13, DEX: 13, CON: 16, INT: 13, WIS: 13, CHA: 7 });
  assert.deepEqual(result.allocatedAttributes, source.attributes);
  assert.equal(result.modifiers.CHA, -3);
  assert.equal(result.derived.luckSave, 13);
  assert.equal(result.derived.physicalSave, 12);
  assert.equal(result.derived.evasionSave, 13);
  const invalid = evaluateCharacter({ ...source, focusRuleChoices: { penal1: { retainedAttribute: 'CHA' } } });
  assert.equal(invalid.valid, false);
  const automatic = evaluateCharacter({ ...draft(), focus: ['penal1'], focusBonusChoices: { penal1: { 0: ['CHA'] } } });
  assert.equal(automatic.valid, true);
  assert.equal(automatic.attributes.STR, 14);
});

test('Penal grants two extra picks once and removing it removes surplus instances and choices', () => {
  const penal = foci.find((item) => item.id === 'penal1')!;
  assert.deepEqual(focusLockReasons(penal, ['alert1', 'specialist1', 'specialist1'], foci, warrior, classes, 3), []);
  assert.equal(select([instance('alert1'), instance('specialist1', 'first'), instance('specialist1', 'second'), instance('penal1')]).complete, true);
  const selected = [instance('penal1', 'p'), instance('alert1', 'a'), instance('specialist1', 's1'), instance('specialist1', 's2'), instance('armsmaster1', 'combat')];
  const choices = { p: { 0: ['CHA'] }, s1: { 0: ['know'] }, s2: { 0: ['connect'] } };
  const result = evaluateCharacter({ ...draft(), focusInstances: selected, focusBonusChoices: choices });
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.equal(result.derived.focusLimit, 5);
  assert.equal(result.focusSelection.baseLimit, 3);
  assert.equal(result.focusSelection.extraPicks, 2);
  const removed = removeFocusInstance(selected, 'p', foci, warrior, 3);
  assert.deepEqual(removed.map((item) => item.instanceId), ['a', 's1', 's2']);
  assert.equal(select(removed).limit, 3);
  assert.deepEqual(Object.keys(normalizeFocusBonusChoices(choices, removed.map((item) => item.instanceId), instanceFocusData(removed, foci))).sort(), ['s1', 's2']);
  assert.equal(select([...selected, instance('lucky1', 'too-many')]).complete, false);
  const incompatible = select([instance('penal1'), instance('developed_attribute1')]);
  assert.equal(incompatible.complete, false);
  assert.equal(incompatible.extraPicks, 0);
});

test('class changes discard ineligible repeats while retaining unrelated independent instances', () => {
  const selected = [instance('developed_attribute1', 'a'), instance('developed_attribute1', 'b'), instance('specialist1', 's')];
  const kept = pruneFocusInstances(selected, foci, classes.filter((item) => item.id === 'high'), 2);
  assert.deepEqual(kept, [selected[2]]);
  assert.deepEqual(normalizeFocusRuleChoices({ a: { attributeId: 'STR' }, s: { packageId: 'bad' } }, kept), { s: { packageId: 'bad' } });
});

test('static attacks and saves alter derived numbers; conditional effects stay outside the targets', () => {
  const warlike = evaluateCharacter({ ...draft(), focus: ['warlike1'], focusBonusChoices: { warlike1: { 2: ['STR'], 3: ['INT', 'WIS'] } } });
  assert.equal(warlike.derived.baseAttackBonus, 1);
  assert.equal(warlike.derived.focusAttackBonus, 1);
  assert.equal(warlike.derived.attackBonus, 2);
  const usagi = evaluateCharacter({ ...draft(), focus: ['usagi_beastfolk1'], focusBonusChoices: { usagi_beastfolk1: { 0: ['sneak'], 2: ['CON'] } } });
  assert.equal(usagi.valid, true);
  assert.equal(usagi.derived.luckSave, 14);
  assert.equal(usagi.derived.physicalSave, 13);
  assert.equal(usagi.derived.evasionSave, 13);
  assert.ok(usagi.focusRuleNotes.some((note) => note.text.includes('Once per week')));
  const laborer = evaluateCharacter({ ...draft(), focus: ['laborer1'] });
  assert.equal(laborer.derived.mentalSave, 16);
  assert.equal(laborer.derived.saveBonuses.mental, 0);
  assert.deepEqual(laborer.savingThrows.conditional.map((source) => source.saves), [{ mental: -2 }]);
  assert.equal(laborer.savingThrows.conditional[0]!.condition, '정신에 영향을 미치는 효과에 대항할 때');
  const bison = evaluateCharacter({ ...draft(), focus: ['focus_0291'] });
  assert.equal(bison.derived.encumbranceStrengthBonus, 4);
  assert.equal(bison.derived.systemStrainMaxBonus, 2);
  assert.equal(bison.attributes.STR, 14);
});

test('malformed score and static bonus metadata never changes scores or derived values', () => {
  for (const bad of [{ score_effect: { kind: 'raise_to', value: 25, tags: ['phys'], optional: true } },
    { score_effect: { kind: 'raise_to', value: 14, tags: [], optional: true } },
    { derived_bonus: { saves: { unknown: 2 } } }, { derived_bonus: { attack: 1.5 } },
    { derived_bonus: { base_attack_bonus: 1.5 } }, { derived_bonus: { base_attack_bonus: Number.MAX_SAFE_INTEGER + 1 } }]) {
    const focus = { id: 'bad', name: 'Bad metadata', requirements: [], bonus: [], ...bad } as unknown as FocusOption;
    const result = evaluateFocusCreation({ instances: [instance('bad')], ruleChoices: { bad: { attributeId: 'CON' } },
      foci: [focus], classes: warrior, baseLimit: 3, skills, attributes, scores: draft().attributes });
    assert.equal(result.complete, false);
    assert.deepEqual(result.scores, draft().attributes);
    assert.equal(result.derived.attack, 0);
    assert.equal(result.derived.baseAttackBonusAdjustment, 0);
    assert.ok(Object.values(result.derived.saves).every((value) => value === 0));
  }
});

const typedBudget: FocusAllowance[] = [{ id: 'warrior', val: 1 }, { id: 'expert', val: 1 }, { id: 'free', val: 1 }];
const allowanceFocus = (id: string, tags: string[]) => ({ id, name: id, tags, bonus: [], requirements: [] });

test('every active progression preserves its typed grant counts', () => {
  const progressions = data<Array<{ id: string; focus: FocusAllowance[] }>>('progression_tables');
  for (const table of progressions.filter((item) => item.id !== 'am+e')) {
    const catalogue = table.focus.flatMap((grant) => Array.from({ length: grant.val }, (_, index) =>
      allowanceFocus(`${grant.id}_${index}`, grant.id === 'warrior' ? ['combat'] : grant.id === 'expert' ? ['non-combat'] : [])));
    const result = evaluateFocusInstances(catalogue.map((focus) => instance(focus.id)), undefined, catalogue, [], table.focus);
    assert.equal(result.complete, true, table.id);
    assert.equal(result.limit, table.focus.reduce((sum, grant) => sum + grant.val, 0));
    assert.ok(result.allowances.counts.every((count) => count.used === count.total));
  }
});

test('typed matching reassigns dual-tag picks and does not depend on selection order', () => {
  const catalogue = [allowanceFocus('dual', ['combat', 'non-combat']), allowanceFocus('combat', ['combat']), allowanceFocus('plain', [])];
  for (const ids of [['dual', 'combat', 'plain'], ['plain', 'combat', 'dual'], ['combat', 'dual', 'plain']]) {
    const result = evaluateFocusAllowances(ids.map((id) => instance(id)), catalogue, typedBudget);
    assert.equal(result.complete, true);
    assert.deepEqual(Object.fromEntries(result.assignments.map((item) => [item.instanceId, item.type])), { dual: 'expert', combat: 'warrior', plain: 'free' });
    assert.equal(new Set(result.assignments.map((item) => item.instanceId)).size, 3);
  }
});

test('untagged and spell-only foci cannot spend restricted picks; malformed allowances fail closed', () => {
  const catalogue = [allowanceFocus('plain', []), allowanceFocus('spell', ['spell']), allowanceFocus('combat', ['combat'])];
  const budget = [{ id: 'warrior', val: 1 }, { id: 'free', val: 1 }];
  for (const ids of [['plain', 'spell'], ['spell', 'plain']]) {
    const result = evaluateFocusInstances(ids.map((id) => instance(id)), undefined, catalogue, [], budget);
    assert.equal(result.complete, false);
    assert.equal(result.instances.length, result.limit);
    assert.equal(result.allowances.counts.find((count) => count.type === 'warrior')!.remaining, 1);
    assert.deepEqual(result.applied, []);
  }
  for (const invalid of [[{ id: 'unknown', val: 1 }], [{ id: 'free', val: -1 }], [{ id: 'free', val: 0.5 }]]) {
    const result = evaluateFocusAllowances([instance('plain')], catalogue, invalid);
    assert.equal(result.complete, false);
    assert.deepEqual(result.assignments, []);
  }
});

test('UI and API reject a third non-combat focus with only a warrior pick remaining', () => {
  const selected = [instance('developed_attribute1', 'a'), instance('specialist1', 'b'), instance('specialist1', 'c')];
  const option = foci.find((item) => item.id === 'specialist1')!;
  assert.equal(evaluateFocusInstances(selected.slice(0, 2), undefined, foci, warrior, typedBudget).complete, true);
  const reasons = focusInstanceLockReasons(option, selected.slice(0, 2), foci, warrior, classes, typedBudget);
  assert.ok(reasons.some((reason) => reason.includes('compatible focus allowance')));
  const result = evaluateCharacter({ ...draft(), focusInstances: selected,
    focusBonusChoices: { a: { 0: ['STR'] }, b: { 0: ['know'] }, c: { 0: ['connect'] } } });
  assert.equal(result.focusSelection.complete, false);
  assert.equal(result.focusSelection.allowances.counts.find((count) => count.type === 'warrior')!.remaining, 1);
  assert.equal(result.focusModifierBonuses.STR, 0);
  assert.equal(result.skillStates.know?.allotments, 0);
});

test('Penal adds free allowances and removal reprunes by type rather than total count', () => {
  const selected = [instance('penal1', 'p'), instance('specialist1', 's1'), instance('specialist1', 's2'), instance('alert1', 'a'), instance('armsmaster1', 'c')];
  const result = evaluateFocusInstances(selected, undefined, foci, warrior, typedBudget);
  assert.equal(result.complete, true);
  assert.deepEqual(result.allowances.counts.find((count) => count.type === 'free'), { type: 'free', total: 3, used: 3, remaining: 0 });
  const kept = removeFocusInstance(selected, 'p', foci, warrior, typedBudget);
  assert.deepEqual(kept.map((item) => item.instanceId), ['s1', 's2', 'c']);
  assert.equal(evaluateFocusInstances(kept, undefined, foci, warrior, typedBudget).complete, true);
});

test('class-budget changes remove higher-level upgrades and keep compatible first-level instances', () => {
  const selected = [instance('alert1', 'a'), instance('alert2', 'u', 'a'), instance('specialist1', 's')];
  const kept = pruneFocusInstances(selected, foci, warrior, typedBudget);
  assert.deepEqual(kept.map((item) => item.instanceId), ['a', 's']);
  const mageBudget = [{ id: 'free', val: 1 }];
  assert.deepEqual(pruneFocusInstances(kept, foci, classes.filter((item) => item.id === 'high'), mageBudget).map((item) => item.instanceId), ['a']);
});

test('Wrathful Mountain keeps only its level-1 adjustment when an invalid saved upgrade is present', () => {
  const root = instance('wrathful_mountain_style1', 'mountain');
  const upgrade = instance('wrathful_mountain_style2', 'upgrade', 'mountain');
  const source = { ...draft(), classChoices: ['warrior', 'warrior'], focusBonusChoices: { mountain: { 0: ['punch'] } } };
  for (const selected of [[root], [root, upgrade], JSON.parse(JSON.stringify([root, upgrade])) as FocusInstance[]]) {
    const result = evaluateCharacter({ ...source, focusInstances: selected });
    assert.equal(result.focusSelection.complete, selected.length === 1, result.issues.join('\n'));
    if (selected.length > 1) assert.ok(result.issues.some((issue) => issue.includes('only level-1')));
    assert.equal(result.derived.progressionAttackBonus, 1);
    assert.equal(result.derived.baseAttackBonusAdjustment, -2);
    assert.equal(result.derived.baseAttackBonus, -1);
    assert.equal(result.derived.focusAttackBonus, 0);
    assert.equal(result.derived.attackBonus, -1);
    assert.deepEqual(result.derived.baseAttackAdjustments, [{ instanceId: 'mountain', focusId: root.focusId, value: -2 }]);
  }
  const removed = removeFocusInstance([root, upgrade], 'mountain', foci, warrior, typedBudget);
  assert.deepEqual(removed, []);
  assert.equal(evaluateCharacter({ ...source, focusInstances: removed }).derived.baseAttackBonus, 1);
  const invalidClass = evaluateCharacter({ ...source, classChoices: ['expert', 'expert'], focusInstances: [root] });
  assert.equal(invalidClass.derived.baseAttackBonusAdjustment, 0);
  const overBudget = evaluateCharacter({ ...source, focusInstances: [root, instance('developed_attribute1', 'a'), instance('developed_attribute1', 'b')] });
  assert.equal(overBudget.derived.baseAttackBonusAdjustment, 0);
});

test('ordinary focus attack bonuses stay separate from direct base adjustments', () => {
  const result = evaluateCharacter({ ...draft(), focusInstances: [instance('wrathful_mountain_style1', 'mountain'), instance('warlike1', 'warlike')],
    focusBonusChoices: { mountain: { 0: ['punch'] }, warlike: { 2: ['STR'], 3: ['INT', 'WIS'] } } });
  assert.equal(result.focusSelection.complete, true);
  assert.equal(result.derived.baseAttackBonus, -1);
  assert.equal(result.derived.focusAttackBonus, 1);
  assert.equal(result.derived.attackBonus, 0);
});
