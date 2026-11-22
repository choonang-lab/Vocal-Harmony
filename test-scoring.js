/* 和声 · Harmony Path — offline scoring harness
   ------------------------------------------------------------------
   Node-only regression tests for the auto-scoring LOGIC. No runtime
   dependency, no build step — the app stays single-file. This reads the
   inline <script> out of index.html, boots it inside a mocked-DOM sandbox,
   and exercises the pure scorers + checkMet/evaluateAuto against synthetic
   pitch samples.

   Run:  node test-scoring.js        (exit 0 = all green, 1 = a failure)

   What it does NOT prove (see CLAUDE.md "On-device gap"): anything acoustic
   — real mic capture, iOS AudioSession, duet playback sync, low-note clarity,
   improv reaction lag. All audio here is synthetic. Those need the iPhone.
*/
'use strict';
const fs = require('fs');
const path = require('path');

/* ---------------------------------------------------------------- */
/* 1. Extract the inline script (same regex as CLAUDE.md parse-check) */
/* ---------------------------------------------------------------- */
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('FATAL: could not find <script> block in index.html'); process.exit(1); }
const js = m[1];

/* ---------------------------------------------------------------- */
/* 2. Sandbox — mock just enough DOM/host for the script to boot.    */
/*    The script runs init()/render() at load; everything it touches */
/*    there is a stub. None of the scorers need real audio.          */
/* ---------------------------------------------------------------- */
function stubEl() {
  return {
    innerHTML: '', textContent: '', value: '', className: '', scrollTop: 0,
    disabled: false, checked: false, files: [], style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, removeChild() {},
    remove() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return stubEl(); }, querySelectorAll() { return []; },
    getContext() { return null; }, click() {}, focus() {}, blur() {},
    scrollIntoView() {}, closest() { return null; },
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0 }; }
  };
}
class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createOscillator() { return { frequency: { value: 0, setValueAtTime() {} }, type: '', connect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  createBuffer() { return {}; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
  createAnalyser() { return { fftSize: 0, frequencyBinCount: 1024, getFloatTimeDomainData() {}, connect() {} }; }
  createMediaStreamSource() { return { connect() {} }; }
  decodeAudioData() { return Promise.resolve({}); }
}
const _ls = {};
const sandbox = {
  document: {
    getElementById: () => stubEl(), querySelector: () => stubEl(),
    querySelectorAll: () => [], createElement: () => stubEl(),
    addEventListener() {}, removeEventListener() {},
    body: stubEl(), documentElement: stubEl()
  },
  window: {
    AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext,
    addEventListener() {}, removeEventListener() {}, scrollTo() {},
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    MediaRecorder: undefined
  },
  navigator: {},                 // no serviceWorker / audioSession / mediaDevices
  localStorage: {
    getItem: (k) => (k in _ls ? _ls[k] : null),
    setItem: (k, v) => { _ls[k] = String(v); },
    removeItem: (k) => { delete _ls[k]; },
    clear: () => { for (const k in _ls) delete _ls[k]; }
  },
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  URL: { createObjectURL: () => 'blob:', revokeObjectURL: () => {} },
  confirm: () => false, alert: () => {},
  console
};

/* ---------------------------------------------------------------- */
/* 3. Boot the script and expose the scoring surface.                */
/*    `with(this)` makes sandbox props act as globals; block-scoped   */
/*    top-level fns/lets don't leak, so we hand them back explicitly. */
/* ---------------------------------------------------------------- */
const EXPOSE = [
  'classifyMemory', 'classifyHarmony', 'classifyImprov',
  'checkMet', 'evaluateAuto', 'autoChecks',
  'rowRunOk', 'rowScore', 'rowFold', 'improvScore', 'improvRunOk', 'holdScore',
  'holdOffDroneOk', 'holdOnDroneOk', 'setTarget', 'holdTargetSemi',
  'stepRetarget', 'freq', 'clearTarget', 'centsToTarget',
  'keyThirdAbove', 'KEY_DEGS', 'cpAutoCovers', 'canChallenge', 'passCheckpoint',
  'nextLessonId', 'moduleOf', 'droneLesson', 'renderToday',
  'LOCK_TIERS', 'lockTierFor', 'lockWindow',
  'REVIEW_SKILLS', 'reviewPool', 'reviewWeight', 'planReview', 'recordReview',
  'belowOf', 'belowLine', 'harmOf', 'rowRunOk', 'setPart',
  'meta', 'markDayActive', 'curStreak', 'calendarHTML', 'reviewAccHTML', 'dstr', 'todayStr', 'yestStr',
  'leakVerdict', 'LEAK_DB', 'droneGain', 'setDroneVol',
  'lessonNo', 'micLesson', 'jumpChecks', 'ANCHORS', 'iqDeck', 'etPick', 'etRecord', 'etKey', 'ET_LEVELS', 'IQ_SHORT', 'IQ_NAMES', 'DG_LEVELS', 'DG_NUM', 'DEGN', 'dgPickKey', 'dgResolve', 'streakProgHTML', 'thinkOf', 'thinkSecs', 'setThink', 'afterCue', 'beginListen', 'feedJump', 'jumpDrillHTML',
  'winMidOf', 'medOf', 'st', 'isMastered', 'statusOf', 'lessonById',
  'curNotes', 'setSong', 'MODULES', 'SONGS', 'FLAT', 'TS'
];
const wrapper = new Function(
  'with(this){\n' + js +
  '\n;return {' + EXPOSE.join(',') +
  ',getJd:function(){return {state:jdState,early:jdEarly,results:jdResults};},setJd:function(o){jdActive=o.active!==false;jdState=o.state||"idle";jdReview=!!o.review;jdTgt=o.tgt;jdRoot=o.root;jdIv=o.iv;jdCue=o.cue||"root";jdInKey=false;jdResults=[];jdTrial=1;jdTrials=10;jdEarly=0;jdCap=[];},getS:function(){return S;},setS:function(v){S=v;},getKey:function(){return SONGKEY;},getTgt:function(){return pdTargetHz;}};}'
);
let A;
try { A = wrapper.call(sandbox); }
catch (e) { console.error('FATAL: script failed to boot in sandbox:\n', e); process.exit(1); }

/* ---------------------------------------------------------------- */
/* 4. Tiny assertion framework (no deps).                            */
/* ---------------------------------------------------------------- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) { pass++; } else { fail++; fails.push(msg); console.log('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
function group(name) { console.log('\n• ' + name); }

/* ---------------------------------------------------------------- */
/* 5. Synthetic-audio builders.                                      */
/*    Windows/samples mirror what startRowRun / genMelody produce.   */
/* ---------------------------------------------------------------- */
const semiToHz = (s) => 440 * Math.pow(2, ((s + 60) - 69) / 12);   // s = semitones from C4
/* Contiguous per-note windows, exactly like rowWindows. */
function buildWins(notes, bpm, key) {
  const beat = 60 / (bpm || 96); let t = 0; const wins = [];
  notes.forEach((n) => { const d = n[2] * beat; wins.push({ start: t, end: t + d, mel: n[0] + (key || 0), harm: n[1] + (key || 0) }); t += d; });
  return wins;
}
/* Improv windows carry only .mel (melody the app generated). */
function buildImvWins(mel, bpm) {
  const beat = 60 / (bpm || 96); let t = 0; const wins = [];
  mel.forEach((n) => { const d = n[1] * beat; wins.push({ start: t, end: t + d, mel: n[0] }); t += d; });
  return wins;
}
/* pick(win,i) → hz to "sing" in that window, or null to stay silent (a gap).
   Places 4 samples inside the scoring window [start+lag, end+lag]. */
function makeSamples(wins, pick) {
  const out = [];
  wins.forEach((w, i) => {
    const hz = pick(w, i); if (hz == null) return;
    for (let k = 0; k < 4; k++) out.push({ t: w.start + 0.2 + k * 0.03, hz });
  });
  return out;
}
const semis = { unison: 0, min3: 3, maj3: 4, p4: 5, p5: 7, min6: 8, maj6: 9, maj2: 2 };

/* fresh per-lesson state, never mastered (so evaluateAuto/checkMet score it) */
function freshState(id) {
  const S = A.getS();
  delete S[id];
  const s = A.st(id);            // recreates {mastered:false, stds:{}, ...}
  return s;
}

/* ================================================================ */
/*  TESTS                                                            */
/* ================================================================ */
const ROW = A.SONGS.row.notes, ROWBPM = A.SONGS.row.bpm;

/* ---- classifyMemory: transpose-invariant "did they sing the LINE" ---- */
group('classifyMemory (sing-from-memory, any key)');
{
  const wins = buildWins(ROW, ROWBPM);
  // sing the harmony line dead-on
  let r = A.classifyMemory(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 'harm', 0.7);
  ok(r.clean, 'exact harmony line → clean');
  eq(r.mem, true, 'result tagged mem:true');
  ok(r.pct >= 95, 'exact line scores ~100% (got ' + r.pct + ')');
  // same line transposed up a whole step — still the right LINE
  r = A.classifyMemory(wins, makeSamples(wins, (w) => semiToHz(w.harm + 2)), 'harm', 0.7);
  ok(r.clean, 'harmony line transposed +2 semis → still clean (transpose-invariant)');
  // a flat monotone is not the line
  r = A.classifyMemory(wins, makeSamples(wins, () => semiToHz(4)), 'harm', 0.7);
  ok(!r.clean, 'monotone drone → not the line → not clean');
  // total silence
  r = A.classifyMemory(wins, [], 'harm', 0.7);
  ok(!r.clean, 'silence → not clean');
  eq(r.gap, wins.length, 'silence → every window a gap');
}

/* ---- classifyHarmony: absolute, penalises collapse onto the melody ---- */
group('classifyHarmony (hold your line over the melody)');
{
  const wins = buildWins(ROW, ROWBPM);
  let r = A.classifyHarmony(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 0.62, 0.18);
  ok(r.clean, 'exact harmony over melody → clean');
  eq(r.collapse, 0, 'no collapses when singing the harmony');
  eq(r.mem, false, 'result tagged mem:false');
  // sing the MELODY instead = collapse
  r = A.classifyHarmony(wins, makeSamples(wins, (w) => semiToHz(w.mel)), 0.62, 0.18);
  ok(!r.clean, 'singing the melody line → collapse → not clean');
  ok(r.collapse > Math.floor(wins.length * 0.18), 'collapses exceed the collapseMax budget');
  // a single slip stays under budget
  r = A.classifyHarmony(wins, makeSamples(wins, (w, i) => semiToHz(i === 0 ? w.mel : w.harm)), 0.62, 0.18);
  ok(r.clean, 'one slip onto the melody (within budget) → still clean');
  eq(r.collapse, 1, 'that slip is counted (collapse=1)');
}

/* ---- classifyImprov: consonance + correct side, no doubling ---- */
group('classifyImprov (sight-harmonize above / below)');
{
  const mel = [[0, 2], [2, 2], [4, 2], [5, 2], [7, 2], [9, 2], [7, 2], [0, 2]];
  const wins = buildImvWins(mel, 96);
  // a third above every note
  let r = A.classifyImprov(wins, makeSamples(wins, (w) => semiToHz(w.mel + semis.maj3)), 'above');
  ok(r.clean, 'a third above throughout → clean');
  // sing in unison = doubling the tune, not harmony
  r = A.classifyImprov(wins, makeSamples(wins, (w) => semiToHz(w.mel)), 'above');
  ok(!r.clean, 'unison with the melody → doubling → not clean');
  ok(r.doubling / r.total > 0.3, 'doubling flagged over threshold');
  // third BELOW when we were asked for above
  r = A.classifyImprov(wins, makeSamples(wins, (w) => semiToHz(w.mel - semis.maj3)), 'above');
  ok(!r.clean, 'harmonising on the wrong side → not clean');
  ok(r.wrongdir / r.total > 0.3, 'wrong-direction flagged');
  // a major 2nd above = dissonant clash
  r = A.classifyImprov(wins, makeSamples(wins, (w) => semiToHz(w.mel + semis.maj2)), 'above');
  ok(!r.clean, 'seconds above → clash → not clean');
  // dir:'below' path works symmetrically
  r = A.classifyImprov(wins, makeSamples(wins, (w) => semiToHz(w.mel - semis.maj3)), 'below');
  ok(r.clean, 'a third below with dir:below → clean');
}

/* ---- rowRunOk: memory and harmony runs must NOT cross-count ---- */
group('rowRunOk (run-type must match check-type)');
{
  const wins = buildWins(ROW, ROWBPM);
  const memRes = A.classifyMemory(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 'harm', 0.7);
  const harmRes = A.classifyHarmony(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 0.62, 0.18);
  ok(memRes.clean && harmRes.clean, 'precondition: both runs are clean');
  const memCheck = { kind: 'rowRun', memory: true, onPct: 0.7 };
  const harmCheck = { kind: 'rowRun', onPct: 0.62, collapseMax: 0.18 };
  ok(A.rowRunOk(memCheck, memRes), 'memory run satisfies memory check');
  ok(A.rowRunOk(harmCheck, harmRes), 'harmony run satisfies harmony check');
  ok(!A.rowRunOk(harmCheck, memRes), 'memory run does NOT satisfy a harmony check');
  ok(!A.rowRunOk(memCheck, harmRes), 'harmony run does NOT satisfy a memory check');
}

/* ---- rowScore consecutive vs cumulative counting ---- */
group('rowScore (need / consecutive)');
{
  const cleanH = { clean: true, mem: false }, dirtyH = { clean: false, mem: false };
  const s = { rows: { runs: [cleanH, dirtyH, cleanH, cleanH] } };
  const cNeed1 = { kind: 'rowRun', onPct: 0.62 };
  const cNeed3c = { kind: 'rowRun', need: 3, consecutive: true, onPct: 0.62 };
  eq(A.rowScore(cNeed1, s), 3, 'cumulative count of clean harmony runs');
  eq(A.rowScore(cNeed3c, s), 2, 'consecutive count from the end stops at the dirty run');
  const s2 = { rows: { runs: [cleanH, cleanH, cleanH] } };
  eq(A.rowScore(cNeed3c, s2), 3, 'three clean in a row → consecutive=3');
}

/* ---- checkMet across every kind, via synthetic per-lesson state ---- */
group('checkMet (all check kinds)');
{
  // hold8 — cumulative and consecutive
  eq(A.checkMet({ kind: 'hold8', need: 3 }, { attempts: [{ pass: true }, { pass: false }, { pass: true }, { pass: true }] }), true, 'hold8 cumulative meets need=3');
  eq(A.checkMet({ kind: 'hold8', need: 3, consecutive: true }, { attempts: [{ pass: true }, { pass: false }, { pass: true }, { pass: true }] }), false, 'hold8 consecutive: only 2 from the end < 3');
  // driftReturn
  eq(A.checkMet({ kind: 'driftReturn', need: 2 }, { drReps: 2 }), true, 'driftReturn meets need');
  eq(A.checkMet({ kind: 'driftReturn', need: 2 }, { drReps: 1 }), false, 'driftReturn short of need');
  // stepSeq require: inTune / lock / both
  const reps = [{ shape: true, inTune: true, lock: false }, { shape: true, inTune: true, lock: true }];
  eq(A.checkMet({ kind: 'stepSeq', require: 'inTune', need: 2 }, { steps: { reps } }), true, 'stepSeq inTune ×2');
  eq(A.checkMet({ kind: 'stepSeq', require: 'lock', need: 2 }, { steps: { reps } }), false, 'stepSeq lock only 1 → fails need=2');
  eq(A.checkMet({ kind: 'stepSeq', require: 'both', need: 1 }, { steps: { reps } }), true, 'stepSeq both (inTune+lock) ×1');
  // jumpN keyed by interval
  eq(A.checkMet({ kind: 'jumpN', interval: 4, need: 8 }, { jump: { '4': { bestPasses: 8 } } }), true, 'jumpN 8/10 on the 3rd');
  eq(A.checkMet({ kind: 'jumpN', interval: 4, need: 8 }, { jump: { '4': { bestPasses: 7 } } }), false, 'jumpN 7 < need 8');
  eq(A.checkMet({ kind: 'jumpN', interval: 7, need: 7 }, { jump: { '4': { bestPasses: 10 } } }), false, 'jumpN reads the RIGHT interval (5th absent → fail)');
  // earQuiz
  eq(A.checkMet({ kind: 'earQuiz', need: 6 }, { ear: { bestCorrect: 6 } }), true, 'earQuiz meets need');
  // duet requires BOTH phases
  eq(A.checkMet({ kind: 'duet' }, { duet: { melOk: true, harmOk: true } }), true, 'duet: melody + harmony both pass');
  eq(A.checkMet({ kind: 'duet' }, { duet: { melOk: true, harmOk: false } }), false, 'duet: harmony phase failed → not met');
  // improv
  eq(A.checkMet({ kind: 'improv', need: 1 }, { improv: { runs: [{ clean: true }] } }), true, 'improv: one clean run meets need');
  eq(A.checkMet({ kind: 'improv', need: 1 }, { improv: { runs: [{ clean: false }] } }), false, 'improv: no clean run → not met');
  // unknown kind is safe
  eq(A.checkMet({ kind: 'nope' }, {}), false, 'unknown kind → false');
}

/* ---- evaluateAuto integration: passing runs tick the right stds ---- */
group('evaluateAuto → stds (lesson 3.2, two harmony checks)');
{
  const L = A.lessonById('3.2');
  const s = freshState('3.2');
  const wins = buildWins(ROW, ROWBPM);
  const good = A.classifyHarmony(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 0.62, 0.18);
  s.rows = { runs: [good, good, good] };          // three clean, consecutive
  A.evaluateAuto(L, s);
  eq(s.stds[0], true, '3.2 std[0] ticked by need:1 harmony check');
  eq(s.stds[1], true, '3.2 std[1] ticked by need:3 consecutive check');
  ok(L.stds.every((_, i) => s.stds[i]), 'all 3.2 standards satisfied → ready to master');
}

/* ---- evaluateAuto: a memory run alone must NOT tick a harmony std ---- */
group('evaluateAuto cross-count guard (song lesson S1 · Amazing Grace)');
{
  const L = A.lessonById('S1');
  A.setSong('grace');
  const notes = A.SONGS.grace.notes, bpm = A.SONGS.grace.bpm;
  const wins = buildWins(notes, bpm);
  // Only a memory run so far → std[0] (memory) yes, std[1] (harmony-over-melody) no.
  const s = freshState('S1');
  const memRun = A.classifyMemory(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 'harm', 0.7);
  s.rows = { runs: [memRun] };
  A.evaluateAuto(L, s);
  eq(s.stds[0], true, 'S1 std[0] ticked by the memory run');
  ok(!s.stds[1], 'S1 std[1] NOT ticked — a memory run cannot satisfy the harmony check');
  // Now add a harmony run → std[1] ticks too.
  const harmRun = A.classifyHarmony(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 0.62, 0.18);
  s.rows.runs.push(harmRun);
  A.evaluateAuto(L, s);
  eq(s.stds[1], true, 'S1 std[1] ticked once a harmony run lands');
  A.setSong('row');
}

/* ---- Tug-of-war (1.3 / cpA): a hold must be OFF the drone, drone ON ---- */
group('holdOffDroneOk (Tug-of-War must sing a different note vs the drone)');
{
  // data: 1.3 and cpA carry offDrone; 1.1 and 1.2 do not
  const c13 = A.autoChecks(A.lessonById('1.3')).find((c) => c.kind === 'hold8');
  const cpa = A.autoChecks(A.lessonById('cpA')).find((c) => c.kind === 'hold8');
  const c11 = A.autoChecks(A.lessonById('1.1')).find((c) => c.kind === 'hold8');
  const c12 = A.autoChecks(A.lessonById('1.2')).find((c) => c.kind === 'hold8');
  const c23 = A.autoChecks(A.lessonById('2.3')).find((c) => c.kind === 'hold8');
  eq(c13.offDrone, true, '1.3 hold8 requires off-drone');
  eq(cpa.offDrone, true, 'cpA hold8 requires off-drone');
  eq(c23.offDrone, true, '2.3 (hold a locked third) requires off-drone');
  ok(!c11.offDrone, '1.1 (land the note) does NOT require off-drone');
  ok(!c12.offDrone, '1.2 (unison hold) does NOT require off-drone');
  // logic: drone on, target a 3rd/5th above the root → counts
  A.TS.root = 0; A.TS.droneOn = true; A.setTarget(4);   // major 3rd above the drone root
  ok(A.holdOffDroneOk(c13), 'drone on + a 3rd above the root → counts');
  A.setTarget(7);                                        // perfect 5th above
  ok(A.holdOffDroneOk(c13), 'drone on + a 5th above → counts');
  // the exact failure the user hit: holding the drone's OWN note
  A.setTarget(0);
  ok(!A.holdOffDroneOk(c13), "unison with the drone's own note → does NOT count");
  // drone off = no tug-of-war at all
  A.TS.droneOn = false; A.setTarget(4);
  ok(!A.holdOffDroneOk(c13), 'drone off → does NOT count even on a different note');
  // a check without the flag is unaffected either way
  A.TS.droneOn = false; A.setTarget(0);
  ok(A.holdOffDroneOk(c12), '1.2 unison hold still counts (flag absent)');
  A.TS.droneOn = false; A.TS.root = 0; A.setTarget(0);   // restore neutral
}

/* ---- 1.2 tightened: a unison hold must actually be unison vs a live drone ---- */
group('holdOnDroneOk (1.2 unison hold must match the drone)');
{
  const c12 = A.autoChecks(A.lessonById('1.2')).find((c) => c.kind === 'hold8');
  eq(c12.onDrone, true, '1.2 hold8 now requires unison-with-drone');
  A.TS.root = 0; A.TS.droneOn = true; A.setTarget(0);   // sing the drone's own note
  ok(A.holdOnDroneOk(c12), 'drone on + unison → counts');
  A.setTarget(4);                                        // a third above
  ok(!A.holdOnDroneOk(c12), 'drone on + a third (not unison) → does NOT count');
  A.setTarget(7);                                        // a fifth above
  ok(!A.holdOnDroneOk(c12), 'drone on + a fifth → does NOT count');
  A.TS.droneOn = false; A.setTarget(0);                  // drone off
  ok(!A.holdOnDroneOk(c12), 'drone off → unison hold does NOT count');
  ok(A.holdOnDroneOk({}), 'a check without onDrone → always ok');
  // the two guards are mutually exclusive: an offDrone lesson ignores onDrone and vice-versa
  const c13 = A.autoChecks(A.lessonById('1.3')).find((c) => c.kind === 'hold8');
  ok(A.holdOnDroneOk(c13), '1.3 (offDrone) is unaffected by the onDrone gate');
  A.TS.droneOn = false; A.TS.root = 0; A.setTarget(0);
}

/* ---- 1.1 tightened: the "verified by recording" std is no longer auto-ticked ---- */
group('1.1 recording-attestation std is manual, not auto-scored');
{
  const c11 = A.autoChecks(A.lessonById('1.1')).find((c) => c.kind === 'hold8');
  const l11 = A.lessonById('1.1');
  ok(!c11.stds.includes(2), '1.1 hold8 no longer auto-ticks std[2] (listen-to-recording)');
  eq(c11.stds.length, 2, '1.1 hold8 auto-ticks only stds[0,1]');
  eq(l11.stds.length, 3, '1.1 still HAS three standards — std[2] is ticked by hand');
  // integration: a passing hold ticks 0 and 1 but leaves 2 for the user
  const s = freshState('1.1');
  s.attempts = [{ pass: true }, { pass: true }, { pass: true }];
  A.evaluateAuto(l11, s);
  eq(s.stds[0], true, '1.1 std[0] auto-ticked');
  eq(s.stds[1], true, '1.1 std[1] auto-ticked');
  ok(!s.stds[2], '1.1 std[2] stays UNticked until the user attests to it');
}

/* ---- Deliberately-unscored lessons must STAY manual (CLAUDE.md design) ---- */
group('Manual-by-design lessons carry no auto-scoring (M4, 5.3, 5.4)');
{
  // Module 4 = real recordings; 5.3 = creative arrangement; 5.4 = sing with humans.
  // None can be faithfully machine-scored — guard against a stray auto-check landing here.
  ['4.1', '4.2', '4.3', 'cpD', '5.3', '5.4'].forEach((id) => {
    const l = A.lessonById(id);
    ok(l && !l.auto, id + ' has no auto block (manual by design)');
    ok(l && !l.tool, id + ' has no built-in tool panel');
    eq(A.autoChecks(l).length, 0, id + ' exposes zero auto-checks');
  });
  const m4 = A.MODULES.find((m) => m.n === 4);
  ok(!m4.lessons.some((l) => A.autoChecks(l).length > 0), 'Module 4 has no auto-checks of any kind');
}

/* ---- FLAT ordering: the 3.5 float module sits between 3 and 4 ---- */
group('FLAT lesson order (interlude 3.5 between M3 and M4)');
{
  const F = A.FLAT;
  ok(F.indexOf('cpC') < F.indexOf('S1'), 'M3 checkpoint precedes the first song lesson');
  ok(F.indexOf('S1') < F.indexOf('S2') && F.indexOf('S2') < F.indexOf('S3'), 'song lessons in order S1→S2→S3');
  ok(F.indexOf('S3') < F.indexOf('4.1'), 'song lessons precede Module 4');
  eq(A.statusOf(F[0]), 'available', 'first lesson is available from the start');
}

/* ---- Bridge-song melody fixtures ----------------------------------
   Pins the interlude-module melodies to transcriptions cross-verified
   against trusted references (abcnotation.com hymnal + noobnotes for
   Amazing Grace; abcnotation.com for Aura Lee, AABA structure confirmed).
   Both were flagged in CLAUDE.md as unverified first-draft data; a wrong
   melody silently fails correct singing, so pin the pitches here. Key of C
   (semitones from C4), one note per sung syllable, [melody,harmony,beats].
------------------------------------------------------------------- */
group('bridge-song melody data (grace / auralee verified vs reference)');
{
  const eqNotes = (got, want, msg) =>
    eq(JSON.stringify(got), JSON.stringify(want), msg);

  // Amazing Grace — New Britain, lines 1-2, key of C.
  // "A-ma-zing grace, how sweet the sound, that saved a wretch like me."
  eqNotes(A.SONGS.grace.notes, [
    [-5,-1,1],[0,4,2],[4,7,1],[4,7,2],[2,5,1],[0,4,2],[-3,0,1],[-5,-1,3],
    [-5,-1,1],[0,4,2],[4,7,1],[4,7,2],[2,5,1],[7,11,3],
  ], 'grace melody matches the verified New Britain transcription');

  // Aura Lee — Poulton, first two phrases, key of C.
  // "As the blackbird in the spring, 'neath the willow tree."
  eqNotes(A.SONGS.auralee.notes, [
    [-5,-1,1],[0,4,1],[-1,2,1],[0,4,1],[2,5,1],[-3,0,1],[2,5,2],
    [0,4,1],[-1,2,1],[-3,0,1],[-1,2,1],[0,4,4],
  ], 'auralee melody matches the verified Poulton transcription');

  // Invariant: harmony is the diatonic third above the melody in C major.
  const SCALE = [0, 2, 4, 5, 7, 9, 11];
  const thirdAbove = (mel) => {
    const pc = ((mel % 12) + 12) % 12, idx = SCALE.indexOf(pc);
    if (idx < 0) return null; // non-diatonic melody note — not expected here
    const ni = idx + 2;
    return SCALE[ni % 7] + (Math.floor(mel / 12) + Math.floor(ni / 7)) * 12;
  };
  for (const key of ['grace', 'auralee']) {
    ok(A.SONGS[key].notes.every(([mel, harm]) => thirdAbove(mel) === harm),
      key + ' harmony is a diatonic third above every melody note');
  }

  // Amazing Grace is pentatonic (C D E G A) — no F(5)/B(11) in the melody.
  ok(A.SONGS.grace.notes.every(([mel]) => {
    const pc = ((mel % 12) + 12) % 12; return pc !== 5 && pc !== 11;
  }), 'grace melody stays pentatonic (no F or B)');
}

/* ---- holdOff persistence: the tuner target drives the drone check ----
   Regression guard for the Tug-of-War fix. The live tuner scores against the
   note holdTargetSemi() = root + TS.holdOff. offDrone lessons default holdOff
   to a 3rd (so the tuner stops guiding the singer to unison), and the value
   must survive drone/root changes. Here we drive the real setTarget +
   holdOffDroneOk/holdOnDroneOk to prove the wiring. */
group('holdOff target drives the drone-relationship checks (Tug-of-War fix)');
{
  const savedRoot = A.TS.root, savedOff = A.TS.holdOff, savedDrone = A.TS.droneOn;
  A.TS.droneOn = true; // holdVsDroneCents is null unless the drone is on

  // offDrone default: hold a 3rd above the drone.
  A.TS.root = 0; A.TS.holdOff = 4; A.setTarget(A.holdTargetSemi());
  eq(A.holdTargetSemi(), 4, 'a 3rd target resolves to root+4');
  ok(A.holdOffDroneOk({ offDrone: true }), 'a held 3rd satisfies the offDrone check');
  ok(!A.holdOnDroneOk({ onDrone: true }), 'a held 3rd fails the onDrone (unison) check');

  // a 5th is also a valid off-drone hold.
  A.TS.holdOff = 7; A.setTarget(A.holdTargetSemi());
  ok(A.holdOffDroneOk({ offDrone: true }), 'a held 5th satisfies the offDrone check');

  // the target persists across a root change (setRoot re-aims via holdTargetSemi).
  A.TS.root = -5; A.setTarget(A.holdTargetSemi());
  eq(A.holdTargetSemi(), 2, 'holdOff survives a root change (still a 5th above)');
  ok(A.holdOffDroneOk({ offDrone: true }), 'still off-drone after the root moved');

  // unison (holdOff null → the root itself): the mirror case for 1.2.
  A.TS.root = 0; A.TS.holdOff = null; A.setTarget(A.holdTargetSemi());
  eq(A.holdTargetSemi(), 0, 'no second note → target is the root (unison)');
  ok(!A.holdOffDroneOk({ offDrone: true }), 'a unison hold no longer passes offDrone');
  ok(A.holdOnDroneOk({ onDrone: true }), 'a unison hold satisfies the onDrone check');

  A.TS.root = savedRoot; A.TS.holdOff = savedOff; A.TS.droneOn = savedDrone;
}

/* ---- Step drill: the tuner tracks the sung STEP, not the root ----
   Regression guard for the Steps Away (1.4) fix. armStep used to pin the tuner
   target to the root, so singing re/mi read as "sharp against unison". stepRetarget
   now aims pdTargetHz at the nearest allowed scale degree (default do/re/mi), so each
   landed step reads in tune. curId is null in the harness → curAllowed() = [0,2,4]. */
group('step drill retargets the tuner to the nearest step (Steps Away fix)');
{
  const savedRoot = A.TS.root;
  const near = (hz, semi, msg) => eq(Math.round(hz), Math.round(A.freq(semi)), msg);

  A.TS.root = 0;
  A.stepRetarget(A.freq(0));  near(A.getTgt(), 0, 'on do → target is the root (do)');
  A.stepRetarget(A.freq(2));  near(A.getTgt(), 2, 'on re → target moves to re (not the root)');
  A.stepRetarget(A.freq(4));  near(A.getTgt(), 4, 'on mi → target moves to mi');
  A.stepRetarget(A.freq(4.3)); near(A.getTgt(), 4, 'a slightly sharp mi still snaps to mi');
  A.stepRetarget(A.freq(1.1)); near(A.getTgt(), 2, 'between do and re, nearer re → snaps to re');

  A.TS.root = savedRoot;
}

/* ---- Free-mode tuner for moving-line lessons (rows / improv) ----
   Regression guard for the audit sweep. Song/harmony rows and improv are scored
   offline from a whole recorded run; a single fixed target would pin the needle to
   the root and read "sharp" for every non-tonic note. clearTarget() drops the tuner
   into free mode (pdTargetHz = 0 → centsToTarget returns null → paintTuner shows
   intonation vs the nearest note instead of a fixed target). */
group('clearTarget puts the tuner in free mode (moving-line lessons)');
{
  A.setTarget(4);
  ok(A.getTgt() > 0, 'setTarget arms a fixed target');
  ok(A.centsToTarget(A.freq(4)) !== null, 'with a target, cents are measured against it');
  A.clearTarget();
  eq(A.getTgt(), 0, 'clearTarget drops the fixed target (free mode)');
  eq(A.centsToTarget(A.freq(4)), null, 'free mode → no fixed-target cents (needle reads nearest note)');
}

/* ---- 2.5 Thirds in a Key: the diatonic third above each scale degree ----
   Module 2 used to drill only the major third up from "do", but the song harmonies
   are ~40–60% minor thirds. The in-key drill asks for the third above a random
   degree, staying in the major key. */
group('in-key thirds (2.5): diatonic third above each degree');
{
  const MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);
  eq(A.keyThirdAbove(0), 4, 'do → mi is a major 3rd');
  eq(A.keyThirdAbove(2), 3, 're → fa is a minor 3rd');
  eq(A.keyThirdAbove(4), 3, 'mi → sol is a minor 3rd');
  eq(A.keyThirdAbove(5), 4, 'fa → la is a major 3rd');
  eq(A.keyThirdAbove(7), 4, 'sol → ti is a major 3rd');
  eq(A.keyThirdAbove(9), 3, 'la → do is a minor 3rd');
  ok(A.KEY_DEGS.every((d) => MAJOR.has((d + A.keyThirdAbove(d)) % 12)),
    'every drilled third lands on a note of the key');
  ok(A.KEY_DEGS.some((d) => A.keyThirdAbove(d) === 3) && A.KEY_DEGS.some((d) => A.keyThirdAbove(d) === 4),
    'the drill mixes major and minor thirds');
  eq(A.checkMet({ kind: 'jumpN', interval: 'key3', need: 8 }, { jump: { key3: { bestPasses: 8 } } }), true,
    'in-key jumpN reads its own key3 score');
  eq(A.checkMet({ kind: 'jumpN', interval: 'key3', need: 8 }, { jump: { '4': { bestPasses: 10 } } }), false,
    'a major-third score cannot satisfy the in-key check');

