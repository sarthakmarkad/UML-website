import { useMemo, useState } from 'react';
import { useDiagram } from '../state/DiagramContext';
import { useToast } from '../hooks/useToast';
import { downloadTextFile } from '../state/storage';
import { CODE_LANGUAGES, LANGUAGE_META, generateFiles, type CodeLanguage } from '../utils/codegen';
import { Modal } from './common/Modal';
import { Icon } from './common/Icons';

interface CodeModalProps {
  open: boolean;
  onClose: () => void;
}

export function CodeModal({ open, onClose }: CodeModalProps) {
  const { classes, relationships } = useDiagram();
  const { notify } = useToast();
  const [language, setLanguage] = useState<CodeLanguage>('java');
  const [activeIndex, setActiveIndex] = useState(0);

  const files = useMemo(() => generateFiles({ classes, relationships }, language), [classes, relationships, language]);
  const index = Math.min(activeIndex, Math.max(files.length - 1, 0));
  const file = files[index] ?? null;
  const lineCount = file ? file.content.split('\n').length : 0;

  const selectLanguage = (next: CodeLanguage) => {
    setLanguage(next);
    setActiveIndex(0);
  };

  const handleCopy = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.content);
      notify(`${file.name} copied to clipboard`, 'success');
    } catch {
      notify('Copying is blocked by the browser — select the code manually', 'error');
    }
  };

  const handleDownload = () => {
    if (!file) return;
    downloadTextFile(file.name, file.content);
    notify(`Saved ${file.name}`, 'success');
  };

  const handleDownloadAll = () => {
    files.forEach((entry, position) => {
      window.setTimeout(() => downloadTextFile(entry.name, entry.content), position * 250);
    });
    notify(`Downloading ${files.length} files`, 'success');
  };

  return (
    <Modal
      open={open}
      size="lg"
      title="Generate code"
      subtitle="One source file per class, derived from the classes and the relationships between them."
      onClose={onClose}
      footer={
        files.length > 0 ? (
          <div className="modal__actions">
            <button type="button" className="button button--ghost" onClick={handleDownloadAll}>
              <Icon name="download" size={16} />
              Download all ({files.length})
            </button>
            <button type="button" className="button button--ghost" onClick={handleCopy}>
              <Icon name="copy" size={16} />
              Copy file
            </button>
            <button type="button" className="button button--primary" onClick={handleDownload}>
              <Icon name="download" size={16} />
              Download {file?.name ?? ''}
            </button>
          </div>
        ) : null
      }
    >
      <div className="tabs" role="tablist">
        {CODE_LANGUAGES.map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={language === entry}
            className={`tabs__item${language === entry ? ' is-active' : ''}`}
            onClick={() => selectLanguage(entry)}
          >
            {LANGUAGE_META[entry].label}
          </button>
        ))}
      </div>

      {files.length === 0 ? (
        <p className="panel__hint">
          Add at least one class to the diagram and the generator will produce {LANGUAGE_META[language].label} code for
          it.
        </p>
      ) : (
        <>
          <p className="code-note">{LANGUAGE_META[language].note}</p>
          <div className="code-layout">
            <ul className="code-files">
              {files.map((entry, position) => (
                <li key={entry.name}>
                  <button
                    type="button"
                    className={`code-files__item${position === index ? ' is-active' : ''}`}
                    onClick={() => setActiveIndex(position)}
                  >
                    <Icon name="file" size={14} />
                    {entry.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="code-view">
              <div className="code-view__bar">
                <span>{file?.name}</span>
                <span className="code-view__meta">{lineCount} lines</span>
              </div>
              <pre className="code-view__code">
                <code>{file?.content}</code>
              </pre>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
