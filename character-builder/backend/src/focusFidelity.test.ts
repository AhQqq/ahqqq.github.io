import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { focusInstanceLockReasons } from '../../frontend/src/focusSelection.js';
import type { FocusClass, FocusOption } from '../../frontend/src/focusSelection.js';
import { eligibleSelectedFoci, evaluateFocusBonuses, modifierLimitText, normalizeFocusBonusChoices } from '../../shared/focusBonuses.js';
import type { FocusBonus, FocusData } from '../../shared/focusBonuses.js';
import { evaluateFocusInstances, pruneFocusInstances } from '../../shared/focusCreation.js';

function data<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
}
const foci = data<FocusOption[]>('foci');
const skills = data<Array<{ id: string; tags: string[] }>>('skills');
const attributes = data<Array<{ id: string; tags: string[] }>>('attributes');
const classes = data<FocusClass[]>('classes');
const warrior = classes.filter((item) => item.id === 'warrior');
const focus = (id: string) => foci.find((item) => item.id === id)!;
const zero = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
const evaluate = (ids: string[], choices: unknown = {}, base: Record<string, number> = {}) =>
  evaluateFocusBonuses(ids.map(focus), choices, skills, attributes, base);
const character = () => ({
  ...createArrayAllocation(), name: 'Test character', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: ['warrior', 'expert'], focus: [] as string[], focusBonusChoices: {}, freeSkill: 'administer',
  startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});

test('Developed Attribute separates the modifier increase from its absolute cap override', () => {
  const choices = { developed_attribute1: { 0: ['STR'] } };
  for (const base of [-2, -1, 0, 1, 2]) {
    const result = evaluate(['developed_attribute1'], choices, { STR: base });
    assert.equal(result.complete, true);
    assert.equal(result.modifierBonuses.STR, 1);
    assert.deepEqual(result.details[0]?.modifierChanges, [{ id: 'STR', value: 1 }]);
    assert.deepEqual(result.details[0]?.capOverrides, [{ id: 'STR', max: 3 }]);
    assert.deepEqual(result.modifierCaps.STR, { min: -2, max: 3 });
    assert.equal(result.details[0]?.choices[0]?.limits, 'maximum +3');
  }
});

test('Automatons and Penal penalties stop at their encoded floors', () => {
  for (const [id, floor, penalty] of [['automatons1', -2, -1], ['penal1', -3, -2]] as const) {
    const choices = { [id]: { 0: ['CHA'] } };
    assert.equal(evaluate([id], choices, { CHA: 0 }).modifierBonuses.CHA, penalty);
    assert.equal(evaluate([id], choices, { CHA: floor + 1 }).modifierBonuses.CHA, -1);
    assert.equal(evaluate([id], choices, { CHA: -2 }).modifierBonuses.CHA, floor + 2);
    assert.deepEqual(evaluate([id], choices).modifierCaps.CHA, { min: floor, max: 2 });
    assert.equal(evaluate([id]).complete, false);
  }
});

test('Laborer grants Exert and correct signed contributions with attribute-specific cap overrides', () => {
  const result = evaluate(['laborer1']);
  assert.equal(result.complete, true);
  assert.deepEqual(result.skills, ['exert']);
  assert.deepEqual(result.modifierBonuses, { ...zero, STR: 1, CON: 1, INT: -1, WIS: -1, CHA: -1 });
  const capped = evaluate(['laborer1'], {}, { STR: 2, CON: 1, INT: -2, WIS: -1, CHA: -2 });
  assert.deepEqual(capped.modifierBonuses, { ...zero, STR: 1, CON: 1, WIS: -1 });
  assert.deepEqual(capped.modifierContributions, result.modifierContributions);
});

test('caps apply after all contributions, independent of focus order, and reset on removal', () => {
  const choices = { orcs1: { 1: ['stab'] } };
  const base = { ...zero, STR: 2, CON: 2 };
  const capped = evaluate(['orcs1', 'laborer1'], choices, base);
  assert.equal(capped.modifierBonuses.STR, 1);
  assert.equal(capped.modifierBonuses.CON, 1);
  assert.deepEqual(capped.details[1]?.modifierChanges.filter((change) => change.id === 'STR'), [{ id: 'STR', value: 1 }]);
  assert.equal(capped.modifierContributions.STR, 2);
  assert.equal(evaluate(['laborer1'], choices, base).modifierBonuses.STR, 1);
  const reversed = evaluate(['laborer1', 'orcs1'], choices, base);
  assert.deepEqual(reversed.modifierBonuses, capped.modifierBonuses);
  assert.deepEqual(reversed.modifierCaps, capped.modifierCaps);
  const withoutException = evaluate(['orcs1'], choices, base);
  assert.equal(withoutException.modifierBonuses.STR, 0);
  assert.deepEqual(withoutException.modifierCaps.STR, { min: -2, max: 2 });
  assert.deepEqual(evaluate([], choices, base).modifierBonuses, zero);
  assert.deepEqual(base, { ...zero, STR: 2, CON: 2 });
});

