import React from 'react';
import {
  Sparkles, Loader, Settings as SettingsIcon, Wand2,
  ChevronLeft, ChevronRight, MessageSquareCode,
} from 'lucide-react';
import { hasApiKey } from '../engine/aiService';

// InstructionPanel — the first column of the workspace.
//
// Beginner-first redesign: the language picker has moved into the
// Settings drawer (gear icon in the title bar), because the practical +
// comparison languages were already chosen during onboarding. What's
// left here is just *the question*: "what do you want the program to do?"
// plus the two ways to answer it — the offline template generator and
// the AI generator.
//
// The languages strip at the top is now a passive read-out, not a
// control. It tells the learner which languages will appear as tabs in
// the next column, and links to Settings to change that.
//
// v2.4: The whole panel is collapsible. Collapsed, it becomes a 32 px
// vertical rail showing a chevron + "INSTRUCTION" so the learner can
// re-summon it without losing screen real-estate to the live preview.

const LANGUAGE_LABELS = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++',
  csharp: 'C#', go: 'Go', rust: 'Rust', typescript: 'TypeScript', c: 'C',
};

function labelFor(id) {
  return LANGUAGE_LABELS[id] || id;
}

export default function InstructionPanel({
  instruction,
  onInstructionChange,
  onGenerate,
  onAiGenerate,
  aiLoading,
  practicalLanguage,
  comparisonLanguages = [],
  onOpenSettings,
  collapsed = false,
  onToggleCollapsed,
}) {
  const aiReady = hasApiKey();

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
            <p style={styles.headerHint}>
              Describe what you want the program to do, in plain English.
            </p>
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

        {/* Read-out: which languages will be generated */}
        <button style={styles.langStrip} onClick={onOpenSettings} title="Manage languages in Settings">
          <span style={styles.langStripIntro}>You'll see this in</span>
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

        {/* The question */}
        <textarea
          style={styles.textarea}
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder={'e.g. "read a CSV of student grades and print the top 5 averages"'}
          aria-label="Instruction for the program"
        />

        {/* Two paths to an answer */}
        <div style={styles.actions}>
          <button style={styles.generateBtn} onClick={onGenerate} title="Use built-in templates (no AI required)">
            <Wand2 size={13} />
            <span style={{ marginLeft: 6 }}>Generate</span>
          </button>
          <button
            style={{
              ...styles.generateBtn,
              ...styles.aiBtn,
              ...(aiLoading || !aiReady ? styles.disabledBtn : {}),
            }}
            onClick={onAiGenerate}
            disabled={aiLoading || !aiReady}
            title={
              !aiReady
                ? 'Add your Gemini API key in Settings to enable AI Generate'
                : aiLoading ? 'AI is thinking…' : 'Generate with Gemini'
            }
          >
            {aiLoading
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ marginLeft: 6 }}>Thinking…</span></>
              : <><Sparkles size={13} /><span style={{ marginLeft: 6 }}>AI Generate</span></>}
          </button>
        </div>

        {!aiReady && (
          <button style={styles.subtleLink} onClick={onOpenSettings}>
            Add a free Gemini key in Settings to unlock AI →
          </button>
        )}

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
    width: 320,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflow: 'auto',
  },
  inner: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flex: 1,
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
  aiBtn: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-strong)',
    color: 'var(--text-primary)',
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
};
