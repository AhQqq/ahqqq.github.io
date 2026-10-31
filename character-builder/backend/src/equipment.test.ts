import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { emptyLoadout, evaluateEquipmentInventory, equipmentPriceCopper, pruneEquipmentLoadout, restoreEquipmentInventory } from '../../shared/equipment.js';
import type { EquipmentDefinition, EquipmentPackage, EquipmentProperty } from '../../shared/startingEquipment.js';
import { evaluateCharacter } from './character.js';
import { ko, rulesText } from '../../frontend/src/korean.js';

const data = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), 'utf8')) as T;
const equipment = data<EquipmentDefinition[]>('equipment');
const properties = data<EquipmentProperty[]>('equipment_properties');
const packages = data<EquipmentPackage[]>('starting_equipment');
const snapshot: { tables: Record<string, string[][]>; properties: EquipmentProperty[] } = JSON.parse(
  readFileSync(new URL('../../../docs/history/builder-sources/equipment_source.json', import.meta.url), 'utf8'),
);
const cash = { method: 'silver', rolls: [1, 1, 1] };
const packageChoice = (packageId: string) => ({ method: 'package', packageId });
const evaluate = (purchases: unknown = [], loadout: unknown = emptyLoadout(), startingEquipment: unknown = cash, dexterity = 0) =>
  evaluateEquipmentInventory({ startingEquipment, purchases, loadout, dexterity }, packages, equipment, properties);
const loadout = (armorId = '', shieldId = '', weaponId = '') => ({ armorId, shieldId, weaponId });

test('Korean equipment labels and rule descriptions retain the AC abbreviation', () => {
  assert.equal(ko('11. Equipped armor, shield, and Armor Class'), '11. 착용 갑옷·방패·AC');
  assert.equal(rulesText('AC는 10 + DEX 수정치입니다.'), 'AC는 10 + 민첩 수정치입니다.');
  assert.equal(rulesText('AC 10, AC를 무시, AC로 계산'), 'AC 10, AC를 무시, AC로 계산');
});

test('catalogue covers every archived table row and all properties without breaking packages', () => {
  assert.equal(equipment.length, 86);
  assert.equal(new Set(equipment.map((item) => item.id)).size, equipment.length);
  assert.equal(properties.length, 16);
  const propertyKeys = (entries: EquipmentProperty[]) => entries.map(({ id, name, category }) => ({ id, name, category }));
  assert.deepEqual(propertyKeys(properties), propertyKeys(snapshot.properties));
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    for (const row of rows.slice(1)) {
      assert.equal(equipment.filter((item) => item.sources.some((source) => source.table === table && source.name === row[0])).length, 1, row[0]);
    }
  }
  for (const item of equipment) for (const id of item.propertyIds) {
    assert.equal(properties.filter((property) => property.id === id).length, 1);
  }
  for (const pack of packages) for (const item of pack.items) {
    assert.equal(equipment.filter((definition) => definition.id === item.id).length, 1);
  }
  const shield = equipment.find((item) => item.id === 'large_shield')!;
  assert.equal(shield.shield?.baseAc, 14);
  assert.equal(shield.weapon?.damage, '1d6');
  assert.equal(equipmentPriceCopper(shield), 100);
  assert.equal(equipmentPriceCopper(equipment.find((item) => item.id === 'club')!), null);
});

test('SRD equipment names resolve through stable IDs in existing starting packages', () => {
  const names: Record<string, string> = {
    healing_pouch: '치료사의 도구',
    large_shield: '큰 방패',
    small_shield: '작은 방패',
    unarmored: '맨 몸',
    breastplate_and_pauldrons: '흉갑과 경갑',
  };
  for (const [id, name] of Object.entries(names)) {
    assert.equal(equipment.find((item) => item.id === id)?.name, name, id);
  }
  for (const [packageId, itemId] of [
    ['mage_healer_or_scholar', 'healing_pouch'],
    ['armored_warrior', 'large_shield'],
    ['gentry_wayfarer', 'small_shield'],
  ]) {
    const result = evaluate([], emptyLoadout(), packageChoice(packageId));
    assert.equal(result.complete, true, result.issues.join('\n'));
    assert.equal(result.items.find((item) => item.id === itemId)?.name, names[itemId]);
  }
  assert.equal(evaluate().armorClass.armor?.name, names.unarmored);
  assert.equal(equipment.find((item) => item.id === 'breastplate_and_pauldrons')?.armor?.baseAc, 15);
});

