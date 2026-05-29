import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Lightbulb, RotateCcw, Eye, CheckCircle2,
  XCircle, ArrowRight, Info,
} from 'lucide-react';

// ActiveLessonCard — the rich teaching view that replaces the
// instruction textarea while a lesson is active.
//
// Renders the lesson's teaching blocks (paragraphs + code samples +
// notes), the task, and a status footer that flips green/red after each
// Run. Hints are progressive (one click = next hint); the solution is
// hidden behind a deliberate Reveal click so the learner gets one more
// chance to try first.
//
// All keyboard-y behaviour (Run + verify) lives in App.jsx; this
// component only renders + emits intent callbacks.

export default function ActiveLessonCard({
  lesson,
  status = 'idle',       // 'idle' | 'pass' | 'fail'
  verification = null,   // { pass, expected, actual, reason } from lessonVerifier
  hasNext = false,
  onResetCode,
  onRevealSolution,
  onClear,
  onNext,
}) {
  const [hintIndex, setHintIndex] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);

  // Reset hint progression + solution reveal whenever the lesson changes.
  useEffect(() => {
    setHintIndex(0);
    setSolutionShown(false);
  }, [lesson?.id]);

  if (!lesson) return null;

  const hints = lesson.hints || [];
  const visibleHints = hints.slice(0, hintIndex);
  const hintsRemaining = hintIndex < hints.length;

  const handleRevealSolution = () => {
    setSolutionShown(true);
    onRevealSolution?.();
  };

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onClear} title="Back to all lessons">
          <ChevronLeft size={12} />
          <span style={{ marginLeft: 2 }}>Lessons</span>
        </button>
        <div style={styles.headerMeta}>
          {lesson.concept && <span style={styles.conceptChip}>{lesson.concept}</span>}
        </div>
      </div>

      <h3 style={styles.title}>{lesson.title}</h3>
      {lesson.summary && <p style={styles.summary}>{lesson.summary}</p>}

      {/* Teaching blocks */}
      <div style={styles.teaching}>
        {(lesson.teaching || []).map((block, i) => renderBlock(block, i))}
      </div>

      {/* Task callout */}
      <div style={styles.taskBox}>
        <div style={styles.taskLabel}>Your turn</div>
        <div style={styles.taskText}>{lesson.task}</div>
        <div style={styles.taskHint}>
          Edit the code in the editor → click <strong>Run</strong> in the toolbar.
        </div>
      </div>

      {/* Status footer */}
      {status === 'pass' && (
        <div style={{ ...styles.statusBox, ...styles.statusPass }}>
          <CheckCircle2 size={14} />
          <div style={styles.statusBody}>
            <div style={styles.statusTitle}>Nailed it.</div>
            <div style={styles.statusText}>
              Your output matched what the lesson expected.
            </div>
          </div>
        </div>
      )}

      {status === 'fail' && verification && (
        <div style={{ ...styles.statusBox, ...styles.statusFail }}>
          <XCircle size={14} />
          <div style={styles.statusBody}>
            <div style={styles.statusTitle}>Not quite.</div>
            <div style={styles.statusText}>{verification.reason}</div>
            <div style={styles.diffRow}>
              <div style={styles.diffLabel}>expected</div>
              <pre style={styles.diffBlock}>{verification.expected || '(nothing)'}</pre>
            </div>
            <div style={styles.diffRow}>
              <div style={styles.diffLabel}>your output</div>
              <pre style={styles.diffBlock}>{verification.actual || '(nothing)'}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Hints — progressive reveal */}
      {visibleHints.length > 0 && (
        <div style={styles.hintsBox}>
          {visibleHints.map((h, i) => (
            <div key={i} style={styles.hintItem}>
              <Lightbulb size={11} style={{ color: 'var(--algorithm)', flexShrink: 0, marginTop: 2 }} />
              <div style={styles.hintText}>{h}</div>
            </div>
          ))}
        </div>
      )}

      {/* Solution reveal */}
      {solutionShown && lesson.solution && (
        <div style={styles.solutionBox}>
          <div style={styles.solutionLabel}>Solution</div>
          <pre style={styles.solutionCode}>{lesson.solution}</pre>
          <div style={styles.solutionHint}>
            <Info size={11} />
            <span>Click <strong>Reset code</strong> below if you want to wipe the editor and type this in yourself.</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        {hintsRemaining && (
          <button
            style={styles.actionBtn}
            onClick={() => setHintIndex((n) => n + 1)}
            title="Show the next hint"
          >
            <Lightbulb size={11} />
            <span>{hintIndex === 0 ? 'Hint' : `Hint ${hintIndex + 1} of ${hints.length}`}</span>
          </button>
        )}
        {!solutionShown && lesson.solution && (
          <button
            style={styles.actionBtn}
            onClick={handleRevealSolution}
            title="Reveal the solution"
          >
            <Eye size={11} />
            <span>Solution</span>
          </button>
        )}
        <button
          style={styles.actionBtn}
          onClick={onResetCode}
          title="Restore the starter code"
        >
          <RotateCcw size={11} />
          <span>Reset code</span>
        </button>
      </div>

      {status === 'pass' && hasNext && (
        <button style={styles.nextBtn} onClick={onNext}>
          <span>Next lesson</span>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

function renderBlock(block, key) {
  if (!block || !block.type) return null;
  if (block.type === 'p') {
    return <p key={key} style={styles.p}>{renderInline(block.text || '')}</p>;
  }
  if (block.type === 'code') {
    return <pre key={key} style={styles.code}>{block.text || ''}</pre>;
  }
  if (block.type === 'note') {
    return (
      <div key={key} style={styles.note}>
        <Info size={11} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
        <span>{renderInline(block.text || '')}</span>
      </div>
    );
  }
  return null;
}

// Tiny inline renderer for lesson copy. Supports:
//   `code`     → styled <code> span
//   **bold**   → <strong>
// Returns an array of React nodes, never raw HTML — no dangerouslySetInnerHTML
// so untrusted text in lesson JSON can never become injected markup.
function renderInline(text) {
  if (!text) return null;
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return <code key={i} style={styles.inlineCode}>{tok.slice(1, -1)}</code>;
    }
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    padding: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 11,
    padding: '2px 4px',
    cursor: 'pointer',
    borderRadius: 4,
  },
  headerMeta: {
    display: 'flex',
    gap: 4,
  },
  conceptChip: {
    background: 'var(--algorithm-soft)',
    color: 'var(--text-primary)',
    fontSize: 10.5,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    letterSpacing: 0.3,
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '2px 0 0',
  },
  summary: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
    margin: 0,
  },
  teaching: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  p: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
    margin: 0,
  },
  code: {
    fontSize: 11.5,
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '8px 10px',
    borderRadius: 6,
    margin: 0,
    overflowX: 'auto',
    lineHeight: 1.5,
    whiteSpace: 'pre',
  },
  inlineCode: {
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    fontSize: '0.92em',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '1px 5px',
    borderRadius: 3,
  },
  note: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: 11.5,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    background: 'transparent',
    borderLeft: '2px solid var(--border-strong)',
    paddingLeft: 8,
  },
  taskBox: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderLeft: '3px solid var(--algorithm)',
    borderRadius: 6,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  taskLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'var(--algorithm)',
    fontWeight: 700,
  },
  taskText: {
    fontSize: 12.5,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  taskHint: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  statusBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: 10,
  },
  statusPass: {
    background: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    color: 'var(--success, #4ade80)',
  },
  statusFail: {
    background: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    color: 'var(--danger, #f87171)',
  },
  statusBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: 700,
  },
  statusText: {
    fontSize: 11.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
  diffRow: {
    marginTop: 4,
  },
  diffLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'var(--text-muted)',
    marginBottom: 2,
  },
  diffBlock: {
    fontSize: 11.5,
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '6px 8px',
    color: 'var(--text-primary)',
    margin: 0,
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
  hintsBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: 'var(--bg-tertiary)',
    border: '1px dashed var(--border-strong)',
    borderRadius: 6,
    padding: 10,
  },
  hintItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: 11.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  hintText: { flex: 1 },
  solutionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: 10,
  },
  solutionLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: 'var(--text-muted)',
    fontWeight: 700,
  },
  solutionCode: {
    fontSize: 11.5,
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '8px 10px',
    borderRadius: 4,
    margin: 0,
    overflowX: 'auto',
    whiteSpace: 'pre',
    lineHeight: 1.5,
  },
  solutionHint: {
    display: 'flex',
    gap: 6,
    fontSize: 11,
    color: 'var(--text-muted)',
    alignItems: 'flex-start',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    padding: '4px 9px',
    borderRadius: 999,
    cursor: 'pointer',
  },
  nextBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'var(--accent, #2563eb)',
    border: 'none',
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '8px 0',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 4,
  },
};
