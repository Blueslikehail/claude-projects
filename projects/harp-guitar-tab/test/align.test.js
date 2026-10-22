import { test } from "node:test";
import assert from "node:assert/strict";
import { alignTab, quantize, rhythmFromTimes } from "../src/core/audio/align.js";
import { renderLesson } from "../src/core/audio/band.js";
import { createHarp } from "../src/core/harmonica.js";
import { tabLesson } from "../src/core/lesson/generate.js";
import { parseLick } from "../src/core/lesson/licks.js";
import { beatTime } from "../src/core/lesson/styles.js";
import { parseToken } from "../src/core/tab.js";

const RATE = 22050;

test("quantize: beats, swung off-beats, sixteenths, triplets", () => {
  const beats = Array.from({ length: 8 }, (_, i) => i * 0.5); // 120 bpm
  assert.equal(quantize(1.0, beats), 4);
  assert.equal(quantize(1.0 + 0.5 * (2 / 3) + 0.01, beats, 2 / 3), 5, "swung eighth");
  assert.equal(quantize(1.0 + 0.25, beats, 0.5), 5, "straight eighth");
  assert.equal(quantize(1.0 + 0.125, beats, 0.5), 4.5, "sixteenth");
  assert.ok(Math.abs(quantize(1.0 + 0.5 / 3, beats, 0.5) - (4 + 2 / 3)) < 1e-9, "triplet");
});

test("rhythmFromTimes: lead-in rest from the bar line, durations, rests after short notes", () => {
  const beats = Array.from({ length: 16 }, (_, i) => i * 0.5);
  const notes = [
    { token: "-2", time: 0.5, end: 0.95 }, // beat 1 of bar 1 (beat 0 is the downbeat)
    { token: "-3↓", time: 1.0, end: 1.2 },
    { token: "4", time: 1.5, end: 1.7 }, // then silence for a beat and a half
    { token: "-2", time: 2.75, end: 3.4 },
  ];
  const { tab, startBeat } = rhythmFromTimes(notes, { beats, swing: 0.5, downbeat: 0 });
  assert.equal(startBeat, 0);
  assert.equal(tab, "r:2 -2:2 -3↓:2 4:1 r:4 -2:3");
});

/** Render a tab over a band, then find it again with only the notes and the beat grid. */
function roundTrip(tab, style, { songKey = "G", tempo, harpGain } = {}) {
  const lesson = tabLesson({ tab, style, songKey, tempo });
  const lead = Math.round(0.5 * RATE); // half a second before the band starts
  const samples = new Float32Array(lead + Math.ceil((lesson.duration + 2) * RATE));
  samples.set(renderLesson(lesson, { sampleRate: RATE }), lead);
  const harp = createHarp(lesson.harpKey);
  const notes = parseLick(tab).tokens.filter((t) => !t.rest).map((t) => ({ token: t.token, glide: t.glide, pitches: parseToken(t.token, harp).pitches }));
  const beats = Array.from({ length: lesson.bars * 4 + 1 }, (_, i) => 0.5 + beatTime(i, lesson.tempo, lesson.swing));
  const found = alignTab(samples, RATE, notes, { beats, swing: lesson.swing, downbeat: 0 });
  return { found, lesson };
}

test("alignTab finds a tab's rhythm in a shuffle band recording", () => {
  const tab = "-2:2 -3↓:1 -3:1 -4:2 5:2 -4:4 r:4 -2:1 -2:1 -3↓:2 4:2 -4:2 -3↓:2 -2:6";
  const { found, lesson } = roundTrip(tab, "shuffle");
  const times = lesson.events.map((e) => e.time + 0.5);
  const err = found.notes.map((n, i) => Math.abs(n.time - times[i]));
  assert.ok(Math.max(...err) < 0.06, `onsets within 60 ms: ${err.map((e) => e.toFixed(3))}`);
  // Same notes at the same places; only the last note's length is a guess.
  assert.deepEqual(found.tab.split(" ").slice(0, -1), tab.split(" ").slice(0, -1));
  assert.ok(Math.abs(found.tempo - lesson.tempo) <= 2);
});

test("alignTab with an acoustic Delta band and triplets", () => {
  const tab = "-2:2/3 -3↓:2/3 -3:2/3 -4:2 -3↓:2 -2:4 r:4 -1:2 -2:2 -3:2 -2:2";
  const { found, lesson } = roundTrip(tab, "delta");
  const times = lesson.events.map((e) => e.time + 0.5);
  const err = found.notes.map((n, i) => Math.abs(n.time - times[i]));
  assert.ok(Math.max(...err) < 0.06, `onsets within 60 ms: ${err.map((e) => e.toFixed(3))}`);
  const positions = (t) => {
    let u = 0;
    return parseLick(t).tokens.flatMap((x) => {
      const at = u;
      u += x.units;
      return x.rest ? [] : [Math.round(at * 6)];
    });
  };
  assert.deepEqual(positions(found.tab), positions(tab), found.tab);
});
