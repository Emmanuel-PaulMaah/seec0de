import React from 'react';
import { PanelLeft, PanelLeftClose, Terminal as TermIcon } from 'lucide-react';
import UpdatePill from './UpdatePill';

export default function TitleBar({
  explorerVisible = true,
  onToggleExplorer,
  terminalVisible = false,
  onToggleTerminal,
}) {
  return (
    <div style={styles.titleBar}>
      <div style={styles.side}>
        {onToggleExplorer && (
          <button
            style={styles.toggleBtn}
            onClick={onToggleExplorer}
            title={explorerVisible ? 'Hide file explorer' : 'Show file explorer'}
          >
            {explorerVisible ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
          </button>
        )}
        {onToggleTerminal && (
          <button
            style={{ ...styles.toggleBtn, ...(terminalVisible ? styles.toggleBtnActive : {}) }}
            onClick={onToggleTerminal}
            title={terminalVisible ? 'Hide terminal (Ctrl+`)' : 'Show terminal (Ctrl+`)'}
          >
            <TermIcon size={14} />
          </button>
        )}
      </div>

      <div style={styles.center}>
        <span style={styles.logo}>⟨/⟩</span>
        <span style={styles.title}>SEEC0DE</span>
      </div>

      <div style={{ ...styles.side, ...styles.right }}>
        <UpdatePill />
      </div>
    </div>
  );
}

const styles = {
  titleBar: {
    height: 30,
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    WebkitAppRegion: 'drag',
    userSelect: 'none',
    paddingLeft: 8,
    paddingRight: 8,
  },
  side: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  right: {
    justifyContent: 'flex-end',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    fontSize: 14,
    color: 'var(--accent)',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    letterSpacing: 1.5,
    fontWeight: 400,
  },
  toggleBtn: {
    WebkitAppRegion: 'no-drag',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: 4,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  toggleBtnActive: {
    background: 'var(--accent-soft, rgba(0,122,204,0.18))',
    color: 'var(--accent)',
  },
};
