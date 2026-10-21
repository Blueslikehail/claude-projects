import { test } from "node:test";
import assert from "node:assert/strict";
import { FORMS, POSTURES, getForm, formSteps, formPostures, formApplications, validate } from "../src/core/index.js";

test("all posture and form data is valid", () => {
  assert.deepEqual(validate(), []);
});

test("the Yang 28 form has 28 steps that resolve to postures", () => {
  const steps = formSteps(getForm("yang-28"));
  assert.equal(steps.length, 28);
  assert.deepEqual(steps.map((s) => s.number), Array.from({ length: 28 }, (_, i) => i + 1));
  assert.equal(steps[0].posture.id, "commencement");
  assert.equal(steps.at(-1).posture.id, "closing");
});

test("repeated postures appear once in formPostures", () => {
  const form = getForm("yang-28");
  const ids = formPostures(form).map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.filter((id) => id === "single-whip").length, 1);
});

test("every posture in the library is used by some form", () => {
  const used = new Set(FORMS.flatMap((f) => f.steps.map((s) => s.posture)));
  assert.deepEqual(POSTURES.filter((p) => !used.has(p.id)).map((p) => p.id), []);
});

test("applications carry their posture", () => {
  const apps = formApplications(getForm("yang-28"));
  assert.ok(apps.length >= 28 * 1.5);
  for (const a of apps) assert.ok(a.posture.applications.some((x) => x.id === a.id));
});

test("validate reports bad data", () => {
  const bad = [{
    id: "Bad Id", name: "X", pinyin: "x", hanzi: "x", principle: "x", cues: [], energies: ["fly"],
    applications: [{ id: "a", attack: "sneeze", scenario: "s", response: "r", keyPoint: "k", energies: ["peng"] }],
  }];
  const problems = validate(bad, [{ id: "f", name: "F", steps: [{ posture: "missing" }] }]);
  const text = problems.join("\n");
  for (const fragment of ["kebab-case", "at least one cue", 'unknown energy "fly"', 'unknown attack "sneeze"', 'energy "peng" missing', 'unknown posture "missing"']) {
    assert.match(text, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("unknown ids throw", () => {
  assert.throws(() => getForm("nope"), /Unknown form/);
  assert.throws(() => formSteps({ steps: [{ posture: "nope" }] }), /Unknown posture/);
});
