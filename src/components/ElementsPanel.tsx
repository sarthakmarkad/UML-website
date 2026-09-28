import { RELATIONSHIP_KINDS, RELATIONSHIP_META, STEREOTYPE_LABELS, type UMLClass } from '../types/uml';
import { useDiagram } from '../state/DiagramContext';
import { Icon } from './common/Icons';
import { RelationGlyph } from './canvas/RelationGlyph';

function ClassListItem({ klass }: { klass: UMLClass }) {
  const { selection, selectClass, focusClass, deleteClass, duplicateClass } = useDiagram();
  const selected = selection?.kind === 'class' && selection.id === klass.id;

  return (
    <li className={`list-item${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className="list-item__main"
        onClick={() => {
          selectClass(klass.id);
          focusClass(klass.id);
        }}
      >
        <span className="list-item__name">{klass.name.trim() || 'Unnamed'}</span>
        <span className="list-item__meta">
          {STEREOTYPE_LABELS[klass.stereotype]} · {klass.attributes.length} attr · {klass.methods.length} mth
        </span>
      </button>
      <span className="list-item__actions">
        <button
          type="button"
          className="icon-button icon-button--tiny"
          title={`Duplicate ${klass.name}`}
          aria-label={`Duplicate ${klass.name}`}
          onClick={() => duplicateClass(klass.id)}
        >
          <Icon name="copy" size={14} />
        </button>
        <button
          type="button"
          className="icon-button icon-button--tiny icon-button--danger"
          title={`Delete ${klass.name}`}
          aria-label={`Delete ${klass.name}`}
          onClick={() => deleteClass(klass.id)}
        >
          <Icon name="trash" size={14} />
        </button>
      </span>
    </li>
  );
}

export function ElementsPanel() {
  const { classes, relationships, selection, addClass, connect, beginConnect, cancelConnect, selectRelationship, deleteRelationship, stats } =
    useDiagram();

  const classById = new Map(classes.map((klass) => [klass.id, klass]));
  const nameOf = (id: string) => classById.get(id)?.name.trim() || 'Unnamed';

  return (
    <div className="panel">
      <div className="panel__section">
        <div className="panel__heading">
          <h2>Classes</h2>
          <span className="badge">{stats.classes}</span>
        </div>
        <button type="button" className="button button--primary button--block" onClick={addClass}>
          <Icon name="plus" size={16} />
          Add class
        </button>
        {classes.length === 0 ? (
          <p className="panel__hint">No classes yet. Add one to start modelling.</p>
        ) : (
          <ul className="list">
            {classes.map((klass) => (
              <ClassListItem key={klass.id} klass={klass} />
            ))}
          </ul>
        )}
      </div>

      <div className="panel__section">
        <div className="panel__heading">
          <h2>New relationship</h2>
          {connect && (
            <button type="button" className="link-button" onClick={cancelConnect}>
              Cancel
            </button>
          )}
        </div>
        <div className="palette">
          {RELATIONSHIP_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`palette__card${connect?.kind === kind ? ' is-active' : ''}`}
              onClick={() => (connect?.kind === kind ? cancelConnect() : beginConnect(kind))}
            >
              <RelationGlyph kind={kind} width={62} />
              <span className="palette__label">{RELATIONSHIP_META[kind].label}</span>
            </button>
          ))}
        </div>
        <p className="panel__hint">
          {connect
            ? connect.sourceId
              ? 'Now click the target class on the canvas.'
              : 'Click the source class on the canvas.'
            : 'Pick a type, then click two classes. You can also drag the dot on the right edge of any class.'}
        </p>
      </div>

      <div className="panel__section">
        <div className="panel__heading">
          <h2>Relationships</h2>
          <span className="badge">{stats.relationships}</span>
        </div>
        {relationships.length === 0 ? (
          <p className="panel__hint">No relationships yet.</p>
        ) : (
          <ul className="list">
            {relationships.map((relationship) => (
              <li
                key={relationship.id}
                className={`list-item${selection?.kind === 'relationship' && selection.id === relationship.id ? ' is-selected' : ''}`}
              >
                <button type="button" className="list-item__main" onClick={() => selectRelationship(relationship.id)}>
                  <span className="list-item__name">
                    {nameOf(relationship.sourceId)} <Icon name="arrowRight" size={12} /> {nameOf(relationship.targetId)}
                  </span>
                  <span className="list-item__meta" style={{ color: RELATIONSHIP_META[relationship.kind].color }}>
                    {RELATIONSHIP_META[relationship.kind].label}
                    {relationship.label.trim() ? ` · ${relationship.label.trim()}` : ''}
                  </span>
                </button>
                <span className="list-item__actions">
                  <button
                    type="button"
                    className="icon-button icon-button--tiny icon-button--danger"
                    title="Delete relationship"
                    aria-label="Delete relationship"
                    onClick={() => deleteRelationship(relationship.id)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
