import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft, PanelLeftClose, Terminal as TermIcon,
  Settings as SettingsIcon, ChevronDown, Users, UserPlus, Pencil, GraduationCap, House, CircleHelp,
  Bell, Clock3,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import UpdatePill from './UpdatePill';
import { Avatar } from './ProfileForm';

interface Reminder {
  id: string;
  title: string;
  message?: string;
  dueAt: string;
  openLearnMode?: boolean;
}

interface Profile {
  id: string;
  username?: string;
  avatar?: string;
}

interface TitleBarProps {
  terminalVisible?: boolean;
  onToggleTerminal?: () => void;
  onStartTour?: () => void;
  onOpenSettings?: () => void;
  activeProfile?: Profile | null;
  onSwitchProfile?: () => void;
  onAddProfile?: () => void;
  onManageProfile?: () => void;
  reminders?: Reminder[];
  reminderNow?: number;
  onDismissReminder?: (id: string) => void;
  onSnoozeReminder?: (id: string, days: number) => void;
  onContinueReminder?: (reminder: Reminder) => void;
  mode?: 'home' | 'workspace' | 'learn';
  onModeChange?: (mode: string) => void;
  explorerVisible?: boolean;
  onToggleExplorer?: () => void;
}

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
  explorerVisible,
  onToggleExplorer,
}: TitleBarProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="relative z-20 h-[var(--panel-header-height)] flex items-center px-3 gap-2 select-none shrink-0 border-b border-[var(--border)]"
      style={{
        background: 'var(--bg-secondary)',
        WebkitAppRegion: 'drag' as any,
      }}
    >
      {/* Left — Brand */}
      <motion.div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' as any }}
        initial={prefersReduced ? {} : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <span className="text-sm font-bold text-[var(--accent)] tracking-[-0.02em]">⟨/⟩</span>
        <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide">seec0de</span>
      </motion.div>

      {/* Center — Mode switcher */}
      <div className="flex-1 flex items-center justify-center" style={{ WebkitAppRegion: 'no-drag' as any }}>
        {onModeChange && (
          <motion.div
            className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]"
            initial={prefersReduced ? {} : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {[
              { key: 'home', icon: <House size={12} />, label: 'Home' },
              { key: 'workspace', icon: <CodeIcon size={12} />, label: 'Workspace' },
              { key: 'learn', icon: <GraduationCap size={12} />, label: 'Learn' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                type="button"
                className={`relative flex items-center gap-1.5 min-h-[26px] px-3 rounded-md text-xs font-medium transition-colors duration-150 ${
                  mode === key
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
                aria-pressed={mode === key}
                onClick={() => onModeChange(key)}
              >
                {mode === key && (
                  <motion.div
                    layoutId="mode-pill"
                    className="absolute inset-0 bg-[var(--bg-elevated)] rounded-md shadow-sm"
                    transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">{icon} {label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Right — Actions */}
      <motion.div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' as any }}
        initial={prefersReduced ? {} : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <UpdatePill />
        {activeProfile && (
          <ProfileMenu
            profile={activeProfile}
            onSwitchProfile={onSwitchProfile}
            onAddProfile={onAddProfile}
            onManageProfile={onManageProfile}
          />
        )}
        {onOpenSettings && (
          <ToolBtn onClick={onOpenSettings} title="Settings">
            <SettingsIcon size={14} />
          </ToolBtn>
        )}
      </motion.div>
    </div>
  );
}

function CodeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ToolBtn({ onClick, active = false, title, children }: {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
        active
          ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]'
      }`}
      style={{ WebkitAppRegion: 'no-drag' as any }}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {children}
    </motion.button>
  );
}

function ProfileMenu({ profile, onSwitchProfile, onAddProfile, onManageProfile }: {
  profile: Profile;
  onSwitchProfile?: () => void;
  onAddProfile?: () => void;
  onManageProfile?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fn?: () => void) => { setOpen(false); fn?.(); };

  return (
    <div ref={wrapRef} className="relative flex ml-0.5">
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 h-7 bg-transparent border border-[var(--border)] rounded-full text-[var(--text-secondary)] px-2 text-xs hover:bg-[var(--bg-tertiary)] transition-colors"
        onClick={() => setOpen((v) => !v)}
        title={profile.username || 'Profile'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar profile={profile} size={18} />
        <span className="font-medium max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap">
          {profile.username || 'Profile'}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={10} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute top-[calc(100%+6px)] right-0 z-[1000] w-52 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-lg p-1"
            role="menu"
          >
            <div className="flex items-center gap-2.5 p-2.5">
              <Avatar profile={profile} size={32} />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {profile.username || 'Profile'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">signed in on this device</span>
              </div>
            </div>
            <div className="h-px bg-[var(--border)] my-1" />
            <MenuItem icon={<Pencil size={13} />} label="Manage profile" onClick={() => choose(onManageProfile)} />
            <MenuItem icon={<Users size={13} />} label="Switch profile" onClick={() => choose(onSwitchProfile)} />
            <MenuItem icon={<UserPlus size={13} />} label="Add profile" onClick={() => choose(onAddProfile)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      role="menuitem"
      whileHover={{ x: 2 }}
      transition={{ duration: 0.1 }}
      onClick={onClick}
      className="flex items-center gap-2.5 w-full bg-transparent border-none min-h-[32px] rounded-lg text-[var(--text-secondary)] text-[13px] font-medium px-2.5 text-left hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
    >
      <span className="text-[var(--text-muted)]">{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}
