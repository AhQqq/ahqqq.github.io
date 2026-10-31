import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { createDataReader } from './dataReader.js';
import { evaluateFocusBonuses, normalizeFocusBonusChoices } from '../../shared/focusBonuses.js';
import type { FocusBonus, FocusData } from '../../shared/focusBonuses.js';

const data = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
const foci = data<FocusData[]>('foci');
const skills = data<Array<{ id: string; tags: string[] }>>('skills');
const attributes = data<Array<{ id: string; tags: string[] }>>('attributes');
const zero = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
const focus = (id: string, ...bonus: FocusBonus[]): FocusData => ({ id, name: id, bonus, requirements: [] });
const evaluate = (selected: FocusData[], choices: unknown = {}, base: Record<string, number> = zero) =>
  evaluateFocusBonuses(selected, choices, skills, attributes, base);
const select = (...ids: string[]) => ids.map((id) => foci.find((item) => item.id === id)!);

test('focus data refreshes after edits without restarting, and invalid JSON never uses stale rules', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'wwn-focus-data-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'foci.json');
  const read = createDataReader();
  const original = { id: 'developed_attribute1', tags: [], max: 2 };
  let revision = 0;
  const save = (contents: string) => {
    writeFileSync(path, contents);
    const time = new Date(1700000000000 + revision++ * 1000);
    utimesSync(path, time, time);
  };
  save(JSON.stringify(original));
  const first = read<typeof original>(directory, 'foci.json');
  assert.deepEqual(first, original);
  assert.equal(read(directory, 'foci.json'), first);

  const changed = { ...original, tags: ['non-combat'], max: 3 };
  save(JSON.stringify(changed));
  assert.deepEqual(read(directory, 'foci.json'), changed);
  const sameSizeEdit = { ...changed, max: 4 };
  save(JSON.stringify(sameSizeEdit));
  assert.deepEqual(read(directory, 'foci.json'), sameSizeEdit);
  save('{');
  assert.throws(() => read(directory, 'foci.json'), SyntaxError);
  assert.throws(() => read(directory, 'foci.json'), SyntaxError);
  save(JSON.stringify(changed));
  assert.deepEqual(read(directory, 'foci.json'), changed);
  rmSync(path);
  assert.throws(() => read(directory, 'foci.json'));
});

test('Developed Attribute uses the expert pick and raises DEX to +3 after background growth', () => {
  const draft = {
    name: 'DEX cap', goal: 'Explore', attributeMethod: 'rolled',
    attributes: { STR: 14, DEX: 15, CON: 12, INT: 11, WIS: 10, CHA: 12 }, attributeOverride: '',
    classChoices: ['warrior', 'expert'], background: 'courier', backgroundSkill: 'survive',
    backgroundMethod: 'roll', backgroundRollTables: ['growth', 'growth', 'growth'],
    backgroundRollResults: Array.from({ length: 3 }, () => ({ table: 'growth', roll: 1, choiceId: 'DEX' })),
    focusInstances: [
      { instanceId: 'assault', focusId: 'shocking_assault1' },
      { instanceId: 'developed', focusId: 'developed_attribute1' },
      { instanceId: 'elf', focusId: 'elves1' },
    ],
    focusBonusChoices: { assault: { 0: ['stab'] }, developed: { 0: ['DEX'] }, elf: { 0: ['stab'] } },
    freeSkill: 'administer', startingEquipment: { method: 'silver', rolls: [1, 1, 1] },
  };
  const result = evaluateCharacter(draft);
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.focusSelection.allowances.assignments, [
    { instanceId: 'assault', type: 'warrior' },
    { instanceId: 'developed', type: 'expert' },
    { instanceId: 'elf', type: 'free' },
  ]);
  assert.equal(result.attributes.DEX, 18);
  assert.equal(result.baseModifiers.DEX, 2);
  assert.equal(result.focusModifierBonuses.DEX, 1);
  assert.deepEqual(result.modifierCaps.DEX, { min: -2, max: 3 });
  assert.equal(result.modifiers.DEX, 3);
  assert.equal(result.derived.ac, 13);
  assert.equal(result.derived.evasionSave, 12);

  const moved = evaluateCharacter({ ...draft, focusBonusChoices: { ...draft.focusBonusChoices, developed: { 0: ['STR'] } } });
  assert.equal(moved.modifierCaps.DEX?.max, 2);
  assert.equal(moved.modifiers.DEX, 2);
  assert.equal(moved.modifierCaps.STR?.max, 3);
  const removed = evaluateCharacter({ ...draft, focusInstances: draft.focusInstances.filter((item) => item.instanceId !== 'developed') });
  assert.equal(removed.modifierCaps.DEX?.max, 2);
  assert.equal(removed.modifiers.DEX, 2);
});

