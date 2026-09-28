import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  RELATIONSHIP_META,
  type Diagram,
  type RelationshipKind,
  type Selection,
  type UMLAttribute,
  type UMLClass,
  type UMLMethod,
  type UMLRelationship,
} from '../types/uml';
import { boundsOf, clamp, getNodeRect, MIN_ZOOM, snap, zoomAround, type Size, type ViewState } from '../utils/geometry';
import { createId } from '../utils/id';
import { createAttribute, createClass, createMethod, createRelationship, nextClassName } from './factories';
import { createHistoryState, historyReducer } from './diagramReducer';
import { createSampleDiagram } from './sampleDiagram';
import { loadDiagram, saveDiagram } from './storage';
import { useToast } from '../hooks/useToast';

export interface ConnectState {
  kind: RelationshipKind;
  /** `null` while the user still has to pick the starting class. */
  sourceId: string | null;
}

const INITIAL_VIEW: ViewState = { x: 60, y: 40, k: 1 };
const MAX_NODE_X = 6000;
const MAX_NODE_Y = 4000;

/** Would linking `sourceId -> targetId` close a loop of extends/implements edges? */
function createsInheritanceCycle(relationships: UMLRelationship[], sourceId: string, targetId: string): boolean {
  const parents = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (relationship.kind !== 'inheritance' && relationship.kind !== 'realization') continue;
    const list = parents.get(relationship.sourceId);
    if (list) list.push(relationship.targetId);
    else parents.set(relationship.sourceId, [relationship.targetId]);
  }

  const queue = [targetId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const parent of parents.get(current) ?? []) queue.push(parent);
  }
  return false;
}

export interface DiagramContextValue {
  // ---- document ----
  classes: UMLClass[];
  relationships: UMLRelationship[];
  stats: { classes: number; attributes: number; methods: number; relationships: number };

  // ---- selection ----
  selection: Selection | null;
  select: (selection: Selection | null) => void;
  selectClass: (id: string) => void;
  selectRelationship: (id: string) => void;
  clearSelection: () => void;
  deleteSelection: () => void;

  // ---- class editing ----
  addClass: () => string;
  updateClass: (id: string, patch: Partial<Omit<UMLClass, 'id'>>) => void;
  moveClass: (id: string, x: number, y: number) => void;
  deleteClass: (id: string) => void;
  duplicateClass: (id: string) => void;
  addAttribute: (classId: string, attribute?: Partial<UMLAttribute>) => void;
  updateAttribute: (classId: string, attributeId: string, patch: Partial<UMLAttribute>) => void;
  removeAttribute: (classId: string, attributeId: string) => void;
  addMethod: (classId: string, method?: Partial<UMLMethod>) => void;
  updateMethod: (classId: string, methodId: string, patch: Partial<UMLMethod>) => void;
  removeMethod: (classId: string, methodId: string) => void;

  // ---- relationships ----
  addRelationship: (kind: RelationshipKind, sourceId: string, targetId: string) => string | null;
  updateRelationship: (id: string, patch: Partial<Omit<UMLRelationship, 'id'>>) => void;
  deleteRelationship: (id: string) => void;

  // ---- connection drawing ----
  connect: ConnectState | null;
  beginConnect: (kind: RelationshipKind, sourceId?: string | null) => void;
  pickConnectSource: (id: string) => void;
  completeConnect: (targetId: string) => boolean;
  cancelConnect: () => void;

  // ---- history ----
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  commitHistory: () => void;

  // ---- diagram level actions ----
  replaceDiagram: (diagram: Diagram) => void;
  clearDiagram: () => void;
  loadSample: () => void;

  // ---- viewport ----
  view: ViewState;
  viewportSize: Size;
  setViewportSize: (size: Size) => void;
  setView: (updater: ViewState | ((current: ViewState) => ViewState)) => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
  fitToContent: () => void;
  focusClass: (id: string) => void;

  // ---- misc ----
  renameToken: number;
  requestRename: () => void;
}

const DiagramContext = createContext<DiagramContextValue | null>(null);

