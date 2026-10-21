// Generate a harmonica lesson: a 12-bar blues in a song key, played in 2nd position,
// with licks from the library, a chord track and a backing band. Everything is known
// by construction — the tab, chords and timing are exact, nothing is transcribed.

import { identifyChord, makeChord } from "../chords.js";
import { createHarp, harpForSong } from "../harmonica.js";
import { mod12, parsePitchClass, pitchClassName } from "../pitch.js";
import { parseToken } from "../tab.js";
import { LICKS, lickLevel, parseLick } from "./licks.js";

// 12-bar form: chord degree per bar, and which lick slot covers each pair of bars.
const FORM = ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"];
const SLOTS = ["I", "I", "IV", "I", "V", "T"];
const DEGREE = { I: 0, IV: 5, V: 7 };

/** Small seeded PRNG (mulberry32), so a seed always gives the same lesson. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seconds from the start for an eighth-note position, with shuffle swing. */
export function eighthTime(units, tempo, swing = true) {
  const beat = 60 / tempo;
  const beats = Math.floor(units / 2);
  return beats * beat + (units % 2 ? (swing ? 2 / 3 : 1 / 2) * beat : 0);
}

/**
 * Pick a lick for a slot: at or under the level, mostly at it, not the one just used.
 * Your own licks for the slot (any level) are used most of the time when there are some.
 */
function pickLick(slot, level, random, recent, mine = []) {
  const own = mine.filter((l) => l.slot === slot && l.id !== recent.at(-1)); // may come back, just not twice in a row
  if (own.length && random() < 0.7) return own[Math.floor(random() * own.length)];
  const pool = LICKS.filter((l) => l.slot === slot && lickLevel(l.tab) <= level);
  const fresh = pool.filter((l) => !recent.includes(l.id));
  const choices = fresh.length ? fresh : pool;
  const atLevel = choices.filter((l) => lickLevel(l.tab) === level);
  const from = atLevel.length && random() < 0.6 ? atLevel : choices;
  return from[Math.floor(random() * from.length)];
}

/**
 * @param {{ songKey?: string, level?: 1|2|3|4, tempo?: number, choruses?: number,
 *           swing?: boolean, seed?: number, myLicks?: object[] }} options
 *   myLicks: your own licks ({ id, name, slot, tab, song? }, see validateLick)
 */
export function generateLesson({ songKey = "E", level = 2, tempo = 80, choruses = 1, swing = true, seed = 1, myLicks = [] } = {}) {
  const random = rng(seed);
  const root = parsePitchClass(songKey);
  const harpKey = harpForSong(songKey, 2);
  const harp = createHarp(harpKey);
  const barUnits = 8;
  const at = (units) => eighthTime(units, tempo, swing);

  const events = [];
  const chordTrack = [];
  const licks = [];
  const recent = [];

  for (let c = 0; c < choruses; c++) {
    const last = c === choruses - 1;
    // Chord track, one chord per bar (the last bar of the song resolves to I).
    FORM.forEach((degree, b) => {
      const bar = c * 12 + b;
      const deg = last && b === 11 ? "I" : degree;
      const chord = makeChord(root + DEGREE[deg], "7");
      chordTrack.push({ bar, degree: deg, name: chord.name, root: chord.root, time: at(bar * barUnits), duration: at((bar + 1) * barUnits) - at(bar * barUnits) });
    });
    // Licks, one per two bars.
    SLOTS.forEach((slot, s) => {
      const lick = pickLick(last && slot === "T" ? "E" : slot, level, random, recent, myLicks);
      recent.push(lick.id);
      if (recent.length > 3) recent.shift();
      const startBar = c * 12 + s * 2;
      const mine = myLicks.includes(lick);
      licks.push({ id: lick.id, name: lick.name, slot: lick.slot, bar: startBar, level: lickLevel(lick.tab), mine, song: lick.song });
      let unit = startBar * barUnits;
      const tokens = parseLick(lick.tab).tokens;
      tokens.forEach((t, k) => {
        const start = unit;
        unit += t.units;
        if (t.rest) return;
        const { token, pitches } = parseToken(t.token, harp);
        const nextGlides = tokens[k + 1]?.glide;
        const span = at(unit) - at(start);
        const [named] = pitches.length > 1 ? identifyChord(pitches) : [];
        events.push({
          time: at(start),
          duration: nextGlides ? span : span * 0.9, // a little air between notes
          pitches,
          token,
          glide: t.glide,
          connected: t.glide,
          chord: named && named.score >= 0.75 ? named.name : undefined,
          lick: lick.id,
        });
      });
    });
  }

  const bars = choruses * 12;
  return {
    title: `12-bar blues in ${pitchClassName(root)} · ${harpKey} harp, 2nd position`,
    songKey: pitchClassName(root),
    harpKey,
    position: 2,
    tempo,
    level,
    seed,
    swing,
    bars,
    duration: at(bars * barUnits),
    events,
    chordTrack,
    licks,
    backing: backingParts(chordTrack, { tempo, swing }),
  };
}

