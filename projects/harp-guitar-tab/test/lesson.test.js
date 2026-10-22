import { SLOTS } from "../src/core/lesson/generate.js";
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
  assert.ok(backing.pads.at(-1).duration > 1, "final chord rings");
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

// ---------- styles ----------

import { STYLES, STYLE_IDS, beatTime } from "../src/core/lesson/styles.js";

test("every style has a beginner lick and something at each level for every slot", () => {
  for (const style of STYLE_IDS) {
    for (const slot of new Set([...(STYLES[style].slots ?? SLOTS), "E"])) {
      const levels = LICKS.filter((l) => l.styles.includes(style) && l.slot === slot).map((l) => lickLevel(l.tab));
      assert.ok(levels.includes(1), `${style} ${slot} has no beginner lick`);
    }
  }
  assert.ok(LICKS.every((l) => l.styles.length && l.styles.every((s) => STYLES[s])), "lick styles exist");
});

test("beatTime: swung, straight and triplet positions", () => {
  assert.ok(Math.abs(beatTime(0.5, 60, 2 / 3) - 2 / 3) < 1e-9);
  assert.equal(beatTime(0.5, 60, 0.5), 0.5);
  assert.ok(Math.abs(beatTime(1 / 3, 60) - 1 / 3) < 1e-9, "triplets are exact");
  assert.equal(beatTime(4, 120), 2);
});

test("styles shape the lesson: position, harp, chords, tempo, licks", () => {
  const reed = generateLesson({ songKey: "A", style: "reed", seed: 2 });
  assert.equal(reed.position, 1);
  assert.equal(reed.harpKey, "A", "1st position: harp in the song's key");
  assert.match(reed.title, /^Jimmy Reed in A · A harp, 1st position/);
  assert.equal(reed.tempo, STYLES.reed.tempo.default);
  assert.ok(reed.licks.every((l) => l.id.startsWith("r-")));

  const minor = generateLesson({ songKey: "E", style: "minor", seed: 2 });
  assert.equal(minor.harpKey, "A");
  assert.deepEqual([...new Set(minor.chordTrack.map((c) => c.name))], ["Em7", "Am7", "Bm7"]);
  assert.match(minor.title, /E minor/);
  // No major third of the i chord (G#) in a minor lesson.
  assert.ok(minor.events.every((e) => e.pitches.every((p) => p % 12 !== 8)), "no G# in E minor");

  const slow = generateLesson({ songKey: "E", style: "slow", seed: 2 });
  assert.ok(slow.tempo <= 75);
  assert.ok(slow.backing.pads.length >= 12, "held chords");
  assert.ok(slow.backing.drums.filter((d) => d.kind === "hat").length >= 11 * 12, "12/8 hats");

  const boogie = generateLesson({ songKey: "E", style: "boogie", seed: 2, tempo: 120 });
  const offbeat = boogie.backing.bass[1].time - boogie.backing.bass[0].time;
  assert.ok(Math.abs(offbeat - 0.25) < 1e-9, "straight eighths at 120 bpm");

  const swamp = generateLesson({ songKey: "E", style: "swamp", seed: 2 });
  assert.ok(swamp.backing.drums.some((d) => d.kind === "rim"));
  assert.throws(() => generateLesson({ style: "polka" }), /Unknown style/);
});

test("every style and level renders a playable lesson", () => {
  for (const style of STYLE_IDS) {
    for (const level of [1, 2, 3]) {
      const lesson = generateLesson({ songKey: "G", style, level, seed: level * 7 });
      assert.ok(lesson.events.length > 10, `${style} ${level}`);
      assert.ok(lesson.licks.every((l) => l.level <= level), `${style} level ${level}`);
      const harp = createHarp(lesson.harpKey);
      for (const e of lesson.events) assert.deepEqual(parseToken(e.token, harp).pitches, e.pitches);
    }
  }
});

test("your licks only go into the styles they're for", () => {
  const mine = [{ id: "m1", name: "x", slot: "I", tab: "-2:16" }]; // default: 2nd-position major styles
  const inShuffle = [1, 2, 3, 4, 5].some((seed) => generateLesson({ style: "shuffle", seed, myLicks: mine }).licks.some((l) => l.mine));
  const inReed = [1, 2, 3, 4, 5].some((seed) => generateLesson({ style: "reed", seed, myLicks: mine }).licks.some((l) => l.mine));
  const inMinor = [1, 2, 3, 4, 5].some((seed) => generateLesson({ style: "minor", seed, myLicks: [{ ...mine[0], styles: ["minor"] }] }).licks.some((l) => l.mine));
  assert.deepEqual([inShuffle, inReed, inMinor], [true, false, true]);
});

test("a lesson can follow a recording's drifting beat grid", async () => {
  const { gridTime } = await import("../src/core/lesson/generate.js");
  // Beats that slow down: 0.6 s apart, growing 2 ms per beat, starting at 3 s.
  const beats = Array.from({ length: 120 }, (_, i) => 3 + i * 0.6 + i * i * 0.001);
  const at = gridTime({ beats, startBeat: 4, swing: 2 / 3 });
  assert.equal(at(0), beats[4]);
  assert.ok(Math.abs(at(1) - (beats[4] + (2 / 3) * (beats[5] - beats[4]))) < 1e-12);
  assert.ok(at(500) > beats.at(-1), "extrapolates past the end");
  const lesson = generateLesson({ songKey: "A", seed: 3, choruses: 2, grid: { beats, startBeat: 4, swing: 2 / 3 } });
  assert.equal(lesson.chordTrack[0].time, beats[4]);
  assert.equal(lesson.chordTrack[1].time, beats[8]);
  assert.ok(lesson.chordTrack[13].duration > lesson.chordTrack[0].duration, "bars stretch with the slowing tempo");
  for (const e of lesson.events) {
    const bar = lesson.chordTrack.findLast((c) => c.time <= e.time + 1e-9);
    assert.ok(bar, "every note sits in a bar");
  }
});

test("lickLesson repeats a lick over the chords it was written for; tabLesson plays a long tab", async () => {
  const { lickLesson, tabLesson } = await import("../src/core/lesson/generate.js");
  const iv = LICKS.find((l) => l.id === "j-iv-bounce");
  const lesson = lickLesson({ lick: iv, songKey: "G", repeats: 3 });
  assert.equal(lesson.style, "jug");
  assert.deepEqual(lesson.chordTrack.map((c) => c.name).slice(0, 6), ["C7", "C7", "C7", "C7", "C7", "C7"]);
  assert.equal(lesson.events.length, 3 * 7);
  assert.equal(lesson.bars, 7);
  const shake = lickLesson({ lick: LICKS.find((l) => l.id === "d-i-shake"), songKey: "G" });
  assert.deepEqual(shake.events[0].shake, [77], "draw 5 on a C harp (F5)");
  assert.equal(shake.events[0].token, "-4/5");

  const tab = tabLesson({ tab: Array(30).fill("-2:2").join(" "), style: "delta", songKey: "A" });
  assert.equal(tab.bars, 12, "7.5 bars of notes fit one chorus");
  assert.equal(tab.events.length, 30);
  assert.equal(tab.harpKey, "D");
  assert.ok(tab.backing.guitar.length && tab.backing.drums.every((d) => d.kind === "stomp"));
});
