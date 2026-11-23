# HANDOFF — Harmony Path

> **Resuming on another machine / in the Claude Desktop app?**
> The Desktop app does **not** auto-read repo files. To pick up the session, either
> (a) paste this whole file into your first message, or (b) if you have the GitHub
> connector, tell Claude: *"Read HANDOFF.md and CLAUDE.md in choonang-lab/Vocal-Harmony,
> then continue."* Read `CLAUDE.md` (architecture, conventions, landmines) alongside this.

**Last updated:** 2026-11-24 · **Build: v53 / harmony-v53** — live on GitHub Pages (Chord-change drill). Builds auto-commit and deploy once verified (CLAUDE.md rule 6). Earlier: v52 `cc2e554` (Monthly check-in). Earlier: v51 `fec77dc` (Harmony in Mandopop). Earlier: v50 `d9f3c8c` (Today = daily plan, weekly goal, ear ladder; title is Harmony Path). Earlier: v49 `d310823` (Scale degrees Start/Learn/guide). Earlier: v48 `8299b17` (Ear routine). Earlier: v47 `ba1b894` (Pick It Out). Earlier: v46 `77e6404` (Think-first gap). Earlier: v45 `3365a3c` (Scale-degree drill). Earlier: v44 `9710cb0` (Interval Ear Test). Earlier: v43 `3124b83` (Module 2 rebuild). Earlier: v42 `2e48eec` (leak check + drone volume). Earlier: v41 `cfb743e`. Earlier: v40 `18948de` (UI/UX redesign). Earlier: v39 `d775bb0` (items 4 + 8). Earlier: v38 `d81c694` (items 6 + 7). Earlier: v37 `2bf0334` (pedagogy items 1/2/3/5), v36 `723d206` (tuner-target audit), v34 `eee3853`, v33 `15cad1e`.

## What changed this session (v52 → v53) — Chord changes drill
Top gap from the pedagogy review: every drill sat on one home chord, but a harmony note must fit
the chord underneath — what Module 5 (Harmonize the Radio) quietly assumes.
- Practice → routine step 4 "Chord changes" (`openChordTest`, no mic; ear test is now step 5).
  Each round: I (0.7 s), then a chord (1.3 s) — name it. Answers unlock as the second chord sounds.
  Every answer plays chord → I so you hear the pull (`cdResolve`); a miss on I says it was home.
- `CD_CHORDS`: I [0,4,7], IV [0,5,9], V [-1,2,7], vi [0,4,9] — close voicings around middle C;
  bass = root, at least 5 semitones under the chord (`cdNotes`; V and vi drop an octave, lowest C2).
  Keys F3–C4 (`cdPickKey`, new key every round). Levels: Start = I/V, 1 = I/IV/V, 2 = + vi.
- Learn (10 rounds, carries on after a miss, `dgReady` nudge) / Streak, like the scale-degree drill;
  "Melody note on top (harder)": a chord tone 10–21 semitones above do, louder (`cdMelody`).
  Guide: how each chord feels (home / A-men / tense / sad), the bass clue (do / fa / sol / la),
  earphones (phone speakers barely play the bass). Level/mode remembered (`S.__chd.pref`).
- `S.__chd` {best, runs, learn, pref}; Progress card via `streakProgHTML` + `learnRowsFor` (the
  scale-degree learn rows now share it). 5.1 Harmonize the Radio points to the drill.
- Harness: 408 assertions (+14), mutation-tested (6 caught). Testing caught V/vi basses sitting
  3–4 semitones under the chord — too close to pick out; fixed.
- On-device to check: whether the bass is audible on earphones, and chord balance vs melody note.

