import React, { useState } from 'react';
import { ChevronUp, ChevronDown, RefreshCw, Loader, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useUpdateStatus } from '../hooks/useUpdateStatus';

function formatLastChecked(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'never';
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return d.toLocaleString();
}

function statusLabel(status, info) {
  switch (status) {
    case 'checking':        return { text: 'Checking GitHub for updates…', tone: 'info' };
    case 'available':       return { text: `v${info && info.version} found — downloading…`, tone: 'info' };
    case 'downloading':     return { text: 'Downloading update in the background…', tone: 'info' };
    case 'downloaded':      return { text: `v${info && info.version} ready — restart to install.`, tone: 'success' };
    case 'not-available':   return { text: "You're on the latest version.", tone: 'success' };
    case 'error':           return { text: 'Update check failed. See logs for details.', tone: 'error' };
    case 'disabled-in-dev': return { text: 'Auto-update is disabled in development mode.', tone: 'muted' };
    case 'idle':
    default:                return { text: 'Idle.', tone: 'muted' };
  }
}

const TONE_COLOURS = {
  info:    '#60a5fa',
  success: '#4ade80',
  error:   '#f87171',
  muted:   'var(--text-muted)',
};

export default function AboutSettings() {
  const [open, setOpen] = useState(false);
  const update = useUpdateStatus();
  const { appVersion, status, info, lastChecked, error, checkNow, installNow } = update;
  const busy = status === 'checking' || status === 'downloading';
  const label = statusLabel(status, info);
  const isDev = status === 'disabled-in-dev';

  return (
    <div style={styles.container}>
      <button style={styles.toggle} onClick={() => setOpen(!open)}>
        <Info size={11} color="var(--text-muted)" />
        <span style={{ marginLeft: 6 }}>About & Updates</span>
        <span style={styles.versionTag}>v{appVersion}</span>
        {open
          ? <ChevronUp size={12} style={{ marginLeft: 4 }} />
          : <ChevronDown size={12} style={{ marginLeft: 4 }} />}
      </button>

      {open && (
        <div style={styles.panel}>
          <div style={styles.row}>
            <span style={styles.label}>Installed version</span>
            <span style={styles.value}>v{appVersion}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Last checked</span>
            <span style={styles.value}>{formatLastChecked(lastChecked)}</span>
          </div>

          <div style={{ ...styles.statusLine, color: TONE_COLOURS[label.tone] }}>
            {status === 'checking' || status === 'downloading'
              ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />
              : status === 'downloaded' || status === 'not-available'
                ? <CheckCircle2 size={11} />
                : status === 'error'
                  ? <AlertCircle size={11} />
                  : <Info size={11} />}
            <span style={{ marginLeft: 5 }}>{label.text}</span>
          </div>

          {status === 'error' && error && (
            <div style={styles.errorBox} title={error}>
              {error.split('\n')[0].slice(0, 200)}
            </div>
          )}

          <div style={styles.actions}>
            <button
              style={{ ...styles.actionBtn, ...(busy || isDev ? styles.disabledBtn : {}) }}
              onClick={() => checkNow()}
              disabled={busy || isDev}
              title={isDev ? 'Updates are disabled in dev mode' : 'Check GitHub for a newer release'}
            >
              <RefreshCw size={11} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} />
              <span style={{ marginLeft: 5 }}>Check now</span>
            </button>

            {status === 'downloaded' && (
              <button
                style={{ ...styles.actionBtn, ...styles.installBtn }}
                onClick={() => installNow()}
              >
                Restart & install
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    borderBottom: '1px solid var(--border)',
  },
  toggle: {
    width: '100%',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 11,
    padding: '6px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  versionTag: {
    marginLeft: 'auto',
    fontSize: 10,
    color: 'var(--text-muted)',
    fontFamily: 'Consolas, "Courier New", monospace',
  },
  panel: {
    padding: '6px 12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10.5,
    color: 'var(--text-muted)',
  },
  label: {},
  value: {
    color: 'var(--text-secondary)',
    fontFamily: 'Consolas, "Courier New", monospace',
  },
  statusLine: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 10.5,
    marginTop: 2,
  },
  errorBox: {
    background: 'rgba(248, 113, 113, 0.08)',
    border: '1px solid rgba(248, 113, 113, 0.25)',
    borderRadius: 3,
    padding: '4px 6px',
    fontSize: 10,
    color: '#fca5a5',
    fontFamily: 'Consolas, "Courier New", monospace',
    wordBreak: 'break-word',
  },
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-secondary)',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  installBtn: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#ffffff',
    fontWeight: 600,
  },
  disabledBtn: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};
