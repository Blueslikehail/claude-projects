// Frame-by-frame pitch track of a mono signal.

import { freqToMidi } from "../pitch.js";
import { yin } from "./yin.js";

/**
 * @param {Float32Array|number[]} samples  mono, roughly -1..1
 * @param {number} sampleRate
 * @returns {{ frames: {time:number, rms:number, midi:number|null, clarity:number}[], hopTime:number }}
 *   `time` is the frame centre in seconds; `midi` is fractional (null = no pitch).
 */
export function trackPitch(
  samples,
  sampleRate,
  {
    frameTime = 0.04,
    hopTime = 0.005,
    minFreq = 70,
    maxFreq = 2400,
    threshold = 0.15,
    a4 = 440,
    analysisRate = 22050, // pitch needs no more; 44.1/48 kHz input is decimated first (~4x faster)
    onProgress, // optional (fraction 0..1) => void, called every ~1000 frames
  } = {},
) {
  const input = samples instanceof Float32Array ? samples : Float32Array.from(samples);
  const factor = Math.max(1, Math.floor(sampleRate / analysisRate));
  const data = factor > 1 ? decimate(input, factor) : input;
  sampleRate /= factor;
  const frameSize = Math.max(Math.round(sampleRate * frameTime), 2 * Math.ceil(sampleRate / minFreq));
  const hop = Math.max(1, Math.round(sampleRate * hopTime));
  const frames = [];
  for (let start = 0; start + frameSize <= data.length; start += hop) {
    if (onProgress && frames.length % 1000 === 0) onProgress(start / data.length);
    const frame = data.subarray(start, start + frameSize);
    let energy = 0;
    for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
    const rms = Math.sqrt(energy / frame.length);
    const est = rms > 1e-4 ? yin(frame, sampleRate, { minFreq, maxFreq, threshold }) : null;
    frames.push({
      time: (start + frameSize / 2) / sampleRate,
      rms,
      midi: est ? freqToMidi(est.freq, a4) : null,
      clarity: est ? est.clarity : 0,
    });
  }
  return { frames, hopTime: hop / sampleRate };
}

/** Average blocks of `factor` samples: a crude low-pass plus downsample, enough for pitch. */
function decimate(samples, factor) {
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let k = 0; k < factor; k++) sum += samples[i * factor + k];
    out[i] = sum / factor;
  }
  return out;
}
