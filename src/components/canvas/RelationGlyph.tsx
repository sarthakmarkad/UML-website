import { RELATIONSHIP_META, type RelationshipKind } from '../../types/uml';

interface RelationGlyphProps {
  kind: RelationshipKind;
  width?: number;
}

/**
 * Miniature preview of a UML relationship notation, shared by the palette and
 * the canvas legend so both always show exactly what gets drawn.
 */
export function RelationGlyph({ kind, width = 64 }: RelationGlyphProps) {
  const meta = RELATIONSHIP_META[kind];
  const height = 18;
  const y = height / 2;
  const startX = 6;
  const endX = width - 6;
  const color = meta.color;
  const dash = meta.dashed ? '5 4' : undefined;

  const endMarker: Record<RelationshipKind, string | null> = {
    association: 'arrow',
    aggregation: null,
    composition: null,
    inheritance: 'triangle',
    realization: 'triangle',
    dependency: 'arrow',
  };

  const startMarker: Record<RelationshipKind, string | null> = {
    association: null,
    aggregation: 'diamond',
    composition: 'diamond-filled',
    inheritance: null,
    realization: null,
    dependency: null,
  };

  const end = endMarker[kind];
  const start = startMarker[kind];

  return (
    <svg className="relation-glyph" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <line
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        stroke={color}
        strokeWidth={1.8}
        strokeDasharray={dash}
      />
      {end === 'arrow' && (
        <path d={`M${endX - 9} ${y - 5} L${endX} ${y} L${endX - 9} ${y + 5}`} fill="none" stroke={color} strokeWidth={1.8} />
      )}
      {end === 'triangle' && (
        <path d={`M${endX - 11} ${y - 6} L${endX} ${y} L${endX - 11} ${y + 6} Z`} fill="#ffffff" stroke={color} strokeWidth={1.6} />
      )}
      {start === 'diamond' && (
        <path d={`M${startX} ${y} L${startX + 8} ${y - 5} L${startX + 16} ${y} L${startX + 8} ${y + 5} Z`} fill="#ffffff" stroke={color} strokeWidth={1.6} />
      )}
      {start === 'diamond-filled' && (
        <path d={`M${startX} ${y} L${startX + 8} ${y - 5} L${startX + 16} ${y} L${startX + 8} ${y + 5} Z`} fill={color} stroke={color} strokeWidth={1.4} />
      )}
    </svg>
  );
}
