import { useState, useCallback } from 'react';
import './ParameterSetup.css';
import { useAppState, useAppDispatch } from '../app/AppState.jsx';
import { validateAll } from '../engine/validation.js';

function FieldError({ error }) {
  if (!error) return null;
  return (
    <div className="setup__error" role="alert">
      <span aria-hidden="true">⚠</span> {error}
    </div>
  );
}

export function ParameterSetup() {
  const { problem, params } = useAppState();
  const dispatch = useAppDispatch();

  // Track raw string values during typing (before casting to numbers)
  const [raw, setRaw] = useState({
    S: String(params.S),
    T: String(params.T),
    limit: String(params.limit),
    seed: String(params.seed),
    bounds: params.bounds.map(([lo, hi]) => [String(lo), String(hi)]),
  });

  // Run validation on current raw values
  const validation = validateAll({
    S: raw.S,
    T: raw.T,
    limit: raw.limit,
    seed: raw.seed,
    bounds: raw.bounds.map(([lo, hi]) => [lo, hi]),
  });

  const updateField = useCallback((field, value) => {
    setRaw((prev) => ({ ...prev, [field]: value }));
    dispatch({ type: 'SET_PARAM', field, value: Number(value) });
  }, [dispatch]);

  const updateBound = useCallback((dimIdx, which, value) => {
    setRaw((prev) => {
      const bounds = prev.bounds.map((pair, i) =>
        i === dimIdx
          ? which === 'lower' ? [value, pair[1]] : [pair[0], value]
          : pair
      );
      return { ...prev, bounds };
    });
    dispatch({ type: 'SET_BOUND', dimIdx, which, value: Number(value) });
  }, [dispatch]);

  function handleReset() {
    dispatch({ type: 'RESET_PARAMS' });
    const dp = problem.defaultParams;
    setRaw({
      S: String(dp.S),
      T: String(dp.T),
      limit: String(dp.limit),
      seed: String(dp.seed),
      bounds: problem.bounds.lower.map((lo, i) => [String(lo), String(problem.bounds.upper[i])]),
    });
  }

  function handleStart() {
    if (!validation.valid) return;
    dispatch({ type: 'SET_VIEW', view: 'simulator' });
  }

  function handleBack() {
    dispatch({ type: 'SET_VIEW', view: 'intro' });
  }

  const Np = validation.valid && validation.derived ? validation.derived.Np : (params.S / 2);

  return (
    <main className="setup" aria-labelledby="setup-heading">
      <h1 className="setup__heading" id="setup-heading">Configure Parameters</h1>
      <p className="setup__subheading">
        Problem: <strong>{problem.name}</strong>
      </p>

      {/* Colony parameters */}
      <section className="setup__section" aria-labelledby="colony-section-title">
        <h2 className="setup__section-title" id="colony-section-title">Colony &amp; cycle settings</h2>

        <div className="setup__fields">
          {/* S */}
          <div className="setup__field">
            <label className="setup__field-label" htmlFor="param-S">
              Colony size <strong>S</strong>
            </label>
            <span className="setup__field-hint">
              Must be an even positive integer. Half the colony are employed bees; the other half are onlooker bees.
            </span>
            <input
              id="param-S"
              type="number"
              className={`setup__input${validation.errors.S ? ' setup__input--error' : ''}`}
              value={raw.S}
              min={2}
              step={2}
              onChange={(e) => updateField('S', e.target.value)}
              aria-describedby="param-S-error param-S-derived"
              aria-invalid={!!validation.errors.S}
            />
            <FieldError error={validation.errors.S} />
            {!validation.errors.S && (
              <span className="setup__field-derived" id="param-S-derived">
                → Np = S/2 = {Math.floor(Number(raw.S) / 2)} food sources
              </span>
            )}
          </div>

          {/* Np (derived, read-only) */}
          <div className="setup__field">
            <label className="setup__field-label" htmlFor="param-Np">
              Food sources <strong>Np</strong> (derived)
            </label>
            <span className="setup__field-hint">
              Always Np = S/2. This is set automatically — you cannot edit it directly.
            </span>
            <input
              id="param-Np"
              type="number"
              className="setup__input"
              value={!validation.errors.S ? Math.floor(Number(raw.S) / 2) : '—'}
              readOnly
              aria-readonly="true"
              tabIndex={-1}
              style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', cursor: 'default' }}
            />
            <span className="setup__field-hint" style={{ marginTop: '2px' }}>
              Lecture formula: Np = S/2
            </span>
          </div>

          {/* T */}
          <div className="setup__field">
            <label className="setup__field-label" htmlFor="param-T">
              Maximum cycles <strong>T</strong>
            </label>
            <span className="setup__field-hint">
              The algorithm runs for at most T complete cycles (employed → onlooker → scout → memorise).
            </span>
            <input
              id="param-T"
              type="number"
              className={`setup__input${validation.errors.T ? ' setup__input--error' : ''}`}
              value={raw.T}
              min={1}
              max={1000}
              onChange={(e) => updateField('T', e.target.value)}
              aria-describedby="param-T-error"
              aria-invalid={!!validation.errors.T}
            />
            <FieldError error={validation.errors.T} />
          </div>

          {/* limit */}
          <div className="setup__field">
            <label className="setup__field-label" htmlFor="param-limit">
              Abandonment limit
            </label>
            <span className="setup__field-hint">
              A food source is abandoned and replaced by a scout when its trial counter exceeds this value (rule: trial &gt; limit).
            </span>
            <input
              id="param-limit"
              type="number"
              className={`setup__input${validation.errors.limit ? ' setup__input--error' : ''}`}
              value={raw.limit}
              min={0}
              onChange={(e) => updateField('limit', e.target.value)}
              aria-describedby="param-limit-error"
              aria-invalid={!!validation.errors.limit}
            />
            <FieldError error={validation.errors.limit} />
          </div>

          {/* seed */}
          <div className="setup__field">
            <label className="setup__field-label" htmlFor="param-seed">
              Random seed
            </label>
            <span className="setup__field-hint">
              Controls all random draws. The same seed always produces the same run. Change to explore a different random sequence.
            </span>
            <input
              id="param-seed"
              type="number"
              className={`setup__input${validation.errors.seed ? ' setup__input--error' : ''}`}
              value={raw.seed}
              onChange={(e) => updateField('seed', e.target.value)}
              aria-describedby="param-seed-error"
              aria-invalid={!!validation.errors.seed}
            />
            <FieldError error={validation.errors.seed} />
          </div>
        </div>
      </section>

      {/* Bounds */}
      <section className="setup__section" aria-labelledby="bounds-section-title">
        <h2 className="setup__section-title" id="bounds-section-title">Variable bounds</h2>
        <div className="setup__fields setup__fields--single">
          {problem.varNames.map((name, idx) => (
            <div className="setup__field" key={idx}>
              <label className="setup__field-label">
                {name} bounds
              </label>
              <div className="setup__bounds-row">
                <input
                  type="number"
                  className={`setup__input${validation.errors.bounds[idx] ? ' setup__input--error' : ''}`}
                  value={raw.bounds[idx]?.[0] ?? ''}
                  onChange={(e) => updateBound(idx, 'lower', e.target.value)}
                  aria-label={`${name} lower bound`}
                  step="any"
                />
                <span className="setup__bounds-sep">to</span>
                <input
                  type="number"
                  className={`setup__input${validation.errors.bounds[idx] ? ' setup__input--error' : ''}`}
                  value={raw.bounds[idx]?.[1] ?? ''}
                  onChange={(e) => updateBound(idx, 'upper', e.target.value)}
                  aria-label={`${name} upper bound`}
                  step="any"
                />
              </div>
              <FieldError error={validation.errors.bounds[idx]} />
            </div>
          ))}
        </div>
      </section>

      {/* Summary of derived values */}
      {validation.valid && (
        <div className="setup__section">
          <h2 className="setup__section-title">Configuration summary</h2>
          <div className="setup__derived-panel">
            <div className="setup__derived-item">
              <span className="setup__derived-label">Colony size S</span>
              <span className="setup__derived-value">{raw.S}</span>
            </div>
            <div className="setup__derived-item">
              <span className="setup__derived-label">Food sources Np = S/2</span>
              <span className="setup__derived-value">{Np}</span>
            </div>
            <div className="setup__derived-item">
              <span className="setup__derived-label">Employed bees</span>
              <span className="setup__derived-value">{Np}</span>
            </div>
            <div className="setup__derived-item">
              <span className="setup__derived-label">Onlooker bees</span>
              <span className="setup__derived-value">{Np}</span>
            </div>
            <div className="setup__derived-item">
              <span className="setup__derived-label">Max cycles T</span>
              <span className="setup__derived-value">{raw.T}</span>
            </div>
            <div className="setup__derived-item">
              <span className="setup__derived-label">Abandon limit</span>
              <span className="setup__derived-value">{raw.limit}</span>
            </div>
            <div className="setup__derived-item">
              <span className="setup__derived-label">Random seed</span>
              <span className="setup__derived-value">{raw.seed}</span>
            </div>
            {problem.varNames.map((name, idx) => (
              <div className="setup__derived-item" key={idx}>
                <span className="setup__derived-label">{name} range</span>
                <span className="setup__derived-value">
                  [{raw.bounds[idx]?.[0]}, {raw.bounds[idx]?.[1]}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="setup__actions">
        <button className="btn btn--ghost" onClick={handleBack}>
          ← Back
        </button>
        <button className="btn btn--secondary" onClick={handleReset}>
          Reset defaults
        </button>
        <button
          className="btn btn--primary"
          onClick={handleStart}
          disabled={!validation.valid}
          aria-disabled={!validation.valid}
          title={!validation.valid ? 'Fix the errors above first' : 'Start the ABC simulation'}
        >
          Start Simulation →
        </button>
        {!validation.valid && (
          <span className="setup__total-error" role="status" aria-live="polite">
            Fix the highlighted errors to continue.
          </span>
        )}
      </div>
    </main>
  );
}
