/**
 * Unit Tests for ABC Algorithm Worked Example & Pure Mathematical Checks.
 *
 * Validates the step-by-step calculations, population states, formulas,
 * boundary clipping, selection probabilities, and invariant robustness.
 */

import assert from 'node:assert';
import {
  calculateFitness,
  calculateProbabilities,
  generateNeighbour,
  isStrictlyBetter,
  clipToBounds,
  shouldScout,
} from '../engine/abcMath.js';
import { WORKED_STAGES } from '../data/lectureSnapshots.js';

console.log('--- Running ABC Worked Example & Mathematical Verification Tests ---');

// ── Test 1: Stage 0 (Initialization) Snapshot Verification ────────────
{
  const stage0 = WORKED_STAGES[0];
  assert.strictEqual(stage0.phase, 'INIT', 'Stage 0 should be INIT');
  assert.strictEqual(stage0.population.length, 5, 'Stage 0 should have 5 food sources');

  // Check objective and fitness calculation for all 5 points
  stage0.population.forEach((src) => {
    const expectedF = src.x[0] ** 2 + src.x[1] ** 2;
    assert(Math.abs(expectedF - src.f) < 1e-4, `Source ${src.id} f matches f(x)`);

    const expectedFit = calculateFitness(src.f);
    assert(Math.abs(expectedFit - src.fit) < 0.002, `Source ${src.id} fitness matches 1/(1+f) within rounding`);
  });

  // Verify initial best is Source 1 (f=5, lowest objective)
  const trueInitialBest = stage0.population.reduce((best, cur) => (cur.f < best.f ? cur : best));
  assert.strictEqual(trueInitialBest.id, 1, 'Source 1 has f=5, which is the lowest objective in the initial population');
  assert.strictEqual(stage0.bestSoFar.id, 1, 'Stage 0 bestSoFar must be Source 1');
  console.log('✓ Stage 0 initial snapshot and initial best solution verified');
}

// ── Test 2: Stage 1 (Employed Phase) Source 1 Calculation ─────────────
{
  const stage1 = WORKED_STAGES[1];
  const calc = stage1.calculation;
  assert.strictEqual(calc.sourceId, 1, 'Calculation details Source 1');

  // Verify perturbation: x'₁₁ = 2 + 0.81 × (2 - (-5)) = 7.67
  const rawX1 = calc.sourcePos[0] + calc.phi * (calc.sourcePos[0] - calc.partnerPos[0]);
  assert(Math.abs(rawX1 - 7.67) < 1e-5, `Raw candidate x1 is 7.67, got ${rawX1}`);

  // Verify clipping to [-5, 5]
  const clippedX1 = clipToBounds(rawX1, -5, 5);
  assert.strictEqual(clippedX1, 5.0, '7.67 must be clipped to upper bound 5.0');

  // Verify candidate objective and fitness
  const candF = clippedX1 ** 2 + calc.sourcePos[1] ** 2; // 5^2 + (-1)^2 = 26
  assert.strictEqual(candF, 26, 'Candidate objective must be 26');

  const candFit = calculateFitness(candF); // 1 / (1 + 26) = 1/27 ≈ 0.0370
  assert(Math.abs(candFit - 0.037) < 0.001, 'Candidate fitness must be ~0.037');

  // Verify greedy selection: old f=5 (fit=0.167) > candidate f=26 (fit=0.037) -> REJECTED
  const accepted = isStrictlyBetter(calc.oldFit, candFit);
  assert.strictEqual(accepted, false, 'Candidate must be rejected');
  assert.strictEqual(stage1.population[0].t, 1, 'Trial counter for Source 1 increments to 1');
  console.log('✓ Stage 1 Employed move calculation, clipping, and rejection verified');
}

// ── Test 3: Stage 1 Selection Probabilities Verification ──────────────
{
  const stage1 = WORKED_STAGES[1];
  const fits = stage1.population.map((s) => s.fit);
  const derivedProbs = calculateProbabilities(fits);

  // Source 3 has max fitness (~0.239) -> prob must be 1.0
  assert(Math.abs(derivedProbs[2] - 1.0) < 1e-5, 'Source 3 prob must be 1.0');

  // Source 1: 0.9 * (0.167 / 0.239) + 0.1 ≈ 0.7289 ≈ 0.729
  assert(Math.abs(derivedProbs[0] - 0.729) < 0.002, 'Source 1 prob is ~0.729');

  // Source 2 derived probability from fitness is 0.854
  assert(Math.abs(derivedProbs[1] - 0.854) < 0.005, 'Source 2 prob is ~0.854');

  // Verify minimum probability floor (all >= 0.1)
  derivedProbs.forEach((p, idx) => {
    assert(p >= 0.1 && p <= 1.0, `Source ${idx + 1} prob ${p} must be in [0.1, 1.0]`);
  });
  console.log('✓ Stage 1 onlooker probabilities and probability floor verified');
}

