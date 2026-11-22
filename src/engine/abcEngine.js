/**
 * ABC Algorithm Simulation Engine & Manual Stepper.
 *
 * Implements the full discrete-event state machine specified in ALGORITHM_SPEC.md.
 * Rules:
 *   - Only user click on Next Step advances algorithm state. No autoplay or timers.
 *   - Back restores the exact previous state (including PRNG state).
 *   - Reset returns to the starting state with the same seed.
 *   - Pure, deterministic, fully auditable event ledger.
 */

import { PRNG } from './prng.js';
import {
  calculateFitness,
  calculateProbabilities,
  generateNeighbour,
  isStrictlyBetter,
  generateUniformSource,
  shouldScout,
} from './abcMath.js';

export class ABCEngine {
  /**
   * @param {Object} problem - Problem specification from problems.js
   * @param {Object} params - { S, T, limit, seed, bounds: [[lo, hi], ...] }
   * @param {Object} [options] - Optional override settings (e.g. useLectureInit)
   */
  constructor(problem, params, options = {}) {
    this.problem = problem;
    this.params = {
      S: Number(params.S),
      Np: Math.floor(Number(params.S) / 2),
      T: Number(params.T),
      limit: Number(params.limit),
      seed: Number(params.seed),
      bounds: {
        lower: params.bounds.map((b) => Number(b[0])),
        upper: params.bounds.map((b) => Number(b[1])),
      },
    };
    this.options = options;

    this.rng = new PRNG(this.params.seed);
    this.history = [];
    this.initSimulation();
  }

  /**
   * Initialize or reset simulation state to Step 0.
   */
  initSimulation() {
    this.rng.reset();
    this.history = [];
    this.stepIndex = 0;
    this.cycle = 1;
    this.phase = 'INIT'; // 'INIT' | 'EMPLOYED' | 'ONLOOKER' | 'SCOUT' | 'MEMORISE' | 'TERMINATED'
    this.currentBeeIndex = -1;
    this.isTerminated = false;

    // Generate initial food sources
    const Np = this.params.Np;
    const bounds = this.params.bounds;
    this.population = [];

    // Optional: allow using lecture's exact published initial population if configured
    if (this.options.useLectureInit && this.problem.lectureInitialPopulation) {
      this.population = this.problem.lectureInitialPopulation.map((item, idx) => ({
        id: idx + 1,
        x: [...item.x],
        f: item.f,
        fit: item.fit,
        t: item.t,
        p: 0,
      }));
    } else {
      for (let m = 0; m < Np; m++) {
        const { x } = generateUniformSource(bounds, this.rng);
        const f = this.problem.objectiveFn(x);
        const fit = calculateFitness(f);
        this.population.push({
          id: m + 1,
          x,
          f,
          fit,
          t: 0,
          p: 0,
        });
      }
    }

    // Initialize best-so-far solution
    let best = this.population[0];
    for (let m = 1; m < this.population.length; m++) {
      if (this.population[m].fit > best.fit) {
        best = this.population[m];
      }
    }
    this.bestSoFar = {
      id: best.id,
      x: [...best.x],
      f: best.f,
      fit: best.fit,
      foundAtCycle: 0,
    };

    // Calculate initial onlooker selection probabilities
    this.updateProbabilities();

    // Initial event record for step 0
    this.currentEvent = {
      stepIndex: 0,
      cycle: 0,
      phase: 'INIT',
      type: 'INITIALIZATION',
      title: 'Colony Initialized',
      summary: `Initialized ${Np} food sources randomly inside the bounds.`,
      details: `Colony size S=${this.params.S}, food sources Np=${Np}, max cycles T=${this.params.T}, limit=${this.params.limit}, seed=${this.params.seed}.`,
      draws: [],
      affectedSourceId: best.id,
      bestSoFar: { ...this.bestSoFar },
    };
  }

  /**
   * Recalculate p_m probabilities across current population.
   */
  updateProbabilities() {
    const fitnesses = this.population.map((src) => src.fit);
    const probs = calculateProbabilities(fitnesses);
    for (let i = 0; i < this.population.length; i++) {
      this.population[i].p = probs[i];
    }
  }

