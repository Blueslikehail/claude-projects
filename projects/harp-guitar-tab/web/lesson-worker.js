// Generates a lesson off the main thread. With `synth`, also renders its audio (with and
// without the harp) using the built-in synthesizer; otherwise the page renders it with
// recorded samples (sampler.js).
import { encodeWav, generateLesson, renderLesson } from "./core/index.js";

const SAMPLE_RATE = 32000;

self.onmessage = ({ data: { options, synth } }) => {
  try {
    const lesson = generateLesson(options);
    if (!synth) {
      self.postMessage({ lesson });
      return;
    }
    const full = encodeWav(renderLesson(lesson, { sampleRate: SAMPLE_RATE }), SAMPLE_RATE);
    const backing = encodeWav(renderLesson(lesson, { sampleRate: SAMPLE_RATE, harp: false }), SAMPLE_RATE);
    self.postMessage({ lesson, full, backing }, [full.buffer, backing.buffer]);
  } catch (err) {
    self.postMessage({ error: String(err?.message ?? err) });
  }
};
