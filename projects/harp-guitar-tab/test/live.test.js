import { test } from "node:test";
import assert from "node:assert/strict";
import { LiveNoteTracker, LivePitchTracker } from "../src/core/live.js";
import { estimateOffset, meanOffset, scoreTake } from "../src/core/score.js";
import { renderNotes } from "../src/core/audio/synth.js";
import { createHarp } from "../src/core/harmonica.js";
import { parseHarpTab } from "../src/core/tab.js";
import { parseNote } from "../src/core/pitch.js";

/** Stream samples through both trackers in small chunks, like an AudioWorklet does. */
function stream(samples, sampleRate, { chunk = 128, ...noteOptions } = {}) {
  const pitch = new LivePitchTracker(sampleRate);
  const notes = new LiveNoteTracker(noteOptions);
  const events = [];
  for (let i = 0; i < samples.length; i += chunk) {
    for (const frame of pitch.push(samples.subarray(i, i + chunk))) events.push(...notes.push(frame));
  }
  events.push(...notes.flush(pitch.time));
  return events;
}

const riff = (tab, key = "A", step = 0.3) =>
  parseHarpTab(tab, createHarp(key)).map((e, i) => ({ ...e, time: 0.2 + i * step, duration: step }));

test("live trackers find notes and onsets from 128-sample chunks at 48 kHz", () => {
  const notes = riff("-2 -3↓ 4 4 -4↓ -4 -5 6");
  const events = stream(renderNotes(notes, { sampleRate: 48000, noise: 0.01 }), 48000);
  const ons = events.filter((e) => e.type === "on").map((e) => e.note);
  assert.deepEqual(ons.map((n) => n.pitch), notes.map((n) => n.pitches[0]), "incl. the repeated 4");
  ons.forEach((n, i) => assert.ok(Math.abs(n.time - notes[i].time) < 0.03, `onset ${n.time} vs ${notes[i].time}`));
});

test("every note-on is closed by a note-off with a duration", () => {
  const events = stream(renderNotes(riff("4 -4 5"), { sampleRate: 22050 }), 22050);
  assert.deepEqual(events.map((e) => e.type), ["on", "off", "on", "off", "on", "off"]);
  for (const e of events.filter((x) => x.type === "off")) {
    assert.ok(Math.abs(e.note.duration - 0.3) < 0.06, `duration ${e.note.duration}`);
  }
});

test("chunk size does not change the result", () => {
  const samples = renderNotes(riff("-4 -5 6 -6"), { sampleRate: 44100 });
  const ons = (chunk) => stream(samples, 44100, { chunk }).filter((e) => e.type === "on").map((e) => e.note.pitch);
  assert.deepEqual(ons(128), ons(1000));
  assert.deepEqual(ons(37), ons(128));
});

test("silence and quiet noise produce no notes; vibrato is still one note", () => {
  assert.deepEqual(stream(new Float32Array(22050), 22050), []);
  let seed = 3;
  const hiss = Float32Array.from({ length: 22050 }, () => (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1) * 0.004);
  assert.deepEqual(stream(hiss, 22050), []);
  const long = [{ time: 0.1, duration: 1.2, pitches: [parseNote("D5")] }];
  const ons = stream(renderNotes(long, { sampleRate: 22050, vibrato: 0.3 }), 22050).filter((e) => e.type === "on");
  assert.equal(ons.length, 1);
});

test("legato changes are marked connected", () => {
  const notes = riff("-4 -5 6").map((n, i) => ({ ...n, connected: i > 0 }));
  const ons = stream(renderNotes(notes, { sampleRate: 22050 }), 22050).filter((e) => e.type === "on");
  assert.deepEqual(ons.map((e) => e.note.connected), [false, true, true]);
});

// ---------- scoring ----------

const targets = [
  { id: "a", time: 1.0, pitches: [72] },
  { id: "b", time: 1.5, pitches: [74] },
  { id: "c", time: 2.0, pitches: [76] },
  { id: "d", time: 2.5, pitches: [64, 67, 71] }, // chord: any of its notes counts
];

test("scoreTake: hits, wrong notes, misses and extras", () => {
  const played = [
    { time: 1.04, pitch: 72 }, // hit, 40 ms late
    { time: 1.45, pitch: 73 }, // wrong note, right time
    { time: 2.6, pitch: 67 }, // chord hit
    { time: 3.2, pitch: 60 }, // extra
  ];
  const score = scoreTake(targets, played);
  assert.deepEqual(score.results.map((r) => r.status), ["hit", "wrong", "miss", "hit"]);
  assert.equal(score.hits, 2);
  assert.equal(score.accuracy, 0.5);
  assert.equal(score.extras, 1);
  assert.ok(Math.abs(score.results[0].offset - 0.04) < 1e-9);
  assert.equal(score.results[1].played, 73);
});

test("scoreTake: the right pitch wins over a closer wrong note; window is respected", () => {
  const played = [
    { time: 1.0, pitch: 70 },
    { time: 1.1, pitch: 72 },
  ];
  const [first] = scoreTake(targets.slice(0, 1), played).results;
  assert.equal(first.status, "hit");
  assert.equal(scoreTake(targets.slice(0, 1), [{ time: 1.3, pitch: 72 }]).results[0].status, "miss");
  assert.equal(scoreTake(targets.slice(0, 1), [{ time: 1.3, pitch: 72 }], { window: 0.35 }).results[0].status, "hit");
});

test("a played note is used for one target only; meanOffset", () => {
  const twice = [{ id: 1, time: 1, pitches: [72] }, { id: 2, time: 1.1, pitches: [72] }];
  const score = scoreTake(twice, [{ time: 1.05, pitch: 72 }]);
  assert.equal(score.hits, 1);
  assert.equal(scoreTake([], []).accuracy, 0);
  assert.ok(Math.abs(meanOffset(scoreTake(targets, [{ time: 1.1, pitch: 72 }, { time: 1.4, pitch: 74 }])) - 0) < 1e-9);
  assert.equal(meanOffset(scoreTake(targets, [])), null);
});

test("estimateOffset finds a consistent delay even with zero hits", () => {
  const late = targets.slice(0, 3).map((t) => ({ time: t.time + 0.3, pitch: t.pitches[0] }));
  assert.equal(scoreTake(targets.slice(0, 3), late).hits, 0);
  assert.ok(Math.abs(estimateOffset(targets, late) - 0.3) < 1e-9);
  const early = [{ time: 0.8, pitch: 72 }, { time: 1.35, pitch: 74 }, { time: 1.9, pitch: 99 }];
  assert.ok(Math.abs(estimateOffset(targets, early) - -0.175) < 1e-9, "median of -0.2 and -0.15");
  assert.equal(estimateOffset(targets, [{ time: 5, pitch: 72 }]), null);
});
