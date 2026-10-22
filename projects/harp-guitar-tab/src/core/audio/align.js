// Time a tab to a recording: given the notes in order (from a pasted tab) and a stretch of
// a record, find when each note is played, then turn those times into rhythm on the
// record's beat grid. Knowing which note comes next makes this much easier than
// transcribing blind: each frame only has to answer "is the next note sounding?".
//
// Method: a harmonic salience for each tab pitch per frame (relative to all pitches in the
// harp's range, so a loud band doesn't count as the note), then a left-to-right Viterbi
// through note and gap states — notes in order, each at least `minTime` long, with a bonus
// for starting where that pitch's energy jumps.

import { magnitudeSpectrum } from "./fft.js";

const LOW = 48; // pitch range used as the reference for salience (C3..E7)
const HIGH = 100;

/** Harmonic salience of every MIDI pitch LOW..HIGH in one magnitude spectrum. */
function salienceRow(mags, sampleRate, size, { harmonics = 6 } = {}) {
  const binHz = sampleRate / size;
  const row = new Float32Array(HIGH - LOW + 1);
  for (let m = LOW; m <= HIGH; m++) {
    const f0 = 440 * 2 ** ((m - 69) / 12);
    let s = 0;
    for (let h = 1; h <= harmonics; h++) {
      const f = f0 * h;
      if (f > sampleRate / 2 - binHz) break;
      const lo = Math.floor((f * 0.977) / binHz); // ±0.4 semitone
      const hi = Math.ceil((f * 1.023) / binHz);
      let peak = 0;
      for (let k = lo; k <= hi; k++) peak = Math.max(peak, mags[k] ?? 0);
      s += peak / h ** 0.7;
    }
    row[m - LOW] = s;
  }
  return row;
}

/**
 * Per-frame scores for each pitch set: log of its salience over the mean salience of the
 * range (0 = average, ~1+ = clearly sounding), and an onset strength (rise in that score).
 * @param {number[][]} pitchSets  one array of MIDI pitches per tab note
 * @returns {{ score: Float32Array[], onset: Float32Array[], hopTime: number, start: number, frames: number }}
 */
export function pitchScores(samples, sampleRate, pitchSets, { start = 0, end, size = 2048, hop = 256, onProgress } = {}) {
  const first = Math.max(0, Math.round(start * sampleRate));
  const last = Math.min(samples.length, Math.round((end ?? samples.length / sampleRate) * sampleRate));
  const frames = Math.max(0, Math.floor((last - first - size) / hop) + 1);
  const keyOf = (set) => set.join(",");
  const unique = [...new Map(pitchSets.map((s) => [keyOf(s), s])).values()];
  const raw = new Map(unique.map((s) => [keyOf(s), new Float32Array(frames)]));
  // A short window (better timing) gives each pitch's loudness, for onsets: repeated
  // notes on the same hole only show as a quick dip and rise.
  const short = size / 4;
  const level = new Map(unique.map((s) => [keyOf(s), new Float32Array(frames)]));
  const energy = new Float32Array(frames);
  const frame = new Float32Array(size);
  const shortFrame = new Float32Array(short);
  const pick = (row, set) => {
    let s = 0;
    for (const p of set) s += row[Math.min(HIGH, Math.max(LOW, Math.round(p))) - LOW];
    return s / set.length;
  };
  for (let f = 0; f < frames; f++) {
    const at = first + f * hop;
    let e = 0;
    for (let i = 0; i < size; i++) {
      frame[i] = samples[at + i];
      e += frame[i] * frame[i];
    }
    energy[f] = e;
    const row = salienceRow(magnitudeSpectrum(frame), sampleRate, size);
    let mean = 0;
    for (const v of row) mean += v;
    mean = mean / row.length + 1e-9;
    const centre = at + (size - short) / 2;
    for (let i = 0; i < short; i++) shortFrame[i] = samples[centre + i];
    const shortRow = salienceRow(magnitudeSpectrum(shortFrame), sampleRate, short);
    for (const set of unique) {
      raw.get(keyOf(set))[f] = Math.log(pick(row, set) / mean + 1e-3);
      level.get(keyOf(set))[f] = Math.log(pick(shortRow, set) + 1e-6);
    }
    if (onProgress && f % 200 === 0) onProgress(f / frames);
  }
  // Quiet frames are nobody's note.
  let loud = 0;
  for (const e of energy) loud = Math.max(loud, e);
  for (const arr of raw.values()) for (let f = 0; f < frames; f++) if (energy[f] < loud * 1e-3) arr[f] = -2;
  // Onset: how far the pitch's short-window level rose from its recent low (natural log units).
  const onsetOf = (arr) => {
    const out = new Float32Array(frames);
    for (let f = 4; f < frames; f++) {
      const low = Math.min(arr[f - 1], arr[f - 2], arr[f - 3], arr[f - 4]);
      out[f] = Math.max(0, Math.min(2, arr[f] - low - 0.3)) / 2;
    }
    return out;
  };
  const onsets = new Map([...level].map(([k, arr]) => [k, onsetOf(arr)]));
  return {
    score: pitchSets.map((s) => raw.get(keyOf(s))),
    onset: pitchSets.map((s) => onsets.get(keyOf(s))),
    hopTime: hop / sampleRate,
    offset: first / sampleRate + size / 2 / sampleRate, // time of frame 0's centre
    frames,
  };
}

