// Plans sample playback for notes: which recorded sample each note uses, how fast to
// play it (pitch shift), and how slides bend the same sound instead of starting a new one.
// Pure data, so it can be tested in Node; web/sampler.js turns plans into Web Audio.

/** The recorded sample nearest to a pitch (ties go to the lower one). */
export function nearestSample(midi, available) {
  let best = available[0];
  for (const s of available) if (Math.abs(s - midi) < Math.abs(best - midi)) best = s;
  return best;
}

/** Playback rate that turns a sample into a pitch. */
export const rateFor = (midi, sample) => 2 ** ((midi - sample) / 12);

/**
 * @param {{time:number, duration:number, pitches:number[], glide?:boolean}[]} notes
 * @param {number[]} available  sample pitches
 * @returns {{ sample:number, start:number, stop:number, rates:{time:number, rate:number, glide:number}[] }[]}
 *   rates[0] is the starting rate; later entries ramp to `rate` over `glide` seconds.
 */
export function planVoices(notes, available, { glideTime = 0.12 } = {}) {
  const voices = [];
  let last = null; // the voice a slide would continue
  for (const note of notes) {
    if (note.glide && last && note.pitches.length === 1) {
      last.rates.push({ time: note.time, rate: rateFor(note.pitches[0], last.sample), glide: glideTime });
      last.stop = Math.max(last.stop, note.time + note.duration);
      continue;
    }
    const started = note.pitches.map((midi) => {
      const sample = nearestSample(midi, available);
      const voice = { sample, start: note.time, stop: note.time + note.duration, rates: [{ time: note.time, rate: rateFor(midi, sample), glide: 0 }] };
      voices.push(voice);
      return voice;
    });
    last = started.length === 1 ? started[0] : null;
  }
  return voices;
}