  const L = A.lessonById('2.5'), F = A.FLAT;
  ok(!!L && L.tool === 'interval' && L.auto.checks.some((c) => c.inKey), '2.5 exists and carries the in-key drill');
  ok(F.indexOf('2.4') < F.indexOf('2.5') && F.indexOf('2.5') < F.indexOf('cpB'), '2.5 sits after 2.4, before cpB');
  const cpB = A.lessonById('cpB');
  ok(cpB.auto.checks.some((c) => c.inKey && (c.stds || []).includes(2)) && cpB.stds.length === 3,
    'cpB also tests in-key thirds (std 2), so testing out cannot skip the gap');
}

/* ---- Checkpoints: auto-scored ones pass without a recording; test-out ---- */
group('checkpoints: auto-pass without recording, test-out masters the module');
{
  ['cpA', 'cpB', 'cpC'].forEach((id) => ok(A.cpAutoCovers(A.lessonById(id)), id + ' is fully auto-scored → recording optional'));
  ['cpD', 'cpFinal'].forEach((id) => ok(!A.cpAutoCovers(A.lessonById(id)), id + ' still needs a recording (not machine-scorable)'));
  ok(A.canChallenge('cpB') && !A.canChallenge('2.2') && !A.canChallenge('cpD'),
    'only auto-scored checkpoints can be taken as a test-out');

  const saved = A.getS();
  A.setS({});
  eq(A.statusOf('cpB'), 'locked', 'fresh user: cpB is locked…');
  ok(A.canChallenge('cpB'), '…but can still be attempted as a test-out');
  eq(A.nextLessonId(), '1.1', 'fresh user: next lesson is 1.1');
  A.passCheckpoint('cpB');
  ok(A.moduleOf('cpB').lessons.every((l) => A.isMastered(l.id)), 'passing cpB masters every Module 2 lesson');
  ok(!A.isMastered('1.1'), 'a test-out does not touch other modules');
  eq(A.statusOf('3.1'), 'available', 'Module 3 unlocks after the test-out');
  eq(A.nextLessonId(), '3.1', 'next lesson jumps forward to 3.1, not back to Module 1');
  A.setS(saved);
}

/* ---- Today screen: one tap into the next lesson ---- */
group('Today screen and one-tap session start');
{
  const saved = A.getS();
  A.setS({});
  const h = A.renderToday();
  ok(h.includes('Land the Note') && h.includes("startSession('1.1')"), 'Today offers the next lesson with a one-tap start');
  ok(h.includes('range check'), 'with no voice profile, Today offers the range check');
  A.setS(saved);
  const drone = (id) => A.droneLesson(A.lessonById(id));
  ok(drone('1.2') && drone('1.3') && drone('1.4') && drone('2.3') && drone('cpA'), 'drone lessons auto-start the drone');
  ok(!drone('1.1') && !drone('2.2') && !drone('3.1') && !drone('2.5'), 'non-drone lessons start only the tuner');
}

/* ---- Progressive lock window (item 7) ----
   The lock lamp (and every hold scored from it) used one ±24¢ window everywhere —
   strict for lesson 1.1. It now widens in Module 1 and tightens through the course. */
group('progressive lock window: gentle in M1, standard at cpA, tight after');
{
  const T = A.LOCK_TIERS;
  eq(A.lockTierFor('1.1').grab, 35, '1.1 Land the Note: gentle ±35¢');
  eq(A.lockTierFor('1.3').grab, 35, '1.3 Tug-of-War: gentle ±35¢');
  eq(A.lockTierFor('cpA').grab, 30, 'cpA checkpoint: standard ±30¢');
  eq(A.lockTierFor('2.3').grab, 24, '2.3 The Lock: tight ±24¢');
  eq(A.lockTierFor('cpC').grab, 24, 'later checkpoints: tight ±24¢');
  ok(T.gentle.grab > T.standard.grab && T.standard.grab > T.tight.grab, 'the window narrows stage by stage');
  ok(Object.values(T).every((t) => t.keep > t.grab && t.drDrift > t.drLock),
    'every tier keeps its hysteresis and a gap between locked and drifted');
  ok(T.tight.grab === 24 && T.tight.keep === 34 && T.tight.drLock === 22 && T.tight.drDrift === 50,
    'tight tier = the old constants, so Module 2+ scoring is unchanged');
  const saved = A.getS();
  A.setS({});
  eq(A.lockWindow().name, 'gentle', 'outside a lesson, a beginner gets the gentle window');
  A.passCheckpoint('cpB');
  eq(A.lockWindow().name, 'tight', '…and the tight one once they are past Module 2');
  A.setS(saved);
}

/* ---- Daily review (item 6): mixed skills, weighted toward weak/stale ---- */
group('daily review: pool grows with mastery, plan leans on weak/stale skills');
{
  const saved = A.getS();
  A.setS({});
  eq(JSON.stringify(A.reviewPool()), '["unison"]', 'fresh user: review is landing the note (their current skill)');
  A.passCheckpoint('cpB');
  const pool = A.reviewPool();
  ok(['M3', 'P4', 'P5', 'key3'].every((id) => pool.includes(id)) && !pool.includes('m3'), 'after Module 2: thirds, 4th, 5th and in-key thirds are in the pool (no bare minor-3rd-from-root)');
  ok(!pool.includes('unison'), 'skills from un-mastered lessons stay out (unless current)');
  A.setS({ '1.1': { mastered: true }, '1.2': { mastered: true }, '1.3': { mastered: true } });
  eq(JSON.stringify(A.reviewPool()), '["unison","step"]', 'on 1.4, its new skill (step up) joins the mastered ones');
  A.setS(saved);

  ok(A.REVIEW_SKILLS.every((k) => k.inKey || typeof k.iv === 'number'), 'every review skill is runnable on the jump engine');

  const today = '2026-11-16';
  const strong = { hist: Array(10).fill(true), last: today };
  const weak = { hist: Array(10).fill(false), last: '2026-10-01' };
  ok(A.reviewWeight(weak, today) > A.reviewWeight(undefined, today) && A.reviewWeight(undefined, today) > A.reviewWeight(strong, today),
    'weight: weak+stale > never seen > strong+fresh');

  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const plan10 = A.planReview(['M3', 'P5', 'key3'], {}, today, 10, rnd);
  eq(plan10.length, 10, 'a review is 10 trials');
  ok(['M3', 'P5', 'key3'].every((id) => plan10.includes(id)), 'every skill in the pool comes up at least once');
  const exact = A.planReview(['M3', 'P5', 'P4', 'm3'], { M3: weak, P5: strong, P4: strong, m3: strong }, today, 4, rnd);
  eq(exact.slice().sort().join(), 'M3,P4,P5,m3', 'even a heavily weighted skill cannot crowd out the others: each appears once');
  const big = A.planReview(['M3', 'P5'], { M3: weak, P5: strong }, today, 400, rnd);
  const nWeak = big.filter((x) => x === 'M3').length;
  ok(nWeak > 300, 'the weak, stale skill dominates the draw (' + nWeak + '/400)');

  const stats = {};
  A.recordReview(stats, [{ skill: 'M3', pass: true }, { skill: 'M3', pass: false }, { skill: null, pass: true }], today);
  ok(stats.M3.hist.length === 2 && stats.M3.ok === 1 && stats.M3.last === today && Object.keys(stats).length === 1,
    'results update per-skill history and date; non-review trials are ignored');
  const s2 = { M3: { hist: Array(10).fill(true), n: 10, ok: 10 } };
  A.recordReview(s2, [{ skill: 'M3', pass: false }], today);
  ok(s2.M3.hist.length === 10 && s2.M3.hist[9] === false, 'history keeps only the last 10 attempts');
}

/* ---- Songs earlier (item 4): 1.5 First Song, 2.6 First Thirds in a Song ----
   Modules 1–2 used to be 11 drill-only lessons before any music. */
group('songs earlier: 1.5 sings the melody, 2.6 harmonizes the first phrase');
{
  const F = A.FLAT, L15 = A.lessonById('1.5'), L26 = A.lessonById('2.6');
  ok(F.indexOf('1.4') < F.indexOf('1.5') && F.indexOf('1.5') < F.indexOf('cpA'), '1.5 sits at the end of Module 1, before cpA');
  ok(F.indexOf('2.2') < F.indexOf('2.6') && F.indexOf('2.6') < F.indexOf('2.3'), '2.6 (first song thirds) ends Part 1: after Jump to It, before The Lock');
  const c15 = L15.auto.checks[0];
  ok(L15.tool === 'row' && L15.song === 'row' && c15.kind === 'rowRun' && c15.memory && c15.target === 'mel', '1.5 is a from-memory MELODY run');
  ok(L26.tool === 'row' && L26.song === 'row1' && L26.auto.checks.every((c) => c.kind === 'rowRun' && !c.memory), '2.6 is a harmony-over-melody run');
  eq(JSON.stringify(A.SONGS.row1.notes), JSON.stringify(A.SONGS.row.notes.slice(0, 10)), 'row1 = the first phrase of Row Your Boat');

  // the longest drill-only stretch before Module 3 (lessons without a song)
  let run = 0, longest = 0;
  F.slice(0, F.indexOf('3.1')).forEach((id) => { if (A.lessonById(id).tool === 'row') run = 0; else longest = Math.max(longest, ++run); });
  ok(longest <= 6, 'no more than 6 drill lessons in a row before Module 3 (was 11) — got ' + longest);

  // melody-from-memory scoring: right in any key; singing the harmony instead fails
  const wins = buildWins(A.SONGS.row.notes, 96);
  ok(A.classifyMemory(wins, makeSamples(wins, (w) => semiToHz(w.mel)), 'mel', 0.7).clean, 'singing the melody passes the 1.5 run');
  ok(A.classifyMemory(wins, makeSamples(wins, (w) => semiToHz(w.mel + 3)), 'mel', 0.7).clean, '…in any key (transposed up 3)');
  ok(!A.classifyMemory(wins, makeSamples(wins, (w) => semiToHz(w.harm)), 'mel', 0.7).clean, 'singing the harmony instead does not pass');
  ok(A.rowRunOk(c15, { clean: true, mem: true }) && !A.rowRunOk(c15, { clean: true, mem: false }), 'only a from-memory run counts for 1.5');
}

/* ---- Harmony below the melody (item 8) ----
   A third below, dropping to "sol" under "do"; per-song bfix hand fixes for
   singability. Must be a DIFFERENT line from the high part (scorers fold octaves). */
group('harmony below: rule, singability, and the scorers tell it apart');
{
  eq(JSON.stringify([0, 2, 4, 5, 7, 9, 11, 12].map(A.belowOf)), JSON.stringify([-5, -1, 0, 2, 4, 5, 7, 7]),
    'do→sol(4th), re→ti, mi→do, fa→re, sol→mi, la→fa, ti→sol (thirds below), high do→sol');
  ['row', 'row1', 'grace', 'auralee', 'lang'].forEach((k) => {
    const S = A.SONGS[k], b = A.belowLine(S), m = S.notes.map((n) => n[0]);
    const gaps = m.map((x, i) => x - b[i]), leaps = b.slice(1).map((x, i) => Math.abs(x - b[i]));
    ok(gaps.every((g) => g >= 3 && g <= 7), k + ': every below note is a 3rd, 4th or 5th under the melody');
    ok(leaps.every((l) => l <= 5 && l !== 6), k + ': below line moves by a 4th at most, never a tritone (max ' + Math.max(...leaps) + ')');
    const shared = S.notes.filter((n, i) => ((n[1] - b[i]) % 12 + 12) % 12 === 0).length;
    ok(shared / S.notes.length <= 0.1, k + ': below line is a different line from the high part, not an octave copy (' + shared + ' shared note' + (shared === 1 ? '' : 's') + ')');
    if (((m[m.length - 1] % 12) + 12) % 12 === 0) eq(((b[b.length - 1] % 12) + 12) % 12, 7, k + ': ends on sol under the final do');
  });
  eq(A.belowLine(A.SONGS.auralee)[4], -5, 'Aura Lee hand fix: G under re (not the B–F–B tritone)');

  const savedPart = A.TS.part; A.setSong('auralee');
  A.TS.part = 'below'; eq(A.harmOf(A.SONGS.auralee.notes[4], 4), -5, 'part = below → harmony notes come from the below line');
  A.TS.part = 'above'; eq(A.harmOf(A.SONGS.auralee.notes[4], 4), 5, 'part = above → the written high line');
  A.TS.part = savedPart; A.setSong('row');
  const sv = A.getS(); A.setS({}); A.setPart('below');
  ok(A.getS().__meta && A.getS().__meta.part === 'below', 'the chosen part is saved with your progress');
  A.setPart('above'); A.setS(sv); A.TS.part = savedPart;

  // windows as startRowRun builds them in below mode
  const notes = A.SONGS.grace.notes, bl = A.belowLine(A.SONGS.grace);
  const bw = buildWins(notes.map((n, i) => [n[0], bl[i], n[2]]), 84);
  ok(A.classifyHarmony(bw, makeSamples(bw, (w) => semiToHz(w.harm)), 0.62, 0.18).clean, 'singing the below line over the melody passes');
  const hiNotes = notes.map((n) => n[1]);
  ok(!A.classifyHarmony(bw, makeSamples(bw, (w, i) => semiToHz(hiNotes[i])), 0.62, 0.18).clean, 'singing the HIGH line in below mode does not pass');
  ok(!A.classifyHarmony(bw, makeSamples(bw, (w) => semiToHz(w.mel)), 0.62, 0.18).clean, 'falling onto the melody does not pass');
  ok(A.classifyMemory(bw, makeSamples(bw, (w) => semiToHz(w.harm)), 'harm', 0.7).clean, 'the below line can be sung from memory and scored');
  ok(!A.classifyMemory(bw, makeSamples(bw, (w, i) => semiToHz(hiNotes[i])), 'harm', 0.7).clean, '…and the high line from memory does not count as it');
}

/* ---- Practice days, live streak, Progress tab (v41) ----
   The streak used to count only mastering a lesson or finishing a review, and kept showing a
   run that had already ended. meta().days is now a dated history (backfilled once), every
   scored attempt marks the day, and curStreak() is 0 once a day has been missed. */
group('practice days: history, backfill, live streak, calendar');
{
  const saved = A.getS();
  const daysAgo = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return A.dstr(d); };

