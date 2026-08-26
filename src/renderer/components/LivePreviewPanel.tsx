import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Eye, Terminal as TermIcon, RefreshCw, ChevronLeft, ChevronRight, Trash2, Code2, FileCode2, AlertTriangle, Wrench, X as CloseIcon, Sparkles, ExternalLink } from 'lucide-react';
import { translateError } from '../engine/errorTranslator';
import { explainErrorWithAI, hasApiKey } from '../engine/aiService';
import { renderInline } from './InlineCode';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const PREVIEWABLE = new Set(['html']);
const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'c', 'cpp', 'react']);
const DEBOUNCE_MS = 250;
const MAX_LOG_ENTRIES = 200;

function buildSrcDoc(language: string, code: string): string | null {
  if (!code) return null;
  if (language === 'html') return code;
  return null;
}

function languageLabel(l: string): string {
  return ({ python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', c: 'C', cpp: 'C++', html: 'HTML', css: 'CSS', plaintext: 'Pseudocode' } as Record<string, string>)[l] || l || 'this code';
}

interface ConsoleEntry { id: number; ts: number; level: string; args: string[]; }
interface ErrorTranslation { title: string; plain: string; fixes?: string[]; source?: string; }

interface LivePreviewPanelProps {
  visible?: boolean;
  onToggle?: () => void;
  code?: string;
  language?: string;
  filename?: string | null;
  projectRoot?: string | null;
  runnerOutput?: any;
  runnerStream?: { level: string; text: string }[];
  runnerInputEnabled?: boolean;
  onRunnerInput?: (text: string) => void;
  runLoading?: boolean;
  collapsible?: boolean;
  showErrorExplanations?: boolean;
}

export default function LivePreviewPanel({ visible, onToggle, code = '', language = 'plaintext', filename = null, projectRoot = null, runnerOutput = null, runnerStream = [], runnerInputEnabled = false, onRunnerInput, runLoading = false, collapsible = true, showErrorExplanations = true }: LivePreviewPanelProps) {
  const previewable = PREVIEWABLE.has(language);
  const runnable = RUNNABLE.has(language);
  const [view, setView] = useState<'preview' | 'console'>('preview');
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const handleRefresh = useCallback(() => { setDebouncedCode(code); setRefreshNonce((n) => n + 1); }, [code]);
  const [errorTranslations, setErrorTranslations] = useState<ErrorTranslation[]>([]);
  const [dismissedTitles, setDismissedTitles] = useState(() => new Set<string>());
  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  const idRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunnerRef = useRef<any>(null);
  const runIdRef = useRef(0);

  useEffect(() => { if (showErrorExplanations) return; setErrorTranslations([]); setDismissedTitles(new Set()); setAiExplainLoading(false); runIdRef.current += 1; }, [showErrorExplanations]);
  useEffect(() => { if (!previewable) { setDebouncedCode(code); return; } if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => setDebouncedCode(code), DEBOUNCE_MS); return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, [code, previewable]);
  useEffect(() => { setConsoleEntries([]); setErrorTranslations([]); setDismissedTitles(new Set()); setAiExplainLoading(false); runIdRef.current += 1; }, [language, filename]);
  useEffect(() => { if (!previewable && runnable) setView('console'); if (!previewable && !runnable) setView('preview'); if (previewable) setView((v) => (v === 'console' && consoleEntries.length === 0 ? 'preview' : v)); }, [language]);

  const streamLenRef = useRef(0);
  useEffect(() => {
    if (runnerStream.length < streamLenRef.current) streamLenRef.current = 0;
    if (runnerStream.length === streamLenRef.current) return;
    const fresh = runnerStream.slice(streamLenRef.current);
    streamLenRef.current = runnerStream.length;
    setConsoleEntries((prev) => { const out = [...prev]; for (const line of fresh) { if (!line.text) continue; out.push({ id: ++idRef.current, ts: Date.now(), level: line.level, args: [line.text] }); } return out.length > MAX_LOG_ENTRIES ? out.slice(-MAX_LOG_ENTRIES) : out; });
  }, [runnerStream]);

  useEffect(() => {
    if (!runnerOutput || runnerOutput === lastRunnerRef.current) return;
    lastRunnerRef.current = runnerOutput;
    const streamed = runnerStream.length > 0;
    setConsoleEntries((prev) => {
      const out = [...prev];
      const push = (level: string, text: string) => { if (!text) return; out.push({ id: ++idRef.current, ts: Date.now(), level, args: [text] }); };
      if (runnerOutput.command) push('meta', `$ ${runnerOutput.command}`);
      if (!streamed && runnerOutput.stdout) push('stdout', runnerOutput.stdout.replace(/\n$/, ''));
      if (!streamed && runnerOutput.stderr) push('stderr', runnerOutput.stderr.replace(/\n$/, ''));
      const ms = runnerOutput.durationMs ?? 0;
      const ok = runnerOutput.exitCode === 0;
      push(ok ? 'meta' : 'stderr', `${ok ? '✓' : '✗'} exit ${runnerOutput.exitCode ?? '?'} · ${ms}ms`);
      return out.length > MAX_LOG_ENTRIES ? out.slice(-MAX_LOG_ENTRIES) : out;
    });
    const failed = (runnerOutput.exitCode ?? 0) !== 0;
    const runLang = runnerOutput.language || language;
    const runId = ++runIdRef.current;
    if (showErrorExplanations && failed && runnerOutput.stderr) {
      const offline = translateError(runnerOutput.stderr, runLang);
      setErrorTranslations(offline);
      const canUseAi = offline.length === 0 && hasApiKey() && (typeof navigator === 'undefined' || navigator.onLine);
      if (canUseAi) {
        setAiExplainLoading(true);
        explainErrorWithAI(runnerOutput.stderr, code, runLang).then((result) => { if (runId !== runIdRef.current) return; if (!result || (!result.title && !result.plain)) return; setErrorTranslations([{ ...result, source: 'ai' }]); }).catch((err) => { if (runId !== runIdRef.current) return; console.warn('[seec0de] AI error explain failed:', err?.message || err); }).finally(() => { if (runId !== runIdRef.current) return; setAiExplainLoading(false); });
      } else { setAiExplainLoading(false); }
    } else { setErrorTranslations([]); setAiExplainLoading(false); }
    setDismissedTitles(new Set());
    setView('console');
  }, [runnerOutput, runnerStream, language, code, showErrorExplanations]);

  const srcDoc = useMemo(() => (previewable ? buildSrcDoc(language, debouncedCode) : null), [language, debouncedCode, previewable]);
  const visibleTranslations = useMemo(() => errorTranslations.filter((t) => !dismissedTitles.has(t.title)), [errorTranslations, dismissedTitles]);

  if (!visible) {
    return (
      <button type="button" className="ui-panel-rail flex flex-col items-center gap-1 pt-3.5 bg-[var(--bg-secondary)] border-l border-[var(--border)] text-[var(--text-secondary)] border-y-0 border-r-0 w-[32px] shrink-0 cursor-pointer transition-colors duration-[var(--motion-fast)] hover:bg-[var(--bg-tertiary)]" onClick={onToggle} title="Show live preview" aria-label="Show live preview">
        <ChevronLeft size={12} /><Eye size={14} className="mt-1.5" /><span className="[writing-mode:vertical-rl] rotate-180 text-[var(--text-xs)] tracking-wider text-[var(--text-muted)] mt-2">PREVIEW</span>
      </button>
    );
  }

  return (
    <div className="w-full shrink-0 flex flex-col bg-[var(--bg-primary)] border-l border-[var(--border)] min-w-0 overflow-hidden">
      <div className="flex items-stretch bg-[var(--bg-secondary)] border-b border-[var(--border)] min-h-[var(--panel-header-height)]">
        <div className="flex flex-1 overflow-hidden">
          {(['preview', 'console'] as const).map((v) => (
            <button key={v} className={cn('ui-tab inline-flex items-center bg-none border-none border-b-2 border-b-transparent text-[var(--text-secondary)] min-h-[var(--panel-header-height)] text-[var(--text-sm)] font-medium px-3 whitespace-nowrap transition-colors duration-[var(--motion-fast)]', view === v && 'text-[var(--text-primary)] border-b-[var(--text-primary)] bg-[var(--bg-primary)]')} onClick={() => setView(v)} title={v === 'preview' ? 'Visual preview' : 'Console output (logs, runner output)'}>
              {v === 'preview' ? <Eye size={12} /> : <TermIcon size={12} />}
              <span className="ml-1.5">{v === 'preview' ? 'Preview' : 'Console'}</span>
              {v === 'console' && consoleEntries.length > 0 && <span className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-strong)] text-[10px] font-medium px-1.5 rounded-full ml-1.5 min-w-[18px] text-center">{consoleEntries.length}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 pr-1.5">
          {view === 'console' && consoleEntries.length > 0 && <button type="button" className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={() => { setConsoleEntries([]); setErrorTranslations([]); setDismissedTitles(new Set()); setAiExplainLoading(false); runIdRef.current += 1; }} title="Clear console"><Trash2 size={12} /></button>}
          {view === 'preview' && previewable && projectRoot && <button type="button" className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={() => { (window as any).seecode.preview.startServer(projectRoot).then((result: any) => { if (result?.url) (window as any).seecode.preview.openDetached({ url: result.url }); }); }} title="Open in seec0de Browser"><ExternalLink size={12} /></button>}
          {view === 'preview' && previewable && <button type="button" className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={handleRefresh} title="Refresh preview"><RefreshCw size={12} /></button>}
          {collapsible && <button type="button" className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={onToggle} title="Hide preview"><ChevronRight size={14} /></button>}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {view === 'preview' && (
          previewable ? <iframe key={refreshNonce} title="Live preview" className="flex-1 border-none bg-white w-full h-full" srcDoc={srcDoc || ''} sandbox="allow-scripts allow-modals allow-forms" /> : <PlaceholderView language={language} runnable={runnable} runLoading={runLoading} />
        )}
        {view === 'console' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {(visibleTranslations.length > 0 || aiExplainLoading) && (
              <div className="shrink-0 max-h-[55%] overflow-y-auto py-1 border-b border-[var(--border)] bg-[rgba(255,80,80,0.03)]">
                {visibleTranslations.length > 1 && <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-0.5 text-[10.5px] tracking-wider uppercase text-[var(--text-muted)]"><AlertTriangle size={11} color="var(--danger)" /><span>{visibleTranslations.length} errors translated</span></div>}
                {visibleTranslations.map((t, i) => <ErrorTranslatorCard key={`${t.title}-${i}`} translation={t} indexLabel={visibleTranslations.length > 1 ? `${i + 1}/${visibleTranslations.length}` : null} onDismiss={() => setDismissedTitles((prev) => { const next = new Set(prev); next.add(t.title); return next; })} />)}
                {aiExplainLoading && visibleTranslations.length === 0 && <div className="shrink-0 m-2 px-3 py-2.5 rounded-[var(--radius-card)] bg-[rgba(255,80,80,0.06)] border border-[rgba(255,80,80,0.35)] text-[var(--text-primary)]"><div className="flex items-center gap-2 mb-1.5"><Sparkles size={14} color="var(--border-focus)" /><span className="flex-1 text-[var(--text-md)] font-semibold text-[var(--text-primary)]">Asking AI…</span></div></div>}
              </div>
            )}
            <ConsoleView entries={consoleEntries} inputEnabled={runnerInputEnabled} onInput={onRunnerInput} />
          </div>
        )}
      </div>

      {view === 'preview' && previewable && (
        <div className="h-[22px] shrink-0 flex items-center gap-2 px-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] text-[var(--text-muted)] text-[10.5px] tracking-[0.3px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /><span>Live · updates as you type</span>
          {filename && <span className="ml-auto text-[var(--text-muted)] font-mono text-[10px]">{filename}</span>}
        </div>
      )}
    </div>
  );
}

function PlaceholderView({ language, runnable, runLoading }: { language: string; runnable: boolean; runLoading: boolean }) {
  const isPseudo = language === 'plaintext';
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-1.5 text-[var(--text-muted)] bg-[var(--bg-primary)]">
      {isPseudo ? <Code2 size={28} color="var(--text-muted)" /> : <FileCode2 size={28} color="var(--text-muted)" />}
      <h3 className="text-[var(--text-lg)] text-[var(--text-primary)] font-semibold mt-2 m-0">{isPseudo ? 'Pseudocode is the lesson' : runnable ? (runLoading ? `Running ${languageLabel(language)}…` : `Ready to run ${languageLabel(language)}`) : 'Live preview not available'}</h3>
      <p className="text-[var(--text-md)] text-[var(--text-secondary)] leading-relaxed max-w-[320px] m-0">
        {isPseudo && <>Switch to a <b>language tab</b></>}
        {!isPseudo && runnable && <>Press <b>Run</b> in the editor toolbar above.</>}
        {!isPseudo && !runnable && language === 'css' && <>CSS needs a document to style. Open an <b>HTML file</b> that links to this stylesheet and you'll see your styles applied live.</>}
        {!isPseudo && !runnable && language !== 'css' && <>Live preview supports HTML and JavaScript out of the box.</>}
      </p>
    </div>
  );
}

function ErrorTranslatorCard({ translation, indexLabel, onDismiss }: { translation: ErrorTranslation; indexLabel: string | null; onDismiss: () => void }) {
  const fromAi = translation.source === 'ai';
  return (
    <div className="shrink-0 m-2 px-3 pt-2.5 pb-3 rounded-[var(--radius-card)] bg-[rgba(255,80,80,0.06)] border border-[rgba(255,80,80,0.35)] text-[var(--text-primary)]">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={14} color="var(--danger)" />
        {indexLabel && <span className="text-[10px] font-semibold tracking-[0.5px] px-1.5 py-px rounded-full bg-[rgba(255,80,80,0.18)] text-[var(--danger)] border border-[rgba(255,80,80,0.4)]">{indexLabel}</span>}
        <span className="flex-1 text-[var(--text-md)] font-semibold text-[var(--text-primary)] leading-normal">{translation.title}</span>
        {fromAi && <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold tracking-wider uppercase px-1.5 py-px rounded-full bg-[rgba(111,195,223,0.12)] text-[var(--border-focus)] border border-[rgba(111,195,223,0.4)]" title="Explained by AI"><Sparkles size={9} /><span>AI</span></span>}
        <button type="button" className="bg-transparent border-none text-[var(--text-muted)] p-1 cursor-pointer flex items-center rounded-[3px] hover:text-[var(--text-primary)]" onClick={onDismiss} title="Hide this translation"><CloseIcon size={12} /></button>
      </div>
      <p className="m-0 mb-2.5 text-[var(--text-sm)] leading-relaxed text-[var(--text-secondary)]">{renderInline(translation.plain)}</p>
      {translation.fixes && translation.fixes.length > 0 && (
        <div className="border-t border-white/[0.06] pt-2">
          <div className="flex items-center gap-1.5 text-[10.5px] tracking-wider uppercase text-[var(--text-muted)] mb-1.5"><Wrench size={11} /><span>{fromAi ? 'Suggested fixes' : 'Common fixes'}</span></div>
          <ul className="m-0 pl-[18px]">{translation.fixes.map((fix, i) => <li key={i} className="text-[var(--text-sm)] leading-relaxed text-[var(--text-secondary)] mb-1">{renderInline(fix)}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function ConsoleView({ entries, inputEnabled, onInput }: { entries: ConsoleEntry[]; inputEnabled: boolean; onInput?: (text: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [entries, inputEnabled]);
  useEffect(() => { if (inputEnabled && inputRef.current) inputRef.current.focus(); }, [inputEnabled]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); onInput?.(text + '\n'); setText(''); };

  const levelStyles: Record<string, string> = { warn: 'text-[var(--warning-text)]', error: 'text-[var(--danger)]', stderr: 'text-[var(--danger)]', meta: 'text-[var(--text-muted)]' };
  const levelLabel = (level: string) => ({ log: 'log', info: 'info', debug: 'dbg', warn: 'warn', error: 'err', stdout: 'out', stderr: 'err', meta: '·' } as Record<string, string>)[level] || level;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)] text-xs leading-relaxed gap-1.5 bg-[var(--bg-input)]">
          <TermIcon size={20} color="var(--text-muted)" />
          <span className="text-[var(--text-secondary)] text-[13px] font-medium mt-1.5">Console is quiet.</span>
          <span className="text-[11.5px] text-[var(--text-muted)] max-w-[280px]">Click <b>Run</b> in the editor toolbar to execute your code and see output here.</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-[var(--bg-input)] font-mono py-1" ref={scrollRef}>
          {entries.map((e) => (
            <div key={e.id} className={cn('flex gap-2.5 px-3 py-1 border-b border-white/[0.03] text-[var(--text-sm)] leading-relaxed', levelStyles[e.level] || 'text-[var(--text-primary)]')}>
              <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider pt-0.5 min-w-[32px] shrink-0">{levelLabel(e.level)}</span>
              <pre className="m-0 whitespace-pre-wrap break-word font-mono text-[var(--text-sm)]">{e.args.join(' ')}</pre>
            </div>
          ))}
        </div>
      )}
      {inputEnabled && onInput && (
        <form className="shrink-0 flex items-center gap-1.5 min-h-[38px] px-2.5 py-1 border-t border-[var(--border)] bg-[var(--bg-secondary)] font-mono" onSubmit={submit}>
          <span className="text-[var(--accent)] font-bold text-sm pl-1">›</span>
          <input ref={inputRef} className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] text-[var(--text-md)] font-mono" value={text} onChange={(ev) => setText(ev.target.value)} placeholder="Type input for your running program and press Enter" spellCheck={false} autoComplete="off" />
          <Button type="submit" size="sm" className="min-h-[var(--control-compact)]">Send</Button>
        </form>
      )}
    </div>
  );
}
