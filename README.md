# UML Studio — Class Diagram Editor

A responsive React application for drawing **UML class diagrams** in the browser and
generating **Java, TypeScript or Python** source code from them.

Built with React 18 + TypeScript + Vite. No diagram library — the canvas, the UML
notation (arrows, triangles, diamonds), the interaction model and the code generators
are all implemented in this repository.

---

## Features

**Modelling**
- Create, rename, duplicate and delete classes from the toolbar, the elements panel or the canvas.
- Each class holds **attributes** and **methods** with UML visibility (`+ public`, `- private`, `# protected`, `~ package`), return types, parameter lists and `static` / `abstract` flags.
- Stereotypes: **class**, **abstract class**, **interface** — rendered with the `«abstract»` / `«interface»` marker.
- Relationships: **association, aggregation, composition, inheritance, realization, dependency**, each drawn with the correct UML notation (open arrow, hollow triangle, hollow/filled diamond, dashed lines).
- Optional relationship **label** and end **multiplicities** (`1`, `0..1`, `0..*`).
- Validation: no self-relationships, no duplicate relationships, no circular inheritance.

**Canvas**
- Drag classes to arrange the diagram (10 px grid snap), pan the canvas, zoom with the wheel, buttons or "fit to screen".
- Start a relationship either from the palette (*pick a type, click two classes*) or by dragging the round handle on the right edge of a class onto another class.
- Edges attach to the border of the class boxes, fan out automatically when several relationships share the same pair, and are clickable for editing.
- Live connection preview while drawing a relationship.
- UML notation legend, zoom controls and an empty state on the canvas.

**Editing experience**
- Properties inspector for the selected class or relationship, with inline list editors for attributes and methods.
- Undo / redo with sensible grouping (a whole drag or a typing burst is one step).
- Toasts for feedback, keyboard shortcuts, `Escape` to cancel, `Del` to remove the selection.
- Persistence: the diagram is stored in `localStorage` and restored on reload.
- JSON export / import for sharing or backup.
- Responsive layout: three columns on desktop, slide-over drawers with a scrim on tablets and phones; fully usable with touch (pointer events, no hover-only affordances).

**Code generation**
- Generates one file per class for **Java**, **TypeScript** and **Python**.
- Relationships become real code: inheritance → `extends`, realization → `implements`, associations/aggregations/compositions → fields (collections when the target multiplicity is `*`), dependencies → comments/imports.
- File browser, syntax-highlighted-ish dark code view, copy to clipboard, download one file or all of them.

---

## Getting started

```bash
npm install        # if your shell has NODE_ENV=production use: npm install --include=dev
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm test           # unit tests (vitest)
npm run typecheck  # tsc --noEmit
```

---

## Using the editor

| Action | How |
| --- | --- |
| Add a class | **Add class** in the elements panel (or the canvas empty state) |
| Rename a class | Select it, edit **Name** in the inspector — or double-click it on the canvas |
| Move a class | Drag it with the mouse or a finger |
| Add attributes / methods | **Add** inside the *Attributes* / *Methods* editors in the inspector |
| Change visibility / flags | `+ - # ~` dropdown, `S` = static, `A` = abstract |
| Add a relationship | Pick a type in **New relationship**, then click the source and the target class |
| Faster alternative | Drag the round handle on the right edge of a class onto another class |
| Edit a relationship | Click the line — or the entry in the relationships list |
| Delete | Select something and press `Del`, or use the trash button |
| Pan / zoom | Drag the background / mouse wheel, `+` `-` buttons, or the fit button |

