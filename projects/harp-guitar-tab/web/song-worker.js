// Analyses a recording off the main thread. Keeps the features, so corrections (tempo,
// bar 1, key) re-run only the cheap steps.
import { analyzeFeatures, features } from "./core/index.js";

let feats = null;

self.onmessage = ({ data }) => {
  try {
    if (data.samples) {
      feats = features(data.samples, data.sampleRate, { onProgress: (fraction) => self.postMessage({ type: "progress", fraction }) });
    }
    if (!feats) throw new Error("no recording loaded");
    self.postMessage({ type: "done", analysis: analyzeFeatures(feats, data.fixes ?? {}) });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err?.message ?? err) });
  }
};
