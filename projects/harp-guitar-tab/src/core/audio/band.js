// Backing band and lesson mix, rendered in plain JS (no Web Audio needed), so the
// browser can make a WAV for the player and tests can check it in Node.

import { midiToFreq } from "../pitch.js";
import { renderNotes } from "./synth.js";

/** Plucked/struck notes, each independent: harmonics with a decaying envelope. */
export function renderVoices(
  notes,
  out,
  sampleRate,
  { harmonics = [1, 0.5, 0.25, 0.12], attack = 0.005, decay = 0.6, release = 0.04, gain = 0.3 } = {},
) {
  const norm = harmonics.reduce((a, b) => a + b, 0);
  for (const note of notes) {
    const start = Math.round(note.time * sampleRate);
    const stop = Math.min(out.length, Math.round((note.time + note.duration + release) * sampleRate));
    for (const midi of note.pitches) {
      const freq = midiToFreq(midi);
      const w = (2 * Math.PI * freq) / sampleRate;
      for (let s = start; s < stop; s++) {
        const t = (s - start) / sampleRate;
        const held = t <= note.duration ? 1 : Math.max(0, 1 - (t - note.duration) / release);
        const env = Math.min(1, t / attack) * Math.exp(-t / decay) * held;
        let x = 0;
        harmonics.forEach((h, k) => {
          if ((k + 1) * freq < sampleRate / 2) x += h * Math.sin((k + 1) * w * (s - start));
        });
        out[s] += (gain * env * x) / norm;
      }
    }
  }
}

/** Synthesized shuffle kit: kick (falling sine), snare (noise + tone), hat and crash (bright noise). */
export function renderDrums(hits, out, sampleRate, { gain = 0.5 } = {}) {
  let seed = 7;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (const hit of hits) {
    const start = Math.round(hit.time * sampleRate);
    const len = { kick: 0.35, snare: 0.2, hat: 0.06, crash: 1.6 }[hit.kind];
    const stop = Math.min(out.length, start + Math.round(len * sampleRate));
    let phase = 0;
    let prev = 0;
    for (let s = start; s < stop; s++) {
      const t = (s - start) / sampleRate;
      let x = 0;
      if (hit.kind === "kick") {
        phase += (2 * Math.PI * (50 + 70 * Math.exp(-t / 0.04))) / sampleRate;
        x = Math.sin(phase) * Math.exp(-t / 0.12);
      } else if (hit.kind === "snare") {
        phase += (2 * Math.PI * 190) / sampleRate;
        x = (0.6 * noise() + 0.4 * Math.sin(phase)) * Math.exp(-t / 0.06) * 0.6;
      } else {
        const n = noise();
        x = (n - prev) * 0.5; // crude high-pass: differences of noise are bright
        prev = n;
        x *= Math.exp(-t / (hit.kind === "hat" ? 0.02 : 0.5)) * (hit.kind === "hat" ? (hit.accent ? 0.35 : 0.22) : 0.3);
      }
      out[s] += gain * x;
    }
  }
}

/**
 * Render a lesson (from generateLesson) to mono samples.
 * @param {{ harp?: boolean, backing?: boolean, sampleRate?: number }} parts
 */
export function renderLesson(lesson, { harp = true, backing = true, sampleRate = 22050 } = {}) {
  const length = Math.ceil((lesson.duration + 2) * sampleRate);
  const out = new Float32Array(length);
  if (backing) {
    renderVoices(lesson.backing.bass, out, sampleRate, { harmonics: [1, 0.6, 0.3, 0.15, 0.08], decay: 0.5, gain: 0.32 });
    renderVoices(lesson.backing.comp, out, sampleRate, { harmonics: [1, 0.4, 0.3, 0.15], attack: 0.01, decay: 0.25, gain: 0.07 });
    renderDrums(lesson.backing.drums, out, sampleRate, { gain: 0.35 });
  }
  if (harp) {
    const lead = renderNotes(lesson.events, { sampleRate, vibrato: 0.06, breath: 0.04, tail: 0 });
    for (let s = 0; s < Math.min(length, lead.length); s++) out[s] += 0.75 * lead[s];
  }
  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  if (peak > 0.95) for (let s = 0; s < length; s++) out[s] *= 0.95 / peak;
  return out;
}
