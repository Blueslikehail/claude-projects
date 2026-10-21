# tai-chi-applications

Learn the martial applications of tai chi forms: practice, study and partner drills on a tablet.

A static web app with no build step. A pure ES-module library in `src/core/` holds the forms,
postures and applications. It's tested in Node and served unchanged to the browser.

## Modes

| Mode | What it does |
| --- | --- |
| **3D figure** | In Practice, an animated 3D mannequin performs each posture keyframe by keyframe, with the matching cue highlighted. Drag to rotate, pinch to zoom; Front / Side / Back views, ½× speed, tap a keyframe number to stop there, and **Mirror** to follow along facing the tablet. Discs under the feet show the weight split. Applications marked **Watch in 3D** play with two figures, attacker and defender. |
| **Practice** | Step through the form: Chinese name, pinyin, energies, movement cues, principle and applications. Big Previous/Next buttons, swipe or arrow keys. *Keep screen on* (wake lock) and *Auto-advance* every 15/30/60 s for hands-free practice. The Applications panel can be hidden for pure form work. |
| **Study** | Spaced-repetition flashcards (simplified SM-2). Each application gives two cards: posture → application, and scenario → posture. 10 new cards a day. |
| **Quiz** | "Opponent does X: which posture?" Four choices, filterable by attack type. Wrong answers are never another posture that also answers that attack. |
| **Partner** | Attacker and defender cards for two-person drills. The defender's response stays hidden until revealed. *Face attacker across* turns the attacker card upside down for a tablet lying between two partners. |

Progress, the current step and settings are saved in the browser (`localStorage`) on each device.

## Run

```bash
npm start            # http://localhost:8788 (serves web/ and src/core/ directly)
npm run build        # dist/ = web/ + src/core/ as dist/core/, ready for any static host
npm run deploy       # build and deploy to Cloudflare (see below)
```

### Deploy to Cloudflare

The app is static files served by a Cloudflare Worker (`wrangler.jsonc` points at `dist/`;
there is no server code).

**From the dashboard** (Workers & Pages → Create → Import a repository), with
**Advanced settings → Root directory** `projects/tai-chi-applications`:

| Field | Value |
| --- | --- |
| Project name | `tai-chi-applications` (must match `name` in `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Builds run from the repo's production branch (Settings → Build → Branch control), and
every push to it redeploys. The site is then at
`https://tai-chi-applications.<your-subdomain>.workers.dev`.

**From your machine:** `npm run deploy` (build + `npx wrangler deploy`; asks you to log in once).

## Test

```bash
npm test
```

Tests validate all content (unknown postures, energies or attack types, missing fields,
duplicate ids), the 28 form's sequence, spaced-repetition scheduling, and quiz/drill generation.

## Editing the content

All content is in `src/core/data/`, written as plain JS objects:

| File | Contents |
| --- | --- |
| `vocabulary.js` | The eight energies (掤 捋 挤 按 採 挒 肘 靠) and the attack types, with the attacker's drill instruction for each |
| `postures.js` | The posture library: names, cues, principle and applications. Shared by every form |
| `forms/yang-28.js` | The 28 form as an ordered list of posture ids, with optional per-step notes |

| `poses.js` | 3D keyframes for each posture, and two-figure application scenes |

### How the 3D poses work

Poses are written the way a teacher describes them, not as joint angles: where each foot
is on the ground (and which way it points), how the weight is split, how deep the stance
sinks, which way the waist faces, and where each hand is relative to the chest with its
palm direction. For example, the end of Brush Knee:

```js
{ label: "Brush and push", cue: 2, w: 0.7, face: 0,
  hl: [-0.22, -0.4, 0.2, "down"], hr: [0.02, 0.05, 0.45, "forward"] }
```

Each keyframe only lists what changes. `src/core/figure/` turns this into joints with
two-bone IK, with elbows sinking and knees tracking over the toes. When a foot moves, the step is
choreographed automatically: weight shifts onto the other leg, the foot lifts and travels,
then the weight settles. `npm test` checks every keyframe of every posture is physically
reachable, feet stay planted, bones keep their length through every transition, and elbows
stay below the shoulders. The viewer (`web/figure3d.js`) draws the mannequin with three.js,
loaded from cdnjs, so the 3D view needs a connection the first time. Everything else works offline.

**Adding the 85 form:** create `forms/yang-85.js` with the same shape, list it in `FORMS` in
`src/core/forms.js`, and add the postures the 28 form lacks (e.g. Chop with Fist,
Step Back and Ride the Tiger, Turn and Sweep Lotus, Bend the Bow to Shoot the Tiger) to
`postures.js`. The 28-form postures are reused automatically, as are their study cards and
progress. `npm test` reports any step that points at a posture that doesn't exist yet.

## Notes

- **Content is a draft.** I (Claude) wrote the 28-form sequence and all 55 applications
  from common Yang-style teaching. There's no single standard 28 form, so the sequence
  in particular needs checking against what you were taught. The validator caught four
  places where an application used an energy its posture didn't list; fixed in the data.
- **Design:** stone-and-jade palette, cinnabar only for the seal and Chinese marks. Each
  posture's Chinese name is set vertically like a scroll beside the English (horizontal
  on phones). Touch targets are at least 52 px for use at arm's length during practice.
- **Checked** end to end in headless Chromium at tablet landscape/portrait and phone width,
  light and dark: navigation, swipe, study grading, quiz, partner drills, persistence across
  reloads, no horizontal overflow, no script errors. One gotcha: the sandbox's only CJK font
  (WenQuanYi) has broken vertical metrics, so the vertical names overlapped there. With the
  real Noto Serif SC subset the page loads from Google Fonts, they render correctly.
- **3D figures (phase 2):** a mannequin drawn from solved joint positions rather than a
  rigged model, so there are no model files and poses stay editable as data. Writing poses
  as feet/weight/waist/hands with IK made them look natural with little tuning. The
  tests caught 6 unreachable hand positions while authoring. Two applications have
  two-figure scenes so far (Brush Knee vs front kick, Roll Back vs punch); the rest show the
  posture alone. Gotchas: three.js r128 doesn't convert CSS colours to linear, so colours
  were washed out until converted. The sandbox blocks cdnjs, so tests serve the same three.js
  build from npm. Poses are a first pass: hand shapes are simple paddles, and each posture
  is authored in its own frame, so the form doesn't flow continuously from one step to the next.
- **Ideas next:** the 85 form; two-figure scenes for every application; continuous
  whole-form playback; a slow-motion "ghost" of the previous keyframe;
  a Claude-powered coach that answers questions from this data; "drill this posture's
  applications" from the practice screen; export/import of study progress between devices.
