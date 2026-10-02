// Several notes at once: estimate the set of pitches sounding in a frame, then find
// chord segments (2+ notes held together) in a recording.
//
// Method (after Klapuri's iterative estimation): pick spectral peaks, find the pitch
// whose harmonics explain the most energy, subtract its harmonics and repeat. The
// subtraction is "smoothed": a harmonic louder than its neighbours probably also holds
// another note (C4's 3rd harmonic is G4's fundamental), so only the smooth part is taken.

import { magnitudeSpectrum } from "./fft.js";

/** Local maxima of a magnitude spectrum, with parabolic interpolation. */
export function spectralPeaks(mags, sampleRate, { minFreq = 60, maxFreq = 6000, floor = 0.02 } = {}) {
  const n = mags.length * 2;
  const binHz = sampleRate / n;
  let max = 0;
  for (const m of mags) max = Math.max(max, m);
  const peaks = [];
  const lo = Math.max(1, Math.floor(minFreq / binHz));
  const hi = Math.min(mags.length - 2, Math.ceil(maxFreq / binHz));
  for (let k = lo; k <= hi; k++) {
    const m = mags[k];
    if (m < floor * max || m < mags[k - 1] || m <= mags[k + 1]) continue;
    const [a, b, c] = [mags[k - 1], m, mags[k + 1]];
    const denom = a - 2 * b + c;
    const shift = denom < 0 ? (0.5 * (a - c)) / denom : 0;
    peaks.push({ freq: (k + shift) * binHz, amp: b - 0.25 * (a - c) * shift });
  }
  return { peaks, max };
}

/**
 * Pitches (integer MIDI) sounding in a set of peaks, strongest first.
 * @returns {{ midi: number, salience: number }[]}
 */
export function estimatePitches(
  peaks,
  {
    minMidi = 52,
    maxMidi = 100,
    harmonics = 8,
    maxVoices = 4,
    ratio = 0.3, // a further note needs this fraction of the first note's salience
    octaveRatio = 0.7, // ...or this much if it sits on the harmonics of a found note (octaves are ambiguous)
    fundamental = 0.1, // a note's fundamental must have this fraction of the loudest peak
    tolerance = 0.35, // semitones
    tuning = 0, // semitones, from the monophonic pass
  } = {},
) {
  if (!peaks.length) return [];
  const amps = peaks.map((p) => p.amp);
  const loudest = Math.max(...amps);
  const semis = peaks.map((p) => 12 * Math.log2(p.freq / 440) + 69 - tuning);

  // Index of the strongest peak near harmonic h of midi m, or -1.
  const harmonicPeak = (m, h) => {
    const target = m + 12 * Math.log2(h);
    let best = -1;
    for (let i = 0; i < peaks.length; i++) {
      if (Math.abs(semis[i] - target) <= tolerance && (best < 0 || amps[i] > amps[best])) best = i;
    }
    return best;
  };
  const weight = (h) => 1 / h ** 0.6;

  const found = [];
  for (let voice = 0; voice < maxVoices; voice++) {
    let best = null;
    for (let m = minMidi; m <= maxMidi; m++) {
      if (found.some((f) => f.midi === m)) continue;
      const p1 = harmonicPeak(m, 1);
      if (p1 < 0 || amps[p1] < fundamental * loudest) continue;
      let salience = 0;
      const used = new Set();
      for (let h = 1; h <= harmonics; h++) {
        const p = harmonicPeak(m, h);
        if (p >= 0 && !used.has(p)) {
          used.add(p);
          salience += weight(h) * amps[p];
        }
      }
      if (!best || salience > best.salience) best = { midi: m, salience };
    }
    if (!best) break;
    if (found.length) {
      const onHarmonics = found.some((f) => {
        const interval = best.midi - f.midi;
        return interval > 0 && [12, 19, 24, 28, 31].includes(interval);
      });
      if (best.salience < (onHarmonics ? octaveRatio : ratio) * found[0].salience) break;
    }
    found.push(best);

    // Smoothed subtraction of this note's harmonics.
    const idx = [];
    for (let h = 1; h <= harmonics; h++) idx.push(harmonicPeak(best.midi, h));
    const orig = idx.map((p) => (p >= 0 ? amps[p] : 0));
    idx.forEach((p, k) => {
      if (p < 0) return;
      const neighbours = [orig[k - 1], orig[k + 1]].filter((x) => x !== undefined);
      const smooth = k === 0 ? orig[0] : Math.min(orig[k], neighbours.reduce((a, b) => a + b, 0) / neighbours.length);
      amps[p] = Math.max(0, amps[p] - smooth);
    });
  }
  return found;
}

