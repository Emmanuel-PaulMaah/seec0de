import React from 'react';
import {
  PanelLeft, PanelLeftClose, Terminal as TermIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import UpdatePill from './UpdatePill';

// Top chrome. Houses the workspace toggles on the left, the brand in the
// centre, and the update pill + settings gear on the right. Stays as a
// drag region by default; interactive elements opt out via WebkitAppRegion.
//
// The live-preview toggle lives on the panel itself (collapse / expand
// rail beside the editor) — there's no duplicate eye button up here.

export default function TitleBar({
  explorerVisible = false,
  onToggleExplorer,
  terminalVisible = false,
  onToggleTerminal,
  onOpenSettings,
}) {
  return (
    <div style={styles.titleBar}>
      {/* Left side: workspace panel toggles */}
      <div style={styles.side}>
        {onToggleExplorer && (
          <ToolBtn
            onClick={onToggleExplorer}
            active={explorerVisible}
            title={explorerVisible ? 'Hide file explorer' : 'Show file explorer'}
            ariaLabel="Toggle file explorer"
          >
            {explorerVisible ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
          </ToolBtn>
        )}
        {onToggleTerminal && (
          <ToolBtn
            onClick={onToggleTerminal}
            active={terminalVisible}
            title={terminalVisible ? 'Hide terminal (Ctrl + `)' : 'Show terminal (Ctrl + `)'}
            ariaLabel="Toggle terminal"
          >
            <TermIcon size={14} />
          </ToolBtn>
        )}
      </div>

      {/* Centre: brand */}
      <div style={styles.center}>
        <span style={styles.logo}>⟨/⟩</span>
        <span style={styles.title}>seec0de</span>
      </div>

      {/* Right side: update pill + settings */}
      <div style={{ ...styles.side, justifyContent: 'flex-end' }}>
        <UpdatePill />
        {onOpenSettings && (
          <ToolBtn
            onClick={onOpenSettings}
            title="Settings"
            ariaLabel="Open settings"
          >
            <SettingsIcon size={14} />
          </ToolBtn>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ onClick, active = false, title, ariaLabel, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active}
      style={{ ...styles.toggleBtn, ...(active ? styles.toggleBtnActive : {}) }}
    >
      {children}
    </button>
  );
}

const styles = {
  titleBar: {
    height: 32,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    WebkitAppRegion: 'drag',
    userSelect: 'none',
    flexShrink: 0,
    gap: 4,
  },
  side: {
    flex: '1 1 0',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text-secondary)',
  },
  logo: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontFamily: 'Consolas, "Courier New", monospace',
  },
  title: {
    fontSize: 11,
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
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  toggleBtnActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
};
