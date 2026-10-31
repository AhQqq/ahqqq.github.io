import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { evaluateFocusCreation } from '../../shared/focusCreation.js';
import { focusInstanceLockReasons } from '../../frontend/src/focusSelection.js';
import type { FocusOption } from '../../frontend/src/focusSelection.js';
const data = readCharacterData();
const parent = { instanceId: 'functionary', focusId: 'functionary1' };
const paid = { instanceId: 'paid', focusId: 'specialist1' };
const draft = (skill = 'perform') => ({ ...baseDraft(), ...createArrayAllocation(), classChoices: ['warrior', 'expert'],
  focusInstances: [parent], focusBonusChoices: { functionary: { 0: [skill], 1: ['DEX'] } } });

test('Functionary grants a free bound Specialist with exactly one skill allotment and a modifier penalty', () => {
  const source = draft();
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join(' '));
  const core = evaluatePreviewCore(source, data);
  assert.equal(core.skillAllocation.states.perform?.allotments, 1);
  assert.deepEqual(core.focusCreation.bonuses.skills, ['perform']);
  assert.equal(result.modifiers.DEX, -1);
  assert.equal(result.focusSelection.instances.length, 1);
  assert.equal(result.focusSelection.allowances.assignments.length, 1);
  const grant = result.focusSelection.grantedInstances[0]!;
  assert.equal(grant.focusId, 'specialist1');
  assert.equal(grant.boundSkillId, 'perform');
  assert.deepEqual(grant.grantedBy, [{ kind: 'focus', instanceId: 'functionary', focusId: 'functionary1', name: '기능성 포병종', skillId: 'perform' }]);
  assert.ok(result.focusRuleNotes.some((note) => note.instanceId === grant.instanceId && note.text.includes('perform') && note.text.includes('3d6')));
  assert.ok(result.focusRuleNotes.some((note) => note.text.includes('+1')));
  assert.equal(evaluatePreviewCore(draft('craft'), data).skillAllocation.states.craft?.allotments, 2);
  const capped = evaluateCharacter({ ...draft(), attributeMethod: 'rolled', attributes: { ...draft().attributes, DEX: 3 } });
  assert.equal(capped.modifiers.DEX, -2);
});

test('same-skill paid Specialist refunds even a full budget; other skills remain paid and addable', () => {
  for (const instances of [[paid, parent], [parent, paid]]) {
    const source = { ...draft('craft'), classChoices: ['high', 'high'], focusInstances: instances,
      focusBonusChoices: { ...draft('craft').focusBonusChoices, paid: { 0: ['craft'] } } };
    const result = evaluateCharacter(source);
    assert.equal(result.focusSelection.complete, true, result.focusSelection.issues.join(' '));
    assert.deepEqual(result.focusSelection.instances, [parent]);
    assert.deepEqual(result.focusSelection.refundedInstances, [paid]);
    assert.equal(evaluatePreviewCore(source, data).skillAllocation.states.craft?.allotments, 2);
  }
  const source = { ...draft(), focusInstances: [parent, paid], focusBonusChoices: { ...draft().focusBonusChoices, paid: { 0: ['heal'] } } };
  const result = evaluateCharacter(source);
  assert.equal(result.valid, true, result.issues.join(' '));
  assert.equal(result.focusSelection.instances.length, 2);
  assert.equal(result.focusSelection.grantedInstances.length, 1);
  const option = data.FOCI.find((focus) => focus.id === 'specialist1')! as FocusOption;
  assert.deepEqual(focusInstanceLockReasons(option, [parent], data.FOCI as FocusOption[],
    data.CLASSES.filter((item) => source.classChoices.includes(item.id)), data.CLASSES,
    [{ id: 'free', val: 1 }, { id: 'expert', val: 1 }], result.focusSelection.grantedInstances), []);
});