  /**
   * Take an exact snapshot of current simulation state for history/rewind.
   */
  captureSnapshot() {
    return {
      stepIndex: this.stepIndex,
      cycle: this.cycle,
      phase: this.phase,
      currentBeeIndex: this.currentBeeIndex,
      isTerminated: this.isTerminated,
      population: this.population.map((src) => ({
        id: src.id,
        x: [...src.x],
        f: src.f,
        fit: src.fit,
        t: src.t,
        p: src.p,
      })),
      bestSoFar: {
        id: this.bestSoFar.id,
        x: [...this.bestSoFar.x],
        f: this.bestSoFar.f,
        fit: this.bestSoFar.fit,
        foundAtCycle: this.bestSoFar.foundAtCycle,
      },
      currentEvent: { ...this.currentEvent },
      rngState: this.rng.getState(),
    };
  }

  /**
   * Restore state from a saved snapshot.
   */
  restoreSnapshot(snap) {
    this.stepIndex = snap.stepIndex;
    this.cycle = snap.cycle;
    this.phase = snap.phase;
    this.currentBeeIndex = snap.currentBeeIndex;
    this.isTerminated = snap.isTerminated;
    this.population = snap.population.map((src) => ({
      id: src.id,
      x: [...src.x],
      f: src.f,
      fit: src.fit,
      t: src.t,
      p: src.p,
    }));
    this.bestSoFar = {
      id: snap.bestSoFar.id,
      x: [...snap.bestSoFar.x],
      f: snap.bestSoFar.f,
      fit: snap.bestSoFar.fit,
      foundAtCycle: snap.bestSoFar.foundAtCycle,
    };
    this.currentEvent = { ...snap.currentEvent };
    this.rng.setState(snap.rngState);
  }

  /**
   * Advance algorithm by exactly one discrete step.
   * State NEVER advances automatically. Only user call to nextStep() advances.
   *
   * @returns {Object} The resulting event description
   */
  nextStep() {
    if (this.isTerminated) return this.currentEvent;

    // Save snapshot before mutating state
    this.history.push(this.captureSnapshot());
    this.stepIndex++;

    const Np = this.population.length;

    // Determine next phase and index
    if (this.phase === 'INIT') {
      this.phase = 'EMPLOYED';
      this.currentBeeIndex = 0;
    } else if (this.phase === 'EMPLOYED') {
      if (this.currentBeeIndex < Np - 1) {
        this.currentBeeIndex++;
      } else {
        this.phase = 'ONLOOKER';
        this.currentBeeIndex = 0;
        this.updateProbabilities();
      }
    } else if (this.phase === 'ONLOOKER') {
      if (this.currentBeeIndex < Np - 1) {
        this.currentBeeIndex++;
      } else {
        this.phase = 'SCOUT';
        this.currentBeeIndex = -1;
      }
    } else if (this.phase === 'SCOUT') {
      this.phase = 'MEMORISE';
      this.currentBeeIndex = -1;
    } else if (this.phase === 'MEMORISE') {
      if (this.cycle >= this.params.T) {
        this.phase = 'TERMINATED';
        this.isTerminated = true;
        this.currentEvent = {
          stepIndex: this.stepIndex,
          cycle: this.cycle,
          phase: 'TERMINATED',
          type: 'ALGORITHM_TERMINATED',
          title: 'Optimization Finished',
          summary: `Completed all ${this.params.T} cycles. Best solution found: f = ${this.bestSoFar.f.toFixed(6)} at (${this.bestSoFar.x.map((c) => c.toFixed(4)).join(', ')}).`,
          details: `Global best achieved: f=${this.bestSoFar.f.toFixed(6)}, fitness=${this.bestSoFar.fit.toFixed(6)}, found at cycle ${this.bestSoFar.foundAtCycle}.`,
          draws: [],
          bestSoFar: { ...this.bestSoFar },
        };
        return this.currentEvent;
      } else {
        this.cycle++;
        this.phase = 'EMPLOYED';
        this.currentBeeIndex = 0;
      }
    }

    let event = null;
    switch (this.phase) {
      case 'EMPLOYED':
        event = this.stepEmployedBee();
        break;
      case 'ONLOOKER':
        event = this.stepOnlookerBee();
        break;
      case 'SCOUT':
        event = this.stepScoutBee();
        break;
      case 'MEMORISE':
        event = this.stepMemoriseBest();
        break;
      default:
        break;
    }

    this.currentEvent = event;
    return event;
  }

