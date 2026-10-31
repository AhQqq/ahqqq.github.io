import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { evaluateCharacterWithData } from '../../shared/characterEvaluation.js';
import { evaluateCreationEffects, progressionForClasses } from '../../shared/characterCreation.js';
import { evaluateAttributes } from '../../shared/attributes.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
import { readFocusInstances } from '../../shared/focusCreation.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { restoreAttributeAllocation } from '../../frontend/src/attributeAllocation.js';
import type { AttributeAllocation } from '../../frontend/src/attributeAllocation.js';
import { baseDraft, characterDraftCases } from './fixtures/characterDrafts.js';

const data = readCharacterData();
const cases = characterDraftCases();

test('preview and API agree on shared calculations for every normalized fixture, class pair and focus', () => {
  let checked = 0;
  for (const [name, draft] of cases) {
    if (!evaluateAttributes(draft).complete || !Array.isArray(draft.classChoices) ||
        draft.classChoices.length !== 2 || draft.classChoices.some((id) => typeof id !== 'string')) continue;
    const parsed = readFocusInstances(draft.focusInstances, draft.focus, data.FOCI);
    if (parsed.issues.length) continue;
    const preview = { ...draft, ...restoreAttributeAllocation(draft as Partial<AttributeAllocation>), classChoices: draft.classChoices as string[],
      focusInstances: parsed.instances };
    const core = evaluatePreviewCore(preview, data);
    const effects = evaluateCreationEffects(preview, data, core, evaluateClassChoices(preview.classChoices, data.CLASSES));
    const api = evaluateCharacter(draft);
    assert.deepEqual(core.focusCreation.scores, api.attributes, name);
    assert.deepEqual(core.backgroundAttributes.attributes, api.backgroundAttributes, name);
    assert.deepEqual(core.backgroundAttributes.bonuses, api.backgroundAttributeBonuses, name);
    assert.deepEqual(core.focusCreation.bonuses.details, api.focusBonuses, name);
    assert.deepEqual(core.focusCreation.bonuses.modifierCaps, api.modifierCaps, name);
    assert.deepEqual(core.focusCreation.instances, api.focusSelection.instances, name);
    assert.deepEqual(core.focusCreation.grantedInstances, api.focusSelection.grantedInstances, name);
    assert.deepEqual(core.focusCreation.refundedInstances, api.focusSelection.refundedInstances, name);
    assert.deepEqual(core.focusCreation.allowances, api.focusSelection.allowances, name);
    assert.deepEqual(core.skillAllocation.states, api.skillStates, name);
    assert.deepEqual(core.skillAllocation.issues, api.skillIssues, name);
    assert.deepEqual(effects.modifiers, api.modifiers, name);
    assert.deepEqual(effects.savingThrows, api.savingThrows, name);
    assert.deepEqual(effects.equipmentInventory, api.equipmentInventory, name);
    assert.deepEqual(effects.abilitySelection, api.abilitySelection, name);
    assert.deepEqual(effects.hitDiceEvaluation, api.hitDiceEvaluation, name);
    assert.equal(effects.hitPoints, api.derived.hitPoints, name);
    assert.equal(effects.baseAttackBonus, api.derived.baseAttackBonus, name);
    assert.deepEqual(effects.focusTraditions, api.focusTraditions, name);
    assert.deepEqual(effects.focusEffort, api.focusEffort, name);
    checked++;
  }
  assert.ok(checked >= data.CLASSES.length ** 2 + data.FOCI.length);
});

test('the backend adapter preserves the complete shared response including invalid inputs', () => {
  for (const [name, draft] of cases) {
    assert.deepEqual(evaluateCharacter(draft), evaluateCharacterWithData(draft, data), name);
  }
});

test('evaluation does not mutate a draft or injected catalogues, and repeated calls are stable', () => {
  const freeze = (value: unknown): void => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
  };
  const catalogues = structuredClone(data);
  freeze(catalogues);
  for (const [name, source] of cases.filter(([name]) => !name.startsWith('classes-') && !name.startsWith('focus-'))) {
    const draft = structuredClone(source);
    freeze(draft);
    const first = evaluateCharacterWithData(draft, catalogues);
    assert.deepEqual(evaluateCharacterWithData(draft, catalogues), first, name);
    assert.deepEqual(draft, source, name);
  }
  assert.deepEqual(catalogues, data);
});

test('raw API attributes are validated rather than silently restored as an editor allocation', () => {
  const draft = { ...baseDraft(), attributes: { STR: 99, DEX: 2 } };
  const api = evaluateCharacter(draft);
  const restored = restoreAttributeAllocation(draft as Partial<AttributeAllocation>);
  assert.equal(api.valid, false);
  assert.equal(api.allocatedAttributes.STR, 0);
  assert.equal(api.allocatedAttributes.DEX, 0);
  assert.ok(api.issues.includes('STR must be an integer between 3 and 18.'));
  assert.equal(api.stepStatus.find((step) => step.key === 'attributes')?.complete, false);
  assert.notDeepEqual(api.allocatedAttributes, restored.attributes);
});

test('shared progression lookup keeps ordered-key preference, reverse fallback and ignored am+e', () => {
  const classes = [{ archetype: 'warrior' }, { archetype: 'mage' }];
  const reversed = { id: 'w+m', hd: '1d6', ab: '+0', focus: [] };
  const preferred = { ...reversed, id: 'm+w', ab: '+1' };
  assert.deepEqual(progressionForClasses(classes, [reversed]), { key: 'w+m', progression: reversed });
  assert.equal(progressionForClasses(classes, [reversed, preferred]).progression, preferred);
  assert.equal(progressionForClasses([...classes].reverse(), [preferred]).progression, preferred);
  assert.deepEqual(progressionForClasses([], [preferred]), { key: '', progression: undefined });
  assert.deepEqual(progressionForClasses([{ archetype: 'a' }, { archetype: 'm' }, { archetype: 'e' }],
    [{ ...preferred, id: 'am+e' }]), { key: '', progression: undefined });
});
