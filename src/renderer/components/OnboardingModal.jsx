import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowRight, Check, X, Code2, KeyRound, ClipboardPaste, ShieldCheck,
  AlertCircle, CheckCircle2, Copy, Download, RefreshCw, Terminal,
} from 'lucide-react';
import {
  RUNNABLE_LANGUAGES,
  TOOLCHAIN_GUIDES,
  defaultComparisonFor,
  commitOnboarding,
  createProfile,
  usernameExists,
  suggestUsername,
  setSettingsApiKey,
  getSettingsApiKey,
} from '../engine/settings';
import { ProfileFields } from './ProfileForm';
import { useFocusTrap } from '../lib/hooks/use-focus-trap';
import { getActiveProviderId, keyFromClipboard, looksLikeApiKey, validateApiKey } from '../engine/aiService';
import { AI_PROVIDERS, DEFAULT_AI_PROVIDER, getAiProvider } from '../engine/aiProviders';

// Onboarding — runs once after install (and any time the user clicks
// "Rerun onboarding" from the settings drawer). Two real questions plus a
// runtime-install walkthrough and a completely optional API-key paste step.
// Every step is skippable; nothing blocks the user from getting into the app.
//
// Pedagogy notes:
//   - Step 1 sets `experienceLevel` so AI explanations can be terser or
//     chattier later. We don't act on it yet, but capturing it now means
//     we can lean on it without another onboarding round.
//   - Step 2 sets `practicalLanguage`. This is the language the learner
//     intends to *build* in. The middle panel will default to:
//       Pseudocode + practicalLanguage + one comparison language.
//   - Step 3 installs Python and Node.js. Most learners have never opened a
//     terminal, so the step shows the exact command, a Copy button, and where
//     to paste it — and the card docks into a corner while an install runs so
//     they can actually watch the terminal. Polling turns the row green by
//     itself when the installer finishes. Fully skippable.
//   - Step 4 (API key) is optional — the offline generator works without
//     it, and we'd rather get the user into the app than gate behind a
//     web tab.
//
// Visual direction: minimal chrome, opaque scrim, centered card, large
// typography, generous whitespace, short fade-in, one primary CTA per step.

