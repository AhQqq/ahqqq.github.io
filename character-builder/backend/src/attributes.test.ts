import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAttributes, getModifier } from "./attributes.js";
import type { AttributeDraft } from "./attributes.js";
import {
  ATTRIBUTE_KEYS, ARRAY_VALUES, allocatedAttributes, createArrayAllocation,
  restoreAttributeAllocation, rollAttributeAllocation, selectAttributeOverride, swapArrayScore,
} from "../../frontend/src/attributeAllocation.js";
import type { AttributeAllocation } from "../../frontend/src/attributeAllocation.js";

const rolled: AttributeAllocation = {
  attributeMethod: "rolled", attributes: { STR: 6, DEX: 8, CON: 10, INT: 12, WIS: 16, CHA: 18 }, attributeOverride: "",
};

test("array selections swap scores while retaining exactly one of each value", () => {
  let allocation = createArrayAllocation();
  for (const key of ATTRIBUTE_KEYS) {
    for (const value of ARRAY_VALUES) {
      const previous = { ...allocation.attributes };
      const other = ATTRIBUTE_KEYS.find((attribute) => previous[attribute] === value)!;
      allocation = swapArrayScore(allocation, key, value);
      assert.equal(allocation.attributes[key], value);
      assert.equal(allocation.attributes[other], previous[key]);
      assert.deepEqual(Object.values(allocation.attributes).sort((a, b) => b - a), [...ARRAY_VALUES]);
      assert.equal(evaluateAttributes(allocation).complete, true);
    }
  }
  assert.deepEqual(swapArrayScore(allocation, "STR", 18), allocation);
  assert.deepEqual(swapArrayScore(rolled, "STR", 14), rolled);
});

test("3d6 rolls are grouped and assigned in STR DEX CON INT WIS CHA order", () => {
  let count = 0;
  const allocation = rollAttributeAllocation(() => Math.floor(count++ / 3) + 1);
  assert.equal(count, 18);
  assert.deepEqual(allocation.attributes, { STR: 3, DEX: 6, CON: 9, INT: 12, WIS: 15, CHA: 18 });
  assert.equal(allocation.attributeOverride, "");
  assert.equal(evaluateAttributes(allocation).complete, true);
  assert.equal(evaluateAttributes(rollAttributeAllocation(() => 1)).complete, true);
  assert.equal(evaluateAttributes(rollAttributeAllocation(() => 6)).complete, true);
});

test("one optional replacement is applied identically by the UI and backend", () => {
  assert.deepEqual(evaluateAttributes(rolled).attributes, rolled.attributes);
  for (const key of ATTRIBUTE_KEYS) {
    const allocation = selectAttributeOverride(rolled, key);
    const result = evaluateAttributes(allocation);
    assert.equal(result.complete, true);
    assert.deepEqual(result.attributes, { ...rolled.attributes, [key]: 14 });
    assert.deepEqual(allocatedAttributes(allocation), result.attributes);
    assert.equal(result.modifiers[key], 1);
    assert.deepEqual(allocation.attributes, rolled.attributes);
  }
});

test("moving or clearing the replacement restores original scores without stacking", () => {
  const first = selectAttributeOverride(rolled, "STR");
  const second = selectAttributeOverride(first, "CON");
  assert.deepEqual(allocatedAttributes(second), { ...rolled.attributes, CON: 14 });
  assert.deepEqual(allocatedAttributes(selectAttributeOverride(second, "")), rolled.attributes);
  assert.deepEqual(allocatedAttributes(first), { ...rolled.attributes, STR: 14 });
  assert.equal(createArrayAllocation().attributeOverride, "");
  assert.equal(rollAttributeAllocation(() => 3).attributeOverride, "");
});

test("array mode and malformed replacement choices are rejected", () => {
  assert.equal(evaluateAttributes({ ...createArrayAllocation(), attributeOverride: "CON" }).complete, false);
  for (const attributeOverride of ["LUCK", "STR,DEX", ["STR", "DEX"], null]) {
    const input = { ...rolled, attributeOverride } as unknown as AttributeDraft;
    const result = evaluateAttributes(input);
    assert.equal(result.complete, false);
    assert.deepEqual(result.attributes, rolled.attributes);
  }
});

test("invalid arrays, scores and missing methods cannot complete the attribute step", () => {
  assert.equal(evaluateAttributes({ attributes: rolled.attributes }).complete, false);
  assert.equal(evaluateAttributes({ ...rolled, attributeMethod: "point-buy" }).complete, false);
  assert.equal(evaluateAttributes({ ...createArrayAllocation(), attributes: { ...createArrayAllocation().attributes, CHA: 14 } }).complete, false);
  assert.equal(evaluateAttributes({ attributeMethod: "rolled", attributes: { STR: 14 } }).complete, false);
  for (const STR of [2, 19, 10.5, NaN, Infinity, "14", null]) {
    const draft = { ...rolled, attributes: { ...rolled.attributes, STR }, attributeOverride: "STR" } as unknown as AttributeDraft;
    assert.equal(evaluateAttributes(draft).complete, false);
  }
});

test("saved allocations preserve originals and replacements, including older rolled drafts", () => {
  const selected = selectAttributeOverride(rolled, "CON");
  assert.deepEqual(restoreAttributeAllocation(JSON.parse(JSON.stringify(selected))), selected);
  assert.deepEqual(restoreAttributeAllocation({ attributeMethod: "rolled", attributes: rolled.attributes }), rolled);
  const array = swapArrayScore(createArrayAllocation(), "CHA", 14);
  assert.deepEqual(restoreAttributeAllocation(array), array);
  assert.deepEqual(restoreAttributeAllocation({ ...array, attributeOverride: "CHA" }), array);
  assert.deepEqual(restoreAttributeAllocation({ ...array, attributes: { ...array.attributes, STR: 18 } }), createArrayAllocation());
  assert.deepEqual(restoreAttributeAllocation({ ...rolled, attributes: { ...rolled.attributes, STR: 9.5 } }), createArrayAllocation());
});

test("modifiers match every rule boundary", () => {
  for (const [score, modifier] of [[3, -2], [4, -1], [7, -1], [8, 0], [13, 0], [14, 1], [17, 1], [18, 2]]) {
    assert.equal(getModifier(score!), modifier);
  }
});
