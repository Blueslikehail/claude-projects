// Lesson styles: each sets the harp position, the rhythm feel, the tempo range, the chord
// quality and the band's patterns. Licks are tagged with the styles they suit (licks.js).
//
// Band parts are optional: `bass` (bass guitar), `comp` (piano stabs, or held organ chords
// with `bars`), `guitar` (acoustic: a thumb part and treble pinches, intervals from the
// low root) and `drums` (hat, kick, snare, or a foot `stomp`). `progression` and `slots`
// change the 12-bar form (one-chord styles stay on I).
//
// Pattern positions are in beats within a 4/4 bar. Half-beat positions (x.5) are swung by
// the style's `swing` (0.5 = straight eighths, 2/3 = triplet shuffle); other fractions,
// like the 12/8 triplets of a slow blues, are placed exactly.

export const STYLES = {
  shuffle: {
    name: "Chicago shuffle",
    blurb: "Swinging 12-bar shuffle, Little Walter style. Cross harp.",
    position: 2, swing: 2 / 3, tempo: { min: 80, max: 150, default: 100 }, chord: "7",
    feel: ["shuffle"], form: "12-bar",
    bass: { at: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], intervals: [0, 4, 7, 9, 10, 9, 7, 4], length: 0.85 },
    comp: { at: [0.5, 1.5, 2.5, 3.5], seconds: 0.14 },
    drums: { hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], kick: [0, 2], snare: [1, 3] },
  },
  slow: {
    name: "Slow blues",
    blurb: "12/8 slow blues: long notes, deep bends, room to breathe.",
    position: 2, swing: 2 / 3, tempo: { min: 50, max: 75, default: 60 }, chord: "7",
    feel: ["slow"], form: "12-bar",
    bass: { at: [0, 1, 2, 3], intervals: [0, 4, 7, 9], length: 0.9 },
    comp: { at: [0], bars: 1, soft: true },
    drums: { hat: [0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3, 2, 7 / 3, 8 / 3, 3, 10 / 3, 11 / 3], kick: [0, 2], snare: [1, 3] },
  },
  boogie: {
    name: "Boogie rock",
    blurb: "Straight-eighths boogie, Canned Heat / J. Geils drive.",
    position: 2, swing: 0.5, tempo: { min: 110, max: 160, default: 130 }, chord: "7",
    feel: ["boogie", "rock"], form: "12-bar",
    bass: { at: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], intervals: [0, 0, 7, 7, 9, 9, 7, 7], length: 0.8 },
    comp: { at: [1, 3], seconds: 0.12 },
    drums: { hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], kick: [0, 2, 2.5], snare: [1, 3] },
  },
  swamp: {
    name: "Swamp groove",
    blurb: "Lazy Louisiana groove with lots of space, Slim Harpo style.",
    position: 2, swing: 0.6, tempo: { min: 75, max: 100, default: 88 }, chord: "7",
    feel: ["groove"], form: "12-bar",
    bass: { at: [0, 1.5, 2, 3], intervals: [0, 0, 10, 7], length: 0.7 },
    comp: { at: [1, 3], seconds: 0.1 },
    drums: { hat: [0, 1, 2, 3], kick: [0, 1.5, 2], snare: [1, 3], rim: true },
  },
  minor: {
    name: "Minor blues",
    blurb: "Minor 12-bar in cross harp: flat-three bends and the minor v chord.",
    position: 2, swing: 0.5, tempo: { min: 70, max: 110, default: 88 }, chord: "m7",
    feel: ["groove"], form: "minor groove", minor: true,
    bass: { at: [0, 1, 2, 3], intervals: [0, 7, 10, 7], length: 0.85 },
    comp: { at: [0], bars: 1, soft: true },
    drums: { hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], kick: [0, 2], snare: [1, 3] },
  },
  reed: {
    name: "Jimmy Reed",
    blurb: "Lazy shuffle in 1st position, high on the harp with blow bends. Harp in the song's key.",
    position: 1, swing: 2 / 3, tempo: { min: 70, max: 100, default: 84 }, chord: "7",
    feel: ["shuffle"], form: "12-bar",
    bass: { at: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], intervals: [0, 0, 7, 7, 9, 9, 7, 7], length: 0.85 },
    comp: { at: [1.5, 3.5], seconds: 0.12 },
    drums: { hat: [0, 1, 2, 3], kick: [0, 2], snare: [1, 3] },
  },
  delta: {
    name: "Delta blues",
    blurb: "Acoustic Mississippi blues: a guitar with a thumping bass, a foot on the floor, and a harp that talks back. Cross harp.",
    position: 2, swing: 2 / 3, tempo: { min: 60, max: 100, default: 78 }, chord: "7",
    feel: ["shuffle", "slow"], form: "12-bar", acoustic: true,
    guitar: { thumb: { at: [0, 1, 2, 3], intervals: [0, 0, 0, 0], length: 0.55 }, treble: { at: [1.5, 3.5], intervals: [10, 12, 16], seconds: 0.18 } },
    drums: { stomp: [0, 1, 2, 3] },
  },
  hill: {
    name: "Hill country",
    blurb: "North Mississippi hill country: one chord, a hypnotic droning groove — a riff repeated until it hypnotizes. Cross harp.",
    position: 2, swing: 0.58, tempo: { min: 90, max: 130, default: 108 }, chord: "7",
    feel: ["groove"], form: "one-chord", acoustic: true,
    progression: Array(12).fill("I"), slots: ["I", "I", "I", "I", "I", "I"],
    guitar: { thumb: { at: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], intervals: [0, 0, 0, 0, 0, 0, 0, 0], length: 0.8 }, treble: { at: [0.5, 2.5, 3], intervals: [10, 12, 15], seconds: 0.15 } },
    drums: { stomp: [0, 1, 2, 3] },
  },
  piedmont: {
    name: "Piedmont",
    blurb: "East-coast country blues, Sonny Terry style: an alternating-thumb fingerpicked guitar, chugging chords and whoops on the harp. Cross harp.",
    position: 2, swing: 0.6, tempo: { min: 95, max: 150, default: 116 }, chord: "7",
    feel: ["shuffle"], form: "12-bar", acoustic: true,
    guitar: { thumb: { at: [0, 1, 2, 3], intervals: [0, 7, 0, 7], length: 0.6 }, treble: { at: [0, 1.5, 2.5, 3.5], intervals: [12, 16, 22], seconds: 0.16 } },
    drums: {},
  },
  train: {
    name: "Train & fox chase",
    blurb: "Solo harp pieces that imitate a train or a fox hunt (DeFord Bailey, Sonny Terry): rhythm chugs, whistles and howls on one chord. Cross harp.",
    position: 2, swing: 0.5, tempo: { min: 100, max: 160, default: 126 }, chord: "7",
    feel: ["train"], form: "one-chord", acoustic: true,
    progression: Array(12).fill("I"), slots: ["I", "I", "I", "I", "I", "I"],
    drums: { hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], stomp: [0, 2] },
  },
  jug: {
    name: "Jug band",
    blurb: "Memphis jug band (Noah Lewis, Will Shade): a bouncy good-time 12-bar with a jug bass, guitar strum and washboard. Cross harp.",
    position: 2, swing: 2 / 3, tempo: { min: 95, max: 140, default: 112 }, chord: "7",
    feel: ["shuffle"], form: "12-bar", acoustic: true,
    bass: { at: [0, 2], intervals: [0, 7], length: 0.6 },
    guitar: { thumb: { at: [], intervals: [], length: 0 }, treble: { at: [1, 3], intervals: [7, 10, 12, 16], seconds: 0.2 } },
    drums: { hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
  },
};

export const STYLE_IDS = Object.keys(STYLES);

/** Seconds from the start of the song for a position in beats, with the style's swing. */
export function beatTime(beats, tempo, swing = 2 / 3) {
  const whole = Math.floor(beats + 1e-9);
  const frac = beats - whole;
  const at = Math.abs(frac - 0.5) < 1e-9 ? swing : frac;
  return (whole + at) * (60 / tempo);
}