  /**
   * Rewind simulation by one step.
   *
   * @returns {boolean} True if rewound, false if at start
   */
  prevStep() {
    if (this.history.length === 0) return false;
    const previous = this.history.pop();
    this.restoreSnapshot(previous);
    return true;
  }

  /**
   * Fast-forward simulation to completion (termination event).
   * Advances step-by-step recording history so the run can still be rewound with prevStep().
   *
   * @param {number} maxSteps - Safety guard against infinite loops (default 100000)
   * @returns {Object} The final event description
   */
  fastForward(maxSteps = 100000) {
    let steps = 0;
    while (!this.isTerminated && steps < maxSteps) {
      this.nextStep();
      steps++;
    }
    return this.currentEvent;
  }

  /**
   * Reset simulation back to step 0 with the same seed.
   */
  reset() {
    this.initSimulation();
  }

  // ── Phase Implementations ──────────────────────────────────────────

  /**
   * Execute one Employed Bee step for source m = this.currentBeeIndex.
   */
  stepEmployedBee() {
    const m = this.currentBeeIndex;
    const source = this.population[m];
    const Np = this.population.length;
    const dims = this.problem.dimensions;
    const bounds = this.params.bounds;

    // 1. Randomly pick dimension i in [0, dims - 1]
    const dimIdx = this.rng.nextInt(0, dims - 1);

    // 2. Randomly pick partner k != m in [0, Np - 1]
    let partnerIdx = this.rng.nextInt(0, Np - 2);
    if (partnerIdx >= m) partnerIdx++;

    const partner = this.population[partnerIdx];

    // 3. Draw phi in [-1, 1]
    const phi = this.rng.nextPhi();

    // 4. Generate candidate coordinate and clip
    const { candidate, rawValue, clippedValue, clipped } = generateNeighbour(
      source.x,
      partner.x,
      dimIdx,
      phi,
      bounds
    );

    // 5. Evaluate candidate objective & fitness
    const candF = this.problem.objectiveFn(candidate);
    const candFit = calculateFitness(candF);

    // 6. Greedy selection: strictly better?
    const accepted = isStrictlyBetter(source.fit, candFit);
    const oldTrial = source.t;
    const oldF = source.f;
    const oldFit = source.fit;
    const oldX = [...source.x];
    const partnerPos = [...partner.x];

    if (accepted) {
      source.x = candidate;
      source.f = candF;
      source.fit = candFit;
      source.t = 0;
    } else {
      source.t = oldTrial + 1;
    }

    const varName = this.problem.varNames[dimIdx];
    const formulaStr = `x'_${m + 1},${dimIdx + 1} = ${oldX[dimIdx].toFixed(4)} + (${phi.toFixed(4)}) × (${oldX[dimIdx].toFixed(4)} - ${partnerPos[dimIdx].toFixed(4)})`;

    return {
      stepIndex: this.stepIndex,
      cycle: this.cycle,
      phase: 'EMPLOYED',
      type: 'EMPLOYED_MOVE',
      title: `Employed Bee #${m + 1}`,
      sourceId: source.id,
      partnerId: partner.id,
      partnerPos,
      dim: dimIdx,
      dimName: varName,
      phi,
      oldX,
      candidateX: candidate,
      rawValue,
      clippedValue,
      clipped,
      oldF,
      oldFit,
      candF,
      candFit,
      accepted,
      oldTrial,
      newTrial: source.t,
      summary: accepted
        ? `Bee #${m + 1} found a better neighbour via partner #${partner.id}. Accepted (f: ${oldF.toFixed(4)} → ${candF.toFixed(4)}). Trial reset to 0.`
        : `Bee #${m + 1} tested neighbour via partner #${partner.id}. Not better. Rejected. Trial incremented (${oldTrial} → ${source.t}).`,
      formula: formulaStr,
      draws: [
        { label: 'Dimension', value: varName },
        { label: 'Partner', value: `Source #${partner.id}` },
        { label: 'φ', value: phi.toFixed(4) },
      ],
      bestSoFar: { ...this.bestSoFar },
    };
  }

