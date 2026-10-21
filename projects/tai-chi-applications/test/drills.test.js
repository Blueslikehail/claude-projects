import { test } from "node:test";
import assert from "node:assert/strict";
import { getForm, quizQuestion, partnerDrill, attacksInForm, seededRandom, shuffle, ATTACKS } from "../src/core/index.js";

const form = getForm("yang-28");

test("attacksInForm counts applications per attack type", () => {
  const attacks = attacksInForm(form);
  assert.ok(attacks.length >= 8);
  for (const a of attacks) assert.ok(a.id in ATTACKS && a.count > 0);
  assert.equal(attacks.reduce((n, a) => n + a.count, 0), 55);
});

test("quiz questions have one right answer among distinct options", () => {
  const random = seededRandom(42);
  for (let i = 0; i < 200; i++) {
    const q = quizQuestion(form, { random });
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options.map((p) => p.id)).size, 4);
    assert.ok(q.options.some((p) => p.id === q.answer));
    assert.equal(q.answer, q.app.posture.id);
  }
});

test("distractors don't also answer the attack when avoidable", () => {
  const random = seededRandom(7);
  for (let i = 0; i < 100; i++) {
    const q = quizQuestion(form, { attack: "front-kick", random });
    const alsoRight = q.options.filter((p) => p.id !== q.answer && p.applications.some((a) => a.attack === "front-kick"));
    assert.deepEqual(alsoRight, []);
  }
});

test("quiz can filter by attack and rejects unknown ones", () => {
  const q = quizQuestion(form, { attack: "tackle", random: seededRandom(1) });
  assert.equal(q.app.attack, "tackle");
  assert.throws(() => quizQuestion(form, { attack: "sneeze" }), /No applications/);
});

test("partner drill gives each role its part and avoids an immediate repeat", () => {
  const random = seededRandom(3);
  let last = null;
  for (let i = 0; i < 50; i++) {
    const d = partnerDrill(form, { random, exclude: last });
    assert.notEqual(d.app.id, last);
    assert.equal(d.attacker.scenario, d.app.scenario);
    assert.equal(d.defender.posture.id, d.app.posture.id);
    assert.ok(d.attacker.instruction.length > 0);
    last = d.app.id;
  }
});

test("seeded random is reproducible", () => {
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], seededRandom(9)), shuffle([1, 2, 3, 4, 5], seededRandom(9)));
});
