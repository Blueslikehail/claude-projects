// Turns a pose described the way a teacher would (where the feet are, how the weight is
// split, which way the waist faces, where the hands are) into 3D joint positions.
// Knees and elbows come from two-bone IK, so feet stay planted and joints bend naturally.
//
// Coordinates: metres, y up. The figure starts facing +z. Authoring uses a body frame of
// [right, up, forward]; yaw is in degrees, positive turns to the figure's right.
import { add, sub, scale, dot, cross, length, normalize, lerp, DEG } from "./vec.js";

/** Body proportions for a ~1.70 m person. */
export const BODY = {
  ankle: 0.08, shin: 0.43, thigh: 0.45, hipHalf: 0.09,
  spine: 0.3, neck: 0.18, head: 0.12, shoulderHalf: 0.19, shoulderUp: 0.14,
  upperArm: 0.3, forearm: 0.26, heel: 0.05, toe: 0.17,
};
export const STAND_HIP = BODY.ankle + BODY.shin + BODY.thigh;

const UP = [0, 1, 0];

/** Right, up and forward unit vectors for a yaw angle (degrees, positive = turn right). */
export function basis(yawDeg, leanDeg = 0) {
  const y = yawDeg * DEG;
  const F0 = [-Math.sin(y), 0, Math.cos(y)];
  const R = [-Math.cos(y), 0, -Math.sin(y)];
  const l = leanDeg * DEG;
  const U = add(scale(UP, Math.cos(l)), scale(F0, Math.sin(l)));
  const F = add(scale(F0, Math.cos(l)), scale(UP, -Math.sin(l)));
  return { R, U, F };
}

/** A body-frame offset [right, up, forward] in world space. */
export const toWorld = (b, [x, y, z]) => add(add(scale(b.R, x), scale(b.U, y)), scale(b.F, z));

/** A ground position [right, forward] (in the starting frame) as a world point. */
export const ground = ([r, f], y = 0) => [-r, y, f];

/**
 * Two-bone IK. Returns the middle joint and the (possibly clamped) end position.
 * `pole` is the direction the middle joint should bend toward.
 */
export function twoBone(root, target, l1, l2, pole) {
  let d = sub(target, root);
  let dl = length(d);
  const maxReach = l1 + l2 - 1e-4;
  const minReach = Math.abs(l1 - l2) + 1e-4;
  const dir = dl < 1e-9 ? [0, -1, 0] : scale(d, 1 / dl);
  dl = Math.min(Math.max(dl, minReach), maxReach);
  const end = add(root, scale(dir, dl));
  const cosA = (l1 * l1 + dl * dl - l2 * l2) / (2 * l1 * dl);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  let perp = sub(pole, scale(dir, dot(pole, dir)));
  if (length(perp) < 1e-6) perp = Math.abs(dir[1]) < 0.9 ? cross(dir, UP) : cross(dir, [1, 0, 0]);
  perp = normalize(perp);
  const mid = add(root, add(scale(dir, Math.cos(a) * l1), scale(perp, Math.sin(a) * l1)));
  return { mid, end };
}

const PALMS = {
  forward: [0, 0, 1], back: [0, 0, -1], up: [0, 1, 0], down: [0, -1, 0],
  right: [1, 0, 0], left: [-1, 0, 0],
};

/** A palm direction name ("down", "forward-down", "in", "out") or vector, in the chest frame. */
export function palmVector(palm, side) {
  if (Array.isArray(palm)) return normalize(palm);
  const inward = side === "L" ? [1, 0, 0] : [-1, 0, 0];
  const parts = String(palm ?? "in").split("-").map((p) =>
    p === "in" ? inward : p === "out" ? scale(inward, -1) : PALMS[p] ?? [0, 0, 1],
  );
  return normalize(parts.reduce(add, [0, 0, 0]));
}

function footPoints(foot) {
  const yaw = foot.yaw ?? 0;
  const pitch = (foot.toeUp ?? 0) - (foot.heelUp ?? 0) + (foot.pitch ?? 0);
  const { F } = basis(yaw);
  const p = pitch * DEG;
  const dir = add(scale(F, Math.cos(p)), scale(UP, Math.sin(p)));
  const lift = foot.lift ?? 0;
  const base = ground(foot.at, 0);
  // Keep whichever end touches the ground on the ground.
  let ankleY = BODY.ankle + lift;
  if (!lift && (foot.heelUp ?? 0) > 0) ankleY += Math.sin((foot.heelUp) * DEG) * BODY.toe;
  if (!lift && (foot.toeUp ?? 0) > 0) ankleY += Math.sin((foot.toeUp) * DEG) * BODY.heel * 0.5;
  const ankle = [base[0], ankleY, base[2]];
  return { ankle, toe: add(ankle, add(scale(dir, BODY.toe), [0, -BODY.ankle * 0.8, 0])), heel: add(ankle, add(scale(dir, -BODY.heel), [0, -BODY.ankle * 0.8, 0])), dir, grounded: !lift };
}

