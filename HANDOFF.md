# HANDOFF — 和声 · Harmony Path

> **Resuming on another machine / in the Claude Desktop app?**
> The Desktop app does **not** auto-read repo files. To pick up the session, either
> (a) paste this whole file into your first message, or (b) if you have the GitHub
> connector, tell Claude: *"Read HANDOFF.md and CLAUDE.md in choonang-lab/Vocal-Harmony,
> then continue."* Read `CLAUDE.md` (architecture, conventions, landmines) alongside this.

**Last updated:** 2026-11-16 · **Build: v38 / harmony-v38** — live on GitHub Pages (pedagogy items 6 + 7; the commit after 452d66c). Earlier: v37 `2bf0334` (pedagogy items 1/2/3/5). Earlier: v36 `723d206` (tuner-target audit), v34 `eee3853`, v33 `15cad1e`.

## What changed this session (v37 → v38) — pedagogy items 6 + 7
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
- **Deferred pedagogy items from the v37 review** (1/2/3/5 shipped v37, 6/7 shipped v38):
  4. A song taste earlier — 10 drill-only lessons before any music (e.g. Row Your Boat melody
     over the drone in M1; its first phrase in thirds right after 2.2).
  8. Harmony below the melody available in the songs (needs a second harmony line per song).
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
