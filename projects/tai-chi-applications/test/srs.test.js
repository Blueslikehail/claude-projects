import { test } from "node:test";
import assert from "node:assert/strict";
import { GRADES, cardsFor, review, dueCards, studyStats, newCardState, formApplications, getForm } from "../src/core/index.js";

const DAY = 86400000;
const now = Date.UTC(2026, 0, 1);

test("each application gives a forward and a reverse card", () => {
  const apps = formApplications(getForm("yang-28"));
  const cards = cardsFor(apps);
  assert.equal(cards.length, apps.length * 2);
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
});

test("good answers grow the interval: 1, 3, then x ease", () => {
  let s = review(newCardState(), GRADES.good, now);
  assert.equal(s.interval, 1);
  s = review(s, GRADES.good, now);
  assert.equal(s.interval, 3);
  s = review(s, GRADES.good, now);
  assert.equal(s.interval, Math.round(3 * 2.5));
  assert.equal(s.due, now + s.interval * DAY);
});

test("again resets and comes back in 10 minutes", () => {
  const learned = { reps: 4, lapses: 0, ease: 2.5, interval: 20, due: now };
  const s = review(learned, GRADES.again, now);
  assert.equal(s.reps, 0);
  assert.equal(s.lapses, 1);
  assert.equal(s.due, now + 10 * 60 * 1000);
  assert.ok(s.ease < 2.5);
});

test("ease never drops below 1.3", () => {
  let s = newCardState();
  for (let i = 0; i < 20; i++) s = review(s, GRADES.again, now);
  assert.equal(s.ease, 1.3);
});

test("easy beats good beats hard", () => {
  const base = { reps: 3, lapses: 0, ease: 2.5, interval: 10, due: now };
  const [h, g, e] = [GRADES.hard, GRADES.good, GRADES.easy].map((gr) => review(base, gr, now).interval);
  assert.ok(h < g && g < e, `${h} < ${g} < ${e}`);
});

test("due cards: overdue first, then a limited number of new cards", () => {
  const cards = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  const states = { a: { due: now + DAY }, b: { due: now - DAY }, c: { due: now - 2 * DAY } };
  assert.deepEqual(dueCards(cards, states, { now, newLimit: 1 }).map((c) => c.id), ["c", "b", "d"]);
  assert.deepEqual(studyStats(cards, states, now), { due: 2, fresh: 2, learned: 1, total: 5 });
});
