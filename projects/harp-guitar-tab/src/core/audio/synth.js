// Small additive synth: renders note events to samples. Used to test transcription
// against known input, and by the app to let you hear a tab.

import { midiToFreq } from "../pitch.js";

/** Reed-like default: strong low harmonics. */
export const HARMONICA_HARMONICS = [1, 0.6, 0.45, 0.25, 0.15, 0.08];

/**
 * @param {{time:number, duration:number, pitches:number[], connected?:boolean, glide?:boolean}[]} notes
 *   connected: no new attack (legato); glide: slide from the previous pitch over `glideTime`.
 * @returns {Float32Array}
 */
export function renderNotes(
  notes,
  {
    sampleRate = 22050,
    harmonics = HARMONICA_HARMONICS,
    attack = 0.012,
    release = 0.03,
    glideTime = 0.12,
    a4 = 440,
    vibrato = 0, // semitones
    vibratoRate = 5.5,
    noise = 0, // white-noise amplitude, deterministic
    tail = 0.1,
  } = {},
) {
  const end = Math.max(0, ...notes.map((n) => n.time + n.duration)) + tail;
  const length = Math.ceil(end * sampleRate);
  const voices = Math.max(1, ...notes.map((n) => n.pitches.length));
  const pitch = Array.from({ length: voices }, () => new Float32Array(length).fill(NaN));
  const amp = new Float32Array(length);

  notes.forEach((note, n) => {
    const start = Math.round(note.time * sampleRate);
    const stop = Math.min(length, Math.round((note.time + note.duration) * sampleRate));
    const prev = notes[n - 1];
    const joinsPrev = note.connected && prev;
    const joinsNext = notes[n + 1]?.connected;
    for (let s = start; s < stop; s++) {
      const t = (s - start) / sampleRate;
      const left = (stop - s) / sampleRate;
      let a = 1;
      if (!joinsPrev) a = Math.min(a, t / attack);
      if (!joinsNext) a = Math.min(a, left / release);
      amp[s] = Math.max(amp[s], a);
      note.pitches.forEach((p, v) => {
        const from = prev?.pitches[v] ?? p;
        pitch[v][s] =
          note.glide && joinsPrev && t < glideTime ? from + ((p - from) * t) / glideTime : p;
      });
    }
  });

  const out = new Float32Array(length);
  const norm = harmonics.reduce((a, b) => a + b, 0) * voices;
  let seed = 12345;
  for (let v = 0; v < voices; v++) {
    let phase = 0;
    for (let s = 0; s < length; s++) {
      const p = pitch[v][s];
      if (Number.isNaN(p)) continue;
      const vib = vibrato ? vibrato * Math.sin((2 * Math.PI * vibratoRate * s) / sampleRate) : 0;
      const freq = midiToFreq(p + vib, a4);
      phase += (2 * Math.PI * freq) / sampleRate;
      let x = 0;
      harmonics.forEach((h, k) => {
        if ((k + 1) * freq < sampleRate / 2) x += h * Math.sin((k + 1) * phase); // no aliasing
      });
      out[s] += (0.8 * amp[s] * x) / norm;
    }
  }
  if (noise) {
    for (let s = 0; s < length; s++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      out[s] += noise * ((seed / 0x7fffffff) * 2 - 1);
    }
  }
  return out;
}
