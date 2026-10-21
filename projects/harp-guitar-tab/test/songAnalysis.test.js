import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeFeatures, analyzeSong, features } from "../src/core/audio/songAnalysis.js";
import { generateLesson } from "../src/core/lesson/generate.js";
import { renderLesson } from "../src/core/audio/band.js";

const SR = 22050;

/** A synthesized band recording that starts `cutBars` bars into the form, after `pad` s of silence. */
function recording({ key, style, tempo, cutBars = 0, pad = 0, seed = 4 }) {
  const lesson = generateLesson({ songKey: key, style, tempo, choruses: 3, seed });
  const full = renderLesson(lesson, { sampleRate: SR });
  const cut = Math.round(lesson.chordTrack[cutBars].time * SR);
  const audio = new Float32Array(Math.round(pad * SR) + full.length - cut);
  audio.set(full.subarray(cut), Math.round(pad * SR));
  const barSec = lesson.chordTrack[1].time - lesson.chordTrack[0].time;
  return { audio, firstChorus: pad + ((12 - (cutBars % 12)) % 12) * barSec, beat: 60 / tempo, pad };
}

const beatError = (beats, pad, beat) => {
  const errs = beats.map((t) => Math.abs(((t - pad) / beat - Math.round((t - pad) / beat)) * beat)).sort((a, b) => a - b);
  return errs[errs.length >> 1];
};

for (const c of [
  { key: "A", style: "shuffle", tempo: 96, cutBars: 4, pad: 0.7, want: { key: "A", minor: false, feel: "shuffle" } },
  { key: "E", style: "boogie", tempo: 128, cutBars: 0, pad: 0.3, want: { key: "E", minor: false, feel: "straight" } },
  { key: "G", style: "slow", tempo: 62, cutBars: 2, pad: 1.1, want: { key: "G", minor: false, feel: "shuffle" } },
  { key: "C", style: "minor", tempo: 90, cutBars: 5, pad: 0.5, want: { key: "C", minor: true, feel: "straight" } },
]) {
  test(`analysis of a ${c.style} band in ${c.key}: key, tempo, feel, beats, chorus start`, () => {
    const rec = recording(c);
    const a = analyzeSong(rec.audio, SR);
    assert.equal(a.key, c.want.key);
    assert.equal(a.minor, c.want.minor);
    assert.ok(Math.abs(a.tempo / c.tempo - 1) < 0.02, `tempo ${a.tempo}`);
    assert.equal(a.feel, c.want.feel);
    assert.ok(beatError(a.beats, rec.pad, rec.beat) < 0.025, "beats within 25 ms");
    assert.ok(Math.abs(a.bars[a.chorusStart].time - rec.firstChorus) < 0.1, `chorus at ${a.bars[a.chorusStart].time}, want ${rec.firstChorus}`);
    assert.ok(a.formFit > 0.6);
  });
}

test("corrections are honoured: tempo, which beat is 1, chorus start, key", () => {
  const rec = recording({ key: "A", style: "shuffle", tempo: 96 });
  const f = features(rec.audio, SR);
  const auto = analyzeFeatures(f);
  const fixed = analyzeFeatures(f, { tempo: 96 * 2, downbeat: 2, chorusStart: 5, key: "D", minor: true });
  assert.ok(Math.abs(fixed.tempo - 192) < 1e-9);
  assert.equal(fixed.downbeat, 2);
  assert.equal(fixed.chorusStart, 5);
  assert.equal(fixed.key, "D");
  assert.equal(fixed.minor, true);
  assert.equal(auto.detectedKey, "A");
  assert.ok(fixed.beats.length > auto.beats.length * 1.8, "double tempo, double beats");
});
