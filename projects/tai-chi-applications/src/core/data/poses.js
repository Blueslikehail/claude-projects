// 3D keyframes for each posture, plus attacker motions and two-figure applications.
// Format: see src/core/figure/motion.js. Each posture is authored in its own frame,
// starting at the origin and ending facing forward (+z), so it reads well from the front.
//
// DRAFT: poses are approximations of common Yang-style shapes. Adjust numbers freely;
// `npm test` checks every keyframe is physically reachable and that elbows stay down.

// Frequently used hand positions [right, up, forward, palm, shape] relative to the chest.
const SIDE_L = [-0.24, -0.42, 0.06, "in"];
const SIDE_R = [0.24, -0.42, 0.06, "in"];
const BALL_TOP_R = [0.05, 0.05, 0.3, "down"];
const BALL_LOW_L = [-0.02, -0.25, 0.28, "up"];
const BALL_TOP_L = [-0.05, 0.05, 0.3, "down"];
const BALL_LOW_R = [0.02, -0.25, 0.28, "up"];
const PUSH_L = [-0.15, 0.02, 0.48, "forward"];
const PUSH_R = [0.15, 0.02, 0.48, "forward"];
const CROSS_L = [0.02, 0.02, 0.3, "back"];
const CROSS_R = [-0.02, 0.05, 0.32, "back"];

/** Ground point [right, forward] of a body-relative offset for a figure facing `face`. */
function rot(face, [r, f]) {
  const t = (face * Math.PI) / 180;
  return [r * Math.cos(t) + f * Math.sin(t), -r * Math.sin(t) + f * Math.cos(t)];
}

