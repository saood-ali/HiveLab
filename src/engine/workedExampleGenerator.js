/**
 * Dynamic Worked Example Generator for HiveLab.
 *
 * Produces step-by-step mathematical hand calculations and colony state snapshots
 * dynamically tailored to the user's active configured problem & parameters.
 */

import { ABCEngine } from './abcEngine.js';
import { calculateProbabilities, calculateFitness } from './abcMath.js';

export function generateDynamicWorkedExample(problem, params) {
  const parsedParams = {
    S: Number(params.S) || 10,
    T: Number(params.T) || 10,
    limit: Number(params.limit) || 1,
    seed: Number(params.seed) || 42,
    bounds: params.bounds
      ? params.bounds.map((b) => [Number(b[0]), Number(b[1])])
      : problem.bounds.lower.map((lo, i) => [lo, problem.bounds.upper[i]]),
  };

  const engine = new ABCEngine(problem, parsedParams);

  // ── Stage 0: Initial Colony State ─────────────────────────────────
  const stage0Pop = engine.population.map((src) => ({
    id: src.id,
    x: [...src.x],
    f: src.f,
    fit: src.fit,
    t: src.t,
    p: src.p,
  }));
  const stage0Best = { ...engine.bestSoFar, x: [...engine.bestSoFar.x] };
  const src1 = stage0Pop[0];

  const stage0 = {
    stageIndex: 0,
    phase: 'INIT',
    phaseName: 'Initialization',
    title: 'Stage 0: Initial Colony State',
    summary: `Initial population of Np = ${stage0Pop.length} candidate food sources generated randomly within bounds.`,
    population: stage0Pop,
    bestSoFar: stage0Best,
    movementEvent: null,
    calculation: {
      type: 'INIT',
      sampleSource: src1,
      bestSource: stage0Best,
    },
  };

  // ── Stage 1: Employed Bee Phase (Bee #1 Move) ──────────────────────
  const ev1 = engine.nextStep();
  const stage1Pop = engine.population.map((src) => ({
    id: src.id,
    x: [...src.x],
    f: src.f,
    fit: src.fit,
    t: src.t,
    p: src.p,
  }));
  const stage1Best = { ...engine.bestSoFar, x: [...engine.bestSoFar.x] };

  // Calculate onlooker selection probabilities across stage 1 population
  const probs1 = calculateProbabilities(stage1Pop.map((s) => s.fit));
  stage1Pop.forEach((s, idx) => {
    s.p = probs1[idx];
  });
  const maxFit1 = Math.max(...stage1Pop.map((s) => s.fit));

  const partner1 = stage0Pop.find((s) => s.id === ev1.partnerId) || stage0Pop[1] || stage0Pop[0];

  const stage1 = {
    stageIndex: 1,
    phase: 'EMPLOYED',
    phaseName: 'Employed Bee Phase',
    title: `Stage 1: Employed Bee #${ev1.sourceId || 1} Move`,
    summary: `Employed Bee #${ev1.sourceId || 1} explores a candidate solution near its food source.`,
    population: stage1Pop,
    bestSoFar: stage1Best,
    movementEvent: {
      phase: 'EMPLOYED',
      type: ev1.accepted ? 'accepted' : 'rejected',
      from: ev1.oldX,
      to: ev1.candidateX,
      sourceId: ev1.sourceId || 1,
      accepted: ev1.accepted,
      dim: ev1.dim,
    },
    calculation: {
      type: 'EMPLOYED',
      sourceId: ev1.sourceId || 1,
      sourcePos: ev1.oldX,
      partnerId: ev1.partnerId || 2,
      partnerPos: ev1.partnerPos || partner1.x,
      dimIdx: ev1.dim ?? 0,
      varName: ev1.dimName || problem.varNames[ev1.dim ?? 0] || 'x₁',
      phi: Number(ev1.phi.toFixed(4)),
      rawValue: Number(ev1.rawValue.toFixed(4)),
      clippedValue: Number(ev1.clippedValue.toFixed(4)),
      clipped: ev1.clipped ?? false,
      candidatePos: ev1.candidateX.map((c) => Number(c.toFixed(4))),
      candidateF: Number(ev1.candF.toFixed(4)),
      candidateFit: Number(ev1.candFit.toFixed(4)),
      oldF: Number(ev1.oldF.toFixed(4)),
      oldFit: Number(ev1.oldFit.toFixed(4)),
      accepted: ev1.accepted,
      resultText: ev1.accepted
        ? `Candidate fitness (${ev1.candFit.toFixed(4)}) is strictly better than original (${ev1.oldFit.toFixed(4)}). Source #${ev1.sourceId || 1} is replaced and trial counter resets to 0.`
        : `Candidate fitness (${ev1.candFit.toFixed(4)}) did not improve over existing (${ev1.oldFit.toFixed(4)}). Candidate is rejected, original source kept, trial counter incremented to ${ev1.newTrial}.`,
      maxFit: Number(maxFit1.toFixed(4)),
      probBreakdown: stage1Pop.map((src) => ({
        id: src.id,
        fit: Number(src.fit.toFixed(4)),
        p: Number(src.p.toFixed(3)),
        calcStr: `p_${src.id} = 0.9 × (${src.fit.toFixed(4)} / ${maxFit1.toFixed(4)}) + 0.1 = ${src.p.toFixed(3)}`,
      })),
    },
  };

  // Advance through remaining Employed bees until ONLOOKER
  while (engine.phase === 'EMPLOYED' && !engine.isTerminated) {
    engine.nextStep();
  }

  // ── Stage 2: Onlooker Bee Phase ───────────────────────────────────
  let ev2 = null;
  let firstOnlookerEv = null;
  while (engine.phase === 'ONLOOKER' && !engine.isTerminated) {
    const ev = engine.nextStep();
    if (!firstOnlookerEv) firstOnlookerEv = ev;
    if (ev.passedGate) {
      ev2 = ev;
      break;
    }
  }
  if (!ev2) ev2 = firstOnlookerEv;

  const stage2Pop = engine.population.map((src) => ({
    id: src.id,
    x: [...src.x],
    f: src.f,
    fit: src.fit,
    t: src.t,
    p: src.p,
  }));
  const stage2Best = { ...engine.bestSoFar, x: [...engine.bestSoFar.x] };

  const partner2 = stage2Pop.find((s) => s.id === ev2?.partnerId) || stage2Pop[1] || stage2Pop[0];

  const stage2 = {
    stageIndex: 2,
    phase: 'ONLOOKER',
    phaseName: 'Onlooker Bee Phase',
    title: `Stage 2: Onlooker Bee on Source #${ev2?.sourceId || 1}`,
    summary: ev2?.passedGate
      ? `Onlooker bee selected Source #${ev2.sourceId} (passed selection threshold) and attempted a neighbourhood move.`
      : `Onlooker bee evaluated Source #${ev2?.sourceId || 1} based on waggle dance selection probability.`,
    population: stage2Pop,
    bestSoFar: stage2Best,
    movementEvent: ev2 && ev2.candidateX ? {
      phase: 'ONLOOKER',
      type: ev2.accepted ? 'accepted' : 'rejected',
      from: ev2.oldX,
      to: ev2.candidateX,
      sourceId: ev2.sourceId || 1,
      accepted: ev2.accepted,
      dim: ev2.dim,
    } : null,
    calculation: ev2 ? {
      type: 'ONLOOKER',
      sourceId: ev2.sourceId || 1,
      sourcePos: (ev2.oldX || stage2Pop[0].x).map((c) => Number(c.toFixed(4))),
      partnerId: ev2.partnerId || 2,
      partnerPos: (ev2.partnerPos || partner2.x).map((c) => Number(c.toFixed(4))),
      dimIdx: ev2.dim ?? 0,
      varName: ev2.dimName || problem.varNames[ev2.dim ?? 0] || 'x₁',
      phi: Number((ev2.phi ?? 0.5).toFixed(4)),
      pm: Number((ev2.pm ?? 0.5).toFixed(3)),
      r: Number((ev2.r ?? 0.35).toFixed(3)),
      passedGate: ev2.passedGate ?? true,
      candidatePos: (ev2.candidateX || stage2Pop[0].x).map((c) => Number(c.toFixed(4))),
      candidateF: Number((ev2.candF ?? stage2Pop[0].f).toFixed(4)),
      candidateFit: Number((ev2.candFit ?? stage2Pop[0].fit).toFixed(4)),
      oldF: Number((ev2.oldF ?? stage2Pop[0].f).toFixed(4)),
      oldFit: Number((ev2.oldFit ?? stage2Pop[0].fit).toFixed(4)),
      accepted: ev2.accepted ?? false,
      resultText: ev2.accepted
        ? `Candidate fitness (${(ev2.candFit ?? 0).toFixed(4)}) is strictly better. Source #${ev2.sourceId} greedily updated.`
        : `Candidate fitness (${(ev2.candFit ?? 0).toFixed(4)}) did not improve over existing (${(ev2.oldFit ?? 0).toFixed(4)}). Candidate rejected, trial counter incremented.`,
    } : null,
  };

  // Advance through remaining Onlookers until SCOUT
  while (engine.phase === 'ONLOOKER' && !engine.isTerminated) {
    engine.nextStep();
  }

  // ── Stage 3: Scout Bee Phase ───────────────────────────────────────
  let ev3 = null;
  if (engine.phase === 'SCOUT') {
    ev3 = engine.nextStep();
  }
  const stage3Pop = engine.population.map((src) => ({
    id: src.id,
    x: [...src.x],
    f: src.f,
    fit: src.fit,
    t: src.t,
    p: src.p,
  }));
  const stage3Best = { ...engine.bestSoFar, x: [...engine.bestSoFar.x] };

  const abandonedList = ev3?.abandonedSources || [];
  const hasAbandoned = abandonedList.length > 0;
  const abandonedItem = hasAbandoned ? abandonedList[0] : null;

  const targetSource = abandonedItem
    ? {
        sourceId: abandonedItem.sourceId,
        oldX: abandonedItem.oldX.map((c) => Number(c.toFixed(4))),
        newX: abandonedItem.newX.map((c) => Number(c.toFixed(4))),
        trial: abandonedItem.trial,
        newF: Number(abandonedItem.newF.toFixed(4)),
        newFit: Number(abandonedItem.newFit.toFixed(4)),
        isSimulated: false,
      }
    : (() => {
        const highest = [...stage3Pop].sort((a, b) => b.t - a.t)[0];
        const low = parsedParams.bounds.map((b) => b[0]);
        const high = parsedParams.bounds.map((b) => b[1]);
        const freshX = low.map((l, i) => Number((l + 0.43 * (high[i] - l)).toFixed(4)));
        const freshF = problem.objectiveFn(freshX);
        const freshFit = calculateFitness(freshF);
        return {
          sourceId: highest.id,
          oldX: highest.x.map((c) => Number(c.toFixed(4))),
          newX: freshX,
          trial: highest.t,
          newF: Number(freshF.toFixed(4)),
          newFit: Number(freshFit.toFixed(4)),
          isSimulated: true,
        };
      })();

  const stage3 = {
    stageIndex: 3,
    phase: 'SCOUT',
    phaseName: 'Scout Bee Phase',
    title: 'Stage 3: Scout Bee Abandonment & Replacement',
    summary: hasAbandoned
      ? `Source #${abandonedItem.sourceId} exceeded limit = ${parsedParams.limit} (trial = ${abandonedItem.trial}) and was abandoned and replaced.`
      : `All food sources satisfy trial <= limit (${parsedParams.limit}). No food source is abandoned in Cycle 1.`,
    population: stage3Pop,
    bestSoFar: stage3Best,
    movementEvent: hasAbandoned ? {
      phase: 'SCOUT',
      type: 'scout',
      from: abandonedItem.oldX,
      to: abandonedItem.newX,
      sourceId: abandonedItem.sourceId,
    } : null,
    calculation: {
      type: 'SCOUT',
      limit: parsedParams.limit,
      hasAbandoned,
      targetSource,
    },
  };

  return [stage0, stage1, stage2, stage3];
}
