import { test } from "node:test";
import assert from "node:assert/strict";
import { POSTURES, POSES, APPLICATION_POSES, BONES, BODY, solve, sequence, figureAt, place, resolveKeyframes } from "../src/core/index.js";
import { add, dist, dot, normalize, sub } from "../src/core/figure/vec.js";
import { ground, toWorld, basis } from "../src/core/figure/skeleton.js";

const allSequences = () => [
  ...Object.entries(POSES).map(([id, frames]) => [id, frames]),
  ...Object.entries(APPLICATION_POSES).flatMap(([id, a]) => [[`${id}/attacker`, a.attacker.frames], [`${id}/defender`, a.defender.frames]]),
];

function points(J) {
  return Object.entries(J).filter(([, v]) => Array.isArray(v));
}

test("every posture has 3D keyframes with valid cue numbers", () => {
  for (const p of POSTURES) {
    assert.ok(POSES[p.id]?.length >= 2, `${p.id} needs at least 2 keyframes`);
    for (const k of POSES[p.id]) {
      for (const c of [k.cue ?? []].flat()) assert.ok(c >= 0 && c < p.cues.length, `${p.id} "${k.label}": cue ${c} out of range`);
    }
  }
  assert.deepEqual(Object.keys(POSES).filter((id) => !POSTURES.some((p) => p.id === id)), []);
});

test("application poses refer to real applications", () => {
  const ids = new Set(POSTURES.flatMap((p) => p.applications.map((a) => a.id)));
  for (const id of Object.keys(APPLICATION_POSES)) assert.ok(ids.has(id), id);
});

test("bones keep their length and nothing is NaN, through every transition", () => {
  for (const [id, frames] of allSequences()) {
    const seq = sequence(frames);
    for (let t = 0; t <= seq.duration; t += 0.1) {
      const { joints: J } = figureAt(seq, t);
      for (const [name, v] of points(J)) assert.ok(v.every(Number.isFinite), `${id} t=${t.toFixed(1)} ${name} is NaN`);
      for (const [a, b, len] of BONES) assert.ok(Math.abs(dist(J[a], J[b]) - len) < 1e-3, `${id} ${a}-${b}`);
    }
  }
});

test("keyframes are reachable: planted feet stay put and hands reach their targets", () => {
  for (const [id, frames] of allSequences()) {
    for (const pose of resolveKeyframes(frames)) {
      const J = solve(pose);
      for (const s of ["L", "R"]) {
        const foot = pose.feet[s];
        const g = ground(foot.at);
        const err = Math.hypot(J[`ankle${s}`][0] - g[0], J[`ankle${s}`][2] - g[2]);
        assert.ok(err < 0.01, `${id} "${pose.label}": ${s} foot off its mark by ${(err * 100).toFixed(1)} cm`);
        const target = add(J.chest, toWorld(J.chestFrame, pose.hands[s].at));
        const herr = dist(J[`wrist${s}`], target);
        assert.ok(herr < 0.02, `${id} "${pose.label}": ${s} hand can't reach (${(herr * 100).toFixed(1)} cm short)`);
      }
    }
  }
});

test("tai chi shape: elbows sink below the shoulders, knees bend forward, head over pelvis", () => {
  const raisedArms = new Set(["white-crane", "fan-through-back", "fair-lady-shuttles", "cross-hands", "separate-right-foot", "turn-left-heel", "golden-rooster"]);
  for (const [id, frames] of allSequences()) {
    for (const pose of resolveKeyframes(frames)) {
      const J = solve(pose);
      for (const s of ["L", "R"]) {
        if (!raisedArms.has(id)) assert.ok(J[`elbow${s}`][1] <= J[`shoulder${s}`][1] + 0.03, `${id} "${pose.label}": ${s} elbow above shoulder`);
        const mid = [(J[`hip${s}`][0] + J[`ankle${s}`][0]) / 2, 0, (J[`hip${s}`][2] + J[`ankle${s}`][2]) / 2];
        const footDir = normalize(sub(J[`toe${s}`], J[`heel${s}`]).map((v, i) => (i === 1 ? 0 : v)));
        const bend = dot(sub(J[`knee${s}`], mid).map((v, i) => (i === 1 ? 0 : v)), footDir);
        assert.ok(bend > -0.02, `${id} "${pose.label}": ${s} knee bends backward`);
      }
      assert.ok(J.head[1] > J.pelvis[1] + 0.4, `${id} "${pose.label}": head too low`);
      assert.ok(J.pelvis[1] > 0.4, `${id} "${pose.label}": pelvis too low`);
    }
  }
});

test("a step shifts the weight onto the other foot before the foot lifts", () => {
  const seq = sequence([{ label: "a" , dur: 1 }, { L: [-0.12, 0.55, 0], w: 0.5, dur: 1 }]);
  const early = figureAt(seq, 1.0 + 0.3).joints; // weight on the right, left foot not yet moving
  const mid = figureAt(seq, 1.5).joints; // left foot in the air
  assert.ok(Math.abs(early.pelvis[0] - early.ankleR[0]) < Math.abs(early.pelvis[0] - early.ankleL[0]));
  assert.ok(mid.ankleL[1] > BODY.ankle + 0.03, "foot lifts mid-step");
  assert.ok(Math.abs(mid.ankleR[1] - BODY.ankle) < 1e-6, "support foot stays down");
});

test("place rotates and moves a figure", () => {
  const J = solve(resolveKeyframes([{}])[0]);
  const P = place(J, { at: [0, 1], face: 180 });
  assert.ok(Math.abs(P.pelvis[2] - (1 - J.pelvis[2])) < 1e-9);
  assert.ok(Math.abs(P.pelvis[1] - J.pelvis[1]) < 1e-9);
  assert.ok(dot(P.chestFrame.F, [0, 0, -1]) > 0.99, "faces back toward the origin");
  assert.ok(Math.abs(dot(basis(90).F, toWorld(basis(0), [1, 0, 0]))) > 0.99, "yaw +90 faces the figure's right");
});
