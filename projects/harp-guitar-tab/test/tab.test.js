import { test } from "node:test";
import assert from "node:assert/strict";
import { createHarp } from "../src/core/harmonica.js";
import { mapToHarp } from "../src/core/harpMapper.js";
import { formatHarpTab, parseHarpTab, parseToken, tokenize } from "../src/core/tab.js";
import { noteName } from "../src/core/pitch.js";

const C = createHarp("C");

test("tokenize keeps chords together", () => {
  assert.deepEqual(tokenize("4 -(1 2 3)  (1 _ _ 4) -3↓"), ["4", "-(1 2 3)", "(1 _ _ 4)", "-3↓"]);
});

test("parseToken reads notes, bends, overbends and chords", () => {
  const names = (t) => parseToken(t, C).pitches.map(noteName);
  assert.deepEqual(names("4"), ["C5"]);
  assert.deepEqual(names("-4"), ["D5"]);
  assert.deepEqual(names("-3↓↓"), ["A4"]);
  assert.deepEqual(names("10↓"), ["B6"]);
  assert.deepEqual(names("6↑"), ["Bb5"]);
  assert.deepEqual(names("-(1 2 3 4)"), ["D4", "G4", "B4", "D5"]);
  assert.deepEqual(names("(1 _ _ 4)"), ["C4", "C5"]);
});

test("apostrophes are accepted for bends and normalised to arrows", () => {
  assert.equal(parseToken("-3''", C).token, "-3↓↓");
});

test("impossible tokens are rejected", () => {
  assert.throws(() => parseToken("-5↓", C), /not playable/); // hole 5 does not bend
  assert.throws(() => parseToken("-3↓↓↓↓", C), /not playable/);
  assert.throws(() => parseToken("2↑", C), /not playable/); // overblow 2 not offered
  assert.throws(() => parseToken("11", C), /not playable/);
  assert.throws(() => parseToken("(4)", C), /two holes/);
  assert.throws(() => parseToken("x", C), /not a note/);
});

test("tab round-trips through parse and map", () => {
  const tab = "-2 -3↓ 4 -4↓ -4 -5 6 -(1 2 3) (1 _ _ 4)";
  const mapped = mapToHarp(parseHarpTab(tab, C), C).events;
  // -2 is re-mapped by context; everything else must come back unchanged.
  assert.equal(formatHarpTab(mapped), "3 -3↓ 4 -4↓ -4 -5 6 -(1 2 3) (1 _ _ 4)");
});

test("formatHarpTab breaks lines at pauses and at maxPerLine", () => {
  const ev = (token, time) => ({ token, time, duration: 0.2 });
  const timed = [ev("4", 0), ev("-4", 0.25), ev("5", 2), ev("-5", 2.2)];
  assert.equal(formatHarpTab(timed), "4 -4\n5 -5");
  const untimed = ["1", "2", "3", "4", "5"].map((token) => ({ token }));
  assert.equal(formatHarpTab(untimed, { maxPerLine: 2 }), "1 2\n3 4\n5");
});
