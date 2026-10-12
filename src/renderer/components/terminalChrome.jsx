import React from 'react';
import { Loader } from './motion/loader';

// Both terminals — the workspace "explained terminal" and the Git-learning
// sandbox — render the same chrome: header, scrollback, entry rows and input
// line. Only the engine behind them differs (real commands vs. the simulated
// Git repo). Keeping the chrome here is what stops them drifting apart again.

export const PROMPT = '›';

export const RUNNING_PLACEHOLDER = 'Running…';

// Separate histories on purpose: the workspace terminal records real commands,
// the sandbox records simulated Git ones. Both now live under the seec0de
// prefix so they're findable and can't collide with other apps' keys.
export const TERMINAL_HISTORY_KEY = 'seec0de.terminalHistory';
export const SANDBOX_HISTORY_KEY = 'seec0de.sandboxHistory';
export const HISTORY_MAX = 50;

export function readHistory(key, { legacyKey = null, legacyReversed = false } = {}) {
  try {
    const raw = localStorage.getItem(key)
      ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    // Older builds stored some lists oldest-first; the shared convention is
    // newest first so ArrowUp walks backwards through recent commands.
    return legacyReversed && localStorage.getItem(key) === null ? [...parsed].reverse() : parsed;
  } catch {
    return [];
  }
}

export function writeHistory(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify((list || []).slice(-HISTORY_MAX)));
  } catch {
    /* private mode or quota — history is a convenience, not data */
  }
}

export function shortenPath(p) {
  if (!p) return '';
  if (p.length <= 50) return p;
  return '…' + p.slice(p.length - 49);
}

export const terminalStyles = {
  collapsedBar: {
    height: 'var(--control-standard)',
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 var(--space-3)',
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
    fontFamily: 'var(--font-mono)',
    overflow: 'hidden',
  },
  header: {
    height: 'var(--panel-header-height)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-2) 0 var(--space-3)',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
  },
  headerLabel: {
    letterSpacing: 0.2,
    fontWeight: 600,
  },
  cwd: {
    color: 'var(--text-muted)',
    fontSize: 'var(--text-xs)',
    marginLeft: 8,
    fontFamily: 'var(--font-mono)',
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
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    justifyContent: 'center',
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: '6px 0',
  },
  empty: {
    padding: '14px 16px',
    color: 'var(--text-muted)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-ui)',
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
// One entry is a bare scrollback block, not a card: prompt · command, then
  // the explanation and any output. No separators, no per-entry cwd (the
  // header owns it) and no "ok" badge — silence means success, the way a
  // real terminal reads.
  entry: {
    padding: '5px var(--space-3) 6px',
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    fontSize: 'var(--text-sm)',
  },
  entryPrompt: {
    color: 'var(--accent)',
    fontWeight: 600,
  },
  entryCmd: {
    color: 'var(--text-primary)',
    fontWeight: 500,
    flex: 1,
    minWidth: 0,
    wordBreak: 'break-all',
  },
  entryStatus: {
    fontSize: 10,
    fontFamily: 'var(--font-ui)',
    flexShrink: 0,
  },
  statusFailed: { color: 'var(--danger-text)' },
  explanation: {
    fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)',
    margin: '2px 0 0 14px',
    fontFamily: 'var(--font-ui)',
    lineHeight: 1.4,
  },
  output: {
    margin: '4px 0 0 14px',
    padding: '6px 8px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-control)',
    fontSize: 'var(--text-sm)',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    lineHeight: 1.4,
    overflowX: 'auto',
  },
  outputErr: {
    color: 'var(--danger-text)',
  },
  runningHint: {
    margin: '4px 0 0 14px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
  },
  inputRow: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    padding: 'var(--space-1) var(--space-2)',
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
    fontSize: 'var(--text-md)',
    fontFamily: 'inherit',
    outline: 'none',
  },
  inputDisabled: { opacity: 0.6 },
  // Icon-only run affordance — Enter is the real shortcut, the button just
  // needs to be clickable without adding a word to the input row.
  runBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    flexShrink: 0,
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-control)',
    color: 'var(--text-on-accent)',
    padding: 0,
    cursor: 'pointer',
  },
  runBtnDisabled: {
    background: 'var(--bg-tertiary)',
    borderColor: 'var(--border)',
    color: 'var(--text-muted)',
    cursor: 'not-allowed',
  },
};

// One entry shape for both terminals: prompt · command, then the
// explanation and the output blocks. Only failures show a status badge.
export function TerminalEntry({ entry }) {
  const failed = entry.exitCode !== null && entry.exitCode !== undefined && entry.exitCode !== 0;
  const durationMs = entry.durationMs ?? entry.duration ?? null;
  return (
    <div style={terminalStyles.entry}>
      <div style={terminalStyles.entryHeader}>
        <span style={terminalStyles.entryPrompt}>{PROMPT}</span>
        <span
          style={terminalStyles.entryCmd}
          title={durationMs ? `took ${durationMs}ms` : undefined}
        >
          {entry.command}
        </span>
        {failed ? (
          <span style={{ ...terminalStyles.entryStatus, ...terminalStyles.statusFailed }}>
            exit {entry.exitCode}
          </span>
        ) : null}
      </div>
      {entry.explanation && (
        <div style={terminalStyles.explanation}>{entry.explanation}</div>
      )}
      {entry.stdout && <pre style={terminalStyles.output}>{entry.stdout}</pre>}
      {entry.stderr && (
        <pre style={{ ...terminalStyles.output, ...terminalStyles.outputErr }}>{entry.stderr}</pre>
      )}
      {entry.status === 'running' && !entry.stdout && !entry.stderr && (
        <div style={terminalStyles.runningHint}>
          <Loader size={11} variant="spinner" />
        </div>
      )}
    </div>
  );
}
