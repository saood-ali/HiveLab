import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import './SimulatorView.css';
import { useAppState, useAppDispatch } from '../app/AppState.jsx';
import { ABCEngine } from '../engine/abcEngine.js';
import { ContourPlot } from './ContourPlot.jsx';
import { FitnessProbabilityView } from './FitnessProbabilityView.jsx';
import { ConvergenceChart } from './ConvergenceChart.jsx';

function formatObjectiveCalc(problemId, coords, fVal) {
  if (!coords || coords.length < 2 || fVal === undefined || fVal === null) return null;
  const [c0, c1] = coords;
  if (problemId === 'sphere-lecture' || problemId === 'sphere') {
    const term0 = (c0 ** 2).toFixed(4);
    const term1 = (c1 ** 2).toFixed(4);
    return `f(${c0.toFixed(3)}, ${c1.toFixed(3)}) = (${c0.toFixed(3)})² + (${c1.toFixed(3)})² = ${term0} + ${term1} = ${fVal.toFixed(4)}`;
  }
  if (problemId === 'rosenbrock-practice') {
    const t1 = ((1 - c0) ** 2).toFixed(4);
    const t2 = (100 * ((c1 - c0 ** 2) ** 2)).toFixed(4);
    return `f(${c0.toFixed(3)}, ${c1.toFixed(3)}) = (1 − ${c0.toFixed(3)})² + 100(${c1.toFixed(3)} − (${c0.toFixed(3)})²)² = ${t1} + ${t2} = ${fVal.toFixed(4)}`;
  }
  if (problemId === 'rastrigin-practice') {
    return `f(${c0.toFixed(3)}, ${c1.toFixed(3)}) = 20 + (${c0.toFixed(3)})² − 10cos(2π·${c0.toFixed(3)}) + (${c1.toFixed(3)})² − 10cos(2π·${c1.toFixed(3)}) = ${fVal.toFixed(4)}`;
  }
  return `f(${coords.map((c) => c.toFixed(3)).join(', ')}) = ${fVal.toFixed(4)}`;
}

function formatFitnessCalc(fVal, fitVal) {
  if (fVal === undefined || fVal === null || fitVal === undefined || fitVal === null) return '';
  if (fVal >= 0) {
    return `fit = 1 / (1 + f(x)) = 1 / (1 + ${fVal.toFixed(4)}) = ${(1 / (1 + fVal)).toFixed(4)}`;
  } else {
    return `fit = 1 + |f(x)| = 1 + |${fVal.toFixed(4)}| = ${(1 + Math.abs(fVal)).toFixed(4)}`;
  }
}