/**
 * Viterbi alignment of n notes (in order) to frames.
 * @returns {{ start: number, end: number, score: number }[]} frame ranges per note, mean score
 */
export function alignScores({ score, onset, frames }, { minFrames = 4, gap = 0.7, switchCost = 0.6, onsetBonus = 8 } = {}) {
  const n = score.length;
  if (!n || frames < n * minFrames) return [];
  // States: gap g_k (before note k, k = 0..n) and note chains (k, j), j = 0..minFrames-1.
  const S = (n + 1) + n * minFrames;
  const gapState = (k) => k; // 0..n
  const noteState = (k, j) => n + 1 + k * minFrames + j;
  const NEG = -1e18;
  let prev = new Float64Array(S).fill(NEG);
  let cur = new Float64Array(S);
  const back = new Int32Array(frames * S);
  const emit = (s, f) => {
    if (s <= n) return gap;
    const k = Math.floor((s - n - 1) / minFrames);
    return score[k][f];
  };
  prev[gapState(0)] = gap;
  prev[noteState(0, 0)] = score[0][0] - switchCost + onsetBonus * onset[0][0];
  for (let f = 1; f < frames; f++) {
    cur.fill(NEG);
    const set = (s, from, v) => {
      if (v > cur[s]) {
        cur[s] = v;
        back[f * S + s] = from;
      }
    };
    for (let k = 0; k <= n; k++) {
      const g = gapState(k);
      // stay in gap
      set(g, g, prev[g]);
      // leave note k-1 into gap k
      if (k > 0) set(g, noteState(k - 1, minFrames - 1), prev[noteState(k - 1, minFrames - 1)]);
    }
    for (let k = 0; k < n; k++) {
      const enter = -switchCost + onsetBonus * onset[k][f];
      set(noteState(k, 0), gapState(k), prev[gapState(k)] + enter);
      if (k > 0) set(noteState(k, 0), noteState(k - 1, minFrames - 1), prev[noteState(k - 1, minFrames - 1)] + enter);
      for (let j = 1; j < minFrames; j++) set(noteState(k, j), noteState(k, j - 1), prev[noteState(k, j - 1)]);
      const last = noteState(k, minFrames - 1);
      set(last, last, prev[last]);
    }
    for (let s = 0; s < S; s++) if (cur[s] > NEG) cur[s] += emit(s, f);
    [prev, cur] = [cur, prev];
  }
  // Best end: after the last note (gap n) or still in it.
  let s = prev[gapState(n)] >= prev[noteState(n - 1, minFrames - 1)] ? gapState(n) : noteState(n - 1, minFrames - 1);
  if (prev[s] <= NEG / 2) return [];
  const path = new Int32Array(frames);
  for (let f = frames - 1; f >= 0; f--) {
    path[f] = s;
    if (f > 0) s = back[f * S + s];
  }
  const out = Array.from({ length: n }, () => ({ start: -1, end: -1, score: 0 }));
  for (let f = 0; f < frames; f++) {
    const st = path[f];
    if (st <= n) continue;
    const k = Math.floor((st - n - 1) / minFrames);
    if (out[k].start < 0) out[k].start = f;
    out[k].end = f + 1;
    out[k].score += score[k][f];
  }
  for (const o of out) o.score /= Math.max(1, o.end - o.start);
  return out;
}

const fmt = (d) => {
  const r = (x) => Math.round(x * 1e6) / 1e6;
  if (Number.isInteger(r(d))) return String(r(d));
  if (Number.isInteger(r(d * 2))) return String(r(d));
  if (Number.isInteger(r(d * 3))) return `${Math.round(d * 3)}/3`;
  return `${Math.round(d * 6)}/6`;
};

/** Fractional beat index of a time on a beat grid (extrapolated past the ends). */
export function beatAt(t, beats) {
  if (beats.length < 2) return 0;
  if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0]);
  for (let i = 0; i < beats.length - 1; i++) if (t < beats[i + 1]) return i + (t - beats[i]) / (beats[i + 1] - beats[i]);
  const last = beats.length - 1;
  return last + (t - beats[last]) / (beats[last] - beats[last - 1]);
}

// Places within a beat, in eighth-note units: on the beat, the (swung) off-beat,
// sixteenths, triplets. Simpler places win near-ties; in a shuffle, sixteenths are rare.
const PLACES = [
  { u: 0, cost: 0 },
  { u: 1, cost: 0 },
  { u: 0.5, cost: 0.03, sixteenth: true },
  { u: 1.5, cost: 0.03, sixteenth: true },
  { u: 2 / 3, cost: 0.04 },
  { u: 4 / 3, cost: 0.04 },
  { u: 2, cost: 0 },
];

