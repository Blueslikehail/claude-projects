// Analyse a full band recording for practice: key, tempo and beats, shuffle or straight
// feel, where bar 1 is, the chord of each bar (I / IV / V) and where 12-bar choruses start.
// It reads the whole band (chroma = how much of each of the 12 notes sounds; onsets = where
// sound starts), which is far more robust than picking out one instrument.

import { mod12, parsePitchClass, pitchClassName } from "../pitch.js";
import { magnitudeSpectrum } from "./fft.js";

const FRAME = 4096; // chroma: long window for pitch resolution
const HOP = 512;
const OFRAME = 1024; // onsets: short window for timing
const OHOP = 256;
const FORM = ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"];
const DEGREES = { I: 0, IV: 5, V: 7 };
// How strongly each scale degree tends to sound in a blues, relative to the tonic.
const BLUES_PROFILE = [1.0, 0.1, 0.35, 0.45, 0.55, 0.5, 0.15, 0.8, 0.1, 0.4, 0.6, 0.1];

function resample(samples, sampleRate, target = 22050) {
  const factor = Math.max(1, Math.floor(sampleRate / target));
  if (factor === 1) return { data: samples, rate: sampleRate };
  const data = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    for (let k = 0; k < factor; k++) sum += samples[i * factor + k];
    data[i] = sum / factor;
  }
  return { data, rate: sampleRate / factor };
}

/**
 * Chroma (12 values per frame, overall and low register) from long frames, and onset
 * strength (all, and low band = kick drum) from short frames.
 */
export function features(samples, sampleRate, { onProgress } = {}) {
  const { data, rate } = resample(samples, sampleRate);
  const bins = FRAME / 2;
  const pcOfBin = new Int8Array(bins).fill(-1);
  const lowBin = new Uint8Array(bins);
  for (let k = 1; k < bins; k++) {
    const f = (k * rate) / FRAME;
    if (f >= 55 && f <= 2000) pcOfBin[k] = mod12(Math.round(12 * Math.log2(f / 440) + 69));
    // Major/minor is judged from 150-330 Hz: low enough to be mostly bass and chords (the
    // harp's blue notes sit higher), high enough that neighbouring notes fall in different bins.
    lowBin[k] = f >= 150 && f < 330 ? 1 : 0;
  }
  const chroma = [];
  const lowChroma = [];
  const energy = [];
  const chromaFrames = Math.max(1, Math.floor((data.length - FRAME) / HOP));
  for (let start = 0, i = 0; start + FRAME <= data.length; start += HOP, i++) {
    if (onProgress && i % 400 === 0) onProgress(0.7 * (i / chromaFrames));
    const mags = magnitudeSpectrum(data.subarray(start, start + FRAME));
    const c = new Float32Array(12);
    const low = new Float32Array(12);
    let e = 0;
    for (let k = 1; k < bins; k++) {
      const m = mags[k];
      if (pcOfBin[k] >= 0) {
        c[pcOfBin[k]] += m;
        if (lowBin[k]) low[pcOfBin[k]] += m;
      }
      e += m * m;
    }
    chroma.push(c);
    lowChroma.push(low);
    energy.push(e);
  }

  const obins = OFRAME / 2;
  const kickTop = Math.ceil((150 * OFRAME) / rate);
  const bodyTop = Math.ceil((400 * OFRAME) / rate); // kick, snare body, bass — not hi-hats
  const onset = [];
  const lowOnset = [];
  const bodyOnset = [];
  let prev = null;
  for (let start = 0, i = 0; start + OFRAME <= data.length; start += OHOP, i++) {
    if (onProgress && i % 2000 === 0) onProgress(0.7 + 0.3 * ((start + OFRAME) / data.length));
    const mags = magnitudeSpectrum(data.subarray(start, start + OFRAME));
    const logs = new Float32Array(obins);
    let flux = 0;
    let lowFlux = 0;
    let bodyFlux = 0;
    for (let k = 1; k < obins; k++) {
      logs[k] = Math.log1p(10 * mags[k]);
      if (!prev) continue;
      const d = Math.max(0, logs[k] - prev[k]);
      flux += d;
      if (k <= kickTop) lowFlux += d;
      if (k <= bodyTop) bodyFlux += d;
    }
    prev = logs;
    onset.push(flux);
    lowOnset.push(lowFlux);
    bodyOnset.push(bodyFlux);
  }
  return {
    chroma,
    lowChroma,
    energy,
    hopTime: HOP / rate,
    onset: normaliseOnsets(onset),
    lowOnset: normaliseOnsets(lowOnset),
    bodyOnset: normaliseOnsets(bodyOnset),
    onsetHop: OHOP / rate,
    onsetOffset: OFRAME / rate / 2, // an onset frame's time is its centre
    chromaOffset: FRAME / rate / 2,
  };
}

