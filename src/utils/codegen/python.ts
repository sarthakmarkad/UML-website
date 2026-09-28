import { buildModel, constructorFields, isAbstractType, toSnakeCase, type CodeClass, type CodeMethod } from './model';

const PY_TYPES: Record<string, string> = {
  string: 'str',
  str: 'str',
  text: 'str',
  varchar: 'str',
  int: 'int',
  integer: 'int',
  long: 'int',
  float: 'float',
  double: 'float',
  number: 'float',
  decimal: 'float',
  bool: 'bool',
  boolean: 'bool',
  void: 'None',
  none: 'None',
  any: 'Any',
  object: 'Any',
  obj: 'Any',
  list: 'List',
  array: 'List',
  date: 'date',
  datetime: 'datetime',
};

export function mapPyType(type: string, multiValued = false): string {
  const trimmed = type.trim();
  const mapped = trimmed ? PY_TYPES[trimmed.toLowerCase()] ?? trimmed : 'Any';
  if (!multiValued) return mapped;
  return `List[${mapped}]`;
}

function attributeName(name: string, visibility: CodeClass['fields'][number]['visibility']): string {
  if (visibility === 'private') return `__${name}`;
  if (visibility === 'protected') return `_${name}`;
  return name;
}

function pyParams(method: CodeMethod): string {
  const params = method.params.map((param) => `${param.name}: ${mapPyType(param.type)}`);
  if (method.isStatic) return params.join(', ');
  return ['self', ...params].join(', ');
}

function pyMethod(method: CodeMethod): string[] {
  const lines: string[] = [];
  if (method.isStatic) lines.push('    @staticmethod');
  if (method.isAbstract) lines.push('    @abstractmethod');
  const returnType = method.returnType.trim() ? mapPyType(method.returnType) : 'None';
  lines.push(`    def ${method.name}(${pyParams(method)}) -> ${returnType}:`);
  if (method.isAbstract) {
    lines.push('        raise NotImplementedError');
  } else if (returnType === 'None') {
    lines.push(`        # TODO: implement ${method.name}`);
    lines.push('        pass');
  } else {
    lines.push(`        raise NotImplementedError("TODO: implement ${method.name}")`);
  }
  return lines;
}

function pythonImports(model: CodeClass): string[] {
  const typing = new Set<string>();
  const note = (type: string, multiValued: boolean) => {
    const mapped = mapPyType(type, multiValued);
    if (mapped.startsWith('List')) typing.add('List');
    if (mapped === 'Any' || mapped.endsWith('[Any]')) typing.add('Any');
  };

  for (const field of model.fields) note(field.type, field.multiValued);
  for (const method of model.methods) {
    note(method.returnType, false);
    for (const param of method.params) note(param.type, false);
  }

  const lines: string[] = ['from __future__ import annotations'];
  if (isAbstractType(model)) lines.push('from abc import ABC, abstractmethod');
  if (typing.size > 0) lines.push(`from typing import ${[...typing].sort().join(', ')}`);
  return lines;
}

function pythonFile(model: CodeClass): string {
  const abstract = isAbstractType(model);
  const lines: string[] = [];
  lines.push(`"""${model.name} — generated from a UML class diagram."""`);
  lines.push('');
  lines.push(...pythonImports(model));
  lines.push('');
  lines.push('');

  const bases = [
    ...(model.extendsClass ? [model.extendsClass] : []),
    ...model.implementsList,
  ];
  if (abstract) bases.push('ABC');

  lines.push(`class ${model.name}${bases.length > 0 ? `(${bases.join(', ')})` : ''}:`);
  const docLines: string[] = [];
  if (model.extendsClass) docLines.push(`Extends ${model.extendsClass}.`);
  if (model.implementsList.length > 0) docLines.push(`Implements ${model.implementsList.join(', ')}.`);
  lines.push(`    """${docLines.length > 0 ? docLines.join(' ') : `Models ${model.name}.`}"""`);
  lines.push('');

  const staticFields = model.fields.filter((field) => field.isStatic);
  for (const field of staticFields) {
    lines.push(`    # static attribute`);
    lines.push(`    ${field.name.toUpperCase()}: ${mapPyType(field.type, field.multiValued)} = None`);
  }
  if (staticFields.length > 0) lines.push('');

  const params = constructorFields(model);
  lines.push(`    def __init__(self${params.length > 0 ? `, ${params.map((field) => `${field.name}: ${mapPyType(field.type)}`).join(', ')}` : ''}) -> None:`);
  if (params.length === 0) {
    lines.push('        pass');
  } else {
    for (const field of params) lines.push(`        self.${attributeName(field.name, field.visibility)} = ${field.name}`);
  }
  for (const field of model.fields.filter((entry) => entry.multiValued && !entry.isStatic)) {
    lines.push(`        self.${attributeName(field.name, field.visibility)}: ${mapPyType(field.type, true)} = []`);
  }

  for (const method of model.methods) {
    lines.push('');
    lines.push(...pyMethod(method));
  }

  if (model.dependencies.length > 0) {
    lines.push('');
    lines.push(`    # Depends on: ${model.dependencies.join(', ')}`);
  }

  return lines.join('\n');
}

export function generatePythonFiles(diagram: Parameters<typeof buildModel>[0]) {
  return buildModel(diagram).map((model) => ({
    name: `${toSnakeCase(model.name)}.py`,
    content: pythonFile(model),
    className: model.name,
  }));
}
