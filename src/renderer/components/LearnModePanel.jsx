import React from 'react';
import { BookOpen, Play, Wrench, CheckCircle2, GraduationCap, ArrowRight, ChevronLeft } from 'lucide-react';
import LessonsPanel from './LessonsPanel';
import ActiveLessonCard from './ActiveLessonCard';

const PHASES = [
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'run', label: 'Run', icon: Play },
  { id: 'fix', label: 'Fix', icon: Wrench },
];
const GUIDANCE_LEVELS = ['supported', 'guided', 'independent'];

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
  announcement = '',
  onSelectLesson,
  onResetLessonCode,
  onRevealSolution,
  onHintIndexChange,
  onActivityChange,
  onGuidanceChange,
  onGuidanceSuggestionLater,
  onNextLesson,
}) {
  const headingRef = React.useRef(null);
  const mountedRef = React.useRef(false);
  const activePhase = phase === 'complete' ? 'run' : phase;
  const allActivities = activeLesson?.activities || [];
  const activities = guidanceLevel === 'supported'
    ? allActivities
    : guidanceLevel === 'guided'
      ? allActivities.filter((activity) => activity.type !== 'worked-example')
      : allActivities.filter((activity) => activity.type === 'edit');
  const activityIndex = Math.max(0, activities.findIndex((activity) => activity.id === activeActivityId));
  const activeActivity = activities[activityIndex] || null;
  const showLessonCard = phase !== 'learn' || !activeActivity || activeActivity.type === 'edit';
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

  const handleGuidanceKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % GUIDANCE_LEVELS.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + GUIDANCE_LEVELS.length) % GUIDANCE_LEVELS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = GUIDANCE_LEVELS.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    onGuidanceChange?.(GUIDANCE_LEVELS[nextIndex]);
    event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[nextIndex]?.focus();
  };

  return (
    <aside style={styles.panel} aria-label="Learn Mode guide">
      <div style={styles.header}>
        <div style={styles.eyebrow}><GraduationCap size={13} /> Learn Mode</div>
        <div style={styles.headingRow}>
          <h2 ref={headingRef} tabIndex={-1} style={styles.heading}>{activeLesson ? activeLesson.title : 'Choose a course'}</h2>
          {activeLesson && (
            <button type="button" style={styles.browseBtn} onClick={() => onSelectLesson(null)}>
              <ChevronLeft size={11} /> Courses
            </button>
          )}
        </div>
        <div style={styles.subheading}>
          {activeLesson
            ? `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} · progress saves automatically`
            : 'Pick a lesson to begin a guided Learn → Run → Fix loop.'}
        </div>
        <div style={styles.guidanceControl} role="radiogroup" aria-label="Guidance level">
          {GUIDANCE_LEVELS.map((level, index) => (
            <button
              key={level}
              type="button"
              role="radio"
              style={{ ...styles.guidanceBtn, ...(guidanceLevel === level ? styles.guidanceBtnActive : {}) }}
              aria-checked={guidanceLevel === level}
              tabIndex={guidanceLevel === level ? 0 : -1}
              onClick={() => onGuidanceChange?.(level)}
              onKeyDown={(event) => handleGuidanceKeyDown(event, index)}
            >
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeLesson && (
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

      <div style={styles.content}>
        {activeLesson ? (
          <div style={styles.lessonStack}>
            {phase === 'learn' && activeActivity && (
              <ActivityGuide
                activity={activeActivity}
                index={activityIndex}
                total={activities.length}
                onBack={activityIndex > 0
                  ? () => onActivityChange?.(activities[activityIndex - 1].id)
                  : null}
                onContinue={activityIndex < activities.length - 1
                  ? () => onActivityChange?.(activities[activityIndex + 1].id)
                  : null}
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
            <div style={styles.intro}>
              Courses live here, away from the free-form workspace. You can return to Workspace at any time without losing your lesson draft.
            </div>
            <LessonsPanel
              completedLessons={completedLessons}
              onSelectLesson={onSelectLesson}
              activeLessonId={null}
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

function ActivityGuide({ activity, index, total, onBack, onContinue }) {
  const [answer, setAnswer] = React.useState(null);
  const headingRef = React.useRef(null);

  React.useEffect(() => {
    setAnswer(null);
    headingRef.current?.focus();
  }, [activity.id]);

  const isPrediction = activity.type === 'prediction';
  const answered = answer !== null;
  const answerCorrect = answered && answer === activity.answer;

  return (
    <section style={styles.activityCard} aria-labelledby={`activity-${activity.id}`}>
      <div style={styles.activityMeta}>Activity {index + 1} of {total} · {activity.type.replace('-', ' ')}</div>
      <h3 ref={headingRef} tabIndex={-1} id={`activity-${activity.id}`} style={styles.activityTitle}>{activity.title}</h3>
      {activity.instruction && <p style={styles.activityText}>{activity.instruction}</p>}
      {activity.example && <pre style={styles.activityCode}>{activity.example}</pre>}

      {isPrediction && (
        <div style={styles.predictionGroup}>
          <div style={styles.predictionQuestion}>{activity.question}</div>
          {(activity.choices || []).map((choice) => (
            <button
              key={choice}
              type="button"
              style={{ ...styles.choiceBtn, ...(answer === choice ? styles.choiceBtnSelected : {}) }}
              aria-pressed={answer === choice}
              onClick={() => setAnswer(choice)}
            >
              {choice}
            </button>
          ))}
          {answered && (
            <div style={{ ...styles.predictionFeedback, color: answerCorrect ? 'var(--success)' : 'var(--text-secondary)' }} role="status">
              {answerCorrect ? 'That prediction is right. ' : `The result is ${activity.answer}. `}
              {activity.explanation}
            </div>
          )}
        </div>
      )}

      {(onBack || (onContinue && (!isPrediction || answered))) && (
        <div style={styles.activityActions}>
          {onBack && (
            <button type="button" style={styles.backActivityBtn} onClick={onBack}>
              <ChevronLeft size={12} /> Previous
            </button>
          )}
          {onContinue && (!isPrediction || answered) && (
            <button type="button" style={styles.continueBtn} onClick={onContinue}>
              Continue <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </section>
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
  guidanceControl: {
    display: 'flex',
    gap: 2,
    marginTop: 9,
    padding: 2,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-tertiary)',
  },
  guidanceBtn: {
    flex: 1,
    padding: '4px 3px',
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 9.5,
  },
  guidanceBtnActive: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontWeight: 700,
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
  lessonStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
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
