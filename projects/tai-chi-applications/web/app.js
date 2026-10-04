import {
  ENERGIES,
  ATTACKS,
  FORMS,
  getForm,
  formSteps,
  formApplications,
  GRADES,
  cardsFor,
  review,
  dueCards,
  studyStats,
  attacksInForm,
  quizQuestion,
  partnerDrill,
  POSES,
  APPLICATION_POSES,
  sequence,
} from "./core/index.js";
import { createViewer } from "./figure3d.js";

// ---------- storage (per device; the app works without it) ----------
const STORE_KEY = "tai-chi-applications";
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) ?? {};
  } catch {
    return {};
  }
}
const saved = load();
const state = {
  formId: FORMS.some((f) => f.id === saved.formId) ? saved.formId : FORMS[0].id,
  step: saved.step ?? 0,
  mode: saved.mode ?? "practice",
  showApps: saved.showApps ?? true,
  timer: saved.timer ?? 0,
  flip: saved.flip ?? false,
  cards: saved.cards ?? {}, // card id -> SRS state, shared by all forms
  newDay: saved.newDay ?? { date: "", count: 0 }, // new cards started today
  showFigure: saved.showFigure ?? true,
  mirror: saved.mirror ?? false,
  view: saved.view ?? "front",
  speed: saved.speed ?? 1,
};
const NEW_PER_DAY = 10;
function save() {
  try {
    const { formId, step, mode, showApps, timer, flip, cards, newDay, showFigure, mirror, view, speed } = state;
    localStorage.setItem(STORE_KEY, JSON.stringify({ formId, step, mode, showApps, timer, flip, cards, newDay, showFigure, mirror, view, speed }));
  } catch {
    /* storage unavailable: keep going in memory */
  }
}

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const form = () => getForm(state.formId);
const steps = () => formSteps(form());

function energyChips(ids) {
  return `<ul class="energies">${ids
    .map((id) => {
      const e = ENERGIES[id];
      return `<li class="energy" title="${esc(e.summary)}"><span class="hanzi">${e.hanzi}</span>${esc(e.english)}</li>`;
    })
    .join("")}</ul>`;
}

function appCard(app) {
  return `<div class="app-card">
    <span class="attack-tag">${esc(ATTACKS[app.attack].label)}</span>
    <p class="scenario">${esc(app.scenario)}</p>
    <p class="response">${esc(app.response)}</p>
    <dl>
      <dt>Key point</dt><dd>${esc(app.keyPoint)}</dd>
      ${app.counter ? `<dt>Counter</dt><dd>${esc(app.counter)}</dd>` : ""}
    </dl>
    ${watchButton(app.id)}
  </div>`;
}

const watchButton = (appId) =>
  APPLICATION_POSES[appId] && globalThis.THREE
    ? `<button type="button" class="watch-btn" data-watch="${esc(appId)}">Watch in 3D</button>`
    : "";

