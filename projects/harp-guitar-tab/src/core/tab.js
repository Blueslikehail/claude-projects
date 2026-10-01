// Harmonica tab text: format mapped events, and parse typed tab back into notes.
// A "~" joins a note to the previous one when the pitch slides there on the same hole:
// "-3~-3↓↓" = draw 3, then bend it down a whole tone without re-attacking.

import { formatAction } from "./harmonica.js";

/**
 * Join tokens into lines. A new line starts after a pause longer than `phraseGap`
 * seconds (when events carry time), or after `maxPerLine` tokens.
 */
export function formatHarpTab(events, { phraseGap = 0.75, maxPerLine = 16 } = {}) {
  const lines = [];
  let line = [];
  let prevEnd;
  for (const e of events) {
    const pause = prevEnd !== undefined && e.time !== undefined ? e.time - prevEnd : 0;
    if (line.length && (pause > phraseGap || line.length >= maxPerLine)) {
      lines.push(line.join(" "));
      line = [];
    }
    if (e.glide && line.length) line[line.length - 1] += `~${e.token}`;
    else line.push(e.token);
    if (e.time !== undefined) prevEnd = e.time + (e.duration ?? 0);
  }
  if (line.length) lines.push(line.join(" "));
  return lines.join("\n");
}

const NOTE_RE = /^(-?)(\d{1,2})([↓']*)(↑?)$/;
const CHORD_RE = /^(-?)\(([\d_ ]+)\)$/;

/** Split tab text into tokens, keeping "(4 5 6)" chords together; "~" stays on the token it joins. */
export function tokenize(text) {
  return text.match(/~?-?\([^)]*\)|~?[^\s~]+/g) ?? [];
}

/**
 * Parse one token on a given harp. Accepts ' as an ASCII stand-in for ↓.
 * @returns {{ token: string, pitches: number[] }}
 */
export function parseToken(token, harp) {
  const fail = (why) => {
    throw new Error(`Bad tab token "${token}": ${why}`);
  };

  const chord = CHORD_RE.exec(token);
  if (chord) {
    const breath = chord[1] ? "draw" : "blow";
    const slots = chord[2].trim().split(/\s+/);
    const holes = slots.filter((s) => s !== "_").map(Number);
    if (holes.length < 2) fail("a chord needs at least two holes");
    for (const h of holes) if (!(h >= 1 && h <= 10)) fail(`no hole ${h}`);
    const pitches = holes.map((h) => harp.holes[h - 1][breath]);
    return { token: `${chord[1]}(${slots.join(" ")})`, pitches };
  }

  const note = NOTE_RE.exec(token);
  if (!note) fail("not a note or chord");
  const action = {
    hole: Number(note[2]),
    breath: note[1] ? "draw" : "blow",
    bend: note[3].length,
    over: note[4] === "↑",
  };
  const canonical = formatAction(action);
  const match = harp.actions.find((a) => a.token === canonical);
  if (!match) fail(`not playable on the ${harp.key} harp`);
  return { token: canonical, pitches: [match.midi] };
}

/** Parse a whole tab into events (no timing). Notes joined by "~" get glide: true. */
export function parseHarpTab(text, harp) {
  return tokenize(text).map((t) =>
    t.startsWith("~") ? { ...parseToken(t.slice(1), harp), connected: true, glide: true } : parseToken(t, harp),
  );
}
