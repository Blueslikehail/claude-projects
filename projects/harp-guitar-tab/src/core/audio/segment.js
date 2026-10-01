// Turn a monophonic pitch track into note events, keeping bends and slides as glides.
//
// How a note starts tells the player how to play it:
//   new attack (silence or volume dip before it)  connected: false
//   pitch jump without a new attack (legato)      connected: true,  glide: false
//   pitch slid there (bend, slide)                connected: true,  glide: true

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Offset of the whole recording from A440 tuning, in semitones (-0.5..0.5). */
export function estimateTuning(midis) {
  if (midis.length === 0) return 0;
  let x = 0;
  let y = 0;
  for (const m of midis) {
    const angle = 2 * Math.PI * m; // circular mean of the fractional part
    x += Math.cos(angle);
    y += Math.sin(angle);
  }
  return Math.atan2(y, x) / (2 * Math.PI);
}

/**
 * @param {{time:number, rms:number, midi:number|null}[]} frames  from trackPitch
 * @param {number} hopTime  seconds between frames
 * @returns {{ notes: object[], tuningCents: number }}
 *   note: { time, duration, pitches: [midi], cents, level, connected, glide }
 */
export function framesToNotes(
  frames,
  hopTime,
  {
    gateDb = -35, // relative to the loudest frame
    absGate = 0.003,
    minNoteTime = 0.05,
    jump = 0.6, // semitones in one frame = a new note rather than a slide
    dipRatio = 0.6, // volume dip below this fraction of the surrounding peaks = new attack
    maxDropoutTime = 0.05, // bridge pitch-tracker dropouts while the sound goes on
    minPassingTime = 0.1, // shorter stops inside a slide are passed through
    tuning, // semitones; estimated when omitted
  } = {},
) {
  let maxRms = 0;
  for (const f of frames) maxRms = Math.max(maxRms, f.rms);
  const gate = Math.max(absGate, maxRms * 10 ** (gateDb / 20));
  const loud = frames.map((f) => f.rms >= gate);
  const voiced = frames.map((f, i) => loud[i] && f.midi !== null);

  // Median of 5 removes single-frame octave errors and jitter.
  const smooth = frames.map((_, i) => {
    if (!voiced[i]) return null;
    const window = [];
    for (let k = i - 2; k <= i + 2; k++) if (voiced[k]) window.push(frames[k].midi);
    return median(window);
  });

  const offset = tuning ?? estimateTuning(smooth.filter((m) => m !== null));
  const pitch = smooth.map((m) => (m === null ? null : m - offset));

  // Runs of sound: split on quiet frames, bridge short pitch dropouts.
  const maxDropout = Math.round(maxDropoutTime / hopTime);
  const runs = [];
  let run = null;
  let dropout = 0;
  frames.forEach((_, i) => {
    if (!loud[i]) {
      run = null;
    } else if (!voiced[i]) {
      if (run && ++dropout > maxDropout) run = null;
    } else {
      if (!run) runs.push((run = []));
      run.push(i);
      dropout = 0;
    }
  });

  // Split runs into segments at pitch jumps and volume dips. A jump with a dip around it
  // is a new attack; a jump without one is legato.
  const look = Math.max(1, Math.round(0.08 / hopTime));
  const near = Math.max(1, Math.round(0.02 / hopTime));
  const segments = [];
  for (const idx of runs) {
    const rmsAt = (k) => frames[idx[k]].rms;
    const peak = (from, to) => {
      let p = 0;
      for (let k = Math.max(0, from); k < Math.min(idx.length, to); k++) p = Math.max(p, rmsAt(k));
      return p;
    };
    const isDip = (k, low, segStart) =>
      low < dipRatio * peak(segStart, k) && low < dipRatio * peak(k, k + look);

    let seg = { idx: [idx[0]], connected: false };
    let segStart = 0;
    for (let k = 1; k < idx.length; k++) {
      let startNew = null;
      if (Math.abs(pitch[idx[k]] - pitch[idx[k - 1]]) > jump) {
        let low = Infinity;
        for (let j = Math.max(segStart, k - near); j < Math.min(idx.length, k + near); j++) {
          low = Math.min(low, rmsAt(j));
        }
        // A jump just after a dip-split belongs to that same new attack.
        const justAttacked = segStart > 0 && !seg.connected && k - segStart <= near;
        startNew = { connected: !justAttacked && !isDip(k, low, segStart) };
      } else if (
        k + 1 < idx.length &&
        rmsAt(k) <= rmsAt(k - 1) &&
        rmsAt(k) < rmsAt(k + 1) &&
        isDip(k, rmsAt(k), segStart)
      ) {
        startNew = { connected: false };
      }
      if (startNew) {
        segments.push(seg);
        seg = { idx: [idx[k]], ...startNew };
        segStart = k;
      } else {
        seg.idx.push(idx[k]);
      }
    }
    segments.push(seg);
  }

  // Within a segment, held pitches are notes; the frames between them are the glide.
  const minFrames = Math.max(1, Math.round(minNoteTime / hopTime));
  const minPassingFrames = Math.round(minPassingTime / hopTime);
  const notes = [];
  for (const seg of segments) {
    const groups = [];
    for (const i of seg.idx) {
      const r = Math.round(pitch[i]);
      const last = groups.at(-1);
      if (last && last.pitch === r) last.idx.push(i);
      else groups.push({ pitch: r, idx: [i] });
    }
    let held = [];
    for (const g of groups.filter((g) => g.idx.length >= minFrames)) {
      const last = held.at(-1);
      if (last && last.pitch === g.pitch) last.idx.push(...g.idx);
      else held.push(g);
    }
    // A short stop in the middle of a one-way slide (B -> Bb -> A) is passing, not a note.
    held = held.filter((g, j) => {
      const [a, b] = [held[j - 1], held[j + 1]];
      const passing = a && b && (a.pitch - g.pitch) * (g.pitch - b.pitch) > 0;
      return !(passing && g.idx.length < minPassingFrames);
    });
    if (held.length === 0) {
      if (seg.idx.length < minFrames) continue;
      held = [{ pitch: Math.round(median(seg.idx.map((i) => pitch[i]))), idx: seg.idx }];
    }

    held.forEach((g, j) => {
      const first = j === 0 ? seg.idx[0] : g.idx[0];
      const last = j + 1 < held.length ? held[j + 1].idx[0] - 1 : seg.idx.at(-1);
      let level = 0;
      for (let i = first; i <= last; i++) level = Math.max(level, frames[i].rms);
      notes.push({
        time: frames[first].time,
        duration: frames[last].time - frames[first].time + hopTime,
        pitches: [g.pitch],
        cents: Math.round(100 * (median(g.idx.map((i) => pitch[i])) - g.pitch)),
        level,
        connected: j === 0 ? seg.connected : true,
        glide: j > 0,
      });
    });
  }

  return { notes, tuningCents: Math.round(offset * 100) };
}