  /**
   * Execute one Onlooker Bee step for onlooker j = this.currentBeeIndex.
   */
  stepOnlookerBee() {
    const j = this.currentBeeIndex;
    const Np = this.population.length;
    const dims = this.problem.dimensions;
    const bounds = this.params.bounds;

    const m = j;
    const source = this.population[m];
    const pm = source.p;

    const r = this.rng.next();
    const passedGate = r < pm;

    if (!passedGate) {
      return {
        stepIndex: this.stepIndex,
        cycle: this.cycle,
        phase: 'ONLOOKER',
        type: 'ONLOOKER_SKIPPED',
        title: `Onlooker Bee #${j + 1} (Source #${source.id})`,
        sourceId: source.id,
        r,
        pm,
        passedGate: false,
        accepted: false,
        skipped: true,
        trial: source.t,
        summary: `Onlooker #${j + 1} checked Source #${source.id}. Random draw r=${r.toFixed(4)} ≥ p=${pm.toFixed(4)}. Source skipped (trial unchanged at ${source.t}).`,
        details: `Probability p_${source.id} = 0.9 × (${source.fit.toFixed(4)} / maxFit) + 0.1 = ${pm.toFixed(4)}. Draw r=${r.toFixed(4)}. Gate not satisfied.`,
        draws: [
          { label: 'Source', value: `#${source.id}` },
          { label: 'p_m', value: pm.toFixed(4) },
          { label: 'r', value: r.toFixed(4) },
        ],
        bestSoFar: { ...this.bestSoFar },
      };
    }

    const dimIdx = this.rng.nextInt(0, dims - 1);
    let partnerIdx = this.rng.nextInt(0, Np - 2);
    if (partnerIdx >= m) partnerIdx++;
    const partner = this.population[partnerIdx];
    const phi = this.rng.nextPhi();

    const { candidate, rawValue, clippedValue, clipped } = generateNeighbour(
      source.x,
      partner.x,
      dimIdx,
      phi,
      bounds
    );

    const candF = this.problem.objectiveFn(candidate);
    const candFit = calculateFitness(candF);
    const accepted = isStrictlyBetter(source.fit, candFit);
    const oldTrial = source.t;
    const oldF = source.f;
    const oldFit = source.fit;
    const oldX = [...source.x];
    const partnerPos = [...partner.x];

    if (accepted) {
      source.x = candidate;
      source.f = candF;
      source.fit = candFit;
      source.t = 0;
    } else {
      source.t = oldTrial + 1;
    }

    const varName = this.problem.varNames[dimIdx];
    return {
      stepIndex: this.stepIndex,
      cycle: this.cycle,
      phase: 'ONLOOKER',
      type: 'ONLOOKER_MOVE',
      title: `Onlooker Bee #${j + 1} (Source #${source.id})`,
      sourceId: source.id,
      partnerId: partner.id,
      partnerPos,
      dim: dimIdx,
      dimName: varName,
      r,
      pm,
      phi,
      passedGate: true,
      oldX,
      candidateX: candidate,
      rawValue,
      clippedValue,
      clipped,
      oldF,
      oldFit,
      candF,
      candFit,
      accepted,
      oldTrial,
      newTrial: source.t,
      summary: accepted
        ? `Onlooker #${j + 1} (r=${r.toFixed(3)} < p=${pm.toFixed(3)}) improved Source #${source.id} via partner #${partner.id}! Accepted (f: ${oldF.toFixed(4)} → ${candF.toFixed(4)}). Trial reset to 0.`
        : `Onlooker #${j + 1} (r=${r.toFixed(3)} < p=${pm.toFixed(3)}) tested Source #${source.id} via partner #${partner.id}. Not better. Rejected. Trial incremented (${oldTrial} → ${source.t}).`,
      draws: [
        { label: 'Source', value: `#${source.id}` },
        { label: 'p_m', value: pm.toFixed(4) },
        { label: 'r', value: r.toFixed(4) },
        { label: 'Partner', value: `#${partner.id}` },
        { label: 'Dimension', value: varName },
        { label: 'φ', value: phi.toFixed(4) },
      ],
      bestSoFar: { ...this.bestSoFar },
    };
  }

