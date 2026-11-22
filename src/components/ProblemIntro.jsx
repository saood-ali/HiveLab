import './ProblemIntro.css';
import { PROBLEMS } from '../data/problems.js';
import { useAppState, useAppDispatch } from '../app/AppState.jsx';

export function ProblemIntro() {
  const { problem, problemId } = useAppState();
  const dispatch = useAppDispatch();

  function handleSelectProblem(id) {
    dispatch({ type: 'SELECT_PROBLEM', problemId: id });
  }

  function handleConfigure() {
    dispatch({ type: 'SET_VIEW', view: 'setup' });
  }

  return (
    <main className="intro" aria-labelledby="intro-title">
      {/* Problem selector - clean unified segmented bar without nested boxes */}
      <div className="intro__selector-container">
        <label className="intro__selector-label" id="problem-selector-label">
          Select Problem
        </label>
        <div
          className="intro__selector-group"
          role="radiogroup"
          aria-labelledby="problem-selector-label"
        >
          {PROBLEMS.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={p.id === problemId}
              className={`intro__selector-tab${p.id === problemId ? ' intro__selector-tab--active' : ''}`}
              onClick={() => handleSelectProblem(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Problem detail card */}
      <div className="intro__card">
        <div className="intro__eyebrow">
          <span className="intro__eyebrow-text">
            {problem.tag === 'Benchmark'
              ? 'Standard Benchmark Problem'
              : 'Interactive Practice Problem'}
          </span>
        </div>

        <h1 className="intro__title" id="intro-title">
          {problem.name}
        </h1>

        <p className="intro__description">{problem.description}</p>

        {/* Objective function */}
        <div>
          <div className="intro__fact-label" style={{ marginBottom: 'var(--space-2)' }}>
            Objective ({problem.goal})
          </div>
          <div className="intro__objective">{problem.objective}</div>
        </div>

        {/* Key specifications summary */}
        <div className="intro__facts">
          <div className="intro__fact">
            <div className="intro__fact-label">Search Domain</div>
            <div className="intro__fact-value">
              {problem.varNames.map((v, i) => `${v} ∈ [${problem.bounds.lower[i]}, ${problem.bounds.upper[i]}]`).join(', ')}
            </div>
          </div>
          <div className="intro__fact">
            <div className="intro__fact-label">Global Optimum</div>
            <div className="intro__fact-value">
              {problem.id === 'rosenbrock-practice' ? '(1.00, 1.00) · f = 0' : '(0.00, 0.00) · f = 0'}
            </div>
          </div>
          <div className="intro__fact">
            <div className="intro__fact-label">Default Colony</div>
            <div className="intro__fact-value">
              S = {problem.defaultParams?.S ?? 10} &nbsp;·&nbsp; Np = {(problem.defaultParams?.S ?? 10) / 2} sources
            </div>
          </div>
          <div className="intro__fact">
            <div className="intro__fact-label">Default Cycles &amp; Limit</div>
            <div className="intro__fact-value">
              T = {problem.defaultParams?.T ?? 10} &nbsp;·&nbsp; Limit = {problem.defaultParams?.limit ?? 1}
            </div>
          </div>
        </div>

        {/* What ABC will do */}
        <div className="intro__abc-blurb">
          <div className="intro__abc-blurb-title">
            <span>🐝</span> ABC Optimization Workflow
          </div>
          <ol className="intro__abc-steps">
            {[
              ['Employed Bees', 'Each bee perturbs its food source via a random partner vector and accepts if fitness strictly improves.'],
              ['Onlooker Bees', 'Bees at the hive evaluate food sources with selection probability proportional to fitness.'],
              ['Scout Bees', 'Exhausted food sources exceeding the trial limit are abandoned and replaced with fresh random positions.'],
              ['Memorise Best', 'The best solution discovered is stored outside the colony to guarantee it is permanently retained.'],
            ].map(([title, text], idx) => (
              <li key={idx}>
                <span className="intro__step-num" aria-hidden="true">{idx + 1}</span>
                <span>
                  <strong>{title}:</strong> {text}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA row */}
        <div className="intro__cta">
          <button className="btn btn--primary" onClick={handleConfigure}>
            Configure Parameters →
          </button>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            You can change the problem or parameters at any time before starting.
          </span>
        </div>
      </div>
    </main>
  );
}
