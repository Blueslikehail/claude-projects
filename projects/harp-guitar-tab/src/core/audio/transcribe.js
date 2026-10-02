// Transcription: samples -> note and chord events ready for mapToHarp.
// The monophonic pass (YIN) gives single notes with bends and glides; the polyphonic
// pass finds chord segments, which replace the single notes they cover.

import { identifyChord } from "../chords.js";
import { trackPitch } from "./pitchTrack.js";
import { framesToNotes } from "./segment.js";
import { detectChords } from "./poly.js";

/**
 * @param {Float32Array} samples  mono
 * @param {number} sampleRate
 * @param {object} options  passed to the passes; `chords: false` skips chord detection
 * @returns {{ notes: object[], tuningCents: number, frames: object[], hopTime: number }}
 */
export function transcribe(samples, sampleRate, options = {}) {
  const { onProgress } = options;
  const progress = (from, span) => onProgress && ((f) => onProgress(from + f * span));
  const chordsWanted = options.chords !== false;
  const { frames, hopTime } = trackPitch(samples, sampleRate, {
    ...options,
    onProgress: progress(0, chordsWanted ? 0.6 : 1),
  });
  const { notes, tuningCents } = framesToNotes(frames, hopTime, options);
  if (!chordsWanted) return { notes, tuningCents, frames, hopTime };

  const chords = detectChords(samples, sampleRate, {
    ...options,
    tuning: tuningCents / 100,
    onProgress: progress(0.6, 0.4),
  });
  return { notes: mergeChords(notes, chords), tuningCents, frames, hopTime };
}

/**
 * Put chord segments into a note list: single notes mostly inside a chord are dropped
 * (their earliest onset sharpens the chord's start), notes overlapping its edges trimmed.
 */
export function mergeChords(notes, chords, { onsetSlack = 0.15 } = {}) {
  let out = [...notes];
  const added = [];
  for (const chord of chords) {
    const end = chord.time + chord.duration;
    const overlap = (n, start) => Math.min(end, n.time + n.duration) - Math.max(start, n.time);
    const inside = (n, start) => overlap(n, start) >= 0.5 * n.duration;
    // The spectral pass is blurry in time; a covered note starting near it marks the onset.
    let start = chord.time;
    for (const n of out) {
      if (inside(n, chord.time) && Math.abs(n.time - chord.time) <= onsetSlack) start = Math.min(start, n.time);
    }
    const kept = [];
    for (const n of out) {
      const nEnd = n.time + n.duration;
      if (overlap(n, start) <= 0) {
        kept.push(n);
      } else if (inside(n, start)) {
        // covered by the chord: dropped
      } else if (n.time < start) {
        kept.push({ ...n, duration: start - n.time });
      } else {
        kept.push({ ...n, time: end, duration: nEnd - end });
      }
    }
    out = kept;
    const [best] = identifyChord(chord.pitches);
    added.push({
      time: start,
      duration: end - start,
      pitches: chord.pitches,
      connected: false,
      glide: false,
      chord: best && best.score >= 0.75 ? best.name : undefined,
    });
  }
  return [...out, ...added].sort((a, b) => a.time - b.time);
}
