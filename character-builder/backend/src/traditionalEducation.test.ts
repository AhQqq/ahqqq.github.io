import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { evaluateFocusInstances, normalizeFocusRuleChoices, readFocusInstances } from '../../shared/focusCreation.js';
import type { FocusData } from '../../shared/focusBonuses.js';
import { evaluateFocusEffort, evaluateFocusTraditions } from '../../shared/focusTraditions.js';
import { evaluateArtChoices, getArtPlans, normalizeArtChoices, restoreArtChoices, toggleArtChoice } from '../../shared/artSelection.js';
import type { ArtClass, ArtOption, StartingArts } from '../../shared/artSelection.js';
import { availableSpells, canLearnSpell, ELEMENTAL_MAGIC, HIGH_MAGIC, NECROMANCER_MAGIC,
  evaluateSpellChoices, isFirstLevelSpell, normalizeSpellChoices, restoreSpellChoices, toggleSpellChoice } from '../../shared/spellSelection.js';
import type { SpellOption } from '../../shared/spellSelection.js';

const dataDir = new URL('../../frontend/data/', import.meta.url);
const data = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, dataDir), 'utf8')) as T;
const classes = data<ArtClass[]>('classes.json');
const foci = data<FocusData[]>('foci.json');
const spells = data<SpellOption[]>('spells.json');
const rules = data<StartingArts>('starting_arts.json');
const arts = readdirSync(new URL('arts/', dataDir)).filter((file) => file.endsWith('_arts.json'))
  .flatMap((file) => data<ArtOption[]>(`arts/${file}`));
const focus = { instanceId: 'education', focusId: 'traditional_education1' };
const pair = ['invoker', 'warrior'];
const full = ['invoker', 'invoker'];
const picks = (...chosen: string[]) => ({ groups: {}, chosen });
const h = spells.filter((spell) => isFirstLevelSpell(spell) && spell.category === HIGH_MAGIC);
const e = spells.filter((spell) => isFirstLevelSpell(spell) && spell.category === ELEMENTAL_MAGIC);
const n = spells.filter((spell) => isFirstLevelSpell(spell) && spell.category === NECROMANCER_MAGIC);
const grants = (traditionId: string, ids = pair) => evaluateFocusTraditions([focus], { education: { traditionId } }, foci, ids).grants;
const draft = (traditionId = 'elem', classChoices = pair) => ({
  ...createArrayAllocation(), name: 'Tradition tester', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices, focusInstances: [focus], focusRuleChoices: { education: { traditionId } }, freeSkill: 'administer',
  startingEquipment: { method: 'package', packageId: 'armored_warrior' },
  artChoicesByClass: { elem: picks('elemental_blast') }, spellChoicesByClassSlot: [[e[0]!.id, h[0]!.id], []],
});

test('Traditional Education requires one explicit supported tradition, including saved drafts', () => {
  for (const traditionId of ['high', 'elem', 'necro']) assert.equal(grants(traditionId).length, 1);
  for (const choices of [undefined, null, {}, { education: null }, { education: { traditionId: '' } },
    { education: { traditionId: 'healer' } }, { education: { traditionId: ['elem'] } },
    Object.create({ education: { traditionId: 'elem' } })]) {
    const result = evaluateFocusTraditions([focus], choices, foci, pair);
    assert.equal(result.complete, false);
    assert.deepEqual(result.grants, []);
  }
  const choice = normalizeFocusRuleChoices({ education: { traditionId: 'necro' }, stale: { traditionId: 'elem' } }, [focus]);
  assert.deepEqual(choice, { education: { traditionId: 'necro' } });
  const legacy = readFocusInstances(undefined, [focus.focusId], foci).instances;
  assert.equal(evaluateFocusTraditions(legacy, undefined, foci, pair).complete, false);
  assert.equal(evaluateFocusTraditions(legacy, { [focus.focusId]: { traditionId: 'high' } }, foci, full).grants[0]!.mode, 'full');
});