/**
 * The band, from the chord track: a shuffle bass line (root-3-5-6-b7-6-5-3), chord
 * stabs on the off-beats, and a shuffle drum pattern. The final bar rings out.
 */
export function backingParts(chordTrack, { tempo = 80, swing = true } = {}) {
  const at = (units) => eighthTime(units, tempo, swing);
  const bass = [];
  const comp = [];
  const drums = [];
  const walk = [0, 4, 7, 9, 10, 9, 7, 4];
  chordTrack.forEach((bar, i) => {
    const base = bar.bar * 8;
    const bassRoot = 28 + mod12(bar.root - 4); // E1..Eb2
    const voicing = [4, 10, 14].map((iv) => 52 + mod12(bar.root + iv - 4)).sort((a, b) => a - b); // shell, around E3-Eb4
    const final = i === chordTrack.length - 1;
    if (final) {
      bass.push({ time: at(base), duration: at(base + 8) - at(base), pitches: [bassRoot] });
      comp.push({ time: at(base), duration: at(base + 8) - at(base), pitches: voicing });
      drums.push({ time: at(base), kind: "kick" }, { time: at(base), kind: "crash" });
      return;
    }
    walk.forEach((iv, k) => {
      bass.push({ time: at(base + k), duration: (at(base + k + 1) - at(base + k)) * 0.85, pitches: [bassRoot + iv] });
    });
    for (const k of [1, 3, 5, 7]) {
      comp.push({ time: at(base + k), duration: 0.14, pitches: voicing });
    }
    for (let k = 0; k < 8; k++) drums.push({ time: at(base + k), kind: "hat", accent: k % 2 === 0 });
    drums.push({ time: at(base), kind: "kick" }, { time: at(base + 4), kind: "kick" });
    drums.push({ time: at(base + 2), kind: "snare" }, { time: at(base + 6), kind: "snare" });
  });
  return { bass, comp, drums };
}

/** The tab of a lesson, one line per two bars, with the chords of those bars. */
export function lessonTabLines(lesson) {
  const lines = [];
  for (let bar = 0; bar < lesson.bars; bar += 2) {
    const [a, b] = [lesson.chordTrack[bar], lesson.chordTrack[bar + 1]];
    const from = a.time;
    const to = b.time + b.duration;
    const tokens = [];
    for (const e of lesson.events.filter((x) => x.time >= from - 1e-9 && x.time < to - 1e-9)) {
      if (e.glide && tokens.length) tokens[tokens.length - 1] += `~${e.token}`;
      else tokens.push(e.token);
    }
    const chords = a.name === b.name ? a.name : `${a.name} ${b.name}`;
    lines.push({ bar: bar + 1, chords, tab: tokens.join(" ") });
  }
  return lines;
}
