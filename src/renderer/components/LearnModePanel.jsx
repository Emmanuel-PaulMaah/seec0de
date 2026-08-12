import React from 'react';
import { BookOpen, Play, Wrench, CheckCircle2, Circle, GraduationCap, ArrowRight, ChevronLeft } from 'lucide-react';
import LessonsPanel, { formatLanguage } from './LessonsPanel';
import ActiveLessonCard from './ActiveLessonCard';
import { isCourseActivity } from '../data/exerciseCatalog';

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
        <div style={styles.eyebrow}><GraduationCap size={13} /> Learn</div>
        <div style={styles.headingRow}>
          <h2 ref={headingRef} tabIndex={-1} style={styles.heading}>
            {activeLesson
              ? activeLesson.title
              : catalogLanguage
                ? formatLanguage(catalogLanguage)
                : 'Choose a language'}
          </h2>
          {activeLesson && (
            <button type="button" style={styles.browseBtn} onClick={() => onSelectLesson(null)}>
              <ChevronLeft size={11} /> {activeLesson.kind === 'exercise' ? 'Exercises' : activeLesson.kind === 'project-checkpoint' ? 'Projects' : 'Courses'}
            </button>
          )}
        </div>
        <div style={styles.subheading}>
          {activeLesson
            ? `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} · progress saves automatically`
            : catalogLanguage
              ? 'Choose a course or explore the challenge space.'
              : 'Start with the language you want to learn.'}
        </div>
      </div>

      {activeLesson && !focused && (
        <div style={styles.phaseBar} aria-label="Lesson progress">
          {PHASES.map(({ id, label, icon: Icon }, index) => {
            const selected = id === activePhase;
            const complete = phase === 'complete'
              ? index <= 1
              : PHASES.findIndex((item) => item.id === activePhase) > index;
            return (
              <div
                key={id}
                style={{ ...styles.phase, ...(selected ? styles.phaseSelected : {}), ...(complete ? styles.phaseComplete : {}) }}
                aria-current={selected ? 'step' : undefined}
              >
                {complete && !selected ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                <span>0{index + 1} · {label}</span>
              </div>
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
                focused={focused}
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
                checkpointComplete={checkpointComplete}
                onReflectionChange={onReflectionChange}
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

      <div style={styles.status} role="status" aria-live="polite">
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
  focused = false,
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
      style={{ ...styles.activityCard, ...(focused ? styles.activityCardFocused : {}) }}
      aria-labelledby={`activity-${activity.id}`}
    >
      <div style={styles.activityMeta}>Activity {index + 1} of {total} · {activity.type.replace('-', ' ')}</div>
      <h3 ref={headingRef} tabIndex={-1} id={`activity-${activity.id}`} style={styles.activityTitle}>{activity.title}</h3>
      {activity.instruction && <p style={styles.activityText}>{renderActivityInline(activity.instruction)}</p>}
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
                <span><strong>{stepIndex + 1}.</strong> {renderActivityInline(step)}</span>
              </button>
            );
          })}
          <div style={styles.writingPrompt}>Write each step in the editor, run when useful, then check it off.</div>
        </div>
      )}

      {isDrill && (
        <div style={styles.drillPrompt}>
          <strong>Retrieval drill:</strong> write this from memory in the editor before opening a hint.
          {activity.successCriteria && <span style={styles.drillCriteria}>Done when: {renderActivityInline(activity.successCriteria)}</span>}
        </div>
      )}

      {isPrediction && (
        <div style={styles.predictionGroup}>
          <div style={styles.predictionQuestion}>{renderActivityInline(activity.question)}</div>
          {(activity.choices || []).map((choice) => (
            <button
              key={choice}
              type="button"
              style={{ ...styles.choiceBtn, ...(answer === choice ? styles.choiceBtnSelected : {}) }}
              aria-pressed={answer === choice}
              onClick={() => setAnswer(choice)}
            >
              {renderActivityInline(choice)}
            </button>
          ))}
          {answered && (
            <div style={{ ...styles.predictionFeedback, color: answerCorrect ? 'var(--success)' : 'var(--text-secondary)' }} role="status">
              {answerCorrect ? 'That prediction is right. ' : `The result is ${activity.answer}. `}
              {renderActivityInline(activity.explanation)}
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

function renderActivityInline(text) {
  if (!text) return null;
  return String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} style={styles.inlineCode}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
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
    padding: '15px 16px 12px',
    borderBottom: '1px solid var(--border)',
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
    marginTop: 7,
    color: 'var(--text-primary)',
    fontSize: 15,
    fontWeight: 700,
  },
  headingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  browseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    marginTop: 7,
    padding: '3px 6px',
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 10.5,
  },
  subheading: {
    marginTop: 4,
    color: 'var(--text-muted)',
    fontSize: 11,
    lineHeight: 1.45,
  },
  phaseBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 4,
    padding: 8,
    borderBottom: '1px solid var(--border)',
  },
  phase: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
    padding: '6px 4px',
    borderRadius: 5,
    color: 'var(--text-muted)',
    fontSize: 10.5,
    whiteSpace: 'nowrap',
  },
  phaseSelected: {
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
    fontWeight: 700,
  },
  phaseComplete: {
    color: 'var(--success)',
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
    padding: 12,
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    background: 'var(--bg-elevated)',
  },
  activityCardFocused: {
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
  inlineCode: {
    fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", Consolas, monospace)',
    fontSize: '0.92em',
    padding: '1px 4px',
    border: '1px solid var(--border)',
    borderRadius: 3,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
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
  status: {
    minHeight: 28,
    padding: '7px 12px',
    borderTop: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    lineHeight: 1.35,
  },
};
