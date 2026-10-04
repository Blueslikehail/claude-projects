# tai-chi-applications

Learn the martial applications of tai chi forms: practice, study and partner drills on a tablet.

A static web app with no build step. A pure ES-module library in `src/core/` holds the forms,
postures and applications. It's tested in Node and served unchanged to the browser.

## Modes

| Mode | What it does |
| --- | --- |
| **Practice** | Step through the form: Chinese name, pinyin, energies, movement cues, principle and applications. Big Previous/Next buttons, swipe or arrow keys. *Keep screen on* (wake lock) and *Auto-advance* every 15/30/60 s for hands-free practice. The Applications panel can be hidden for pure form work. |
| **Study** | Spaced-repetition flashcards (simplified SM-2). Each application gives two cards: posture → application, and scenario → posture. 10 new cards a day. |
| **Quiz** | "Opponent does X: which posture?" Four choices, filterable by attack type. Wrong answers are never another posture that also answers that attack. |
| **Partner** | Attacker and defender cards for two-person drills. The defender's response stays hidden until revealed. *Face attacker across* turns the attacker card upside down for a tablet lying between two partners. |

Progress, the current step and settings are saved in the browser (`localStorage`) on each device.

## Run

```bash
npm start            # http://localhost:8788 (serves web/ and src/core/ directly)
npm run build        # dist/ = web/ + src/core/ as dist/core/, ready for any static host
```

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
- **Ideas next:** the 85 form; stick-figure animation of each posture and its application;
  a Claude-powered coach that answers questions from this data; "drill this posture's
  applications" from the practice screen; export/import of study progress between devices.