test('all migrated cap metadata preserves bonuses and choices without legacy fields', () => {
  const expected = {
    automatons1: { 0: { min: -2 } },
    chattel1: { 1: { max: 3 } },
    laborer1: { 1: { min: -2 }, 2: { min: -2 }, 3: { min: -2 }, 4: { max: 3 }, 5: { max: 3 } },
    penal1: { 0: { min: -3 } },
    warlike1: { 2: { max: 3 }, 3: { min: -2 } },
    developed_attribute1: { 0: { max: 3 } },
  };
  const actual = Object.fromEntries(foci.filter((item) => item.bonus.some((bonus) => bonus.cap_override))
    .map((item) => [item.id, Object.fromEntries(item.bonus.flatMap((bonus, index) => bonus.cap_override ? [[index, bonus.cap_override]] : []))]));
  assert.deepEqual(actual, expected);
  for (const item of foci) for (const bonus of item.bonus) {
    assert.equal('min_limit' in bonus || 'max_limit' in bonus, false, item.id);
  }
  const choices = { developed_attribute1: { 0: ['DEX'] }, warlike1: { 2: ['STR'], 3: ['INT', 'WIS'] } };
  assert.deepEqual(normalizeFocusBonusChoices(JSON.parse(JSON.stringify(choices)), Object.keys(choices), foci), choices);
});

test('every attribute defaults to -2/+2 even when a bonus has no cap metadata', () => {
  for (const { id } of attributes) for (const value of [-5, -1, 0, 1, 5]) for (const base of [-2, -1, 0, 1, 2]) {
    const result = evaluate([focus('plain', { action: 'attribute_modifier', id, value })], {}, { [id]: base });
    assert.equal(result.complete, true);
    assert.deepEqual(result.modifierCaps[id], { min: -2, max: 2 });
    assert.equal(base + result.modifierBonuses[id]!, Math.max(-2, Math.min(2, base + value)));
    assert.equal(result.modifierContributions[id], value);
  }
});

test('mixed positive and negative contributions cancel before clamping at either boundary', () => {
  const positive = focus('positive', { action: 'attribute_modifier', id: 'STR', value: 1 });
  const negative = focus('negative', { action: 'attribute_modifier', id: 'STR', value: -1 });
  for (const base of [-2, 2]) for (const selected of [[positive, negative], [negative, positive]]) {
    assert.equal(evaluate(selected, {}, { STR: base }).modifierBonuses.STR, 0);
  }
  const together = focus('together', positive.bonus[0]!, negative.bonus[0]!);
  assert.equal(evaluate([together], {}, { STR: 2 }).modifierBonuses.STR, 0);
  assert.equal(evaluate([{ ...together, bonus: [...together.bonus].reverse() }], {}, { STR: 2 }).modifierBonuses.STR, 0);
});

test('two +3 overrides do not produce +4 and neither raises unrelated attribute caps', () => {
  const choices = { developed_attribute1: { 0: ['STR'] } };
  for (const ids of [['laborer1', 'developed_attribute1'], ['developed_attribute1', 'laborer1']]) {
    const result = evaluate(select(...ids), choices, { STR: 2, CON: 2, DEX: 2 });
    assert.equal(result.modifierContributions.STR, 2);
    assert.equal(result.modifierBonuses.STR, 1);
    assert.deepEqual(result.modifierCaps.STR, { min: -2, max: 3 });
    assert.deepEqual(result.modifierCaps.DEX, { min: -2, max: 2 });
  }
});

test('cap-only effects unlock contributions without granting their own modifier points', () => {
  const cap = focus('cap', { action: 'attribute_modifier', id: 'STR', cap_override: { max: 3 } });
  const alone = evaluate([cap]);
  assert.equal(alone.complete, true);
  assert.deepEqual(alone.modifierBonuses, zero);
  assert.deepEqual(alone.details[0]?.modifierChanges, []);
  assert.deepEqual(alone.details[0]?.capOverrides, [{ id: 'STR', max: 3 }]);
  const grant = focus('grant', { action: 'attribute_modifier', id: 'STR', value: 1 });
  for (const selected of [[cap, grant], [grant, cap]]) {
    assert.equal(evaluate(selected, {}, { STR: 2 }).modifierBonuses.STR, 1);
  }
  assert.equal(evaluate([grant], {}, { STR: 2 }).modifierBonuses.STR, 0);
});

test('cap-only choices need one valid target and never leak to other attributes', () => {
  const cap = focus('cap', { action: 'choice_attribute_modifier', count: 1, ids: ['STR', 'DEX'], cap_override: { max: 3 } });
  for (const choices of [undefined, { cap: { 0: ['INT'] } }, { cap: { 0: [null] } }]) {
    const result = evaluate([cap], choices);
    assert.equal(result.complete, false);
    assert.ok(Object.values(result.modifierCaps).every((range) => range.max === 2));
  }
  const resolved = evaluate([cap], { cap: { 0: ['DEX'] } });
  assert.equal(resolved.complete, true);
  assert.deepEqual(resolved.modifierBonuses, zero);
  assert.deepEqual(resolved.modifierCaps.DEX, { min: -2, max: 3 });
  assert.deepEqual(resolved.modifierCaps.STR, { min: -2, max: 2 });
});

