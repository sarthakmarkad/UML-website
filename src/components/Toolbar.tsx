import { useRef, type ChangeEvent } from 'react';
import { useDiagram } from '../state/DiagramContext';
import { useToast } from '../hooks/useToast';
import { downloadTextFile, parseDiagram } from '../state/storage';
import { Icon } from './common/Icons';

interface ToolbarProps {
  compact: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenCode: () => void;
}

export function Toolbar({ compact, leftOpen, rightOpen, onToggleLeft, onToggleRight, onOpenCode }: ToolbarProps) {
  const { classes, relationships, canUndo, canRedo, undo, redo, replaceDiagram, clearDiagram, loadSample, stats } = useDiagram();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadTextFile('uml-diagram.json', JSON.stringify({ classes, relationships }, null, 2), 'application/json');
    notify('Diagram exported as JSON', 'success');
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseDiagram(JSON.parse(await file.text()));
      if (!parsed) throw new Error('Unsupported structure');
      replaceDiagram(parsed);
      notify(`Imported ${parsed.classes.length} class${parsed.classes.length === 1 ? '' : 'es'}`, 'success');
    } catch {
      notify('That file is not a valid diagram export', 'error');
    }
  };

  const handleClear = () => {
    if (classes.length === 0) return;
    if (window.confirm('Delete every class and relationship from the diagram?')) clearDiagram();
  };

  return (
    <header className="toolbar">
      {compact && (
        <button
          type="button"
          className={`icon-button${leftOpen ? ' is-active' : ''}`}
          onClick={onToggleLeft}
          aria-label="Toggle elements panel"
          title="Elements"
        >
          <Icon name="layers" />
        </button>
      )}

      <div className="toolbar__brand">
        <span className="toolbar__logo">
          <Icon name="box" size={18} />
        </span>
        <span className="toolbar__title">
          UML Studio
          <small>
            {stats.classes} classes · {stats.relationships} relationships
          </small>
        </span>
      </div>

      <div className="toolbar__group">
        <button type="button" className="icon-button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Icon name="undo" />
        </button>
        <button type="button" className="icon-button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <Icon name="redo" />
        </button>
      </div>

      <div className="toolbar__spacer" />

      <div className="toolbar__group">
        <button type="button" className="button button--ghost" onClick={loadSample} title="Load the sample diagram">
          <Icon name="sparkles" size={16} />
          <span className="button__label">Sample</span>
        </button>
        <button type="button" className="button button--ghost" onClick={() => fileInputRef.current?.click()} title="Import a diagram from JSON">
          <Icon name="upload" size={16} />
          <span className="button__label">Import</span>
        </button>
        <button type="button" className="button button--ghost" onClick={handleExport} title="Export the diagram as JSON">
          <Icon name="download" size={16} />
          <span className="button__label">Export</span>
        </button>
        <button type="button" className="button button--ghost button--danger" onClick={handleClear} title="Delete everything">
          <Icon name="trash" size={16} />
          <span className="button__label">Clear</span>
        </button>
      </div>

      <button type="button" className="button button--primary" onClick={onOpenCode} title="Generate code (Ctrl+S)">
        <Icon name="code" size={16} />
        <span>Generate code</span>
      </button>

      {compact && (
        <button
          type="button"
          className={`icon-button${rightOpen ? ' is-active' : ''}`}
          onClick={onToggleRight}
          aria-label="Toggle properties panel"
          title="Properties"
        >
          <Icon name="panels" />
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
    </header>
  );
}
