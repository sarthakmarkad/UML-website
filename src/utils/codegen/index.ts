import type { Diagram } from '../../types/uml';
import { generateJavaFiles } from './java';
import { generatePythonFiles } from './python';
import { generateTypeScriptFiles } from './typescript';

export type CodeLanguage = 'java' | 'typescript' | 'python';

export interface GeneratedFile {
  name: string;
  content: string;
  className: string;
}

export interface LanguageMeta {
  label: string;
  extension: string;
  /** Shown in the export dialog. */
  note: string;
}

export const LANGUAGE_META: Record<CodeLanguage, LanguageMeta> = {
  java: {
    label: 'Java',
    extension: '.java',
    note: 'One file per class. Inheritance becomes `extends`, realization `implements`, associations become fields.',
  },
  typescript: {
    label: 'TypeScript',
    extension: '.ts',
    note: 'ES modules with typed fields, constructors and import statements for related classes.',
  },
  python: {
    label: 'Python',
    extension: '.py',
    note: 'PEP 8 style classes with type hints. Annotations are lazy via `from __future__ import annotations`.',
  },
};

export const CODE_LANGUAGES = Object.keys(LANGUAGE_META) as CodeLanguage[];

/** Generates one source file per class in the diagram. */
export function generateFiles(diagram: Diagram, language: CodeLanguage): GeneratedFile[] {
  switch (language) {
    case 'java':
      return generateJavaFiles(diagram);
    case 'typescript':
      return generateTypeScriptFiles(diagram);
    case 'python':
      return generatePythonFiles(diagram);
    default:
      return [];
  }
}

export { buildModel } from './model';
