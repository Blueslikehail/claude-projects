// Generate a harmonica lesson: a 12-bar blues in a song key and a style (shuffle, slow,
// boogie, swamp, minor, Jimmy Reed), with licks from the library, a chord track and a
// backing band. Everything is known by construction — the tab, chords and timing are
// exact, nothing is transcribed.

import { identifyChord, makeChord } from "../chords.js";
import { createHarp, harpForSong } from "../harmonica.js";
import { mod12, parsePitchClass, pitchClassName } from "../pitch.js";
import { parseToken } from "../tab.js";
import { LICKS, lickLevel, parseLick } from "./licks.js";
import { STYLES, beatTime } from "./styles.js";

/** Styles a lick of yours is used in when you didn't say: the 2nd-position major ones. */
export const DEFAULT_MY_LICK_STYLES = ["shuffle", "slow", "boogie", "swamp"];

// 12-bar form: chord degree per bar, and which lick slot covers each pair of bars.
// Styles can change both (one-chord styles stay on I); the last slot of the last chorus
// is always an ending.
export const FORM = ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"];
export const SLOTS = ["I", "I", "IV", "I", "V", "T"];
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

/**
 * Seconds from the start for an eighth-note position. `swing` is where the off-beat
 * eighth falls within the beat: true/2/3 = shuffle, false/0.5 = straight.
 */
export function eighthTime(units, tempo, swing = true) {
  return beatTime(units / 2, tempo, swingAmount(swing));
}

const swingAmount = (swing) => (swing === true ? 2 / 3 : swing === false ? 0.5 : swing);

/** Eighth-note position -> seconds on a recording's (possibly drifting) beat grid. */
export function gridTime({ beats, startBeat = 0, swing = 2 / 3 }) {
  const beatAt = (i) => {
    if (i < beats.length) return beats[i];
    const last = beats.length - 1;
    return beats[last] + (i - last) * (beats[last] - beats[last - 1]); // extrapolate past the end
  };
  return (units) => {
    const whole = Math.floor(units / 2 + 1e-9);
    const i = startBeat + whole;
    const within = units - whole * 2; // eighths into the beat: 1 is the (swung) off-beat
    const frac = Math.abs(within - 1) < 1e-9 ? swing : within / 2;
    return beatAt(i) + frac * (beatAt(i + 1) - beatAt(i));
  };
}

/**
 * Pick a lick for a slot: at or under the level, mostly at it, not the one just used.
 * Your own licks for the slot (any level) are used most of the time when there are some.
 */
function pickLick(slot, level, style, random, recent, mine = [], pinned) {
  if (pinned && pinned.slot === slot && random() < 0.75) return pinned;
  const own = mine.filter(
    (l) => l.slot === slot && (l.styles ?? DEFAULT_MY_LICK_STYLES).includes(style) && l.id !== recent.at(-1), // may come back, just not twice in a row
  );
  if (own.length && random() < 0.7) return own[Math.floor(random() * own.length)];
  const pool = LICKS.filter((l) => l.slot === slot && l.styles.includes(style) && lickLevel(l.tab) <= level);
  const fresh = pool.filter((l) => !recent.includes(l.id));
  const choices = fresh.length ? fresh : pool;
  const atLevel = choices.filter((l) => lickLevel(l.tab) === level);
  const from = atLevel.length && random() < 0.6 ? atLevel : choices;
  return from[Math.floor(random() * from.length)];
}

/**
 * @param {{ songKey?: string, style?: string, level?: 1|2|3|4, tempo?: number, choruses?: number,
 *           seed?: number, myLicks?: object[] }} options
 *   style: a key of STYLES (default "shuffle"); tempo defaults to the style's.
 *   myLicks: your own licks ({ id, name, slot, tab, song?, styles? }, see validateLick)
 *   grid: follow a recording instead of a steady tempo — { beats: seconds[], startBeat, swing }
 *         (beats from analyzeSong; startBeat = the beat where a 12-bar chorus starts).
 *   lick: a lick (from LICKS or yours) to feature: used most times its slot comes up.
 */
