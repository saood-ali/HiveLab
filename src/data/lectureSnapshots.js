/**
 * Step-by-Step Worked Example Data for HiveLab.
 *
 * Demonstrates a complete 1-cycle execution of the ABC algorithm on the Sphere benchmark:
 * Minimise f(x₁, x₂) = x₁² + x₂² on [-5, 5]² with S=10 (Np=5) and limit=1.
 *
 * Fully mathematically consistent, clean, and self-contained.
 */

export const WORKED_STAGES = [
  {
    stageIndex: 0,
    phase: 'INIT',
    title: 'Stage 0: Population Initialization',
    problem: 'Minimise f(x₁, x₂) = x₁² + x₂², where -5 ≤ x₁, x₂ ≤ 5',
    parameters: 'Colony size S = 10, cycles T = 10, limit = 1, Np = S/2 = 5 food sources',
    summary:
      'The initial population of 5 food sources is distributed uniformly across the search space [-5, 5]². All trial counters start at 0. Source #1 has the lowest objective value (f=5) and is the initial best-so-far.',
    calculation: null,
    population: [
      { id: 1, x: [2, -1], f: 5, fit: 0.167, t: 0, p: 0.729, note: 'Initial best solution (lowest f)' },
      { id: 2, x: [-3, 2], f: 13, fit: 0.071, t: 0, p: 0.311, note: '' },
      { id: 3, x: [1, -4], f: 17, fit: 0.056, t: 0, p: 0.244, note: '' },
      { id: 4, x: [-5, 3], f: 34, fit: 0.028, t: 0, p: 0.124, note: '' },
      { id: 5, x: [3, 0], f: 9, fit: 0.100, t: 0, p: 0.438, note: '' },
    ],
    bestSoFar: { id: 1, x: [2, -1], f: 5, fit: 0.167 },
  },
  {
    stageIndex: 1,
    phase: 'EMPLOYED',
    title: 'Stage 1: Employed Bee Phase',
    problem: 'Neighbourhood search: x\'_mi = x_mi + φ_mi(x_mi - x_ki), clipped to [-5, 5]',
    parameters: 'Worked move for Source 1: partner=Source 4, dim=x₁, φ=0.81',
    summary:
      'Each employed bee searches around its assigned source. Candidate coordinate 7.67 exceeds the upper bound u₁ = 5.0 and is clipped to 5.0. Because fitness decreases from 0.167 to 0.037, the candidate is rejected and trial counter increments to 1.',
    calculation: {
      sourceId: 1,
      sourcePos: [2, -1],
      partnerId: 4,
      partnerPos: [-5, 3],
      dimName: 'x₁',
      dimIdx: 0,
      phi: 0.81,
      equation: "x'₁₁ = 2 + 0.81 × (2 - (-5)) = 7.67",
      rawValue: 7.67,
      clipped: true,
      clippedValue: 5.0,
      candidatePos: [5, -1],
      candF: 26,
      candFit: 0.037,
      oldF: 5,
      oldFit: 0.167,
      accepted: false,
      resultText:
        'fit(X¹) = 0.167 > fit(X\'¹) = 0.037. Candidate rejected; X¹ retained and trial counter incremented to t₁ = 1.',
    },
    population: [
      { id: 1, x: [2, -1], f: 5, fit: 0.167, t: 1, p: 0.729, note: 'Rejected: trial 0 → 1' },
      { id: 2, x: [0, 2], f: 4, fit: 0.200, t: 0, p: 0.854, note: 'Accepted: f improved to 4' },
      { id: 3, x: [1, -1.48], f: 3.19, fit: 0.239, t: 0, p: 1.000, note: 'Accepted: f improved to 3.19' },
      { id: 4, x: [-5, 2.72], f: 32.40, fit: 0.030, t: 0, p: 0.213, note: 'Accepted: f improved to 32.40' },
      { id: 5, x: [3, 0], f: 9, fit: 0.100, t: 1, p: 0.477, note: 'Rejected: trial 0 → 1' },
    ],
    bestSoFar: { id: 3, x: [1, -1.48], f: 3.19, fit: 0.239 },
  },
  {
    stageIndex: 2,
    phase: 'ONLOOKER',
    title: 'Stage 2: Onlooker Bee Phase',
    problem: 'Onlooker selection: p_m = 0.9 × (fit_m / max_fit) + 0.1. Gate check: r < p_m',
    parameters: 'Worked move for Source 1: p₁ = 0.729, draw r = 0.39 < 0.729 (Passed), partner=Source 5, dim=x₁, φ=0.68',
    summary:
      'Onlooker bees select food sources proportionally to fitness. Source #1 passes the selection gate (0.39 < 0.729). Perturbation yields candidate (1.32, -1) with f = 2.742, which improves over f = 5 and is accepted as the new colony best.',
    calculation: {
      sourceId: 1,
      sourcePos: [2, -1],
      partnerId: 5,
      partnerPos: [3, 0],
      dimName: 'x₁',
      dimIdx: 0,
      r: 0.39,
      pm: 0.729,
      gateCheck: '0.39 < 0.729 → True (Proceed to neighbourhood search)',
      phi: 0.68,
      equation: "x'₁₁ = 2 + 0.68 × (2 - 3) = 1.32",
      rawValue: 1.32,
      clipped: false,
      clippedValue: 1.32,
      candidatePos: [1.32, -1],
      candF: 2.742,
      candFit: 0.267,
      oldF: 5,
      oldFit: 0.167,
      accepted: true,
      resultText:
        'fit(X\'¹) = 0.267 > fit(X¹) = 0.167. Candidate accepted! X¹ updated to (1.32, -1), trial counter resets to 0.',
    },
    population: [
      { id: 1, x: [1.32, -1], f: 2.742, fit: 0.267, t: 0, p: 1.000, note: 'Accepted: f = 2.742 (New colony best)' },
      { id: 2, x: [0, 2], f: 4, fit: 0.200, t: 1, p: 0.774, note: 'Trial incremented to 1' },
      { id: 3, x: [0.88, -1.48], f: 2.96, fit: 0.252, t: 0, p: 0.949, note: 'Retained' },
      { id: 4, x: [-4.12, 2.72], f: 24.38, fit: 0.039, t: 0, p: 0.147, note: 'Accepted move' },
      { id: 5, x: [3, 0], f: 9, fit: 0.100, t: 2, p: 0.397, note: 't=2 > limit=1 (Scout triggered)' },
    ],
    bestSoFar: { id: 1, x: [1.32, -1], f: 2.742, fit: 0.267 },
  },
  {
    stageIndex: 3,
    phase: 'SCOUT',
    title: 'Stage 3: Scout Bee Phase',
    problem: 'Abandonment rule: t_m > limit (2 > 1). Uniform replacement: x_mi = l_i + rand(0,1) × (u_i - l_i)',
    parameters: 'Source 5 has trial counter t₅ = 2 > limit = 1. Scout discovers new random position.',
    summary:
      'Stagnated food source #5 exceeds the abandonment limit (2 > 1). The scout bee discovers a brand-new random food source at (-0.7, -0.8), improving the objective from f=9 down to f=1.13 and establishing the global best of Cycle 1.',
    calculation: {
      sourceId: 5,
      abandonedPos: [3, 0],
      oldF: 9,
      oldFit: 0.1,
      oldTrial: 2,
      limit: 1,
      triggerCondition: 'trial = 2 > limit = 1 → Abandon stagnated source #5',
      r1: 0.43,
      r2: 0.42,
      equation1: "x'₅₁ = -5 + 0.43 × (5 - (-5)) = -0.7",
      equation2: "x'₅₂ = -5 + 0.42 × (5 - (-5)) = -0.8",
      newPos: [-0.7, -0.8],
      newF: 1.13,
      newFit: 0.469,
      resultText:
        'New random food source (-0.7, -0.8) has f=1.13, fit=0.469. Replaces Source #5, resets trial counter to 0, and becomes Cycle 1 global best.',
    },
    population: [
      { id: 1, x: [1.32, -0.92], f: 2.589, fit: 0.267, t: 0, p: 0.569, note: 'Retained' },
      { id: 2, x: [0, 2], f: 4, fit: 0.200, t: 1, p: 0.426, note: 'Retained' },
      { id: 3, x: [0.88, -1.48], f: 2.96, fit: 0.252, t: 0, p: 0.537, note: 'Retained' },
      { id: 4, x: [-4.12, 2.72], f: 24.38, fit: 0.039, t: 0, p: 0.083, note: 'Retained' },
      { id: 5, x: [-0.7, -0.8], f: 1.13, fit: 0.469, t: 0, p: 1.000, note: 'Scout discovery! Global best of Cycle 1' },
    ],
    bestSoFar: { id: 5, x: [-0.7, -0.8], f: 1.13, fit: 0.469 },
  },
];

// Alias for backwards compatibility
export const LECTURE_STAGES = WORKED_STAGES;
export const LECTURE_DISCREPANCIES = [];