// ── Test 4: Stage 2 (Onlooker Phase) Source 1 Calculation ─────────────
{
  const stage2 = WORKED_STAGES[2];
  const calc = stage2.calculation;

  // Verify starting vector: (2, -1)
  assert.deepStrictEqual(calc.sourcePos, [2, -1], 'Starts from Source 1 position (2, -1)');

  // Waggle dance gate: r = 0.39 < p = 0.729 -> True
  assert(calc.r < calc.pm, '0.39 < 0.729 passes the selection gate');

  // Perturbation: x'₁₁ = 2 + 0.68 × (2 - 3) = 1.32
  const rawX1 = calc.sourcePos[0] + calc.phi * (calc.sourcePos[0] - calc.partnerPos[0]);
  assert(Math.abs(rawX1 - 1.32) < 1e-5, `Raw candidate x1 is 1.32, got ${rawX1}`);

  // Candidate objective and fitness
  const candF = 1.32 ** 2 + (-1) ** 2; // 1.7424 + 1 = 2.7424
  assert(Math.abs(candF - 2.742) < 0.001, 'Candidate objective must be 2.742');

  const candFit = calculateFitness(candF); // 1 / (1 + 2.7424) ≈ 0.2672
  assert(Math.abs(candFit - 0.267) < 0.001, 'Candidate fitness must be ~0.267');

  // Greedy selection: 0.267 > 0.167 -> ACCEPTED!
  const accepted = isStrictlyBetter(calc.oldFit, candFit);
  assert.strictEqual(accepted, true, 'Candidate must be accepted');

  // Source 1 (f=2.742) is the new best solution
  assert(candF < 2.96, 'Source 1 f=2.742 is strictly better than previous best');
  assert.strictEqual(stage2.bestSoFar.id, 1, 'Stage 2 bestSoFar must be Source 1');
  console.log('✓ Stage 2 Onlooker move, acceptance, and new best verified');
}

// ── Test 5: Stage 3 (Scout Phase) Abandonment & Random Draw ────────────
{
  const stage3 = WORKED_STAGES[3];
  const calc = stage3.calculation;

  // Stagnation condition: t = 2 > limit = 1 -> Scout triggered
  assert.strictEqual(shouldScout(calc.oldTrial, calc.limit), true, 'Trial 2 > limit 1 triggers scout');

  // Dimension 1 with r=0.43: -5 + 0.43 * 10 = -0.7
  const x1 = -5 + calc.r1 * (5 - (-5));
  assert(Math.abs(x1 - (-0.7)) < 1e-5, `x1 must be -0.7, got ${x1}`);

  // Dimension 2 with r=0.42: -5 + 0.42 * 10 = -0.8
  const x2 = -5 + calc.r2 * (5 - (-5));
  assert(Math.abs(x2 - (-0.8)) < 1e-5, `x2 must be -0.8, got ${x2}`);

  // Scout objective and fitness
  const newF = (-0.7) ** 2 + (-0.8) ** 2; // 0.49 + 0.64 = 1.13
  assert(Math.abs(newF - 1.13) < 1e-5, 'Scout objective must be 1.13');

  const newFit = calculateFitness(newF); // 1 / (1 + 1.13) = 1/2.13 ≈ 0.4695
  assert(Math.abs(newFit - 0.469) < 0.001, 'Scout fitness must be ~0.469');

  // Scout becomes new global best
  assert.strictEqual(stage3.bestSoFar.id, 5, 'Source 5 becomes new cycle best');
  console.log('✓ Stage 3 Scout trigger, random replacement, and objective verified');
}

// ── Test 6: Invariant & Robustness Checks ──────────────────────────────
{
  // Negative objective fitness: f < 0 => fit = 1 + |f|
  assert.strictEqual(calculateFitness(-5), 6, 'fit(-5) must be 1 + 5 = 6');
  assert.strictEqual(calculateFitness(0), 1, 'fit(0) must be 1/(1+0) = 1');

  // Clipping extreme bounds
  assert.strictEqual(clipToBounds(100, -5, 5), 5, 'Upper bound clipping');
  assert.strictEqual(clipToBounds(-100, -5, 5), -5, 'Lower bound clipping');
  assert.strictEqual(clipToBounds(3, -5, 5), 3, 'Inside bounds unaffected');

  // Probability floor guarantee with equal fitness
  const equalProbs = calculateProbabilities([0.2, 0.2, 0.2]);
  equalProbs.forEach((p) => {
    assert(Math.abs(p - 1.0) < 1e-5, 'Equal fitness gives p=1.0');
  });

  // Zero / negative max fitness safety
  const zeroProbs = calculateProbabilities([0, 0]);
  zeroProbs.forEach((p) => {
    assert(p >= 0.1, 'Zero fitness probability does not crash and respects floor');
  });

  console.log('✓ Edge cases, negative objectives, boundary clipping, and probability safety verified');
}

console.log('\nAll ABC Worked Example and Verification tests passed successfully! (6/6 test suites)\n');
