// Command-line front end to the core library, for trying things before the web app exists.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  chordShapesForChord,
  createHarp,
  decodeWav,
  encodeWav,
  formatHarpTab,
  harpKeyName,
  HARP_KEYS,
  identifyChord,
  mapToHarp,
  noteName,
  parseChord,
  parseHarpTab,
  parseNote,
  pitchClassName,
  positionOf,
  renderNotes,
  suggestHarps,
  transcribe,
} from "./core/index.js";

export const USAGE = `harp-guitar-tab — harmonica tab tools

  layout   [--harp C]                    show every note on a harp
  tab      [--harp C] <notes...>         notes -> tab   (chord: C4+E4+G4)
  suggest  [--song E] [--octaves] <notes...>   best harp keys for a riff
  chord    <name> [--harp C]             where a chord lives on a harp (or which harps have it)
  name     <notes...>                    name the chord these notes make
  parse    [--harp C] "<tab>"            tab -> notes
  transcribe <file.wav> [--harp A | --song E] [--notes]   recording -> tab
  render   [--harp C] [--bpm 100] "<tab>" <out.wav>       tab -> audio

Tab: 4 blow, -4 draw, -3↓ bend (one arrow = one semitone), 6↑ overblow, -(1 2 3) chord,
     -3~-3↓↓ slide into a bend on the same hole.
Example: npm start -- tab --harp A E4 G4 A4 Bb4 B4 D5 E5`;

const BOOLEAN_FLAGS = ["--octaves", "--notes"];

function parseArgs(argv) {
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (BOOLEAN_FLAGS.includes(arg)) opts[arg.slice(2)] = true;
    else if (arg.startsWith("--")) opts[arg.slice(2)] = argv[++i];
    else rest.push(arg);
  }
  return { opts, rest };
}

const toEvents = (args) => args.map((a) => ({ pitches: a.split("+").map(parseNote) }));

function layout(harp) {
  const pad = (s) => String(s).padEnd(5);
  const row = (label, cell) =>
    pad(label).padEnd(8) + harp.holes.map((h) => pad(cell(h.hole) ?? "")).join("").trimEnd();
  const find = (hole, pred) => {
    const a = harp.actions.find((x) => x.hole === hole && pred(x));
    return a && noteName(a.midi);
  };
  return [
    `${harp.key} harp, Richter tuning`,
    row("over", (h) => find(h, (a) => a.over)),
    row("blow↓↓", (h) => find(h, (a) => a.breath === "blow" && a.bend === 2)),
    row("blow↓", (h) => find(h, (a) => a.breath === "blow" && a.bend === 1)),
    row("blow", (h) => find(h, (a) => a.breath === "blow" && !a.bend && !a.over)),
    row("hole", (h) => h),
    row("draw", (h) => find(h, (a) => a.breath === "draw" && !a.bend && !a.over)),
    row("draw↓", (h) => find(h, (a) => a.breath === "draw" && a.bend === 1)),
    row("draw↓↓", (h) => find(h, (a) => a.breath === "draw" && a.bend === 2)),
    row("draw↓↓↓", (h) => find(h, (a) => a.breath === "draw" && a.bend === 3)),
  ].join("\n");
}

/** Run a command; returns the text to print. Throws on bad input. */
export function run(argv) {
  const [command, ...args] = argv;
  const { opts, rest } = parseArgs(args);
  const harp = createHarp(opts.harp ?? "C");

  switch (command) {
    case "layout":
      return layout(harp);

    case "tab":
      return formatHarpTab(mapToHarp(toEvents(rest), harp).events);

    case "suggest": {
      const songKey = opts.song && harpKeyName(opts.song);
      const octaveShifts = opts.octaves ? [-2, -1, 0, 1, 2] : [0];
      return suggestHarps(toEvents(rest), { songKey, octaveShifts })
        .map((s) => {
          const where = [
            s.position && `position ${s.position}`,
            s.octaves && `octaves ${s.octaves > 0 ? "+" : ""}${s.octaves}`,
            s.unplayable && `${s.unplayable} unplayable`,
          ].filter(Boolean);
          return `${s.key.padEnd(3)} ${where.join(", ").padEnd(28)} ${s.tokens.join(" ")}`;
        })
        .join("\n");
    }

    case "chord": {
      const chord = parseChord(rest[0]);
      if (opts.harp) {
        const shapes = chordShapesForChord(harp, chord);
        return shapes.length
          ? shapes.map((s) => `${s.token.padEnd(16)} ${s.midis.map(noteName).join(" ")}`).join("\n")
          : `${chord.name} is not playable on a ${harp.key} harp`;
      }
      return HARP_KEYS.map((key) => {
        const shapes = chordShapesForChord(createHarp(key), chord);
        if (!shapes.length) return null;
        const position = positionOf(key, pitchClassName(chord.root));
        return `${key.padEnd(3)} (position ${String(position).padEnd(2)} in ${pitchClassName(chord.root)}) ${shapes
          .map((s) => s.token)
          .join("  ")}`;
      })
        .filter(Boolean)
        .join("\n");
    }

    case "name":
      return identifyChord(rest.map(parseNote))
        .map((c) => `${c.name.padEnd(6)} ${(c.score * 100).toFixed(0)}%`)
        .join("\n");

    case "parse":
      return parseHarpTab(rest.join(" "), harp)
        .map((e) => `${e.token.padEnd(12)} ${e.pitches.map(noteName).join(" ")}`)
        .join("\n");

    case "transcribe": {
      const { sampleRate, samples } = decodeWav(readFileSync(rest[0]));
      const { notes, tuningCents } = transcribe(samples, sampleRate);
      if (notes.length === 0) return "No notes found.";
      const lines = [];
      let target = harp;
      if (!opts.harp) {
        const songKey = opts.song && harpKeyName(opts.song);
        const [best] = suggestHarps(notes, { songKey });
        target = createHarp(best.key);
        lines.push(`Harp: ${best.key}${best.position ? ` (position ${best.position})` : ""}`);
      }
      if (Math.abs(tuningCents) >= 10) lines.push(`Recording is ${tuningCents} cents off A440.`);
      const mapped = mapToHarp(notes, target).events;
      if (opts.notes) {
        for (const e of mapped) {
          const heard = e.pitches.map(noteName).join(" ");
          lines.push(`${e.time.toFixed(2).padStart(7)}s  ${heard.padEnd(4)} ${e.token}${e.chord ? `  (${e.chord})` : ""}`);
        }
      } else {
        lines.push(formatHarpTab(mapped));
      }
      return lines.join("\n");
    }

    case "render": {
      const [tab, out] = rest;
      if (!out) throw new Error("usage: render [--harp C] [--bpm 100] \"<tab>\" <out.wav>");
      const beat = 60 / Number(opts.bpm ?? 100);
      const sampleRate = 22050;
      let time = 0;
      const notes = parseHarpTab(tab, harp).map((e) => {
        const note = { ...e, time, duration: beat };
        time += beat;
        return note;
      });
      writeFileSync(out, encodeWav(renderNotes(notes, { sampleRate }), sampleRate));
      return `Wrote ${out} (${notes.length} notes, ${time.toFixed(1)}s)`;
    }

    default:
      return USAGE;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
