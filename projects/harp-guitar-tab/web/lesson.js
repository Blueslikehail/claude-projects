// The lesson panel: choose key, level, tempo and length; generate a 12-bar blues lesson;
// suggest recordings to practise with; keep your own licks.
import {
  HARP_KEYS,
  LEVELS,
  DEFAULT_MY_LICK_STYLES,
  SLOT_NAMES,
  STYLES,
  STYLE_IDS,
  article,
  createHarp,
  encodeWav,
  harpForSong,
  lessonOptionsFor,
  listenLinks,
  suggestSongs,
  validateLick,
} from "./core/index.js";
import { SAMPLE_RATE, loadSamples, normalizeTogether, renderLessonSampled } from "./sampler.js";

const $ = (id) => document.getElementById(id);
const STORE = "harp-tab.myLicks";
const CONFIDENCE_HELP = {
  documented: "Independent sources agree on key, harp and position.",
  reported: "One source gives the key, harp and position.",
  partial: "The harp is sourced; the position (and so the key) is assumed.",
  disputed: "Sources disagree; the most-cited version is shown.",
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

/** @param {{ loadLesson: (lesson, full: Uint8Array, backing: Uint8Array) => void, status: (html:string) => void }} app */
export function createLessons(app) {
  const options = { style: "shuffle", songKey: "E", level: 2, tempo: STYLES.shuffle.tempo.default, choruses: 1, seed: newSeed() };
  let worker = null;
  let mine = loadMine();
  let useMine = true;

  function newSeed() {
    return Math.floor(Math.random() * 1e9);
  }

  let request = 0;
  let sound = "samples";

  function generate() {
    worker?.terminate();
    worker = new Worker(new URL("./lesson-worker.js", import.meta.url), { type: "module" });
    const id = ++request;
    const opts = { ...options, myLicks: useMine ? mine : [] };
    app.status("Writing your lesson…");
    const show = (lesson, full, backing) => {
      if (id !== request) return; // a newer lesson was asked for meanwhile
      app.loadLesson(lesson, full, backing);
      renderLicks(lesson);
      renderSongs(lesson);
    };
    worker.onmessage = async ({ data }) => {
      if (data.error) return app.status(`Could not make the lesson: ${esc(data.error)}`);
      if (data.full) return show(data.lesson, data.full, data.backing);
      try {
        app.status("Recording the band…");
        const samples = await loadSamples();
        const mixes = normalizeTogether([
          await renderLessonSampled(data.lesson, samples),
          await renderLessonSampled(data.lesson, samples, { harp: false }),
        ]);
        show(data.lesson, ...mixes.map((m) => encodeWav(m, SAMPLE_RATE)));
      } catch (err) {
        console.warn("Samples unavailable, using the synthesizer:", err);
        if (id === request) worker.postMessage({ options: opts, synth: true });
      }
    };
    worker.postMessage({ options: opts, synth: sound === "synth" });
  }

  // ---------- lesson licks and songs ----------

  function renderLicks(lesson) {
    $("lesson-licks").innerHTML = lesson.licks
      .map((l) => {
        const yours = l.mine ? ` <span class="mine-badge">★ yours${l.song ? ` · from ${esc(l.song)}` : ""}</span>` : "";
        return `<li><span class="muted">Bars ${(l.bar % 12) + 1}–${(l.bar % 12) + 2}</span> ${esc(l.name)} <span class="muted">· ${LEVELS[l.level]}</span>${yours}</li>`;
      })
      .join("");
  }

  function renderSongs(lesson) {
    const def = STYLES[lesson.style];
    const ranked = suggestSongs({ harpKey: lesson.harpKey, position: lesson.position, tempo: lesson.tempo, feel: def.feel, form: def.form }, { limit: 6 });
    $("song-list").innerHTML = ranked
      .map(({ song, reasons }) => {
        const links = listenLinks(song);
        const lessonOpts = lessonOptionsFor(song);
        const sources = song.sources
          .map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(new URL(u).hostname.replace(/^www\./, ""))}</a>`)
          .join("");
        return `<li class="song">
          <div><strong>${esc(song.title)}</strong> — ${esc(song.artist)}
            <span class="conf ${song.confidence}" title="${CONFIDENCE_HELP[song.confidence]}">${song.confidence}</span></div>
          <div class="muted small">Song in ${song.songKey} · ${song.harpKey} harp, ${ordinal(song.position)} position · ${song.tempo} ${song.feel}</div>
          <div class="small">${esc(reasons.join(" · "))}</div>
          ${song.note ? `<div class="muted small">${esc(song.note)}</div>` : ""}
          <div class="song-actions">
            <a class="button small" href="${links.youtube}" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a class="button small" href="${links.spotify}" target="_blank" rel="noopener noreferrer">Spotify</a>
            <button class="button small" data-song-lesson="${song.id}" data-key="${lessonOpts.songKey}" data-style="${lessonOpts.style}" data-tempo="${lessonOpts.tempo}"
              title="A ${STYLES[lessonOpts.style].name} lesson in ${lessonOpts.songKey}">${STYLES[lessonOpts.style].name} lesson in ${lessonOpts.songKey}</button>
            <details class="sources"><summary>Sources</summary>${sources}</details>
          </div>
        </li>`;
      })
      .join("");
  }

  $("song-list").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-song-lesson]");
    if (!btn) return;
    setStyle(btn.dataset.style, Number(btn.dataset.tempo));
    options.songKey = btn.dataset.key;
    $("lesson-key").value = options.songKey;
    updateHint();
    generate();
  });

  // ---------- my licks ----------

  function loadMine() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function saveMine() {
    try {
      localStorage.setItem(STORE, JSON.stringify(mine));
    } catch {
      app.status("Couldn't save your licks in this browser — use Export to keep them.");
    }
  }

  function renderMine() {
    $("my-licks-count").textContent = mine.length;
    $("my-lick-list").innerHTML = mine.length
      ? mine
          .map(
            (l) => `<li><strong>${esc(l.name)}</strong> <span class="muted">· ${SLOT_NAMES[l.slot]} · ${LEVELS[l.level] ?? ""} · ${esc(styleLabel(l.styles))}${l.song ? ` · from ${esc(l.song)}` : ""}</span>
              <code>${esc(l.tab.replace(/ r:\d+$/, ""))}</code> <button class="button small" data-remove="${esc(l.id)}">Remove</button></li>`,
          )
          .join("")
      : `<li class="muted">No licks yet. Add one you learned from a record — it will show up in your lessons.</li>`;
  }

  function styleLabel(styles) {
    return styles ? styles.map((s) => STYLES[s]?.name ?? s).join(", ") : "2nd-position styles";
  }

  function addLick({ name, song, slot, tab, styles }) {
    const check = validateLick(tab, createHarp("C"));
    if (!check.ok) return check;
    const valid = Array.isArray(styles) ? styles.filter((s) => STYLES[s]) : undefined;
    mine.push({
      id: `my-${Date.now().toString(36)}-${mine.length}`,
      name: name.trim(),
      song: song?.trim() || undefined,
      slot,
      tab: check.tab,
      level: check.level,
      styles: valid?.length ? valid : undefined,
    });
    return check;
  }

  $("lick-slot").innerHTML = Object.entries(SLOT_NAMES)
    .map(([slot, name]) => `<option value="${slot}">${name}</option>`)
    .join("");
  $("lick-style").innerHTML =
    `<option value="">Any 2nd-position style</option>` + STYLE_IDS.map((id) => `<option value="${id}">${STYLES[id].name} only</option>`).join("");
  $("lick-style").title = `"Any" means: ${DEFAULT_MY_LICK_STYLES.map((s) => STYLES[s].name).join(", ")}. Jimmy Reed licks are 1st position.`;
  $("lick-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const style = $("lick-style").value;
    const result = addLick({ name: $("lick-name").value, song: $("lick-song").value, slot: $("lick-slot").value, tab: $("lick-tab").value, styles: style ? [style] : undefined });
    const msg = $("lick-msg");
    msg.classList.toggle("lick-msg-error", !result.ok);
    if (!result.ok) {
      msg.textContent = result.error;
      return;
    }
    msg.textContent = `Added (${LEVELS[result.level]}). It will be used in your next lessons.`;
    $("lick-name").value = $("lick-tab").value = "";
    saveMine();
    renderMine();
  });
  $("my-lick-list").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-remove]")?.dataset.remove;
    if (!id) return;
    mine = mine.filter((l) => l.id !== id);
    saveMine();
    renderMine();
  });
  $("use-my-licks").addEventListener("change", (ev) => (useMine = ev.target.checked));
  $("licks-export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(mine, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "my-harp-licks.json" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("licks-import").addEventListener("change", async (ev) => {
    const [file] = ev.target.files;
    ev.target.value = "";
    if (!file) return;
    let added = 0;
    let skipped = 0;
    try {
      const items = JSON.parse(await file.text());
      for (const item of Array.isArray(items) ? items : []) {
        const ok = item && typeof item.name === "string" && SLOT_NAMES[item.slot] && addLick(item).ok;
        ok ? added++ : skipped++;
      }
    } catch {
      app.status("That file isn't a licks export.");
      return;
    }
    saveMine();
    renderMine();
    app.status(`Imported ${added} lick${added === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} that weren't valid` : ""}.`);
  });

  // ---------- lesson settings ----------

  function updateHint() {
    const def = STYLES[options.style];
    const harp = harpForSong(options.songKey, def.position);
    $("lesson-harp").textContent = `Use ${article(harp)} ${harp} harp`;
    $("lesson-blurb").textContent = def.blurb;
  }

  /** Switch style; the tempo moves into the style's range (or to `tempo`). */
  function setStyle(style, tempo) {
    const def = STYLES[style];
    options.style = style;
    options.tempo = tempo ?? def.tempo.default;
    $("lesson-style").value = style;
    Object.assign($("lesson-tempo"), { min: def.tempo.min, max: def.tempo.max });
    $("lesson-tempo").value = options.tempo;
    $("lesson-tempo-out").textContent = `${options.tempo} bpm`;
  }

  $("lesson-sound").addEventListener("change", (ev) => {
    sound = ev.target.value;
    generate();
  });

  $("lesson-style").innerHTML = STYLE_IDS.map((id) => `<option value="${id}">${STYLES[id].name}</option>`).join("");
  $("lesson-style").addEventListener("change", (ev) => {
    setStyle(ev.target.value);
    updateHint();
    generate();
  });

  $("lesson-key").innerHTML = HARP_KEYS.map((k) => `<option ${k === options.songKey ? "selected" : ""}>${k}</option>`).join("");
  $("lesson-level").innerHTML = Object.entries(LEVELS)
    .map(([n, name]) => `<option value="${n}" ${Number(n) === options.level ? "selected" : ""}>${name}</option>`)
    .join("");
  $("lesson-key").addEventListener("change", (ev) => {
    options.songKey = ev.target.value;
    updateHint();
    generate();
  });
  $("lesson-level").addEventListener("change", (ev) => {
    options.level = Number(ev.target.value);
    generate();
  });
  $("lesson-tempo").addEventListener("input", (ev) => ($("lesson-tempo-out").textContent = `${ev.target.value} bpm`));
  $("lesson-tempo").addEventListener("change", (ev) => {
    options.tempo = Number(ev.target.value);
    generate();
  });
  $("lesson-choruses").addEventListener("change", (ev) => {
    options.choruses = Number(ev.target.value);
    generate();
  });
  $("lesson-new").addEventListener("click", () => {
    options.seed = newSeed();
    generate();
  });
  setStyle(options.style);
  updateHint();
  renderMine();

  return { generate };
}
