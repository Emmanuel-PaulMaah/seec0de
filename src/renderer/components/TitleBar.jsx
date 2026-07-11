import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft, PanelLeftClose, Terminal as TermIcon,
  Settings as SettingsIcon, ChevronDown, Users, UserPlus, Pencil,
} from 'lucide-react';
import UpdatePill from './UpdatePill';
import { Avatar } from './ProfileForm';

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
  activeProfile = null,
  onSwitchProfile,
  onAddProfile,
  onManageProfile,
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
        <span style={styles.title}>seec0de beta</span>
      </div>

      {/* Right side: update pill + settings + profile */}
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
        {activeProfile && (
          <ProfileMenu
            profile={activeProfile}
            onSwitchProfile={onSwitchProfile}
            onAddProfile={onAddProfile}
            onManageProfile={onManageProfile}
          />
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

// ProfileMenu — the signed-in identity chip + dropdown. Shows the active
// profile's avatar/name; clicking opens a small menu to switch to another
// local profile, add a new one, or jump into Settings → Profile. This is
// the in-app half of the auth gesture (ProfileGate is the full-screen half).
function ProfileMenu({ profile, onSwitchProfile, onAddProfile, onManageProfile }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click / Esc while open.
  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fn) => { setOpen(false); fn?.(); };

  return (
    <div ref={wrapRef} style={styles.profileWrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={styles.profileChip}
        title={profile.username || 'Profile'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar profile={profile} size={20} />
        <span style={styles.profileName}>{profile.username || 'Profile'}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div style={styles.menu} role="menu">
          <div style={styles.menuHeader}>
            <Avatar profile={profile} size={34} />
            <div style={styles.menuHeaderText}>
              <span style={styles.menuName}>{profile.username || 'Profile'}</span>
              <span style={styles.menuSub}>signed in on this device</span>
            </div>
          </div>
          <div style={styles.menuDivider} />
          <MenuItem icon={<Users size={14} />} label="Switch profile" onClick={() => choose(onSwitchProfile)} />
          <MenuItem icon={<UserPlus size={14} />} label="Add profile" onClick={() => choose(onAddProfile)} />
          <MenuItem icon={<Pencil size={14} />} label="Manage profile" onClick={() => choose(onManageProfile)} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} style={styles.menuItem}>
      <span style={styles.menuItemIcon}>{icon}</span>
      <span>{label}</span>
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

  profileWrap: {
    position: 'relative',
    display: 'flex',
    WebkitAppRegion: 'no-drag',
    marginLeft: 2,
  },
  profileChip: {
    WebkitAppRegion: 'no-drag',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 999,
    color: 'var(--text-secondary)',
    padding: '2px 8px 2px 2px',
    maxWidth: 160,
  },
  profileName: {
    fontSize: 11.5,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    maxWidth: 92,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    width: 216,
    zIndex: 1000,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-lg)',
    padding: 6,
    WebkitAppRegion: 'no-drag',
    animation: 'seec0de-pop-in var(--motion-base) var(--ease-out)',
  },
  menuHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 8px 10px',
  },
  menuHeaderText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  menuName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  menuSub: { fontSize: 10.5, color: 'var(--text-muted)' },
  menuDivider: { height: 1, background: 'var(--border)', margin: '2px 0 6px' },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 12.5,
    padding: '8px 8px',
    textAlign: 'left',
  },
  menuItemIcon: { display: 'inline-flex', color: 'var(--text-muted)' },
};
