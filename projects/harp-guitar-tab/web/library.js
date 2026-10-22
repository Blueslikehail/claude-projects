// The library: browse every lick (built-in and yours), read about the players, import tab
// you found on a website or in a book, and keep your own tabs — all in this browser.
import {
  HARP_KEYS,
  LEVELS,
  LICKS,
  PLAYERS,
  SLOT_NAMES,
  STYLES,
  STYLE_IDS,
  TAB_SITES,
  createHarp,
  importTab,
  lickLevel,
  parseLick,
  playerById,
  tabToken,
  validateLick,
} from "./core/index.js";
import { exportAll, loadTabs, newId, saveTabs } from "./store.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const link = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text ?? host(url))}</a>`;
const youtube = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const MAX_TAB_UNITS = 96 * 8; // 8 choruses of 12 bars

/** Tab as you'd read it, without rhythm: "-2 -3↓ ~-3 -4/5". */
export function displayTab(tab) {
  return parseLick(tab)
    .tokens.filter((t) => !t.rest)
    .map((t) => `${t.glide ? "~" : ""}${tabToken(t)}`)
    .join(" ");
}

/**
 * @param {{ lessons: ReturnType<import("./lesson.js").createLessons>, status: (html: string) => void,
 *           show: (view: "library" | "back") => void }} app
 */
