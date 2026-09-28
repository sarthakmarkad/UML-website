/**
 * Core domain model for the UML class diagram editor.
 * Everything in the app (canvas, panels, code generators) is derived from these types.
 */

export type Visibility = 'public' | 'private' | 'protected' | 'package';

export const VISIBILITY_SYMBOLS: Record<Visibility, string> = {
  public: '+',
  private: '-',
  protected: '#',
  package: '~',
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: 'public (+)',
  private: 'private (-)',
  protected: 'protected (#)',
  package: 'package (~)',
};

/** `class` is a plain class, the other two change how the diagram and code are rendered. */
export type Stereotype = 'class' | 'abstract' | 'interface';

export interface UMLAttribute {
  id: string;
  name: string;
  /** Empty string means "not specified"; each language generator picks a default. */
  type: string;
  visibility: Visibility;
  isStatic: boolean;
}

export interface UMLMethod {
  id: string;
  name: string;
  /** Canonical format: `name: type, other: type` (the `: type` part is optional). */
  params: string;
  returnType: string;
  visibility: Visibility;
  isStatic: boolean;
  isAbstract: boolean;
}

export interface UMLClass {
  id: string;
  name: string;
  stereotype: Stereotype;
  x: number;
  y: number;
  width: number;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
}

export type RelationshipKind =
  | 'association'
  | 'aggregation'
  | 'composition'
  | 'inheritance'
  | 'realization'
  | 'dependency';

export interface UMLRelationship {
  id: string;
  kind: RelationshipKind;
  sourceId: string;
  targetId: string;
  label: string;
  sourceMultiplicity: string;
  targetMultiplicity: string;
}

export interface Diagram {
  classes: UMLClass[];
  relationships: UMLRelationship[];
}

export interface Selection {
  kind: 'class' | 'relationship';
  id: string;
}

export interface RelationshipMeta {
  label: string;
  /** Short form used in dense UI (palette cards, legend, tables). */
  short: string;
  /** Shown as helper text so users know which class is the source and which is the target. */
  hint: string;
  dashed: boolean;
  color: string;
  /** Whether multiplicities are meaningful for this kind. */
  multiplicities: boolean;
}

/** Single source of truth for how each relationship kind looks and reads. */
export const RELATIONSHIP_META: Record<RelationshipKind, RelationshipMeta> = {
  association: {
    label: 'Association',
    short: 'A — B',
    hint: 'Source references target (drawn as a plain line with an open arrow head).',
    dashed: false,
    color: '#2563eb',
    multiplicities: true,
  },
  aggregation: {
    label: 'Aggregation',
    short: 'A ◇— B',
    hint: 'Source (whole) owns target (part); the part can exist on its own.',
    dashed: false,
    color: '#0891b2',
    multiplicities: true,
  },
  composition: {
    label: 'Composition',
    short: 'A ◆— B',
    hint: 'Source (whole) owns target (part); the part cannot exist on its own.',
    dashed: false,
    color: '#be123c',
    multiplicities: true,
  },
  inheritance: {
    label: 'Inheritance',
    short: 'Child ▷ Parent',
    hint: 'Source is the subclass, target is the superclass.',
    dashed: false,
    color: '#7c3aed',
    multiplicities: false,
  },
  realization: {
    label: 'Realization',
    short: 'Class ▷ Interface',
    hint: 'Source implements the interface it points at (dashed line, hollow triangle).',
    dashed: true,
    color: '#0d9488',
    multiplicities: false,
  },
  dependency: {
    label: 'Dependency',
    short: 'A ⋯> B',
    hint: 'Source temporarily uses or depends on target (dashed line, open arrow).',
    dashed: true,
    color: '#ea580c',
    multiplicities: false,
  },
};

export const RELATIONSHIP_KINDS = Object.keys(RELATIONSHIP_META) as RelationshipKind[];

export const STEREOTYPE_LABELS: Record<Stereotype, string> = {
  class: 'Class',
  abstract: 'Abstract class',
  interface: 'Interface',
};

export const EMPTY_DIAGRAM: Diagram = { classes: [], relationships: [] };
