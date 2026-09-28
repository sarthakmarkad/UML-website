import type { Diagram, Stereotype, Visibility } from '../../types/uml';

export interface CodeParam {
  name: string;
  /** May be empty — generators substitute a language default. */
  type: string;
}

export interface CodeField {
  name: string;
  type: string;
  visibility: Visibility;
  isStatic: boolean;
  multiValued: boolean;
  /** True when the field was derived from an association rather than typed by the user. */
  fromAssociation: boolean;
}

export interface CodeMethod {
  name: string;
  params: CodeParam[];
  returnType: string;
  visibility: Visibility;
  isStatic: boolean;
  isAbstract: boolean;
}

export interface CodeClass {
  id: string;
  name: string;
  stereotype: Stereotype;
  fields: CodeField[];
  methods: CodeMethod[];
  extendsClass: string | null;
  implementsList: string[];
  /** Classes this class depends on (rendered as comments / imports). */
  dependencies: string[];
}

export function sanitizeIdentifier(raw: string, fallback: string): string {
  const cleaned = raw.trim().replace(/[^A-Za-z0-9_$]/g, '');
  if (!cleaned) return fallback;
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

export function lowerFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function upperFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function pluralize(value: string): string {
  if (!value) return value;
  return /(s|x|z|ch|sh)$/i.test(value) ? `${value}es` : `${value}s`;
}

export function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/** Parses `a: int, b: String` into structured parameters. */
export function parseParams(input: string): CodeParam[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf(':');
      if (separator === -1) {
        return { name: sanitizeIdentifier(part, 'arg'), type: '' };
      }
      const name = sanitizeIdentifier(part.slice(0, separator), 'arg');
      const type = part.slice(separator + 1).trim();
      return { name, type };
    });
}

/** `1`, `0..1` => single value; `*`, `0..*`, `1..*`, `2` => collection. */
export function isMultiValued(multiplicity: string): boolean {
  const value = multiplicity.trim();
  if (!value) return false;
  if (value.includes('*')) return true;
  const numbers = value.match(/\d+/g);
  if (!numbers) return false;
  return numbers.some((entry) => Number(entry) > 1);
}

export function isAbstractType(model: CodeClass): boolean {
  return model.stereotype === 'abstract' || model.methods.some((method) => method.isAbstract);
}

export function signature(model: CodeClass): string {
  const parts: string[] = [];
  if (model.extendsClass) parts.push(`extends ${model.extendsClass}`);
  if (model.implementsList.length > 0) parts.push(`implements ${model.implementsList.join(', ')}`);
  return parts.join(' ');
}

/**
 * Turns the visual diagram into a normalised, language independent model.
 *
 * Attributes and methods come straight from the class boxes, while the
 * relationships enrich the model:
 *  - inheritance  -> `extends`
 *  - realization  -> `implements`
 *  - association / aggregation / composition -> a field referencing the other class
 *  - dependency   -> recorded so generators can emit a comment / import
 */
export function buildModel(diagram: Diagram): CodeClass[] {
  const models = new Map<string, CodeClass>();

  for (const klass of diagram.classes) {
    models.set(klass.id, {
      id: klass.id,
      name: sanitizeIdentifier(klass.name, 'UnnamedClass'),
      stereotype: klass.stereotype,
      fields: klass.attributes.map((attribute) => ({
        name: sanitizeIdentifier(attribute.name, 'field'),
        type: attribute.type.trim(),
        visibility: attribute.visibility,
        isStatic: attribute.isStatic,
        multiValued: false,
        fromAssociation: false,
      })),
      methods: klass.methods.map((method) => ({
        name: sanitizeIdentifier(method.name, 'method'),
        params: parseParams(method.params),
        returnType: method.returnType.trim(),
        visibility: method.visibility,
        isStatic: method.isStatic,
        isAbstract: method.isAbstract || klass.stereotype === 'interface',
      })),
      extendsClass: null,
      implementsList: [],
      dependencies: [],
    });
  }

  for (const relationship of diagram.relationships) {
    const source = models.get(relationship.sourceId);
    const target = models.get(relationship.targetId);
    if (!source || !target || source === target) continue;

    switch (relationship.kind) {
      case 'inheritance': {
        source.extendsClass = target.name;
        break;
      }
      case 'realization': {
        if (!source.implementsList.includes(target.name)) source.implementsList.push(target.name);
        break;
      }
      case 'dependency': {
        if (!source.dependencies.includes(target.name)) source.dependencies.push(target.name);
        break;
      }
      default: {
        const multiValued = isMultiValued(relationship.targetMultiplicity);
        const base = lowerFirst(target.name) || 'item';
        const taken = new Set(source.fields.map((field) => field.name));
        const label = relationship.label.trim();
        // An explicit label wins; otherwise the field is named after the target
        // class and pluralised when the multiplicity says "many".
        const preferred = label ? sanitizeIdentifier(lowerFirst(label), base) : multiValued ? pluralize(base) : base;
        let fieldName = preferred;
        let suffix = 2;
        while (taken.has(fieldName)) {
          fieldName = `${preferred}${suffix}`;
          suffix += 1;
        }
        source.fields.push({
          name: fieldName,
          type: target.name,
          visibility: 'private',
          isStatic: false,
          multiValued,
          fromAssociation: true,
        });
        break;
      }
    }
  }

  return [...models.values()];
}

/** Field names that a constructor should accept (static and collection fields are initialised inline). */
export function constructorFields(model: CodeClass): CodeField[] {
  return model.fields.filter((field) => !field.isStatic && !field.multiValued);
}
