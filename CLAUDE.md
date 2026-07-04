# CLAUDE.md — 和声 · Harmony Path

Single-file vanilla-JS Progressive Web App that teaches vocal harmony singing. No build step,
no framework, no dependencies. Runs as an installed PWA on the user's iPhone (iOS Safari);
**headphones are assumed for every mic exercise.** Deployed on GitHub Pages (confirm URL with
the user; do not assume).

## Files — this is the whole app
- `index.html` — the entire app: HTML + CSS + a single inline `<script>` (~1700 lines).
- `sw.js` — service worker (offline cache).

There is intentionally **no** bundler, `package.json`, module system, or dependency. Node is used
only as an offline validation harness (see Testing), never at runtime.

## CRITICAL conventions — follow on every change
1. **Keep it single-file.** The one-file design is deliberate (trivial PWA deploy). Do NOT split
   into modules, add a build step, or introduce dependencies unless the user explicitly asks.
2. **Parse-check after every edit:**
   ```
   node -e "const fs=require('fs');new Function('function c(){'+fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1]+'}');console.log('parse OK')"
   ```
3. **Bump BOTH version markers together on any shippable change** — or the PWA serves stale cache:
   - `index.html`: build marker `title="build">vN`  (currently **v29** — confirm first).
   - `sw.js`: cache constant `harmony-vN` (must match — currently **harmony-v29**).
4. **Validate scoring LOGIC with a node harness before shipping.** Parse-OK is not enough; the
   check-kinds carry real logic. (No harness is committed yet — committing one is a priority task.)
5. **Never trust green sandbox tests for anything acoustic.** See "On-device gap."
6. The user handles the git side (commit, hard-reload, confirm the header shows the new vN).

## Architecture (mental model)
- **Rendering:** view-based. Global `view` selects what `render()` paints into `#main` via
  innerHTML. Views: `setup`, `room`, `ref`, `prog`, or a module number.
- **Content:** `MODULES` array, each `{n, t, g, lessons:[...]}`. `n` is the module number —
  note the interlude module is `n:3.5` (a float) between 3 and 4. `FLAT` is the flattened lesson
  list; lessons unlock sequentially along it (`statusOf`).
- **State:** `st(id)` → per-lesson `{mastered, stds{}, ...}`. Persisted to localStorage key
  `harmony_lessons_v1`. Backup/Restore/Reset live in the UI.
- **Auto-scoring:** a lesson may carry `auto:{checks:[...]}`. Each check has a `kind` and ticks
  specific `stds` when met (`checkMet`/`evaluateAuto`). `paintLessonLog` renders live progress.
  All standards ticked → mastery. Scored paths are ALWAYS optional, added *beside* the manual
  version, never replacing it.

## Check kinds (the scoring engine)
`hold8`, `driftReturn`, `stepSeq`, `jumpN`, `earQuiz` (no mic), `rowRun` (with `memory:true` =
transpose-invariant sing-from-memory; else harmony-over-melody), `duet` (two-phase self-duet:
record melody, then harmonize over your own voice), `improv` (sight-harmonize over a generated
melody), plus the Module-0 range probe.
- Shared pure scorers — **reuse, don't duplicate:** `classifyMemory` (best-fit transposition),
  `classifyHarmony` (on-harmony vs collapse-onto-melody), `classifyImprov` (consonance + direction).
- Multi-drill lessons: `rowRunOk` matches run-type to check-type so a memory run and a harmony
  run don't cross-count.

## Songs
`SONGS` registry; each note is `[melodySemi, harmonySemi, beats]` (semitones from C4).
`SONGKEY` + `curNotes()` + `setSong()` select the active song, applied per-lesson via a `song`
field. `row` = Module 3; `grace` / `auralee` / `lang` = interlude module (3.5).

## Pitch engine
`autoCorrelate(buf, sr, minClarity)`: mic → AnalyserNode(fftSize 4096) → bounded autocorrelation,
60–1100 Hz, **first-strong-peak** (prevents octave-down errors), clarity gate 0.32 (0.2 once
locked), RMS silence floor 0.004. Verified accurate down to ~C2 (65 Hz) in the sandbox. iOS needs
a 'play-and-record' AudioSession for capture (`enterCaptureMode`/`exitCaptureMode`).

## Testing (no committed suite yet — see gaps)
Established pattern: a node CommonJS harness reads the inline script and wraps it as
`new Function('with(this){'+js+'\nreturn {...exposed fns}}')`, called against a sandbox mocking
`document`, `window.AudioContext`, `localStorage`, timers, `MediaRecorder`, `Blob`, etc. Feed
synthetic pitch samples into a run's windows, call the scorer, assert. Gotchas:
- `evaluateAuto` skips scoring if `s.mastered` — unmaster test lessons first.
- `openLesson` early-returns on a locked lesson — master its prerequisites first.
- block-scoped `let`s don't leak out of `new Function` — expose via the returned object.

## Deliberate design — do NOT "fix" these
- **Module 4** (real recordings), **5.3** (creative arrangement), **5.4** (sing with humans) are
  intentionally manual/unscored. They can't be faithfully machine-scored — no known timeline, two
  live voices, or the point is leaving the app. Leave them manual.

## Known gaps / landmines
- **Unverified melody data:** `grace` (Amazing Grace) and `auralee` (Aura Lee) melody pitches in
  `SONGS` are first-draft transcriptions, NOT verified against an instrument. `lang` (Auld Lang
  Syne) melody is confirmed and its harmony hand-tuned to stay pentatonic. Verify grace/auralee
  before trusting their scoring — a wrong melody silently fails correct singing.
- **No regression tests in the repo.** Highest-value early task: commit the node harness.
- **On-device acoustic gap:** ALL validation is mocked-audio in node. Timing/sync (duet playback,
  improv reaction lag), low-note clarity, and iOS AudioSession behavior can ONLY be verified by the
  user on the iPhone. Flag these explicitly; never claim them proven from a sandbox pass.
- **Deploy is manual;** the two version bumps must stay in lockstep. A small deploy script that
  bumps both and parse-checks would remove a recurring footgun.
