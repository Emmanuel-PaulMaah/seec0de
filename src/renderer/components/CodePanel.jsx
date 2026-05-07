import React, { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Lock, Unlock, Sparkles, Loader } from 'lucide-react';
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

export default function CodePanel({
  generatedCode,
  selectedLanguages,
  onCodeChange,
  onSelectionExplain,
  onAiExplain,
  aiLoading,
}) {
  const tabs = ['pseudocode', ...selectedLanguages];
  const [activeTab, setActiveTab] = useState('pseudocode');
  const [editable, setEditable] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [selection, setSelection] = useState(null);
  const [btnPos, setBtnPos] = useState(null);
  const editorRef = useRef(null);

  const displayTab = tabs.includes(activeTab) ? activeTab : 'pseudocode';
  const isPseudocode = displayTab === 'pseudocode';

  const value = isPseudocode
    ? generatedCode.pseudocode || ''
    : (generatedCode.code && generatedCode.code[displayTab]) || '';

  const monacoLang = isPseudocode
    ? 'plaintext'
    : LANGUAGE_MONACO_MAP[displayTab] || 'plaintext';

  const clearSelection = useCallback(() => {
    setSelection(null);
    setBtnPos(null);
  }, []);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (!model) return;
      const selectedText = model.getValueInRange(e.selection);
      if (selectedText.trim()) {
        setSelection(selectedText);
        const coords = editor.getScrolledVisiblePosition(e.selection.getEndPosition());
        if (coords) {
          setBtnPos({ top: coords.top + 30, left: coords.left + 40 });
        }
      } else {
        clearSelection();
      }
    });

    editor.onMouseDown((e) => {
      if (isPseudocode) return;
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
  }, [displayTab, isPseudocode, clearSelection]);

  const handleChange = useCallback((val) => {
    if (!editable) return;
    onCodeChange?.(displayTab, val ?? '');
  }, [editable, displayTab, onCodeChange]);

  const handleExplain = useCallback(() => {
    if (selection && !isPseudocode) {
      onSelectionExplain?.(selection, displayTab);
      clearSelection();
    }
  }, [selection, isPseudocode, displayTab, onSelectionExplain, clearSelection]);

  const handleAiExplain = useCallback(() => {
    if (selection && !isPseudocode) {
      onAiExplain?.(selection, displayTab);
      clearSelection();
    }
  }, [selection, isPseudocode, displayTab, onAiExplain, clearSelection]);

  const showExplainButtons = editable && !isPseudocode && selection && btnPos;

  return (
    <div style={styles.panel}>
      <div style={styles.tabs}>
        <div style={styles.tabList}>
          {tabs.map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(displayTab === tab ? styles.activeTab : {}),
              }}
              onClick={() => { setActiveTab(tab); setTooltip(null); clearSelection(); }}
            >
              {tab === 'pseudocode' ? 'Pseudocode' : (LANGUAGE_LABELS[tab] || tab)}
            </button>
          ))}
        </div>
        <button
          style={{ ...styles.lockBtn, ...(editable ? styles.lockBtnActive : {}) }}
          onClick={() => { setEditable((e) => !e); clearSelection(); setTooltip(null); }}
          title={editable ? 'Switch to read-only' : 'Switch to editable (paste your own code)'}
        >
          {editable
            ? <><Unlock size={12} /> <span style={{ marginLeft: 4 }}>Editable</span></>
            : <><Lock size={12} /> <span style={{ marginLeft: 4 }}>Read-only</span></>}
        </button>
      </div>
      <div style={styles.editorWrap}>
        <Editor
          key={displayTab}
          height="100%"
          language={monacoLang}
          value={value}
          theme="vs-dark"
          onMount={handleEditorMount}
          onChange={handleChange}
          options={{
            readOnly: !editable,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
        {showExplainButtons && (
          <div style={{ ...styles.btnGroup, top: btnPos.top, left: btnPos.left }}>
            <button style={styles.explainBtn} onClick={handleExplain}>
              Explain
            </button>
            <button
              style={{ ...styles.explainBtn, ...styles.aiExplainBtn }}
              onClick={handleAiExplain}
              disabled={aiLoading}
            >
              {aiLoading
                ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : <Sparkles size={12} />}
              <span style={{ marginLeft: 4 }}>AI Explain</span>
            </button>
          </div>
        )}
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
    alignItems: 'stretch',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  tabList: {
    display: 'flex',
    flex: 1,
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
  lockBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-secondary)',
    fontSize: 11,
    padding: '4px 10px',
    margin: '6px 8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  lockBtnActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#ffffff',
  },
  editorWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  btnGroup: {
    position: 'absolute',
    zIndex: 10,
    display: 'flex',
    gap: 4,
  },
  explainBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 3,
    color: '#ffffff',
    fontSize: 12,
    padding: '4px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  aiExplainBtn: {
    background: '#1a6b3c',
  },
};