export function generateLesson({ songKey = "E", style = "shuffle", level = 2, tempo, choruses = 1, seed = 1, myLicks = [], grid, lick: featured } = {}) {
  const def = STYLES[style];
  if (!def) throw new Error(`Unknown style: ${style}`);
  tempo ??= def.tempo.default;
  const swing = def.swing;
  const random = rng(seed);
  const root = parsePitchClass(songKey);
  const harpKey = harpForSong(songKey, def.position);
  const harp = createHarp(harpKey);
  const barUnits = 8;
  const at = grid ? gridTime(grid) : (units) => eighthTime(units, tempo, swing);

  const events = [];
  const licks = [];
  const recent = [];
  const slots = def.slots ?? SLOTS;
  const chordTrack = chordTrackFor({ root, style, choruses, at });

  for (let c = 0; c < choruses; c++) {
    const last = c === choruses - 1;
    // Licks, one per two bars.
    slots.forEach((slot, s) => {
      const lick = pickLick(last && s === slots.length - 1 ? "E" : slot, level, style, random, recent, myLicks, featured);
      recent.push(lick.id);
      if (recent.length > 3) recent.shift();
      const startBar = c * 12 + s * 2;
      const mine = myLicks.includes(lick);
      licks.push({ id: lick.id, name: lick.name, slot: lick.slot, bar: startBar, level: lickLevel(lick.tab), mine, song: lick.song, after: lick.after });
      events.push(...lickEvents(lick.tab, harp, at, startBar * barUnits, lick.id));
    });
  }

  const bars = choruses * 12;
  const keyName = `${pitchClassName(root)}${def.minor ? " minor" : ""}`;
  const positionName = `${def.position === 1 ? "1st" : def.position === 3 ? "3rd" : "2nd"} position`;
  return {
    title: `${def.name} in ${keyName} · ${harpKey} harp, ${positionName}`,
    style,
    styleName: def.name,
    songKey: pitchClassName(root),
    harpKey,
    position: def.position,
    tempo,
    level,
    seed,
    swing,
    bars,
    duration: at(bars * barUnits),
    events,
    chordTrack,
    licks,
    backing: backingParts(chordTrack, { tempo, style }),
  };
}

/** The style's chords, one per bar, for `choruses` times its 12-bar form (the last bar resolves to I). */
export function chordTrackFor({ root, style, choruses, at }) {
  const def = STYLES[style];
  const form = def.progression ?? FORM;
  const track = [];
  for (let c = 0; c < choruses; c++) {
    form.forEach((degree, b) => {
      const bar = c * 12 + b;
      const deg = c === choruses - 1 && b === 11 ? "I" : degree;
      const chord = makeChord(root + DEGREE[deg], def.chord);
      track.push({ bar, degree: deg, name: chord.name, root: chord.root, time: at(bar * 8), duration: at((bar + 1) * 8) - at(bar * 8) });
    });
  }
  return track;
}

/**
 * Timed notes for a lick's tab starting at eighth `from`. A shake ("-4/5") is one event
 * with `shake` pitches; slides ("~") are joined to the note before.
 */
export function lickEvents(tab, harp, at, from = 0, lickId) {
  const events = [];
  const tokens = parseLick(tab).tokens;
  let unit = from;
  tokens.forEach((t, k) => {
    const start = unit;
    unit += t.units;
    if (t.rest) return;
    const { token, pitches, shake } = parseToken(t.shake ? `${t.token}/${t.shake.replace(/^-/, "")}` : t.token, harp);
    const nextGlides = tokens[k + 1]?.glide;
    const span = at(unit) - at(start);
    const [named] = pitches.length > 1 ? identifyChord(pitches) : [];
    const event = {
      time: at(start),
      duration: nextGlides || t.shake ? span : span * 0.9, // a little air between notes
      pitches,
      token,
      glide: t.glide,
      connected: t.glide,
      chord: named && named.score >= 0.75 ? named.name : undefined,
    };
    if (lickId !== undefined) event.lick = lickId;
    if (shake) event.shake = shake;
    events.push(event);
  });
  return events;
}

