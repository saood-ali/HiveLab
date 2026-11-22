import { useState, useEffect, useMemo } from 'react';
import './LectureReplay.css';
import { WORKED_STAGES } from '../data/lectureSnapshots.js';
import { PROBLEMS } from '../data/problems.js';
import { ContourPlot } from './ContourPlot.jsx';

export function WorkedExample() {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  const stage = WORKED_STAGES[currentStageIdx];
  const sphereProblem = PROBLEMS[0]; // Reference sphere benchmark problem

  // Bounds for the benchmark problem: [-5, 5]²
  const bounds = useMemo(
    () => ({
      lower: [-5, -5],
      upper: [5, 5],
    }),
    []
  );

  // Keyboard navigation: Left/Right arrows change stage
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        setCurrentStageIdx((idx) => Math.min(WORKED_STAGES.length - 1, idx + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStageIdx((idx) => Math.max(0, idx - 1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Construct synthetic event for ContourPlot to show movements
  const contourEvent = useMemo(() => {
    if (stage.stageIndex === 1) {
      return {
        phase: 'EMPLOYED',
        sourceId: 1,
        oldX: [2, -1],
        candidateX: [5, -1],
        accepted: false,
        dim: 0,
      };
    }
    if (stage.stageIndex === 2) {
      return {
        phase: 'ONLOOKER',
        sourceId: 1,
        oldX: [2, -1],
        candidateX: [1.32, -1],
        accepted: true,
        dim: 0,
      };
    }
    if (stage.stageIndex === 3) {
      return {
        type: 'SCOUT_REPLACED',
        phase: 'SCOUT',
        abandonedSources: [
          {
            sourceId: 5,
            oldX: [3, 0],
            newX: [-0.7, -0.8],
          },
        ],
      };
    }
    return null;
  }, [stage]);

  // Format number cleanly
  const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? `${n}` : n.toFixed(3)) : n);

  return (
    <div className="replay-container" role="region" aria-label="ABC Algorithm Step-by-Step Worked Example">
      {/* Top Banner / Stepper Header */}
      <div className="replay-header">
        <div className="replay-header__left">
          <div className="replay-badge-row">
            <span className="badge badge--walkthrough">Step-by-Step Walkthrough</span>
            <span className="badge badge--phase-indicator">Stage {stage.stageIndex} of 3</span>
          </div>
          <h2 className="replay-title">{stage.title}</h2>
          <p className="replay-subtitle">{stage.summary}</p>
        </div>
      </div>

      {/* Stage Stepper Tabs & Controls */}
      <div className="stage-controls-bar">
        <div className="stage-tabs" role="tablist" aria-label="Algorithm stages">
          {WORKED_STAGES.map((s, idx) => (
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
            {currentStageIdx + 1} / {WORKED_STAGES.length}
          </span>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => setCurrentStageIdx((i) => Math.min(WORKED_STAGES.length - 1, i + 1))}
            disabled={currentStageIdx === WORKED_STAGES.length - 1}
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
                <span>📋</span> Colony State Snapshot
              </h3>
              <span className="table-badge">Cycle 1 State</span>
            </div>

            <div className="table-responsive">
              <table className="replay-table" aria-label="Food source population state">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>x₁</th>
                    <th>x₂</th>
                    <th>f(x)</th>
                    <th>fit</th>
                    <th>Trial (t)</th>
                    <th>pₘ</th>
                    <th>Status / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stage.population.map((src) => {
                    const isActive =
                      (stage.stageIndex === 1 && src.id === 1) ||
                      (stage.stageIndex === 2 && src.id === 1) ||
                      (stage.stageIndex === 3 && src.id === 5);
                    const isBest = src.id === stage.bestSoFar.id;

                    return (
                      <tr
                        key={src.id}
                        className={[
                          isActive ? 'row--active' : '',
                          isBest ? 'row--best' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <td className="cell-id">
                          <span className="source-dot" />#{src.id}
                        </td>
                        <td>{fmt(src.x[0])}</td>
                        <td>{fmt(src.x[1])}</td>
                        <td className="cell-f">{fmt(src.f)}</td>
                        <td className="cell-fit">{fmt(src.fit)}</td>
                        <td>
                          <span className={`trial-badge${src.t > 1 ? ' trial-badge--scout' : ''}`}>
                            {src.t}
                          </span>
                        </td>
                        <td className="cell-p">{(src.p * 100).toFixed(1)}%</td>
                        <td className="cell-note">
                          {isBest && <span className="badge-best">★ Best</span>}
                          {src.note && <span className="note-text">{src.note}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-caption">
              <em>Parameters:</em> Colony size S = 10 (Np = 5 sources), abandonment limit = 1, bounds [-5, 5]².
            </div>
          </div>

          {/* Worked Hand-Calculation Card (Stages 1, 2, 3) */}
          {stage.calculation && (
            <div className="replay-card calc-card">
              <div className="replay-card__header">
                <h3 className="replay-card__title">
                  <span>🔬</span> Step-by-Step Calculation Breakdown
                </h3>
                <span className="badge badge--calculation">
                  {stage.stageIndex === 1 && 'Employed Bee #1'}
                  {stage.stageIndex === 2 && 'Onlooker Bee on #1'}
                  {stage.stageIndex === 3 && 'Scout Replacement on #5'}
                </span>
              </div>

              {/* Stage 1 Breakdown */}
              {stage.stageIndex === 1 && (
                <div className="calc-body">
                  <div className="calc-param-grid">
                    <div className="calc-param">
                      <span className="calc-param__k">Current Source:</span>
                      <span className="calc-param__v">
                        X¹ = ({stage.calculation.sourcePos.join(', ')})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Partner Source:</span>
                      <span className="calc-param__v">
                        X⁴ = ({stage.calculation.partnerPos.join(', ')})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Perturbed Dimension:</span>
                      <span className="calc-param__v">x₁ (index 0)</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Random Weight φ:</span>
                      <span className="calc-param__v">{stage.calculation.phi}</span>
                    </div>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">1. Perturbation Formula:</span>
                    <code>
                      x'₁₁ = x₁₁ + φ₁₁(x₁₁ - x₄₁) = 2 + 0.81 × (2 - (-5)) = 7.67
                    </code>
                  </div>

                  <div className="calc-step-box calc-step-box--warning">
                    <span className="calc-step-label">2. Boundary Constraint &amp; Clipping:</span>
                    <p>
                      Candidate coordinate <code>7.67</code> exceeds upper bound <code>u₁ = 5.0</code>.
                      <br />
                      Applied bound constraint: <code>x'₁₁ = clip(7.67, -5, 5) = 5.0</code>.
                      <br />
                      Full candidate position: <strong>X'¹ = (5.0, -1.0)</strong>.
                    </p>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">3. Objective &amp; Fitness Evaluation:</span>
                    <p>
                      f(X'¹) = 5.0² + (-1.0)² = 25.0 + 1.0 = <strong>26.0</strong>
                      <br />
                      fit(X'¹) = 1 / (1 + 26.0) = 1 / 27 ≈ <strong>0.037</strong>
                      <br />
                      <em>Comparison:</em> Existing fit(X¹) = 1 / (1 + 5.0) = 1/6 ≈ <strong>0.167</strong>.
                    </p>
                  </div>

                  <div className="calc-decision-box calc-decision-box--rejected">
                    <span className="calc-decision-badge">Decision: REJECTED</span>
                    <p>{stage.calculation.resultText}</p>
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
                        X¹ = ({stage.calculation.sourcePos.join(', ')})
                      </span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Selection Probability:</span>
                      <span className="calc-param__v">p₁ = {stage.calculation.pm}</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Waggle Gate Draw:</span>
                      <span className="calc-param__v">r = {stage.calculation.r}</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Gate Check:</span>
                      <span className="calc-param__v calc-param__v--pass">
                        0.39 &lt; 0.729 (Passed)
                      </span>
                    </div>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">1. Perturbation with Partner Source 5:</span>
                    <p>
                      Partner X⁵ = ({stage.calculation.partnerPos.join(', ')}), dimension x₁, weight φ = {stage.calculation.phi}
                    </p>
                    <code>
                      x'₁₁ = x₁₁ + φ₁₁(x₁₁ - x₅₁) = 2 + 0.68 × (2 - 3) = 1.32
                    </code>
                    <p style={{ marginTop: '4px' }}>
                      Within bounds [-5, 5] (no clipping required). Full candidate: <strong>X'¹ = (1.32, -1.0)</strong>.
                    </p>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">2. Objective &amp; Fitness Evaluation:</span>
                    <p>
                      f(X'¹) = 1.32² + (-1.0)² = 1.7424 + 1.0 = <strong>2.742</strong>
                      <br />
                      fit(X'¹) = 1 / (1 + 2.7424) ≈ <strong>0.267</strong>
                      <br />
                      <em>Comparison:</em> Existing fit(X¹) = <strong>0.167</strong>.
                    </p>
                  </div>

                  <div className="calc-decision-box calc-decision-box--accepted">
                    <span className="calc-decision-badge">Decision: ACCEPTED</span>
                    <p>{stage.calculation.resultText}</p>
                  </div>
                </div>
              )}

              {/* Stage 3 Breakdown */}
              {stage.stageIndex === 3 && (
                <div className="calc-body">
                  <div className="calc-param-grid">
                    <div className="calc-param">
                      <span className="calc-param__k">Abandoned Source:</span>
                      <span className="calc-param__v">#5 at (3, 0)</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Stagnation Counter:</span>
                      <span className="calc-param__v">t₅ = 2 &gt; limit = 1</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Uniform Draw r₁:</span>
                      <span className="calc-param__v">{stage.calculation.r1}</span>
                    </div>
                    <div className="calc-param">
                      <span className="calc-param__k">Uniform Draw r₂:</span>
                      <span className="calc-param__v">{stage.calculation.r2}</span>
                    </div>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">1. Uniform Random Replacement:</span>
                    <p>
                      Formula: <code>x_mi = l_i + rand(0, 1) × (u_i - l_i)</code>
                    </p>
                    <code>
                      x'₅₁ = -5 + 0.43 × (5 - (-5)) = -0.7
                      <br />
                      x'₅₂ = -5 + 0.42 × (5 - (-5)) = -0.8
                    </code>
                  </div>

                  <div className="calc-step-box">
                    <span className="calc-step-label">2. Scout Objective &amp; Fitness:</span>
                    <p>
                      f(X'⁵) = (-0.7)² + (-0.8)² = 0.49 + 0.64 = <strong>1.13</strong>
                      <br />
                      fit(X'⁵) = 1 / (1 + 1.13) = 1 / 2.13 ≈ <strong>0.469</strong>
                    </p>
                  </div>

                  <div className="calc-decision-box calc-decision-box--accepted">
                    <span className="calc-decision-badge">Decision: SCOUT SUCCESS</span>
                    <p>{stage.calculation.resultText}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Visual Landscape with Swarm Positions */}
        <div className="replay-col-right">
          <ContourPlot
            problem={sphereProblem}
            bounds={bounds}
            population={stage.population}
            currentEvent={contourEvent}
            bestSoFar={stage.bestSoFar}
          />
        </div>
      </div>
    </div>
  );
}

// Export LectureReplay as alias for backwards compatibility
export const LectureReplay = WorkedExample;
