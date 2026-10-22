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

  // ===== Country blues (acoustic) — written in the manner of the players named in `after`;
  // these are original licks built from their documented techniques, not transcriptions.
  // `tip` says how to play it. Player facts and sources are in players.js.

  // ---- Delta blues: sparse, talking phrases, low end, tongue-blocked chords ----
  { id: "d-i-talk", slot: "I", styles: ["delta"], after: "sonny-boy-ii", name: "Low talk", tab: "-2:3 -2:1 -1:2 -2:4 r:6",
    tip: "Leave the space: say a short phrase and let the guitar answer." },
  { id: "d-i-chord", slot: "I", styles: ["delta"], name: "Chord answer", tab: "-(1 2 3):2 r:2 -(1 2 3):1 -(1 2 3):3 -2:4 r:4",
    tip: "Hit the draw chord hard, then narrow to hole 2." },
  { id: "d-i-walk", slot: "I", styles: ["delta"], name: "Walking low", tab: "-1:2 -2:2 -3:2 -2:2 -1:2 1:2 -1:4" },
  { id: "d-i-moan", slot: "I", styles: ["delta"], after: "sonny-boy-ii", name: "Moan and answer", tab: "-3↓:4 -2:2 -3↓:2 -2:4 r:4",
    tip: "Hold the bent 3 like a voice, with a slow hand vibrato." },
  { id: "d-i-shake", slot: "I", styles: ["delta"], name: "Hold and shake", tab: "-4/5:6 -4:2 -3↓:2 -2:6",
    tip: "Shake: rock your head (not the harp) between draw 4 and 5." },
  { id: "d-i-bentcall", slot: "I", styles: ["delta"], name: "Bent call", tab: "-2:2 -3↓:1 ~-3:3 -2:2 r:2 -1:2 -2:4" },
  { id: "d-i-deep", slot: "I", styles: ["delta"], after: "sonny-boy-ii", name: "Deep moan", tab: "-3↓↓:1 ~-3↓:1 ~-3:2 -2:4 r:2 -2↓↓:2 -2:4" },
  { id: "d-i-octave", slot: "I", styles: ["delta"], name: "Tongue-blocked octave", tab: "-(1 _ _ 4):3 -(1 _ _ 4):1 -(1 _ _ 4):4 -3↓:2 -2:6",
    tip: "Tongue on holes 2–3, lips on 1–4: the octave sounds fat and woody." },
  { id: "d-iv-chord", slot: "IV", styles: ["delta"], name: "Blow-chord answer", tab: "(1 2 3):3 (1 2 3):1 1:2 -1:2 (1 2 3):4 r:4" },
  { id: "d-iv-moan", slot: "IV", styles: ["delta"], name: "IV moan", tab: "4:2 -3↓:2 4:2 -3↓:2 -2:4 r:4" },
  { id: "d-iv-low", slot: "IV", styles: ["delta"], name: "Low IV with the flat seven", tab: "(1 2 3):2 -2↓↓:2 2:2 1:2 (1 2 3):4 r:4" },
  { id: "d-v-chord", slot: "V", styles: ["delta"], name: "Draw chord to blow", tab: "-(1 2 3):4 -1:2 -(1 2 3):2 (1 2 3):4 r:4" },
  { id: "d-v-climb", slot: "V", styles: ["delta"], name: "Climb and fall", tab: "-1:2 -2:2 -3:2 -4:2 4:2 -3↓:2 -2:4" },
  { id: "d-v-wail", slot: "V", styles: ["delta"], name: "V wail", tab: "-4:2 ~-4↓:2 4:2 -3↓↓:2 (1 2 3):8" },
  { id: "d-t-simple", slot: "T", styles: ["delta"], name: "Delta turnaround", tab: "-2:2 -3:2 4:2 -3:2 -2:4 -1:4" },
  { id: "d-t-bend", slot: "T", styles: ["delta"], name: "Bend-down turnaround", tab: "4:2 -3↓:2 -2:4 r:4 -1:4" },
  { id: "d-t-chrom", slot: "T", styles: ["delta"], name: "Chromatic walk-down", tab: "-4:1 -4↓:1 4:2 -3↓:2 -3↓↓:2 -2:4 -1:4" },
  { id: "d-e-home", slot: "E", styles: ["delta"], name: "Down-home ending", tab: "-2:2 -1:2 -2:4 -(1 2 3):8" },
  { id: "d-e-bent", slot: "E", styles: ["delta"], name: "Bent ending", tab: "-3↓:2 -2:2 -1:2 -2:2 -(1 2 3):8" },
  { id: "d-e-slide", slot: "E", styles: ["delta"], name: "Slide home", tab: "-3↓↓:1 ~-3↓:1 ~-3:2 -2:4 -(1 _ _ 4):8" },

  // ---- Hill country: one chord, short riffs repeated like a trance ----
  { id: "h-drone", slot: "I", styles: ["hill"], after: "johnny-woods", name: "Drone riff", tab: "-2:1 -2:1 -3:2 -2:1 -2:1 -3:2 -4:2 -3:2 -2:4",
    tip: "Same riff every time; the groove comes from repeating it exactly." },
  { id: "h-pulse", slot: "I", styles: ["hill"], name: "Root pulse", tab: "-2:2 -2:2 -2:1 -3:1 -2:2 -1:2 -2:2 r:4" },
  { id: "h-chords", slot: "I", styles: ["hill"], name: "Chord drive", tab: "-(1 2 3):1 -(1 2 3):1 -(1 2 3):2 -(1 2 3):1 -(1 2 3):1 -(1 2 3):2 -(2 3 4):4 r:4" },
  { id: "h-high", slot: "I", styles: ["hill"], name: "Call high", tab: "6:2 -5:2 -4:2 -3:2 -2:4 r:4" },
  { id: "h-hook", slot: "I", styles: ["hill"], after: "johnny-woods", name: "Bent hook", tab: "-3↓:2 -2:2 -3↓:2 -2:2 4:2 -3↓:2 -2:4" },
  { id: "h-seven", slot: "I", styles: ["hill"], name: "Flat-seven run", tab: "-2:2 -3↓:2 4:2 -4:2 -5:2 -4:2 -3↓:2 -2:2" },
  { id: "h-shake", slot: "I", styles: ["hill"], name: "Shake drone", tab: "-4/5:4 -4:2 -3↓:2 -2:8" },
  { id: "h-triplet", slot: "I", styles: ["hill"], name: "Triplet hook", tab: "-2:2/3 -3↓:2/3 -3:2/3 -4:2 -3↓:2 -2:2 r:8" },
  { id: "h-deep", slot: "I", styles: ["hill"], name: "Deep hook", tab: "-3↓↓:1 ~-3↓:1 -2:2 -3↓↓:1 ~-3↓:1 -2:2 -1:2 -2:6" },
  { id: "h-octave", slot: "I", styles: ["hill"], name: "Octave groove", tab: "-(1 _ _ 4):2 -(1 _ _ 4):1 -(1 _ _ 4):1 -(1 _ _ 4):2 -3↓:2 -2:2 -(1 _ _ 4):2 r:4" },
  { id: "h-e-drone", slot: "E", styles: ["hill"], name: "Drone ending", tab: "-2:2 -3:2 -2:4 -(1 2 3):8" },
  { id: "h-e-bent", slot: "E", styles: ["hill"], name: "Bent stop", tab: "-3↓:2 -2:2 -3↓:2 -2:2 -(1 2 3):8" },

  // ---- Piedmont: Sonny Terry's chugging chords and hollers over a fingerpicked guitar ----
  { id: "p-i-chug", slot: "I", styles: ["piedmont", "train"], after: "sonny-terry", name: "Chug", tab: "-(1 2 3):1 (1 2 3):1 -(1 2 3):1 (1 2 3):1 -(1 2 3):1 (1 2 3):1 -(1 2 3):2 -2:4 r:4",
    tip: "Breathe in and out on the low chords in rhythm: the harp is the drummer." },
  { id: "p-i-bright", slot: "I", styles: ["piedmont"], name: "Bright answer", tab: "-2:1 -3:1 -4:2 5:2 -4:2 -3:2 -2:2 r:4" },
  { id: "p-i-whoop", slot: "I", styles: ["piedmont"], after: "sonny-terry", name: "Whoop fall", tab: "-4:1 -4↓:1 -3↓:2 -2:2 r:2 -(1 2 3):2 -2:2 r:4",
    tip: "Sonny Terry answered harp notes with falsetto whoops; leave the rest for your own holler." },
  { id: "p-i-run", slot: "I", styles: ["piedmont"], name: "Triplet run", tab: "-2:2/3 -3↓:2/3 -3:2/3 -4:2/3 5:2/3 -4:2/3 -3:2 -2:2 -(1 2 3):4 r:4" },
  { id: "p-i-holler", slot: "I", styles: ["piedmont"], name: "High holler", tab: "-6:2 6:2 -5:1 5:1 -4:2 -3↓:2 -2:2 r:4" },
  { id: "p-i-wah", slot: "I", styles: ["piedmont"], after: "sonny-terry", name: "Cupped chug and slide", tab: "-(1 2 3):1 -(1 2 3):1 -(1 2 3):2 -3↓↓:1 ~-3:1 -2:2 -(1 2 3):1 -(1 2 3):1 -(1 2 3):2 -2:4",
    tip: "Open and close your cupped hands on the chords for a wah." },
  { id: "p-iv-chug", slot: "IV", styles: ["piedmont"], name: "IV chug", tab: "(1 2 3):1 -(1 2 3):1 (1 2 3):1 -(1 2 3):1 (1 2 3):2 4:2 5:4 r:4" },
  { id: "p-iv-holler", slot: "IV", styles: ["piedmont"], name: "IV holler", tab: "6:2 5:2 4:2 -3↓:2 4:4 r:4" },
  { id: "p-v-push", slot: "V", styles: ["piedmont"], name: "V push", tab: "-4:2 -4:1 -4:1 -5:2 -4:2 4:4 (1 2 3):4" },
  { id: "p-v-bent", slot: "V", styles: ["piedmont"], name: "Bent V", tab: "-(4 5 6):2 -4:2 -4↓:2 4:2 -3↓:2 -2:2 4:4" },
  { id: "p-t-turn", slot: "T", styles: ["piedmont"], name: "Piedmont turnaround", tab: "-2:1 -3:1 4:2 5:2 4:2 -3:2 -2:2 -1:4" },
  { id: "p-t-bent", slot: "T", styles: ["piedmont"], name: "Bent turnaround", tab: "5:2 4:2 -3↓:2 -2:2 4:2 -3↓:2 -4:4" },
  { id: "p-e-chug", slot: "E", styles: ["piedmont"], name: "Chug ending", tab: "-(1 2 3):1 (1 2 3):1 -(1 2 3):2 -2:4 -(1 2 3):8" },
  { id: "p-e-whoop", slot: "E", styles: ["piedmont"], name: "Whoop ending", tab: "-4:1 -4↓:1 -3↓:2 -2:4 -(1 2 3):8" },

  // ---- Train and fox chase: rhythm and sound effects on one chord ----
  { id: "t-chug", slot: "I", styles: ["train"], after: "deford-bailey", name: "Chugging train", tab: Array(8).fill("-(1 2 3):1 (1 2 3):1").join(" "),
    tip: "In-out-in-out on holes 1–3, steady as wheels on the rails. Accent the draws." },
  { id: "t-accent", slot: "I", styles: ["train"], name: "Accented chug", tab: Array(4).fill("-(1 2 3):2 (1 2 3):1 -(1 2 3):1").join(" ") },
  { id: "t-steam", slot: "I", styles: ["train"], name: "Steam", tab: "-(1 2 3):3 -(1 2 3):1 (1 2 3):3 (1 2 3):1 -(1 2 3):3 -(1 2 3):1 (1 2 3):4" },
  { id: "t-slowing", slot: "I", styles: ["train"], name: "Pulling in", tab: "-(1 2 3):2 (1 2 3):2 -(1 2 3):3 (1 2 3):3 -(1 2 3):6" },
  { id: "t-whistle", slot: "I", styles: ["train"], after: "deford-bailey", name: "Whistle", tab: "-(3 4):6 -(3 4):2 " + Array(4).fill("-(1 2 3):1 (1 2 3):1").join(" "),
    tip: "The whistle is a long draw on 3 and 4 together; bend it down and up as you get better." },
  { id: "t-bell", slot: "I", styles: ["train"], name: "Crossing bell", tab: "-4/5:8 " + Array(3).fill("-(1 2 3):1 (1 2 3):1").join(" ") + " -(1 2 3):2" },
  { id: "t-yelp", slot: "I", styles: ["train"], after: "deford-bailey", name: "Hound yelps", tab: "-4:1 -4↓:1 -4:1 -4↓:1 -3↓:4 -2:4 r:4",
    tip: "Fox-chase pieces imitate the hounds with quick bent yelps." },
  { id: "t-bentwhistle", slot: "I", styles: ["train"], name: "Bent whistle", tab: "-4↓:2 ~-4:6 " + Array(4).fill("-(1 2 3):1 (1 2 3):1").join(" ") },
  { id: "t-wail", slot: "I", styles: ["train"], name: "Hound's wail", tab: "-3↓↓:1 ~-3↓:1 ~-3:6 -2:2 r:6" },
  { id: "t-e-stop", slot: "E", styles: ["train"], name: "Train stops", tab: "-(1 2 3):1 (1 2 3):1 -(1 2 3):2 (1 2 3):4 -(1 2 3):8" },
  { id: "t-e-whistle", slot: "E", styles: ["train"], name: "Last whistle", tab: "-4↓:2 ~-4:6 -(1 2 3):8" },

  // ---- Memphis jug band: bouncy, melodic, mid-register ----
  { id: "j-i-melody", slot: "I", styles: ["jug"], after: "noah-lewis", name: "Good-time melody", tab: "-2:2 -3:2 -4:2 5:2 -4:2 -3:2 -2:4",
    tip: "Clean single notes with a sweet tone: jug-band harp sang the tune." },
  { id: "j-i-bounce", slot: "I", styles: ["jug"], name: "Bounce", tab: "-4:1 5:1 -4:2 -3:2 -2:2 -3:1 -4:1 -3:2 -2:4" },
  { id: "j-i-tumble", slot: "I", styles: ["jug"], name: "Triplet tumble", tab: "6:2/3 -5:2/3 5:2/3 -4:2/3 4:2/3 -3:2/3 -2:4 -3:2 -2:4 r:2" },
  { id: "j-i-sweet", slot: "I", styles: ["jug"], name: "Sweet bend", tab: "-3↓:1 -3:1 -4:2 5:2 6:2 5:2 -4:2 -2:4" },
  { id: "j-i-high", slot: "I", styles: ["jug"], name: "High jug", tab: "-6:2 6:1 -5:1 5:2 -4:2 -4↓:1 4:1 -3↓↓:2 -2:4" },
  { id: "j-iv-bounce", slot: "IV", styles: ["jug"], name: "IV bounce", tab: "4:2 5:2 6:2 5:2 4:2 5:2 4:4" },
  { id: "j-iv-sweet", slot: "IV", styles: ["jug"], name: "IV sweet", tab: "6:2 -5:2 5:2 4:2 -3↓:2 4:2 5:4" },
  { id: "j-v-walk", slot: "V", styles: ["jug"], name: "V to IV", tab: "-4:2 -5:2 -6:2 -5:2 5:2 4:2 5:4" },
  { id: "j-v-lean", slot: "V", styles: ["jug"], name: "V lean", tab: "-4:2 -4↓:2 4:4 -3:2 4:2 5:4" },
  { id: "j-t-turn", slot: "T", styles: ["jug"], name: "Jug turnaround", tab: "-2:2 -3:2 -4:2 5:2 6:4 -4:4" },
  { id: "j-t-bent", slot: "T", styles: ["jug"], name: "Bent turnaround", tab: "6:2 5:2 -4:2 -3↓:2 -3:4 -4:4" },
  { id: "j-e-end", slot: "E", styles: ["jug"], name: "Jug ending", tab: "-4:2 -3:2 -2:4 -(2 3 4):8" },
  { id: "j-e-sweet", slot: "E", styles: ["jug"], name: "Sweet ending", tab: "5:2 -4:2 -3↓:2 -3:2 -2:8" },

  // ---- Chicago, after the amplified masters ----
  { id: "c-lw-run", slot: "I", styles: [SH], after: "little-walter", name: "Jazzy triplet run", tab: "-2:2/3 -3↓:2/3 -3:2/3 -4:2/3 5:2/3 -5:2/3 6:2 -5:1 5:1 -4:2 -3↓:2 -2:2 r:2",
    tip: "Little Walter phrased like a horn player: even triplets running up, then a swung fall." },
  { id: "c-shake", slot: "I", styles: [SH, SL], name: "Shake and fall", tab: "-4/5:4 -4:2 -3↓:2 -2:2 -3:2 4:4" },
  { id: "c-bw-octave", slot: "I", styles: [SH, SL], after: "big-walter", name: "Tongue-blocked octaves", tab: "-(1 _ _ 4):2 -(1 _ _ 4):1 -(1 _ _ 4):1 -(2 _ _ 5):4 -(1 _ _ 4):4 r:4",
    tip: "Big Walter's big tone came from tongue blocking: block the middle holes and play the octave." },
  { id: "c-sl-triplets", slot: "I", styles: [SL], name: "Slow triplet sigh", tab: "-4:2/3 -4↓:2/3 4:2/3 -3↓:2 -2:4 r:2 -3↓↓:2/3 -3↓:2/3 -3:2/3 -2:4" },
  { id: "c-iv-shake", slot: "IV", styles: [SH, SL], name: "IV shake", tab: "5/6:4 5:2 4:2 -3↓:4 r:4" },

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

