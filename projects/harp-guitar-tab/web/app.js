// Harp Tab Player: load a recording, transcribe it in a worker, practise with synced tab.
import {
  HARP_KEYS,
  activeNoteIndex,
  applyNoteEdits,
  applyTokenEdits,
  candidates,
  createHarp,
  encodeWav,
  formatHarpTab,
  harpForSong,
  makeLoop,
  mapToHarp,
  noteIndexAt,
  noteName,
  parseHarpTab,
  phrases,
  positionOf,
  renderNotes,
  suggestHarps,
} from "./core/index.js";

const ANALYSIS_RATE = 22050;
const $ = (id) => document.getElementById(id);
const media = $("media");

const state = {
  fileName: "",
  notes: [], // transcription, each with a stable id
  tuningCents: 0,
  harpChoice: "auto", // "auto" or a key
  autoKey: "C",
  songKey: "",
  overbends: true,
  harp: null,
  events: [], // mapped, what is shown
  lines: [], // phrases
  selectedId: null,
  deleted: new Set(),
  pitchEdits: new Map(),
  tokenEdits: new Map(),
  loop: null,
  loopStart: null,
  source: "original",
  originalUrl: null,
  synthUrl: null,
  current: -1,
};

// ---------- setup ----------

const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th"}`;

function fillSelects() {
  $("harp").innerHTML =
    `<option value="auto">Auto</option>` + HARP_KEYS.map((k) => `<option>${k}</option>`).join("");
  $("song").innerHTML =
    `<option value="">—</option>` + HARP_KEYS.map((k) => `<option>${k}</option>`).join("");
  $("holes").innerHTML =
    Array.from({ length: 10 }, (_, i) => `<div>${10 - i}</div>`).join("") + `<div title="Not playable">?</div>`;
}

function status(html) {
  $("status").innerHTML = html;
}

// ---------- loading & analysis ----------

async function decodeToMono(arrayBuffer) {
  const probe = new OfflineAudioContext(1, 1, ANALYSIS_RATE);
  const decoded = await probe.decodeAudioData(arrayBuffer);
  const ctx = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * ANALYSIS_RATE)), ANALYSIS_RATE);
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.connect(ctx.destination); // resampled and mixed down to mono
  source.start();
  return (await ctx.startRendering()).getChannelData(0);
}

let worker = null;

async function loadFile(file) {
  state.fileName = file.name;
  if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  state.originalUrl = URL.createObjectURL(file);
  dropSynth();
  media.pause();
  setSource("original", { keepTime: false });
  $("empty").hidden = true;
  $("player").hidden = false;
  resetEdits();
  state.notes = [];
  remap();
  status(`Decoding <b>${escapeHtml(file.name)}</b>…`);
  let samples;
  try {
    samples = await decodeToMono(await file.arrayBuffer());
  } catch {
    status(`Could not decode <b>${escapeHtml(file.name)}</b>. Try an mp3, m4a, wav or mp4 file.`);
    return;
  }
  analyze(new Float32Array(samples));
}

function analyze(samples) {
  worker?.terminate();
  worker = new Worker(new URL("./analysis-worker.js", import.meta.url), { type: "module" });
  status(`Listening for notes… <span class="progress"><i id="bar"></i></span>`);
  worker.onmessage = ({ data }) => {
    if (data.type === "progress") {
      const bar = $("bar");
      if (bar) bar.style.width = `${Math.round(data.fraction * 100)}%`;
    } else if (data.type === "error") {
      status(`Analysis failed: ${escapeHtml(data.message)}`);
    } else if (data.type === "done") {
      state.notes = data.notes.map((n, id) => ({ ...n, id }));
      state.tuningCents = data.tuningCents;
      chooseAutoHarp();
      remap();
      const tuning = Math.abs(data.tuningCents) >= 10 ? ` Recording is ${data.tuningCents} cents off A440.` : "";
      status(
        state.notes.length
          ? `${state.notes.length} notes in ${(data.ms / 1000).toFixed(1)} s.${tuning}`
          : "No notes found. Is it a solo harmonica recording?",
      );
    }
  };
  worker.postMessage({ samples, sampleRate: ANALYSIS_RATE }, [samples.buffer]);
}

