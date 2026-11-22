import './App.css';
import { AppProvider, useAppState, useAppDispatch } from './AppState.jsx';
import { Header } from '../components/Header.jsx';
import { ProblemIntro } from '../components/ProblemIntro.jsx';
import { ParameterSetup } from '../components/ParameterSetup.jsx';
import { SimulatorView } from '../components/SimulatorView.jsx';
import { LectureReplay } from '../components/LectureReplay.jsx';

/** Breadcrumb-style phase progress indicator */
function PhaseBar() {
  const { view } = useAppState();
  const dispatch = useAppDispatch();
  const steps = [
    { id: 'intro', label: 'Problem' },
    { id: 'setup', label: 'Parameters' },
    { id: 'simulator', label: 'Simulator' },
  ];
  const activeIdx = steps.findIndex((s) => s.id === view);

  return (
    <nav className="phase-bar" aria-label="Setup steps">
      {steps.map((step, idx) => (
        <span key={step.id} className="phase-bar__step-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className={[
              'phase-bar__step',
              idx < activeIdx ? 'phase-bar__step--done' : '',
              idx === activeIdx ? 'phase-bar__step--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => dispatch({ type: 'SET_VIEW', view: step.id })}
            aria-current={idx === activeIdx ? 'step' : undefined}
            style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', padding: 0 }}
          >
            <span className="phase-bar__dot" aria-hidden="true" />
            {step.label}
          </button>
          {idx < steps.length - 1 && (
            <span className="phase-bar__sep" aria-hidden="true">›</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function AppContent() {
  const { view } = useAppState();

  return (
    <div className="app">
      <Header />
      <PhaseBar />
      <main className="app__content">
        {view === 'intro' && <ProblemIntro />}
        {view === 'setup' && <ParameterSetup />}
        {(view === 'simulator' || view === 'replay') && <SimulatorView />}
      </main>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
