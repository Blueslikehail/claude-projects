import { test } from "node:test";
import assert from "node:assert/strict";
import { identifyChord, parseChord } from "../src/core/chords.js";
import { parseNote } from "../src/core/pitch.js";

const notes = (s) => s.split(" ").map(parseNote);

test("parseChord", () => {
  assert.deepEqual(parseChord("Bbm7").pcs, [10, 1, 5, 8]);
  assert.deepEqual(parseChord("E7").pcs, [4, 8, 11, 2]);
  assert.equal(parseChord("Amin").name, "Am");
  assert.equal(parseChord("C#7").name, "Db7");
  assert.deepEqual(parseChord("G9").required, [7, 11, 5], "root, 3rd, 7th; 5th and 9th optional");
  assert.deepEqual(parseChord("A5").required, [9, 4]);
  assert.throws(() => parseChord("Cxyz"));
});

test("identifyChord names common blues chords", () => {
  assert.equal(identifyChord(notes("G3 B3 D4 F4"))[0].name, "G7");
  assert.equal(identifyChord(notes("C4 Eb4 G4"))[0].name, "Cm");
  assert.equal(identifyChord(notes("E3 G#3 B3 D4"))[0].name, "E7");
  assert.equal(identifyChord(notes("A2 E3 A3"))[0].name, "A5");
  assert.equal(identifyChord(notes("D4 F4 A4 D5"))[0].name, "Dm");
  assert.equal(identifyChord(notes("C4 E4 G4"))[0].score, 1);
});

test("identifyChord prefers the bass note as root on ties", () => {
  // A C E G is both Am7 and C6; with A in the bass it is Am7.
  assert.equal(identifyChord(notes("A3 C4 E4 G4"))[0].name, "Am7");
  assert.equal(identifyChord(notes("C4 E4 G4 A4"))[0].name, "C6");
});