function chooseAutoHarp() {
  const notes = applyNoteEdits(state.notes, state);
  if (!notes.length) return;
  const [best] = suggestHarps(notes, { songKey: state.songKey || undefined, overbends: state.overbends, limit: 1 });
  state.autoKey = best.key;
  $("harp").options[0].textContent = `Auto (${best.key})`;
}

function resetEdits() {
  state.deleted = new Set();
  state.pitchEdits = new Map();
  state.tokenEdits = new Map();
  state.selectedId = null;
  state.loop = null;
  state.loopStart = null;
}

// ---------- mapping ----------

function remap() {
  const key = state.harpChoice === "auto" ? state.autoKey : state.harpChoice;
  const harp = createHarp(key, { overbends: state.overbends });
  const notes = applyNoteEdits(state.notes, state);
  const mapped = mapToHarp(notes, harp).events;
  state.harp = harp;
  state.events = applyTokenEdits(mapped, state.tokenEdits, (e) => candidates(harp, e.pitches));
  state.lines = phrases(state.events);
  state.current = -1;
  dropSynth();
  if (state.source === "synth") setSource("synth");
  updatePosition();
  renderRoll();
  renderTab();
  renderNotePanel();
}

function updatePosition() {
  const out = $("position");
  if (!state.songKey) {
    out.textContent = "";
    return;
  }
  const pos = positionOf(state.harp.key, state.songKey);
  const cross = harpForSong(state.songKey, 2);
  out.textContent = `${ordinal(pos)} position · cross harp for ${state.songKey}: ${cross}`;
}

const kindOf = (e) => {
  if (!e.playable) return "bad";
  if (e.holes) return "chord";
  const a = e.actions[0];
  if (a.over) return "over";
  if (a.bend) return "bend";
  return a.breath;
};

// ---------- hole roll ----------

const px = () => Number($("zoom").value);
const rowOf = (hole) => 10 - hole; // hole 10 on top
let noteEls = [];
let tokEls = [];

function renderRoll() {
  const track = $("track");
  track.innerHTML = "";
  noteEls = state.events.map((e, i) => {
    const el = document.createElement("div");
    const kind = kindOf(e);
    el.className = `note ${kind}${e.glide ? " glide" : ""}`;
    el.dataset.i = i;
    el.textContent = e.token;
    el.title = `${e.pitches.map(noteName).join(" ")} · ${e.time.toFixed(2)} s`;
    let top = 10;
    let rows = 1;
    if (e.holes) {
      top = rowOf(e.holes.at(-1));
      rows = e.holes.at(-1) - e.holes[0] + 1;
    } else if (e.playable) {
      top = rowOf(e.actions[0].hole);
    }
    el.style.left = `${e.time * px()}px`;
    el.style.width = `${Math.max(18, e.duration * px() - 2)}px`;
    el.style.top = `calc(var(--row) * ${top})`;
    if (rows > 1) el.style.height = `calc(var(--row) * ${rows} - 4px)`;
    if (e.id === state.selectedId) el.classList.add("selected");
    track.append(el);
    return el;
  });
  const end = Math.max(media.duration || 0, ...state.events.map((e) => e.time + e.duration));
  track.style.width = `${end * px() + 400}px`;
  renderLoopZone();
}

function renderLoopZone() {
  const track = $("track");
  track.querySelector(".loop-zone")?.remove();
  const { loop } = state;
  $("loop-out").textContent = loop
    ? `Looping ${loop.a.toFixed(1)}–${loop.b.toFixed(1)} s`
    : state.loopStart != null
      ? `A at ${state.loopStart.toFixed(1)} s — set B`
      : "";
  if (!loop) return;
  const zone = document.createElement("div");
  zone.className = "loop-zone";
  zone.style.left = `${loop.a * px()}px`;
  zone.style.width = `${(loop.b - loop.a) * px()}px`;
  track.prepend(zone);
}

// ---------- tab text ----------