/** A duration: whole eighths ("2"), fractions ("2/3" = a triplet eighth) or decimals ("0.5"). */
export function parseUnits(text) {
  const [a, b] = String(text).split("/");
  const v = b === undefined ? Number(a) : Number(a) / Number(b);
  return Number.isFinite(v) && v > 0 ? v : NaN;
}

/**
 * One lick token: { token, units, rest, glide, shake? }.
 * "-4/5:4" is a shake: draw 4 trilled with draw 5 (`token` "-4", `shake` "-5").
 */
export function parseLick(tab) {
  const re = /(~?-?\([^)]*\)|~?[^\s:]+):(\d+(?:\.\d+)?(?:\/\d+)?)/g;
  const out = [];
  let total = 0;
  for (const [, raw, dur] of tab.matchAll(re)) {
    const glide = raw.startsWith("~");
    let token = glide ? raw.slice(1) : raw;
    let shake;
    const sh = /^(-?)(\d{1,2}[↓]*)\/(\d{1,2})$/.exec(token);
    if (sh) {
      token = `${sh[1]}${sh[2]}`;
      shake = `${sh[1]}${sh[3]}`;
    }
    const units = parseUnits(dur);
    out.push({ token, units, rest: token === "r", glide, ...(shake && { shake }) });
    total += units;
  }
  return { tokens: out, units: Math.round(total * 1e6) / 1e6 };
}

