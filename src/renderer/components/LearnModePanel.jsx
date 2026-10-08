import React from 'react';
import { BookOpen, Play, Wrench, CheckCircle2, Circle, GraduationCap, ArrowRight, ChevronLeft, MessageSquareText } from 'lucide-react';
import LessonsPanel, { formatLanguage } from './LessonsPanel';
import ActiveLessonCard from './ActiveLessonCard';
import { isCourseActivity } from '../data/exerciseCatalog';
import { renderInline as renderActivityInline } from './InlineCode';

const PHASES = [
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'run', label: 'Run', icon: Play },
  { id: 'fix', label: 'Fix', icon: Wrench },
];
export const WRITING_ACTIVITY_TYPES = new Set(['code-along', 'drill', 'edit']);

export const TEACHING_STEP_ID = '__teaching__';

export default function LearnModePanel({
  activeLesson,
  phase = 'learn',
  completedLessons = [],
  lessonStatus = 'idle',
  lessonVerification = null,
  lessonErrorCoaching = [],
  lessonHasNext = false,
  attempts = 0,
  revealedHints = 0,
  activeActivityId = null,
  guidanceLevel = 'supported',
  guidanceSuccessStreak = 0,
  reflection = '',
  lessonCheck = null,
  learnProjectDir = null,
  checkpointComplete = false,
  announcement = '',
  onSelectLesson,
  onResetLessonCode,
  onRevealSolution,
  onHintIndexChange,
  onActivityChange,
  onGuidanceChange,
  onGuidanceSuggestionLater,
  onReflectionChange,
  conceptNote = '',
  onConceptNoteChange,
  onSaveConceptNote,
  allConceptNotes = {},
  onCompleteCheckpoint,
  onNextLesson,
  onStartExercise,
  focused = false,
}) {
  const headingRef = React.useRef(null);
  const mountedRef = React.useRef(false);
  const [catalogLanguage, setCatalogLanguage] = React.useState(activeLesson?.language || null);
  const activePhase = phase === 'complete' ? 'run' : phase;
  const allActivities = activeLesson?.kind === 'exercise'
    ? activeLesson?.activities || []
    : (activeLesson?.activities || []).filter(isCourseActivity);
  const activities = guidanceLevel === 'supported'
    ? allActivities
    : guidanceLevel === 'guided'
      ? allActivities.filter((activity) => activity.type !== 'worked-example')
      : allActivities.filter((activity) => WRITING_ACTIVITY_TYPES.has(activity.type));
  const showingTeaching = activeActivityId === TEACHING_STEP_ID;
  const activityIndex = showingTeaching
    ? -1
    : Math.max(0, activities.findIndex((activity) => activity.id === activeActivityId));
  const activeActivity = showingTeaching ? null : (activities[activityIndex] || null);
  const nextActivity = showingTeaching ? (activities[0] || null) : (activities[activityIndex + 1] || null);
  const showLessonCard = phase !== 'learn' || !activeActivity;
  const nextGuidanceLevel = guidanceLevel === 'supported'
    ? 'guided'
    : guidanceLevel === 'guided'
      ? 'independent'
      : null;
  const suggestLessGuidance = phase === 'complete' && guidanceSuccessStreak >= 3 && nextGuidanceLevel;

  React.useEffect(() => {
    if (!mountedRef.current || !activeLesson) headingRef.current?.focus();
    mountedRef.current = true;
  }, [activeLesson?.id]);

  React.useEffect(() => {
    if (activeLesson?.language) setCatalogLanguage(activeLesson.language);
  }, [activeLesson?.language]);

  return (
    <aside style={{ ...styles.panel, ...(focused ? styles.panelFocused : {}) }} aria-label="Learn guide">
      <div style={styles.header}>
        {activeLesson ? (
          <>
            <div style={styles.headerTopRow}>
              <button type="button" style={styles.browseBtn} onClick={() => onSelectLesson(null)}>
                <ChevronLeft size={11} /> {activeLesson.kind === 'exercise' ? 'Exercises' : activeLesson.kind === 'project-checkpoint' ? 'Projects' : 'Courses'}
              </button>
              {activeLesson.concept && <span style={styles.conceptChip}>{activeLesson.concept}</span>}
            </div>
            <h2 ref={headingRef} tabIndex={-1} style={styles.heading}>{activeLesson.title}</h2>
            {attempts > 0 && (
              <div style={styles.subheading}>
                {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={styles.eyebrow}><GraduationCap size={13} /> Learn</div>
            <h2 ref={headingRef} tabIndex={-1} style={styles.heading}>
              {catalogLanguage ? formatLanguage(catalogLanguage) : 'Choose a language'}
            </h2>
            <div style={styles.subheading}>
              {catalogLanguage
                ? 'Choose a course or explore the challenge space.'
                : 'Start with the language you want to learn.'}
            </div>
          </>
        )}
      </div>

      {activeLesson && !focused && (
        <div style={styles.phaseBar} aria-label="Lesson progress">
          {PHASES.map(({ id, label, icon: Icon }, index) => {
            const selected = id === activePhase;
            const complete = phase === 'complete'
              ? index <= 1
              : PHASES.findIndex((item) => item.id === activePhase) > index;
            return (
              <React.Fragment key={id}>
                {index > 0 && <div style={styles.phaseLine} aria-hidden="true" />}
                <div
                  style={{ ...styles.phase, ...(selected ? styles.phaseSelected : {}), ...(complete ? styles.phaseComplete : {}) }}
                  aria-current={selected ? 'step' : undefined}
                >
                  {complete && !selected ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                  <span>{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div style={{ ...styles.content, ...(focused ? styles.contentFocused : {}) }}>
        {activeLesson ? (
          <div style={{ ...styles.lessonStack, ...(focused ? styles.lessonStackFocused : {}) }}>
            {activeActivity && (phase === 'learn' || WRITING_ACTIVITY_TYPES.has(activeActivity.type)) && (
              <ActivityGuide
                activity={activeActivity}
                index={activityIndex}
                total={activities.length}
                onBack={phase === 'learn' && activityIndex > 0
                  ? () => onActivityChange?.(activities[activityIndex - 1].id)
                  : null}
                onContinue={phase !== 'learn'
                  ? null
                  : nextActivity && !WRITING_ACTIVITY_TYPES.has(nextActivity.type)
                    ? () => onActivityChange?.(nextActivity.id)
                    : () => {
                      if (nextActivity) onActivityChange?.(nextActivity.id);
                      onStartExercise?.();
                    }}
                continueLabel={nextActivity && !WRITING_ACTIVITY_TYPES.has(nextActivity.type) ? 'Continue' : 'Start coding'}
                allowContinue={phase === 'learn' && WRITING_ACTIVITY_TYPES.has(activeActivity.type)}
              />
            )}
            {showLessonCard && (
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
                hintIndex={revealedHints}
                onHintIndexChange={onHintIndexChange}
                showTeaching={!activeActivity}
                guidanceLevel={guidanceLevel}
                attempts={attempts}
                reflection={reflection}
                check={lessonCheck}
                projectDir={learnProjectDir}
                checkpointComplete={checkpointComplete}
                onReflectionChange={onReflectionChange}
                conceptNote={conceptNote}
                onConceptNoteChange={onConceptNoteChange}
                onSaveConceptNote={onSaveConceptNote}
                onCompleteCheckpoint={onCompleteCheckpoint}
                teachingOnly={phase === 'learn'}
                onStartExercise={showingTeaching
                  ? () => onActivityChange?.(activities[0]?.id || null) : onStartExercise}
              />
            )}
            {suggestLessGuidance && (
              <div style={styles.fadeSuggestion} role="status">
                <div style={styles.fadeSuggestionTitle}>Ready for less guidance?</div>
                <div style={styles.fadeSuggestionText}>
                  You completed three new lessons without hints. Try {nextGuidanceLevel} guidance? You can switch back at any time.
                </div>
                <div style={styles.fadeSuggestionActions}>
                  <button type="button" style={styles.fadeAcceptBtn} onClick={() => onGuidanceChange?.(nextGuidanceLevel)}>
                    Use {nextGuidanceLevel}
                  </button>
                  <button type="button" style={styles.fadeLaterBtn} onClick={onGuidanceSuggestionLater}>
                    Not now
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {!catalogLanguage && (
              <div style={styles.intro}>
                Each language has guided courses now and a home for focused challenges as the library grows.
              </div>
            )}
            {catalogLanguage && Object.keys(allConceptNotes).length > 0 && (
              <ConceptNotesSummary notes={allConceptNotes} language={catalogLanguage} />
            )}
            <LessonsPanel
              completedLessons={completedLessons}
              onSelectLesson={onSelectLesson}
              activeLessonId={null}
              selectedLanguage={catalogLanguage}
              onSelectLanguage={setCatalogLanguage}
            />
          </>
        )}
      </div>

      <div
        style={{ ...styles.status, ...(announcement ? null : styles.statusIdle) }}
        role="status"
        aria-live="polite"
      >
        {announcement}
      </div>
    </aside>
  );
}

function ActivityGuide({
  activity,
  index,
  total,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  allowContinue = false,
}) {
  const [answer, setAnswer] = React.useState(null);
  const [checkedSteps, setCheckedSteps] = React.useState([]);
  const headingRef = React.useRef(null);

  React.useEffect(() => {
    setAnswer(null);
    setCheckedSteps([]);
    headingRef.current?.focus();
  }, [activity.id]);

  const isPrediction = activity.type === 'prediction';
  const isCodeAlong = activity.type === 'code-along';
  const isDrill = activity.type === 'drill';
  // Inline code stays click-to-insert only on coding activities (code-along,
  // drill, edit). Read-only activities (worked-example, prediction) get a
  // static chip — pasting a token into the editor isn't part of those.
  const inlineInteractive = WRITING_ACTIVITY_TYPES.has(activity.type);
  const answered = answer !== null;
  const answerCorrect = answered && answer === activity.answer;
  const steps = activity.steps || [];
  const canContinue = allowContinue || (isPrediction
    ? answered
    : isCodeAlong && steps.length > 0
      ? checkedSteps.length === steps.length
      : true);

  const toggleStep = (stepIndex) => {
    setCheckedSteps((current) => current.includes(stepIndex)
      ? current.filter((item) => item !== stepIndex)
      : [...current, stepIndex]);
  };

  return (
    <section
      style={styles.activityCard}
      aria-labelledby={`activity-${activity.id}`}
    >
      <div style={styles.activityMeta}>Activity {index + 1} of {total} · {activity.type.replace('-', ' ')}</div>
      <h3 ref={headingRef} tabIndex={-1} id={`activity-${activity.id}`} style={styles.activityTitle}>{activity.title}</h3>
      {activity.instruction && <p style={styles.activityText}>{renderActivityInline(activity.instruction, { interactive: inlineInteractive })}</p>}
      {activity.example && <pre style={styles.activityCode}>{activity.example}</pre>}

      {isCodeAlong && steps.length > 0 && (
        <div style={styles.codeAlongSteps} aria-label="Code-along steps">
          {steps.map((step, stepIndex) => {
            const checked = checkedSteps.includes(stepIndex);
            return (
              <button
                key={`${activity.id}-step-${stepIndex}`}
                type="button"
                style={{ ...styles.codeAlongStep, ...(checked ? styles.codeAlongStepChecked : {}) }}
                aria-pressed={checked}
                onClick={() => toggleStep(stepIndex)}
              >
                {checked ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                <span><strong>{stepIndex + 1}.</strong> {renderActivityInline(step, { interactive: inlineInteractive })}</span>
              </button>
            );
          })}
          <div style={styles.writingPrompt}>Write each step in the editor, run when useful, then check it off.</div>
        </div>
      )}

      {isDrill && (
        <div style={styles.drillPrompt}>
          <strong>Retrieval drill:</strong> write this from memory in the editor before opening a hint.
          {activity.successCriteria && <span style={styles.drillCriteria}>Done when: {renderActivityInline(activity.successCriteria, { interactive: inlineInteractive })}</span>}
        </div>
      )}

      {isPrediction && (
        <div style={styles.predictionGroup}>
          <div style={styles.predictionQuestion}>{renderActivityInline(activity.question, { interactive: inlineInteractive })}</div>
          {(activity.choices || []).map((choice) => (
            <button
              key={choice}
              type="button"
              style={{ ...styles.choiceBtn, ...(answer === choice ? styles.choiceBtnSelected : {}) }}
              aria-pressed={answer === choice}
              onClick={() => setAnswer(choice)}
            >
              {renderActivityInline(choice, { interactive: inlineInteractive })}
            </button>
          ))}
          {answered && (
            <div style={{ ...styles.predictionFeedback, color: answerCorrect ? 'var(--success)' : 'var(--text-secondary)' }} role="status">
              {answerCorrect ? 'That prediction is right. ' : `The result is ${activity.answer}. `}
              {renderActivityInline(activity.explanation, { interactive: inlineInteractive })}
            </div>
          )}
        </div>
      )}

      {(onBack || (onContinue && canContinue)) && (
        <div style={styles.activityActions}>
          {onBack && (
            <button type="button" style={styles.backActivityBtn} onClick={onBack}>
              <ChevronLeft size={12} /> Previous
            </button>
          )}
          {onContinue && canContinue && (
            <button type="button" style={styles.continueBtn} onClick={onContinue}>
              {continueLabel} <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ConceptNotesSummary — small expandable section in the catalog showing
// saved self-explanation notes for the selected language.
function ConceptNotesSummary({ notes, language }) {
  const [expanded, setExpanded] = React.useState(false);
  const noteEntries = Object.entries(notes).filter(([id]) => {
    const prefix = language.slice(0, 2).toLowerCase();
    return id.startsWith(prefix + '-');
  });
  if (noteEntries.length === 0) return null;

  return (
    <div style={styles.notesSummary}>
      <button
        type="button"
        style={styles.notesToggle}
        onClick={() => setExpanded((v) => !v)}
      >
        <MessageSquareText size={12} />
        <span>{noteEntries.length} concept {noteEntries.length === 1 ? 'note' : 'notes'} saved</span>
        <span style={styles.notesChevron}>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div style={styles.notesList}>
          {noteEntries.map(([id, text]) => (
            <div key={id} style={styles.noteItem}>
              <div style={styles.noteId}>{id}</div>
              <div style={styles.noteText}>{text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
  },
  panelFocused: { borderRight: 'none' },
  header: {
    padding: '12px 14px 11px',
    borderBottom: '1px solid var(--border)',
  },
  headerTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },
  conceptChip: {
    background: 'var(--algorithm-soft)',
    color: 'var(--text-primary)',
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    letterSpacing: 0.3,
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '60%',
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--accent)',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heading: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 14.5,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  browseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 7px',
    marginLeft: -7,
    border: '1px solid transparent',
    borderRadius: 5,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    cursor: 'pointer',
  },
  subheading: {
    marginTop: 5,
    color: 'var(--text-muted)',
    fontSize: 11,
    lineHeight: 1.45,
  },
  phaseBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 14px',
    borderBottom: '1px solid var(--border)',
  },
  phase: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 0',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  phaseSelected: {
    color: 'var(--text-primary)',
    fontWeight: 700,
  },
  phaseComplete: {
    color: 'var(--success)',
  },
  phaseLine: {
    flex: 1,
    height: 1,
    minWidth: 10,
    background: 'var(--border-strong)',
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: 12,
  },
  contentFocused: { padding: 'clamp(18px, 4vw, 48px)' },
  lessonStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  lessonStackFocused: { width: '100%' },
  fadeSuggestion: {
    padding: 11,
    border: '1px solid var(--accent)',
    borderRadius: 8,
    background: 'var(--accent-soft)',
  },
  fadeSuggestionTitle: {
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 700,
  },
  fadeSuggestionText: {
    marginTop: 4,
    color: 'var(--text-secondary)',
    fontSize: 11,
    lineHeight: 1.45,
  },
  fadeSuggestionActions: {
    display: 'flex',
    gap: 6,
    marginTop: 9,
  },
  fadeAcceptBtn: {
    flex: 1,
    padding: '6px 8px',
    border: 'none',
    borderRadius: 5,
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    fontSize: 10.5,
    fontWeight: 700,
  },
  fadeLaterBtn: {
    padding: '6px 8px',
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 10.5,
  },
  activityCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    border: 'none',
    borderRadius: 0,
    background: 'transparent',
  },
  activityMeta: {
    color: 'var(--accent)',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activityTitle: {
    margin: '7px 0 0',
    color: 'var(--text-primary)',
    fontSize: 14,
  },
  activityText: {
    margin: '7px 0 0',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    lineHeight: 1.5,
  },
  activityCode: {
    margin: '9px 0 0',
    padding: '8px 9px',
    overflowX: 'auto',
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 11,
    lineHeight: 1.45,
  },
  codeAlongSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 10,
  },
  codeAlongStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 7,
    width: '100%',
    padding: '7px 8px',
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    lineHeight: 1.4,
    textAlign: 'left',
  },
  codeAlongStepChecked: {
    borderColor: 'var(--success)',
    color: 'var(--text-muted)',
  },
  writingPrompt: {
    color: 'var(--text-muted)',
    fontSize: 10.5,
    lineHeight: 1.4,
  },
  drillPrompt: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 10,
    padding: '8px 9px',
    borderLeft: '3px solid var(--algorithm)',
    borderRadius: 4,
    background: 'var(--algorithm-soft)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    lineHeight: 1.45,
  },
  drillCriteria: {
    color: 'var(--text-muted)',
    fontSize: 10.5,
  },
  predictionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 10,
  },
  predictionQuestion: {
    color: 'var(--text-primary)',
    fontSize: 11.5,
    fontWeight: 600,
    lineHeight: 1.45,
  },
  choiceBtn: {
    padding: '7px 8px',
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    textAlign: 'left',
  },
  choiceBtnSelected: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
  },
  predictionFeedback: {
    padding: '7px 8px',
    borderLeft: '2px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    fontSize: 11,
    lineHeight: 1.45,
  },
  continueBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flex: 1,
    padding: '7px 10px',
    border: 'none',
    borderRadius: 5,
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    fontSize: 11.5,
    fontWeight: 700,
  },
  activityActions: {
    display: 'flex',
    gap: 6,
    marginTop: 10,
  },
  backActivityBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: '7px 9px',
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
  },
  intro: {
    marginBottom: 16,
    padding: 10,
    border: '1px solid var(--border)',
    borderRadius: 7,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    lineHeight: 1.5,
  },
  notesSummary: {
    marginBottom: 12,
    border: '1px solid var(--border)',
    borderRadius: 7,
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  notesToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 11,
    cursor: 'pointer',
  },
  notesChevron: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    fontSize: 10,
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid var(--border)',
  },
  noteItem: {
    padding: '7px 10px',
    borderBottom: '1px solid var(--border)',
  },
  noteId: {
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", monospace)',
    fontSize: 9.5,
    color: 'var(--text-muted)',
    marginBottom: 2,
  },
  noteText: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  status: {
    padding: '7px 14px',
    borderTop: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  statusIdle: {
    display: 'none',
  },
};
