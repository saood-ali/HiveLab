import './App.css';
import { AppProvider, useAppState, useAppDispatch } from './AppState.jsx';
import { Header } from '../components/Header.jsx';
import { ProblemIntro } from '../components/ProblemIntro.jsx';
import { ParameterSetup } from '../components/ParameterSetup.jsx';
import { SimulatorView } from '../components/SimulatorView.jsx';
import { LectureReplay } from '../components/LectureReplay.jsx';

function AppContent() {
  const { view } = useAppState();

  return (
    <div className="app">
      <Header />
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
