import { test } from "node:test";
import assert from "node:assert/strict";
import { detectNotation, importTab, readWord } from "../src/core/lesson/importTab.js";

test("readWord understands the common bend, overbend and shake marks", () => {
  const cases = {
    "-4": "-4", "+4": "4", "4": "4", "-3'": "-3↓", "-3''": "-3↓↓", "-3'''": "-3↓↓↓", "-3b": "-3↓", "-3bb": "-3↓↓",
    "-3b2": "-3↓↓", "-3↓↓": "-3↓↓", "-2^": "-2↓", "6o": "6↑", "6ob": "6↑", "-7o": "-7↑", "7od": "-7↑", "10''": "10↓↓",
    "-4/5": "-4/5", "-4/-5": "-4/5", "-4~": "-4/5", "-5sh": "-5/6", "[-4-5]": "-4/5",
    "-123": "-(1 2 3)", "(1 2 3)": "(1 2 3)", "-(1 2 3)": "-(1 2 3)", "(456)": "(4 5 6)", "(-1-2-3)": "-(1 2 3)", "1+2+3": "(1 2 3)",
    "(1 _ _ 4)": "(1 _ _ 4)",
  };
  for (const [word, want] of Object.entries(cases)) assert.equal(readWord(word), want, word);
});

test("readWord rejects what a harp can't play and plain words", () => {
  for (const w of ["-3''''", "4'", "11", "the", "G7", "-12345678"]) assert.equal(readWord(w), null, w);
});

test("other draw notations: (4), 4d / 4b, arrows", () => {
  assert.equal(detectNotation("4 (4) 5 (5) 6 (6)"), "parens");
  assert.deepEqual(importTab("4 (4) 5 (5) (3')").tokens, ["4", "-4", "5", "-5", "-3↓"]);
  assert.equal(detectNotation("4b 4d 5b 5d"), "suffix");
  assert.deepEqual(importTab("4b 4d 6b 3d'").tokens, ["4", "-4", "6", "-3↓"]);
  assert.deepEqual(importTab("↑4 ↓4 ↓3'").tokens, ["4", "-4", "-3↓"]);
  // BluesHarmonica.com: a bare number is a draw, + marks a blow
  assert.equal(detectNotation("4 4+ 3\" 3+ 2\" 2+ 1 1+ 1"), "plus");
  assert.deepEqual(importTab("4 4+ 3\" 3+ 2\" 2+ 1 1+ 1").tokens, ["-4", "4", "-3↓↓", "3", "-2↓↓", "2", "-1", "1", "-1"]);
});

test("importTab skips lyrics and labels, keeps slides, reports what it couldn't read", () => {
  const text = `Juke-style riff (my notes)
Intro:
-2 -3' -3 4 | -4' -4 5 -4
I woke up this morning
-2~-3'' -2 x2
-4 4 -3?? -2`;
  const r = importTab(text);
  assert.deepEqual(r.lines.map((l) => l.tokens.join(" ")), ["-2 -3↓ -3 4 -4↓ -4 5 -4", "-2 ~-3↓↓ -2", "-4 4 -2"]);
  assert.ok(r.warnings.some((w) => w.includes("-3??")));
  assert.ok(r.warnings.some((w) => w.includes("Repeat")));
});

test("importTab keeps our own arrow tab unchanged", () => {
  const tab = "-2 -3↓ 4 -4↓ -4 -5 6 -(1 2 3) (1 _ _ 4) 6↑ -4/5";
  assert.equal(importTab(tab).tokens.join(" "), tab);
});