## What changed this session (v51 → v52) — Monthly check-in (the transfer test)
Pedagogy review: drills train components; the honest test is whether they show up in real singing.
- `openBench` (Today card when due, Progress card always): every 4 weeks (`BM_DAYS` 28) sing the
  HIGH part over Row Your Boat's first phrase (`SONGS.row1`), always 84 bpm, 4 clicks in, and always
  the same key — chosen once from the range profile (`benchKey`: harmony line 4..11 above do inside
  the voice with 2 semitones' room; B♭ with no profile) and stored in `S.__bench.key`.
- Scored with `classifyHarmony` over `benchWindows` (ignores the ▲/▼ part switch on purpose);
  take = {d, pct, on, collapse, off, gap, total, avgHarm, mel (s from record start to first note),
  key, audio, mime} in `S.__bench.takes` (max 36). Audio via MediaRecorder on the shared mic stream →
  IndexedDB 'harmony_bench'/'audio' keyed by take id. NOT in Backup — the screen says so and offers
  "Save file" per take. Playback: "You" or "With the tune" (melody re-synthesised from `mel`).
- First vs latest comparison (`benchCompare`) + per-take meter. Today card only when due AND ≥3
  practice days (`benchTodayHTML`), so a brand-new user isn't asked on day one.
- The take ends on the AUDIO clock (progress interval: now ≥ end + 0.4 s); the setTimeout is only an
  8 s backstop. Found in testing: the hidden browser pane runs/freezes the audio clock against wall
  time, and a wall-clock timer cut the take short there.
- Harness: 394 assertions (+18), mutation-tested. Browser: real MediaRecorder from a synthetic
  stream → 220 KB opus in IndexedDB → decoded and played back with the tune.
- On-device to check: real recording + playback sync of "With the tune" on iOS (audio element vs
  Web Audio latency), and that recordings survive app restarts.

## What changed this session (v50 → v51)
- Reference card "和声 in Mandopop" → "Harmony in Mandopop" (user asked). No 和声 left in the app;
  the Chinese song title and 伴奏 inside that card are repertoire content and stay.

## What changed this session (v49 → v50) — Today becomes a daily plan
User: re-orient Today to the suggested path, help them come back regularly, allow busy days.
Decisions (theirs): name stays **Harmony Path**, Chinese 和声 removed from the title/logo; start at
10 min/day and grow to 15 only when compliance is high; weekly goal instead of streak; ear ladder.
- Today (`renderToday`): "Today · 10 minutes" hero with one encouraging line (`planStatus`: start
  small / welcome back after 2+ missed days, no catching up / out of reach — Monday is fresh / goal
  met — bonus; never scolding). Plan card: warm-up line + 1 Ears · Scale degrees (one Learn session at
  the ladder's level, `openDegFromPlan`) + 2 Voice · next lesson (`startSession`; daily review once
  the path is done) + 3 Inside harmony · Pick it out (15-min plan only). Steps tick themselves
  (`planTick`: markDayActive with a lesson open → voice; finishReview/logQuick → voice; scale-degree
  session end → ears; Pick it out run end → harm) and can be ticked/unticked by hand.
- `S.__plan = {mins, goal, since, snooze, done:{day:{s:[steps], n}}}`. A day counts when its plan is
  complete (`dayComplete`). Weekly card: N of goal (3/4/5, tap to cycle, default 4), Mon–Sun dots
  (done / part / today / future). `planOffer`: two full weeks at goal on 10 → offer 15; two missed
  weeks on 15 → offer 10; needs two weeks of history; "Not yet" snoozes for the week.
- Ear ladder (`earLadder`/`levelPassed`): Start → L1 → L2 → L3, a rung passes on any two
  consecutive same-key Learn sessions at 8+ (sticky).
- Streak pill removed from Today (streak + calendar still on Progress).
- Harness: 376 assertions (+31), mutation-tested (8 mutants, all caught).
- On-device to check: that ticking feels right after real sessions; manual lessons without a
  scoring path don't auto-tick Voice (tick by hand).

## What changed this session (v48 → v49) — Scale degrees made learnable
User found the scale-degree drill really hard; sudden death on a skill they hadn't yet learned
meant a stream of 0s and 1s. Asked for a do-or-sol level, a learn mode, and on-screen instructions.
- Level 0 "Start" = do or sol (home vs open). Levels now Start / 1 / 2 / 3; storage keys '0', '0k'…
- Mode switch Learn | Streak. Learn = 10 rounds; a miss names the answer, plays it and its walk home,
  and carries on; the session is logged in `S.__deg.learn` (out of 10, chart scaled to 10).
  `dgReady` (pure): two most recent sessions at 8+ → "ready for the next level, or Streak mode".
  Streak mode is the old behaviour (`S.__deg` best/runs).
- "What you'll hear · what to do" guide (`dgGuideHTML`): four chords (home → away → further →
  home, bass do-fa-sol-do), pause, one note; keep do in your head, sing it back, sing up from do,
  answer, hear it walk home; buttons; modes. Open by itself only until the first session.
- Answer buttons stay locked while the chords play (state 'cue') and open as the note sounds; the
  message tracks it ("chords set the key… then one note" → "which note was that?").
- Level + mode are remembered (`S.__deg.pref`); a first-timer starts on Start + Learn.
- Progress card: degree levels include Start; learn sessions shown as "learn · last 8/10"
  (`dgLearnRows`). `streakProgHTML` now iterates the level keys it is given (+ optional extra rows).
- Keys are named as singers write them: `keyName` → C, D♭, D, E♭, E, F, F♯, G, A♭, A, B♭, B
  (also shows in the Thirds in a Key drill).
- Harness: 345 assertions (+14), mutation-tested.

## What changed this session (v47 → v48) — Ear routine on the Practice tab
User asked for Jump to It on the Practice tab, in the order to practise everything.
- The three loose Practice buttons became one numbered "Ear routine · in this order" card at the top
  (`routineHTML`): 1 Scale degrees → 2 Jump to It, think first → 3 Pick it out → 4 Interval ear test
  (optional). Daily review CTA and Reference follow it.
- Step 2 follows progress (`rtSingId`): Jump to It once unlocked, else the furthest of Half a Walk /
  Echo the Third, else disabled with "Unlocks at Echo the Third". Opening it from the routine sets
  Think first to 2 s the first time only (`rtThinkDefault`); a chosen Off stays Off.
- Harness: 331 assertions (+9), mutation-tested.

## What changed this session (v46 → v47) — Pick It Out (voice extraction)
Last of the three pedagogy-review ideas (degree hearing v45, think-first v46): hearing one line
inside a harmony, the core of not collapsing onto the melody in Module 3.
- Practice tab → "Pick it out" (`openVoiceX`, needs the tuner; the overlay carries its own
  `tunerHTML('tuner_vx')`). Two notes sound together; sing the low one, then the high one. Both
  parts right = one round. Default replays the pair before the high note; "No replay before the
  high note (harder)" makes you hold both. No target on the tuner (no visual cheat).
- Levels by how much the notes blend: 1 = 6ths (8, 9), 2 = + 3rds, 3 = + 4ths/5ths. No octaves or
  steps. `vxPick` keeps both notes in the singer's range (`vxRange`: profile, or -9..5).
- `vxJudge` (pure): settled tail (last 6 frames), octave-folded, ±50¢; singing the OTHER note is
  named as such ("D4 is the high note — you wanted the low one"). A miss ends the run and plays
  the pair together, then low, then high (`vxTeach`). Fed from the pitch loop next to feedJump.
- Streaks in `S.__vx` via `etRecord` (keys '1', '1m', …); shared history chart + Progress card.
  Fix: the shared card showed "—" for a level whose only runs scored 0; now shows 0.
- 3.2 Against the Melody points to it. Harness: 322 assertions (+16), mutation-tested.
- On-device still to check (can't be verified here): real voice scoring, and that on the phone
  speaker the pair doesn't leak into the mic — listening only opens 0.3 s after the pair ends.

## What changed this session (v45 → v46) — Think-first gap in the jump drills
User can't imagine the harmony note before singing; every drill let them sing at once, so the
voice could grope while the ear never led. Now an optional silent gap trains inner hearing.
- Every jump-drill panel (Echo, Half a Walk, Jump to It, the 5th, the 4th, minor thirds, Thirds in a
  Key) has a "Think first" control: Off / 2 s / 4 s, saved in `meta().think` (`thinkOf` validates).
- Flow: cue → `afterCue` → `beginThink` (state 'think', countdown "hear the 3rd in your head… 2")
  → a soft tick (C7, above the 1100 Hz tracking range) → 200 ms → `beginListen`. Gap off = straight
  to listening, exactly as before. The daily review skips the gap (stays quick).
- Humming in the gap (≥ 6 voiced frames) is never scored as the answer; it is flagged on the result
  (`early`) and named in the message, not failed — the onset check already catches groping.
- Jump to It has a task line pointing at it. Remaining idea from the pedagogy review, NOT built:
  sing back each note of a two-note sound (voice extraction).
- Harness: 306 assertions (+14), with `getJd`/`setJd` hooks in the wrapper to drive the jump state
  machine. Mutation-tested; one survivor (dropping the think-branch `return`) is equivalent.
- On-device still to check: whether the tick is audible but unobtrusive, and whether 2 s feels right.

## What changed this session (v44 → v45) — Scale-degree drill
Pedagogy review after v44: interval naming from random roots strips the key away, but harmony
singers work from the key ("melody on mi, so I sing sol"). Scale-degree hearing was the biggest
gap — it also dissolves the major/minor-3rd confusion and is what Module 5 assumes. Two further
ideas were proposed and NOT built yet: singing each note of a two-note sound back (extract a voice),
and an optional "think first" silent gap before singing in the Echo/Jump drills (inner hearing).
- Practice tab → "Scale-degree drill" (`openDegTest`, no mic). Each round: a I–IV–V–I cadence
  (`dgCadence`, close voicing + bass) sets a major key, then one note; name it do…ti (buttons show
  the solfège and the degree number). Every answer walks the note home to do by step
  (`dgResolve`: fa and below fall, sol and above rise) — the teaching device.
- Levels: 1 = do/mi/sol, 2 = + re/fa, 3 = the whole scale. Default keeps one key per run;
  "New key every round (harder)" changes it each round (`dgPickKey`, F3–E4, never repeats).
- Sudden death like the ear test; stored in `S.__deg` via the shared `etRecord` (keys '1', '1k', …).
  The run-history chart (`etHistoryHTML`, now takes a label) and the Progress card
  (`streakProgHTML`) are shared by both streak tests. 2.5 Thirds in a Key points to the drill.
- Harness: 292 assertions (+12), mutation-tested (repeat key, long resolution, chromatic step,
  fi in the scale, hard-mode row always shown — all caught).
- On-device still to check: the cadence's balance and loudness on the phone speaker vs earphones.

## What changed this session (v43 → v44) — Interval Ear Test (streak mode)
User asked for the Hear the Third quiz as a separate test to come back to, harder, with the root
jumping around, recording how many correct answers in a row before the first miss.
- Practice tab → "Interval ear test" (also a card on Progress, and a pointer in Hear the Third's
  hints). Opens as a detail overlay (`openEarTest`), no mic.
- Engine `et*`, separate from the lesson's `iq*` quiz: `etPick` (pure) picks any interval of the
  level from a root that moves every round, both notes within C3–C5; sudden death — the first miss
  ends the run, names the right answer and replays it. Stop abandons a run without recording it.
- Levels: 1 = step/3rd/5th, 2 = + minor 3rd/4th, 3 = + 6th/octave; "Both notes together" toggle
  (harmonic intervals). Each level × mode keeps its own best (`etKey`: '1', '1t', …).
- Storage: `S.__ear = {best:{key:n}, runs:[{d,k,n}]}` (capped at 200, via `etRecord`, pure), so it
  rides along in Backup. Each finished run calls `markDayActive()`. Last 12 runs at the selected
  level show as a single-hue bar chart with the best emphasised.
- Harness: 280 assertions (+20). Mutation-tested (repeat root, equal-counts-as-best, range ignoring
  the interval, uncapped log — all caught).
- On-device still to check: tone timbre/volume for harmonic (together) intervals on the phone speaker.

## What changed this session (v42 → v43) — Module 2 rebuilt as a gentler ladder
User struggled with Module 2: after hearing the root they could neither sing nor imagine the
harmony, and the minor 3rd and 4th were worse. Diagnosis: production was asked before recognition,
the walk-up went straight to a cold jump, the root changed every trial (no key settles), the minor
3rd / 4th were taught as bare jumps from the root (minor 3rd above do is not even in the key), and
old 2.4 crammed three intervals into one lesson. New order (ids → on-screen numbers by position):
  Part 1 · Find the third: 2.1 Walk Up (2.1) · 2.hear Hear the Third (2.2, NEW listening quiz) ·
  2.echo Echo the Third (2.3, NEW) · 2.half Half a Walk (2.4, NEW) · 2.2 Jump to It (2.5, now
  steady root then random) · 2.6 First Thirds in a Song (2.6, moved up) · 2.3 The Lock (2.7)
  Part 2 · More intervals: 2.4 The 5th (2.8, repurposed) · 2.4th The 4th (2.9, NEW) · 2.min Minor
  Thirds, Where They Live (2.10, NEW, in-key re/mi/la) · 2.5 Thirds in a Key (2.11) · cpB.
- Ids never change (progress keys); `lessonNo(id)` numbers by position (checkpoints and the 3.5
  songs keep their labels). Old 2.4 jump scores for the 5th (jump['7']) and 4th (jump['5']) carry
  over. The bare "minor 3rd up from the root" drill and review skill are gone.
- New `intervalQuiz` check (listening, no mic): two notes, tap Step/3rd/5th; a wrong answer
  replays the right one; each session is a shuffled deck with the target in half the rounds
  (`iqDeck` — the first version, uniform random, played the 3rd once in 10 rounds).
- Jump engine: `interval` is the storage key, `iv` the semitones; `cue`: root | echo (hear the
  answer, sing it back) | half (hear do–re, sing mi; stepping is allowed) | key; `steady` keeps one
  root all session; `degs` limits in-key degrees. Every miss now replays the right answer.
- Anchor tunes (`ANCHORS`, `playAnchor`): saints (3rd), Twinkle (5th), Here Comes the Bride (4th),
  nyah-nyah sol→mi (minor 3rd), played from the current root. Path shows Part 1 / Part 2 labels.
- Max drill-only stretch before Module 3 still 6 (song moved into Part 1 to keep it so).
- Harness 260 (+35 incl. updates), mutation-tested. Browser: Today → Hear the Third opens with no
  tuner and no mic request; quiz 8/10 passes and ticks; echo / half / steady / random / minor-echo
  cues and scoring all as designed; misses replay; both themes pass the contrast scan.

## What changed earlier this session (v41 → v42) — needle jitter on the phone speaker
User reported a jittery needle while holding steady, practising on the **phone speaker**. Diagnosis by
simulation (the app's own autoCorrelate, frame-by-frame at 30/s on a realistic held E3 with natural
wobble): harmonics, vibrato, breath and room noise are all read correctly and steadily (<1¢/frame).
The cause is the **drone leaking from the speaker into the mic** (bottom speaker sits beside the bottom
mic): up to ~2× the voice level the tuner still reads the voice; at ~2.5–3.5× it flips between voice,
drone and in-between notes (24–62¢/frame, 300¢ jumps); at 4×+ it reads only the drone. Smoothing
cannot fix that (best filter still jumped ~300¢). Fix = wired earphones; the app now helps:
1. **Leak check** (`leakCheck`, run from togglePitch): a soft 0.36 s 3.15 kHz beep, above every tracked
   note; mic level at that frequency before vs during (`leakVerdict`: ≥18 dB rise and > −90 dB). On a
   leak, an amber note in the tuner card (`.pd-leak`, `paintLeak`); cleared on stopPitch.
2. **Drone volume** slider in the tone panel (20–100%, `TS.droneVol`, saved in meta().droneVol,
   `droneGain`/`setDroneVol`), applied live to playing drone voices.
- Harness +11 (236). Browser, end to end: app output looped into its own "mic" (speaker) → beep heard
  at −38 dB → warning shown; silent-but-noisy mic (earphones, −102 dB floor) → +0.7 dB → no warning;
  slider at 40% took drone gains 0.13/0.11 → 0.052/0.044 live.
- Not built (offered, user declined for now): an opt-in "speaker mode" using the phone's echo
  cancellation — only judgeable on the iPhone. Bluetooth earphones remain unsuitable (call-mode mic).

## What changed earlier this session (v40 → v41) — Progress tab redesign (release 3) + practice days
- **Practice days now count practice.** The streak used to tick only on mastering a lesson or
  finishing a daily review, so a session of holds that didn't end in mastery counted for nothing,
  and the stored streak kept showing a run that had already ended. Now: `meta().days` is a dated
  history ('YYYY-MM-DD', last 400), backfilled once on first read (`backfillDays`: the current
  streak's run, every dated hold attempt, each review skill's last date); every scored attempt
  calls `markDayActive()` (all 9 scoring sites: scoreStep, finishJump, finishEar, duetMelStopped,
  scoreDuetHarm, scoreImprov, scoreRowRun, recordHold, recordDrift); `curStreak()` shows 0 once a
  day is missed (Today pill and Progress both use it).
- **Progress tab:** stat tiles (day streak, best, lessons x/29); a 12-week practice calendar
  (Monday-first, one hue on a neutral track, today outlined, tap/hover a day for its date — the
  count is the readable value); modules as rows with ring + same-ramp meter (tap → Path with it
  open); daily-review accuracy per skill (landed/last-10 as text + meter + "2d ago"), with an empty
  state; checkpoints as Path-style rows (Passed / Ready / Test out / Locked).
- Followed the dataviz guidance: stat tiles not charts, body sans (not display) for the numbers,
  single hue, values as text so nothing depends on a tooltip, dark mode from its own tokens.
- **Fixed a v40 bug (live in v40):** an empty dark/light pill sat over the middle of the tab bar.
  It was the hidden toast: v40 raised its resting spot above the tab bar but kept the old 80px
  slide-down, so ~22px stayed on screen. Hidden now = opacity 0 + visibility hidden + no taps.
- Harness +15 (225), mutation-tested (stale streak, double-recorded day, no backfill, calendar
  counting out-of-window days — all caught). Browser: both themes pass the contrast scan, no
  sideways scroll, and a scored hold recorded today and extended a 4-day run to 5.

## What changed earlier this session (v39 → v40) — UI/UX redesign (Hyrox/"The Rebuild" family look)
Approved from a mockup canvas (Today / Path / Lesson, light + dark): https://claude.ai/artifact/4s8HqRf2csE73yJDH5CUeV
- **Palette + type:** Hyrox's eucalyptus tokens (accent #2C6A5A light / #6DBFA6 dark), Archivo 800
  for headlines, purple kept for checkpoints/test-outs. **Dark mode** follows the phone; Auto/Light/
  Dark in the ⋯ menu (pref in localStorage `harmony_theme`, NOT in the backup). A small
  `<script id="theme-boot">` in <head> sets `data-theme` before first paint.
- **Every colour is a token now** — the apply step aborted if any hex remained in the stylesheet.
  New tokens: --on-accent, --accent-line/hover, --amber-line, --purple-line, --red-bg, --on-red,
  --pink(-bg), --track, --zone, --scrim, --f-display, --f-mono, --tabbar-h.
- **Navigation:** 11 top tabs → bottom tab bar Today · Path · Practice · Progress (`renderNav`,
  `navTab`). New **Path** view (`renderPath`, `pathOpen`, `togglePath`): vertical roadmap, ring/check/
  lock nodes, current module expanded with its goal text + lesson rows, Test-out pills on locked
  modules. Old numeric module views map to Path (`go(2)` opens Path with M2 expanded).
  Backup/Restore/Reset, Range check and Reference moved into the ⋯ menu (`toggleMenu`).
- **Today** restyled as mocked (pills, eyebrow, big title, chips, one CTA, test-out, warm-up card,
  daily-review card with skill chips via `reviewChipsHTML`).
- **Lesson screen:** back button + crumb; tool first; tasks / Live log / Standards / Notes in
  `<details>` sections; **Mark mastered pinned** in `#dFoot` via `paintFooter()`, repainted from
  `paintLessonLog` and ticks, so an auto-pass shows even with the log folded. Ticking a task or
  standard no longer redraws the lesson (it used to stop the tuner and drone).
- **Tuner = gauge:** semicircle SVG, needle rotated by `setNeedle()`, green arc drawn from
  `lockWindow().grab` (`zoneArc`) so the progressive window is visible. Target line ("Sing E4")
  replaces the emoji readout; Step/3rd/5th is a segmented switch synced in `syncHoldTarget`;
  drone/tuner/hold buttons are icon toggles; hold count is an 8-segment bar.
- **Emoji → line icons** (`ico()`/`ICONS`); the apply step aborted if any pictograph emoji remained.
- Verified in the browser at phone width: every view and every lesson type in BOTH themes passed
  an automated text-contrast scan (all ≥ 3:1), no sideways scroll; tick/auto-pass/footer, Path
  fold + test-out, ⋯ menu + theme switch, one-tap Start (tuner + drone) all checked. Harness 210 green.
- Progress tab redesign followed in v41 (release 3).

## What changed earlier this session (v38 → v39) — pedagogy items 4 + 8 (the last two)
4. **Songs earlier.** Modules 1–2 were 11 drill-only lessons before any music. Two new song
   lessons, placed at each module's END (not mid-module: lesson ids are the progress keys, so
   inserting after 2.2 would have meant renumbering): **1.5 First Song** — Row Your Boat MELODY
   from memory, scored by the existing memory run with `target:'mel'` (panel hides harmony
   controls via `melodyOnlyLesson()`); **2.6 First Thirds in a Song** — harmony over the first
   phrase (`SONGS.row1` = row.notes.slice(0,10)), right after 2.5's in-key thirds. Longest
   drill-only stretch before Module 3 is now 6 (cpA + 2.1–2.5).
8. **Harmony below.** Song panel has a ▲ Above / ▼ Below part switch (`TS.part`, saved in
   meta().part). Below line is DERIVED, not stored: `belowOf` = diatonic third below, except
   under "do" → "sol" (4th below; the third below, "la", would change the chord and leave the
   final note unresolved), plus per-song `bfix` hand fixes for singability (row: C4 under
   "life" instead of a 9-semitone leap; auralee: G–F–G under re–la–re instead of a B–F–B
   tritone). Playback, scored runs and the self-duet all read harmony via `harmOf(n,i)`. It is
   a genuinely different line on purpose — the scorers fold octaves, so the high part an
   octave down would already score as correct and would add nothing. Runs record their part.
- Also fixed in passing: every song panel was titled "Row Your Boat — in thirds"; it now
  shows the current song.
- Harness +38 (210 total), mutation-tested (7 breaks, all caught); singability guards on every
  song's below line (3rd–5th under the melody, no leap over a 4th, no tritone).
- Browser-verified: 1.5 panel + a scored melody run (harmony-instead fails with melody advice;
  melody in another key passes; std ticks); S1 with ▼ Below — playback, run windows and duet
  grid are all the below line, a below run scores clean and is tagged; 2.6 opens on row1;
  part choice survives a reload.
- **Not verified:** how the below lines SOUND — they are rule-generated plus two hand fixes, so
  an ear check is worth doing, like any arrangement.

## What changed earlier this session (v37 → v38) — pedagogy items 6 + 7
6. **Daily drill → daily review** (openQuick rewritten; old manual root/reveal/self-score drill
   removed). An auto-scored 10-trial mix on the jump engine (`jdReview`, one REVIEW_SKILLS id per
   trial: unison, step, M3, m3, P4, P5, key3). Pool (`reviewPool`) = skills whose teaching lesson
   is mastered + the skill of the lesson you're on now (`REVIEW_FRONT`), so it's useful from 1.1.
   `planReview` covers every pool skill once, fills the rest by weight (`reviewWeight` = 0.5 +
   staleness up to a week + 1.5 × recent miss rate), then shuffles. Misses replay the answer.
   Finishing logs the streak (M.quick++) and saves per-skill history (last 10 + date) in
   `meta().review`. Stopping mid-way doesn't log. Manual "log by hand" link kept. Drone holds stay
   in the lessons (the jump engine can't run a drone hold).
7. **Progressive lock window** (`LOCK_TIERS` / `lockTierFor` / `lockWindow`): the lamp — and every
   hold scored from pdLocked, plus the 1.2 drift detector — is gentle ±35¢ (keep 45) in 1.1–1.4,
   standard ±30¢ at cpA, tight ±24¢ (the old constants, so M2+ scoring unchanged) from 2.1 on.
   Outside a lesson it follows nextLessonId(). The 🎯 readout now states the window, and 1.1 got a
   readout. **Needs an on-device feel check** — ±35¢ is a judgement call.
- Harness +22 (172 total), mutation-tested; two survivors found → tests tightened until caught.
- Browser-verified (localhost, phone viewport): review mix chips (due flags), a full 10-trial
  review (plan covers all 5 skills, misses say "wanted X" + replay, streak logged, stats saved);
  a 30¢-sharp hold reads LOCKED in 1.1 and "a touch high" in 2.3.

## What changed earlier this session (v36 → v37) — pedagogy review, items 1/2/3/5
User hadn't been using the app; a full curriculum review found the spine sound but the app
hard to START and one real content gap. Four upgrades shipped (items 4/6/7/8 deferred — see Open tasks):
1. **Today landing screen** (`view='today'`, new first nav tab; startup IIFE + setup save/skip now
   land there). Shows the next lesson (`nextLessonId()` = first unmastered lesson after the
   furthest mastered one, so a test-out moves you forward) with ONE tap: `startSession(id)` opens
   it, starts the live tuner, then the drone for drone lessons (`droneLesson()`: tone-tool holds
   with onDrone/offDrone, or tone-tool step drills). Tuner FIRST so the drone is built on the
   capture-mode context and no later rebuild silences it. Also: range-check card if no profile,
   test-out offer, daily-drill fallback, streak line.
2. **Test out via checkpoint.** `canChallenge(id)`: any fully auto-scored checkpoint (cpA, cpB,
   cpC) opens even while locked, with a test-out banner; module header + Today offer it.
   `passCheckpoint(id)` (called from markMastered for any cp) masters every lesson in that module.
3. **Auto-scored checkpoints pass without a recording.** `cpAutoCovers(l)` = every std is ticked
   by an auto check → recording becomes "Optional: record a take"; no "recorded" gate. cpD and
   cpFinal (not machine-scorable) still require the recording, by design.
5. **New lesson 2.5 "Thirds in a Key"** (after 2.4, before cpB) — fills the gap that Module 2
   drilled only the MAJOR third up from "do" while the song harmonies are 37–58% MINOR thirds
   (row 10/27, grace 7/14, auralee 7/12). Reuses the jump drill: a jumpN check with
   `inKey:true, interval:'key3'` (also its s.jump storage key). Each trial plays "do" then a
   random degree (do re mi fa sol la); you sing the diatonic third above it (`keyThirdAbove`:
   major over do/fa/sol, minor over re/mi/la); then the cue+answer pair is played back. `jdTgt`
   now holds every trial's target. **cpB gained std[2]** (8/10 in-key thirds) so a cpB test-out
   can't skip the gap.
- Harness +30 (150 total), all mutation-tested (each new rule broken → harness fails).
- Browser-verified on localhost (phone viewport): Today render, test-out → Module 2 mastered →
  Today advances to 3.1; one-tap start on 1.1 (tuner only), 1.2 (unison target + drone), 1.3
  (3rd target + drone; ctx play-and-record, drone alive); in-key judging right/right/wrong-
  quality/walked-up all correct; finishJump stores key3 + ticks std.
- **Not verifiable in the pane (needs iPhone):** real mic capture (pane mic is denied) and live
  pitch-loop timing (hidden pane throttles rAF to ~2 fps). The in-key drill's acoustic path is
  the existing shared detector; only its targeting/judging is new.

---

## What this project is
Single-file vanilla-JS PWA that teaches vocal-harmony singing. Installed as a PWA on the
user's iPhone (iOS Safari); **headphones assumed for every mic exercise.** The entire app is
`index.html` (HTML + CSS + one inline `<script>`, ~1700 lines) plus `sw.js` (offline cache).
No build step, no framework, no dependencies. Node is used **only** as an offline test harness,
never at runtime. Full architecture + check-kind reference is in `CLAUDE.md`.

## Working rules (from CLAUDE.md — do not break)
1. **Keep it single-file.** No bundler / modules / deps unless the user explicitly asks.
2. **Parse-check after every edit** (command in CLAUDE.md §2).
3. **Bump BOTH version markers together on any shippable change** or the PWA serves stale cache:
   `index.html` build marker `title="build">vN` **and** `sw.js` `harmony-vN`. Currently **v32**.
4. **Validate scoring logic with the node harness before shipping** — parse-OK is not enough.
5. **Never claim acoustic / iOS behaviour proven from the sandbox.** All harness audio is mocked;
   mic accuracy, iOS AudioSession, drone/duet timing can ONLY be verified on the iPhone — flag it.
6. The user handles git (commit/push) and the on-device hard-reload + version-check.

## Test harness (added this session — `test-scoring.js`)
Zero-dependency Node harness. It extracts the inline `<script>` from `index.html`, boots it in a
mocked-DOM sandbox, and asserts the scoring surface against synthetic pitch samples.
```
node test-scoring.js        # exit 0 = all green — currently 97 assertions
```
Covers: `classifyMemory` / `classifyHarmony` / `classifyImprov`, `checkMet` across every check
kind, `evaluateAuto` std-ticking, `rowRunOk` run-type cross-count guards, the drone-relationship
hold guards (below), and a guard that Modules 4 / 5.3 / 5.4 stay unscored. Mutation-tested — it
was confirmed to fail when the scoring logic is deliberately broken, so green means something.

## Tuner-target audit — every mic lesson swept (v36)
Checked all lessons for the "needle aimed at the wrong note" family. Findings + fixes:
- **hold8** (1.1 plain, 1.2 onDrone, 1.3/cpA/2.3 offDrone) — fixed v34 (holdOff/holdTargetSemi).
- **stepSeq** (1.4, 2.1) — fixed v35 (stepRetarget tracks the sung step). 2.1 gets it free via the
  shared loopPitch path; its textual guidance comes from the step drill's own "Sing: do re mi".
- **rowRun / duet** (3.1, 3.2, 3.3, cpC, S1, S2, S3) and **improv** (5.1, 5.2, cpFinal) — FIXED v36:
  these are scored offline from a whole recorded run, but the tuner was pinned to the root, so a
  moving harmony line read "sharp" throughout. openLesson now calls clearTarget() for tool 'row'
  and 'improv' → the needle is a free chromatic tuner (intonation vs nearest note), not a fixed
  root. New clearTarget(); +4 harness assertions (120 total).
- **jumpN** (2.2, 2.4, cpB) — already correct: jdNext sets the target to the note you jump to
  (root+interval), not the root. No change.
- **earQuiz** (2.3 std[1]) — no mic; N/A.
- **Module 0 range probe** — measures range, no target; free mode already. N/A.
Bumped v35 → v36 (this commit folds in the v35 Steps Away change).

## What changed this session (v34 → v35)
**Steps Away (1.4) tuner fix — same "asks me to sing unison" family as Tug-of-War.** The step
drill scores independently (`feedStep` measures the sung pitch vs the drone root and matches the
do–re–mi–re–do *shape*), but `armStep` pinned the live-tuner needle to the root, so singing re/mi
read as "sharp against unison". Fix: new `stepRetarget()` aims the needle at the nearest allowed
scale degree the singer is on (do/re/mi) each frame while the drill runs, so every landed step
reads in tune; scoring is untouched (feedStep never reads `pdTargetHz`). The 🎯 readout now also
covers step lessons ("Sing do · re · mi · re · do — the needle follows the note you're on"). Harness
+5 assertions (116 total) driving `stepRetarget` snap-to-nearest-degree. Bumped v34 → v35.

## What changed this session (v33 → v34)
**Tug-of-War (1.3 / cpA / 2.3) target fix.** The live tuner scores against a *target* note
(`pdTargetHz`). Root cause of the "it asks me to sing in unison" complaint: the target defaulted
to the root AND got reset to the root by `toggleDrone`/`setRoot` — including the automatic drone
restart when the tuner rebuilds the audio context on capture. So enabling the tuner snapped the
target back to unison, the needle rewarded the drone's own note, then the `offDrone` check scolded
the singer at 8 counts. Fixes:
- New persisted `TS.holdOff` (offset above the root the tuner is aimed at) + `holdTargetSemi()`.
  Interval buttons set it; drone/root toggles now respect it instead of hard-resetting to root.
- `openLesson` defaults `holdOff` to a **3rd** for offDrone lessons (root/unison otherwise), so
  the tuner guides toward the 3rd from the start. Design decision (user): valid Tug-of-War hold =
  **a 3rd or a 5th**, default the 3rd; not "any note".
- New `🎯` target readout in the tone panel names the exact note to sing ("Sing E — a 3rd above
  the drone C"), so needle and scorer can never point at different notes.
- Harness: +9 assertions (111 total) driving `setTarget`/`holdOffDroneOk`/`holdOnDroneOk` to prove
  a 3rd/5th target passes offDrone, a unison target passes onDrone, and the target survives a root
  change. Bumped both markers v33 → v34; parse-check + harness green.
- **STILL on-device only (not fixed in code, iOS platform behaviour):** (a) drone goes quiet when
  the tuner turns on — `play-and-record` routes output to the earpiece unless headphones are in,
  and the rebuilt AudioContext may need a gesture to resume; (b) Bluetooth earphones failing to
  capture voice (iOS HFP flakiness). Retest both on the iPhone with WIRED headphones.

## What changed earlier this session (v32 → v33)
**Task B — bridge-song melody verification, DONE.** Both `grace` (Amazing Grace) and
`auralee` (Aura Lee) in the `SONGS` registry were wrong first-draft transcriptions, now
corrected in the key of C against cross-verified references:
- **Amazing Grace** (New Britain, lines 1–2): verified against the abcnotation.com hymnal
  transcription AND noobnotes.net letter-notes — both agree exactly. The old data mis-set
  "how sweet the sound" and "a wretch like me"; corrected to the canonical pentatonic line.
- **Aura Lee** (Poulton, first two phrases): verified against the abcnotation.com transcription
  (AABA repeat structure confirmed). The old data was a descending scale that isn't the tune;
  corrected to the characteristic "As the black-bird" sol-do-ti-do opening.
- Harmonies recomputed as the diatonic third above each melody note (matches the `row`/`SONGS`
  convention); rhythm/phrase-length kept as-is to minimise change.
- **Harness fixtures added** (`test-scoring.js`, now 102 assertions): pin both melody arrays to
  the verified transcriptions, assert the diatonic-third harmony invariant, and guard that
  Amazing Grace stays pentatonic. Green means a future stray edit can't silently corrupt them.
- Versions bumped **v32 → v33** in both markers; parse-check + harness green.
- **STILL NEEDS on-device retest** (see Open tasks) — the pitches are proven in the sandbox,
  the acoustics are not.

## What changed last session (v29 → v32)
**The drone-relationship hold-scoring fixes.** The `hold8` scorer used to tick a lesson's
standard for holding *any* target note steady, without checking that note's relationship to the
drone — so it under-verified the written standard. Fixed:

- **`offDrone`** (lessons `1.3` Tug-of-War, `cpA`, `2.3` The Lock): a hold counts only when the
  **drone is ON** and the held note is a real interval **OFF** the root (≥ ~a whole step). A
  unison hold no longer passes these "hold a different / a third against the drone" lessons.
- **`onDrone`** (lesson `1.2` Hold Against the Drone): the mirror — a unison hold counts only
  when the **drone is ON** and the note sits **AT** the root (< ~a whole step).
- **`1.1` Land the Note**: dropped std[2] ("verified by listening back to a recording") from the
  auto-tick — the app can't confirm a recording was heard, so it's now a **manual** attestation
  the user ticks by hand.
- Implementation: shared helper `holdVsDroneCents()` + `holdOffDroneOk()` / `holdOnDroneOk()`
  sit just above `recordHold` in `index.html`; the check config carries `offDrone:true` /
  `onDrone:true` in the `MODULES` data.

**Module 1–2 scoring audit — DONE.** Every auto-scored lesson was checked against its written
standard. Findings: `2.3` had the identical off-drone bug as `1.3` (fixed); `1.2` and `1.1`
tightened as above. All other scorers — `stepSeq` (1.4, 2.1), `jumpN` (2.2, 2.4, cpB),
`earQuiz` (2.3), `driftReturn` (1.2) — verified faithful. Module 4 (real recordings), 5.3, 5.4
are intentionally manual/unscored by design (can't be machine-scored); a harness guard now
protects that from a stray auto-check.

## Open tasks / next steps
- **On-device check of v37:** Today → one tap → tuner (and drone on 1.2/1.3/1.4/cpA/2.3) comes on
  with ONE mic prompt; drone stays audible in wired headphones. Then try 2.5's in-key drill.
- **Pedagogy review backlog: empty.** 1/2/3/5 shipped v37, 6/7 v38, 4/8 v39. What's left are
  feel checks on the phone: the ±35¢ Module 1 lock window, and how the below lines sound.
- **[Task B] — DONE this session** (grace/auralee corrected + pinned in the harness; see above).
  Only optional extension left: the fix keeps each song at its current phrase length (grace =
  lines 1–2, auralee = first two phrases). Extend to the full verse later if desired.
- **On-device (iPhone) retest of the v33 melody fix.** After a hard reload to v33, sing through
  the interlude-module song lessons for Amazing Grace and Aura Lee and confirm the corrected
  melodies score correct singing (the old wrong pitches would have failed a correct rendition).
- **On-device (iPhone) retest of the v30–v32 hold changes** (sandbox proves the math, not the
  acoustics). After a hard reload: `1.1` third standard stays manual; `1.2` counts only a
  unison hold vs a live drone; `1.3` / `2.3` count only a note held OFF the drone.

## How to resume
1. `git clone https://github.com/choonang-lab/Vocal-Harmony` (or open the existing clone).
2. Read `CLAUDE.md`, then this file.
3. Run `node test-scoring.js` — confirm a green baseline **before** changing anything.
