# CLAUDE.md — 和声 · Harmony Path

> **Resuming / switching machines?** Read **`HANDOFF.md`** first — current build (v32), what
> changed last session, the test harness, and open tasks. This file is the stable reference;
> HANDOFF.md is the live session state.

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
   - `index.html`: build marker `title="build">vN`  (currently **v32** — confirm first).
   - `sw.js`: cache constant `harmony-vN` (must match — currently **harmony-v32**).
4. **Validate scoring LOGIC with a node harness before shipping.** Parse-OK is not enough; the
   check-kinds carry real logic. (No harness is committed yet — committing one is a priority task.)
5. **Never trust green sandbox tests for anything acoustic.** See "On-device gap."
6. **Auto commit + deploy (standing instruction from the user, 2026-11-16).** When a build is
   finished and verified — both version markers bumped, parse-check OK, harness ALL GREEN, and the
   browser checks for what changed done — commit to `main` and deploy WITHOUT asking: push, poll
   `gh api repos/choonang-lab/Vocal-Harmony/pages/builds/latest` until `built`, then confirm the live
   site serves the new vN with a cache-busted curl. Record the version as live in HANDOFF.md inside
   the same commit. Then report what shipped. Still stop and ask first if any check fails, if the
   change can't be verified here and could break the app, or for anything destructive (force-push,
   history rewrite, deleting user data). The user does the on-device hard-reload and checks.

## Architecture (mental model)
- **Rendering:** view-based. Global `view` selects what `render()` paints into `#main` via
  innerHTML. Views: `today` (landing — next lesson + one-tap `startSession`), `path` (the module
  roadmap; a numeric view maps here with that module expanded), `setup`, `room` (Practice tab),
  `ref`, `prog`. Navigation is the bottom `#tabbar` (`renderNav`); Backup/Restore/Reset, Range
  check and Reference live in the ⋯ menu.
- **Theming (v40):** all colours are CSS tokens with a `:root[data-theme="dark"]` override; never
  hard-code a colour in CSS or in generated markup — add a token. Icons come from `ico(name)`
  (`ICONS`), never emoji. **Any extra `<script>` tag MUST carry an attribute** (like
  `<script id="theme-boot">`): the parse-check and the harness find the app code with the regex
  `/<script>([\s\S]*)<\/script>/`, which matches a bare `<script>` only.
- **Lesson numbers on screen come from position** (`lessonNo(id)`); ids are progress keys and must
  never change or be reused. Add a lesson by inserting it with a new id; refer to lessons by name
  in prose, never by number. `part` on a lesson starts a labelled group on the Path.
