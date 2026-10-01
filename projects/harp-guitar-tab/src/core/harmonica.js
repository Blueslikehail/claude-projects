// 10-hole diatonic harmonica, Richter tuning.
//
// Notation (one arrow = one semitone):
//   4      blow            -4     draw
//   -3↓↓   draw bend       8↓     blow bend
//   6↑     overblow        -7↑    overdraw
//   (4 5 6) / -(1 2 3)     chord;  (1 _ _ 4) tongue-blocked split

import { mod12, parsePitchClass, pitchClassName } from "./pitch.js";

/** Standard harp keys, lowest (G) to highest (F#). */
export const HARP_KEYS = ["G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "F#"];

const RICHTER_C = {
  blow: [60, 64, 67, 72, 76, 79, 84, 88, 91, 96],
  draw: [62, 67, 71, 74, 77, 81, 83, 86, 89, 93],
};

// Overbends players actually use; the others exist but are rarely playable.
const OVERBLOW_HOLES = [1, 4, 5, 6];
const OVERDRAW_HOLES = [7, 9, 10];

/** Semitones from a C harp: G harp is 5 below, F# harp 6 above. */
export function harpOffset(key) {
  const pc = parsePitchClass(key);
  return pc <= 6 ? pc : pc - 12;
}

/** Normalise "a#" or "Gb" to the conventional harp key name. */
export function harpKeyName(key) {
  return pitchClassName(parsePitchClass(key));
}

/** How hard an action is; the mapper prefers cheap actions. */
export function actionCost(action) {
  if (action.over) return 3;
  // G on a C harp is both -2 and 3. Blues players reach for -2 (the home note in 2nd
  // position), so 3 costs a little more; it still wins when it saves real movement.
  if (action.hole === 3 && action.breath === "blow") return 0.3;
  return action.bend * 0.8;
}

/** Tab token for a single-note action. */
export function formatAction({ hole, breath, bend = 0, over = false }) {
  return `${breath === "draw" ? "-" : ""}${hole}${"↓".repeat(bend)}${over ? "↑" : ""}`;
}

/**
 * Build a harp: its holes and every single-note action it can play.
 * @param {string} key  harp key, e.g. "A"
 * @param {{overbends?: boolean}} options
 */
export function createHarp(key = "C", { overbends = true } = {}) {
  const offset = harpOffset(key);
  const holes = RICHTER_C.blow.map((blow, i) => ({
    hole: i + 1,
    blow: blow + offset,
    draw: RICHTER_C.draw[i] + offset,
  }));

  const actions = [];
  const add = (hole, breath, midi, bend = 0, over = false) => {
    const action = { hole, breath, midi, bend, over };
    actions.push({ ...action, token: formatAction(action), cost: actionCost(action) });
  };

  for (const { hole, blow, draw } of holes) {
    add(hole, "blow", blow);
    add(hole, "draw", draw);
    // The higher reed of a hole can be bent down toward the lower one.
    if (draw > blow) {
      for (let b = 1; b < draw - blow; b++) add(hole, "draw", draw - b, b);
      if (overbends && OVERBLOW_HOLES.includes(hole)) add(hole, "blow", draw + 1, 0, true);
    } else {
      for (let b = 1; b < blow - draw; b++) add(hole, "blow", blow - b, b);
      if (overbends && OVERDRAW_HOLES.includes(hole)) add(hole, "draw", blow + 1, 0, true);
    }
  }

  return { key: harpKeyName(key), offset, overbends, holes, actions };
}

/** All single-note actions producing this MIDI note, cheapest first. */
export function actionsForMidi(harp, midi) {
  return harp.actions.filter((a) => a.midi === midi).sort((a, b) => a.cost - b.cost);
}

function chordToken(breath, holes) {
  const slots = [];
  for (let h = holes[0]; h <= holes.at(-1); h++) slots.push(holes.includes(h) ? h : "_");
  return `${breath === "draw" ? "-" : ""}(${slots.join(" ")})`;
}

/**
 * Every chord shape the mouth can make: 2-4 neighbouring holes, or a span of up to
 * 4 holes with one tongue-blocked gap in the middle, all on one breath, unbent.
 */
export function chordShapes(harp, { maxWidth = 4 } = {}) {
  const shapes = [];
  for (const breath of ["blow", "draw"]) {
    for (let lo = 1; lo <= 10; lo++) {
      for (let hi = lo + 1; hi <= Math.min(10, lo + maxWidth - 1); hi++) {
        const groups = [range(lo, hi)];
        // Tongue blocking: keep [lo..l] and [r..hi], block everything in between.
        for (let l = lo; l < hi; l++) {
          for (let r = l + 2; r <= hi; r++) groups.push([...range(lo, l), ...range(r, hi)]);
        }
        for (const holes of groups) {
          const midis = holes.map((h) => harp.holes[h - 1][breath]);
          shapes.push({
            breath,
            holes,
            midis,
            split: holes.length !== hi - lo + 1,
            token: chordToken(breath, holes),
            cost: holes.length === hi - lo + 1 ? 0.2 : 0.6,
          });
        }
      }
    }
  }
  return shapes;
}

/** Chord shapes sounding exactly these MIDI notes. */
export function chordShapesForMidis(harp, midis) {
  const want = [...new Set(midis)].sort((a, b) => a - b).join(",");
  return chordShapes(harp).filter((s) => s.midis.join(",") === want);
}

/**
 * Chord shapes that voice a chord (from parseChord) in any octave: every note belongs
 * to the chord, its required notes (root, 3rd, 7th) are all there, and it has at least
 * 3 distinct notes (a 2-note shape is an interval, not a chord), 2 for power chords.
 * Splits are left out; they are octave tricks rather than chord voicings.
 */
export function chordShapesForChord(harp, { pcs, required }) {
  const minDistinct = Math.min(3, pcs.length);
  return chordShapes(harp).filter((s) => {
    if (s.split) return false;
    const got = new Set(s.midis.map(mod12));
    return (
      got.size >= minDistinct &&
      required.every((pc) => got.has(pc)) &&
      [...got].every((pc) => pcs.includes(pc))
    );
  });
}

/** Position numbering: 1st = harp key, 2nd = a fifth up (cross harp), 3rd = two fifths up... */
export function songKeyForHarp(harpKey, position) {
  return pitchClassName(parsePitchClass(harpKey) + 7 * (position - 1));
}

/** Which harp to use for a song key in a position: harpForSong("E", 2) -> "A". */
export function harpForSong(songKey, position = 2) {
  return pitchClassName(parsePitchClass(songKey) - 7 * (position - 1));
}

/** Which position a harp is played in for a song key: positionOf("C", "G") -> 2. */
export function positionOf(harpKey, songKey) {
  const interval = mod12(parsePitchClass(songKey) - parsePitchClass(harpKey));
  return mod12(interval * 7) + 1; // 7 is its own inverse mod 12
}

function range(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}
