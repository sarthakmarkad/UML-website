import { useCallback, useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { ElementsPanel } from './components/ElementsPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { DiagramCanvas } from './components/canvas/DiagramCanvas';
import { CodeModal } from './components/CodeModal';
import { useDiagram } from './state/DiagramContext';
import { useMediaQuery } from './hooks/useMediaQuery';

export default function App() {
  const compact = useMediaQuery('(max-width: 1180px)');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const { selection, undo, redo, deleteSelection, cancelConnect, clearSelection } = useDiagram();

  const closeDrawers = useCallback(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, []);

  // The panels become drawers on small screens; close them again when there is room.
  useEffect(() => {
    if (!compact) closeDrawers();
  }, [compact, closeDrawers]);

  // Selecting something on a phone or tablet should reveal the inspector.
  useEffect(() => {
    if (compact && selection) setRightOpen(true);
  }, [compact, selection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifier && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (modifier && key === 's') {
        event.preventDefault();
        setCodeOpen(true);
        return;
      }
      if (!typing && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        deleteSelection();
        return;
      }
      if (event.key === 'Escape') {
        cancelConnect();
        clearSelection();
        closeDrawers();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelection, cancelConnect, clearSelection, closeDrawers]);

  return (
    <div className="app">
      <Toolbar
        compact={compact}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={() => setLeftOpen((open) => !open)}
        onToggleRight={() => setRightOpen((open) => !open)}
        onOpenCode={() => setCodeOpen(true)}
      />

      <div className="workspace">
        <aside className={`sidebar sidebar--left${leftOpen ? ' is-open' : ''}`} aria-label="Elements">
          <ElementsPanel />
        </aside>

        <main className="workspace__canvas">
          <DiagramCanvas />
        </main>

        <aside className={`sidebar sidebar--right${rightOpen ? ' is-open' : ''}`} aria-label="Properties">
          <PropertiesPanel />
        </aside>

        {compact && (leftOpen || rightOpen) && <div className="scrim" onClick={closeDrawers} />}
      </div>

      <CodeModal open={codeOpen} onClose={() => setCodeOpen(false)} />

      <footer className="app-footer">
        <span className="app-footer__text">Sarthak Markad - CS-H-02 - 12411896</span>
      </footer>
    </div>
  );
}
