import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Loader, Settings as SettingsIcon, Wand2,
  ChevronLeft, ChevronRight, MessageSquareCode, Shuffle,
  GraduationCap, Terminal, AlertCircle, X,
} from 'lucide-react';
import { hasApiKey, subscribeHasApiKey } from '../engine/aiService';
import { pickSuggestions } from '../engine/codeGenerator';
import LessonsPanel from './LessonsPanel';
import ActiveLessonCard from './ActiveLessonCard';

// ... (LANGUAGE_LABELS and labelFor unchanged)

export default function InstructionPanel({
  instruction,
  onInstructionChange,
  onGenerate,
  aiLoading,
  aiError = null,
  onClearAiError,
  practicalLanguage,
  comparisonLanguages = [],
  onOpenSettings,
  collapsed = false,
  onToggleCollapsed,
  // lesson props
  completedLessons = [],
  onSelectLesson,
  activeLesson,
  lessonStatus = 'idle',
  lessonVerification = null,
  lessonErrorCoaching = [],
  lessonHasNext = false,
  onResetLessonCode,
  onRevealSolution,
  onNextLesson,
}) {
  // Track key-presence reactively. The cached `hasApiKey()` hydrates
  // asynchronously on module load AND flips whenever the SettingsDrawer
  // saves a key, so a one-shot render-time read can be stale. Subscribe
  // so the "Add a Gemini key" hint disappears the instant the user adds
  // one in Settings — no need to interact with this panel first.
  const [aiReady, setAiReady] = useState(() => hasApiKey());
  useEffect(() => {
    const unsub = subscribeHasApiKey(setAiReady);
    return () => { unsub(); };
  }, []);

  const [activeTab, setActiveTab] = useState('build'); // 'build' or 'lessons'
  const [lessonBrowserOpen, setLessonBrowserOpen] = useState(false);

  // When a lesson becomes active (from any source — list click, "Next
  // lesson", restored state) the user is in lesson mode, full stop. Pop
  // the Lessons tab to the front so they see the teaching surface
  // instead of the Build form.
  useEffect(() => {
    if (activeLesson) setActiveTab('lessons');
  }, [activeLesson?.id]);

  // Focus the active lesson by default. The full curriculum is still one
  // click away, but it no longer sits underneath every lesson and competes
  // with the current task, hints, and run feedback.
  useEffect(() => {
    if (activeLesson) setLessonBrowserOpen(false);
  }, [activeLesson?.id]);

  const labelFor = (id) => {
  const labels = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    py: 'Python',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
  };

  return labels[id] || id;
};

  // ---- suggestions -----------------------------------------------------
  const [seed, setSeed] = useState(0);
  const suggestions = useMemo(() => pickSuggestions(4), [seed]);

  // Suggestion chips are hand-tuned prompts that map onto a built-in
  // offline template. Pass a `source: 'suggestion'` marker so App.jsx
  // can keep the template-first short-circuit for these — while the
  // manual Generate button (which calls onGenerate with no args) always
  // goes through AI.
  const handleSuggestion = useCallback((text) => {
    onInstructionChange(text);
    onGenerate?.(text, { source: 'suggestion' });
  }, [onInstructionChange, onGenerate]);

  const handleGenerateClick = useCallback(() => {
    onGenerate?.();
  }, [onGenerate]);

  // ---- collapsed rail (32 px) ------------------------------------------
  if (collapsed) {
    return (
      <button
        type="button"
        style={styles.rail}
        onClick={onToggleCollapsed}
        title="Show instruction panel"
        aria-label="Show instruction panel"
      >
        <ChevronRight size={12} />
        <MessageSquareCode size={14} style={{ marginTop: 6 }} />
        <span style={styles.railText}>INSTRUCTION</span>
      </button>
    );
  }

  // ---- expanded panel --------------------------------------------------
  return (
    <div style={styles.panel}>
      <div style={styles.inner}>

        {/* Header — gentle context label, with collapse control */}
        <div style={styles.header}>
          <div style={styles.headerText}>
            <div style={styles.headerLabel}>Instruction</div>
          </div>
          {onToggleCollapsed && (
            <button
              type="button"
              style={styles.collapseBtn}
              onClick={onToggleCollapsed}
              title="Collapse instruction panel"
              aria-label="Collapse instruction panel"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* Tabs for Build vs Lessons */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'build' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('build')}
          >
            <Terminal size={12} />
            Build
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'lessons' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('lessons')}
          >
            <GraduationCap size={12} />
            Lessons
          </button>
        </div>

        <div style={styles.scrollContent}>
          {activeTab === 'build' ? (
            <div style={styles.buildStack}>
              <p style={styles.headerHint}>
                Describe what you want the program to do, in plain English.
              </p>

              {/* Read-out: which languages will be generated */}
              <button style={styles.langStrip} onClick={onOpenSettings} title="Manage languages in Settings">
                <span style={styles.langStripChip}>Pseudocode</span>
                {practicalLanguage && (
                  <>
                    <span style={styles.langStripPlus}>+</span>
                    <span style={{ ...styles.langStripChip, ...styles.langStripChipPractical }}>
                      {labelFor(practicalLanguage)}
                    </span>
                  </>
                )}
                {comparisonLanguages.map((id) => (
                  <React.Fragment key={id}>
                    <span style={styles.langStripPlus}>+</span>
                    <span style={styles.langStripChip}>{labelFor(id)}</span>
                  </React.Fragment>
                ))}
                <span style={styles.langStripGear} aria-hidden="true">
                  <SettingsIcon size={11} />
                </span>
              </button>

              <div style={styles.suggestionsHead}>
                <span style={styles.suggestionsLabel}>Try one of these</span>
                <button
                  type="button"
                  style={styles.shuffleBtn}
                  onClick={() => setSeed((s) => s + 1)}
                  title="Shuffle suggestions"
                  aria-label="Shuffle suggestions"
                >
                  <Shuffle size={11} />
                </button>
              </div>
              <div style={styles.suggestions}>
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    style={styles.suggestionChip}
                    onClick={() => handleSuggestion(s.instruction)}
                    title={s.instruction}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <textarea
                style={styles.textarea}
                value={instruction}
                onChange={(e) => onInstructionChange(e.target.value)}
                placeholder={'e.g. "read a CSV of student grades and print the top 5 averages"'}
                aria-label="Instruction for the program"
              />

              <div style={styles.actions}>
                <button
                  style={{
                    ...styles.generateBtn,
                    ...(aiLoading ? styles.disabledBtn : {}),
                  }}
                  onClick={handleGenerateClick}
                  disabled={aiLoading}
                >
                  {aiLoading
                    ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ marginLeft: 6 }}>Thinking…</span></>
                    : <><Wand2 size={13} /><span style={{ marginLeft: 6 }}>Generate</span></>}
                </button>
              </div>

              {aiError ? (
                <div style={styles.errorCard} role="alert">
                  <div style={styles.errorRow}>
                    <AlertCircle size={13} style={styles.errorIcon} />
                    <div style={styles.errorMessage}>{aiError.message}</div>
                    <button
                      type="button"
                      style={styles.errorClose}
                      onClick={onClearAiError}
                      title="Dismiss"
                      aria-label="Dismiss error"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  {(aiError.kind === 'no-key' || aiError.kind === 'invalid-key') && (
                    <button
                      type="button"
                      style={styles.errorAction}
                      onClick={() => { onClearAiError?.(); onOpenSettings?.(); }}
                    >
                      <SettingsIcon size={11} />
                      <span style={{ marginLeft: 6 }}>Open Settings</span>
                    </button>
                  )}
                </div>
              ) : (
                !aiReady && (
                  <button style={styles.subtleLink} onClick={onOpenSettings}>
                    Add a free Gemini key in Settings for smarter AI generation →
                  </button>
                )
              )}
            </div>
          ) : (
            <div style={styles.lessonsStack}>
              {activeLesson ? (
                <>
                  <ActiveLessonCard
                    lesson={activeLesson}
                    status={lessonStatus}
                    verification={lessonVerification}
                    errorCoaching={lessonErrorCoaching}
                    hasNext={lessonHasNext}
                    onClear={() => onSelectLesson(null)}
                    onResetCode={onResetLessonCode}
                    onRevealSolution={onRevealSolution}
                    onNext={onNextLesson}
                  />
                  <div style={styles.lessonBrowserCard}>
                    <button
                      type="button"
                      style={styles.lessonBrowserToggle}
                      onClick={() => setLessonBrowserOpen((v) => !v)}
                      aria-expanded={lessonBrowserOpen}
                    >
                      <GraduationCap size={12} />
                      <span style={styles.lessonBrowserText}>
                        {lessonBrowserOpen ? 'Hide lesson list' : 'Browse other lessons'}
                      </span>
                      <span style={styles.lessonBrowserMeta}>
                        {completedLessons.length} completed
                      </span>
                    </button>
                    {lessonBrowserOpen && (
                      <div style={styles.lessonBrowserBody}>
                        <LessonsPanel
                          completedLessons={completedLessons}
                          onSelectLesson={onSelectLesson}
                          activeLessonId={activeLesson?.id}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p style={styles.headerHint}>
                    Pick a lesson below. You'll read the concept, then write the code
                    yourself in the editor and run it to check your work.
                  </p>
                  <LessonsPanel
                    completedLessons={completedLessons}
                    onSelectLesson={onSelectLesson}
                    activeLessonId={activeLesson?.id}
                  />
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

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
    borderRight: '1px solid var(--border)',
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
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
  },
  inner: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flex: 1,
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  headerLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  headerHint: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  collapseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },

  tabs: {
    display: 'flex',
    background: 'var(--bg-tertiary)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px 0',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all var(--motion-fast) var(--ease-out)',
  },
  tabActive: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-sm)',
  },

  scrollContent: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  buildStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flex: 1,
  },
  lessonsStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  lessonBrowserCard: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  lessonBrowserToggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '9px 10px',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
  lessonBrowserText: {
    flex: 1,
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  lessonBrowserMeta: {
    color: 'var(--text-muted)',
    fontSize: 10.5,
  },
  lessonBrowserBody: {
    borderTop: '1px solid var(--border)',
    padding: 10,
    background: 'var(--bg-secondary)',
  },

  langStrip: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    textAlign: 'left',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  langStripIntro: {
    color: 'var(--text-muted)',
    fontSize: 11,
    marginRight: 2,
  },
  langStripChip: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 999,
  },
  langStripChipPractical: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--text-secondary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  langStripPlus: {
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  langStripGear: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    display: 'inline-flex',
    alignItems: 'center',
  },

  suggestionsHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  suggestionsLabel: {
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  shuffleBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 4,
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    padding: '5px 10px',
    borderRadius: 999,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },

  textarea: {
    flex: 1,
    minHeight: 200,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: 12,
    resize: 'none',
    outline: 'none',
    lineHeight: 1.55,
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },

  actions: {
    display: 'flex',
    gap: 8,
  },
  generateBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 600,
    padding: '9px 0',
  },
  disabledBtn: {
    background: 'var(--bg-tertiary)',
    borderColor: 'var(--border)',
    color: 'var(--text-muted)',
    opacity: 0.7,
    cursor: 'not-allowed',
  },

  subtleLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    textAlign: 'left',
    padding: 0,
    textDecoration: 'underline',
    textDecorationColor: 'var(--border-strong)',
    textUnderlineOffset: 3,
  },

  // Inline error card surfaced under the Generate button whenever the
  // AI call fails (invalid key, overload, network) OR when we have no
  // way to satisfy a novel prompt (no key + no template match). Kept
  // monochrome to fit the rest of the panel; the AlertCircle icon is
  // the only colour cue.
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: '10px 12px',
  },
  errorRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorIcon: {
    color: '#e06c75',
    flexShrink: 0,
    marginTop: 1,
  },
  errorMessage: {
    flex: 1,
    color: 'var(--text-primary)',
    fontSize: 11.5,
    lineHeight: 1.5,
  },
  errorClose: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 2,
    borderRadius: 4,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  errorAction: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)',
    fontSize: 11.5,
    fontWeight: 500,
    padding: '5px 10px',
    borderRadius: 6,
    cursor: 'pointer',
  },

};