// ---------- 3D viewer controls (shared by the practice figure and the application sheet) ----------
function viewerBar(bar, viewer, { onSeek } = {}) {
  bar.innerHTML = `
    <button type="button" class="vb-btn vb-play" data-act="play">Pause</button>
    <div class="vb-steps" data-steps></div>
    <div class="vb-group" role="group" aria-label="Speed">
      <button type="button" class="vb-btn" data-speed="0.5">½×</button>
      <button type="button" class="vb-btn" data-speed="1">1×</button>
    </div>
    <div class="vb-group" role="group" aria-label="View">
      <button type="button" class="vb-btn" data-cam="front">Front</button>
      <button type="button" class="vb-btn" data-cam="side">Side</button>
      <button type="button" class="vb-btn" data-cam="back">Back</button>
    </div>
    <button type="button" class="vb-btn" data-act="mirror" title="Flip left and right, like following in a mirror">Mirror</button>`;
  let seq = null;
  const sync = () => {
    bar.querySelector("[data-act=play]").textContent = viewer.playing ? "Pause" : "Play";
    for (const b of bar.querySelectorAll("[data-speed]")) b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === state.speed));
    for (const b of bar.querySelectorAll("[data-cam]")) b.setAttribute("aria-pressed", String(b.dataset.cam === state.view));
    bar.querySelector("[data-act=mirror]").setAttribute("aria-pressed", String(state.mirror));
  };
  viewer.setSpeed(state.speed);
  viewer.setView(state.view);
  viewer.setMirror(state.mirror);
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.act === "play") viewer.playing ? viewer.pause() : viewer.play();
    if (b.dataset.act === "mirror") {
      state.mirror = !state.mirror;
      viewer.setMirror(state.mirror);
    }
    if (b.dataset.speed) {
      state.speed = Number(b.dataset.speed);
      viewer.setSpeed(state.speed);
    }
    if (b.dataset.cam) {
      state.view = b.dataset.cam;
      viewer.setView(state.view);
    }
    if (b.dataset.seek !== undefined && seq) {
      viewer.pause();
      viewer.seek(seq.times[Number(b.dataset.seek)]);
      onSeek?.();
    }
    save();
    sync();
  });
  sync();
  return {
    setSequence(s) {
      seq = s;
      bar.querySelector("[data-steps]").innerHTML = s.poses
        .map((p, i) => `<button type="button" class="vb-dot" data-seek="${i}" title="${esc(p.label)}"><span>${i + 1}</span></button>`)
        .join("");
      sync();
    },
    update(index) {
      bar.querySelectorAll("[data-seek]").forEach((b, i) => b.toggleAttribute("data-current", i === index));
      bar.querySelector("[data-act=play]").textContent = viewer.playing ? "Pause" : "Play";
    },
  };
}

// ---------- form + mode ----------
function renderFormSelect() {
  $("#form-select").innerHTML = FORMS.map(
    (f) => `<option value="${f.id}" ${f.id === state.formId ? "selected" : ""}>${esc(f.name)}</option>`,
  ).join("");
}
$("#form-select").addEventListener("change", (e) => {
  state.formId = e.target.value;
  state.step = 0;
  save();
  renderAll();
});

const MODES = ["practice", "study", "quiz", "partner"];
function setMode(mode) {
  if (!MODES.includes(mode)) mode = "practice";
  state.mode = mode;
  save();
  for (const btn of document.querySelectorAll("[data-mode]")) {
    if (btn.dataset.mode === mode) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  }
  for (const view of document.querySelectorAll("[data-view]")) view.hidden = view.dataset.view !== mode;
  if (mode !== "practice") stopTimer();
  else startTimer();
  if (location.hash.slice(1) !== mode) history.replaceState(null, "", `#${mode}`);
}
for (const btn of document.querySelectorAll("[data-mode]")) btn.addEventListener("click", () => setMode(btn.dataset.mode));
window.addEventListener("hashchange", () => setMode(location.hash.slice(1)));

// ---------- practice ----------
function renderStepList() {
  $("#step-list").innerHTML = steps()
    .map(
      (s, i) => `<li><button type="button" data-step="${i}" ${i === state.step ? 'aria-current="step"' : ""}>
        <span class="num">${s.number}</span><span class="label">${esc(s.posture.name)}</span></button></li>`,
    )
    .join("");
}
$("#step-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-step]");
  if (btn) goTo(Number(btn.dataset.step));
});

function renderPosture() {
  const list = steps();
  state.step = Math.min(Math.max(0, state.step), list.length - 1);
  const { number, note, posture: p } = list[state.step];
  $("#step-count").textContent = `Step ${number} of ${list.length} · ${form().fullName ?? form().name}`;
  $("#posture-scroll").textContent = p.hanzi;
  $("#posture-head").innerHTML = `
      ${note ? `<p class="note">${esc(note)}</p>` : ""}
      <h1>${esc(p.name)}</h1>
      <p class="pinyin" lang="zh-Latn">${esc(p.pinyin)}</p>
      ${energyChips(p.energies)}`;
  $("#posture-text").innerHTML = `
      <p class="fig-caption" id="fig-caption" ${figure ? "" : "hidden"}></p>
      <ol class="cues">${p.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>
      <p class="principle">${esc(p.principle)}</p>`;
  $("#posture-apps").innerHTML = `
      <div ${state.showApps ? "" : "hidden"}>
        <h2 class="apps-title">Applications</h2>
        <div class="apps">${p.applications.map(appCard).join("")}</div>
      </div>`;
  showFigure(p);
  $("#prev-step").disabled = state.step === 0;
  $("#next-step").disabled = state.step === list.length - 1;
  for (const btn of document.querySelectorAll("#step-list [data-step]")) {
    const current = Number(btn.dataset.step) === state.step;
    if (current) {
      btn.setAttribute("aria-current", "step");
      revealInRail(btn);
    } else btn.removeAttribute("aria-current");
  }
}

