// Songs to practise with: classic blues harmonica recordings, described by facts only
// (key, harp, position, feel) — no recordings or transcriptions are included.
//
// Every key/harp/position comes from the sources listed with it (searched Oct 2026):
//   documented — independent sources agree
//   reported   — one source, or one site, says so
//   partial    — the harp is sourced; the position (and so the key) is assumed
//   disputed   — sources disagree; the most-cited version is given
// `feel`, `tempo` and `form` are rough descriptions for matching, not measurements.

import { harpKeyName, positionOf } from "./harmonica.js";
import { parsePitchClass } from "./pitch.js";
import { STYLES } from "./lesson/styles.js";

export const SONGS = [
  {
    id: "juke", artist: "Little Walter", title: "Juke",
    songKey: "E", harpKey: "A", position: 2, feel: "shuffle", tempo: "fast", form: "12-bar", instrumental: true,
    confidence: "documented",
    sources: ["https://en.wikipedia.org/wiki/Juke_(instrumental)", "https://www.last.fm/music/Little+Walter/_/Juke/+wiki", "https://harmonica.com/best-of-little-walter"],
  },
  {
    id: "off-the-wall", artist: "Little Walter", title: "Off the Wall",
    songKey: "G", harpKey: "C", position: 2, feel: "shuffle", tempo: "medium", form: "12-bar", instrumental: true,
    confidence: "documented",
    sources: ["https://www.harmonica.com/best-of-little-walter/", "https://jt30.com/blues/playwall.html"],
  },
  {
    id: "my-babe", artist: "Little Walter", title: "My Babe",
    songKey: "F", harpKey: "Bb", position: 2, feel: "groove", tempo: "medium", form: "16-bar",
    confidence: "reported", note: "Some courses teach it on a C harp.",
    sources: ["https://www.harmonica.com/best-of-little-walter/", "https://www.learntheharmonica.com/post/my-babe-by-little-walter-free-harmonica-lesson-and-tabs", "https://www.udemy.com/course/learn-classic-16-bar-harmonica-blues-my-babe-little-walter/"],
  },
  {
    id: "blues-with-a-feeling", artist: "Little Walter", title: "Blues with a Feeling",
    songKey: "A", harpKey: "D", position: 2, feel: "slow", tempo: "slow", form: "12-bar",
    confidence: "reported", note: "Paul Butterfield's cover is in G (C harp).",
    sources: ["https://www.harmonica.com/best-of-little-walter/", "https://harmonicalessons.com/cdskeyed/cds_bmasters4.html"],
  },
  {
    id: "help-me", artist: "Sonny Boy Williamson II", title: "Help Me",
    songKey: "F", harpKey: "Bb", position: 2, feel: "groove", tempo: "medium", form: "minor groove",
    confidence: "disputed", note: "Most cited as F on a Bb harp; also taught on C (G) or A (E minor).",
    sources: ["https://mpurintun.powweb.com/lists/blues_song_keys.htm", "https://www.matrixonline.net/videos/1205/2789/play-the-bassline-a-fresh-approach-to-help-me-baby-green-onions", "https://www.modernbluesharmonica.com/board/board_topic/5560960/936063.htm"],
  },
  {
    id: "bye-bye-bird", artist: "Sonny Boy Williamson II", title: "Bye Bye Bird",
    songKey: "G", harpKey: "C", position: 2, feel: "groove", tempo: "medium", form: "riff",
    confidence: "reported", note: "Studio version on a low C harp (an octave lower); live versions on a low D.",
    sources: ["https://www.learntheharmonica.com/free-sonny-boy-williamson-tabs/bye-bye-bird", "https://www.modernbluesharmonica.com/board/board_topic/5560960/936063.htm", "https://en.wikipedia.org/wiki/Bye_Bye_Bird"],
  },
  {
    id: "baby-scratch-my-back", artist: "Slim Harpo", title: "Baby Scratch My Back",
    songKey: "F", harpKey: "Bb", position: 2, feel: "groove", tempo: "medium", form: "riff",
    confidence: "reported",
    sources: ["https://sonicjunction.com/lessons/baby-scratch-my-back-intro-breakdown", "https://en.wikipedia.org/wiki/Baby_Scratch_My_Back"],
  },
  {
    id: "hoochie-coochie-man", artist: "Muddy Waters (harp: Little Walter)", title: "Hoochie Coochie Man",
    songKey: "A", harpKey: "A", position: 1, feel: "stop-time", tempo: "medium", form: "16-bar",
    confidence: "reported", note: "Original in 1st position; many players use a D harp in 2nd.",
    sources: ["https://www.sonicjunction.com/lessons/hoochie-coochie-man-song", "https://en.wikipedia.org/wiki/Hoochie_Coochie_Man"],
  },
  {
    id: "got-my-mojo-working", artist: "Muddy Waters (harp: James Cotton, Newport 1960)", title: "Got My Mojo Working",
    songKey: "E", harpKey: "A", position: 2, feel: "shuffle", tempo: "fast", form: "12-bar",
    confidence: "partial", note: "Listed for an A harp; the position is assumed to be 2nd.",
    sources: ["https://www.learntheharmonica.com/post/harmonica-in-a-songs", "https://en.wikipedia.org/wiki/Got_My_Mojo_Working"],
  },
  {
    id: "born-in-chicago", artist: "Paul Butterfield Blues Band", title: "Born in Chicago",
    songKey: "A", harpKey: "D", position: 2, feel: "rock", tempo: "fast", form: "12-bar",
    confidence: "reported",
    sources: ["https://www.harmonica.com/born-in-chicago/"],
  },
  {
    id: "hoodoo-man-blues", artist: "Junior Wells", title: "Hoodoo Man Blues",
    songKey: "A", harpKey: "D", position: 2, feel: "groove", tempo: "medium", form: "12-bar",
    confidence: "reported", note: "Most of the album is on a D harp in 2nd position.",
    sources: ["https://www.harmonica.com/hoodoo-man/", "https://www.harmonica.com/junior-wells-hoo-doo/"],
  },
  {
    id: "bright-lights-big-city", artist: "Jimmy Reed", title: "Bright Lights, Big City",
    songKey: "A", harpKey: "A", position: 1, feel: "shuffle", tempo: "slow", form: "12-bar",
    confidence: "disputed", note: "1st position, high on the harp; some say the record is in Ab.",
    sources: ["https://www.learntheharmonica.com/post/blues-harmonica-songs-key-of-a", "https://www.modernbluesharmonica.com/board/board_topic/5560960/5395263.htm"],
  },
  {
    id: "on-the-road-again", artist: "Canned Heat", title: "On the Road Again",
    songKey: "E", harpKey: "A", position: 2, feel: "boogie", tempo: "medium", form: "riff",
    confidence: "partial", note: "A harp; Al Wilson's harp was retuned, so one note can't be matched on a stock harp.",
    sources: ["https://www.learntheharmonica.com/post/on-the-road-again-harmonica-lesson", "https://www.harpsurgery.com/?p=22", "https://www.hunterharp.com/on-the-road-again-with-the-rp355/"],
  },
  {
    id: "whammer-jammer", artist: "The J. Geils Band", title: "Whammer Jammer",
    songKey: "E", harpKey: "A", position: 2, feel: "rock", tempo: "fast", form: "12-bar", instrumental: true,
    confidence: "reported", note: "The opening was inspired by Sonny Boy Williamson's Bye Bye Bird.",
    sources: ["https://harmonica.com/rock-harmonica", "https://www.harpsurgery.com/tag/blow-bends"],
  },
  {
    id: "run-around", artist: "Blues Traveler", title: "Run-Around",
    songKey: "G", harpKey: "C", position: 2, feel: "rock", tempo: "medium", form: "song",
    confidence: "reported",
    sources: ["https://harmonicalessons.com/cdskeyed/cds_btraveler_4.html"],
  },
];