  A.setS({});
  A.markDayActive(); A.markDayActive();
  eq(JSON.stringify(A.meta().days), JSON.stringify([A.todayStr()]), 'a practice day is recorded once, however many attempts');
  eq(A.curStreak(), 1, 'first day → streak 1');

  // backfill from an older install: a 3-day run ending yesterday + a dated hold attempt + a review date
  A.setS({ __meta: { streak: 3, best: 4, last: daysAgo(1), quick: 2, review: { M3: { hist: [true], last: daysAgo(20) } } },
           '1.2': { attempts: [{ t: new Date(daysAgo(9) + 'T12:00:00').getTime(), pass: true }] } });
  const back = A.meta().days;
  ok([daysAgo(1), daysAgo(2), daysAgo(3)].every((d) => back.includes(d)), 'backfill rebuilds the current streak run');
  ok(back.includes(daysAgo(9)) && back.includes(daysAgo(20)), 'backfill picks up dated hold attempts and review dates');
  ok(!back.includes(daysAgo(4)), 'backfill invents no days');
  eq(A.curStreak(), 3, 'a run ending yesterday still counts');

  A.setS({ __meta: { streak: 5, best: 5, last: daysAgo(4), quick: 0 } });
  eq(A.curStreak(), 0, 'a run that ended days ago shows 0, not the stale counter');
  A.markDayActive();
  eq(A.curStreak(), 1, 'practising again starts a new run');
  eq(A.meta().best, 5, 'best streak is kept');

