import { useState, useEffect, useMemo } from 'react';
import './LectureReplay.css';
import { useAppState } from '../app/AppState.jsx';
import { generateDynamicWorkedExample } from '../engine/workedExampleGenerator.js';
import { ContourPlot } from './ContourPlot.jsx';

export function WorkedExample() {
  const { problem, params } = useAppState();
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  // Dynamically generate the 4 worked example stages using active problem & parameters
  const stages = useMemo(() => {
    return generateDynamicWorkedExample(problem, params);
  }, [problem, params]);

  // Ensure current stage index is within bounds
  const stage = stages[currentStageIdx] || stages[0];

  // Active bounds
  const bounds = useMemo(() => {
    if (params.bounds && params.bounds.length >= 2) {
      return {
        lower: params.bounds.map((b) => Number(b[0])),
        upper: params.bounds.map((b) => Number(b[1])),
      };
    }
    return problem.bounds;
  }, [problem, params]);

  // Keyboard navigation: Left/Right arrows change stage
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        setCurrentStageIdx((idx) => Math.min(stages.length - 1, idx + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStageIdx((idx) => Math.max(0, idx - 1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stages.length]);

  const calc = stage.calculation;

  return (
    <div className="replay-container" role="region" aria-label="ABC Algorithm Step-by-Step Worked Example">
      {/* Top Banner / Stepper Header */}
      <div className="replay-header">
        <div className="replay-header__left">
          <div className="replay-badge-row">
            <span className="badge badge--walkthrough">Dynamic Worked Example</span>
            <span className="badge badge--phase-indicator">Stage {stage.stageIndex} of 3</span>
            <span className="badge" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
              Problem: {problem.name} &nbsp;·&nbsp; Np = {stage.population.length} &nbsp;·&nbsp; limit = {params.limit} &nbsp;·&nbsp; seed = {params.seed}
            </span>
          </div>
          <h2 className="replay-title">{stage.title}</h2>
          <p className="replay-subtitle">{stage.summary}</p>
        </div>
      </div>

      {/* Stage Stepper Tabs & Controls */}
      <div className="stage-controls-bar">
        <div className="stage-tabs" role="tablist" aria-label="Algorithm stages">
          {stages.map((s, idx) => (
            <button
              key={s.stageIndex}
              role="tab"
              aria-selected={idx === currentStageIdx}
              className={`stage-tab${idx === currentStageIdx ? ' stage-tab--active' : ''}`}
              onClick={() => setCurrentStageIdx(idx)}
            >
              <span className="stage-tab__step">Stage {idx}</span>
              <span className="stage-tab__name">
                {idx === 0 && 'Init'}
                {idx === 1 && 'Employed'}
                {idx === 2 && 'Onlooker'}
                {idx === 3 && 'Scout'}
              </span>
            </button>
          ))}
        </div>

        <div className="stage-nav-btns">
          <button
            className="btn btn--outline btn--sm"
            onClick={() => setCurrentStageIdx((i) => Math.max(0, i - 1))}
            disabled={currentStageIdx === 0}
            aria-label="Previous algorithm stage"
          >
            ← Previous Stage
          </button>
          <span className="stage-step-counter">
            {currentStageIdx + 1} / {stages.length}
          </span>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => setCurrentStageIdx((i) => Math.min(stages.length - 1, i + 1))}
            disabled={currentStageIdx === stages.length - 1}
            aria-label="Next algorithm stage"
          >
            Next Stage →
          </button>
        </div>
      </div>

      {/* ARIA Live announcement */}
      <div className="sr-only" aria-live="polite">
        Current algorithm stage: {stage.title}. {stage.summary}
      </div>

      {/* Main 2-Column Content Layout */}
      <div className="replay-grid">
        {/* Left Column: Population Table + Worked Calculation */}
        <div className="replay-col-left">
          {/* Population Table Card */}
          <div className="replay-card">
            <div className="replay-card__header">
              <h3 className="replay-card__title">
                Colony State Snapshot
              </h3>
              <span className="table-badge">Cycle 1 State</span>
            </div>

            <div className="table-responsive">
              <table className="replay-table" aria-label="Food source population state">
                <thead>
                  <tr>
                    <th>Source</th>
                    {problem.varNames.map((name, i) => (
                      <th key={i}>{name}</th>
                    ))}
                    <th>f(x)</th>
                    <th>fit</th>
                    <th>Trial (t)</th>
                    <th>pₘ</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stage.population.map((src) => {
                    const isBest = stage.bestSoFar && stage.bestSoFar.id === src.id;
                    return (
                      <tr
                        key={src.id}
                        className={isBest ? 'row-best' : ''}
                      >
                        <td className="cell-source">#{src.id}</td>
                        {src.x.map((coord, i) => (
                          <td key={i} className="cell-num">{coord.toFixed(3)}</td>
                        ))}
                        <td className="cell-num">{src.f.toFixed(4)}</td>
                        <td className="cell-num">{src.fit.toFixed(4)}</td>
                        <td className="cell-num">
                          <span className={src.t > params.limit ? 'trial-exceeded' : ''}>
                            {src.t}
                          </span>
                        </td>
                        <td className="cell-p">{(src.p * 100).toFixed(1)}%</td>
                        <td className="cell-note">
                          {isBest && <span className="badge-best">Best</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-caption">
              <em>Parameters:</em> Colony S = {params.S} (Np = {stage.population.length} sources), limit = {params.limit}, bounds = [{bounds.lower.join(', ')}] to [{bounds.upper.join(', ')}].
            </div>
          </div>

          {/* Worked Hand-Calculation Card */}
          {calc && (
            <div className="replay-card calc-card">
              <div className="replay-card__header">
                <h3 className="replay-card__title">
                  Step-by-Step Calculation Breakdown
                </h3>
                <span className="badge badge--calculation">
                  {stage.stageIndex === 0 && 'Initial Population Setup'}
                  {stage.stageIndex === 1 && `Employed Bee #${calc.sourceId}`}
                  {stage.stageIndex === 2 && `Onlooker Bee on #${calc.sourceId}`}
                  {stage.stageIndex === 3 && `Scout Bee Audit & Replacement`}
                </span>
              </div>

              {/* Stage 0 Breakdown */}
              {stage.stageIndex === 0 && (
                <div className="calc-body">
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
                      <span className="calc-param__v">
                        #{calc.bestSource.id} (f = {calc.bestSource.f.toFixed(4)})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Total Sources Np:</span>
                      <span className="calc-param__v">{stage.population.length}</span>
                    </div>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">1. Fitness Transformation Formula:</span>
                    <p>
                      For minimization problems, the objective value <code>f(x)</code> is converted to a positive fitness <code>fit(x)</code> to maximize:
                    </p>
                    <code>
                      fit = 1 / (1 + f(x)) &nbsp; [if f(x) ≥ 0] &nbsp;|&nbsp; fit = 1 + |f(x)| &nbsp; [if f(x) &lt; 0]
                    </code>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">2. Verification on Source #{calc.sampleSource.id}:</span>
                    <p>
                      Coordinates: <code>[{calc.sampleSource.x.map((c) => c.toFixed(3)).join(', ')}]</code>
                      <br />
                      Objective evaluation: <code>f(X¹) = {calc.sampleSource.f.toFixed(4)}</code>
                      <br />
                      Fitness evaluation: <code>fit(X¹) = 1 / (1 + {calc.sampleSource.f.toFixed(4)}) = {calc.sampleSource.fit.toFixed(4)}</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Stage 1 Breakdown */}
              {stage.stageIndex === 1 && (
                <div className="calc-body">
                  <div className="calc-param-grid">
                    <div className="calc-param">
                      <span className="calc-param__k">Current Source:</span>
                      <span className="calc-param__v">
                        X^{calc.sourceId} = ({calc.sourcePos.map((c) => c.toFixed(3)).join(', ')})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Partner Source:</span>
                      <span className="calc-param__v">
                        X^{calc.partnerId} = ({calc.partnerPos.map((c) => c.toFixed(3)).join(', ')})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Perturbed Dimension:</span>
                      <span className="calc-param__v">{calc.varName} (dim {calc.dimIdx})</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Random Weight φ:</span>
                      <span className="calc-param__v">{calc.phi.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">1. Perturbation Formula:</span>
                    <code>
                      v_{calc.sourceId},{calc.dimIdx + 1} = x_{calc.sourceId},{calc.dimIdx + 1} + φ × (x_{calc.sourceId},{calc.dimIdx + 1} - x_{calc.partnerId},{calc.dimIdx + 1})
                      <br />
                      = {calc.sourcePos[calc.dimIdx].toFixed(3)} + ({calc.phi.toFixed(3)}) × ({calc.sourcePos[calc.dimIdx].toFixed(3)} - {calc.partnerPos[calc.dimIdx].toFixed(3)})
                      <br />
                      = {calc.rawValue.toFixed(4)}
                    </code>
                  </div>

                  <div className={`calc-step-box${calc.clipped ? ' calc-step-box--warning' : ''}`}>
                    <span className="calc-step-label">2. Boundary Constraint &amp; Coordinates:</span>
                    <p>
                      {calc.clipped ? (
                        <>
                          Raw coordinate <code>{calc.rawValue.toFixed(4)}</code> exceeded bounds. Clipped to <code>{calc.clippedValue.toFixed(4)}</code>.
                        </>
                      ) : (
                        <>
                          Raw coordinate <code>{calc.rawValue.toFixed(4)}</code> lies safely within bounds [{bounds.lower[calc.dimIdx]}, {bounds.upper[calc.dimIdx]}]. No clipping needed.
                        </>
                      )}
                      <br />
                      Full Candidate Vector: <strong>v_{calc.sourceId} = ({calc.candidatePos.map((c) => c.toFixed(3)).join(', ')})</strong>.
                    </p>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">3. Objective &amp; Fitness Evaluation:</span>
                    <p>
                      Candidate objective: <code>f(v_{calc.sourceId}) = {calc.candidateF.toFixed(4)}</code>
                      <br />
                      Candidate fitness: <code>fit(v_{calc.sourceId}) = {calc.candidateFit.toFixed(4)}</code>
                      <br />
                      <em>Comparison:</em> Current source fitness <code>fit(X^{calc.sourceId}) = {calc.oldFit.toFixed(4)}</code>.
                    </p>
                  </div>

                  <div className={`calc-decision-box calc-decision-box--${calc.accepted ? 'accepted' : 'rejected'}`}>
                    <span className="calc-decision-badge">Decision: {calc.accepted ? 'ACCEPTED' : 'REJECTED'}</span>
                    <p>{calc.resultText}</p>
                  </div>

                  {/* Onlooker Probability Calculation Table */}
                  <div className="calc-step-box" style={{ marginTop: 'var(--space-4)' }}>
                    <span className="calc-step-label">4. Onlooker Selection Probabilities Formula:</span>
                    <p style={{ marginBottom: '8px' }}>
                      Formula: <code>p_m = 0.9 × (fit_m / max(fit)) + 0.1</code> &nbsp;·&nbsp; (max fit = {calc.maxFit})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {calc.probBreakdown.map((row) => (
                        <div key={row.id} style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-secondary)' }}>
                          • Source #{row.id}: fit = {row.fit} → <strong>p_{row.id} = {(row.p * 100).toFixed(1)}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 2 Breakdown */}
              {stage.stageIndex === 2 && (
                <div className="calc-body">
                  <div className="calc-param-grid">
                    <div className="calc-param">
                      <span className="calc-param__k">Selected Source:</span>
                      <span className="calc-param__v">
                        X^{calc.sourceId} = ({calc.sourcePos.map((c) => c.toFixed(3)).join(', ')})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Selection Probability:</span>
                      <span className="calc-param__v">p_{calc.sourceId} = {(calc.pm * 100).toFixed(1)}%</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Selection Gate Draw:</span>
                      <span className="calc-param__v">r = {calc.r.toFixed(3)}</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Gate Status:</span>
                      <span className="calc-param__v calc-param__v--pass">
                        {calc.r.toFixed(3)} &lt; {calc.pm.toFixed(3)} (Passed)
                      </span>
                    </div>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">1. Perturbation with Partner Source #{calc.partnerId}:</span>
                    <p>
                      Partner X^{calc.partnerId} = ({calc.partnerPos.map((c) => c.toFixed(3)).join(', ')}), dimension {calc.varName}, weight φ = {calc.phi.toFixed(3)}
                    </p>
                    <code>
                      v_{calc.sourceId} = ({calc.candidatePos.map((c) => c.toFixed(3)).join(', ')})
                    </code>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">2. Objective &amp; Fitness Evaluation:</span>
                    <p>
                      Candidate objective: <code>f(v) = {calc.candidateF.toFixed(4)}</code>
                      <br />
                      Candidate fitness: <code>fit(v) = {calc.candidateFit.toFixed(4)}</code>
                      <br />
                      <em>Comparison:</em> Existing source fitness = <code>{calc.oldFit.toFixed(4)}</code>.
                    </p>
                  </div>

                  <div className={`calc-decision-box calc-decision-box--${calc.accepted ? 'accepted' : 'rejected'}`}>
                    <span className="calc-decision-badge">Decision: {calc.accepted ? 'ACCEPTED' : 'REJECTED'}</span>
                    <p>{calc.resultText}</p>
                  </div>
                </div>
              )}

              {/* Stage 3 Breakdown */}
              {stage.stageIndex === 3 && (
                <div className="calc-body">
                  <div className="calc-param-grid">
                    <div className="calc-param">
                      <span className="calc-param__k">Configured Limit:</span>
                      <span className="calc-param__v">{calc.limit}</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Highest Stagnation Trial:</span>
                      <span className="calc-param__v">
                        Source #{calc.targetSource.sourceId} (trial = {calc.targetSource.trial})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Abandonment Condition:</span>
                      <span className="calc-param__v">
                        trial &gt; limit ({calc.targetSource.trial} &gt; {calc.limit} → {calc.hasAbandoned ? 'TRIGGERED' : 'Not Triggered'})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Scout Action:</span>
                      <span className="calc-param__v">
                        {calc.hasAbandoned ? 'Abandon & Re-randomize' : 'Retain (within limit)'}
                      </span>
                    </div>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">1. Scout Uniform Random Formula:</span>
                    <p>
                      When a source stagnates past limit, a scout bee abandons it and scatters a fresh random candidate inside the problem bounds:
                    </p>
                    <code>
                      x_mi = l_i + rand(0, 1) × (u_i - l_i)
                    </code>
                    <p style={{ marginTop: '6px' }}>
                      {calc.hasAbandoned ? 'Actual scout replacement:' : 'Demonstration of scout replacement:'}
                      <br />
                      Old coordinate: <code>({calc.targetSource.oldX.map((c) => c.toFixed(3)).join(', ')})</code>
                      <br />
                      New uniform coordinate: <strong>({calc.targetSource.newX.map((c) => c.toFixed(3)).join(', ')})</strong>
                    </p>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">2. Re-evaluated Objective &amp; Fitness:</span>
                    <p>
                      New objective: <code>f(X^{calc.targetSource.sourceId}) = {calc.targetSource.newF.toFixed(4)}</code>
                      <br />
                      New fitness: <code>fit(X^{calc.targetSource.sourceId}) = {calc.targetSource.newFit.toFixed(4)}</code>
                      <br />
                      Trial counter reset to: <strong>t_{calc.targetSource.sourceId} = 0</strong>.
                    </p>
                  </div>

                  <div className="calc-decision-box calc-decision-box--accepted">
                    <span className="calc-decision-badge">Scout Rule Status</span>
                    <p>
                      {calc.hasAbandoned
                        ? `Source #${calc.targetSource.sourceId} exceeded the limit and was successfully refreshed.`
                        : `No source exceeded limit (${calc.limit}) in this cycle. If stagnation occurs in future cycles, this uniform random replacement is triggered.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Visual Landscape with Swarm Positions */}
        <div className="replay-col-right">
          <ContourPlot
            problem={problem}
            bounds={bounds}
            population={stage.population}
            currentEvent={stage.movementEvent}
            bestSoFar={stage.bestSoFar}
          />
        </div>
      </div>
    </div>
  );
}

// Export LectureReplay as alias for backwards compatibility
export const LectureReplay = WorkedExample;
