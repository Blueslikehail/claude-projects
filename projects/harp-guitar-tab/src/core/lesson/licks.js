// A library of 2nd-position (cross harp) blues licks, written as harp tab with rhythm.
// Harp tab doesn't depend on the harp's key, so every lick works on all 12 harps.
//
// Format: "token:eighths" separated by spaces; "r" is a rest, "~" slides into the note
// from the previous one (a bend on the same hole). Eighths are swung in a shuffle.
// Every lick is 2 bars of 4/4 = 16 eighths.

import { parseToken } from "../tab.js";
//
// Slots in the 12-bar form: I (bars 1-2, 3-4, 7-8), IV (5-6), V-IV (9-10),
// turnaround (11-12, ends on V), ending (11-12 of the last chorus, ends on I).

export const LICKS = [
  // ---- I chord ----
  { id: "i-home", slot: "I", name: "Home base", tab: "-2:2 -3:2 -4:4 -3:2 -2:6" },
  { id: "i-chug", slot: "I", name: "Draw chord chug", tab: "-(1 2 3):2 -(1 2 3):2 -(1 2 3):4 r:8" },
  { id: "i-riff", slot: "I", name: "Little riff", tab: "-2:1 -3:1 -4:2 -3:1 -2:3 r:8" },
  { id: "i-low", slot: "I", name: "Low and home", tab: "-2:2 -2:2 -1:2 -2:2 -3:4 -2:4" },
  { id: "i-climb", slot: "I", name: "Blues scale climb", tab: "-2:1 -3↓:1 -3:1 4:1 -4↓:1 -4:3 r:2 -3↓:2 -2:4" },
  { id: "i-answer", slot: "I", name: "Call and answer", tab: "-2:2 -2:1 -3↓:1 -3:2 -4:2 4:4 -3↓:2 -2:2" },
  { id: "i-drop", slot: "I", name: "Drop to the root", tab: "-4:1 -4↓:1 4:2 -3↓:2 -2:4 r:6" },
  { id: "i-high", slot: "I", name: "Up top", tab: "6:2 -6:1 6:1 -5:2 -4:2 4:2 -4:2 -3↓:2 -2:2" },
  { id: "i-wail", slot: "I", name: "Deep bend wail", tab: "-3↓↓:2 -3↓:1 -3:1 -4:4 -3↓:2 -2:4 r:2" },
  { id: "i-scoop", slot: "I", name: "Scoop into -4", tab: "-4↓:1 ~-4:3 4:2 -3↓:2 -3↓↓:2 -2:6" },
  { id: "i-octave", slot: "I", name: "Octave stomp", tab: "(3 _ _ 6):3 (3 _ _ 6):1 (3 _ _ 6):2 -4:2 -3↓:2 -2:6" },
  { id: "i-overblow", slot: "I", name: "Overblow sting", tab: "6:2 6↑:2 -6:2 6:2 -5:2 -4:2 4:2 -2:2" },

  // ---- IV chord ----
  { id: "iv-arp", slot: "IV", name: "IV arpeggio", tab: "4:2 5:2 6:2 5:2 4:4 r:4" },
  { id: "iv-blow", slot: "IV", name: "Blow chord", tab: "(4 5 6):4 5:2 4:2 -3:4 r:4" },
  { id: "iv-bendback", slot: "IV", name: "Bend and resolve", tab: "-4↓:2 4:2 -3↓:2 -2:2 3:4 r:4" },
  { id: "iv-cry", slot: "IV", name: "The cry", tab: "-4:2 ~-4↓:2 4:2 -3↓↓:2 (4 5 6):4 r:4" },
  { id: "iv-low", slot: "IV", name: "Low IV", tab: "(1 2 3):4 1:2 -1↓:2 -1:4 r:4" },

  // ---- V to IV ----
  { id: "v-climb", slot: "V", name: "V climb", tab: "-4:2 -5:2 -6:4 -5:2 -4:2 4:4" },
  { id: "v-push", slot: "V", name: "Push to IV", tab: "-4:2 -4:1 -4↓:1 4:4 -3↓:2 -2:2 3:4" },
  { id: "v-chord", slot: "V", name: "Draw chord V", tab: "-(4 5 6):4 -4:2 -5:2 4:4 -3↓:2 -2:2" },
  { id: "v-bend", slot: "V", name: "Bent V", tab: "-4:2 -5:2 -6:1 -5:1 -4:1 -4↓:1 4:2 -3↓↓:2 -3↓:2 -2:2" },

  // ---- turnaround (ends on V) ----
  { id: "t-simple", slot: "T", name: "Simple turnaround", tab: "-2:4 3:2 -3:2 -4:8" },
  { id: "t-walk", slot: "T", name: "Walk down", tab: "6:1 -5:1 5:1 -4:1 4:1 -3↓:1 -2:2 r:4 -4:4" },
  { id: "t-low", slot: "T", name: "Low D", tab: "-2:2 -3:2 -4:4 -1:8" },
  { id: "t-bends", slot: "T", name: "Bend turnaround", tab: "-3↓↓:2 -3↓:2 -2:4 r:4 -1:4" },

  // ---- ending (ends on I) ----
  { id: "e-simple", slot: "E", name: "Simple ending", tab: "-4:2 -3:2 -2:4 -(1 2 3):8" },
  { id: "e-home", slot: "E", name: "Home ending", tab: "-4:2 -3↓:2 -2:4 -(1 2 3):8" },
  { id: "e-shake", slot: "E", name: "Bend ending", tab: "-3↓:2 -2:2 -3↓↓:2 -3↓:2 -2:8" },
];

