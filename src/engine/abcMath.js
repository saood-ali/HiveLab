/**
 * Core mathematical functions for Artificial Bee Colony (ABC) algorithm.
 * Strictly implements the specification from ALGORITHM_SPEC.md and the
 * Evolutionary Computing lecture PDF (printed pages 35-46).
 *
 * All functions are pure, deterministic, and free of React / UI side effects.
 */

/**
 * Fitness conversion function used throughout the ABC lecture:
 *   fit_m = 1 / (1 + f_m)  if f_m >= 0
 *   fit_m = 1 + |f_m|      if f_m < 0
 *
 * Converts a minimization objective into a positive fitness value to maximize.
 *
 * @param {number} f - Objective function value
 * @returns {number} Non-negative fitness value
 */
export function calculateFitness(f) {
  if (f >= 0) {
    return 1 / (1 + f);
  } else {
    return 1 + Math.abs(f);
  }
}

/**
 * Onlooker selection probability formula from lecture (printed page 40/44):
 *   p_m = 0.9 * (fit_m / max(fit)) + 0.1
 *
 * The +0.1 floor guarantees every source retains a non-zero selection chance.
 *
 * @param {Array<number>} fitnesses - Array of fitness values for all food sources
 * @returns {Array<number>} Probability score p_m for each food source
 */
export function calculateProbabilities(fitnesses) {
  if (!fitnesses || fitnesses.length === 0) return [];
  const maxFit = Math.max(...fitnesses);
  if (maxFit <= 0) {
    // Edge case safety: uniform 0.1 if all fitnesses are zero
    return fitnesses.map(() => 0.1);
  }
  return fitnesses.map((fit) => 0.9 * (fit / maxFit) + 0.1);
}

/**
 * Generate a candidate neighbour solution along one perturbed dimension:
 *   x'_mi = x_mi + phi_mi * (x_mi - x_ki)
 *
 * All other dimensions remain unchanged.
 *
 * @param {Array<number>} currentPos - Coordinate vector x_m of current source
 * @param {Array<number>} partnerPos - Coordinate vector x_k of partner source (k != m)
 * @param {number} dimIdx - Dimension index i to perturb
 * @param {number} phi - Random weight in [-1, 1]
 * @param {Object} bounds - { lower: number[], upper: number[] }
 * @returns {{ candidate: number[], rawValue: number, clipped: boolean }}
 */
export function generateNeighbour(currentPos, partnerPos, dimIdx, phi, bounds) {
  const candidate = [...currentPos];
  const x_m = currentPos[dimIdx];
  const x_k = partnerPos[dimIdx];

  // Raw perturbed coordinate
  const rawValue = x_m + phi * (x_m - x_k);

  // Clip to bounds [l_i, u_i]
  const l_i = bounds.lower[dimIdx];
  const u_i = bounds.upper[dimIdx];
  const clippedValue = Math.min(u_i, Math.max(l_i, rawValue));
  const clipped = clippedValue !== rawValue;

  candidate[dimIdx] = clippedValue;

  return {
    candidate,
    rawValue,
    clippedValue,
    clipped,
  };
}

/**
 * Greedy selection comparison for minimization:
 * Candidate replaces current source ONLY if it is strictly better.
 *
 * Strictly better means: fit(candidate) > fit(current)
 * For minimization problems, this is equivalent to f(candidate) < f(current).
 *
 * @param {number} currentFit - Fitness of existing source
 * @param {number} candidateFit - Fitness of candidate solution
 * @returns {boolean} True if candidate should replace current source
 */
export function isStrictlyBetter(currentFit, candidateFit) {
  return candidateFit > currentFit;
}

/**
 * Generate a new random food source uniformly distributed within bounds:
 *   x_mi = l_i + rand(0, 1) * (u_i - l_i)
 *
 * Used during Initialization Phase and Scout Bee Phase replacement.
 *
 * @param {Object} bounds - { lower: number[], upper: number[] }
 * @param {Object} rng - PRNG instance with next() method
 * @returns {{ x: number[], draws: number[] }}
 */
export function generateUniformSource(bounds, rng) {
  const x = [];
  const draws = [];
  for (let i = 0; i < bounds.lower.length; i++) {
    const r = rng.next();
    draws.push(r);
    const coord = bounds.lower[i] + r * (bounds.upper[i] - bounds.lower[i]);
    x.push(coord);
  }
  return { x, draws };
}

/**
 * Check if a source's trial counter exceeds the abandonment limit.
 * Per the lecture specification: strictly t_m > limit, not >=.
 *
 * @param {number} trial - Current trial counter t_m
 * @param {number} limit - Abandonment limit threshold
 * @returns {boolean}
 */
export function shouldScout(trial, limit) {
  return trial > limit;
}
