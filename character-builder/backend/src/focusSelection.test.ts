import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildFocusFamilies, dependentFocusIds, focusInstanceLockReasons,
} from "../../frontend/src/focusSelection.js";
import type { FocusClass, FocusOption } from "../../frontend/src/focusSelection.js";
import { eligibleSelectedFoci } from "./focusBonuses.js";
import { evaluateFocusInstances, pruneFocusInstances, readFocusInstances, removeFocusInstance } from "../../shared/focusCreation.js";

function data<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../../frontend/data/${name}.json`, import.meta.url), "utf8")) as T;
}
const foci = data<FocusOption[]>("foci");
const classes = data<FocusClass[]>("classes");
const warrior = classes.filter((option) => option.id === "warrior");
const mage = classes.filter((option) => option.id === "high");
const focus = (id: string) => foci.find((item) => item.id === id)!;
const savedInstances = (ids: string[]) => readFocusInstances(undefined, ids, foci).instances;

test("all 155 options remain in 103 stable families, including locked levels and classes", () => {
  const families = buildFocusFamilies(foci);
  assert.equal(families.length, 103);
  assert.equal(families.filter((family) => family.levels.length === 2).length, 52);
  assert.deepEqual(families.flatMap((family) => family.levels.map((item) => item.id)).sort(), foci.map((item) => item.id).sort());
  assert.equal(new Set(families.map((family) => family.category)).size, 9);
  assert.ok(families.some((family) => family.id === "divination1"));
  const selected = evaluateFocusInstances(savedInstances(["alert1"]), undefined, foci, warrior, 3);
  assert.equal(selected.complete, true);
  assert.deepEqual(selected.applied, savedInstances(["alert1"]));
  assert.deepEqual(buildFocusFamilies(foci), families);
});

test("same-name foci remain separate; only explicit prerequisite links join levels", () => {
  const families = buildFocusFamilies(foci);
  assert.equal(families.find((family) => family.id === "dwarves1")?.levels.length, 1);
  assert.deepEqual(families.find((family) => family.id === "dwarves_21")?.levels.map((item) => item.id), ["dwarves_21", "dwarves_22"]);
  assert.deepEqual(buildFocusFamilies([focus("alert2"), focus("alert1")])[0]?.levels.map((item) => item.id), ["alert1", "alert2"]);
  const unlinked = { ...focus("alert2"), requirements: [] };
  assert.equal(buildFocusFamilies([focus("alert1"), unlinked]).length, 2);
  const ambiguous = { ...focus("alert2"), requirements: [{ condition: "has_focus", id: "alert1" }, { condition: "has_focus", id: "dwarves1" }] };
  assert.equal(buildFocusFamilies([focus("alert1"), ambiguous]).length, 2);
});

test("higher levels stay readable but locked even with their parents and spare picks", () => {
  for (const option of foci.filter((item) => item.level > 1)) {
    const parents = option.requirements.filter((rule) => rule.condition === 'has_focus').map((rule) => rule.id);
    for (const selected of [[], parents]) {
      const instances = savedInstances(selected);
      assert.ok(focusInstanceLockReasons(option, instances, foci, warrior, classes, 100).some((reason) => reason.includes('only level-1')), option.id);
      const result = evaluateFocusInstances(savedInstances([...selected, option.id]), undefined, foci, warrior, 100);
      assert.equal(result.complete, false, option.id);
      assert.ok(!result.applied.some((item) => item.focusId === option.id), option.id);
    }
    assert.ok(buildFocusFamilies(foci).some((family) => family.levels.includes(option)));
  }
});

test("class locks explain the restriction and follow class archetypes", () => {
  const instances = savedInstances(["divination1"]);
  assert.ok(focusInstanceLockReasons(focus("divination1"), [], foci, warrior, classes, 3).includes('필요 클래스: 마법사'));
  assert.deepEqual(evaluateFocusInstances(instances, undefined, foci, warrior, 3).applied, []);
  assert.deepEqual(focusInstanceLockReasons(focus("divination1"), [], foci, mage, classes, 3), []);
  assert.deepEqual(evaluateFocusInstances(instances, undefined, foci, mage, 3).applied, instances);
});

test("blocked upgrades do not spend picks and saved upgrades can still be removed", () => {
  const upgraded = savedInstances(["alert1", "alert2"]);
  const result = evaluateFocusInstances(upgraded, undefined, foci, warrior, 2);
  assert.equal(result.complete, false);
  assert.deepEqual(result.applied, savedInstances(["alert1"]));
  assert.equal(result.allowances.assignments.length, 1);
  const selected = savedInstances(["alert1", "dwarves1"]);
  assert.equal(evaluateFocusInstances(selected, undefined, foci, warrior, 2).complete, true);
  assert.ok(focusInstanceLockReasons(focus("lucky1"), selected, foci, warrior, classes, 2).some((reason) => reason.includes("no compatible focus allowance")));
  assert.equal(evaluateFocusInstances([...selected, ...savedInstances(["lucky1"])], undefined, foci, warrior, 2).complete, false);
  assert.deepEqual(removeFocusInstance(upgraded, "alert2", foci, warrior, 2), savedInstances(["alert1"]));
});

test("removing level 1 removes its upgrades, but keeps unrelated selections", () => {
  const selected = ["dwarves1", "alert1", "alert2"];
  assert.deepEqual(dependentFocusIds("alert1", selected, foci), ["alert2"]);
  assert.deepEqual(removeFocusInstance(savedInstances(selected), "alert1", foci, warrior, 3), savedInstances(["dwarves1"]));
});

test("dependent removal is transitive and unknown or cyclic requirements fail closed", () => {
  const third = { ...focus("alert2"), id: "third", level: 3, requirements: [{ condition: "has_focus", id: "alert2" }] };
  const catalog = [...foci, third];
  assert.deepEqual(dependentFocusIds("alert1", ["alert1", "alert2", "third"], catalog), ["alert2", "third"]);
  const instances = readFocusInstances(undefined, ["dwarves1", "alert1", "alert2", "third"], catalog).instances;
  assert.deepEqual(removeFocusInstance(instances, "alert1", catalog, warrior, 4), savedInstances(["dwarves1"]));
  const unsupported = { ...focus("alert1"), requirements: [{ condition: "unknown", id: "test" }] };
  assert.ok(focusInstanceLockReasons(unsupported, [], [unsupported], warrior, classes, 3).length);
  assert.deepEqual(evaluateFocusInstances(savedInstances(["alert1"]), undefined, [unsupported], warrior, 3).applied, []);
  const cycle = [
    { ...focus("alert1"), requirements: [{ condition: "has_focus", id: "lucky1" }] },
    { ...focus("lucky1"), requirements: [{ condition: "has_focus", id: "alert1" }] },
  ];
  assert.deepEqual(pruneFocusInstances(savedInstances(["alert1", "lucky1"]), cycle, warrior, 3), []);
});

test("restoration and class changes discard invalid or orphaned levels atomically", () => {
  const ids = ["all_directions_edge_style1", "all_directions_edge_style2", "alert1"];
  assert.deepEqual(pruneFocusInstances(savedInstances(ids), foci, mage, 3), savedInstances(["alert1"]));
  assert.deepEqual(pruneFocusInstances(savedInstances(["alert2", "alert1"]), foci, warrior, 1), savedInstances(["alert1"]));
  assert.deepEqual(pruneFocusInstances(savedInstances(["missing", "alert2", "alert1", "alert1"]), foci, warrior, 3), savedInstances(["alert1"]));
  assert.deepEqual(pruneFocusInstances(savedInstances(["alert1"]), foci, warrior, 0), []);
});

test("frontend prerequisite eligibility agrees with backend across every class", () => {
  for (const option of classes) {
    for (const candidate of foci) {
      const expected = eligibleSelectedFoci([candidate.id], foci, [option]).map((item) => item.id);
      const result = evaluateFocusInstances(savedInstances([candidate.id]), undefined, foci, [option], 100);
      const context = `${option.id}: ${candidate.id}`;
      assert.deepEqual(result.applied.map((item) => item.focusId), expected, context);
      assert.equal(focusInstanceLockReasons(candidate, [], foci, [option], classes, 100).length === 0, expected.length === 1, context);
    }
  }
});