const CONFIDENCE_PENALTY = { documented: 0, reported: 0.2, partial: 0.5, disputed: 0.7 };

/** Tempo in bpm -> the rough category used in the catalog. */
export function tempoCategory(bpm) {
  return bpm < 75 ? "slow" : bpm < 115 ? "medium" : "fast";
}

/**
 * Rank songs for a lesson (or any practice setting).
 * @param {{ harpKey: string, position?: number, tempo?: number, feel?: string|string[], form?: string }} session
 * @returns {{ song, score, reasons: string[], sameHarp: boolean }[]}
 */
export function suggestSongs(session, { limit = 5 } = {}) {
  const harp = harpKeyName(session.harpKey);
  const position = session.position ?? 2;
  const tempo = session.tempo ? tempoCategory(session.tempo) : null;
  const feels = [].concat(session.feel ?? "shuffle");
  const form = session.form ?? "12-bar";
  return SONGS.map((song) => {
    const reasons = [];
    let score = 0;
    const sameHarp = harpKeyName(song.harpKey) === harp;
    if (song.position === position) {
      if (sameHarp) {
        score += 5;
        reasons.push(`same ${harp} harp in ${ordinal(position)} position — play along in the record's key`);
      } else {
        score += 2;
        reasons.push(`also ${ordinal(position)} position (needs ${article(song.harpKey)} ${song.harpKey} harp)`);
      }
    } else if (sameHarp) {
      score += 1.5;
      reasons.push(`same ${harp} harp, but in ${ordinal(song.position)} position`);
    }
    // Feel weighs more than the harp alone: a slow blues lesson should suggest slow blues.
    if (feels.includes(song.feel)) {
      score += 2.5;
      reasons.push(`${song.feel} feel`);
    }
    if (tempo && song.tempo === tempo) {
      score += 1;
      reasons.push(`${tempo} tempo`);
    }
    if (song.form === form) {
      score += form === "12-bar" ? 0.5 : 2; // a distinctive form (minor groove, 16-bar) is a strong match
      reasons.push(form);
    }
    score -= CONFIDENCE_PENALTY[song.confidence];
    return { song, score, reasons, sameHarp };
  })
    .sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title))
    .slice(0, limit);
}

