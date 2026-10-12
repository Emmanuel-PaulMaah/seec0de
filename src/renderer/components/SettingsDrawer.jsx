import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import {
  X, Check, Eye, EyeOff, RefreshCw, CheckCircle2,
  AlertCircle, Info, Sparkles, FolderTree, Terminal as TermIcon, Layers,
  Cpu, Play, Copy, Download, ChevronDown, ChevronUp,
  Users, UserPlus, Lock, Trash2, GraduationCap, Keyboard, Bell,
  Volume2, VolumeX, ClipboardPaste,
} from 'lucide-react';
import { Loader } from './motion/loader';
import { motion, useReducedMotion } from 'motion/react';
import { EASE_OUT } from '../lib/ease';
import { Switch } from './motion/switch';
import { OTPInput } from './motion/otp-input';
import { Tabs, TabsList, TabsTrigger } from './motion/tabs';
import {
  RUNNABLE_LANGUAGES,
  TOOLCHAIN_GUIDES,
  defaultComparisonFor,
  loadSettings,
  updateSettings,
  resetOnboarding,
  getSettingsApiKey,
  setSettingsApiKey,
  usernameExists,
  setProfilePin,
  clearProfilePin,
} from '../engine/settings';
import { ProfileFields } from './ProfileForm';
import { keyFromClipboard, looksLikeApiKey, validateApiKey } from '../engine/aiService';
import { Drawer } from './motion/drawer';
import { useUpdateStatus } from '../hooks/useUpdateStatus';
import { useConfirm } from './ui/dialog';

// SettingsDrawer — right-side overlay containing every persistent
// preference in one place. Replaces the inline `ApiKeySettings` and
// `AboutSettings` blocks that used to live in the left panel.
//
// Sections (top → bottom):
//   1. Appearance             — editor preferences
//   2. Sounds                 — lesson pass/fail sounds
//   3. Learn Mode             — learner-controlled guidance level
//   4. Practice reminders     — pulse bar, time, desktop notifications
//   5. Languages              — practical + comparison
//   6. AI                     — Gemini key
//   7. Workspace              — defaults for explorer / terminal panels
//   8. Keyboard shortcuts     — keycap reference
//   9. Toolchains             — compiler / interpreter setup
//   10. About & Updates       — version, last-checked, "Check now"
//   11. Onboarding            — "Rerun onboarding"
//
// Visual direction: AI-Native UI. Slides in from the right, dimmed scrim
// behind, generous whitespace, single-column, semantic icons (no emoji).

const PLATFORM_LABEL = (() => {
  const p = (typeof navigator !== 'undefined' ? navigator.platform : '') || '';
  if (/win/i.test(p)) return 'win';
  if (/mac/i.test(p)) return 'macos';
  return 'linux';
})();