function renderTab() {
  const tab = $("tab");
  tab.innerHTML = "";
  tokEls = [];
  if (!state.events.length) {
    tab.innerHTML = `<p class="muted">${state.notes.length ? "All notes deleted." : "Tab appears here after analysis."}</p>`;
    return;
  }
  state.lines.forEach((line, li) => {
    const row = document.createElement("div");
    row.className = "line";
    row.dataset.line = li;
    const loopBtn = document.createElement("button");
    loopBtn.className = "button small loop-btn";
    loopBtn.textContent = "⟲";
    loopBtn.title = "Loop this phrase";
    loopBtn.dataset.loopLine = li;
    row.append(loopBtn);
    for (let i = line.first; i <= line.last; i++) {
      const e = state.events[i];
      const tok = document.createElement("span");
      const kind = kindOf(e);
      tok.className = `tok ${kind === "bend" || kind === "over" ? e.actions[0].breath : kind}${e.glide ? " glide" : ""}`;
      if (e.id === state.selectedId) tok.classList.add("selected");
      tok.dataset.i = i;
      tok.textContent = e.token;
      row.append(tok);
      tokEls[i] = tok;
    }
    tab.append(row);
  });
}

// ---------- note panel ----------

function renderNotePanel() {
  const panel = $("note-panel");
  const i = state.events.findIndex((e) => e.id === state.selectedId);
  if (i < 0) {
    panel.innerHTML = `<p class="muted">Select a note to see it, change how it's played, fix its pitch or delete it.</p>`;
    return;
  }
  const e = state.events[i];
  const alts = e.pitches.length ? candidates(state.harp, e.pitches) : [];
  panel.innerHTML = `
    <h3>${escapeHtml(e.token)}</h3>
    <dl>
      <dt>Note</dt><dd>${e.pitches.map(noteName).join(" ")}</dd>
      <dt>Time</dt><dd>${e.time.toFixed(2)} s · ${Math.round(e.duration * 1000)} ms</dd>
      ${e.cents != null ? `<dt>Intonation</dt><dd>${e.cents > 0 ? "+" : ""}${e.cents} cents</dd>` : ""}
      ${e.glide ? `<dt>Played</dt><dd>slid into from the previous note</dd>` : ""}
    </dl>
    ${alts.length > 1 ? `<div class="muted">Play it as</div><div class="row">${alts
      .map((a) => `<button class="button small ${a.token === e.token ? "on" : ""}" data-alt="${escapeHtml(a.token)}">${escapeHtml(a.token)}</button>`)
      .join("")}</div>` : ""}
    <div class="muted">Wrong note?</div>
    <div class="row">
      <button class="button small" data-shift="-12">−8va</button>
      <button class="button small" data-shift="-1">−1</button>
      <button class="button small" data-shift="1">+1</button>
      <button class="button small" data-shift="12">+8va</button>
      <button class="button small" data-delete>Delete</button>
    </div>
    <div class="row"><button class="button small" data-play-from>Play from here</button></div>`;
}

function select(i, { seek = true } = {}) {
  const e = state.events[i];
  if (!e) return;
  state.selectedId = e.id;
  document.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
  noteEls[i]?.classList.add("selected");
  tokEls[i]?.classList.add("selected");
  if (seek) media.currentTime = Math.max(0, e.time - 0.05);
  renderNotePanel();
}

$("note-panel").addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;
  const id = state.selectedId;
  const e = state.events.find((x) => x.id === id);
  if (!e) return;
  if (btn.dataset.alt) {
    state.tokenEdits.set(id, btn.dataset.alt);
  } else if (btn.dataset.shift) {
    const base = state.pitchEdits.get(id) ?? state.notes.find((n) => n.id === id).pitches[0];
    state.pitchEdits.set(id, base + Number(btn.dataset.shift));
    state.tokenEdits.delete(id);
  } else if ("delete" in btn.dataset) {
    state.deleted.add(id);
    state.selectedId = null;
  } else if ("playFrom" in btn.dataset) {
    media.currentTime = Math.max(0, e.time - 0.3);
    media.play();
    return;
  }
  remap();
});

// ---------- playback ----------

