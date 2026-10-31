import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { eligibleSelectedFoci, evaluateFocusBonuses } from "./focusBonuses.js";
import type { FocusData } from "./focusBonuses.js";

function data<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), "utf8")) as T;
}

const foci = data<FocusData[]>("foci");
const skills = data<Array<{ id: string; tags: string[] }>>("skills");
const attributes = data<Array<{ id: string; tags: string[] }>>("attributes");
const evaluate = (ids: string[], choices: unknown = {}) => evaluateFocusBonuses(
  ids.map((id) => foci.find((focus) => focus.id === id)!), choices, skills, attributes,
);

test("fixed skills and signed modifiers apply automatically", () => {
  const result = evaluate(["accipiter1"]);
  assert.equal(result.complete, true);
  assert.deepEqual(result.skills, ["exert"]);
  assert.deepEqual(result.modifierBonuses, { STR: 0, DEX: 1, CON: -1, INT: 0, WIS: 0, CHA: 0 });
  assert.deepEqual(result.details[0]?.choices, []);
});

test("combat skills are constrained by tags and unresolved choices remain incomplete", () => {
  const id = "all_directions_edge_style1";
  assert.equal(evaluate([id]).complete, false);
  assert.deepEqual(evaluate([id]).details[0]?.choices[0]?.options, ["punch", "shoot", "stab"]);
  assert.deepEqual(evaluate([id], { [id]: { 0: ["shoot"] } }).skills, ["shoot"]);
  const invalid = evaluate([id], { [id]: { 0: ["magic"] } });
  assert.equal(invalid.complete, false);
  assert.deepEqual(invalid.skills, []);
});

test("explicit IDs, exclusions and unrestricted skill choices follow the JSON", () => {
  assert.deepEqual(evaluate(["ghoul1"]).details[0]?.choices[0]?.options, ["STR", "DEX"]);
  const allowed = evaluate(["chattel1"]).details[0]?.choices[0]?.options ?? [];
  for (const id of ["magic", "punch", "shoot", "stab"]) assert.equal(allowed.includes(id), false);
  assert.equal(allowed.includes("craft"), true);
  assert.equal(evaluate(["elves1"]).details[0]?.choices[0]?.options.length, skills.length);
  assert.deepEqual(evaluate(["wrathful_mountain_style1"]).details[0]?.choices[0]?.options, ["punch", "stab"]);
});

test("modifier choices stack and changing or removing a choice removes its former adjustment", () => {
  const dex = evaluate(["accipiter1", "ghoul1"], { ghoul1: { 1: ["DEX"] } });
  assert.equal(dex.modifierBonuses.DEX, 2);
  const str = evaluate(["accipiter1", "ghoul1"], { ghoul1: { 1: ["STR"] } });
  assert.equal(str.modifierBonuses.DEX, 1);
  assert.equal(str.modifierBonuses.STR, 1);
  const removed = evaluate(["accipiter1"], { ghoul1: { 1: ["STR"] } });
  assert.equal(removed.modifierBonuses.STR, 0);
  assert.equal(removed.skills.includes("sneak"), false);
  assert.equal(evaluate(["ghoul1"], { ghoul1: { 1: ["INT"] } }).complete, false);
});

test("penalty choices preserve their negative sign", () => {
  const result = evaluate(["dwarves1"], { dwarves1: { 2: ["DEX"] } });
  assert.equal(result.complete, true);
  assert.equal(result.modifierBonuses.CON, 1);
  assert.equal(result.modifierBonuses.DEX, -1);
  assert.deepEqual(result.skills, ["craft"]);
});

test("duplicate IDs do not grant a focus twice, but separate skill grants are retained", () => {
  assert.deepEqual(evaluate(["accipiter1", "accipiter1"]).skills, ["exert"]);
  assert.deepEqual(evaluate(["catalytic_soul_style1", "ghost_archer_style1"]).skills, ["shoot", "shoot"]);
  assert.equal(evaluate(["accipiter1", "accipiter1"]).modifierBonuses.DEX, 1);
});

test("stale and malformed client choice payloads cannot add grants or crash evaluation", () => {
  for (const choices of [null, [], "shoot", { ghoul1: null }, { ghoul1: { 1: "STR" } }, { ghoul1: { 1: [{ id: "STR" }] } }]) {
    const result = evaluate(["ghoul1"], choices);
    assert.equal(result.complete, false);
    assert.equal(result.modifierBonuses.STR, 0);
  }
  assert.equal(evaluate(["ghoul1"], { ghoul1: { 1: ["STR", "DEX"] } }).complete, false);
  assert.deepEqual(evaluate([], { ghoul1: { 1: ["STR"] } }).skills, []);
});

test("eligibility resolves class restrictions and prerequisite chains before bonuses", () => {
  const chain: FocusData[] = [
    { id: "child", name: "Child", bonus: [], requirements: [{ condition: "has_focus", id: "parent" }] },
    { id: "parent", name: "Parent", bonus: [], requirements: [{ condition: "is_class", id: "warrior" }] },
  ];
  assert.equal(eligibleSelectedFoci(["child", "parent"], chain, [{ id: "expert", archetype: "expert" }]).length, 0);
  assert.equal(eligibleSelectedFoci(["child"], chain, [{ id: "warrior", archetype: "warrior" }]).length, 0);
  assert.equal(eligibleSelectedFoci(["child", "parent"], chain, [{ id: "warrior", archetype: "warrior" }]).length, 2);
  assert.equal(eligibleSelectedFoci(["missing"], chain, []).length, 0);
});

test("choice counts produce separate validated slots", () => {
  const focus: FocusData = { id: "two", name: "Two", requirements: [], bonus: [{ action: "choice_skill", count: 2, ids: ["punch", "shoot", "stab"] }] };
  const valid = evaluateFocusBonuses([focus], { two: { 0: ["punch", "shoot"] } }, skills, attributes);
  assert.equal(valid.complete, true);
  assert.deepEqual(valid.skills, ["punch", "shoot"]);
  assert.equal(evaluateFocusBonuses([focus], { two: { 0: ["punch", "punch"] } }, skills, attributes).complete, false);
  assert.equal(evaluateFocusBonuses([focus], { two: { 0: ["punch"] } }, skills, attributes).complete, false);
});

test("all encoded bonuses resolve with legal choices", () => {
  for (const focus of foci) {
    const preview = evaluate([focus.id]);
    const choices: Record<string, string[]> = {};
    for (const choice of preview.details[0]?.choices ?? []) {
      const slots = choices[choice.bonusIndex] ??= [];
      slots[choice.slotIndex] = choice.options[choice.slotIndex]!;
    }
    const result = evaluate([focus.id], { [focus.id]: choices });
    assert.equal(result.complete, true, `${focus.id}: ${result.issues.join("; ")}`);
  }
});

test("Orcs and Developed Attribute apply their encoded signed adjustments", () => {
  const developed = evaluate(["developed_attribute1"], { developed_attribute1: { 0: ["STR"] } });
  assert.equal(developed.complete, true);
  assert.deepEqual(developed.modifierBonuses, { STR: 1, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 });
  const result = evaluate(["orcs1"], { orcs1: { 1: ["stab"] } });
  assert.equal(result.complete, true);
  assert.deepEqual(result.modifierBonuses, { STR: 1, DEX: 0, CON: 1, INT: -1, WIS: 0, CHA: 0 });
});
