import type { Visibility } from '../../types/uml';
import { buildModel, constructorFields, isAbstractType, type CodeClass, type CodeMethod } from './model';

const BOXED: Record<string, string> = {
  int: 'Integer',
  long: 'Long',
  double: 'Double',
  float: 'Float',
  boolean: 'Boolean',
  char: 'Character',
};

const JAVA_TYPES: Record<string, string> = {
  string: 'String',
  str: 'String',
  text: 'String',
  int: 'int',
  integer: 'int',
  long: 'long',
  float: 'double',
  double: 'double',
  number: 'double',
  decimal: 'double',
  bool: 'boolean',
  boolean: 'boolean',
  char: 'char',
  void: 'void',
  any: 'Object',
  object: 'Object',
  list: 'List',
  date: 'java.time.LocalDate',
};

export function mapJavaType(type: string, multiValued = false): string {
  const trimmed = type.trim();
  const mapped = trimmed ? JAVA_TYPES[trimmed.toLowerCase()] ?? trimmed : 'Object';
  if (!multiValued) return mapped;
  return `List<${BOXED[mapped] ?? mapped}>`;
}

function javaVisibility(visibility: Visibility): string {
  switch (visibility) {
    case 'public':
      return 'public ';
    case 'private':
      return 'private ';
    case 'protected':
      return 'protected ';
    default:
      return '';
  }
}

function javaParams(method: CodeMethod): string {
  return method.params.map((param) => `${mapJavaType(param.type)} ${param.name}`).join(', ');
}

function javaMethod(method: CodeMethod, abstractType: boolean): string {
  const isSignatureOnly = method.isAbstract || abstractType;
  const modifier = isSignatureOnly ? 'abstract ' : '';
  const staticModifier = method.isStatic ? 'static ' : '';
  const decorator = javaVisibility(method.visibility);
  const head = `${decorator}${staticModifier}${modifier}${mapJavaType(method.returnType)} ${method.name}(${javaParams(method)})`;

  if (isSignatureOnly) return `${head};`;
  if (mapJavaType(method.returnType) === 'void') {
    return `${head} {\n        // TODO: implement ${method.name}\n    }`;
  }
  return `${head} {\n        throw new UnsupportedOperationException("TODO: implement ${method.name}");\n    }`;
}

function javaField(field: CodeClass['fields'][number]): string {
  const staticModifier = field.isStatic ? 'static ' : '';
  const type = mapJavaType(field.type, field.multiValued);
  const initializer = field.multiValued ? ' = new ArrayList<>()' : '';
  return `    ${javaVisibility(field.visibility)}${staticModifier}${type} ${field.name}${initializer};`;
}

function javaInterfaceFile(model: CodeClass): string {
  const lines: string[] = [];
  lines.push('package diagram;');
  lines.push('');
  lines.push('/**');
  lines.push(` * ${model.name} — interface generated from the UML class diagram.`);
  if (model.implementsList.length > 0) lines.push(` * Extends ${model.implementsList.join(', ')}.`);
  lines.push(' */');
  lines.push(`public interface ${model.name}${model.implementsList.length > 0 ? ` extends ${model.implementsList.join(', ')}` : ''} {`);
  if (model.fields.length > 0) {
    lines.push('    // Attributes declared on a UML interface become constants in Java:');
    for (const field of model.fields) {
      lines.push(`    // ${mapJavaType(field.type, field.multiValued)} ${field.name.toUpperCase()};`);
    }
    lines.push('');
  }
  for (const method of model.methods) {
    const staticModifier = method.isStatic ? 'static ' : '';
    lines.push(`    ${staticModifier}${mapJavaType(method.returnType)} ${method.name}(${javaParams(method)});`);
  }
  if (model.dependencies.length > 0) {
    lines.push('');
    for (const dependency of model.dependencies) {
      lines.push(`    // Depends on: ${dependency}`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

function javaClassFile(model: CodeClass): string {
  const abstract = isAbstractType(model);
  const lines: string[] = [];
  const collectionField = model.fields.some((field) => field.multiValued);

  lines.push('package diagram;');
  lines.push('');
  if (collectionField) lines.push('import java.util.ArrayList;');
  if (collectionField) lines.push('import java.util.List;');
  if (collectionField) lines.push('');
  lines.push('/**');
  lines.push(` * ${model.name} — generated from the UML class diagram.`);
  if (model.extendsClass) lines.push(` * Extends ${model.extendsClass}.`);
  if (model.implementsList.length > 0) lines.push(` * Implements ${model.implementsList.join(', ')}.`);
  lines.push(' */');
  lines.push(`public ${abstract ? 'abstract ' : ''}class ${model.name}${model.extendsClass ? ` extends ${model.extendsClass}` : ''}${model.implementsList.length > 0 ? ` implements ${model.implementsList.join(', ')}` : ''} {`);

  if (model.fields.length > 0) {
    lines.push('');
    for (const field of model.fields) lines.push(javaField(field));
  }

  const params = constructorFields(model);
  if (params.length > 0) {
    lines.push('');
    lines.push(`    public ${model.name}(${params.map((field) => `${mapJavaType(field.type)} ${field.name}`).join(', ')}) {`);
    for (const field of params) lines.push(`        this.${field.name} = ${field.name};`);
    lines.push('    }');
  }

  if (model.methods.length > 0) {
    lines.push('');
    model.methods.forEach((method, index) => {
      lines.push(`    ${javaMethod(method, abstract)}`);
      if (index < model.methods.length - 1) lines.push('');
    });
  }

  if (model.dependencies.length > 0) {
    lines.push('');
    for (const dependency of model.dependencies) lines.push(`    // Depends on: ${dependency}`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function generateJavaFiles(diagram: Parameters<typeof buildModel>[0]) {
  return buildModel(diagram).map((model) => ({
    name: `${model.name}.java`,
    content: model.stereotype === 'interface' ? javaInterfaceFile(model) : javaClassFile(model),
    className: model.name,
  }));
}
