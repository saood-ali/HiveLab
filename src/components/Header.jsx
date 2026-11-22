import './Header.css';
import { useAppState, useAppDispatch } from '../app/AppState.jsx';

export function Header() {
  const { view } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <header className="header" role="banner">
      {/* Brand mark */}
      <a
        className="header__brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          dispatch({ type: 'SET_VIEW', view: 'intro' });
        }}
        aria-label="HiveLab home"
      >
        <span className="header__logo-mark" aria-hidden="true">🐝</span>
        <span className="header__name">HiveLab</span>
        <span className="header__sub">ABC Algorithm Visualizer</span>
      </a>

      <div className="header__spacer" />

      {/* Navigation buttons */}
      <nav className="header__nav" aria-label="App navigation">
        <button
          className={`header__nav-btn${view === 'intro' ? ' header__nav-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'intro' })}
          aria-current={view === 'intro' ? 'page' : undefined}
        >
          Problem
        </button>
        <button
          className={`header__nav-btn${view === 'setup' ? ' header__nav-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'setup' })}
          aria-current={view === 'setup' ? 'page' : undefined}
        >
          Parameters
        </button>
        <button
          className={`header__nav-btn${view === 'simulator' || view === 'replay' ? ' header__nav-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'simulator' })}
          aria-current={view === 'simulator' || view === 'replay' ? 'page' : undefined}
        >
          Simulator
        </button>
      </nav>
    </header>
  );
}
