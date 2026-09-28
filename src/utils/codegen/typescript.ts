import type { Visibility } from '../../types/uml';
import { buildModel, constructorFields, isAbstractType, type CodeClass, type CodeMethod } from './model';

const TS_TYPES: Record<string, string> = {
  string: 'string',
  str: 'string',
  text: 'string',
  varchar: 'string',
  int: 'number',
  integer: 'number',
  long: 'number',
  float: 'number',
  double: 'number',
  number: 'number',
  decimal: 'number',
  bool: 'boolean',
  boolean: 'boolean',
  void: 'void',
  none: 'void',
  any: 'any',
  object: 'any',
  obj: 'any',
  date: 'Date',
  datetime: 'Date',
  list: 'unknown[]',
  array: 'unknown[]',
};

export function mapTsType(type: string, multiValued = false): string {
  const trimmed = type.trim();
  const mapped = trimmed ? TS_TYPES[trimmed.toLowerCase()] ?? trimmed : 'any';
  if (!multiValued || mapped.endsWith('[]')) return mapped;
  return `${mapped}[]`;
}

function tsVisibility(visibility: Visibility): string {
  return visibility === 'package' ? '' : `${visibility} `;
}

function tsParams(method: CodeMethod): string {
  return method.params.map((param) => `${param.name}: ${mapTsType(param.type)}`).join(', ');
}

function tsMethod(method: CodeMethod): string {
  const head = `${tsVisibility(method.visibility)}${method.isStatic ? 'static ' : ''}${method.isAbstract ? 'abstract ' : ''}${method.name}(${tsParams(method)}): ${mapTsType(method.returnType)}`;
  if (method.isAbstract) return `  ${head};`;
  return `  ${head} {\n    // TODO: implement ${method.name}\n  }`;
}

function tsClassBody(model: CodeClass): string[] {
  const lines: string[] = [];
  const params = constructorFields(model);

  for (const field of model.fields) {
    const modifier = `${tsVisibility(field.visibility)}${field.isStatic ? 'static ' : ''}`.trimStart();
    const initializer = field.multiValued ? ' = []' : '';
    lines.push(`  ${modifier}${field.name}: ${mapTsType(field.type, field.multiValued)}${initializer};`);
  }

  if (params.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(`  constructor(${params.map((field) => `${field.name}: ${mapTsType(field.type)}`).join(', ')}) {`);
    for (const field of params) lines.push(`    this.${field.name} = ${field.name};`);
    lines.push('  }');
  }

  if (model.methods.length > 0) {
    if (lines.length > 0) lines.push('');
    model.methods.forEach((method, index) => {
      lines.push(tsMethod(method));
      if (index < model.methods.length - 1) lines.push('');
    });
  }

  if (model.dependencies.length > 0) {
    lines.push('');
    for (const dependency of model.dependencies) lines.push(`  // Depends on: ${dependency}`);
  }

  return lines;
}

function tsInterfaceFile(model: CodeClass): string {
  const imports = collectInterfaceImports(model);
  const lines: string[] = [];
  if (imports.length > 0) {
    for (const entry of imports) lines.push(entry);
    lines.push('');
  }
  lines.push('/**');
  lines.push(` * ${model.name} — interface generated from the UML class diagram.`);
  lines.push(' */');
  const parents = [...(model.extendsClass ? [model.extendsClass] : []), ...model.implementsList];
  lines.push(`export interface ${model.name}${parents.length > 0 ? ` extends ${parents.join(', ')}` : ''} {`);
  for (const field of model.fields) {
    lines.push(`  ${field.name}: ${mapTsType(field.type, field.multiValued)};`);
  }
  if (model.fields.length > 0 && model.methods.length > 0) lines.push('');
  model.methods.forEach((method, index) => {
    lines.push(`  ${method.name}(${tsParams(method)}): ${mapTsType(method.returnType)};`);
    if (index < model.methods.length - 1) lines.push('');
  });
  if (model.dependencies.length > 0) {
    lines.push('');
    for (const dependency of model.dependencies) lines.push(`  // Depends on: ${dependency}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function collectClassImports(model: CodeClass, interfaceFile: boolean): string[] {
  const valueImports = new Set<string>();
  const typeImports = new Set<string>();

  if (model.extendsClass) valueImports.add(model.extendsClass);
  if (!interfaceFile) for (const entry of model.implementsList) valueImports.add(entry);
  for (const field of model.fields) if (field.fromAssociation) typeImports.add(field.type);
  for (const dependency of model.dependencies) typeImports.add(dependency);

  for (const name of valueImports) typeImports.delete(name);

  const lines: string[] = [];
  for (const name of [...valueImports].sort()) lines.push(`import { ${name} } from './${name}';`);
  for (const name of [...typeImports].sort()) lines.push(`import type { ${name} } from './${name}';`);
  return lines;
}

function collectInterfaceImports(model: CodeClass): string[] {
  return collectClassImports(model, true);
}

function tsClassFile(model: CodeClass): string {
  const abstract = isAbstractType(model);
  const lines: string[] = [];
  const imports = collectClassImports(model, false);
  if (imports.length > 0) {
    for (const entry of imports) lines.push(entry);
    lines.push('');
  }
  lines.push('/**');
  lines.push(` * ${model.name} — generated from the UML class diagram.`);
  if (model.extendsClass) lines.push(` * Extends ${model.extendsClass}.`);
  if (model.implementsList.length > 0) lines.push(` * Implements ${model.implementsList.join(', ')}.`);
  lines.push(' */');
  lines.push(
    `export ${abstract ? 'abstract ' : ''}class ${model.name}${model.extendsClass ? ` extends ${model.extendsClass}` : ''}${model.implementsList.length > 0 ? ` implements ${model.implementsList.join(', ')}` : ''} {`,
  );
  const body = tsClassBody(model);
  lines.push(...body);
  lines.push('}');
  return lines.join('\n');
}

export function generateTypeScriptFiles(diagram: Parameters<typeof buildModel>[0]) {
  return buildModel(diagram).map((model) => ({
    name: `${model.name}.ts`,
    content: model.stereotype === 'interface' ? tsInterfaceFile(model) : tsClassFile(model),
    className: model.name,
  }));
}
