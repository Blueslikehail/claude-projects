// Practice with the microphone: live tab of what you play, and play-along scoring
// against the loaded tab. Pitch tracking runs on the page from AudioWorklet chunks.
import {
  estimateOffset,
  LiveNoteTracker,
  LivePitchTracker,
  candidates,
  mapToHarp,
  meanOffset,
  noteName,
  scoreTake,
} from "./core/index.js";

const $ = (id) => document.getElementById(id);

/**
 * @param {{ media: HTMLMediaElement, harp: () => object, events: () => object[],
 *           noteEls: () => HTMLElement[], track: HTMLElement, px: () => number,
 *           rowOf: (hole:number) => number, status: (html:string) => void }} app
 */
export function createPractice(app) {
  const { media } = app;
  const s = {
    on: false,
    stream: null,
    ctx: null,
    pitch: null,
    notes: null,
    mode: "free",
    latency: 0.08, // seconds between playing a note and it being heard by the analysis
    lastFrame: null,
    free: [], // recent notes in free play
    pass: null, // current play-along pass: { start, played: [], bars: [] }
    lastT: 0,
    lastPass: null, // { targets, played, rate } of the last finished pass, for calibration
    scoredAt: 0,
    history: [],
    bar: null,
  };

  // ---------- mic ----------

  async function start() {
    if (s.on) return;
    try {
      s.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      app.status(`Microphone not available: ${err.message}. Allow mic access for this site and try again.`);
      return;
    }
    s.ctx = new AudioContext({ latencyHint: "interactive" });
    await s.ctx.audioWorklet.addModule(new URL("./mic-worklet.js", import.meta.url));
    const source = s.ctx.createMediaStreamSource(s.stream);
    const tap = new AudioWorkletNode(s.ctx, "mic-tap");
    const mute = s.ctx.createGain();
    mute.gain.value = 0; // keep the graph pulled without playing the mic back
    source.connect(tap).connect(mute).connect(s.ctx.destination);
    tap.port.onmessage = ({ data }) => onChunk(data);
    s.pitch = new LivePitchTracker(s.ctx.sampleRate);
    s.notes = new LiveNoteTracker();
    if (!$("latency").dataset.touched) {
      const est = (s.ctx.baseLatency || 0.01) + (s.ctx.outputLatency || 0.03) + 0.04;
      setLatency(Math.round(est * 100) / 100);
    }
    s.on = true;
    render();
    app.status("Mic on. Play something!");
  }

  function stop() {
    if (!s.on) return;
    s.stream.getTracks().forEach((t) => t.stop());
    s.ctx.close();
    s.on = false;
    s.lastFrame = null;
    endPass();
    render();
  }

  // ---------- analysis ----------

  function onChunk(chunk) {
    const frames = s.pitch.push(chunk);
    if (!frames.length) return;
    const streamEnd = s.pitch.time;
    const playing = !media.paused;
    const rate = playing ? media.playbackRate : 0;
    const now = media.currentTime;
    // Stream time -> media time: what was playing when the note reached your ears.
    const toMedia = (t) => now - (streamEnd - t) * rate - s.latency * rate;
    for (const frame of frames) {
      s.lastFrame = frame;
      for (const event of s.notes.push(frame)) onNote(event, playing ? toMedia : null);
    }
  }

  function onNote({ type, note }, toMedia) {
    if (type === "off") {
      if (s.bar && toMedia) s.bar.style.width = `${Math.max(4, note.duration * media.playbackRate * app.px())}px`;
      s.bar = null;
      return;
    }
    s.free.push({ pitches: [note.pitch], connected: note.connected });
    if (s.free.length > 24) s.free.shift();
    renderFree();
    if (s.mode === "along" && toMedia && s.pass) {
      const played = { time: toMedia(note.time), pitch: note.pitch };
      s.pass.played.push(played);
      s.bar = drawBar(played);
    }
  }

  const bestAction = (pitch) => candidates(app.harp(), [pitch])[0] ?? null;

  function drawBar({ time, pitch }) {
    const best = bestAction(pitch);
    const bar = document.createElement("div");
    bar.className = "played";
    bar.style.left = `${time * app.px()}px`;
    bar.style.top = `calc(var(--row) * ${best ? app.rowOf(best.center) : 10} + var(--row) - 7px)`;
    bar.title = `You: ${noteName(pitch)}${best ? ` (${best.token})` : ""}`;
    app.track.append(bar);
    s.pass.bars.push(bar);
    return bar;
  }

  // ---------- play-along passes ----------

  const timingWindow = () => Math.max(0.08, 0.16 * media.playbackRate);

  function targetsIn(pass, until) {
    return app.events().filter((e) => e.playable && e.time >= pass.start - 0.05 && e.time <= until);
  }

  function clearMarks() {
    for (const el of app.noteEls()) el?.classList.remove("hit", "wrong", "miss");
  }

  function scorePass(until) {
    const score = scoreTake(targetsIn(s.pass, until), s.pass.played, { window: timingWindow() });
    const byId = new Map(score.results.map((r) => [r.id, r.status]));
    app.events().forEach((e, i) => {
      const status = byId.get(e.id);
      const el = app.noteEls()[i];
      if (!el) return;
      el.classList.remove("hit", "wrong", "miss");
      if (status) el.classList.add(status);
    });
    return score;
  }

  function endPass() {
    if (!s.pass) return;
    const score = scorePass(s.lastT);
    if (score.total > 0 && s.pass.played.length > 0) {
      s.history.unshift({ ...score, offset: meanOffset(score), rate: media.playbackRate });
      s.history.length = Math.min(s.history.length, 6);
      s.lastPass = { targets: targetsIn(s.pass, s.lastT), played: s.pass.played, rate: media.playbackRate };
    }
    s.pass = null;
    renderAlong();
  }

  function startPass(t) {
    clearMarks();
    app.track.querySelectorAll(".played").forEach((el) => el.remove());
    s.pass = { start: t, played: [], bars: [] };
  }

  /** Called every animation frame by the player with the media time. */
  function tick(t) {
    renderLive();
    if (!s.on || s.mode !== "along") return;
    renderNext(t);
    const playing = !media.paused;
    if (s.pass && (!playing || t < s.lastT - 0.25)) endPass(); // paused, looped or seeked back
    if (playing && !s.pass) startPass(t);
    s.lastT = t;
    if (s.pass && performance.now() - s.scoredAt > 100) {
      s.scoredAt = performance.now();
      const score = scorePass(t - timingWindow());
      $("pass-score").textContent = score.total
        ? `This pass: ${score.hits}/${score.total} (${Math.round(score.accuracy * 100)}%)`
        : "Play along with the tab…";
    }
  }

  // ---------- UI ----------

  function setLatency(seconds) {
    s.latency = Math.max(0, Math.min(0.6, seconds));
    $("latency").value = Math.round(s.latency * 1000);
    $("latency-out").textContent = `${Math.round(s.latency * 1000)} ms`;
  }

  function renderLive() {
    const f = s.lastFrame;
    const voiced = s.on && f && f.midi !== null && f.rms >= 0.01;
    const level = s.on && f ? Math.min(1, f.rms * 6) : 0;
    $("live-level").style.width = `${Math.round(level * 100)}%`;
    if (!voiced) {
      $("live-token").textContent = s.on ? "·" : "–";
      $("live-note").textContent = s.on ? "listening" : "";
      $("live-cents").style.left = "50%";
      $("live-cents").hidden = true;
      return;
    }
    const pitch = Math.round(f.midi);
    const cents = Math.round((f.midi - pitch) * 100);
    const best = bestAction(pitch);
    $("live-token").textContent = best ? best.token : `?${noteName(pitch)}`;
    $("live-note").textContent = `${noteName(pitch)} ${cents >= 0 ? "+" : "−"}${Math.abs(cents)}¢`;
    $("live-cents").hidden = false;
    $("live-cents").style.left = `${50 + cents}%`;
  }

  function renderNext(t) {
    const next = app.events().find((e) => e.playable && e.time + Math.min(e.duration, 0.15) > t);
    const html = next ? `Next: <b>${next.token}</b>` : "";
    if ($("live-next").innerHTML !== html) $("live-next").innerHTML = html;
  }

  function renderFree() {
    const out = $("free-out");
    if (!s.free.length) {
      out.innerHTML = `<span class="muted">Notes you play show up here as tab.</span>`;
      return;
    }
    const mapped = mapToHarp(s.free, app.harp()).events;
    out.innerHTML = mapped
      .map((e) => `<span class="tok ${e.playable ? e.breath ?? "chord" : "bad"}">${e.token}</span>`)
      .join(" ");
  }

  function renderAlong() {
    $("pass-history").innerHTML = s.history
      .map((h) => {
        const timing =
          h.offset == null ? "" : ` · ${Math.abs(Math.round(h.offset * 1000 / h.rate))} ms ${h.offset > 0 ? "late" : "early"}`;
        return `<li>${h.hits}/${h.total} (${Math.round(h.accuracy * 100)}%) at ${Math.round(h.rate * 100)}% speed${timing}</li>`;
      })
      .join("");
    $("calibrate").disabled = !s.lastPass;
  }

  function render() {
    $("mic").textContent = s.on ? "Stop mic" : "🎤 Start mic";
    $("mic").classList.toggle("primary", !s.on);
    $("practice-body").hidden = !s.on;
    $("mode-free").classList.toggle("on", s.mode === "free");
    $("mode-along").classList.toggle("on", s.mode === "along");
    $("free-box").hidden = s.mode !== "free";
    $("along-out").hidden = s.mode !== "along";
    $("along-controls").hidden = s.mode !== "along";
    $("live-next").hidden = s.mode !== "along";
    renderFree();
    renderAlong();
    renderLive();
  }

  function setMode(mode) {
    if (mode === "along" && !media.src) {
      app.status("Load a recording (or the demo) to play along with it.");
      return;
    }
    endPass();
    clearMarks();
    s.mode = mode;
    render();
  }

  $("mic").addEventListener("click", () => (s.on ? stop() : start()));
  $("mode-free").addEventListener("click", () => setMode("free"));
  $("mode-along").addEventListener("click", () => setMode("along"));
  $("free-clear").addEventListener("click", () => {
    s.free = [];
    renderFree();
  });
  $("latency").addEventListener("input", (ev) => {
    ev.target.dataset.touched = "1";
    setLatency(Number(ev.target.value) / 1000);
  });
  $("backing").addEventListener("input", (ev) => (media.volume = Number(ev.target.value)));
  $("calibrate").addEventListener("click", () => {
    const { targets, played, rate } = s.lastPass ?? {};
    const offset = s.lastPass && estimateOffset(targets, played);
    if (offset == null) {
      app.status("Couldn't match your notes to the tab in the last pass — play the same notes and try again.");
      return;
    }
    $("latency").dataset.touched = "1";
    setLatency(s.latency + offset / rate);
    app.status(`Mic delay set to ${Math.round(s.latency * 1000)} ms from your last pass. Play it again!`);
  });

  setLatency(s.latency);
  render();

  return {
    tick,
    toggle: () => (s.on ? stop() : start()),
    start,
    get on() {
      return s.on;
    },
    /** The roll was re-rendered: drop bars and marks that pointed at old elements. */
    rollChanged() {
      if (s.pass) startPass(media.currentTime);
    },
    harpChanged: renderFree,
  };
}