test('moving or removing a choice recomputes both contributions and caps after reload', () => {
  const selected = select('orcs1', 'developed_attribute1');
  const base = { STR: 2, DEX: 2 };
  const choices = { orcs1: { 1: ['stab'] }, developed_attribute1: { 0: ['STR'] } };
  assert.equal(evaluate(selected, choices, base).modifierBonuses.STR, 1);
  choices.developed_attribute1[0] = ['DEX'];
  const restored = normalizeFocusBonusChoices(JSON.parse(JSON.stringify(choices)), selected.map((item) => item.id), foci);
  const result = evaluate(selected, restored, base);
  assert.equal(result.modifierBonuses.STR, 0);
  assert.equal(result.modifierBonuses.DEX, 1);
  assert.equal(result.modifierCaps.STR?.max, 2);
  assert.equal(result.modifierCaps.DEX?.max, 3);
  const removed = evaluate(select('orcs1'), restored, base);
  assert.equal(removed.modifierCaps.DEX?.max, 2);
  assert.equal(removed.modifierBonuses.DEX, 0);
});

test('overrides combine by most permissive absolute bounds rather than adding cap increments', () => {
  const narrower = focus('narrower', { action: 'attribute_modifier', id: 'CHA', cap_override: { min: -3, max: 3 } });
  const wider = focus('wider', { action: 'attribute_modifier', id: 'CHA', cap_override: { min: -4, max: 4 } });
  for (const value of [-9, 9]) {
    const grant = focus('grant', { action: 'attribute_modifier', id: 'CHA', value });
    for (const selected of [[narrower, grant, wider], [wider, grant, narrower]]) {
      const result = evaluate(selected);
      assert.deepEqual(result.modifierCaps.CHA, { min: -4, max: 4 });
      assert.equal(result.modifierBonuses.CHA, value < 0 ? -4 : 4);
    }
  }
});

test('malformed cap metadata and legacy fields cannot grant a bonus or unlock a cap', () => {
  for (const cap_override of [null, [], 3, '3', {}, { max: null }, { max: '3' }, { max: 3.1 }, { max: Infinity }, { min: -1 }, { max: 1 }, { maximum: 3 }]) {
    const malformed = { action: 'attribute_modifier', id: 'STR', value: 1, cap_override } as unknown as FocusBonus;
    const result = evaluate([focus('bad', malformed)]);
    assert.equal(result.complete, false, JSON.stringify(cap_override));
    assert.deepEqual(result.modifierBonuses, zero);
    assert.equal(result.modifierCaps.STR?.max, 2);
  }
  const legacy = { action: 'attribute_modifier', id: 'STR', value: 1, max_limit: 3 };
  assert.equal(evaluate([focus('legacy', legacy)]).complete, false);
});

test('Penal widens only the chosen lower bound regardless of other -2 metadata', () => {
  const choices = { penal1: { 0: ['CHA'] }, automatons1: { 0: ['CHA'] } };
  for (const selected of [select('penal1', 'automatons1'), select('automatons1', 'penal1')]) {
    const result = evaluate(selected, choices, { CHA: -2 });
    assert.equal(result.modifierBonuses.CHA, -1);
    assert.equal(result.modifierContributions.CHA, -3);
    assert.deepEqual(result.modifierCaps.CHA, { min: -3, max: 2 });
    assert.deepEqual(result.modifierCaps.WIS, { min: -2, max: 2 });
  }
});

test('the API derives capped HP, AC and saves, ignoring forged cached caps', () => {
  const draft = { attributeMethod: 'rolled', attributes: { STR: 18, DEX: 18, CON: 3, INT: 18, WIS: 18, CHA: 3 },
    attributeOverride: '', classChoices: ['warrior', 'expert'], name: 'Caps test', goal: 'Explore',
    background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'trade'],
    freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' }, focus: ['accipiter1'],
    modifierCaps: { DEX: { min: -99, max: 99 }, CON: { min: -99, max: 99 } } };
  const result = evaluateCharacter(draft);
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.equal(result.modifiers.DEX, 2);
  assert.equal(result.modifiers.CON, -2);
  assert.equal(result.focusModifierContributions.DEX, 1);
  assert.equal(result.focusModifierBonuses.DEX, 0);
  assert.deepEqual(result.modifierCaps.DEX, { min: -2, max: 2 });
  assert.deepEqual(result.attributes, draft.attributes);
  assert.equal(result.modifiers.DEX, 2);
  assert.equal(result.derived.ac, 12);
  assert.equal(result.derived.hitPoints, 6);
  assert.equal(result.derived.physicalSave, 13);
  assert.equal(result.derived.evasionSave, 13);
  const invalid = evaluateCharacter({ ...draft, classChoices: ['high', 'expert'], focus: ['developed_attribute1'],
    focusBonusChoices: { developed_attribute1: { 0: ['STR'] } } });
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.modifierCaps.STR, { min: -2, max: 2 });
});
