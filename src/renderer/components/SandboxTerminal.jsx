import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TermIcon, Trash2, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Loader } from './motion/loader';
import { createGitSandbox } from '../engine/gitSandbox';
import { useConfirm } from './ui/dialog';
import {
  PROMPT,
  RUNNING_PLACEHOLDER,
  SANDBOX_HISTORY_KEY,
  readHistory,
  writeHistory,
  shortenPath,
  terminalStyles as styles,
  TerminalEntry,
} from './terminalChrome';

const LEGACY_SANDBOX_HISTORY_KEY = 'sandbox_history';

const explanationMap = {
  'git init': 'Creates a new empty Git repository in this folder.',
  'git status': 'Shows which files have changed, are staged, or are untracked.',
  'git add': "Stages files so they'll be included in the next commit.",
  'git commit': 'Saves a snapshot of your staged changes.',
  'git log': 'Shows the history of commits on this branch.',
  'git diff': 'Shows what changed between commits or in your working files.',
  'git branch': 'Lists, creates, or deletes branches.',
  'git checkout': 'Switches branches or restores files to a previous state.',
  'git switch': 'Switches to a different branch.',
  'git merge': 'Combines changes from another branch into the current one.',
  'git clone': 'Copies a remote repository to your computer.',
  'git push': 'Uploads your local commits to the remote repository.',
  'git pull': 'Downloads and applies changes from the remote repository.',
  'git fetch': 'Downloads changes from the remote without applying them yet.',
  'git remote': 'Manages the list of remote repositories you track.',
  'git reset': 'Undoes commits or unstages files by moving the pointer back.',
  'git restore': 'Reverts files in your working directory to a previous state.',
  'git stash': 'Temporarily saves uncommitted changes so you can switch branches.',
  'git tag': 'Creates, lists, or deletes a named marker on a commit.',
  'git help': 'Shows help for a Git command.',
  touch: "Creates an empty file or updates a file's timestamp.",
  echo: 'Prints text to the screen or writes it to a file.',
  cat: 'Displays the contents of a file.',
  ls: 'Lists the files and folders in the current directory.',
  pwd: 'Shows the full path of the current directory.',
  cd: 'Moves to a different directory.',
  clear: 'Clears the terminal screen.',
  cls: 'Clears the terminal screen (Windows).',
  help: 'Lists available commands and what they do.',
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
  const confirm = useConfirm();
  const [cwd, setCwd] = useState('~');
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState(() =>
    readHistory(SANDBOX_HISTORY_KEY, {
      legacyKey: LEGACY_SANDBOX_HISTORY_KEY,
      // The legacy list was appended to (oldest first); the shared convention
      // is newest first.
      legacyReversed: true,
    }));
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
      const next = [trimmed, ...prev].slice(0, 50);
      writeHistory(SANDBOX_HISTORY_KEY, next);
      return next;
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
      const next = Math.min(historyIdx + 1, history.length - 1);
      if (history[next] !== undefined) {
        setHistoryIdx(next);
        setInput(history[next]);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIdx - 1;
      if (next < 0) { setHistoryIdx(-1); setInput(''); }
      else { setHistoryIdx(next); setInput(history[next]); }
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
      data-workspace-panel="sandbox-terminal"
      tabIndex={-1}
      aria-label="Git sandbox terminal"
      style={styles.panel}
    >
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <TermIcon size={12} />
          <span style={styles.headerLabel}>Git sandbox</span>
          <span style={styles.cwd} title={cwd}>{shortenPath(cwd)}</span>
        </div>
        <div style={styles.headerActions}>
          <button
            className="ui-icon-button"
            style={styles.iconBtn}
            onClick={async () => {
              // Destructive: drops the command history AND resets the sandbox
              // git repo back to a fresh one.
              const ok = await confirm({
                title: 'Clear & reset the sandbox?',
                description: 'Command history and output will be erased and the practice Git repository will be recreated from scratch.',
                confirmLabel: 'Clear & reset',
                danger: true,
              });
              if (!ok) return;
              setEntries([]);
              sandboxRef.current = createGitSandbox();
              setCwd('~');
            }}
            title="Clear & reset"
            aria-label="Clear and reset sandbox terminal"
          >
            <Trash2 size={12} />
          </button>
          <button
            className="ui-icon-button"
            style={styles.iconBtn}
            onClick={onToggle}
            title="Hide terminal"
            aria-label="Hide sandbox terminal"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={styles.scroll}
        role="log"
        aria-live="polite"
        aria-label="Sandbox terminal output"
      >
        {entries.length === 0 && !running && (
          <div style={styles.empty}>
            Try <code style={styles.kbd}>git init</code>, <code style={styles.kbd}>git status</code> or <code style={styles.kbd}>help</code>.
          </div>
        )}
        {entries.map((entry) => (
          <TerminalEntry key={entry.id} entry={entry} />
        ))}
        {running && (
          <div style={styles.runningHint}>
            <Loader size={11} variant="spinner" />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!running) runCommand(input);
        }}
        style={styles.inputRow}
      >
        <span style={styles.prompt}>{PROMPT}</span>
        <input
          ref={inputRef}
          type="text"
          className="ui-focus-none"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setHistoryIdx(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={running
            ? RUNNING_PLACEHOLDER
            : 'Type a command…'}
          disabled={running}
          spellCheck={false}
          autoComplete="off"
          style={{ ...styles.input, ...(running ? styles.inputDisabled : {}) }}
        />
        <button
          type="submit"
          className="ui-primary-button"
          disabled={running || !input.trim()}
          aria-label="Run command"
          title="Run command (Enter)"
          style={{
            ...styles.runBtn,
            ...(running || !input.trim() ? styles.runBtnDisabled : {}),
          }}
        >
          {running ? <Loader size={11} variant="spinner" /> : <Play size={11} />}
        </button>
      </form>
    </div>
  );
}
