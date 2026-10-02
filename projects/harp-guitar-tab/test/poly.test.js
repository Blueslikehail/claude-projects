import { test } from "node:test";
import assert from "node:assert/strict";
import { magnitudeSpectrum } from "../src/core/audio/fft.js";
import { chordSegments, estimatePitches, spectralPeaks, trackPitchSets } from "../src/core/audio/poly.js";
import { mergeChords, transcribe } from "../src/core/audio/transcribe.js";
import { renderNotes } from "../src/core/audio/synth.js";
import { createHarp } from "../src/core/harmonica.js";
import { mapToHarp, nearChordShapes } from "../src/core/harpMapper.js";
import { formatHarpTab, parseHarpTab } from "../src/core/tab.js";
import { parseNote } from "../src/core/pitch.js";

const SR = 22050;
const notes = (s) => s.split(" ").map(parseNote);
const TIMBRES = {
  reed: [1, 0.6, 0.45, 0.25, 0.15, 0.08],
  bright: [0.5, 1, 0.3, 0.6, 0.2, 0.3], // 2nd harmonic twice the fundamental
  hollow: [1, 0.1, 0.7, 0.1, 0.4, 0.05], // odd harmonics only, almost
};

/** Most common pitch set in the steady middle of a held sound. */
function heldPitches(pitches, harmonics = TIMBRES.reed) {
  const audio = renderNotes([{ time: 0.05, duration: 0.6, pitches }], { sampleRate: SR, harmonics, noise: 0.005 });
  const counts = new Map();
  for (const f of trackPitchSets(audio, SR).frames.filter((f) => f.time > 0.2 && f.time < 0.5)) {
    const k = f.pitches.join(",");
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0].split(",").filter(Boolean).map(Number);
}

test("FFT magnitude peak and interpolated peak frequency", () => {
  const n = 4096;
  const frame = Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / SR));
  const mags = magnitudeSpectrum(frame);
  const top = mags.indexOf(Math.max(...mags));
  assert.equal(top, Math.round((440 * n) / SR));
  const { peaks } = spectralPeaks(mags, SR);
  assert.ok(Math.abs(peaks.find((p) => p.amp === Math.max(...peaks.map((q) => q.amp))).freq - 440) < 0.5);
  assert.throws(() => magnitudeSpectrum(new Float32Array(1000)), /power of two/);
});

test("harp chords are heard as their notes", () => {
  for (const chord of ["C4 E4 G4", "G4 B4 D5 F5", "D5 F5 A5", "B3 E4 G#4", "E4 G4"]) {
    assert.deepEqual(heldPitches(notes(chord)), notes(chord), chord);
  }
});

test("single notes are not mistaken for chords, whatever the tone colour", () => {
  for (const [name, harmonics] of Object.entries(TIMBRES)) {
    for (let midi = 55; midi <= 96; midi += 5) {
      assert.deepEqual(heldPitches([midi], harmonics), [midi], `${name} ${midi}`);
    }
  }
});

test("estimatePitches: empty input and voice limit", () => {
  assert.deepEqual(estimatePitches([]), []);
  const audio = renderNotes([{ time: 0, duration: 0.3, pitches: notes("C4 E4 G4 Bb4") }], { sampleRate: SR });
  const { peaks } = spectralPeaks(magnitudeSpectrum(audio.subarray(1000, 1000 + 4096)), SR);
  assert.equal(estimatePitches(peaks, { maxVoices: 2 }).length, 2);
});

test("chordSegments: keeps held chords, absorbs flicker, drops blips and single notes", () => {
  const hop = 0.02;
  const seq = [
    ...Array(5).fill([60]),
    ...Array(6).fill([60, 64, 67]),
    [60, 64], // one-frame flicker inside the chord
    ...Array(6).fill([60, 64, 67]),
    ...Array(3).fill([62, 65]), // too short to count
    ...Array(5).fill([]),
  ].map((pitches, i) => ({ time: i * hop, pitches }));
  const segs = chordSegments(seq, hop);
  assert.equal(segs.length, 1);
  assert.deepEqual(segs[0].pitches, [60, 64, 67]);
  assert.ok(Math.abs(segs[0].time - 0.1) < 1e-9);
  assert.ok(Math.abs(segs[0].duration - 0.26) < 1e-9);
});

test("mergeChords: covered notes go, edges are trimmed, onset is refined", () => {
  const mono = [
    { time: 0, duration: 0.5, pitches: [72] },
    { time: 0.45, duration: 0.6, pitches: [60] }, // the chord's own (mis)read note
    { time: 1.0, duration: 0.5, pitches: [74] }, // overlaps the chord end a little
  ];
  const merged = mergeChords(mono, [{ time: 0.52, duration: 0.53, pitches: [60, 64, 67] }]);
  assert.deepEqual(merged.map((n) => n.pitches), [[72], [60, 64, 67], [74]]);
  assert.equal(merged[1].time, 0.45, "onset taken from the single-note pass");
  assert.equal(merged[1].chord, "C");
  assert.ok(Math.abs(merged[2].time - 1.05) < 1e-9 && Math.abs(merged[2].duration - 0.45) < 1e-9);
  assert.equal(merged[0].duration, 0.45, "trimmed to the chord start");
});

test("riffs with chords round-trip through audio", () => {
  for (const [key, tab] of [
    ["C", "4 -4 5 (4 5 6) -4 -(1 2 3) 4"],
    ["A", "-2 -3↓ -(1 2 3) -4 4 -(2 3 4 5) -2"],
  ]) {
    const harp = createHarp(key);
    const events = parseHarpTab(tab, harp).map((e, i) => ({ ...e, time: 0.1 + i * 0.4, duration: 0.38 }));
    const { notes: heard } = transcribe(renderNotes(events, { sampleRate: SR, noise: 0.005 }), SR);
    const mapped = mapToHarp(heard, harp).events;
    assert.equal(formatHarpTab(mapped), tab, key);
  }
});

test("chords get names, and chords: false skips the chord pass", () => {
  const harp = createHarp("A");
  const events = parseHarpTab("-(2 3 4 5)", harp).map((e) => ({ ...e, time: 0.1, duration: 0.6 }));
  const audio = renderNotes(events, { sampleRate: SR });
  const [chord] = mapToHarp(transcribe(audio, SR).notes, harp).events;
  assert.equal(chord.chord, "E7");
  assert.ok(transcribe(audio, SR, { chords: false }).notes.every((n) => n.pitches.length === 1));
});

test("near chord shapes: a missed or extra note still finds the shape", () => {
  const c = createHarp("C");
  // D4 G4 B4 + a stray Eb5: no exact shape; -(1 2 3 4) or -(1 2 3) are closest.
  const near = nearChordShapes(c, notes("D4 G4 B4 Eb5"));
  assert.ok(near.length > 0 && near.every((s) => s.approx));
  assert.ok(["-(1 2 3)", "-(1 2 3 4)"].includes(near[0].token), near[0].token);
  const [mapped] = mapToHarp([{ pitches: notes("D4 G4 B4 Eb5") }], c).events;
  assert.equal(mapped.playable, true);
  assert.equal(mapped.chord, "G");
  assert.deepEqual(nearChordShapes(c, notes("C#4 F#4 A#4")), []);
});
