import React, { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Lock, Unlock, Loader, X, Save, Play, Lightbulb } from 'lucide-react';
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
  python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp',
  csharp: 'csharp', go: 'go', rust: 'rust', typescript: 'typescript', c: 'c',
};

const LANGUAGE_LABELS = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++',
  csharp: 'C#', go: 'Go', rust: 'Rust', typescript: 'TypeScript', c: 'C',
};

// CodePanel — the middle column. Hosts the generator output (pseudocode +
// language tabs), open-file tabs, the Run button, and the editor itself.
//
// Pedagogy notes:
//   - The Pseudocode tab is visually elevated (algorithm-purple accent +
//     small lightbulb glyph) and shows a "read this first" hint above the
//     editor. This is the lesson; languages are syntax-views of it.
//   - The practical language is the second tab. Comparison languages
//     follow. File tabs sit after a divider.

export default function CodePanel({
  generatedCode,
  selectedLanguages,
  onCodeChange,
  onSelectionExplain,
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
  // generator-tab state lifted to App so the live-preview panel can read
  // the same active tab without duplicating it.
  activeGeneratedTab = 'pseudocode',
  onActivateGeneratedTab,
  // v2.4.1: when a folder is open the central panel becomes "your
  // project". The pseudocode + comparison-language tabs are hidden so
  // the file workspace doesn't have to fight them for screen real estate.
  // Generate then writes directly into the open folder as a scratch file
  // (handled in App.jsx) and opens that file as a tab.
  folderOpen = false,
}) {
  const generatedTabs = folderOpen ? [] : ['pseudocode', ...selectedLanguages];
  const [editable, setEditable] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [selection, setSelection] = useState(null);
  const [btnPos, setBtnPos] = useState(null);
  const editorRef = useRef(null);

  // ---- which view are we showing? ---------------------------------------
  const fileTab = activePath ? openFiles.find((f) => f.path === activePath) : null;
  const showingFile = !!fileTab;

  const generatedDisplayTab = generatedTabs.includes(activeGeneratedTab) ? activeGeneratedTab : 'pseudocode';
  const isPseudocode = !showingFile && !folderOpen && generatedDisplayTab === 'pseudocode';
  const showEmptyState = folderOpen && !showingFile;

  let value = '';
  let monacoLang = 'plaintext';
  let isReadOnly = !editable;

  if (showingFile) {
    value = fileTab.content || '';
    monacoLang = fileInfo(fileTab.path).monaco;
    isReadOnly = false;
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
        if (coords) setBtnPos({ top: coords.top + 30, left: coords.left + 40 });
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

  const explainLanguage = showingFile ? fileInfo(fileTab.path).run || 'plaintext' : generatedDisplayTab;

  const handleExplain = useCallback(() => {
    if (selection && (showingFile || !isPseudocode)) {
      // Single Explain entry-point — App decides whether to use AI
      // (when online + API key present) or fall back to the offline
      // line-by-line explainer.
      onSelectionExplain?.(selection, explainLanguage);
      clearSelection();
    }
  }, [selection, isPseudocode, showingFile, explainLanguage, onSelectionExplain, clearSelection]);

  const showExplainButtons = (showingFile || (editable && !isPseudocode)) && selection && btnPos;

  // ---- run button: figure out language + source for the runner ----------
  let runLanguage = null;
  let runFilename = null;
  if (showingFile) {
    const info = fileInfo(fileTab.path);
    runLanguage = info.run;
    runFilename = basename(fileTab.path);
  } else if (!isPseudocode) {
    runLanguage = generatedDisplayTab;
    runFilename = DEFAULT_FILENAME_FOR_LANG[generatedDisplayTab] || null;
  }
  const canRun = !!onRunCode && !!runLanguage && RUNNABLE.has(runLanguage) && (value || '').trim().length > 0;

  const handleRun = useCallback(() => {
    if (!canRun) return;
    onRunCode({ language: runLanguage, source: value, filename: runFilename });
  }, [canRun, onRunCode, runLanguage, value, runFilename]);

  const handleActivateGenerated = (tab) => {
    onActivatePath?.(null);
    onActivateGeneratedTab?.(tab);
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
            const isPseudo = tab === 'pseudocode';
            return (
              <button
                key={`gen:${tab}`}
                style={{
                  ...styles.tab,
                  ...(isActive ? styles.activeTab : {}),
                  ...(isPseudo && isActive ? styles.activeAlgorithmTab : {}),
                }}
                onClick={() => handleActivateGenerated(tab)}
                title={isPseudo ? 'The algorithm — language-agnostic' : `Same algorithm, written in ${LANGUAGE_LABELS[tab] || tab}`}
              >
                {isPseudo && (
                  <Lightbulb
                    size={12}
                    style={{
                      marginRight: 6,
                      color: isActive ? 'var(--algorithm)' : 'var(--text-muted)',
                    }}
                  />
                )}
                <span>{isPseudo ? 'Pseudocode' : (LANGUAGE_LABELS[tab] || tab)}</span>
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
                  aria-label={`Close ${basename(f.path)}`}
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
              title="Save (Ctrl + S)"
              disabled={!fileTab.dirty}
            >
              <Save size={12} />
              <span style={{ marginLeft: 4 }}>{fileTab.dirty ? 'Save' : 'Saved'}</span>
            </button>
          )}
          {!showingFile && !folderOpen && (
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

      {/* Pseudocode-only banner: makes the lesson explicit. */}
      {isPseudocode && (generatedCode.pseudocode || '').trim().length > 0 && (
        <div style={styles.algoBanner}>
          <Lightbulb size={12} color="var(--algorithm)" />
          <span style={styles.algoBannerStrong}>Algorithm — read this first.</span>
          <span style={styles.algoBannerHint}>
            Every language tab is the same idea written in different syntax.
          </span>
        </div>
      )}

      <div style={styles.editorWrap}>
        {showEmptyState ? (
          <div style={styles.emptyWorkspace}>
            <h3 style={styles.emptyTitle}>This folder is your workspace</h3>
            <p style={styles.emptyText}>
              Open a file from the explorer on the left, or type an instruction and hit <strong>Generate</strong>
            </p>
            <p style={styles.emptyHint}>
              Highlight any code in a file to get a line-by-line explanation.
            </p>
          </div>
        ) : (
          <Editor
            key={showingFile ? `file:${activePath}` : `gen:${generatedDisplayTab}`}
            height="100%"
            language={monacoLang}
            value={value}
            theme="hc-black"
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
        )}
        {showExplainButtons && (
          <div style={{ ...styles.btnGroup, top: btnPos.top, left: btnPos.left }}>
            <button
              style={styles.explainBtn}
              onClick={handleExplain}
              disabled={aiLoading}
              title={aiLoading ? 'Thinking…' : 'Explain selected code'}
            >
              {aiLoading
                ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ marginLeft: 4 }}>Thinking…</span></>
                : <span>Explain</span>}
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
    display: 'inline-flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '8px 14px',
    whiteSpace: 'nowrap',
    transition: 'color var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out)',
  },
  activeTab: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--text-primary)',
    background: 'var(--bg-primary)',
  },
  // Pseudocode tab keeps its dedicated algorithm accent — that mark is
  // pedagogical (it tells the learner "this tab is the lesson, not just
  // another language"), not chrome decoration, so it survives the neutral
  // theme pass.
  activeAlgorithmTab: {
    borderBottomColor: 'var(--algorithm)',
  },
  tabDivider: {
    width: 1,
    background: 'var(--border)',
    margin: '0 4px',
  },
  fileTab: {
    display: 'flex',
    alignItems: 'center',
    // Longhand only — merging with `activeTab` (which sets
    // `borderBottomColor`) would otherwise conflict with the shorthand
    // `borderBottom` and trigger React's "removing a style property
    // during rerender" warning.
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
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
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    // Longhand: `lockBtnActive` overrides `borderColor` only, so the
    // base must avoid the `border` shorthand to prevent the React
    // "removing a style property during rerender" warning.
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 11,
    padding: '4px 10px',
    margin: '6px 8px',
    whiteSpace: 'nowrap',
  },
  lockBtnActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--text-secondary)',
    color: 'var(--text-primary)',
  },

  algoBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    background: 'var(--algorithm-soft)',
    borderBottom: '1px solid var(--border)',
    fontSize: 11.5,
    color: 'var(--text-secondary)',
  },
  algoBannerStrong: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  algoBannerHint: {
    color: 'var(--text-muted)',
  },

  editorWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  emptyWorkspace: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    textAlign: 'center',
    gap: 8,
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptyText: {
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: 420,
    margin: 0,
  },
  emptyHint: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    margin: '4px 0 0',
  },
  btnGroup: {
    position: 'absolute',
    zIndex: 10,
    display: 'flex',
    gap: 4,
  },
  explainBtn: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '4px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  runBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    color: 'var(--text-primary)',
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