test('tradition benefits require a funded, non-repeated, eligible focus and a legal actual class pair', () => {
  const selectedClasses = classes.filter((item) => pair.includes(item.id));
  const unfunded = evaluateFocusInstances([focus], undefined, foci, selectedClasses, [{ id: 'warrior', val: 1 }]);
  assert.deepEqual(evaluateFocusTraditions(unfunded.applied, draft().focusRuleChoices, foci, pair).grants, []);
  for (const extra of [
    { classChoices: ['warrior', 'expert'] }, { classChoices: ['invoker', 'high'] },
    { classChoices: ['mageslayer', 'invoker'] }, { classChoices: ['invoker'] },
    { focusInstances: [] }, { focusInstances: [focus, { ...focus, instanceId: 'duplicate' }] },
    { focusRuleChoices: {} }, { focusRuleChoices: { education: { traditionId: 'bad' } } },
  ]) {
    const result = evaluateCharacter({ ...draft(), ...extra });
    assert.equal(result.valid, false);
    assert.deepEqual(result.focusTraditions, []);
    assert.deepEqual(result.focusEffort, []);
    assert.ok(!result.spellSelection.selected.flat().includes(e[0]!.id));
    assert.ok(!result.artSelection.classes.some((entry) => entry.source));
  }
  const forged = { ...draft(), focusInstances: [], focusTraditions: grants('elem'), focusEffort: [{ maximum: 99 }] };
  assert.deepEqual(evaluateCharacter(forged).focusTraditions, []);
});

test('High Mage arts follow Invoker full/partial status, not class-slot order', () => {
  for (const ids of [pair, [...pair].reverse(), full]) {
    const fullClass = ids[0] === ids[1];
    const source = { high: picks(...(fullClass ? ['arcane_lexicon', 'counter_magic'] : ['arcane_lexicon'])) };
    const result = evaluateArtChoices(source, ids, classes, rules, arts, grants('high', ids));
    assert.equal(result.complete, true, result.issues.join('\n'));
    assert.equal(result.classes.length, 1);
    assert.equal(result.required, fullClass ? 2 : 1);
    assert.equal(result.classes[0]!.source?.instanceId, focus.instanceId);
    assert.equal(result.classes[0]!.source?.classId, 'invoker');
  }
  assert.equal(evaluateArtChoices({ high: picks('arcane_lexicon', 'arcane_lexicon') }, full, classes, rules, arts, grants('high', full)).complete, false);
});

test('Elementalist includes fixed arts once; Necromancer grants one art in either mode', () => {
  for (const ids of [pair, full]) {
    const elemental = evaluateArtChoices({ elem: picks('elemental_blast') }, ids, classes, rules, arts, grants('elem', ids));
    assert.equal(elemental.complete, true);
    assert.deepEqual(elemental.classes[0]!.fixed, ['elemental_resilience', 'elemental_sparks']);
    assert.equal(elemental.classes[0]!.learned.length, 3);
    for (const id of ['elemental_sparks', 'bonetalker']) {
      assert.equal(evaluateArtChoices({ elem: picks(id) }, ids, classes, rules, arts, grants('elem', ids)).complete, false);
    }
    assert.equal(evaluateArtChoices({ necro: picks('bonetalker') }, ids, classes, rules, arts, grants('necro', ids)).complete, true);
    assert.equal(getArtPlans(ids, classes, rules, arts, [...grants('elem', ids), ...grants('elem', ids)]).length, 1);
  }
  const withHealer = evaluateCharacter({ ...draft('elem', ['invoker', 'healer']),
    artChoicesByClass: { elem: picks('elemental_blast'), healer: picks('empowered_healer') } });
  assert.equal(withHealer.artSelection.complete, true);
  assert.equal(withHealer.artSelection.classes.length, 2);
  assert.equal(withHealer.skillStates.magic!.allotments, 1);
});

test('missing full rules or catalogues block tradition arts rather than falling back to partial', () => {
  const config = structuredClone(rules);
  delete config[0]!.classes.high!.full;
  const missingRule = evaluateArtChoices({}, full, classes, config, arts, grants('high', full));
  assert.equal(missingRule.complete, false);
  assert.deepEqual(missingRule.classes[0]!.learned, []);
  assert.equal(getArtPlans(pair, classes, rules, [], grants('elem'))[0]!.configured, false);
  assert.equal(getArtPlans(pair, classes.filter((item) => item.id !== 'elem'), rules, arts, grants('elem'))[0]!.configured, false);
});

