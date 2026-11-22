import './App.css';
import { AppProvider, useAppState } from './AppState.jsx';
import { Header } from '../components/Header.jsx';
import { ProblemIntro } from '../components/ProblemIntro.jsx';
import { ParameterSetup } from '../components/ParameterSetup.jsx';
import { SimulatorPlaceholder } from '../components/SimulatorPlaceholder.jsx';

/** Breadcrumb-style phase progress indicator */
function PhaseBar() {
  const { view } = useAppState();
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
          <span
            className={[
              'phase-bar__step',
              idx < activeIdx ? 'phase-bar__step--done' : '',
              idx === activeIdx ? 'phase-bar__step--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={idx === activeIdx ? 'step' : undefined}
          >
            <span className="phase-bar__dot" aria-hidden="true" />
            {step.label}
          </span>
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
        {view === 'simulator' && <SimulatorPlaceholder />}
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