/** The token as written in tab: "-4/5" for a shake. */
export const tabToken = (t) => (t.shake ? `${t.token}/${t.shake.replace(/^-/, "")}` : t.token);

/**
 * Difficulty from the techniques a lick uses:
 * 1 natural notes and chords · 2 one-semitone bends, shakes · 3 deeper bends, slides, splits · 4 overbends.
 */
export function lickLevel(tab) {
  let level = 1;
  for (const { token, glide, shake } of parseLick(tab).tokens) {
    const bends = (token.match(/↓/g) ?? []).length;
    if (token.includes("↑")) level = Math.max(level, 4);
    else if (bends >= 2 || glide || token.includes("_")) level = Math.max(level, 3);
    else if (bends === 1 || shake) level = Math.max(level, 2);
  }
  return level;
}

export const LEVELS = { 1: "Beginner", 2: "Bends", 3: "Advanced", 4: "Overblows" };

export const SLOT_NAMES = { I: "I chord", IV: "IV chord", V: "V to IV", T: "Turnaround", E: "Ending" };

/**
 * Check a lick someone typed in: every token must be playable and the rhythm must fit in
 * `maxUnits` eighths (2 bars for a lick); shorter licks are padded with rest to whole bars.
 * Durations default to `defaultUnits` (2 = a quarter): "-2 -3↓ 4" is "-2:2 -3↓:2 4:2".
 * @returns {{ ok: true, tab: string, level: number, units: number } | { ok: false, error: string }}
 */
