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
  playersForStyle,
  suggestSongs,
  validateLick,
} from "./core/index.js";
import { SAMPLE_RATE, loadSamples, normalizeTogether, renderLessonSampled } from "./sampler.js";
import { exportAll, loadLicks, loadTabs, newId, readExport, saveLicks, saveTabs } from "./store.js";

const $ = (id) => document.getElementById(id);
const CONFIDENCE_HELP = {
  documented: "Independent sources agree on key, harp and position.",
  reported: "One source gives the key, harp and position.",
  partial: "The harp is sourced; the position (and so the key) is assumed.",
  disputed: "Sources disagree; the most-cited version is shown.",
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

/**
 * @param {{ loadLesson: (lesson, full: Uint8Array, backing: Uint8Array) => void, status: (html:string) => void,
 *           showLesson: () => void, openPlayer?: (id: string) => void, changed?: () => void }} app
 *   showLesson shows the lesson cards; openPlayer opens a player's card in the library;
 *   changed is called when your licks or tabs change (e.g. after an import).
 */
export function createLessons(app) {
  const options = { style: "shuffle", songKey: "E", level: 2, tempo: STYLES.shuffle.tempo.default, choruses: 1, seed: newSeed() };
  let worker = null;
  let mine = loadLicks();
  let useMine = true;

  function newSeed() {
    return Math.floor(Math.random() * 1e9);
  }

  let request = 0;
  let sound = "samples";

  function generate(extra = {}) {
    run("lesson", { ...options, myLicks: useMine ? mine : [], ...extra });
  }

  /** Make a lesson in the worker (kind: lesson | lick | tab), record the band, show it. */
  function run(kind, opts, { message } = {}) {
    worker?.terminate();
    worker = new Worker(new URL("./lesson-worker.js", import.meta.url), { type: "module" });
    const id = ++request;
    app.showLesson();
    app.status(kind === "lesson" ? "Writing your lesson…" : "Getting it ready…");
    const show = (lesson, full, backing) => {
      if (id !== request) return; // a newer lesson was asked for meanwhile
      app.loadLesson(lesson, full, backing, { message });
      renderLicks(lesson);
      renderSongs(lesson);
      renderPlayers(lesson);
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
        if (id === request) worker.postMessage({ kind, options: opts, synth: true });
      }
    };
    worker.postMessage({ kind, options: opts, synth: sound === "synth" });
  }

  /** Practise one lick (built-in or yours) over the bars it was written for. */
  function practiseLick(lick, { style } = {}) {
    style = style && (lick.styles ?? DEFAULT_MY_LICK_STYLES).includes(style) ? style : (lick.styles ?? DEFAULT_MY_LICK_STYLES)[0];
    setStyle(style);
    updateHint();
    run("lick", { lick, style, songKey: options.songKey, tempo: options.tempo, repeats: 4 }, {
      message: `Practising <b>${esc(lick.name)}</b> four times over its chords. Loop a line with ⟲, slow it down with Speed, or switch to <b>Backing only</b>.`,
    });
  }

  /** A full lesson in the lick's style that features it. */
  function featureLick(lick, { style } = {}) {
    style = style && (lick.styles ?? DEFAULT_MY_LICK_STYLES).includes(style) ? style : (lick.styles ?? DEFAULT_MY_LICK_STYLES)[0];
    setStyle(style);
    updateHint();
    options.level = Math.max(options.level, lick.level ?? 1);
    $("lesson-level").value = options.level;
    options.seed = newSeed();
    generate({ lick: { ...lick, styles: [style] } });
  }

  /** Practise a tab of yours (any length) over a style's band. */
  function practiseTab(item) {
    const style = STYLES[item.style] ? item.style : "shuffle";
    setStyle(style, item.tempo);
    options.songKey = item.songKey ?? options.songKey;
    $("lesson-key").value = options.songKey;
    updateHint();
    run("tab", { tab: item.tab, name: item.name, style, songKey: options.songKey, tempo: options.tempo }, {
      message: `<b>${esc(item.name)}</b> over a ${esc(STYLES[style].name)} band. Change the style, key or tempo in the library.`,
    });
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

  function renderPlayers(lesson) {
    const players = playersForStyle(lesson.style);
    $("players-title").textContent = `Players to hear for ${STYLES[lesson.style].name}`;
    $("style-players").innerHTML = players
      .map((p) => `<li><button class="link" data-player="${p.id}">${esc(p.name)}</button> <span class="muted small">· ${esc(p.genre)}</span></li>`)
      .join("");
  }

  $("style-players").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-player]")?.dataset.player;
    if (id) app.openPlayer?.(id);
  });

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

  function saveMine() {
    if (!saveLicks(mine)) app.status("Couldn't save your licks in this browser — use Export to keep them.");
    app.changed?.();
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
      id: newId("my"),
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
  $("licks-export").addEventListener("click", exportAll);
  $("licks-import").addEventListener("change", (ev) => importFile(ev.target));

  /** Import an export file (licks and tabs) from a file input. */
  async function importFile(input) {
    const [file] = input.files;
    input.value = "";
    if (!file) return;
    let data;
    try {
      data = await readExport(file);
    } catch {
      app.status("That file isn't a licks export.");
      return;
    }
    let added = 0;
    let skipped = 0;
    for (const item of data.licks) {
      const ok = item && typeof item.name === "string" && SLOT_NAMES[item.slot] && addLick(item).ok;
      ok ? added++ : skipped++;
    }
    const harp = createHarp("C");
    const tabs = loadTabs();
    let tabsAdded = 0;
    for (const t of data.tabs) {
      const check = t && typeof t.name === "string" && typeof t.tab === "string" && validateLick(t.tab, harp, { maxUnits: 96 * 8, pad: false });
      if (!check?.ok) {
        skipped++;
        continue;
      }
      tabs.push({ ...t, id: newId("tab"), tab: check.tab });
      tabsAdded++;
    }
    saveTabs(tabs);
    saveMine();
    renderMine();
    app.status(`Imported ${added} lick${added === 1 ? "" : "s"} and ${tabsAdded} tab${tabsAdded === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} that weren't valid` : ""}.`);
  }

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

  return {
    generate,
    practiseLick,
    featureLick,
    practiseTab,
    importFile,
    mine: () => mine,
    addLick: (lick) => {
      const result = addLick(lick);
      if (result.ok) {
        saveMine();
        renderMine();
      }
      return result;
    },
    removeLick: (id) => {
      mine = mine.filter((l) => l.id !== id);
      saveMine();
      renderMine();
    },
    songKey: () => options.songKey,
  };
}
