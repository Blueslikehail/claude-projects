// Renders lessons with recorded instrument samples (FluidR3_GM, CC BY 3.0 — see
// samples/CREDITS.md) using an OfflineAudioContext. Drums stay synthesized.
import { planVoices, renderDrums } from "./core/index.js";

const RATE = 32000;
let loading = null;

/** Load and decode all samples once; resolves to { instrument: Map(midi -> AudioBuffer) }. */
export function loadSamples() {
  loading ??= (async () => {
    const base = new URL("./samples/", import.meta.url);
    const manifest = await (await fetch(new URL("manifest.json", base))).json();
    const decoder = new OfflineAudioContext(1, 1, RATE);
    const out = {};
    await Promise.all(
      Object.entries(manifest).map(async ([inst, notes]) => {
        out[inst] = new Map();
        await Promise.all(
          notes.map(async (midi) => {
            const res = await fetch(new URL(`${inst}/${midi}.mp3`, base));
            if (!res.ok) throw new Error(`sample ${inst}/${midi} missing`);
            out[inst].set(midi, await decoder.decodeAudioData(await res.arrayBuffer()));
          }),
        );
      }),
    );
    return out;
  })();
  loading.catch(() => (loading = null)); // allow a retry
  return loading;
}

/** Schedule one instrument's notes into the context. */
function schedule(ctx, dest, notes, buffers, { gain = 0.8, attack = 0.008, release = 0.06 } = {}) {
  const available = [...buffers.keys()];
  for (const v of planVoices(notes, available)) {
    const buffer = buffers.get(v.sample);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const length = v.stop - v.start;
    // Sustain long notes by looping the steady middle of the sample.
    if (length * v.rates[0].rate > buffer.duration * 0.9) {
      src.loop = true;
      src.loopStart = buffer.duration * 0.45;
      src.loopEnd = buffer.duration * 0.9;
    }
    const rate = src.playbackRate;
    rate.setValueAtTime(v.rates[0].rate, v.start);
    let current = v.rates[0].rate;
    for (const step of v.rates.slice(1)) {
      rate.setValueAtTime(current, step.time);
      rate.linearRampToValueAtTime(step.rate, step.time + step.glide);
      current = step.rate;
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, v.start);
    env.gain.linearRampToValueAtTime(gain, v.start + attack);
    env.gain.setValueAtTime(gain, Math.max(v.start + attack, v.stop));
    env.gain.linearRampToValueAtTime(0, v.stop + release);
    src.connect(env).connect(dest);
    src.start(v.start);
    src.stop(v.stop + release + 0.02);
  }
}

/**
 * Render a lesson with samples. Returns mono Float32Array samples at RATE, unnormalized
 * (use normalizeTogether on the mixes you'll switch between).
 * @param {{ harp?: boolean, backing?: boolean }} parts
 */
export async function renderLessonSampled(lesson, samples, { harp = true, backing = true, sampleRate = RATE, duration } = {}) {
  const rate = sampleRate;
  const length = Math.ceil((duration ?? lesson.duration + 2) * rate);
  const ctx = new OfflineAudioContext(1, length, rate);
  const master = ctx.createGain();
  master.connect(ctx.destination);
  if (backing) {
    schedule(ctx, master, lesson.backing.bass, samples.bass, { gain: 0.9 });
    schedule(ctx, master, lesson.backing.comp, samples.piano, { gain: 0.28, release: 0.08 });
    schedule(ctx, master, lesson.backing.pads ?? [], samples.organ, { gain: 0.16, attack: 0.08, release: 0.2 });
    const drums = new Float32Array(length);
    renderDrums(lesson.backing.drums, drums, rate, { gain: 0.35 });
    const buf = ctx.createBuffer(1, length, rate);
    buf.copyToChannel(drums, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start(0);
  }
  if (harp) schedule(ctx, master, lesson.events, samples.harmonica, { gain: 0.85 });
  return (await ctx.startRendering()).getChannelData(0);
}

/** Scale mixes by one shared gain so the loudest peaks at `target` (switching mixes keeps the level). */
export function normalizeTogether(mixes, target = 0.9) {
  let peak = 0;
  for (const mix of mixes) for (const x of mix) peak = Math.max(peak, Math.abs(x));
  if (peak > 0) for (const mix of mixes) for (let i = 0; i < mix.length; i++) mix[i] *= target / peak;
  return mixes;
}

export const SAMPLE_RATE = RATE;
