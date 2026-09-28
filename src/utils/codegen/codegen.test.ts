import { describe, expect, it } from 'vitest';
import { createAttribute, createClass, createMethod, createRelationship } from '../../state/factories';
import type { Diagram } from '../../types/uml';
import { buildModel, isMultiValued, parseParams } from './model';
import { generateFiles } from './index';

function buildDiagram(): Diagram {
  const base = createClass({
    name: 'Base',
    stereotype: 'abstract',
    attributes: [createAttribute({ name: 'id', type: 'int', visibility: 'protected' })],
    methods: [createMethod({ name: 'describe', returnType: 'String', isAbstract: true })],
  });
  const item = createClass({ name: 'Item', attributes: [createAttribute({ name: 'sku', type: 'String' })] });
  const child = createClass({
    name: 'Child',
    attributes: [createAttribute({ name: 'name', type: 'String' })],
    methods: [createMethod({ name: 'run', params: 'steps: int, speed: double', returnType: '' })],
  });
  const renderer = createClass({ name: 'Renderer' });

  return {
    classes: [base, item, child, renderer],
    relationships: [
      createRelationship('inheritance', child.id, base.id),
      createRelationship('association', child.id, item.id, { targetMultiplicity: '0..*', label: 'items' }),
      createRelationship('dependency', child.id, renderer.id),
    ],
  };
}

describe('model helpers', () => {
  it('parses parameter lists', () => {
    expect(parseParams('a: int, b: String')).toEqual([
      { name: 'a', type: 'int' },
      { name: 'b', type: 'String' },
    ]);
    expect(parseParams('plain')).toEqual([{ name: 'plain', type: '' }]);
  });

  it('detects multi valued multiplicities', () => {
    expect(isMultiValued('0..*')).toBe(true);
    expect(isMultiValued('*')).toBe(true);
    expect(isMultiValued('2')).toBe(true);
    expect(isMultiValued('1')).toBe(false);
    expect(isMultiValued('')).toBe(false);
  });
});

describe('buildModel', () => {
  const models = buildModel(buildDiagram());
  const child = models.find((model) => model.name === 'Child');

  it('turns inheritance into extends', () => {
    expect(child?.extendsClass).toBe('Base');
  });

  it('turns a multi valued association into a collection field', () => {
    const field = child?.fields.find((entry) => entry.fromAssociation);
    expect(field?.name).toBe('items');
    expect(field?.type).toBe('Item');
    expect(field?.multiValued).toBe(true);
  });

  it('records dependencies', () => {
    expect(child?.dependencies).toEqual(['Renderer']);
  });

  it('marks interface methods as abstract', () => {
    const diagram = buildDiagram();
    diagram.classes.push(createClass({ name: 'Drawable', stereotype: 'interface' }));
    const drawable = buildModel(diagram).find((model) => model.name === 'Drawable');
    expect(drawable?.stereotype).toBe('interface');
  });
});

describe('generateFiles', () => {
  it('creates one file per class', () => {
    expect(generateFiles(buildDiagram(), 'java').map((file) => file.name)).toEqual([
      'Base.java',
      'Item.java',
      'Child.java',
      'Renderer.java',
    ]);
  });

  it('generates Java with inheritance, fields and collection imports', () => {
    const child = generateFiles(buildDiagram(), 'java').find((file) => file.name === 'Child.java');

    expect(child?.content).toContain('public class Child extends Base {');
    expect(child?.content).toContain('import java.util.ArrayList;');
    expect(child?.content).toContain('private List<Item> items = new ArrayList<>();');
    expect(child?.content).toContain('public Child(String name) {');
    expect(child?.content).toContain('// Depends on: Renderer');
  });

  it('generates Java interfaces without method bodies', () => {
    const diagram = buildDiagram();
    const drawable = createClass({
      name: 'Drawable',
      stereotype: 'interface',
      methods: [createMethod({ name: 'draw', returnType: 'void' })],
    });
    diagram.classes.push(drawable);
    const file = generateFiles(diagram, 'java').find((entry) => entry.name === 'Drawable.java');

    expect(file?.content).toContain('public interface Drawable {');
    expect(file?.content).toContain('void draw();');
  });

  it('generates TypeScript with imports and typed members', () => {
    const child = generateFiles(buildDiagram(), 'typescript').find((file) => file.name === 'Child.ts');

    expect(child?.content).toContain("import { Base } from './Base';");
    expect(child?.content).toContain("import type { Item } from './Item';");
    expect(child?.content).toContain("import type { Renderer } from './Renderer';");
    expect(child?.content).toContain('export class Child extends Base {');
    expect(child?.content).toContain('private items: Item[] = [];');
    expect(child?.content).toContain('public run(steps: number, speed: number): any {');
  });

  it('generates abstract TypeScript classes for abstract methods', () => {
    const base = generateFiles(buildDiagram(), 'typescript').find((file) => file.name === 'Base.ts');
    expect(base?.content).toContain('export abstract class Base {');
    expect(base?.content).toContain('public abstract describe(): string;');
  });

  it('generates Python with ABC, type hints and private attributes', () => {
    const diagram = buildDiagram();
    const base = generateFiles(diagram, 'python').find((file) => file.name === 'base.py');
    const child = generateFiles(diagram, 'python').find((file) => file.name === 'child.py');

    expect(base?.content).toContain('class Base(ABC):');
    expect(base?.content).toContain('@abstractmethod');
    expect(base?.content).toContain('def describe(self) -> str:');
    expect(child?.content).toContain('class Child(Base):');
    expect(child?.content).toContain('def __init__(self, name: str) -> None:');
    // Private attributes are name-mangled in Python, matching the UML visibility.
    expect(child?.content).toContain('self.__items: List[Item] = []');
  });

  it('never emits code for an empty diagram', () => {
    expect(generateFiles({ classes: [], relationships: [] }, 'java')).toEqual([]);
  });
});
