import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft, PanelLeftClose, Terminal as TermIcon,
  Settings as SettingsIcon, ChevronDown, Users, UserPlus, Pencil, GraduationCap, House, CircleHelp,
  Bell, Clock3,
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
  terminalVisible = false,
  onToggleTerminal,
  onStartTour,
  onOpenSettings,
  activeProfile = null,
  onSwitchProfile,
  onAddProfile,
  onManageProfile,
  reminders = [],
  reminderNow = Date.now(),
  onDismissReminder,
  onSnoozeReminder,
  onContinueReminder,
  mode = 'workspace',
  onModeChange,
}) {
  return (
    <div style={styles.titleBar}>
      {/* Left side: workspace panel toggles */}
      <div style={styles.side}>
        <span style={styles.logo}>⟨/⟩</span>
        <span style={styles.title}>seec0de beta</span>
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
        {onModeChange && (
          <div data-tour="mode-switch" style={styles.modeSwitch} aria-label="Application mode">
            <button
              type="button"
              className="ui-segmented-button"
              style={{ ...styles.modeBtn, ...(mode === 'home' ? styles.modeBtnActive : {}) }}
              aria-pressed={mode === 'home'}
              onClick={() => onModeChange('home')}
            >
              <House size={11} />
              Home
            </button>
            <button
              type="button"
              className="ui-segmented-button"
              style={{ ...styles.modeBtn, ...(mode === 'workspace' ? styles.modeBtnActive : {}) }}
              aria-pressed={mode === 'workspace'}
              onClick={() => onModeChange('workspace')}
            >
              Workspace
            </button>
            <button
              type="button"
              className="ui-segmented-button"
              style={{ ...styles.modeBtn, ...(mode === 'learn' ? styles.modeBtnActive : {}) }}
              aria-pressed={mode === 'learn'}
              onClick={() => onModeChange('learn')}
            >
              <GraduationCap size={11} />
              Learn Mode
            </button>
          </div>
        )}
      </div>

      {/* Right side: update pill + settings + profile */}
      <div style={{ ...styles.side, justifyContent: 'flex-end' }}>
        <UpdatePill />
        <ReminderMenu
          reminders={reminders}
          now={reminderNow}
          onDismiss={onDismissReminder}
          onSnooze={onSnoozeReminder}
          onContinue={onContinueReminder}
        />
        {activeProfile && (
          <ProfileMenu
            profile={activeProfile}
            onSwitchProfile={onSwitchProfile}
            onAddProfile={onAddProfile}
            onManageProfile={onManageProfile}
          />
        )}
        {onOpenSettings && (
          <ToolBtn
            onClick={onOpenSettings}
            title="Settings"
            ariaLabel="Open settings"
          >
            <SettingsIcon size={14} />
          </ToolBtn>
        )}
        {onStartTour && (
          <ToolBtn
            onClick={onStartTour}
            title="Workspace tour"
            ariaLabel="Start workspace tour"
          >
            <CircleHelp size={14} />
          </ToolBtn>
        )}
      </div>
    </div>
  );
}

