import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HARP_KEYS,
  actionsForMidi,
  chordShapes,
  chordShapesForChord,
  chordShapesForMidis,
  createHarp,
  formatAction,
  harpForSong,
  harpOffset,
  positionOf,
  songKeyForHarp,
} from "../src/core/harmonica.js";
import { parseChord } from "../src/core/chords.js";
import { parseNote } from "../src/core/pitch.js";

const notes = (s) => s.split(" ").map(parseNote);
const tokensFor = (harp, name) => actionsForMidi(harp, parseNote(name)).map((a) => a.token);

test("C harp natural notes follow Richter tuning", () => {
  const harp = createHarp("C");
  assert.deepEqual(harp.holes.map((h) => h.blow), notes("C4 E4 G4 C5 E5 G5 C6 E6 G6 C7"));
  assert.deepEqual(harp.holes.map((h) => h.draw), notes("D4 G4 B4 D5 F5 A5 B5 D6 F6 A6"));
});

test("harp keys span G (lowest) to F# (highest)", () => {
  assert.equal(harpOffset("G"), -5);
  assert.equal(harpOffset("F#"), 6);
  assert.equal(createHarp("A").holes[0].blow, parseNote("A3"));
  assert.equal(createHarp("F#").holes[0].blow, parseNote("F#4"));
  assert.equal(createHarp("a#").key, "Bb");
  assert.equal(HARP_KEYS.length, 12);
});

test("token notation: minus for draw, one arrow per semitone", () => {
  assert.equal(formatAction({ hole: 4, breath: "blow" }), "4");
  assert.equal(formatAction({ hole: 4, breath: "draw" }), "-4");
  assert.equal(formatAction({ hole: 3, breath: "draw", bend: 2 }), "-3↓↓");
  assert.equal(formatAction({ hole: 10, breath: "blow", bend: 1 }), "10↓");
  assert.equal(formatAction({ hole: 6, breath: "blow", over: true }), "6↑");
  assert.equal(formatAction({ hole: 7, breath: "draw", over: true }), "-7↑");
});

test("bends: draw bends on holes 1-4 and 6, blow bends on 8-10", () => {
  const harp = createHarp("C");
  const bends = (hole, breath) =>
    harp.actions.filter((a) => a.hole === hole && a.breath === breath && a.bend).length;
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((h) => bends(h, "draw")), [1, 2, 3, 1, 0, 1]);
  assert.deepEqual([7, 8, 9, 10].map((h) => bends(h, "blow")), [0, 1, 1, 2]);
  assert.deepEqual(tokensFor(harp, "Ab4"), ["-3↓↓↓"]);
  assert.deepEqual(tokensFor(harp, "Bb6"), ["10↓↓"]);
});

test("overblows and overdraws sound a semitone above the higher reed", () => {
  const harp = createHarp("C");
  assert.deepEqual(tokensFor(harp, "Eb5"), ["4↑"]);
  assert.deepEqual(tokensFor(harp, "Bb5"), ["6↑"]);
  assert.deepEqual(tokensFor(harp, "Db6"), ["-7↑"]);
  assert.deepEqual(tokensFor(harp, "Db7"), ["-10↑"]);
  assert.deepEqual(tokensFor(createHarp("C", { overbends: false }), "Eb5"), []);
});

test("with overbends a C harp is fully chromatic; without, six notes are missing", () => {
  const harp = createHarp("C");
  const missing = [];
  for (let m = 60; m <= 97; m++) if (actionsForMidi(harp, m).length === 0) missing.push(m);
  assert.deepEqual(missing, []);
  const plain = createHarp("C", { overbends: false });
  const gaps = [];
  for (let m = 60; m <= 96; m++) if (actionsForMidi(plain, m).length === 0) gaps.push(m);
  assert.deepEqual(gaps, notes("Eb4 Eb5 F#5 Bb5 Db6 Ab6"));
});

test("G4 is both -2 and 3", () => {
  assert.deepEqual(tokensFor(createHarp("C"), "G4").sort(), ["-2", "3"]);
});

test("positions", () => {
  assert.equal(harpForSong("E", 2), "A");
  assert.equal(harpForSong("G", 2), "C");
  assert.equal(harpForSong("A", 1), "A");
  assert.equal(harpForSong("D", 3), "C");
  assert.equal(songKeyForHarp("C", 2), "G");
  assert.equal(songKeyForHarp("C", 12), "F");
  for (const key of HARP_KEYS) {
    for (let p = 1; p <= 12; p++) assert.equal(positionOf(key, songKeyForHarp(key, p)), p);
  }
});

test("chord shapes: contiguous and tongue-blocked", () => {
  const harp = createHarp("C");
  const tokens = chordShapes(harp).map((s) => s.token);
  assert.ok(tokens.includes("(1 2 3)"));
  assert.ok(tokens.includes("-(1 2 3 4)"));
  assert.ok(tokens.includes("(1 _ _ 4)"));
  assert.ok(tokens.includes("(1 2 _ 4)"));
  assert.ok(!tokens.includes("(1 2 3 4 5)"), "wider than the mouth");
  assert.deepEqual(chordShapesForMidis(harp, notes("C4 E4 G4")).map((s) => s.token), ["(1 2 3)"]);
  assert.deepEqual(chordShapesForMidis(harp, notes("C4 C5")).map((s) => s.token), ["(1 _ _ 4)"]);
  assert.deepEqual(chordShapesForMidis(harp, notes("C4 Eb4 G4")), []);
});

test("named chords on a harp", () => {
  const c = createHarp("C");
  const shapes = (name, harp = c) => chordShapesForChord(harp, parseChord(name)).map((s) => s.token);
  assert.deepEqual(shapes("Dm"), ["-(4 5 6)", "-(8 9 10)"]);
  assert.deepEqual(shapes("G7"), ["-(2 3 4 5)"]);
  assert.ok(shapes("G").includes("-(1 2 3 4)"));
  assert.ok(shapes("C").includes("(4 5 6)"));
  assert.deepEqual(shapes("E7"), []);
  // 2nd position on an A harp gives the E chord and E7 for a blues in E.
  assert.deepEqual(shapes("E7", createHarp("A")), ["-(2 3 4 5)"]);
});