/** Scroll the rail (not the page) so the current step is visible. */
function revealInRail(btn) {
  const rail = $(".rail");
  const r = rail.getBoundingClientRect();
  const b = btn.getBoundingClientRect();
  if (b.top < r.top) rail.scrollTop -= r.top - b.top + 8;
  else if (b.bottom > r.bottom) rail.scrollTop += b.bottom - r.bottom + 8;
  if (b.left < r.left) rail.scrollLeft -= r.left - b.left + 8;
  else if (b.right > r.right) rail.scrollLeft += b.right - r.right + 8;
}

function goTo(i) {
  const max = steps().length - 1;
  const next = Math.min(Math.max(0, i), max);
  if (next === state.step && $("#posture").innerHTML) return;
  state.step = next;
  save();
  renderPosture();
  restartTimer();
  if ($("#stage").getBoundingClientRect().top < 0) window.scrollTo({ top: 0 });
}
$("#prev-step").addEventListener("click", () => goTo(state.step - 1));
$("#next-step").addEventListener("click", () => goTo(state.step + 1));
document.addEventListener("keydown", (e) => {
  if (state.mode !== "practice" || e.target.closest("select, input, textarea")) return;
  if (e.key === "ArrowRight") goTo(state.step + 1);
  if (e.key === "ArrowLeft") goTo(state.step - 1);
});

// Swipe left/right on the stage to change step.
let swipe = null;
$("#stage").addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") swipe = { x: e.clientX, y: e.clientY };
});
$("#stage").addEventListener("pointerup", (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 50) goTo(state.step + (dx < 0 ? 1 : -1));
});
$("#stage").addEventListener("pointercancel", () => (swipe = null));

// ---------- practice figure ----------
let figure = null; // { viewer, bar, seq, postureId }
const figureWrap = $("#figure-wrap");

function showFigure(p) {
  const on = state.showFigure && POSES[p.id];
  figureWrap.hidden = !on;
  $("#posture-split").classList.toggle("with-figure", Boolean(on));
  if (!on) return figure?.viewer?.pause();
  if (!figure) {
    const viewer = createViewer($("#viewer"), { onFrame: onFigureFrame });
    if (!viewer) {
      figure = { viewer: null };
      return;
    }
    figure = { viewer, bar: viewerBar($("#viewer-bar"), viewer) };
  }
  if (!figure.viewer) return;
  if (figure.postureId !== p.id) {
    figure.postureId = p.id;
    figure.seq = sequence(POSES[p.id]);
    figure.viewer.setScene([{ seq: figure.seq, color: "jade" }]);
    figure.bar.setSequence(figure.seq);
    figure.lastIndex = -1;
  }
  figure.viewer.play();
}

function onFigureFrame({ figures }) {
  const f = figures[0];
  if (!f || f.index === figure.lastIndex) return;
  figure.lastIndex = f.index;
  const key = figure.seq.poses[f.index];
  const cues = [key.cue ?? []].flat();
  document.querySelectorAll("#posture-text .cues li").forEach((li, i) => li.classList.toggle("active", cues.includes(i)));
  const cap = $("#fig-caption");
  if (cap) {
    cap.hidden = false;
    cap.textContent = `${f.index + 1}/${figure.seq.poses.length} · ${key.label}`;
  }
  figure.bar.update(f.index);
}

const figureBtn = $("#toggle-figure");
figureBtn.addEventListener("click", () => {
  state.showFigure = !state.showFigure;
  save();
  figureBtn.setAttribute("aria-pressed", String(state.showFigure));
  showFigure(steps()[state.step].posture);
});

