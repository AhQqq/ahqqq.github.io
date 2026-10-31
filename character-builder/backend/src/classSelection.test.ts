import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classChoiceReason, evaluateClassChoices } from '../../shared/classSelection.js';
import type { SelectableClass } from '../../shared/classSelection.js';
import { classBuildName } from '../../shared/classBuild.js';
import type { ClassCombinations } from '../../shared/classBuild.js';
import { availableSpells } from '../../shared/spellSelection.js';
import type { SpellOption } from '../../shared/spellSelection.js';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';

const dir = join(process.cwd(), '..', 'frontend', 'data');
const classes = JSON.parse(readFileSync(join(dir, 'classes.json'), 'utf8')) as Array<SelectableClass & { name: string }>;
const combinations = JSON.parse(readFileSync(join(dir, 'combinations.json'), 'utf8')) as ClassCombinations;
const spells = JSON.parse(readFileSync(join(dir, 'spells.json'), 'utf8')) as SpellOption[];
const highSpells = availableSpells(spells, 'invoker').slice(0, 4).map((spell) => spell.id);
const base = () => ({
  ...createArrayAllocation(), name: 'Pairing tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  focus: ['alert1'], freeSkill: 'administer', startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});

test('Mageslayer rejects every mage archetype in either slot, including non-spellcasters', () => {
  for (const partner of classes.filter((option) => option.archetype === 'mage')) {
    const forward = classChoiceReason('mageslayer', partner.id, classes);
    const reverse = classChoiceReason(partner.id, 'mageslayer', classes);
    assert.match(forward, /Mageslayer cannot be paired/);
    assert.match(forward, /mage archetype/);
    assert.ok(forward.includes(partner.eng_name));
    assert.equal(forward, reverse);
    for (const pair of [['mageslayer', partner.id], [partner.id, 'mageslayer']]) {
      assert.equal(evaluateClassChoices(pair, classes).complete, false, pair.join('/'));
    }
  }
  for (const partner of ['warrior', 'expert', 'bard', 'wise']) {
    assert.equal(evaluateClassChoices(['mageslayer', partner], classes).complete, true);
    assert.equal(evaluateClassChoices([partner, 'mageslayer'], classes).complete, true);
  }
});

test('Invoker exclusions are exact IDs, not the mage archetype or all spellcasters', () => {
  for (const partner of ['high', 'elem', 'necro']) {
    const reason = classChoiceReason('invoker', partner, classes);
    assert.match(reason, /Invoker cannot be paired/);
    assert.equal(classChoiceReason(partner, 'invoker', classes), reason);
    assert.equal(evaluateClassChoices(['invoker', partner], classes).complete, false);
    assert.equal(evaluateClassChoices([partner, 'invoker'], classes).complete, false);
  }
  for (const partner of ['invoker', 'duelist', 'healer', 'beastmaster', 'warrior', 'expert']) {
    assert.equal(classChoiceReason('invoker', partner, classes), '');
    assert.equal(evaluateClassChoices(['invoker', partner], classes).complete, true);
    assert.equal(evaluateClassChoices([partner, 'invoker'], classes).complete, true);
  }
  assert.match(classChoiceReason('invoker', 'mageslayer', classes), /Mageslayer.*mage archetype/);
});

test('optional arrays and arbitrary future class exclusions work without hard-coded IDs', () => {
  const fixture: SelectableClass[] = [
    { id: 'a', eng_name: 'Alpha', archetype: 'expert', can_be_full_class: true },
    { id: 'b', eng_name: 'Beta', archetype: 'mage', can_be_full_class: true, incompatible_classes: [], incompatible_archetypes: [] },
  ];
  assert.equal(evaluateClassChoices(['a', 'b'], fixture).complete, true);
  fixture[1]!.incompatible_classes = ['a'];
  assert.equal(classChoiceReason('a', 'b', fixture), 'Beta cannot be paired with Alpha.');
  assert.equal(classChoiceReason('b', 'a', fixture), 'Beta cannot be paired with Alpha.');
  fixture[1]!.incompatible_classes = [];
  fixture[0]!.incompatible_archetypes = ['mage'];
  assert.match(classChoiceReason('b', 'a', fixture), /Alpha.*Beta.*mage archetype/);
  fixture[1]!.incompatible_classes = ['a'];
  assert.equal(classChoiceReason('a', 'b', fixture), classChoiceReason('b', 'a', fixture));
  assert.match(classChoiceReason('a', 'b', fixture), /Beta cannot be paired with Alpha/);
});

test('full-class eligibility never bypasses pairing restrictions and partial duplicates stay prohibited', () => {
  const fixture: SelectableClass[] = [{
    id: 'a', eng_name: 'Alpha', archetype: 'mage', can_be_full_class: true, incompatible_archetypes: ['mage'],
  }];
  assert.equal(evaluateClassChoices(['a', 'a'], fixture).complete, false);
  assert.match(classChoiceReason('healer', 'healer', classes), /partial-only/);
  assert.equal(evaluateClassChoices(['invoker', 'invoker'], classes).complete, true);
});

test('an empty or unknown partner does not prevent repairing a class slot', () => {
  for (const other of [undefined, '', 'missing']) {
    assert.equal(classChoiceReason('mageslayer', other, classes), '');
    assert.equal(classChoiceReason('invoker', other, classes), '');
  }
  assert.match(classChoiceReason('missing', 'warrior', classes), /known class/);
});

test('old saved incompatible pairs remain identifiable and invalid instead of silently changing classes', () => {
  const saved = JSON.parse('{"classChoices":["healer","mageslayer"]}');
  const original = [...saved.classChoices];
  const result = evaluateClassChoices(saved.classChoices, classes);
  assert.equal(result.complete, false);
  assert.deepEqual(result.ids, original);
  assert.deepEqual(saved.classChoices, original);
  assert.match(result.issues.join(' '), /Mageslayer.*Healer/);
});

test('whole-character API validation rejects incompatible pairs and marks class and arts checkpoints incomplete', () => {
  for (const pair of [['mageslayer', 'duelist'], ['mageslayer', 'healer'], ['mageslayer', 'beastmaster'],
    ['mageslayer', 'invoker'], ['invoker', 'high'], ['invoker', 'elem'], ['invoker', 'necro']]) {
    for (const ordered of [pair, [...pair].reverse()]) {
      const result = evaluateCharacter({ ...base(), classChoices: ordered });
      assert.equal(result.valid, false);
      assert.ok(result.issues.includes(classChoiceReason(ordered[0]!, ordered[1], classes)));
      assert.equal(result.stepStatus.find((step) => step.key === 'class')!.complete, false);
      assert.equal(result.stepStatus.find((step) => step.key === 'arts')!.complete, false);
      assert.match(result.fullClass, /invalid class selection/);
    }
  }
});

test('full Invoker and Invoker with a non-spellcasting mage class still pass whole-character validation', () => {
  const full = evaluateCharacter({ ...base(), classChoices: ['invoker', 'invoker'],
    spellChoicesByClassSlot: [highSpells.slice(0, 2), highSpells.slice(2, 4)] });
  assert.equal(full.valid, true, full.issues.join('\n'));
  for (const pair of [['invoker', 'healer'], ['healer', 'invoker']]) {
    const mixed = evaluateCharacter({ ...base(), classChoices: pair,
      artChoicesByClass: { healer: { groups: {}, chosen: ['empowered_healer'] } },
      spellChoicesByClassSlot: pair.map((id) => id === 'invoker' ? highSpells.slice(0, 2) : []) });
    assert.equal(mixed.valid, true, mixed.issues.join('\n'));
  }
});

test('combination names reference legal, distinct, unambiguous pairs', () => {
  assert.ok(combinations.default_name.trim());
  const seen = new Set<string>();
  for (const group of combinations.groups) {
    assert.ok(group.name.trim());
    assert.ok(group.pairs.length > 0);
    for (const pair of group.pairs) {
      assert.equal(pair.length, 2);
      assert.notEqual(pair[0], pair[1], 'Full classes use their own catalogue name');
      assert.equal(evaluateClassChoices(pair, classes).complete, true, pair.join('/'));
      const key = JSON.stringify([...pair].sort());
      assert.equal(seen.has(key), false, 'A pair must have only one configured name');
      seen.add(key);
    }
  }
});

test('every legal full class inherits its own name, including full Invoker', () => {
  const fullClasses = classes.filter((option) => option.can_be_full_class);
  assert.equal(fullClasses.length, 6);
  assert.ok(fullClasses.some((option) => option.id === 'invoker'));
  for (const option of fullClasses) {
    assert.equal(classBuildName([option.id, option.id], classes, combinations), option.name);
    assert.equal(evaluateCharacter({ ...base(), classChoices: [option.id, option.id] }).fullClass, option.name);
  }
});

test('all three named mixed-caster pairs resolve in either order without mutating the selection', () => {
  const dualName = combinations.groups[0]!.name;
  for (const pair of [['elem', 'high'], ['elem', 'necro'], ['high', 'necro']]) {
    const original = [...pair];
    assert.equal(classBuildName(pair, classes, combinations), dualName);
    assert.equal(classBuildName([...pair].reverse(), classes, combinations), dualName);
    assert.deepEqual(pair, original);
  }
});

test('names and fallbacks are data-driven rather than hard-coded to spellcasting classes', () => {
  const custom: ClassCombinations = {
    default_name: 'Custom default',
    groups: [{ name: 'Custom pair', pairs: [['warrior', 'expert']] }],
  };
  assert.equal(classBuildName(['expert', 'warrior'], classes, custom), 'Custom pair');
  assert.equal(classBuildName(['elem', 'high'], classes, custom), 'Custom default');
  assert.equal(classBuildName(['wise', 'bard'], classes, combinations), combinations.default_name);
});

test('naming rules cannot bypass partial-only or incompatible-class validation', () => {
  const custom: ClassCombinations = { default_name: 'Fallback', groups: [
    { name: 'Forbidden override', pairs: [['invoker', 'high'], ['wise', 'wise'], ['warrior', 'warrior']] },
  ] };
  for (const pair of [undefined, null, [], ['high'], ['missing', 'high'], ['warrior', 42],
    ['warrior', 'expert', 'high'], ['wise', 'wise'], ['invoker', 'high'], ['high', 'invoker'], ['mageslayer', 'duelist']]) {
    assert.match(classBuildName(pair, classes, custom), /Unfinished.*invalid class selection/);
  }
  assert.equal(classBuildName(['warrior', 'warrior'], classes, custom), classes.find((option) => option.id === 'warrior')!.name);
});

test('shared UI naming and API naming agree for every ordered class pair', () => {
  for (const first of classes) {
    for (const second of classes) {
      const pair = [first.id, second.id];
      const result = evaluateCharacter({ ...base(), classChoices: pair });
      assert.equal(result.fullClass, classBuildName(pair, classes, combinations), pair.join('/'));
      if (!evaluateClassChoices(pair, classes).complete) {
        assert.match(result.fullClass, /invalid class selection/);
      } else if (first.id !== second.id && !combinations.groups.some((group) =>
        group.pairs.some(([left, right]) => (left === first.id && right === second.id) || (left === second.id && right === first.id)))) {
        assert.equal(result.fullClass, combinations.default_name, pair.join('/'));
      }
    }
  }
});

test('restored drafts derive their build name instead of trusting an old cached name', () => {
  const draft = JSON.parse(JSON.stringify({ ...base(), classChoices: ['necro', 'elem'], fullClass: 'Old cached name' }));
  assert.equal(evaluateCharacter(draft).fullClass, combinations.groups[0]!.name);
  assert.equal(draft.fullClass, 'Old cached name');
});
