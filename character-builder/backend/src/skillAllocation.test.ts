import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
import { classSkillGrants, evaluateCreationSkills, evaluateSkillGrants, normalizeClassBonusChoices, skillChoiceReason } from '../../shared/skillAllocation.js';
import type { SkillGrant } from '../../shared/skillAllocation.js';

const character = () => ({
  ...createArrayAllocation(), name: 'Test character', goal: 'Explore',
  background: 'artisan', backgroundSkill: 'craft', backgroundMethod: 'pick', backgroundPicks: ['notice', 'notice'],
  classChoices: ['warrior', 'expert'], focus: ['alert1'], focusBonusChoices: {}, freeSkill: 'administer',
  startingEquipment: { method: 'package', packageId: 'armored_warrior' },
});
const grant = (key: string, kind: SkillGrant['kind'] = 'choice', scope: SkillGrant['scope'] = 'background'): SkillGrant =>
  ({ key, kind, scope, skillId: 'notice', label: key });
const wise = { id: 'wise', eng_name: 'The Wise', bonus: [{ action: 'choice_skill', count: 1 }] };
const wiseCharacter = () => ({ ...character(), classChoices: ['warrior', 'wise'],
  artChoicesByClass: { wise: { groups: {}, chosen: ['dread_awe'] } } });

test('all skills start at -1; first and second allotments produce levels 0 and 1', () => {
  assert.equal(evaluateSkillGrants([], ['notice']).states.notice?.level, -1);
  assert.equal(evaluateSkillGrants([grant('a')], ['notice']).states.notice?.level, 0);
  const result = evaluateSkillGrants([grant('a'), grant('b')], ['notice', 'magic']);
  assert.deepEqual(result.states.notice, { id: 'notice', level: 1, allotments: 2, advancementPoints: 0 });
  assert.equal(result.states.magic?.level, -1);
  assert.equal(result.complete, true);
});

test('voluntary third allotments are rejected rather than granting points or levels', () => {
  const result = evaluateSkillGrants([grant('a'), grant('b'), grant('c', 'choice', 'focus')], ['notice']);
  assert.equal(result.states.notice?.allotments, 2);
  assert.equal(result.states.notice?.advancementPoints, 0);
  assert.equal(result.complete, false);
  assert.equal(result.issues[0]?.key, 'c');
  assert.ok(skillChoiceReason(result, 'c', 'notice'));
  assert.equal(skillChoiceReason(result, 'b', 'notice'), '');
});

test('a fixed focus third allotment yields exactly 2 skill-specific points', () => {
  const result = evaluateSkillGrants([grant('a'), grant('b'), grant('focus', 'fixed', 'focus')], ['notice', 'magic']);
  assert.equal(result.complete, true);
  assert.deepEqual(result.states.notice, { id: 'notice', level: 1, allotments: 3, advancementPoints: 2 });
  assert.equal(result.states.magic?.advancementPoints, 0);
});

test('unspecified forced overflow stays capped and requires manual review', () => {
  for (const scope of ['class', 'background'] as const) {
    const result = evaluateSkillGrants([grant('a'), grant('b'), grant('forced', 'fixed', scope)], ['notice']);
    assert.equal(result.states.notice?.level, 1);
    assert.equal(result.states.notice?.advancementPoints, 0);
    assert.match(result.issues[0]!.message, /manual review/);
  }
  const fourth = evaluateSkillGrants([grant('a'), grant('b'), grant('third', 'fixed', 'focus'), grant('fourth', 'fixed', 'focus')], ['notice']);
  assert.equal(fourth.states.notice?.level, 1);
  assert.equal(fourth.states.notice?.advancementPoints, 2);
  assert.equal(fourth.issues[0]?.key, 'fourth');
});

