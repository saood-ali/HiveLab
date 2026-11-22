import { useState, useMemo, useCallback, useEffect } from 'react';
import './SimulatorView.css';
import { useAppState, useAppDispatch } from '../app/AppState.jsx';
import { ABCEngine } from '../engine/abcEngine.js';

export function SimulatorView() {
  const { problem, params } = useAppState();
  const dispatch = useAppDispatch();

  // Create deterministic engine instance for current problem & parameters
  const engine = useMemo(() => {
    return new ABCEngine(problem, params);
  }, [problem, params]);

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

  const syncState = useCallback((latestEvent = null) => {
    setEngineState((prev) => {
      const log = latestEvent
        ? [latestEvent, ...prev.eventsLog.slice(0, 19)]
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
  }, [engine]);

  // Advance exactly one step on user click
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
  }, [engine]);

  // Keyboard navigation: ArrowRight / Space for Next, ArrowLeft for Back, 'r' for Reset
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
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStep, handlePrevStep, handleReset]);

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

  // Determine badge styling for current phase
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
            title={historyLength === 0 ? 'At initial step' : 'Rewind previous step'}
          >
            ← Back
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleReset}
            title="Reset simulation to step 0 with the same seed"
          >
            Reset
          </button>
          <button
            className="btn btn--primary"
            onClick={handleNextStep}
            disabled={isTerminated}
            title={isTerminated ? 'Algorithm finished' : 'Advance by 1 step (Next Step)'}
          >
            {isTerminated ? 'Finished' : 'Next Step →'}
          </button>
        </div>
      </section>

      {/* ── Best-so-far Banner ──────────────────────────────────────── */}
      <section className="sim-best-banner" aria-label="Best Solution Memorized">
        <div>
          <div className="sim-best-banner__label">★ Best Solution Memorized Outside Population</div>
          <div className="sim-best-banner__val">
            f(x*) = {bestSoFar.f.toFixed(6)} &nbsp; (fit = {bestSoFar.fit.toFixed(6)})
          </div>
        </div>
        <div className="sim-best-banner__coords">
          Source #{bestSoFar.id} &nbsp;·&nbsp; x* = [{bestSoFar.x.map((c) => c.toFixed(4)).join(', ')}]
        </div>
      </section>

      {/* ── Main Two-Column Grid ────────────────────────────────────── */}
      <div className="sim-grid">
        {/* Left Column: Step Inspector & Calculation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <section className="sim-card" aria-labelledby="step-inspector-title">
            <div className="sim-card__header">
              <h2 className="sim-card__title" id="step-inspector-title">
                <span>🐝</span> {currentEvent.title || 'Current Step'}
              </h2>

              {currentEvent.accepted !== undefined && (
                <span
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

            {/* Calculation details / formula substitution (collapsible) */}
            {(currentEvent.formula || currentEvent.details) && (
              <details className="sim-details" open>
                <summary>Calculation &amp; Formula Substitution</summary>
                <div className="sim-details__content">
                  {currentEvent.formula && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Equation:</strong> {currentEvent.formula}
                    </div>
                  )}
                  {currentEvent.rawValue !== undefined && (
                    <div>
                      <strong>Raw coordinate:</strong> {currentEvent.rawValue.toFixed(4)}
                      {currentEvent.clipped && (
                        <span> → Clipped to bounds: {currentEvent.clippedValue.toFixed(4)}</span>
                      )}
                    </div>
                  )}
                  {currentEvent.oldF !== undefined && (
                    <div style={{ marginTop: 'var(--space-1)' }}>
                      <strong>Comparison:</strong> f(candidate) = {currentEvent.candF.toFixed(4)} vs f(current) = {currentEvent.oldF.toFixed(4)}
                      <br />
                      <strong>Greedy choice:</strong> {currentEvent.accepted ? 'Strictly better → Accepted (trial = 0)' : 'Not better → Rejected (trial++)'}
                    </div>
                  )}
                  {currentEvent.details && (
                    <div style={{ marginTop: 'var(--space-1)' }}>{currentEvent.details}</div>
                  )}
                </div>
              </details>
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

        {/* Right Column: Live Population Table */}
        <section className="sim-card" aria-labelledby="pop-table-title">
          <div className="sim-card__header">
            <h2 className="sim-card__title" id="pop-table-title">
              Colony Food Sources (Np = {population.length})
            </h2>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Limit = {params.limit}
            </span>
          </div>

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
                    currentEvent.sourceId === src.id ||
                    (currentEvent.affectedSourceId === src.id);
                  const isBest = bestSoFar.id === src.id;
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
                        {isBest && <span className="sim-badge-best">★ BEST</span>}
                        {isScoutRisk && (
                          <span className="sim-badge-scout-risk" title="trial > limit: scout candidate!">
                            ⚠ LIMIT
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
        </section>
      </div>
    </div>
  );
}