  // calendar: 84 cells (12 weeks), counts only real practice days, nothing after today
  A.setS({ __meta: { streak: 0, best: 0, last: '', quick: 0, days: [daysAgo(0), daysAgo(3), daysAgo(200)] } });
  const cal = A.calendarHTML(A.meta());
  eq((cal.match(/class="cal-c[ "]/g) || []).length - 2, 84, 'calendar has 12 weeks × 7 days');
  ok(cal.includes('2 practice days in the last 12 weeks'), 'counts the 2 days inside the window, not the one 200 days ago');
  eq((cal.match(/cal-c on/g) || []).length - 1, 2, 'exactly the practised days are filled');
  ok(cal.includes(' now"'), 'today is marked');

  // review accuracy: empty state, then text values per skill
  A.setS({});
  ok(A.reviewAccHTML().includes('No reviews yet'), 'review accuracy has an empty state');
  A.setS({ __meta: { streak: 0, best: 0, last: '', quick: 1, review: { unison: { hist: [true, true, false], n: 3, ok: 2, last: A.todayStr() } } } });
  ok(/Same note.*2\/3.*today/.test(A.reviewAccHTML()), 'each skill shows landed/attempted as text and when it was last reviewed');

  A.setS(saved);
}

/* ---- Speaker leak check + drone volume (v42) ----
   On the phone speaker the drone leaks into the mic; at ~2.5–3.5× the voice level the tuner
   flips between voice and drone (the needle jitter). The leak check compares the mic level at
   a 3.15 kHz test beep before vs during the beep; the drone volume lowers the leak. */