/**
 * Solve a resolved pose (see motion.js for the authoring format) into joint positions.
 * Returns world-space points for every joint plus the chest frame and hand orientation.
 */
export function solve(pose) {
  const feet = { L: footPoints(pose.feet.L), R: footPoints(pose.feet.R) };
  const pelvisFrame = basis(pose.face ?? 0);

  // Pelvis over the feet, shifted toward the weighted foot.
  const w = 0.5 + ((pose.weightLeft ?? 0.5) - 0.5) * 0.85;
  const px = lerp(feet.R.ankle[0], feet.L.ankle[0], w);
  const pz = lerp(feet.R.ankle[2], feet.L.ankle[2], w);
  const hipOffset = (side) => scale(pelvisFrame.R, side === "L" ? -BODY.hipHalf : BODY.hipHalf);

  // As high as asked, but never so high that a grounded foot would leave the floor.
  let py = STAND_HIP - (pose.sink ?? 0.04);
  const reach = BODY.thigh + BODY.shin - 0.004;
  for (const side of ["L", "R"]) {
    const f = feet[side];
    if (!f.grounded) continue;
    const hip = add([px, 0, pz], hipOffset(side));
    const h = Math.hypot(hip[0] - f.ankle[0], hip[2] - f.ankle[2]);
    if (h < reach) py = Math.min(py, f.ankle[1] + Math.sqrt(reach * reach - h * h));
  }
  const pelvis = [px, py, pz];

  const J = { pelvis };
  for (const side of ["L", "R"]) {
    const hip = add(pelvis, hipOffset(side));
    const f = feet[side];
    // Knees track over the toes, a little outward.
    const pole = normalize(add(f.dir, scale(hipOffset(side), 1.5)));
    const { mid, end } = twoBone(hip, f.ankle, BODY.thigh, BODY.shin, add(pole, [0, 0.2, 0]));
    const shift = sub(end, f.ankle);
    J[`hip${side}`] = hip;
    J[`knee${side}`] = mid;
    J[`ankle${side}`] = end;
    J[`toe${side}`] = add(f.toe, shift);
    J[`heel${side}`] = add(f.heel, shift);
  }

  const chestFrame = basis((pose.face ?? 0) + (pose.twist ?? 0), pose.lean ?? 0);
  const chest = add(pelvis, scale(chestFrame.U, BODY.spine));
  const neck = add(chest, scale(chestFrame.U, BODY.neck));
  const headFrame = basis((pose.face ?? 0) + (pose.twist ?? 0) + (pose.gaze ?? 0), (pose.lean ?? 0) * 0.5);
  const head = add(neck, scale(headFrame.U, BODY.head));
  Object.assign(J, { chest, neck, head, chestFrame, headFrame });

  for (const side of ["L", "R"]) {
    const sx = side === "L" ? -1 : 1;
    const shoulder = add(chest, toWorld(chestFrame, [sx * BODY.shoulderHalf, BODY.shoulderUp, 0]));
    const hand = pose.hands[side];
    const target = add(chest, toWorld(chestFrame, hand.at));
    // Elbows sink: bend down and slightly out and back.
    const pole = toWorld(chestFrame, [sx * 0.45, -1, -0.15]);
    const { mid, end } = twoBone(shoulder, target, BODY.upperArm, BODY.forearm, pole);
    const forearm = normalize(sub(end, mid));
    const palm = normalize(toWorld(chestFrame, palmVector(hand.palm, side)));
    let fingers = sub(forearm, scale(palm, dot(forearm, palm)));
    fingers = length(fingers) < 1e-3 ? forearm : normalize(fingers);
    J[`shoulder${side}`] = shoulder;
    J[`elbow${side}`] = mid;
    J[`wrist${side}`] = end;
    J[`hand${side}`] = { palm, fingers, shape: hand.shape ?? "palm" };
  }
  return J;
}

/** Bone segments for drawing and for tests: [from, to, length]. */
export const BONES = [
  ["hipL", "kneeL", BODY.thigh], ["kneeL", "ankleL", BODY.shin],
  ["hipR", "kneeR", BODY.thigh], ["kneeR", "ankleR", BODY.shin],
  ["shoulderL", "elbowL", BODY.upperArm], ["elbowL", "wristL", BODY.forearm],
  ["shoulderR", "elbowR", BODY.upperArm], ["elbowR", "wristR", BODY.forearm],
];