test('skill changes, persisted refunds and parent removal reconstruct grants without orphaned choices', () => {
  const source = { ...draft('craft'), focusInstances: [paid, parent],
    focusBonusChoices: { ...draft('craft').focusBonusChoices, paid: { 0: ['craft'] } } };
  const result = evaluateCharacter(source);
  const saved = JSON.parse(JSON.stringify({ ...source, focusInstances: result.focusSelection.instances }));
  assert.deepEqual(evaluateCharacter(saved).focusSelection.grantedInstances, result.focusSelection.grantedInstances);
  const changed = evaluateCharacter({ ...saved, focusBonusChoices: { functionary: { 0: ['heal'], 1: ['CON'] } } });
  assert.equal(changed.focusSelection.grantedInstances[0]?.boundSkillId, 'heal');
  assert.equal(changed.focusRuleNotes.some((note) => note.text.includes('Specialist (craft)')), false);
  assert.equal(changed.focusSelection.instances.length, 1);
  const removed = evaluateCharacter({ ...saved, focusInstances: [] });
  assert.deepEqual(removed.focusSelection.grantedInstances, []);
  assert.deepEqual(removed.focusRuleNotes, []);
  assert.equal(removed.modifiers.DEX, 0);
  const legacy = evaluateCharacter({ ...draft(), focusInstances: undefined, focus: ['functionary1'],
    focusBonusChoices: { functionary1: { 0: ['perform'], 1: ['DEX'] } } });
  assert.equal(legacy.focusSelection.grantedInstances[0]?.boundSkillId, 'perform');
});

test('invalid skills, unavailable parents and forged bindings cannot grant Specialist', () => {
  for (const choices of [[], [''], ['magic'], ['stab'], ['punch'], ['shoot'], ['missing'], ['heal', 'craft']]) {
    const result = evaluateCharacter({ ...draft(), focusBonusChoices: { functionary: { 0: choices, 1: ['DEX'] } } });
    assert.equal(result.valid, false);
    assert.deepEqual(result.focusSelection.grantedInstances, []);
  }
  for (const changed of [ { classChoices: ['healer', 'healer'] },
    { focusInstances: [parent, { ...parent, instanceId: 'duplicate' }] },
    { focusInstances: [parent, { instanceId: 'dwarf', focusId: 'dwarves1' }] },
    { classChoices: ['high', 'high'], focusInstances: [{ instanceId: 'alert', focusId: 'alert1' }, parent] }]) {
    assert.deepEqual(evaluateCharacter({ ...draft(), ...changed }).focusSelection.grantedInstances, []);
  }
  const result = evaluateCharacter({ ...draft(), focusBonusChoices: { ...draft().focusBonusChoices,
    'focus-skill:functionary:specialist1': { 0: ['magic'] } } });
  assert.equal(result.focusSelection.grantedInstances[0]?.boundSkillId, 'perform');
});

test('paid duplicate skills stay invalid and the granted focus never unlocks level 2', () => {
  const duplicate = { instanceId: 'other', focusId: 'specialist1' };
  const result = evaluateCharacter({ ...draft(), focusInstances: [parent, paid, duplicate],
    focusBonusChoices: { ...draft().focusBonusChoices, paid: { 0: ['heal'] }, other: { 0: ['heal'] } } });
  assert.equal(result.focusSelection.complete, false);
  const upgrade = evaluateCharacter({ ...draft(), focusInstances: [parent,
    { instanceId: 'upgrade', focusId: 'specialist2', parentInstanceId: 'focus-skill:functionary:specialist1' }] });
  assert.equal(upgrade.valid, false);
  assert.equal(upgrade.focusSelection.grantedInstances.length, 1);
  assert.ok(upgrade.focusSelection.issues.some((issue) => issue.includes('only level-1')));
});

test('invalid grant catalogue metadata is rejected rather than creating unbound or recursive grants', () => {
  for (const rule of [{ focus_id: 'specialist2', bonus_index: 0, skill_allotments: 1 },
    { focus_id: 'missing', bonus_index: 0, skill_allotments: 1 },
    { focus_id: 'specialist1', bonus_index: 1, skill_allotments: 1 }]) {
    const foci = data.FOCI.map((focus) => focus.id === 'functionary1' ? { ...focus, skill_focus_grant: rule } : focus) as typeof data.FOCI;
    const result = evaluateFocusCreation({ instances: [parent], bonusChoices: draft().focusBonusChoices,
      foci, classes: data.CLASSES.filter((item) => item.id === 'warrior'), baseLimit: 1,
      skills: data.SKILLS, attributes: data.ATTRIBUTES, scores: draft().attributes });
    assert.equal(result.complete, false);
    assert.deepEqual(result.grantedInstances, []);
  }
});
