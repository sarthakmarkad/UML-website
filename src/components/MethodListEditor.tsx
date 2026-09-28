import { VISIBILITY_LABELS, VISIBILITY_SYMBOLS, type UMLMethod, type Visibility } from '../types/uml';
import { useDiagram } from '../state/DiagramContext';
import { Icon } from './common/Icons';

const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];

interface MethodListEditorProps {
  classId: string;
  methods: UMLMethod[];
}

export function MethodListEditor({ classId, methods }: MethodListEditorProps) {
  const { addMethod, updateMethod, removeMethod } = useDiagram();

  return (
    <section className="editor">
      <header className="editor__header">
        <h3>Methods</h3>
        <button type="button" className="button button--tiny" onClick={() => addMethod(classId)}>
          <Icon name="plus" size={14} />
          Add
        </button>
      </header>

      {methods.length === 0 && <p className="panel__hint">No methods yet.</p>}

      {methods.map((method) => (
        <div className="member-card" key={method.id}>
          <div className="member-row member-row--method">
            <select
              className="member-row__vis"
              value={method.visibility}
              title={VISIBILITY_LABELS[method.visibility]}
              aria-label="Method visibility"
              onChange={(event) => updateMethod(classId, method.id, { visibility: event.target.value as Visibility })}
            >
              {VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {VISIBILITY_SYMBOLS[visibility]}
                </option>
              ))}
            </select>
            <input
              className="input"
              value={method.name}
              placeholder="name"
              aria-label="Method name"
              onChange={(event) => updateMethod(classId, method.id, { name: event.target.value })}
            />
            <input
              className="input"
              value={method.returnType}
              placeholder="returns"
              aria-label="Method return type"
              onChange={(event) => updateMethod(classId, method.id, { returnType: event.target.value })}
            />
            <button
              type="button"
              className="icon-button icon-button--tiny icon-button--danger"
              title="Remove method"
              aria-label="Remove method"
              onClick={() => removeMethod(classId, method.id)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          <div className="member-row member-row--params">
            <input
              className="input"
              value={method.params}
              placeholder="parameters, e.g. name: String, count: int"
              aria-label="Method parameters"
              onChange={(event) => updateMethod(classId, method.id, { params: event.target.value })}
            />
            <button
              type="button"
              className={`flag-button${method.isStatic ? ' is-active' : ''}`}
              title="Static method"
              aria-pressed={method.isStatic}
              onClick={() => updateMethod(classId, method.id, { isStatic: !method.isStatic })}
            >
              S
            </button>
            <button
              type="button"
              className={`flag-button${method.isAbstract ? ' is-active' : ''}`}
              title="Abstract method"
              aria-pressed={method.isAbstract}
              onClick={() => updateMethod(classId, method.id, { isAbstract: !method.isAbstract })}
            >
              A
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