/** Remove the slow trend (local mean over ~0.4 s) and scale to unit spread. */
function normaliseOnsets(raw) {
  const w = 8;
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - w); k <= Math.min(raw.length - 1, i + w); k++, n++) sum += raw[k];
    out[i] = Math.max(0, raw[i] - sum / n);
  }
  let sq = 0;
  for (const x of out) sq += x * x;
  const sd = Math.sqrt(sq / Math.max(1, out.length)) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= sd;
  return out;
}

/** Tempo in bpm from the autocorrelation of onsets, with a gentle preference for ~110 bpm. */
export function estimateTempo(onset, hopTime, { min = 45, max = 200 } = {}) {
  const lagFor = (bpm) => 60 / bpm / hopTime;
  const ac = (lag) => {
    if (lag >= onset.length) return 0;
    let s = 0;
    for (let i = lag; i < onset.length; i++) s += onset[i] * onset[i - lag];
    return s / (onset.length - lag);
  };
  let best = { score: -Infinity, lag: 0 };
  const scores = [];
  for (let lag = Math.floor(lagFor(max)); lag <= Math.ceil(lagFor(min)); lag++) {
    const bpm = 60 / (lag * hopTime);
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 100) / 1.3) ** 2);
    const s = ac(lag) + 0.5 * ac(2 * lag);
    scores[lag] = ac(lag);
    if (s * prior > best.score) best = { score: s * prior, lag };
  }
  const { lag } = best;
  const [a, b, c] = [scores[lag - 1] ?? 0, scores[lag], scores[lag + 1] ?? 0];
  const denom = a - 2 * b + c;
  const refined = denom < 0 ? lag + (0.5 * (a - c)) / denom : lag;
  return 60 / (refined * hopTime);
}

/**
 * Choose between a tempo and its usual mistakes (×2, ÷2, ×1.5, ÷1.5): track beats for each
 * and score how well beats and strong onsets coincide. Half tempo misses half the strong
 * hits; double tempo puts beats on weak off-beats.
 */
export function chooseTempo(onset, hopTime, guess, { min = 45, max = 200, accents = onset } = {}) {
  // Strong hits come from `accents` (low/mid band: kick, snare, bass) so busy hi-hats
  // playing triplets or eighths don't vote for a faster tempo.
  const strong = [];
  for (let i = 1; i + 1 < accents.length; i++) {
    if (accents[i] > 1.5 && accents[i] >= accents[i - 1] && accents[i] > accents[i + 1]) strong.push(i * hopTime);
  }
  if (strong.length < 8) return { tempo: guess, candidates: [] };
  const near = (list, t, tol) => {
    let lo = 0;
    let hi = list.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (Math.abs(list[mid] - t) <= tol) return true;
      if (list[mid] < t) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  };
  const candidates = [1, 2, 0.5, 1.5, 2 / 3]
    .map((k) => guess * k)
    .filter((bpm) => bpm >= min && bpm <= max)
    .map((bpm) => {
      const beats = trackBeats(onset, hopTime, bpm);
      const tol = Math.min(0.07, (60 / bpm) * 0.15);
      const precision = beats.filter((t) => near(strong, t, tol)).length / Math.max(1, beats.length);
      const recall = strong.filter((t) => near(beats, t, tol)).length / strong.length;
      const f = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
      return { bpm, precision, recall, score: f * Math.exp(-0.5 * (Math.log2(bpm / 100) / 1.5) ** 2) };
    })
    .sort((a, b) => b.score - a.score);
  return { tempo: candidates[0].bpm, candidates };
}

/**
 * Beat times (s) by dynamic programming (Ellis 2007): beats fall on strong onsets and keep
 * close to the tempo, but may drift with it.
 */
export function trackBeats(onset, hopTime, bpm, { tightness = 300 } = {}) {
  const period = 60 / bpm / hopTime;
  const n = onset.length;
  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  for (let t = 0; t < n; t++) {
    let best = 0;
    let arg = -1;
    for (let tau = Math.max(0, Math.round(t - 2 * period)); tau <= t - Math.round(period / 2); tau++) {
      const v = score[tau] - tightness * Math.log((t - tau) / period) ** 2;
      if (arg < 0 || v > best) [best, arg] = [v, tau];
    }
    score[t] = onset[t] + (arg >= 0 ? Math.max(0, best) : 0);
    back[t] = arg >= 0 && best > 0 ? arg : -1;
  }
  let t = n - 1;
  for (let k = Math.max(0, n - Math.round(period)); k < n; k++) if (score[k] > score[t]) t = k;
  const beats = [];
  while (t >= 0) {
    beats.push(t);
    t = back[t];
  }
  return beats.reverse().map((f) => f * hopTime);
}

