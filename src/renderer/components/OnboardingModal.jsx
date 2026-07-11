import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Check, X, Code2 } from 'lucide-react';
import {
  RUNNABLE_LANGUAGES,
  defaultComparisonFor,
  commitOnboarding,
  createProfile,
  usernameExists,
  suggestUsername,
  setSettingsApiKey,
  getSettingsApiKey,
} from '../engine/settings';
import { ProfileFields } from './ProfileForm';

// Onboarding — runs once after install (and any time the user clicks
// "Rerun onboarding" from the settings drawer). Two real questions plus a
// completely optional API-key paste step. Every step is skippable; nothing
// blocks the user from getting into the app.
//
// Pedagogy notes:
//   - Step 1 sets `experienceLevel` so AI explanations can be terser or
//     chattier later. We don't act on it yet, but capturing it now means
//     we can lean on it without another onboarding round.
//   - Step 2 sets `practicalLanguage`. This is the language the learner
//     intends to *build* in. The middle panel will default to:
//       Pseudocode + practicalLanguage + one comparison language.
//   - Step 3 (API key) is optional — the offline generator works without
//     it, and we'd rather get the user into the app than gate behind a
//     web tab.
//
// Visual direction (ui-ux-pro-max → "AI-Native UI"): minimal chrome, full
// scrim with backdrop blur, centered card, large typography, generous
// whitespace, gentle pop-in animation, single primary CTA per step.

const STEPS = ['profile', 'experience', 'language', 'apikey'];

const emptyProfile = () => ({
  username: '', avatar: null, bio: '', languagesUsing: [], languagesLearning: [],
});

function profileFromSettings(s, mode) {
  if (mode !== 'setup' || !s) return emptyProfile();
  return {
    username:          s.username || '',
    avatar:            s.avatar || null,
    bio:               s.bio || '',
    languagesUsing:    s.languagesUsing || [],
    languagesLearning: s.languagesLearning || [],
  };
}

