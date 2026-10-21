// A library of blues licks, written as harp tab with rhythm. Harp tab doesn't depend on
// the harp's key, so every lick works on all 12 harps (in the position it was written for).
//
// Format: "token:eighths" separated by spaces; "r" is a rest, "~" slides into the note
// from the previous one (a bend on the same hole). Eighths are swung or straight depending
// on the style. Every lick is 2 bars of 4/4 = 16 eighths.
//
// Slots in the 12-bar form: I (bars 1-2, 3-4, 7-8), IV (5-6), V-IV (9-10),
// turnaround (11-12, ends on V), ending (11-12 of the last chorus, ends on I).
// `styles` says which lesson styles use a lick (see styles.js). 2nd position unless the
// style says otherwise (Jimmy Reed licks are 1st position).

import { parseToken } from "../tab.js";

const SH = "shuffle";
const SL = "slow";
const BO = "boogie";
const SW = "swamp";

export const LICKS = [
  // ===== 2nd position, major blues: shuffle / slow / boogie / swamp =====
  // ---- I chord ----
  { id: "i-home", slot: "I", styles: [SH, BO, SL], name: "Home base", tab: "-2:2 -3:2 -4:4 -3:2 -2:6" },
  { id: "i-chug", slot: "I", styles: [SH, SW], name: "Draw chord chug", tab: "-(1 2 3):2 -(1 2 3):2 -(1 2 3):4 r:8" },
  { id: "i-riff", slot: "I", styles: [SH, BO], name: "Little riff", tab: "-2:1 -3:1 -4:2 -3:1 -2:3 r:8" },
  { id: "i-low", slot: "I", styles: [SH, SW], name: "Low and home", tab: "-2:2 -2:2 -1:2 -2:2 -3:4 -2:4" },
  { id: "i-climb", slot: "I", styles: [SH, BO], name: "Blues scale climb", tab: "-2:1 -3↓:1 -3:1 4:1 -4↓:1 -4:3 r:2 -3↓:2 -2:4" },
  { id: "i-answer", slot: "I", styles: [SH, BO], name: "Call and answer", tab: "-2:2 -2:1 -3↓:1 -3:2 -4:2 4:4 -3↓:2 -2:2" },
  { id: "i-drop", slot: "I", styles: [SH, SL], name: "Drop to the root", tab: "-4:1 -4↓:1 4:2 -3↓:2 -2:4 r:6" },
  { id: "i-high", slot: "I", styles: [SH, BO], name: "Up top", tab: "6:2 -6:1 6:1 -5:2 -4:2 4:2 -4:2 -3↓:2 -2:2" },
  { id: "i-wail", slot: "I", styles: [SH, SL], name: "Deep bend wail", tab: "-3↓↓:2 -3↓:1 -3:1 -4:4 -3↓:2 -2:4 r:2" },
  { id: "i-scoop", slot: "I", styles: [SH, SL], name: "Scoop into -4", tab: "-4↓:1 ~-4:3 4:2 -3↓:2 -3↓↓:2 -2:6" },
  { id: "i-octave", slot: "I", styles: [SH, SW], name: "Octave stomp", tab: "(3 _ _ 6):3 (3 _ _ 6):1 (3 _ _ 6):2 -4:2 -3↓:2 -2:6" },
  { id: "i-overblow", slot: "I", styles: [SH, BO], name: "Overblow sting", tab: "6:2 6↑:2 -6:2 6:2 -5:2 -4:2 4:2 -2:2" },
  { id: "sl-i-long", slot: "I", styles: [SL], name: "Long tones", tab: "-2:6 -3:2 -4:8" },
  { id: "sl-i-cry", slot: "I", styles: [SL], name: "Slow cry", tab: "-3↓:4 -2:4 r:2 -4:2 -3↓:4" },
  { id: "sl-i-deep", slot: "I", styles: [SL], name: "Bend it up slowly", tab: "-3↓↓:2 ~-3↓:2 ~-3:4 -2:8" },
  { id: "bo-i-chug", slot: "I", styles: [BO], name: "Boogie chug", tab: "-(1 2 3):1 -(1 2 3):1 -(1 2 3):2 -(1 2 3):1 -(1 2 3):1 -(1 2 3):2 -2:4 r:4" },
  { id: "bo-i-drive", slot: "I", styles: [BO], name: "Driving eighths", tab: "-2:1 -2:1 -3:1 -4:1 -2:1 -2:1 -3:1 -4:1 -2:8" },
  { id: "bo-i-bend", slot: "I", styles: [BO], name: "Bent drive", tab: "-2:1 -3↓:1 -3:2 -2:1 -3↓:1 -3:2 -4:4 -2:4" },
  { id: "sw-i-riff", slot: "I", styles: [SW], name: "Swamp riff", tab: "-2:2 r:2 -2:1 -3:1 -2:2 r:8" },
  { id: "sw-i-call", slot: "I", styles: [SW], name: "Lazy call", tab: "-3↓:2 -2:2 r:4 -4:2 -3↓:2 -2:4" },
  { id: "sw-i-moan", slot: "I", styles: [SW], name: "Low moan", tab: "-2↓:2 ~-2:2 r:4 -1:2 -2:6" },

  // ---- IV chord ----
  { id: "iv-arp", slot: "IV", styles: [SH, BO], name: "IV arpeggio", tab: "4:2 5:2 6:2 5:2 4:4 r:4" },
  { id: "iv-blow", slot: "IV", styles: [SH, BO, SW], name: "Blow chord", tab: "(4 5 6):4 5:2 4:2 -3:4 r:4" },
  { id: "iv-bendback", slot: "IV", styles: [SH, SL], name: "Bend and resolve", tab: "-4↓:2 4:2 -3↓:2 -2:2 3:4 r:4" },
  { id: "iv-cry", slot: "IV", styles: [SH, SL], name: "The cry", tab: "-4:2 ~-4↓:2 4:2 -3↓↓:2 (4 5 6):4 r:4" },
  { id: "iv-low", slot: "IV", styles: [SH, SW], name: "Low IV", tab: "(1 2 3):4 1:2 -1↓:2 -1:4 r:4" },
  { id: "sl-iv-long", slot: "IV", styles: [SL], name: "Held IV", tab: "4:6 5:2 4:8" },
  { id: "sl-iv-bend", slot: "IV", styles: [SL], name: "Slow IV bend", tab: "-4↓:4 4:4 -3↓:8" },
  { id: "bo-iv-chug", slot: "IV", styles: [BO], name: "IV chug", tab: "(1 2 3):1 (1 2 3):1 (1 2 3):2 (1 2 3):1 (1 2 3):1 (1 2 3):2 4:8" },
  { id: "sw-iv-riff", slot: "IV", styles: [SW], name: "Swamp IV", tab: "(1 2 3):2 r:2 1:1 -1:1 (1 2 3):2 r:8" },

  // ---- V to IV ----
  { id: "v-climb", slot: "V", styles: [SH, BO, SW], name: "V climb", tab: "-4:2 -5:2 -6:4 -5:2 -4:2 4:4" },
  { id: "v-push", slot: "V", styles: [SH, BO], name: "Push to IV", tab: "-4:2 -4:1 -4↓:1 4:4 -3↓:2 -2:2 3:4" },
  { id: "v-chord", slot: "V", styles: [SH, SW], name: "Draw chord V", tab: "-(4 5 6):4 -4:2 -5:2 4:4 -3↓:2 -2:2" },
  { id: "v-bend", slot: "V", styles: [SH, SL], name: "Bent V", tab: "-4:2 -5:2 -6:1 -5:1 -4:1 -4↓:1 4:2 -3↓↓:2 -3↓:2 -2:2" },
  { id: "sl-v-long", slot: "V", styles: [SL], name: "Held V", tab: "-4:6 -5:2 -6:8" },
  { id: "sl-v-bend", slot: "V", styles: [SL], name: "V sigh", tab: "-4:4 -4↓:4 4:4 -2:4" },
  { id: "bo-v-drive", slot: "V", styles: [BO], name: "V drive", tab: "-4:1 -4:1 -5:1 -6:1 -4:1 -4:1 -5:1 -6:1 5:4 4:4" },

  // ---- turnaround (ends on V) ----
  { id: "t-simple", slot: "T", styles: [SH, BO, SW, SL], name: "Simple turnaround", tab: "-2:4 3:2 -3:2 -4:8" },
  { id: "t-walk", slot: "T", styles: [SH, BO], name: "Walk down", tab: "6:1 -5:1 5:1 -4:1 4:1 -3↓:1 -2:2 r:4 -4:4" },
  { id: "t-low", slot: "T", styles: [SH, SW], name: "Low D", tab: "-2:2 -3:2 -4:4 -1:8" },
  { id: "t-bends", slot: "T", styles: [SH, SL, SW], name: "Bend turnaround", tab: "-3↓↓:2 -3↓:2 -2:4 r:4 -1:4" },
  { id: "sl-t-long", slot: "T", styles: [SL], name: "Slow turnaround", tab: "-2:4 -3:4 -4:8" },

  // ---- ending (ends on I) ----
  { id: "e-simple", slot: "E", styles: [SH, BO, SW, SL], name: "Simple ending", tab: "-4:2 -3:2 -2:4 -(1 2 3):8" },
  { id: "e-home", slot: "E", styles: [SH, BO, SW], name: "Home ending", tab: "-4:2 -3↓:2 -2:4 -(1 2 3):8" },
  { id: "e-shake", slot: "E", styles: [SH, SL], name: "Bend ending", tab: "-3↓:2 -2:2 -3↓↓:2 -3↓:2 -2:8" },
  { id: "sl-e-long", slot: "E", styles: [SL], name: "Slow ending", tab: "-3↓:4 -2:12" },

  // ===== 2nd position, minor blues (no major 3rd: ♭3 is -3↓; v chord is -(4 5 6)) =====
  { id: "m-i-pent", slot: "I", styles: ["minor"], name: "Minor pentatonic", tab: "-2:2 4:2 -4:2 -5:2 -4:2 4:2 -2:4" },
  { id: "m-i-high", slot: "I", styles: ["minor"], name: "Minor up top", tab: "6:2 -5:2 -4:2 -5:2 6:8" },
  { id: "m-i-b3", slot: "I", styles: ["minor"], name: "Flat three", tab: "-2:2 -3↓:2 4:2 -4:2 -3↓:2 -2:6" },
  { id: "m-i-wail", slot: "I", styles: ["minor"], name: "Minor wail", tab: "-3↓↓:1 ~-3↓:3 4:2 -4↓:2 -4:2 -3↓:2 -2:4" },
  { id: "m-iv-1", slot: "IV", styles: ["minor"], name: "Minor iv", tab: "4:4 6:2 4:2 -4:4 r:4" },
  { id: "m-iv-2", slot: "IV", styles: ["minor"], name: "iv with flat three", tab: "4:2 -3↓:2 4:2 -4:2 -3↓:4 r:4" },
  { id: "m-v-chord", slot: "V", styles: ["minor"], name: "Minor v chord", tab: "-(4 5 6):4 -4:2 -5:2 -6:4 -5:2 -4:2" },
  { id: "m-v-down", slot: "V", styles: ["minor"], name: "v walk down", tab: "-6:2 -5:2 -4:2 -4↓:2 4:2 -3↓:2 -2:4" },
  { id: "m-t-1", slot: "T", styles: ["minor"], name: "Minor turnaround", tab: "-2:4 4:2 -4:2 -4:8" },
  { id: "m-t-2", slot: "T", styles: ["minor"], name: "Minor walk down", tab: "6:2 -5:2 -4:2 4:2 -3↓:2 -2:2 -4:4" },
  { id: "m-e-1", slot: "E", styles: ["minor"], name: "Minor ending", tab: "-4:2 4:2 -2:4 -2:8" },
  { id: "m-e-2", slot: "E", styles: ["minor"], name: "Flat-three ending", tab: "-4:2 -3↓:2 -2:12" },

  // ===== 1st position, Jimmy Reed style: high register, blow bends (harp = song key) =====
  { id: "r-i-1", slot: "I", styles: ["reed"], name: "High home", tab: "6:2 7:2 -8:2 8:2 7:4 r:4" },
  { id: "r-i-2", slot: "I", styles: ["reed"], name: "Lazy Reed", tab: "7:2 7:2 -8:2 8:2 -8:2 7:6" },
  { id: "r-i-bend", slot: "I", styles: ["reed"], name: "Blow bend blues", tab: "8↓:2 8:2 7:2 -7:2 6:4 r:4" },
  { id: "r-i-slide", slot: "I", styles: ["reed"], name: "Top slide", tab: "10↓↓:2 ~10↓:2 9:2 8:2 7:8" },
  { id: "r-iv-1", slot: "IV", styles: ["reed"], name: "Reed IV", tab: "-5:2 -6:2 7:2 -6:2 -5:4 r:4" },
  { id: "r-iv-2", slot: "IV", styles: ["reed"], name: "High IV", tab: "-9:2 -9:2 8:2 -8:2 -9:4 r:4" },
  { id: "r-iv-bend", slot: "IV", styles: ["reed"], name: "IV blow bends", tab: "-9:2 9↓:2 8:2 8↓:2 7:4 r:4" },
  { id: "r-v-1", slot: "V", styles: ["reed"], name: "Reed V to IV", tab: "9:2 -8:2 -7:2 6:2 -5:2 -6:2 7:4" },
  { id: "r-v-2", slot: "V", styles: ["reed"], name: "V draw chord", tab: "-(1 2 3 4):4 -4:2 -3:2 -(1 2 3 4):4 r:4" },
  { id: "r-v-bend", slot: "V", styles: ["reed"], name: "V blow bends", tab: "9:2 9↓:2 -8:2 8↓:2 -7:2 7:6" },
  { id: "r-t-1", slot: "T", styles: ["reed"], name: "Reed turnaround", tab: "8:2 7:2 -7:2 -8:2 9:8" },
  { id: "r-t-2", slot: "T", styles: ["reed"], name: "Bent turnaround", tab: "8↓:2 8:2 7:2 -6:2 -7:4 6:4" },
  { id: "r-e-1", slot: "E", styles: ["reed"], name: "Reed ending", tab: "-8:2 8:2 7:4 (4 5 6):8" },
  { id: "r-e-2", slot: "E", styles: ["reed"], name: "High chord ending", tab: "8↓:2 8:2 7:4 (7 8 9):8" },
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