export function DiagramProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [history, dispatch] = useReducer(historyReducer, undefined, () =>
    createHistoryState(loadDiagram() ?? createSampleDiagram()),
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [connect, setConnect] = useState<ConnectState | null>(null);
  const [view, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [viewportSize, setViewportSize] = useState<Size>({ width: 1280, height: 720 });
  const [renameToken, setRenameToken] = useState(0);
  const appliedSizeRef = useRef<Size | null>(null);

  const diagram = history.present;
  const diagramRef = useRef(diagram);
  const selectionRef = useRef(selection);
  const connectRef = useRef(connect);
  const viewRef = useRef(view);
  const sizeRef = useRef(viewportSize);
  diagramRef.current = diagram;
  selectionRef.current = selection;
  connectRef.current = connect;
  viewRef.current = view;
  sizeRef.current = viewportSize;

  // Persist to localStorage without writing on every pointer move.
  useEffect(() => {
    const timer = window.setTimeout(() => saveDiagram(diagram), 300);
    return () => window.clearTimeout(timer);
  }, [diagram]);

  const select = useCallback((next: Selection | null) => setSelection(next), []);
  const selectClass = useCallback((id: string) => setSelection({ kind: 'class', id }), []);
  const selectRelationship = useCallback((id: string) => setSelection({ kind: 'relationship', id }), []);
  const clearSelection = useCallback(() => setSelection(null), []);
  const requestRename = useCallback(() => setRenameToken((token) => token + 1), []);

  const fitTo = useCallback((size: Size, classes: UMLClass[]) => {
    const bounds = boundsOf(classes.map(getNodeRect));
    if (!bounds) {
      setViewState(INITIAL_VIEW);
      return;
    }
    const padding = 80;
    const scale = clamp(
      Math.min(
        (size.width - padding * 2) / Math.max(bounds.width, 1),
        (size.height - padding * 2) / Math.max(bounds.height, 1),
      ),
      MIN_ZOOM,
      1.25,
    );
    setViewState({
      k: scale,
      x: size.width / 2 - (bounds.x + bounds.width / 2) * scale,
      y: size.height / 2 - (bounds.y + bounds.height / 2) * scale,
    });
  }, []);

  const updateViewportSize = useCallback(
    (next: Size) => {
      setViewportSize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );

      const previous = appliedSizeRef.current;
      appliedSizeRef.current = next;
      if (next.width < 60 || next.height < 60) return;

      // First real measurement, a device rotation or a switch between the panel and
      // drawer layouts all change the canvas a lot: re-frame the diagram in that case,
      // but leave small window resizes alone so a manual zoom/pan is not discarded.
      const isMajorChange = !previous || Math.abs(next.width - previous.width) / previous.width > 0.25;
      if (isMajorChange) fitTo(next, diagramRef.current.classes);
    },
    [fitTo],
  );

  // ---------------------------------------------------------------- classes ---
  const addClass = useCallback((): string => {
    const state = diagramRef.current;
    const size = sizeRef.current;
    const currentView = viewRef.current;
    const klass = createClass({ name: nextClassName(state.classes) });
    const centerX = (size.width / 2 - currentView.x) / currentView.k;
    const centerY = (size.height / 3 - currentView.y) / currentView.k;
    klass.x = snap(clamp(centerX - klass.width / 2, 20, MAX_NODE_X));
    klass.y = snap(clamp(centerY, 20, MAX_NODE_Y));
    dispatch({ type: 'class/add', klass });
    setSelection({ kind: 'class', id: klass.id });
    return klass.id;
  }, []);

  const updateClass = useCallback((id: string, patch: Partial<Omit<UMLClass, 'id'>>) => {
    dispatch({ type: 'class/update', id, patch });
  }, []);

  const moveClass = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'class/move', id, x: snap(x), y: snap(y) });
  }, []);

  const deleteClass = useCallback(
    (id: string) => {
      const klass = diagramRef.current.classes.find((entry) => entry.id === id);
      dispatch({ type: 'class/delete', id });
      if (selectionRef.current?.id === id) setSelection(null);
      if (klass) notify(`Deleted "${klass.name}"`, 'info');
    },
    [notify],
  );

  const duplicateClass = useCallback(
    (id: string) => {
      const source = diagramRef.current.classes.find((entry) => entry.id === id);
      if (!source) return;
      const copy = createClass({
        ...source,
        id: createId('class'),
        name: `${source.name}Copy`,
        x: source.x + 40,
        y: source.y + 40,
        attributes: source.attributes.map((attribute) => ({ ...attribute, id: createId('attr') })),
        methods: source.methods.map((method) => ({ ...method, id: createId('method') })),
      });
      dispatch({ type: 'class/add', klass: copy });
      setSelection({ kind: 'class', id: copy.id });
      notify(`Duplicated "${source.name}"`, 'success');
    },
    [notify],
  );

  const patchClass = useCallback(
    (classId: string, updater: (klass: UMLClass) => Partial<UMLClass>) => {
      const klass = diagramRef.current.classes.find((entry) => entry.id === classId);
      if (!klass) return;
      dispatch({ type: 'class/update', id: classId, patch: updater(klass) });
    },
    [],
  );

  const addAttribute = useCallback(
    (classId: string, attribute: Partial<UMLAttribute> = {}) => {
      patchClass(classId, (klass) => ({ attributes: [...klass.attributes, createAttribute(attribute)] }));
    },
    [patchClass],
  );

  const updateAttribute = useCallback(
    (classId: string, attributeId: string, patch: Partial<UMLAttribute>) => {
      patchClass(classId, (klass) => ({
        attributes: klass.attributes.map((attribute) =>
          attribute.id === attributeId ? { ...attribute, ...patch, id: attributeId } : attribute,
        ),
      }));
    },
    [patchClass],
  );

  const removeAttribute = useCallback(
    (classId: string, attributeId: string) => {
      patchClass(classId, (klass) => ({
        attributes: klass.attributes.filter((attribute) => attribute.id !== attributeId),
      }));
    },
    [patchClass],
  );

  const addMethod = useCallback(
    (classId: string, method: Partial<UMLMethod> = {}) => {
      patchClass(classId, (klass) => ({ methods: [...klass.methods, createMethod(method)] }));
    },
    [patchClass],
  );

  const updateMethod = useCallback(
    (classId: string, methodId: string, patch: Partial<UMLMethod>) => {
      patchClass(classId, (klass) => ({
        methods: klass.methods.map((method) =>
          method.id === methodId ? { ...method, ...patch, id: methodId } : method,
        ),
      }));
    },
    [patchClass],
  );

  const removeMethod = useCallback(
    (classId: string, methodId: string) => {
      patchClass(classId, (klass) => ({ methods: klass.methods.filter((method) => method.id !== methodId) }));
    },
    [patchClass],
  );

  // ---------------------------------------------------------- relationships ---
  const addRelationship = useCallback(
    (kind: RelationshipKind, sourceId: string, targetId: string): string | null => {
      const state = diagramRef.current;
      if (sourceId === targetId) {
        notify('A class cannot be related to itself', 'error');
        return null;
      }
      const duplicate = state.relationships.some(
        (rel) => rel.kind === kind && rel.sourceId === sourceId && rel.targetId === targetId,
      );
      if (duplicate) {
        notify(`That ${RELATIONSHIP_META[kind].label.toLowerCase()} already exists`, 'error');
        return null;
      }
      if ((kind === 'inheritance' || kind === 'realization') && createsInheritanceCycle(state.relationships, sourceId, targetId)) {
        notify('Circular inheritance is not allowed', 'error');
        return null;
      }

      const relationship = createRelationship(kind, sourceId, targetId);
      dispatch({ type: 'relationship/add', relationship });
      setSelection({ kind: 'relationship', id: relationship.id });
      notify(`${RELATIONSHIP_META[kind].label} created`, 'success');
      return relationship.id;
    },
    [notify],
  );

  const updateRelationship = useCallback(
    (id: string, patch: Partial<Omit<UMLRelationship, 'id'>>) => {
      if (patch.sourceId && patch.targetId && patch.sourceId === patch.targetId) {
        notify('A class cannot be related to itself', 'error');
        return;
      }
      dispatch({ type: 'relationship/update', id, patch });
    },
    [notify],
  );

  const deleteRelationship = useCallback(
    (id: string) => {
      dispatch({ type: 'relationship/delete', id });
      if (selectionRef.current?.id === id) setSelection(null);
    },
    [],
  );

  const deleteSelection = useCallback(() => {
    const current = selectionRef.current;
    if (!current) return;
    if (current.kind === 'class') deleteClass(current.id);
    else deleteRelationship(current.id);
    setSelection(null);
  }, [deleteClass, deleteRelationship]);

  // --------------------------------------------------------- connect mode ---
  const beginConnect = useCallback((kind: RelationshipKind, sourceId: string | null = null) => {
    setConnect({ kind, sourceId });
    setSelection(null);
  }, []);

  const cancelConnect = useCallback(() => setConnect(null), []);

  const pickConnectSource = useCallback((id: string) => {
    setConnect((current) => ({ kind: current?.kind ?? 'association', sourceId: id }));
  }, []);

  const completeConnect = useCallback(
    (targetId: string): boolean => {
      const current = connectRef.current;
      if (!current?.sourceId) return false;
      const created = addRelationship(current.kind, current.sourceId, targetId);
      setConnect(null);
      return created !== null;
    },
    [addRelationship],
  );

  // ------------------------------------------------------------- history ---
  const undo = useCallback(() => dispatch({ type: 'history/undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'history/redo' }), []);
  const commitHistory = useCallback(() => dispatch({ type: 'history/commit' }), []);

  // ------------------------------------------------------ diagram actions ---
  const replaceDiagram = useCallback((next: Diagram) => {
    dispatch({ type: 'diagram/replace', diagram: next });
    setSelection(null);
  }, []);

  const clearDiagram = useCallback(() => {
    dispatch({ type: 'diagram/clear' });
    setSelection(null);
    setConnect(null);
    notify('Diagram cleared', 'info');
  }, [notify]);

  const loadSample = useCallback(() => {
    dispatch({ type: 'diagram/replace', diagram: createSampleDiagram() });
    setSelection(null);
    setConnect(null);
    setViewState(INITIAL_VIEW);
    notify('Sample diagram loaded', 'success');
  }, [notify]);

  // ------------------------------------------------------------- viewport ---
  const setView = useCallback((updater: ViewState | ((current: ViewState) => ViewState)) => {
    setViewState((current) => (typeof updater === 'function' ? updater(current) : updater));
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setViewState((current) =>
      zoomAround(current, sizeRef.current.width / 2, sizeRef.current.height / 2, factor),
    );
  }, []);

  const resetView = useCallback(() => setViewState(INITIAL_VIEW), []);

  const fitToContent = useCallback(() => fitTo(sizeRef.current, diagramRef.current.classes), [fitTo]);

  const focusClass = useCallback((id: string) => {
    const klass = diagramRef.current.classes.find((entry) => entry.id === id);
    if (!klass) return;
    const rect = getNodeRect(klass);
    const size = sizeRef.current;
    setViewState((current) => ({
      ...current,
      x: size.width / 2 - (rect.x + rect.width / 2) * current.k,
      y: size.height / 2 - (rect.y + rect.height / 2) * current.k,
    }));
  }, []);

  const stats = useMemo(
    () => ({
      classes: diagram.classes.length,
      attributes: diagram.classes.reduce((total, klass) => total + klass.attributes.length, 0),
      methods: diagram.classes.reduce((total, klass) => total + klass.methods.length, 0),
      relationships: diagram.relationships.length,
    }),
    [diagram],
  );

  const value = useMemo<DiagramContextValue>(
    () => ({
      classes: diagram.classes,
      relationships: diagram.relationships,
      stats,
      selection,
      select,
      selectClass,
      selectRelationship,
      clearSelection,
      deleteSelection,
      addClass,
      updateClass,
      moveClass,
      deleteClass,
      duplicateClass,
      addAttribute,
      updateAttribute,
      removeAttribute,
      addMethod,
      updateMethod,
      removeMethod,
      addRelationship,
      updateRelationship,
      deleteRelationship,
      connect,
      beginConnect,
      pickConnectSource,
      completeConnect,
      cancelConnect,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      undo,
      redo,
      commitHistory,
      replaceDiagram,
      clearDiagram,
      loadSample,
      view,
      viewportSize,
      setViewportSize: updateViewportSize,
      setView,
      zoomBy,
      resetView,
      fitToContent,
      focusClass,
      renameToken,
      requestRename,
    }),
    [
      diagram,
      stats,
      selection,
      select,
      selectClass,
      selectRelationship,
      clearSelection,
      deleteSelection,
      addClass,
      updateClass,
      moveClass,
      deleteClass,
      duplicateClass,
      addAttribute,
      updateAttribute,
      removeAttribute,
      addMethod,
      updateMethod,
      removeMethod,
      addRelationship,
      updateRelationship,
      deleteRelationship,
      connect,
      beginConnect,
      pickConnectSource,
      completeConnect,
      cancelConnect,
      history.past.length,
      history.future.length,
      undo,
      redo,
      commitHistory,
      replaceDiagram,
      clearDiagram,
      loadSample,
      view,
      viewportSize,
      updateViewportSize,
      setView,
      zoomBy,
      resetView,
      fitToContent,
      focusClass,
      renameToken,
      requestRename,
    ],
  );

  return <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>;
}

export function useDiagram(): DiagramContextValue {
  const context = useContext(DiagramContext);
  if (!context) throw new Error('useDiagram must be used inside a <DiagramProvider>');
  return context;
}