// `mode`:
//   'setup'       — first run or "Rerun onboarding": edits/creates the ACTIVE
//                   profile (prefilled from initialSettings).
//   'new-profile' — "Add profile" from the gate/settings: always creates a
//                   fresh profile and signs into it.
export default function OnboardingModal({ open, initialSettings, onComplete, mode = 'setup' }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [profile, setProfile] = useState(() => profileFromSettings(initialSettings, mode));
  const [experienceLevel, setExperienceLevel] = useState(initialSettings?.experienceLevel || null);
  const [practicalLanguage, setPracticalLanguage] = useState(initialSettings?.practicalLanguage || 'python');
  const [apiKey, setApiKey] = useState(getSettingsApiKey());

  // Reset to step 1 every time the modal opens (handles "Rerun onboarding"
  // and "Add profile").
  useEffect(() => {
    if (open) {
      setStepIdx(0);
      setProfile(profileFromSettings(initialSettings, mode));
      setExperienceLevel(mode === 'setup' ? (initialSettings?.experienceLevel || null) : null);
      setPracticalLanguage(mode === 'setup' ? (initialSettings?.practicalLanguage || 'python') : 'python');
      setApiKey(getSettingsApiKey());
    }
  }, [open, initialSettings, mode]);

  const finish = useCallback(({ skipped = false } = {}) => {
    const comparisons = defaultComparisonFor(practicalLanguage).filter((c) => c !== practicalLanguage);
    const username = (profile.username || '').trim() || suggestUsername('learner');
    const fields = {
      username,
      avatar:              profile.avatar || null,
      bio:                 (profile.bio || '').trim(),
      experienceLevel:     experienceLevel || 'none',
      practicalLanguage,
      comparisonLanguages: comparisons,
      // Seed "languages I use" from the learner's picks; they can refine the
      // full using/learning lists later in Settings → Profile.
      languagesUsing:      Array.from(new Set([practicalLanguage, ...comparisons].filter(Boolean))),
      languagesLearning:   profile.languagesLearning || [],
    };

    if (mode === 'new-profile') {
      createProfile(fields, { activate: true });
    } else {
      commitOnboarding(fields);
    }

    if (!skipped && apiKey.trim()) setSettingsApiKey(apiKey.trim());
    onComplete?.();
  }, [profile, experienceLevel, practicalLanguage, apiKey, mode, onComplete]);

  const next = useCallback(() => {
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);

  const back = useCallback(() => {
    setStepIdx((i) => Math.max(i - 1, 0));
  }, []);

  // Esc fully skips onboarding.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') finish({ skipped: true }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish]);

  if (!open) return null;

  const step = STEPS[stepIdx];

  // Username validation. Editing the active profile (setup rerun) keeps its
  // own name, so exclude it from the taken-check.
  const exceptId = mode === 'setup' ? (initialSettings?.activeProfileId || null) : null;
  const trimmedName = (profile.username || '').trim();
  const usernameError =
    trimmedName.length === 0 ? ''
    : trimmedName.length < 2 ? 'At least 2 characters.'
    : usernameExists(trimmedName, exceptId) ? 'That username is taken on this device.'
    : '';
  const canContinueProfile = trimmedName.length >= 2 && !usernameError;

  return (
    <div style={styles.scrim} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div style={styles.card}>
        {/* Top bar: progress dots + skip */}
        <div style={styles.topBar}>
          <div style={styles.dots}>
            {STEPS.map((s, i) => (
              <span
                key={s}
                style={{ ...styles.dot, ...(i === stepIdx ? styles.dotActive : {}) }}
                aria-hidden="true"
              />
            ))}
          </div>
          <button
            style={styles.skipBtn}
            onClick={() => finish({ skipped: true })}
            title="Skip onboarding (Esc)"
          >
            Skip <X size={12} style={{ marginLeft: 4 }} />
          </button>
        </div>

        {/* Step body */}
        <div style={styles.body}>
          {step === 'profile' && (
            <StepProfile
              mode={mode}
              value={profile}
              onChange={setProfile}
              usernameError={usernameError}
              canContinue={canContinueProfile}
              onNext={next}
            />
          )}

          {step === 'experience' && (
            <StepExperience
              value={experienceLevel}
              onChange={setExperienceLevel}
              onBack={back}
              onNext={next}
            />
          )}

          {step === 'language' && (
            <StepLanguage
              value={practicalLanguage}
              onChange={setPracticalLanguage}
              onBack={back}
              onNext={next}
            />
          )}

          {step === 'apikey' && (
            <StepApiKey
              value={apiKey}
              onChange={setApiKey}
              onBack={back}
              onFinish={() => finish({ skipped: false })}
              onSkip={() => finish({ skipped: true })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — profile identity (username + optional photo & bio)

function StepProfile({ mode, value, onChange, usernameError, canContinue, onNext }) {
  return (
    <>
      <Brand />
      <h1 id="onboarding-title" style={styles.title}>
        {mode === 'new-profile' ? 'Add a profile.' : 'Create your profile.'}
      </h1>
      <p style={styles.subtitle}>
        seec0de saves your progress to a profile on <em style={styles.em}>this device</em>.
        No email, no password, nothing leaves your machine. Pick a name (add a photo
        &amp; bio if you like) and you're in.
      </p>

      <ProfileFields
        values={value}
        onChange={onChange}
        usernameError={usernameError}
        showLanguages={false}
        autoFocusUsername
      />

      <div style={styles.actions}>
        <span />
        <button
          style={{ ...styles.primaryBtn, ...(canContinue ? {} : styles.primaryBtnDisabled) }}
          onClick={onNext}
          disabled={!canContinue}
        >
          Continue <ArrowRight size={14} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — experience level

function StepExperience({ value, onChange, onBack, onNext }) {
  return (
    <>
      <h2 id="onboarding-title" style={styles.title}>Have you written code before?</h2>
      <p style={styles.subtitle}>
        This tunes how chatty the explanations are — we can start from the ground up
        or keep things terse. You can change your mind any time.
      </p>

      <fieldset style={styles.choiceGroup}>
        <legend style={styles.legend}>Your experience</legend>
        <ChoiceCard
          selected={value === 'none'}
          onClick={() => onChange('none')}
          title="Not yet"
          desc="Start from zero. We'll explain things from the ground up."
        />
        <ChoiceCard
          selected={value === 'some'}
          onClick={() => onChange('some')}
          title="A little"
          desc="You know the basics. Explanations will be terser and more idiomatic."
        />
      </fieldset>

      <div style={styles.actions}>
        <button style={styles.ghostBtn} onClick={onBack}>Back</button>
        <button
          style={{ ...styles.primaryBtn, ...(value ? {} : styles.primaryBtnDisabled) }}
          onClick={onNext}
          disabled={!value}
        >
          Continue <ArrowRight size={14} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — practical language

function StepLanguage({ value, onChange, onBack, onNext }) {
  return (
    <>
      <h2 style={styles.title}>Which language will you build in?</h2>
      <p style={styles.subtitle}>
        Pick the one you actually want to write programs in. seec0de will run, save,
        and explain code in this language by default. You'll always see the
        algorithm in <strong style={styles.strong}>pseudocode first</strong>, and a
        second language alongside for comparison.
      </p>

      <div style={styles.langGrid}>
        {RUNNABLE_LANGUAGES.map((lang) => (
          <ChoiceCard
            key={lang.id}
            selected={value === lang.id}
            onClick={() => onChange(lang.id)}
            title={lang.label}
            desc={lang.blurb}
            compact
          />
        ))}
      </div>

      <p style={styles.helperLine}>
        You can switch your language any time from the gear icon in the top bar.
      </p>

      <div style={styles.actions}>
        <button style={styles.ghostBtn} onClick={onBack}>Back</button>
        <button style={styles.primaryBtn} onClick={onNext}>
          Continue <ArrowRight size={14} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — optional Gemini API key

function StepApiKey({ value, onChange, onBack, onFinish, onSkip }) {
  const ready = value.trim().length > 8;
  return (
    <>
      <h2 style={styles.title}>Optional — paste a Gemini API key.</h2>
      <p style={styles.subtitle}>
        seec0de works fully offline with built-in templates, but the
        <em style={styles.em}> AI Generate</em> and <em style={styles.em}> AI Explain</em> features
        need a free Google AI Studio key. Skip this if you'd rather add it later.
      </p>

      <div style={styles.keyRow}>
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="AIza…  (paste here, or skip)"
          style={styles.keyInput}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <a
        style={styles.helperLink}
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
      >
        Get a free key at aistudio.google.com →
      </a>

      <div style={styles.actions}>
        <button style={styles.ghostBtn} onClick={onBack}>Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.ghostBtn} onClick={onSkip}>Skip for now</button>
          <button
            style={{ ...styles.primaryBtn, ...(ready ? {} : styles.primaryBtnDisabled) }}
            onClick={onFinish}
            disabled={!ready}
          >
            <Check size={14} style={{ marginRight: 6 }} /> Save & finish
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bits

function Brand() {
  return (
    <div style={styles.brand}>
      <div style={styles.brandMark}>
        <Code2 size={16} />
      </div>
      <span style={styles.brandWord}>seec0de</span>
    </div>
  );
}

function ChoiceCard({ selected, onClick, title, desc, compact }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.choice,
        ...(compact ? styles.choiceCompact : {}),
        ...(selected ? styles.choiceSelected : {}),
      }}
      aria-pressed={selected}
    >
      <div style={styles.choiceTitleRow}>
        <span style={styles.choiceTitle}>{title}</span>
        {selected && <Check size={14} color="var(--accent)" />}
      </div>
      <span style={styles.choiceDesc}>{desc}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// styles — keep all numeric values aligned to a 4/8 px rhythm.

const styles = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'var(--scrim)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    animation: 'seec0de-fade-in var(--motion-base) var(--ease-out)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    padding: '20px 28px 24px',
    animation: 'seec0de-pop-in var(--motion-slow) var(--ease-out)',
  },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  dots: { display: 'flex', gap: 6 },
  dot: {
    width: 6, height: 6, borderRadius: 999,
    background: 'var(--border-strong)',
    transition: 'background var(--motion-base) var(--ease-out), width var(--motion-base) var(--ease-out)',
  },
  dotActive: {
    background: 'var(--accent)',
    width: 18,
  },
  skipBtn: {
    display: 'inline-flex', alignItems: 'center',
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', fontSize: 12,
    padding: '4px 6px',
  },
  body: { display: 'flex', flexDirection: 'column' },

  brand: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 14,
  },
  brandMark: {
    width: 30, height: 30, borderRadius: 8,
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandWord: {
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: 13,
    letterSpacing: 1,
    color: 'var(--text-secondary)',
  },

  title: {
    fontSize: 22,
    lineHeight: 1.25,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 1.55,
    color: 'var(--text-secondary)',
    marginBottom: 20,
  },
  em: { fontStyle: 'italic', color: 'var(--text-primary)' },
  strong: { color: 'var(--algorithm)', fontWeight: 600 },

  legend: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'var(--text-muted)',
    fontWeight: 600,
    marginBottom: 10,
  },
  choiceGroup: {
    border: 'none', padding: 0,
    display: 'flex', flexDirection: 'column', gap: 8,
    marginBottom: 24,
  },
  langGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 8,
    marginBottom: 12,
  },

  choice: {
    textAlign: 'left',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 14px',
    color: 'var(--text-primary)',
    display: 'flex', flexDirection: 'column', gap: 4,
    transition: 'border-color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out)',
  },
  choiceCompact: { padding: '10px 12px' },
  choiceSelected: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-soft)',
  },
  choiceTitleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  choiceTitle: {
    fontSize: 13.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  choiceDesc: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },

  helperLine: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    marginTop: 4,
    marginBottom: 16,
  },
  helperLink: {
    fontSize: 11.5,
    color: 'var(--accent)',
    textDecoration: 'none',
    marginTop: -8,
    marginBottom: 20,
    display: 'inline-block',
  },

  keyRow: { display: 'flex', gap: 8, marginBottom: 8 },
  keyInput: {
    flex: 1,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '10px 12px',
    outline: 'none',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
  },

  actions: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, gap: 8,
  },

  primaryBtn: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
  },
  primaryBtnDisabled: {
    background: 'var(--bg-tertiary)',
    borderColor: 'var(--border)',
    color: 'var(--text-muted)',
    opacity: 0.7,
  },
  ghostBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 13,
    padding: '8px 14px',
  },
};
