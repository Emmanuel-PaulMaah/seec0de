import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Lock, Pencil, Loader, X, Play, Lightbulb, Check } from 'lucide-react';
import KeywordTooltip from './KeywordTooltip';
import { LANGUAGES } from '../engine/languages';
import { fileInfo, basename } from '../engine/fileLanguage';
import { registerEditor, unregisterEditor, setFocusTarget } from '../engine/editorBridge';

// Languages currently supported by runnerService.js. Keep in sync.
const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'c', 'cpp', 'react']);

// Editor font-size scaling. Persisted per-install so the learner's
// preferred reading size sticks across launches. Bounded so the editor
// never shrinks past unreadable or stretches past comically large.
const FONT_SIZE_KEY     = 'seec0de.editorFontSize';
const FONT_SIZE_DEFAULT = 13;
const FONT_SIZE_MIN     = 10;
const FONT_SIZE_MAX     = 28;
const FONT_SIZE_STEP    = 1;

function readSavedFontSize() {
  const raw = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '', 10);
  if (Number.isFinite(raw) && raw >= FONT_SIZE_MIN && raw <= FONT_SIZE_MAX) return raw;
  return FONT_SIZE_DEFAULT;
}

function clampFontSize(n) {
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, n));
}

const DEFAULT_FILENAME_FOR_LANG = {
  javascript: 'main.js',
  typescript: 'main.ts',
  python:     'main.py',
  c:          'main.c',
  cpp:        'main.cpp',
};

const LANGUAGE_MONACO_MAP = {
  python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp',
  csharp: 'csharp', go: 'go', rust: 'rust', typescript: 'typescript', c: 'c', react: 'javascript',
};

const LANGUAGE_LABELS = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++',
  csharp: 'C#', go: 'Go', rust: 'Rust', typescript: 'TypeScript', c: 'C', react: 'React',
};

// ---- HTML auto-close completions -------------------------------------------
// Common void elements that should NOT get a closing tag.
const VOID_ELEMENTS = new Set([
  'area','base','br','col','embed','hr','img','input',
  'link','meta','param','source','track','wbr',
]);
// Common HTML5 tags for autocomplete.
const HTML_TAGS = [
  'html','head','body','div','span','p','a','h1','h2','h3','h4','h5','h6',
  'ul','ol','li','table','thead','tbody','tr','td','th','form','input',
  'button','select','option','textarea','label','fieldset','legend',
  'header','footer','main','nav','section','article','aside','figure','figcaption',
  'img','video','audio','source','canvas','svg','iframe','script','style',
  'link','meta','title','base','br','hr','pre','code','blockquote','cite',
  'dl','dt','dd','details','summary','dialog','template','slot','picture',
];

let _htmlCompletionRegistered = false;
function registerHtmlCompletions(monaco) {
  if (_htmlCompletionRegistered) return;
  _htmlCompletionRegistered = true;

  monaco.languages.registerCompletionItemProvider('html', {
    triggerCharacters: ['<', ' '],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const textBefore = line.slice(0, position.column - 1);

      // After '<' → suggest tag names with closing tag.
      const tagMatch = textBefore.match(/<([a-zA-Z]*)$/);
      if (tagMatch) {
        const prefix = tagMatch[1].toLowerCase();
        const suggestions = HTML_TAGS
          .filter((t) => t.startsWith(prefix))
          .map((tag) => ({
            label: tag,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: VOID_ELEMENTS.has(tag)
              ? tag
              : `${tag}>$0</${tag}>`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: VOID_ELEMENTS.has(tag) ? `<${tag}> (void)` : `<${tag}>…</${tag}>`,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column - tagMatch[0].length + 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          }));
        return { suggestions };
      }

      // After '<tag ' → suggest common attributes.
      const attrMatch = textBefore.match(/<([a-zA-Z]+)\s+([a-zA-Z-]*)$/);
      if (attrMatch) {
        const attrPrefix = attrMatch[2].toLowerCase();
        const attrs = ['class','id','style','href','src','alt','title','name','value','type','placeholder','disabled','hidden','role','aria-label','onclick','data-id'];
        const suggestions = attrs
          .filter((a) => a.startsWith(attrPrefix))
          .map((attr) => ({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${attr}="$1"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: attr,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column - attrPrefix.length,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          }));
        return { suggestions };
      }

      return { suggestions: [] };
    },
  });
}

