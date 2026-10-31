import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { readFocusInstances, restoreFocusBonusChoices } from '../../shared/focusCreation.js';
const data = readCharacterData();
const instances = [{ instanceId: 'gnome', focusId: 'gnomes1' }];
const make = (skill: string) => ({ ...baseDraft(), focusInstances: instances,
  focusBonusChoices: { gnome: { 0: [skill], 2: ['STR'] } } });
test('gnome variants replace exactly one skill allotment and disappear on removal', () => {
  for (const skill of ['sneak', 'craft']) {
    const core = evaluatePreviewCore(make(skill), data);
    assert.equal(core.focusCreation.complete, true);
    assert.deepEqual(core.focusCreation.bonuses.skills, [skill]);
    assert.equal(core.focusCreation.bonuses.skillGrants.length, 1);
    assert.equal(core.skillAllocation.states.sneak?.allotments, skill === 'sneak' ? 1 : 0);
    assert.equal(core.skillAllocation.states.craft?.allotments, skill === 'craft' ? 2 : 1);
    assert.equal(core.focusCreation.bonuses.modifierContributions.DEX, 1);
    assert.equal(core.focusCreation.bonuses.modifierContributions.STR, -1);
  }
  const removed = evaluatePreviewCore({ ...make('craft'), focusInstances: [] }, data);
  assert.deepEqual(removed.focusCreation.bonuses.skills, []);
  assert.equal(removed.skillAllocation.states.craft?.allotments, 1);
  for (const choice of [['magic'], [], ['sneak', 'craft']]) {
    const core = evaluatePreviewCore({ ...make('sneak'), focusBonusChoices: { gnome: { 0: choice, 2: ['STR'] } } }, data);
    assert.equal(core.focusCreation.complete, false);
    assert.ok(core.focusCreation.bonuses.skills.length <= 1);
  }
});
test('saved choices survive; legacy fixed Sneak migrates by instance ID and only once', () => {
  for (const skill of ['craft', 'sneak', '']) {
    const saved = JSON.parse(JSON.stringify(make(skill)));
    saved.focusBonusChoices = restoreFocusBonusChoices(saved.focusBonusChoices, instances, data.FOCI);
    assert.deepEqual(saved.focusBonusChoices.gnome[0], [skill]);
    assert.deepEqual(evaluatePreviewCore(saved, data).focusCreation.bonuses.skills, skill ? [skill] : []);
  }
  for (const selected of [instances, readFocusInstances(undefined, ['gnomes1'], data.FOCI).instances]) {
    const id = selected[0]!.instanceId;
    const restored = restoreFocusBonusChoices({ [id]: { 2: ['WIS'] } }, selected, data.FOCI);
    assert.deepEqual(restored[id], { 0: ['sneak'], 2: ['WIS'] });
    assert.deepEqual(restoreFocusBonusChoices(restored, selected, data.FOCI), restored);
  }
  assert.deepEqual(restoreFocusBonusChoices(make('craft').focusBonusChoices, [], data.FOCI), {});
});