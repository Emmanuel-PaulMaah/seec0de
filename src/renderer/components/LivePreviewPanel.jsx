import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Eye, Terminal as TermIcon, RefreshCw,
  ChevronLeft, ChevronRight, Trash2, Code2, FileCode2,
  AlertTriangle, Wrench, X as CloseIcon, Sparkles,
} from 'lucide-react';
import { translateError } from '../engine/errorTranslator';
import { explainErrorWithAI, hasApiKey } from '../engine/aiService';

// LivePreviewPanel — the right-side "what does my code do?" surface.
//
// Two views:
//   • Preview  — sandboxed iframe rendering HTML as the user types. JS,
//                CSS, and everything else fall through to a "press Run"
//                placeholder, so all non-HTML output flows through the
//                explicit Run button.
//   • Console  — stdout/stderr from the runner service (JS, Python, C,
//                C++…). Populated only by the Run button in CodePanel.
//
// Pedagogy notes:
//   - For HTML, "Run" is implicit — the iframe is always live. The
//     learner sees cause→effect immediately.
//   - For every other runnable language (JS, TS, Python, C, C++), "Run"
//     is explicit: the user clicks the Run button in the editor toolbar
//     and we auto-flip to the Console tab when output arrives.
//   - The pseudocode tab gets its own friendly placeholder, since
//     "rendering" pseudocode doesn't make sense.

// CSS isn't previewable on its own — pair with HTML.
// JavaScript is intentionally NOT previewable: we want learners to use
// the explicit Run button so output is a deliberate action, not a side-
// effect of typing.
const PREVIEWABLE = new Set(['html']);
const RUNNABLE    = new Set(['javascript', 'typescript', 'python', 'c', 'cpp']);
const DEBOUNCE_MS = 250;
const MAX_LOG_ENTRIES = 200;

function buildSrcDoc(language, code) {
  if (!code) return null;
  if (language === 'html') {
    return code;
  }
  return null;
}

function languageLabel(l) {
  return ({
    python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
    c: 'C', cpp: 'C++', html: 'HTML', css: 'CSS', plaintext: 'Pseudocode',
  })[l] || l || 'this code';
}