export function createLibrary(app) {
  const filters = { style: "", player: "", level: "", slot: "", text: "", mine: false };
  let tabs = loadTabs();
  let tab = "licks";

  // ---------- tabs of the library page ----------

  function showSection(name) {
    tab = name;
    for (const btn of document.querySelectorAll("[data-lib-tab]")) {
      const on = btn.dataset.libTab === name;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-selected", String(on));
    }
    for (const id of ["licks", "players", "import", "tabs"]) $(`lib-${id}`).hidden = id !== name;
    if (name === "tabs") renderTabs();
  }
  document.querySelector(".lib-tabs").addEventListener("click", (ev) => {
    const name = ev.target.closest("[data-lib-tab]")?.dataset.libTab;
    if (name) showSection(name);
  });
  $("lib-close").addEventListener("click", () => app.show("back"));

  // ---------- licks ----------

  const styleNames = (styles) => (styles ?? []).map((s) => STYLES[s]?.name ?? s).join(", ");

  function allLicks() {
    const mine = app.lessons.mine().map((l) => ({ ...l, mine: true, styles: l.styles ?? ["shuffle", "slow", "boogie", "swamp"] }));
    return [...mine, ...LICKS];
  }

  function matches(l) {
    if (filters.mine && !l.mine) return false;
    if (filters.style && !l.styles.includes(filters.style)) return false;
    if (filters.player && l.after !== filters.player) return false;
    if (filters.slot && l.slot !== filters.slot) return false;
    if (filters.level && lickLevel(l.tab) !== Number(filters.level)) return false;
    if (filters.text) {
      const hay = `${l.name} ${l.song ?? ""} ${l.tip ?? ""} ${playerById(l.after)?.name ?? ""} ${displayTab(l.tab)}`.toLowerCase();
      if (!hay.includes(filters.text.toLowerCase())) return false;
    }
    return true;
  }

  function renderLicks() {
    const list = allLicks().filter(matches);
    $("lib-count").textContent = `${list.length} lick${list.length === 1 ? "" : "s"}`;
    $("lib-lick-list").innerHTML = list.length
      ? list
          .map((l) => {
            const player = playerById(l.after);
            const level = lickLevel(l.tab);
            return `<li class="lib-lick" data-id="${esc(l.id)}">
              <div class="lib-lick-head">
                <strong>${esc(l.name)}</strong>
                ${l.mine ? `<span class="mine-badge">★ yours${l.song ? ` · from ${esc(l.song)}` : ""}</span>` : ""}
                <span class="muted small">${esc(SLOT_NAMES[l.slot])} · ${esc(LEVELS[level])} · ${esc(styleNames(l.styles))}</span>
              </div>
              <code class="lib-tab">${esc(displayTab(l.tab))}</code>
              ${player ? `<div class="small">In the manner of <button class="link" data-player="${player.id}">${esc(player.name)}</button></div>` : ""}
              ${l.tip ? `<div class="muted small">${esc(l.tip)}</div>` : ""}
              <div class="song-actions">
                <button class="button small primary" data-act="practise">▶ Practise</button>
                <button class="button small" data-act="feature" title="A full lesson in this style that uses this lick">In a lesson</button>
                ${l.mine ? `<button class="button small" data-act="remove">Remove</button>` : ""}
              </div>
            </li>`;
          })
          .join("")
      : `<li class="muted">No licks match. Clear a filter, or import a tab of yours.</li>`;
  }

  $("lib-style").innerHTML = `<option value="">All styles</option>` + STYLE_IDS.map((id) => `<option value="${id}">${esc(STYLES[id].name)}</option>`).join("");
  $("lib-player").innerHTML =
    `<option value="">Any player</option>` +
    PLAYERS.filter((p) => LICKS.some((l) => l.after === p.id))
      .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
      .join("");
  $("lib-level").innerHTML = `<option value="">Any level</option>` + Object.entries(LEVELS).map(([n, name]) => `<option value="${n}">${esc(name)}</option>`).join("");
  $("lib-slot").innerHTML = `<option value="">Anywhere in the form</option>` + Object.entries(SLOT_NAMES).map(([s, name]) => `<option value="${s}">${esc(name)}</option>`).join("");
  for (const [id, key] of [["lib-style", "style"], ["lib-player", "player"], ["lib-level", "level"], ["lib-slot", "slot"]]) {
    $(id).addEventListener("change", (ev) => {
      filters[key] = ev.target.value;
      renderLicks();
    });
  }
  $("lib-search").addEventListener("input", (ev) => {
    filters.text = ev.target.value.trim();
    renderLicks();
  });
  $("lib-mine").addEventListener("change", (ev) => {
    filters.mine = ev.target.checked;
    renderLicks();
  });

  $("lib-lick-list").addEventListener("click", (ev) => {
    const playerId = ev.target.closest("[data-player]")?.dataset.player;
    if (playerId) return openPlayer(playerId);
    const act = ev.target.closest("[data-act]")?.dataset.act;
    const id = ev.target.closest("[data-id]")?.dataset.id;
    const lick = allLicks().find((l) => l.id === id);
    if (!act || !lick) return;
    if (act === "remove") {
      app.lessons.removeLick(id);
      renderLicks();
    } else if (act === "practise") app.lessons.practiseLick(lick, { style: filters.style });
    else if (act === "feature") app.lessons.featureLick(lick, { style: filters.style });
  });

  // ---------- players ----------

  function renderPlayers() {
    $("lib-player-list").innerHTML = PLAYERS.map((p) => {
      const licks = LICKS.filter((l) => l.after === p.id).length;
      const styles = p.styles.map((s) => `<button class="chip" data-style="${s}">${esc(STYLES[s].name)}</button>`).join("");
      const lessons = p.lessons.length
        ? `<details class="sources"><summary>Tabs and lessons (${p.lessons.length})</summary>${p.lessons.map((l) => link(l.url, `${l.title} — ${host(l.url)}`)).join("")}</details>`
        : "";
      return `<article class="player-card" id="player-${p.id}">
        <h3>${esc(p.name)} <span class="muted small">${esc(p.years)}</span></h3>
        <div class="small">${esc(p.genre)}</div>
        <div class="muted small">${esc(p.region)}${p.honors ? ` · ${esc(p.honors)}` : ""}</div>
        ${p.positions ? `<div class="small"><b>Positions:</b> ${esc(p.positions)}</div>` : ""}
        <ul class="small facts">${p.techniques.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <div class="small"><b>Listen:</b> ${p.recordings
          .map((r) => `${link(youtube(`${p.name.replace(/ \(.*\)/, "")} ${r.title}`), r.title)}${r.year ? ` (${r.year})` : ""}${r.note ? ` <span class="muted">— ${esc(r.note)}</span>` : ""}`)
          .join(" · ")}</div>
        <div class="chips">${styles}${licks ? `<button class="chip accent" data-player-licks="${p.id}">${licks} lick${licks === 1 ? "" : "s"} in this manner</button>` : ""}</div>
        ${lessons}
        <details class="sources"><summary>Sources</summary>${p.sources.map((u) => link(u)).join("")}</details>
      </article>`;
    }).join("");
    $("lib-sites").innerHTML = TAB_SITES.map((s) => `<li>${link(s.url, s.name)} <span class="muted small">· ${esc(s.notation)}</span></li>`).join("");
  }

  $("lib-player-list").addEventListener("click", (ev) => {
    const style = ev.target.closest("[data-style]")?.dataset.style;
    const who = ev.target.closest("[data-player-licks]")?.dataset.playerLicks;
    if (!style && !who) return;
    Object.assign(filters, { style: style ?? "", player: who ?? "", level: "", slot: "", text: "", mine: false });
    $("lib-style").value = filters.style;
    $("lib-player").value = filters.player;
    for (const id of ["lib-level", "lib-slot", "lib-search"]) $(id).value = "";
    $("lib-mine").checked = false;
    renderLicks();
    showSection("licks");
  });

  function openPlayer(id) {
    app.show("library");
    showSection("players");
    const card = $(`player-${id}`);
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
    card?.classList.add("flash");
    setTimeout(() => card?.classList.remove("flash"), 1600);
  }

  // ---------- import a tab ----------

  const harp = createHarp("C");
  let read = null; // last importTab result
  let editing = null; // id of the tab being edited

  $("imp-style").innerHTML = STYLE_IDS.map((id) => `<option value="${id}">${esc(STYLES[id].name)}</option>`).join("");
  $("imp-key").innerHTML = HARP_KEYS.map((k) => `<option>${k}</option>`).join("");
  $("imp-key").value = "E";
  $("imp-slot").innerHTML = Object.entries(SLOT_NAMES).map(([s, name]) => `<option value="${s}">${esc(name)}</option>`).join("");

  function readTab() {
    const notation = $("imp-notation").value || undefined;
    read = importTab($("imp-text").value, { notation });
    const units = Number($("imp-rhythm").value);
    $("imp-result").innerHTML = read.lines.length
      ? read.lines
          .map((l) => `<div class="imp-line"><code>${esc(l.tokens.join(" "))}</code>${l.skipped.length ? ` <span class="muted small">skipped: ${esc(l.skipped.join(" "))}</span>` : ""}</div>`)
          .join("")
      : `<p class="muted small">No tab found. Paste hole numbers like <code>-2 -3' 4</code>, <code>4 4+ 3"</code> or <code>(4) 5</code>.</p>`;
    $("imp-warnings").innerHTML = read.warnings.map((w) => `<li>${esc(w)}</li>`).join("");
    $("imp-lick").value = read.tokens.map((t) => `${t}:${units}`).join(" ");
    $("imp-notation-used").textContent = read.tokens.length ? `Notation: ${notationName(read.notation)}` : "";
    $("imp-next").hidden = !read.tokens.length;
    checkRhythm();
  }

  const notationName = (n) => $("imp-notation").querySelector(`option[value="${n}"]`)?.textContent ?? n;

  /** Validate the rhythm box; returns the checked tab or null. */
  function checkRhythm() {
    const text = $("imp-lick").value.trim();
    if (!text) return null;
    const check = validateLick(text, harp, { maxUnits: MAX_TAB_UNITS, pad: false });
    const msg = $("imp-check");
    msg.classList.toggle("lick-msg-error", !check.ok);
    if (!check.ok) {
      msg.textContent = check.error;
      return null;
    }
    const bars = check.units / 8;
    msg.textContent = `${parseLick(check.tab).tokens.filter((t) => !t.rest).length} notes · ${Number.isInteger(bars) ? bars : bars.toFixed(1)} bars · ${LEVELS[check.level]}${bars <= 2 ? " · short enough to save as a lick" : ""}`;
    $("imp-save-lick").disabled = bars > 2;
    return check;
  }

  $("imp-read").addEventListener("click", readTab);
  $("imp-notation").addEventListener("change", () => read && readTab());
  $("imp-rhythm").addEventListener("change", () => read && readTab());
  $("imp-lick").addEventListener("input", checkRhythm);

  function currentItem() {
    const check = checkRhythm();
    if (!check) return null;
    const name = $("imp-name").value.trim() || "My tab";
    return {
      id: editing ?? newId("tab"),
      name,
      source: $("imp-source").value.trim() || undefined,
      original: $("imp-text").value,
      tab: check.tab,
      style: $("imp-style").value,
      songKey: $("imp-key").value,
      tempo: tapTempo ?? undefined,
    };
  }

  $("imp-practise").addEventListener("click", () => {
    const item = currentItem();
    if (item) app.lessons.practiseTab(item);
  });
  $("imp-save").addEventListener("click", () => {
    const item = currentItem();
    if (!item) return;
    tabs = loadTabs();
    const i = tabs.findIndex((t) => t.id === item.id);
    if (i >= 0) tabs[i] = item;
    else tabs.push(item);
    const ok = saveTabs(tabs);
    editing = item.id;
    app.status(ok ? `Saved <b>${esc(item.name)}</b> in this browser (Library → My tabs).` : "This browser didn't let me save — use Export to keep your tabs.");
  });
  $("imp-save-lick").addEventListener("click", () => {
    const check = checkRhythm();
    if (!check) return;
    const result = app.lessons.addLick({
      name: $("imp-name").value.trim() || "Imported lick",
      song: $("imp-source").value.trim() ? host($("imp-source").value.trim()) : undefined,
      slot: $("imp-slot").value,
      tab: check.tab,
      styles: [$("imp-style").value],
    });
    app.status(result.ok ? "Added to your licks: it'll turn up in lessons of that style." : esc(result.error));
    renderLicks();
  });

  // Tap the rhythm: one tap per note, one more to end the last note. The median gap counts
  // as a quarter note; every gap is rounded to the nearest sixteenth.
  let taps = null;
  let tapTempo = null;
  function tap() {
    if (!taps) return;
    taps.push(performance.now() / 1000);
    const notes = parseLick($("imp-lick").value).tokens.filter((t) => !t.rest);
    $("imp-tap").textContent = `Tap ${Math.min(taps.length + 1, notes.length + 1)} / ${notes.length + 1}`;
    if (taps.length <= notes.length) return;
    const gaps = taps.slice(1).map((t, i) => t - taps[i]);
    const median = [...gaps].sort((a, b) => a - b)[gaps.length >> 1];
    tapTempo = Math.max(40, Math.min(200, Math.round(60 / median)));
    const units = gaps.map((g) => Math.max(0.5, Math.round((g / median) * 4) / 2));
    $("imp-lick").value = notes.map((t, i) => `${t.glide ? "~" : ""}${tabToken(t)}:${units[i]}`).join(" ");
    taps = null;
    $("imp-tap").textContent = "Tap rhythm";
    $("imp-tap").classList.remove("on");
    app.status(`Rhythm set from your taps, about ${tapTempo} bpm. Check it with ▶ Practise.`);
    checkRhythm();
  }
  $("imp-tap").addEventListener("click", () => {
    if (taps) return tap();
    const notes = parseLick($("imp-lick").value).tokens.filter((t) => !t.rest);
    if (!notes.length) return app.status("Read a tab first.");
    taps = [];
    $("imp-tap").classList.add("on");
    $("imp-tap").textContent = `Tap 1 / ${notes.length + 1}`;
    app.status("Tap this button or the space bar on every note, as you'd play it — and once more where the last note ends.");
  });
  window.addEventListener(
    "keydown",
    (ev) => {
      if (!taps || ev.key !== " " || ev.repeat) return;
      ev.preventDefault();
      ev.stopPropagation();
      tap();
    },
    { capture: true },
  );

  // ---------- my tabs ----------

  function renderTabs() {
    tabs = loadTabs();
    $("lib-tab-list").innerHTML = tabs.length
      ? tabs
          .map((t) => {
            const bars = parseLick(t.tab).units / 8;
            return `<li class="lib-lick" data-tab="${esc(t.id)}">
              <div class="lib-lick-head"><strong>${esc(t.name)}</strong>
                <span class="muted small">${esc(STYLES[t.style]?.name ?? t.style)} · ${esc(t.songKey ?? "")} · ${Math.ceil(bars)} bars${t.source ? ` · ${/^https?:/.test(t.source) ? link(t.source) : esc(t.source)}` : ""}</span></div>
              <code class="lib-tab">${esc(displayTab(t.tab))}</code>
              <div class="song-actions">
                <button class="button small primary" data-tab-act="practise">▶ Practise</button>
                <button class="button small" data-tab-act="edit">Edit</button>
                <button class="button small" data-tab-act="remove">Remove</button>
              </div>
            </li>`;
          })
          .join("")
      : `<li class="muted">No tabs yet. Paste one in <b>Import a tab</b>.</li>`;
  }

  $("lib-tab-list").addEventListener("click", (ev) => {
    const act = ev.target.closest("[data-tab-act]")?.dataset.tabAct;
    const id = ev.target.closest("[data-tab]")?.dataset.tab;
    const item = tabs.find((t) => t.id === id);
    if (!act || !item) return;
    if (act === "practise") app.lessons.practiseTab(item);
    else if (act === "remove") {
      tabs = tabs.filter((t) => t.id !== id);
      saveTabs(tabs);
      renderTabs();
    } else if (act === "edit") {
      editing = item.id;
      $("imp-text").value = item.original ?? displayTab(item.tab);
      $("imp-name").value = item.name;
      $("imp-source").value = item.source ?? "";
      $("imp-style").value = item.style;
      $("imp-key").value = item.songKey ?? "E";
      tapTempo = item.tempo ?? null;
      readTab();
      $("imp-lick").value = item.tab;
      checkRhythm();
      showSection("import");
    }
  });
  $("lib-export").addEventListener("click", exportAll);
  $("lib-import-file").addEventListener("change", async (ev) => {
    await app.lessons.importFile(ev.target);
    renderTabs();
    renderLicks();
  });
  $("imp-new").addEventListener("click", () => {
    editing = null;
    tapTempo = null;
    for (const id of ["imp-text", "imp-name", "imp-source", "imp-lick"]) $(id).value = "";
    $("imp-result").innerHTML = $("imp-warnings").innerHTML = $("imp-check").textContent = "";
    $("imp-next").hidden = true;
  });

  renderLicks();
  renderPlayers();
  showSection("licks");

  return {
    open(section) {
      app.show("library");
      if (section) showSection(section);
      renderLicks();
    },
    openPlayer,
    refresh() {
      renderLicks();
      if (tab === "tabs") renderTabs();
    },
  };
}