test('class bonuses apply once per distinct ID, while different classes stack', () => {
  const high = { id: 'high', eng_name: 'High Mage', bonus: [{ action: 'fixed_skill', id: 'magic' }] };
  assert.equal(classSkillGrants([high, high]).length, 1);
  assert.equal(classSkillGrants([high, { ...high, id: 'necro' }]).length, 2);
  const full = evaluateCharacter({ ...character(), classChoices: ['high', 'high'], focus: [], freeSkill: 'magic' });
  assert.equal(full.skillStates.magic?.level, 1);
  assert.equal(full.skillGrantCounts.magic, 2);
  const combined = evaluateCharacter({ ...character(), classChoices: ['high', 'necro'], focus: [], freeSkill: 'magic' });
  assert.equal(combined.skillGrantCounts.magic, 2);
  assert.equal(combined.stepStatus.find((step) => step.key === 'freeSkill')?.complete, false);
});

test('whole-character evaluation applies background levels and focus overflow', () => {
  const result = evaluateCharacter(character());
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.skillStates.notice, { id: 'notice', level: 1, allotments: 3, advancementPoints: 2 });
  assert.equal(result.skillStates.craft?.level, 0);
  assert.equal(result.skillStates.administer?.level, 0);
  assert.equal(result.skillStates.magic?.level, -1);
});

test('background picks cannot select their fixed free skill for a third allotment', () => {
  const result = evaluateCharacter({ ...character(), backgroundPicks: ['craft', 'craft'] });
  assert.equal(result.skillStates.craft?.allotments, 2);
  assert.equal(result.skillStates.craft?.level, 1);
  assert.equal(result.stepStatus.find((step) => step.key === 'background')?.complete, false);
  assert.ok(result.skillIssues.some((issue) => issue.key === 'background:pick:1'));
});

test('free skill is validated after all background, class and focus grants', () => {
  const result = evaluateCharacter({ ...character(), freeSkill: 'notice' });
  assert.equal(result.valid, false);
  assert.equal(result.skillStates.notice?.allotments, 3);
  assert.equal(result.skillStates.notice?.advancementPoints, 2);
  assert.ok(result.skillIssues.some((issue) => issue.key === 'free-skill'));
  assert.equal(evaluateCharacter({ ...character(), freeSkill: '' }).stepStatus.find((step) => step.key === 'freeSkill')?.complete, false);
  assert.ok(evaluateCharacter({ ...character(), freeSkill: 'missing' }).skillIssues.some((issue) => issue.scope === 'freeSkill'));
});

test('focus choice dropdowns cannot bypass the cap', () => {
  const result = evaluateCharacter({ ...character(), background: 'soldier', backgroundSkill: 'stab',
    backgroundPicks: ['stab', 'lead'], focus: ['all_directions_edge_style1'],
    focusBonusChoices: { all_directions_edge_style1: { '0': ['stab'] } } });
  assert.equal(result.skillStates.stab?.allotments, 2);
  assert.equal(result.skillStates.stab?.advancementPoints, 0);
  assert.equal(result.stepStatus.find((step) => step.key === 'class')?.complete, false);
  assert.ok(result.skillIssues.some((issue) => issue.key === 'focus:all_directions_edge_style1:0:0'));
});

test('rolled open choices obey the cap; fixed duplicate rolls are flagged, not rewritten', () => {
  const open = evaluateCharacter({ ...character(), backgroundMethod: 'roll',
    backgroundRollTables: ['growth', 'growth', 'growth'],
    backgroundRollResults: [0, 1, 2].map(() => ({ table: 'growth', roll: 6, choiceId: 'craft' })) });
  assert.equal(open.skillStates.craft?.allotments, 2);
  assert.equal(open.skillIssues.filter((issue) => issue.scope === 'background').length, 2);
  const fixed = evaluateCharacter({ ...character(), backgroundMethod: 'roll',
    backgroundRollTables: ['learn', 'learn', 'learn'],
    backgroundRollResults: [3, 4, 1].map((roll) => ({ table: 'learn', roll })) });
  assert.equal(fixed.skillStates.craft?.level, 1);
  assert.equal(fixed.skillStates.craft?.advancementPoints, 0);
  assert.ok(fixed.skillIssues.some((issue) => issue.message.includes('manual review')));
});

