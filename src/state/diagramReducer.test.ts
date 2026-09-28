import { describe, expect, it } from 'vitest';
import { createClass, createRelationship } from './factories';
import { createHistoryState, historyReducer, type DiagramAction } from './diagramReducer';
import type { Diagram } from '../types/uml';

function setup(): { state: ReturnType<typeof createHistoryState>; klassId: string; otherId: string; relId: string } {
  const klass = createClass({ name: 'A' });
  const other = createClass({ name: 'B' });
  const relationship = createRelationship('association', klass.id, other.id);
  const diagram: Diagram = { classes: [klass, other], relationships: [relationship] };
  return { state: createHistoryState(diagram), klassId: klass.id, otherId: other.id, relId: relationship.id };
}

const apply = (state: ReturnType<typeof createHistoryState>, ...actions: DiagramAction[]) =>
  actions.reduce(historyReducer, state);

describe('historyReducer', () => {
  it('adds a class and keeps one undo step', () => {
    const { state } = setup();
    const next = apply(state, { type: 'class/add', klass: createClass({ name: 'C' }) });

    expect(next.present.classes).toHaveLength(3);
    expect(next.past).toHaveLength(1);
    expect(next.future).toHaveLength(0);
  });

  it('removes relationships that point at a deleted class', () => {
    const { state, klassId } = setup();
    const next = apply(state, { type: 'class/delete', id: klassId });

    expect(next.present.classes).toHaveLength(1);
    expect(next.present.relationships).toHaveLength(0);
  });

  it('restores the class and its relationships on undo', () => {
    const { state, klassId } = setup();
    const deleted = apply(state, { type: 'class/delete', id: klassId });
    const undone = apply(deleted, { type: 'history/undo' });

    expect(undone.present.classes).toHaveLength(2);
    expect(undone.present.relationships).toHaveLength(1);
    expect(undone.future).toHaveLength(1);
  });

  it('coalesces rapid moves of the same class into a single revision', () => {
    const { state, klassId } = setup();
    const moved = apply(
      state,
      { type: 'class/move', id: klassId, x: 10, y: 10 },
      { type: 'class/move', id: klassId, x: 20, y: 20 },
      { type: 'class/move', id: klassId, x: 30, y: 30 },
    );

    expect(moved.past).toHaveLength(1);
    expect(moved.present.classes[0]).toMatchObject({ x: 30, y: 30 });

    const committed = apply(moved, { type: 'history/commit' }, { type: 'class/move', id: klassId, x: 40, y: 40 });
    expect(committed.past).toHaveLength(2);
  });

  it('clears the redo stack once a new change happens', () => {
    const { state, klassId } = setup();
    const moved = apply(state, { type: 'class/move', id: klassId, x: 10, y: 10 });
    const undone = apply(moved, { type: 'history/undo' });
    const redone = apply(undone, { type: 'history/redo' });

    expect(redone.present.classes[0]).toMatchObject({ x: 10, y: 10 });
    expect(redone.future).toHaveLength(0);
  });

  it('ignores undo when there is nothing to undo', () => {
    const { state } = setup();
    expect(apply(state, { type: 'history/undo' })).toBe(state);
  });

  it('updates relationship endpoints and properties', () => {
    const { state, relId, klassId } = setup();
    const third = createClass({ name: 'C' });
    const withThird = apply(state, { type: 'class/add', klass: third });
    const updated = apply(withThird, {
      type: 'relationship/update',
      id: relId,
      patch: { targetId: third.id, label: 'x' },
    });

    expect(updated.present.relationships[0]).toMatchObject({
      sourceId: klassId,
      targetId: third.id,
      label: 'x',
    });
  });

  it('clears the diagram but keeps it undoable', () => {
    const { state } = setup();
    const cleared = apply(state, { type: 'diagram/clear' });

    expect(cleared.present.classes).toHaveLength(0);
    expect(apply(cleared, { type: 'history/undo' }).present.classes).toHaveLength(2);
  });
});