group('speaker leak verdict and drone volume');
{
  ok(A.leakVerdict(-100, -40), 'speaker: the beep comes back 60 dB louder → leak');
  ok(A.leakVerdict(-95, -95 + A.LEAK_DB), 'a rise of exactly the threshold counts as a leak');
  ok(!A.leakVerdict(-100, -96), 'wired earphones: a few dB of noise is not a leak');
  ok(!A.leakVerdict(-Infinity, -Infinity), 'a silent mic (no data) is not a leak');
  ok(!A.leakVerdict(-Infinity, -120), 'a rise that stays near the noise floor is not a leak');
  ok(A.leakVerdict(-Infinity, -50), 'a loud beep over a silent baseline is a leak');

  const saved = A.getS(), savedVol = A.TS.droneVol;
  A.setS({});
  A.setDroneVol(40);
  eq(A.TS.droneVol, 0.4, 'the slider sets the drone volume');
  eq(A.getS().__meta.droneVol, 0.4, 'and saves it with your progress');
  eq(Math.round(A.droneGain(0.13) * 1000) / 1000, 0.052, 'drone voices scale by the volume');
  A.setDroneVol(5); eq(A.TS.droneVol, 0.2, 'the drone never goes below 20% (that is what Stop is for)');
  A.setDroneVol(150); eq(A.TS.droneVol, 1, 'and never above 100%');
  A.TS.droneVol = savedVol; A.setS(saved);
}