function setSource(source, { keepTime = true } = {}) {
  state.source = source;
  $("src-original").classList.toggle("on", source === "original");
  $("src-synth").classList.toggle("on", source === "synth");
  $("src-original").setAttribute("aria-pressed", source === "original");
  $("src-synth").setAttribute("aria-pressed", source === "synth");
  let url = state.originalUrl;
  if (source === "synth") {
    if (!state.synthUrl) {
      const notes = state.events.filter((e) => e.playable);
      const wav = encodeWav(renderNotes(notes, { sampleRate: ANALYSIS_RATE }), ANALYSIS_RATE);
      state.synthUrl = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
    }
    url = state.synthUrl;
  }
  if (!url || media.src === url) return;
  const [time, playing, rate] = keepTime ? [media.currentTime, !media.paused, media.playbackRate] : [0, false, media.playbackRate];
  media.src = url;
  media.addEventListener(
    "loadedmetadata",
    () => {
      media.currentTime = Math.min(time, media.duration || time);
      media.playbackRate = rate;
      if (playing) media.play();
    },
    { once: true },
  );
}

function dropSynth() {
  if (state.synthUrl) URL.revokeObjectURL(state.synthUrl);
  state.synthUrl = null;
}

function togglePlay() {
  if (!media.src) return;
  if (media.paused) media.play();
  else media.pause();
}

function setLoopPoint(which) {
  const t = media.currentTime;
  if (which === "a") {
    state.loopStart = t;
    state.loop = null;
  } else {
    state.loop = makeLoop(state.loopStart ?? 0, t, media.duration || t);
    state.loopStart = null;
  }
  renderLoopZone();
}

function loopPhrase(li) {
  const line = state.lines[li];
  state.loop = makeLoop(line.start - 0.15, line.end + 0.15, media.duration || line.end + 1);
  state.loopStart = null;
  renderLoopZone();
  media.currentTime = state.loop?.a ?? line.start;
  media.play();
}

function stepNote(dir) {
  if (!state.events.length) return;
  const i = noteIndexAt(state.events, media.currentTime + 0.06);
  select(Math.max(0, Math.min(state.events.length - 1, i + dir)));
}

function tick() {
  const t = media.currentTime;
  if (state.loop && !media.paused && (t >= state.loop.b || t < state.loop.a - 0.5)) {
    media.currentTime = state.loop.a;
  }
  const cursorX = $("roll").clientWidth * 0.25;
  $("track").style.transform = `translateX(${cursorX - t * px()}px)`;
  const i = activeNoteIndex(state.events, t);
  if (i !== state.current) {
    noteEls[state.current]?.classList.remove("now");
    tokEls[state.current]?.classList.remove("now");
    document.querySelector(".line.current")?.classList.remove("current");
    state.current = i;
    if (i >= 0) {
      noteEls[i]?.classList.add("now");
      const tok = tokEls[i];
      tok?.classList.add("now");
      const line = tok?.parentElement;
      line?.classList.add("current");
      if (line && !media.paused) {
        const box = $("tab");
        const top = line.offsetTop - box.offsetTop;
        if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - line.offsetHeight) {
          box.scrollTop = top - box.clientHeight / 3;
        }
      }
    }
  }
  requestAnimationFrame(tick);
}

// ---------- events ----------

$("file").addEventListener("change", (ev) => {
  const [file] = ev.target.files;
  if (file) loadFile(file);
  ev.target.value = "";
});

$("demo").addEventListener("click", () => {
  // A 2nd-position blues lick in E on an A harp, with a slide into a bend.
  const harp = createHarp("A");
  const phrasesTab = [
    "-2 -3↓ -3 -4 -4↓ 4 -3~-3↓↓ -2",
    "-2 -2 -3↓ 4 -4↓ -4 -5 6",
    "6 -5 -4 -4↓ 4 -3↓ -2",
  ];
  const notes = [];
  let t = 0.3;
  for (const line of phrasesTab) {
    for (const e of parseHarpTab(line, harp)) {
      if (e.glide) notes.at(-1).duration = t - notes.at(-1).time; // hold into the slide
      notes.push({ ...e, time: t, duration: e.glide ? 0.45 : 0.27 });
      t += e.glide ? 0.5 : 0.3;
    }
    t += 0.9;
  }
  const wav = encodeWav(renderNotes(notes, { sampleRate: 44100, vibrato: 0.1, noise: 0.01 }), 44100);
  loadFile(new File([wav], "demo-riff.wav", { type: "audio/wav" }));
  state.songKey = "E";
  $("song").value = "E";
});

