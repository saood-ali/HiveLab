/**
 * App-level state management using React context + useReducer.
 * Manages: selected problem, current parameters, and UI view state.
 * Does NOT manage ABC algorithm execution state (that belongs to Part 2).
 */

import { createContext, useContext, useReducer } from 'react';
import { DEFAULT_PROBLEM_ID, getProblemById, PROBLEMS } from '../data/problems.js';

// ── Initial state ─────────────────────────────────────────────────────

function buildInitialParams(problem) {
  const dp = problem.defaultParams;
  return {
    S: dp.S,
    T: dp.T,
    limit: dp.limit,
    seed: dp.seed,
    bounds: problem.bounds.lower.map((lo, i) => [lo, problem.bounds.upper[i]]),
  };
}

const initialProblem = getProblemById(DEFAULT_PROBLEM_ID);

const INITIAL_STATE = {
  // Current selected problem
  problemId: DEFAULT_PROBLEM_ID,
  problem: initialProblem,

  // Raw param values as typed by the user (may be strings during editing)
  params: buildInitialParams(initialProblem),

  // Which screen is showing: 'intro' | 'setup' | 'simulator'
  view: 'intro',

  // Whether the params panel is expanded (mobile)
  paramsOpen: true,
};

// ── Reducer ───────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SELECT_PROBLEM': {
      const problem = getProblemById(action.problemId);
      if (!problem) return state;
      return {
        ...state,
        problemId: action.problemId,
        problem,
        params: buildInitialParams(problem),
        view: 'intro',
      };
    }
    case 'SET_PARAM': {
      return {
        ...state,
        params: { ...state.params, [action.field]: action.value },
      };
    }
    case 'SET_BOUND': {
      const bounds = state.params.bounds.map((pair, idx) =>
        idx === action.dimIdx
          ? action.which === 'lower'
            ? [action.value, pair[1]]
            : [pair[0], action.value]
          : pair
      );
      return { ...state, params: { ...state.params, bounds } };
    }
    case 'SET_VIEW': {
      return { ...state, view: action.view };
    }
    case 'TOGGLE_PARAMS_OPEN': {
      return { ...state, paramsOpen: !state.paramsOpen };
    }
    case 'RESET_PARAMS': {
      return {
        ...state,
        params: buildInitialParams(state.problem),
      };
    }
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────

const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}