test('SRD property wording supersedes the archive without changing property identities', () => {
  // Portable expectations from Main.tex, equipment chapter (2026-10-04).
  const descriptions: Record<string, string> = {
    armor_piercing: '이 무기는 명중 판정을 시행할 때 비마법 방어구를 무시합니다.',
    less_lethal: '이 무기로 HP가 0이 되면 사용자의 선택에 따라 기절시킬 수 있습니다.',
    numerous: '다섯 개가 하나의 준비된 물품으로 취급됩니다.',
    lethal: '처형 공격을 할 때 육체 내성에 -1의 페널티를 가하고 성공했을 때에도 피해를 두 배로 가합니다.',
    reload: '이 무기는 장전에 이동 행동을 사용합니다. 사수의 사격 기술 레벨이 1 이상이라면 턴 행동으로 장전할 수 있습니다.',
    thrown: '근접 무기로 사용할 수도 있지만, 투척할 수 있습니다. 이때 충격 피해는 없습니다. 근접 거리의 적에게 투척을 시도할 수도 있지만, 명중 판정에 -4의 페널티를 받습니다.',
  };
  assert.deepEqual(properties, snapshot.properties.map((property) => ({
    ...property, description: descriptions[property.id] ?? property.description,
  })));
});

test('shopping uses integer copper, refunds by reconstruction, and merges owned quantities', () => {
  const cart = [{ id: 'dagger', count: 2 }, { id: 'candle', count: 1 }];
  const result = evaluate(cart);
  assert.equal(result.complete, true, result.issues.join('\n'));
  assert.equal(result.spentCopper, 61);
  assert.equal(result.remainingCopper, 239);
  assert.equal(result.items.find((item) => item.id === 'dagger')?.count, 2);
  assert.equal(result.encumbrance.complete, false);
  assert.deepEqual(result.encumbrance.reviewIds, ['candle']);
  assert.equal(evaluate([]).remainingCopper, 300);
  assert.deepEqual(cart, [{ id: 'dagger', count: 2 }, { id: 'candle', count: 1 }]);
  const merged = evaluate([{ id: 'dagger', count: 1 }], emptyLoadout(), packageChoice('mage_healer_or_scholar'));
  const dagger = merged.items.find((item) => item.id === 'dagger')!;
  assert.deepEqual([dagger.count, dagger.packageCount, dagger.purchasedCount, dagger.encumbrance], [3, 2, 1, 3]);
  assert.equal(merged.remainingCopper, 770);
});

test('bundling affects load, not price or quantity; package loads are never multiplied', () => {
  const result = evaluate([{ id: 'throwing_knife', count: 6 }, { id: 'torch', count: 4 }]);
  assert.equal(result.spentCopper, 260);
  assert.equal(result.items.find((item) => item.id === 'throwing_knife')?.encumbrance, 2);
  assert.equal(result.items.find((item) => item.id === 'torch')?.encumbrance, 2);
  const rogue = evaluate([], emptyLoadout(), packageChoice('roguish_wanderer'));
  assert.equal(rogue.items.find((item) => item.id === 'throwing_knife')?.encumbrance, 1);
  assert.equal(rogue.encumbrance.listed, 12);
});

