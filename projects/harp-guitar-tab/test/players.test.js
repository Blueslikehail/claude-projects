import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAYERS, TAB_SITES, playerById, playersForStyle } from "../src/core/players.js";
import { LICKS } from "../src/core/lesson/licks.js";
import { STYLES, STYLE_IDS } from "../src/core/lesson/styles.js";

test("players: complete, sourced, linked to real styles", () => {
  const ids = new Set();
  for (const p of PLAYERS) {
    assert.ok(!ids.has(p.id), `duplicate ${p.id}`);
    ids.add(p.id);
    for (const f of ["name", "years", "region", "genre"]) assert.ok(p[f], `${p.id} lacks ${f}`);
    assert.ok(p.sources.length >= 2 && p.sources.every((u) => /^https:\/\//.test(u)), `${p.id} sources`);
    assert.ok(p.techniques.length && p.recordings.length, p.id);
    assert.ok(p.styles.length && p.styles.every((s) => STYLES[s]), `${p.id} styles`);
    for (const l of p.lessons) assert.match(l.url, /^https:\/\//);
  }
  for (const s of TAB_SITES) assert.match(s.url, /^https:\/\//);
});

test("licks credited to a player point at a known player of that style", () => {
  for (const lick of LICKS.filter((l) => l.after)) {
    const p = playerById(lick.after);
    assert.ok(p, `${lick.id}: unknown player ${lick.after}`);
    assert.ok(lick.styles.some((s) => p.styles.includes(s)), `${lick.id}: ${p.name} isn't tagged with ${lick.styles}`);
  }
  for (const id of ["delta", "hill", "piedmont", "train", "jug", "shuffle", "reed", "swamp"]) assert.ok(playersForStyle(id).length, id);
  assert.ok(STYLE_IDS.length >= 11);
});
