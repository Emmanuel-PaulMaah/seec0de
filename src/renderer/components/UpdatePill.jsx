import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Download, X } from 'lucide-react';
import { useUpdateStatus } from '../hooks/useUpdateStatus';

// Tiny inline renderer for the subset of markdown the CHANGELOG uses:
// `### Heading`, `- bullet`, blank lines. Anything else renders as a
// plain paragraph. Keeps us free of an extra dependency.
function renderNotes(markdown) {
  if (!markdown) return null;
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let bullets = null;

  const flushBullets = () => {
    if (bullets && bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} style={notesStyles.list}>
          {bullets.map((b, i) => <li key={i} style={notesStyles.listItem}>{b}</li>)}
        </ul>
      );
    }
    bullets = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }
    if (line.startsWith('### ')) {
      flushBullets();
      blocks.push(<div key={`h-${blocks.length}`} style={notesStyles.heading}>{line.slice(4)}</div>);
      continue;
    }
    if (line.startsWith('## ')) {
      flushBullets();
      blocks.push(<div key={`h-${blocks.length}`} style={notesStyles.heading}>{line.slice(3)}</div>);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!bullets) bullets = [];
      bullets.push(line.slice(2));
      continue;
    }
    flushBullets();
    blocks.push(<div key={`p-${blocks.length}`} style={notesStyles.paragraph}>{line}</div>);
  }
  flushBullets();
  return blocks;
}

export default function UpdatePill() {
  const { status, info, releaseNotes, progress, installNow } = useUpdateStatus();
  const [expanded, setExpanded] = useState(false);
  const popRef = useRef(null);

  // Close popover on outside click.
  useEffect(() => {
    if (!expanded) return undefined;
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // Only surface the pill in the title bar for two states:
  // mid-download (subtle) and ready-to-install (prominent).
  if (status !== 'downloading' && status !== 'downloaded') return null;

  if (status === 'downloading') {
    const pct = progress && progress.percent ? Math.round(progress.percent) : 0;
    return (
      <div style={styles.pillDownloading}>
        <Download size={11} />
        <span>Downloading update… {pct}%</span>
      </div>
    );
  }

  // status === 'downloaded'
  const version = info && info.version ? `v${info.version}` : 'update';

  return (
    <div ref={popRef} style={styles.wrapper}>
      <button
        type="button"
        style={styles.pillReady}
        onClick={() => setExpanded((v) => !v)}
        title={`Click to see what's new in ${version}`}
      >
        <RefreshCw size={11} />
        <span>Update {version} ready</span>
      </button>

      {expanded && (
        <div style={styles.popover}>
          <div style={styles.popHeader}>
            <span style={styles.popTitle}>What's new in {version}</span>
            <button
              type="button"
              style={styles.closeBtn}
              onClick={() => setExpanded(false)}
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>

          <div style={styles.popBody}>
            {releaseNotes
              ? renderNotes(releaseNotes)
              : <div style={notesStyles.paragraph}>Release notes are unavailable. Restart anyway to apply the update.</div>}
          </div>

          <div style={styles.popFooter}>
            <button type="button" style={styles.laterBtn} onClick={() => setExpanded(false)}>
              Later
            </button>
            <button type="button" style={styles.restartBtn} onClick={() => installNow()}>
              Restart & install
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    WebkitAppRegion: 'no-drag',
  },
  pillReady: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: 600,
    padding: '3px 9px',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag',
  },
  pillDownloading: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-secondary)',
    fontSize: 10.5,
    padding: '3px 9px',
    WebkitAppRegion: 'no-drag',
  },
  popover: {
    position: 'absolute',
    top: 28,
    right: 0,
    width: 320,
    maxHeight: 360,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
    zIndex: 1000,
    WebkitAppRegion: 'no-drag',
  },
  popHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderBottom: '1px solid var(--border)',
  },
  popTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 2,
    display: 'inline-flex',
    cursor: 'pointer',
  },
  popBody: {
    padding: '8px 12px',
    overflow: 'auto',
    flex: 1,
  },
  popFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 6,
    padding: 8,
    borderTop: '1px solid var(--border)',
  },
  laterBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-secondary)',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  restartBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 3,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 10px',
    cursor: 'pointer',
  },
};

const notesStyles = {
  heading: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    margin: '6px 0 4px',
  },
  list: {
    margin: '0 0 6px 16px',
    padding: 0,
    color: 'var(--text-secondary)',
  },
  listItem: {
    fontSize: 11.5,
    lineHeight: 1.45,
    marginBottom: 3,
  },
  paragraph: {
    fontSize: 11.5,
    lineHeight: 1.45,
    color: 'var(--text-secondary)',
    margin: '4px 0',
  },
};