test('changing or removing sources recomputes levels and points without stale totals', () => {
  const before = evaluateCharacter(character());
  assert.equal(before.skillStates.notice?.advancementPoints, 2);
  const withoutFocus = evaluateCharacter({ ...character(), focus: [] });
  assert.equal(withoutFocus.skillStates.notice?.advancementPoints, 0);
  const fewerPicks = evaluateCharacter({ ...character(), backgroundPicks: ['notice', 'trade'] });
  assert.equal(fewerPicks.skillStates.notice?.advancementPoints, 0);
  assert.equal(fewerPicks.skillStates.notice?.level, 1);
  const changedFree = evaluateCharacter({ ...character(), freeSkill: 'trade' });
  assert.equal(changedFree.skillStates.administer?.level, -1);
  assert.equal(changedFree.skillStates.trade?.level, 0);
});

test('forged cached skills, levels, advancement points and roll labels are ignored', () => {
  const forged = { ...character(), selectedSkills: ['magic', 'magic', 'magic'],
    skillStates: { magic: { level: 4, advancementPoints: 999 } }, skillGrantCounts: { magic: 9 },
    backgroundRollResults: [{ table: 'learn', roll: 1, skillId: 'magic', action: 'fixed_skill' }] };
  assert.deepEqual(evaluateCharacter(forged).skillStates, evaluateCharacter(character()).skillStates);
});

test('omitting the legacy selectedSkills cache preserves the entire pick and roll evaluation', () => {
  const drafts = [character(), { ...character(), backgroundMethod: 'roll',
    backgroundRollTables: ['learn', 'learn', 'growth'],
    backgroundRollResults: [{ table: 'learn', roll: 1 }, { table: 'learn', roll: 2 },
      { table: 'growth', roll: 6, choiceId: 'trade' }] }];
  for (const draft of drafts) {
    const expected = evaluateCharacter(draft);
    for (const selectedSkills of [[], ['magic', 'magic', 'missing'], ['notice', 'trade']]) {
      const restored = JSON.parse(JSON.stringify({ ...draft, selectedSkills }));
      assert.deepEqual(evaluateCharacter(restored), expected);
      assert.ok(Array.isArray(expected.selectedSkills));
    }
  }
});

test('ineligible or over-allowance foci cannot grant skill levels or points', () => {
  const restricted = evaluateCharacter({ ...character(), focus: ['divination1'] });
  assert.equal(restricted.skillStates.know?.level, -1);
  assert.equal(restricted.skillStates.notice?.advancementPoints, 0);
  const over = evaluateCharacter({ ...character(), focus: ['alert1', 'alert2', 'dwarves1', 'divination1'] });
  assert.equal(over.skillStates.notice?.advancementPoints, 0);
});

test('all valid option counters reflect earlier sources, not their own current selection', () => {
  const result = evaluateSkillGrants([grant('a', 'fixed'), grant('b'), grant('c')], ['notice']);
  assert.equal(result.choiceCounts.b?.notice, 1);
  assert.equal(result.choiceCounts.c?.notice, 2);
  assert.equal(skillChoiceReason(result, 'b', 'notice'), '');
  assert.ok(skillChoiceReason(result, 'c', 'notice'));
});

test('The Wise requires a skill choice in either slot and old drafts remain unfinished', () => {
  for (const classChoices of [['warrior', 'wise'], ['wise', 'warrior']]) {
    const result = evaluateCharacter({ ...wiseCharacter(), classChoices });
    assert.equal(result.valid, false);
    assert.equal(result.stepStatus.find((step) => step.key === 'class')?.complete, false);
    assert.ok(result.skillIssues.some((issue) => issue.key === 'class:wise:0:0' && /choose a skill/.test(issue.message)));
    const allocation = evaluateCreationSkills([], [wise], [], '', ['know']);
    assert.equal(allocation.complete, false);
    assert.equal(allocation.choiceCounts['class:wise:0:0']?.know, 0);
  }
});

