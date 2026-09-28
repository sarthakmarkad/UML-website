import {
  RELATIONSHIP_META,
  type Diagram,
  type RelationshipKind,
  type Stereotype,
  type UMLAttribute,
  type UMLClass,
  type UMLMethod,
  type UMLRelationship,
  type Visibility,
} from '../types/uml';
import { createId } from '../utils/id';
import { NODE_METRICS } from '../utils/geometry';

const STORAGE_KEY = 'uml-studio:diagram:v1';
const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];
const STEREOTYPES: Stereotype[] = ['class', 'abstract', 'interface'];
const RELATIONSHIP_KINDS = Object.keys(RELATIONSHIP_META) as RelationshipKind[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asVisibility(value: unknown, fallback: Visibility): Visibility {
  return typeof value === 'string' && (VISIBILITIES as string[]).includes(value) ? (value as Visibility) : fallback;
}

function asStereotype(value: unknown): Stereotype {
  return typeof value === 'string' && (STEREOTYPES as string[]).includes(value) ? (value as Stereotype) : 'class';
}

function asKind(value: unknown): RelationshipKind | null {
  return typeof value === 'string' && (RELATIONSHIP_KINDS as string[]).includes(value)
    ? (value as RelationshipKind)
    : null;
}

function parseAttribute(value: unknown): UMLAttribute | null {
  if (!isRecord(value)) return null;
  return {
    id: asString(value.id) || createId('attr'),
    name: asString(value.name, 'attribute'),
    type: asString(value.type, ''),
    visibility: asVisibility(value.visibility, 'private'),
    isStatic: asBoolean(value.isStatic),
  };
}

function parseMethod(value: unknown): UMLMethod | null {
  if (!isRecord(value)) return null;
  return {
    id: asString(value.id) || createId('method'),
    name: asString(value.name, 'method'),
    params: asString(value.params, ''),
    returnType: asString(value.returnType, 'void'),
    visibility: asVisibility(value.visibility, 'public'),
    isStatic: asBoolean(value.isStatic),
    isAbstract: asBoolean(value.isAbstract),
  };
}

function parseClass(value: unknown): UMLClass | null {
  if (!isRecord(value)) return null;
  const attributes = (Array.isArray(value.attributes) ? value.attributes : [])
    .map(parseAttribute)
    .filter((entry): entry is UMLAttribute => entry !== null);
  const methods = (Array.isArray(value.methods) ? value.methods : [])
    .map(parseMethod)
    .filter((entry): entry is UMLMethod => entry !== null);

  return {
    id: asString(value.id) || createId('class'),
    name: asString(value.name, 'UnnamedClass'),
    stereotype: asStereotype(value.stereotype),
    x: asNumber(value.x, 40),
    y: asNumber(value.y, 40),
    width: Math.max(NODE_METRICS.minWidth, Math.min(NODE_METRICS.maxWidth, asNumber(value.width, NODE_METRICS.defaultWidth))),
    attributes,
    methods,
  };
}

/**
 * Validates and normalises untrusted JSON (localStorage or an imported file).
 * Anything that cannot be understood is dropped instead of crashing the app.
 */
export function parseDiagram(value: unknown): Diagram | null {
  if (!isRecord(value)) return null;
  const classes = (Array.isArray(value.classes) ? value.classes : [])
    .map(parseClass)
    .filter((entry): entry is UMLClass => entry !== null);
  const classIds = new Set(classes.map((klass) => klass.id));

  const relationships: UMLRelationship[] = [];
  const rawRelationships = Array.isArray(value.relationships) ? value.relationships : [];
  for (const entry of rawRelationships) {
    if (!isRecord(entry)) continue;
    const kind = asKind(entry.kind);
    const sourceId = asString(entry.sourceId);
    const targetId = asString(entry.targetId);
    if (!kind || sourceId === targetId) continue;
    if (!classIds.has(sourceId) || !classIds.has(targetId)) continue;
    relationships.push({
      id: asString(entry.id) || createId('rel'),
      kind,
      sourceId,
      targetId,
      label: asString(entry.label, ''),
      sourceMultiplicity: asString(entry.sourceMultiplicity, ''),
      targetMultiplicity: asString(entry.targetMultiplicity, ''),
    });
  }

  return { classes, relationships };
}

export function loadDiagram(): Diagram | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseDiagram(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDiagram(diagram: Diagram): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diagram));
  } catch {
    /* storage full or unavailable — the session keeps working in memory */
  }
}

export function downloadTextFile(fileName: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