/** One lick token: { token, units, rest, glide }. */
export function parseLick(tab) {
  const re = /(~?-?\([^)]*\)|~?[^\s:]+):(\d+)/g;
  const out = [];
  let total = 0;
  for (const [, raw, units] of tab.matchAll(re)) {
    const glide = raw.startsWith("~");
    const token = glide ? raw.slice(1) : raw;
    out.push({ token, units: Number(units), rest: token === "r", glide });
    total += Number(units);
  }
  return { tokens: out, units: total };
}

/**
 * Difficulty from the techniques a lick uses:
 * 1 natural notes and chords · 2 one-semitone bends · 3 deeper bends, slides, splits · 4 overbends.
 */
export function lickLevel(tab) {
  let level = 1;
  for (const { token, glide } of parseLick(tab).tokens) {
    const bends = (token.match(/↓/g) ?? []).length;
    if (token.includes("↑")) level = Math.max(level, 4);
    else if (bends >= 2 || glide || token.includes("_")) level = Math.max(level, 3);
    else if (bends === 1) level = Math.max(level, 2);
  }
  return level;
}

export const LEVELS = { 1: "Beginner", 2: "Bends", 3: "Advanced", 4: "Overblows" };

export const SLOT_NAMES = { I: "I chord", IV: "IV chord", V: "V to IV", T: "Turnaround", E: "Ending" };

/**
 * Check a lick someone typed in: every token must be playable, the rhythm must fit in two
 * bars (16 eighths); shorter licks are padded with rest. Durations default to 2 (a quarter).
 * "-2 -3↓ 4" is accepted as "-2:2 -3↓:2 4:2".
 * @returns {{ ok: true, tab: string, level: number } | { ok: false, error: string }}
 */
export function validateLick(text, harp) {
  const raw = String(text).trim();
  if (!raw) return { ok: false, error: "Type some tab, e.g. -2 -3↓ 4 -4" };
  // Give tokens without a duration a quarter note; keep chords together.
  const tokens = raw.match(/~?-?\([^)]*\)(?::\d+)?|[^\s]+/g) ?? [];
  const withDur = tokens.map((t) => (/:\d+$/.test(t) ? t : `${t}:2`));
  const { tokens: parsed, units } = parseLick(withDur.join(" "));
  if (parsed.length !== withDur.length) return { ok: false, error: "Couldn't read the rhythm; write durations as token:eighths, e.g. -2:2" };
  if (units > 16) return { ok: false, error: `That's ${units / 2} beats; a lick can be up to 2 bars (8 beats).` };
  for (const t of parsed) {
    if (t.rest) continue;
    try {
      parseToken(t.token, harp);
    } catch (err) {
      return { ok: false, error: err.message.replace(/ on the \S+ harp$/, " on a diatonic harp") };
    }
  }
  const tab = units < 16 ? `${withDur.join(" ")} r:${16 - units}` : withDur.join(" ");
  return { ok: true, tab, level: lickLevel(tab) };
}
