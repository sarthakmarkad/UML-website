import type { RelationshipKind, UMLAttribute, UMLClass, UMLMethod, UMLRelationship } from '../types/uml';
import { NODE_METRICS } from '../utils/geometry';
import { createId } from '../utils/id';

export function createAttribute(partial: Partial<UMLAttribute> = {}): UMLAttribute {
  return {
    id: createId('attr'),
    name: 'attribute',
    type: 'String',
    visibility: 'private',
    isStatic: false,
    ...partial,
  };
}

export function createMethod(partial: Partial<UMLMethod> = {}): UMLMethod {
  return {
    id: createId('method'),
    name: 'method',
    params: '',
    returnType: 'void',
    visibility: 'public',
    isStatic: false,
    isAbstract: false,
    ...partial,
  };
}

export function createClass(partial: Partial<UMLClass> = {}): UMLClass {
  return {
    id: createId('class'),
    name: 'NewClass',
    stereotype: 'class',
    x: 0,
    y: 0,
    width: NODE_METRICS.defaultWidth,
    attributes: [],
    methods: [],
    ...partial,
  };
}

export function createRelationship(
  kind: RelationshipKind,
  sourceId: string,
  targetId: string,
  partial: Partial<UMLRelationship> = {},
): UMLRelationship {
  return {
    id: createId('rel'),
    kind,
    sourceId,
    targetId,
    label: '',
    sourceMultiplicity: '',
    targetMultiplicity: '',
    ...partial,
  };
}

/** Picks the first free `Class N` style name. */
export function nextClassName(existing: UMLClass[]): string {
  const taken = new Set(existing.map((klass) => klass.name.trim().toLowerCase()));
  for (let index = 1; index < 1000; index += 1) {
    const candidate = `Class${index}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return 'ClassX';
}
