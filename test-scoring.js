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
  'winMidOf', 'medOf', 'st', 'isMastered', 'statusOf', 'lessonById',
  'curNotes', 'setSong', 'MODULES', 'SONGS', 'FLAT', 'TS'
];
const wrapper = new Function(
  'with(this){\n' + js +
  '\n;return {' + EXPOSE.join(',') +
  ',getS:function(){return S;},setS:function(v){S=v;},getKey:function(){return SONGKEY;},getTgt:function(){return pdTargetHz;}};}'
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