/**
 * A lesson from a tab of yours (any length): the notes in a row from bar 1 over the
 * style's backing, as many choruses as it takes. `tab` is lick format ("-2:2 -3↓:2 …").
 * `grid` follows a recording's beats instead of a steady tempo (see generateLesson).
 */
export function tabLesson({ tab, name = "My tab", songKey = "E", style = "shuffle", tempo, grid } = {}) {
  const def = STYLES[style];
  if (!def) throw new Error(`Unknown style: ${style}`);
  tempo ??= def.tempo.default;
  const sw = def.swing;
  const root = parsePitchClass(songKey);
  const harpKey = harpForSong(songKey, def.position);
  const harp = createHarp(harpKey);
  const at = grid ? gridTime(grid) : (units) => eighthTime(units, tempo, sw);
  const { units } = parseLick(tab);
  const choruses = Math.max(1, Math.ceil(units / 96 - 1e-6));
  const chordTrack = chordTrackFor({ root, style, choruses, at });
  const events = lickEvents(tab, harp, at, 0, "tab");
  const bars = choruses * 12;
  return {
    title: `${name} · ${def.name} in ${pitchClassName(root)} · ${harpKey} harp`,
    style, styleName: def.name, songKey: pitchClassName(root), harpKey, position: def.position, tempo, swing: sw, bars,
    level: lickLevel(tab), seed: 0,
    duration: at(bars * 8), events, chordTrack,
    licks: [{ id: "tab", name, slot: "I", bar: 0, level: lickLevel(tab), mine: true }],
    backing: backingParts(chordTrack, { tempo, style }),
  };
}

/**
 * Practise one lick: it repeats `repeats` times over the bars of the form it was written
 * for (an IV lick over the IV chord, a turnaround over bars 11–12…), with the style's band.
 */
export function lickLesson({ lick, style, songKey = "E", tempo, repeats = 4 } = {}) {
  style ??= lick.styles?.[0] ?? "shuffle";
  const def = STYLES[style];
  if (!def) throw new Error(`Unknown style: ${style}`);
  tempo ??= def.tempo.default;
  const root = parsePitchClass(songKey);
  const harpKey = harpForSong(songKey, def.position);
  const harp = createHarp(harpKey);
  const at = (units) => eighthTime(units, tempo, def.swing);
  const form = def.progression ?? FORM;
  const slotIndex = (def.slots ?? SLOTS).indexOf(lick.slot);
  const degrees = lick.slot === "E" || slotIndex < 0 ? ["I", "I"] : form.slice(slotIndex * 2, slotIndex * 2 + 2);
  const chordTrack = [];
  const events = [];
  for (let r = 0; r < repeats; r++) {
    degrees.forEach((deg, k) => {
      const bar = r * 2 + k;
      const chord = makeChord(root + DEGREE[deg], def.chord);
      chordTrack.push({ bar, degree: deg, name: chord.name, root: chord.root, time: at(bar * 8), duration: at((bar + 1) * 8) - at(bar * 8) });
    });
    events.push(...lickEvents(lick.tab, harp, at, r * 16, lick.id));
  }
  // One more bar on I, where every slot of the form leads, so the lick can resolve.
  const end = makeChord(root, def.chord);
  chordTrack.push({ bar: repeats * 2, degree: "I", name: end.name, root: end.root, time: at(repeats * 16), duration: at(repeats * 16 + 8) - at(repeats * 16) });
  const bars = repeats * 2 + 1;
  const level = lickLevel(lick.tab);
  return {
    title: `${lick.name} · ${def.name} in ${pitchClassName(root)} · ${harpKey} harp`,
    style, styleName: def.name, songKey: pitchClassName(root), harpKey, position: def.position, tempo, swing: def.swing, bars,
    level, seed: 0, duration: at(bars * 8), events, chordTrack,
    licks: Array.from({ length: repeats }, (_, r) => ({ id: lick.id, name: lick.name, slot: lick.slot, bar: r * 2, level, mine: Boolean(lick.mine), song: lick.song, after: lick.after })),
    backing: backingParts(chordTrack, { tempo, style }),
  };
}