// ---------- application sheet (two figures) ----------
let sheet = null;
function openSheet(appId) {
  const app = formApplications(form()).find((a) => a.id === appId) ?? null;
  const data = APPLICATION_POSES[appId];
  if (!app || !data) return;
  if (figure?.viewer) figure.viewer.pause();
  $("#app-sheet").hidden = false;
  $("#sheet-kind").textContent = `${app.posture.name} · ${ATTACKS[app.attack].label}`;
  $("#sheet-title").textContent = app.scenario;
  const defender = sequence(data.defender.frames);
  const attacker = sequence(data.attacker.frames);
  const viewer = createViewer($("#sheet-viewer"), {
    view: "side",
    onFrame: ({ figures }) => {
      const [d, a] = figures;
      $("#sheet-defender").textContent = d.seq.poses[d.index].label;
      $("#sheet-attacker").textContent = a.seq.poses[a.index].label;
      sheet.bar.update(d.index);
    },
  });
  if (!viewer) return;
  const prevView = state.view;
  state.view = "side";
  sheet = { viewer, bar: viewerBar($("#sheet-bar"), viewer), prevView };
  viewer.setScene([
    { seq: defender, color: "jade" },
    { seq: attacker, color: "seal", placement: { at: data.attacker.at, face: 180 } },
  ]);
  sheet.bar.setSequence(defender);
  $("#sheet-close").focus();
}
function closeSheet() {
  if (!sheet) return;
  sheet.viewer.dispose();
  state.view = sheet.prevView;
  sheet = null;
  $("#app-sheet").hidden = true;
  $("#sheet-bar").innerHTML = "";
  if (figure?.viewer && state.mode === "practice") figure.viewer.play();
}
$("#sheet-close").addEventListener("click", closeSheet);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeSheet());
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-watch]");
  if (b) openSheet(b.dataset.watch);
});

const appsBtn = $("#toggle-apps");
appsBtn.addEventListener("click", () => {
  state.showApps = !state.showApps;
  save();
  appsBtn.setAttribute("aria-pressed", String(state.showApps));
  renderPosture();
});

// Auto-advance
let timerId = null;
function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}
function startTimer() {
  stopTimer();
  if (state.timer > 0 && state.mode === "practice") {
    timerId = setInterval(() => {
      if (state.step >= steps().length - 1) return stopTimer();
      goTo(state.step + 1);
    }, state.timer * 1000);
  }
}
const restartTimer = () => timerId && startTimer();
$("#timer-select").addEventListener("change", (e) => {
  state.timer = Number(e.target.value);
  save();
  startTimer();
});

// Keep the screen on while practising (if the browser allows it).
let wakeLock = null;
let wantWake = false;
const wakeBtn = $("#toggle-wake");
async function acquireWake() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      if (!wantWake) wakeBtn.setAttribute("aria-pressed", "false");
    });
    return true;
  } catch {
    return false;
  }
}
wakeBtn.addEventListener("click", async () => {
  wantWake = !wantWake;
  if (wantWake) {
    const ok = "wakeLock" in navigator && (await acquireWake());
    if (!ok) {
      wantWake = false;
      wakeBtn.textContent = "Screen lock not available";
      setTimeout(() => (wakeBtn.textContent = "Keep screen on"), 2500);
    }
  } else {
    await wakeLock?.release();
  }
  wakeBtn.setAttribute("aria-pressed", String(wantWake));
});
document.addEventListener("visibilitychange", () => {
  if (wantWake && document.visibilityState === "visible" && !wakeLock) acquireWake();
});

// ---------- study ----------
let studyQueue = [];
let revealed = false;
const DAY = 86400000;

function intervalLabel(s) {
  const ms = s.due - Date.now();
  if (ms < 60 * 60 * 1000) return `${Math.max(1, Math.round(ms / 60000))} min`;
  const days = Math.round(ms / DAY);
  return days === 1 ? "1 day" : `${days} days`;
}

function newLeftToday() {
  const today = new Date().toDateString();
  if (state.newDay.date !== today) state.newDay = { date: today, count: 0 };
  return Math.max(0, NEW_PER_DAY - state.newDay.count);
}

