import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TermIcon, Trash2, ChevronDown, ChevronUp, Loader, Play } from 'lucide-react';
import { explain } from '../engine/commandExplainer';

// A bottom-of-screen "explained terminal" — each command becomes a card with
// the input line, a one-line explanation, and the output. Not a full PTY.
// See main/terminalService.js for the why.
//
// Props:
//   visible        bool
//   onToggle       () => void
//   apiRef         React ref. We assign { runCommand, pushEntry } so other
//                  components (e.g. the "Run" button in CodePanel) can push
//                  synthetic entries into the history.

const PROMPT_HISTORY_KEY = 'seec0de.terminalHistory';
const PROMPT_HISTORY_MAX = 50;

export default function TerminalPanel({ visible, onToggle, apiRef }) {
  const [cwd, setCwd] = useState('');
  const [entries, setEntries] = useState([]);     // [{ id, command, explanation, status, stdout, stderr, exitCode, durationMs }]
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PROMPT_HISTORY_KEY) || '[]'); }
    catch { return []; }
  });
  const [historyIdx, setHistoryIdx] = useState(-1);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const idCounter = useRef(0);

  // Initial cwd = home dir.
  useEffect(() => {
    let cancelled = false;
    window.seecode.terminal.home().then((home) => {
      if (!cancelled) setCwd(home);
    });
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll on new output.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, running]);

  // Focus input when terminal opens.
  useEffect(() => {
    if (visible && inputRef.current) inputRef.current.focus();
  }, [visible]);

  const pushHistory = useCallback((cmd) => {
    setHistory((prev) => {
      const next = [cmd, ...prev.filter((c) => c !== cmd)].slice(0, PROMPT_HISTORY_MAX);
      try { localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setHistoryIdx(-1);
  }, []);

  const runCommand = useCallback(async (raw) => {
    const command = raw.trim();
    if (!command || running) return;

    pushHistory(command);

    const id = ++idCounter.current;
    const explanation = explain(command);

    // Handle `cd` client-side because each spawn uses a fresh shell.
    if (/^cd(\s|$)/.test(command)) {
      const target = command.replace(/^cd\s*/, '').trim();
      setEntries((prev) => [...prev, {
        id, command, explanation, status: 'running', cwd, stdout: '', stderr: '', exitCode: null, durationMs: 0,
      }]);
      try {
        const { cwd: nextCwd } = await window.seecode.terminal.resolveCd({ cwd, target });
        setCwd(nextCwd);
        setEntries((prev) => prev.map((e) => e.id === id ? {
          ...e, status: 'done', exitCode: 0, stdout: nextCwd + '\n',
        } : e));
      } catch (err) {
        setEntries((prev) => prev.map((e) => e.id === id ? {
          ...e, status: 'done', exitCode: 1, stderr: err.message + '\n',
        } : e));
      }
      return;
    }

    // Handle `clear` / `cls` client-side.
    if (command === 'clear' || command === 'cls') {
      setEntries([]);
      return;
    }

    setEntries((prev) => [...prev, {
      id, command, explanation, status: 'running', cwd, stdout: '', stderr: '', exitCode: null, durationMs: 0,
    }]);
    setRunning(true);
    try {
      const result = await window.seecode.terminal.exec({ command, cwd });
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...result, status: 'done' } : e));
    } catch (err) {
      setEntries((prev) => prev.map((e) => e.id === id ? {
        ...e, status: 'done', stderr: `[seec0de] ${err.message}\n`, exitCode: -1,
      } : e));
    } finally {
      setRunning(false);
    }
  }, [cwd, running, pushHistory]);

  // Push a pre-computed entry (e.g. the result of a code run, where the
  // command was executed by the runnerService rather than typed by the user).
  const pushEntry = useCallback((entry) => {
    const id = ++idCounter.current;
    setEntries((prev) => [...prev, {
      id,
      command: entry.command || '',
      explanation: entry.explanation || null,
      status: 'done',
      cwd: entry.cwd || cwd,
      stdout: entry.stdout || '',
      stderr: entry.stderr || '',
      exitCode: entry.exitCode ?? 0,
      durationMs: entry.durationMs ?? 0,
    }]);
  }, [cwd]);

  // Expose imperative API for other components.
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { runCommand, pushEntry };
  }, [apiRef, runCommand, pushEntry]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runCommand(input);
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      if (history[next] !== undefined) {
        setHistoryIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIdx - 1;
      if (next < 0) { setHistoryIdx(-1); setInput(''); }
      else { setHistoryIdx(next); setInput(history[next]); }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setEntries([]);
    }
  };

  if (!visible) {
    return (
      <button style={styles.collapsedBar} onClick={onToggle} title="Open terminal (Ctrl+`)">
        <TermIcon size={12} />
        <span style={{ marginLeft: 6 }}>Terminal</span>
        <ChevronUp size={12} style={{ marginLeft: 'auto' }} />
      </button>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <TermIcon size={12} />
          <span style={styles.headerLabel}>Terminal</span>
          <span style={styles.cwd} title={cwd}>{shortenPath(cwd)}</span>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} onClick={() => setEntries([])} title="Clear (Ctrl+L)">
            <Trash2 size={12} />
          </button>
          <button style={styles.iconBtn} onClick={onToggle} title="Hide terminal">
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      <div style={styles.scroll} ref={scrollRef}>
        {entries.length === 0 && (
          <div style={styles.empty}>
            Run a shell command — common ones get a one-line explanation.
            <br />Try: <code style={styles.kbd}>git status</code>, <code style={styles.kbd}>npm install</code>, <code style={styles.kbd}>dir</code>, <code style={styles.kbd}>Get-Process</code>.
          </div>
        )}
        {entries.map((e) => <Entry key={e.id} entry={e} />)}
      </div>

      <form style={styles.inputRow} onSubmit={handleSubmit}>
        <span style={styles.prompt}>›</span>
        <input
          ref={inputRef}
          style={styles.input}
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          onKeyDown={handleKey}
          placeholder={running ? 'Running…' : 'Type a command and press Enter'}
          spellCheck={false}
          autoComplete="off"
          disabled={running}
        />
        <button type="submit" style={styles.runBtn} disabled={running || !input.trim()}>
          {running ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={11} />}
          <span style={{ marginLeft: 4 }}>Run</span>
        </button>
      </form>
    </div>
  );
}

