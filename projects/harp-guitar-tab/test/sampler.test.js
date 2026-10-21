import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { nearestSample, planVoices, rateFor } from "../src/core/audio/sampler.js";

const manifest = JSON.parse(readFileSync(new URL("../web/samples/manifest.json", import.meta.url)));

test("nearest sample and playback rate", () => {
  assert.equal(nearestSample(60, [55, 58, 61]), 61);
  assert.equal(nearestSample(56, [55, 58, 61]), 55);
  assert.equal(nearestSample(99, [55, 58]), 58);
  assert.equal(rateFor(72, 60), 2);
  assert.ok(Math.abs(rateFor(61, 60) - 1.0594630943592953) < 1e-12);
});

test("plan: one voice per note, chords get one per pitch, slides bend the same voice", () => {
  const notes = [
    { time: 0, duration: 0.5, pitches: [71] }, // -3 on a C harp
    { time: 0.5, duration: 0.5, pitches: [69], glide: true }, // slide down to -3↓↓
    { time: 1.2, duration: 0.4, pitches: [62, 67, 71] }, // -(1 2 3)
    { time: 2, duration: 0.3, pitches: [60], glide: true }, // a glide after a chord starts fresh
  ];
  const voices = planVoices(notes, manifest.harmonica);
  assert.equal(voices.length, 1 + 3 + 1);
  const [bend] = voices;
  assert.equal(bend.stop, 1);
  assert.deepEqual(bend.rates.map((r) => [r.time, r.glide]), [[0, 0], [0.5, 0.12]]);
  assert.ok(Math.abs(bend.rates[1].rate - rateFor(69, bend.sample)) < 1e-12);
  assert.deepEqual(voices.slice(1, 4).map((v) => v.start), [1.2, 1.2, 1.2]);
});

test("every instrument covers its range within 2 semitones, and the files exist", () => {
  const ranges = { harmonica: [55, 97], bass: [28, 52], piano: [52, 70], organ: [52, 70] };
  for (const [inst, [lo, hi]] of Object.entries(ranges)) {
    for (let m = lo; m <= hi; m++) assert.ok(Math.abs(nearestSample(m, manifest[inst]) - m) <= 2, `${inst} ${m}`);
    for (const m of manifest[inst]) assert.ok(statSync(new URL(`../web/samples/${inst}/${m}.mp3`, import.meta.url)).size > 1000);
  }
  assert.ok(statSync(new URL("../web/samples/CREDITS.md", import.meta.url)).size > 0, "attribution present");
});
