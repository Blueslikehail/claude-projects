// Generates a lesson and renders its audio (with and without the harp) off the main thread.
import { encodeWav, generateLesson, renderLesson } from "./core/index.js";

const SAMPLE_RATE = 32000;

self.onmessage = ({ data: options }) => {
  try {
    const lesson = generateLesson(options);
    const full = encodeWav(renderLesson(lesson, { sampleRate: SAMPLE_RATE }), SAMPLE_RATE);
    const backing = encodeWav(renderLesson(lesson, { sampleRate: SAMPLE_RATE, harp: false }), SAMPLE_RATE);
    self.postMessage({ lesson, full, backing }, [full.buffer, backing.buffer]);
  } catch (err) {
    self.postMessage({ error: String(err?.message ?? err) });
  }
};
