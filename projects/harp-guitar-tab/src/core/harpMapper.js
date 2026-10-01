// Turn note events into harmonica tab: pick, for every event, the hole/breath/bend
// (or chord shape) that is easiest to play given what came before.
//
// An event is { pitches: number[] (MIDI), time?: seconds, duration?: seconds }.
// One pitch = a single note, several = a chord.

import {
  HARP_KEYS,
  actionsForMidi,
  chordShapesForMidis,
  createHarp,
  positionOf,
} from "./harmonica.js";
import { noteName } from "./pitch.js";

/** Ways to play one event, each with an intrinsic cost and a mouth position (hole). */
export function candidates(harp, rawPitches) {
  const pitches = [...new Set(rawPitches)];
  if (pitches.length === 1) {
    return actionsForMidi(harp, pitches[0]).map((a) => ({
      token: a.token,
      actions: [a],
      breath: a.breath,
      cost: a.cost,
      center: a.hole,
    }));
  }
  return chordShapesForMidis(harp, pitches).map((s) => ({
    token: s.token,
    holes: s.holes,
    breath: s.breath,
    cost: s.cost,
    center: (s.holes[0] + s.holes.at(-1)) / 2,
  }));
}

function unplayableToken(pitches) {
  const names = [...pitches].sort((a, b) => a - b).map(noteName);
  return names.length === 1 ? `?${names[0]}` : `?(${names.join(" ")})`;
}

/**
 * Map events onto a harp, minimising total cost = action difficulty + movement.
 * A glide (event.glide: the pitch slid there, e.g. a bend) must stay on the same hole
 * and breath, so changing either costs `glidePenalty`.
 * Unplayable events get a "?Note" token and break the path into independent runs.
 * @returns {{ events: object[], cost: number, unplayable: number }}
 */
export function mapToHarp(events, harp, { moveWeight = 0.25, glidePenalty = 5 } = {}) {
  const out = new Array(events.length);
  let cost = 0;
  let unplayable = 0;

  // Viterbi over one run of playable events.
  let run = []; // [{ index, cands, best: number[], back: number[] }]
  const flush = () => {
    if (run.length === 0) return;
    const last = run.at(-1);
    let j = last.best.indexOf(Math.min(...last.best));
    cost += last.best[j];
    for (let k = run.length - 1; k >= 0; k--) {
      const { index, cands, back } = run[k];
      out[index] = { ...events[index], ...cands[j], playable: true };
      j = back[j];
    }
    run = [];
  };

  events.forEach((event, index) => {
    const cands = candidates(harp, event.pitches);
    if (cands.length === 0) {
      flush();
      unplayable++;
      out[index] = { ...event, token: unplayableToken(event.pitches), playable: false };
      return;
    }
    const prev = run.at(-1);
    const best = [];
    const back = [];
    for (const c of cands) {
      if (!prev) {
        best.push(c.cost);
        back.push(-1);
        continue;
      }
      let min = Infinity;
      let arg = -1;
      prev.cands.forEach((p, k) => {
        const slideBroken = event.glide && (p.center !== c.center || p.breath !== c.breath);
        const total =
          prev.best[k] +
          moveWeight * Math.abs(c.center - p.center) +
          (slideBroken ? glidePenalty : 0);
        if (total < min) [min, arg] = [total, k];
      });
      best.push(min + c.cost);
      back.push(arg);
    }
    run.push({ index, cands, best, back });
  });
  flush();

  return { events: out, cost, unplayable };
}

const transpose = (events, shift) =>
  events.map((e) => ({ ...e, pitches: e.pitches.map((p) => p + shift) }));

/**
 * Rank harp keys for a riff: fewest unplayable notes first, then easiest.
 * With `octaveShifts` it also tries moving the riff by octaves (e.g. a guitar line).
 * With `songKey` each result reports the position it is played in.
 */
export function suggestHarps(
  events,
  { songKey, octaveShifts = [0], overbends = true, limit = 5 } = {},
) {
  const results = [];
  for (const key of HARP_KEYS) {
    const harp = createHarp(key, { overbends });
    for (const octaves of octaveShifts) {
      const mapped = mapToHarp(transpose(events, 12 * octaves), harp);
      results.push({
        key,
        octaves,
        position: songKey ? positionOf(key, songKey) : undefined,
        unplayable: mapped.unplayable,
        cost: mapped.cost,
        tokens: mapped.events.map((e) => e.token),
      });
    }
  }
  return results
    .sort((a, b) => a.unplayable - b.unplayable || a.cost - b.cost)
    .slice(0, limit);
}
