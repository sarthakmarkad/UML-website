import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  computeEdgeGeometry,
  NODE_METRICS,
  nodeHeight,
  perpendicular,
  pointOnRectBorder,
  snap,
  zoomAround,
  type Rect,
} from './geometry';

const box = (x: number, y: number, width = 100, height = 50): Rect => ({ x, y, width, height });

describe('nodeHeight', () => {
  it('keeps room for one placeholder row per empty section', () => {
    const height =
      NODE_METRICS.borderWidth * 2 + NODE_METRICS.headerHeight + 2 * NODE_METRICS.rowHeight + NODE_METRICS.sectionPaddingY * 4;
    expect(nodeHeight({ attributes: [], methods: [] })).toBe(height);
  });

  it('grows by one row per member', () => {
    const empty = nodeHeight({ attributes: [], methods: [] });
    const withTwo = nodeHeight({ attributes: [{ id: 'a' } as never, { id: 'b' } as never], methods: [] });
    expect(withTwo - empty).toBe(NODE_METRICS.rowHeight);
  });
});

describe('pointOnRectBorder', () => {
  const rect = box(0, 0);

  it('clips a horizontal ray to the right edge', () => {
    expect(pointOnRectBorder(rect, { x: 400, y: 25 })).toEqual({ x: 100, y: 25 });
  });

  it('clips a vertical ray to the bottom edge', () => {
    expect(pointOnRectBorder(rect, { x: 50, y: 400 })).toEqual({ x: 50, y: 50 });
  });

  it('clips a diagonal ray to the corner', () => {
    expect(pointOnRectBorder(rect, { x: 200, y: 100 })).toEqual({ x: 100, y: 50 });
  });

  it('falls back to the centre when both points coincide', () => {
    expect(pointOnRectBorder(rect, { x: 50, y: 25 })).toEqual({ x: 50, y: 25 });
  });
});

describe('computeEdgeGeometry', () => {
  it('connects the facing borders of two boxes', () => {
    const geometry = computeEdgeGeometry(box(0, 0), box(300, 0));
    expect(geometry.start).toEqual({ x: 100, y: 25 });
    expect(geometry.end).toEqual({ x: 300, y: 25 });
    expect(geometry.mid).toEqual({ x: 200, y: 25 });
    expect(geometry.length).toBe(200);
  });

  it('shifts the whole line sideways for a non zero offset', () => {
    const geometry = computeEdgeGeometry(box(0, 0), box(300, 0), 10);
    expect(geometry.start).toEqual({ x: 100, y: 35 });
    expect(geometry.end).toEqual({ x: 300, y: 35 });
  });

  it('computes a unit normal', () => {
    expect(perpendicular({ x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: -0, y: 1 });
  });
});

describe('viewport helpers', () => {
  it('keeps the anchor point pinned while zooming', () => {
    const zoomed = zoomAround({ x: 0, y: 0, k: 1 }, 100, 100, 2);
    expect(zoomed).toEqual({ k: 2, x: -100, y: -100 });
    // The diagram point that was under the anchor stays under the anchor.
    expect((100 - zoomed.x) / zoomed.k).toBe(100);
  });

  it('clamps zoom to the supported range', () => {
    expect(zoomAround({ x: 0, y: 0, k: 2.4 }, 0, 0, 4).k).toBe(2.5);
    expect(zoomAround({ x: 0, y: 0, k: 0.4 }, 0, 0, 0.1).k).toBe(0.3);
  });

  it('snaps to the 10px grid', () => {
    expect(snap(23)).toBe(20);
    expect(snap(26)).toBe(30);
  });
});

describe('boundsOf', () => {
  it('returns null for an empty diagram', () => {
    expect(boundsOf([])).toBeNull();
  });

  it('wraps every rectangle', () => {
    expect(boundsOf([box(0, 0), box(200, 100, 50, 50)])).toEqual({ x: 0, y: 0, width: 250, height: 150 });
  });
});
