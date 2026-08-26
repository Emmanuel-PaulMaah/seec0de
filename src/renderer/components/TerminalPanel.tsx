import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TermIcon, Trash2, ChevronDown, ChevronUp, Loader, Play } from 'lucide-react';
import { explain } from '../engine/commandExplainer';
import { explainTerminalWithAI } from '../engine/aiService';
import { setFocusTarget } from '../engine/editorBridge';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const PROMPT_HISTORY_KEY = 'seec0de.terminalHistory';
const PROMPT_HISTORY_MAX = 50;

interface TerminalEntry {
  id: number;
  command: string;
  explanation: string | null;
  status: 'running' | 'done';
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

interface TerminalPanelProps {
  visible?: boolean;
  onToggle?: () => void;
  projectRoot?: string | null;
  apiRef?: React.MutableRefObject<any>;
}

export default function TerminalPanel({ visible, onToggle, projectRoot = null, apiRef }: TerminalPanelProps) {
  const [cwd, setCwd] = useState('');
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(PROMPT_HISTORY_KEY) || '[]'); } catch { return []; } });
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    if (projectRoot) { setCwd(projectRoot); return undefined; }
    let cancelled = false;
    (window as any).seecode.terminal.home().then((home: string) => { if (!cancelled) setCwd(home); });
    return () => { cancelled = true; };
  }, [projectRoot]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [entries, running]);
  useEffect(() => { if (visible && inputRef.current) inputRef.current.focus(); }, [visible]);

  const pushHistory = useCallback((cmd: string) => {
    setHistory((prev) => { const next = [cmd, ...prev.filter((c) => c !== cmd)].slice(0, PROMPT_HISTORY_MAX); try { localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(next)); } catch {} return next; });
    setHistoryIdx(-1);
  }, []);

  const runCommand = useCallback(async (raw: string) => {
    const command = raw.trim();
    if (!command || running) return;
    pushHistory(command);
    const id = ++idCounter.current;
    let explanation = explain(command);

    if (/^cd(\s|$)/.test(command)) {
      const target = command.replace(/^cd\s*/, '').trim();
      setEntries((prev) => [...prev, { id, command, explanation, status: 'running', cwd, stdout: '', stderr: '', exitCode: null, durationMs: 0 }]);
      if (!explanation) { explainTerminalWithAI(command, 'command').then((ai) => { if (ai) setEntries((prev) => prev.map((e) => e.id === id ? { ...e, explanation: ai } : e)); }); }
      try {
        const { cwd: nextCwd } = await (window as any).seecode.terminal.resolveCd({ cwd, target });
        setCwd(nextCwd);
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'done', exitCode: 0, stdout: nextCwd + '\n' } : e));
      } catch (err: any) {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'done', exitCode: 1, stderr: err.message + '\n' } : e));
      }
      return;
    }

    if (command === 'clear' || command === 'cls') { setEntries([]); return; }

    setEntries((prev) => [...prev, { id, command, explanation, status: 'running', cwd, stdout: '', stderr: '', exitCode: null, durationMs: 0 }]);
    if (!explanation) { explainTerminalWithAI(command, 'command').then((ai) => { if (ai) setEntries((prev) => prev.map((e) => e.id === id ? { ...e, explanation: ai } : e)); }); }
    setRunning(true);
    try {
      const result = await (window as any).seecode.terminal.exec({ command, cwd });
      if (result.exitCode !== 0 && result.stderr && !explanation) {
        const aiErr = await explainTerminalWithAI(result.stderr, 'error');
        if (aiErr) result.explanation = aiErr;
      }
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...result, status: 'done' } : e));
    } catch (err: any) {
      let errorExplanation = null;
      if (!explanation) errorExplanation = await explainTerminalWithAI(err.message, 'error');
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'done', stderr: `[seec0de] ${err.message}\n`, exitCode: -1, explanation: errorExplanation || explanation } : e));
    } finally { setRunning(false); }
  }, [cwd, running, pushHistory]);

  const pushEntry = useCallback((entry: Partial<TerminalEntry>) => {
    const id = ++idCounter.current;
    setEntries((prev) => [...prev, { id, command: entry.command || '', explanation: entry.explanation || null, status: 'done', cwd: entry.cwd || cwd, stdout: entry.stdout || '', stderr: entry.stderr || '', exitCode: entry.exitCode ?? 0, durationMs: entry.durationMs ?? 0 }]);
  }, [cwd]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      runCommand, pushEntry,
      setText: (text: string) => { setInput((prev) => prev + text); setTimeout(() => inputRef.current?.focus(), 0); },
      isFocused: () => inputRef.current && document.activeElement === inputRef.current,
    };
  }, [apiRef, runCommand, pushEntry]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); runCommand(input); setInput(''); };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); const next = Math.min(historyIdx + 1, history.length - 1); if (history[next] !== undefined) { setHistoryIdx(next); setInput(history[next]); } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); const next = historyIdx - 1; if (next < 0) { setHistoryIdx(-1); setInput(''); } else { setHistoryIdx(next); setInput(history[next]); } }
    else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setEntries([]); }
  };

  if (!visible) {
    return (
      <button className="ui-toolbar-button flex items-center h-[var(--control-standard)] bg-[var(--bg-secondary)] border-t border-[var(--border)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium px-3 border-x-0 border-b-0 w-full text-left" data-workspace-panel="terminal" onClick={onToggle} title="Open terminal (Ctrl+`)">
        <TermIcon size={12} /><span className="ml-1.5">Terminal</span><ChevronUp size={12} className="ml-auto" />
      </button>
    );
  }

  return (
    <div data-workspace-panel="terminal" tabIndex={-1} aria-label="Terminal panel" className="h-[280px] min-h-[200px] flex flex-col bg-[var(--bg-input)] border-t border-[var(--border)] font-mono">
      <div className="h-[var(--panel-header-height)] shrink-0 flex items-center justify-between px-2 pl-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[var(--text-sm)]">
          <TermIcon size={12} />
          <span className="tracking-[0.2px] font-semibold">Terminal</span>
          <span className="text-[var(--text-muted)] text-[var(--text-xs)] ml-2 font-mono overflow-hidden text-ellipsis whitespace-nowrap max-w-[360px]" title={cwd}>{shortenPath(cwd)}</span>
        </div>
        <div className="flex gap-0.5">
          <button className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0 hover:text-[var(--text-primary)]" onClick={() => setEntries([])} title="Clear (Ctrl+L)"><Trash2 size={12} /></button>
          <button className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0 hover:text-[var(--text-primary)]" onClick={onToggle} title="Hide terminal"><ChevronDown size={12} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1.5" ref={scrollRef}>
        {entries.length === 0 && (
          <div className="px-4 py-3.5 text-[var(--text-muted)] text-[var(--text-sm)] font-sans leading-relaxed">
            Run commands, see explanations<br />Try: <code className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[3px] px-[5px] py-px text-[11px] text-[var(--text-primary)]">git status</code>, <code className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[3px] px-[5px] py-px text-[11px] text-[var(--text-primary)]">npm install</code>, <code className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[3px] px-[5px] py-px text-[11px] text-[var(--text-primary)]">dir</code>.
          </div>
        )}
        {entries.map((e) => <Entry key={e.id} entry={e} />)}
      </div>

      <form className="shrink-0 flex items-center gap-1.5 min-h-[40px] px-2 py-1 border-t border-[var(--border)] bg-[var(--bg-secondary)]" onSubmit={handleSubmit}>
        <span className="text-[var(--accent)] font-bold text-sm pl-1">›</span>
        <input ref={inputRef} className="flex-1 bg-transparent border-none text-[var(--text-primary)] text-[var(--text-md)] font-sans outline-none" value={input} onChange={(ev) => setInput(ev.target.value)} onKeyDown={handleKey} onFocus={() => setFocusTarget('terminal')} placeholder={running ? 'Running…' : 'Type a command and press Enter'} spellCheck={false} autoComplete="off" disabled={running} />
        <Button type="submit" size="sm" disabled={running || !input.trim()} className="min-h-[var(--control-compact)]">
          {running ? <Loader size={11} className="animate-spin" /> : <Play size={11} />}
          <span className="ml-1">Run</span>
        </Button>
      </form>
    </div>
  );
}