const STEPS = ['profile', 'experience', 'language', 'runtime', 'apikey'];
// Adding a profile is not a first-run setup: skip the install walkthrough.
const STEPS_NEW_PROFILE = STEPS.filter((s) => s !== 'runtime');

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
export default function OnboardingModal({
  open, initialSettings, onComplete, onCancel, mode = 'setup', onRunInTerminal,
}) {
  const [stepIdx, setStepIdx] = useState(0);
  // Docked = the card shrank into a corner so the learner can watch the
  // Terminal while an install runs. Only the runtime step can dock.
  const [minimized, setMinimized] = useState(false);
  const [profile, setProfile] = useState(() => profileFromSettings(initialSettings, mode));
  const [experienceLevel, setExperienceLevel] = useState(initialSettings?.experienceLevel || null);
  const [practicalLanguage, setPracticalLanguage] = useState(initialSettings?.practicalLanguage || 'python');
  const [apiKey, setApiKey] = useState(getSettingsApiKey());
  const [aiProvider, setAiProvider] = useState(() => getActiveProviderId() || DEFAULT_AI_PROVIDER);

  // Reset to step 1 every time the modal opens (handles "Rerun onboarding"
  // and "Add profile").
  useEffect(() => {
    if (open) {
      setStepIdx(0);
      setMinimized(false);
      setProfile(profileFromSettings(initialSettings, mode));
      setExperienceLevel(mode === 'setup' ? (initialSettings?.experienceLevel || null) : null);
      setPracticalLanguage(mode === 'setup' ? (initialSettings?.practicalLanguage || 'python') : 'python');
      setApiKey(getSettingsApiKey());
      setAiProvider(getActiveProviderId() || DEFAULT_AI_PROVIDER);
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

    if (!skipped && apiKey.trim()) setSettingsApiKey(apiKey.trim(), aiProvider);
    onComplete?.();
  }, [profile, experienceLevel, practicalLanguage, apiKey, aiProvider, mode, onComplete]);

  const next = useCallback(() => {
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);

  const back = useCallback(() => {
    setStepIdx((i) => Math.max(i - 1, 0));
  }, []);

  // Skip/Esc: in setup mode, finish with defaults. When adding a profile,
  // cancel instead — backing out must not create a profile.
  const skip = useCallback(() => {
    if (mode === 'new-profile' && onCancel) onCancel();
    else finish({ skipped: true });
  }, [mode, onCancel, finish]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // While docked, Esc brings the card back instead of ending onboarding.
      if (minimized) { setMinimized(false); return; }
      skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, skip, minimized]);

  // Modal contract: Tab stays inside while open, focus returns to the trigger
  // on close (a step field's autoFocus wins over the trap's first-focusable).
  // Docking releases the trap so the learner can click into the Terminal.
  const rootRef = useRef(null);
  useFocusTrap(rootRef, open && !minimized);

  if (!open) return null;

  const steps = mode === 'new-profile' ? STEPS_NEW_PROFILE : STEPS;
  const step = steps[stepIdx];

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
    <div
      ref={rootRef}
      style={minimized ? styles.dockLayer : styles.scrim}
      role="dialog"
      aria-modal={minimized ? 'false' : 'true'}
      aria-labelledby="onboarding-title"
    >
      <div style={minimized ? styles.dockCard : styles.card}>
        {/* Top bar: progress dots + skip */}
        {!minimized && (
        <div style={styles.topBar}>
          <div style={styles.dots}>
            {steps.map((s, i) => (
              <span
                key={s}
                style={{ ...styles.dot, ...(i === stepIdx ? styles.dotActive : {}) }}
                aria-hidden="true"
              />
            ))}
          </div>
          <button
            style={styles.skipBtn}
            onClick={skip}
            title={mode === 'new-profile' ? 'Cancel (Esc)' : 'Skip onboarding (Esc)'}
          >
            {mode === 'new-profile' ? 'Cancel' : 'Skip'} <X size={12} style={{ marginLeft: 4 }} />
          </button>
        </div>
        )}

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

          {step === 'runtime' && (
            <StepRuntime
              focusLanguage={practicalLanguage}
              onRunInTerminal={onRunInTerminal}
              onBack={back}
              onNext={next}
              minimized={minimized}
              onMinimize={() => setMinimized(true)}
              onRestore={() => setMinimized(false)}
            />
          )}

          {step === 'apikey' && (
            <StepApiKey
              value={apiKey}
              onChange={setApiKey}
              provider={aiProvider}
              onProviderChange={setAiProvider}
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
        Saved on <em style={styles.em}>this device</em> — no account needed. Pick a name to get started.
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
        Sets how detailed explanations are. You can change this later.
      </p>

      <fieldset style={styles.choiceGroup}>
        <legend style={styles.legend}>Your experience</legend>
        <ChoiceCard
          selected={value === 'none'}
          onClick={() => onChange('none')}
          title="Not yet"
          desc="Explain everything from scratch."
        />
        <ChoiceCard
          selected={value === 'some'}
          onClick={() => onChange('some')}
          title="A little"
          desc="Keep explanations short and direct."
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
        Used to run and save your work. You'll see plain English first, plus a comparison language.
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
        Change it anytime from the gear icon.
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
// Step 4 — install Python + Node.js (skippable)
//
// Beginners arrive with no runtime and no idea what a terminal is, so this
// step never says "toolchain" and never assumes a shell is open. It shows the
// platform-correct command, a Copy button, and exactly where to paste it. The
// install can also be started for them, in which case the card docks into a
// corner so the terminal is visible while winget does its thing.

const PLATFORM_LABEL = (() => {
  const p = (typeof navigator !== 'undefined' ? navigator.platform : '') || '';
  if (/win/i.test(p)) return 'win';
  if (/mac/i.test(p)) return 'macos';
  return 'linux';
})();

// The two runtimes the lessons use most. Both recipes live in settings.js so
// this step and Settings → Toolchains can never drift apart.
const RUNTIME_IDS = ['python', 'javascript'];

function runtimeCommand(id) {
  return TOOLCHAIN_GUIDES[id]?.install?.[PLATFORM_LABEL] || '';
}

function StepRuntime({
  focusLanguage, onRunInTerminal, onBack, onNext, minimized, onMinimize, onRestore,
}) {
  const [status, setStatus] = useState(null);   // null = first probe still running
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(null);
  const [runningId, setRunningId] = useState(null);

  const probe = useCallback(async () => {
    setChecking(true);
    try {
      const result = window.seecode?.runner?.checkToolchains
        ? await window.seecode.runner.checkToolchains()
        : {};
      setStatus(result && !result.error ? result : {});
    } catch {
      setStatus({});
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { probe(); }, [probe]);

  // Installers run for minutes outside the app (winget, an .exe wizard).
  // Polling is what turns "I think it finished" into a green check without
  // asking the learner to hunt for a Re-check button.
  const allInstalled = !!status && RUNTIME_IDS.every((id) => status[id]?.installed);
  useEffect(() => {
    if (allInstalled) return undefined;
    const timer = setInterval(probe, 5000);
    return () => clearInterval(timer);
  }, [probe, allInstalled]);

  const handleCopy = useCallback(async (id) => {
    const command = runtimeCommand(id);
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(id);
      setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      /* Clipboard blocked — the command is still selectable by hand. */
    }
  }, []);

  const handleInstall = useCallback((id) => {
    const command = runtimeCommand(id);
    if (!command || !onRunInTerminal) return;
    setRunningId(id);
    // Installs routinely exceed the terminal's default budget, and the
    // terminal only exists in the workspace view — onboarding may be up over
    // Home, so ask the caller to reveal it.
    onRunInTerminal(command, { timeoutMs: 10 * 60_000, revealWorkspace: true });
    onMinimize?.();
  }, [onRunInTerminal, onMinimize]);

  // Docked: a small corner card. The scrim is gone, so the Terminal behind it
  // is clickable and watchable while the install runs.
  if (minimized) {
    return (
      <>
        <div style={styles.dockHead}>
          {allInstalled
            ? <CheckCircle2 size={13} color="var(--success)" />
            : <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          <span id="onboarding-title" style={styles.dockTitle}>
            {allInstalled
              ? 'Both are installed'
              : runningId
                ? `Installing ${TOOLCHAIN_GUIDES[runningId].label}…`
                : 'Waiting for the install'}
          </span>
        </div>

        <p style={styles.dockText}>
          Watch the Terminal at the bottom of the window — the command is running there.
          This card turns green on its own when the installer is done.
        </p>

        <div style={styles.dockList}>
          {RUNTIME_IDS.map((id) => {
            const done = !!status?.[id]?.installed;
            return (
              <span key={id} style={styles.dockRow}>
                {done
                  ? <CheckCircle2 size={11} color="var(--success)" />
                  : <AlertCircle size={11} color="var(--text-muted)" />}
                <span style={{ marginLeft: 6 }}>{TOOLCHAIN_GUIDES[id].label}</span>
                <span style={styles.dockRowValue}>
                  {done ? 'ready' : 'not yet'}
                </span>
              </span>
            );
          })}
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.ghostBtn} onClick={onRestore}>
            Back to setup
          </button>
          <button
            type="button"
            style={styles.ghostBtn}
            onClick={probe}
            disabled={checking}
            title="Check again now"
          >
            <RefreshCw size={11} style={checking ? { animation: 'spin 1s linear infinite' } : undefined} />
            <span style={{ marginLeft: 5 }}>Check again</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 id="onboarding-title" style={styles.title}>Get Python and JavaScript running.</h2>
      <p style={styles.subtitle}>
        The <strong style={styles.strong}>Run</strong> button uses these two to run your code.
        Both are free. Not ready? Continue — you can install them any time from
        Settings → Toolchains.
      </p>

      <div style={styles.runtimeList}>
        {RUNTIME_IDS.map((id) => {
          const recipe = TOOLCHAIN_GUIDES[id];
          const row = status?.[id];
          const installed = !!row?.installed;
          const loading = !status;
          const command = runtimeCommand(id);
          // Older Windows 10 has no winget — the command would fail with
          // "not recognized", so offer the download route instead.
          const needsWinget = PLATFORM_LABEL === 'win' && /\bwinget\b/.test(command);
          const wingetGone = !loading && !installed && needsWinget
            && status?.winget && !status.winget.available;
          const fallback = wingetGone ? recipe.fallback?.[PLATFORM_LABEL] : null;

          return (
            <div key={id} style={styles.runtimeRow}>
              <div style={styles.runtimeHead}>
                {loading
                  ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : installed
                    ? <CheckCircle2 size={12} color="var(--success)" />
                    : <AlertCircle size={12} color="var(--text-muted)" />}
                <span style={styles.runtimeLabel}>{recipe.label}</span>
                {focusLanguage === id && <span style={styles.runtimeTag}>you picked this</span>}
                <span style={styles.runtimeValue}>
                  {loading
                    ? 'checking…'
                    : installed
                      ? (row?.version || 'installed')
                      : 'not installed yet'}
                </span>
              </div>

              {fallback && (
                <>
                  <p style={styles.runtimeHint}>
                    winget isn't on this PC, so install {recipe.label} by hand:
                  </p>
                  <a href={fallback.url} target="_blank" rel="noreferrer" style={styles.runtimeLink}>
                    <Download size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {fallback.urlLabel}
                  </a>
                  <ol style={styles.runtimeSteps}>
                    {(fallback.steps || []).map((step, idx) => (
                      <li key={idx}>
                        {step.text}
                        {step.code && <code style={styles.runtimeCmd}>{step.code}</code>}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {!loading && !installed && !fallback && command && (
                <>
                  <code style={styles.runtimeCmd}>{command}</code>
                  <div style={styles.runtimeActions}>
                    <button type="button" style={styles.runtimeCopyBtn} onClick={() => handleCopy(id)}>
                      {copied === id ? <Check size={11} /> : <Copy size={11} />}
                      <span style={{ marginLeft: 4 }}>{copied === id ? 'Copied' : 'Copy command'}</span>
                    </button>
                    {onRunInTerminal && (
                      <button type="button" style={styles.runtimeRunBtn} onClick={() => handleInstall(id)}>
                        <Terminal size={11} />
                        <span style={{ marginLeft: 4 }}>Run it for me</span>
                      </button>
                    )}
                  </div>
                  <p style={styles.runtimeHint}>
                    Paste it into the Terminal, then press <b>Enter</b>.
                  </p>
                  <p style={styles.runtimeWhere}>
                    Where's the Terminal? Click the <b>&gt;_</b> icon at the top of the window,
                    or press <b>Ctrl + `</b>.
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p style={styles.runtimeFoot}>
        A row turns green by itself once its installer finishes — no restart needed.
      </p>

      <div style={styles.actions}>
        <button style={styles.ghostBtn} onClick={onBack}>Back</button>
        <button style={styles.primaryBtn} onClick={onNext}>
          {allInstalled ? 'Continue' : 'Continue without these'}
          <ArrowRight size={14} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — optional AI key (Gemini or Groq)

function StepApiKey({ value, onChange, provider, onProviderChange, onBack, onFinish, onSkip }) {
  // null | 'checking' | 'valid' | { reason, message } — the key must prove
  // itself against the API before Finish unlocks, so a wrong key is caught
  // here instead of on the learner's first AI action.
  const [status, setStatus] = useState(null);
  const [clipboardKey, setClipboardKey] = useState(null);
  const meta = getAiProvider(provider);

  // Key pages open in the system browser — Google blocks sign-in inside the
  // embedded Electron window, so the in-app browser cannot be used here.
  const openKeyPage = (event) => {
    event.preventDefault();
    const bridge = window.seecode?.app;
    if (bridge?.openExternal) {
      bridge.openExternal(meta.getKeyUrl).catch(() => { window.open(meta.getKeyUrl, '_blank'); });
    } else {
      window.open(meta.getKeyUrl, '_blank');
    }
  };

  // Switching provider clears the field — a Gemini key is not a Groq key.
  const chooseProvider = (id) => {
    if (id === provider) return;
    onProviderChange(id);
    onChange('');
    setStatus(null);
    setClipboardKey(null);
  };

  // Coming back from the key page: the browser window leaves, ours regains
  // focus — peek at the clipboard for a freshly copied key and offer a
  // one-click fill. Clipboard permission denial just falls back to manual
  // paste, so failures are silent.
  useEffect(() => {
    const onFocus = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const own = keyFromClipboard(text, provider);
        if (own) {
          setClipboardKey({ key: own, provider });
          return;
        }
        // A key for a different provider is still worth offering — the
        // button switches provider as part of the paste.
        for (const candidate of AI_PROVIDERS) {
          if (candidate.id === provider) continue;
          const found = keyFromClipboard(text, candidate.id);
          if (found) {
            setClipboardKey({ key: found, provider: candidate.id });
            return;
          }
        }
        setClipboardKey(null);
      } catch {
        // ignore — the input still accepts Ctrl+V
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [provider]);

  // Well-formed keys are probed live (debounced); anything shorter or
  // mis-shaped just waits — the format hint covers it.
  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed || !looksLikeApiKey(trimmed, provider)) {
      setStatus(null);
      return undefined;
    }
    setStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await validateApiKey(trimmed, provider);
      if (!cancelled) setStatus(result.ok ? 'valid' : result);
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value, provider]);

  const trimmed = value.trim();
  const checking = status === 'checking';
  const valid = status === 'valid';
  const errorMessage = status && typeof status === 'object' ? status.message : null;
  const formatBad = trimmed.length >= 12 && !looksLikeApiKey(trimmed, provider);
  const canSave = valid;

  return (
    <>
      <h2 style={styles.title}>Add an AI key (optional).</h2>
      <p style={styles.subtitle}>
        Everything works offline. A free AI key adds smarter code generation and error explanations.
      </p>

      <div style={styles.providerRow} role="group" aria-label="AI provider">
        {AI_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={provider === p.id}
            style={{ ...styles.providerPill, ...(provider === p.id ? styles.providerPillActive : {}) }}
            onClick={() => chooseProvider(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <a
        style={styles.getKeyBtn}
        href={meta.getKeyUrl}
        target="_blank"
        rel="noreferrer"
        onClick={openKeyPage}
      >
        <KeyRound size={14} /> {meta.getKeyLabel}
      </a>
      <ol style={styles.getKeySteps}>
        {meta.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div style={styles.keyRow}>
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${meta.keyPlaceholder}  (paste here, or skip)`}
          style={styles.keyInput}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {clipboardKey && clipboardKey.key !== trimmed && (
        <button
          type="button"
          style={styles.pasteBtn}
          onClick={() => {
            if (clipboardKey.provider !== provider) onProviderChange(clipboardKey.provider);
            onChange(clipboardKey.key);
            setClipboardKey(null);
          }}
        >
          <ClipboardPaste size={12} />
          {' '}Paste {getAiProvider(clipboardKey.provider).shortLabel} key from clipboard
        </button>
      )}
      <div style={styles.keyStatus} aria-live="polite">
        {checking && <span>Checking the key…</span>}
        {!checking && valid && (
          <span style={styles.keyValid}><ShieldCheck size={12} /> Key works</span>
        )}
        {!checking && errorMessage && <span style={styles.keyError}>{errorMessage}</span>}
        {!checking && formatBad && (
          <span style={styles.keyError}>{meta.keyHint}</span>
        )}
      </div>

      <div style={styles.actions}>
        <button style={styles.ghostBtn} onClick={onBack}>Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.ghostBtn} onClick={onSkip}>Skip for now</button>
          <button
            style={{ ...styles.primaryBtn, ...(canSave ? {} : styles.primaryBtnDisabled) }}
            onClick={onFinish}
            disabled={!canSave}
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
    borderRadius: 'var(--radius-sm)',
    padding: '10px 13px',
    color: 'var(--text-primary)',
    display: 'flex', flexDirection: 'column', gap: 3,
    transition: 'border-color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out)',
  },
  choiceCompact: { padding: '8px 11px' },
  choiceSelected: {
    borderColor: 'var(--border-strong)',
    background: 'var(--bg-elevated)',
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

  // --- runtime install step ---
  runtimeList: {
    display: 'flex', flexDirection: 'column', gap: 10,
    marginBottom: 12,
  },
  runtimeRow: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
  },
  runtimeHead: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 12.5,
  },
  runtimeLabel: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  runtimeTag: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: 'var(--accent)',
    background: 'var(--accent-soft)',
    borderRadius: 999,
    padding: '1px 7px',
  },
  runtimeValue: {
    marginLeft: 'auto',
    fontSize: 11.5,
    color: 'var(--text-muted)',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    maxWidth: '55%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  runtimeCmd: {
    display: 'block',
    marginTop: 8,
    padding: '7px 9px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: 11,
    lineHeight: 1.5,
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
    userSelect: 'all',
  },
  runtimeActions: {
    display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap',
  },
  runtimeCopyBtn: {
    display: 'inline-flex', alignItems: 'center',
    border: '1px solid var(--border-strong)',
    background: 'transparent',
    color: 'var(--text-primary)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11.5,
    cursor: 'pointer',
  },
  runtimeRunBtn: {
    display: 'inline-flex', alignItems: 'center',
    border: '1px solid var(--accent)',
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  runtimeHint: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 1.5,
    color: 'var(--text-secondary)',
  },
  runtimeWhere: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 1.5,
    color: 'var(--text-muted)',
  },
  runtimeLink: {
    display: 'inline-block',
    marginTop: 4,
    fontSize: 12,
    color: 'var(--accent)',
    textDecoration: 'none',
  },
  runtimeSteps: {
    margin: '6px 0 0',
    paddingLeft: 18,
    fontSize: 11.5,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
  },
  runtimeFoot: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    marginBottom: 16,
  },

  // --- docked (install running) ---
  dockLayer: {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    padding: '72px 24px 24px',
    pointerEvents: 'none',
  },
  dockCard: {
    pointerEvents: 'auto',
    width: 320,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    padding: '14px 16px 16px',
    animation: 'seec0de-pop-in var(--motion-base) var(--ease-out)',
  },
  dockHead: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 8,
  },
  dockTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dockText: {
    fontSize: 11.5,
    lineHeight: 1.55,
    color: 'var(--text-secondary)',
    marginBottom: 10,
  },
  dockList: {
    display: 'flex', flexDirection: 'column', gap: 4,
    marginBottom: 12,
  },
  dockRow: {
    display: 'flex', alignItems: 'center',
    fontSize: 11.5,
    color: 'var(--text-secondary)',
  },
  dockRowValue: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: 11,
  },

  providerRow: { display: 'flex', gap: 8, marginBottom: 16 },
  providerPill: {
    flex: 1,
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'border-color 120ms ease, background 120ms ease, color 120ms ease',
  },
  providerPillActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
  },

  getKeyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 8,
    background: 'var(--accent)',
    color: 'var(--text-on-accent, #101010)',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    marginBottom: 10,
  },
  getKeySteps: {
    margin: '0 0 18px',
    paddingLeft: 20,
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    lineHeight: 1.9,
  },
  pasteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid var(--border-strong)',
    background: 'transparent',
    color: 'var(--text-primary)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11.5,
    cursor: 'pointer',
    marginBottom: 8,
  },
  keyStatus: {
    minHeight: 16,
    marginBottom: 12,
    fontSize: 11.5,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  keyValid: { display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--success)' },
  keyError: { color: 'var(--danger-text, #e5484d)' },
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
    color: 'var(--text-on-accent)',
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