/** Where the off-beat falls within the beat: ~0.5 straight eighths, ~0.67 shuffle. */
export function estimateSwing(onset, hopTime, beats) {
  const fracs = [];
  for (let k = 0; k + 1 < beats.length; k++) {
    const [a, b] = [beats[k] / hopTime, beats[k + 1] / hopTime];
    let best = -1;
    let at = 0;
    for (let f = Math.ceil(a + 0.4 * (b - a)); f <= Math.floor(a + 0.8 * (b - a)); f++) {
      if (onset[f] > best) [best, at] = [onset[f], f];
    }
    if (best > 0.5) fracs.push((at - a) / (b - a));
  }
  if (!fracs.length) return 0.5;
  fracs.sort((x, y) => x - y);
  return fracs[fracs.length >> 1];
}

const templateFor = (root, minor) => {
  const t = new Float32Array(12);
  [[0, 1], [minor ? 3 : 4, 0.8], [7, 0.8], [10, 0.7]].forEach(([iv, w]) => (t[mod12(root + iv)] = w));
  return t;
};

function cosine(a, b) {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < 12; i++) {
    ab += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}

/**
 * Song key (tonic pitch class) and whether it sounds minor, from overall chroma.
 * `ranked` lists all tonics, best first, for the harmony check in analyzeFeatures.
 */
export function estimateKey(chroma, energy, lowChroma = chroma) {
  const total = new Float32Array(12);
  chroma.forEach((c, i) => {
    let s = 0;
    for (const x of c) s += x;
    if (s > 0) for (let k = 0; k < 12; k++) total[k] += (c[k] / s) * Math.sqrt(energy[i]);
  });
  const ranked = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    let s = 0;
    for (let d = 0; d < 12; d++) s += total[mod12(tonic + d)] * BLUES_PROFILE[d];
    ranked.push({ tonic, score: s });
  }
  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0];
  // Major or minor from the low register (bass and chords): a harp's blue-note bends on
  // the flat third shouldn't make a major blues read as minor.
  const low = new Float32Array(12);
  for (const c of lowChroma) for (let k = 0; k < 12; k++) low[k] += c[k];
  const minor = low[mod12(best.tonic + 3)] > 1.3 * low[mod12(best.tonic + 4)];
  const isMinor = (tonic) => low[mod12(tonic + 3)] > 1.3 * low[mod12(tonic + 4)];
  return { tonic: best.tonic, minor, chroma: total, ranked, isMinor };
}

/**
 * Bars from beats: try each beat as "1", label each bar I / IV / V, and fit the 12-bar form.
 * @returns {{ bars: {time, duration, degree, fit}[], downbeat: number, chorusStart: number, formFit: number }}
 */
export function findBars(
  chroma,
  hopTime,
  beats,
  tonic,
  minor,
  { forceDownbeat, forceChorusStart, lowOnset, onsetHop, onsetOffset = 0, frameOffset = 0, lowChroma, lowWeight = 3 } = {},
) {
  // Kick drums hit 1 and 3: the beat parity with more low-end onsets is where bars start.
  let parity;
  if (lowOnset && forceDownbeat === undefined) {
    const sums = [0, 0];
    beats.forEach((t, i) => {
      const f = Math.round((t - onsetOffset) / onsetHop);
      let peak = 0;
      for (let k = f - 2; k <= f + 2; k++) peak = Math.max(peak, lowOnset[k] ?? 0);
      sums[i % 2] += peak;
    });
    if (Math.max(...sums) > 1.25 * Math.min(...sums)) parity = sums[0] >= sums[1] ? 0 : 1;
  }
  const frameAt = (t) => Math.min(chroma.length - 1, Math.max(0, Math.round((t - frameOffset) / hopTime)));
  // Harmony comes mostly from bass and chords: weight the low register (lowChroma) more,
  // so long melody notes that run across bar lines blur the changes less.
  const barChroma = (t0, t1) => {
    const c = new Float32Array(12);
    for (let f = frameAt(t0); f < frameAt(t1); f++) {
      for (let k = 0; k < 12; k++) c[k] += chroma[f][k] + (lowChroma ? lowWeight * lowChroma[f][k] : 0);
    }
    return c;
  };
  let best = null;
  for (let downbeat = 0; downbeat < 4; downbeat++) {
    if (forceDownbeat !== undefined && downbeat !== forceDownbeat) continue;
    if (parity !== undefined && downbeat % 2 !== parity) continue;
    // Chords change at bar lines: how much more the harmony moves across this phase's bar
    // lines than across its mid-bars (half-bar chroma before vs after).
    let atLines = 0;
    let atMiddles = 0;
    for (let b = downbeat + 4; b + 2 < beats.length; b += 4) {
      atLines += 1 - cosine(barChroma(beats[b - 2], beats[b]), barChroma(beats[b], beats[b + 2]));
      if (b + 4 < beats.length) atMiddles += 1 - cosine(barChroma(beats[b], beats[b + 2]), barChroma(beats[b + 2], beats[b + 4]));
    }
    const changes = (atLines - atMiddles) / Math.max(1, (beats.length - downbeat) / 4);
    const bars = [];
    for (let b = downbeat; b + 4 < beats.length; b += 4) {
      const c = barChroma(beats[b], beats[b + 4]);
      const fits = Object.entries(DEGREES).map(([deg, iv]) => [deg, cosine(c, templateFor(tonic + iv, minor))]);
      fits.sort((x, y) => y[1] - x[1]);
      bars.push({ time: beats[b], duration: beats[b + 4] - beats[b], beat: b, degree: fits[0][0], fit: fits[0][1] });
    }
    for (let start = 0; start < 12; start++) {
      if (forceChorusStart !== undefined && start !== forceChorusStart) continue;
      let match = 0;
      let counted = 0;
      bars.forEach((bar, i) => {
        if (i < start) return;
        const pos = (i - start) % 12;
        const want = FORM[pos];
        counted++;
        if (bar.degree === want || (pos === 1 && bar.degree === "IV") || (pos === 11 && bar.degree === "I")) match++;
      });
      const formFit = counted ? match / counted : 0;
      const meanFit = bars.reduce((a, b) => a + b.fit, 0) / Math.max(1, bars.length);
      const score = formFit + 0.5 * meanFit + changes;
      if (!best || score > best.score) best = { score, bars, downbeat, chorusStart: start, formFit };
    }
  }
  return best;
}

