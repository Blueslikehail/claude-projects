import { test } from "node:test";
import assert from "node:assert/strict";
import { SONGS, article, lessonOptionsFor, listenLinks, songConsistent, suggestSongs, tempoCategory } from "../src/core/songs.js";
import { validateLick, lickLevel } from "../src/core/lesson/licks.js";
import { generateLesson } from "../src/core/lesson/generate.js";
import { createHarp } from "../src/core/harmonica.js";

test("catalog: complete, consistent, sourced", () => {
  const ids = new Set();
  for (const s of SONGS) {
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`);
    ids.add(s.id);
    for (const field of ["artist", "title", "songKey", "harpKey", "position", "feel", "tempo", "form", "confidence"]) {
      assert.ok(s[field] !== undefined && s[field] !== "", `${s.id} lacks ${field}`);
    }
    assert.ok(songConsistent(s), `${s.title}: ${s.harpKey} harp in position ${s.position} isn't ${s.songKey}`);
    assert.ok(["documented", "reported", "partial", "disputed"].includes(s.confidence), s.id);
    assert.ok(s.sources.length >= 1 && s.sources.every((u) => /^https:\/\//.test(u)), `${s.id} sources`);
    assert.ok(["slow", "medium", "fast"].includes(s.tempo), s.id);
    if (s.confidence !== "documented") assert.ok(s.confidence === "reported" || s.note, `${s.id}: explain ${s.confidence}`);
  }
});

test("suggestions: same harp and position first, with reasons", () => {
  const top = suggestSongs({ harpKey: "A", position: 2, tempo: 130, feel: "shuffle", form: "12-bar" });
  assert.equal(top[0].song.id, "juke", "documented, same harp, fast shuffle 12-bar");
  assert.ok(top[0].sameHarp);
  assert.match(top[0].reasons[0], /same A harp in 2nd position/);
  const sameHarp = top.filter((r) => r.sameHarp).map((r) => r.song.harpKey);
  assert.ok(sameHarp.length >= 3 && sameHarp.every((k) => k === "A"));
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].score >= top[i].score);
});

test("suggestions: other harps are labelled with the harp they need", () => {
  const top = suggestSongs({ harpKey: "Db", tempo: 90 }, { limit: 15 });
  assert.ok(top.every((r) => !r.sameHarp));
  const juke = top.find((r) => r.song.id === "juke");
  assert.match(juke.reasons[0], /needs an A harp/);
  assert.equal(article("C"), "a");
  assert.equal(article("Eb"), "an");
});

test("1st position songs rank below 2nd position ones for a 2nd-position lesson", () => {
  const all = suggestSongs({ harpKey: "A", tempo: 60 }, { limit: SONGS.length });
  const firstPos = all.findIndex((r) => r.song.position === 1);
  const lastSecondSameHarp = all.map((r) => r.song.position === 2 && r.sameHarp).lastIndexOf(true);
  assert.ok(firstPos > lastSecondSameHarp);
});

test("helpers: tempo categories, lesson options, listen links", () => {
  assert.deepEqual([60, 80, 120].map(tempoCategory), ["slow", "medium", "fast"]);
  const juke = SONGS.find((s) => s.id === "juke");
  assert.deepEqual(lessonOptionsFor(juke), { songKey: "E", tempo: 130 });
  assert.equal(lessonOptionsFor(SONGS.find((s) => s.position === 1)), null);
  const { youtube, spotify } = listenLinks(SONGS.find((s) => s.id === "got-my-mojo-working"));
  assert.equal(youtube, "https://www.youtube.com/results?search_query=Muddy%20Waters%20Got%20My%20Mojo%20Working");
  assert.ok(spotify.startsWith("https://open.spotify.com/search/"));
});

test("validateLick: default rhythm, padding, errors", () => {
  const h = createHarp("C");
  assert.deepEqual(validateLick("-2 -3↓ 4 -4", h), { ok: true, tab: "-2:2 -3↓:2 4:2 -4:2 r:8", level: 2 });
  const chordy = validateLick("-2:1 -3↓:1 ~-3↓↓:2 -(1 2 3):4", h);
  assert.equal(chordy.ok, true);
  assert.equal(chordy.level, 3);
  assert.match(validateLick("-5↓", h).error, /not playable on a diatonic harp/);
  assert.match(validateLick("-2:8 -3:8 -4:2", h).error, /9 beats/);
  assert.equal(validateLick("  ", h).ok, false);
  assert.equal(lickLevel(validateLick("-2:16", h).tab), 1);
});

test("your licks are used in lessons and marked as yours", () => {
  const mine = [
    { id: "my-1", name: "From Juke", slot: "I", tab: "-2:2 -3↓:2 -4:4 -3↓:2 -2:6", song: "Juke" },
    { id: "my-2", name: "My turnaround", slot: "T", tab: "-2:4 -3:4 -4:8" },
  ];
  let used = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const lesson = generateLesson({ songKey: "E", seed, myLicks: mine });
    const own = lesson.licks.filter((l) => l.mine);
    used += own.length;
    for (const l of own) assert.ok(["my-1", "my-2"].includes(l.id));
    assert.ok(lesson.licks.filter((l) => l.id === "my-1").every((l) => l.song === "Juke"));
  }
  assert.ok(used >= 15, `own licks used ${used} times in 10 lessons`);
  assert.equal(generateLesson({ songKey: "E", seed: 1 }).licks.some((l) => l.mine), false);
});
