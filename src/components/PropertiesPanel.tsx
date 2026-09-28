import { useEffect, useRef } from 'react';
import {
  RELATIONSHIP_KINDS,
  RELATIONSHIP_META,
  STEREOTYPE_LABELS,
  type Stereotype,
  type UMLClass,
  type UMLRelationship,
} from '../types/uml';
import { useDiagram } from '../state/DiagramContext';
import { NODE_METRICS } from '../utils/geometry';
import { AttributeListEditor } from './AttributeListEditor';
import { MethodListEditor } from './MethodListEditor';
import { Icon } from './common/Icons';
import { RelationGlyph } from './canvas/RelationGlyph';

const STEREOTYPES: Stereotype[] = ['class', 'abstract', 'interface'];

function ClassInspector({ klass }: { klass: UMLClass }) {
  const { updateClass, deleteClass, duplicateClass, renameToken } = useDiagram();
  const nameRef = useRef<HTMLInputElement>(null);

  // Double clicking a class on the canvas focuses this field.
  useEffect(() => {
    if (renameToken === 0) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [renameToken]);

  return (
    <div className="panel__section">
      <div className="panel__heading">
        <h2>Class</h2>
        <span className="badge">{STEREOTYPE_LABELS[klass.stereotype]}</span>
      </div>

      <label className="field">
        <span className="field__label">Name</span>
        <input
          ref={nameRef}
          className="input"
          value={klass.name}
          placeholder="ClassName"
          onChange={(event) => updateClass(klass.id, { name: event.target.value })}
        />
      </label>

      <div className="field">
        <span className="field__label">Stereotype</span>
        <div className="segmented">
          {STEREOTYPES.map((stereotype) => (
            <button
              key={stereotype}
              type="button"
              className={`segmented__item${klass.stereotype === stereotype ? ' is-active' : ''}`}
              onClick={() => updateClass(klass.id, { stereotype })}
            >
              {STEREOTYPE_LABELS[stereotype]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field__label">
          Width <span className="field__value">{klass.width}px</span>
        </span>
        <input
          type="range"
          min={NODE_METRICS.minWidth}
          max={NODE_METRICS.maxWidth}
          step={10}
          value={klass.width}
          onChange={(event) => updateClass(klass.id, { width: Number(event.target.value) })}
        />
      </label>

      <AttributeListEditor classId={klass.id} attributes={klass.attributes} />
      <MethodListEditor classId={klass.id} methods={klass.methods} />

      <p className="panel__hint">
        Visibility: + public · - private · # protected · ~ package. Static members render underlined, abstract methods
        italic.
      </p>

      <div className="panel__actions">
        <button type="button" className="button button--ghost" onClick={() => duplicateClass(klass.id)}>
          <Icon name="copy" size={16} />
          Duplicate
        </button>
        <button type="button" className="button button--danger" onClick={() => deleteClass(klass.id)}>
          <Icon name="trash" size={16} />
          Delete class
        </button>
      </div>
    </div>
  );
}

function RelationshipInspector({ relationship }: { relationship: UMLRelationship }) {
  const { classes, updateRelationship, deleteRelationship } = useDiagram();
  const meta = RELATIONSHIP_META[relationship.kind];

  const handleEndChange = (patch: { sourceId?: string; targetId?: string }) => {
    updateRelationship(relationship.id, {
      sourceId: patch.sourceId ?? relationship.sourceId,
      targetId: patch.targetId ?? relationship.targetId,
    });
  };

  const swapEnds = () => {
    updateRelationship(relationship.id, {
      sourceId: relationship.targetId,
      targetId: relationship.sourceId,
      sourceMultiplicity: relationship.targetMultiplicity,
      targetMultiplicity: relationship.sourceMultiplicity,
    });
  };

  return (
    <div className="panel__section">
      <div className="panel__heading">
        <h2>Relationship</h2>
        <RelationGlyph kind={relationship.kind} width={54} />
      </div>

      <label className="field">
        <span className="field__label">Type</span>
        <select
          className="input"
          value={relationship.kind}
          onChange={(event) => updateRelationship(relationship.id, { kind: event.target.value as UMLRelationship['kind'] })}
        >
          {RELATIONSHIP_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {RELATIONSHIP_META[kind].label}
            </option>
          ))}
        </select>
      </label>
      <p className="panel__hint">{meta.hint}</p>

      <label className="field">
        <span className="field__label">Source class</span>
        <select
          className="input"
          value={relationship.sourceId}
          onChange={(event) => handleEndChange({ sourceId: event.target.value })}
        >
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name.trim() || 'Unnamed'}
            </option>
          ))}
        </select>
      </label>

      <div className="field field--center">
        <button type="button" className="button button--ghost button--tiny" onClick={swapEnds}>
          <Icon name="refresh" size={14} />
          Swap ends
        </button>
      </div>

      <label className="field">
        <span className="field__label">Target class</span>
        <select
          className="input"
          value={relationship.targetId}
          onChange={(event) => handleEndChange({ targetId: event.target.value })}
        >
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name.trim() || 'Unnamed'}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Label (optional)</span>
        <input
          className="input"
          value={relationship.label}
          placeholder="e.g. owns, manages"
          onChange={(event) => updateRelationship(relationship.id, { label: event.target.value })}
        />
      </label>

      {meta.multiplicities && (
        <div className="field-grid">
          <label className="field">
            <span className="field__label">Source multiplicity</span>
            <input
              className="input"
              value={relationship.sourceMultiplicity}
              placeholder="1"
              onChange={(event) => updateRelationship(relationship.id, { sourceMultiplicity: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Target multiplicity</span>
            <input
              className="input"
              value={relationship.targetMultiplicity}
              placeholder="0..*"
              onChange={(event) => updateRelationship(relationship.id, { targetMultiplicity: event.target.value })}
            />
          </label>
        </div>
      )}

      <p className="panel__hint">
        Tip: a target multiplicity such as <code>0..*</code> generates a collection field in the code output.
      </p>

      <div className="panel__actions">
        <button type="button" className="button button--danger" onClick={() => deleteRelationship(relationship.id)}>
          <Icon name="trash" size={16} />
          Delete relationship
        </button>
      </div>
    </div>
  );
}

function EmptyInspector() {
  const { stats } = useDiagram();

  return (
    <div className="panel__section">
      <div className="panel__heading">
        <h2>Properties</h2>
      </div>
      <p className="panel__hint">
        Select a class or a relationship on the canvas to edit it. Double click a class to rename it.
      </p>
      <dl className="stats">
        <div>
          <dt>Classes</dt>
          <dd>{stats.classes}</dd>
        </div>
        <div>
          <dt>Attributes</dt>
          <dd>{stats.attributes}</dd>
        </div>
        <div>
          <dt>Methods</dt>
          <dd>{stats.methods}</dd>
        </div>
        <div>
          <dt>Relationships</dt>
          <dd>{stats.relationships}</dd>
        </div>
      </dl>
      <ul className="shortcuts">
        <li>
          <kbd>Drag</kbd> a class to move it
        </li>
        <li>
          <kbd>Double click</kbd> to rename
        </li>
        <li>
          <kbd>Del</kbd> removes the selection
        </li>
        <li>
          <kbd>Ctrl</kbd> + <kbd>Z</kbd> undo
        </li>
        <li>
          <kbd>Ctrl</kbd> + <kbd>S</kbd> generate code
        </li>
      </ul>
    </div>
  );
}

export function PropertiesPanel() {
  const { selection, classes, relationships } = useDiagram();

  const klass = selection?.kind === 'class' ? classes.find((entry) => entry.id === selection.id) : undefined;
  const relationship =
    selection?.kind === 'relationship' ? relationships.find((entry) => entry.id === selection.id) : undefined;

  return (
    <div className="panel">
      {klass ? (
        <ClassInspector key={klass.id} klass={klass} />
      ) : relationship ? (
        <RelationshipInspector key={relationship.id} relationship={relationship} />
      ) : (
        <EmptyInspector />
      )}
    </div>
  );
}