/* ---- Module 2 rebuilt (v43): recognise → echo → half-walk → jump; 5th / 4th / minor thirds ----
   The learner could not hear or imagine the third before singing it, and the minor 3rd and 4th were
   taught as bare jumps from the root. New order, new listening quiz, echo / half-walk / steady-root
   drill modes, anchor tunes; ids stay fixed (they are progress keys), numbers come from position. */
group('Module 2 rebuild: order, numbering, checks, carried-over progress');
{
  const M2 = A.MODULES.find((m) => m.n === 2).lessons.map((l) => l.id);
  eq(M2.join(' '), '2.1 2.hear 2.echo 2.half 2.2 2.6 2.3 2.4 2.4th 2.min 2.5 cpB', 'Part 1 builds the third step by step; Part 2 adds the other intervals');
  eq(A.lessonNo('2.hear'), '2.2', 'on-screen numbers follow position (Hear the Third shows as 2.2)');
  eq(A.lessonNo('2.2'), '2.5', '…and Jump to It, id 2.2, now shows as 2.5');
  eq(A.lessonNo('2.5'), '2.11', 'Thirds in a Key shows as 2.11');
  eq(A.lessonNo('1.5'), '1.5', 'Module 1 numbering is unchanged');
  eq(A.lessonNo('cpB'), 'cpB', 'checkpoints are not numbered as lessons');
  eq(A.lessonNo('S1'), 'S1', 'the songs interlude keeps its own labels');
  ok(A.lessonById('2.1').part && A.lessonById('2.4').part, 'Part 1 and Part 2 are labelled');

  // every jump drill is runnable: a numeric interval, or an in-key drill; storage keys unique per lesson
  const bad = [];
  A.MODULES.forEach((m) => m.lessons.forEach((l) => { const js = A.jumpChecks(l); const keys = js.map((c) => String(c.interval));
    if (new Set(keys).size !== keys.length) bad.push(l.id + ' duplicate keys');
    js.forEach((c) => { const iv = c.iv != null ? c.iv : (typeof c.interval === 'number' ? c.interval : null); if (!c.inKey && typeof iv !== 'number') bad.push(l.id + ' ' + c.interval); }); }));
  eq(bad.join(', '), '', 'every jump drill has semitones or is in-key, with unique storage keys');

  // gentler ladder: echo and half-walk keep the root steady; random roots only in Jump to It
  const cue = (id) => A.jumpChecks(A.lessonById(id)).map((c) => (c.cue || 'root') + (c.steady ? '/steady' : ''));
  eq(cue('2.echo').join(), 'echo/steady', 'Echo the Third: echo cue, same root all session');
  eq(cue('2.half').join(), 'half/steady', 'Half a Walk: hear do–re, sing mi, same root');
  eq(cue('2.2').join(), 'root/steady,root', 'Jump to It: steady root first, then random roots');
  eq(A.lessonById('2.min').auto.checks.map((c) => c.degs.join('-')).join(), '2-4-9,2-4-9', 'minor thirds are drilled above re, mi and la — inside the key');
  ok(!A.MODULES.some((m) => m.lessons.some((l) => A.jumpChecks(l).some((c) => c.interval === 3))), 'no bare “minor 3rd up from the root” drill anywhere');

  // the listening lesson needs no mic; the others do
  ok(!A.micLesson(A.lessonById('2.hear')) && A.micLesson(A.lessonById('2.echo')) && A.micLesson(A.lessonById('2.3')), 'Hear the Third is listening-only (no tuner, no mic prompt)');
  eq(A.checkMet({ kind: 'intervalQuiz', need: 8 }, { iq: { bestCorrect: 8 } }), true, 'listening quiz passes at 8/10');
  { let seed = 3; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const decks = Array.from({ length: 50 }, () => A.iqDeck([2, 4, 7], 4, 10, rnd));
    ok(decks.every((d) => d.length === 10 && d.filter((v) => v === 4).length === 5), 'every quiz plays the 3rd in half its rounds');
    ok(decks.every((d) => d.includes(2) && d.includes(7)), '…and the step and the 5th at least once each'); }
  eq(A.checkMet({ kind: 'intervalQuiz', need: 8 }, { iq: { bestCorrect: 7 } }), false, '…not at 7/10');

  // progress earned in the old “Other Intervals” lesson still counts
  const fifthJump = A.lessonById('2.4').auto.checks.find((c) => c.interval === 7), fourthJump = A.lessonById('2.4th').auto.checks.find((c) => c.interval === 5);
  ok(A.checkMet(fifthJump, { jump: { '7': { bestPasses: 7 } } }), 'an old 7/10 on the 5th still passes The 5th jump standard');
  ok(A.checkMet(fourthJump, { jump: { '5': { bestPasses: 7 } } }), 'an old 7/10 on the 4th carries over to The 4th');
  ok(['4', '7', '5', 'm3'].every((k) => A.ANCHORS[k] && A.ANCHORS[k].notes.length >= 2), 'every interval has an anchor tune');
  eq(A.ANCHORS[5].notes[1][0] - A.ANCHORS[5].notes[0][0], 5, 'the 4th anchor opens with a 4th (“Here comes”)');
  eq(A.ANCHORS.m3.notes[0][0] - A.ANCHORS.m3.notes[1][0], 3, 'the minor-3rd anchor opens sol→mi, a minor 3rd down');
}