function renderStudy() {
  const cards = cardsFor(formApplications(form()));
  const st = studyStats(cards, state.cards);
  if (studyQueue.length === 0) studyQueue = dueCards(cards, state.cards, { newLimit: newLeftToday() });
  const newQueued = studyQueue.filter((c) => !state.cards[c.id]).length;
  $("#study-stats").innerHTML = `<strong>${st.due}</strong> due · <strong>${newQueued}</strong> new today · <strong>${st.learned}</strong> learned of ${st.total}`;
  const card = studyQueue[0];
  const box = $("#study-card");
  if (!card) {
    box.innerHTML = `<div class="empty"><strong>All caught up</strong>Nothing is due right now. New cards unlock tomorrow, or try the Quiz.</div>`;
    return;
  }
  const { app, kind } = card;
  const p = app.posture;
  const front =
    kind === "forward"
      ? `<p class="kind">Posture to application</p>
         <h2 class="q-name">${esc(p.name)}<span class="hanzi" lang="zh">${esc(p.hanzi)}</span></h2>
         <p class="prompt">Against: ${esc(ATTACKS[app.attack].label.toLowerCase())}. ${esc(app.scenario)}</p>`
      : `<p class="kind">Scenario to posture</p>
         <p class="prompt">${esc(app.scenario)}</p>
         <p class="key">Which posture answers this?</p>`;
  const back =
    kind === "forward"
      ? `<p>${esc(app.response)}</p>`
      : `<h2 class="q-name">${esc(p.name)}<span class="hanzi" lang="zh">${esc(p.hanzi)}</span></h2><p>${esc(app.response)}</p>`;
  const now = Date.now();
  const preview = (g) => intervalLabel(review(state.cards[card.id], g, now));
  box.innerHTML = `${front}
    ${
      revealed
        ? `<div class="answer">${back}<p class="key"><strong>Key point:</strong> ${esc(app.keyPoint)}</p>
           ${energyChips(app.energies)}</div>
           <div class="grades">
             <button type="button" class="again" data-grade="again">Again<small>${preview(GRADES.again)}</small></button>
             <button type="button" data-grade="hard">Hard<small>${preview(GRADES.hard)}</small></button>
             <button type="button" class="good" data-grade="good">Good<small>${preview(GRADES.good)}</small></button>
             <button type="button" data-grade="easy">Easy<small>${preview(GRADES.easy)}</small></button>
           </div>`
        : `<button type="button" class="nav-btn primary" id="show-answer">Show answer</button>`
    }`;
}
$("#study-card").addEventListener("click", (e) => {
  if (e.target.closest("#show-answer")) {
    revealed = true;
    renderStudy();
    return;
  }
  const g = e.target.closest("[data-grade]");
  if (!g) return;
  const card = studyQueue.shift();
  if (!state.cards[card.id]) {
    newLeftToday();
    state.newDay.count++;
  }
  const next = review(state.cards[card.id], GRADES[g.dataset.grade]);
  state.cards[card.id] = next;
  if (g.dataset.grade === "again") studyQueue.push(card); // see it again this session
  save();
  revealed = false;
  renderStudy();
});
$("#reset-study").addEventListener("click", () => ($("#reset-confirm").hidden = false));
$("#reset-no").addEventListener("click", () => ($("#reset-confirm").hidden = true));
$("#reset-yes").addEventListener("click", () => {
  state.cards = {};
  studyQueue = [];
  revealed = false;
  save();
  $("#reset-confirm").hidden = true;
  renderStudy();
});

// ---------- quiz ----------
const quiz = { attack: "", question: null, picked: null, right: 0, answered: 0, streak: 0 };

function attackOptions() {
  return `<option value="">Any attack</option>${attacksInForm(form())
    .map((a) => `<option value="${a.id}">${esc(a.label)} (${a.count})</option>`)
    .join("")}`;
}

function newQuestion() {
  quiz.question = quizQuestion(form(), { attack: quiz.attack || null });
  quiz.picked = null;
  renderQuiz();
}

