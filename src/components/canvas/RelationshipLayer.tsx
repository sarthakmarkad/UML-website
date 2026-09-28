import { memo } from 'react';
import { RELATIONSHIP_META, type UMLRelationship } from '../../types/uml';
import { pointAlong, type EdgeGeometry } from '../../utils/geometry';

export interface EdgeModel {
  relationship: UMLRelationship;
  geometry: EdgeGeometry;
}

const LINE_COLOR = {
  association: '#2563eb',
  aggregation: '#0891b2',
  composition: '#be123c',
  inheritance: '#7c3aed',
  realization: '#0d9488',
  dependency: '#ea580c',
} as const;

/** Arrow heads and diamonds, drawn once per relationship kind. */
function MarkerDefs() {
  return (
    <defs>
      {(Object.keys(RELATIONSHIP_META) as (keyof typeof RELATIONSHIP_META)[]).map((kind) => {
        const color = LINE_COLOR[kind];
        return (
          <g key={kind}>
            <marker
              id={`uml-end-open-${kind}`}
              viewBox="0 0 14 14"
              markerWidth="14"
              markerHeight="14"
              refX="12"
              refY="7"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M2,1.5 L12,7 L2,12.5" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker
              id={`uml-end-triangle-${kind}`}
              viewBox="0 0 16 16"
              markerWidth="16"
              markerHeight="16"
              refX="14.5"
              refY="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M1,2 L14.5,8 L1,14 Z" fill="#ffffff" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
            </marker>
            <marker
              id={`uml-start-diamond-${kind}`}
              viewBox="0 0 20 16"
              markerWidth="20"
              markerHeight="16"
              refX="0.5"
              refY="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0.5,8 L9,2 L17.5,8 L9,14 Z" fill="#ffffff" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
            </marker>
            <marker
              id={`uml-start-diamond-filled-${kind}`}
              viewBox="0 0 20 16"
              markerWidth="20"
              markerHeight="16"
              refX="0.5"
              refY="8"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0.5,8 L9,2 L17.5,8 L9,14 Z" fill={color} stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
            </marker>
          </g>
        );
      })}
    </defs>
  );
}

function markerFor(kind: keyof typeof RELATIONSHIP_META, position: 'start' | 'end'): string | undefined {
  if (position === 'end') {
    if (kind === 'inheritance' || kind === 'realization') return `url(#uml-end-triangle-${kind})`;
    if (kind === 'association' || kind === 'dependency') return `url(#uml-end-open-${kind})`;
    return undefined;
  }
  if (kind === 'aggregation') return `url(#uml-start-diamond-${kind})`;
  if (kind === 'composition') return `url(#uml-start-diamond-filled-${kind})`;
  return undefined;
}

interface RelationshipLayerProps {
  edges: EdgeModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function RelationshipLayerComponent({ edges, selectedId, onSelect }: RelationshipLayerProps) {
  return (
    <g className="edge-layer">
      <MarkerDefs />
      {edges.map(({ relationship, geometry }) => {
        const meta = RELATIONSHIP_META[relationship.kind];
        const color = LINE_COLOR[relationship.kind];
        const path = `M ${geometry.start.x} ${geometry.start.y} L ${geometry.end.x} ${geometry.end.y}`;
        const selected = relationship.id === selectedId;
        const sourceLabel = relationship.sourceMultiplicity.trim();
        const targetLabel = relationship.targetMultiplicity.trim();
        const nameLabel = relationship.label.trim();

        return (
          <g key={relationship.id} className={`edge${selected ? ' is-selected' : ''}`}>
            <path
              className="edge__hit"
              d={path}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(relationship.id);
              }}
            />
            <path
              className="edge__line"
              d={path}
              stroke={color}
              strokeWidth={selected ? 2.6 : 1.8}
              strokeDasharray={meta.dashed ? '7 5' : undefined}
              markerEnd={markerFor(relationship.kind, 'end')}
              markerStart={markerFor(relationship.kind, 'start')}
            />
            {sourceLabel && (
              <text className="edge__multiplicity" x={pointAlong(geometry, 0.16).x} y={pointAlong(geometry, 0.16, -8).y}>
                {sourceLabel}
              </text>
            )}
            {targetLabel && (
              <text className="edge__multiplicity" x={pointAlong(geometry, 0.84).x} y={pointAlong(geometry, 0.84, -8).y}>
                {targetLabel}
              </text>
            )}
            {nameLabel && (
              <text className="edge__label" x={pointAlong(geometry, 0.5).x} y={pointAlong(geometry, 0.5, -10).y}>
                {nameLabel}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export const RelationshipLayer = memo(RelationshipLayerComponent);
