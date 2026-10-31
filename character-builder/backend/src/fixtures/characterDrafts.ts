import { readFileSync } from 'node:fs';
import type { CharacterInput as Draft } from '../../../shared/characterCreation.js';
export const baseDraft = (): Draft => ({
  name: 'Regression', goal: 'Explore', notes: '',
  attributeMethod: 'array', attributes: { STR: 14, DEX: 12, CON: 11, INT: 10, WIS: 9, CHA: 7 }, attributeOverride: '',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: ['warrior', 'expert'], classBonusChoices: {},
  focusInstances: [{ instanceId: 'alert', focusId: 'alert1' }], focusBonusChoices: {}, focusRuleChoices: {},
  freeSkill: 'administer', spellChoicesByClassSlot: [[], []], artChoicesByClass: {},
  startingEquipment: { method: 'package', packageId: 'armored_warrior' }, equipmentPurchases: [],
  equipmentLoadout: { armorId: '', shieldId: '', weaponId: '' },
});

export function characterDraftCases(): Array<[string, Draft]> {
  const base = baseDraft();
  const cases: Array<[string, Draft]> = [
    ['unfinished', {}],
    ['base', base],
    ['growth-and-override', { ...base, attributeMethod: 'rolled', attributeOverride: 'CON',
      backgroundMethod: 'roll', backgroundRollTables: ['growth', 'growth', 'growth'],
      backgroundRollResults: [{ table: 'growth', roll: 2, choiceId: 'CON' },
        { table: 'growth', roll: 3, choiceId: 'DEX' }, { table: 'growth', roll: 4, choiceId: 'WIS' }] }],
    ['modifier-cap', { ...base, attributeMethod: 'rolled', attributes: { ...base.attributes, DEX: 18 },
      focusInstances: [{ instanceId: 'developed', focusId: 'developed_attribute1' }],
      focusBonusChoices: { developed: { 0: ['DEX'] } } }],
    ['deepfolk-score', { ...base, focusInstances: [{ instanceId: 'deep', focusId: 'deepfolk1' }],
      focusRuleChoices: { deep: { attributeId: 'CON' } } }],
    ['penal-picks', { ...base, focusInstances: [{ instanceId: 'penal', focusId: 'penal1' },
      { instanceId: 'alert', focusId: 'alert1' }, { instanceId: 'specialist', focusId: 'specialist1' }],
      focusBonusChoices: { penal: { 0: ['CHA'] }, specialist: { 0: ['know'] } },
      focusRuleChoices: { penal: { retainedAttribute: 'STR' } } }],
    ['repeatable-skills', { ...base, focusInstances: [{ instanceId: 'a', focusId: 'specialist1' },
      { instanceId: 'b', focusId: 'specialist1' }], focusBonusChoices: { a: { 0: ['know'] }, b: { 0: ['connect'] } } }],
    ['repeatable-duplicate', { ...base, focusInstances: [{ instanceId: 'a', focusId: 'specialist1' },
      { instanceId: 'b', focusId: 'specialist1' }], focusBonusChoices: { a: { 0: ['know'] }, b: { 0: ['know'] } } }],
    ['unfunded-focus', { ...base, classChoices: ['high', 'high'],
      focusInstances: [{ instanceId: 'a', focusId: 'alert1' }, { instanceId: 'b', focusId: 'lucky1' }] }],
    ['legacy-focus', { ...base, focusInstances: undefined, focus: ['alert1', 'alert2', 'alert1', 'missing'] }],
    ['malformed-focus', { ...base, focusInstances: [{ instanceId: '__proto__', focusId: 'alert1' }, null] }],
    ['invalid-attributes', { ...base, attributes: { STR: 99, DEX: 2 }, attributeOverride: 'missing' }],
    ['invalid-class-shape', { ...base, classChoices: { first: 'warrior', second: 'expert' } }],
    ['unknown-class', { ...base, classChoices: ['missing', 'warrior'] }],
    ['extra-class-slot', { ...base, classChoices: ['warrior', 'expert', 'high'] }],
    ['wise-choice', { ...base, classChoices: ['warrior', 'wise'], classBonusChoices: { wise: { 0: ['know'] } } }],
    ['invalid-equipment', { ...base, equipmentPurchases: [{ id: 'missing', count: 1 }],
      equipmentLoadout: { armorId: 'missing', shieldId: 'missing', weaponId: 'missing' } }],
    ['free-focus-refund', { ...base, classChoices: ['mageslayer', 'expert'],
      focusInstances: ['alert1', 'impervious_defense1', 'halfmen1', 'nullifier1'].map((focusId) => ({ instanceId: focusId, focusId })) }],
    ['defense-with-shield', { ...base, focusInstances: [{ instanceId: 'defense', focusId: 'impervious_defense1' }],
      equipmentLoadout: { armorId: 'partial_armor', shieldId: 'large_shield', weaponId: '' } }],
    ['invalid-background-roll', { ...base, backgroundMethod: 'roll', backgroundRollTables: ['growth', 'learn', 'learn'],
      backgroundRollResults: [{ table: 'growth', roll: 99 }, { table: 'learn', roll: 1, choiceId: 'magic' }] }],
    ['invalid-spells', { ...base, classChoices: ['high', 'necro'], spellChoicesByClassSlot: [['missing'], ['missing']] }],
  ];
  for (const mode of ['partial', 'full']) {
    for (const traditionId of ['high', 'elem', 'necro']) {
      cases.push([`tradition-${mode}-${traditionId}`, { ...base,
        classChoices: mode === 'full' ? ['invoker', 'invoker'] : ['warrior', 'invoker'],
        focusInstances: [{ instanceId: 'education', focusId: 'traditional_education1' }],
        focusRuleChoices: { education: { traditionId } } }]);
    }
  }
  const classes = JSON.parse(readFileSync(new URL('../../../frontend/data/classes.json', import.meta.url), 'utf8')) as Array<{ id: string }>;
  for (const a of classes) for (const b of classes) {
    cases.push([`classes-${a.id}-${b.id}`, { ...base, classChoices: [a.id, b.id] }]);
  }
  const foci = JSON.parse(readFileSync(new URL('../../../frontend/data/foci.json', import.meta.url), 'utf8')) as Array<{ id: string }>;
  for (const focus of foci) {
    cases.push([`focus-${focus.id}`, { ...base, focusInstances: [{ instanceId: 'focus', focusId: focus.id }] }]);
  }
  return cases;
}