- **Speaker leak (v42):** on the phone speaker the drone leaks into the mic and makes the tuner flip
  between voice and drone. `leakCheck()` runs on every tuner start (short 3.15 kHz beep, measured with
  the analyser's frequency data — keep the beep above the 1100 Hz tracking range). Drone voices must go
  through `droneGain()` so the volume slider applies.
- **Practice days (v41):** `meta().days` is the dated practice history behind the calendar and
  the streak. **Any new scoring path must call `markDayActive()`** (the existing ones do it next to
  `persist();paintLessonLog();`) or that practice silently won't count. Show the streak with
  `curStreak()`, never `meta().streak` directly (the stored counter goes stale after a missed day).
- **Lesson screen:** the pinned Mark-mastered button is `#dFoot`, painted by `paintFooter()`; call
  it after anything that changes `s.stds` (`paintLessonLog` and the tick handlers already do).
- **Content:** `MODULES` array, each `{n, t, g, lessons:[...]}`. `n` is the module number —
  note the interlude module is `n:3.5` (a float) between 3 and 4. `FLAT` is the flattened lesson
  list; lessons unlock sequentially along it (`statusOf`).
- **State:** `st(id)` → per-lesson `{mastered, stds{}, ...}`. Persisted to localStorage key
  `harmony_lessons_v1`. Backup/Restore/Reset live in the UI.
- **Auto-scoring:** a lesson may carry `auto:{checks:[...]}`. Each check has a `kind` and ticks
  specific `stds` when met (`checkMet`/`evaluateAuto`). `paintLessonLog` renders live progress.
  All standards ticked → mastery. Scored paths are ALWAYS optional, added *beside* the manual
  version, never replacing it.
- **Lock window is progressive** (`LOCK_TIERS`, `lockTierFor(id)`, `lockWindow()`): gentle ±35¢ in
  1.1–1.4, standard ±30¢ at cpA, tight ±24¢ from 2.1 on (outside a lesson: the lesson you're on).
  It drives the lamp, `pdLocked`, every `hold8` score and the 1.2 drift detector. Never hard-code
  a lock threshold again — read `lockWindow()`.
- **Daily review** (`openQuick`): auto-scored 10-trial mix on the jump engine (`jdReview`), drawn
  from `reviewPool()` (mastered skills + the current lesson's skill) and weighted toward weak or
  stale skills (`planReview`/`reviewWeight`); stats in `meta().review`. A new interval/pitch lesson
  should add its skill to `REVIEW_SKILLS` (and `REVIEW_FRONT`) or it never gets reviewed.
- **Checkpoints:** a checkpoint whose every std is auto-ticked (`cpAutoCovers` — cpA, cpB, cpC)
  passes without a recording and can be taken early as a **test-out** (`canChallenge`, opens even
  while locked). Passing ANY checkpoint masters its whole module (`passCheckpoint`). cpD/cpFinal
  can't be machine-scored and still require the recording. If you add a std to cpA–cpC, give it
  an auto check too, or it silently stops being test-out-able.

## Check kinds (the scoring engine)
`hold8`, `driftReturn`, `stepSeq`, `intervalQuiz` (listening, no mic: `choices`, `target`, `rounds`),
`jumpN` (`interval` = storage key in `s.jump`, `iv` = semitones; `cue`: root | echo | half | key;
`steady` = one root per session; `degs` = in-key degrees; with `inKey:true, interval:'key3'` = the 2.5/cpB
in-key drill: third above a random degree of a key, major or minor per `keyThirdAbove`; `'key3'`
is also its `s.jump` key), `earQuiz` (no mic), `rowRun` (with `memory:true` =
transpose-invariant sing-from-memory; else harmony-over-melody), `duet` (two-phase self-duet:
record melody, then harmonize over your own voice), `improv` (sight-harmonize over a generated
melody), plus the Module-0 range probe.
- Not a check kind: the standalone **Interval Ear Test** (v44, Practice tab, `openEarTest`) — the
  `et*` engine, sudden-death streaks stored in `S.__ear` (`best` per level+mode key, `runs` log),
  pure helpers `etPick`/`etRecord`. It never ticks lesson standards.
- **Think first (v46):** jump-drill cues hand over through `afterCue()`, never straight to
  `beginListen` — that is where the optional silent gap (`meta().think`, 0/2/4 s) lives. A new cue
  type must call `setTimeout(afterCue, …)` too. Humming in the gap sets `early` on the result only.
- Also not a check kind: the **Scale-degree drill** (v45, `openDegTest`, `dg*`, stored in `S.__deg`):
  cadence sets a key, name the degree, every answer resolves to do (`dgResolve`). It reuses
  `etRecord`, `etHistoryHTML` and `streakProgHTML` — a third streak test should too.
- Shared pure scorers — **reuse, don't duplicate:** `classifyMemory` (best-fit transposition),
  `classifyHarmony` (on-harmony vs collapse-onto-melody), `classifyImprov` (consonance + direction).
- Multi-drill lessons: `rowRunOk` matches run-type to check-type so a memory run and a harmony
  run don't cross-count.

## Songs
`SONGS` registry; each note is `[melodySemi, harmonySemi, beats]` (semitones from C4).
`SONGKEY` + `curNotes()` + `setSong()` select the active song, applied per-lesson via a `song`
field. `row` = Module 3 (and 1.5, which sings its MELODY via a rowRun with `target:'mel'`);
`row1` = row's first phrase, derived (2.6); `grace` / `auralee` / `lang` = interlude module (3.5).
- `harmonySemi` is the HIGH part. The LOW part (▲/▼ switch, `TS.part`) is derived, never stored:
  `belowOf` (third below; "sol" under "do") + per-song `bfix` hand fixes, via `belowLine(song)`.
  **Always read harmony through `harmOf(n,i)`** — reading `n[1]` directly silently ignores the
  part switch. If you add or edit a song, check its below line still passes the harness
  singability guards (3rd–5th under, no leap over a 4th, no tritone); fix spots with `bfix`.

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
- **Melody data — now verified (v33).** `grace` (Amazing Grace) and `auralee` (Aura Lee) were
  wrong first-draft transcriptions; corrected in v33 against cross-verified references and pinned
  in the harness (see HANDOFF "v32 → v33"). `lang` (Auld Lang Syne) melody is confirmed and its
  harmony hand-tuned to stay pentatonic. All three now trustworthy in the sandbox; the v33 fix
  still awaits an on-device singing retest.
- **No regression tests in the repo.** Highest-value early task: commit the node harness.
- **On-device acoustic gap:** ALL validation is mocked-audio in node. Timing/sync (duet playback,
  improv reaction lag), low-note clarity, and iOS AudioSession behavior can ONLY be verified by the
  user on the iPhone. Flag these explicitly; never claim them proven from a sandbox pass.
- **Deploy is manual;** the two version bumps must stay in lockstep. A small deploy script that
  bumps both and parse-checks would remove a recurring footgun.