Keyboard shortcuts:

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` or `Ctrl + Y` | Redo |
| `Ctrl/Cmd + S` | Open the code generator |
| `Del` / `Backspace` | Delete the selected class or relationship |
| `Escape` | Cancel the pending connection / clear the selection / close drawers |

---

## How the diagram maps to code

| Diagram element | Java | TypeScript | Python |
| --- | --- | --- | --- |
| Attribute `- radius: double` | `private double radius;` | `private radius: number;` | `self.__radius = radius` |
| Static / abstract member | `static` / `abstract` | `static` / `abstract` | class attribute / `@abstractmethod` |
| `interface` stereotype | `public interface` (signatures only) | `export interface` | class with `ABC` |
| Inheritance | `class Child extends Parent` | `extends Parent` | `class Child(Parent)` |
| Realization | `implements Interface` | `implements Interface` | added to the base list |
| Association (multiplicity `0..*`) | `private List<Item> items = new ArrayList<>();` | `private items: Item[] = [];` | `self.__items: List[Item] = []` |
| Dependency | `// Depends on: X` | `import type { X }` | `# Depends on: X` |

Types that are left empty default to `Object` (Java), `any` (TypeScript) and `Any`
(Python). Common types are translated (`String` → `str`, `bool` → `boolean`, `double` → `number`, …).
Generated method bodies are stubs (`throw new UnsupportedOperationException(...)`, `// TODO: implement`,
`raise NotImplementedError`) as a starting point for the real implementation.

---

## Project structure

```
src/
├── types/uml.ts              Domain model + relationship metadata (single source of truth)
├── state/
│   ├── DiagramContext.tsx    Context provider: document, selection, connect mode, viewport
│   ├── diagramReducer.ts     Pure reducer with undo/redo history and edit coalescing
│   ├── factories.ts          Object factories for classes, members and relationships
│   ├── sampleDiagram.ts      Teaching example loaded on first visit
│   └── storage.ts            localStorage + JSON import/export (validates untrusted data)
├── utils/
│   ├── geometry.ts           Node metrics, border intersection, edge geometry, zoom maths
│   └── codegen/              Language independent model + Java / TypeScript / Python writers
├── components/
│   ├── Toolbar.tsx           Undo/redo, sample, import, export, clear, generate code
│   ├── ElementsPanel.tsx     Class list, relationship palette, relationship list
│   ├── PropertiesPanel.tsx   Inspector for the selection (or diagram statistics)
│   ├── AttributeListEditor.tsx / MethodListEditor.tsx
│   ├── CodeModal.tsx         File browser + code viewer
│   ├── common/               Icon set, modal shell
│   └── canvas/               DiagramCanvas, ClassNode, RelationshipLayer, legend, glyphs
└── index.css                 Design tokens, component styles, responsive rules
```

### Architecture notes

- **State management** — a single `useReducer` holds the diagram; every edit goes through a
  typed action (`class/add`, `class/move`, `relationship/update`, …). `DiagramContext`
  exposes the state plus stable, memoised action helpers, so components never mutate data directly.
- **Undo/redo** — the reducer keeps `past | present | future` snapshots. Rapid edits with the same
  key (dragging a class, typing a name) are coalesced into one revision within a 700 ms window,
  and `history/commit` closes the group when the pointer is released.
- **Geometry** — node heights are derived from the content with the same metrics used by the CSS,
  so relationship lines always start and end exactly on a class border instead of overlapping it.
- **Rendering** — HTML for the class boxes (crisp text, easy forms) plus a single SVG layer for the
  edges and markers, both inside one transformed viewport container.

---

## Tests

35 unit tests cover the parts where bugs would be silent:

- `geometry.test.ts` — border intersection, edge offsets, zoom anchoring, grid snapping.
- `codegen.test.ts` — model building from relationships and the generated Java/TypeScript/Python output.
- `diagramReducer.test.ts` — cascading deletes, undo/redo, edit coalescing.

```bash
npm test
```

---

## Known limitations

- Only class diagrams (no sequence/use-case diagrams).
- Associations are modelled in one direction (no bidirectional navigation flags).
- Packages/namespaces and generics are not part of the model; class names are used as file names.
- Python output assumes each file lives in the same package; imports are emitted as comments.
