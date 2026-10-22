// Times a pasted tab to a recording off the main thread (see core/audio/align.js).
import { alignTab } from "./core/index.js";

self.onmessage = ({ data: { samples, sampleRate, notes, options } }) => {
  try {
    const result = alignTab(samples, sampleRate, notes, {
      ...options,
      onProgress: (fraction) => self.postMessage({ type: "progress", fraction }),
    });
    self.postMessage({ type: "done", result });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err?.message ?? err) });
  }
};
