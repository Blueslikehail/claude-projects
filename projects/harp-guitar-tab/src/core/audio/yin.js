// YIN pitch estimator (de Cheveigné & Kawahara, 2002) for one frame of mono audio.
// Fast enough to run per frame in an AudioWorklet for live use.

/**
 * @param {Float32Array} frame  mono samples; must hold at least two periods of minFreq
 * @param {number} sampleRate
 * @returns {{ freq: number, clarity: number } | null}  null when no clear pitch
 */
export function yin(frame, sampleRate, { minFreq = 70, maxFreq = 2400, threshold = 0.15 } = {}) {
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(Math.ceil(sampleRate / minFreq), Math.floor(frame.length / 2));
  const width = frame.length - tauMax;

  // Cumulative mean normalised difference function.
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < width; i++) {
      const diff = frame[i] - frame[i + tau];
      sum += diff * diff;
    }
    running += sum;
    cmnd[tau] = running > 0 ? (sum * tau) / running : 1;
  }

  // First dip under the threshold, then down to its local minimum.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  // Parabolic interpolation for sub-sample precision.
  let period = tau;
  if (tau > 1 && tau < tauMax) {
    const [a, b, c] = [cmnd[tau - 1], cmnd[tau], cmnd[tau + 1]];
    const denom = a - 2 * b + c;
    if (denom > 0) period = tau + (a - c) / (2 * denom);
  }
  return { freq: sampleRate / period, clarity: 1 - cmnd[tau] };
}