/**
 * Pitch sets frame by frame.
 * @returns {{ frames: {time:number, rms:number, pitches:number[]}[], hopTime:number }}
 */
export function trackPitchSets(
  samples,
  sampleRate,
  { frameSize = 4096, hopTime = 0.02, analysisRate = 22050, gateDb = -30, onProgress, ...options } = {},
) {
  const factor = Math.max(1, Math.floor(sampleRate / analysisRate));
  let data = samples;
  if (factor > 1) {
    data = new Float32Array(Math.floor(samples.length / factor));
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      for (let k = 0; k < factor; k++) sum += samples[i * factor + k];
      data[i] = sum / factor;
    }
  }
  const rate = sampleRate / factor;
  const hop = Math.round(rate * hopTime);
  const raw = [];
  let maxRms = 0;
  for (let start = 0; start + frameSize <= data.length; start += hop) {
    const frame = data.subarray(start, start + frameSize);
    let energy = 0;
    for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
    const rms = Math.sqrt(energy / frameSize);
    maxRms = Math.max(maxRms, rms);
    raw.push({ start, frame, rms });
  }
  const gate = maxRms * 10 ** (gateDb / 20);
  const frames = raw.map(({ start, frame, rms }, i) => {
    if (onProgress && i % 200 === 0) onProgress(i / raw.length);
    const time = (start + frameSize / 2) / rate;
    if (rms < gate || rms < 1e-4) return { time, rms, pitches: [] };
    const { peaks } = spectralPeaks(magnitudeSpectrum(frame), rate);
    const pitches = estimatePitches(peaks, options).map((p) => p.midi).sort((a, b) => a - b);
    return { time, rms, pitches };
  });
  return { frames, hopTime: hop / rate };
}

/**
 * Chord segments: runs of frames where the same 2+ pitches sound, at least `minTime` long.
 * Short flickers inside a run are absorbed.
 * @returns {{ time:number, duration:number, pitches:number[] }[]}
 */
export function chordSegments(frames, hopTime, { minTime = 0.1, maxFlicker = 0.06 } = {}) {
  const key = (f) => (f.pitches.length >= 2 ? f.pitches.join(",") : "");
  const runs = [];
  for (const f of frames) {
    const k = key(f);
    const last = runs.at(-1);
    if (last && last.key === k) last.end = f.time;
    else runs.push({ key: k, start: f.time, end: f.time });
  }
  // Absorb short runs between two runs of the same chord.
  for (let i = 1; i < runs.length - 1; i++) {
    const [a, b, c] = [runs[i - 1], runs[i], runs[i + 1]];
    if (a.key && a.key === c.key && b.end - b.start + hopTime <= maxFlicker) {
      a.end = c.end;
      runs.splice(i, 2);
      i--;
    }
  }
  return runs
    .filter((r) => r.key && r.end - r.start + hopTime >= minTime)
    .map((r) => ({
      time: r.start,
      duration: r.end - r.start + hopTime,
      pitches: r.key.split(",").map(Number),
    }));
}

/** Chord segments of a recording. */
export function detectChords(samples, sampleRate, options = {}) {
  const { frames, hopTime } = trackPitchSets(samples, sampleRate, options);
  return chordSegments(frames, hopTime, options);
}