export function SimulatorView() {
  const { problem, params } = useAppState();
  const dispatch = useAppDispatch();

  // Create deterministic engine instance for current problem & parameters
  const engine = useMemo(() => {
    return new ABCEngine(problem, params);
  }, [problem, params]);

  // Tab selection for right-hand column: 'table' | 'probabilities' | 'convergence'
  const [activeTab, setActiveTab] = useState('table');
  const [inspectorMode, setInspectorMode] = useState('summary'); // 'summary' | 'breakdown'

  // Convergence history tracking: cycle 0 starts with initial best-so-far
  const [convergenceHistory, setConvergenceHistory] = useState(() => [
    { cycle: 0, bestF: engine.bestSoFar.f },
  ]);

  const inspectorCardRef = useRef(null);
  const decisionBadgeRef = useRef(null);

  // UI state synchronized with engine state
  const [engineState, setEngineState] = useState(() => ({
    stepIndex: engine.stepIndex,
    cycle: engine.cycle,
    phase: engine.phase,
    isTerminated: engine.isTerminated,
    population: [...engine.population],
    bestSoFar: { ...engine.bestSoFar },
    currentEvent: { ...engine.currentEvent },
    historyLength: engine.history.length,
    eventsLog: [engine.currentEvent],
  }));

  const syncState = useCallback(
    (latestEvent = null) => {
      setEngineState((prev) => {
        const log = latestEvent
          ? [latestEvent, ...prev.eventsLog.slice(0, 24)]
          : prev.eventsLog;
        return {
          stepIndex: engine.stepIndex,
          cycle: engine.cycle,
          phase: engine.phase,
          isTerminated: engine.isTerminated,
          population: engine.population.map((s) => ({ ...s, x: [...s.x] })),
          bestSoFar: { ...engine.bestSoFar, x: [...engine.bestSoFar.x] },
          currentEvent: { ...engine.currentEvent },
          historyLength: engine.history.length,
          eventsLog: log,
        };
      });

      // Update convergence history on cycle completion
      if (latestEvent?.type === 'CYCLE_SUMMARY') {
        setConvergenceHistory((prev) => {
          const exists = prev.some((d) => d.cycle === latestEvent.cycle);
          if (exists) {
            return prev.map((d) =>
              d.cycle === latestEvent.cycle
                ? { cycle: d.cycle, bestF: engine.bestSoFar.f }
                : d
            );
          }
          return [...prev, { cycle: latestEvent.cycle, bestF: engine.bestSoFar.f }];
        });
      }
    },
    [engine]
  );

  // Advance exactly one step on user click (Strictly manual: NO autoplay or timers)
  const handleNextStep = useCallback(() => {
    if (engine.isTerminated) return;
    const ev = engine.nextStep();
    syncState(ev);
  }, [engine, syncState]);

  // Rewind exactly one step on user click
  const handlePrevStep = useCallback(() => {
    const success = engine.prevStep();
    if (success) {
      setEngineState({
        stepIndex: engine.stepIndex,
        cycle: engine.cycle,
        phase: engine.phase,
        isTerminated: engine.isTerminated,
        population: engine.population.map((s) => ({ ...s, x: [...s.x] })),
        bestSoFar: { ...engine.bestSoFar, x: [...engine.bestSoFar.x] },
        currentEvent: { ...engine.currentEvent },
        historyLength: engine.history.length,
        eventsLog: engineState.eventsLog.slice(1),
      });

      // Trim convergence points if rewound past a cycle
      setConvergenceHistory((prev) =>
        prev.filter((d) => d.cycle <= engine.cycle)
      );
    }
  }, [engine, engineState.eventsLog]);

  // Reset to initial step 0 with the same seed
  const handleReset = useCallback(() => {
    engine.reset();
    setEngineState({
      stepIndex: engine.stepIndex,
      cycle: engine.cycle,
      phase: engine.phase,
      isTerminated: engine.isTerminated,
      population: engine.population.map((s) => ({ ...s, x: [...s.x] })),
      bestSoFar: { ...engine.bestSoFar, x: [...engine.bestSoFar.x] },
      currentEvent: { ...engine.currentEvent },
      historyLength: 0,
      eventsLog: [engine.currentEvent],
    });
    setConvergenceHistory([{ cycle: 0, bestF: engine.bestSoFar.f }]);
  }, [engine]);

  // Fast forward simulation to the very end
  const handleFastForward = useCallback(() => {
    if (engine.isTerminated) return;
    const ev = engine.fastForward();

    // Reconstruct complete convergence history across all cycles
    const points = [{ cycle: 0, bestF: engine.history[0]?.bestSoFar?.f ?? engine.bestSoFar.f }];
    for (const snap of engine.history) {
      if (snap.currentEvent?.type === 'CYCLE_SUMMARY') {
        const c = snap.currentEvent.cycle;
        if (!points.some((p) => p.cycle === c)) {
          points.push({ cycle: c, bestF: snap.currentEvent.currentBestF ?? snap.bestSoFar.f });
        }
      }
    }
    if (!points.some((p) => p.cycle === engine.params.T)) {
      points.push({ cycle: engine.params.T, bestF: engine.bestSoFar.f });
    }
    setConvergenceHistory(points);
    syncState(ev);
  }, [engine, syncState]);

  // Keyboard navigation: ArrowRight / Space for Next, ArrowLeft for Back, 'R' for Reset, 'F' for Fast Forward
  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFastForward();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStep, handlePrevStep, handleReset, handleFastForward]);

  // Subtle GSAP micro-interaction on step change to smoothly highlight updates
  useEffect(() => {
    if (inspectorCardRef.current) {
      gsap.fromTo(
        inspectorCardRef.current,
        { opacity: 0.85, y: 3 },
        { opacity: 1, y: 0, duration: 0.18, ease: 'power1.out' }
      );
    }
    if (decisionBadgeRef.current) {
      gsap.fromTo(
        decisionBadgeRef.current,
        { scale: 0.94 },
        { scale: 1, duration: 0.22, ease: 'back.out(1.5)' }
      );
    }
  }, [engineState.stepIndex]);

  const {
    stepIndex,
    cycle,
    phase,
    isTerminated,
    population,
    bestSoFar,
    currentEvent,
    historyLength,
    eventsLog,
  } = engineState;

  const phaseBadgeClass = {
    INIT: 'sim-controls__badge--init',
    EMPLOYED: 'sim-controls__badge--employed',
    ONLOOKER: 'sim-controls__badge--onlooker',
    SCOUT: 'sim-controls__badge--scout',
    MEMORISE: 'sim-controls__badge--memorise',
    TERMINATED: 'sim-controls__badge--terminated',
  }[phase] || 'sim-controls__badge--init';

  const phaseLabel = {
    INIT: 'Initialization',
    EMPLOYED: 'Employed Bee Phase',
    ONLOOKER: 'Onlooker Bee Phase',
    SCOUT: 'Scout Bee Phase',
    MEMORISE: 'Memorise Best Phase',
    TERMINATED: 'Completed',
  }[phase] || phase;

  return (
    <div className="simulator" role="region" aria-label="ABC Algorithm Simulation Workspace">
      {/* Accessible screen reader announcement on step changes */}
      <div className="sr-only" aria-live="polite">
        {`Cycle ${cycle}, Step ${stepIndex}, ${phaseLabel}: ${currentEvent.description || ''}`}
      </div>

      {/* ── Top Control Bar ────────────────────────────────────────── */}
      <section className="sim-controls" aria-label="Simulation Controls">
        <div className="sim-controls__left">
          <span className={`sim-controls__badge ${phaseBadgeClass}`}>
            ● {phaseLabel}
          </span>
          <span className="sim-controls__cycle-info">
            Cycle <strong>{cycle}</strong> of {params.T} &nbsp;·&nbsp; Step #{stepIndex}
          </span>
        </div>

        <div className="sim-controls__actions">
          <button
            className="btn btn--secondary"
            onClick={handlePrevStep}
            disabled={historyLength === 0}
            title={historyLength === 0 ? 'At initial step' : 'Rewind previous step (←)'}
          >
            ← Back
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleReset}
            title="Reset simulation to step 0 with the same seed (R)"
          >
            Reset
          </button>
          <button
            className="btn btn--primary"
            onClick={handleNextStep}
            disabled={isTerminated}
            title={isTerminated ? 'Algorithm finished' : 'Advance by 1 step (Next Step / Space / →)'}
          >
            {isTerminated ? 'Finished' : 'Next Step →'}
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleFastForward}
            disabled={isTerminated}
            title={isTerminated ? 'Optimization already completed' : 'Fast-forward simulation to the final cycle (F)'}
            aria-label="Fast forward to final answer"
          >
            Fast Forward →|
          </button>
        </div>
      </section>

      {/* ── Best-so-far Banner ──────────────────────────────────────── */}
      <section className="sim-best-banner" aria-label="Best Solution Memorized">
        <div>
          <div className="sim-best-banner__label">Best Solution Memorized Outside Population (x*)</div>
          <div className="sim-best-banner__val">
            f(x*) = {bestSoFar.f.toFixed(6)} &nbsp; (fit = {bestSoFar.fit.toFixed(6)})
          </div>
        </div>
        <div className="sim-best-banner__coords">
          Source #{bestSoFar.id} &nbsp;·&nbsp; x* = [{bestSoFar.x.map((c) => c.toFixed(4)).join(', ')}]
        </div>
      </section>

      {/* ── Main Workspace Grid (Left: Visual Plot & Inspector | Right: Tables & Charts) ── */}
      <div className="sim-grid">
        {/* Left Column: 2D Contour Plot + Step Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* 2D Contour / Landscape Plot */}
          <ContourPlot
            problem={problem}
            bounds={params.bounds ? {
              lower: params.bounds.map((b) => Number(b[0])),
              upper: params.bounds.map((b) => Number(b[1])),
            } : problem.bounds}
            population={population}
            currentEvent={currentEvent}
            bestSoFar={bestSoFar}
          />

          {/* Step Inspector / Decision Card with Summary & Math Breakdown modes */}
          <section ref={inspectorCardRef} className="sim-card" aria-labelledby="step-inspector-title">
            <div className="sim-card__header">
              <h2 className="sim-card__title" id="step-inspector-title">
                <span>🐝</span> {currentEvent.title || 'Current Step'}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {/* Mode toggle between Summary and detailed Math Breakdown */}
                <div className="sim-mode-toggle" role="tablist" aria-label="Inspector mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inspectorMode === 'summary'}
                    className={`sim-mode-tab${inspectorMode === 'summary' ? ' sim-mode-tab--active' : ''}`}
                    onClick={() => setInspectorMode('summary')}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inspectorMode === 'breakdown'}
                    className={`sim-mode-tab${inspectorMode === 'breakdown' ? ' sim-mode-tab--active' : ''}`}
                    onClick={() => setInspectorMode('breakdown')}
                  >
                    Math Breakdown
                  </button>
                </div>

                {currentEvent.accepted !== undefined && (
                  <span
                    ref={decisionBadgeRef}
                    className={`sim-card__decision ${
                      currentEvent.accepted
                        ? 'sim-card__decision--accepted'
                        : currentEvent.skipped
                        ? 'sim-card__decision--skipped'
                        : 'sim-card__decision--rejected'
                    }`}
                  >
                    {currentEvent.accepted
                      ? 'Accepted'
                      : currentEvent.skipped
                      ? 'Skipped'
                      : 'Rejected'}
                  </span>
                )}
                {currentEvent.type === 'SCOUT_REPLACED' && (
                  <span className="sim-card__decision sim-card__decision--scouted">
                    Scout Replacement
                  </span>
                )}
              </div>
            </div>

            {inspectorMode === 'summary' ? (
              <>
                <p className="sim-card__summary">{currentEvent.summary}</p>

                {/* Random Draw Ledger */}
                {currentEvent.draws && currentEvent.draws.length > 0 && (
                  <div className="sim-ledger">
                    <div className="sim-ledger__label">Random Draw Ledger (Seed: {params.seed})</div>
                    <div className="sim-ledger__pills">
                      {currentEvent.draws.map((d, i) => (
                        <span className="sim-ledger__pill" key={i}>
                          {d.label}: <strong>{d.value}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collapsible Formula & Math Substitution */}
                {(currentEvent.formula || currentEvent.details) && (
                  <details className="sim-details" open>
                    <summary>Formula &amp; Calculation</summary>
                    <div className="sim-details__content">
                      {currentEvent.formula && (
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                          <div className="calc-equation-tag">Perturbation Formula:</div>
                          <code className="calc-equation-code">v_i,j = x_i,j + φ_i,j × (x_i,j - x_k,j)</code>
                          <div className="calc-equation-tag" style={{ marginTop: '4px' }}>Substituted Calculation:</div>
                          <code className="calc-equation-code">{currentEvent.formula}</code>
                        </div>
                      )}
                      {currentEvent.rawValue !== undefined && (
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                          <div className="calc-equation-tag">Boundary Constraint Check:</div>
                          <code className="calc-equation-code">
                            {currentEvent.clipped
                              ? `Raw coordinate ${currentEvent.rawValue.toFixed(4)} exceeded bounds → Clipped to ${currentEvent.clippedValue.toFixed(4)}`
                              : `Raw coordinate ${currentEvent.rawValue.toFixed(4)} lies safely within bounds [${(params.bounds?.[currentEvent.dim]?.[0] ?? problem.bounds.lower[currentEvent.dim])}, ${(params.bounds?.[currentEvent.dim]?.[1] ?? problem.bounds.upper[currentEvent.dim])}]`}
                          </code>
                        </div>
                      )}
                      {currentEvent.oldF !== undefined && (
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                          <div className="calc-equation-tag">Objective &amp; Fitness Comparison:</div>
                          <code className="calc-equation-code">
                            f(cand) = {currentEvent.candF.toFixed(4)} → fit(cand) = {currentEvent.candFit?.toFixed(4)}
                            <br />
                            f(curr) = {currentEvent.oldF.toFixed(4)} → fit(curr) = {currentEvent.oldFit?.toFixed(4)}
                            <br />
                            Greedy Rule: fit(cand) {currentEvent.accepted ? '>' : '≤'} fit(curr) → {currentEvent.accepted ? 'Accepted (trial = 0)' : 'Rejected (trial incremented)'}
                          </code>
                        </div>
                      )}
                      {currentEvent.details && (
                        <div style={{ marginTop: 'var(--space-1)' }}>{currentEvent.details}</div>
                      )}
                    </div>
                  </details>
                )}
              </>
            ) : (
              /* Detailed Math Breakdown View */
              <div className="calc-body" style={{ marginTop: 'var(--space-2)' }}>
                {/* Step 0 (INIT) */}
                {currentEvent.phase === 'INIT' && (
                  <>
                    <div className="calc-param-grid">
                      <div className="calc-param">
                        <span className="calc-param__k">Problem:</span>
                        <span className="calc-param__v">{problem.name}</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Objective Equation:</span>
                        <span className="calc-param__v">{problem.objective}</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Initial Best Source:</span>
                        <span className="calc-param__v">#{bestSoFar.id} (f = {bestSoFar.f.toFixed(4)})</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Total Sources Np:</span>
                        <span className="calc-param__v">{population.length}</span>
                      </div>
                    </div>

                    <div className="calc-step-box">
                      <span className="calc-step-label">1. Fitness Transformation:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Formula:</span>
                          <code className="calc-equation-code">
                            fit(x) = 1 / (1 + f(x)) &nbsp; [for f(x) ≥ 0] &nbsp;|&nbsp; fit(x) = 1 + |f(x)| &nbsp; [for f(x) &lt; 0]
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Sample Calculation on Source #{population[0]?.id}:</span>
                          <code className="calc-equation-code">
                            Coordinates: [{population[0]?.x.map((c) => c.toFixed(3)).join(', ')}]
                            <br />
                            Objective: {formatObjectiveCalc(problem.id, population[0]?.x, population[0]?.f)}
                            <br />
                            Fitness: {formatFitnessCalc(population[0]?.f, population[0]?.fit)}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="calc-step-box">
                      <span className="calc-step-label">2. Initial Random Placement:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Initialization Formula:</span>
                          <code className="calc-equation-code">
                            x_i,j = l_j + rand(0, 1) × (u_j - l_j) &nbsp; [for each food source i and dimension j]
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Configured Domain Bounds:</span>
                          <code className="calc-equation-code">
                            x₁ ∈ [{(params.bounds?.[0]?.[0] ?? problem.bounds.lower[0])}, {(params.bounds?.[0]?.[1] ?? problem.bounds.upper[0])}], &nbsp;
                            x₂ ∈ [{(params.bounds?.[1]?.[0] ?? problem.bounds.lower[1])}, {(params.bounds?.[1]?.[1] ?? problem.bounds.upper[1])}]
                          </code>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* EMPLOYED or ONLOOKER with candidate move */}
                {(currentEvent.phase === 'EMPLOYED' || currentEvent.phase === 'ONLOOKER') && currentEvent.candidateX && (
                  <>
                    <div className="calc-param-grid">
                      <div className="calc-param">
                        <span className="calc-param__k">Current Source:</span>
                        <span className="calc-param__v">
                          X^{currentEvent.sourceId} = ({currentEvent.oldX?.map((c) => c.toFixed(3)).join(', ')})
                        </span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Partner Source:</span>
                        <span className="calc-param__v">
                          X^{currentEvent.partnerId} = ({(currentEvent.partnerPos || population.find((s) => s.id === currentEvent.partnerId)?.x || [0, 0]).map((c) => c.toFixed(3)).join(', ')})
                        </span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Perturbed Dimension:</span>
                        <span className="calc-param__v">{currentEvent.dimName || problem.varNames[currentEvent.dim]} (dim {currentEvent.dim + 1})</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Random Weight φ:</span>
                        <span className="calc-param__v">{currentEvent.phi?.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* Onlooker Waggle Gate Check (if this is an Onlooker move) */}
                    {currentEvent.phase === 'ONLOOKER' && currentEvent.r !== undefined && (
                      <div className="calc-step-box">
                        <span className="calc-step-label">Waggle Dance Selection Gate:</span>
                        <div className="calc-equation-group">
                          <div className="calc-equation-row">
                            <span className="calc-equation-tag">General Decision Rule:</span>
                            <code className="calc-equation-code">
                              Draw r ~ U(0, 1). If r &lt; p_m → Exploit source | If r ≥ p_m → Skip source
                            </code>
                          </div>
                          <div className="calc-equation-row">
                            <span className="calc-equation-tag">Substituted Gate Evaluation:</span>
                            <code className="calc-equation-code">
                              r = {currentEvent.r.toFixed(4)} &lt; p_{currentEvent.sourceId} = {currentEvent.pm?.toFixed(4)} &nbsp;→&nbsp; PASSED (Onlooker bee exploits source #{currentEvent.sourceId})
                            </code>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="calc-step-box">
                      <span className="calc-step-label">1. Perturbation Formula &amp; Calculation:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Formula:</span>
                          <code className="calc-equation-code">
                            v_i,j = x_i,j + φ_i,j × (x_i,j - x_k,j) &nbsp; [where k ≠ i, φ ∈ [-1, 1]]
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Substituted Calculation:</span>
                          <code className="calc-equation-code">
                            v_{currentEvent.sourceId},{currentEvent.dim + 1} = {currentEvent.oldX?.[currentEvent.dim]?.toFixed(3)} + ({currentEvent.phi?.toFixed(3)}) × ({currentEvent.oldX?.[currentEvent.dim]?.toFixed(3)} - {(currentEvent.partnerPos || population.find((s) => s.id === currentEvent.partnerId)?.x || [0, 0])[currentEvent.dim]?.toFixed(3)})
                            <br />
                            = {currentEvent.oldX?.[currentEvent.dim]?.toFixed(3)} + ({(currentEvent.phi * (currentEvent.oldX?.[currentEvent.dim] - (currentEvent.partnerPos || population.find((s) => s.id === currentEvent.partnerId)?.x || [0, 0])[currentEvent.dim])).toFixed(4)})
                            <br />
                            = {currentEvent.rawValue?.toFixed(4)}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className={`calc-step-box${currentEvent.clipped ? ' calc-step-box--warning' : ''}`}>
                      <span className="calc-step-label">2. Boundary Constraint &amp; Clamping:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Formula:</span>
                          <code className="calc-equation-code">
                            v_i,j = clamp(v_i,j, l_j, u_j) = max(l_j, min(u_j, v_i,j))
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Substituted Calculation:</span>
                          <code className="calc-equation-code">
                            clamp({currentEvent.rawValue?.toFixed(4)}, {(params.bounds?.[currentEvent.dim]?.[0] ?? problem.bounds.lower[currentEvent.dim])}, {(params.bounds?.[currentEvent.dim]?.[1] ?? problem.bounds.upper[currentEvent.dim])}) = {currentEvent.clipped ? `${currentEvent.clippedValue?.toFixed(4)} (Clipped: exceeded boundary)` : `${currentEvent.rawValue?.toFixed(4)} (Within bounds: no clipping needed)`}
                          </code>
                        </div>
                      </div>
                      <p style={{ marginTop: 'var(--space-2)' }}>
                        Full Candidate Vector: <strong>v_{currentEvent.sourceId} = ({currentEvent.candidateX?.map((c) => c.toFixed(3)).join(', ')})</strong>
                      </p>
                    </div>

                    <div className="calc-step-box">
                      <span className="calc-step-label">3. Objective Function &amp; Fitness Evaluation:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Objective Formula:</span>
                          <code className="calc-equation-code">
                            {problem.objective}
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Candidate Objective Calculation:</span>
                          <code className="calc-equation-code">
                            {formatObjectiveCalc(problem.id, currentEvent.candidateX, currentEvent.candF)}
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Fitness Formula:</span>
                          <code className="calc-equation-code">
                            fit(x) = 1 / (1 + f(x)) &nbsp; [for f(x) ≥ 0] &nbsp;|&nbsp; fit(x) = 1 + |f(x)| &nbsp; [for f(x) &lt; 0]
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Candidate Fitness Calculation:</span>
                          <code className="calc-equation-code">
                            fit(v_{currentEvent.sourceId}) = {formatFitnessCalc(currentEvent.candF, currentEvent.candFit)}
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Existing Source Fitness Calculation:</span>
                          <code className="calc-equation-code">
                            fit(X^{currentEvent.sourceId}) = {formatFitnessCalc(currentEvent.oldF, currentEvent.oldFit)}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className={`calc-decision-box calc-decision-box--${currentEvent.accepted ? 'accepted' : 'rejected'}`}>
                      <span className="calc-decision-badge">Greedy Selection Decision: {currentEvent.accepted ? 'ACCEPTED' : 'REJECTED'}</span>
                      <div className="calc-equation-group" style={{ margin: 'var(--space-2) 0' }}>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag" style={{ color: currentEvent.accepted ? '#166534' : '#991b1b' }}>Selection Rule:</span>
                          <code className="calc-equation-code">
                            If fit(v_i) &gt; fit(X^i) → Accept candidate v_i &amp; reset trial counter = 0
                            <br />
                            If fit(v_i) ≤ fit(X^i) → Reject candidate v_i &amp; increment trial counter = trial + 1
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag" style={{ color: currentEvent.accepted ? '#166534' : '#991b1b' }}>Substituted Comparison:</span>
                          <code className="calc-equation-code">
                            fit(v_{currentEvent.sourceId}) = {currentEvent.candFit?.toFixed(4)} {currentEvent.accepted ? '>' : '≤'} fit(X^{currentEvent.sourceId}) = {currentEvent.oldFit?.toFixed(4)}
                            &nbsp;→&nbsp; {currentEvent.accepted ? 'ACCEPTED (Source updated; trial resets to 0)' : `REJECTED (Original source kept; trial becomes ${currentEvent.newTrial})`}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Live Onlooker Probabilities Breakdown */}
                    <div className="calc-step-box" style={{ marginTop: 'var(--space-3)' }}>
                      <span className="calc-step-label">4. Onlooker Selection Probabilities:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Formula:</span>
                          <code className="calc-equation-code">
                            p_m = 0.9 × (fit_m / max(fit)) + 0.1 &nbsp; [scaled roulette with 0.1 exploration floor]
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Colony Maximum Fitness:</span>
                          <code className="calc-equation-code">
                            max(fit) = {Math.max(...population.map((s) => s.fit)).toFixed(4)}
                          </code>
                        </div>
                      </div>
                      <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {population.map((src) => {
                          const maxFit = Math.max(...population.map((s) => s.fit));
                          const ratio = (src.fit / maxFit).toFixed(4);
                          const pCalc = (0.9 * (src.fit / maxFit) + 0.1).toFixed(4);
                          return (
                            <div key={src.id} style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-secondary)' }}>
                              • Source #{src.id}: <code>p_{src.id} = 0.9 × ({src.fit.toFixed(4)} / {maxFit.toFixed(4)}) + 0.1 = 0.9 × {ratio} + 0.1 = {pCalc} ({(src.p * 100).toFixed(1)}%)</code>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ONLOOKER when skipped */}
                {currentEvent.phase === 'ONLOOKER' && currentEvent.skipped && (
                  <div className="calc-step-box">
                    <span className="calc-step-label">Waggle Gate Check:</span>
                    <div className="calc-equation-group">
                      <div className="calc-equation-row">
                        <span className="calc-equation-tag">General Decision Rule:</span>
                        <code className="calc-equation-code">
                          Draw r ~ U(0, 1). If r &lt; p_m → Exploit source | If r ≥ p_m → Skip source
                        </code>
                      </div>
                      <div className="calc-equation-row">
                        <span className="calc-equation-tag">Substituted Gate Check:</span>
                        <code className="calc-equation-code">
                          r = {currentEvent.r?.toFixed(4)} ≥ p_{currentEvent.sourceId} = {currentEvent.pm?.toFixed(4)}
                          &nbsp;→&nbsp; SKIPPED (Gate failed; onlooker does not exploit this source; trial remains {currentEvent.trial})
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCOUT Phase */}
                {currentEvent.phase === 'SCOUT' && (
                  <>
                    <div className="calc-param-grid">
                      <div className="calc-param">
                        <span className="calc-param__k">Configured Limit:</span>
                        <span className="calc-param__v">{params.limit}</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Abandonment Rule:</span>
                        <span className="calc-param__v">trial &gt; limit</span>
                      </div>
                    </div>

                    {currentEvent.abandonedSources?.length > 0 ? (
                      currentEvent.abandonedSources.map((ab, i) => (
                        <div key={i} className="calc-step-box">
                          <span className="calc-step-label">Scout Abandonment on Source #{ab.sourceId}:</span>
                          <div className="calc-equation-group">
                            <div className="calc-equation-row">
                              <span className="calc-equation-tag">Abandonment Condition Check:</span>
                              <code className="calc-equation-code">
                                trial = {ab.trial} &gt; limit = {params.limit} &nbsp;→&nbsp; ABANDONED (Exceeded limit)
                              </code>
                            </div>
                            <div className="calc-equation-row">
                              <span className="calc-equation-tag">General Uniform Random Formula:</span>
                              <code className="calc-equation-code">
                                x_i,j = l_j + rand(0, 1) × (u_j - l_j)
                              </code>
                            </div>
                            <div className="calc-equation-row">
                              <span className="calc-equation-tag">Substituted Coordinates:</span>
                              <code className="calc-equation-code">
                                Old position: ({ab.oldX.map((c) => c.toFixed(3)).join(', ')})
                                <br />
                                New position: ({ab.newX.map((c) => c.toFixed(3)).join(', ')})
                              </code>
                            </div>
                            <div className="calc-equation-row">
                              <span className="calc-equation-tag">New Evaluation:</span>
                              <code className="calc-equation-code">
                                Objective: {formatObjectiveCalc(problem.id, ab.newX, ab.newF)}
                                <br />
                                Fitness: {formatFitnessCalc(ab.newF, ab.newFit)}
                              </code>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="calc-step-box">
                        <span className="calc-step-label">Scout Audit Result:</span>
                        <div className="calc-equation-group">
                          <div className="calc-equation-row">
                            <span className="calc-equation-tag">General Abandonment Rule:</span>
                            <code className="calc-equation-code">
                              trial_i &gt; limit &nbsp;→&nbsp; Source i abandoned and randomly regenerated
                            </code>
                          </div>
                          <div className="calc-equation-row">
                            <span className="calc-equation-tag">Colony Audit Check:</span>
                            <code className="calc-equation-code">
                              All sources have trial counters ≤ {params.limit} (highest trial is {Math.max(...population.map((s) => s.t), 0)}). No food source is abandoned.
                            </code>
                          </div>
                          <div className="calc-equation-row">
                            <span className="calc-equation-tag">Scout Replacement Formula (Standby):</span>
                            <code className="calc-equation-code">
                              x_i,j = l_j + rand(0, 1) × (u_j - l_j)
                            </code>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* MEMORISE Phase */}
                {currentEvent.phase === 'MEMORISE' && (
                  <div className="calc-step-box">
                    <span className="calc-step-label">Memorization Rule:</span>
                    <div className="calc-equation-group">
                      <div className="calc-equation-row">
                        <span className="calc-equation-tag">General Memorization Rule:</span>
                        <code className="calc-equation-code">
                          If max_i(fit(X^i)) &gt; fit(X_best_stored) → X_best_stored ← argmax_i(fit(X^i))
                        </code>
                      </div>
                      <div className="calc-equation-row">
                        <span className="calc-equation-tag">Current Colony Best vs Stored Best:</span>
                        <code className="calc-equation-code">
                          Colony Best: Source #{population.reduce((best, s) => (s.fit > best.fit ? s : best), population[0])?.id} (f = {population.reduce((best, s) => (s.fit > best.fit ? s : best), population[0])?.f.toFixed(6)}, fit = {population.reduce((best, s) => (s.fit > best.fit ? s : best), population[0])?.fit.toFixed(6)})
                          <br />
                          Memorized Global Best: Source #{bestSoFar.id} at ({bestSoFar.x.map((c) => c.toFixed(4)).join(', ')}) with f = {bestSoFar.f.toFixed(6)}, fit = {bestSoFar.fit.toFixed(6)}
                        </code>
                      </div>
                      <div className="calc-equation-row">
                        <span className="calc-equation-tag">Optimum Preservation Principle:</span>
                        <code className="calc-equation-code">
                          External storage guarantees that the global optimum is permanently retained even if the food source is later exhausted and abandoned by scout bees.
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {/* TERMINATED (Final Answer Breakdown) */}
                {currentEvent.phase === 'TERMINATED' && (
                  <>
                    <div className="calc-param-grid">
                      <div className="calc-param">
                        <span className="calc-param__k">Problem:</span>
                        <span className="calc-param__v">{problem.name}</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Total Cycles Completed:</span>
                        <span className="calc-param__v">{params.T} / {params.T}</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Total Steps Executed:</span>
                        <span className="calc-param__v">{stepIndex}</span>
                      </div>
                      <div className="calc-param">
                        <span className="calc-param__k">Discovered At:</span>
                        <span className="calc-param__v">Cycle {bestSoFar.foundAtCycle ?? 1}</span>
                      </div>
                    </div>

                    <div className="calc-decision-box calc-decision-box--accepted" style={{ marginTop: 'var(--space-2)' }}>
                      <span className="calc-decision-badge">Final Optimization Answer</span>
                      <p style={{ marginTop: '4px', fontSize: '12px' }}>
                        Optimal objective: <strong>f(x*) = {bestSoFar.f.toFixed(6)}</strong>
                        <br />
                        Optimal fitness: <strong>fit(x*) = {bestSoFar.fit.toFixed(6)}</strong>
                        <br />
                        Optimal vector: <strong>x* = ({bestSoFar.x.map((c) => c.toFixed(6)).join(', ')})</strong>
                      </p>
                    </div>

                    <div className="calc-step-box">
                      <span className="calc-step-label">1. Objective Function Verification:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Objective Formula:</span>
                          <code className="calc-equation-code">{problem.objective}</code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Substituted Coordinate Evaluation:</span>
                          <code className="calc-equation-code">
                            {formatObjectiveCalc(problem.id, bestSoFar.x, bestSoFar.f)}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="calc-step-box">
                      <span className="calc-step-label">2. Fitness Transformation:</span>
                      <div className="calc-equation-group">
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">General Fitness Formula:</span>
                          <code className="calc-equation-code">
                            fit(x) = 1 / (1 + f(x)) &nbsp; [for f(x) ≥ 0] &nbsp;|&nbsp; fit(x) = 1 + |f(x)| &nbsp; [for f(x) &lt; 0]
                          </code>
                        </div>
                        <div className="calc-equation-row">
                          <span className="calc-equation-tag">Substituted Fitness Value:</span>
                          <code className="calc-equation-code">
                            {formatFitnessCalc(bestSoFar.f, bestSoFar.fit)}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="calc-step-box">
                      <span className="calc-step-label">3. Final Colony Population State:</span>
                      <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {population.map((src) => (
                          <div key={src.id} style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-secondary)' }}>
                            • Source #{src.id}: x = ({src.x.map((c) => c.toFixed(4)).join(', ')}), f = {src.f.toFixed(6)}, trial = {src.t} {bestSoFar.id === src.id ? ' [Global Best]' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Event History Trace Log */}
          <section className="sim-card" aria-label="Step History Trace">
            <div className="sim-card__header">
              <h2 className="sim-card__title" style={{ fontSize: 'var(--font-size-sm)' }}>
                Recent Event Trace ({eventsLog.length} recorded)
              </h2>
            </div>
            <div className="sim-history">
              {eventsLog.map((ev, i) => (
                <div
                  key={`${ev.stepIndex}-${i}`}
                  className={`sim-history__item${i === 0 ? ' sim-history__item--current' : ''}`}
                >
                  <span>
                    <strong>#{ev.stepIndex}</strong> [{ev.phase}] {ev.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {ev.accepted ? '✓ Accepted' : ev.skipped ? '— Skipped' : ev.accepted === false ? '✗ Rejected' : ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Tabbed Views [Population Table | Fitness & Probabilities | Convergence Trend] */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <section className="sim-card" aria-label="Colony Analytics and Data">
            {/* View Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-2)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
              role="tablist"
              aria-label="Analytics Tabs"
            >
              <button
                role="tab"
                aria-selected={activeTab === 'table'}
                className={`btn btn--ghost${activeTab === 'table' ? ' btn--primary' : ''}`}
                style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}
                onClick={() => setActiveTab('table')}
              >
                Food Sources (Np={population.length})
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'probabilities'}
                className={`btn btn--ghost${activeTab === 'probabilities' ? ' btn--primary' : ''}`}
                style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}
                onClick={() => setActiveTab('probabilities')}
              >
                Fitness &amp; Probabilities
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'convergence'}
                className={`btn btn--ghost${activeTab === 'convergence' ? ' btn--primary' : ''}`}
                style={{ fontSize: 'var(--font-size-xs)', padding: '6px 12px' }}
                onClick={() => setActiveTab('convergence')}
              >
                Convergence Curve
              </button>
            </div>

            {/* Tab 1: Population Table */}
            {activeTab === 'table' && (
              <div>
                <div className="sim-table-wrap">
                  <table className="sim-table" aria-label="Food Source Population Table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Coordinates (x)</th>
                        <th>Objective f</th>
                        <th>Fitness</th>
                        <th>Trial (t)</th>
                        <th>pₘ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {population.map((src) => {
                        const isActive =
                          currentEvent?.sourceId === src.id ||
                          currentEvent?.affectedSourceId === src.id;
                        const isBest = bestSoFar?.id === src.id;
                        const isScoutRisk = src.t > params.limit;

                        return (
                          <tr
                            key={src.id}
                            className={[
                              isActive ? 'sim-table tr--active' : '',
                              isBest ? 'sim-table tr--best' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <td>
                              <strong>#{src.id}</strong>
                              {isBest && <span className="sim-badge-best">BEST</span>}
                              {isScoutRisk && (
                                <span className="sim-badge-scout-risk" title="trial > limit: scout candidate!">
                                  LIMIT
                                </span>
                              )}
                            </td>
                            <td>
                              [{src.x.map((coord) => coord.toFixed(3)).join(', ')}]
                            </td>
                            <td>{src.f.toFixed(4)}</td>
                            <td>{src.fit.toFixed(4)}</td>
                            <td>
                              <strong>{src.t}</strong>
                            </td>
                            <td>
                              {src.p !== undefined ? src.p.toFixed(3) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    marginTop: 'var(--space-4)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    lineHeight: 'var(--line-height-normal)',
                  }}
                >
                  * <strong>Trial (t):</strong> Consecutive failed improvement attempts. When trial &gt; limit ({params.limit}), the source is abandoned in the Scout Bee Phase.
                  <br />
                  * <strong>pₘ:</strong> Onlooker selection probability: <code>0.9 × (fit / max_fit) + 0.1</code>.
                </div>
              </div>
            )}

            {/* Tab 2: Fitness & Selection Probabilities View */}
            {activeTab === 'probabilities' && (
              <FitnessProbabilityView
                population={population}
                currentEvent={currentEvent}
                bestSoFar={bestSoFar}
              />
            )}

            {/* Tab 3: Convergence History Chart */}
            {activeTab === 'convergence' && (
              <ConvergenceChart
                convergenceHistory={convergenceHistory}
                maxCycles={params.T}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
