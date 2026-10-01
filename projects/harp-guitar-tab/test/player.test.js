import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeNoteIndex,
  applyNoteEdits,
  applyTokenEdits,
  makeLoop,
  noteIndexAt,
  phrases,
} from "../src/core/player.js";
import { candidates, mapToHarp } from "../src/core/harpMapper.js";
import { createHarp } from "../src/core/harmonica.js";
import { resolvePath } from "../scripts/serve.mjs";

const ev = (time, duration = 0.2, extra = {}) => ({ time, duration, pitches: [72], ...extra });
const events = [ev(0), ev(0.3), ev(0.6), ev(2), ev(2.3)];

test("noteIndexAt / activeNoteIndex", () => {
  assert.equal(noteIndexAt(events, -1), -1);
  assert.equal(noteIndexAt(events, 0), 0);
  assert.equal(noteIndexAt(events, 0.25), 0);
  assert.equal(noteIndexAt(events, 1.5), 2);
  assert.equal(noteIndexAt(events, 99), 4);
  assert.equal(activeNoteIndex(events, 0.1), 0);
  assert.equal(activeNoteIndex(events, 0.25), -1, "between notes");
  assert.equal(activeNoteIndex([], 1), -1);
});

test("phrases split at pauses and at maxNotes, never before a glide", () => {
  assert.deepEqual(
    phrases(events).map((p) => [p.first, p.last]),
    [[0, 2], [3, 4]],
  );
  const p = phrases(events)[1];
  assert.equal(p.start, 2);
  assert.ok(Math.abs(p.end - 2.5) < 1e-9);
  const many = Array.from({ length: 5 }, (_, i) => ev(i * 0.3, 0.2, { glide: i === 2 }));
  assert.deepEqual(phrases(many, { maxNotes: 2 }).map((x) => [x.first, x.last]), [[0, 2], [3, 4]]);
});

test("makeLoop orders, clamps and rejects tiny loops", () => {
  assert.deepEqual(makeLoop(5, 2, 10), { a: 2, b: 5 });
  assert.deepEqual(makeLoop(-1, 12, 10), { a: 0, b: 10 });
  assert.equal(makeLoop(3, 3.1, 10), null);
  assert.equal(makeLoop(null, 3, 10), null);
});

test("note edits: delete and re-pitch by id", () => {
  const notes = [{ id: 0, pitches: [60] }, { id: 1, pitches: [62] }, { id: 2, pitches: [64] }];
  const out = applyNoteEdits(notes, { deleted: new Set([1]), pitchEdits: new Map([[2, 65]]) });
  assert.deepEqual(out, [{ id: 0, pitches: [60] }, { id: 2, pitches: [65] }]);
});

test("token edits pick an alternative way to play a note", () => {
  const harp = createHarp("C");
  const mapped = mapToHarp([{ id: 7, pitches: [67] }], harp).events;
  assert.equal(mapped[0].token, "-2");
  const edited = applyTokenEdits(mapped, new Map([[7, "3"]]), (e) => candidates(harp, e.pitches));
  assert.equal(edited[0].token, "3");
  assert.equal(edited[0].actions[0].breath, "blow");
  const ignored = applyTokenEdits(mapped, new Map([[7, "9"]]), (e) => candidates(harp, e.pitches));
  assert.equal(ignored[0].token, "-2");
});

test("dev server maps /core to src/core and refuses paths outside", () => {
  assert.match(resolvePath("/"), /web\/index\.html$/);
  assert.match(resolvePath("/app.js?v=1"), /web\/app\.js$/);
  assert.match(resolvePath("/core/audio/yin.js"), /src\/core\/audio\/yin\.js$/);
  for (const sneaky of ["/../package.json", "/core/../../package.json", "/core/%2e%2e/%2e%2e/package.json"]) {
    const file = resolvePath(sneaky);
    assert.ok(file === null || /\/(web|src\/core)\//.test(file), `${sneaky} -> ${file}`);
  }
});
