import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateArtChoices, getArtPlans, normalizeArtChoices, restoreArtChoices } from '../../shared/artSelection.js';
import type { ArtClass, ArtOption, StartingArts } from '../../shared/artSelection.js';
import { evaluateCharacter } from './character.js';
import { createArrayAllocation } from '../../frontend/src/attributeAllocation.js';
const dir = join(process.cwd(), '..', 'frontend', 'data');
const classes = JSON.parse(readFileSync(join(dir, 'classes.json'), 'utf8')) as ArtClass[];
const rules = JSON.parse(readFileSync(join(dir, 'starting_arts.json'), 'utf8')) as StartingArts;
const arts = readdirSync(join(dir, 'arts')).filter(file => file.endsWith('_arts.json')).flatMap(file => JSON.parse(readFileSync(join(dir, 'arts', file), 'utf8')) as ArtOption[]);
const kitsune = [{ instanceId: 'kitsune', focusId: 'kitsune_beastfolk1' }];
const picks = (...chosen: string[]) => ({ groups: {}, chosen });
test('Kitsune fixed grant, duplicates, restoration and removal', () => {
  const pair = ['warrior', 'expert'];
  const result = evaluateArtChoices({}, pair, classes, rules, arts, [], kitsune);
  assert.equal(result.complete, true);
  assert.deepEqual(result.classes[0]!.learned, ['elemental_sparks']);
  assert.equal(result.classes[0]!.focusGrant, 'kitsune_beastfolk1');
  const restored = restoreArtChoices(JSON.parse(JSON.stringify(result.selected)), pair, classes, rules, arts, [], kitsune);
  assert.deepEqual(evaluateArtChoices(restored.choices, pair, classes, rules, arts, [], kitsune).classes[0]!.learned, ['elemental_sparks']);
  assert.deepEqual(normalizeArtChoices(restored.choices, pair, classes, rules, arts), {});
  assert.equal(evaluateArtChoices({ elem: picks('elemental_sparks') }, pair, classes, rules, arts, [], kitsune).complete, false);
});
test('Kitsune replacement for full/partial Elementalists and Traditional Education', () => {
  for (const pair of [['elem', 'warrior'], ['elem', 'elem'], ['invoker', 'expert']]) {
    const traditions = pair[0] === 'invoker' ? [{ instanceId: 'education', focusId: 'traditional_education1', classId: 'invoker', traditionId: 'elem', mode: 'partial' as const }] : [];
    const plan = getArtPlans(pair, classes, rules, arts, traditions, kitsune)[0]!;
    assert.equal(plan.choose, 2);
    const ids = plan.options.filter(art => !plan.fixed.includes(art.id)).slice(0, 2).map(art => art.id);
    const source = { elem: picks(...ids) };
    const result = evaluateArtChoices(source, pair, classes, rules, arts, traditions, kitsune);
    assert.equal(result.complete, true);
    assert.equal(result.classes[0]!.learned.filter(id => id === 'elemental_sparks').length, 1);
    assert.equal(evaluateArtChoices({ elem: picks(ids[0]!, ids[0]!) }, pair, classes, rules, arts, traditions, kitsune).complete, false);
    assert.equal(evaluateArtChoices({ elem: picks('elemental_sparks', ids[0]!) }, pair, classes, rules, arts, traditions, kitsune).complete, false);
    assert.deepEqual(restoreArtChoices(source, pair, classes, rules, arts, traditions, kitsune).choices, source);
    assert.equal(normalizeArtChoices(source, pair, classes, rules, arts, traditions).elem!.chosen.length, 1);
  }
});
test('API grants only applied Kitsune arts and rejects submitted fixed grants', () => {
  const draft = { ...createArrayAllocation(), classChoices: ['warrior', 'expert'], focusInstances: kitsune };
  assert.deepEqual(evaluateCharacter(draft).artSelection.classes[0]!.learned, ['elemental_sparks']);
  assert.deepEqual(evaluateCharacter({ ...draft, focusInstances: [] }).artSelection.classes, []);
  assert.equal(evaluateCharacter({ ...draft, artChoicesByClass: { elem: { fixed: ['elemental_sparks'], ...picks() } } }).artSelection.complete, false);
  const invalid = evaluateCharacter({ ...draft, classChoices: ['healer', 'healer'] });
  assert.equal(invalid.artSelection.classes.some(entry => entry.learned.includes('elemental_sparks')), false);
});