function Entry({ entry }: { entry: TerminalEntry }) {
  const { command, explanation, status, stdout, stderr, exitCode, durationMs, cwd } = entry;
  const failed = exitCode !== null && exitCode !== 0;
  return (
    <div className="px-3 py-2 border-b border-white/[0.03]">
      <div className="flex items-baseline gap-1.5 text-[var(--text-sm)] flex-wrap">
        <span className="text-[var(--text-muted)] text-[10px]">{shortenPath(cwd)}</span>
        <span className="text-[var(--accent)] font-bold">›</span>
        <span className="text-[var(--text-primary)] font-medium flex-1 break-all">{command}</span>
        {status === 'done' && <span className="text-[10px] font-sans" style={{ color: failed ? '#e06c75' : '#6a9955' }}>{failed ? `exit ${exitCode}` : 'ok'} · {durationMs}ms</span>}
      </div>
      {explanation && <div className="text-[var(--text-xs)] text-[var(--info-text)] italic mt-[3px] mb-1 ml-[14px] font-sans leading-normal">{explanation}</div>}
      {(stdout || stderr) && (
        <pre className={cn('mt-1 ml-[14px] text-[var(--text-sm)] text-[var(--text-primary)] whitespace-pre-wrap break-all leading-normal', failed && !stdout && 'text-[var(--danger-text)]')}>
          {stdout}{stderr && <span className="text-[var(--danger-text)]">{stderr}</span>}
        </pre>
      )}
      {status === 'running' && !stdout && !stderr && <div className="mt-1 ml-[14px] text-[11px] text-[var(--text-muted)] flex items-center gap-1.5"><Loader size={11} className="animate-spin" /> running…</div>}
    </div>
  );
}

function shortenPath(p: string): string {
  if (!p) return '';
  if (p.length <= 50) return p;
  return '…' + p.slice(p.length - 49);
}
