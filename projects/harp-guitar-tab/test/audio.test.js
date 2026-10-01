import { test } from "node:test";
import assert from "node:assert/strict";
import { yin } from "../src/core/audio/yin.js";
import { estimateTuning } from "../src/core/audio/segment.js";
import { transcribe } from "../src/core/audio/transcribe.js";
import { renderNotes } from "../src/core/audio/synth.js";
import { decodeWav, encodeWav } from "../src/core/audio/wav.js";
import { createHarp } from "../src/core/harmonica.js";
import { mapToHarp } from "../src/core/harpMapper.js";
import { formatHarpTab, parseHarpTab } from "../src/core/tab.js";
import { parseNote } from "../src/core/pitch.js";

const SR = 22050;

const sine = (freq, seconds, harmonics = [1]) =>
  Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) =>
    harmonics.reduce((x, h, k) => x + h * Math.sin((2 * Math.PI * freq * (k + 1) * i) / SR), 0),
  );

/** Space notes out: "C4 E4" -> events of `dur` seconds with `gap` silence between. */
const seq = (names, { dur = 0.25, gap = 0.05, ...extra } = {}) =>
  names.split(" ").map((n, i) => ({ time: 0.05 + i * (dur + gap), duration: dur, pitches: [parseNote(n)], ...extra }));

/** Play a tab back to back, one note per `beat` seconds ("~" notes slide in). */
function renderTab(tab, harp, { beat = 0.25, ...opts } = {}) {
  const notes = parseHarpTab(tab, harp).map((e, i) => ({ ...e, time: 0.05 + i * beat, duration: beat }));
  return renderNotes(notes, { sampleRate: SR, ...opts });
}

const tabOf = (samples, harp) => formatHarpTab(mapToHarp(transcribe(samples, SR).notes, harp).events);

test("yin finds the pitch of a sine", () => {
  const { freq, clarity } = yin(sine(440, 0.04), SR);
  assert.ok(Math.abs(freq - 440) < 0.5, `got ${freq}`);
  assert.ok(clarity > 0.9);
});

test("yin is not fooled by a weak fundamental (no octave error)", () => {
  const { freq } = yin(sine(110, 0.04, [0.3, 1, 0.8, 0.5]), SR);
  assert.ok(Math.abs(freq - 110) < 1, `got ${freq}`);
});

