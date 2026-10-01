// Monophonic transcription: samples -> note events ready for mapToHarp.

import { trackPitch } from "./pitchTrack.js";
import { framesToNotes } from "./segment.js";

/**
 * @param {Float32Array} samples  mono
 * @param {number} sampleRate
 * @param {object} options  passed to trackPitch and framesToNotes
 * @returns {{ notes: object[], tuningCents: number, frames: object[], hopTime: number }}
 */
export function transcribe(samples, sampleRate, options = {}) {
  const { frames, hopTime } = trackPitch(samples, sampleRate, options);
  const { notes, tuningCents } = framesToNotes(frames, hopTime, options);
  return { notes, tuningCents, frames, hopTime };
}