/**
 * The band, from the chord track and the style's patterns: bass line, chord stabs or held
 * chords (pads), and drums. The final bar rings out.
 */
export function backingParts(chordTrack, { tempo = 80, style = "shuffle" } = {}) {
  const def = STYLES[style];
  const beats = (b) => beatTime(b, tempo, def.swing);
  const bass = [];
  const comp = [];
  const pads = [];
  const drums = [];
  const guitar = [];
  const shell = def.chord === "m7" ? [3, 10, 14] : [4, 10, 14]; // 3rd, 7th, 9th
  chordTrack.forEach((bar, i) => {
    const base = bar.bar * 4;
    const barEnd = beats(base + 4);
    const bassRoot = 28 + mod12(bar.root - 4); // E1..Eb2
    const voicing = shell.map((iv) => 52 + mod12(bar.root + iv - 4)).sort((a, b) => a - b); // around E3-Eb4
    const thumbRoot = 40 + mod12(bar.root - 4); // guitar: E2..Eb3
    const treble = (def.guitar?.treble.intervals ?? [7, 12, 16]).map((iv) => thumbRoot + iv + (def.chord === "m7" && mod12(iv) === 4 ? -1 : 0));
    if (i === chordTrack.length - 1) {
      const ring = { time: beats(base), duration: barEnd - beats(base) };
      if (def.guitar) guitar.push({ ...ring, pitches: [thumbRoot, ...treble] });
      if (def.bass) bass.push({ ...ring, pitches: [bassRoot] });
      if (def.comp) pads.push({ ...ring, pitches: voicing });
      if (def.drums?.kick?.length) drums.push({ time: beats(base), kind: "kick" }, { time: beats(base), kind: "crash" });
      else if (def.drums?.stomp) drums.push({ time: beats(base), kind: "stomp" });
      return;
    }
    if (def.bass) {
      const { at, intervals, length } = def.bass;
      at.forEach((b, k) => {
        const next = k + 1 < at.length ? base + at[k + 1] : base + 4;
        bass.push({ time: beats(base + b), duration: (beats(next) - beats(base + b)) * length, pitches: [bassRoot + intervals[k]] });
      });
    }
    if (def.guitar) {
      const { thumb, treble: tr } = def.guitar;
      thumb.at.forEach((b, k) => {
        const next = k + 1 < thumb.at.length ? base + thumb.at[k + 1] : base + 4;
        guitar.push({ time: beats(base + b), duration: (beats(next) - beats(base + b)) * thumb.length, pitches: [thumbRoot + thumb.intervals[k]] });
      });
      for (const b of tr.at) guitar.push({ time: beats(base + b), duration: tr.seconds, pitches: treble });
    }
    if (def.comp?.bars) pads.push({ time: beats(base), duration: barEnd - beats(base), pitches: voicing });
    else if (def.comp) for (const b of def.comp.at) comp.push({ time: beats(base + b), duration: def.comp.seconds, pitches: voicing });
    const kit = def.drums ?? {};
    (kit.hat ?? []).forEach((b) => drums.push({ time: beats(base + b), kind: "hat", accent: Number.isInteger(b) }));
    for (const b of kit.kick ?? []) drums.push({ time: beats(base + b), kind: "kick" });
    for (const b of kit.snare ?? []) drums.push({ time: beats(base + b), kind: kit.rim ? "rim" : "snare" });
    for (const b of kit.stomp ?? []) drums.push({ time: beats(base + b), kind: "stomp" });
  });
  return { bass, comp, pads, drums, guitar };
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