/* ================================================================ */
/*  v44 — INTERVAL EAR TEST (streak mode)                            */
/* ================================================================ */
console.log('\n▸ Interval ear test: random roots, sudden-death streaks');
{
  let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (const lv of [1, 2, 3]) {
    const ch = A.ET_LEVELS[lv].choices; let prev = 99, moved = true, inRange = true, seen = new Set();
    for (let i = 0; i < 400; i++) { const p = A.etPick(ch, prev, rnd); if (p.root === prev) moved = false; if (p.root < -12 || p.root + p.iv > 12) inRange = false; if (!ch.includes(p.iv)) inRange = false; seen.add(p.iv); prev = p.root; }
    ok(moved, 'Level ' + lv + ': the root moves every round');
    ok(inRange, 'Level ' + lv + ': both notes stay within C3–C5 and the interval is one of the level\'s choices');
    eq(seen.size, ch.length, 'Level ' + lv + ': every choice comes up');
  }
  eq(A.ET_LEVELS[1].choices.join(), '2,4,7', 'Level 1 is the Hear the Third set (step, 3rd, 5th)');
  ok(A.ET_LEVELS[3].choices.length > A.ET_LEVELS[2].choices.length && A.ET_LEVELS[2].choices.length > A.ET_LEVELS[1].choices.length, 'each level adds choices');
  ok(A.ET_LEVELS[3].choices.every((v) => A.IQ_SHORT[v] && A.IQ_NAMES[v]), 'every choice has an answer label and a name');
  eq(A.etKey(2, true), '2t', 'together mode keeps its own best');
  const st = { best: {}, runs: [] };
  let r = A.etRecord(st, '1', 4, '2026-11-22'); ok(r.newBest && st.best['1'] === 4, 'first run sets the best');
  r = A.etRecord(st, '1', 2, '2026-11-22'); ok(!r.newBest && st.best['1'] === 4 && r.best === 4, 'a shorter run keeps the best');
  r = A.etRecord(st, '1', 4, '2026-11-22'); ok(!r.newBest, 'equalling the best is not a new best');
  r = A.etRecord(st, '1t', 1, '2026-11-22'); ok(r.newBest && st.best['1'] === 4 && st.best['1t'] === 1, 'modes keep separate bests');
  r = A.etRecord(st, '1', 0, '2026-11-22'); ok(!r.newBest && st.best['1'] === 4, 'a zero run is logged, best unchanged');
  eq(st.runs.length, 5, 'every finished run is logged');
  for (let i = 0; i < 300; i++) A.etRecord(st, '2', i % 7, 'x');
  eq(st.runs.length, 200, 'run log is capped at 200');
}

