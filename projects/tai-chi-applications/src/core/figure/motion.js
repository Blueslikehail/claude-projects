// Keyframes for a posture and smooth, realistic motion between them.
//
// A keyframe lists only what changes; everything else carries over from the one before:
//   label, cue          caption and which movement cue (0-based) it illustrates
//   dur                 seconds to arrive at this keyframe (first one: how long to hold)
//   L, R                feet: [right, forward, yaw, { toeUp, heelUp, lift, pitch }]
//                       metres on the ground in the posture's starting frame
//   w                   share of weight on the LEFT foot, 0..1
//   sink, face, twist, lean, gaze
//                       stance depth (m), waist yaw, chest twist on top of it,
//                       forward lean and head turn (degrees)
//   hl, hr              hands: [right, up, forward, palm, shape] relative to the chest centre;
//                       palm: "down", "forward", "in", "out", "forward-down", ...;
//                       shape: "palm" | "fist" | "hook"
//
// When one foot moves, the step is choreographed automatically: the weight shifts fully
// onto the other foot, the moving foot lifts and travels, then the weight settles.
import { lerp, lerpVec, normalize, add } from "./vec.js";
import { basis, ground, palmVector, solve, toWorld } from "./skeleton.js";

const START = {
  feet: { L: { at: [-0.15, 0], yaw: 0 }, R: { at: [0.15, 0], yaw: 0 } },
  weightLeft: 0.5, sink: 0.04, face: 0, twist: 0, lean: 0, gaze: 0,
  hands: { L: { at: [-0.24, -0.42, 0.06], palm: "in" }, R: { at: [0.24, -0.42, 0.06], palm: "in" } },
};

const footFrom = ([r, f, yaw = 0, opts = {}]) => ({ at: [r, f], yaw, ...opts });
const handFrom = ([x, y, z, palm = "in", shape = "palm"]) => ({ at: [x, y, z], palm, shape });

/** Expand compact keyframes into full poses, each inheriting from the one before. */
export function resolveKeyframes(frames, start = START) {
  let prev = structuredClone(start);
  return frames.map((k) => {
    const pose = structuredClone(prev);
    if (k.L) pose.feet.L = footFrom(k.L);
    if (k.R) pose.feet.R = footFrom(k.R);
    if (k.hl) pose.hands.L = handFrom(k.hl);
    if (k.hr) pose.hands.R = handFrom(k.hr);
    if (k.w !== undefined) pose.weightLeft = k.w;
    for (const key of ["sink", "face", "twist", "lean", "gaze"]) if (k[key] !== undefined) pose[key] = k[key];
    pose.label = k.label ?? "";
    pose.cue = k.cue ?? null;
    pose.dur = k.dur ?? 1.2;
    prev = pose;
    return pose;
  });
}

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const footMoved = (a, b) => Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) > 0.02 || (a.lift ?? 0) !== (b.lift ?? 0);

function lerpFoot(a, b, u, arc) {
  const lift = lerp(a.lift ?? 0, b.lift ?? 0, u) + arc;
  return {
    at: [lerp(a.at[0], b.at[0], u), lerp(a.at[1], b.at[1], u)],
    yaw: lerp(a.yaw ?? 0, b.yaw ?? 0, u),
    toeUp: lerp(a.toeUp ?? 0, b.toeUp ?? 0, u),
    heelUp: lerp(a.heelUp ?? 0, b.heelUp ?? 0, u),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0, u),
    lift: lift > 1e-4 ? lift : 0,
  };
}

function lerpHand(a, b, e, side) {
  const at = lerpVec(a.at, b.at, e);
  // Keep a hand passing in front of the body from going through the chest.
  if (Math.abs(at[0]) < 0.16 && at[1] > -0.38 && at[1] < 0.3 && at[2] < 0.14) at[2] = 0.14;
  const palm = normalize(add(palmVector(a.palm, side).map((v) => v * (1 - e)), palmVector(b.palm, side).map((v) => v * e)));
  return { at, palm: palm.some(Boolean) ? palm : palmVector(b.palm, side), shape: e < 0.5 ? a.shape : b.shape };
}