  /**
   * Execute Scout Bee Phase.
   */
  stepScoutBee() {
    const limit = this.params.limit;
    const bounds = this.params.bounds;
    const abandonedSources = [];

    for (let m = 0; m < this.population.length; m++) {
      const src = this.population[m];
      if (shouldScout(src.t, limit)) {
        const oldX = [...src.x];
        const oldF = src.f;
        const oldFit = src.fit;
        const oldTrial = src.t;

        const { x: newX, draws } = generateUniformSource(bounds, this.rng);
        const newF = this.problem.objectiveFn(newX);
        const newFit = calculateFitness(newF);

        src.x = newX;
        src.f = newF;
        src.fit = newFit;
        src.t = 0;

        abandonedSources.push({
          id: src.id,
          oldX,
          oldF,
          oldFit,
          oldTrial,
          newX,
          newF,
          newFit,
          draws,
        });
      }
    }

    if (abandonedSources.length > 0) {
      const first = abandonedSources[0];
      return {
        stepIndex: this.stepIndex,
        cycle: this.cycle,
        phase: 'SCOUT',
        type: 'SCOUT_REPLACED',
        title: 'Scout Bee Replacement',
        abandonedSources,
        summary: `Source #${first.id} had trial=${first.oldTrial} > limit=${limit}. Abandoned and replaced with a fresh random location (f: ${first.oldF.toFixed(4)} → ${first.newF.toFixed(4)}).`,
        details: `Uniform initialization re-applied inside bounds. Trial counter reset to 0.`,
        draws: first.draws.map((d, i) => ({
          label: `r_${this.problem.varNames[i] || i + 1}`,
          value: d.toFixed(4),
        })),
        bestSoFar: { ...this.bestSoFar },
      };
    }

    return {
      stepIndex: this.stepIndex,
      cycle: this.cycle,
      phase: 'SCOUT',
      type: 'SCOUT_NONE',
      title: 'Scout Bee Phase',
      abandonedSources: [],
      summary: `No food source exceeded the abandonment limit (${limit}). Scout replacement skipped.`,
      details: `Trial counters: [${this.population.map((s) => s.t).join(', ')}]. All trial counters ≤ limit.`,
      draws: [],
      bestSoFar: { ...this.bestSoFar },
    };
  }

  /**
   * Execute Memorise Best Phase.
   */
  stepMemoriseBest() {
    let bestInColony = this.population[0];
    for (let m = 1; m < this.population.length; m++) {
      if (this.population[m].fit > bestInColony.fit) {
        bestInColony = this.population[m];
      }
    }

    let improved = false;
    const prevBestF = this.bestSoFar.f;
    if (bestInColony.fit > this.bestSoFar.fit) {
      this.bestSoFar = {
        id: bestInColony.id,
        x: [...bestInColony.x],
        f: bestInColony.f,
        fit: bestInColony.fit,
        foundAtCycle: this.cycle,
      };
      improved = true;
    }

    const currentCycle = this.cycle;
    const maxCycles = this.params.T;
    const isLastCycle = currentCycle >= maxCycles;

    return {
      stepIndex: this.stepIndex,
      cycle: currentCycle,
      phase: 'MEMORISE',
      type: 'CYCLE_SUMMARY',
      title: `Cycle #${currentCycle} Completed`,
      summary: improved
        ? `New best-so-far solution memorized: f = ${this.bestSoFar.f.toFixed(4)} (from Source #${this.bestSoFar.id}).`
        : `Best-so-far retained: f = ${this.bestSoFar.f.toFixed(4)}. Current colony best: f = ${bestInColony.f.toFixed(4)}.`,
      details: isLastCycle
        ? `Reached maximum cycles T = ${maxCycles}. Next step will finish the run.`
        : `Ready for Cycle #${currentCycle + 1}.`,
      improved,
      prevBestF,
      currentBestF: this.bestSoFar.f,
      draws: [],
      bestSoFar: { ...this.bestSoFar },
    };
  }
}
