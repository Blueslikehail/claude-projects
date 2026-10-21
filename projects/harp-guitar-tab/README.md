# harp-guitar-tab

Learn blues harmonica (guitar later) in the browser: **generated lessons with exact tab**
— a 12-bar blues at your level, with chords and a band — plus a live mic tab, play-along
scoring, and (beta) transcription of solo recordings. Static site on Cloudflare; nothing
is uploaded.

**Lessons first.** Transcribing real recordings proved unreliable whenever the harmonica
isn't clearly isolated, so the main path now goes the other way: score first, audio
second. A lesson is generated as tab and chords, and its audio is rendered from that same
score, so the tab is always right. Transcription stays as a beta feature.

## Status

**Phase 1 — core library (done).** Pure JavaScript in `src/core/`, no Node or browser
dependencies, so the same code will run in the web app:

| Module | What it does |
| --- | --- |
| `pitch.js` | Note names ↔ MIDI ↔ frequency |
| `harmonica.js` | Richter layout for any harp key (G–F#), bends, overbends, chord shapes, positions |
| `chords.js` | Chord names ↔ notes, naming a set of sounding notes |
| `harpMapper.js` | Notes/chords → easiest hole sequence (Viterbi over difficulty + movement); harp-key suggestions |
| `tab.js` | Format tab text, parse typed tab back into notes |

**Phase 2 — single-note transcription (done).** `src/core/audio/`, also browser-safe:

| Module | What it does |
| --- | --- |
| `yin.js` | YIN pitch estimate for one frame (fast enough for live use) |
| `pitchTrack.js` | Pitch + volume every 5 ms; decimates 44.1/48 kHz input to ~22 kHz first |
| `segment.js` | Pitch track → notes: new attacks, legato, and glides (bends/slides); tuning offset |
| `transcribe.js` | `transcribe(samples, sampleRate)` = the two above |
| `synth.js` | Renders notes to audio (tests, and "hear this tab" in the app) |
| `wav.js` | WAV decode/encode (the web app will use `decodeAudioData` for other formats) |

**Phase 3 — web player (done).** `web/` — a static site, no build tools, no server:

- Open or drop an audio/video file; it's decoded and resampled in the browser
  (`OfflineAudioContext`) and transcribed in a Web Worker with a progress bar.
- **Hole roll:** one row per hole, notes coloured blow / draw / bend / overbend / chord,
  scrolling past a playhead in sync with playback. Click to jump.
- **Tab text** by phrase, current note highlighted; ⟲ loops a phrase.
- Harp **Auto** (best key for the notes, favouring common positions when the song key
  is set) or any key; shows the position and the cross harp for the song key.
- Speed 25–100% without changing pitch, A–B loop, note stepping, keyboard shortcuts.
- **Edit the tab:** select a note to play it another way (`-2` ↔ `3`), fix its pitch
  (±1, ±octave) or delete it; the tab re-maps.
- **Hear the tab:** switch the sound from the recording to the synthesized tab.
- Copy the tab as text.
- Keys: space play · `[` `]` loop · `\` clear · ← → 2 s · `,` `.` notes · `m` mic.

**Phase 4 — microphone (done).** `src/core/live.js`, `src/core/score.js`, `web/practice.js`:

- **🎤 Live tab:** play and see the hole you're playing, big, with an intonation meter
  (great for practising bends) and a running line of tab. Works with no recording loaded.
- **Play along:** press play and play with the recording or the tab synth. Notes you hit
  turn green on the roll, wrong notes amber, misses red; each pass (and each loop round)
  is scored, with your average timing. The next note to play is shown.
- **Mic delay** compensates for audio latency; **Match my timing** measures it from your
  last pass (works even when nothing was close enough to count as a hit). Backing volume
  lets you turn the recording down.
- Mic audio goes through an `AudioWorklet` into a streaming YIN tracker and a live note
  tracker (note on/off, re-attacks, legato); about 4% of one CPU core.

**Phase 5 — chords (done).** `src/core/audio/fft.js`, `src/core/audio/poly.js`:

- A second, polyphonic pass (FFT + iterative pitch estimation with smoothed harmonic
  subtraction) finds where 2+ notes sound together; those chord segments replace the
  single-note guesses they cover. Plain JS, ~30% extra analysis time.
- Chords map to real harp shapes; if detection missed or added a note, the closest
  shape is used and marked as approximate. Each chord is named (`-(1 2 3)` on an A harp
  = E, `-(2 3 4 5)` = E7) on the roll, in the tab and in the note panel.
- "Shift" in the note panel moves a whole chord.

**Lessons (done).** `src/core/lesson/`, `src/core/audio/band.js`, `web/lesson.js`:

- **🎵 New lesson:** pick the song key (the cross harp is chosen for you — E → A harp),
  level (Beginner, Bends, Advanced, Overblows), tempo and length (12/24/36 bars).
- A library of 2nd-position licks written as harp tab with shuffle rhythm (harp tab is
  key-independent, so every lick works on all 12 harps). Each lick's level comes from its
  techniques. Licks are picked per section of the 12-bar form (I, IV, V–IV, turnaround,
  ending), mostly at your level, without repeats; a seed reproduces a lesson.
- A band rendered from the chord track: shuffle bass (root-3-5-6-♭7), off-beat chord
  stabs and a shuffle kit. **With harp / Backing only** switches mixes — play the part
  yourself over the band, with the mic scoring you.
- The hole roll gets a chord lane; tab lines are two bars each with their chords;
  everything else (loops, speed, play-along, Copy tab) works on lessons too.
- CLI: `npm start -- lesson --song E --level 2 --tempo 80 lesson.wav`.

**Songs to practise with (done).** `src/core/songs.js`:

- After each lesson, a ranked list of classic recordings to play along with: same harp
  and position first ("same A harp in 2nd position — play along in the record's key"),
  then feel, tempo and form. Each has YouTube/Spotify **search** links (nothing hosted),
  its sources, and a confidence label: *documented* (sources agree), *reported* (one
  source), *partial* (harp sourced, position assumed), *disputed* (sources disagree).
- "Lesson in E, 130 bpm" makes a lesson in that song's key and tempo.
- Catalog: 15 songs (Little Walter, Sonny Boy Williamson II, Slim Harpo, Muddy Waters,
  Junior Wells, Paul Butterfield, Jimmy Reed, Canned Heat, J. Geils Band, Blues Traveler).
  Only facts are stored — key, harp, position, a rough feel/tempo — never licks or tab
  from the records. Songs whose key couldn't be sourced were left out.

**My licks (done).** Add licks you learn from records (tab, optional rhythm, the song,
where it goes in the 12-bar). They're checked as playable, levelled, kept in this
browser (Export/Import as JSON to back up or move them), and used in your lessons
most of the time, marked "★ yours · from Juke".

Roadmap: load an original recording → key, tempo and changes → licks in sync with it ·
richer sound (sampled instruments) · more licks and forms (quick change, slow
blues, minor) · LLM-written licks via a Worker · 6 guitar · 7 instrument separation.
5 chord detection / polyphonic (basic-pitch) · 6 guitar · 7 instrument separation.
Every stage is a swappable module, so separation or URL import can later run on a server.

## Harmonica tab notation

One arrow = one semitone.

| Meaning | Tab |
| --- | --- |
| blow / draw | `4` / `-4` |
| draw bend 1, 2, 3 semitones | `-3↓` `-3↓↓` `-3↓↓↓` |
| blow bend | `8↓`, `10↓↓` |
| overblow / overdraw | `6↑` / `-7↑` |
| chord | `(4 5 6)`, `-(1 2 3)` |
| tongue-blocked split | `(1 _ _ 4)` |
| slide into a bend, same breath | `-3~-3↓↓` |

When typing tab, `'` is accepted for `↓` (`-3''` = `-3↓↓`). Notes no harp can play
show as `?Eb5`.

## Run

### Web app

```bash
npm run dev          # http://localhost:8787 — serves web/ and src/core/ directly
npm run build        # dist/ = web/ + src/core/ as dist/core/
```

Click **Try a demo riff** to see it work without a file.

### Deploy to Cloudflare

The app is static files served by a Cloudflare Worker (`wrangler.jsonc` points at `dist/`;
there is no server code).

**From the dashboard** (Workers & Pages → Create → Import a repository), with
**Advanced settings → Root directory** `projects/harp-guitar-tab`:

| Field | Value |
| --- | --- |
| Project name | `harp-guitar-tab` (must match `name` in `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Builds run from the repo's production branch (Settings → Build → Branch control).
The site is then at `https://harp-guitar-tab.<your-subdomain>.workers.dev`.

**From your machine:** `npm run deploy` (build + `npx wrangler deploy`; asks you to log in once).

### Command line

```bash
npm start                                         # help
npm start -- layout --harp A                      # every note on an A harp
npm start -- tab --harp A E4 G4 A4 Bb4 B4 D5 E5   # -> -2 -3↓ 4 -4↓ -4 -5 6
npm start -- tab C4+E4+G4 C4+C5                   # chords: (1 2 3) (1 _ _ 4)
npm start -- suggest --song E E4 G4 A4 Bb4 B4     # best harp keys + position
npm start -- suggest --octaves E2 G2 A2 B2        # try octave shifts (guitar riffs)
npm start -- chord E7                             # which harps have an E7, and where
npm start -- name G3 B3 D4 F4                     # -> G7
npm start -- parse --harp C "-3'' 6↑ -(1 2 3)"    # tab -> notes
npm start -- render --harp A --bpm 120 "-2 -3↓ 4 -3~-3↓↓" riff.wav   # tab -> audio
npm start -- lesson --song E --level 2 --tempo 80 lesson.wav  # generated lesson + band
npm start -- transcribe riff.wav --song E         # audio -> tab, picks the harp
npm start -- transcribe solo.wav --harp A --notes # one line per note with its time
```

`transcribe` reads WAV files (any sample rate, mono or stereo). Convert other formats
with e.g. `ffmpeg -i solo.mp3 solo.wav`.

## Test

```bash
npm test
```

## Notes

- **Design choice:** everything client-side (Cloudflare Pages, no server compute). Workers
  can't run audio ML; the browser can (Web Audio, AudioWorklet, TF.js basic-pitch). Weak
  spots — instrument separation and importing from URLs — are planned as optional
  server-side modules (GPU service or Cloudflare Containers) behind the same interfaces.
- **Phase 1:** the harmonica model came out simple once bends are derived from the
  reed pair in each hole (the higher reed bends down toward the lower one). The one real
  ambiguity on a Richter harp is G (`-2` = `3` on a C harp); the mapper picks by context.
- Chord voicings require root, 3rd and 7th (5th and 9th may be dropped). That makes
  the classic "draw 1–4 = G7 on a C harp" read as G major — correct, the F is in draw 5;
  a full G7 is `-(2 3 4 5)`.
- Overbends are limited to the commonly played set (overblow 1, 4, 5, 6; overdraw 7, 9, 10)
  and cost more in the mapper, so they only appear when nothing else works.
- **Phase 2:** YIN + a segmentation pass. Tested against synthesized reeds (harmonics,
  noise, vibrato, detuning to A=446, a low G harp, overblows), all round-trip back to
  the same tab. Pitched notes were easy; *where notes start* was the hard part: a new
  attack is a volume dip, a hole change without one is legato, and a gradual pitch move
  is a glide. A bend from -3 to -3↓↓ passes through -3↓; short stops inside a one-way
  slide are dropped so it reads `-3~-3↓↓`. Speed: ~14x real time at 44.1 kHz after
  decimating to 22 kHz (before: 3.5x). Not tested yet on real recordings, and chords
  need the polyphonic stage (phase 5): a chord in a monophonic pass is lost or guessed.
- **Phase 3:** plain ES modules, no bundler: `dist/` is just `web/` plus `src/core/`, so
  the code the tests cover is exactly what ships. The browser decodes and resamples to
  22 kHz mono itself, so any format it can play works (mp3, m4a, wav, mp4, webm), and
  the worker keeps the page responsive. Checked end to end in headless Chromium
  (demo → analysis → synced highlight → note edit → phrase loop → synth sound, phone
  width, no console errors). Seeing `-2` written as `3` in the demo led to a small
  default preference for `-2` (still `3` when it saves movement), and harp suggestions
  now favour common positions when the song key is known.
  Not yet checked in Safari/Firefox; "Hear the tab" swaps the media source, so a video
  goes blank while it plays.
- **Phase 4:** the offline segmentation logic carried over to a streaming tracker with
  ~50 ms note-on latency; tests stream synthesized riffs in 37/128/1000-sample chunks and
  get identical notes. End-to-end checked in Chromium with a fake microphone fed from a
  WAV: live tab matched the riff exactly; with the "player" 0.45 s late, pass 1 scored
  0/13, **Match my timing** set the delay to ~310 ms, and pass 2 scored 13/13. The first
  calibration only averaged hits, which fails precisely when timing is way off — replaced
  by a median offset to the nearest same-pitch note. Mic processing (echo cancellation,
  noise suppression, auto gain) is turned off because it distorts pitch and dynamics, so
  headphones are needed for play-along. Not tried yet with a real mic and harp.
- **Phase 5:** the hard part is octaves: a note an octave up sits entirely on the lower
  note's harmonics. Measured on 210 single notes in 5 tone colours (incl. one with the
  2nd harmonic twice the fundamental): with the octave threshold at 0.55 a bright tone
  produced 8 false chords; at 0.7, zero — at the price of sometimes missing an octave
  doubling (`-(1 2 3 4)` heard as `-(1 2 3)`) and **tongue-blocked octave splits**
  (`(1 _ _ 4)` comes out as `1`). False chords would be worse than missed octaves, so
  0.7 it is. The live mic is still single-note; chords in play-along count as hit when
  you play any of their notes.
- **Lessons:** after real-world tests showed transcription failing when the harmonica
  isn't isolated, the app turned around: generate the music from a score, so tab and
  chords are exact. AI audio generators (Suno etc.) were considered and rejected for this
  — they output audio only, which puts you back to transcribing. The licks are standard
  2nd-position blues vocabulary; every one is checked to be 2 bars and playable on all
  12 harps, and every slot has licks at every level. Sound is synthesized (reed + breath
  for the harp, simple bass/comp/drums) — functional rather than pretty; sampled
  instruments are the obvious next step. Generation + rendering of both mixes takes
  ~1.5 s in a worker.
- **Songs:** facts came from web searches (Oct 2026); many pages couldn't be opened
  from the build environment, so each entry keeps its sources and a confidence label, and
  the catalog test checks that harp + position actually give the song key. Several famous
  tunes (I'm a King Bee, Whoopin' the Blues, Messin' with the Kid, Smokestack Lightnin')
  were left out because no source gave their key. Matching is by harp, position, feel,
  tempo and form — not note-for-note riff similarity, which would need the records' notes.