function Entry({ entry }) {
  const { command, explanation, status, stdout, stderr, exitCode, durationMs, cwd } = entry;
  const failed = exitCode !== null && exitCode !== 0;
  return (
    <div style={styles.entry}>
      <div style={styles.entryHeader}>
        <span style={styles.entryCwd}>{shortenPath(cwd)}</span>
        <span style={styles.entryPrompt}>›</span>
        <span style={styles.entryCmd}>{command}</span>
        {status === 'done' && (
          <span style={{ ...styles.entryStatus, color: failed ? '#e06c75' : '#6a9955' }}>
            {failed ? `exit ${exitCode}` : 'ok'} · {durationMs}ms
          </span>
        )}
      </div>
      {explanation && (
        <div style={styles.explanation}>{explanation}</div>
      )}
      {(stdout || stderr) && (
        <pre style={{ ...styles.output, ...(failed && !stdout ? styles.outputErr : {}) }}>
          {stdout}
          {stderr && <span style={styles.outputErr}>{stderr}</span>}
        </pre>
      )}
      {status === 'running' && !stdout && !stderr && (
        <div style={styles.runningHint}>
          <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> running…
        </div>
      )}
    </div>
  );
}

function shortenPath(p) {
  if (!p) return '';
  if (p.length <= 50) return p;
  return '…' + p.slice(p.length - 49);
}

const styles = {
  collapsedBar: {
    height: 28,
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    padding: '0 12px',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  },
  panel: {
    height: 280,
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-input)',
    borderTop: '1px solid var(--border)',
    fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  },
  header: {
    height: 26,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text-secondary)',
    fontSize: 11,
  },
  headerLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 600,
  },
  cwd: {
    color: 'var(--text-muted)',
    fontSize: 10,
    marginLeft: 8,
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 360,
  },
  headerActions: { display: 'flex', gap: 2 },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: 3,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    overflow: 'auto',
    padding: '6px 0',
  },
  empty: {
    padding: '14px 16px',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
    lineHeight: 1.6,
  },
  kbd: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 11,
    color: 'var(--text-primary)',
  },
  entry: {
    padding: '6px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    fontSize: 12,
    flexWrap: 'wrap',
  },
  entryCwd: {
    color: 'var(--text-muted)',
    fontSize: 10,
  },
  entryPrompt: {
    color: 'var(--accent)',
    fontWeight: 700,
  },
  entryCmd: {
    color: 'var(--text-primary)',
    fontWeight: 500,
    flex: 1,
    wordBreak: 'break-all',
  },
  entryStatus: {
    fontSize: 10,
    fontFamily: 'Inter, sans-serif',
  },
  explanation: {
    fontSize: 11,
    color: '#79c2ff',
    fontStyle: 'italic',
    margin: '3px 0 4px 14px',
    fontFamily: 'Inter, sans-serif',
    lineHeight: 1.4,
  },
  output: {
    margin: '4px 0 0 14px',
    fontSize: 12,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    lineHeight: 1.4,
  },
  outputErr: {
    color: '#e06c75',
  },
  runningHint: {
    margin: '4px 0 0 14px',
    fontSize: 11,
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  inputRow: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
  },
  prompt: {
    color: 'var(--accent)',
    fontWeight: 700,
    fontSize: 14,
    paddingLeft: 4,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
  },
  runBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 3,
    color: '#fff',
    fontSize: 11,
    padding: '4px 10px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
  },
};
