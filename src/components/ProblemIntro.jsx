import './ProblemIntro.css';
import { PROBLEMS } from '../data/problems.js';
import { useAppState, useAppDispatch } from '../app/AppState.jsx';

function TagBadge({ tag }) {
  const cls = tag === 'Lecture' ? 'intro__tag--lecture' : 'intro__tag--practice';
  return <span className={`intro__tag ${cls}`}>{tag}</span>;
}

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
      {/* Problem selector */}
      <label className="intro__selector-label" id="problem-selector-label">
        Select problem
      </label>
      <div
        className="intro__selector-row"
        role="listbox"
        aria-labelledby="problem-selector-label"
        aria-orientation="horizontal"
      >
        {PROBLEMS.map((p) => (
          <button
            key={p.id}
            role="option"
            aria-selected={p.id === problemId}
            className={`intro__selector-btn${p.id === problemId ? ' intro__selector-btn--active' : ''}`}
            onClick={() => handleSelectProblem(p.id)}
          >
            <TagBadge tag={p.tag} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Problem detail card */}
      <div className="intro__card">
        <div className="intro__eyebrow">
          <TagBadge tag={problem.tag} />
          <span className="intro__eyebrow-text">
            {problem.tag === 'Lecture'
              ? 'From the lecture worked example'
              : 'Extra practice problem — not from the lecture'}
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

        {/* Key facts */}
        <div className="intro__facts">
          <div className="intro__fact">
            <div className="intro__fact-label">Goal</div>
            <div className="intro__fact-value" style={{ textTransform: 'capitalize' }}>
              {problem.goal}
            </div>
          </div>
          <div className="intro__fact">
            <div className="intro__fact-label">Dimensions</div>
            <div className="intro__fact-value">{problem.dimensions} variables</div>
          </div>
          <div className="intro__fact">
            <div className="intro__fact-label">Variable names</div>
            <div className="intro__fact-value">{problem.varNames.join(', ')}</div>
          </div>
          {problem.bounds.lower.map((lo, i) => (
            <div className="intro__fact" key={i}>
              <div className="intro__fact-label">Bounds for {problem.varNames[i]}</div>
              <div className="intro__fact-value">
                [{lo}, {problem.bounds.upper[i]}]
              </div>
            </div>
          ))}
          {problem.defaultParams && (
            <>
              <div className="intro__fact">
                <div className="intro__fact-label">Default colony S</div>
                <div className="intro__fact-value">{problem.defaultParams.S}</div>
              </div>
              <div className="intro__fact">
                <div className="intro__fact-label">Food sources Np = S/2</div>
                <div className="intro__fact-value">
                  {problem.defaultParams.S / 2}
                </div>
              </div>
              <div className="intro__fact">
                <div className="intro__fact-label">Default max cycles T</div>
                <div className="intro__fact-value">{problem.defaultParams.T}</div>
              </div>
              <div className="intro__fact">
                <div className="intro__fact-label">Default limit</div>
                <div className="intro__fact-value">{problem.defaultParams.limit}</div>
              </div>
            </>
          )}
        </div>

        {/* What ABC will do */}
        <div className="intro__abc-blurb">
          <div className="intro__abc-blurb-title">
            <span>🐝</span> What the ABC algorithm will do
          </div>
          <ol className="intro__abc-steps">
            {[
              ['Initialise', `Scatter ${problem.defaultParams ? (problem.defaultParams.S / 2) : 'Np'} random food sources (candidate solutions) inside the bounds.`],
              ['Employed bees', 'Each bee tries a small neighbourhood move from its source. Better candidates replace the old source; worse ones are rejected and the trial counter goes up.'],
              ['Onlooker bees', 'Bees in the hive choose sources to investigate — better sources attract more attention. Same greedy move attempted.'],
              ['Scout bees', `Any source whose trial counter exceeds the limit (${problem.defaultParams?.limit ?? 'limit'}) is abandoned and replaced with a fresh random source.`],
              ['Memorise best', 'The best solution found so far is saved outside the population so it can never be lost.'],
              ['Repeat', `Cycles repeat until cycle = T (${problem.defaultParams?.T ?? 'T'}). Then the best solution is reported.`],
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