test('The Wise grants the selected skill, survives JSON round trips and completes the class checkpoint', () => {
  const draft = { ...wiseCharacter(), classBonusChoices: { wise: { '0': ['know'] } } };
  const result = evaluateCharacter(JSON.parse(JSON.stringify(draft)));
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.skillStates.know, { id: 'know', level: 0, allotments: 1, advancementPoints: 0 });
  assert.equal(result.stepStatus.find((step) => step.key === 'class')?.complete, true);
  const twice = evaluateCharacter({ ...draft, freeSkill: 'know' });
  assert.equal(twice.valid, true, twice.issues.join('\n'));
  assert.equal(twice.skillStates.know?.level, 1);
});

test('class choices reject malformed, missing and unknown skills without granting them', () => {
  for (const classBonusChoices of [null, [], 'know', { wise: [] }, { wise: { '0': 'know' } },
    { wise: { '0': [42] } }, { wise: { '0': ['missing'] } }]) {
    const result = evaluateCharacter({ ...wiseCharacter(), classBonusChoices });
    assert.equal(result.valid, false);
    assert.equal(result.skillStates.know?.allotments, 0);
    assert.ok(result.skillIssues.some((issue) => issue.key === 'class:wise:0:0'));
  }
});

test('The Wise cannot choose a third allotment and a background change rechecks its saved choice', () => {
  const draft = { ...wiseCharacter(), focus: [], classBonusChoices: { wise: { '0': ['notice'] } } };
  const rejected = evaluateCharacter(draft);
  assert.equal(rejected.skillStates.notice?.allotments, 2);
  assert.equal(rejected.skillStates.notice?.advancementPoints, 0);
  assert.ok(rejected.skillIssues.some((issue) => issue.key === 'class:wise:0:0'));
  const allowed = evaluateCharacter({ ...draft, backgroundPicks: ['notice', 'trade'] });
  assert.equal(allowed.skillStates.notice?.level, 1);
  assert.equal(allowed.skillIssues.some((issue) => issue.scope === 'class'), false);
  assert.deepEqual(draft.classBonusChoices, { wise: { '0': ['notice'] } });
});

test('fixed grants from both classes precede class choices regardless of slot order', () => {
  const fixed = { id: 'seer', eng_name: 'Seer', bonus: [{ action: 'fixed_skill', id: 'notice' }] };
  for (const classes of [[wise, fixed], [fixed, wise]]) {
    const result = evaluateCreationSkills([grant('background')], classes, [], '', ['notice', 'know'],
      { wise: { '0': ['notice'] } });
    assert.equal(result.states.notice?.allotments, 2);
    assert.equal(result.complete, false);
    assert.ok(skillChoiceReason(result, 'class:wise:0:0', 'notice'));
    assert.equal(skillChoiceReason(result, 'class:wise:0:0', 'know'), '');
  }
});

test('class choices count before focus overflow and the separate free skill', () => {
  const draft = { ...wiseCharacter(), backgroundPicks: ['notice', 'trade'],
    classBonusChoices: { wise: { '0': ['notice'] } } };
  const result = evaluateCharacter(draft);
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.deepEqual(result.skillStates.notice, { id: 'notice', level: 1, allotments: 3, advancementPoints: 2 });
  const free = evaluateCharacter({ ...draft, focus: [], freeSkill: 'notice' });
  assert.ok(free.skillIssues.some((issue) => issue.key === 'free-skill'));
  assert.equal(free.skillStates.notice?.allotments, 2);
});

