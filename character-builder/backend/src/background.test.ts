import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { applyBackgroundAttributeGrants, evaluateBackground } from "./background.js";
import type { BackgroundData, BackgroundDraft } from "./background.js";

function data<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), "utf8")) as T;
}

const backgrounds = data<BackgroundData[]>("backgrounds");
const skills = data<Array<{ id: string; tags: string[] }>>("skills");
const attributes = data<Array<{ id: string; tags: string[] }>>("attributes");
const base: BackgroundDraft = {
  background: "artisan", backgroundSkill: "craft", backgroundMethod: "pick", backgroundPicks: ["connect", "trade"],
};
const evaluate = (changes: BackgroundDraft = {}) => evaluateBackground({ ...base, ...changes }, backgrounds, skills, attributes);

test("two legal learning picks complete the background, preserving both grants", () => {
  const result = evaluate();
  assert.equal(result.complete, true);
  assert.deepEqual(result.skills, ["craft", "connect", "trade"]);
  assert.deepEqual(evaluate({ backgroundPicks: ["connect", "connect"] }).skills, ["craft", "connect", "connect"]);
});

test("a method and exactly two legal picks are required", () => {
  assert.equal(evaluate({ backgroundMethod: "" }).complete, false);
  for (const backgroundPicks of [[], ["connect"], ["connect", ""], ["connect", "trade", "know"], ["connect", "magic"]]) {
    assert.equal(evaluate({ backgroundPicks }).complete, false);
  }
  assert.equal(evaluate({ background: "missing" }).complete, false);
});

test("Any Skill cannot broaden pick options, but Combat Skill can", () => {
  assert.equal(evaluate({ background: "laborer", backgroundSkill: "work", backgroundPicks: ["magic", "work"] }).complete, false);
  for (const combat of ["punch", "shoot", "stab"]) {
    assert.equal(evaluate({ background: "soldier", backgroundSkill: combat, backgroundPicks: [combat, "lead"] }).complete, true);
  }
});

test("free skills cannot be replaced or chosen outside their tag", () => {
  const fixed = evaluate({ backgroundSkill: "magic" });
  assert.equal(fixed.complete, false);
  assert.equal(fixed.skills.includes("magic"), false);
  for (const backgroundSkill of ["", "administer", "magic"]) {
    assert.equal(evaluate({ background: "soldier", backgroundSkill, backgroundPicks: ["lead", "notice"] }).complete, false);
  }
});

test("all eight allocations of three dice are allowed", () => {
  for (let mask = 0; mask < 8; mask++) {
    const tables = [0, 1, 2].map((index) => mask & (1 << index) ? "growth" : "learn");
    const result = evaluate({
      backgroundMethod: "roll", backgroundRollTables: tables,
      backgroundRollResults: tables.map((table) => ({ table, roll: 1, choiceId: "STR" })),
    });
    assert.equal(result.complete, true, `allocation ${tables.join(",")}`);
  }
});

test("rolling requires three results matching the allocated tables and die bounds", () => {
  const rolling = {
    backgroundMethod: "roll", backgroundRollTables: ["growth", "learn", "learn"],
    backgroundRollResults: [{ table: "growth", roll: 1, choiceId: "STR" }, { table: "learn", roll: 1 }, { table: "learn", roll: 8 }],
  };
  assert.equal(evaluate(rolling).complete, true);
  assert.equal(evaluate({ ...rolling, backgroundRollResults: [] }).complete, false);
  assert.equal(evaluate({ ...rolling, backgroundRollTables: ["growth", "learn"] }).complete, false);
  assert.equal(evaluate({ ...rolling, backgroundRollTables: ["learn", "learn", "learn"] }).complete, false);
  for (const roll of [0, 7, 1.5, NaN]) {
    const results = [...rolling.backgroundRollResults];
    results[0] = { table: "growth", roll, choiceId: "STR" };
    assert.equal(evaluate({ ...rolling, backgroundRollResults: results }).complete, false);
  }
});

test("growth attribute and Any Skill results require legal choices", () => {
  const draft = {
    backgroundMethod: "roll", backgroundRollTables: ["growth", "growth", "growth"],
    backgroundRollResults: [{ table: "growth", roll: 2, choiceId: "STR" }, { table: "growth", roll: 4, choiceId: "INT" }, { table: "growth", roll: 6, choiceId: "magic" }],
  };
  assert.equal(evaluate(draft).complete, true);
  assert.deepEqual(evaluate(draft).skills, ["craft", "magic"]);
  for (const choiceId of ["", "INT", "magic"]) {
    const results = [...draft.backgroundRollResults];
    results[0] = { table: "growth", roll: 2, choiceId };
    assert.equal(evaluate({ ...draft, backgroundRollResults: results }).complete, false);
  }
});

