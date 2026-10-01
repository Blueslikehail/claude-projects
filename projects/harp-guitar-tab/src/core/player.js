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
 * `deleted` is a Set of note ids, `pitchEdits` maps id -> MIDI pitch.
 */
export function applyNoteEdits(notes, { deleted = new Set(), pitchEdits = new Map() } = {}) {
  return notes
    .filter((n) => !deleted.has(n.id))
    .map((n) => (pitchEdits.has(n.id) ? { ...n, pitches: [pitchEdits.get(n.id)] } : n));
}

/**
 * Apply the user's token choices after mapping: `tokenEdits` maps id -> one of the
 * event's alternative tokens (e.g. "-2" instead of "3"). Unknown choices are ignored.
 */
export function applyTokenEdits(events, tokenEdits, candidatesFor) {
  return events.map((e) => {
    const want = tokenEdits.get(e.id);
    if (!want || want === e.token || !e.playable) return e;
    const alt = candidatesFor(e).find((c) => c.token === want);
    return alt ? { ...e, ...alt } : e;
  });
}
