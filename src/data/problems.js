/**
 * Problem presets for HiveLab ABC Visualizer.
 *
 * Provides benchmark and practice optimization problems:
 * - Sphere: smooth convex baseline
 * - Rosenbrock: non-convex narrow valley
 * - Rastrigin: highly multi-modal landscape
 */

export const PROBLEMS = [
  {
    id: 'sphere-lecture',
    name: 'Sphere — Benchmark',
    tag: 'Benchmark',
    description:
      'Minimise the sum of squared coordinates. The global minimum is at the origin (0, 0) where f = 0. A smooth, convex benchmark function ideal for visualizing ABC optimization.',
    objective: 'f(x₁, x₂) = x₁² + x₂²',
    objectiveFn: (x) => x[0] ** 2 + x[1] ** 2,
    dimensions: 2,
    varNames: ['x₁', 'x₂'],
    bounds: { lower: [-5, -5], upper: [5, 5] },
    goal: 'minimise',
    defaultParams: {
      S: 10,
      T: 10,
      limit: 1,
      seed: 42,
    },
    referenceInitialPopulation: [
      { x: [2, -1],  f: 5,    fit: 1 / 6,    t: 0 },
      { x: [-3, 2],  f: 13,   fit: 1 / 14,   t: 0 },
      { x: [1, -4],  f: 17,   fit: 1 / 18,   t: 0 },
      { x: [-5, 3],  f: 34,   fit: 1 / 35,   t: 0 },
      { x: [3, 0],   f: 9,    fit: 1 / 10,   t: 0 },
    ],
  },
  {
    id: 'rosenbrock-practice',
    name: 'Rosenbrock — Valley',
    tag: 'Practice',
    description:
      'A classic non-convex "banana valley" test function. The global minimum is inside a long, narrow parabolic valley at (1, 1) where f = 0.',
    objective: 'f(x₁, x₂) = (1 − x₁)² + 100(x₂ − x₁²)²',
    objectiveFn: (x) =>
      (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
    dimensions: 2,
    varNames: ['x₁', 'x₂'],
    bounds: { lower: [-2, -1], upper: [2, 3] },
    goal: 'minimise',
    defaultParams: {
      S: 10,
      T: 20,
      limit: 3,
      seed: 42,
    },
  },
  {
    id: 'rastrigin-practice',
    name: 'Rastrigin — Multimodal',
    tag: 'Practice',
    description:
      'A highly multi-modal function with many local minima arranged in a grid. Tests the algorithm’s capability to avoid premature convergence. Global minimum is at (0, 0) where f = 0.',
    objective: 'f(x₁, x₂) = 20 + x₁² − 10cos(2πx₁) + x₂² − 10cos(2πx₂)',
    objectiveFn: (x) =>
      20 +
      x[0] ** 2 - 10 * Math.cos(2 * Math.PI * x[0]) +
      x[1] ** 2 - 10 * Math.cos(2 * Math.PI * x[1]),
    dimensions: 2,
    varNames: ['x₁', 'x₂'],
    bounds: { lower: [-5.12, -5.12], upper: [5.12, 5.12] },
    goal: 'minimise',
    defaultParams: {
      S: 12,
      T: 30,
      limit: 5,
      seed: 42,
    },
  },
];

/**
 * Find a problem preset by its id string.
 * Supports 'sphere' as alias for 'sphere-lecture'.
 */
export function getProblemById(id) {
  if (id === 'sphere') return PROBLEMS[0];
  return PROBLEMS.find((p) => p.id === id);
}

/**
 * Default problem shown on first load.
 */
export const DEFAULT_PROBLEM_ID = 'sphere-lecture';