export const POSES = {
  commencement: [
    { label: "Stand", L: [-0.06, 0, 0], R: [0.06, 0, 0], sink: 0.02, hl: SIDE_L, hr: SIDE_R, dur: 0.6 },
    { label: "Step out", cue: 0, L: [-0.16, 0, 0], R: [0.16, 0, 0], w: 0.5 },
    { label: "Raise the arms", cue: 1, hl: [-0.17, 0.08, 0.42, "down"], hr: [0.17, 0.08, 0.42, "down"], sink: 0.04, dur: 2 },
    { label: "Sink", cue: 2, hl: [-0.17, -0.3, 0.3, "down"], hr: [0.17, -0.3, 0.3, "down"], sink: 0.14, dur: 1.8 },
  ],
  "ward-off-left": [
    { label: "Hold the ball", cue: 0, L: [-0.1, 0.05, 0], R: [0.15, 0, 30], w: 0.1, sink: 0.14, face: 20, hr: BALL_TOP_R, hl: BALL_LOW_L, dur: 0.8 },
    { label: "Step out", cue: 0, L: [-0.12, 0.55, 0], w: 0.05, dur: 1.4 },
    { label: "Ward off", cue: 1, R: [0.15, 0, 45], w: 0.7, face: 0, hl: [-0.02, 0, 0.4, "back"], hr: [0.22, -0.36, 0.14, "down"], dur: 1.6 },
  ],
  "grasp-sparrows-tail": [
    { label: "Hold the ball", L: [-0.15, 0, -30], R: [0.05, 0.05, 0], w: 0.95, sink: 0.14, face: -20, hl: BALL_TOP_L, hr: BALL_LOW_R, dur: 0.8 },
    { label: "Step", R: [0.12, 0.55, 0], dur: 1.3 },
    { label: "Ward off right", cue: 0, L: [-0.15, 0, -45], w: 0.3, face: 0, hr: [0.02, 0, 0.4, "back"], hl: [-0.08, -0.05, 0.25, "forward"], dur: 1.4 },
    { label: "Roll back", cue: 0, w: 0.75, face: -40, twist: -10, hr: [-0.05, 0.05, 0.3, "in"], hl: [-0.18, -0.15, 0.18, "up"], dur: 1.6 },
    { label: "Press", cue: 1, w: 0.3, face: 0, twist: 0, hr: [0, 0.02, 0.38, "back"], hl: [-0.02, 0, 0.32, "forward"], dur: 1.4 },
    { label: "Separate and sit back", cue: 2, w: 0.75, hl: [-0.15, 0, 0.25, "forward-down"], hr: [0.15, 0, 0.25, "forward-down"], dur: 1.4 },
    { label: "Push", cue: 2, w: 0.3, hl: PUSH_L, hr: PUSH_R, dur: 1.4 },
  ],
  "single-whip": [
    { label: "Gather", cue: 0, L: [-0.08, 0.05, 0], R: [0.18, 0, 45], w: 0.05, face: 30, sink: 0.14, hr: [0.25, 0.08, 0.38, "down", "hook"], hl: [0.02, -0.15, 0.25, "up"], dur: 0.8 },
    { label: "Step out", cue: 1, L: [-0.14, 0.55, 0], dur: 1.4 },
    { label: "Whip", cue: 2, w: 0.7, face: 0, hl: [-0.08, 0.05, 0.42, "forward"], hr: [0.7, 0.06, 0.15, "down", "hook"], dur: 1.6 },
  ],
  "lift-hands": [
    { label: "Open", L: [-0.15, 0, -30], R: [0.1, 0.2, 0], w: 0.5, sink: 0.12, hl: [-0.35, 0.05, 0.25, "forward"], hr: [0.35, 0.05, 0.25, "forward"], dur: 0.8 },
    { label: "Close the hands", cue: 1, R: [0.08, 0.32, 0, { toeUp: 25 }], w: 1, sink: 0.14, face: -15, hr: [0.05, 0.1, 0.42, "in"], hl: [-0.02, -0.05, 0.25, "in"], dur: 1.8 },
  ],
  "shoulder-strike": [
    { label: "Drop the hands", cue: 0, L: [-0.15, 0, -30], R: [0.08, 0.2, 0], w: 1, sink: 0.14, face: -20, hr: [0.05, -0.3, 0.18, "in"], hl: [-0.1, -0.1, 0.18, "in"], dur: 0.8 },
    { label: "Step in", cue: 1, R: [0.1, 0.58, 0], dur: 1.3 },
    { label: "Shoulder", cue: 2, w: 0.3, face: -30, lean: 8, hr: [0.12, -0.35, 0.12, "in"], hl: [0.05, -0.05, 0.22, "in"], dur: 1.4 },
  ],
  "white-crane": [
    { label: "Gather", L: [-0.05, 0.15, 0], R: [0.12, 0, 30], w: 0.3, sink: 0.12, face: 20, hr: [0, -0.15, 0.3, "up"], hl: [0, 0.05, 0.3, "down"], dur: 0.8 },
    { label: "Spread the wings", cue: 1, L: [-0.1, 0.25, 0, { heelUp: 30 }], w: 0, sink: 0.1, face: 0, hr: [0.22, 0.32, 0.18, "back-in"], hl: [-0.2, -0.38, 0.12, "down"], dur: 1.8 },
  ],
  "brush-knee": [
    { label: "Hand to the ear", cue: 0, L: [-0.08, 0.05, 0], R: [0.15, 0, 45], w: 0.05, face: 35, sink: 0.14, hr: [0.22, 0.14, 0.1, "forward"], hl: [0.05, -0.05, 0.25, "down"], dur: 0.8 },
    { label: "Step", cue: 1, L: [-0.14, 0.55, 0], dur: 1.4 },
    { label: "Brush and push", cue: 2, w: 0.7, face: 0, hl: [-0.22, -0.4, 0.2, "down"], hr: [0.02, 0.05, 0.45, "forward"], dur: 1.6 },
  ],
  "play-lute": [
    { label: "From Brush Knee", L: [-0.14, 0.55, 0], R: [0.15, 0, 45], w: 0.7, sink: 0.14, hl: [-0.22, -0.4, 0.2, "down"], hr: [0.02, 0.05, 0.45, "forward"], dur: 0.8 },
    { label: "Follow step", cue: 0, R: [0.14, 0.25, 45], dur: 1.2 },
    { label: "Sit back, hold the lute", cue: 1, L: [-0.12, 0.45, 0, { toeUp: 25 }], w: 0, face: -15, hl: [-0.02, 0.12, 0.4, "in"], hr: [0.02, -0.05, 0.25, "in"], dur: 1.6 },
  ],
  "deflect-parry-punch": [
    { label: "Deflect", cue: 0, L: [-0.12, 0.3, -45], R: [0.15, 0, 45], w: 0.6, sink: 0.14, face: -30, hr: [0.05, -0.18, 0.22, "down", "fist"], hl: [-0.15, 0.08, 0.3, "down"], dur: 0.8 },
    { label: "Step and parry", cue: 1, L: [-0.12, 0.6, 0], w: 0.2, face: 20, hl: [0.02, 0.05, 0.38, "in"], hr: [0.18, -0.2, 0.1, "in", "fist"], dur: 1.5 },
    { label: "Punch", cue: 2, w: 0.7, face: 0, hr: [0.02, 0, 0.5, "in", "fist"], hl: [-0.05, 0.02, 0.3, "in"], dur: 1.2 },
  ],
  "apparent-close-up": [
    { label: "Slide under", cue: 0, L: [-0.12, 0.6, 0], R: [0.15, 0.1, 45], w: 0.7, sink: 0.14, hr: [0.02, 0, 0.5, "in", "fist"], hl: [0, -0.05, 0.38, "up"], dur: 0.8 },
    { label: "Separate and sit back", cue: 1, w: 0.1, hl: [-0.15, 0.03, 0.22, "back"], hr: [0.15, 0.03, 0.22, "back"], dur: 1.6 },
    { label: "Push", cue: 2, w: 0.7, hl: PUSH_L, hr: PUSH_R, dur: 1.4 },
  ],
  "embrace-tiger": [
    { label: "Facing the side", L: [...rot(-100, [-0.15, 0]), -100], R: [...rot(-100, [0.15, 0]), -100], w: 0.6, face: -100, sink: 0.14, hl: CROSS_L, hr: CROSS_R, dur: 0.8 },
    { label: "Turn, sweep and step", cue: [0, 1], R: [0.15, 0.55, 0], L: [...rot(-100, [-0.15, 0]), -45], w: 0.3, face: 0, hr: [0.22, -0.38, 0.18, "down"], hl: [-0.02, 0.05, 0.45, "forward"], dur: 2 },
    { label: "Roll back", cue: 2, w: 0.75, face: -40, twist: -10, hr: [-0.05, 0.05, 0.3, "in"], hl: [-0.18, -0.15, 0.18, "up"], dur: 1.6 },
  ],
  "fist-under-elbow": [
    { label: "Circle the hands", cue: 0, L: [-0.14, 0.05, -30], R: [0.14, 0, 0], w: 0.5, sink: 0.14, face: -30, hl: [-0.25, 0.08, 0.35, "down"], hr: [0.25, -0.05, 0.3, "down"], dur: 0.8 },
    { label: "Fist under the elbow", cue: [1, 2], L: [-0.08, 0.35, 0, { toeUp: 25 }], R: [0.12, 0, 30], w: 0, face: 0, hl: [-0.02, 0.15, 0.42, "in"], hr: [-0.08, -0.12, 0.24, "in", "fist"], dur: 1.8 },
  ],
  "repulse-monkey": [
    { label: "Open the arms", cue: 0, L: [-0.12, 0.3, 0, { heelUp: 20 }], R: [0.12, 0, 30], w: 0, sink: 0.14, face: 25, hr: [0.3, 0.05, -0.05, "up"], hl: [-0.05, 0.05, 0.4, "up"], dur: 0.8 },
    { label: "Step back", cue: 1, L: [-0.15, -0.35, -30], face: 10, hr: [0.18, 0.15, 0.08, "forward"], dur: 1.6 },
    { label: "Push and draw back", cue: 2, R: [0.12, 0, 0], w: 0.75, face: 0, hr: [0.05, 0.05, 0.42, "forward"], hl: [-0.2, -0.3, 0.08, "up"], dur: 1.4 },
  ],
  "diagonal-flying": [
    { label: "Hold the ball", cue: 0, L: [-0.15, 0, -30], R: [0.05, 0.05, 0], w: 0.95, sink: 0.14, face: -30, hl: [-0.05, 0.08, 0.3, "down"], hr: BALL_LOW_R, dur: 0.8 },
    { label: "Step out", cue: 1, R: [0.2, 0.55, 0], dur: 1.4 },
    { label: "Fly", cue: 2, L: [-0.15, 0, -45], w: 0.3, face: 0, hr: [0.3, 0.22, 0.35, "up"], hl: [-0.25, -0.4, 0.1, "down"], dur: 1.6 },
  ],
  "needle-sea-bottom": [
    { label: "Forward stance", L: [-0.12, 0.45, 0], R: [0.15, 0, 45], w: 0.7, sink: 0.14, hl: [-0.05, 0, 0.4, "in"], hr: [0.15, -0.3, 0.15, "down"], dur: 0.8 },
    { label: "Half step", cue: 0, R: [0.15, 0.15, 45], dur: 1 },
    { label: "Sit back, lift the hand", cue: 1, L: [-0.1, 0.4, 0, { heelUp: 30 }], w: 0, face: 15, hr: [0.2, 0.15, 0.08, "in"], hl: [-0.05, -0.1, 0.25, "down"], dur: 1.2 },
    { label: "Plunge", cue: 2, lean: 25, sink: 0.18, hr: [0.06, -0.33, 0.25, "in"], hl: [-0.2, -0.38, 0.1, "down"], dur: 1.2 },
  ],
  "fan-through-back": [
    { label: "From Needle", L: [-0.1, 0.4, 0, { heelUp: 30 }], R: [0.15, 0.15, 45], w: 0, lean: 25, sink: 0.18, face: 15, hr: [0.06, -0.33, 0.25, "in"], hl: [-0.2, -0.38, 0.1, "down"], dur: 0.8 },
    { label: "Rise and step", cue: 0, L: [-0.14, 0.6, 0], lean: 0, sink: 0.14, face: 0, hr: [0.05, 0.05, 0.3, "in"], hl: [-0.02, 0, 0.32, "in"], dur: 1.5 },
    { label: "Open the fan", cue: [1, 2], w: 0.7, face: 15, hr: [0.3, 0.32, 0.12, "out"], hl: [-0.02, 0.05, 0.45, "forward"], dur: 1.5 },
  ],
  "wave-hands-clouds": [
    { label: "Right hand up", cue: 0, L: [-0.25, 0, 0], R: [0.25, 0, 0], w: 0.3, sink: 0.15, face: 30, hr: [0.05, 0.12, 0.3, "back"], hl: [0, -0.25, 0.3, "back-down"], dur: 0.8 },
    { label: "Turn left", cue: [0, 1], w: 0.7, face: -30, hl: [-0.05, 0.12, 0.3, "back"], hr: [0, -0.25, 0.3, "back-down"], dur: 1.8 },
    { label: "Close step", cue: 2, R: [-0.05, 0, 0], face: 30, hr: [0.05, 0.12, 0.3, "back"], hl: [0, -0.25, 0.3, "back-down"], w: 0.4, dur: 1.8 },
    { label: "Step out left", cue: 2, L: [-0.35, 0, 0], w: 0.6, face: -30, hl: [-0.05, 0.12, 0.3, "back"], hr: [0, -0.25, 0.3, "back-down"], dur: 1.8 },
  ],
  "high-pat-horse": [
    { label: "From Single Whip", L: [-0.12, 0.45, 0], R: [0.15, 0, 45], w: 0.7, sink: 0.14, hl: [-0.08, 0.05, 0.42, "forward"], hr: [0.7, 0.06, 0.15, "down", "hook"], dur: 0.8 },
    { label: "Follow step", cue: 0, R: [0.15, 0.18, 45], dur: 1 },
    { label: "Pat the horse", cue: [1, 2], L: [-0.1, 0.4, 0, { heelUp: 25 }], w: 0, face: 10, hr: [0.05, 0.15, 0.48, "forward-down"], hl: [-0.15, -0.25, 0.15, "up"], dur: 1.6 },
  ],
  "separate-right-foot": [
    { label: "Cross the wrists", cue: 0, L: [-0.12, 0.1, -30], R: [0.12, 0.25, 0, { heelUp: 20 }], w: 1, sink: 0.12, hl: CROSS_L, hr: CROSS_R, dur: 0.8 },
    { label: "Lift the knee", cue: 1, R: [0.12, 0.25, 30, { lift: 0.38 }], dur: 1.2 },
    { label: "Kick and separate", cue: [1, 2], R: [0.25, 0.75, 40, { lift: 0.75, pitch: -30 }], face: 20, sink: 0.08, hr: [0.35, 0.15, 0.4, "out"], hl: [-0.35, 0.15, 0.2, "out"], dur: 1 },
  ],
  "twin-peaks": [
    { label: "Knee up, palms down", cue: 0, L: [-0.12, 0, -30], R: [0.12, 0.25, 0, { lift: 0.35 }], w: 1, sink: 0.1, hl: [-0.12, -0.05, 0.38, "down"], hr: [0.12, -0.05, 0.38, "down"], dur: 0.8 },
    { label: "Step, hands drop", cue: 1, R: [0.14, 0.55, 0], w: 0.3, sink: 0.14, hl: [-0.25, -0.35, 0.15, "up", "fist"], hr: [0.25, -0.35, 0.15, "up", "fist"], dur: 1.5 },
    { label: "Strike the ears", cue: 2, hl: [-0.1, 0.18, 0.42, "out", "fist"], hr: [0.1, 0.18, 0.42, "out", "fist"], dur: 1.3 },
  ],
  "turn-left-heel": [
    { label: "Sit back and turn", cue: 0, L: [-0.12, 0.05, 45], R: [0.14, 0, 45], w: 0.3, sink: 0.12, face: 45, hl: [-0.35, 0.1, 0.25, "out"], hr: [0.35, 0.1, 0.25, "out"], dur: 0.8 },
    { label: "Cross the wrists", cue: 1, L: [-0.08, 0.15, 0, { heelUp: 15 }], R: [0.14, 0, 30], w: 0, face: 0, hl: CROSS_L, hr: CROSS_R, dur: 1.6 },
    { label: "Lift the knee", cue: 1, L: [-0.1, 0.25, -10, { lift: 0.38 }], dur: 1 },
    { label: "Heel kick", cue: 2, L: [-0.1, 0.75, 0, { lift: 0.7, pitch: 30 }], sink: 0.08, hl: [-0.35, 0.15, 0.35, "out"], hr: [0.35, 0.15, 0.2, "out"], dur: 1 },
  ],
  "snake-creeps-down": [
    { label: "Single Whip", L: [-0.14, 0.6, 0], R: [0.18, 0, 45], w: 0.7, sink: 0.14, hl: [-0.08, 0.05, 0.42, "forward"], hr: [0.7, 0.06, 0.15, "down", "hook"], dur: 0.8 },
    { label: "Sit far back", cue: 0, R: [0.18, 0, 60], L: [-0.14, 0.6, -10], w: 0, sink: 0.36, face: 40, lean: 15, hl: [-0.05, -0.1, 0.3, "in"], hr: [0.4, 0.05, 0.2, "down", "hook"], dur: 1.6 },
    { label: "Creep down the leg", cue: [1, 2], face: 10, lean: 20, sink: 0.42, hl: [-0.1, -0.34, 0.25, "in"], dur: 1.6 },
  ],
  "golden-rooster": [
    { label: "Low stance", L: [-0.14, 0.6, -10], R: [0.18, 0, 60], w: 0, sink: 0.42, face: 10, lean: 20, hl: [-0.1, -0.34, 0.25, "in"], hr: [0.4, 0.05, 0.2, "down", "hook"], dur: 0.8 },
    { label: "Rise forward", cue: 0, L: [-0.14, 0.6, -45], w: 0.85, sink: 0.14, face: 0, lean: 5, hl: [-0.05, 0, 0.4, "in"], hr: [0.35, 0, -0.1, "down", "hook"], dur: 1.6 },
    { label: "Stand on one leg", cue: [1, 2], R: [0.12, 0.85, 0, { lift: 0.45 }], w: 1, sink: 0.08, lean: 0, hr: [0.12, 0.3, 0.28, "in"], hl: [-0.22, -0.38, 0.12, "down"], dur: 1.6 },
  ],
  "fair-lady-shuttles": [
    { label: "Hold the ball", cue: 0, L: [-0.1, 0.05, 0], R: [0.15, 0, 45], w: 0.05, sink: 0.14, face: 30, hr: BALL_TOP_R, hl: BALL_LOW_L, dur: 0.8 },
    { label: "Step to the corner", cue: 0, L: [-0.15, 0.58, 0], dur: 1.4 },
    { label: "Shuttle", cue: [1, 2], w: 0.7, face: 0, hl: [-0.05, 0.4, 0.28, "forward"], hr: [0.05, 0, 0.45, "forward"], dur: 1.6 },
  ],
  "cross-hands": [
    { label: "Open the arms", cue: 0, L: [-0.2, 0, 0], R: [0.2, 0, 20], w: 0.6, sink: 0.15, hl: [-0.45, 0.2, 0.15, "out"], hr: [0.45, 0.2, 0.15, "out"], dur: 0.8 },
    { label: "Scoop down", cue: 1, R: [0.15, 0, 0], sink: 0.22, hl: [-0.1, -0.36, 0.22, "up"], hr: [0.1, -0.36, 0.22, "up"], lean: 10, dur: 1.6 },
    { label: "Rise with crossed wrists", cue: 2, w: 0.5, lean: 0, sink: 0.04, hl: CROSS_L, hr: CROSS_R, dur: 1.6 },
  ],
  closing: [
    { label: "Cross Hands", L: [-0.16, 0, 0], R: [0.16, 0, 0], w: 0.5, sink: 0.04, hl: CROSS_L, hr: CROSS_R, dur: 0.8 },
    { label: "Separate the hands", cue: 0, hl: [-0.15, 0, 0.38, "down"], hr: [0.15, 0, 0.38, "down"], dur: 1.4 },
    { label: "Lower the hands", cue: 1, hl: SIDE_L, hr: SIDE_R, sink: 0.03, dur: 1.8 },
    { label: "Feet together", cue: 2, L: [0.04, 0, 0], dur: 1.4 },
  ],
};

