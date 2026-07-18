# HANDOFF — 和声 · Harmony Path

> **Resuming on another machine / in the Claude Desktop app?**
> The Desktop app does **not** auto-read repo files. To pick up the session, either
> (a) paste this whole file into your first message, or (b) if you have the GitHub
> connector, tell Claude: *"Read HANDOFF.md and CLAUDE.md in choonang-lab/Vocal-Harmony,
> then continue."* Read `CLAUDE.md` (architecture, conventions, landmines) alongside this.

**Last updated:** 2026-07-18 · **Build: v34 / harmony-v34** — staged locally (Tug-of-War target fix), not yet committed/deployed. v33 (SONGS melody fix) committed `15cad1e` and deployed live. Previous: v32, commit `2843612`.

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
