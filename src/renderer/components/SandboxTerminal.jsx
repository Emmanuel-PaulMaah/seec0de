import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TermIcon, Trash2, ChevronDown, ChevronUp, Loader, Play } from 'lucide-react';
import { createGitSandbox } from '../engine/gitSandbox';

const explanationMap = {
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

function explainCommand(cmd) {
  const trimmed = cmd.trim().toLowerCase();
  if (explanationMap[trimmed]) return explanationMap[trimmed];
  for (const [key, desc] of Object.entries(explanationMap)) {
    if (trimmed.startsWith(key + ' ') || trimmed === key) return desc;
  }
  return null;
}

let entryIdCounter = 0;

export default function SandboxTerminal({ visible, onToggle, onCommandRun, resetKey }) {
  const [cwd, setCwd] = useState('~');
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sandbox_history') || '[]');
    } catch {
      return [];
    }
  });
  const [historyIdx, setHistoryIdx] = useState(-1);

  const sandboxRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    sandboxRef.current = createGitSandbox();
  }, []);

  // Reset sandbox when resetKey changes (new lesson selected)
  useEffect(() => {
    if (resetKey !== undefined) {
      sandboxRef.current = createGitSandbox();
      setCwd('~');
      setEntries([]);
      setInput('');
      setHistoryIdx(-1);
    }
  }, [resetKey]);

  useEffect(() => {
    if (visible) {
      sandboxRef.current = createGitSandbox();
      setCwd('~');
      setEntries([]);
      setInput('');
      setHistoryIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  useEffect(() => {
    if (visible) {
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [visible, running]);

  const runCommand = useCallback(async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear' || trimmed.toLowerCase() === 'cls') {
      setEntries([]);
      setInput('');
      return;
    }

    if (trimmed.toLowerCase() === 'help') {
      const helpLines = Object.entries(explanationMap).map(
        ([name, desc]) => `  ${name.padEnd(16)}${desc}`
      );
      const stdout = 'Commands:\n' + helpLines.join('\n');
      const entry = {
        id: ++entryIdCounter,
        command: trimmed,
        explanation: 'Available commands in the sandbox:',
        status: 'ok',
        stdout,
        stderr: '',
        exitCode: 0,
        duration: 0,
      };
      setEntries(prev => [...prev, entry]);
      onCommandRun?.(trimmed, stdout);
      setInput('');
      return;
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'cd' || lower.startsWith('cd ')) {
      const arg = trimmed.slice(3).trim();
      const newCwd = arg || '~';
      const result = sandboxRef.current.setCwd(newCwd);
      if (result.error) {
        const entry = {
          id: ++entryIdCounter,
          command: trimmed,
          explanation: explainCommand(trimmed),
          status: 'error',
          stdout: '',
          stderr: result.error,
          exitCode: 1,
          duration: 0,
        };
        setEntries(prev => [...prev, entry]);
        onCommandRun?.(trimmed, result.error);
      } else {
        setCwd(result.cwd);
        const entry = {
          id: ++entryIdCounter,
          command: trimmed,
          explanation: explainCommand(trimmed),
          status: 'ok',
          stdout: '',
          stderr: '',
          exitCode: 0,
          duration: 0,
        };
        setEntries(prev => [...prev, entry]);
        onCommandRun?.(trimmed, '');
      }
      setInput('');
      return;
    }

    const fullCwd = cwd;

    setRunning(true);
    const start = performance.now();
    try {
      const result = await sandboxRef.current.execute(trimmed, fullCwd);
      const duration = Math.round(performance.now() - start);
      const stdout = result.stdout || '';
      const stderr = result.stderr || '';
      const exitCode = result.exitCode ?? 0;
      const status = exitCode === 0 ? 'ok' : 'error';

      if (result.clear) {
        setEntries([]);
      } else {
        const entry = {
          id: ++entryIdCounter,
          command: trimmed,
          explanation: explainCommand(trimmed),
          status,
          stdout,
          stderr,
          exitCode,
          duration,
        };
        setEntries(prev => [...prev, entry]);
      }

      if (result.cwd) {
        setCwd(result.cwd);
      }

      onCommandRun?.(trimmed, stdout + stderr);
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const stderr = err.message || String(err);
      setEntries(prev => [
        ...prev,
        {
          id: ++entryIdCounter,
          command: trimmed,
          explanation: explainCommand(trimmed),
          status: 'error',
          stdout: '',
          stderr,
          exitCode: 1,
          duration,
        },
      ]);
      onCommandRun?.(trimmed, stderr);
    } finally {
      setRunning(false);
    }

    setHistory(prev => {
      const next = [...prev, trimmed];
      const limited = next.slice(-200);
      try {
        localStorage.setItem('sandbox_history', JSON.stringify(limited));
      } catch {}
      return limited;
    });
    setHistoryIdx(-1);
    setInput('');
  }, [cwd]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !running) {
      e.preventDefault();
      runCommand(input);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx] || '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx] || '');
      }
      return;
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setEntries([]);
      return;
    }
  }, [input, running, history, historyIdx, runCommand]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        height: 260,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        fontFamily: 'var(--font-mono, "SF Mono", Menlo, Consolas, monospace)',
        fontSize: 13,
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TermIcon size={14} style={{ opacity: 0.6 }} />
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
            Sandbox Terminal
          </span>
          <span style={{ fontSize: 11, opacity: 0.5 }}>
            {cwd}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => {
              setEntries([]);
              sandboxRef.current = createGitSandbox();
              setCwd('~');
            }}
            title="Clear & Reset"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #888)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onToggle}
            title="Toggle terminal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #888)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
        }}
      >
        {entries.length === 0 && !running && (
          <div style={{ opacity: 0.4, fontSize: 12, paddingTop: 4 }}>
            Type a command to begin. Try <code>git init</code> or <code>help</code>.
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: 'var(--text-secondary, #888)', fontSize: 12 }}>
                {entry.cwd || cwd}
              </span>
              <span style={{ color: 'var(--accent, #7c6aef)', marginRight: 4 }}>{'$'}</span>
              <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {entry.command}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: entry.status === 'ok'
                    ? 'rgba(72,199,142,0.15)'
                    : 'rgba(239,68,68,0.15)',
                  color: entry.status === 'ok'
                    ? 'var(--success, #48c78e)'
                    : 'var(--error, #ef4444)',
                  marginLeft: 4,
                  flexShrink: 0,
                }}
              >
                {entry.exitCode}
                {entry.duration != null && entry.duration > 0
                  ? ` ${entry.duration}ms`
                  : ''}
              </span>
            </div>
            {entry.explanation && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary, #888)',
                  fontStyle: 'italic',
                  marginTop: 2,
                  paddingLeft: 22,
                }}
              >
                {entry.explanation}
              </div>
            )}
            {entry.stdout && (
              <pre
                style={{
                  margin: '4px 0 0 22px',
                  padding: '6px 8px',
                  background: 'var(--bg-input, rgba(0,0,0,0.15))',
                  borderRadius: 4,
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                }}
              >
                {entry.stdout}
              </pre>
            )}
            {entry.stderr && (
              <pre
                style={{
                  margin: '4px 0 0 22px',
                  padding: '6px 8px',
                  background: 'rgba(239,68,68,0.08)',
                  borderRadius: 4,
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: 'var(--error, #ef4444)',
                  overflowX: 'auto',
                }}
              >
                {entry.stderr}
              </pre>
            )}
          </div>
        ))}
        {running && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
            <Loader size={12} className="spin" />
            <span style={{ fontSize: 12 }}>Running...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!running) runCommand(input);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--accent, #7c6aef)', fontWeight: 600 }}>{'$'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setHistoryIdx(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter a git or shell command..."
          disabled={running}
          style={{
            flex: 1,
            background: 'var(--bg-input, rgba(0,0,0,0.15))',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '5px 8px',
            fontSize: 13,
            fontFamily: 'inherit',
            color: 'var(--text-primary)',
            outline: 'none',
            opacity: running ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={running || !input.trim()}
          style={{
            background: running || !input.trim()
              ? 'var(--bg-input, rgba(0,0,0,0.15))'
              : 'var(--accent, #7c6aef)',
            border: 'none',
            borderRadius: 4,
            padding: '5px 10px',
            color: '#fff',
            cursor: running || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            opacity: running || !input.trim() ? 0.4 : 1,
          }}
        >
          {running ? <Loader size={13} className="spin" /> : <Play size={13} />}
        </button>
      </form>
    </div>
  );
}
