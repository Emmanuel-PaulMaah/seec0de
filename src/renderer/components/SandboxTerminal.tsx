import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TermIcon, Trash2, ChevronDown, Loader, Play } from 'lucide-react';
import { createGitSandbox } from '../engine/gitSandbox';
import { cn } from '@/lib/utils';

interface SandboxEntry {
  id: number;
  command: string;
  explanation: string | null;
  status: 'ok' | 'error';
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  cwd?: string;
}

interface SandboxTerminalProps {
  visible?: boolean;
  onToggle?: () => void;
  onCommandRun?: (cmd: string, output: string) => void;
  resetKey?: number;
}

const explanationMap: Record<string, string> = {
  'git init': 'Initialize a new empty Git repository in the current directory.',
  'git status': 'Show the working tree status—staged, unstaged, and untracked files.',
  'git add': 'Add file contents to the staging area for the next commit.',
  'git commit': 'Record changes to the repository by creating a new commit.',
  'git log': 'Show commit logs (history) for the current branch.',
  'git diff': 'Show differences between commits, working tree, or staging area.',
  'git branch': 'List, create, or delete branches.',
  'git checkout': 'Switch branches or restore working tree files.',
  'git switch': 'Switch to a branch (modern alternative to checkout for switching).',
  'git merge': 'Join two or more development histories together.',
  'git clone': 'Clone a remote repository into a new local directory.',
  'git push': 'Update remote references with local commits.',
  'git pull': 'Fetch from and integrate with a remote repository.',
  'git fetch': 'Download objects and refs from a remote repository.',
  'git remote': 'Manage the set of repositories whose branches you track.',
  'git reset': 'Reset current HEAD to a specified state (undo commits or unstage).',
  'git restore': 'Restore working tree files to a previous state.',
  'git stash': 'Stash the changes in a dirty working directory away temporarily.',
  'git tag': 'Create, list, delete, or verify a tag object.',
  'git help': 'Display help information for a Git command.',
  touch: 'Create an empty file or update file timestamps.',
  echo: 'Output text to the terminal or redirect it to a file.',
  cat: 'Concatenate and display file contents.',
  ls: 'List directory contents.',
  pwd: 'Print the current working directory.',
  cd: 'Change the current working directory.',
  clear: 'Clear the terminal screen.',
  cls: 'Clear the terminal screen (Windows alias).',
  help: 'Display available commands and usage information.',
};

function explainCommand(cmd: string): string | null {
  const trimmed = cmd.trim().toLowerCase();
  if (explanationMap[trimmed]) return explanationMap[trimmed];
  for (const [key, desc] of Object.entries(explanationMap)) {
    if (trimmed.startsWith(key + ' ') || trimmed === key) return desc;
  }
  return null;
}

let entryIdCounter = 0;

