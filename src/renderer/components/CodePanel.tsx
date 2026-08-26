import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Lock, Pencil, Loader, X, Play, Lightbulb, Check, Code2, Sparkles } from 'lucide-react';
import KeywordTooltip from './KeywordTooltip';
import SandboxTerminal from './SandboxTerminal';
import { LANGUAGES } from '../engine/languages';
import { fileInfo, basename } from '../engine/fileLanguage';
import { registerEditor, unregisterEditor, setFocusTarget } from '../engine/editorBridge';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'c', 'cpp', 'react']);
const FONT_SIZE_KEY = 'seec0de.editorFontSize';
const FONT_SIZE_DEFAULT = 13;
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 28;
const FONT_SIZE_STEP = 1;
function readSavedFontSize(): number { const raw = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '', 10); return Number.isFinite(raw) && raw >= FONT_SIZE_MIN && raw <= FONT_SIZE_MAX ? raw : FONT_SIZE_DEFAULT; }
function clampFontSize(n: number): number { return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, n)); }

const DEFAULT_FILENAME_FOR_LANG: Record<string, string> = { javascript: 'main.js', typescript: 'main.ts', python: 'main.py', c: 'main.c', cpp: 'main.cpp' };
const LANGUAGE_MONACO_MAP: Record<string, string> = { python: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp', csharp: 'csharp', go: 'go', rust: 'rust', typescript: 'typescript', c: 'c', react: 'javascript', nodejs: 'javascript' };
const LANGUAGE_LABELS: Record<string, string> = { python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++', csharp: 'C#', go: 'Go', rust: 'Rust', typescript: 'TypeScript', c: 'C', react: 'React', nodejs: 'Node.js' };

const VOID_ELEMENTS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const HTML_TAGS = ['html','head','body','div','span','p','a','h1','h2','h3','h4','h5','h6','ul','ol','li','table','thead','tbody','tr','td','th','form','input','button','select','option','textarea','label','fieldset','legend','header','footer','main','nav','section','article','aside','figure','figcaption','img','video','audio','source','canvas','svg','iframe','script','style','link','meta','title','base','br','hr','pre','code','blockquote','cite','dl','dt','dd','details','summary','dialog','template','slot','picture'];

let _htmlCompletionRegistered = false;
function registerHtmlCompletions(monaco: any) {
  if (_htmlCompletionRegistered) return; _htmlCompletionRegistered = true;
  monaco.languages.registerCompletionItemProvider('html', {
    triggerCharacters: ['<', ' '],
    provideCompletionItems(model: any, position: any) {
      const line = model.getLineContent(position.lineNumber);
      const textBefore = line.slice(0, position.column - 1);
      const tagMatch = textBefore.match(/<([a-zA-Z]*)$/);
      if (tagMatch) { const prefix = tagMatch[1].toLowerCase(); return { suggestions: HTML_TAGS.filter((t) => t.startsWith(prefix)).map((tag) => ({ label: tag, kind: monaco.languages.CompletionItemKind.Property, insertText: VOID_ELEMENTS.has(tag) ? tag : `${tag}>$0</${tag}>`, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: VOID_ELEMENTS.has(tag) ? `<${tag}> (void)` : `<${tag}>…</${tag}>`, range: { startLineNumber: position.lineNumber, startColumn: position.column - tagMatch[0].length + 1, endLineNumber: position.lineNumber, endColumn: position.column } })) }; }
      const attrMatch = textBefore.match(/<([a-zA-Z]+)\s+([a-zA-Z-]*)$/);
      if (attrMatch) { const attrPrefix = attrMatch[2].toLowerCase(); const attrs = ['class','id','style','href','src','alt','title','name','value','type','placeholder','disabled','hidden','role','aria-label','onclick','data-id']; return { suggestions: attrs.filter((a) => a.startsWith(attrPrefix)).map((attr) => ({ label: attr, kind: monaco.languages.CompletionItemKind.Property, insertText: `${attr}="$1"`, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: attr, range: { startLineNumber: position.lineNumber, startColumn: position.column - attrPrefix.length, endLineNumber: position.lineNumber, endColumn: position.column } })) }; }
      return { suggestions: [] };
    },
  });
}

function defineSeec0deThemes(monaco: any) {
  registerHtmlCompletions(monaco);
  try { if (monaco.languages?.html?.htmlDefaults) monaco.languages.html.htmlDefaults.setOptions({ autoClosingTags: true, autoIndent: true }); } catch {}
  monaco.editor.defineTheme('seec0de-green', { base: 'vs-dark', inherit: true, rules: [{ token: 'keyword', foreground: 'C8B6FF' }, { token: 'string', foreground: 'EFB78F' }, { token: 'number', foreground: 'A8D8A0' }, { token: 'comment', foreground: '70756D' }, { token: 'type', foreground: '9CC9FF' }], colors: { 'editor.background': '#0B0D0C', 'editor.foreground': '#F2F0E9', 'editorLineNumber.foreground': '#61645E', 'editorLineNumber.activeForeground': '#C7C5BD', 'editor.selectionBackground': '#35451F', 'editor.inactiveSelectionBackground': '#29351B', 'editorCursor.foreground': '#C8FF4D', 'editorIndentGuide.background1': '#232620', 'editorIndentGuide.activeBackground1': '#353A30' } });
  monaco.editor.defineTheme('seec0de-light', { base: 'vs', inherit: true, rules: [{ token: 'keyword', foreground: '6366F1' }, { token: 'string', foreground: 'C2410C' }, { token: 'number', foreground: '0D9488' }, { token: 'comment', foreground: '94A3B8', fontStyle: 'italic' }, { token: 'type', foreground: '0891B2' }], colors: { 'editor.background': '#FFFFFF', 'editor.foreground': '#1A1D23', 'editorLineNumber.foreground': '#B0B5BF', 'editorLineNumber.activeForeground': '#525866', 'editor.selectionBackground': 'rgba(99, 102, 241, 0.15)', 'editor.inactiveSelectionBackground': 'rgba(99, 102, 241, 0.08)', 'editorCursor.foreground': '#6366F1', 'editorIndentGuide.background1': '#E2E4E8', 'editorIndentGuide.activeBackground1': '#D0D3D8' } });
}

interface Tooltip { keyword: string; language: string; definition: string; example: string; position: { top: number; left: number }; }

interface CodePanelProps {
  generatedCode: any;
  selectedLanguages: string[];
  appTheme?: string;
  onCodeChange?: (tab: string, content: string) => void;
  onSelectionExplain?: (selection: string, language: string) => void;
  aiLoading?: boolean;
  openFiles?: any[];
  activePath?: string | null;
  onActivatePath?: (path: string | null) => void;
  onCloseFile?: (path: string) => void;
  onFileContentChange?: (path: string, content: string) => void;
  onRunCode?: (opts: any) => void;
  runLoading?: boolean;
  activeGeneratedTab?: string;
  onActivateGeneratedTab?: (tab: string) => void;
  folderOpen?: boolean;
  lessonMode?: boolean;
  lessonLanguage?: string;
  lessonId?: string | null;
  sandboxResetTrigger?: number;
  onSandboxCommand?: (cmd: string, output: string) => void;
}

export default function CodePanel(props: CodePanelProps) {
  const { generatedCode, selectedLanguages, appTheme = 'seec0de-dark', onCodeChange, onSelectionExplain, aiLoading, openFiles = [], activePath, onActivatePath, onCloseFile, onFileContentChange, onRunCode, runLoading = false, activeGeneratedTab = 'pseudocode', onActivateGeneratedTab, folderOpen = false, lessonMode = false, lessonLanguage = 'javascript', lessonId, sandboxResetTrigger = 0, onSandboxCommand } = props;
  const generatedTabs = folderOpen ? [] : lessonMode ? [lessonLanguage || 'javascript'] : ['pseudocode', ...selectedLanguages];
  const [editable, setEditable] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [btnPos, setBtnPos] = useState<{ top: number; left: number } | null>(null);
  const editorRef = useRef<any>(null);
  const [lastSandboxCommand, setLastSandboxCommand] = useState('');
  const [fontSize, setFontSize] = useState(() => readSavedFontSize());
  useEffect(() => { localStorage.setItem(FONT_SIZE_KEY, String(fontSize)); }, [fontSize]);
  const bumpFontSize = useCallback((delta: number) => setFontSize((prev) => clampFontSize(prev + delta)), []);
  const resetFontSize = useCallback(() => setFontSize(FONT_SIZE_DEFAULT), []);
  const fileTab = activePath ? openFiles.find((f) => f.path === activePath) : null;
  const showingFile = !!fileTab;
  const generatedDisplayTab = generatedTabs.includes(activeGeneratedTab) ? activeGeneratedTab : (lessonMode ? (lessonLanguage || 'javascript') : 'pseudocode');
  const isPseudocode = !showingFile && !folderOpen && !lessonMode && generatedDisplayTab === 'pseudocode';
  const showEmptyState = folderOpen && !showingFile;
  let value = ''; let monacoLang = 'plaintext'; let isReadOnly = !(editable || lessonMode);
  if (showingFile) { value = fileTab.content || ''; monacoLang = fileInfo(fileTab.path).monaco; isReadOnly = false; }
  else if (isPseudocode) { value = generatedCode.pseudocode || ''; monacoLang = 'plaintext'; }
  else { value = (generatedCode.code && generatedCode.code[generatedDisplayTab]) || ''; monacoLang = LANGUAGE_MONACO_MAP[generatedDisplayTab] || 'plaintext'; }
  const tooltipLanguage = showingFile ? (fileInfo(fileTab.path).run || fileInfo(fileTab.path).monaco) : generatedDisplayTab;
  const clearSelection = useCallback(() => { setSelection(null); setBtnPos(null); }, []);
  useEffect(() => () => unregisterEditor(), []);

  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
    registerEditor(editor, { setContent: (content: string) => { if (showingFile) { onFileContentChange?.(fileTab!.path, content); return; } if (!editable && !lessonMode) return; onCodeChange?.(generatedDisplayTab, content); } });
    editor.onDidChangeCursorSelection((e: any) => {
      if (lessonMode) { clearSelection(); return; }
      const model = editor.getModel(); if (!model) return;
      const selectedText = model.getValueInRange(e.selection);
      if (selectedText.trim()) { setSelection(selectedText); const coords = editor.getScrolledVisiblePosition(e.selection.getEndPosition()); if (coords) setBtnPos({ top: coords.top + 30, left: coords.left + 40 }); } else { clearSelection(); }
    });
    editor.onMouseDown((e: any) => {
      if (isPseudocode) return;
      const pos = e.target.position; if (!pos) return;
      const model = editor.getModel(); if (!model) return;
      const word = model.getWordAtPosition(pos); if (!word) return;
      const lang = (LANGUAGES as any)[tooltipLanguage]; if (!lang || !lang.glossary[word.word]) return;
      const coords = editor.getScrolledVisiblePosition(pos); if (!coords) return;
      const entry = lang.glossary[word.word];
      setTooltip({ keyword: word.word, language: LANGUAGE_LABELS[tooltipLanguage] || tooltipLanguage, definition: entry.definition, example: entry.example, position: { top: coords.top + 24, left: coords.left + 20 } });
    });
  }, [isPseudocode, lessonMode, tooltipLanguage, clearSelection, showingFile, fileTab, editable, onFileContentChange, onCodeChange, generatedDisplayTab]);

  const handleChange = useCallback((val: string | undefined) => {
    const next = val ?? '';
    if (showingFile) { onFileContentChange?.(fileTab!.path, next); return; }
    if (!editable && !lessonMode) return;
    onCodeChange?.(generatedDisplayTab, next);
  }, [editable, lessonMode, generatedDisplayTab, onCodeChange, showingFile, fileTab, onFileContentChange]);

  const explainLanguage = showingFile ? fileInfo(fileTab!.path).run || 'plaintext' : generatedDisplayTab;
  const handleExplain = useCallback(() => { if (selection && (showingFile || !isPseudocode)) { onSelectionExplain?.(selection, explainLanguage); clearSelection(); } }, [selection, isPseudocode, showingFile, explainLanguage, onSelectionExplain, clearSelection]);
  const showExplainButtons = !lessonMode && (showingFile || (editable && !isPseudocode)) && selection && btnPos;
  const editorOptions = useMemo(() => ({ readOnly: isReadOnly, minimap: { enabled: false }, fontSize, lineNumbers: 'on' as const, scrollBeyondLastLine: false, wordWrap: 'on' as const, quickSuggestions: { other: true, comments: false, strings: false }, suggest: { showKeywords: true, showSnippets: true, showModules: true, insertMode: 'insert' as const }, tabCompletion: 'on' as const, wordBasedSuggestions: 'off' as const, autoClosingBrackets: 'always' as const, autoClosingQuotes: 'always' as const, padding: { top: 12, bottom: 12 }, cursorBlinking: 'smooth' as const, smoothScrolling: true, renderLineHighlight: 'all' as const }), [isReadOnly, fontSize]);

  let runLanguage: string | null = null; let runFilename: string | null = null;
  if (showingFile) { const info = fileInfo(fileTab!.path); runLanguage = info.run; runFilename = basename(fileTab!.path); }
  else if (!isPseudocode) { runLanguage = generatedDisplayTab; runFilename = DEFAULT_FILENAME_FOR_LANG[generatedDisplayTab] || null; }
  const isGitLesson = lessonLanguage === 'git';
  const canRun = isGitLesson ? lessonMode : !!onRunCode && !!runLanguage && (RUNNABLE.has(runLanguage!) || (lessonMode && !RUNNABLE.has(runLanguage!))) && (value || '').trim().length > 0;
  const handleRun = useCallback(() => { if (!canRun) return; if (isGitLesson) { onRunCode?.({ language: 'git', source: '', filename: null }); } else { onRunCode?.({ language: runLanguage, source: value, filename: runFilename }); } }, [canRun, onRunCode, runLanguage, value, runFilename, isGitLesson]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return; const target = event.target; const inMonaco = target instanceof Element && !!target.closest('.monaco-editor'); const inOtherInput = target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'); if (inOtherInput && !inMonaco) return; event.preventDefault(); handleRun(); }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true); }, [handleRun]);
  const handleActivateGenerated = (tab: string) => { onActivatePath?.(null); onActivateGeneratedTab?.(tab); setTooltip(null); clearSelection(); };
  const handleActivateFile = (filePath: string) => { onActivatePath?.(filePath); setTooltip(null); clearSelection(); };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden min-w-0">
      {/* Tab bar */}
      <div className="flex items-center bg-[var(--bg-secondary)] border-b border-[var(--border)] backdrop-blur-sm">
        <div className="flex flex-1 overflow-x-auto items-stretch scrollbar-hide">
          {generatedTabs.map((tab) => {
            const isActive = !showingFile && generatedDisplayTab === tab;
            const isPseudo = tab === 'pseudocode';
            return (
              <button
                key={`gen:${tab}`}
                className={cn(
                  'group relative inline-flex items-center gap-1.5 border-none bg-transparent min-h-[42px] text-[12px] font-medium px-4 whitespace-nowrap transition-all duration-200',
                  isActive
                    ? 'text-[var(--text-primary)] bg-[var(--bg-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/50'
                )}
                onClick={() => handleActivateGenerated(tab)}
                title={isPseudo ? 'The algorithm — language-agnostic' : `Same algorithm, written in ${LANGUAGE_LABELS[tab] || tab}`}
              >
                {isPseudo && <Lightbulb size={12} className={cn('transition-colors', isActive ? 'text-[var(--algorithm)]' : 'text-[var(--text-muted)] group-hover:text-[var(--algorithm)]/60')} />}
                <span>{isPseudo ? 'Algorithm' : (LANGUAGE_LABELS[tab] || tab)}</span>
                {isActive && <span className={cn('absolute bottom-0 left-2 right-2 h-[2px] rounded-full', isPseudo ? 'bg-[var(--algorithm)]' : 'bg-[var(--accent)]')} />}
              </button>
            );
          })}
          {openFiles.length > 0 && <div className="w-px self-stretch my-2 bg-[var(--border)]" />}
          {openFiles.map((f) => {
            const isActive = showingFile && activePath === f.path;
            return (
              <div key={`file:${f.path}`} className={cn('group relative flex items-center min-h-[42px] text-[12px] whitespace-nowrap', isActive ? 'text-[var(--text-primary)] bg-[var(--bg-primary)]' : 'text-[var(--text-muted)]')}>
                <button className="bg-transparent border-none text-inherit min-h-[42px] text-[12px] font-medium px-3 flex items-center gap-1.5 hover:text-[var(--text-secondary)]" onClick={() => handleActivateFile(f.path)} title={f.path}>
                  <Code2 size={11} className="opacity-50" />
                  <span>{basename(f.path)}</span>
                  {f.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />}
                </button>
                <button className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-[var(--text-muted)] hover:text-[var(--text-primary)] w-5 h-5 p-0 flex items-center justify-center rounded transition-all duration-150 mr-1" onClick={(e) => { e.stopPropagation(); onCloseFile?.(f.path); }} title="Close file"><X size={10} /></button>
                {isActive && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--accent)]" />}
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 pr-2.5">
          {/* Font size */}
          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/60 overflow-hidden" role="group" aria-label="Editor font size">
            <button type="button" className={cn('h-7 px-2 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-150 bg-transparent border-none cursor-pointer', fontSize <= FONT_SIZE_MIN && 'opacity-30 cursor-not-allowed')} onClick={() => bumpFontSize(-FONT_SIZE_STEP)} disabled={fontSize <= FONT_SIZE_MIN} title="Decrease font size">A−</button>
            <button type="button" className="h-7 px-2 text-[11px] font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border-x border-[var(--border)] cursor-pointer tabular-nums min-w-[36px] text-center" onClick={resetFontSize} title={`Reset to ${FONT_SIZE_DEFAULT}px`}>{fontSize}</button>
            <button type="button" className={cn('h-7 px-2 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-150 bg-transparent border-none cursor-pointer', fontSize >= FONT_SIZE_MAX && 'opacity-30 cursor-not-allowed')} onClick={() => bumpFontSize(FONT_SIZE_STEP)} disabled={fontSize >= FONT_SIZE_MAX} title="Increase font size">A+</button>
          </div>

          {/* Run button */}
          {canRun && (
            <Button
              size="sm"
              className={cn('h-7 px-3 gap-1.5 text-[11px] font-semibold rounded-lg', runLoading && 'opacity-50 cursor-not-allowed')}
              onClick={handleRun}
              disabled={runLoading}
              title={isGitLesson ? 'Check your Git commands' : `Run with ${runLanguage}`}
            >
              {runLoading ? <Loader size={11} className="animate-spin" /> : lessonMode ? <Check size={11} /> : <Play size={11} className="fill-current" />}
              <span>{runLoading ? 'Running' : lessonMode ? 'Check' : 'Run'}</span>
            </Button>
          )}

          {/* Edit toggle */}
          {!showingFile && !folderOpen && !lessonMode && (
            <button
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-all duration-200 cursor-pointer',
                editable
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
                  : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              )}
              onClick={() => { setEditable((e) => !e); clearSelection(); setTooltip(null); }}
              title={editable ? 'Read-only' : 'Edit mode'}
            >
              {editable ? <Pencil size={11} /> : <Lock size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* File status bar */}
      {showingFile && (
        <div className="flex items-center gap-1.5 h-6 px-3 bg-[var(--bg-secondary)]/80 border-b border-[var(--border)] text-[10px] text-[var(--text-muted)]">
          {fileTab!.dirty ? (
            <><Loader size={9} className="animate-spin text-[var(--accent)]" /><span className="text-[var(--text-muted)]">Saving…</span></>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" /><span className="text-emerald-600/80 dark:text-emerald-400/80">Saved</span></>
          )}
          <span className="ml-auto opacity-50">{monacoLang}</span>
        </div>
      )}

      {/* Pseudocode info bar */}
      {isPseudocode && (generatedCode.pseudocode || '').trim().length > 0 && (
        <div className="flex items-center gap-2.5 h-9 px-4 bg-[var(--algorithm)]/5 border-b border-[var(--algorithm)]/10 text-[12px]">
          <Lightbulb size={12} className="text-[var(--algorithm)]" />
          <span className="text-[var(--text-primary)] font-semibold">Algorithm</span>
          <span className="text-[var(--text-muted)]">— same idea across all languages</span>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 relative overflow-hidden">
        {showEmptyState ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/5 border border-[var(--accent)]/10 flex items-center justify-center">
              <Code2 size={28} className="text-[var(--accent)]/60" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] m-0">Your workspace</h3>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed max-w-[340px] m-0">
                Open a file from the explorer, or describe what you want and hit <strong className="text-[var(--text-secondary)]">Generate</strong>
              </p>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]/60 m-0">Highlight code in a file to get an explanation</p>
          </div>
        ) : lessonMode && lessonLanguage === 'git' ? (
          <SandboxTerminal visible={true} onToggle={() => {}} resetKey={`${lessonId}-${sandboxResetTrigger}`} onCommandRun={(command, output) => { setLastSandboxCommand(command); onSandboxCommand?.(command, output); }} />
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
            options={editorOptions}
          />
        )}

        {/* Floating explain button */}
        {showExplainButtons && (
          <div className="absolute z-10" style={{ top: btnPos!.top, left: btnPos!.left }}>
            <button
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-[var(--bg-elevated)]/90 backdrop-blur-md border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] text-[11px] font-medium shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
              onClick={handleExplain}
              disabled={aiLoading}
              title={aiLoading ? 'Thinking…' : 'Explain selected code'}
            >
              {aiLoading ? (
                <><Loader size={11} className="animate-spin text-[var(--accent)]" /><span className="text-[var(--accent)]">Thinking…</span></>
              ) : (
                <><Sparkles size={11} className="text-[var(--accent)]" /><span>Explain</span></>
              )}
            </button>
          </div>
        )}
        <KeywordTooltip keyword={tooltip?.keyword || ''} description={tooltip?.definition || ''} />
      </div>
    </div>
  );
}