test("rolled combat choices are restricted and unresolved results are incomplete", () => {
  const draft = {
    background: "soldier", backgroundSkill: "stab", backgroundMethod: "roll", backgroundRollTables: ["learn", "learn", "learn"],
    backgroundRollResults: [{ table: "learn", roll: 1, choiceId: "shoot" }, { table: "learn", roll: 2, choiceId: "punch" }, { table: "learn", roll: 3 }],
  };
  assert.equal(evaluate(draft).complete, true);
  for (const choiceId of ["", "magic"]) {
    const results = [...draft.backgroundRollResults];
    results[0] = { table: "learn", roll: 1, choiceId };
    assert.equal(evaluate({ ...draft, backgroundRollResults: results }).complete, false);
  }
});

test("inactive methods and cached grants never contribute skills", () => {
  const stale = {
    backgroundRollTables: ["growth", "growth", "growth"],
    backgroundRollResults: [1, 2, 3].map(() => ({ table: "growth", roll: 6, choiceId: "magic" })),
    selectedSkills: ["magic"],
  };
  assert.deepEqual(evaluate(stale).skills, ["craft", "connect", "trade"]);
  const rolling = {
    backgroundMethod: "roll", backgroundPicks: ["trade", "know"],
    backgroundRollTables: ["learn", "learn", "learn"],
    backgroundRollResults: [1, 2, 3].map(() => ({ table: "learn", roll: 1, action: "tag_skill", skillId: "magic", label: "Fake" })),
  };
  assert.deepEqual(evaluate(rolling).skills, ["craft", "connect", "connect", "connect"]);
  assert.equal(evaluate(rolling).complete, true);
});

test("growth grants use table counts and reject missing or wrong-tag attribute choices", () => {
  const draft = {
    backgroundMethod: "roll", backgroundRollTables: ["growth", "growth", "growth"],
    backgroundRollResults: [
      { table: "growth", roll: 1, choiceId: "STR", count: 99, actionId: "mental" },
      { table: "growth", roll: 2, choiceId: "STR" },
      { table: "growth", roll: 4, choiceId: "INT" },
    ],
  };
  const result = evaluate(draft);
  assert.equal(result.complete, true);
  assert.deepEqual(result.attributeGrants, [
    { key: "background:roll:0", attributeId: "STR", count: 1 },
    { key: "background:roll:1", attributeId: "STR", count: 2 },
    { key: "background:roll:2", attributeId: "INT", count: 2 },
  ]);
  assert.deepEqual(evaluate({ ...draft, backgroundMethod: "pick" }).attributeGrants, []);
  for (const choiceId of ["", "INT", "missing", "__proto__"]) {
    const results = [...draft.backgroundRollResults];
    results[1] = { ...results[1]!, choiceId };
    const invalid = evaluate({ ...draft, backgroundRollResults: results });
    assert.equal(invalid.complete, false);
    assert.equal(invalid.attributeGrants.some((grant) => grant.key === "background:roll:1"), false);
  }
});

test("background score increases are derived without mutation and capped at 18", () => {
  const scores = { STR: 14, DEX: 17, CON: 18 };
  const grants = [
    { key: "first", attributeId: "STR", count: 1 },
    { key: "second", attributeId: "STR", count: 2 },
    { key: "third", attributeId: "DEX", count: 2 },
    { key: "fourth", attributeId: "CON", count: 2 },
  ];
  const result = applyBackgroundAttributeGrants(scores, grants);
  assert.deepEqual(result.attributes, { STR: 17, DEX: 18, CON: 18 });
  assert.deepEqual(result.bonuses, { STR: 3, DEX: 1, CON: 0 });
  assert.deepEqual(scores, { STR: 14, DEX: 17, CON: 18 });
  assert.deepEqual(applyBackgroundAttributeGrants(scores, grants), result);
  assert.deepEqual(applyBackgroundAttributeGrants(scores, []).attributes, scores);
});

test("invalid table amounts and dice do not award attribute points", () => {
  const draft = { ...base, backgroundMethod: "roll", backgroundRollTables: ["growth", "learn", "learn"],
    backgroundRollResults: [{ table: "growth", roll: 1, choiceId: "STR" }, { table: "learn", roll: 1 }, { table: "learn", roll: 8 }] };
  for (const count of [undefined, 0, -1, 1.5, Infinity]) {
    const catalogue = backgrounds.map((background) => background.id === base.background
      ? { ...background, growth: background.growth.map((row, index) => index === 0 ? { ...row, count } : row) }
      : background);
    const result = evaluateBackground(draft, catalogue, skills, attributes);
    assert.equal(result.complete, false);
    assert.deepEqual(result.attributeGrants, []);
  }
  for (const roll of [0, 7, 1.5]) {
    const result = evaluate({ ...draft, backgroundRollResults: [
      { table: "growth", roll, choiceId: "STR" }, ...draft.backgroundRollResults.slice(1),
    ] });
    assert.deepEqual(result.attributeGrants, []);
  }
  assert.deepEqual(evaluate({ ...draft, backgroundRollTables: ["learn", "learn", "learn"] }).attributeGrants, []);
});
