// The lesson panel: choose key, level, tempo and length; generate a 12-bar blues lesson.
import { HARP_KEYS, LEVELS, harpForSong } from "./core/index.js";

const $ = (id) => document.getElementById(id);

/** @param {{ loadLesson: (lesson, full: Uint8Array, backing: Uint8Array) => void, status: (html:string) => void }} app */
export function createLessons(app) {
  const options = { songKey: "E", level: 2, tempo: 80, choruses: 1, seed: newSeed() };
  let worker = null;

  function newSeed() {
    return Math.floor(Math.random() * 1e9);
  }

  function generate() {
    worker?.terminate();
    worker = new Worker(new URL("./lesson-worker.js", import.meta.url), { type: "module" });
    app.status("Writing your lesson…");
    worker.onmessage = ({ data }) => {
      if (data.error) app.status(`Could not make the lesson: ${data.error}`);
      else {
        app.loadLesson(data.lesson, data.full, data.backing);
        renderLicks(data.lesson);
      }
    };
    worker.postMessage({ ...options });
  }

  function renderLicks(lesson) {
    $("lesson-licks").innerHTML = lesson.licks
      .map((l) => `<li><span class="muted">Bars ${(l.bar % 12) + 1}–${(l.bar % 12) + 2}</span> ${l.name} <span class="muted">· ${LEVELS[l.level]}</span></li>`)
      .join("");
  }

  function updateHint() {
    $("lesson-harp").textContent = `Use an ${harpForSong(options.songKey, 2)} harp`.replace(/^Use an ([^AEF])/, "Use a $1");
  }

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
  updateHint();

  return { generate };
}
