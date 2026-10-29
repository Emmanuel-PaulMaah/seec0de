import React, { useEffect, useMemo, useState } from 'react';
import { Bug, Check, Copy, Lightbulb, Mail } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Input, Textarea } from './ui/field';
import { Button } from './ui/button';
import { getAiProvider } from '../engine/aiProviders';
import { loadSettings } from '../engine/settings';

// FeedbackModal — the in-app "report a bug / suggest a feature" form.
//
// There is no mail server in the app, so the report is handed to the system's
// mail client as a prefilled mailto: URL. The learner sees the email in their
// own client and chooses when to send it; Copy report covers machines with no
// mail client configured.
//
// A short diagnostics block (version, OS, mode, language, AI setup) is
// attached by default. It never includes code, file paths or API keys — only
// the facts that make a bug report reproducible.

const FEEDBACK_EMAIL = 'yottalium@gmail.com';
const DRAFT_KEY = 'seec0de.feedbackDraft';
// Mail clients disagree about long mailto: URLs, and the failure mode is a
// silently truncated report. Past this point, copying is the honest path.
const MAX_MAILTO_LENGTH = 6000;

const KINDS = {
  bug: {
    label: 'Report a bug',
    icon: Bug,
    summaryPlaceholder: 'Run does nothing when Python is selected',
    detailsLabel: 'What happened?',
    detailsPlaceholder: "When I pressed Run, the console stayed empty. Yesterday the same file printed Hello, World!",
    titlePrefix: '[Bug]',
  },
  idea: {
    label: 'Suggest a feature',
    icon: Lightbulb,
    summaryPlaceholder: 'Let me practice a single lesson again',
    detailsLabel: 'What would you like to see?',
    detailsPlaceholder: 'After finishing a lesson I want to replay it without resetting the whole course.',
    titlePrefix: '[Feature]',
  },
};

// Each feedback type keeps its own report, so switching between a bug and an
// idea never drags one type's text into the other.
const EMPTY_FORM = { summary: '', details: '', steps: '' };

function emptyForms() {
  return { bug: { ...EMPTY_FORM }, idea: { ...EMPTY_FORM } };
}

function normalizeForm(form) {
  return {
    summary: typeof form?.summary === 'string' ? form.summary : '',
    details: typeof form?.details === 'string' ? form.details : '',
    steps: typeof form?.steps === 'string' ? form.steps : '',
  };
}

function hasContent(forms) {
  return Object.values(forms).some((form) => !!(form.summary.trim() || form.details.trim() || form.steps.trim()));
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object') return null;

    const forms = emptyForms();
    if (draft.forms && typeof draft.forms === 'object') {
      for (const id of Object.keys(forms)) {
        if (draft.forms[id]) forms[id] = normalizeForm(draft.forms[id]);
      }
    } else if (KINDS[draft.kind]) {
      // Drafts written before types were separated held a single report.
      forms[draft.kind] = normalizeForm(draft);
    } else {
      return null;
    }

    return { forms, includeDiagnostics: draft.includeDiagnostics !== false };
  } catch {
    return null;
  }
}

function writeDraft({ forms, includeDiagnostics }) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ forms, includeDiagnostics, savedAt: Date.now() }));
  } catch {
    /* storage unavailable — the form still works for this session */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clean up */
  }
}

function osLabel() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/Windows NT 10\.0/i.test(ua)) return 'Windows 10/11';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return (typeof navigator !== 'undefined' && navigator.platform) || 'Unknown OS';
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API can be blocked; fall back to the old selection trick.
    try {
      const node = document.createElement('textarea');
      node.value = text;
      node.setAttribute('readonly', '');
      node.style.position = 'fixed';
      node.style.opacity = '0';
      document.body.appendChild(node);
      node.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(node);
      return ok;
    } catch {
      return false;
    }
  }
}

function plainSection(title, content) {
  return `${title}\n${'-'.repeat(title.length)}\n\n${content.trim()}`;
}

