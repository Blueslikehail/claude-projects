// Chord names <-> pitch classes, and naming a set of sounding notes.

import { mod12, parsePitchClass, pitchClassName } from "./pitch.js";

// Chord types by suffix, as intervals above the root. List order = preference on ties
// (a list, because objects would reorder integer-like keys such as "7").
const CHORD_TYPE_LIST = [
  ["", [0, 4, 7]],
  ["m", [0, 3, 7]],
  ["7", [0, 4, 7, 10]],
  ["m7", [0, 3, 7, 10]],
  ["maj7", [0, 4, 7, 11]],
  ["9", [0, 4, 7, 10, 2]],
  ["6", [0, 4, 7, 9]],
  ["m6", [0, 3, 7, 9]],
  ["dim", [0, 3, 6]],
  ["dim7", [0, 3, 6, 9]],
  ["m7b5", [0, 3, 6, 10]],
  ["aug", [0, 4, 8]],
  ["sus4", [0, 5, 7]],
  ["sus2", [0, 2, 7]],
  ["5", [0, 7]],
];

export const CHORD_TYPES = Object.fromEntries(CHORD_TYPE_LIST);

const SUFFIX_ALIASES = { maj: "", M: "", min: "m", "-": "m", ø: "m7b5", "°": "dim", "+": "aug" };

/** "Bbm7" -> { name: "Bbm7", root: 10, type: "m7", pcs: [10, 1, 5, 8] } */
export function parseChord(name) {
  const m = /^([A-G][#b♯♭]?)(.*)$/.exec(String(name).trim());
  if (!m) throw new Error(`Invalid chord: ${name}`);
  const type = m[2] in SUFFIX_ALIASES ? SUFFIX_ALIASES[m[2]] : m[2];
  if (!(type in CHORD_TYPES)) throw new Error(`Unknown chord type: ${name}`);
  return makeChord(parsePitchClass(m[1]), type);
}

export function makeChord(root, type) {
  const r = mod12(root);
  const intervals = CHORD_TYPES[type];
  return {
    name: `${pitchClassName(r)}${type}`,
    root: r,
    type,
    pcs: intervals.map((i) => mod12(r + i)),
    required: requiredIntervals(intervals).map((i) => mod12(r + i)),
  };
}

/** Notes a voicing can't drop: root, 3rd and 7th. The 5th and extensions (9th) are optional. */
function requiredIntervals(intervals) {
  if (intervals.length <= 2) return intervals;
  return intervals.slice(0, 4).filter((i) => i !== 7);
}

/**
 * Name the chord formed by some MIDI notes. Returns candidates, best first, each with
 * a score in [0, 1] (1 = the notes are exactly the chord). Ties favour the chord whose
 * root is the lowest note, then the simpler chord type.
 */
export function identifyChord(midis, { limit = 3 } = {}) {
  if (midis.length === 0) return [];
  const have = new Set(midis.map(mod12));
  const bass = mod12(Math.min(...midis));
  const types = CHORD_TYPE_LIST.map(([suffix]) => suffix);
  const candidates = [];
  for (let root = 0; root < 12; root++) {
    types.forEach((type, order) => {
      const chord = makeChord(root, type);
      const want = new Set(chord.pcs);
      const common = [...have].filter((pc) => want.has(pc)).length;
      const score = common / new Set([...have, ...want]).size; // Jaccard
      if (score > 0 && have.has(root)) {
        candidates.push({ ...chord, score, rank: score + (root === bass ? 0.01 : 0) - order * 1e-4 });
      }
    });
  }
  return candidates
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ rank, ...c }) => c);
}
