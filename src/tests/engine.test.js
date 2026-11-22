/**
 * Unit tests for ABC Engine and Core Mathematics.
 * Run with: node src/tests/engine.test.js
 */

import {
  calculateFitness,
  calculateProbabilities,
  generateNeighbour,
  isStrictlyBetter,
  shouldScout,
} from '../engine/abcMath.js';
import { PRNG } from '../engine/prng.js';
import { ABCEngine } from '../engine/abcEngine.js';
import { getProblemById } from '../data/problems.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertClose(a, b, epsilon = 0.001, message = '') {
  const diff = Math.abs(a - b);
  assert(diff <= epsilon, `${message} (expected ~${b}, got ${a}, diff ${diff.toFixed(6)})`);
}

console.log('=== Test Suite 1: Fitness Transform ===');
assert(calculateFitness(0) === 1, 'f = 0 -> fit = 1/(1+0) = 1');
assertClose(calculateFitness(5), 1 / 6, 0.0001, 'f = 5 -> fit = 1/6 ≈ 0.1667');
assertClose(calculateFitness(13), 1 / 14, 0.0001, 'f = 13 -> fit = 1/14 ≈ 0.0714');
assert(calculateFitness(-2) === 3, 'f = -2 -> fit = 1 + |-2| = 3');
assert(calculateFitness(-0.5) === 1.5, 'f = -0.5 -> fit = 1 + |-0.5| = 1.5');

console.log('\n=== Test Suite 2: Lecture Worked Example Hand Checks ===');
// Lecture worked example: Source 1 at [2, -1], partner 4 at [-5, 3]
const bounds = { lower: [-5, -5], upper: [5, 5] };
const source1 = [2, -1];
const partner4 = [-5, 3];
const phi1 = 0.81;

// Perturb dimension 0 (x1)
const move1 = generateNeighbour(source1, partner4, 0, phi1, bounds);
assertClose(move1.rawValue, 7.67, 0.001, 'Raw coordinate: 2 + 0.81 * (2 - (-5)) = 7.67');
assert(move1.clipped === true, '7.67 is out of bounds [-5, 5] -> clipped is true');
assert(move1.candidate[0] === 5, 'Candidate coordinate clipped to upper bound 5');
assert(move1.candidate[1] === -1, 'Unperturbed dimension remains -1');

const sphereFn = (x) => x[0] ** 2 + x[1] ** 2;
const candF1 = sphereFn(move1.candidate);
assert(candF1 === 26, 'Candidate objective: 5^2 + (-1)^2 = 26');
const candFit1 = calculateFitness(candF1);
assertClose(candFit1, 1 / 27, 0.001, 'Candidate fitness: 1/27 ≈ 0.037');

const origF1 = sphereFn(source1);
const origFit1 = calculateFitness(origF1);
assert(origF1 === 5, 'Original objective: 2^2 + (-1)^2 = 5');
assertClose(origFit1, 1 / 6, 0.001, 'Original fitness: 1/6 ≈ 0.1667');

const accepted1 = isStrictlyBetter(origFit1, candFit1);
assert(accepted1 === false, '0.037 < 0.1667 -> candidate is rejected');

// Lecture worked onlooker move: source [2, -1], partner 5 [3, 0], phi = 0.68
const partner5 = [3, 0];
const phiOnlooker = 0.68;
const moveOnlooker = generateNeighbour(source1, partner5, 0, phiOnlooker, bounds);
assertClose(moveOnlooker.rawValue, 1.32, 0.001, 'Onlooker raw coordinate: 2 + 0.68 * (2 - 3) = 1.32');
assert(moveOnlooker.clipped === false, '1.32 is within bounds -> clipped is false');
assertClose(moveOnlooker.candidate[0], 1.32, 0.001, 'Candidate x1 is 1.32');
assert(moveOnlooker.candidate[1] === -1, 'Candidate x2 is -1');
const candF_onl = sphereFn(moveOnlooker.candidate);
assertClose(candF_onl, 2.7424, 0.001, 'Candidate f = 1.32^2 + (-1)^2 = 2.7424');
const candFit_onl = calculateFitness(candF_onl);
assertClose(candFit_onl, 0.2672, 0.001, 'Candidate fitness ≈ 0.2672');
assert(isStrictlyBetter(origFit1, candFit_onl) === true, '0.2672 > 0.1667 -> candidate is accepted');

console.log('\n=== Test Suite 3: Onlooker Selection Probabilities ===');
const lectureFitnesses = [0.167, 0.200, 0.239, 0.030, 0.100];
const probs = calculateProbabilities(lectureFitnesses);
// p_m = 0.9 * (fit_m / max(fit)) + 0.1 where max = 0.239
assertClose(probs[2], 1.0, 0.001, 'Max fitness source (m=3) gets p = 1.0');
assert(probs.every((p) => p >= 0.1), 'All probabilities are >= 0.1 (+0.1 floor guaranteed)');
assertClose(probs[0], 0.9 * (0.167 / 0.239) + 0.1, 0.001, 'Source 1 probability matches formula');

