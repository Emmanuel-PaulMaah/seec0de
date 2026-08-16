import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, Lightbulb, RotateCcw, Eye, EyeOff, CheckCircle2,
  XCircle, ArrowRight, Info, ListTree, Wrench, Code2, X, Play,
} from 'lucide-react';
import { explainCode, traceCode } from '../engine/codeExplainer';
import { renderInline } from './InlineCode';

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
  errorCoaching = [],
  hasNext = false,
  onResetCode,
  onRevealSolution,
  onClear,
  onNext,
  hintIndex = 0,
  onHintIndexChange,
  showTeaching = true,
  guidanceLevel = 'supported',
  attempts = 0,
  reflection = '',
  check = null,             // { stepId, pass, details } — live step checks
  projectDir = null,        // where this project's files live on disk
  checkpointComplete = false,
  onReflectionChange,
  onCompleteCheckpoint,
  teachingOnly = false,
  onStartExercise,
}) {
  const language = lesson?.language || 'javascript';
  const [solutionShown, setSolutionShown] = useState(false);
  const [examplesShown, setExamplesShown] = useState(false);
  const resultRef = React.useRef(null);

  // Reset hint progression + solution reveal whenever the lesson changes.
  useEffect(() => {
    setSolutionShown(false);
    setExamplesShown(false);
  }, [lesson?.id]);

  useEffect(() => {
    if (status === 'pass' || status === 'fail') resultRef.current?.focus();
  }, [status]);

  if (!lesson) return null;

  const hints = lesson.hints || [];
  const visibleHints = hints.slice(0, hintIndex);
  const hintsRemaining = hintIndex < hints.length;
  const hintsAvailable = guidanceLevel !== 'independent' || status === 'fail';
  const solutionAvailable = guidanceLevel === 'supported'
    || (guidanceLevel === 'guided' && status === 'fail')
    || (guidanceLevel === 'independent' && status === 'fail' && attempts >= 2);
  const isProjectCheckpoint = lesson.kind === 'project-checkpoint';
  const reflectionReady = reflection.trim().length > 0;

  const handleRevealSolution = () => {
    setSolutionShown(true);
    onRevealSolution?.();
  };

  const handleNext = () => {
    if (isProjectCheckpoint && !checkpointComplete) onCompleteCheckpoint?.();
    onNext?.();
  };

  return (
    <div style={{ ...styles.card, ...(teachingOnly ? styles.cardTeaching : {}) }}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onClear} title={lesson.kind === 'exercise' ? 'Back to exercises' : lesson.kind === 'project-checkpoint' ? 'Back to project' : 'Back to all lessons'}>
          <ChevronLeft size={12} />
          <span style={{ marginLeft: 2 }}>{lesson.kind === 'exercise' ? 'Exercises' : lesson.kind === 'project-checkpoint' ? 'Project' : 'Lessons'}</span>
        </button>
        <div style={styles.headerMeta}>
          {lesson.concept && <span style={styles.conceptChip}>{lesson.concept}</span>}
        </div>
      </div>

      {showTeaching && (
        <>
          <h3 style={styles.title}>{lesson.title}</h3>
          {lesson.summary && <p style={styles.summary}>{lesson.summary}</p>}

          {/* Teaching blocks */}
          <div style={styles.teaching}>
            {(lesson.teaching || []).map((block, i) => renderBlock(block, i, language))}
          </div>
        </>
      )}

      {/* Task callout */}
      {!teachingOnly && <div style={styles.taskBox}>
        <div style={styles.taskLabel}>Your turn</div>
        <div style={styles.taskText}>{renderInline(lesson.task)}</div>
        <div style={styles.taskHint}>
          Edit the code in the editor → click <strong>Run</strong> in the toolbar.
        </div>
      </div>}

      {teachingOnly && (
        <button type="button" style={styles.startExerciseBtn} onClick={onStartExercise}>
          <span>Start coding exercise</span>
          <ArrowRight size={13} />
        </button>
      )}

      {/* Project checkpoint — build-style step: target file, example lines,
          and live check status (content checks run as you type; the Run
          verdict still gates completion). */}
      {!teachingOnly && isProjectCheckpoint && (
        <ProjectStepBlock
          lesson={lesson}
          check={check}
          projectDir={projectDir}
          examplesShown={examplesShown}
          onToggleExamples={() => setExamplesShown((v) => !v)}
        />
      )}

      {/* Status footer */}
      {status === 'pass' && (
        <div ref={resultRef} tabIndex={-1} style={{ ...styles.statusBox, ...styles.statusPass }}>
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
        <div ref={resultRef} tabIndex={-1} style={{ ...styles.statusBox, ...styles.statusFail }}>
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

      {status === 'fail' && errorCoaching.length > 0 && (
        <div style={styles.fixCard}>
          <div style={styles.fixHeader}>
            <Wrench size={13} />
            <span>Fix-it coach</span>
          </div>
          {errorCoaching.map((item, index) => (
            <div key={`${item.title || 'fix'}-${index}`} style={styles.fixItem}>
              {item.title && <div style={styles.fixTitle}>{item.title}</div>}
              {item.plain && <div style={styles.fixText}>{renderInline(item.plain)}</div>}
              {Array.isArray(item.fixes) && item.fixes.length > 0 && (
                <ul style={styles.fixList}>
                  {item.fixes.slice(0, 3).map((fix, i) => <li key={i}>{renderInline(fix)}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {!teachingOnly && isProjectCheckpoint && (
        <div style={styles.reflectionBox}>
          <label htmlFor={`reflection-${lesson.id}`} style={styles.reflectionLabel}>Explain one decision</label>
          <div style={styles.reflectionPrompt}>{lesson.reflectionPrompt}</div>
          <textarea
            id={`reflection-${lesson.id}`}
            style={styles.reflectionInput}
            rows={4}
            value={reflection}
            onChange={(event) => onReflectionChange?.(event.target.value)}
            placeholder="Write a short explanation in your own words…"
          />
          {!checkpointComplete && (
            <button
              type="button"
              style={{ ...styles.completeCheckpointBtn, ...(!reflectionReady || status !== 'pass' ? styles.completeCheckpointBtnDisabled : {}) }}
              disabled={!reflectionReady || status !== 'pass'}
              onClick={onCompleteCheckpoint}
            >
              <CheckCircle2 size={13} /> Save reflection & complete
            </button>
          )}
          <div style={styles.reflectionStatus}>
            {checkpointComplete
              ? 'Checkpoint complete — code verified and reflection saved.'
              : status !== 'pass'
                ? 'Run passing code, then save your reflection.'
                : reflectionReady
                  ? 'Ready to complete.'
                  : 'Code passed. Add your reflection to complete this checkpoint.'}
          </div>
        </div>
      )}

      {/* Hints — progressive reveal */}
      {visibleHints.length > 0 && (
        <div style={styles.hintsBox}>
          {visibleHints.map((h, i) => (
            <div key={i} style={styles.hintItem}>
              <Lightbulb size={11} style={{ color: 'var(--algorithm)', flexShrink: 0, marginTop: 2 }} />
              <div style={styles.hintText}>{renderInline(h)}</div>
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
      {!teachingOnly && <div style={styles.actions}>
        {hintsRemaining && hintsAvailable && (
          <button
            style={styles.actionBtn}
            onClick={() => onHintIndexChange?.(hintIndex + 1)}
            title="Show the next hint"
          >
            <Lightbulb size={11} />
            <span>{hintIndex === 0 ? 'Hint' : `Hint ${hintIndex + 1} of ${hints.length}`}</span>
          </button>
        )}
        {!solutionShown && lesson.solution && solutionAvailable && (
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
      </div>}

      {status === 'pass' && hasNext && (
        <button
          style={{ ...styles.nextBtn, ...(isProjectCheckpoint && !reflectionReady ? styles.nextBtnDisabled : {}) }}
          onClick={handleNext}
          disabled={isProjectCheckpoint && !reflectionReady}
        >
          <span>{isProjectCheckpoint ? 'Next checkpoint' : 'Next lesson'}</span>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

// ProjectStepBlock — the build-style step surface for project checkpoints:
// the target file chip, optional example code lines (shown on demand), and
// the live check status from evaluateStep (App.jsx supplies it via `check`).
function ProjectStepBlock({ lesson, check, projectDir, examplesShown, onToggleExamples }) {
  const isCurrent = check && check.stepId === lesson.id;
  const details = isCurrent ? check.details || [] : [];
  const anyPending = details.some((d) => d.pending);
  const failures = details.filter((d) => !d.pass && !d.pending);
  const allPass = details.length > 0 && failures.length === 0 && !anyPending;

  return (
    <div style={styles.stepBox}>
      <div style={styles.stepFileRow}>
        <Code2 size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span style={styles.stepFile} title={projectDir ? `${projectDir}/${lesson.file}` : lesson.file}>
          {lesson.file}
        </span>
        <span style={styles.stepFileNote} title={projectDir || undefined}>
          {projectDir ? `in ${projectDir}` : 'saved in your project folder'}
        </span>
      </div>

      {lesson.examples?.length > 0 && (
        <>
          <button type="button" style={styles.stepExampleBtn} onClick={onToggleExamples}>
            {examplesShown ? <EyeOff size={11} /> : <Code2 size={11} />}
            <span style={{ marginLeft: 4 }}>{examplesShown ? 'Hide example lines' : 'Show example lines'}</span>
          </button>
          {examplesShown && (
            <div style={styles.stepExamples}>
              {lesson.examples.map((ex) => (
                <div key={ex.label} style={styles.stepExample}>
                  <div style={styles.stepExampleLabel}>{ex.label}</div>
                  <pre style={styles.stepExampleCode}>{ex.code}</pre>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isCurrent && details.length > 0 && (
        <div style={styles.stepCheckBox}>
          {allPass && (
            <div style={styles.stepCheckLine}>
              <CheckCircle2 size={11} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span style={{ marginLeft: 6 }}>Code shape checks out.</span>
            </div>
          )}
          {anyPending && (
            <div style={styles.stepCheckLine}>
              <Play size={11} style={{ flexShrink: 0 }} />
              <span style={{ marginLeft: 6 }}>Code shape looks right — press Run to verify the output.</span>
            </div>
          )}
          {failures.map((f) => (
            <div key={f.id} style={styles.stepCheckLine}>
              <X size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ marginLeft: 6 }}>{f.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderBlock(block, key, language) {
  if (!block || !block.type) return null;
  if (block.type === 'p') {
    return <p key={key} style={styles.p}>{renderInline(block.text || '')}</p>;
  }
  if (block.type === 'code') {
    return <TeachingCodeBlock key={key} code={block.text || ''} language={language} />;
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

function TeachingCodeBlock({ code, language = 'javascript' }) {
  const [selectedLine, setSelectedLine] = useState(null);
  const [traceShown, setTraceShown] = useState(false);

  const lines = useMemo(() => String(code || '').split('\n'), [code]);
  const explanations = useMemo(() => explainCode(code, language).lineByLine, [code, language]);
  const trace = useMemo(() => traceCode(code, language), [code, language]);

  const explanationByLine = useMemo(() => {
    const map = new Map();
    let explanationIndex = 0;
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      const item = explanations[explanationIndex];
      if (item) map.set(index, item.explanation);
      explanationIndex += 1;
    });
    return map;
  }, [lines, explanations]);

  const activeExplanation = selectedLine == null ? null : explanationByLine.get(selectedLine);
  const hasTrace = trace.steps.length > 0;

  return (
    <div style={styles.codeShell}>
      <div style={styles.codeLines}>
        {lines.map((line, index) => {
          const hasExplanation = explanationByLine.has(index);
          const active = selectedLine === index;
          return (
            <button
              key={index}
              type="button"
              style={{
                ...styles.codeLineBtn,
                ...(hasExplanation ? styles.codeLineClickable : {}),
                ...(active ? styles.codeLineActive : {}),
              }}
              onClick={() => hasExplanation && setSelectedLine(active ? null : index)}
              disabled={!hasExplanation}
              title={hasExplanation ? 'Explain this line' : undefined}
            >
              <span style={styles.codeLineNo}>{index + 1}</span>
              <span style={styles.codeLineText}>{line || ' '}</span>
            </button>
          );
        })}
      </div>

      {activeExplanation && (
        <div style={styles.lineExplain}>
          <Info size={11} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{activeExplanation}</span>
        </div>
      )}

      {hasTrace && (
        <button
          type="button"
          style={styles.traceToggle}
          onClick={() => setTraceShown((v) => !v)}
        >
          <ListTree size={11} />
          <span>{traceShown ? 'Hide steps' : 'Step through'}</span>
        </button>
      )}

      {traceShown && hasTrace && (
        <div style={styles.traceBox}>
          <div style={styles.traceHeader}>Line-by-line state</div>
          <table style={styles.traceTable}>
            <thead>
              <tr>
                <th style={styles.traceTh}>line</th>
                <th style={styles.traceTh}>what happens</th>
                <th style={styles.traceTh}>state</th>
                <th style={styles.traceTh}>output</th>
              </tr>
            </thead>
            <tbody>
              {trace.steps.map((step, index) => (
                <tr key={index}>
                  <td style={styles.traceTd}>{step.lineNumber}</td>
                  <td style={styles.traceTd}>{step.note}</td>
                  <td style={styles.traceTd}><code>{formatState(step.state)}</code></td>
                  <td style={styles.traceTd}><code>{step.output || '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatState(state) {
  const entries = Object.entries(state || {});
  if (entries.length === 0) return '—';
  return entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ');
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
  cardTeaching: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    padding: 0,
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
  codeShell: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  codeLines: {
    display: 'flex',
    flexDirection: 'column',
  },
  codeLineBtn: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr',
    gap: 8,
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    textAlign: 'left',
    padding: '1px 10px',
    cursor: 'default',
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    fontSize: 11.5,
    lineHeight: 1.5,
  },
  codeLineClickable: {
    cursor: 'pointer',
  },
  codeLineActive: {
    background: 'var(--algorithm-soft)',
  },
  codeLineNo: {
    color: 'var(--text-muted)',
    userSelect: 'none',
    textAlign: 'right',
  },
  codeLineText: {
    whiteSpace: 'pre',
    overflowX: 'auto',
  },
  lineExplain: {
    display: 'flex',
    gap: 6,
    borderTop: '1px solid var(--border)',
    padding: '7px 10px',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    lineHeight: 1.45,
  },
  traceToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    margin: '7px 10px 9px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: 999,
    padding: '4px 9px',
    fontSize: 11,
    cursor: 'pointer',
  },
  traceBox: {
    borderTop: '1px solid var(--border)',
    padding: 10,
    overflowX: 'auto',
  },
  traceHeader: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'var(--text-muted)',
    fontWeight: 700,
    marginBottom: 6,
  },
  traceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  },
  traceTh: {
    color: 'var(--text-muted)',
    fontWeight: 700,
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    padding: '4px 6px',
  },
  traceTd: {
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
    padding: '5px 6px',
    verticalAlign: 'top',
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
  fixCard: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    borderRadius: 6,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fixHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--algorithm)',
    fontSize: 12,
    fontWeight: 700,
  },
  fixItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fixTitle: {
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 700,
  },
  fixText: {
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    lineHeight: 1.45,
  },
  fixList: {
    margin: '2px 0 0 16px',
    padding: 0,
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    lineHeight: 1.45,
  },
  reflectionBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    padding: 11,
    border: '1px solid var(--border-strong)',
    borderRadius: 7,
    background: 'var(--bg-tertiary)',
  },
  reflectionLabel: { color: 'var(--text-primary)', fontSize: 11, fontWeight: 700 },
  reflectionPrompt: { color: 'var(--text-secondary)', fontSize: 10.5, lineHeight: 1.45 },
  reflectionInput: {
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    padding: 8,
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    font: 'inherit',
    fontSize: 11,
    lineHeight: 1.45,
  },
  completeCheckpointBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '7px 9px',
    border: 0,
    borderRadius: 5,
    background: 'var(--success)',
    color: 'var(--bg-primary)',
    fontSize: 10.5,
    fontWeight: 700,
  },
  completeCheckpointBtnDisabled: { opacity: 0.42, cursor: 'not-allowed' },
  reflectionStatus: { color: 'var(--text-muted)', fontSize: 9.5, lineHeight: 1.4 },
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
    color: 'var(--text-on-accent, #fff)',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '8px 0',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 4,
  },
  startExerciseBtn: {
    alignSelf: 'flex-end',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 8,
    padding: '9px 14px',
    border: 'none',
    borderRadius: 6,
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    fontSize: 12,
    fontWeight: 700,
  },
  nextBtnDisabled: { opacity: 0.42, cursor: 'not-allowed' },
  stepBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 10,
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    background: 'var(--bg-tertiary)',
  },
  stepFileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  stepFile: {
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    fontSize: 10.5,
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '1px 6px',
    background: 'var(--bg-elevated)',
  },
  stepFileNote: { fontSize: 9.5, color: 'var(--text-muted)' },
  stepExampleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 10.5,
    fontWeight: 500,
    padding: '4px 9px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  stepExamples: { display: 'flex', flexDirection: 'column', gap: 7 },
  stepExample: { display: 'flex', flexDirection: 'column', gap: 3 },
  stepExampleLabel: {
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  stepExampleCode: {
    margin: 0,
    padding: 7,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    fontSize: 10.5,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowX: 'auto',
  },
  stepCheckBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    paddingTop: 2,
  },
  stepCheckLine: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: 10.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
};