test('class bonus choices are scoped to selected classes and configured counts, not cached grants', () => {
  const source = { wise: { '0': ['know', 'magic'], '9': ['magic'] }, expert: { '0': ['magic'] } };
  const normalized = normalizeClassBonusChoices(source, [wise]);
  assert.deepEqual(normalized, { wise: { '0': ['know'] } });
  assert.deepEqual(normalizeClassBonusChoices(source, []), {});
  assert.deepEqual(normalizeClassBonusChoices(undefined, [wise]), { wise: { '0': [''] } });
  assert.equal(source.wise['0'].length, 2);
  const result = evaluateCharacter({ ...wiseCharacter(), classBonusChoices: source });
  assert.equal(result.valid, true, result.issues.join('\n'));
  assert.equal(result.skillStates.magic?.level, -1);
  const removed = evaluateCharacter({ ...character(), classBonusChoices: source });
  assert.equal(removed.valid, true, removed.issues.join('\n'));
  assert.equal(removed.skillStates.know?.level, -1);
});

test('class choice counts are data-driven, sequential, and applied once per distinct class', () => {
  const multi = { ...wise, bonus: [{ action: 'choice_skill', count: 3 }] };
  const choices = { wise: { '0': ['know', 'know', 'know'] } };
  assert.equal(classSkillGrants([multi, multi], choices).length, 3);
  const result = evaluateCreationSkills([], [multi, multi], [], '', ['know'], choices);
  assert.equal(result.states.know?.allotments, 2);
  assert.ok(result.issues.some((issue) => issue.key === 'class:wise:0:2'));
  assert.deepEqual(normalizeClassBonusChoices({ wise: { '0': ['know'] } }, [multi]),
    { wise: { '0': ['know', '', ''] } });
});

test('updated fixed class bonuses are read from classes.json without player choices', () => {
  const expected = { high: 'magic', necro: 'magic', elem: 'magic', mageslayer: 'magic',
    bard: 'perform', duelist: 'stab', skinshifter: 'survive', healer: 'heal', invoker: 'magic',
    beastmaster: 'survive', priest: 'pray', thought_noble: 'notice', accursed: 'magic' };
  for (const [id, skill] of Object.entries(expected)) {
    const result = evaluateCharacter({ ...character(), classChoices: ['warrior', id],
      backgroundPicks: ['trade', 'connect'], focus: [] });
    assert.equal(result.skillStates[skill]?.allotments, 1, id);
    assert.equal(result.skillIssues.some((issue) => issue.scope === 'class'), false, id);
  }
});


test('Vowed requires one chosen skill, excludes combat skills, and restores or removes its grant', () => {
  const draft = { ...character(), classChoices: ['warrior', 'vowed'],
    backgroundPicks: ['trade', 'connect'], focus: [] };
  const missing = evaluateCharacter(draft);
  assert.equal(missing.skillStates.heal?.allotments, 0);
  assert.ok(missing.skillIssues.some(issue => issue.scope === 'class'));
  for (const skill of ['stab', 'punch', 'shoot']) {
    const rejected = evaluateCharacter({ ...draft, classBonusChoices: { vowed: { '0': [skill] } } });
    assert.equal(rejected.skillStates[skill]?.allotments, 0, skill);
    assert.ok(rejected.skillIssues.some(issue => issue.scope === 'class'), skill);
  }
  for (const skill of ['heal', 'know', 'magic']) {
    const chosen = { ...draft, classBonusChoices: { vowed: { '0': [skill] } } };
    const result = evaluateCharacter(JSON.parse(JSON.stringify(chosen)));
    assert.equal(result.skillStates[skill]?.allotments, 1, skill);
    assert.equal(result.skillIssues.some(issue => issue.scope === 'class'), false, skill);
    const removed = evaluateCharacter({ ...chosen, classChoices: ['warrior', 'expert'] });
    assert.equal(removed.skillStates[skill]?.allotments, 0, skill);
  }
});