/** Everything at once. Options let you correct the result (tempo, which beat is 1, chorus start, key). */
export function analyzeSong(samples, sampleRate, { onProgress, tempo: forceTempo, downbeat, chorusStart, key: forceKey, minor: forceMinor } = {}) {
  const f = features(samples, sampleRate, { onProgress });
  return analyzeFeatures(f, { tempo: forceTempo, downbeat, chorusStart, key: forceKey, minor: forceMinor });
}

/** The analysis steps after features() — rerun cheaply when you correct something. */
export function analyzeFeatures(f, { tempo: forceTempo, downbeat, chorusStart, key: forceKey, minor: forceMinor } = {}) {
  const tempo = forceTempo ?? chooseTempo(f.onset, f.onsetHop, estimateTempo(f.onset, f.onsetHop), { accents: f.bodyOnset }).tempo;
  const raw = trackBeats(f.onset, f.onsetHop, tempo);
  const beats = raw.map((t) => t + f.onsetOffset + ONSET_BIAS);
  const swing = estimateSwing(f.onset, f.onsetHop, raw);
  const key = estimateKey(f.chroma, f.energy, f.lowChroma);
  const barsFor = (tonic, minor, lowWeight = 1) =>
    findBars(f.chroma, f.hopTime, beats, tonic, minor, {
      lowWeight,
      forceDownbeat: downbeat,
      forceChorusStart: chorusStart,
      lowOnset: f.lowOnset,
      onsetHop: f.onsetHop,
      onsetOffset: f.onsetOffset,
      frameOffset: f.chromaOffset,
      lowChroma: f.lowChroma,
    });
  // The key whose bar chords make the best 12-bar progression wins among the top candidates
  // (the overall note count alone can mistake the 5th for the tonic).
  let tonic;
  let minor;
  let barInfo;
  if (forceKey !== undefined) {
    tonic = parsePitchClass(forceKey);
    minor = forceMinor ?? key.isMinor(tonic);
    barInfo = barsFor(tonic, minor);
  } else {
    const top = key.ranked.slice(0, 3);
    let best = null;
    for (const cand of top) {
      const m = forceMinor ?? key.isMinor(cand.tonic);
      const info = barsFor(cand.tonic, m, 0); // full-range chroma tells keys apart best
      const score = info.formFit + 0.3 * (cand.score / top[0].score);
      if (!best || score > best.score) best = { score, tonic: cand.tonic, minor: m };
    }
    ({ tonic, minor } = best);
    barInfo = barsFor(tonic, minor); // bass and chords place bar lines best
  }
  return {
    key: pitchClassName(tonic),
    detectedKey: pitchClassName(key.tonic),
    minor,
    tempo,
    swing,
    feel: swing > 0.6 ? "shuffle" : "straight",
    beats,
    downbeat: barInfo.downbeat,
    chorusStart: barInfo.chorusStart,
    formFit: barInfo.formFit,
    bars: barInfo.bars,
  };
}

// Measured on synthesized band recordings: onset peaks lag the true attack slightly.
const ONSET_BIAS = 0;
