// Play along with an original recording: analyse it (key, tempo, beats, bars, choruses),
// then write licks that follow its beat grid. You hear the record, or the record with the
// licks on top, and the mic scores you as usual. Corrections re-run the analysis.
import { HARP_KEYS, LEVELS, STYLES, STYLE_IDS, article, encodeWav, generateLesson, harpForSong } from "./core/index.js";
import { loadSamples, renderLessonSampled } from "./sampler.js";

const $ = (id) => document.getElementById(id);
const RATE = 22050; // app.decodeToMono resamples to this
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Lesson style that suits what was heard. */
export function styleForAnalysis(a) {
  if (a.minor) return "minor";
  if (a.feel === "shuffle") return a.tempo < 75 ? "slow" : "shuffle";
  return a.tempo >= 110 ? "boogie" : "swamp";
}

/**
 * @param {{ loadLesson, status, decodeToMono, media, showCards }} app
 */
export function createSongs(app) {
  let worker = null;
  let analysis = null;
  let audio = null; // decoded mono recording at RATE
  let recordingUrl = null;
  let fileName = "";
  let fixes = {};
  const opts = { style: "", level: 2, seed: newSeed() };

  function newSeed() {
    return Math.floor(Math.random() * 1e9);
  }

  async function load(file) {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    recordingUrl = URL.createObjectURL(file);
    fileName = file.name.replace(/\.[^.]+$/, "");
    fixes = {};
    analysis = null;
    app.showCards();
    $("song-summary").textContent = "Listening to the band…";
    app.status(`Decoding <b>${esc(file.name)}</b>…`);
    try {
      audio = new Float32Array(await app.decodeToMono(await file.arrayBuffer()));
    } catch {
      app.status(`Could not decode <b>${esc(file.name)}</b>. Try an mp3, m4a, wav or mp4 file.`);
      return;
    }
    worker?.terminate();
    worker = new Worker(new URL("./song-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = onMessage;
    app.status(`Finding the key, beat and bars… <span class="progress"><i id="song-bar"></i></span>`);
    const copy = audio.slice();
    worker.postMessage({ samples: copy, sampleRate: RATE }, [copy.buffer]);
  }

  function reanalyze(change) {
    if (!worker || !analysis) return;
    fixes = { ...fixes, ...change };
    for (const k of Object.keys(fixes)) if (fixes[k] === undefined) delete fixes[k];
    app.status("Re-reading the bars…");
    worker.postMessage({ fixes });
  }

  async function onMessage({ data }) {
    if (data.type === "progress") {
      const bar = $("song-bar");
      if (bar) bar.style.width = `${Math.round(data.fraction * 100)}%`;
      return;
    }
    if (data.type === "error") return app.status(`Analysis failed: ${esc(data.message)}`);
    const keepTime = analysis !== null;
    analysis = data.analysis;
    renderSummary();
    await makeLesson({ keepTime });
  }

  function positionLabel(style) {
    return STYLES[style].position === 1 ? "1st position" : "2nd position";
  }

  function renderSummary() {
    const a = analysis;
    const style = opts.style || styleForAnalysis(a);
    const harp = harpForSong(a.key, STYLES[style].position);
    const fit = Math.round(a.formFit * 100);
    const warn =
      a.formFit < 0.6
        ? ` <span class="warn">This doesn't follow a 12-bar blues closely (${fit}% of bars) — licks may clash. Play to where bar 1 of a verse starts and press <b>Bar 1 is here</b>.</span>`
        : "";
    $("song-summary").innerHTML =
      `<strong>${a.key}${a.minor ? " minor" : ""}</strong> · <strong class="lesson-harp">use ${article(harp)} ${harp} harp</strong> (${positionLabel(style)}) · ` +
      `${Math.round(a.tempo)} bpm · ${a.feel} · 12-bar match ${fit}%` +
      (fixes.key ? ` <span class="muted">(key set by you; heard ${a.detectedKey})</span>` : "") +
      warn;
    $("song-key").value = fixes.key ?? "";
    $("song-minor").checked = a.minor;
  }

  async function makeLesson({ keepTime = false } = {}) {
    const a = analysis;
    const startBar = a.chorusStart;
    const choruses = Math.floor((a.bars.length - startBar) / 12);
    if (choruses < 1) {
      app.status("Couldn't find a whole 12-bar verse. Play to where a verse starts and press <b>Bar 1 is here</b>.");
      return;
    }
    const style = opts.style || styleForAnalysis(a);
    const lesson = generateLesson({
      songKey: a.key,
      style,
      level: opts.level,
      choruses,
      seed: opts.seed,
      tempo: Math.round(a.tempo),
      grid: { beats: a.beats, startBeat: a.bars[startBar].beat, swing: a.swing },
    });
    lesson.title = `${fileName} · ${a.key}${a.minor ? " minor" : ""} · ${lesson.harpKey} harp, ${positionLabel(style)}`;
    app.status("Adding the licks to the record…");
    let mixWav;
    try {
      const harp = await renderLessonSampled(lesson, await loadSamples(), { backing: false, sampleRate: RATE, duration: audio.length / RATE });
      mixWav = encodeWav(mix(audio, harp), RATE);
    } catch (err) {
      console.warn("Couldn't render the licks:", err);
      mixWav = encodeWav(audio, RATE);
    }
    app.loadLesson(lesson, recordingUrl, mixWav, {
      labels: ["Recording", "Recording + licks"],
      keepTime,
      message: `${choruses} verse${choruses > 1 ? "s" : ""} of licks, starting at ${a.bars[startBar].time.toFixed(1)} s. Use headphones and play along — or switch to <b>Recording + licks</b> to hear them first.`,
    });
  }

  /** The record plus the licks, with the licks about as loud as the record. */
  function mix(record, licks) {
    const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));
    const gain = (0.9 * rms(record)) / (rms(licks) || 1);
    const out = new Float32Array(record.length);
    let peak = 0;
    for (let i = 0; i < out.length; i++) {
      out[i] = record[i] + gain * (licks[i] ?? 0);
      peak = Math.max(peak, Math.abs(out[i]));
    }
    if (peak > 0.95) for (let i = 0; i < out.length; i++) out[i] *= 0.95 / peak;
    return out;
  }

  // ---------- controls ----------

  $("song-file").addEventListener("change", (ev) => {
    const [file] = ev.target.files;
    ev.target.value = "";
    if (file) load(file);
  });
  $("song-key").innerHTML = `<option value="">Heard</option>` + HARP_KEYS.map((k) => `<option>${k}</option>`).join("");
  $("song-key").addEventListener("change", (ev) => reanalyze({ key: ev.target.value || undefined, downbeat: undefined, chorusStart: undefined }));
  $("song-minor").addEventListener("change", (ev) => reanalyze({ minor: ev.target.checked }));
  $("song-half").addEventListener("click", () => analysis && reanalyze({ tempo: analysis.tempo / 2, downbeat: undefined, chorusStart: undefined }));
  $("song-double").addEventListener("click", () => analysis && reanalyze({ tempo: analysis.tempo * 2, downbeat: undefined, chorusStart: undefined }));
  $("song-bar1").addEventListener("click", () => {
    if (!analysis) return;
    const t = app.media.currentTime;
    let nearest = 0;
    analysis.beats.forEach((b, i) => Math.abs(b - t) < Math.abs(analysis.beats[nearest] - t) && (nearest = i));
    const downbeat = nearest % 4;
    reanalyze({ tempo: analysis.tempo, downbeat, chorusStart: ((nearest - downbeat) / 4) % 12 });
  });
  for (const [id, step] of [["song-beat-back", -1], ["song-beat-fwd", 1]]) {
    $(id).addEventListener("click", () => analysis && reanalyze({ tempo: analysis.tempo, downbeat: (analysis.downbeat + step + 4) % 4, chorusStart: undefined }));
  }
  $("song-style").innerHTML = `<option value="">Auto</option>` + STYLE_IDS.map((id) => `<option value="${id}">${STYLES[id].name}</option>`).join("");
  $("song-style").addEventListener("change", (ev) => {
    opts.style = ev.target.value;
    if (analysis) {
      renderSummary();
      makeLesson({ keepTime: true });
    }
  });
  $("song-level").innerHTML = Object.entries(LEVELS).map(([n, name]) => `<option value="${n}" ${Number(n) === opts.level ? "selected" : ""}>${name}</option>`).join("");
  $("song-level").addEventListener("change", (ev) => {
    opts.level = Number(ev.target.value);
    if (analysis) makeLesson({ keepTime: true });
  });
  $("song-new").addEventListener("click", () => {
    opts.seed = newSeed();
    if (analysis) makeLesson({ keepTime: true });
  });

  return { load };
}
