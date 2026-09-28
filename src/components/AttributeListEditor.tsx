import { VISIBILITY_LABELS, VISIBILITY_SYMBOLS, type UMLAttribute, type Visibility } from '../types/uml';
import { useDiagram } from '../state/DiagramContext';
import { Icon } from './common/Icons';

const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];

interface AttributeListEditorProps {
  classId: string;
  attributes: UMLAttribute[];
}

export function AttributeListEditor({ classId, attributes }: AttributeListEditorProps) {
  const { addAttribute, updateAttribute, removeAttribute } = useDiagram();

  return (
    <section className="editor">
      <header className="editor__header">
        <h3>Attributes</h3>
        <button type="button" className="button button--tiny" onClick={() => addAttribute(classId)}>
          <Icon name="plus" size={14} />
          Add
        </button>
      </header>

      {attributes.length === 0 && <p className="panel__hint">No attributes yet.</p>}

      {attributes.map((attribute) => (
        <div className="member-row" key={attribute.id}>
          <select
            className="member-row__vis"
            value={attribute.visibility}
            title={VISIBILITY_LABELS[attribute.visibility]}
            aria-label="Attribute visibility"
            onChange={(event) =>
              updateAttribute(classId, attribute.id, { visibility: event.target.value as Visibility })
            }
          >
            {VISIBILITIES.map((visibility) => (
              <option key={visibility} value={visibility}>
                {VISIBILITY_SYMBOLS[visibility]}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={attribute.name}
            placeholder="name"
            aria-label="Attribute name"
            onChange={(event) => updateAttribute(classId, attribute.id, { name: event.target.value })}
          />
          <input
            className="input"
            value={attribute.type}
            placeholder="type"
            aria-label="Attribute type"
            onChange={(event) => updateAttribute(classId, attribute.id, { type: event.target.value })}
          />
          <button
            type="button"
            className={`flag-button${attribute.isStatic ? ' is-active' : ''}`}
            title="Static attribute (underlined in the diagram)"
            aria-pressed={attribute.isStatic}
            onClick={() => updateAttribute(classId, attribute.id, { isStatic: !attribute.isStatic })}
          >
            S
          </button>
          <button
            type="button"
            className="icon-button icon-button--tiny icon-button--danger"
            title="Remove attribute"
            aria-label="Remove attribute"
            onClick={() => removeAttribute(classId, attribute.id)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </section>
  );
}
