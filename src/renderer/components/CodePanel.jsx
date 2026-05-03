import React, { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import KeywordTooltip from './KeywordTooltip';
import { LANGUAGES } from '../engine/languages';

const LANGUAGE_MONACO_MAP = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  typescript: 'typescript',
};

const LANGUAGE_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  typescript: 'TypeScript',
};

export default function CodePanel({ generatedCode, selectedLanguages }) {
  const tabs = ['pseudocode', ...selectedLanguages];
  const [activeTab, setActiveTab] = useState('pseudocode');
  const [tooltip, setTooltip] = useState(null);
  const editorRef = useRef(null);

  const displayTab = tabs.includes(activeTab) ? activeTab : 'pseudocode';

  const value =
    displayTab === 'pseudocode'
      ? generatedCode.pseudocode || ''
      : (generatedCode.code && generatedCode.code[displayTab]) || '';

  const monacoLang =
    displayTab === 'pseudocode'
      ? 'plaintext'
      : LANGUAGE_MONACO_MAP[displayTab] || 'plaintext';

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.onMouseDown((e) => {
      if (displayTab === 'pseudocode') return;
      const pos = e.target.position;
      if (!pos) return;
      const model = editor.getModel();
      if (!model) return;
      const word = model.getWordAtPosition(pos);
      if (!word) return;

      const lang = LANGUAGES[displayTab];
      if (!lang || !lang.glossary[word.word]) return;

      const coords = editor.getScrolledVisiblePosition(pos);
      if (!coords) return;

      const entry = lang.glossary[word.word];
      setTooltip({
        keyword: word.word,
        language: LANGUAGE_LABELS[displayTab] || displayTab,
        definition: entry.definition,
        example: entry.example,
        position: { top: coords.top + 24, left: coords.left + 20 },
      });
    });
  }, [displayTab]);

  return (
    <div style={styles.panel}>
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(displayTab === tab ? styles.activeTab : {}),
            }}
            onClick={() => { setActiveTab(tab); setTooltip(null); }}
          >
            {tab === 'pseudocode' ? 'Pseudocode' : (LANGUAGE_LABELS[tab] || tab)}
          </button>
        ))}
      </div>
      <div style={styles.editorWrap}>
        <Editor
          key={displayTab}
          height="100%"
          language={monacoLang}
          value={value}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
        <KeywordTooltip
          keyword={tooltip?.keyword}
          definition={tooltip?.definition}
          example={tooltip?.example}
          language={tooltip?.language}
          position={tooltip?.position}
          onClose={() => setTooltip(null)}
        />
      </div>
    </div>
  );
}

const styles = {
  panel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    overflow: 'auto',
  },
  tab: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '8px 16px',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s, border-color 0.15s',
  },
  activeTab: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--accent)',
    background: 'var(--bg-primary)',
  },
  editorWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};