console.log('\n=== Test Suite 4: Scout Bee Trigger Rule ===');
const limit = 1;
assert(shouldScout(0, limit) === false, 'trial=0 <= limit=1 -> no scout');
assert(shouldScout(1, limit) === false, 'trial=1 <= limit=1 -> strictly greater required, no scout');
assert(shouldScout(2, limit) === true, 'trial=2 > limit=1 -> scout triggered');

console.log('\n=== Test Suite 5: PRNG Determinism & Rewind ===');
const prng1 = new PRNG(12345);
const seq1 = [prng1.next(), prng1.next(), prng1.nextInt(0, 10), prng1.nextPhi()];

const prng2 = new PRNG(12345);
const seq2 = [prng2.next(), prng2.next(), prng2.nextInt(0, 10), prng2.nextPhi()];

assert(JSON.stringify(seq1) === JSON.stringify(seq2), 'Identical seeds produce identical draws');

// Test state save and restore
const savedState = prng1.getState();
const drawA = prng1.next();
const drawB = prng1.next();

prng1.setState(savedState);
const drawA_repeat = prng1.next();
const drawB_repeat = prng1.next();

assert(drawA === drawA_repeat, 'PRNG rewind reproduces next() exactly');
assert(drawB === drawB_repeat, 'PRNG rewind reproduces second next() exactly');

console.log('\n=== Test Suite 6: Full ABC Engine & Manual Stepper ===');
const problem = getProblemById('sphere-lecture');
const params = {
  S: 10,
  T: 5,
  limit: 1,
  seed: 42,
  bounds: [[-5, 5], [-5, 5]],
};

const engine = new ABCEngine(problem, params);
assert(engine.population.length === 5, 'Colony size S=10 derived Np = 5 food sources');
assert(engine.stepIndex === 0, 'Initial step index is 0');
assert(engine.phase === 'INIT', 'Initial phase is INIT');
assert(engine.population.every((s) => s.t === 0), 'All initial trial counters are 0');
assert(
  engine.population.every(
    (s) => s.x[0] >= -5 && s.x[0] <= 5 && s.x[1] >= -5 && s.x[1] <= 5
  ),
  'All initial coordinates lie strictly within bounds [-5, 5]'
);

// Test manual stepping through cycle 1
// 5 employed steps
for (let i = 0; i < 5; i++) {
  const ev = engine.nextStep();
  assert(ev.phase === 'EMPLOYED', `Step ${i + 1} is EMPLOYED bee move`);
}

// 5 onlooker steps
for (let i = 0; i < 5; i++) {
  const ev = engine.nextStep();
  assert(ev.phase === 'ONLOOKER', `Step ${i + 6} is ONLOOKER bee check/move`);
}

// 1 scout step
const scoutEv = engine.nextStep();
assert(scoutEv.phase === 'SCOUT', 'Step 11 is SCOUT check');

// 1 memorise step
const memEv = engine.nextStep();
assert(memEv.phase === 'MEMORISE', 'Step 12 is MEMORISE best');
assert(memEv.cycle === 1, 'Step 12 closes cycle 1');

// Step 13 starts cycle 2
const nextCycleEv = engine.nextStep();
assert(engine.cycle === 2, 'Step 13 advances cycle to 2');
assert(nextCycleEv.phase === 'EMPLOYED', 'Step 13 starts EMPLOYED phase of cycle 2');

console.log('\n=== Test Suite 7: Stepper Rewind (Back) and Reset ===');
// Test prevStep rewind
engine.prevStep(); // back to step 12
const step12BestF = engine.bestSoFar.f;
const step12StepIdx = engine.stepIndex;

engine.prevStep(); // rewound to step 11 (scout)
assert(engine.stepIndex === step12StepIdx - 1, 'prevStep() decreases stepIndex by 1');
assert(engine.phase === 'SCOUT', 'prevStep() restored SCOUT phase');

engine.nextStep(); // re-advance to step 12
assert(engine.stepIndex === step12StepIdx, 're-advance returns to step 12');
assert(engine.bestSoFar.f === step12BestF, 're-advance preserves best-so-far');

// Test reset
engine.reset();
assert(engine.stepIndex === 0, 'reset() returns stepIndex to 0');
assert(engine.cycle === 1, 'reset() returns cycle to 1');
assert(engine.history.length === 0, 'reset() clears history');

// Reproducibility test: run 10 steps from reset, verify identical trace
const traceA = [];
for (let i = 0; i < 10; i++) {
  const ev = engine.nextStep();
  traceA.push({ type: ev.type, f: ev.bestSoFar.f });
}

engine.reset();
const traceB = [];
for (let i = 0; i < 10; i++) {
  const ev = engine.nextStep();
  traceB.push({ type: ev.type, f: ev.bestSoFar.f });
}

assert(
  JSON.stringify(traceA) === JSON.stringify(traceB),
  'Same seed produces 100% identical trace after reset'
);

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
