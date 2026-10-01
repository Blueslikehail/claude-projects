import { test } from "node:test";
import assert from "node:assert/strict";
import { createHarp } from "../src/core/harmonica.js";
import { mapToHarp, suggestHarps } from "../src/core/harpMapper.js";
import { parseNote } from "../src/core/pitch.js";

// "C4 E4+G4" -> [{ pitches: [60] }, { pitches: [64, 67] }]
const events = (s) => s.split(" ").map((n) => ({ pitches: n.split("+").map(parseNote) }));
const tokens = (s, key = "C", opts) =>
  mapToHarp(events(s), createHarp(key), opts).events.map((e) => e.token);

const E_BLUES = "E4 G4 A4 Bb4 B4 D5 E5";

test("E blues scale on an A harp (2nd position)", () => {
  assert.deepEqual(tokens(E_BLUES, "A"), ["-2", "-3↓", "4", "-4↓", "-4", "-5", "6"]);
});

test("single notes map to their hole and breath", () => {
  assert.deepEqual(tokens("C4 D4 E4 B4 D5 F5"), ["1", "-1", "2", "-3", "-4", "-5"]);
});

test("G is -2 by default, 3 when it saves real movement", () => {
  assert.equal(tokens("G4")[0], "-2");
  assert.equal(tokens("D4 G4 D4")[1], "-2"); // next to hole 1
  assert.equal(tokens("B4 G4 B4")[1], "3"); // same hole as -3, just change breath
  assert.equal(tokens("C5 G4 C5")[1], "3"); // between 4 blows
});

test("chords and splits inside a riff", () => {
  assert.deepEqual(tokens("C4+E4+G4 D4+G4+B4 C4+C5"), ["(1 2 3)", "-(1 2 3)", "(1 _ _ 4)"]);
});

test("unplayable notes are marked and do not break the rest", () => {
  const harp = createHarp("C", { overbends: false });
  const out = mapToHarp(events("C5 Eb5 E5"), harp);
  assert.deepEqual(out.events.map((e) => e.token), ["4", "?Eb5", "5"]);
  assert.equal(out.unplayable, 1);
  assert.equal(out.events[1].playable, false);
  assert.deepEqual(tokens("C2 C4+Db4"), ["?C2", "?(C4 Db4)"]);
});

test("timing is passed through", () => {
  const out = mapToHarp([{ pitches: [60], time: 1.5, duration: 0.25 }], createHarp("C"));
  assert.equal(out.events[0].time, 1.5);
  assert.equal(out.events[0].duration, 0.25);
});

test("suggestHarps puts the cross harp first for a blues riff", () => {
  const [best] = suggestHarps(events(E_BLUES), { songKey: "E" });
  assert.equal(best.key, "A");
  assert.equal(best.position, 2);
  assert.equal(best.unplayable, 0);
});

test("suggestHarps can shift a low guitar riff into harp range", () => {
  const guitarRiff = "E2 G2 A2 B2 D3 E3";
  assert.ok(suggestHarps(events(guitarRiff)).every((s) => s.unplayable > 0));
  const [best] = suggestHarps(events(guitarRiff), { octaveShifts: [0, 1, 2] });
  assert.equal(best.unplayable, 0);
  assert.ok(best.octaves > 0);
});