export default function SettingsDrawer({
  open, onClose, onSettingsChange, onRerunOnboarding, onRunInTerminal,
}) {
  const [settings, setSettings] = useState(loadSettings());
  const confirm = useConfirm();
  const [apiKey, setApiKey]     = useState('');
  const [hasKey, setHasKey]     = useState(false);
  const [showKey, setShowKey]   = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [keyChecking, setKeyChecking] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const [expandedSection, setExpandedSection] = useState('appearance');
  const update = useUpdateStatus();

  // Accordion: clicking the open section's header collapses it; clicking a
  // closed section's header opens it and closes whichever was open before.
  const toggleSection = (id) => {
    setExpandedSection((current) => (current === id ? null : id));
  };

  // Placeholder shown when a key exists. Never saved — see handleSaveKey.
  const KEY_MASK = '••••••••••••••••';

  // Refresh local copy whenever the drawer opens.
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

  // Esc is handled by the beUI Drawer component.

  const patch = (p) => {
    const next = updateSettings(p);
    setSettings(next);
    onSettingsChange?.(next);
  };

  const setPracticalLanguage = (id) => {
    // When the practical language changes, reset comparison languages to a
    // sensible default for that language (the user can re-pick after).
    patch({
      practicalLanguage:   id,
      comparisonLanguages: defaultComparisonFor(id).filter((c) => c !== id),
    });
  };

  const toggleComparison = (id) => {
    if (id === settings.practicalLanguage) return; // can't compare with itself
    const set = new Set(settings.comparisonLanguages);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    // Cap at 3 comparison languages. More than that and the lesson drowns.
    const next = Array.from(set).slice(0, 3);
    patch({ comparisonLanguages: next });
  };

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    // Guard: the field is pre-filled with mask bullets when a key
    // already exists. If the user clicks Save without editing, we'd
    // otherwise overwrite their real key with "••••••••" — Gemini then
    // rightly rejects every subsequent call with "API key not valid".
    // Treat "unchanged mask" as a no-op confirm.
    if (hasKey && (trimmed === KEY_MASK || /^[•*]+$/.test(trimmed))) {
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 1800);
      return;
    }
    // An empty field is not a request to delete the key (focusing the field
    // clears the mask). Removal goes through the explicit "Remove key" action.
    if (!trimmed) {
      setApiKey(hasKey ? KEY_MASK : '');
      return;
    }
    // Validate before saving: a local format gate, then a live probe so a
    // wrong key is rejected here — not on the learner's first AI action.
    if (!looksLikeApiKey(trimmed)) {
      setKeyError('Keys start with “AIza” — make sure you copied the whole key.');
      return;
    }
    setKeyChecking(true);
    setKeyError(null);
    const result = await validateApiKey(trimmed);
    setKeyChecking(false);
    if (!result.ok) {
      setKeyError(result.message || "Google didn't accept that key. Get a fresh one and try again.");
      return;
    }
    await setSettingsApiKey(trimmed);
    const exists = await window.seecode.ai.hasKey();
    setHasKey(exists);
    setApiKey(exists ? KEY_MASK : '');
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 1800);
  };

  const handleRemoveKey = async () => {
    const ok = await confirm({
      title: 'Remove your AI key?',
      description: 'AI generation and explanations will switch to offline mode until you add a key again.',
      confirmLabel: 'Remove Key',
      danger: true,
    });
    if (!ok) return;
    await setSettingsApiKey('');
    const exists = await window.seecode.ai.hasKey();
    setHasKey(exists);
    setApiKey(exists ? KEY_MASK : '');
  };

  // Clear the mask the first time the user focuses the field so they
  // can type a fresh key without first having to manually delete the
  // placeholder bullets.
  const handleKeyFocus = () => {
    if (apiKey === KEY_MASK) setApiKey('');
  };

  // One-click fill from the clipboard (the user usually just came back
  // from AI Studio with the key on their clipboard).
  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const key = keyFromClipboard(text);
      if (key) {
        setApiKey(key);
        setKeyError(null);
      } else {
        setKeyError('No AI key found on the clipboard. Copy the key first, then click Paste.');
      }
    } catch {
      setKeyError("Couldn't read the clipboard — paste with Ctrl+V instead.");
    }
  };

  const handleRerun = () => {
    resetOnboarding();
    onClose?.();
    onRerunOnboarding?.();
  };

  const handleDesktopNotifications = async () => {
    if (notificationPermission === 'unsupported' || notificationPermission === 'denied') return;
    if (notificationPermission === 'granted') {
      patch({ practiceNotificationsEnabled: !settings.practiceNotificationsEnabled });
      return;
    }
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    patch({ practiceNotificationsEnabled: permission === 'granted' });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => { if (!v) onClose?.(); }}
      side="right"
      ariaLabel="Settings"
      className="w-[380px]! bg-[var(--glass-bg-heavy)]! backdrop-blur-[var(--glass-blur-heavy)]!"
    >
      <header style={styles.header}>
        <h2 id="settings-title" style={styles.title}>Settings</h2>
        <button
          style={styles.iconBtn}
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close settings"
        >
          <X size={16} />
        </button>
      </header>

      <div style={styles.scroll}>
          {(() => {
            const SECTION_IDS = [
              'appearance', 'sounds', 'learnMode', 'practiceReminders',
              'languages', 'ai', 'workspace', 'keyboardShortcuts',
              'toolchains', 'about', 'onboarding',
            ];
            return SECTION_IDS.map((id, index) => {
              const isOpen = expandedSection === id;
              const isFirst = index === 0;
              const isLast = index === SECTION_IDS.length - 1;
              const isPreviousOpen = index > 0 && expandedSection === SECTION_IDS[index - 1];
              const props = { id, onToggle: toggleSection, open: isOpen, isFirst, isLast, isPreviousOpen };

              if (id === 'appearance') return (
                <Section key={id} {...props} icon={<Eye size={13} />} title="Appearance">
                  <ToggleRow icon={<Layers size={13} />} label="Sticky scroll" hint="Keep the function name visible at the top of the editor while you scroll." checked={settings.editorStickyScroll !== false} onChange={(checked) => patch({ editorStickyScroll: checked })} />
                  <ToggleRow icon={<FolderTree size={13} />} label="Breadcrumbs" hint="Show a clickable bar above the editor showing where you are in the file." checked={!!settings.editorBreadcrumbs} onChange={(checked) => patch({ editorBreadcrumbs: checked })} />
                </Section>
              );
              if (id === 'sounds') return (
                <Section key={id} {...props} icon={<Volume2 size={13} />} title="Sounds">
                  <ToggleRow icon={settings.soundsEnabled !== false ? <Volume2 size={13} /> : <VolumeX size={13} />} label="Lesson sounds" hint="Play a sound when you pass a lesson or when code fails to run." checked={settings.soundsEnabled !== false} onChange={(checked) => patch({ soundsEnabled: checked })} />
                </Section>
              );
              if (id === 'learnMode') return (
                <Section key={id} {...props} icon={<GraduationCap size={13} />} title="Learn">
                  <Field label="Guidance level" hint="Choose how much help the Learn mode shows. Change this anytime.">
                    <GuidanceTabs value={['supported', 'guided', 'independent'].includes(settings.guidanceLevel) ? settings.guidanceLevel : 'supported'} onChange={(guidanceLevel) => patch({ guidanceLevel, guidanceSuccessStreak: 0 })} />
                  </Field>
                </Section>
              );
              if (id === 'practiceReminders') return (
                <Section key={id} {...props} icon={<Bell size={13} />} title="Practice reminders">
                  <ToggleRow icon={<Bell size={13} />} label="Learning Pulse reminders" hint="Show a quiet practice bar when completed learning work is ready to revisit." checked={settings.practiceRemindersEnabled} onChange={(checked) => patch({ practiceRemindersEnabled: checked })} />
                  <Field label="Reminder time" hint="New reminders and postponed practice will appear at this local time.">
                    <input type="time" value={settings.practiceReminderTime || '18:00'} onChange={(event) => patch({ practiceReminderTime: event.target.value || '18:00' })} disabled={!settings.practiceRemindersEnabled} style={{ ...styles.input, ...styles.timeInput, ...(!settings.practiceRemindersEnabled ? styles.disabled : {}) }} />
                  </Field>
                  <Field label="Desktop notifications" hint={notificationPermissionHint(notificationPermission)}>
                    <button type="button" style={{ ...styles.ghostBtn, alignSelf: 'flex-start', ...((notificationPermission === 'unsupported' || notificationPermission === 'denied') ? styles.disabled : {}) }} disabled={notificationPermission === 'unsupported' || notificationPermission === 'denied'} onClick={handleDesktopNotifications}>
                      {notificationPermission === 'granted' && settings.practiceNotificationsEnabled ? 'Turn off desktop notifications' : notificationPermission === 'granted' ? 'Turn on desktop notifications' : notificationPermission === 'denied' ? 'Permission blocked' : notificationPermission === 'unsupported' ? 'Not supported' : 'Allow notifications'}
                    </button>
                  </Field>
                </Section>
              );
              if (id === 'languages') return (
                <Section key={id} {...props} icon={<Layers size={13} />} title="Languages">
                  <Field label="Practical language" hint="The language you code in. Controls Run, file type, and the first tab.">
                    <Tabs value={settings.practicalLanguage} onValueChange={setPracticalLanguage} variant="pill">
                      <TabsList>
                        {RUNNABLE_LANGUAGES.map((lang) => (
                          <TabsTrigger key={lang.id} value={lang.id}>{lang.label}</TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </Field>
                  <Field label="Comparison languages" hint="Show the same code in a second language so you can compare. Pick up to 3.">
                    <div style={styles.langGrid}>
                      {RUNNABLE_LANGUAGES.filter((l) => l.id !== settings.practicalLanguage).map((lang) => (
                        <Pill key={lang.id} selected={settings.comparisonLanguages.includes(lang.id)} onClick={() => toggleComparison(lang.id)}>{lang.label}</Pill>
                      ))}
                    </div>
                  </Field>
                </Section>
              );
              if (id === 'ai') return (
                <Section key={id} {...props} icon={<Sparkles size={13} />} title="AI">
                  <Field label="AI key" hint="A free key from Google AI Studio. Needed for AI code generation and error explanations. Stored on this device only.">
                    <div style={styles.keyRow}>
                      <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => { setApiKey(e.target.value); setKeyError(null); }} onFocus={handleKeyFocus} placeholder="AIza…" style={styles.input} autoComplete="off" spellCheck={false} />
                      <button style={styles.iconBtn} onClick={handlePasteKey} title="Paste key from clipboard" aria-label="Paste key from clipboard">
                        <ClipboardPaste size={14} />
                      </button>
                      <button style={styles.iconBtn} onClick={() => setShowKey((v) => !v)} title={showKey ? 'Hide key' : 'Show key'} aria-label={showKey ? 'Hide API key' : 'Show API key'}>
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button style={{ ...styles.primaryBtn, minWidth: 64 }} onClick={handleSaveKey} aria-live="polite">
                        {keySaved ? <><Check size={12} style={{ marginRight: 4 }} /> Saved</> : 'Save'}
                      </button>
                    </div>
                    <a style={styles.link} href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get a free key →</a>
                    <p style={styles.fieldHint} aria-live="polite">
                      {keyChecking && 'Checking the key with Google…'}
                      {!keyChecking && keySaved && keyError == null && 'Key saved.'}
                      {!keyChecking && keyError && (
                        <span style={{ color: 'var(--danger-text, #e5484d)' }} role="alert">{keyError}</span>
                      )}
                    </p>
                    {hasKey && (
                      <button type="button" style={styles.dangerLinkBtn} onClick={handleRemoveKey}>Remove key</button>
                    )}
                  </Field>
                </Section>
              );
              if (id === 'workspace') return (
                <Section key={id} {...props} icon={<FolderTree size={13} />} title="Workspace">
                  <ToggleRow icon={<TermIcon size={13} />} label="Show terminal by default" hint="Toggle the bottom panel anytime with Ctrl + `." checked={settings.showTerminal} onChange={(checked) => patch({ showTerminal: checked })} />
                </Section>
              );
              if (id === 'keyboardShortcuts') return (
                <Section key={id} {...props} icon={<Keyboard size={13} />} title="Keyboard shortcuts">
                  <ShortcutList />
                </Section>
              );
              if (id === 'toolchains') return (
                <Section key={id} {...props} icon={<Cpu size={13} />} title="Toolchains">
                  <ToolchainPanel onRunInTerminal={onRunInTerminal} />
                </Section>
              );
              if (id === 'about') return (
                <Section key={id} {...props} icon={<Info size={13} />} title="About & Updates">
                  <UpdatePanel update={update} />
                </Section>
              );
              if (id === 'onboarding') return (
                <Section key={id} {...props} title="Onboarding">
                  <button style={styles.ghostBtn} onClick={handleRerun}>Rerun onboarding</button>
                  <p style={styles.hint}>Goes through the setup steps again. Your other settings are kept.</p>
                </Section>
              );
              return null;
            });
          })()}

          <p style={styles.footnote}>
            Settings live on this device only. With an AI key added, your prompts and code are sent to Google to generate AI results.
          </p>
        </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// ProfileManagerCard — profile-pill → Manage profile.
//
// Edits the ACTIVE local profile: identity (avatar / username / bio /
// languages), an optional PIN lock, and profile management (switch, add,
// delete). It is intentionally separate from general app settings.
//
// The PIN is a courtesy lock for shared machines, not real security (see
// settings.js) — we say so in the hint copy so we don't over-promise.
export function ProfileManagerCard({
  open,
  onClose,
  onSettingsChange,
  onSwitchProfile,
  onAddProfile,
  onDeleteProfile,
}) {
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
    <div style={styles.profileScrim} onClick={onClose} role="presentation">
      <section
        style={styles.profileCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header style={styles.header}>
          <div>
            <h2 ref={titleRef} tabIndex={-1} id="manage-profile-title" style={styles.title}>Manage profile</h2>
            <p style={styles.profileCardSubtitle}>Everything is saved on this device only.</p>
          </div>
          <button style={styles.iconBtn} onClick={onClose} title="Close (Esc)" aria-label="Close profile manager">
            <X size={16} />
          </button>
        </header>
        <div style={styles.profileCardScroll}>
          <ProfileSection
            onSettingsChange={onSettingsChange}
            onSwitchProfile={onSwitchProfile}
            onAddProfile={onAddProfile}
            onDeleteProfile={onDeleteProfile}
          />
        </div>
      </section>
    </div>
  );
}

function ProfileSection({ onSettingsChange, onSwitchProfile, onAddProfile, onDeleteProfile }) {
  const initial = loadSettings();
  const activeId = initial.activeProfileId;

  const [draft, setDraft] = useState({
    username:          initial.username || '',
    avatar:            initial.avatar || null,
    bio:               initial.bio || '',
    languagesUsing:    initial.languagesUsing || [],
    languagesLearning: initial.languagesLearning || [],
  });
  const [saved, setSaved] = useState(false);

  const [hasPin, setHasPin]       = useState(!!(initial.pinHash && initial.pinHash.hash));
  const [pinOpen, setPinOpen]     = useState(false);
  const [pin, setPin]             = useState('');
  const [pin2, setPin2]           = useState('');
  const [pinBusy, setPinBusy]     = useState(false);
  const [pinError, setPinError]   = useState('');
  const [pinStatus, setPinStatus] = useState('idle');
  const pinSuccessTimer = useRef(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => () => clearTimeout(pinSuccessTimer.current), []);

  // Username validation (excludes the active profile so keeping your own
  // name isn't flagged as "taken").
  const trimmed = (draft.username || '').trim();
  const usernameError =
    trimmed.length === 0 ? 'Enter a username.'
    : trimmed.length < 2 ? 'At least 2 characters.'
    : usernameExists(trimmed, activeId) ? 'That username is taken on this device.'
    : '';
  const canSave = !usernameError;

  const handleSaveProfile = () => {
    if (!canSave) return;
    const next = updateSettings({
      username:          trimmed,
      avatar:            draft.avatar || null,
      bio:               (draft.bio || '').trim(),
      languagesUsing:    draft.languagesUsing || [],
      languagesLearning: draft.languagesLearning || [],
    });
    onSettingsChange?.(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const openPinEditor = () => {
    clearTimeout(pinSuccessTimer.current);
    setPin('');
    setPin2('');
    setPinError('');
    setPinStatus('idle');
    setPinOpen(true);
  };

  const closePinEditor = () => {
    clearTimeout(pinSuccessTimer.current);
    setPinOpen(false);
    setPin('');
    setPin2('');
    setPinError('');
    setPinStatus('idle');
  };

  const clearPinFeedback = () => {
    setPinError('');
    setPinStatus('idle');
  };

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(pin2)) {
      setPinError('Enter all 4 digits.');
      setPinStatus('error');
      return;
    }
    if (pin !== pin2) {
      setPinError("Those PINs don't match.");
      setPinStatus('error');
      return;
    }
    setPinBusy(true);
    setPinStatus('idle');
    try {
      await setProfilePin(activeId, pin);
      setHasPin(true);
      onSettingsChange?.(loadSettings());
      setPinStatus('success');
      pinSuccessTimer.current = setTimeout(closePinEditor, 750);
    } catch {
      setPinError("Couldn't set the PIN. Try again.");
      setPinStatus('error');
    } finally {
      setPinBusy(false);
    }
  };

  const handleRemovePin = async () => {
    // Destructive: the profile stops being PIN-protected on this device.
    const ok = await confirm({
      title: 'Remove the PIN lock?',
      description: 'This profile will open without a PIN until you set one again.',
      confirmLabel: 'Remove PIN',
      danger: true,
    });
    if (!ok) return;
    clearProfilePin(activeId);
    setHasPin(false);
    setPinOpen(false);
    onSettingsChange?.(loadSettings());
  };

  return (
    <>
      <ProfileFields
        values={draft}
        onChange={setDraft}
        usernameError={usernameError}
      />

      <button
        style={{ ...styles.primaryBtn, alignSelf: 'flex-start', padding: '7px 14px', ...(!canSave ? styles.disabled : {}) }}
        onClick={handleSaveProfile}
        disabled={!canSave}
        aria-live="polite"
      >
        {saved ? <><Check size={12} style={{ marginRight: 4 }} /> Saved</> : 'Save profile'}
      </button>

      {/* ---- PIN lock ---- */}
      <Field
        label="PIN lock"
        hint="Optional. Adds a PIN before opening this profile. Good for shared computers, but not high security — anyone with file access can reset it."
      >
        {!pinOpen ? (
          <div style={styles.profileBtnRow}>
            {hasPin ? (
              <>
                <span style={styles.pinOnBadge}>
                  <Lock size={11} style={{ marginRight: 5 }} /> PIN lock is on
                </span>
                <button style={styles.ghostBtn} onClick={openPinEditor}>Change</button>
                <button style={styles.dangerGhostBtn} onClick={handleRemovePin}>Remove</button>
              </>
            ) : (
              <button style={styles.ghostBtn} onClick={openPinEditor}>
                <Lock size={12} style={{ marginRight: 6 }} /> Add a PIN lock
              </button>
            )}
          </div>
        ) : (
          <div style={styles.pinEditor}>
            <OTPInput
              length={4}
              mask
              value={pin}
              onChange={(next) => { setPin(next); clearPinFeedback(); }}
              label="New PIN"
              aria-label="New four-digit PIN"
              status={pinStatus}
              disabled={pinBusy || pinStatus === 'success'}
              autoFocus
            />
            <OTPInput
              length={4}
              mask
              value={pin2}
              onChange={(next) => { setPin2(next); clearPinFeedback(); }}
              label="Confirm PIN"
              aria-label="Confirm four-digit PIN"
              hint="Enter the same 4 digits again."
              errorMessage={pinError}
              successMessage="PIN saved"
              status={pinStatus}
              disabled={pinBusy || pinStatus === 'success'}
            />
            <div style={styles.profileBtnRow}>
              <button
                style={{ ...styles.primaryBtn, padding: '7px 14px', ...(pinBusy || pinStatus === 'success' ? styles.disabled : {}) }}
                onClick={handleSavePin}
                disabled={pinBusy || pinStatus === 'success'}
                aria-live="polite"
              >
                {pinBusy ? 'Saving…' : pinStatus === 'success' ? 'Saved' : 'Save PIN'}
              </button>
              <button style={styles.ghostBtn} onClick={closePinEditor} disabled={pinBusy || pinStatus === 'success'}>Cancel</button>
            </div>
          </div>
        )}
      </Field>

      {/* ---- Delete ---- */}
      {confirmDelete ? (
        <div style={styles.deleteConfirm}>
          <p style={styles.deleteWarn}>
            Delete this profile and all its progress on this device? This can't be undone.
          </p>
          <div style={styles.profileBtnRow}>
            <button style={styles.dangerBtn} onClick={() => onDeleteProfile?.(activeId)}>
              <Trash2 size={12} style={{ marginRight: 6 }} /> Delete permanently
            </button>
            <button style={styles.ghostBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button style={styles.dangerGhostBtn} onClick={() => setConfirmDelete(true)}>
          <Trash2 size={12} style={{ marginRight: 6 }} /> Delete this profile
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// reusable bits

const ROW_TRANSITION = { type: 'spring', duration: 0.45, bounce: 0.18 };
const CONTENT_OPEN_TRANSITION = { type: 'spring', duration: 0.48, bounce: 0.15 };
const CONTENT_CLOSE_TRANSITION = { type: 'spring', duration: 0.38, bounce: 0.12 };
const CONTENT_FADE_TRANSITION = { duration: 0.18, ease: EASE_OUT };
const CHEVRON_TRANSITION = { type: 'spring', duration: 0.35, bounce: 0.14 };

function Section({ id, icon, title, open, onToggle, isFirst, isLast, isPreviousOpen, children }) {
  const bodyId = `settings-section-${id}`;
  const reduce = useReducedMotion();
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const update = () => setContentHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  const startsGroup = open || isFirst || isPreviousOpen;
  const endsGroup = open || isLast;

  return (
    <motion.div
      layout="position"
      initial={false}
      style={{ marginTop: !isFirst && (open || isPreviousOpen) ? 12 : 0 }}
      transition={reduce ? { duration: 0 } : ROW_TRANSITION}
    >
      <motion.div
        data-state={open ? 'open' : 'closed'}
        initial={false}
        animate={{
          borderTopLeftRadius: startsGroup ? 28 : 0,
          borderTopRightRadius: startsGroup ? 28 : 0,
          borderBottomLeftRadius: endsGroup ? 28 : 0,
          borderBottomRightRadius: endsGroup ? 28 : 0,
        }}
        transition={reduce ? { duration: 0 } : ROW_TRANSITION}
        style={{
          overflow: 'hidden',
          background: 'var(--bg-primary)',
        }}
      >
        <button
          type="button"
          id={`${bodyId}-trigger`}
          style={styles.sectionHeader}
          onClick={() => onToggle?.(id)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          {icon && <span style={styles.sectionIcon}>{icon}</span>}
          <span style={styles.sectionTitle}>{title}</span>
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : CHEVRON_TRANSITION}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>

        <motion.div
          layout="size"
          id={bodyId}
          role="region"
          aria-labelledby={`${bodyId}-trigger`}
          aria-hidden={!open}
          inert={!open}
          initial={false}
          style={{ height: open ? contentHeight : 0, overflow: 'hidden' }}
          transition={
            reduce
              ? { duration: 0 }
              : open
                ? CONTENT_OPEN_TRANSITION
                : CONTENT_CLOSE_TRANSITION
          }
        >
          <motion.div
            ref={contentRef}
            animate={{ opacity: open ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : CONTENT_FADE_TRANSITION}
            style={{ padding: '4px 12px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function ShortcutList() {
  const shortcuts = [
    ['Run active code', 'Ctrl', 'Enter'],
    ['Toggle sidebar (Files / Build)', 'Ctrl', 'B'],
    ['Toggle terminal', 'Ctrl', '`'],
    ['Save active file', 'Ctrl', 'S'],
    ['Zoom in', 'Ctrl', '='],
    ['Zoom out', 'Ctrl', '-'],
    ['Reset zoom', 'Ctrl', '0'],
    ['Cycle visible panels', 'F6'],
    ['Resize focused divider', '\u2190 / \u2192'],
  ];

  return (
    <div style={styles.shortcutList}>
      {shortcuts.map(([label, ...keys]) => (
        <div key={label} style={styles.shortcutRow}>
          <span style={styles.shortcutLabel}>{label}</span>
          <span style={styles.shortcutKeys}>
            {keys.map((key) => <kbd key={key} style={styles.keycap}>{key}</kbd>)}
          </span>
        </div>
      ))}
      <p style={styles.shortcutHint}>Hold Shift while resizing to move a divider 32px at a time.</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>{label}</label>
      {hint && <p style={styles.fieldHint}>{hint}</p>}
      {children}
    </div>
  );
}

function getNotificationPermission() {
  return typeof window !== 'undefined' && 'Notification' in window
    ? window.Notification.permission
    : 'unsupported';
}

function notificationPermissionHint(permission) {
  if (permission === 'granted') return 'Allowed. Choose whether we can send you notifications.';
  if (permission === 'denied') return 'Blocked. Turn them on in your system settings if you want reminders.';
  if (permission === 'unsupported') return "Desktop notifications aren't available on this system.";
  return "Optional. We'll ask your system only after you choose Allow.";
}

const GUIDANCE_LEVELS = ['supported', 'guided', 'independent'];

function GuidanceTabs({ value, onChange }) {
  return (
    <Tabs value={value} onValueChange={onChange} variant="segment">
      <TabsList>
        {GUIDANCE_LEVELS.map((level) => (
          <TabsTrigger key={level} value={level}>
            {level[0].toUpperCase() + level.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function Pill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{ ...styles.pill, ...(selected ? styles.pillSelected : {}) }}
    >
      {selected && <Check size={10} style={{ marginRight: 4 }} />}
      {children}
    </button>
  );
}

function ToggleRow({ icon, label, hint, checked, onChange }) {
  return (
    <div style={styles.toggleRow}>
      <span style={styles.toggleRowText}>
        <span style={styles.toggleRowLabel}>
          {icon}<span style={{ marginLeft: 8 }}>{label}</span>
        </span>
        <span style={styles.toggleRowHint}>{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function UpdatePanel({ update }) {
  const { appVersion, status, info, lastChecked, error, checkNow, installNow } = update;
  const busy   = status === 'checking' || status === 'downloading';
  const isDev  = status === 'disabled-in-dev';
  const label  = statusLabel(status, info);

  return (
    <>
      <div style={styles.kvRow}>
        <span style={styles.kvLabel}>Installed version</span>
        <span style={styles.kvValue}>v{appVersion}</span>
      </div>
      <div style={styles.kvRow}>
        <span style={styles.kvLabel}>Last checked</span>
        <span style={styles.kvValue}>{formatLastChecked(lastChecked)}</span>
      </div>

      <div style={{ ...styles.statusLine, color: TONE_COLOURS[label.tone] }}>
        {busy
          ? <Loader size={11} variant="spinner" />
          : (status === 'downloaded' || status === 'not-available')
            ? <CheckCircle2 size={11} />
            : status === 'error'
              ? <AlertCircle size={11} />
              : <Info size={11} />}
        <span style={{ marginLeft: 6 }}>{label.text}</span>
      </div>

      {status === 'error' && error && (
        <div style={styles.errorBox} title={error}>
          {error.split('\n')[0].slice(0, 240)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          style={{ ...styles.ghostBtn, ...(busy || isDev ? styles.disabled : {}) }}
          onClick={() => checkNow()}
          disabled={busy || isDev}
          title={isDev ? 'Updates are disabled in dev mode' : 'Check GitHub for a newer release'}
        >
          <RefreshCw size={11} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} />
          <span style={{ marginLeft: 6 }}>Check now</span>
        </button>
        {status === 'downloaded' && (
          <button style={styles.primaryBtn} onClick={() => installNow()}>
            Restart & install
          </button>
        )}
      </div>
    </>
  );
}

// ToolchainPanel — Settings → Toolchains.
//
// Probes the main process for which language compilers/interpreters are on
// PATH, shows a status row per language (Python / Node / tsx / gcc / g++),
// and offers a one-click "Install" button that drops the platform-correct
// install command into the bottom terminal so the user can watch it run.
//
// Walkthrough flavour:
//   1. Open Settings → Toolchains.
//   2. Each missing tool shows its install command + Install / Copy buttons.
//   3. Install pops the terminal and types the command in.
//   4. When the install finishes (terminal exit code 0), the user clicks
//      "Re-check toolchains" and the green checkmarks light up.
//
// We deliberately don't auto-poll the toolchains: the terminal already
// gives honest feedback while an install runs, and polling masks the
// "watch the install happen" moment we want learners to internalise.
function toolchainCommand(recipe) {
  return recipe?.install?.[PLATFORM_LABEL] || '';
}

function platformValue(map, fallback = '') {
  return map?.[PLATFORM_LABEL] || map?.default || fallback;
}

function ToolchainPanel({ onRunInTerminal }) {
  const [status, setStatus] = useState(null);   // null = first load; {} = checked
  const [checking, setChecking] = useState(true);
  const [copiedLang, setCopiedLang] = useState(null);
  const [installingLang, setInstallingLang] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);

  const probe = useCallback(async () => {
    setChecking(true);
    try {
      const result = await window.seecode.runner.checkToolchains();
      setStatus(result && !result.error ? result : {});
    } catch {
      setStatus({});
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { probe(); }, [probe]);

  // winget availability comes back from the same check as the language rows
  // ({ winget: { available } }). Before the first probe resolves it's
  // unknown — assume available so the Install button doesn't flicker away.
  const wingetAvailable = status?.winget ? !!status.winget.available : true;

  const handleInstall = useCallback((langId) => {
    const recipe = TOOLCHAIN_GUIDES[langId];
    if (!recipe) return;
    const command = toolchainCommand(recipe);
    if (!command || !onRunInTerminal) return;
    setInstallingLang(langId);
    setExpandedGuide(langId);
    // Installs run for minutes — hand the terminal a longer exec budget so
    // it doesn't kill winget mid-download at the 30s default.
    onRunInTerminal(command, { timeoutMs: 10 * 60_000 });
  }, [onRunInTerminal]);

  const handleCopy = useCallback(async (langId) => {
    const recipe = TOOLCHAIN_GUIDES[langId];
    if (!recipe) return;
    const command = toolchainCommand(recipe);
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopiedLang(langId);
      setTimeout(() => {
        setCopiedLang((cur) => (cur === langId ? null : cur));
      }, 1600);
    } catch {
      /* clipboard blocked — Copy is a fallback anyway */
    }
  }, []);

  const handleRecheck = useCallback(() => {
    setInstallingLang(null);
    probe();
  }, [probe]);

  return (
    <>
      <p style={styles.fieldHint}>
        The <b>Run</b> button needs a language tool installed on your computer.
        Each guide shows how to install it and check it's working.
      </p>

      <div style={toolchainStyles.list}>
        {Object.entries(TOOLCHAIN_GUIDES).map(([langId, recipe]) => {
          const row = status?.[langId];
          const isInstalled = !!row?.installed;
          const isLoading   = checking && !row;
          const command     = toolchainCommand(recipe);
          const guideOpen   = expandedGuide === langId;
          // winget ships with Windows 11 and recent Windows 10, but older
          // Windows 10 lacks it — then this command dies with
          // "'winget' is not recognized". Swap in the manual download path.
          const needsWinget = PLATFORM_LABEL === 'win' && /\bwinget\b/.test(command);
          const wingetGone  = !isLoading && !isInstalled && needsWinget && !wingetAvailable;
          const fallback    = wingetGone ? recipe.fallback?.[PLATFORM_LABEL] : null;
          // tsx needs Node.js first — don't offer an npm command that fails.
          const needsNodeFirst = langId === 'typescript' && !isLoading
            && status?.javascript && !status.javascript.installed;
          const showInstall = !isLoading && !isInstalled && !!command
            && !wingetGone && !needsNodeFirst;

          // Step-by-step for anything not installed: what to do now, what
          // to wait for, then how to verify it works.
          const steps = [];
          if (!isLoading && !isInstalled) {
            if (needsNodeFirst) {
              steps.push({ text: 'Install Node.js first — use the Node.js row above.' });
            } else if (fallback) {
              steps.push({ link: fallback.url, linkLabel: fallback.urlLabel });
              (fallback.steps || []).forEach((step) => steps.push(step));
              steps.push({ text: 'Click Re-check toolchains below.' });
            } else if (command) {
              steps.push({ text: 'Click Install — the command runs in the bottom terminal.' });
              steps.push({ text: 'Wait for it to finish. The terminal prints exit code 0 when it is done.', waiting: true });
              steps.push({ text: 'Click Re-check toolchains below — the checkmark should light up.' });
            }
          }
          const waitIdx = steps.findIndex((step) => step.waiting);
          const currentStep = installingLang === langId && waitIdx >= 0 ? waitIdx : 0;

          return (
            <div key={langId} style={toolchainStyles.row}>
              <div style={toolchainStyles.head}>
                <span style={toolchainStyles.statusIcon}>
                  {isLoading
                    ? <Loader size={12} variant="spinner" />
                    : isInstalled
                      ? <CheckCircle2 size={12} style={{ color: TONE_COLOURS.success }} />
                      : <AlertCircle size={12} style={{ color: TONE_COLOURS.error }} />}
                </span>
                <span style={toolchainStyles.label}>{recipe.label}</span>
                {isInstalled && row?.version && (
                  <span style={toolchainStyles.version} title={row.version}>
                    {row.version.length > 36 ? row.version.slice(0, 33) + '…' : row.version}
                  </span>
                )}
              </div>

              <p style={toolchainStyles.why}>{recipe.why}</p>

              {fallback && (
                <p style={toolchainStyles.fallbackNote}>
                  winget isn't available on this PC, so install {recipe.label} by hand:
                </p>
              )}

              {needsNodeFirst && (
                <p style={toolchainStyles.fallbackNote}>
                  Node.js is required first — install it on the Node.js row above.
                </p>
              )}

              {showInstall && (
                <>
                  <code style={toolchainStyles.cmd}>{command}</code>
                  <div style={toolchainStyles.actions}>
                    <button
                      type="button"
                      style={{
                        ...toolchainStyles.installBtn,
                        ...(!onRunInTerminal ? styles.disabled : {}),
                      }}
                      onClick={() => handleInstall(langId)}
                      disabled={!onRunInTerminal}
                      title={onRunInTerminal
                        ? 'Run this in the bottom terminal'
                        : 'Terminal is not available right now'}
                    >
                      <Play size={11} />
                      <span style={{ marginLeft: 4 }}>Install</span>
                    </button>
                    <button
                      type="button"
                      style={toolchainStyles.copyBtn}
                      onClick={() => handleCopy(langId)}
                      title="Copy the command to clipboard"
                      aria-live="polite"
                    >
                      {copiedLang === langId
                        ? <Check size={11} />
                        : <Copy size={11} />}
                      <span style={{ marginLeft: 4 }}>
                        {copiedLang === langId ? 'Copied' : 'Copy'}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {steps.length > 0 && (
                <ol style={toolchainStyles.steps}>
                  {steps.map((step, idx) => {
                    const isCurrent = !isInstalled && idx === currentStep;
                    return (
                      <li
                        key={`${langId}-step-${idx}`}
                        style={{
                          ...toolchainStyles.step,
                          ...(isCurrent ? toolchainStyles.stepCurrent : {}),
                        }}
                      >
                        {step.text && (
                          <span>{step.text}{step.link ? ' ' : ''}</span>
                        )}
                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noreferrer"
                            style={toolchainStyles.stepLink}
                            title={step.link}
                          >
                            <Download size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                            {step.linkLabel || step.link}
                          </a>
                        )}
                        {step.code && <code style={toolchainStyles.stepCode}>{step.code}</code>}
                      </li>
                    );
                  })}
                  <li style={toolchainStyles.step}>{recipe.smokeTest}</li>
                </ol>
              )}

              <div style={toolchainStyles.actions}>
                <button
                  type="button"
                  style={toolchainStyles.copyBtn}
                  onClick={() => setExpandedGuide((cur) => (cur === langId ? null : langId))}
                  title={guideOpen ? 'Hide setup guide' : 'Show setup guide'}
                >
                  {guideOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  <span style={{ marginLeft: 4 }}>{guideOpen ? 'Hide guide' : 'Guide'}</span>
                </button>
              </div>

              {guideOpen && (
                <ToolchainGuide recipe={recipe} command={command} />
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        style={{ ...styles.ghostBtn, marginTop: 10, alignSelf: 'flex-start' }}
        onClick={handleRecheck}
        disabled={checking}
        title="Probe PATH again for installed compilers and interpreters"
      >
        <RefreshCw
          size={11}
          style={checking ? { animation: 'spin 1s linear infinite' } : undefined}
        />
        <span style={{ marginLeft: 6 }}>Re-check toolchains</span>
      </button>
    </>
  );
}

function ToolchainGuide({ recipe, command }) {
  const detects = platformValue(recipe.detects, 'the matching command for this language');
  const verify = recipe.verify?.[PLATFORM_LABEL] || [];
  const pathHelp = platformValue(recipe.pathHelp);
  const pathCommand = platformValue(recipe.pathCommand);

  return (
    <div style={toolchainStyles.guide}>
      <div style={toolchainStyles.guideBlock}>
        <span style={toolchainStyles.guideLabel}>seec0de checks</span>
        <p style={toolchainStyles.guideText}>{detects}</p>
      </div>

      {command && (
        <div style={toolchainStyles.guideBlock}>
          <span style={toolchainStyles.guideLabel}>install</span>
          <code style={toolchainStyles.miniCmd}>{command}</code>
        </div>
      )}

      {verify.length > 0 && (
        <div style={toolchainStyles.guideBlock}>
          <span style={toolchainStyles.guideLabel}>verify</span>
          {verify.map((cmd) => (
            <code key={cmd} style={toolchainStyles.miniCmd}>{cmd}</code>
          ))}
        </div>
      )}

      {pathCommand && (
        <div style={toolchainStyles.guideBlock}>
          <span style={toolchainStyles.guideLabel}>PATH fix</span>
          <code style={toolchainStyles.miniCmd}>{pathCommand}</code>
        </div>
      )}

      {pathHelp && <p style={toolchainStyles.guideText}>{pathHelp}</p>}
      {recipe.smokeTest && <p style={toolchainStyles.guideText}>{recipe.smokeTest}</p>}
    </div>
  );
}

function statusLabel(status, info) {
  switch (status) {
    case 'checking':         return { text: 'Checking GitHub for updates…',                tone: 'info' };
    case 'available':        return { text: `v${info && info.version} found — downloading…`, tone: 'info' };
    case 'downloading':      return { text: 'Downloading update in the background…',        tone: 'info' };
    case 'downloaded':       return { text: `v${info && info.version} ready — restart to install.`, tone: 'success' };
    case 'not-available':    return { text: "You're on the latest version.",                tone: 'success' };
    case 'error':            return { text: 'Update check failed. See logs for details.',   tone: 'error' };
    case 'disabled-in-dev':  return { text: 'Auto-update is disabled in development mode.', tone: 'muted' };
    case 'idle':
    default:                 return { text: 'Idle.',                                        tone: 'muted' };
  }
}

// Theme tokens, not literals: the old hardcoded blues/greens/red failed
// AA against the light theme (2.5–3.3:1). These flip per theme and all pass.
const TONE_COLOURS = {
  info:    'var(--info-text)',
  success: 'var(--success)',
  error:   'var(--danger-text)',
  muted:   'var(--text-muted)',
};

function formatLastChecked(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'never';
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 5)     return 'just now';
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

// ---------------------------------------------------------------------------
// styles

const styles = {
  profileScrim: {
    position: 'fixed', inset: 0, zIndex: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    background: 'var(--scrim)',
    animation: 'seec0de-fade-in var(--motion-base) var(--ease-out)',
  },
  profileCard: {
    width: 560,
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 48px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    animation: 'seec0de-pop-in var(--motion-slow) var(--ease-spring)',
  },
  profileCardSubtitle: {
    marginTop: 3,
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  profileCardScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
    padding: 18,
  },
  header: {
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.005em',
    color: 'var(--text-primary)',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 18px 24px',
  },

  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%',
    padding: '14px 12px',
    margin: 0,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background var(--motion-base) var(--ease-out)',
  },
  sectionIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'var(--text-secondary)',
    flex: 1,
  },

  shortcutList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    overflow: 'hidden',
  },
  shortcutRow: {
    minHeight: 'var(--control-standard)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    borderBottom: '1px solid var(--border)',
  },
  shortcutLabel: {
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
  },
  shortcutKeys: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  },
  keycap: {
    minWidth: 24,
    padding: '2px 6px',
    border: '1px solid var(--border-strong)',
    borderBottomWidth: 2,
    borderRadius: 'var(--radius-control)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-xs)',
    textAlign: 'center',
  },
  shortcutHint: {
    margin: 0,
    padding: 'var(--space-2) var(--space-3)',
    color: 'var(--text-muted)',
    fontSize: 'var(--text-xs)',
    lineHeight: 1.5,
  },

  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  fieldHint: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginBottom: 2,
  },

  langGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  pill: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '5px 12px',
    transition: 'all var(--motion-fast) var(--ease-out)',
  },
  pillSelected: {
    background: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    color: 'var(--text-primary)',
  },

  keyRow: {
    display: 'flex', gap: 6, alignItems: 'stretch',
  },
  input: {
    flex: 1, minWidth: 0,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 12.5,
    padding: '8px 10px',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
  },
  timeInput: { width: 132, flex: 'none' },

  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
  },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-on-accent)',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '0 12px',
  },
  ghostBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: 12.5,
    padding: '7px 12px',
  },
  dangerGhostBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--danger-text-soft)',
    fontSize: 12.5,
    padding: '7px 12px',
    alignSelf: 'flex-start',
  },
  dangerBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--danger)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-on-accent)',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '7px 12px',
  },
  profileBtnRow: {
    display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
  },
  pinOnBadge: {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 12, color: 'var(--text-secondary)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '6px 10px',
  },
  pinEditor: { display: 'flex', flexDirection: 'column', gap: 8 },
  deleteConfirm: {
    display: 'flex', flexDirection: 'column', gap: 8,
    background: 'var(--danger-soft)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
  },
  deleteWarn: { fontSize: 12, color: 'var(--danger-text-soft)', lineHeight: 1.5, margin: 0 },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  link: {
    fontSize: 11.5,
    color: 'var(--accent)',
    textDecoration: 'none',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  dangerLinkBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'var(--danger)',
    fontSize: 'var(--text-xs)',
    cursor: 'pointer',
  },

  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    textAlign: 'left',
    width: '100%',
    gap: 12,
  },
  toggleRowText: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  toggleRowLabel: {
    display: 'flex', alignItems: 'center',
    fontSize: 12.5,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  toggleRowHint: {
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.45,
  },

  kvRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 11.5,
    color: 'var(--text-muted)',
  },
  kvLabel: {},
  kvValue: {
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
  },
  statusLine: {
    display: 'flex', alignItems: 'center',
    fontSize: 11.5,
    marginTop: 4,
  },
  errorBox: {
    background: 'var(--danger-soft)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '6px 8px',
    fontSize: 11,
    color: 'var(--danger-text-soft)',
    fontFamily: 'var(--font-mono)',
    wordBreak: 'break-word',
    marginTop: 6,
  },

  hint: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginTop: 6,
  },
  footnote: {
    fontSize: 11,
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginTop: 18,
  },
};

// Toolchain row styles live in their own object so the main `styles` block
// stays focused on the legacy settings sections. Keep the visual language
// (border-radius, palette, font sizes) aligned with `styles.toggleRow` /
// `styles.kvRow` for a single, cohesive Settings surface.
const toolchainStyles = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-tertiary)',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 14,
    flexShrink: 0,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
  },
  version: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  why: {
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    margin: '2px 0 0',
  },
  cmd: {
    display: 'block',
    marginTop: 6,
    padding: '6px 8px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 6,
  },
  installBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--accent)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--accent)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-on-accent)',
    fontSize: 11.5,
    fontWeight: 600,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  guide: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid var(--border)',
  },
  guideBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  guideLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  guideText: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
  },
  miniCmd: {
    display: 'block',
    padding: '5px 7px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    lineHeight: 1.45,
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  fallbackNote: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: '4px 0 0',
  },
  steps: {
    margin: '8px 0 0',
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  step: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
    paddingLeft: 2,
  },
  stepCurrent: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  stepLink: {
    color: 'var(--accent)',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  stepCode: {
    display: 'block',
    marginTop: 3,
    padding: '4px 6px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    lineHeight: 1.45,
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
};
