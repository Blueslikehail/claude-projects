// Pure helpers for the player UI: timing lookups, phrases, loops, user edits.

/** Index of the last event starting at or before t (-1 if none). Events sorted by time. */
export function noteIndexAt(events, t) {
  let lo = 0;
  let hi = events.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].time <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Index of the event sounding at time t, or -1 between notes. */
export function activeNoteIndex(events, t) {
  const i = noteIndexAt(events, t);
  return i >= 0 && t < events[i].time + events[i].duration ? i : -1;
}

/** Group events into phrases separated by pauses longer than `gap` seconds. */
export function phrases(events, { gap = 0.75, maxNotes = 16 } = {}) {
  const out = [];
  let current = null;
  events.forEach((e, i) => {
    const prev = events[i - 1];
    const pause = prev ? e.time - (prev.time + prev.duration) : Infinity;
    if (!current || pause > gap || (current.last - current.first + 1 >= maxNotes && !e.glide)) {
      current = { first: i, last: i, start: e.time, end: e.time + e.duration };
      out.push(current);
    } else {
      current.last = i;
      current.end = e.time + e.duration;
    }
  });
  return out;
}

/** Normalise an A-B loop: ordered, inside the media, at least `min` seconds long; else null. */
export function makeLoop(a, b, duration, { min = 0.2 } = {}) {
  if (a == null || b == null) return null;
  const [start, end] = [Math.max(0, Math.min(a, b)), Math.min(duration, Math.max(a, b))];
  return end - start >= min ? { a: start, b: end } : null;
}

/**
 * Apply the user's edits to transcribed notes before mapping:
 * `deleted` is a Set of note ids, `pitchEdits` maps id -> semitone shift (whole chords move).
 */
export function applyNoteEdits(notes, { deleted = new Set(), pitchEdits = new Map() } = {}) {
  return notes
    .filter((n) => !deleted.has(n.id))
    .map((n) => {
      const shift = pitchEdits.get(n.id);
      return shift ? { ...n, pitches: n.pitches.map((p) => p + shift) } : n;
    });
}

/**
 * Apply the user's token choices after mapping: `tokenEdits` maps id -> one of the
 * event's alternative tokens (e.g. "-2" instead of "3"). Unknown choices are ignored; a shake
 * ("-4/5") is kept on events that carry its `shake` pitches.
 */
export function applyTokenEdits(events, tokenEdits, candidatesFor) {
  return events.map((e) => {
    const want = tokenEdits.get(e.id);
    if (!want || want === e.token || !e.playable) return e;
    if (e.shake && want.split("/")[0] === e.token) return { ...e, token: want }; // a shake keeps its main note
    const alt = candidatesFor(e).find((c) => c.token === want);
    return alt ? { ...e, ...alt } : e;
  });
}

/**
 * Lines for a lesson's tab: `barsPerLine` bars each, labelled with their chords
 * (e.g. "B7 A7"). Same shape as phrases(); lines without notes are left out.
 */
export function barPhrases(events, chordTrack, { barsPerLine = 2 } = {}) {
  const out = [];
  for (let b = 0; b < chordTrack.length; b += barsPerLine) {
    const bars = chordTrack.slice(b, b + barsPerLine);
    const start = bars[0].time;
    const end = bars.at(-1).time + bars.at(-1).duration;
    const idx = [];
    events.forEach((e, i) => e.time >= start - 1e-9 && e.time < end - 1e-9 && idx.push(i));
    if (!idx.length) continue;
    const names = bars.map((c) => c.name).filter((n, i, all) => i === 0 || n !== all[i - 1]);
    out.push({ first: idx[0], last: idx.at(-1), start, end, bar: b + 1, label: names.join(" ") });
  }
  return out;
}