function ReminderMenu({ reminders, now, onDismiss, onSnooze, onContinue }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const dueCount = reminders.filter((reminder) => new Date(reminder.dueAt).getTime() <= now).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={styles.reminderWrap}>
      <button
        type="button"
        className="ui-icon-button"
        onClick={() => setOpen((value) => !value)}
        title="Learning Pulse reminders"
        aria-label={`Learning Pulse reminders${reminders.length ? `, ${reminders.length} active` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ ...styles.toggleBtn, ...(open ? styles.toggleBtnActive : {}), position: 'relative' }}
      >
        <Bell size={14} />
        {reminders.length > 0 && (
          <span style={{ ...styles.reminderBadge, ...(dueCount > 0 ? styles.reminderBadgeDue : {}) }}>
            {reminders.length > 9 ? '9+' : reminders.length}
          </span>
        )}
      </button>

      {open && (
        <section style={styles.reminderMenu} role="dialog" aria-label="Learning Pulse reminders">
          <header style={styles.reminderHeader}>
            <div>
              <strong style={styles.reminderHeading}>Learning Pulse</strong>
              <span style={styles.reminderSubheading}>{dueCount > 0 ? `${dueCount} ready to practice` : `${reminders.length} upcoming`}</span>
            </div>
          </header>
          <div style={styles.reminderList}>
            {reminders.length === 0 ? (
              <div style={styles.reminderEmpty}>No active reminders. Complete learning work to schedule a short review.</div>
            ) : reminders.map((reminder) => {
              const due = new Date(reminder.dueAt).getTime() <= now;
              return (
                <article key={reminder.id} style={styles.reminderItem}>
                  <div style={styles.reminderItemTop}>
                    <strong style={styles.reminderTitle}>{reminder.title}</strong>
                    <span style={{ ...styles.reminderDate, ...(due ? styles.reminderDateDue : {}) }}>
                      {due ? 'Ready now' : formatReminderDate(reminder.dueAt)}
                    </span>
                  </div>
                  <span style={styles.reminderMessage}>{reminder.message}</span>
                  <div style={styles.reminderActions}>
                    {reminder.openLearnMode && (
                      <button type="button" style={styles.reminderPrimary} onClick={() => { setOpen(false); onContinue?.(reminder); }}>
                        Practice
                      </button>
                    )}
                    <button type="button" style={styles.reminderAction} onClick={() => onSnooze?.(reminder.id, 1)}>
                      <Clock3 size={11} /> Tomorrow
                    </button>
                    <button type="button" style={styles.reminderAction} onClick={() => onDismiss?.(reminder.id)}>Dismiss</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function formatReminderDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Upcoming';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function ToolBtn({ onClick, active = false, title, ariaLabel, children }) {
  return (
    <button
      type="button"
      className="ui-icon-button"
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
        className="ui-toolbar-button"
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
          <MenuItem icon={<Pencil size={14} />} label="Manage profile" onClick={() => choose(onManageProfile)} />
          <MenuItem icon={<Users size={14} />} label="Switch profile" onClick={() => choose(onSwitchProfile)} />
          <MenuItem icon={<UserPlus size={14} />} label="Add profile" onClick={() => choose(onAddProfile)} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button type="button" className="ui-menu-item" role="menuitem" onClick={onClick} style={styles.menuItem}>
      <span style={styles.menuItemIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const styles = {
  titleBar: {
    position: 'relative',
    zIndex: 20,
    height: 'var(--panel-header-height)',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 var(--space-2)',
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
    gap: 'var(--space-2)',
    color: 'var(--text-secondary)',
  },
  logo: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
  },
  title: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-secondary)',
    letterSpacing: 0.5,
    fontWeight: 500,
  },
  toggleBtn: {
    WebkitAppRegion: 'no-drag',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  toggleBtnActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  reminderWrap: {
    position: 'relative',
    display: 'flex',
    WebkitAppRegion: 'no-drag',
  },
  reminderBadge: {
    position: 'absolute',
    top: -2,
    right: -3,
    minWidth: 14,
    height: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
    border: '1px solid var(--bg-secondary)',
    borderRadius: 999,
    background: 'var(--text-muted)',
    color: 'var(--bg-primary)',
    fontSize: 8,
    fontWeight: 800,
  },
  reminderBadgeDue: { background: 'var(--accent)', color: 'var(--text-on-accent)' },
  reminderMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    zIndex: 1000,
    width: 360,
    maxHeight: 'min(520px, calc(100vh - 56px))',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-card)',
    background: 'var(--bg-elevated)',
    boxShadow: 'var(--shadow-lg)',
    WebkitAppRegion: 'no-drag',
    animation: 'seec0de-pop-in var(--motion-base) var(--ease-out)',
  },
  reminderHeader: { padding: '12px 14px', borderBottom: '1px solid var(--border)' },
  reminderHeading: { display: 'block', color: 'var(--text-primary)', fontSize: 12.5 },
  reminderSubheading: { display: 'block', marginTop: 2, color: 'var(--text-muted)', fontSize: 10 },
  reminderList: { minHeight: 0, overflowY: 'auto', padding: 6 },
  reminderEmpty: { padding: '18px 12px', color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.5, textAlign: 'center' },
  reminderItem: { padding: '10px', borderBottom: '1px solid var(--border)' },
  reminderItemTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  reminderTitle: { minWidth: 0, color: 'var(--text-primary)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  reminderDate: { flexShrink: 0, color: 'var(--text-muted)', fontSize: 9 },
  reminderDateDue: { color: 'var(--accent)', fontWeight: 700 },
  reminderMessage: { display: 'block', marginTop: 4, color: 'var(--text-secondary)', fontSize: 10, lineHeight: 1.4 },
  reminderActions: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 },
  reminderPrimary: { padding: '5px 7px', border: 0, borderRadius: 5, background: 'var(--accent)', color: 'var(--text-on-accent)', fontSize: 9.5, fontWeight: 700 },
  reminderAction: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 9.5 },
  modeSwitch: {
    WebkitAppRegion: 'no-drag',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'var(--space-1)',
    padding: 2,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-group)',
  },
  modeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
    padding: '0 var(--space-2)',
    border: 'none',
    borderRadius: 'var(--radius-control)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  modeBtnActive: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-sm)',
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
    gap: 'var(--space-2)',
    minHeight: 'var(--control-compact)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 999,
    color: 'var(--text-secondary)',
    padding: '2px var(--space-2) 2px 2px',
    maxWidth: 160,
  },
  profileName: {
    fontSize: 'var(--text-sm)',
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
    borderRadius: 'var(--radius-card)',
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
    minHeight: 'var(--control-standard)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-md)',
    fontWeight: 500,
    padding: '0 var(--space-2)',
    textAlign: 'left',
  },
  menuItemIcon: { display: 'inline-flex', color: 'var(--text-muted)' },
};