function defineSeec0deThemes(monaco) {
  // Register HTML tag + attribute completions with auto-closing tags.
  registerHtmlCompletions(monaco);

  // Also enable Monaco's built-in auto-closing if available.
  try {
    if (monaco.languages?.html?.htmlDefaults) {
      monaco.languages.html.htmlDefaults.setOptions({
        autoClosingTags: true,
        autoIndent: true,
      });
    }
  } catch { /* CDN loader may not expose htmlDefaults */ }

  monaco.editor.defineTheme('seec0de-green', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'C8B6FF' },
      { token: 'string', foreground: 'EFB78F' },
      { token: 'number', foreground: 'A8D8A0' },
      { token: 'comment', foreground: '70756D' },
      { token: 'type', foreground: '9CC9FF' },
    ],
    colors: {
      'editor.background': '#0B0D0C',
      'editor.foreground': '#F2F0E9',
      'editorLineNumber.foreground': '#61645E',
      'editorLineNumber.activeForeground': '#C7C5BD',
      'editor.selectionBackground': '#35451F',
      'editor.inactiveSelectionBackground': '#29351B',
      'editorCursor.foreground': '#C8FF4D',
      'editorIndentGuide.background1': '#232620',
      'editorIndentGuide.activeBackground1': '#353A30',
    },
  });

  monaco.editor.defineTheme('seec0de-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '6366F1' },
      { token: 'string', foreground: 'C2410C' },
      { token: 'number', foreground: '0D9488' },
      { token: 'comment', foreground: '94A3B8', fontStyle: 'italic' },
      { token: 'type', foreground: '0891B2' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1A1D23',
      'editorLineNumber.foreground': '#B0B5BF',
      'editorLineNumber.activeForeground': '#525866',
      'editor.selectionBackground': 'rgba(99, 102, 241, 0.15)',
      'editor.inactiveSelectionBackground': 'rgba(99, 102, 241, 0.08)',
      'editorCursor.foreground': '#6366F1',
      'editorIndentGuide.background1': '#E2E4E8',
      'editorIndentGuide.activeBackground1': '#D0D3D8',
    },
  });
}

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
  appTheme = 'seec0de-dark',
  onCodeChange,
  onSelectionExplain,
  aiLoading,
  // file-manager props
  openFiles = [],
  activePath = null,
  onActivatePath,
  onCloseFile,
  onFileContentChange,
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
  // v3.3: when a lesson is active the central panel becomes the lesson's
  // scratchpad — one JavaScript tab, always editable, no pseudocode or
  // comparison-language tabs to distract from the exercise. The Run
  // button stays so the lesson can verify the user's output.
  lessonMode = false,
  lessonLanguage = 'javascript',
}) {
  const generatedTabs = folderOpen
    ? []
    : lessonMode
      ? [lessonLanguage || 'javascript']
      : ['pseudocode', ...selectedLanguages];
  const [editable, setEditable] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [selection, setSelection] = useState(null);
  const [btnPos, setBtnPos] = useState(null);
  const editorRef = useRef(null);

  // ---- editor font size -------------------------------------------------
  // Lives in CodePanel so the +/− controls sit next to the editor they
  // resize. Persisted to localStorage in an effect below.
  const [fontSize, setFontSize] = useState(() => readSavedFontSize());

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  const bumpFontSize = useCallback((delta) => {
    setFontSize((prev) => clampFontSize(prev + delta));
  }, []);
  const resetFontSize = useCallback(() => setFontSize(FONT_SIZE_DEFAULT), []);

  // ---- which view are we showing? ---------------------------------------
  const fileTab = activePath ? openFiles.find((f) => f.path === activePath) : null;
  const showingFile = !!fileTab;

  // In lesson mode the default tab is always the single JS tab — never
  // fallback to 'pseudocode' (which isn't even rendered then).
  const generatedDisplayTab = generatedTabs.includes(activeGeneratedTab)
    ? activeGeneratedTab
    : (lessonMode ? (lessonLanguage || 'javascript') : 'pseudocode');
  const isPseudocode = !showingFile && !folderOpen && !lessonMode && generatedDisplayTab === 'pseudocode';
  const showEmptyState = folderOpen && !showingFile;

  let value = '';
  let monacoLang = 'plaintext';
  // Lesson mode forces the editor to be writable so the learner can do
  // the exercise — the lock toggle is hidden in lesson mode (see below).
  let isReadOnly = !(editable || lessonMode);

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
  const tooltipLanguage = showingFile
    ? (fileInfo(fileTab.path).run || fileInfo(fileTab.path).monaco)
    : generatedDisplayTab;

  const clearSelection = useCallback(() => {
    setSelection(null);
    setBtnPos(null);
  }, []);

  // On CodePanel unmount, drop the bridge reference so insertIntoEditor
  // stops hitting a disposed editor. (Tab switches remount the Editor child,
  // which re-registers via onMount.)
  useEffect(() => () => unregisterEditor(), []);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    // Leaf UI (inline code chips, Build panel example/solution blocks)
    // inserts into this editor via the shared bridge — the live instance is
    // always the most recently mounted one (tabs remount the Editor). The
    // bridge writes through React state (the editor is controlled), so it
    // gets the same content-setter as the onChange path.
    registerEditor(editor, {
      setContent: (content) => {
        if (showingFile) {
          onFileContentChange?.(fileTab.path, content);
          return;
        }
        if (!editable && !lessonMode) return;
        onCodeChange?.(generatedDisplayTab, content);
      },
    });

    editor.onDidChangeCursorSelection((e) => {
      if (lessonMode) {
        clearSelection();
        return;
      }
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
      if (isPseudocode) return;
      const pos = e.target.position;
      if (!pos) return;
      const model = editor.getModel();
      if (!model) return;
      const word = model.getWordAtPosition(pos);
      if (!word) return;

      const lang = LANGUAGES[tooltipLanguage];
      if (!lang || !lang.glossary[word.word]) return;

      const coords = editor.getScrolledVisiblePosition(pos);
      if (!coords) return;

      const entry = lang.glossary[word.word];
      setTooltip({
        keyword: word.word,
        language: LANGUAGE_LABELS[tooltipLanguage] || tooltipLanguage,
        definition: entry.definition,
        example: entry.example,
        position: { top: coords.top + 24, left: coords.left + 20 },
      });
    });
  }, [isPseudocode, lessonMode, tooltipLanguage, clearSelection, showingFile, fileTab, editable, onFileContentChange, onCodeChange, generatedDisplayTab]);

  const handleChange = useCallback((val) => {
    const next = val ?? '';
    if (showingFile) {
      onFileContentChange?.(fileTab.path, next);
      return;
    }
    // Editable when the user has toggled the lock OR when a lesson is
    // running (the lock is hidden in lesson mode and the editor is
    // implicitly writable so the learner can do the exercise).
    if (!editable && !lessonMode) return;
    onCodeChange?.(generatedDisplayTab, next);
  }, [editable, lessonMode, generatedDisplayTab, onCodeChange, showingFile, fileTab, onFileContentChange]);

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

  const showExplainButtons = !lessonMode && (showingFile || (editable && !isPseudocode)) && selection && btnPos;

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
  const canRun = !!onRunCode && !!runLanguage && (RUNNABLE.has(runLanguage) || (lessonMode && !RUNNABLE.has(runLanguage))) && (value || '').trim().length > 0;
  const isSourceCheck = lessonMode && !!runLanguage && !RUNNABLE.has(runLanguage);

  const handleRun = useCallback(() => {
    if (!canRun) return;
    onRunCode({ language: runLanguage, source: value, filename: runFilename });
  }, [canRun, onRunCode, runLanguage, value, runFilename]);

  // Run from the editor with the familiar build-tool shortcut. Ignore other
  // text inputs (for example the instruction panel) even though this listener
  // is attached to window.
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
      const target = event.target;
      const inMonaco = target instanceof Element && !!target.closest('.monaco-editor');
      const inOtherInput = target instanceof HTMLElement && (
        target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      );
      if (inOtherInput && !inMonaco) return;
      event.preventDefault();
      handleRun();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [handleRun]);

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
                className="ui-tab"
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
                  className="ui-tab"
                  style={styles.fileTabName}
                  onClick={() => handleActivateFile(f.path)}
                  title={f.path}
                >
                  {basename(f.path)}{f.dirty ? ' •' : ''}
                </button>
                <button
                  className="ui-icon-button"
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
          {/* Font-size scaler — A−, current size (click to reset), A+.
              Keyboard: Ctrl/⌘ + / − to step, Ctrl/⌘ 0 to reset. */}
          <div style={styles.fontGroup} role="group" aria-label="Editor font size">
            <button
              type="button"
              className="ui-toolbar-button"
              style={{
                ...styles.fontBtn,
                ...(fontSize <= FONT_SIZE_MIN ? styles.fontBtnDisabled : {}),
              }}
              onClick={() => bumpFontSize(-FONT_SIZE_STEP)}
              disabled={fontSize <= FONT_SIZE_MIN}
              title="Decrease editor font size"
              aria-label="Decrease editor font size"
            >
              A−
            </button>
            <button
              type="button"
              className="ui-toolbar-button"
              style={styles.fontSizeLabel}
              onClick={resetFontSize}
              title={`Reset editor font size to ${FONT_SIZE_DEFAULT}px`}
              aria-label={`Editor font size ${fontSize}px — click to reset`}
            >
              {fontSize}
            </button>
            <button
              type="button"
              className="ui-toolbar-button"
              style={{
                ...styles.fontBtn,
                ...(fontSize >= FONT_SIZE_MAX ? styles.fontBtnDisabled : {}),
              }}
              onClick={() => bumpFontSize(FONT_SIZE_STEP)}
              disabled={fontSize >= FONT_SIZE_MAX}
              title="Increase editor font size"
              aria-label="Increase editor font size"
            >
              A+
            </button>
          </div>
          {canRun && (
            <button
              className="ui-toolbar-button ui-primary-button"
              style={{ ...styles.runBtn, ...(runLoading ? styles.runBtnDisabled : {}) }}
              onClick={handleRun}
              disabled={runLoading}
              title={isSourceCheck ? 'Check your code' : `Run with ${runLanguage}`}
            >
              {runLoading
                ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : isSourceCheck ? <Check size={12} /> : <Play size={12} />}
            </button>
          )}

          {!showingFile && !folderOpen && !lessonMode && (
            <button
              className="ui-toolbar-button"
              style={{ ...styles.lockBtn, ...(editable ? styles.lockBtnActive : {}) }}
              onClick={() => { setEditable((e) => !e); clearSelection(); setTooltip(null); }}
              title={editable ? 'Switch to read-only' : 'Switch to editable (paste your own code)'}
            >
              {editable ? <Pencil size={12} /> : <Lock size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Auto-save indicator — only when a file is open. */}
      {showingFile && (
        <div style={styles.autoSaveBar}>
          {fileTab.dirty
            ? <><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ marginLeft: 4 }}>Saving…</span></>
            : <><Check size={10} style={{ color: 'var(--success)' }} /><span style={{ marginLeft: 4 }}>Saved</span></>}
        </div>
      )}

      {/* Pseudocode-only banner: makes the lesson explicit. */}
      {isPseudocode && (generatedCode.pseudocode || '').trim().length > 0 && (
        <div style={styles.algoBanner}>
          <Lightbulb size={12} color="var(--algorithm)" />
          <span style={styles.algoBannerStrong}>Algorithm</span>
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
            theme={appTheme === 'seec0de-green' ? 'seec0de-green' : appTheme === 'seec0de-light' ? 'seec0de-light' : 'hc-black'}
            beforeMount={defineSeec0deThemes}
            onMount={handleEditorMount}
            onFocus={() => setFocusTarget('editor')}
            onChange={handleChange}
            options={{
              readOnly: isReadOnly,
              minimap: { enabled: false },
              fontSize,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              suggest: {
                showKeywords: true,
                showSnippets: true,
                showModules: true,
                insertMode: 'insert',
              },
              tabCompletion: 'on',
              wordBasedSuggestions: 'off',
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
            }}
          />
        )}
        {showExplainButtons && (
          <div style={{ ...styles.btnGroup, top: btnPos.top, left: btnPos.left }}>
            <button
              className="ui-toolbar-button"
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
    alignItems: 'center',
    minHeight: 'var(--panel-header-height)',
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
    minHeight: 'var(--panel-header-height)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 var(--space-3)',
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
    minHeight: 'var(--panel-header-height)',
    fontSize: 'var(--text-sm)',
    whiteSpace: 'nowrap',
    paddingLeft: 8,
  },
  fileTabName: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    minHeight: 'var(--panel-header-height)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 var(--space-1)',
    whiteSpace: 'nowrap',
  },
  fileTabClose: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    justifyContent: 'center',
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
  },
  tabActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    paddingRight: 'var(--space-2)',
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
    minHeight: 'var(--control-compact)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 var(--space-3)',
    margin: 0,
    whiteSpace: 'nowrap',
  },
  lockBtnActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--text-secondary)',
    color: 'var(--text-primary)',
  },

  autoSaveBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px var(--space-3)',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)',
  },
  algoBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 'var(--control-standard)',
    padding: '0 var(--space-3)',
    background: 'var(--algorithm-soft)',
    borderBottom: '1px solid var(--border)',
    fontSize: 'var(--text-sm)',
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
    fontSize: 'var(--text-lg)',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptyText: {
    fontSize: 'var(--text-md)',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: 420,
    margin: 0,
  },
  emptyHint: {
    fontSize: 'var(--text-sm)',
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
    minHeight: 'var(--control-compact)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 var(--space-3)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  runBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 'var(--control-compact)',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-on-accent)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    padding: '0 var(--space-3)',
    margin: 0,
    whiteSpace: 'nowrap',
  },
  runBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  fontGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid var(--border)',
    minHeight: 'var(--control-compact)',
    borderRadius: 'var(--radius-group)',
    margin: 0,
    overflow: 'hidden',
    background: 'var(--bg-tertiary)',
  },
  fontBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    minHeight: 'calc(var(--control-compact) - 2px)',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    padding: '0 var(--space-2)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    minWidth: 26,
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  fontBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  fontSizeLabel: {
    background: 'transparent',
    border: 'none',
    borderLeft: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
    color: 'var(--text-primary)',
    minHeight: 'calc(var(--control-compact) - 2px)',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    padding: '0 var(--space-2)',
    cursor: 'pointer',
    minWidth: 26,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center',
  },
};
