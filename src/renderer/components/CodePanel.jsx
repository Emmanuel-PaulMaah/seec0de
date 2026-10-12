import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Lock, Pencil, X, Play, Lightbulb, Check, ChevronRight, Search } from 'lucide-react';
import KeywordTooltip from './KeywordTooltip';
import SandboxTerminal from './SandboxTerminal';
import { Tabs, TabsList, TabsTrigger } from './motion/tabs';
import { MorphingFileTabs } from './motion/morphing-file-tabs';
import { StatefulButton } from './motion/button/stateful';
import { Loader as BeuiLoader } from './motion/loader';
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
  nodejs: 'javascript',
};

const LANGUAGE_LABELS = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++',
  csharp: 'C#', go: 'Go', rust: 'Rust', typescript: 'TypeScript', c: 'C', react: 'React',
  nodejs: 'Node.js',
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

  monaco.editor.defineTheme('beui-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'C8B6FF' },
      { token: 'string', foreground: 'EFB78F' },
      { token: 'number', foreground: 'A8D8A0' },
      { token: 'comment', foreground: '858A82' },
      { token: 'type', foreground: '9CC9FF' },
    ],
    // Keep in sync with the tokens in global.css (Monaco can't read CSS vars).
    colors: {
      'editor.background': '#0c0c0c',
      'editor.foreground': '#f0f0f0',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#d0d0d0',
      'editor.selectionBackground': '#35451F',
      'editor.inactiveSelectionBackground': '#29351B',
      'editorCursor.foreground': '#C8FF4D',
      'editorIndentGuide.background1': 'rgba(255, 255, 255, 0.06)',
      'editorIndentGuide.activeBackground1': 'rgba(255, 255, 255, 0.10)',
    },
  });

  monaco.editor.defineTheme('beui-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '4F46E5' },
      { token: 'string', foreground: 'C2410C' },
      { token: 'number', foreground: '0F766E' },
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'type', foreground: '0E7490' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#18181b',
      'editorLineNumber.foreground': '#686871',
      'editorLineNumber.activeForeground': '#18181b',
      'editor.selectionBackground': 'rgba(79, 70, 229, 0.15)',
      'editor.inactiveSelectionBackground': 'rgba(79, 70, 229, 0.08)',
      'editorCursor.foreground': '#4F46E5',
      'editorIndentGuide.background1': 'rgba(0, 0, 0, 0.06)',
      'editorIndentGuide.activeBackground1': 'rgba(0, 0, 0, 0.10)',
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
  colorMode = 'dark',
  editorStickyScroll = true,
  editorBreadcrumbs = false,
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
  runAttempt = 0,
  runOutcome = null,
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
  lessonId = null,
  sandboxResetTrigger = 0,
  onSandboxCommand,
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
  const [lastSandboxCommand, setLastSandboxCommand] = useState('');
  const selectionCleanupRef = useRef(null);
  const canExplainRef = useRef(false);

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

  // Keep canExplainRef in sync so event listeners always read the current
  // lesson/pseudocode state without needing to re-attach.
  useEffect(() => {
    canExplainRef.current = !lessonMode && !isPseudocode;
  }, [lessonMode, isPseudocode]);

  const showEmptyState = folderOpen && !showingFile;

  let value = '';
  let monacoLang = 'plaintext';
  // Lesson mode forces the editor to be writable so the learner can do
  // the exercise — the lock toggle is hidden in lesson mode (see below).
  let isReadOnly = !(editable || lessonMode);

  if (showingFile) {
    value = fileTab.content || '';
    monacoLang = fileInfo(fileTab.path).monaco;
    isReadOnly = !!fileTab.readError;
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
  useEffect(() => () => { unregisterEditor(); selectionCleanupRef.current?.(); }, []);

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

    // Buffer selection updates in refs during drag to avoid re-rendering
    // on every mouse-move. Commit to React state only on mouseup.
    const pendingSelection = { text: null, pos: null };
    let dragging = false;

    editor.onMouseDown(() => { dragging = true; });

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      if (lessonMode) { clearSelection(); return; }
      if (pendingSelection.text) {
        setSelection(pendingSelection.text);
        setBtnPos(pendingSelection.pos);
      } else {
        clearSelection();
      }
      pendingSelection.text = null;
      pendingSelection.pos = null;
    };
    document.addEventListener('mouseup', onMouseUp);
    selectionCleanupRef.current?.();
    selectionCleanupRef.current = () => document.removeEventListener('mouseup', onMouseUp);

    // In lesson mode and for pseudocode, skip selection tracking entirely —
    // only real code files and runnable language tabs get the highlight+explain.
    canExplainRef.current = !lessonMode && !isPseudocode;

    editor.onDidChangeCursorSelection((e) => {
      if (!canExplainRef.current) return;
      const model = editor.getModel();
      if (!model) return;
      const selectedText = model.getValueInRange(e.selection);
      if (selectedText.trim()) {
        pendingSelection.text = selectedText;
        const coords = editor.getScrolledVisiblePosition(e.selection.getEndPosition());
        if (coords) pendingSelection.pos = { top: coords.top + 30, left: coords.left + 40 };
      } else {
        pendingSelection.text = null;
        pendingSelection.pos = null;
      }
    });

    editor.onMouseDown((e) => {
      if (!canExplainRef.current) return;
      const pos = e.target.position;
      if (!pos) return;
      const model = editor.getModel();
      if (!model) return;
      const word = model.getWordAtPosition(pos);
      if (!word) return;

      const lang = LANGUAGES[tooltipLanguage];
      if (!lang || !lang.glossary[word.word]) return;

      const entry = lang.glossary[word.word];
      setTooltip({
        keyword: word.word,
        language: LANGUAGE_LABELS[tooltipLanguage] || tooltipLanguage,
        definition: entry.definition,
        example: entry.example,
        position: { top: e.event.pos.y + 12, left: e.event.pos.x + 12 },
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

  const editorOptions = useMemo(() => ({
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
    // No faint glow around every matching word while a selection is live —
    // it doubled with the Explain-selection affordance and read as noise.
    selectionHighlight: false,
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    stickyScroll: { enabled: editorStickyScroll },
  }), [isReadOnly, fontSize, editorStickyScroll]);

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
  // For Git lessons, allow running to verify sandbox commands
  const isGitLesson = lessonLanguage === 'git';
  const canRun = isGitLesson
    ? lessonMode
    : !!onRunCode && !!runLanguage && (RUNNABLE.has(runLanguage) || (lessonMode && !RUNNABLE.has(runLanguage))) && (value || '').trim().length > 0;
  const isSourceCheck = isGitLesson || (lessonMode && !!runLanguage && !RUNNABLE.has(runLanguage));
  const [runButtonState, setRunButtonState] = useState(runLoading ? 'loading' : 'idle');
  const runWasLoading = useRef(runLoading);
  const previousRunAttempt = useRef(runAttempt);
  const runFeedbackTimer = useRef(null);

  useEffect(() => {
    clearTimeout(runFeedbackTimer.current);
    const attemptChanged = previousRunAttempt.current !== runAttempt;
    previousRunAttempt.current = runAttempt;

    if (runLoading) {
      runWasLoading.current = true;
      setRunButtonState('loading');
      return undefined;
    }

    if (!runWasLoading.current && !attemptChanged) return undefined;
    runWasLoading.current = false;

    const succeeded = runOutcome === 0 || runOutcome === 'pass';
    const failed = runOutcome === 'fail' || (typeof runOutcome === 'number' && runOutcome !== 0);
    const nextState = succeeded ? 'success' : failed ? 'error' : 'idle';
    setRunButtonState(nextState);

    if (nextState !== 'idle') {
      runFeedbackTimer.current = setTimeout(() => setRunButtonState('idle'), 1600);
    }

    return () => clearTimeout(runFeedbackTimer.current);
  }, [runAttempt, runLoading, runOutcome]);

  const handleRun = useCallback(() => {
    if (!canRun) return;
    // For Git lessons, pass sandbox commands as source for verification
    if (isGitLesson) {
      onRunCode({ language: 'git', source: '', filename: null });
    } else {
      onRunCode({ language: runLanguage, source: value, filename: runFilename });
    }
  }, [canRun, onRunCode, runLanguage, value, runFilename, isGitLesson]);

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
          <Tabs
            value={showingFile ? '' : generatedDisplayTab}
            onValueChange={(tab) => tab && handleActivateGenerated(tab)}
            variant="underline"
          >
            <TabsList>
              {generatedTabs.map((tab) => {
                const isPseudo = tab === 'pseudocode';
                return (
                  <TabsTrigger
                    key={`gen:${tab}`}
                    value={tab}
                    indicatorClassName={isPseudo ? 'bg-[var(--algorithm)]' : ''}
                    title={isPseudo ? 'The algorithm — language-agnostic' : `Same algorithm, written in ${LANGUAGE_LABELS[tab] || tab}`}
                  >
                    {isPseudo && (
                      <Lightbulb size={12} style={{ marginRight: 4 }} />
                    )}
                    {isPseudo ? 'Pseudocode' : (LANGUAGE_LABELS[tab] || tab)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {openFiles.length > 0 && <span style={styles.tabDivider} />}

          <MorphingFileTabs
            files={openFiles}
            activePath={showingFile ? activePath : null}
            onSelect={handleActivateFile}
            onClose={onCloseFile}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>

        <div style={styles.tabActions}>
          <button
            type="button"
            className="ui-toolbar-button"
            style={styles.iconBtn}
            onClick={() => {
              const editor = editorRef.current;
              if (!editor) return;
              editor.getAction('actions.find')?.run();
            }}
            title="Find in file (Ctrl+F)"
            aria-label="Find in file"
          >
            <Search size={14} />
          </button>
          {/* Font-size scaler — A−, current size (click to reset), A+.
              Ctrl/⌘ + / − / 0 zoom the whole app (App.jsx), not the editor. */}
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
            <StatefulButton
              state={runButtonState}
              size="sm"
              icon={lessonMode ? <Check size={12} /> : <Play size={12} />}
              loadingText={isSourceCheck ? 'Checking' : 'Running'}
              successText={isSourceCheck ? 'Passed' : 'Ran'}
              errorText={isSourceCheck ? 'Check failed' : 'Run failed'}
              className="ui-toolbar-button ui-primary-button"
              style={styles.runBtn}
              onClick={handleRun}
              title={isGitLesson ? 'Check your Git commands' : isSourceCheck ? 'Check your code' : `Run with ${runLanguage}`}
            >
              {isSourceCheck ? 'Check' : 'Run'}
            </StatefulButton>
          )}

          {!showingFile && !folderOpen && !lessonMode && (
            <button
              className="ui-toolbar-button"
              style={{ ...styles.lockBtn, ...(editable ? styles.lockBtnActive : {}) }}
              onClick={() => { setEditable((e) => !e); clearSelection(); setTooltip(null); }}
              title={editable ? 'Switch to read-only' : 'Switch to editable (paste your own code)'}
              aria-label={editable ? 'Switch to read-only' : 'Switch to editable (paste your own code)'}
              aria-pressed={editable}
            >
              {editable ? <Pencil size={12} /> : <Lock size={12} />}
            </button>
          )}
        </div>
      </div>

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

      {editorBreadcrumbs && !lessonMode && !showEmptyState && !(lessonMode && lessonLanguage === 'git') && (
        <EditorBreadcrumbs
          showingFile={showingFile}
          activePath={activePath}
          generatedDisplayTab={generatedDisplayTab}
          folderOpen={folderOpen}
          editorRef={editorRef}
          monacoLang={monacoLang}
          value={value}
        />
      )}

      <div style={styles.editorWrap}>
        {showEmptyState ? (
          <div style={styles.emptyWorkspace}>
            <p style={styles.emptyText}>
              Open a file or generate code to get started.
            </p>
          </div>
        ) : lessonMode && lessonLanguage === 'git' ? (
          <SandboxTerminal
            visible={true}
            onToggle={() => {}}
            resetKey={`${lessonId}-${sandboxResetTrigger}`}
            onCommandRun={(command, output) => {
              // Track the last command for verification
              setLastSandboxCommand(command);
              // Also report command + output to parent for lesson verification
              onSandboxCommand?.(command, output);
            }}
          />
        ) : (
          <Editor
            // The key also encodes the mode (Learn vs Workspace) so a
            // mode switch always mounts a fresh Monaco instance — stale
            // editor content from the other mode can never linger when
            // both modes happen to sit on the same tab language.
            key={showingFile ? `file:${activePath}` : `gen:${lessonMode ? 'lesson' : 'workspace'}:${generatedDisplayTab}`}
            height="100%"
            language={monacoLang}
            value={value}
            theme={colorMode === 'light' ? 'beui-light' : 'beui-dark'}
            beforeMount={defineSeec0deThemes}
            onMount={handleEditorMount}
            onFocus={() => setFocusTarget('editor')}
            onChange={handleChange}
            options={editorOptions}
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
                ? <BeuiLoader variant="scramble" size={16} label="Explaining selected code" className="text-muted-foreground" />
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

// Lightweight breadcrumbs bar: standalone Monaco does not ship VS Code's
// breadcrumbs widget, so we render our own file-path + symbol trail.
function EditorBreadcrumbs({ showingFile, activePath, generatedDisplayTab, folderOpen, editorRef, monacoLang, value }) {
  const [caretSymbols, setCaretSymbols] = useState([]); // { label, line }

  // Track cursor position and recompute enclosing symbols from plain text.
  // editorRef is a mutable ref set by handleEditorMount, so we poll until it
  // is available rather than relying on it being ready at effect start.
  useEffect(() => {
    let d1 = null;
    let d2 = null;
    let timer = null;
    let cancelled = false;

    const attach = () => {
      const editor = editorRef.current;
      if (!editor) {
        if (!cancelled) timer = setTimeout(attach, 80);
        return;
      }
      const update = () => {
        const pos = editor.getPosition();
        if (!pos) { setCaretSymbols([]); return; }
        setCaretSymbols(findEnclosingSymbols(value || '', pos.lineNumber, monacoLang));
      };
      update();
      d1 = editor.onDidChangeCursorPosition(update);
      d2 = editor.onDidChangeModelContent(update);
    };

    attach();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (d1) d1.dispose();
      if (d2) d2.dispose();
    };
  }, [value, monacoLang]); // eslint-disable-line react-hooks/exhaustive-deps

  const segments = useMemo(() => {
    if (showingFile && activePath) {
      const parts = activePath.split(/[/\\]/).filter(Boolean);
      const fileName = parts.pop() || activePath;
      const dirs = parts.slice(-3);
      const out = [];
      for (const d of dirs) out.push({ label: d, line: null });
      out.push({ label: fileName, line: null });
      for (const s of caretSymbols) out.push({ label: s.label, line: s.line });
      return out;
    }
    const label = generatedDisplayTab === 'pseudocode'
      ? 'Pseudocode'
      : (LANGUAGE_LABELS[generatedDisplayTab] || generatedDisplayTab);
    if (caretSymbols.length) return [{ label, line: null }, ...caretSymbols.map((s) => ({ label: s.label, line: s.line }))];
    return [{ label, line: null }];
  }, [showingFile, activePath, generatedDisplayTab, caretSymbols]);

  const jumpToLine = useCallback((lineNum) => {
    if (!lineNum) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(lineNum, 0);
    editor.setPosition({ lineNumber: lineNum, column: 1 });
    editor.focus();
  }, []);

  if (segments.length === 0) return null;

  return (
    <nav style={breadcrumbStyles.bar} aria-label="Breadcrumbs">
      {segments.map((seg, idx) => {
        const isSymbol = seg.line !== null;
        const isLast = idx === segments.length - 1;
        return (
          <React.Fragment key={`${idx}:${seg.label}`}>
            {idx > 0 && <ChevronRight size={12} style={breadcrumbStyles.sep} />}
            <button
              type="button"
              style={{
                ...breadcrumbStyles.item,
                ...(isLast ? breadcrumbStyles.itemActive : {}),
                ...(isSymbol ? breadcrumbStyles.itemClickable : {}),
              }}
              title={isSymbol ? `Jump to ${seg.label} (line ${seg.line})` : seg.label}
              onClick={isSymbol ? () => jumpToLine(seg.line) : undefined}
              tabIndex={isSymbol ? 0 : -1}
              onMouseDown={(e) => { if (!isSymbol) e.preventDefault(); }}
            >
              {seg.label}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// Scan source lines up to cursorLine and collect enclosing block headers.
// Language-aware by regex; deliberately simple and synchronous — no parser.
function findEnclosingSymbols(source, cursorLine, monacoLang) {
  const lines = source.split('\n');
  const upTo = Math.min(cursorLine - 1, lines.length - 1);
  const stack = [];

  const patterns = (() => {
    if (monacoLang === 'python') {
      return [
        { re: /^\s*class\s+(\w+)/, label: (m) => `class ${m[1]}` },
        { re: /^\s*(?:async\s+)?def\s+(\w+)\s*\(/, label: (m) => `${m[1]}()` },
      ];
    }
    if (monacoLang === 'javascript' || monacoLang === 'typescript') {
      return [
        { re: /^\s*class\s+(\w+)/, label: (m) => `class ${m[1]}` },
        { re: /^\s*(?:async\s+)?function\s+(\w+)\s*\(/, label: (m) => `${m[1]}()` },
        { re: /^\s*(?:export\s+)?(?:async\s+)?(?:function\s*\*?\s*(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\(|[^=]*=>))/, label: (m) => `${m[1] || m[2]}()` },
        { re: /^\s*(?:get|set)?\s*(\w+)\s*\([^)]*\)\s*\{/, label: (m) => `${m[1]}()` },
      ];
    }
    if (monacoLang === 'java' || monacoLang === 'csharp' || monacoLang === 'cpp' || monacoLang === 'c' || monacoLang === 'go' || monacoLang === 'rust') {
      return [
        { re: /^\s*(?:public|private|protected)?\s*(?:static\s+)?class\s+(\w+)/, label: (m) => `class ${m[1]}` },
        { re: /^\s*(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:\{|;|throws)/, label: (m) => `${m[1]}()` },
      ];
    }
    // plaintext / pseudocode and others: no symbols
    return [];
  })();

  if (patterns.length === 0) return [];

  // Track indent-aware nesting. Works well for Python (indent) and reasonably
  // for brace languages when the cursor is below an opening brace line.
  const indents = [];
  for (let i = 0; i <= upTo; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    // Pop stack where indent dedented (for indent-sensitive scan) or when we
    // passed a closing brace that closed a tracked block (simple).
    const indent = line.length - line.trimStart().length;
    while (indents.length && indent <= indents[indents.length - 1]) {
      indents.pop();
      stack.pop();
    }

    for (const p of patterns) {
      const m = line.match(p.re);
      if (m) {
        stack.push({ label: p.label(m), line: i + 1 });
        indents.push(indent);
        break;
      }
    }
  }
  // Return at most last 3 enclosing symbols to keep the trail compact.
  return stack.slice(-3);
}

const breadcrumbStyles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    minHeight: 22,
    padding: '2px var(--space-3)',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    fontSize: 11,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  item: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 160,
    fontWeight: 400,
    fontSize: 11,
    lineHeight: '18px',
  },
  itemClickable: {
    cursor: 'pointer',
    borderRadius: 3,
    color: 'var(--accent)',
  },
  itemActive: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  sep: {
    flexShrink: 0,
    color: 'var(--text-muted)',
    opacity: 0.7,
  },
};

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
    // editorWrap is position:relative but not a flex container, so this
    // layer has to span it explicitly — otherwise the placeholder sits at
    // the top instead of the middle of the panel.
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
