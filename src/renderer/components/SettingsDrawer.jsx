import React, { useEffect, useState } from 'react';
import {
  X, Check, Eye, EyeOff, RefreshCw, Loader, CheckCircle2,
  AlertCircle, Info, Sparkles, FolderTree, Terminal as TermIcon, Layers,
} from 'lucide-react';
import {
  RUNNABLE_LANGUAGES,
  defaultComparisonFor,
  loadSettings,
  updateSettings,
  resetOnboarding,
  getSettingsApiKey,
  setSettingsApiKey,
} from '../engine/settings';
import { useUpdateStatus } from '../hooks/useUpdateStatus';

// SettingsDrawer — right-side overlay containing every persistent
// preference in one place. Replaces the inline `ApiKeySettings` and
// `AboutSettings` blocks that used to live in the left panel.
//
// Sections (top → bottom):
//   1. Languages              — practical + comparison
//   2. AI                     — Gemini key
//   3. Workspace              — defaults for explorer / terminal panels
//   4. About & Updates        — version, last-checked, "Check now"
//   5. Onboarding             — "Rerun onboarding"
//
// Visual direction: AI-Native UI. Slides in from the right, dimmed scrim
// behind, generous whitespace, single-column, semantic icons (no emoji).

export default function SettingsDrawer({ open, onClose, onSettingsChange, onRerunOnboarding }) {
  const [settings, setSettings] = useState(loadSettings());
  const [apiKey, setApiKey]     = useState(getSettingsApiKey());
  const [showKey, setShowKey]   = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const update = useUpdateStatus();

  // Refresh local copy whenever the drawer opens (handles changes that
  // happened elsewhere, e.g. via onboarding).
  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setApiKey(getSettingsApiKey());
      setKeySaved(false);
    }
  }, [open]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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

  const handleSaveKey = () => {
    setSettingsApiKey(apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 1800);
  };

  const handleRerun = () => {
    resetOnboarding();
    onClose?.();
    onRerunOnboarding?.();
  };

  if (!open) return null;

  return (
    <div style={styles.scrim} onClick={onClose} role="presentation">
      <aside
        style={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
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
          {/* ---- 1. Languages ----------------------------------------- */}
          <Section icon={<Layers size={13} />} title="Languages">
            <Field label="Practical language" hint="The language you build in. Powers Run, default file extension, and the first language tab.">
              <div style={styles.langGrid}>
                {RUNNABLE_LANGUAGES.map((lang) => (
                  <Pill
                    key={lang.id}
                    selected={settings.practicalLanguage === lang.id}
                    onClick={() => setPracticalLanguage(lang.id)}
                  >
                    {lang.label}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field
              label="Comparison languages"
              hint="Shown beside your practical language so you can see the same algorithm in different syntax. Pick up to 3."
            >
              <div style={styles.langGrid}>
                {RUNNABLE_LANGUAGES
                  .filter((l) => l.id !== settings.practicalLanguage)
                  .map((lang) => (
                    <Pill
                      key={lang.id}
                      selected={settings.comparisonLanguages.includes(lang.id)}
                      onClick={() => toggleComparison(lang.id)}
                    >
                      {lang.label}
                    </Pill>
                  ))}
              </div>
            </Field>
          </Section>

          {/* ---- 2. AI ------------------------------------------------- */}
          <Section icon={<Sparkles size={13} />} title="AI">
            <Field
              label="Gemini API key"
              hint="Free key from Google AI Studio. Required for AI Generate & AI Explain. Stored locally; never sent anywhere except Google."
            >
              <div style={styles.keyRow}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza…"
                  style={styles.input}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  style={styles.iconBtn}
                  onClick={() => setShowKey((v) => !v)}
                  title={showKey ? 'Hide key' : 'Show key'}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  style={{ ...styles.primaryBtn, minWidth: 64 }}
                  onClick={handleSaveKey}
                >
                  {keySaved ? <><Check size={12} style={{ marginRight: 4 }} /> Saved</> : 'Save'}
                </button>
              </div>
              <a
                style={styles.link}
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
              >
                Get a free key →
              </a>
            </Field>
          </Section>

          {/* ---- 3. Workspace ----------------------------------------- */}
          <Section icon={<FolderTree size={13} />} title="Workspace">
            <ToggleRow
              icon={<FolderTree size={13} />}
              label="Show file explorer by default"
              hint="Off for new accounts. Turn on once you start saving files."
              checked={settings.showFileExplorer}
              onChange={(checked) => patch({ showFileExplorer: checked })}
            />
            <ToggleRow
              icon={<TermIcon size={13} />}
              label="Show terminal by default"
              hint="Toggle the bottom terminal at any time with Ctrl + `."
              checked={settings.showTerminal}
              onChange={(checked) => patch({ showTerminal: checked })}
            />
          </Section>

          {/* ---- 4. About & Updates ----------------------------------- */}
          <Section icon={<Info size={13} />} title="About & Updates">
            <UpdatePanel update={update} />
          </Section>

          {/* ---- 5. Onboarding ---------------------------------------- */}
          <Section title="Onboarding">
            <button style={styles.ghostBtn} onClick={handleRerun}>
              Rerun onboarding
            </button>
            <p style={styles.hint}>
              Re-asks the experience and language questions. Your other settings stay.
            </p>
          </Section>

          <p style={styles.footnote}>
            Settings live on this device only. Nothing is sent to a server.
          </p>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// reusable bits

function Section({ icon, title, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        {icon && <span style={styles.sectionIcon}>{icon}</span>}
        <span style={styles.sectionTitle}>{title}</span>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={styles.toggleRow}
      aria-pressed={checked}
    >
      <span style={styles.toggleRowText}>
        <span style={styles.toggleRowLabel}>
          {icon}<span style={{ marginLeft: 8 }}>{label}</span>
        </span>
        <span style={styles.toggleRowHint}>{hint}</span>
      </span>
      <span style={{ ...styles.switch, ...(checked ? styles.switchOn : {}) }}>
        <span style={{ ...styles.knob, ...(checked ? styles.knobOn : {}) }} />
      </span>
    </button>
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
          ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />
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

const TONE_COLOURS = {
  info:    '#60a5fa',
  success: '#4ade80',
  error:   '#f87171',
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

const DRAWER_W = 380;

const styles = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 900,
    background: 'var(--scrim)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex', justifyContent: 'flex-end',
    animation: 'seec0de-fade-in var(--motion-base) var(--ease-out)',
  },
  drawer: {
    width: DRAWER_W,
    maxWidth: '100vw',
    height: '100%',
    background: 'var(--bg-elevated)',
    borderLeft: '1px solid var(--border-strong)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex', flexDirection: 'column',
    animation: 'seec0de-slide-in-right var(--motion-slow) var(--ease-out)',
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

  section: {
    paddingTop: 18,
    paddingBottom: 4,
    borderBottom: '1px solid var(--border)',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 12,
    color: 'var(--text-muted)',
  },
  sectionIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: 6,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'var(--text-secondary)',
  },
  sectionBody: {
    display: 'flex', flexDirection: 'column', gap: 16,
    paddingBottom: 18,
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
    borderRadius: 999,
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '5px 12px',
    transition: 'all var(--motion-fast) var(--ease-out)',
  },
  pillSelected: {
    background: 'var(--accent-soft)',
    borderColor: 'var(--accent)',
    color: 'var(--text-primary)',
  },

  keyRow: {
    display: 'flex', gap: 6, alignItems: 'stretch',
  },
  input: {
    flex: 1, minWidth: 0,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 12.5,
    padding: '8px 10px',
    outline: 'none',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
  },

  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
  },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '0 12px',
  },
  ghostBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 12.5,
    padding: '7px 12px',
  },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  link: {
    fontSize: 11.5,
    color: 'var(--accent)',
    textDecoration: 'none',
    marginTop: 2,
    alignSelf: 'flex-start',
  },

  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
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
  switch: {
    flexShrink: 0,
    width: 30, height: 18,
    borderRadius: 999,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    position: 'relative',
    transition: 'background var(--motion-base) var(--ease-out), border-color var(--motion-base) var(--ease-out)',
  },
  switchOn: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
  knob: {
    position: 'absolute',
    top: 1, left: 1,
    width: 14, height: 14, borderRadius: 999,
    background: '#e6e6e6',
    transition: 'transform var(--motion-base) var(--ease-out)',
  },
  knobOn: { transform: 'translateX(12px)' },

  kvRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 11.5,
    color: 'var(--text-muted)',
  },
  kvLabel: {},
  kvValue: {
    color: 'var(--text-secondary)',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
  },
  statusLine: {
    display: 'flex', alignItems: 'center',
    fontSize: 11.5,
    marginTop: 4,
  },
  errorBox: {
    background: 'var(--danger-soft)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 11,
    color: '#fca5a5',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
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
