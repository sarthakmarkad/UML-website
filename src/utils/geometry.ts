import type { UMLClass } from '../types/uml';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ViewState {
  x: number;
  y: number;
  k: number;
}

/**
 * Node metrics are shared between the CSS and the geometry code so that edge
 * endpoints always land exactly on the drawn border of a class box.
 * Keep these in sync with `.uml-node` rules in index.css.
 */
export const NODE_METRICS = {
  headerHeight: 38,
  rowHeight: 26,
  sectionPaddingY: 6,
  borderWidth: 2,
  defaultWidth: 240,
  minWidth: 180,
  maxWidth: 420,
} as const;

export const GRID_SIZE = 10;
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2.5;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Height of a class box, derived from its content so edges stay glued to the border. */
export function nodeHeight(klass: Pick<UMLClass, 'attributes' | 'methods'>): number {
  const { headerHeight, rowHeight, sectionPaddingY, borderWidth } = NODE_METRICS;
  const attributeRows = Math.max(klass.attributes.length, 1);
  const methodRows = Math.max(klass.methods.length, 1);
  return borderWidth * 2 + headerHeight + (attributeRows + methodRows) * rowHeight + sectionPaddingY * 4;
}

export function getNodeRect(klass: UMLClass): Rect {
  return { x: klass.x, y: klass.y, width: klass.width, height: nodeHeight(klass) };
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Unit vector pointing from a to b (zero vector when the points coincide). */
export function unitVector(a: Point, b: Point): Point {
  const length = distance(a, b);
  if (length === 0) return { x: 0, y: 0 };
  return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
}

/** Unit normal (perpendicular) of the a→b direction, used to fan out parallel edges. */
export function perpendicular(a: Point, b: Point): Point {
  const unit = unitVector(a, b);
  return { x: -unit.y, y: unit.x };
}

/**
 * Intersection of the ray from the rect centre towards `towards` with the rect border.
 * This is what makes relationship lines stop at the box outline instead of its centre.
 */
export function pointOnRectBorder(rect: Rect, towards: Point): Point {
  const center = rectCenter(rect);
  const dx = towards.x - center.x;
  const dy = towards.y - center.y;
  if (dx === 0 && dy === 0) return center;

  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const t = Math.min(tx, ty);

  return { x: center.x + dx * t, y: center.y + dy * t };
}

export interface EdgeGeometry {
  start: Point;
  end: Point;
  mid: Point;
  normal: Point;
  length: number;
}

/**
 * Straight line between two class boxes, clipped to their borders.
 * `offset` shifts the whole line sideways so several relationships between the
 * same pair of classes do not overlap.
 */
export function computeEdgeGeometry(source: Rect, target: Rect, offset = 0): EdgeGeometry {
  const sourceCenter = rectCenter(source);
  const targetCenter = rectCenter(target);
  const start = pointOnRectBorder(source, targetCenter);
  const end = pointOnRectBorder(target, sourceCenter);
  const normal = perpendicular(start, end);

  const shift = offset === 0 ? { x: 0, y: 0 } : { x: normal.x * offset, y: normal.y * offset };
  const shiftedStart = { x: start.x + shift.x, y: start.y + shift.y };
  const shiftedEnd = { x: end.x + shift.x, y: end.y + shift.y };

  return {
    start: shiftedStart,
    end: shiftedEnd,
    mid: { x: (shiftedStart.x + shiftedEnd.x) / 2, y: (shiftedStart.y + shiftedEnd.y) / 2 },
    normal,
    length: distance(shiftedStart, shiftedEnd),
  };
}

/** Point at fraction `t` (0 = start, 1 = end) along the edge, pushed `push` px along the normal. */
export function pointAlong(edge: EdgeGeometry, t: number, push = 0): Point {
  return {
    x: edge.start.x + (edge.end.x - edge.start.x) * t + edge.normal.x * push,
    y: edge.start.y + (edge.end.y - edge.start.y) * t + edge.normal.y * push,
  };
}

export function boundsOf(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Convert a screen (client) coordinate into diagram space. */
export function toCanvasPoint(clientX: number, clientY: number, view: ViewState, container: HTMLElement | null): Point {
  const bounds = container?.getBoundingClientRect();
  const left = bounds?.left ?? 0;
  const top = bounds?.top ?? 0;
  return { x: (clientX - left - view.x) / view.k, y: (clientY - top - view.y) / view.k };
}

/** Zoom while keeping the point under the cursor pinned to the same spot. */
export function zoomAround(view: ViewState, anchorX: number, anchorY: number, factor: number): ViewState {
  const k = clamp(view.k * factor, MIN_ZOOM, MAX_ZOOM);
  if (k === view.k) return view;
  const ratio = k / view.k;
  return {
    k,
    x: anchorX - (anchorX - view.x) * ratio,
    y: anchorY - (anchorY - view.y) * ratio,
  };
}

export function snap(value: number): number {
  return roundTo(value, GRID_SIZE);
}
