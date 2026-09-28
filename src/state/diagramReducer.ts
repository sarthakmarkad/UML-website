import { EMPTY_DIAGRAM, type Diagram, type UMLClass, type UMLRelationship } from '../types/uml';

export const HISTORY_LIMIT = 80;
/** Consecutive changes with the same key inside this window collapse into one undo step. */
const COALESCE_WINDOW_MS = 700;

export interface HistoryState {
  past: Diagram[];
  present: Diagram;
  future: Diagram[];
  lastKey: string | null;
  lastAt: number;
}

export type DiagramAction =
  | { type: 'class/add'; klass: UMLClass }
  | { type: 'class/update'; id: string; patch: Partial<Omit<UMLClass, 'id'>> }
  | { type: 'class/move'; id: string; x: number; y: number }
  | { type: 'class/delete'; id: string }
  | { type: 'relationship/add'; relationship: UMLRelationship }
  | { type: 'relationship/update'; id: string; patch: Partial<Omit<UMLRelationship, 'id'>> }
  | { type: 'relationship/delete'; id: string }
  | { type: 'diagram/replace'; diagram: Diagram }
  | { type: 'diagram/clear' }
  | { type: 'history/commit' }
  | { type: 'history/undo' }
  | { type: 'history/redo' };

export function createHistoryState(diagram: Diagram): HistoryState {
  return { past: [], present: diagram, future: [], lastKey: null, lastAt: 0 };
}

/**
 * Records a new revision. `key` enables coalescing: rapid edits of the same field
 * (typing a name, dragging a box) become a single undo step instead of hundreds.
 */
function commit(state: HistoryState, present: Diagram, key: string | null): HistoryState {
  const now = Date.now();
  const coalesce = key !== null && state.lastKey === key && now - state.lastAt < COALESCE_WINDOW_MS;
  return {
    past: coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
    present,
    future: [],
    lastKey: key,
    lastAt: now,
  };
}

export function historyReducer(state: HistoryState, action: DiagramAction): HistoryState {
  switch (action.type) {
    case 'class/add':
      return commit(state, { ...state.present, classes: [...state.present.classes, action.klass] }, null);

    case 'class/update': {
      const classes = state.present.classes.map((klass) =>
        klass.id === action.id ? { ...klass, ...action.patch, id: klass.id } : klass,
      );
      return commit(state, { ...state.present, classes }, `class/update:${action.id}`);
    }

    case 'class/move': {
      const classes = state.present.classes.map((klass) =>
        klass.id === action.id ? { ...klass, x: action.x, y: action.y } : klass,
      );
      return commit(state, { ...state.present, classes }, `class/move:${action.id}`);
    }

    case 'class/delete': {
      if (!state.present.classes.some((klass) => klass.id === action.id)) return state;
      return commit(
        state,
        {
          classes: state.present.classes.filter((klass) => klass.id !== action.id),
          relationships: state.present.relationships.filter(
            (rel) => rel.sourceId !== action.id && rel.targetId !== action.id,
          ),
        },
        null,
      );
    }

    case 'relationship/add':
      return commit(
        state,
        { ...state.present, relationships: [...state.present.relationships, action.relationship] },
        null,
      );

    case 'relationship/update': {
      const relationships = state.present.relationships.map((rel) =>
        rel.id === action.id ? { ...rel, ...action.patch, id: rel.id } : rel,
      );
      return commit(state, { ...state.present, relationships }, `relationship/update:${action.id}`);
    }

    case 'relationship/delete': {
      if (!state.present.relationships.some((rel) => rel.id === action.id)) return state;
      return commit(
        state,
        { ...state.present, relationships: state.present.relationships.filter((rel) => rel.id !== action.id) },
        null,
      );
    }

    case 'diagram/replace':
      return commit(state, action.diagram, null);

    case 'diagram/clear':
      return state.present.classes.length === 0 && state.present.relationships.length === 0
        ? state
        : commit(state, EMPTY_DIAGRAM, null);

    case 'history/commit':
      return state.lastKey === null ? state : { ...state, lastKey: null };

    case 'history/undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
        lastKey: null,
        lastAt: 0,
      };
    }

    case 'history/redo': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: rest,
        lastKey: null,
        lastAt: 0,
      };
    }

    default:
      return state;
  }
}
