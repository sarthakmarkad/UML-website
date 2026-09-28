import type { Diagram } from '../types/uml';
import { createAttribute, createClass, createMethod, createRelationship } from './factories';

/**
 * A small teaching example that is loaded on the very first visit so the canvas
 * is never empty and every relationship kind can be inspected right away.
 */
export function createSampleDiagram(): Diagram {
  const drawable = createClass({
    name: 'Drawable',
    stereotype: 'interface',
    x: 120,
    y: 60,
    width: 260,
    methods: [createMethod({ name: 'draw', params: 'ctx: Graphics', returnType: 'void', visibility: 'public', isAbstract: true })],
  });

  const shape = createClass({
    name: 'Shape',
    stereotype: 'abstract',
    x: 120,
    y: 280,
    width: 260,
    attributes: [
      createAttribute({ name: 'color', type: 'String', visibility: 'protected' }),
      createAttribute({ name: 'filled', type: 'boolean', visibility: 'protected' }),
    ],
    methods: [
      createMethod({ name: 'getArea', returnType: 'double', visibility: 'public', isAbstract: true }),
      createMethod({ name: 'getPerimeter', returnType: 'double', visibility: 'public', isAbstract: true }),
    ],
  });

  const circle = createClass({
    name: 'Circle',
    x: 20,
    y: 600,
    width: 230,
    attributes: [createAttribute({ name: 'radius', type: 'double' })],
    methods: [
      createMethod({ name: 'getArea', returnType: 'double' }),
      createMethod({ name: 'getPerimeter', returnType: 'double' }),
    ],
  });

  const rectangle = createClass({
    name: 'Rectangle',
    x: 320,
    y: 600,
    width: 250,
    attributes: [
      createAttribute({ name: 'width', type: 'double' }),
      createAttribute({ name: 'height', type: 'double' }),
    ],
    methods: [
      createMethod({ name: 'getArea', returnType: 'double' }),
      createMethod({ name: 'getPerimeter', returnType: 'double' }),
    ],
  });

  const canvas = createClass({
    name: 'Canvas',
    x: 640,
    y: 280,
    width: 260,
    attributes: [createAttribute({ name: 'name', type: 'String' })],
    methods: [
      createMethod({ name: 'addShape', params: 'shape: Shape', returnType: 'void' }),
      createMethod({ name: 'render', returnType: 'void' }),
    ],
  });

  const renderer = createClass({
    name: 'Renderer',
    x: 660,
    y: 600,
    width: 240,
    attributes: [createAttribute({ name: 'dpi', type: 'int' })],
    methods: [createMethod({ name: 'drawShape', params: 'shape: Shape', returnType: 'void' })],
  });

  return {
    classes: [drawable, shape, circle, rectangle, canvas, renderer],
    relationships: [
      createRelationship('inheritance', circle.id, shape.id),
      createRelationship('inheritance', rectangle.id, shape.id),
      createRelationship('realization', shape.id, drawable.id),
      createRelationship('aggregation', canvas.id, shape.id, { label: 'shapes', targetMultiplicity: '0..*' }),
      createRelationship('dependency', canvas.id, renderer.id),
    ],
  };
}