test('school expansion applies only to Invoker, never increases counts or permits higher-level spells', () => {
  const tradition = grants('elem');
  assert.equal(canLearnSpell(e[0]!, 'invoker', tradition), true);
  for (const id of ['high', 'necro', 'healer', 'warrior']) assert.equal(canLearnSpell(e[0]!, id, tradition), false);
  assert.equal(canLearnSpell(n[0]!, 'invoker', tradition), false);
  assert.equal(canLearnSpell(n[0]!, 'invoker', grants('necro')), true);
  assert.deepEqual(availableSpells(spells, 'invoker', grants('high')), h);
  assert.ok(availableSpells(spells, 'invoker', tradition).every(isFirstLevelSpell));
  assert.equal(evaluateSpellChoices([[e[0]!.id, h[0]!.id], []], pair, spells, undefined, tradition).complete, true);
  assert.equal(evaluateSpellChoices([[], [e[0]!.id, h[0]!.id]], [...pair].reverse(), spells, undefined, tradition).complete, true);
  const fullSpells = [[e[0]!.id, h[0]!.id], [e[1]!.id, h[1]!.id]];
  const fullResult = evaluateSpellChoices(fullSpells, full, spells, undefined, grants('elem', full));
  assert.equal(fullResult.complete, true);
  assert.equal(fullResult.required, 4);
  assert.equal(evaluateSpellChoices([[e[0]!.id, h[0]!.id, h[1]!.id], []], pair, spells, undefined, tradition).complete, false);
  assert.equal(evaluateSpellChoices([[e[0]!.id, h[0]!.id], [e[0]!.id, h[1]!.id]], full, spells, undefined, grants('elem', full)).complete, false);
  const higher = spells.find((spell) => !isFirstLevelSpell(spell) && spell.category === ELEMENTAL_MAGIC)!;
  assert.equal(evaluateSpellChoices([[higher.id, h[0]!.id], []], pair, spells, undefined, tradition).complete, false);
});

test('saved choices survive reload but lose revoked access on tradition, focus or mode changes', () => {
  const tradition = grants('elem');
  const spellsSource = [[e[0]!.id, h[0]!.id], []];
  const artsSource = { elem: picks('elemental_blast') };
  assert.deepEqual(restoreSpellChoices(spellsSource, undefined, pair, spells, tradition).choices, spellsSource);
  assert.deepEqual(restoreSpellChoices(undefined, [e[0]!.id, h[0]!.id], pair, spells, tradition).choices, spellsSource);
  assert.deepEqual(restoreArtChoices(artsSource, pair, classes, rules, arts, tradition).choices, artsSource);
  for (const next of [[], grants('necro'), grants('high')]) {
    assert.deepEqual(normalizeSpellChoices(spellsSource, pair, spells, next), [[h[0]!.id], []]);
    assert.ok(!Object.hasOwn(normalizeArtChoices(artsSource, pair, classes, rules, arts, next), 'elem'));
  }
  assert.deepEqual(normalizeArtChoices({ high: picks('arcane_lexicon', 'counter_magic') }, pair, classes, rules, arts, grants('high')), { high: picks('arcane_lexicon') });
  assert.deepEqual(toggleSpellChoice([[], []], 0, e[0]!.id, pair, spells, tradition), [[e[0]!.id], []]);
  assert.deepEqual(toggleArtChoice({}, 'elem', null, 'elemental_blast', pair, classes, rules, arts, tradition), artsSource);
});

test('Effort uses validated Magic level with minimum one and does not add class skills or attribute modifiers', () => {
  for (const level of [-1, 0, 1, 2]) {
    assert.equal(evaluateFocusEffort(grants('high'), { magic: { level } })[0]!.maximum, Math.max(1, level));
  }
  const partial = evaluateCharacter(draft());
  assert.equal(partial.spellSelection.required, 2);
  assert.equal(partial.artSelection.complete, true);
  assert.equal(partial.skillStates.magic!.allotments, 1);
  assert.equal(partial.focusEffort[0]!.skillLevel, 0);
  assert.equal(partial.focusEffort[0]!.maximum, 1);
  const fullResult = evaluateCharacter({ ...draft('elem', full), freeSkill: 'magic',
    spellChoicesByClassSlot: [[e[0]!.id, h[0]!.id], [e[1]!.id, h[1]!.id]] });
  assert.equal(fullResult.valid, true, fullResult.issues.join('\n'));
  assert.equal(fullResult.skillStates.magic!.allotments, 2);
  assert.equal(fullResult.focusEffort[0]!.skillLevel, 1);
  assert.equal(fullResult.focusEffort[0]!.maximum, 1);
  const forged = { ...draft(), skillStates: { magic: { level: 99 } }, focusEffort: [{ maximum: 99 }] };
  assert.equal(evaluateCharacter(forged).focusEffort[0]!.maximum, 1);
});
