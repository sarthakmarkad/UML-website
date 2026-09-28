import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { RELATIONSHIP_META, type UMLClass } from '../../types/uml';
import { useDiagram } from '../../state/DiagramContext';
import { useToast } from '../../hooks/useToast';
import {
  computeEdgeGeometry,
  getNodeRect,
  pointOnRectBorder,
  toCanvasPoint,
  zoomAround,
  type Point,
  type ViewState,
} from '../../utils/geometry';
import { ClassNode } from './ClassNode';
import { RelationshipLayer, type EdgeModel } from './RelationshipLayer';
import { CanvasLegend } from './CanvasLegend';
import { Icon } from '../common/Icons';

type DragState =
  | { type: 'pan'; startX: number; startY: number; view: ViewState }
  | { type: 'node'; id: string; offsetX: number; offsetY: number }
  | { type: 'connect'; sourceId: string };

/** Gap between parallel relationships connecting the same two classes. */
const EDGE_SPACING = 34;

export function DiagramCanvas() {
  const {
    classes,
    relationships,
    selection,
    connect,
    view,
    setViewportSize,
    setView,
    selectClass,
    selectRelationship,
    clearSelection,
    moveClass,
    commitHistory,
    completeConnect,
    cancelConnect,
    pickConnectSource,
    beginConnect,
    addClass,
    fitToContent,
    zoomBy,
    resetView,
    requestRename,
  } = useDiagram();
  const { notify } = useToast();

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const viewRef = useRef(view);
  const connectRef = useRef(connect);
  viewRef.current = view;
  connectRef.current = connect;

  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);

  // Report the canvas size so panels can place new classes in the visible area.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const update = () => setViewportSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [setViewportSize]);

  // Ctrl/⌘ + wheel (and plain wheel) zooms around the pointer.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) => zoomAround(current, event.clientX - bounds.left, event.clientY - bounds.top, factor));
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [setView]);

  // Every drag gesture is tracked through window listeners so it keeps working
  // when the pointer leaves the canvas (or the browser window).
  useEffect(() => {
    const classIdAt = (clientX: number, clientY: number): string | null => {
      const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      return element?.closest<HTMLElement>('[data-class-id]')?.dataset.classId ?? null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.type === 'pan') {
        setView({
          ...drag.view,
          x: drag.view.x + (event.clientX - drag.startX),
          y: drag.view.y + (event.clientY - drag.startY),
        });
        return;
      }

      const point = toCanvasPoint(event.clientX, event.clientY, viewRef.current, containerRef.current);
      if (drag.type === 'node') {
        moveClass(drag.id, point.x - drag.offsetX, point.y - drag.offsetY);
        return;
      }

      setCursorPoint(point);
      setHoverTargetId(classIdAt(event.clientX, event.clientY));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;

      if (drag.type === 'node') {
        commitHistory();
        return;
      }

      if (drag.type === 'connect') {
        const targetId = classIdAt(event.clientX, event.clientY);
        setCursorPoint(null);
        setHoverTargetId(null);
        if (targetId && targetId !== drag.sourceId) {
          completeConnect(targetId);
        } else {
          cancelConnect();
          if (targetId === drag.sourceId) notify('A class cannot be related to itself', 'error');
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [setView, moveClass, commitHistory, completeConnect, cancelConnect, notify]);

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      if (connectRef.current) cancelConnect();
      clearSelection();
      dragRef.current = { type: 'pan', startX: event.clientX, startY: event.clientY, view: viewRef.current };
    },
    [cancelConnect, clearSelection],
  );

  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, klass: UMLClass) => {
      event.stopPropagation();
      if (event.button !== 0 && event.pointerType === 'mouse') return;

      const current = connectRef.current;
      if (current) {
        if (!current.sourceId) pickConnectSource(klass.id);
        else if (current.sourceId === klass.id) cancelConnect();
        else completeConnect(klass.id);
        return;
      }

      selectClass(klass.id);
      const point = toCanvasPoint(event.clientX, event.clientY, viewRef.current, containerRef.current);
      dragRef.current = { type: 'node', id: klass.id, offsetX: point.x - klass.x, offsetY: point.y - klass.y };
    },
    [cancelConnect, completeConnect, pickConnectSource, selectClass],
  );

  const handleHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, klass: UMLClass) => {
      event.stopPropagation();
      const kind = connectRef.current?.kind ?? 'association';
      beginConnect(kind, klass.id);
      dragRef.current = { type: 'connect', sourceId: klass.id };
      setCursorPoint(toCanvasPoint(event.clientX, event.clientY, viewRef.current, containerRef.current));
    },
    [beginConnect],
  );

  const handleNodeDoubleClick = useCallback(
    (klass: UMLClass) => {
      selectClass(klass.id);
      requestRename();
    },
    [requestRename, selectClass],
  );

  // Lay out edges, fanning out the ones that share the same pair of classes.
  const edges = useMemo<EdgeModel[]>(() => {
    const rects = new Map(classes.map((klass) => [klass.id, getNodeRect(klass)]));
    const groups = new Map<string, string[]>();
    for (const relationship of relationships) {
      const key = [relationship.sourceId, relationship.targetId].sort().join('|');
      const list = groups.get(key);
      if (list) list.push(relationship.id);
      else groups.set(key, [relationship.id]);
    }

    const offsets = new Map<string, number>();
    for (const ids of groups.values()) {
      ids.forEach((id, index) => offsets.set(id, (index - (ids.length - 1) / 2) * EDGE_SPACING));
    }

    return relationships.flatMap((relationship) => {
      const source = rects.get(relationship.sourceId);
      const target = rects.get(relationship.targetId);
      if (!source || !target) return [];
      return [{ relationship, geometry: computeEdgeGeometry(source, target, offsets.get(relationship.id) ?? 0) }];
    });
  }, [classes, relationships]);

  const preview = useMemo(() => {
    if (!connect?.sourceId || !cursorPoint) return null;
    const source = classes.find((klass) => klass.id === connect.sourceId);
    if (!source) return null;
    const start = pointOnRectBorder(getNodeRect(source), cursorPoint);
    const meta = RELATIONSHIP_META[connect.kind];
    return { start, end: cursorPoint, color: meta.color, dashed: meta.dashed };
  }, [connect, cursorPoint, classes]);

  const gridSize = 20 * view.k;

  return (
    <div
      className={`canvas${connect ? ' is-connecting' : ''}`}
      ref={containerRef}
      onPointerDown={handleCanvasPointerDown}
      style={{
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
      }}
    >
      <div
        className="canvas__content"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        <svg className="canvas__edges" style={{ overflow: 'visible' }} width="100%" height="100%">
          <RelationshipLayer
            edges={edges}
            selectedId={selection?.kind === 'relationship' ? selection.id : null}
            onSelect={selectRelationship}
          />
          {preview && (
            <line
              className="edge__preview"
              x1={preview.start.x}
              y1={preview.start.y}
              x2={preview.end.x}
              y2={preview.end.y}
              stroke={preview.color}
              strokeWidth={2}
              strokeDasharray={preview.dashed ? '7 5' : undefined}
            />
          )}
        </svg>

        {classes.map((klass) => (
          <ClassNode
            key={klass.id}
            klass={klass}
            selected={selection?.kind === 'class' && selection.id === klass.id}
            isConnectSource={connect?.sourceId === klass.id}
            isConnectTarget={hoverTargetId === klass.id && connect?.sourceId !== klass.id}
            connectMode={connect !== null}
            onPointerDown={handleNodePointerDown}
            onHandlePointerDown={handleHandlePointerDown}
            onDoubleClick={handleNodeDoubleClick}
          />
        ))}
      </div>

      {classes.length === 0 && (
        <div className="canvas__empty">
          <h3>Start your diagram</h3>
          <p>Add a class to begin, or load the sample diagram to explore the editor.</p>
          <button type="button" className="button button--primary" onClick={addClass}>
            <Icon name="plus" />
            Add class
          </button>
        </div>
      )}

      {connect && (
        <div className="canvas__banner">
          <span className={`canvas__banner-dot canvas__banner-dot--${connect.kind}`} />
          {connect.sourceId
            ? `${RELATIONSHIP_META[connect.kind].label}: now click the target class`
            : `${RELATIONSHIP_META[connect.kind].label}: click the source class`}
          <button type="button" className="canvas__banner-cancel" onClick={cancelConnect}>
            Cancel (Esc)
          </button>
        </div>
      )}

      <CanvasLegend />

      <div className="zoom-controls">
        <button type="button" className="zoom-controls__button" onClick={() => zoomBy(1 / 1.2)} title="Zoom out" aria-label="Zoom out">
          <Icon name="zoomOut" size={16} />
        </button>
        <span className="zoom-controls__value">{Math.round(view.k * 100)}%</span>
        <button type="button" className="zoom-controls__button" onClick={() => zoomBy(1.2)} title="Zoom in" aria-label="Zoom in">
          <Icon name="zoomIn" size={16} />
        </button>
        <button type="button" className="zoom-controls__button" onClick={fitToContent} title="Fit diagram to screen" aria-label="Fit diagram to screen">
          <Icon name="fit" size={16} />
        </button>
        <button type="button" className="zoom-controls__button" onClick={resetView} title="Reset zoom" aria-label="Reset zoom">
          <Icon name="refresh" size={16} />
        </button>
      </div>
    </div>
  );
}
