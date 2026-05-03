import React, { useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Sparkles, Loader } from 'lucide-react';
import KeywordTooltip from './KeywordTooltip';
import { LANGUAGES } from '../engine/languages';

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
};

export default function PasteCodePanel({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  onSelectionExplain,
  onAiExplain,
  aiLoading,
}) {
  const editorRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [btnPos, setBtnPos] = useState(null);
  const [tooltip, setTooltip] = useState(null);

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
        setSelection(null);
        setBtnPos(null);
      }
    });

    editor.onMouseDown((e) => {
      const pos = e.target.position;
      if (!pos) return;
      const model = editor.getModel();
      if (!model) return;
      const word = model.getWordAtPosition(pos);
      if (!word) return;

      const lang = LANGUAGES[language];
      if (!lang || !lang.glossary[word.word]) return;

      const coords = editor.getScrolledVisiblePosition(pos);
      if (!coords) return;

      const entry = lang.glossary[word.word];
      setTooltip({
        keyword: word.word,
        language: LANGUAGE_LABELS[language] || language,
        definition: entry.definition,
        example: entry.example,
        position: { top: coords.top + 24, left: coords.left + 20 },
      });
    });
  }, [language]);

  const handleExplain = useCallback(() => {
    if (selection) {
      onSelectionExplain(selection, language);
      setSelection(null);
      setBtnPos(null);
    }
  }, [selection, language, onSelectionExplain]);

  const handleAiExplain = useCallback(() => {
    if (selection) {
      onAiExplain(selection, language);
      setSelection(null);
      setBtnPos(null);
    }
  }, [selection, language, onAiExplain]);

  return (
    <div style={styles.panel}>
      <div style={styles.toolbar}>
        <label style={styles.label}>Language:</label>
        <select
          style={styles.select}
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div style={styles.editorWrap}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={(val) => onCodeChange(val || '')}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
        {selection && btnPos && (
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
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  label: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  select: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '4px 8px',
    outline: 'none',
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