/** Eighth-note position on the grid nearest to a time. */
export function quantize(t, beats, swing = 2 / 3) {
  const b = beatAt(t, beats);
  const whole = Math.floor(b);
  const frac = b - whole;
  const at = (u) => (u === 1 ? swing : u / 2);
  const cost = (p) => Math.abs(frac - at(p.u)) + p.cost + (p.sixteenth && swing > 0.6 ? 0.05 : 0);
  let best = PLACES[0];
  for (const p of PLACES) if (cost(p) < cost(best)) best = p;
  return whole * 2 + best.u;
}

/**
 * Rhythm from note times: positions on the grid, durations to the next note, rests where
 * a note stops well before the next. Starts at the bar holding the first note.
 * @param {{ token: string, glide?: boolean, time: number, end: number }[]} notes
 * @param {{ beats: number[], swing?: number, downbeat?: number }} grid  downbeat = which beat (0–3) is 1
 * @returns {{ tab: string, startBeat: number }}
 */
export function rhythmFromTimes(notes, { beats, swing = 2 / 3, downbeat = 0 }) {
  const pos = [];
  for (const n of notes) {
    let p = quantize(n.time, beats, swing);
    const prev = pos.at(-1);
    // After a triplet in the same beat, the swung off-beat is the next triplet.
    if (prev !== undefined && Math.abs(p % 2 - 1) < 1e-9 && Math.abs(prev - (p - 1 + 2 / 3)) < 1e-9) p = p - 1 + 4 / 3;
    if (prev !== undefined && p <= prev + 1e-9) p = prev + 0.5;
    pos.push(p);
  }
  const firstBeat = Math.floor(pos[0] / 2 + 1e-9);
  let startBeat = firstBeat - ((((firstBeat - downbeat) % 4) + 4) % 4);
  const parts = [];
  const lead = pos[0] - startBeat * 2;
  if (lead > 1e-6) parts.push(`r:${fmt(lead)}`);
  notes.forEach((n, i) => {
    // Players let go a little early, so ends round up unless clearly short of the grid.
    const endPos = Math.max(pos[i] + 0.5, Math.round((beatAt(n.end, beats) * 2 + 0.3) * 2) / 2);
    const next = i + 1 < notes.length ? pos[i + 1] : Math.max(endPos, pos[i] + 0.5);
    const span = next - pos[i];
    const sound = Math.min(span, endPos - pos[i]);
    const token = `${n.glide ? "~" : ""}${n.token}`;
    if (span - sound >= 2 - 1e-6) parts.push(`${token}:${fmt(sound)}`, `r:${fmt(span - sound)}`);
    else parts.push(`${token}:${fmt(span)}`);
  });
  return { tab: parts.join(" "), startBeat };
}

/**
 * Find a tab's notes in a stretch of a recording and write its rhythm.
 * @param {{ token: string, glide?: boolean, pitches: number[] }[]} notes  in tab order
 * @param {{ start?: number, end?: number, beats: number[], swing?: number, downbeat?: number, minTime?: number, onProgress?: Function }} opts
 * @returns {{ tab: string, startBeat: number, notes: { token: string, time: number, end: number, score: number }[], clear: number, tempo: number } | null}
 *   clear: how many notes stood out clearly from the rest of the sound.
 */
export function alignTab(samples, sampleRate, notes, { start = 0, end, beats, swing = 2 / 3, downbeat = 0, minTime = 0.045, onProgress, tuning = {} } = {}) {
  const scores = pitchScores(samples, sampleRate, notes.map((n) => n.pitches), { start, end, onProgress });
  const minFrames = Math.max(2, Math.round(minTime / scores.hopTime));
  const ranges = alignScores(scores, { minFrames, ...tuning });
  if (!ranges.length) return null;
  const timed = notes.map((n, i) => ({
    token: n.token,
    glide: n.glide,
    time: scores.offset + ranges[i].start * scores.hopTime,
    end: scores.offset + ranges[i].end * scores.hopTime,
    score: ranges[i].score,
  }));
  const { tab, startBeat } = rhythmFromTimes(timed, { beats, swing, downbeat });
  const b0 = Math.max(0, Math.floor(beatAt(timed[0].time, beats)));
  const b1 = Math.min(beats.length - 1, Math.max(b0 + 1, Math.ceil(beatAt(timed.at(-1).end, beats))));
  const tempo = b1 > b0 && beats[b1] !== undefined ? (60 * (b1 - b0)) / (beats[b1] - beats[b0]) : 0;
  return { tab, startBeat, notes: timed, clear: timed.filter((t) => t.score > 1).length, tempo: Math.round(tempo) };
}