$("harp").addEventListener("change", (ev) => {
  state.harpChoice = ev.target.value;
  state.tokenEdits.clear();
  remap();
});
$("song").addEventListener("change", (ev) => {
  state.songKey = ev.target.value;
  if (state.harpChoice === "auto") {
    chooseAutoHarp();
    remap();
  } else {
    updatePosition();
  }
});
$("overbends").addEventListener("change", (ev) => {
  state.overbends = ev.target.checked;
  chooseAutoHarp();
  remap();
});
$("src-original").addEventListener("click", () => setSource("original"));
$("src-synth").addEventListener("click", () => setSource("synth"));

$("play").addEventListener("click", togglePlay);
media.addEventListener("play", () => ($("play").textContent = "Pause"));
media.addEventListener("pause", () => ($("play").textContent = "Play"));
media.addEventListener("loadedmetadata", () => {
  media.parentElement.classList.toggle("audio-only", !media.videoWidth);
  renderRoll();
});
$("prev").addEventListener("click", () => stepNote(-1));
$("next").addEventListener("click", () => stepNote(1));
$("speed").addEventListener("input", (ev) => {
  media.playbackRate = Number(ev.target.value);
  media.preservesPitch = true;
  $("speed-out").textContent = `${Math.round(ev.target.value * 100)}%`;
});
$("zoom").addEventListener("input", renderRoll);
$("loop-a").addEventListener("click", () => setLoopPoint("a"));
$("loop-b").addEventListener("click", () => setLoopPoint("b"));
$("loop-clear").addEventListener("click", () => {
  state.loop = null;
  state.loopStart = null;
  renderLoopZone();
});

$("roll").addEventListener("click", (ev) => {
  const note = ev.target.closest(".note");
  if (note) return select(Number(note.dataset.i));
  const rect = $("roll").getBoundingClientRect();
  const t = media.currentTime + (ev.clientX - rect.left - rect.width * 0.25) / px();
  media.currentTime = Math.max(0, t);
});

$("tab").addEventListener("click", (ev) => {
  const loopBtn = ev.target.closest("[data-loop-line]");
  if (loopBtn) return loopPhrase(Number(loopBtn.dataset.loopLine));
  const tok = ev.target.closest(".tok");
  if (tok) select(Number(tok.dataset.i));
});

$("copy").addEventListener("click", async () => {
  const head = [
    `${state.fileName} — ${state.harp.key} harp`,
    state.songKey ? `${ordinal(positionOf(state.harp.key, state.songKey))} position, song in ${state.songKey}` : "",
  ].filter(Boolean);
  const text = `${head.join(", ")}\n\n${formatHarpTab(state.events)}\n`;
  try {
    await navigator.clipboard.writeText(text);
    status("Tab copied.");
  } catch {
    status("Could not copy; select the tab text instead.");
  }
});

document.addEventListener("keydown", (ev) => {
  if (ev.target.closest("input, select, textarea") && ev.target.type !== "range") return;
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const actions = {
    " ": togglePlay,
    "[": () => setLoopPoint("a"),
    "]": () => setLoopPoint("b"),
    "\\": () => $("loop-clear").click(),
    ArrowLeft: () => (media.currentTime = Math.max(0, media.currentTime - 2)),
    ArrowRight: () => (media.currentTime += 2),
    ",": () => stepNote(-1),
    ".": () => stepNote(1),
  };
  const action = actions[ev.key];
  if (action && state.events.length + state.notes.length > 0) {
    ev.preventDefault();
    action();
  }
});

// Drag and drop anywhere.
document.addEventListener("dragover", (ev) => {
  ev.preventDefault();
  document.body.classList.add("dragging");
});
document.addEventListener("dragleave", (ev) => {
  if (!ev.relatedTarget) document.body.classList.remove("dragging");
});
document.addEventListener("drop", (ev) => {
  ev.preventDefault();
  document.body.classList.remove("dragging");
  const file = ev.dataTransfer.files[0];
  if (file) loadFile(file);
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

fillSelects();
requestAnimationFrame(tick);