test('invalid purchases are atomic, do not turn missing prices into free goods, and cannot overspend', () => {
  for (const purchases of [null, {}, [{ id: 'dagger', count: 11 }],
    [{ id: 'dagger', count: 1, price: 0 }], [{ id: 'dagger', count: 1 }, { id: 'dagger', count: 1 }],
    ...['missing', 'club', 'unarmored', 'unarmed_attack', 'rations_1_week'].map((id) => [{ id, count: 1 }]),
    ...[0, -1, 1.5, '2', Number.MAX_SAFE_INTEGER].map((count) => [{ id: 'dagger', count }])]) {
    const result = evaluate(purchases);
    assert.equal(result.complete, false, JSON.stringify(purchases));
    assert.deepEqual(result.items, []);
    assert.equal(result.remainingCopper, null);
    assert.equal(result.armorClass.value, 10);
    assert.equal(result.armorClass.complete, true);
  }
  const result = evaluate([{ id: 'dagger', count: 1 }], emptyLoadout(), packageChoice('armored_warrior'));
  assert.equal(result.complete, false);
  assert.equal(result.items.find((item) => item.id === 'dagger')?.count, 1);
  assert.equal(result.items.find((item) => item.id === 'dagger')?.purchasedCount, 0);
});

test('initial unarmored AC uses final DEX before equipment selection is complete', () => {
  for (const startingEquipment of [undefined, { method: '' }]) {
    for (const dexterity of [-2, 0, 1, 2, 3]) {
      for (const choice of [undefined, emptyLoadout(), loadout('unarmored', '', 'unarmed_attack')]) {
        const result = evaluateEquipmentInventory({ startingEquipment, loadout: choice, dexterity }, packages, equipment, properties);
        assert.equal(result.complete, false);
        assert.equal(result.starting.complete, false);
        assert.equal(result.armorClass.complete, true, result.armorClass.issues.join('\n'));
        assert.equal(result.armorClass.base, 10);
        assert.equal(result.armorClass.shieldBonus, 0);
        assert.equal(result.armorClass.value, 10 + dexterity);
      }
    }
  }
  for (const choice of [null, {}, loadout('partial_armor'), loadout('', 'large_shield'), loadout('', '', 'dagger')]) {
    const result = evaluate([], choice, { method: '' }, 1);
    assert.equal(result.armorClass.complete, false);
    assert.equal(result.armorClass.value, null);
  }
  assert.equal(evaluate([], emptyLoadout(), { method: '' }, NaN).armorClass.value, null);
});

