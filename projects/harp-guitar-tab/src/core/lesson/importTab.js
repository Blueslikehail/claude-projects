// Read harmonica tab pasted from a website, a book or a forum, whatever notation it uses,
// and convert it to this app's tab (draw "-", one "↓" per semitone of bend, "↑" overbend).
//
// Notations seen on tab sites (examples on a C harp):
//   draw:      -4   4d   (4)   ↓4 (arrows meaning breath, not bend)   d4   4 (when blow is 4+)
//   blow:       4   +4   4b (only in d/b tabs)   ↑4   4+ (BluesHarmonica.com: unsigned = draw)
//   bends:     -3'  -3''  -3'''   -3b  -3bb  -3b2  -3"  -3’   -3^
//   overbends:  6o  6ob  6°   -7o  -7od  7od
//   shakes:    -4/5  -4/-5  -4~  -4sh  -4tr  [-4-5]
//   chords:    -123  (1 2 3)  -(1 2 3)  [1 2 3]  1+2+3  -1-2-3 written as one word
// Anything that isn't tab (lyrics, chord names, "x2", bar lines) is skipped and reported.

import { createHarp } from "../harmonica.js";
import { parseToken } from "../tab.js";

const C = createHarp("C");

/** Is this an arrow-notation token (ours): "-3↓↓", "6↑", "-(1 2 3)", "-4/5"? */
const OURS = /^~?-?(\d{1,2}[↓']*↑?(\/\d{1,2})?|\([\d_ ]+\))$/;

/**
 * Guess how a text writes draw notes, so "(4)" and "4d" are read right.
 * @returns {"minus"|"plus"|"parens"|"suffix"|"arrows"}
 */
export function detectNotation(text) {
  const t = normalize(text);
  const count = (re) => (t.match(re) ?? []).length;
  const minus = count(/(^|[\s(\[|,])-\d/g);
  const parens = count(/\((?:10|[1-9])\)/g); // single-hole parentheses
  const suffix = count(/(^|[\s|,])(10|[1-9])[dD](?![a-z])/g) + count(/(^|[\s|,])[dD](10|[1-9])(?!\d)/g);
  const arrows = minus === 0 ? count(/(^|[\s|,])[↓↑](10|[1-9])/g) : 0;
  const plus = minus === 0 ? count(/(^|[\s|,(])(10|[1-9])['"]*\+/g) : 0; // 4+ = blow, so 4 = draw
  const best = Object.entries({ minus, plus, parens, suffix, arrows }).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "minus";
}

function normalize(text) {
  return String(text)
    .replace(/[’‘′`´]/g, "'")
    .replace(/[″“”]/g, "''")
    .replace(/"/g, "''")
    .replace(/[–—−]/g, "-")
    .replace(/\t/g, " ");
}

/**
 * Read one word of tab in the given notation. Returns the token in arrow notation, or null.
 * Two-hole shakes come back as "-4/5"; chords as "-(1 2 3)".
 */
export function readWord(word, notation = "minus") {
  let w = word.trim();
  if (!w) return null;
  if (OURS.test(w.replace(/'/g, "↓")) && notation === "minus") {
    const ours = w.replace(/'/g, "↓");
    if (valid(ours)) return ours;
  }
  w = w.replace(/^[|:,;.]+|[|:,;.]+$/g, "");
  if (!w) return null;

  // Chord in brackets: (1 2 3), -(1 2 3), [1 2 3], (-1-2-3), (456), [-4-5] (shake)
  let m = /^(-?)[([{](-?)([\d\s\-+_/,'b]+)[)\]}](['b]*)$/.exec(w);
  if (m) {
    const holes = (m[3].match(/10|[1-9]|_/g) ?? []);
    const bends = (m[3].match(/['b]/g) ?? []).join("") + (m[4] ?? "");
    const drawInside = m[3].includes("-") || m[2] === "-";
    let draw = m[1] === "-" || drawInside;
    if (notation === "parens" && holes.length === 1) draw = true; // (4) = draw 4
    if (holes.length === 1) return single(`${draw ? "-" : ""}${holes[0]}${bends}`, "minus");
    if (bends) return null;
    if (holes.length === 2 && m[0].startsWith("[") && Math.abs(holes[0] - holes[1]) === 1) return shake(holes, draw);
    return chord(holes, draw);
  }
  // Shake: -4/5, -4/-5, 4/5, -4~ / -4sh / -4tr (shake up to the next hole)
  m = /^([-+]?)(10|[1-9])(['b]*)\/[-+]?(10|[1-9])$/.exec(w);
  if (m && Math.abs(m[2] - m[4]) === 1) {
    const base = single(`${m[1]}${m[2]}${m[3]}`, notation);
    return base ? `${base}/${m[4]}` : null;
  }
  m = /^(.*?)(~|sh|tr|\*sh)$/i.exec(w);
  if (m && m[1] && /\d/.test(m[1])) {
    const base = single(m[1], notation);
    const hole = base && Number(/\d+/.exec(base)[0]);
    return base && hole < 10 && !base.includes("↑") ? `${base}/${hole + 1}` : null;
  }
  // Chords written as one word: -123, 123, 1+2+3, -4-5-6, 4/5/6
  m = /^(-?)((?:[1-9][+/-]?){2,}[1-9]?)$/.exec(w);
  if (m && !/^-?10$/.test(w) && (m[2].length >= 2)) {
    const digits = m[2].match(/[1-9]/g);
    const draw = m[1] === "-" || /-\d/.test(m[2]);
    const consecutive = digits.every((d, i) => i === 0 || Number(d) === Number(digits[i - 1]) + 1);
    if (digits.length >= 2 && consecutive) return chord(digits, draw);
  }
  return single(w, notation);
}

function valid(token) {
  try {
    if (token.includes("/")) {
      const [a, b] = token.split("/");
      parseToken(a, C);
      parseToken(`${a.startsWith("-") ? "-" : ""}${b}`, C);
      return true;
    }
    parseToken(token, C);
    return true;
  } catch {
    return false;
  }
}

function shake(holes, draw) {
  const [a, b] = holes.map(Number).sort((x, y) => x - y);
  const token = `${draw ? "-" : ""}${a}/${b}`;
  return valid(token) ? token : null;
}

function chord(holes, draw) {
  if (holes.length > 5 || holes.filter((h) => h !== "_").length > 4) return null; // more than a mouthful
  const token = `${draw ? "-" : ""}(${holes.join(" ")})`;
  return valid(token) ? token : null;
}

/** A single note in any notation -> arrow token, or null. */
function single(word, notation) {
  let w = word;
  let draw = false;
  let over = false;
  if (notation === "suffix") {
    let m = /^[dD](10|[1-9])(.*)$/.exec(w);
    if (m) w = `${m[1]}d${m[2]}`;
    m = /^[bB](10|[1-9])(.*)$/.exec(w);
    if (m) w = `${m[1]}${m[2]}`;
  }
  if (notation === "arrows") {
    const m = /^([↓↑])(10|[1-9])(.*)$/.exec(w);
    if (!m) return null;
    draw = m[1] === "↓";
    w = m[2] + m[3];
  }
  let m = /^([-+]?)(10|[1-9])(.*)$/.exec(w);
  if (!m) return null;
  if (m[1] === "-") draw = true;
  const hole = m[2];
  let rest = m[3];
  if (notation === "plus") {
    draw = !rest.includes("+") && m[1] !== "+";
    rest = rest.replace("+", "");
  }
  if (notation === "suffix" && /^[dD]/.test(rest)) {
    draw = true;
    rest = rest.slice(1);
  } else if (notation === "suffix" && /^[bB]$/.test(rest)) {
    rest = ""; // 4b = blow 4 in d/b tabs
  }
  // Overbends: o, ob, od, °, ↑ (in minus notation)
  const ob = /^(?:o[bd]?|°|↑)$/i.exec(rest) ?? /^(?:ob|od|o)(?=$)/i.exec(rest);
  if (ob) {
    over = true;
    if (/od/i.test(ob[0])) draw = true;
    rest = "";
  }
  // Bends: ' per semitone, b per semitone, b2 / '2 = 2, ↓ (ours), ^
  let bend = 0;
  const num = /^(?:b|')(\d)$/i.exec(rest);
  if (num) {
    bend = Number(num[1]);
    rest = "";
  } else {
    const marks = /^(?:['b^]|↓)*$/i.exec(rest);
    if (!marks) return null;
    bend = (rest.match(/['b^↓]/gi) ?? []).length;
    if (/^\^+$/.test(rest)) bend = rest.length; // ^ is sometimes a bend mark
  }
  const token = `${draw ? "-" : ""}${hole}${"↓".repeat(bend)}${over ? "↑" : ""}`;
  return valid(token) ? token : null;
}

/** Words that are clearly not notes: repeat marks, chord names, section labels. */
const NOT_TAB = /^(x\d+|\d+x|\(x\d+\)|[A-G][#b]?(m|maj|min|7|9|13|dim|sus)*\d*:?|intro:?|verse:?|chorus:?|solo:?|riff:?|repeat:?|end:?)$/i;

/**
 * Convert pasted tab text.
 * @returns {{ notation: string, lines: { text: string, tokens: string[], skipped: string[] }[],
 *            tokens: string[], warnings: string[] }}
 *   Lines where under half the words are notes count as text (lyrics, titles) and are left out.
 */
export function importTab(text, { notation } = {}) {
  const src = normalize(text);
  notation ??= detectNotation(src);
  const lines = [];
  const warnings = [];
  let repeats = false;
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Split into words, keeping bracketed chords together and "~" glides on their note.
    const words = line.match(/-?[([{][^)\]}]*[)\]}]['b]*|[^\s|,]+/g) ?? [];
    const tokens = [];
    const skipped = [];
    for (const word of words) {
      if (/^x\d+$|^\d+x$|^\(x\d+\)$/i.test(word)) repeats = true;
      // "-3'~-3" or "-3'>-3": a slide inside one word
      const parts = word.split(/(?<=\S)[~>](?=[-+(]?\d)/);
      const read = parts.map((p) => readWord(p, notation));
      if (read.every(Boolean)) tokens.push(...read.map((t, i) => (i > 0 ? `~${t}` : t)));
      else if (!NOT_TAB.test(word)) skipped.push(word);
    }
    const isTab = tokens.length > 0 && tokens.length >= skipped.length;
    if (isTab) lines.push({ text: raw, tokens, skipped });
  }
  const unread = lines.flatMap((l) => l.skipped);
  if (unread.length) warnings.push(`Couldn't read ${unread.length} item${unread.length === 1 ? "" : "s"}: ${[...new Set(unread)].slice(0, 8).join(" ")}`);
  if (repeats) warnings.push("Repeat marks (x2 …) were not expanded — copy the part again if you want it repeated.");
  if (notation !== "minus") warnings.push(`Read as ${{ plus: "4 = draw, 4+ = blow", parens: "(4) = draw", suffix: "4d = draw", arrows: "↓4 = draw, ↑4 = blow" }[notation]} notation.`);
  return { notation, lines, tokens: lines.flatMap((l) => l.tokens), warnings };
}