test('Warlike requires one physical and two distinct INT/WIS/CHA choices', () => {
  const pending = evaluate(['warlike1']);
  assert.equal(pending.complete, false);
  assert.deepEqual(pending.modifierBonuses, zero);
  assert.deepEqual(pending.skills, ['punch', 'stab']);
  assert.deepEqual(pending.details[0]?.choices.map((choice) => choice.options),
    [['STR', 'DEX', 'CON'], ['INT', 'WIS', 'CHA'], ['INT', 'WIS', 'CHA']]);
  const valid = evaluate(['warlike1'], { warlike1: { 2: ['DEX'], 3: ['INT', 'CHA'] } });
  assert.equal(valid.complete, true);
  assert.deepEqual(valid.modifierBonuses, { ...zero, DEX: 1, INT: -1, CHA: -1 });
  for (const negative of [['INT', 'INT'], ['STR', 'CHA'], ['WIS']]) {
    const invalid = evaluate(['warlike1'], { warlike1: { 2: ['CON'], 3: negative } });
    assert.equal(invalid.complete, false);
    assert.ok(invalid.details[0]!.issues.length > 0);
    assert.ok(invalid.modifierBonuses.INT! >= -1);
  }
});

test('bison modifiers are fixed and stale saved choices cannot reverse them', () => {
  const result = evaluate(['focus_0291'], { focus_0291: { 1: ['DEX'], 2: ['STR'] } });
  assert.equal(result.complete, true);
  assert.deepEqual(result.modifierBonuses, { ...zero, STR: 1, DEX: -1 });
  assert.deepEqual(result.details[0]?.choices, []);
});

test('rat modifiers only allow DEX/WIS bonuses and STR/CON penalties', () => {
  const pending = evaluate(['focus_0351']);
  assert.deepEqual(pending.details[0]?.choices.map((choice) => choice.options), [['DEX', 'WIS'], ['STR', 'CON']]);
  const valid = evaluate(['focus_0351'], { focus_0351: { 1: ['WIS'], 2: ['CON'] } });
  assert.equal(valid.complete, true);
  assert.deepEqual(valid.modifierBonuses, { ...zero, WIS: 1, CON: -1 });
  const stale = evaluate(['focus_0351'], { focus_0351: { 1: ['CON'], 2: ['DEX'] } });
  assert.equal(stale.complete, false);
  assert.deepEqual(stale.modifierBonuses, zero);
});

test('Usagi has fixed DEX and a STR/CON penalty; civilized elves have fixed CON', () => {
  const usagi = evaluate(['usagi_beastfolk1'], { usagi_beastfolk1: { 0: ['sneak'], 1: ['STR'], 2: ['CON'] } });
  assert.equal(usagi.complete, true);
  assert.deepEqual(usagi.modifierBonuses, { ...zero, DEX: 1, CON: -1 });
  assert.deepEqual(usagi.skills, ['sneak']);
  assert.deepEqual(usagi.details[0]?.choices[1]?.options, ['STR', 'CON']);
  const elves = evaluate(['elves_civilized1'], { elves_civilized1: { 2: ['INT'], 3: ['DEX'] } });
  assert.equal(elves.complete, true);
  assert.deepEqual(elves.modifierBonuses, { ...zero, INT: 1, CON: -1 });
  assert.deepEqual(elves.skills, ['know', 'magic']);
  assert.deepEqual(elves.details[0]?.choices[0]?.options, ['DEX', 'INT']);
});

test('Half-Elves and Xenoblooded never apply optional package modifiers automatically', () => {
  const half = evaluate(['elves_half_elves1'], { elves_half_elves1: { 1: ['craft'] } });
  assert.equal(half.complete, true);
  assert.deepEqual(half.skills, ['connect', 'craft']);
  assert.deepEqual(half.modifierBonuses, zero);
  const xeno = evaluate(['xenoblooded1'], { xenoblooded1: { 0: ['STR'] } });
  assert.equal(xeno.complete, true);
  assert.deepEqual(xeno.modifierBonuses, zero);
  assert.equal(focus('elves_half_elves1').packages?.required, false);
  assert.equal(focus('xenoblooded1').packages?.required, true);
});

