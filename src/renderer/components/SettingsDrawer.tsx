import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  X, Check, Eye, EyeOff, RefreshCw, Loader, CheckCircle2,
  AlertCircle, Info, Sparkles, FolderTree, Terminal as TermIcon, Layers,
  Cpu, Play, Copy, Download, ChevronDown, ChevronUp,
  Users, UserPlus, Lock, Trash2, GraduationCap, Keyboard, Bell,
  Volume2, VolumeX,
} from 'lucide-react';
import {
  RUNNABLE_LANGUAGES,
  TOOLCHAIN_GUIDES,
  defaultComparisonFor,
  loadSettings,
  updateSettings,
  resetOnboarding,
  setSettingsApiKey,
  usernameExists,
  setProfilePin,
  clearProfilePin,
} from '../engine/settings';
import { ProfileFields } from './ProfileForm';
import { useUpdateStatus } from '../hooks/useUpdateStatus';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const PLATFORM_LABEL = (() => {
  const p = (typeof navigator !== 'undefined' ? navigator.platform : '') || '';
  if (/win/i.test(p)) return 'win';
  if (/mac/i.test(p)) return 'macos';
  return 'linux';
})();

export default function SettingsDrawer({ open, onClose, onSettingsChange, onRerunOnboarding, onRunInTerminal }) {
  const [settings, setSettings] = useState(loadSettings());
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const [expandedSection, setExpandedSection] = useState('appearance');
  const update = useUpdateStatus();

  const toggleSection = (id) => setExpandedSection((current) => (current === id ? null : id));

  const KEY_MASK = '••••••••••••••••';

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setKeySaved(false);
      setNotificationPermission(getNotificationPermission());
      setExpandedSection('appearance');
      window.seecode.ai.hasKey().then((exists) => {
        setHasKey(exists);
        setApiKey(exists ? KEY_MASK : '');
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const patch = (p) => { const next = updateSettings(p); setSettings(next); onSettingsChange?.(next); };

  const setPracticalLanguage = (id) => {
    patch({ practicalLanguage: id, comparisonLanguages: defaultComparisonFor(id).filter((c) => c !== id) });
  };

  const toggleComparison = (id) => {
    if (id === settings.practicalLanguage) return;
    const set = new Set(settings.comparisonLanguages);
    if (set.has(id)) set.delete(id); else set.add(id);
    patch({ comparisonLanguages: Array.from(set).slice(0, 3) });
  };

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    if (hasKey && (trimmed === KEY_MASK || /^[•*]+$/.test(trimmed))) { setKeySaved(true); setTimeout(() => setKeySaved(false), 1800); return; }
    await setSettingsApiKey(trimmed);
    const exists = await window.seecode.ai.hasKey();
    setHasKey(exists); setApiKey(exists ? KEY_MASK : ''); setKeySaved(true); setTimeout(() => setKeySaved(false), 1800);
  };

  const handleKeyFocus = () => { if (apiKey === KEY_MASK) setApiKey(''); };

  const handleRerun = () => { resetOnboarding(); onClose?.(); onRerunOnboarding?.(); };

  const handleDesktopNotifications = async () => {
    if (notificationPermission === 'unsupported' || notificationPermission === 'denied') return;
    if (notificationPermission === 'granted') { patch({ practiceNotificationsEnabled: !settings.practiceNotificationsEnabled }); return; }
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    patch({ practiceNotificationsEnabled: permission === 'granted' });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[900] flex justify-end bg-[var(--scrim)] backdrop-blur-sm animate-[seec0de-fade-in_var(--motion-base)_var(--ease-out)]" onClick={onClose} role="presentation">
      <aside className="w-[380px] max-w-full h-full bg-[var(--bg-elevated)] border-l border-[var(--border-strong)] shadow-[var(--shadow-lg)] flex flex-col animate-[seec0de-slide-in-right_var(--motion-slow)_var(--ease-out)]" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <header className="flex-none flex items-center justify-between px-[18px] py-3.5 border-b border-[var(--border)]">
          <h2 id="settings-title" className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Settings</h2>
          <button className="inline-flex items-center justify-center w-8 h-8 bg-transparent border border-[var(--border)] rounded-md text-[var(--text-secondary)]" onClick={onClose} title="Close (Esc)" aria-label="Close settings"><X size={16} /></button>
        </header>

        <div className="flex-1 overflow-y-auto py-1 px-[18px] pb-6">
          {/* 1. Appearance */}
          <Section id="appearance" icon={<Eye size={13} />} title="Appearance" open={expandedSection === 'appearance'} onToggle={toggleSection}>
            <Field label="App theme" hint="Choose the palette used across your workspace. Saved to this profile.">
              <div className="grid grid-cols-3 gap-2">
                <ThemeChoice name="seec0de-dark" description="High-contrast black and blue" colors={['#000000', '#2f6fed', '#e6e6e6']} selected={settings.theme === 'seec0de-dark' || !settings.theme || settings.theme === ''} onClick={() => patch({ theme: 'seec0de-dark' })} />
                <ThemeChoice name="seec0de-green" description="Layered charcoal and lime" colors={['#0f1110', '#c8ff4d', '#f2f0e9']} selected={settings.theme === 'seec0de-green'} onClick={() => patch({ theme: 'seec0de-green' })} />
                <ThemeChoice name="seec0de-light" description="Clean white with indigo" colors={['#f8f9fa', '#6366f1', '#1a1d23']} selected={settings.theme === 'seec0de-light'} onClick={() => patch({ theme: 'seec0de-light' })} />
              </div>
            </Field>
          </Section>

          {/* 2. Sounds */}
          <Section id="sounds" icon={<Volume2 size={13} />} title="Sounds" open={expandedSection === 'sounds'} onToggle={toggleSection}>
            <ToggleRow icon={settings.soundsEnabled !== false ? <Volume2 size={13} /> : <VolumeX size={13} />} label="Lesson sounds" hint="Play a chime when you pass a lesson and a tone when a run fails." checked={settings.soundsEnabled !== false} onChange={(checked) => patch({ soundsEnabled: checked })} />
          </Section>

          {/* 3. Learn */}
          <Section id="learnMode" icon={<GraduationCap size={13} />} title="Learn" open={expandedSection === 'learnMode'} onToggle={toggleSection}>
            <Field label="Guidance level" hint="Choose how much teaching Learn shows. You can change this at any time.">
              <GuidanceTabs value={['supported', 'guided', 'independent'].includes(settings.guidanceLevel) ? settings.guidanceLevel : 'supported'} onChange={(guidanceLevel) => patch({ guidanceLevel, guidanceSuccessStreak: 0 })} />
            </Field>
          </Section>

          {/* 4. Practice reminders */}
          <Section id="practiceReminders" icon={<Bell size={13} />} title="Practice reminders" open={expandedSection === 'practiceReminders'} onToggle={toggleSection}>
            <ToggleRow icon={<Bell size={13} />} label="Learning Pulse reminders" hint="Show a quiet practice bar when completed learning work is ready to revisit." checked={settings.practiceRemindersEnabled} onChange={(checked) => patch({ practiceRemindersEnabled: checked })} />
            <Field label="Reminder time" hint="New reminders and postponed practice will appear at this local time.">
              <input type="time" value={settings.practiceReminderTime || '18:00'} onChange={(e) => patch({ practiceReminderTime: e.target.value || '18:00' })} disabled={!settings.practiceRemindersEnabled} className={cn("flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[12.5px] py-2 px-2.5 outline-none font-mono w-[132px] shrink-0", !settings.practiceRemindersEnabled && "opacity-50 cursor-not-allowed")} />
            </Field>
            <Field label="Desktop notifications" hint={notificationPermissionHint(notificationPermission)}>
              <button type="button" className={cn("inline-flex items-center justify-center bg-transparent border border-[var(--border)] rounded-md text-[var(--text-secondary)] text-[12.5px] py-[7px] px-3 self-start", (notificationPermission === 'unsupported' || notificationPermission === 'denied') && "opacity-50 cursor-not-allowed")} disabled={notificationPermission === 'unsupported' || notificationPermission === 'denied'} onClick={handleDesktopNotifications}>
                {notificationPermission === 'granted' && settings.practiceNotificationsEnabled ? 'Turn off desktop notifications' : notificationPermission === 'granted' ? 'Turn on desktop notifications' : notificationPermission === 'denied' ? 'Permission blocked' : notificationPermission === 'unsupported' ? 'Not supported' : 'Allow notifications'}
              </button>
            </Field>
          </Section>

          {/* 5. Languages */}
          <Section id="languages" icon={<Layers size={13} />} title="Languages" open={expandedSection === 'languages'} onToggle={toggleSection}>
            <Field label="Practical language" hint="The language you build in. Powers Run, default file extension, and the first language tab.">
              <div className="flex flex-wrap gap-1.5">
                {RUNNABLE_LANGUAGES.map((lang) => (<Pill key={lang.id} selected={settings.practicalLanguage === lang.id} onClick={() => setPracticalLanguage(lang.id)}>{lang.label}</Pill>))}
              </div>
            </Field>
            <Field label="Comparison languages" hint="Shown beside your practical language so you can see the same algorithm in different syntax. Pick up to 3.">
              <div className="flex flex-wrap gap-1.5">
                {RUNNABLE_LANGUAGES.filter((l) => l.id !== settings.practicalLanguage).map((lang) => (<Pill key={lang.id} selected={settings.comparisonLanguages.includes(lang.id)} onClick={() => toggleComparison(lang.id)}>{lang.label}</Pill>))}
              </div>
            </Field>
          </Section>

          {/* 6. AI */}
          <Section id="ai" icon={<Sparkles size={13} />} title="AI" open={expandedSection === 'ai'} onToggle={toggleSection}>
            <Field label="Gemini API key" hint="Free key from Google AI Studio. Required for AI Generate & AI Explain. Stored locally; never sent anywhere except Google.">
              <div className="flex gap-1.5 items-stretch">
                <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} onFocus={handleKeyFocus} placeholder="AIza…" className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[12.5px] py-2 px-2.5 outline-none font-mono" autoComplete="off" spellCheck={false} />
                <button className="inline-flex items-center justify-center w-8 h-8 bg-transparent border border-[var(--border)] rounded-md text-[var(--text-secondary)]" onClick={() => setShowKey((v) => !v)} title={showKey ? 'Hide key' : 'Show key'} aria-label={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <Button onClick={handleSaveKey} className="shrink-0 min-w-[64px]">{keySaved ? <><Check size={12} className="mr-1" /> Saved</> : 'Save'}</Button>
              </div>
              <a className="text-[11.5px] text-[var(--accent)] no-decoration mt-0.5 self-start" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get a free key →</a>
            </Field>
          </Section>

          {/* 7. Workspace */}
          <Section id="workspace" icon={<FolderTree size={13} />} title="Workspace" open={expandedSection === 'workspace'} onToggle={toggleSection}>
            <ToggleRow icon={<FolderTree size={13} />} label="Show file explorer by default" hint="Off for new accounts. Turn on once you start saving files." checked={settings.showFileExplorer} onChange={(checked) => patch({ showFileExplorer: checked })} />
            <ToggleRow icon={<TermIcon size={13} />} label="Show terminal by default" hint="Toggle the bottom terminal at any time with Ctrl + `." checked={settings.showTerminal} onChange={(checked) => patch({ showTerminal: checked })} />
          </Section>

          {/* 8. Keyboard shortcuts */}
          <Section id="keyboardShortcuts" icon={<Keyboard size={13} />} title="Keyboard shortcuts" open={expandedSection === 'keyboardShortcuts'} onToggle={toggleSection}>
            <ShortcutList />
          </Section>

          {/* 9. Toolchains */}
          <Section id="toolchains" icon={<Cpu size={13} />} title="Toolchains" open={expandedSection === 'toolchains'} onToggle={toggleSection}>
            <ToolchainPanel onRunInTerminal={onRunInTerminal} />
          </Section>

          {/* 10. About & Updates */}
          <Section id="about" icon={<Info size={13} />} title="About & Updates" open={expandedSection === 'about'} onToggle={toggleSection}>
            <UpdatePanel update={update} />
          </Section>

          {/* 11. Onboarding */}
          <Section id="onboarding" title="Onboarding" open={expandedSection === 'onboarding'} onToggle={toggleSection}>
            <Button variant="outline" onClick={handleRerun} className="self-start">Rerun onboarding</Button>
            <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed mt-1.5">Re-asks the experience and language questions. Your other settings stay.</p>
          </Section>

          <p className="text-[11px] text-[var(--text-muted)] text-center mt-4">Settings live on this device only. Nothing is sent to a server.</p>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileManagerCard
export function ProfileManagerCard({ open, onClose, onSettingsChange, onSwitchProfile, onAddProfile, onDeleteProfile }) {
  const titleRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    titleRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-6 bg-[var(--scrim)] backdrop-blur-sm animate-[seec0de-fade-in_var(--motion-base)_var(--ease-out)]" onClick={onClose} role="presentation">
      <section className="w-[560px] max-w-full max-h-[calc(100vh-48px)] flex flex-col overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl shadow-[var(--shadow-lg)] animate-[seec0de-pop-in_var(--motion-slow)_var(--ease-out)]" role="dialog" aria-modal="true" aria-labelledby="manage-profile-title" onClick={(e) => e.stopPropagation()}>
        <header className="flex-none flex items-center justify-between px-[18px] py-3.5 border-b border-[var(--border)]">
          <div>
            <h2 ref={titleRef} tabIndex={-1} id="manage-profile-title" className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Manage profile</h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Your identity and progress stay on this device.</p>
          </div>
          <button className="inline-flex items-center justify-center w-8 h-8 bg-transparent border border-[var(--border)] rounded-md text-[var(--text-secondary)]" onClick={onClose} title="Close (Esc)" aria-label="Close profile manager"><X size={16} /></button>
        </header>
        <div className="flex flex-col gap-4 overflow-y-auto p-[18px]">
          <ProfileSection onSettingsChange={onSettingsChange} onSwitchProfile={onSwitchProfile} onAddProfile={onAddProfile} onDeleteProfile={onDeleteProfile} />
        </div>
      </section>
    </div>
  );
}

function ProfileSection({ onSettingsChange, onSwitchProfile, onAddProfile, onDeleteProfile }) {
  const initial = loadSettings();
  const activeId = initial.activeProfileId;

  const [draft, setDraft] = useState({ username: initial.username || '', avatar: initial.avatar || null, bio: initial.bio || '', languagesUsing: initial.languagesUsing || [], languagesLearning: initial.languagesLearning || [] });
  const [saved, setSaved] = useState(false);
  const [hasPin, setHasPin] = useState(!!(initial.pinHash && initial.pinHash.hash));
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trimmed = (draft.username || '').trim();
  const usernameError = trimmed.length === 0 ? 'Enter a username.' : trimmed.length < 2 ? 'At least 2 characters.' : usernameExists(trimmed, activeId) ? 'That username is taken on this device.' : '';
  const canSave = !usernameError;

  const handleSaveProfile = () => {
    if (!canSave) return;
    const next = updateSettings({ username: trimmed, avatar: draft.avatar || null, bio: (draft.bio || '').trim(), languagesUsing: draft.languagesUsing || [], languagesLearning: draft.languagesLearning || [] });
    onSettingsChange?.(next); setSaved(true); setTimeout(() => setSaved(false), 1800);
  };

  const openPinEditor = () => { setPin(''); setPin2(''); setPinError(''); setPinOpen(true); };

  const handleSavePin = async () => {
    const clean = pin.trim();
    if (clean.length < 4) { setPinError('Use at least 4 digits.'); return; }
    if (clean !== pin2.trim()) { setPinError("Those PINs don't match."); return; }
    setPinBusy(true);
    try { await setProfilePin(activeId, clean); setHasPin(true); setPinOpen(false); setPin(''); setPin2(''); onSettingsChange?.(loadSettings()); }
    catch { setPinError("Couldn't set the PIN. Try again."); }
    finally { setPinBusy(false); }
  };

  const handleRemovePin = () => { clearProfilePin(activeId); setHasPin(false); setPinOpen(false); onSettingsChange?.(loadSettings()); };

  return (
    <>
      <ProfileFields values={draft} onChange={setDraft} usernameError={usernameError} />
      <Button onClick={handleSaveProfile} disabled={!canSave} className="self-start px-3.5 py-1.5">{saved ? <><Check size={12} className="mr-1" /> Saved</> : 'Save profile'}</Button>

      {/* PIN lock */}
      <Field label="PIN lock" hint="Optional. Asks for a PIN before opening this profile — a courtesy lock for shared machines, not real security. Anyone with disk access can still reset it.">
        {!pinOpen ? (
          <div className="flex flex-wrap gap-2 items-center">
            {hasPin ? (<>
              <span className="inline-flex items-center text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-md py-1.5 px-2.5"><Lock size={11} className="mr-1.5" /> PIN lock is on</span>
              <Button variant="ghost" size="sm" onClick={openPinEditor}>Change</Button>
              <Button variant="ghost" size="sm" className="text-[var(--danger-text-soft)] border border-red-500/40 hover:bg-red-500/10" onClick={handleRemovePin}>Remove</Button>
            </>) : (<Button variant="ghost" size="sm" onClick={openPinEditor}><Lock size={12} className="mr-1.5" /> Add a PIN lock</Button>)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(''); }} placeholder="New PIN" className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[12.5px] py-2 px-2.5 outline-none font-mono" maxLength={12} autoComplete="off" />
            <input type="password" inputMode="numeric" value={pin2} onChange={(e) => { setPin2(e.target.value); setPinError(''); }} placeholder="Confirm PIN" onKeyDown={(e) => { if (e.key === 'Enter') handleSavePin(); }} className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[12.5px] py-2 px-2.5 outline-none font-mono" maxLength={12} autoComplete="off" />
            {pinError && <p className="text-[11.5px] text-[var(--danger-text-soft)] leading-relaxed m-0">{pinError}</p>}
            <div className="flex flex-wrap gap-2 items-center">
              <Button onClick={handleSavePin} disabled={pinBusy} className="px-3.5 py-1.5">{pinBusy ? 'Saving…' : 'Save PIN'}</Button>
              <Button variant="ghost" size="sm" onClick={() => setPinOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Field>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex flex-col gap-2 bg-[var(--danger-soft)] border border-red-500/25 rounded-lg p-2.5">
          <p className="text-xs text-[var(--danger-text-soft)] leading-relaxed m-0">Delete this profile and all its progress on this device? This can't be undone.</p>
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="destructive" onClick={() => onDeleteProfile?.(activeId)} className="px-3 py-1.5"><Trash2 size={12} className="mr-1.5" /> Delete permanently</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="text-[var(--danger-text-soft)] border border-red-500/40 hover:bg-red-500/10 self-start" onClick={() => setConfirmDelete(true)}><Trash2 size={12} className="mr-1.5" /> Delete this profile</Button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reusable bits

function Section({ id, icon, title, open, onToggle, children }) {
  const bodyId = `settings-section-${id}`;
  const [hovered, setHovered] = useState(false);
  return (
    <section className="border-b border-[var(--border)]">
      <button
        type="button"
        className={cn(
          "flex items-center gap-2 w-full py-3.5 px-0.5 m-0 bg-transparent border-none text-left rounded-md transition-all cursor-pointer",
          hovered ? "bg-[var(--bg-tertiary)] border-l-2 border-l-[var(--accent)] pl-2.5 text-[var(--text-muted)]" : "border-l-2 border-l-transparent text-[var(--text-muted)]"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onToggle?.(id)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        {icon && <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] shrink-0">{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-secondary)] flex-1">{title}</span>
        <span className="inline-flex items-center justify-center text-[var(--text-muted)] shrink-0">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && <div id={bodyId} className="flex flex-col gap-4 pb-[18px] pt-0.5">{children}</div>}
    </section>
  );
}

function ShortcutList() {
  const shortcuts = [
    ['Run active code', 'Ctrl', 'Enter'],
    ['Toggle file explorer', 'Ctrl', 'B'],
    ['Toggle terminal', 'Ctrl', '`'],
    ['Save active file', 'Ctrl', 'S'],
    ['Zoom in', 'Ctrl', '='],
    ['Zoom out', 'Ctrl', '-'],
    ['Reset zoom', 'Ctrl', '0'],
    ['Cycle visible panels', 'F6'],
    ['Resize focused divider', '\u2190 / \u2192'],
  ];
  return (
    <div className="flex flex-col border border-[var(--border)] rounded-lg overflow-hidden">
      {shortcuts.map(([label, ...keys]) => (
        <div key={label} className="min-h-[var(--control-standard)] flex items-center justify-between gap-3 py-2 px-3 border-b border-[var(--border)]">
          <span className="text-[var(--text-secondary)] text-[12px]">{label}</span>
          <span className="inline-flex items-center gap-1">
            {keys.map((key) => <kbd key={key} className="inline-block min-w-[22px] px-1.5 py-0.5 text-[10px] font-semibold text-center border border-[var(--border-strong)] border-b-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-mono">{key}</kbd>)}
          </span>
        </div>
      ))}
      <p className="m-0 py-2 px-3 text-[var(--text-muted)] text-[10px] leading-normal">Hold Shift while resizing to move a divider 32px at a time.</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return <div className="flex flex-col gap-1.5"><label className="text-[12.5px] font-semibold text-[var(--text-primary)]">{label}</label>{hint && <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed mb-0.5">{hint}</p>}{children}</div>;
}

function getNotificationPermission() { return typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'; }
function notificationPermissionHint(permission) { if (permission === 'granted') return 'Permission granted. Choose whether seec0de may notify you outside the app.'; if (permission === 'denied') return 'Notifications are blocked by the system. Re-enable them in your operating system settings.'; if (permission === 'unsupported') return 'Desktop notifications are not available on this system.'; return 'Optional. seec0de asks your operating system only after you choose Allow.'; }

const GUIDANCE_LEVELS = ['supported', 'guided', 'independent'];
function GuidanceTabs({ value, onChange }) {
  const handleKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % GUIDANCE_LEVELS.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + GUIDANCE_LEVELS.length) % GUIDANCE_LEVELS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = GUIDANCE_LEVELS.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    onChange?.(GUIDANCE_LEVELS[nextIndex]);
    event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[nextIndex]?.focus();
  };
  return (
    <div className="flex gap-0.5 p-0.5 border border-[var(--border)] rounded-md bg-[var(--bg-tertiary)]" role="radiogroup" aria-label="Guidance level">
      {GUIDANCE_LEVELS.map((level, index) => (
        <button key={level} type="button" role="radio" className={cn("flex-1 py-1 px-0.5 border-none rounded bg-transparent text-[var(--text-muted)] text-[9.5px]", value === level && "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold")} aria-checked={value === level} tabIndex={value === level ? 0 : -1} onClick={() => onChange?.(level)} onKeyDown={(event) => handleKeyDown(event, index)}>
          {level[0].toUpperCase() + level.slice(1)}
        </button>
      ))}
    </div>
  );
}

function Pill({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn("inline-flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-full text-[var(--text-secondary)] text-xs py-[5px] px-3 transition-all", selected && "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]")}>
      {selected && <Check size={10} className="mr-1" />}{children}
    </button>
  );
}

function ThemeChoice({ name, description, colors, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn("relative flex flex-col gap-2 min-w-0 bg-[var(--bg-tertiary)] border rounded-lg text-[var(--text-secondary)] p-2.5 text-left", selected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]")}>
      <span className="flex gap-1" aria-hidden="true">{colors.map((color) => <span key={color} className="w-[18px] h-[18px] rounded-full border border-[var(--border-strong)]" style={{ background: color }} />)}</span>
      <span className="flex flex-col gap-0.5"><span className="text-[var(--text-primary)] text-[11.5px] font-semibold">{name}</span><span className="text-[var(--text-muted)] text-[10.5px] leading-[1.35]">{description}</span></span>
      {selected && <Check size={13} className="absolute top-2.5 right-2.5 text-[var(--accent)]" />}
    </button>
  );
}

function ToggleRow({ icon, label, hint, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between bg-transparent border border-[var(--border)] rounded-lg py-2.5 px-3 text-[var(--text-primary)] text-left w-full gap-3" aria-pressed={checked}>
      <span className="flex flex-col gap-0.5 flex-1">
        <span className="flex items-center text-[12.5px] font-medium text-[var(--text-primary)]">{icon}<span className="ml-2">{label}</span></span>
        <span className="text-[11px] text-[var(--text-muted)] leading-[1.45]">{hint}</span>
      </span>
      <span className={cn("shrink-0 w-[30px] h-[18px] rounded-full border border-[var(--border-strong)] relative transition-all", checked && "bg-[var(--accent)] border-[var(--accent)]")}>
        <span className={cn("absolute top-px left-px w-3.5 h-3.5 rounded-full bg-[var(--text-primary)] transition-transform", checked && "translate-x-3")} />
      </span>
    </button>
  );
}

function UpdatePanel({ update }) {
  const { appVersion, status, info, lastChecked, error, checkNow, installNow } = update;
  const busy = status === 'checking' || status === 'downloading';
  const isDev = status === 'disabled-in-dev';
  const label = statusLabel(status, info);
  return (
    <>
      <div className="flex justify-between text-[11.5px] text-[var(--text-muted)]"><span>Installed version</span><span className="text-[var(--text-secondary)] font-mono">v{appVersion}</span></div>
      <div className="flex justify-between text-[11.5px] text-[var(--text-muted)]"><span>Last checked</span><span className="text-[var(--text-secondary)] font-mono">{formatLastChecked(lastChecked)}</span></div>
      <div className="flex items-center text-[11.5px] mt-1" style={{ color: TONE_COLOURS[label.tone] }}>
        {busy ? <Loader size={11} className="animate-spin" /> : (status === 'downloaded' || status === 'not-available') ? <CheckCircle2 size={11} /> : status === 'error' ? <AlertCircle size={11} /> : <Info size={11} />}
        <span className="ml-1.5">{label.text}</span>
      </div>
      {status === 'error' && error && <div className="bg-[var(--danger-soft)] border border-red-500/25 rounded-md py-1.5 px-2 text-[11px] text-[var(--danger-text-soft)] font-mono break-all mt-1.5" title={error}>{error.split('\n')[0].slice(0, 240)}</div>}
      <div className="flex gap-2 mt-1.5">
        <Button variant="ghost" size="sm" onClick={() => checkNow()} disabled={busy || isDev} title={isDev ? 'Updates are disabled in dev mode' : 'Check GitHub for a newer release'}><RefreshCw size={11} className={busy ? 'animate-spin' : ''} /><span className="ml-1.5">Check now</span></Button>
        {status === 'downloaded' && <Button onClick={() => installNow()}>Restart & install</Button>}
      </div>
    </>
  );
}

// Toolchain panel
function toolchainCommand(recipe) { return recipe?.install?.[PLATFORM_LABEL] || ''; }
function platformValue(map, fallback = '') { return map?.[PLATFORM_LABEL] || map?.default || fallback; }

function ToolchainPanel({ onRunInTerminal }) {
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [copiedLang, setCopiedLang] = useState(null);
  const [installingLang, setInstallingLang] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);

  const probe = useCallback(async () => { setChecking(true); try { const result = await window.seecode.runner.checkToolchains(); setStatus(result && !result.error ? result : {}); } catch { setStatus({}); } finally { setChecking(false); } }, []);
  useEffect(() => { probe(); }, [probe]);

  const handleInstall = useCallback((langId) => { const recipe = TOOLCHAIN_GUIDES[langId]; if (!recipe) return; const command = toolchainCommand(recipe); if (!command || !onRunInTerminal) return; setInstallingLang(langId); setExpandedGuide(langId); onRunInTerminal(command); }, [onRunInTerminal]);
  const handleCopy = useCallback(async (langId) => { const recipe = TOOLCHAIN_GUIDES[langId]; if (!recipe) return; const command = toolchainCommand(recipe); if (!command) return; try { await navigator.clipboard.writeText(command); setCopiedLang(langId); setTimeout(() => setCopiedLang((cur) => (cur === langId ? null : langId)), 1600); } catch {} }, []);
  const handleRecheck = useCallback(() => { setInstallingLang(null); probe(); }, [probe]);

  return (
    <>
      <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed mb-0.5">seec0de's <b>Run</b> button needs the right compiler or interpreter on PATH. Use each guide to install, verify, fix PATH, then run a tiny smoke test.</p>
      <div className="flex flex-col gap-2.5">
        {Object.entries(TOOLCHAIN_GUIDES).map(([langId, recipe]) => {
          const row = status?.[langId]; const isInstalled = !!row?.installed; const isLoading = checking && !row; const command = toolchainCommand(recipe); const guideOpen = expandedGuide === langId; const showInstall = !isLoading && !isInstalled && command;
          return (
            <div key={langId} className="flex flex-col gap-1 py-2.5 px-3 border border-[var(--border)] rounded-lg bg-[var(--bg-tertiary)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-3.5 shrink-0">{isLoading ? <Loader size={12} className="animate-spin" /> : isInstalled ? <CheckCircle2 size={12} className="text-[#4ade80]" /> : <AlertCircle size={12} className="text-[#f87171]" />}</span>
                <span className="text-[12.5px] font-semibold text-[var(--text-primary)] flex-1">{recipe.label}</span>
                {isInstalled && row?.version && <span className="text-[10.5px] text-[var(--text-muted)] font-mono max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap" title={row.version}>{row.version.length > 36 ? row.version.slice(0, 33) + '…' : row.version}</span>}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5 mb-0">{recipe.why}</p>
              {showInstall && (<>
                <code className="block mt-1.5 py-1.5 px-2 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-mono text-[11px] break-all whitespace-pre-wrap">{command}</code>
                <div className="flex gap-1.5 mt-1.5">
                  <button type="button" className={cn("inline-flex items-center justify-center bg-[var(--accent)] border border-[var(--accent)] rounded-md text-[var(--text-on-accent)] text-[11.5px] font-semibold py-[5px] px-2.5 cursor-pointer", !onRunInTerminal && "opacity-50 cursor-not-allowed")} onClick={() => handleInstall(langId)} disabled={!onRunInTerminal}><Play size={11} /><span className="ml-1">Install</span></button>
                  <button type="button" className="inline-flex items-center justify-center bg-transparent border border-[var(--border-strong)] rounded-md text-[var(--text-secondary)] text-[11.5px] py-[5px] px-2.5 cursor-pointer" onClick={() => handleCopy(langId)}>{copiedLang === langId ? <><Check size={11} /><span className="ml-1">Copied</span></> : <><Copy size={11} /><span className="ml-1">Copy</span></>}</button>
                </div>
                {installingLang === langId && <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-2 py-1.5 px-2 bg-[var(--bg-input)] border border-dashed border-[var(--border-strong)] rounded"><Download size={11} className="mr-1 inline-block align-[-1px]" />Watch the bottom terminal. When it finishes (exit code 0), click<b> Re-check toolchains</b> below — the checkmark should light up.</p>}
              </>)}
              <div className="flex gap-1.5 mt-1.5">
                <button type="button" className="inline-flex items-center justify-center bg-transparent border border-[var(--border-strong)] rounded-md text-[var(--text-secondary)] text-[11.5px] py-[5px] px-2.5 cursor-pointer" onClick={() => setExpandedGuide((cur) => (cur === langId ? null : langId))}>{guideOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}<span className="ml-1">{guideOpen ? 'Hide guide' : 'Guide'}</span></button>
              </div>
              {guideOpen && <ToolchainGuide recipe={recipe} command={command} />}
            </div>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" className="mt-2.5 self-start" onClick={handleRecheck} disabled={checking}><RefreshCw size={11} className={checking ? 'animate-spin' : ''} /><span className="ml-1.5">Re-check toolchains</span></Button>
    </>
  );
}

function ToolchainGuide({ recipe, command }) {
  const detects = platformValue(recipe.detects, 'the matching command for this language');
  const verify = recipe.verify?.[PLATFORM_LABEL] || [];
  const pathHelp = platformValue(recipe.pathHelp);
  const pathCommand = platformValue(recipe.pathCommand);
  return (
    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[var(--border)]">
      <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.8px]">seec0de checks</span><p className="text-[11px] text-[var(--text-secondary)] leading-relaxed m-0">{detects}</p></div>
      {command && <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.8px]">install</span><code className="block py-[5px] px-[7px] bg-[var(--bg-input)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-mono text-[10.5px] leading-[1.45] break-all whitespace-pre-wrap">{command}</code></div>}
      {verify.length > 0 && <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.8px]">verify</span>{verify.map((cmd) => <code key={cmd} className="block py-[5px] px-[7px] bg-[var(--bg-input)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-mono text-[10.5px] leading-[1.45] break-all whitespace-pre-wrap">{cmd}</code>)}</div>}
      {pathCommand && <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.8px]">PATH fix</span><code className="block py-[5px] px-[7px] bg-[var(--bg-input)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] font-mono text-[10.5px] leading-[1.45] break-all whitespace-pre-wrap">{pathCommand}</code></div>}
      {pathHelp && <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed m-0">{pathHelp}</p>}
      {recipe.smokeTest && <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed m-0">{recipe.smokeTest}</p>}
    </div>
  );
}

function statusLabel(status, info) {
  switch (status) {
    case 'checking': return { text: 'Checking GitHub for updates…', tone: 'info' };
    case 'available': return { text: `v${info && info.version} found — downloading…`, tone: 'info' };
    case 'downloading': return { text: 'Downloading update in the background…', tone: 'info' };
    case 'downloaded': return { text: `v${info && info.version} ready — restart to install.`, tone: 'success' };
    case 'not-available': return { text: "You're on the latest version.", tone: 'success' };
    case 'error': return { text: 'Update check failed. See logs for details.', tone: 'error' };
    case 'disabled-in-dev': return { text: 'Auto-update is disabled in development mode.', tone: 'muted' };
    case 'idle': default: return { text: 'Idle.', tone: 'muted' };
  }
}

const TONE_COLOURS = { info: '#60a5fa', success: '#4ade80', error: '#f87171', muted: 'var(--text-muted)' };

function formatLastChecked(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'never';
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}
