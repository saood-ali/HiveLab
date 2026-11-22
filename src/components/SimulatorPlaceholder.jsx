import './SimulatorPlaceholder.css';
import { useAppState, useAppDispatch } from '../app/AppState.jsx';

/**
 * Part 1 stub — the full simulator is built in Part 2.
 * Shows the selected parameters so the user can verify them.
 */
export function SimulatorPlaceholder() {
  const { problem, params } = useAppState();
  const dispatch = useAppDispatch();
  const Np = Math.floor(params.S / 2);

  return (
    <main className="sim-placeholder" aria-labelledby="sim-placeholder-title">
      <div className="sim-placeholder__icon" aria-hidden="true">🐝</div>
      <h1 className="sim-placeholder__title" id="sim-placeholder-title">
        Simulator coming in Part 2
      </h1>
      <p className="sim-placeholder__body">
        The ABC engine, manual stepper, visualisation, and step-by-step inspector
        are built in the next phase. Your parameters are saved and ready.
      </p>

      <div
        className="sim-placeholder__badge"
        role="status"
        aria-label="Current configuration"
      >
        Problem: {problem.name}
        &nbsp;·&nbsp;
        S={params.S}, Np={Np}, T={params.T}, limit={params.limit}, seed={params.seed}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="btn btn--secondary"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'setup' })}
        >
          ← Edit Parameters
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'intro' })}
        >
          Change Problem
        </button>
      </div>
    </main>
  );
}