export default function LivePreviewPanel({
  visible,
  onToggle,
  code = '',
  language = 'plaintext',
  filename = null,
  runnerOutput = null,
  runLoading = false,
}) {
  const previewable = PREVIEWABLE.has(language);
  const runnable    = RUNNABLE.has(language);

  const [view, setView] = useState('preview');
  const [consoleEntries, setConsoleEntries] = useState([]);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [refreshNonce, setRefreshNonce] = useState(0);
  // Error-translator cards. Recomputed whenever a runner result lands
  // with a non-zero exit code + stderr we recognise. A single stderr can
  // contain many distinct errors (compilers and chained exceptions love
  // this), so we store them as an array and let the user dismiss them
  // one at a time.
  const [errorTranslations, setErrorTranslations] = useState([]);
  const [dismissedTitles, setDismissedTitles] = useState(() => new Set());
  // AI fallback state: when the offline translator finds zero matches for
  // a failed run AND the user has an API key + connection, we ask Gemini
  // to explain the error in the same {title, plain, fixes} shape so the
  // existing card component can render it unchanged.
  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  const idRef = useRef(0);
  const debounceRef = useRef(null);
  const lastRunnerRef = useRef(null);
  // Monotonic counter so a late AI response from a previous run can't
  // overwrite the current run's state if the user re-runs quickly.
  const runIdRef = useRef(0);

  // Debounce live updates while typing.
  useEffect(() => {
    if (!previewable) { setDebouncedCode(code); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedCode(code), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code, previewable]);

  // Console output is no longer driven by the iframe — it's populated
  // exclusively by the runner (Run button). The postMessage capture used
  // to pipe in-iframe console.log calls here, but that conflated typing
  // with running. Now Run is the only thing that produces console output.

  // When the language changes (different file/tab), drop old console output.
  useEffect(() => {
    setConsoleEntries([]);
    setErrorTranslations([]);
    setDismissedTitles(new Set());
    setAiExplainLoading(false);
    // Bump the run id so any in-flight AI explain from the previous file
    // is ignored when it eventually resolves.
    runIdRef.current += 1;
  }, [language, filename]);

  // When the language changes to one that can't be previewed, swing the
  // user to the Console view — that's where Run output will land.
  useEffect(() => {
    if (!previewable && runnable) setView('console');
    if (!previewable && !runnable) setView('preview'); // shows placeholder
    if (previewable) setView((v) => (v === 'console' && consoleEntries.length === 0 ? 'preview' : v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Push runner result into the console view as a structured set of entries.
  useEffect(() => {
    if (!runnerOutput || runnerOutput === lastRunnerRef.current) return;
    lastRunnerRef.current = runnerOutput;
    setConsoleEntries((prev) => {
      const out = [...prev];
      const push = (level, text) => {
        if (!text) return;
        out.push({ id: ++idRef.current, ts: Date.now(), level, args: [text] });
      };
      if (runnerOutput.command) push('meta', `$ ${runnerOutput.command}`);
      if (runnerOutput.stdout) push('stdout', runnerOutput.stdout.replace(/\n$/, ''));
      if (runnerOutput.stderr) push('stderr', runnerOutput.stderr.replace(/\n$/, ''));
      const ms = runnerOutput.durationMs ?? 0;
      const ok = runnerOutput.exitCode === 0;
      push(ok ? 'meta' : 'stderr', `${ok ? '✓' : '✗'} exit ${runnerOutput.exitCode ?? '?'} · ${ms}ms`);
      return out.length > MAX_LOG_ENTRIES ? out.slice(-MAX_LOG_ENTRIES) : out;
    });
    // Error Message Translator: every failed run gets a fresh set of
    // cards covering every error we recognise in the stderr (not just the
    // first one). Dismissals are reset per-run so a fix attempt that
    // still errors still surfaces the translation.
    const failed = (runnerOutput.exitCode ?? 0) !== 0;
    const runLang = runnerOutput.language || language;
    const runId = ++runIdRef.current; // claim this run's slot

    if (failed && runnerOutput.stderr) {
      const offline = translateError(runnerOutput.stderr, runLang);
      setErrorTranslations(offline);

      // Offline translator didn't recognise this error — fall back to AI
      // if the user has a key and a connection. The raw stderr is still
      // visible in the console below regardless, so an AI failure here is
      // silent (best-effort enhancement, not a hard requirement).
      const canUseAi =
        offline.length === 0 &&
        hasApiKey() &&
        (typeof navigator === 'undefined' || navigator.onLine);

      if (canUseAi) {
        setAiExplainLoading(true);
        explainErrorWithAI(runnerOutput.stderr, code, runLang)
          .then((result) => {
            // Drop the response if a newer run has started in the
            // meantime (user re-ran, switched files, etc.).
            if (runId !== runIdRef.current) return;
            if (!result || (!result.title && !result.plain)) return;
            setErrorTranslations([{ ...result, source: 'ai' }]);
          })
          .catch((err) => {
            if (runId !== runIdRef.current) return;
            console.warn('[seec0de] AI error explain failed:', err?.message || err);
          })
          .finally(() => {
            if (runId !== runIdRef.current) return;
            setAiExplainLoading(false);
          });
      } else {
        setAiExplainLoading(false);
      }
    } else {
      setErrorTranslations([]);
      setAiExplainLoading(false);
    }
    setDismissedTitles(new Set());
    setView('console');
  }, [runnerOutput, language, code]);

  const srcDoc = useMemo(
    () => (previewable ? buildSrcDoc(language, debouncedCode) : null),
    [language, debouncedCode, previewable]
  );

  // Filter out cards the user has already dismissed in this run.
  const visibleTranslations = useMemo(
    () => errorTranslations.filter((t) => !dismissedTitles.has(t.title)),
    [errorTranslations, dismissedTitles]
  );

  const handleRefresh = useCallback(() => {
    setDebouncedCode(code);
    setRefreshNonce((n) => n + 1);
  }, [code]);

  // ---- collapsed rail (32 px) ------------------------------------------
  if (!visible) {
    return (
      <button
        type="button"
        style={styles.rail}
        onClick={onToggle}
        title="Show live preview"
        aria-label="Show live preview"
      >
        <ChevronLeft size={12} />
        <Eye size={14} style={{ marginTop: 6 }} />
        <span style={styles.railText}>PREVIEW</span>
      </button>
    );
  }

  // ---- expanded panel --------------------------------------------------
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(view === 'preview' ? styles.tabActive : {}) }}
            onClick={() => setView('preview')}
            title="Visual preview"
          >
            <Eye size={12} />
            <span style={{ marginLeft: 6 }}>Preview</span>
          </button>
          <button
            style={{ ...styles.tab, ...(view === 'console' ? styles.tabActive : {}) }}
            onClick={() => setView('console')}
            title="Console output (logs, runner output)"
          >
            <TermIcon size={12} />
            <span style={{ marginLeft: 6 }}>Console</span>
            {consoleEntries.length > 0 && (
              <span style={styles.tabBadge}>{consoleEntries.length}</span>
            )}
          </button>
        </div>

        <div style={styles.headerActions}>
          {view === 'console' && consoleEntries.length > 0 && (
            <button
              type="button"
              style={styles.iconBtn}
              onClick={() => {
                setConsoleEntries([]);
                setErrorTranslations([]);
                setDismissedTitles(new Set());
                setAiExplainLoading(false);
                runIdRef.current += 1;
              }}
              title="Clear console"
              aria-label="Clear console"
            >
              <Trash2 size={12} />
            </button>
          )}
          {view === 'preview' && previewable && (
            <button
              type="button"
              style={styles.iconBtn}
              onClick={handleRefresh}
              title="Refresh preview"
              aria-label="Refresh preview"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            type="button"
            style={styles.iconBtn}
            onClick={onToggle}
            title="Hide preview"
            aria-label="Hide preview"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {view === 'preview' && (
          previewable ? (
            <iframe
              key={refreshNonce}
              title="Live preview"
              style={styles.iframe}
              srcDoc={srcDoc || ''}
              sandbox="allow-scripts allow-modals allow-forms"
            />
          ) : (
            <PlaceholderView
              language={language}
              runnable={runnable}
              runLoading={runLoading}
            />
          )
        )}

        {view === 'console' && (
          <div style={styles.consoleStack}>
            {(visibleTranslations.length > 0 || aiExplainLoading) && (
              <div style={styles.errCardList}>
                {visibleTranslations.length > 1 && (
                  <div style={styles.errCardListHeader}>
                    <AlertTriangle size={11} color="var(--danger)" />
                    <span>{visibleTranslations.length} errors translated</span>
                  </div>
                )}
                {visibleTranslations.map((t, i) => (
                  <ErrorTranslatorCard
                    key={`${t.title}-${i}`}
                    translation={t}
                    indexLabel={visibleTranslations.length > 1 ? `${i + 1}/${visibleTranslations.length}` : null}
                    onDismiss={() => {
                      setDismissedTitles((prev) => {
                        const next = new Set(prev);
                        next.add(t.title);
                        return next;
                      });
                    }}
                  />
                ))}
                {aiExplainLoading && visibleTranslations.length === 0 && (
                  <AiExplainSkeleton />
                )}
              </div>
            )}
            <ConsoleView entries={consoleEntries} />
          </div>
        )}
      </div>

      {view === 'preview' && previewable && (
        <div style={styles.statusBar}>
          <span style={styles.statusDot} />
          <span>Live · updates as you type</span>
          {filename && <span style={styles.statusFile}>{filename}</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PlaceholderView({ language, runnable, runLoading }) {
  const isPseudo = language === 'plaintext';
  return (
    <div style={styles.placeholder}>
      {isPseudo ? <Code2 size={28} color="var(--text-muted)" /> : <FileCode2 size={28} color="var(--text-muted)" />}
      <h3 style={styles.placeholderTitle}>
        {isPseudo
          ? 'Pseudocode is the lesson'
          : runnable
            ? (runLoading ? `Running ${languageLabel(language)}…` : `Ready to run ${languageLabel(language)}`)
            : 'Live preview not available'}
      </h3>
      <p style={styles.placeholderText}>
        {isPseudo && (<>
          Switch to a <b>language tab</b>
        </>)}
        {!isPseudo && runnable && (<>
          Press <b>Run</b> in the editor toolbar above.
        </>)}
        {!isPseudo && !runnable && language === 'css' && (<>
          CSS needs a document to style. Open an <b>HTML file</b> that
          links to this stylesheet and you'll see your styles applied
          live. The file itself is fully editable here.
        </>)}
        {!isPseudo && !runnable && language !== 'css' && (<>
          Live preview supports HTML and JavaScript out of the box.
          Other languages (Java, Go, Rust, C#…) can still be edited but don't render here.
        </>)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error Message Translator card.
//
// Renders above the Console scroll when the most recent run failed with a
// stderr we recognise. The original error is still visible below (we never
// hide stderr) — this card is a parallel "what does that mean?" layer.

function ErrorTranslatorCard({ translation, indexLabel, onDismiss }) {
  const fromAi = translation.source === 'ai';
  return (
    <div style={styles.errCard}>
      <div style={styles.errHeader}>
        <AlertTriangle size={14} color="var(--danger)" />
        {indexLabel && <span style={styles.errIndex}>{indexLabel}</span>}
        <span style={styles.errTitle}>{translation.title}</span>
        {fromAi && (
          <span style={styles.errAiBadge} title="Explained by AI — offline translator didn't recognise this error">
            <Sparkles size={9} />
            <span>AI</span>
          </span>
        )}
        <button
          type="button"
          style={styles.errDismiss}
          onClick={onDismiss}
          title="Hide this translation"
          aria-label="Hide this translation"
        >
          <CloseIcon size={12} />
        </button>
      </div>
      <p style={styles.errPlain}>{renderInline(translation.plain)}</p>
      {translation.fixes && translation.fixes.length > 0 && (
        <div style={styles.errFixes}>
          <div style={styles.errFixesLabel}>
            <Wrench size={11} />
            <span>{fromAi ? 'Suggested fixes' : 'Common fixes'}</span>
          </div>
          <ul style={styles.errFixList}>
            {translation.fixes.map((fix, i) => (
              <li key={i} style={styles.errFixItem}>{renderInline(fix)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Placeholder card shown while the AI fallback is in flight. Matches the
// shape of ErrorTranslatorCard so the layout doesn't jump when the real
// card lands.
function AiExplainSkeleton() {
  return (
    <div style={styles.errCard}>
      <div style={styles.errHeader}>
        <Sparkles size={14} color="var(--border-focus)" />
        <span style={styles.errTitle}>Asking AI…</span>
      </div>
    </div>
  );
}

// Render the small subset of markdown we use in translator strings:
// `code` becomes a styled <code> span, **bold** becomes <strong>. Anything
// else passes through as plain text. Keeps the card light without pulling
// in a markdown dependency.
function renderInline(text) {
  if (!text) return null;
  // Split on a single regex that captures `code` or **bold**.
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={styles.inlineCode}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function ConsoleView({ entries }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div style={styles.consoleEmpty}>
        <TermIcon size={20} color="var(--text-muted)" />
        <span style={styles.consoleEmptyTitle}>Console is quiet.</span>
        <span style={styles.consoleEmptyHint}>
          Click <b>Run</b> in the editor toolbar to execute your code and see output here.
        </span>
      </div>
    );
  }

  return (
    <div style={styles.consoleScroll} ref={scrollRef}>
      {entries.map((e) => (
        <div key={e.id} style={{ ...styles.consoleLine, ...(levelStyles[e.level] || {}) }}>
          <span style={styles.consoleLevel}>{levelLabel(e.level)}</span>
          <pre style={styles.consoleArgs}>{e.args.join(' ')}</pre>
        </div>
      ))}
    </div>
  );
}

function levelLabel(level) {
  switch (level) {
    case 'log':    return 'log';
    case 'info':   return 'info';
    case 'debug':  return 'dbg';
    case 'warn':   return 'warn';
    case 'error':  return 'err';
    case 'stdout': return 'out';
    case 'stderr': return 'err';
    case 'meta':   return '·';
    default:       return level;
  }
}

const levelStyles = {
  warn:   { color: '#f0b429' },
  error:  { color: 'var(--danger)' },
  stderr: { color: 'var(--danger)' },
  meta:   { color: 'var(--text-muted)' },
};

// ---------------------------------------------------------------------------
// styles

const styles = {
  rail: {
    width: 32,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 14,
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  railText: {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'var(--text-muted)',
    marginTop: 8,
  },

  panel: {
    width: '100%',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    borderLeft: '1px solid var(--border)',
    minWidth: 0,
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'stretch',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    minHeight: 36,
  },
  tabs: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '8px 14px',
    whiteSpace: 'nowrap',
    transition: 'color var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out)',
  },
  tabActive: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--text-primary)',
    background: 'var(--bg-primary)',
  },
  tabBadge: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-strong)',
    fontSize: 10,
    fontWeight: 500,
    padding: '0 6px',
    borderRadius: 999,
    marginLeft: 6,
    minWidth: 18,
    textAlign: 'center',
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    paddingRight: 6,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: 6,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  iframe: {
    flex: 1,
    border: 'none',
    background: '#ffffff',
    width: '100%',
    height: '100%',
  },

  placeholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    gap: 6,
    color: 'var(--text-muted)',
    background: 'var(--bg-primary)',
  },
  placeholderTitle: {
    fontSize: 14,
    color: 'var(--text-primary)',
    fontWeight: 600,
    margin: '8px 0 0',
  },
  placeholderText: {
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: 320,
    margin: 0,
  },

  consoleStack: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // ---- Error Message Translator cards --------------------------------
  errCardList: {
    flexShrink: 0,
    maxHeight: '55%',
    overflowY: 'auto',
    padding: '4px 0',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(255, 80, 80, 0.03)',
  },
  errCardListHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px 2px',
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  },
  errCard: {
    flexShrink: 0,
    margin: 8,
    padding: '10px 12px 12px',
    borderRadius: 6,
    background: 'rgba(255, 80, 80, 0.06)',
    border: '1px solid rgba(255, 80, 80, 0.35)',
    color: 'var(--text-primary)',
  },
  errIndex: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.5,
    padding: '1px 6px',
    borderRadius: 999,
    background: 'rgba(255, 80, 80, 0.18)',
    color: 'var(--danger)',
    border: '1px solid rgba(255, 80, 80, 0.4)',
  },
  errAiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    padding: '1px 6px 1px 5px',
    borderRadius: 999,
    background: 'rgba(111, 195, 223, 0.12)',
    color: 'var(--border-focus)',
    border: '1px solid rgba(111, 195, 223, 0.4)',
  },
  errHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.4,
  },
  errDismiss: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 3,
  },
  errPlain: {
    margin: '0 0 10px',
    fontSize: 12,
    lineHeight: 1.55,
    color: 'var(--text-secondary)',
  },
  errFixes: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 8,
  },
  errFixesLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 6,
  },
  errFixList: {
    margin: 0,
    paddingLeft: 18,
  },
  errFixItem: {
    fontSize: 12,
    lineHeight: 1.55,
    color: 'var(--text-secondary)',
    marginBottom: 4,
  },
  inlineCode: {
    fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
    fontSize: 11,
    padding: '1px 5px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-primary)',
  },

  consoleEmpty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 12,
    lineHeight: 1.6,
    gap: 6,
    background: 'var(--bg-input)',
  },
  consoleEmptyTitle: {
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    marginTop: 6,
  },
  consoleEmptyHint: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    maxWidth: 280,
  },
  consoleScroll: {
    flex: 1,
    overflow: 'auto',
    background: 'var(--bg-input)',
    fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
    padding: '4px 0',
  },
  consoleLine: {
    display: 'flex',
    gap: 10,
    padding: '4px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: 12,
    lineHeight: 1.5,
  },
  consoleLevel: {
    color: 'var(--text-muted)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: 2,
    minWidth: 32,
    flexShrink: 0,
  },
  consoleArgs: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'inherit',
    fontSize: 12,
  },

  statusBar: {
    height: 22,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--text-secondary)',
  },
  statusFile: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: 10,
  },
};
