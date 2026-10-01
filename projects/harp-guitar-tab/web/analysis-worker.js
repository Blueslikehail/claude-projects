// Runs transcription off the main thread so playback and the UI stay smooth.
import { transcribe } from "./core/index.js";

self.onmessage = ({ data: { samples, sampleRate } }) => {
  try {
    const started = performance.now();
    const { notes, tuningCents } = transcribe(samples, sampleRate, {
      onProgress: (fraction) => self.postMessage({ type: "progress", fraction }),
    });
    self.postMessage({ type: "done", notes, tuningCents, ms: performance.now() - started });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err?.message ?? err) });
  }
};