test("yin returns null for silence and noise", () => {
  assert.equal(yin(new Float32Array(882), SR), null);
  let seed = 1;
  const noise = Float32Array.from({ length: 882 }, () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
  assert.equal(yin(noise, SR), null);
});

test("estimateTuning handles offsets and wrap-around", () => {
  assert.ok(Math.abs(estimateTuning([60.2, 64.2, 67.2]) - 0.2) < 1e-9);
  assert.ok(Math.abs(estimateTuning([60.1, 61.9]) - 0) < 1e-9);
  assert.ok(Math.abs(Math.abs(estimateTuning([60.49, 61.51])) - 0.5) < 0.02);
});

test("separate notes: pitches, onsets and attacks", () => {
  const input = seq("C4 E4 G4 C5");
  const { notes } = transcribe(renderNotes(input, { sampleRate: SR }), SR);
  assert.deepEqual(notes.map((n) => n.pitches[0]), [60, 64, 67, 72]);
  notes.forEach((n, i) => {
    assert.ok(Math.abs(n.time - input[i].time) < 0.04, `onset ${n.time} vs ${input[i].time}`);
    assert.ok(Math.abs(n.duration - 0.25) < 0.06, `duration ${n.duration}`);
    assert.equal(n.connected, false);
  });
});

test("repeated notes without silence are split at the volume dip", () => {
  const { notes } = transcribe(renderNotes(seq("D5 D5 D5", { gap: 0 }), { sampleRate: SR }), SR);
  assert.deepEqual(notes.map((n) => n.pitches[0]), [74, 74, 74]);
});

test("legato and glides are told apart", () => {
  const legato = seq("G4 A4 B4", { gap: 0, connected: true });
  const legatoNotes = transcribe(renderNotes(legato, { sampleRate: SR }), SR).notes;
  assert.deepEqual(legatoNotes.map((n) => [n.pitches[0], n.connected, n.glide]), [
    [67, false, false],
    [69, true, false],
    [71, true, false],
  ]);

  const c = createHarp("C");
  const bend = transcribe(renderTab("-3 -3~-3↓↓ 4", c), SR).notes;
  assert.deepEqual(bend.map((n) => [n.pitches[0], n.glide]), [
    [71, false],
    [71, false],
    [69, true],
    [72, false],
  ]);
});

test("a detuned recording is corrected and reported", () => {
  const { notes, tuningCents } = transcribe(renderNotes(seq("A4 C5 E5"), { sampleRate: SR, a4: 446 }), SR);
  assert.deepEqual(notes.map((n) => n.pitches[0]), [69, 72, 76]);
  assert.ok(Math.abs(tuningCents - 24) <= 3, `tuning ${tuningCents}`);
});

test("noise and vibrato do not change the notes", () => {
  const a = createHarp("A");
  const tab = "-2 -3↓ 4 -4↓ -4 -5 6 -6 6";
  assert.equal(tabOf(renderTab(tab, a, { noise: 0.05, vibrato: 0.25 }), a), tab);
});

test("silence gives no notes", () => {
  assert.deepEqual(transcribe(new Float32Array(SR), SR).notes, []);
});

test("round trip: tab -> audio -> tab, including bends, overblows and a low harp", () => {
  for (const [key, tab] of [
    ["C", "4 -4 5 -5 6 -6 6 -5 5 -4 4 -3 -3~-3↓↓ 4 4 4"],
    ["G", "1 -1 2 -2↓↓ -2 -3↓↓↓ -3 4"],
    ["D", "-4 4↑ 5 -5 6 6↑ -6 -7↑ 8↓ 10↓↓"],
  ]) {
    const harp = createHarp(key);
    assert.equal(tabOf(renderTab(tab, harp), harp), tab, `${key} harp`);
  }
});

test("44.1/48 kHz input is decimated for analysis with the same result", () => {
  const harp = createHarp("A");
  const tab = "-2 -3↓ 4 -4↓ -4 -5 6 6↑";
  const notes = parseHarpTab(tab, harp).map((e, i) => ({ ...e, time: 0.05 + i * 0.25, duration: 0.25 }));
  const samples = renderNotes(notes, { sampleRate: 48000 });
  const out = transcribe(samples, 48000);
  assert.equal(formatHarpTab(mapToHarp(out.notes, harp).events), tab);
  assert.ok(Math.abs(out.notes[1].time - 0.3) < 0.04);
});

test("a glide keeps the mapper on the same hole and breath", () => {
  const events = ["C5", "G4", "F#4", "C5"].map((n) => ({ pitches: [parseNote(n)] }));
  events[2].glide = true;
  const tokens = mapToHarp(events, createHarp("C")).events.map((e) => e.token);
  assert.deepEqual(tokens, ["4", "-2", "-2↓", "4"]);
});

test("WAV encode/decode round trip", () => {
  const samples = sine(220, 0.05).map((x) => x * 0.5);
  const back = decodeWav(encodeWav(samples, SR));
  assert.equal(back.sampleRate, SR);
  assert.equal(back.samples.length, samples.length);
  assert.ok(back.samples.every((x, i) => Math.abs(x - samples[i]) < 1e-4));
});

test("WAV decode: 24-bit stereo is mixed to mono", () => {
  const bytes = new Uint8Array(44 + 6);
  const view = new DataView(bytes.buffer);
  const put = (at, s) => [...s].forEach((ch, i) => (bytes[at + i] = ch.charCodeAt(0)));
  put(0, "RIFF");
  view.setUint32(4, 42, true);
  put(8, "WAVE");
  put(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, 48000, true);
  view.setUint16(34, 24, true);
  put(36, "data");
  view.setUint32(40, 6, true);
  bytes.set([0x00, 0x00, 0x40, 0x00, 0x00, 0xc0], 44); // left +0.5, right -0.5
  const { samples, channels, sampleRate } = decodeWav(bytes);
  assert.equal(channels, 2);
  assert.equal(sampleRate, 48000);
  assert.deepEqual([...samples], [0]);
  assert.throws(() => decodeWav(new Uint8Array(20)), /Not a WAV/);
});
