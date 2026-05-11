import React, { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Lock, Unlock, Sparkles, Loader, X, Save, Play } from 'lucide-react';
import KeywordTooltip from './KeywordTooltip';
import { LANGUAGES } from '../engine/languages';
import { fileInfo, basename } from '../engine/fileLanguage';

// Languages currently supported by runnerService.js. Keep in sync.
const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'c', 'cpp']);
const DEFAULT_FILENAME_FOR_LANG = {
  javascript: 'main.js',
  typescript: 'main.ts',
  python:     'main.py',
  c:          'main.c',
  cpp:        'main.cpp',
};

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
  // file-manager props
  openFiles = [],
  activePath = null,
  onActivatePath,
  onCloseFile,
  onFileContentChange,
  onSaveActiveFile,
  // runner props
  onRunCode,
  runLoading = false,
}) {
  const generatedTabs = ['pseudocode', ...selectedLanguages];
  const [activeGeneratedTab, setActiveGeneratedTab] = useState('pseudocode');
  const [editable, setEditable] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [selection, setSelection] = useState(null);
  const [btnPos, setBtnPos] = useState(null);
  const editorRef = useRef(null);

  // ---- which view are we showing? ---------------------------------------
  // If a file tab is active, the file editor takes over. Otherwise we show
  // the pseudocode/language tabs from the generator.
  const fileTab = activePath ? openFiles.find((f) => f.path === activePath) : null;
  const showingFile = !!fileTab;

  const generatedDisplayTab = generatedTabs.includes(activeGeneratedTab) ? activeGeneratedTab : 'pseudocode';
  const isPseudocode = !showingFile && generatedDisplayTab === 'pseudocode';

  let value = '';
  let monacoLang = 'plaintext';
  let isReadOnly = !editable;

  if (showingFile) {
    value = fileTab.content || '';
    monacoLang = fileInfo(fileTab.path).monaco;
    isReadOnly = false; // files are always editable
  } else if (isPseudocode) {
    value = generatedCode.pseudocode || '';
    monacoLang = 'plaintext';
  } else {
    value = (generatedCode.code && generatedCode.code[generatedDisplayTab]) || '';
    monacoLang = LANGUAGE_MONACO_MAP[generatedDisplayTab] || 'plaintext';
  }

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
      if (isPseudocode || showingFile) return;
      const pos = e.target.position;
      if (!pos) return;
      const model = editor.getModel();
      if (!model) return;
      const word = model.getWordAtPosition(pos);
      if (!word) return;

      const lang = LANGUAGES[generatedDisplayTab];
      if (!lang || !lang.glossary[word.word]) return;

      const coords = editor.getScrolledVisiblePosition(pos);
      if (!coords) return;

      const entry = lang.glossary[word.word];
      setTooltip({
        keyword: word.word,
        language: LANGUAGE_LABELS[generatedDisplayTab] || generatedDisplayTab,
        definition: entry.definition,
        example: entry.example,
        position: { top: coords.top + 24, left: coords.left + 20 },
      });
    });
  }, [generatedDisplayTab, isPseudocode, showingFile, clearSelection]);

  const handleChange = useCallback((val) => {
    const next = val ?? '';
    if (showingFile) {
      onFileContentChange?.(fileTab.path, next);
      return;
    }
    if (!editable) return;
    onCodeChange?.(generatedDisplayTab, next);
  }, [editable, generatedDisplayTab, onCodeChange, showingFile, fileTab, onFileContentChange]);

  // The "language for explanation" is generator-tab when not showing a file,
  // and the file's detected language otherwise.
  const explainLanguage = showingFile ? fileInfo(fileTab.path).run || 'plaintext' : generatedDisplayTab;

  const handleExplain = useCallback(() => {
    if (selection && (showingFile || !isPseudocode)) {
      onSelectionExplain?.(selection, explainLanguage);
      clearSelection();
    }
  }, [selection, isPseudocode, showingFile, explainLanguage, onSelectionExplain, clearSelection]);

  const handleAiExplain = useCallback(() => {
    if (selection && (showingFile || !isPseudocode)) {
      onAiExplain?.(selection, explainLanguage);
      clearSelection();
    }
  }, [selection, isPseudocode, showingFile, explainLanguage, onAiExplain, clearSelection]);

  const showExplainButtons = (showingFile || (editable && !isPseudocode)) && selection && btnPos;

  // ---- run button: figure out language + source for the runner ----------
  let runLanguage = null;
  let runFilename = null;
  if (showingFile) {
    const info = fileInfo(fileTab.path);
    runLanguage = info.run;            // null if extension isn't runnable
    runFilename = basename(fileTab.path);
  } else if (!isPseudocode) {
    runLanguage = generatedDisplayTab; // 'python', 'javascript', etc.
    runFilename = DEFAULT_FILENAME_FOR_LANG[generatedDisplayTab] || null;
  }
  const canRun = !!onRunCode && !!runLanguage && RUNNABLE.has(runLanguage) && (value || '').trim().length > 0;

  const handleRun = useCallback(() => {
    if (!canRun) return;
    onRunCode({ language: runLanguage, source: value, filename: runFilename });
  }, [canRun, onRunCode, runLanguage, value, runFilename]);

  const handleActivateGenerated = (tab) => {
    onActivatePath?.(null);
    setActiveGeneratedTab(tab);
    setTooltip(null);
    clearSelection();
  };

  const handleActivateFile = (filePath) => {
    onActivatePath?.(filePath);
    setTooltip(null);
    clearSelection();
  };

  return (
    <div style={styles.panel}>
      <div style={styles.tabs}>
        <div style={styles.tabList}>
          {generatedTabs.map((tab) => {
            const isActive = !showingFile && generatedDisplayTab === tab;
            return (
              <button
                key={`gen:${tab}`}
                style={{ ...styles.tab, ...(isActive ? styles.activeTab : {}) }}
                onClick={() => handleActivateGenerated(tab)}
              >
                {tab === 'pseudocode' ? 'Pseudocode' : (LANGUAGE_LABELS[tab] || tab)}
              </button>
            );
          })}
          {openFiles.length > 0 && <span style={styles.tabDivider} />}
          {openFiles.map((f) => {
            const isActive = showingFile && activePath === f.path;
            return (
              <div
                key={`file:${f.path}`}
                style={{ ...styles.fileTab, ...(isActive ? styles.activeTab : {}) }}
              >
                <button
                  style={styles.fileTabName}
                  onClick={() => handleActivateFile(f.path)}
                  title={f.path}
                >
                  {basename(f.path)}{f.dirty ? ' •' : ''}
                </button>
                <button
                  style={styles.fileTabClose}
                  onClick={(e) => { e.stopPropagation(); onCloseFile?.(f.path); }}
                  title="Close file"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
        <div style={styles.tabActions}>
          {canRun && (
            <button
              style={{ ...styles.runBtn, ...(runLoading ? styles.runBtnDisabled : {}) }}
              onClick={handleRun}
              disabled={runLoading}
              title={`Run with ${runLanguage}`}
            >
              {runLoading
                ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : <Play size={12} />}
              <span style={{ marginLeft: 4 }}>{runLoading ? 'Running…' : 'Run'}</span>
            </button>
          )}
          {showingFile && (
            <button
              style={{ ...styles.lockBtn, ...(fileTab.dirty ? styles.lockBtnActive : {}) }}
              onClick={() => onSaveActiveFile?.()}
              title="Save (Ctrl+S)"
              disabled={!fileTab.dirty}
            >
              <Save size={12} />
              <span style={{ marginLeft: 4 }}>{fileTab.dirty ? 'Save' : 'Saved'}</span>
            </button>
          )}
          {!showingFile && (
            <button
              style={{ ...styles.lockBtn, ...(editable ? styles.lockBtnActive : {}) }}
              onClick={() => { setEditable((e) => !e); clearSelection(); setTooltip(null); }}
              title={editable ? 'Switch to read-only' : 'Switch to editable (paste your own code)'}
            >
              {editable
                ? <><Unlock size={12} /> <span style={{ marginLeft: 4 }}>Editable</span></>
                : <><Lock size={12} /> <span style={{ marginLeft: 4 }}>Read-only</span></>}
            </button>
          )}
        </div>
      </div>
      <div style={styles.editorWrap}>
        <Editor
          key={showingFile ? `file:${activePath}` : `gen:${generatedDisplayTab}`}
          height="100%"
          language={monacoLang}
          value={value}
          theme="vs-dark"
          onMount={handleEditorMount}
          onChange={handleChange}
          options={{
            readOnly: isReadOnly,
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
    minWidth: 0,
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
    alignItems: 'stretch',
  },
  tab: {
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
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
  tabDivider: {
    width: 1,
    background: 'var(--border)',
    margin: '0 4px',
  },
  fileTab: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    whiteSpace: 'nowrap',
    paddingLeft: 8,
  },
  fileTabName: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: 12,
    padding: '6px 4px 6px 4px',
    whiteSpace: 'nowrap',
  },
  fileTabClose: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    padding: '4px 8px 4px 4px',
    display: 'flex',
    alignItems: 'center',
  },
  tabActions: {
    display: 'flex',
    alignItems: 'center',
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
  runBtn: {
    display: 'flex',
    alignItems: 'center',
    background: '#1a6b3c',
    border: 'none',
    borderRadius: 3,
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 10px',
    margin: '6px 4px 6px 8px',
    whiteSpace: 'nowrap',
  },
  runBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
