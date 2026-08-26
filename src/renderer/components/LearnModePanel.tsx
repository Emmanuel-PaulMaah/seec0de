import React from 'react';
import { BookOpen, Play, Wrench, CheckCircle2, Circle, GraduationCap, ArrowRight, ChevronLeft, MessageSquareText, Sparkles } from 'lucide-react';
import LessonsPanel, { formatLanguage } from './LessonsPanel';
import ActiveLessonCard from './ActiveLessonCard';
import { isCourseActivity } from '../data/exerciseCatalog';
import { renderInline as renderActivityInline } from './InlineCode';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';

const PHASES = [
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'run', label: 'Run', icon: Play },
  { id: 'fix', label: 'Fix', icon: Wrench },
];

export const WRITING_ACTIVITY_TYPES = new Set(['code-along', 'drill', 'edit']);

export const TEACHING_STEP_ID = '__teaching__';

interface LearnModePanelProps {
  activeLesson: any;
  phase?: string;
  completedLessons?: string[];
  lessonStatus?: string;
  lessonVerification?: any;
  lessonErrorCoaching?: any[];
  lessonHasNext?: boolean;
  attempts?: number;
  revealedHints?: number;
  activeActivityId?: string | null;
  guidanceLevel?: string;
  guidanceSuccessStreak?: number;
  reflection?: string;
  lessonCheck?: any;
  learnProjectDir?: string | null;
  checkpointComplete?: boolean;
  announcement?: string;
  onSelectLesson?: (lesson: any) => void;
  onResetLessonCode?: () => void;
  onRevealSolution?: () => void;
  onHintIndexChange?: (index: number) => void;
  onActivityChange?: (id: string | null) => void;
  onGuidanceChange?: (level: string) => void;
  onGuidanceSuggestionLater?: () => void;
  onReflectionChange?: (text: string) => void;
  conceptNote?: string;
  onConceptNoteChange?: (text: string) => void;
  onSaveConceptNote?: () => void;
  allConceptNotes?: Record<string, string>;
  onCompleteCheckpoint?: () => void;
  onNextLesson?: () => void;
  onStartExercise?: () => void;
  focused?: boolean;
}

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
}: LearnModePanelProps) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const mountedRef = React.useRef(false);
  const [catalogLanguage, setCatalogLanguage] = React.useState(activeLesson?.language || null);
  const activePhase = phase === 'complete' ? 'run' : phase;

  const allActivities = activeLesson?.kind === 'exercise'
    ? activeLesson?.activities || []
    : (activeLesson?.activities || []).filter(isCourseActivity);

  const activities = guidanceLevel === 'supported'
    ? allActivities
    : guidanceLevel === 'guided'
      ? allActivities.filter((activity: any) => activity.type !== 'worked-example')
      : allActivities.filter((activity: any) => WRITING_ACTIVITY_TYPES.has(activity.type));

  const showingTeaching = activeActivityId === TEACHING_STEP_ID;
  const activityIndex = showingTeaching
    ? -1
    : Math.max(0, activities.findIndex((activity: any) => activity.id === activeActivityId));

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
    <aside className={cn(
      "w-full h-full flex flex-col min-w-0 bg-[var(--bg-secondary)] border-r border-[var(--border)]",
      focused && "border-r-0"
    )} aria-label="Learn guide">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-[var(--accent)] text-[10px] font-bold tracking-[1.2px] uppercase">
          <GraduationCap size={12} /> Learn
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <h2 ref={headingRef} tabIndex={-1} className="text-[var(--text-primary)] text-[15px] font-bold leading-tight">
            {activeLesson
              ? activeLesson.title
              : catalogLanguage
                ? formatLanguage(catalogLanguage)
                : 'Choose a language'}
          </h2>
          {activeLesson && (
            <button
              className="inline-flex items-center gap-0.5 bg-transparent border-none text-[var(--text-muted)] text-[10.5px] py-1 px-1.5 cursor-pointer rounded-md hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-150"
              onClick={() => onSelectLesson?.(null)}
            >
              <ChevronLeft size={11} /> {activeLesson.kind === 'exercise' ? 'Exercises' : activeLesson.kind === 'project-checkpoint' ? 'Projects' : 'Courses'}
            </button>
          )}
        </div>
        <div className="mt-1.5 text-[var(--text-muted)] text-[11px] leading-relaxed">
          {activeLesson
            ? `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} · progress saves automatically`
            : catalogLanguage
              ? 'Choose a course or explore the challenge space.'
              : 'Start with the language you want to learn.'}
        </div>
      </div>

      {/* Phase indicator */}
      {activeLesson && !focused && (
        <div className="grid grid-cols-3 gap-1 p-2 border-b border-[var(--border)]" aria-label="Lesson progress">
          {PHASES.map(({ id, label, icon: Icon }, index) => {
            const selected = id === activePhase;
            const complete = phase === 'complete'
              ? index <= 1
              : PHASES.findIndex((item) => item.id === activePhase) > index;
            return (
              <div
                key={id}
                className={cn(
                  "flex items-center justify-center gap-1 min-w-0 py-2 px-1 rounded-lg text-[10.5px] whitespace-nowrap transition-all duration-200",
                  selected && "bg-[var(--accent)]/10 text-[var(--text-primary)] font-bold shadow-sm",
                  complete && "text-emerald-500",
                  !selected && !complete && "text-[var(--text-muted)]"
                )}
                aria-current={selected ? 'step' : undefined}
              >
                {complete && !selected ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                <span>0{index + 1} · {label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Content */}
      <ScrollArea className={cn("flex-1 min-h-0", focused ? "p-[clamp(18px,4vw,48px)]" : "p-3")}>
        {activeLesson ? (
          <div className={cn("flex flex-col gap-3", focused && "w-full")}>
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
                onClear={() => onSelectLesson?.(null)}
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
              <div className="p-3 border border-[var(--accent)]/20 rounded-xl bg-[var(--accent)]/5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={12} className="text-[var(--accent)]" />
                  <span className="text-[var(--text-primary)] text-[12px] font-bold">Ready for less guidance?</span>
                </div>
                <div className="text-[var(--text-muted)] text-[11.5px] leading-relaxed mb-2.5">
                  You completed three new lessons without hints. Try {nextGuidanceLevel} guidance? You can switch back at any time.
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 text-[10.5px]" onClick={() => onGuidanceChange?.(nextGuidanceLevel!)}>
                    Use {nextGuidanceLevel}
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10.5px]" onClick={onGuidanceSuggestionLater}>
                    Not now
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {!catalogLanguage && (
              <div className="mb-4 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-muted)] text-[12px] leading-relaxed">
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
      </ScrollArea>

      {/* Status bar */}
      <div className="min-h-[28px] py-2 px-3 border-t border-[var(--border)] text-[var(--text-muted)] text-[10.5px] leading-relaxed" role="status" aria-live="polite">
        {announcement}
      </div>
    </aside>
  );
}

interface ActivityGuideProps {
  activity: any;
  index: number;
  total: number;
  onBack?: (() => void) | null;
  onContinue?: (() => void) | null;
  continueLabel?: string;
  allowContinue?: boolean;
  focused?: boolean;
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
}: ActivityGuideProps) {
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = React.useState<number[]>([]);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

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

  const toggleStep = (stepIndex: number) => {
    setCheckedSteps((current) => current.includes(stepIndex)
      ? current.filter((item) => item !== stepIndex)
      : [...current, stepIndex]);
  };

  return (
    <section
      className={cn(
        "p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-primary)]",
        focused && "p-0 border-0 rounded-none bg-transparent"
      )}
      aria-labelledby={`activity-${activity.id}`}
    >
      <div className="flex items-center gap-1.5 text-[var(--accent)] text-[9.5px] font-bold tracking-wider uppercase">
        <span className="w-5 h-5 rounded-md bg-[var(--accent)]/10 flex items-center justify-center text-[10px]">{index + 1}</span>
        Activity {index + 1} of {total} · {activity.type.replace('-', ' ')}
      </div>
      <h3 ref={headingRef} tabIndex={-1} id={`activity-${activity.id}`} className="mt-2.5 text-[var(--text-primary)] text-[14px] font-semibold leading-tight">
        {activity.title}
      </h3>
      {activity.instruction && (
        <p className="mt-2 text-[var(--text-muted)] text-[12px] leading-relaxed">
          {renderActivityInline(activity.instruction)}
        </p>
      )}
      {activity.example && (
        <pre className="mt-2.5 p-3 overflow-x-auto border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[11.5px] leading-relaxed font-mono">
          {activity.example}
        </pre>
      )}

      {/* Code-along steps */}
      {isCodeAlong && steps.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-3" aria-label="Code-along steps">
          {steps.map((step: string, stepIndex: number) => {
            const checked = checkedSteps.includes(stepIndex);
            return (
              <button
                key={`${activity.id}-step-${stepIndex}`}
                type="button"
                className={cn(
                  "flex items-start gap-2 w-full py-2 px-2.5 border rounded-lg text-[11.5px] leading-normal text-left transition-all duration-150",
                  checked
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                    : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                )}
                aria-pressed={checked}
                onClick={() => toggleStep(stepIndex)}
              >
                {checked ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <Circle size={13} className="shrink-0 mt-0.5" />}
                <span><strong>{stepIndex + 1}.</strong> {renderActivityInline(step)}</span>
              </button>
            );
          })}
          <div className="text-[var(--text-muted)] text-[10.5px] leading-normal mt-1">
            Write each step in the editor, run when useful, then check it off.
          </div>
        </div>
      )}

      {/* Drill */}
      {isDrill && (
        <div className="flex flex-col gap-1.5 mt-3 p-2.5 border-l-[3px] border-l-amber-500 rounded-r-lg bg-amber-500/5 text-[var(--text-secondary)] text-[11.5px] leading-relaxed">
          <strong className="text-amber-600 dark:text-amber-400">Retrieval drill:</strong> write this from memory in the editor before opening a hint.
          {activity.successCriteria && (
            <span className="text-[var(--text-muted)] text-[11px]">
              Done when: {renderActivityInline(activity.successCriteria)}
            </span>
          )}
        </div>
      )}

      {/* Prediction */}
      {isPrediction && (
        <div className="flex flex-col gap-1.5 mt-3">
          <div className="text-[var(--text-primary)] text-[12px] font-semibold leading-relaxed">
            {renderActivityInline(activity.question)}
          </div>
          {(activity.choices || []).map((choice: string) => (
            <button
              key={choice}
              type="button"
              className={cn(
                "py-2 px-2.5 border rounded-lg text-[12px] text-left transition-all duration-150",
                answer === choice
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              )}
              aria-pressed={answer === choice}
              onClick={() => setAnswer(choice)}
            >
              {renderActivityInline(choice)}
            </button>
          ))}
          {answered && (
            <div
              className={cn(
                "py-2 px-2.5 border-l-[3px] rounded-r-lg text-[11.5px] leading-relaxed",
                answerCorrect
                  ? "border-l-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                  : "border-l-[var(--accent)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              )}
              role="status"
            >
              {answerCorrect ? 'That prediction is right. ' : `The result is ${activity.answer}. `}
              {renderActivityInline(activity.explanation)}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {(onBack || (onContinue && canContinue)) && (
        <div className="flex gap-1.5 mt-3">
          {onBack && (
            <Button variant="outline" size="sm" className="gap-1 text-[11.5px]" onClick={onBack}>
              <ChevronLeft size={12} /> Previous
            </Button>
          )}
          {onContinue && canContinue && (
            <Button size="sm" className="flex-1 gap-1 text-[11.5px]" onClick={onContinue}>
              {continueLabel} <ArrowRight size={12} />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

interface ConceptNotesSummaryProps {
  notes: Record<string, string>;
  language: string;
}

function ConceptNotesSummary({ notes, language }: ConceptNotesSummaryProps) {
  const [expanded, setExpanded] = React.useState(false);
  const noteEntries = Object.entries(notes).filter(([id]) => {
    const prefix = language.slice(0, 2).toLowerCase();
    return id.startsWith(prefix + '-');
  });

  if (noteEntries.length === 0) return null;

  return (
    <div className="mb-3 border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-2 w-full py-2.5 px-3 bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[11.5px] cursor-pointer border-none hover:bg-[var(--bg-tertiary)] transition-all duration-150"
        onClick={() => setExpanded((v) => !v)}
      >
        <MessageSquareText size={12} />
        <span className="flex-1 text-left">{noteEntries.length} concept {noteEntries.length === 1 ? 'note' : 'notes'} saved</span>
        <span className="text-[10px]">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="flex flex-col border-t border-[var(--border)]">
          {noteEntries.map(([id, text]) => (
            <div key={id} className="py-2 px-3 border-b border-[var(--border)]/50 last:border-b-0">
              <div className="font-mono text-[9.5px] text-[var(--text-muted)] mb-0.5">{id}</div>
              <div className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">{text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
