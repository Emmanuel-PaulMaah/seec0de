import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TermIcon, Trash2, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Loader } from './motion/loader';
import { explain } from '../engine/commandExplainer';
import { explainTerminalWithAI } from '../engine/aiService';
import { setFocusTarget } from '../engine/editorBridge';
import {
  PROMPT,
  RUNNING_PLACEHOLDER,
  TERMINAL_HISTORY_KEY,
  readHistory,
  writeHistory,
  shortenPath,
  terminalStyles as styles,
  TerminalEntry,
} from './terminalChrome';

// Tool installs (winget, npm -g, pacman) run for minutes; the default 30s
// exec timeout would SIGKILL them mid-install. Any command that looks like
// one gets a 10-minute budget, and callers (Settings → Toolchains Install)
// can pass an explicit timeoutMs that wins over the heuristic.
const INSTALL_TIMEOUT_MS = 10 * 60_000;
const INSTALL_COMMAND_RE = /\b(winget\s+install|npm(?:\.cmd)?\s+(?:install|i)\s+-g|pacman\s+-S|xcode-select\s+--install)\b/i;

function pickTimeoutMs(command, options) {
  const explicit = Number(options?.timeoutMs);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return INSTALL_COMMAND_RE.test(command) ? INSTALL_TIMEOUT_MS : undefined;
}

// A bottom-of-screen "explained terminal" — each command becomes a card with
// the input line, a one-line explanation, and the output. Not a full PTY.
// See main/terminalService.js for the why.
//
// Props:
//   visible        bool
//   onToggle       () => void
//   projectRoot    string|null. A newly opened explorer folder becomes cwd.
//   apiRef         React ref. We assign { runCommand, pushEntry } so other
//                  components (e.g. the "Run" button in CodePanel) can push
//                  synthetic entries into the history.

export default function TerminalPanel({ visible, onToggle, projectRoot = null, apiRef }) {
  const [cwd, setCwd] = useState('');
  const [entries, setEntries] = useState([]);     // [{ id, command, explanation, status, stdout, stderr, exitCode, durationMs }]
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState(() => readHistory(TERMINAL_HISTORY_KEY));
  const [historyIdx, setHistoryIdx] = useState(-1);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const idCounter = useRef(0);

  // Start in the explorer folder when one is open, otherwise use home. This
  // only reruns when the project root changes, so a typed `cd` remains in
  // control until the user opens a different folder in File Explorer.
  useEffect(() => {
    if (projectRoot) {
      setCwd(projectRoot);
      return undefined;
    }

    let cancelled = false;
    window.seecode.terminal.home().then((home) => {
      if (!cancelled) setCwd(home);
    });
    return () => { cancelled = true; };
  }, [projectRoot]);

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
      const next = [cmd, ...prev.filter((c) => c !== cmd)].slice(0, 50);
      writeHistory(TERMINAL_HISTORY_KEY, next);
      return next;
    });
    setHistoryIdx(-1);
  }, []);

  const runCommand = useCallback(async (raw, options) => {
    const command = raw.trim();
    if (!command || running) return;

    pushHistory(command);

    const id = ++idCounter.current;
    let explanation = explain(command);

    // Handle `cd` client-side because each spawn uses a fresh shell.
    if (/^cd(\s|$)/.test(command)) {
      const target = command.replace(/^cd\s*/, '').trim();
      setEntries((prev) => [...prev, {
        id, command, explanation, status: 'running', cwd, stdout: '', stderr: '', exitCode: null, durationMs: 0,
      }]);
      // AI fallback: if the offline explainer didn't know this command.
      if (!explanation) {
        explainTerminalWithAI(command, 'command').then((aiExplanation) => {
          if (aiExplanation) {
            setEntries((prev) => prev.map((e) => e.id === id ? { ...e, explanation: aiExplanation } : e));
          }
        });
      }
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
    // AI fallback: if the offline explainer didn't know this command.
    if (!explanation) {
      explainTerminalWithAI(command, 'command').then((aiExplanation) => {
        if (aiExplanation) {
          setEntries((prev) => prev.map((e) => e.id === id ? { ...e, explanation: aiExplanation } : e));
        }
      });
    }
    setRunning(true);
    try {
      const result = await window.seecode.terminal.exec({
        command,
        cwd,
        timeoutMs: pickTimeoutMs(command, options),
      });
      // AI fallback for errors: if the command failed and had no offline explanation.
      if (result.exitCode !== 0 && result.stderr && !explanation) {
        const aiErrorExplanation = await explainTerminalWithAI(result.stderr, 'error');
        if (aiErrorExplanation) {
          result.explanation = aiErrorExplanation;
        }
      }
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...result, status: 'done' } : e));
    } catch (err) {
      // AI fallback for exceptions.
      let errorExplanation = null;
      if (!explanation) {
        errorExplanation = await explainTerminalWithAI(err.message, 'error');
      }
      setEntries((prev) => prev.map((e) => e.id === id ? {
        ...e, status: 'done', stderr: `[seec0de] ${err.message}\n`, exitCode: -1,
        explanation: errorExplanation || explanation,
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
    apiRef.current = {
      runCommand,
      pushEntry,
      // setText: insert text into the terminal input (focus-aware insertion)
      setText: (text) => {
        setInput((prev) => prev + text);
        // Focus the terminal input after inserting
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      // isFocused: check if the terminal input has focus
      isFocused: () => {
        const el = inputRef.current;
        return el && document.activeElement === el;
      },
    };
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
      <button
        className="ui-toolbar-button"
        data-workspace-panel="terminal"
        style={styles.collapsedBar}
        onClick={onToggle}
        title="Open terminal (Ctrl+`)"
      >
        <TermIcon size={12} />
        <span style={{ marginLeft: 6 }}>Terminal</span>
        <ChevronUp size={12} style={{ marginLeft: 'auto' }} />
      </button>
    );
  }

  return (
    <div data-workspace-panel="terminal" tabIndex={-1} aria-label="Terminal panel" style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <TermIcon size={12} />
          <span style={styles.headerLabel}>Terminal</span>
          <span style={styles.cwd} title={cwd}>{shortenPath(cwd)}</span>
        </div>
        <div style={styles.headerActions}>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={() => setEntries([])} title="Clear (Ctrl+L)" aria-label="Clear terminal">
            <Trash2 size={12} />
          </button>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={onToggle} title="Hide terminal" aria-label="Hide terminal">
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      <div style={styles.scroll} ref={scrollRef} role="log" aria-live="polite" aria-label="Terminal output">
        {entries.length === 0 && (
          <div style={styles.empty}>
            Try <code style={styles.kbd}>git status</code>, <code style={styles.kbd}>npm install</code> or <code style={styles.kbd}>dir</code>.
          </div>
        )}
        {entries.map((e) => <TerminalEntry key={e.id} entry={e} />)}
      </div>

      <form style={styles.inputRow} onSubmit={handleSubmit}>
        <span style={styles.prompt}>{PROMPT}</span>
        <input
          ref={inputRef}
          className="ui-focus-none"
          style={styles.input}
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocusTarget('terminal')}
          placeholder={running ? RUNNING_PLACEHOLDER : 'Type a command…'}
          spellCheck={false}
          autoComplete="off"
          disabled={running}
        />
        <button
          type="submit"
          className="ui-primary-button"
          style={styles.runBtn}
          disabled={running || !input.trim()}
          title="Run command (Enter)"
          aria-label="Run command"
        >
          {running ? <Loader size={11} variant="spinner" /> : <Play size={11} />}
        </button>
      </form>
    </div>
  );
}


