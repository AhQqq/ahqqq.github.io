import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter, readCharacterData } from './character.js';
import { baseDraft } from './fixtures/characterDrafts.js';
import { evaluateClassChoices } from '../../shared/classSelection.js';
import { evaluatePreviewCore } from '../../frontend/src/characterPreview.js';
import { evaluateCreationEffects } from '../../shared/characterCreation.js';
import { evaluateCharacterWithData } from '../../shared/characterEvaluation.js';
const data = readCharacterData();
const draft = () => ({ ...baseDraft(), classChoices: ['vowed', 'expert'],
  artChoicesByClass: { vowed: { groups: {}, chosen: ['faultless_awareness'] } } });

test('Martial Style raises every legal Vowed pair to at least d6 without reducing higher HD', () => {
  for (const other of data.CLASSES) for (const pair of [['vowed', other.id], [other.id, 'vowed']]) {
    const classes = evaluateClassChoices(pair, data.CLASSES);
    if (!classes.complete) continue;
    const source = { ...draft(), classChoices: pair };
    const result = evaluateCharacter(source);
    const expected = other.archetype === 'warrior' ? '1d6+2' : '1d6';
    assert.equal(result.derived.hitDice, expected, pair.join('/'));
    assert.equal(result.derived.hitPoints, other.archetype === 'warrior' ? 8 : 6);
    assert.equal(result.derived.hitDiceAdjustments.some((item) => item.abilityId === 'martial_style'), other.archetype === 'mage');
    const core = evaluatePreviewCore(source, data);
    const preview = evaluateCreationEffects(source, data, core, classes);
    assert.equal(preview.hitPoints, result.derived.hitPoints);
    assert.equal(preview.equipmentInventory.armorClass.value, result.derived.ac);
  }
});

test('Unarmored Defense requires neither worn armor nor shield and uses final DEX', () => {
  for (const [armorId, shieldId, expected] of [
    ['', '', 13], ['unarmored', '', 13], ['partial_armor', '', 14], ['', 'large_shield', 14], ['partial_armor', 'large_shield', 15],
  ]) {
    const result = evaluateCharacter({ ...draft(), equipmentLoadout: { armorId, shieldId, weaponId: '' } });
    assert.equal(result.derived.ac, expected);
    assert.equal(result.armorClass.baseSource?.kind === 'art', !shieldId && (!armorId || armorId === 'unarmored'));
  }
  const dex = evaluateCharacter({ ...draft(), attributeMethod: 'rolled', attributes: { STR: 14, DEX: 18, CON: 11, INT: 10, WIS: 9, CHA: 7 } });
  assert.equal(dex.derived.ac, 15);
});

test('alternative base AC competes without stacking and HP still includes final CON and focus bonuses', () => {
  const defense = evaluateCharacter({ ...draft(), focusInstances: [{ instanceId: 'defense', focusId: 'impervious_defense1' }] });
  assert.equal(defense.derived.ac, 16);
  assert.equal(defense.armorClass.baseSource?.id, 'impervious_defense1');
  const dwarf = evaluateCharacter({ ...draft(), classChoices: ['vowed', 'healer'], attributeMethod: 'rolled',
    attributes: { STR: 14, DEX: 12, CON: 18, INT: 10, WIS: 9, CHA: 7 },
    focusInstances: [{ instanceId: 'dwarf', focusId: 'dwarves_21' }] });
  assert.equal(dwarf.derived.hitPoints, 9);
});

test('restoration recomputes defenses and removing Vowed or its grants removes all effects', () => {
  const source = JSON.parse(JSON.stringify({ ...draft(), classChoices: ['vowed', 'healer'], derived: { hitDice: '1d20', ac: 99 } }));
  for (let i=0;i<3;i++) {
    const result = evaluateCharacter(source);
    assert.equal(result.derived.hitDice, '1d6');
    assert.equal(result.derived.ac, 13);
  }
  const removed = evaluateCharacter({ ...source, classChoices: ['high', 'healer'], artChoicesByClass: {} });
  assert.equal(removed.derived.hitDice, '1d6-1');
  assert.equal(removed.derived.ac, 10);
  const invalid = evaluateCharacter({ ...source, classChoices: ['vowed', 'vowed'] });
  assert.equal(invalid.derived.hitDiceAdjustments.length, 0);
  assert.equal(invalid.derived.ac, 10);
  const changed = structuredClone(data);
  const rule = changed.STARTING_ARTS.find((entry) => entry.character_level === 1)!.classes.vowed!.partial!;
  rule.fixed = [];
  const noGrants = evaluateCharacterWithData(source, changed);
  assert.equal(noGrants.derived.hitDice, '1d6-1');
  assert.equal(noGrants.derived.ac, 10);
});