test('API exposes unarmored AC without marking unfinished starting equipment complete', () => {
  for (const dexterity of [3, 10, 18]) {
    const result = evaluateCharacter({ attributeMethod: 'rolled',
      attributes: { STR: 10, DEX: dexterity, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      startingEquipment: { method: '' }, equipmentLoadout: emptyLoadout() });
    assert.equal(result.derived.ac, 10 + result.modifiers.DEX);
    assert.equal(result.armorClass.complete, true);
    assert.equal(result.stepStatus.find((step) => step.key === 'armorClass')?.complete, true);
    assert.equal(result.stepStatus.find((step) => step.key === 'equipment')?.complete, false);
    assert.equal(result.valid, false);
  }
});

test('AC resolves armor/shield bases before final DEX; unselected package items provide no AC', () => {
  assert.equal(evaluate([], emptyLoadout(), cash, -2).armorClass.value, 8);
  const armored = packageChoice('armored_warrior');
  assert.equal(evaluate([], emptyLoadout(), armored, 1).armorClass.value, 11);
  const equalBases = evaluate([], loadout('partial_armor', 'large_shield', 'short_sword'), armored, 1);
  assert.equal(equalBases.armorClass.value, 16);
  assert.equal(equalBases.armorClass.base, 14);
  assert.equal(equalBases.armorClass.shieldBonus, 1);
  assert.equal(evaluate([], loadout('', 'large_shield'), armored, 1).armorClass.value, 15);
  const light = evaluate([], loadout('leather_coat', 'small_shield'), packageChoice('gentry_wayfarer'), 2);
  assert.equal(light.armorClass.base, 13);
  assert.equal(light.armorClass.shieldBonus, 0);
  assert.equal(light.armorClass.value, 15);
  const heavyPackage: EquipmentPackage = { id: 'heavy', name: 'Heavy', englishName: 'Heavy', currency: { silver: 0 },
    items: [{ id: 'mail_armor', count: 1, encumbrance: 2 }, { id: 'large_shield', count: 1, encumbrance: 1 }] };
  const heavy = evaluateEquipmentInventory({ startingEquipment: packageChoice('heavy'), loadout: loadout('mail_armor', 'large_shield'), dexterity: 0 },
    [heavyPackage], equipment, properties);
  assert.equal(heavy.armorClass.value, 17);
  assert.deepEqual(heavy.armorClass.skillPenalties, { sneak: -2, exert: -2 });
});

test('loadout requires ownership, enforces ordinary hand use, and rejects cached AC', () => {
  for (const choice of [null, {}, { ...emptyLoadout(), acBonus: 99 },
    loadout('plate_armor'), loadout('', 'large_shield'), loadout('', '', 'great_sword')]) {
    const result = evaluate([], choice);
    assert.equal(result.armorClass.complete, false, JSON.stringify(choice));
    assert.equal(result.armorClass.value, null);
  }
  const purchases = [{ id: 'large_shield', count: 1 }, { id: 'staff', count: 1 }];
  const conflict = evaluate(purchases, loadout('', 'large_shield', 'staff'));
  assert.equal(conflict.complete, true);
  assert.equal(conflict.armorClass.complete, false);
  assert.match(conflict.issues.join(' '), /two-handed/);
  assert.equal(evaluate(purchases, loadout('', '', 'staff')).armorClass.value, 10);
  assert.equal(evaluate(purchases, loadout('', 'large_shield', 'large_shield')).armorClass.complete, true);
  assert.equal(evaluate(purchases, loadout('', '', 'large_shield')).armorClass.complete, false);
});

test('unknown/ambiguous property or equipment data cannot produce equipped AC or purchases', () => {
  const item = equipment.find((entry) => entry.id === 'dagger')!;
  const duplicate = [...equipment, item];
  assert.equal(evaluateEquipmentInventory({ startingEquipment: cash, purchases: [{ id: item.id, count: 1 }], dexterity: 0 },
    packages, duplicate, properties).complete, false);
  const missing = properties.filter((entry) => entry.id !== 'two_handed');
  assert.equal(evaluateEquipmentInventory({ startingEquipment: cash, purchases: [{ id: 'staff', count: 1 }], dexterity: 0 },
    packages, equipment, missing).complete, false);
});

test('saved purchase/loadout restoration preserves choices but clears malformed structures with notices', () => {
  const purchases = [{ id: 'dagger', count: 1 }];
  const choice = loadout('', '', 'dagger');
  assert.deepEqual(restoreEquipmentInventory(purchases, choice), { purchases, loadout: choice, notice: '' });
  assert.deepEqual(restoreEquipmentInventory(undefined, undefined), { purchases: [], loadout: emptyLoadout(), notice: '' });
  const bad = restoreEquipmentInventory([{ id: 'dagger', count: -1 }], { armorId: 1 });
  assert.deepEqual(bad.purchases, []);
  assert.deepEqual(bad.loadout, emptyLoadout());
  assert.match(bad.notice, /Malformed saved/);
  const owned = evaluate(purchases).items;
  assert.equal(pruneEquipmentLoadout(choice, owned).weaponId, 'dagger');
  assert.equal(pruneEquipmentLoadout(choice, []).weaponId, '');
});

test('API derives equipment AC from owned choices and exposes the same inventory evaluation', () => {
  const input = { startingEquipment: packageChoice('armored_warrior'), equipmentPurchases: [],
    equipmentLoadout: loadout('partial_armor', 'large_shield', 'short_sword'), armor: { acBonus: 999 } };
  const api = evaluateCharacter(input);
  const shared = evaluate([], input.equipmentLoadout, input.startingEquipment, api.modifiers.DEX);
  assert.deepEqual(api.equipmentInventory, shared);
  assert.equal(api.derived.ac, 15 + api.modifiers.DEX);
  assert.equal(api.stepStatus.find((step) => step.key === 'armorClass')?.complete, true);
  const removed = evaluateCharacter({ ...input, equipmentLoadout: emptyLoadout() });
  assert.equal(removed.derived.ac, 10 + removed.modifiers.DEX);
});