function renderQuiz() {
  const q = quiz.question;
  $("#quiz-score").innerHTML = quiz.answered
    ? `<strong>${quiz.right}</strong> of ${quiz.answered} right · streak <strong>${quiz.streak}</strong>`
    : "Pick the posture that answers the attack.";
  const done = quiz.picked !== null;
  const right = quiz.picked === q.answer;
  $("#quiz-body").innerHTML = `<div class="card">
      <p class="kind">${esc(q.attack.label)}</p>
      <p class="prompt">${esc(q.app.scenario)}</p>
      <div class="options">${q.options
        .map((p) => {
          const cls = done && p.id === q.answer ? "right" : done && p.id === quiz.picked ? "wrong" : "";
          return `<button type="button" class="option ${cls}" data-pick="${p.id}" ${done ? "disabled" : ""}>
            <span class="o-name">${esc(p.name)}</span><span class="o-hanzi" lang="zh">${esc(p.hanzi)} · ${esc(p.pinyin)}</span></button>`;
        })
        .join("")}</div>
      ${
        done
          ? `<div class="answer">
              <p class="verdict ${right ? "right" : "wrong"}">${right ? "Right" : `It's ${esc(q.app.posture.name)}`}</p>
              <p>${esc(q.app.response)}</p>
              <p class="key"><strong>Key point:</strong> ${esc(q.app.keyPoint)}</p>
            </div>
            <button type="button" class="nav-btn primary" id="next-question">Next question <span aria-hidden="true">→</span></button>`
          : ""
      }
    </div>`;
}
$("#quiz-body").addEventListener("click", (e) => {
  if (e.target.closest("#next-question")) return newQuestion();
  const opt = e.target.closest("[data-pick]");
  if (!opt || quiz.picked !== null) return;
  quiz.picked = opt.dataset.pick;
  quiz.answered++;
  if (quiz.picked === quiz.question.answer) {
    quiz.right++;
    quiz.streak++;
  } else quiz.streak = 0;
  renderQuiz();
});
$("#quiz-attack").addEventListener("change", (e) => {
  quiz.attack = e.target.value;
  newQuestion();
});

// ---------- partner ----------
const partner = { attack: "", drill: null, revealed: false };

function newDrill() {
  partner.drill = partnerDrill(form(), { attack: partner.attack || null, exclude: partner.drill?.app.id });
  partner.revealed = false;
  renderPartner();
}

function renderPartner() {
  const { attacker, defender } = partner.drill;
  const p = defender.posture;
  $("#partner-roles").innerHTML = `
    <div class="role attacker ${state.flip ? "flipped" : ""}">
      <h2>Attacker</h2>
      <p class="big">${esc(attacker.attack)}</p>
      <p>${esc(attacker.scenario)}</p>
      <p class="key">${esc(attacker.instruction)}</p>
    </div>
    <div class="role defender">
      <h2>Defender</h2>
      <p class="big">${esc(p.name)} <span class="hanzi" lang="zh">${esc(p.hanzi)}</span></p>
      ${
        partner.revealed
          ? `<p>${esc(defender.response)}</p><p class="key"><strong>Key point:</strong> ${esc(defender.keyPoint)}</p>`
          : `<button type="button" class="reveal" id="reveal-response">Show the response</button>`
      }
      ${partner.revealed ? watchButton(partner.drill.app.id) : ""}
    </div>`;
}
$("#partner-roles").addEventListener("click", (e) => {
  if (e.target.closest("#reveal-response")) {
    partner.revealed = true;
    renderPartner();
  }
});
$("#next-drill").addEventListener("click", newDrill);
$("#partner-attack").addEventListener("change", (e) => {
  partner.attack = e.target.value;
  newDrill();
});
const flipBtn = $("#flip-attacker");
flipBtn.addEventListener("click", () => {
  state.flip = !state.flip;
  save();
  flipBtn.setAttribute("aria-pressed", String(state.flip));
  renderPartner();
});

// ---------- boot ----------
function renderAll() {
  renderFormSelect();
  renderStepList();
  renderPosture();
  studyQueue = [];
  revealed = false;
  renderStudy();
  $("#quiz-attack").innerHTML = attackOptions();
  $("#partner-attack").innerHTML = attackOptions();
  quiz.attack = partner.attack = "";
  newQuestion();
  partner.drill = null;
  newDrill();
}

appsBtn.setAttribute("aria-pressed", String(state.showApps));
figureBtn.setAttribute("aria-pressed", String(state.showFigure));
flipBtn.setAttribute("aria-pressed", String(state.flip));
$("#timer-select").value = String(state.timer);
renderAll();
setMode(location.hash.slice(1) || state.mode);
