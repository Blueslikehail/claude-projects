// Turn note events into harmonica tab: pick, for every event, the hole/breath/bend
// (or chord shape) that is easiest to play given what came before.
//
// An event is { pitches: number[] (MIDI), time?: seconds, duration?: seconds }.
// One pitch = a single note, several = a chord.

import {
  HARP_KEYS,
  actionsForMidi,
  chordShapes,
  chordShapesForMidis,
  createHarp,
  positionOf,
} from "./harmonica.js";
import { identifyChord } from "./chords.js";
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
  const exact = chordShapesForMidis(harp, pitches).map((s) => shapeCandidate(s, s.cost));
  return exact.length ? exact : nearChordShapes(harp, pitches);
}

function shapeCandidate(s, cost, approx = false) {
  const [named] = identifyChord(s.midis);
  return {
    token: s.token,
    holes: s.holes,
    breath: s.breath,
    midis: s.midis,
    chord: named && named.score >= 0.75 ? named.name : undefined,
    cost,
    approx,
    center: (s.holes[0] + s.holes.at(-1)) / 2,
  };
}

/**
 * Detected chords can miss or add a note (octaves especially). If no shape matches
 * exactly, offer shapes that share all but one of the notes, costed by the difference.
 */
export function nearChordShapes(harp, pitches, { limit = 3 } = {}) {
  const want = new Set(pitches);
  return chordShapes(harp)
    .map((s) => {
      const common = s.midis.filter((m) => want.has(m)).length;
      const missing = want.size - common;
      const extra = s.midis.length - common;
      return { s, common, missing, extra };
    })
    .filter(({ common, missing }) => common >= 2 && missing <= 1)
    .map(({ s, missing, extra }) => shapeCandidate(s, s.cost + 1 + 0.8 * missing + 0.5 * extra, true))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, limit);
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

// Extra cost per position when the song key is known: 2nd (cross harp) and 1st are the
// blues staples, 3rd is common, 12th/4th/5th occasional, the rest rare.
const POSITION_COST = { 1: 0, 2: 0, 3: 0.5, 12: 1, 4: 1.5, 5: 1.5 };
const RARE_POSITION_COST = 3;

const transpose = (events, shift) =>
  events.map((e) => ({ ...e, pitches: e.pitches.map((p) => p + shift) }));

/**
 * Rank harp keys for a riff: fewest unplayable notes first, then easiest.
 * With `octaveShifts` it also tries moving the riff by octaves (e.g. a guitar line).
 * With `songKey` each result reports its position, and common positions rank higher.
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
      const position = songKey ? positionOf(key, songKey) : undefined;
      results.push({
        key,
        octaves,
        position,
        unplayable: mapped.unplayable,
        cost: mapped.cost,
        score: mapped.cost + (position ? (POSITION_COST[position] ?? RARE_POSITION_COST) : 0),
        tokens: mapped.events.map((e) => e.token),
      });
    }
  }
  return results
    .sort((a, b) => a.unplayable - b.unplayable || a.score - b.score)
    .slice(0, limit);
}