/** The pose a fraction `t` (0..1) of the way from keyframe a to keyframe b. */
export function interpolate(a, b, t) {
  const e = smooth(clamp01(t));
  const moved = ["L", "R"].filter((s) => footMoved(a.feet[s], b.feet[s]));
  const pose = {
    sink: lerp(a.sink, b.sink, e), face: lerp(a.face, b.face, e), twist: lerp(a.twist, b.twist, e),
    lean: lerp(a.lean, b.lean, e), gaze: lerp(a.gaze, b.gaze, e),
    hands: { L: lerpHand(a.hands.L, b.hands.L, e, "L"), R: lerpHand(a.hands.R, b.hands.R, e, "R") },
    feet: {}, weightLeft: lerp(a.weightLeft, b.weightLeft, e),
  };
  if (moved.length === 1) {
    const m = moved[0];
    const s = m === "L" ? "R" : "L";
    const onSupport = s === "L" ? 1 : 0;
    if (t < 0.3) pose.weightLeft = lerp(a.weightLeft, onSupport, smooth(t / 0.3));
    else if (t < 0.7) pose.weightLeft = onSupport;
    else pose.weightLeft = lerp(onSupport, b.weightLeft, smooth((t - 0.7) / 0.3));
    const u = smooth(clamp01((t - 0.3) / 0.4));
    const bothGrounded = !(a.feet[m].lift || b.feet[m].lift);
    pose.feet[m] = lerpFoot(a.feet[m], b.feet[m], u, bothGrounded ? Math.sin(Math.PI * u) * 0.07 : 0);
    pose.feet[s] = lerpFoot(a.feet[s], b.feet[s], e, 0);
  } else {
    for (const side of ["L", "R"]) pose.feet[side] = lerpFoot(a.feet[side], b.feet[side], e, 0);
  }
  return pose;
}

/** A playable sequence: total duration and the pose at any time. */
export function sequence(frames, { endHold = 0.8 } = {}) {
  const poses = resolveKeyframes(frames);
  const times = [];
  let t = 0;
  for (const p of poses) times.push((t += p.dur));
  const duration = t + endHold;
  return {
    poses,
    times,
    duration,
    /** Index of the keyframe being moved toward (or held) at `time`. */
    indexAt(time) {
      const i = times.findIndex((T) => time <= T);
      return i === -1 ? poses.length - 1 : i;
    },
    sample(time) {
      const i = this.indexAt(time);
      if (i === 0 || time >= times.at(-1)) return { pose: poses[i], index: i };
      const t0 = times[i - 1];
      return { pose: interpolate(poses[i - 1], poses[i], (time - t0) / (times[i] - t0)), index: i };
    },
  };
}

/** Move a solved figure: rotate by `face` degrees and stand it at ground point [right, forward]. */
export function place(joints, { at = [0, 0], face = 0 } = {}) {
  const b = basis(face);
  const origin = ground(at);
  const vec = (v) => toWorld(b, [-v[0], v[1], v[2]]);
  const out = {};
  for (const [k, v] of Object.entries(joints)) {
    if (Array.isArray(v)) out[k] = add(vec(v), origin);
    else if (k.endsWith("Frame")) out[k] = { R: vec(v.R), U: vec(v.U), F: vec(v.F) };
    else if (k.startsWith("hand")) out[k] = { ...v, palm: vec(v.palm), fingers: vec(v.fingers) };
    else out[k] = v;
  }
  return out;
}

/** Solve the pose at `time` for a sequence placed in the scene. */
export function figureAt(seq, time, placement) {
  const { pose, index } = seq.sample(time);
  const joints = solve(pose);
  return { joints: placement ? place(joints, placement) : joints, pose, index };
}
