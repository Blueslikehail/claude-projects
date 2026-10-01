import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freqToMidi,
  midiToFreq,
  noteName,
  parseNote,
  parsePitchClass,
} from "../src/core/pitch.js";

test("parseNote handles accidentals and octave boundaries", () => {
  assert.equal(parseNote("C4"), 60);
  assert.equal(parseNote("A4"), 69);
  assert.equal(parseNote("Bb3"), 58);
  assert.equal(parseNote("F#4"), 66);
  assert.equal(parseNote("B#3"), 60);
  assert.equal(parseNote("Cb4"), 59);
  assert.equal(parseNote("e♭5"), 75);
  assert.throws(() => parseNote("H4"));
});

test("parsePitchClass wraps", () => {
  assert.equal(parsePitchClass("C"), 0);
  assert.equal(parsePitchClass("Gb"), 6);
  assert.equal(parsePitchClass("B#"), 0);
});

test("noteName uses blues-friendly spelling", () => {
  assert.equal(noteName(60), "C4");
  assert.equal(noteName(61), "Db4");
  assert.equal(noteName(66), "F#4");
  assert.equal(noteName(70), "Bb4");
  assert.equal(noteName(59), "B3");
});

test("frequency conversion", () => {
  assert.equal(freqToMidi(440), 69);
  assert.ok(Math.abs(midiToFreq(60) - 261.6256) < 1e-3);
  assert.ok(Math.abs(freqToMidi(midiToFreq(63.5)) - 63.5) < 1e-9);
});
