// Streaming versions of pitch tracking and note segmentation, for the microphone.
// Feed audio in chunks as it arrives (e.g. 128 samples from an AudioWorklet).
// Times are "stream seconds": seconds of audio pushed since the tracker started.

import { freqToMidi } from "./pitch.js";
import { yin } from "./audio/yin.js";

export class LivePitchTracker {
  constructor(
    sampleRate,
    { frameTime = 0.04, hopTime = 0.01, minFreq = 70, maxFreq = 2400, threshold = 0.15, a4 = 440, analysisRate = 22050 } = {},
  ) {
    this.factor = Math.max(1, Math.floor(sampleRate / analysisRate));
    this.rate = sampleRate / this.factor;
    this.frameSize = Math.max(Math.round(this.rate * frameTime), 2 * Math.ceil(this.rate / minFreq));
    this.hop = Math.max(1, Math.round(this.rate * hopTime));
    this.options = { minFreq, maxFreq, threshold };
    this.a4 = a4;
    this.ring = new Float32Array(this.frameSize);
    this.frame = new Float32Array(this.frameSize);
    this.count = 0; // decimated samples seen
    this.acc = 0;
    this.accN = 0;
  }

  /** Seconds of audio pushed so far. */
  get time() {
    return this.count / this.rate;
  }

  /** Push samples; returns the frames completed: { time, midi|null, rms, clarity }. */
  push(chunk) {
    const frames = [];
    for (let i = 0; i < chunk.length; i++) {
      this.acc += chunk[i];
      if (++this.accN < this.factor) continue;
      this.ring[this.count % this.frameSize] = this.acc / this.factor;
      this.acc = 0;
      this.accN = 0;
      this.count++;
      if (this.count >= this.frameSize && this.count % this.hop === 0) frames.push(this.#analyse());
    }
    return frames;
  }

  #analyse() {
    const n = this.frameSize;
    const start = this.count % n; // oldest sample in the ring
    let energy = 0;
    for (let i = 0; i < n; i++) {
      const x = this.ring[(start + i) % n];
      this.frame[i] = x;
      energy += x * x;
    }
    const rms = Math.sqrt(energy / n);
    const est = rms > 1e-4 ? yin(this.frame, this.rate, this.options) : null;
    return {
      time: (this.count - n / 2) / this.rate,
      midi: est ? freqToMidi(est.freq, this.a4) : null,
      rms,
      clarity: est ? est.clarity : 0,
    };
  }
}

const median3 = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

/**
 * Turns live pitch frames into note events. A note starts once a pitch has held for
 * `minNoteTime`; it ends after `releaseTime` of silence, when another pitch takes over,
 * or at a volume dip followed by a new attack (repeated tongued notes).
 *
 * push(frame) returns events: { type: "on" | "off", note: { time, pitch, duration?, connected } }
 */
export class LiveNoteTracker {
  constructor({ gate = 0.01, minNoteTime = 0.05, releaseTime = 0.06, dipRatio = 0.6, tuning = 0 } = {}) {
    Object.assign(this, { gate, minNoteTime, releaseTime, dipRatio, tuning });
    this.reset();
  }

  reset() {
    this.recent = [];
    this.active = null;
    this.candidate = null;
    this.silentSince = null;
  }

  /** The note sounding now, or null. */
  get current() {
    return this.active;
  }

  push(frame) {
    const events = [];
    const voiced = frame.midi !== null && frame.rms >= this.gate;
    if (!voiced) {
      this.recent = [];
      this.candidate = null;
      if (this.active) {
        this.silentSince ??= frame.time;
        if (frame.time - this.silentSince >= this.releaseTime) events.push(this.#end(this.silentSince));
      }
      return events;
    }
    this.silentSince = null;

    this.recent.push(frame.midi);
    if (this.recent.length > 3) this.recent.shift();
    const pitch = Math.round(median3(this.recent) - this.tuning);
    const active = this.active;

    if (active && pitch === active.pitch) {
      // Same pitch: watch for a dip and re-attack (a repeated note).
      if (frame.rms < this.dipRatio * active.peak) {
        active.dipAt ??= frame.time;
        active.dipLevel = Math.min(active.dipLevel ?? Infinity, frame.rms);
      } else if (active.dipAt !== undefined && frame.rms > active.dipLevel / this.dipRatio) {
        const at = active.dipAt;
        events.push(this.#end(at));
        events.push(this.#start(pitch, at, false, frame.rms));
      } else {
        active.peak = Math.max(active.peak, frame.rms);
      }
      this.candidate = null;
      return events;
    }

    if (!this.candidate || this.candidate.pitch !== pitch) this.candidate = { pitch, time: frame.time };
    if (frame.time - this.candidate.time >= this.minNoteTime - 1e-9) {
      const at = this.candidate.time;
      const connected = Boolean(active);
      if (active) events.push(this.#end(at));
      events.push(this.#start(pitch, at, connected, frame.rms));
      this.candidate = null;
    }
    return events;
  }

  /** Close the sounding note (e.g. when the mic stops); it ends where silence began, if it did. */
  flush(time) {
    return this.active ? [this.#end(this.silentSince ?? time)] : [];
  }

  #start(pitch, time, connected, level) {
    this.active = { pitch, time, connected, peak: level };
    return { type: "on", note: { time, pitch, connected } };
  }

  #end(time) {
    const { pitch, time: start, connected } = this.active;
    this.active = null;
    return { type: "off", note: { time: start, pitch, duration: Math.max(0, time - start), connected } };
  }
}
