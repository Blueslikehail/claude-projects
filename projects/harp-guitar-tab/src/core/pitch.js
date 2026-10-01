// Pitch helpers. MIDI numbers throughout: C4 = 60, A4 = 69 = 440 Hz.
// Browser-safe: no Node imports anywhere under src/core.

/** Pitch-class names as blues players usually spell them (matches harp keys). */
export const PC_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const mod12 = (n) => ((n % 12) + 12) % 12;

/** Semitone value of a letter plus accidentals, without wrapping (B# = 12, Cb = -1). */
function rawPitch(letter, accidentals) {
  let value = LETTERS[letter.toUpperCase()];
  for (const ch of accidentals) value += ch === "#" || ch === "♯" ? 1 : -1;
  return value;
}

/** "Bb" -> 10, "F#" -> 6. */
export function parsePitchClass(name) {
  const m = /^([A-Ga-g])([#b♯♭]*)$/.exec(String(name).trim());
  if (!m) throw new Error(`Invalid pitch class: ${name}`);
  return mod12(rawPitch(m[1], m[2]));
}

/** "C4" -> 60, "Bb3" -> 58, "B#3" -> 60. */
export function parseNote(name) {
  const m = /^([A-Ga-g])([#b♯♭]*)(-?\d+)$/.exec(String(name).trim());
  if (!m) throw new Error(`Invalid note: ${name}`);
  return (Number(m[3]) + 1) * 12 + rawPitch(m[1], m[2]);
}

export const pitchClassName = (pc) => PC_NAMES[mod12(pc)];

/** 61 -> "Db4". */
export function noteName(midi) {
  return `${pitchClassName(midi)}${Math.floor(midi / 12) - 1}`;
}

export const midiToFreq = (midi, a4 = 440) => a4 * 2 ** ((midi - 69) / 12);

/** Fractional MIDI number; round it for the nearest note, the rest is cents / 100. */
export const freqToMidi = (freq, a4 = 440) => 69 + 12 * Math.log2(freq / a4);