test('Alchemy is a normal selectable skill and Mundane Alchemy grants one allotment', () => {
  assert.ok(skills.some((skill) => skill.id === 'alchemy'));
  assert.equal(evaluateCharacter(character()).skillStates.alchemy?.level, -1);
  const chosen = evaluateCharacter({ ...character(), freeSkill: 'alchemy' });
  assert.equal(chosen.skillStates.alchemy?.level, 0);
  const granted = evaluateCharacter({ ...character(), focus: ['mundane_alchemy1'] });
  assert.equal(granted.valid, true, granted.issues.join('\n'));
  assert.equal(granted.skillStates.alchemy?.level, 0);
  const twice = evaluateCharacter({ ...character(), focus: ['mundane_alchemy1'], freeSkill: 'alchemy' });
  assert.equal(twice.skillStates.alchemy?.level, 1);
  const third = evaluateCharacter({ ...character(), classChoices: ['warrior', 'wise'],
    classBonusChoices: { wise: { 0: ['alchemy'] } }, focus: ['mundane_alchemy1'], freeSkill: 'alchemy' });
  assert.equal(third.skillStates.alchemy?.allotments, 2);
  assert.ok(third.skillIssues.some((issue) => issue.key === 'free-skill'));
  assert.ok(evaluate(['specialist1']).details[0]?.choices[0]?.options.includes('alchemy'));
});

test('Specialist still excludes all combat skills and Magic', () => {
  const allowed = evaluate(['specialist1']).details[0]!.choices[0]!.options;
  for (const id of ['magic', 'stab', 'shoot', 'punch']) assert.equal(allowed.includes(id), false);
  assert.equal(allowed.includes('know'), true);
});

test('Developed Attribute excludes every mage archetype in frontend and API', () => {
  for (const option of classes.filter((item) => item.archetype === 'mage')) {
    assert.deepEqual(eligibleSelectedFoci(['developed_attribute1'], foci, [option]), []);
    assert.deepEqual(pruneFocusInstances([{ instanceId: 'developed', focusId: 'developed_attribute1' }], foci, [option], 3), []);
    assert.ok(focusInstanceLockReasons(focus('developed_attribute1'), [], foci, [option], classes, 3).includes('선택 불가 클래스: 마법사'));
    const result = evaluateCharacter({ ...character(), classChoices: ['warrior', option.id],
      focus: ['developed_attribute1'], focusBonusChoices: { developed_attribute1: { 0: ['STR'] } } });
    assert.equal(result.focusModifierBonuses.STR, 0);
    assert.ok(result.issues.some((issue) => issue.startsWith('Focus requirements not met')));
  }
  assert.equal(eligibleSelectedFoci(['developed_attribute1'], foci, warrior).length, 1);
});

test('Penal and Developed Attribute are mutually exclusive in either selection order', () => {
  for (const [first, second] of [['penal1', 'developed_attribute1'], ['developed_attribute1', 'penal1']] as const) {
    const selected = [{ instanceId: 'first', focusId: first }];
    assert.equal(evaluateFocusInstances([...selected, { instanceId: 'second', focusId: second }], undefined, foci, warrior, 3).complete, false);
    assert.ok(focusInstanceLockReasons(focus(second), selected, foci, warrior, classes, 3).includes(`함께 선택 불가: ${focus(first).name} 1레벨`));
    const result = evaluateCharacter({ ...character(), focus: [first, second],
      focusBonusChoices: { penal1: { 0: ['CHA'] }, developed_attribute1: { 0: ['STR'] } } });
    assert.deepEqual(result.focusModifierBonuses, zero);
    assert.equal(result.valid, false);
  }
});