// ---- Two-figure applications -------------------------------------------------------
// The attacker is placed facing the defender; both sequences run on the same clock, so
// keyframe durations line up the moment of contact.

const GUARD_L = [-0.08, 0.1, 0.3, "in", "fist"];
const GUARD_R = [0.1, 0.05, 0.22, "in", "fist"];
const ATTACKER_GUARD = { L: [-0.12, 0.15, 0], R: [0.15, -0.15, 45], w: 0.5, sink: 0.1, hl: GUARD_L, hr: GUARD_R };

export const APPLICATION_POSES = {
  "brush-knee-kick": {
    attacker: {
      at: [0, 1.05],
      frames: [
        { label: "Guard", ...ATTACKER_GUARD, dur: 0.8 },
        { label: "Front kick", R: [0.08, 0.55, 0, { lift: 0.55, pitch: -20 }], lean: -8, dur: 1.1 },
        { label: "Kick is brushed aside", R: [0.3, 0.45, 20, { lift: 0.3 }], face: 15, dur: 0.7 },
        { label: "Pushed back off balance", R: [0.2, -0.35, 30], w: 0.2, face: 10, lean: -12, hl: [-0.3, 0.1, 0.2, "out"], hr: [0.3, 0.1, 0.2, "out"], dur: 0.9 },
      ],
    },
    defender: {
      frames: [
        { label: "Ready", L: [-0.12, 0.1, 0], R: [0.15, -0.15, 45], w: 0.4, sink: 0.12, hl: [-0.08, 0.08, 0.35, "in"], hr: [0.1, 0, 0.25, "in"], dur: 0.8 },
        { label: "Turn, hand to the ear", w: 0.1, face: 30, hl: [0, -0.28, 0.28, "down"], hr: [0.22, 0.14, 0.1, "forward"], dur: 1.1 },
        { label: "Brush the kick past the knee", face: 10, hl: [-0.25, -0.4, 0.2, "down"], dur: 0.7 },
        { label: "Step in and push", L: [-0.12, 0.42, 0], w: 0.7, face: 0, hr: [0.02, 0.05, 0.48, "forward"], dur: 0.9 },
      ],
    },
  },
  "gst-rollback-punch": {
    attacker: {
      at: [0, 1.25],
      frames: [
        { label: "Guard", ...ATTACKER_GUARD, dur: 0.8 },
        { label: "Step in with a right punch", L: [-0.12, 0.45, 0], w: 0.7, lean: 6, hr: [0.02, 0.1, 0.52, "down", "fist"], dur: 1 },
        { label: "Led past", w: 0.9, face: 20, lean: 18, hr: [0.26, 0.05, 0.52, "down", "fist"], dur: 1.3 },
      ],
    },
    defender: {
      frames: [
        { label: "Ward off right", L: [-0.15, 0, -45], R: [0.12, 0.45, 0], w: 0.35, sink: 0.14, hr: [0.02, 0, 0.4, "back"], hl: [-0.08, -0.05, 0.25, "forward"], dur: 0.8 },
        { label: "Attach to wrist and elbow", hr: [0.05, 0.08, 0.45, "in"], hl: [-0.05, 0, 0.35, "up"], dur: 1 },
        { label: "Roll back", w: 0.8, face: -45, twist: -10, hr: [-0.05, 0.05, 0.3, "in"], hl: [-0.2, -0.12, 0.2, "up"], dur: 1.3 },
      ],
    },
  },
};