function buildEmailBody(kind, details, steps, diagnostics, includeDiagnostics) {
  const sections = [];
  const detailsTitle = kind === 'bug' ? 'What happened' : 'What would you like to see';
  sections.push(plainSection(detailsTitle, details));
  if (kind === 'bug' && steps.trim()) {
    sections.push(plainSection('Steps to reproduce', steps));
  }
  if (includeDiagnostics) {
    sections.push(plainSection('App details', diagnostics));
  }
  return sections.join('\n\n');
}

export default function FeedbackModal({
  open,
  onClose,
  initialKind = 'bug',
  settings: settingsProp,
  mode = 'workspace',
}) {
  const [kind, setKind] = useState(KINDS[initialKind] ? initialKind : 'bug');
  const [forms, setForms] = useState(emptyForms);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const [appVersion, setAppVersion] = useState('dev');
  const [aiLabel, setAiLabel] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const kindMeta = KINDS[kind];
  const { summary, details, steps } = forms[kind];

  const setField = (field) => (value) =>
    setForms((prev) => ({ ...prev, [kind]: { ...prev[kind], [field]: value } }));

  // Reset the form each time the modal opens. Content from unfinished reports
  // comes back so a stray Esc doesn't lose a long bug description.
  useEffect(() => {
    if (!open) return;
    setKind(KINDS[initialKind] ? initialKind : 'bug');
    setCopied(false);
    setSending(false);
    setSendError('');
    setAiLabel('');

    const draft = readDraft();
    if (draft && hasContent(draft.forms)) {
      setForms(draft.forms);
      setIncludeDiagnostics(draft.includeDiagnostics);
      setDraftRestored(true);
    } else {
      setForms(emptyForms());
      setIncludeDiagnostics(true);
      setDraftRestored(false);
    }
  }, [open, initialKind]);

  // Version + AI status are only needed while the form is open, and both
  // live behind the preload bridge.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const versionRequest = window.seecode?.updates?.getStatus?.();
    if (versionRequest?.then) {
      versionRequest
        .then((status) => {
          if (!cancelled && status?.appVersion) setAppVersion(status.appVersion);
        })
        .catch(() => {});
    }

    const aiRequest = window.seecode?.ai?.status?.();
    if (aiRequest?.then) {
      aiRequest
        .then((status) => {
          if (cancelled || !status) return;
          const provider = getAiProvider(status.active);
          const hasKey = !!status.providers?.find((p) => p.id === status.active)?.hasKey;
          setAiLabel(hasKey ? `${provider.label} key` : 'not configured');
        })
        .catch(() => {
          if (!cancelled) setAiLabel('not checked');
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Keep the unfinished reports in localStorage as the learner types.
  useEffect(() => {
    if (!open) return;
    if (!hasContent(forms)) {
      clearDraft();
      return;
    }
    writeDraft({ forms, includeDiagnostics });
  }, [open, forms, includeDiagnostics]);

  const settings = useMemo(() => settingsProp || loadSettings(), [settingsProp]);
  const diagnostics = useMemo(() => [
    `seec0de ${appVersion}`,
    osLabel(),
    `Mode: ${mode}`,
    `Language: ${settings?.practicalLanguage || 'unknown'}`,
    aiLabel ? `AI: ${aiLabel}` : null,
  ].filter(Boolean).join('\n'), [appVersion, mode, settings?.practicalLanguage, aiLabel]);

  const canSubmit = summary.trim().length > 0 && details.trim().length > 0;
  const emailSubject = `${kindMeta.titlePrefix} ${summary.trim()}`;
  const emailBody = buildEmailBody(kind, details, steps, diagnostics, includeDiagnostics);
  const mailtoBody = emailBody.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(mailtoBody)}`;
  const tooLongForEmail = mailtoUrl.length > MAX_MAILTO_LENGTH;
  const canSend = canSubmit && !tooLongForEmail;

  const copyText = `To: ${FEEDBACK_EMAIL}\nSubject: ${emailSubject}\n\n${emailBody}`;

  const handleCopy = async () => {
    if (!canSubmit) return;
    const ok = await copyToClipboard(copyText);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSend = async () => {
    if (!canSend || sending) return;
    setSendError('');
    setSending(true);

    try {
      const bridge = window.seecode?.feedback;
      if (bridge?.sendEmail) {
        const result = await bridge.sendEmail({ subject: emailSubject, body: emailBody });
        if (result?.ok === false) throw new Error(result.error || 'Could not open your email app.');
      } else {
        // Renderer running outside Electron (e.g. webpack dev server).
        window.location.href = mailtoUrl;
      }
      // The report now lives in the mail client, so only this type's draft
      // goes; an unfinished report of the other type is kept.
      const remaining = { ...forms, [kind]: { ...EMPTY_FORM } };
      clearDraft();
      if (hasContent(remaining)) writeDraft({ forms: remaining, includeDiagnostics });
      setDraftRestored(hasContent(remaining));
      onClose?.();
    } catch {
      setSending(false);
      setSendError(`Couldn't open your email app. Copy the report and send it to ${FEEDBACK_EMAIL}.`);
    }
  };

  const startOver = () => {
    const remaining = { ...forms, [kind]: { ...EMPTY_FORM } };
    setForms(remaining);
    setDraftRestored(hasContent(remaining));
    setCopied(false);
    setSendError('');
  };

  const KindIcon = kindMeta.icon;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Send feedback"
      description={`Found a bug or have an idea? Write it here and send it to ${FEEDBACK_EMAIL} from your email app.`}
      className="feedback-dialog"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={handleCopy} disabled={!canSubmit} aria-live="polite">
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy report</>}
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={!canSend || sending}>
            {sending ? <>Opening email…</> : <><Mail size={13} /> Send email</>}
          </Button>
        </>
      )}
    >
      <div className="feedback-kind" role="group" aria-label="Feedback type">
        {Object.entries(KINDS).map(([id, item]) => {
          const Icon = item.icon;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
            >
              <Icon size={13} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      {draftRestored && (
        <p className="feedback-draft-note" role="status">
          Draft restored from your last visit. <button type="button" onClick={startOver}>Start over</button>
        </p>
      )}

      <Input
        label="Summary"
        value={summary}
        onChange={(event) => setField('summary')(event.target.value)}
        placeholder={kindMeta.summaryPlaceholder}
        maxLength={120}
      />

      <Textarea
        label={kindMeta.detailsLabel}
        value={details}
        onChange={(event) => setField('details')(event.target.value)}
        placeholder={kindMeta.detailsPlaceholder}
        rows={5}
        hint={kind === 'bug' ? 'What you did, what you saw, and what you expected.' : 'The problem you want solved, and what the app could do about it.'}
      />

      {kind === 'bug' && (
        <Textarea
          label="Steps to reproduce (optional)"
          value={steps}
          onChange={(event) => setField('steps')(event.target.value)}
          placeholder={'1. Open Learn mode\n2. Pick the Python course\n3. Press Run'}
          rows={3}
        />
      )}

      <div className="feedback-diagnostics">
        <label>
          <input
            type="checkbox"
            checked={includeDiagnostics}
            onChange={(event) => setIncludeDiagnostics(event.target.checked)}
          />
          <span>Include app details</span>
        </label>
        {includeDiagnostics && (
          <pre className="feedback-diagnostics__preview">{diagnostics}</pre>
        )}
        <p className="feedback-diagnostics__hint">
          Version, OS, mode and language. Never your code, files or API keys.
        </p>
      </div>

      {sendError && (
        <p className="feedback-kind__note feedback-kind__error" role="alert">
          <span>{sendError}</span>
        </p>
      )}

      {tooLongForEmail ? (
        <p className="feedback-kind__note" role="status">
          <span>This report is too long for an email link. Use <strong>Copy report</strong> and send it to {FEEDBACK_EMAIL} instead.</span>
        </p>
      ) : (
        <p className="feedback-kind__note">
          <KindIcon size={12} aria-hidden />
          <span>This opens your email app with the report ready to send to {FEEDBACK_EMAIL}. No mail app? Use <strong>Copy report</strong>.</span>
        </p>
      )}
    </Dialog>
  );
}
