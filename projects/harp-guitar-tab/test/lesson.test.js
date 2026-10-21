import { test } from "node:test";
import assert from "node:assert/strict";
import { LICKS, lickLevel, parseLick } from "../src/core/lesson/licks.js";
import { eighthTime, generateLesson, lessonTabLines, rng } from "../src/core/lesson/generate.js";
import { renderLesson } from "../src/core/audio/band.js";
import { HARP_KEYS, createHarp, positionOf } from "../src/core/harmonica.js";
import { parseToken } from "../src/core/tab.js";
import { transcribe } from "../src/core/audio/transcribe.js";

test("every lick is two bars and playable on every harp", () => {
  for (const lick of LICKS) {
    const { tokens, units } = parseLick(lick.tab);
    assert.equal(units, 16, `${lick.id} is ${units} eighths`);
    for (const key of HARP_KEYS) {
      const harp = createHarp(key);
      for (const t of tokens.filter((x) => !x.rest)) assert.doesNotThrow(() => parseToken(t.token, harp), `${lick.id} ${t.token} on ${key}`);
    }
  }
  assert.equal(new Set(LICKS.map((l) => l.id)).size, LICKS.length, "unique ids");
});

test("every slot has licks at every level up to 3", () => {
  for (const slot of ["I", "IV", "V", "T", "E"]) {
    for (const level of [1, 2, 3]) {
      assert.ok(LICKS.some((l) => l.slot === slot && lickLevel(l.tab) <= level), `${slot} at level ${level}`);
    }
  }
});

test("lick levels follow the techniques used", () => {
  assert.equal(lickLevel("-2:8 -(1 2 3):8"), 1);
  assert.equal(lickLevel("-3↓:16"), 2);
  assert.equal(lickLevel("-3↓↓:16"), 3);
  assert.equal(lickLevel("-4:8 ~-4↓:8"), 3);
  assert.equal(lickLevel("(1 _ _ 4):16"), 3);
  assert.equal(lickLevel("6↑:16"), 4);
  assert.deepEqual(parseLick("-4:2 ~-4↓:2 r:4").tokens.map((t) => [t.token, t.glide, t.rest]), [
    ["-4", false, false],
    ["-4↓", true, false],
    ["r", false, true],
  ]);
});

test("shuffle timing: off-beat eighths land two thirds into the beat", () => {
  assert.equal(eighthTime(0, 60), 0);
  assert.ok(Math.abs(eighthTime(1, 60) - 2 / 3) < 1e-9);
  assert.equal(eighthTime(2, 60), 1);
  assert.equal(eighthTime(1, 60, false), 0.5);
  assert.equal(eighthTime(16, 120), 4);
});

test("a lesson: cross harp, 12-bar chords, events inside the form", () => {
  const lesson = generateLesson({ songKey: "E", level: 2, tempo: 90, seed: 5 });
  assert.equal(lesson.harpKey, "A");
  assert.equal(positionOf(lesson.harpKey, lesson.songKey), 2);
  assert.deepEqual(
    lesson.chordTrack.map((c) => c.name),
    ["E7", "E7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "E7"],
    "single chorus resolves to I in bar 12",
  );
  assert.ok(Math.abs(lesson.duration - 12 * 4 * (60 / 90)) < 1e-9);
  const harp = createHarp("A");
  let prev = -1;
  for (const e of lesson.events) {
    assert.ok(e.time >= prev && e.time + e.duration <= lesson.duration + 1e-9);
    prev = e.time;
    assert.deepEqual(parseToken(e.token, harp).pitches, e.pitches);
  }
  assert.ok(lesson.licks.every((l) => l.level <= 2));
  assert.equal(lesson.licks.length, 6);
});

test("lessons are reproducible per seed and vary between seeds", () => {
  const a = generateLesson({ songKey: "G", level: 3, seed: 11 });
  const b = generateLesson({ songKey: "G", level: 3, seed: 11 });
  assert.deepEqual(a.events, b.events);
  const ids = new Set();
  for (let seed = 1; seed <= 8; seed++) ids.add(generateLesson({ songKey: "G", level: 3, seed }).licks.map((l) => l.id).join());
  assert.ok(ids.size >= 6, `only ${ids.size} different lessons from 8 seeds`);
  const r = rng(1);
  assert.ok([r(), r(), r()].every((x) => x >= 0 && x < 1));
});

test("two choruses: turnaround to V after the first, ending on I after the last", () => {
  const lesson = generateLesson({ songKey: "A", choruses: 2, seed: 2 });
  assert.equal(lesson.bars, 24);
  assert.equal(lesson.chordTrack[11].name, "E7");
  assert.equal(lesson.chordTrack[23].name, "A7");
  assert.equal(lesson.licks.at(-1).slot, "E");
  assert.equal(lesson.licks[5].slot, "T");
});

test("tab lines show two bars each with their chords", () => {
  const lines = lessonTabLines(generateLesson({ songKey: "E", seed: 3 }));
  assert.equal(lines.length, 6);
  assert.deepEqual(lines.map((l) => l.chords), ["E7", "E7", "A7", "E7", "B7 A7", "E7"]);
  assert.ok(lines.every((l) => l.tab.length > 0));
});

test("backing: bass, comp and drums cover the form; final bar rings", () => {
  const { backing, duration } = generateLesson({ songKey: "E", seed: 1 });
  assert.equal(backing.bass.length, 11 * 8 + 1);
  assert.ok(backing.bass.every((n) => n.pitches[0] >= 28 && n.pitches[0] <= 52));
  assert.ok(backing.drums.some((d) => d.kind === "crash"));
  assert.ok(backing.comp.at(-1).duration > 1);
  assert.ok(backing.comp.every((c) => c.time < duration));
});

test("rendering: parts mix, the harp part alone transcribes back to the lesson tab", () => {
  const lesson = generateLesson({ songKey: "E", level: 2, tempo: 80, seed: 3 });
  const sampleRate = 22050;
  const full = renderLesson(lesson, { sampleRate });
  const backing = renderLesson(lesson, { sampleRate, harp: false });
  assert.equal(full.length, backing.length);
  let peak = 0;
  for (const x of full) peak = Math.max(peak, Math.abs(x));
  assert.ok(peak > 0.1 && peak <= 0.95 + 1e-6, `peak ${peak}`);
  const energy = (x) => x.reduce((a, v) => a + v * v, 0);
  assert.ok(energy(backing) > 0 && energy(full) > energy(backing));

  // Sanity check that the rendered harp is what the tab says (synthetic, so exact).
  const harpOnly = renderLesson(lesson, { sampleRate, backing: false });
  // (Pitches, not tokens: G is -2 or 3, and the lesson's own choice is kept in the app.)
  const heard = transcribe(harpOnly, sampleRate).notes.map((n) => n.pitches.join("+"));
  assert.deepEqual(heard, lesson.events.map((e) => e.pitches.join("+")));
});