/** Which lesson style fits a song best. */
export function styleFor(song) {
  if (song.position === 1) return "reed";
  if (song.form === "minor groove") return "minor";
  return { slow: "slow", boogie: "boogie", rock: "boogie", groove: "swamp" }[song.feel] ?? "shuffle";
}

/** Lesson settings to practise for a song: its key, a fitting style and tempo. */
export function lessonOptionsFor(song) {
  const style = styleFor(song);
  const { min, max } = STYLES[style].tempo;
  const wanted = { slow: 65, medium: 90, fast: 130 }[song.tempo];
  return {
    songKey: song.songKey,
    style,
    tempo: Math.round(Math.min(max, Math.max(min, wanted)) / 5) * 5, // multiples of 5, like the tempo slider
  };
}

/** Where to listen: search links, nothing hosted. */
export function listenLinks(song) {
  const q = encodeURIComponent(`${song.artist.replace(/\s*\(.*\)/, "")} ${song.title}`);
  return {
    youtube: `https://www.youtube.com/results?search_query=${q}`,
    spotify: `https://open.spotify.com/search/${q}`,
  };
}

/** Catalog self-check: harp + position must give the song key. */
export function songConsistent(song) {
  return positionOf(song.harpKey, song.songKey) === song.position && parsePitchClass(song.songKey) >= 0;
}

/** "an A harp", "a C harp". */
export function article(key) {
  return /^[AEF]/.test(key) ? "an" : "a";
}

function ordinal(n) {
  return `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th"}`;
}