test('saved bonus choices discard removed and converted-to-fixed indices without inventing replacements', () => {
  const source = {
    focus_0291: { 1: ['DEX'], 2: ['STR'] },
    usagi_beastfolk1: { 0: ['exert', 'sneak'], 1: ['STR'], 2: ['DEX'] },
    xenoblooded1: { 0: ['STR'] }, ghoul1: { 1: ['STR'] },
    warlike1: { 2: ['CON'], 3: ['INT', 42, 'CHA'] },
  };
  const normalized = normalizeFocusBonusChoices(source, ['focus_0291', 'usagi_beastfolk1', 'xenoblooded1', 'warlike1'], foci);
  assert.deepEqual(normalized, { usagi_beastfolk1: { 0: ['exert'], 2: ['DEX'] }, warlike1: { 2: ['CON'], 3: ['INT', ''] } });
  assert.equal(evaluate(['usagi_beastfolk1'], normalized).complete, false);
  for (const malformed of [undefined, null, [], 1, { warlike1: [] }]) {
    assert.deepEqual(normalizeFocusBonusChoices(malformed, ['warlike1'], foci), {});
  }
  assert.equal(source.usagi_beastfolk1[0].length, 2);
});

test('missing values and invalid modifier bounds fail closed rather than guessing rules', () => {
  const bonuses: FocusBonus[] = [
    { action: 'attribute_modifier', id: 'STR' },
    { action: 'attribute_modifier', id: 'STR', value: 1, cap_override: { max: 2.5 } },
    { action: 'attribute_modifier', id: 'STR', value: -1, cap_override: { min: Number.NaN } },
    { action: 'attribute_modifier', id: 'STR', value: 1, cap_override: { min: 3, max: 2 } },
    { action: 'attribute_modifier', id: 'STR', value: 1, cap_override: { max: 1 } },
    { action: 'attribute_modifier', id: 'STR', value: 1, cap_override: {} },
  ];
  for (const bonus of bonuses) {
    const synthetic: FocusData = { id: 'invalid', name: 'Invalid', requirements: [], bonus: [bonus] };
    const result = evaluateFocusBonuses([synthetic], {}, skills, attributes);
    assert.equal(result.complete, false);
    assert.deepEqual(result.modifierBonuses, zero);
    assert.equal(result.details[0]?.issues.length, 1);
  }
  assert.equal(modifierLimitText({ action: 'attribute_modifier', cap_override: { min: -3, max: 3 } }), 'minimum -3, maximum +3');
});

test('API derived values use actual capped modifiers without changing scores', () => {
  const draft = { ...character(), attributeMethod: 'rolled',
    attributes: { STR: 18, DEX: 18, CON: 18, INT: 18, WIS: 18, CHA: 18 },
    focus: ['developed_attribute1'], focusBonusChoices: { developed_attribute1: { 0: ['CON'] } } };
  const result = evaluateCharacter(draft);
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.attributes, draft.attributes);
  assert.equal(result.baseModifiers.CON, 2);
  assert.equal(result.focusModifierBonuses.CON, 1);
  assert.equal(result.modifiers.CON, 3);
  assert.equal(result.derived.hitPoints, 6 + 2 + 3);
  assert.equal(result.derived.physicalSave, 12);
  assert.equal(result.derived.evasionSave, 13);
  assert.equal(result.modifiers.DEX, 2);
  assert.equal(result.derived.ac, 12);
  assert.deepEqual(result.focusBonuses[0]?.modifierChanges.find((change) => change.id === 'CON'), { id: 'CON', value: 1 });
  assert.deepEqual(result.modifierCaps.CON, { min: -2, max: 3 });
  assert.equal(result.focusModifierContributions.CON, 1);
});

test('static effects are automated while conditional effects remain readable play notes', () => {
  const base = evaluateCharacter(character());
  const warlike = evaluateCharacter({ ...character(), focus: ['warlike1'],
    focusBonusChoices: { warlike1: { 2: ['STR'], 3: ['INT', 'WIS'] } } });
  assert.equal(warlike.derived.baseAttackBonus, base.derived.baseAttackBonus);
  assert.equal(warlike.derived.attackBonus, base.derived.baseAttackBonus + 1);
  assert.ok(warlike.focusRuleNotes.some((note) => note.text.includes('social checks')));
  const penal = evaluateCharacter({ ...character(), focus: ['penal1'], focusBonusChoices: { penal1: { 0: ['CHA'] } } });
  assert.equal(penal.valid, true, penal.issues.join('\n'));
  assert.equal(penal.derived.focusLimit, base.derived.focusLimit + 2);
  assert.equal(penal.derived.luckSave, 13);
  assert.deepEqual(base.focusBonuses, []);
  const deep = evaluateCharacter({ ...character(), focus: ['deepfolk1'], focusRuleChoices: { deepfolk1: { attributeId: 'none' } } });
  assert.deepEqual(deep.attributes, base.attributes);
  assert.ok(deep.focusRuleNotes.some((note) => note.text.includes('Sunlight')));
});
