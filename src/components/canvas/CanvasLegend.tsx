import { memo, useState } from 'react';
import { RELATIONSHIP_META, RELATIONSHIP_KINDS, type RelationshipKind } from '../../types/uml';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { RelationGlyph } from './RelationGlyph';

const SHORT_NAMES: Record<RelationshipKind, string> = {
  association: 'Association',
  aggregation: 'Aggregation',
  composition: 'Composition',
  inheritance: 'Inheritance',
  realization: 'Realization',
  dependency: 'Dependency',
};

function CanvasLegendComponent() {
  // The legend would cover too much of a phone screen, so it starts collapsed there.
  const narrow = useMediaQuery('(max-width: 720px)');
  const [open, setOpen] = useState(!narrow);

  return (
    <div className={`legend${open ? ' is-open' : ''}`}>
      <button type="button" className="legend__toggle" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide notation' : 'UML notation'}
      </button>
      {open && (
        <ul className="legend__list">
          {RELATIONSHIP_KINDS.map((kind) => (
            <li key={kind} className="legend__item">
              <RelationGlyph kind={kind} width={54} />
              <span className="legend__text" title={RELATIONSHIP_META[kind].hint}>
                {SHORT_NAMES[kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const CanvasLegend = memo(CanvasLegendComponent);
