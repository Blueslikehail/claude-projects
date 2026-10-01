import { test } from "node:test";
import assert from "node:assert/strict";
import { run, USAGE } from "../src/cli.js";

test("no command prints usage", () => {
  assert.equal(run([]), USAGE);
});

test("tab command", () => {
  assert.equal(run(["tab", "--harp", "A", "E4", "G4", "A4", "Bb4"]), "3 -3↓ 4 -4↓");
  assert.equal(run(["tab", "C4+E4+G4"]), "(1 2 3)");
});

test("layout shows every hole", () => {
  const out = run(["layout", "--harp", "C"]);
  assert.match(out, /^C harp/);
  assert.match(out, /blow +C4 +E4 +G4/);
  assert.match(out, /draw↓↓↓ +Ab4/);
});

test("chord command lists harps or shapes", () => {
  assert.match(run(["chord", "E7"]), /^A +\(position 2 /);
  assert.equal(run(["chord", "E7", "--harp", "C"]), "E7 is not playable on a C harp");
});

test("suggest, name and parse", () => {
  assert.match(run(["suggest", "--song", "E", "E4", "G4", "A4", "Bb4"]), /^A +position 2/);
  assert.match(run(["name", "G3", "B3", "D4", "F4"]), /^G7 +100%/);
  assert.match(run(["parse", "-3''"]), /^-3↓↓ +A4$/);
});