/* ================================================================ */
/*  v45 — SCALE-DEGREE DRILL                                         */
/* ================================================================ */
console.log('\n▸ Scale-degree drill: key from a cadence, name the degree, resolve to do');
{
  let seed = 5; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let prev = 99, moved = true, inRange = true; const seen = new Set();
  for (let i = 0; i < 400; i++) { const k = A.dgPickKey(prev, rnd); if (k === prev) moved = false; if (k < -7 || k > 4) inRange = false; seen.add(k); prev = k; }
  ok(moved, 'a new key is never the same as the last one');
  ok(inRange, 'keys stay between F3 and E4, so every note sits in a comfortable range');
  eq(seen.size, 12, 'all twelve keys come up');
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  eq(A.DG_LEVELS[1].choices.join(), '0,4,7', 'Level 1 is do, mi, sol');
  ok(A.DG_LEVELS[3].choices.join() === MAJOR.join(), 'Level 3 is the whole major scale');
  ok([1, 2, 3].every((l) => A.DG_LEVELS[l].choices.every((v) => MAJOR.includes(v) && A.DEGN[v] && A.DG_NUM[v])), 'every choice is in the key and has a name and a number');
  ok(A.DG_LEVELS[2].choices.every((v) => A.DG_LEVELS[3].choices.includes(v)) && A.DG_LEVELS[1].choices.every((v) => A.DG_LEVELS[2].choices.includes(v)), 'each level keeps the previous level\'s notes');
  const homes = MAJOR.map((d) => A.dgResolve(d));
  ok(homes.every((p, i) => p[0] === MAJOR[i]), 'each resolution starts on the note just heard');
  ok(homes.every((p) => p[p.length - 1] === 0 || p[p.length - 1] === 12), '…and ends on do');
  ok(homes.every((p) => p.every((v, i) => i === 0 || (Math.abs(v - p[i - 1]) <= 2 && MAJOR.includes(v % 12)))), '…moving by scale step, inside the key');
  ok(homes.every((p) => p.length <= 4), '…in at most three steps (the nearest do)');
  const card = A.streakProgHTML({ best: { '2': 7, '2k': 3 }, runs: [{ k: '2', n: 7 }, { k: '2k', n: 3 }] }, A.DG_LEVELS, 'k', 'Scale degrees', 'openDegTest', 'Go');
  ok(card.includes('2 runs') && card.includes('>7<') && card.includes('Level 2 · hard') && !card.includes('Level 1 · hard'), 'Progress card: bests per level, the harder mode only once tried');
}

/* ================================================================ */
/*  v46 — THINK-FIRST GAP                                            */
/* ================================================================ */
console.log('\n▸ Think first: a silent gap between the cue and singing');
{
  eq([0, 2, 4, 3, -1, '2', undefined].map(A.thinkOf).join(), '0,2,4,0,0,0,0', 'only Off, 2 s and 4 s are valid gaps');
  A.setThink(0); eq(A.thinkSecs(), 0, 'gap is off by default / when set off');
  const fresh = () => A.setJd({ tgt: 4, root: 0, iv: 4 });
  const hum = (n, hz) => { for (let i = 0; i < n; i++) A.feedJump(hz, true); };
  fresh(); A.afterCue(); eq(A.getJd().state, 'listen', 'gap off: the cue goes straight to listening');
  A.setThink(2); eq(A.thinkSecs(), 2, 'gap set to 2 s'); eq(A.meta().think, 2, '…and saved in meta');
  fresh(); A.afterCue(); eq(A.getJd().state, 'think', 'gap on: the cue hands over to the silent think gap');
  hum(12, A.freq(4)); eq(A.getJd().results.length, 0, 'singing in the gap is never scored as the answer');
  eq(A.getJd().early, 12, '…but it is counted');
  A.beginListen(); eq(A.getJd().state, 'listen', 'after the tick, listening opens');
  hum(12, A.freq(4)); const r = A.getJd().results[0];
  ok(r && r.pass && r.early === true, 'a clean answer still passes, flagged as hummed in the gap');
  fresh(); A.afterCue(); hum(4, A.freq(4)); A.beginListen(); hum(12, A.freq(4));
  ok(A.getJd().results[0].early === false, 'a few stray frames in the gap are not flagged');
  fresh(); A.afterCue(); A.beginListen(); hum(12, A.freq(4)); A.beginListen(); eq(A.getJd().early, 0, 'humming while listening never counts as early');
  A.setJd({ tgt: 4, root: 0, iv: 4, review: true }); A.afterCue(); eq(A.getJd().state, 'listen', 'the daily review skips the gap');
  A.setJd({ tgt: 4, root: 0, iv: 4, active: false }); A.afterCue(); eq(A.getJd().state, 'idle', 'a stopped drill ignores a late cue timer');
  A.setThink(0);
}

/* ================================================================ */
/*  SUMMARY                                                          */
/* ================================================================ */
console.log('\n' + '─'.repeat(48));
if (fail === 0) {
  console.log('✓ ALL GREEN — ' + pass + ' assertions passed');
  process.exit(0);
} else {
  console.log('✗ ' + fail + ' FAILED, ' + pass + ' passed');
  console.log('\nFailures:');
  fails.forEach((f) => console.log('  · ' + f));
  process.exit(1);
}