export function validateLick(text, harp, { maxUnits = 16, defaultUnits = 2, pad = true } = {}) {
  const raw = String(text).trim();
  if (!raw) return { ok: false, error: "Type some tab, e.g. -2 -3↓ 4 -4" };
  // Give tokens without a duration the default; keep chords together.
  const tokens = raw.match(/~?-?\([^)]*\)(?::[\d./]+)?|[^\s]+/g) ?? [];
  const withDur = tokens.map((t) => (/:[\d./]+$/.test(t) ? t : `${t}:${defaultUnits}`));
  const { tokens: parsed, units } = parseLick(withDur.join(" "));
  if (parsed.length !== withDur.length || parsed.some((t) => Number.isNaN(t.units)))
    return { ok: false, error: "Couldn't read the rhythm; write durations as token:eighths, e.g. -2:2 or -4:2/3" };
  if (units > maxUnits + 1e-6) return { ok: false, error: `That's ${units / 2} beats; this can be up to ${maxUnits / 2} beats.` };
  for (const t of parsed) {
    if (t.rest) continue;
    try {
      parseToken(t.token, harp);
      if (t.shake) parseToken(t.shake, harp);
    } catch (err) {
      return { ok: false, error: err.message.replace(/ on the \S+ harp$/, " on a diatonic harp") };
    }
  }
  const whole = Math.max(16, Math.ceil(units / 8 - 1e-6) * 8);
  const fill = Math.round((Math.min(maxUnits, whole) - units) * 1e6) / 1e6;
  const tab = pad && fill > 0 ? `${withDur.join(" ")} r:${fill}` : withDur.join(" ");
  return { ok: true, tab, level: lickLevel(tab), units: pad ? units + Math.max(0, fill) : units };
}