export default function SandboxTerminal({ visible, onToggle, onCommandRun, resetKey }: SandboxTerminalProps) {
  const [cwd, setCwd] = useState('~');
  const [entries, setEntries] = useState<SandboxEntry[]>([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sandbox_history') || '[]'); } catch { return []; }
  });
  const [historyIdx, setHistoryIdx] = useState(-1);

  const sandboxRef = useRef<ReturnType<typeof createGitSandbox> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { sandboxRef.current = createGitSandbox(); }, []);

  useEffect(() => {
    if (resetKey !== undefined) {
      sandboxRef.current = createGitSandbox();
      setCwd('~'); setEntries([]); setInput(''); setHistoryIdx(-1);
    }
  }, [resetKey]);

  useEffect(() => {
    if (visible) {
      sandboxRef.current = createGitSandbox();
      setCwd('~'); setEntries([]); setInput(''); setHistoryIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [entries]);
  useEffect(() => { if (visible) { const id = setTimeout(() => inputRef.current?.focus(), 100); return () => clearTimeout(id); } }, [visible, running]);

  const runCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear' || trimmed.toLowerCase() === 'cls') {
      setEntries([]); setInput(''); return;
    }

    if (trimmed.toLowerCase() === 'help') {
      const helpLines = Object.entries(explanationMap).map(([name, desc]) => `  ${name.padEnd(16)}${desc}`);
      const stdout = 'Commands:\n' + helpLines.join('\n');
      setEntries(prev => [...prev, { id: ++entryIdCounter, command: trimmed, explanation: 'Available commands in the sandbox:', status: 'ok', stdout, stderr: '', exitCode: 0, duration: 0 }]);
      onCommandRun?.(trimmed, stdout); setInput(''); return;
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'cd' || lower.startsWith('cd ')) {
      const arg = trimmed.slice(3).trim();
      const newCwd = arg || '~';
      const result = sandboxRef.current!.setCwd(newCwd);
      if (result.error) {
        setEntries(prev => [...prev, { id: ++entryIdCounter, command: trimmed, explanation: explainCommand(trimmed), status: 'error', stdout: '', stderr: result.error, exitCode: 1, duration: 0 }]);
        onCommandRun?.(trimmed, result.error);
      } else {
        setCwd(result.cwd);
        setEntries(prev => [...prev, { id: ++entryIdCounter, command: trimmed, explanation: explainCommand(trimmed), status: 'ok', stdout: '', stderr: '', exitCode: 0, duration: 0 }]);
        onCommandRun?.(trimmed, '');
      }
      setInput(''); return;
    }

    setRunning(true);
    const start = performance.now();
    try {
      const result = await sandboxRef.current!.execute(trimmed, cwd);
      const duration = Math.round(performance.now() - start);
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const exitCode = result.exitCode ?? 0;
      const status = exitCode === 0 ? 'ok' : 'error';
      if (result.clear) { setEntries([]); } else {
        setEntries(prev => [...prev, { id: ++entryIdCounter, command: trimmed, explanation: explainCommand(trimmed), status: status as 'ok' | 'error', stdout, stderr, exitCode, duration, cwd: result.cwd || cwd }]);
      }
      if (result.cwd) setCwd(result.cwd);
      onCommandRun?.(trimmed, stdout + stderr);
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setEntries(prev => [...prev, { id: ++entryIdCounter, command: trimmed, explanation: explainCommand(trimmed), status: 'error', stdout: '', stderr: err.message || String(err), exitCode: 1, duration }]);
      onCommandRun?.(trimmed, err.message || String(err));
    } finally { setRunning(false); }

    setHistory(prev => { const next = [...prev, trimmed]; const limited = next.slice(-200); try { localStorage.setItem('sandbox_history', JSON.stringify(limited)); } catch {} return limited; });
    setHistoryIdx(-1); setInput('');
  }, [cwd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !running) { e.preventDefault(); runCommand(input); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (history.length === 0) return; const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1); setHistoryIdx(nextIdx); setInput(history[nextIdx] || ''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (historyIdx === -1) return; const nextIdx = historyIdx + 1; if (nextIdx >= history.length) { setHistoryIdx(-1); setInput(''); } else { setHistoryIdx(nextIdx); setInput(history[nextIdx] || ''); } return; }
    if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); setEntries([]); }
  }, [input, running, history, historyIdx, runCommand]);

  if (!visible) return null;

  return (
    <div className="h-[260px] flex flex-col bg-[var(--bg-secondary)] border-t border-[var(--border)] font-mono text-[13px] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
        <div className="flex items-center gap-2">
          <TermIcon size={14} className="opacity-60" />
          <span className="text-[12px] font-semibold opacity-80">Sandbox Terminal</span>
          <span className="text-[11px] opacity-50">{cwd}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setEntries([]); sandboxRef.current = createGitSandbox(); setCwd('~'); }} title="Clear & Reset" className="p-1 bg-transparent border-none text-[var(--text-secondary)] cursor-pointer flex items-center hover:text-[var(--text-primary)]">
            <Trash2 size={13} />
          </button>
          <button onClick={onToggle} title="Toggle terminal" className="p-1 bg-transparent border-none text-[var(--text-secondary)] cursor-pointer flex items-center hover:text-[var(--text-primary)]">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 px-3 bg-[var(--bg-secondary)]">
        {entries.length === 0 && !running && (
          <div className="opacity-40 text-[12px] pt-1">
            Type a command to begin. Try <code>git init</code> or <code>help</code>.
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="mb-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[var(--text-secondary)] text-[12px]">{entry.cwd || cwd}</span>
              <span className="text-[var(--accent)] mr-1">$</span>
              <span className="text-[var(--text-primary)] break-all">{entry.command}</span>
              <span className={cn(
                'text-[11px] px-1.5 py-px rounded text-center shrink-0 ml-1',
                entry.status === 'ok' ? 'bg-[rgba(72,199,142,0.15)] text-[var(--success)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--danger)]'
              )}>
                {entry.exitCode}{entry.duration > 0 ? ` ${entry.duration}ms` : ''}
              </span>
            </div>
            {entry.explanation && (
              <div className="text-[11px] text-[var(--text-secondary)] italic mt-0.5 pl-[22px]">{entry.explanation}</div>
            )}
            {entry.stdout && (
              <pre className="mt-1 ml-[22px] p-1.5 bg-[var(--bg-input)] rounded text-[12px] leading-normal whitespace-pre-wrap break-all text-[var(--text-primary)] overflow-x-auto">{entry.stdout}</pre>
            )}
            {entry.stderr && (
              <pre className="mt-1 ml-[22px] p-1.5 bg-[rgba(239,68,68,0.08)] rounded text-[12px] leading-normal whitespace-pre-wrap break-all text-[var(--danger)] overflow-x-auto">{entry.stderr}</pre>
            )}
          </div>
        ))}
        {running && (
          <div className="flex items-center gap-1.5 opacity-60">
            <Loader size={12} className="animate-spin" />
            <span className="text-[12px]">Running...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); if (!running) runCommand(input); }} className="flex items-center gap-1.5 px-3 py-1.5 border-t border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
        <span className="text-[var(--accent)] font-semibold">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setHistoryIdx(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Enter a git or shell command..."
          disabled={running}
          className={cn('flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded p-1.5 text-[13px] font-mono text-[var(--text-primary)] outline-none', running && 'opacity-50')}
        />
        <button type="submit" disabled={running || !input.trim()} className={cn(
          'p-1.5 rounded flex items-center gap-1 text-[12px] border-none',
          running || !input.trim() ? 'bg-[var(--bg-input)] text-white cursor-not-allowed opacity-40' : 'bg-[var(--accent)] text-white cursor-pointer hover:bg-[var(--accent-hover)]'
        )}>
          {running ? <Loader size={13} className="animate-spin" /> : <Play size={13} />}
        </button>
      </form>
    </div>
  );
}
