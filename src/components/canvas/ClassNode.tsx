import { memo, type PointerEvent as ReactPointerEvent } from 'react';
import { VISIBILITY_SYMBOLS, type UMLAttribute, type UMLClass, type UMLMethod } from '../../types/uml';

interface ClassNodeProps {
  klass: UMLClass;
  selected: boolean;
  /** True while this class is the pending source of a new relationship. */
  isConnectSource: boolean;
  /** True while a connection is being dragged and the cursor is over this class. */
  isConnectTarget: boolean;
  connectMode: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>, klass: UMLClass) => void;
  onHandlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, klass: UMLClass) => void;
  onDoubleClick: (klass: UMLClass) => void;
}

function AttributeRow({ attribute }: { attribute: UMLAttribute }) {
  return (
    <div className="uml-node__row">
      <span className="uml-node__visibility">{VISIBILITY_SYMBOLS[attribute.visibility]}</span>
      <span className={`uml-node__member${attribute.isStatic ? ' is-static' : ''}`}>
        {attribute.name.trim() || 'attribute'}
      </span>
      {attribute.type.trim() && <span className="uml-node__type">: {attribute.type}</span>}
    </div>
  );
}

function MethodRow({ method }: { method: UMLMethod }) {
  return (
    <div className="uml-node__row">
      <span className="uml-node__visibility">{VISIBILITY_SYMBOLS[method.visibility]}</span>
      <span
        className={`uml-node__member${method.isStatic ? ' is-static' : ''}${method.isAbstract ? ' is-abstract' : ''}`}
      >
        {method.name.trim() || 'method'}({method.params.trim()})
      </span>
      {method.returnType.trim() && <span className="uml-node__type">: {method.returnType}</span>}
    </div>
  );
}

function ClassNodeComponent({
  klass,
  selected,
  isConnectSource,
  isConnectTarget,
  connectMode,
  onPointerDown,
  onHandlePointerDown,
  onDoubleClick,
}: ClassNodeProps) {
  const classNames = [
    'uml-node',
    selected && 'is-selected',
    isConnectSource && 'is-connect-source',
    isConnectTarget && 'is-connect-target',
    connectMode && 'is-connect-mode',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      data-class-id={klass.id}
      style={{ left: klass.x, top: klass.y, width: klass.width }}
      onPointerDown={(event) => onPointerDown(event, klass)}
      onDoubleClick={() => onDoubleClick(klass)}
      role="group"
      aria-label={`${klass.stereotype} ${klass.name}`}
    >
      <div className="uml-node__title">
        {klass.stereotype !== 'class' && (
          <span className="uml-node__stereotype">&laquo;{klass.stereotype}&raquo;</span>
        )}
        <span className="uml-node__title-text">{klass.name.trim() || 'Unnamed'}</span>
      </div>

      <div className="uml-node__section">
        {klass.attributes.length === 0 ? (
          <div className="uml-node__row uml-node__row--empty">no attributes</div>
        ) : (
          klass.attributes.map((attribute) => <AttributeRow key={attribute.id} attribute={attribute} />)
        )}
      </div>

      <div className="uml-node__section">
        {klass.methods.length === 0 ? (
          <div className="uml-node__row uml-node__row--empty">no methods</div>
        ) : (
          klass.methods.map((method) => <MethodRow key={method.id} method={method} />)
        )}
      </div>

      {!connectMode && (
        <button
          type="button"
          className="uml-node__handle"
          title="Drag to another class to create a relationship"
          aria-label={`Connect ${klass.name} to another class`}
          onPointerDown={(event) => onHandlePointerDown(event, klass)}
        />
      )}
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
