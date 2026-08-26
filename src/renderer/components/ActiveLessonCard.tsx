import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Lightbulb, RotateCcw, Eye, EyeOff, CheckCircle2, XCircle, ArrowRight, Info, ListTree, Wrench, Code2, X, Play, MessageSquareText, Sparkles, BookOpen } from 'lucide-react';
import { explainCode, traceCode } from '../engine/codeExplainer';
import { renderInline } from './InlineCode';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface ActiveLessonCardProps {
  lesson?: any;
  status?: 'idle' | 'pass' | 'fail';
  verification?: { pass: boolean; expected: string; actual: string; reason: string } | null;
  errorCoaching?: any[];
  hasNext?: boolean;
  onResetCode?: () => void;
  onRevealSolution?: () => void;
  onClear?: () => void;
  onNext?: () => void;
  hintIndex?: number;
  onHintIndexChange?: (n: number) => void;
  showTeaching?: boolean;
  guidanceLevel?: string;
  attempts?: number;
  reflection?: string;
  check?: any;
  projectDir?: string | null;
  checkpointComplete?: boolean;
  conceptNote?: string;
  onConceptNoteChange?: (v: string) => void;
  onSaveConceptNote?: () => void;
  onReflectionChange?: (v: string) => void;
  onCompleteCheckpoint?: () => void;
  teachingOnly?: boolean;
  onStartExercise?: () => void;
}

export default function ActiveLessonCard(props: ActiveLessonCardProps) {
  const { lesson, status = 'idle', verification = null, errorCoaching = [], hasNext = false, onResetCode, onRevealSolution, onClear, onNext, hintIndex = 0, onHintIndexChange, showTeaching = true, guidanceLevel = 'supported', attempts = 0, reflection = '', check = null, projectDir = null, checkpointComplete = false, conceptNote = '', onConceptNoteChange, onSaveConceptNote, onReflectionChange, onCompleteCheckpoint, teachingOnly = false, onStartExercise } = props;
  const language = lesson?.language || 'javascript';
  const [solutionShown, setSolutionShown] = useState(false);
  const [examplesShown, setExamplesShown] = useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => { setSolutionShown(false); setExamplesShown(false); }, [lesson?.id]);
  useEffect(() => { if (status === 'pass' || status === 'fail') resultRef.current?.focus(); }, [status]);
  if (!lesson) return null;
  const hints = lesson.hints || [];
  const visibleHints = hints.slice(0, hintIndex);
  const hintsRemaining = hintIndex < hints.length;
  const hintsAvailable = guidanceLevel !== 'independent' || status === 'fail';
  const solutionAvailable = guidanceLevel === 'supported' || (guidanceLevel === 'guided' && status === 'fail') || (guidanceLevel === 'independent' && status === 'fail' && attempts >= 2);
  const isProjectCheckpoint = lesson.kind === 'project-checkpoint';
  const reflectionReady = reflection.trim().length > 0;

  return (
    <div className={cn('flex flex-col gap-3', teachingOnly && 'w-full')}>
      {/* Navigation + concept badge */}
      <div className="flex items-center justify-between gap-2">
        <button className="inline-flex items-center gap-0.5 bg-transparent border-none text-[var(--text-muted)] text-[11px] py-1 px-1.5 cursor-pointer rounded-md hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all duration-150" onClick={onClear} title={lesson.kind === 'exercise' ? 'Back to exercises' : lesson.kind === 'project-checkpoint' ? 'Back to project' : 'Back to all lessons'}>
          <ChevronLeft size={12} /><span>{lesson.kind === 'exercise' ? 'Exercises' : lesson.kind === 'project-checkpoint' ? 'Project' : 'Lessons'}</span>
        </button>
        <div className="flex gap-1.5">
          {lesson.concept && (
            <span className="inline-flex items-center gap-1 bg-[var(--algorithm)]/8 text-[var(--algorithm)] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--algorithm)]/15">
              <BookOpen size={9} />
              {lesson.concept}
            </span>
          )}
        </div>
      </div>

      {/* Teaching section */}
      {showTeaching && (
        <div className="flex flex-col gap-2.5">
          <div>
            <h3 className="text-[14px] font-bold text-[var(--text-primary)] m-0 leading-tight">{lesson.title}</h3>
            {lesson.summary && <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mt-1 m-0">{lesson.summary}</p>}
          </div>
          <div className="flex flex-col gap-2">{(lesson.teaching || []).map((block: any, i: number) => renderBlock(block, i, language))}</div>
        </div>
      )}

      {/* Task box */}
      {!teachingOnly && (
        <div className="relative bg-gradient-to-br from-[var(--algorithm)]/5 to-transparent border border-[var(--algorithm)]/15 rounded-xl p-3.5 overflow-hidden">
          <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-[var(--algorithm)] to-[var(--accent)] rounded-r" />
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} className="text-[var(--algorithm)]" />
            <span className="text-[10px] uppercase tracking-[1px] text-[var(--algorithm)] font-bold">Your turn</span>
          </div>
          <div className="text-[13px] text-[var(--text-primary)] leading-relaxed pl-3">{renderInline(lesson.task)}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-2 pl-3">Edit the code in the editor → click <strong className="text-[var(--text-secondary)]">Run</strong> in the toolbar.</div>
        </div>
      )}

      {/* Start exercise button (teaching-only mode) */}
      {teachingOnly && (
        <Button className="self-end mt-1 gap-1.5" onClick={onStartExercise}>
          Start coding exercise <ArrowRight size={13} />
        </Button>
      )}

      {/* Project step block */}
      {!teachingOnly && isProjectCheckpoint && <ProjectStepBlock lesson={lesson} check={check} projectDir={projectDir} examplesShown={examplesShown} onToggleExamples={() => setExamplesShown((v) => !v)} />}

      {/* Pass state */}
      {status === 'pass' && (
        <div ref={resultRef} tabIndex={-1} className="flex items-start gap-2.5 border border-emerald-500/30 rounded-xl p-3 bg-gradient-to-br from-emerald-500/8 to-emerald-500/3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">Nailed it.</div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">Your output matched what the lesson expected.</div>
          </div>
        </div>
      )}

      {/* Self-explanation (pass + reflection prompt) */}
      {status === 'pass' && lesson.reflectionPrompt && lesson.kind !== 'project-checkpoint' && <SelfExplanationSection prompt={lesson.reflectionPrompt} concept={lesson.concept} note={conceptNote} onNoteChange={onConceptNoteChange} onSave={onSaveConceptNote} />}

      {/* Fail state */}
      {status === 'fail' && verification && (
        <div ref={resultRef} tabIndex={-1} className="flex items-start gap-2.5 border border-red-500/30 rounded-xl p-3 bg-gradient-to-br from-red-500/8 to-red-500/3">
          <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <XCircle size={14} className="text-red-500" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="text-[13px] font-bold text-red-600 dark:text-red-400">Not quite.</div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{verification.reason}</div>
            <div className="grid grid-cols-1 gap-2 mt-1">
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] mb-1 font-semibold">Expected</div>
                <pre className="text-[11px] font-mono bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] m-0 overflow-x-auto whitespace-pre">{verification.expected || '(nothing)'}</pre>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] mb-1 font-semibold">Your output</div>
                <pre className="text-[11px] font-mono bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] m-0 overflow-x-auto whitespace-pre">{verification.actual || '(nothing)'}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error coaching */}
      {status === 'fail' && errorCoaching.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center">
              <Wrench size={11} className="text-amber-500" />
            </div>
            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">Fix-it coach</span>
          </div>
          {errorCoaching.map((item: any, index: number) => (
            <div key={`${item.title || 'fix'}-${index}`} className="flex flex-col gap-1 pl-6">
              {item.title && <div className="text-[var(--text-primary)] text-[12px] font-bold">{item.title}</div>}
              {item.plain && <div className="text-[var(--text-secondary)] text-[12px] leading-relaxed">{renderInline(item.plain)}</div>}
              {Array.isArray(item.fixes) && item.fixes.length > 0 && (
                <ul className="mt-0.5 ml-3 p-0 text-[var(--text-secondary)] text-[11.5px] leading-relaxed list-disc">
                  {item.fixes.slice(0, 3).map((fix: string, i: number) => <li key={i} className="mb-0.5">{renderInline(fix)}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Project checkpoint reflection */}
      {!teachingOnly && isProjectCheckpoint && (
        <div className="flex flex-col gap-2 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]">
          <label htmlFor={`reflection-${lesson.id}`} className="text-[var(--text-primary)] text-[12px] font-bold">Explain one decision</label>
          <div className="text-[var(--text-secondary)] text-[11.5px] leading-relaxed">{lesson.reflectionPrompt}</div>
          <textarea id={`reflection-${lesson.id}`} className="w-full box-border resize-y p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] font-sans text-[11.5px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30" rows={4} value={reflection} onChange={(e) => onReflectionChange?.(e.target.value)} placeholder="Write a short explanation in your own words…" />
          {!checkpointComplete && (
            <Button
              className={cn('self-start gap-1.5', (!reflectionReady || status !== 'pass') && 'opacity-40 cursor-not-allowed pointer-events-none')}
              disabled={!reflectionReady || status !== 'pass'}
              onClick={onCompleteCheckpoint}
            >
              <CheckCircle2 size={12} /> Save reflection & complete
            </Button>
          )}
          <div className="text-[var(--text-muted)] text-[10.5px] leading-normal">{checkpointComplete ? 'Checkpoint complete — code verified and reflection saved.' : status !== 'pass' ? 'Run passing code, then save your reflection.' : reflectionReady ? 'Ready to complete.' : 'Code passed. Add your reflection to complete this checkpoint.'}</div>
        </div>
      )}

      {/* Hints */}
      {visibleHints.length > 0 && (
        <div className="flex flex-col gap-2 bg-[var(--algorithm)]/5 border border-[var(--algorithm)]/10 rounded-xl p-3">
          {visibleHints.map((h: string, i: number) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <Lightbulb size={11} className="text-[var(--algorithm)] shrink-0 mt-0.5" />
              <div className="flex-1">{renderInline(h)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Solution */}
      {solutionShown && lesson.solution && (
        <div className="flex flex-col gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <Eye size={11} className="text-[var(--text-muted)]" />
            <span className="text-[10px] uppercase tracking-[1px] text-[var(--text-muted)] font-bold">Solution</span>
          </div>
          <pre className="text-[11.5px] font-mono bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] p-3 rounded-lg m-0 overflow-x-auto whitespace-pre leading-relaxed">{lesson.solution}</pre>
          <div className="flex items-start gap-1.5 text-[11px] text-[var(--text-muted)]"><Info size={11} className="shrink-0 mt-0.5" /><span>Click <strong>Reset code</strong> if you want to wipe the editor and type this in yourself.</span></div>
        </div>
      )}

      {/* Action buttons */}
      {!teachingOnly && (
        <div className="flex flex-wrap gap-1.5">
          {hintsRemaining && hintsAvailable && (
            <button className="inline-flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] py-1.5 px-2.5 rounded-lg cursor-pointer hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all duration-150" onClick={() => onHintIndexChange?.(hintIndex + 1)} title="Show the next hint">
              <Lightbulb size={11} className="text-[var(--algorithm)]" />
              <span>{hintIndex === 0 ? 'Hint' : `Hint ${hintIndex + 1}/${hints.length}`}</span>
            </button>
          )}
          {!solutionShown && lesson.solution && solutionAvailable && (
            <button className="inline-flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] py-1.5 px-2.5 rounded-lg cursor-pointer hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all duration-150" onClick={() => { setSolutionShown(true); onRevealSolution?.(); }} title="Reveal the solution">
              <Eye size={11} /><span>Solution</span>
            </button>
          )}
          <button className="inline-flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] py-1.5 px-2.5 rounded-lg cursor-pointer hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all duration-150" onClick={onResetCode} title="Restore the starter code">
            <RotateCcw size={11} /><span>Reset</span>
          </button>
        </div>
      )}

      {/* Next button */}
      {status === 'pass' && hasNext && (
        <Button
          className={cn('w-full gap-1.5 mt-0.5', isProjectCheckpoint && !reflectionReady && 'opacity-40 cursor-not-allowed pointer-events-none')}
          onClick={() => { if (isProjectCheckpoint && !checkpointComplete) onCompleteCheckpoint?.(); onNext?.(); }}
          disabled={isProjectCheckpoint && !reflectionReady}
        >
          <span>{isProjectCheckpoint ? 'Next checkpoint' : 'Next lesson'}</span><ArrowRight size={13} />
        </Button>
      )}
    </div>
  );
}

function SelfExplanationSection({ prompt, concept, note, onNoteChange, onSave }: { prompt: string; concept?: string; note: string; onNoteChange?: (v: string) => void; onSave?: () => void }) {
  const [saved, setSaved] = useState(!!note);
  return (
    <div className="flex flex-col gap-2 p-3 border border-[var(--accent)]/15 rounded-xl bg-[var(--accent)]/3">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md bg-[var(--accent)]/15 flex items-center justify-center">
          <MessageSquareText size={11} className="text-[var(--accent)]" />
        </div>
        <span className="text-[12px] font-bold text-[var(--text-primary)]">Explain it back</span>
      </div>
      <div className="text-[var(--text-secondary)] text-[12px] leading-relaxed">{prompt}</div>
      {concept && <div className="text-[var(--text-muted)] text-[11px] leading-normal">Think about what <code className="font-mono text-[11px] text-[var(--keyword-highlight)] bg-[var(--keyword-soft)] px-1.5 py-0.5 rounded-md">{concept}</code> does and why it matters.</div>}
      <textarea className="w-full box-border resize-y p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] font-sans text-[11.5px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30" rows={3} value={note} onChange={(e) => { setSaved(false); onNoteChange?.(e.target.value); }} placeholder="Write your explanation in your own words…" />
      <div className="flex gap-1.5">
        <Button size="sm" className="gap-1 text-[10.5px]" disabled={!note.trim()} onClick={() => { onSave?.(); setSaved(true); }}>
          <CheckCircle2 size={11} />{saved ? 'Saved' : 'Save explanation'}
        </Button>
      </div>
      {saved && <div className="text-emerald-600 dark:text-emerald-400 text-[10.5px] leading-normal">Explanation saved — you can review it later in your concept notes.</div>}
    </div>
  );
}

function ProjectStepBlock({ lesson, check, projectDir, examplesShown, onToggleExamples }: { lesson: any; check: any; projectDir: string | null; examplesShown: boolean; onToggleExamples: () => void }) {
  const isCurrent = check && check.stepId === lesson.id;
  const details = isCurrent ? check.details || [] : [];
  const anyPending = details.some((d: any) => d.pending);
  const failures = details.filter((d: any) => !d.pass && !d.pending);
  const allPass = details.length > 0 && failures.length === 0 && !anyPending;
  return (
    <div className="flex flex-col gap-2 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 flex-wrap">
        <Code2 size={11} className="text-[var(--text-muted)] shrink-0" />
        <span className="font-mono text-[10.5px] text-[var(--text-secondary)] border border-[var(--border)] rounded-md px-2 py-0.5 bg-[var(--bg-primary)]" title={projectDir ? `${projectDir}/${lesson.file}` : lesson.file}>{lesson.file}</span>
        <span className="text-[10px] text-[var(--text-muted)]" title={projectDir || undefined}>{projectDir ? `in ${projectDir}` : 'saved in your project folder'}</span>
      </div>
      {lesson.examples?.length > 0 && (
        <>
          <button type="button" className="inline-flex items-center self-start gap-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] text-[10.5px] font-medium py-1 px-2.5 rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] transition-all" onClick={onToggleExamples}>
            {examplesShown ? <EyeOff size={11} /> : <Code2 size={11} />}
            <span>{examplesShown ? 'Hide examples' : 'Show examples'}</span>
          </button>
          {examplesShown && <div className="flex flex-col gap-2">{lesson.examples.map((ex: any) => <div key={ex.label} className="flex flex-col gap-1"><div className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{ex.label}</div><pre className="m-0 p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap break-word overflow-x-auto">{ex.code}</pre></div>)}</div>}
        </>
      )}
      {isCurrent && details.length > 0 && (
        <div className="flex flex-col gap-1 pt-0.5">
          {allPass && <div className="flex items-start text-[11px] text-[var(--text-secondary)] leading-relaxed"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" /><span className="ml-1.5">Code shape checks out.</span></div>}
          {anyPending && <div className="flex items-start text-[11px] text-[var(--text-secondary)] leading-relaxed"><Play size={11} className="shrink-0" /><span className="ml-1.5">Code shape looks right — press Run to verify.</span></div>}
          {failures.map((f: any) => <div key={f.id} className="flex items-start text-[11px] text-[var(--text-secondary)] leading-relaxed"><X size={11} className="text-red-500 shrink-0" /><span className="ml-1.5">{f.message}</span></div>)}
        </div>
      )}
    </div>
  );
}

function renderBlock(block: any, key: number, language: string): React.ReactNode {
  if (!block || !block.type) return null;
  if (block.type === 'p') return <p key={key} className="text-[12.5px] text-[var(--text-secondary)] leading-[1.6] m-0">{renderInline(block.text || '', { interactive: false })}</p>;
  if (block.type === 'code') return <TeachingCodeBlock key={key} code={block.text || ''} language={language} />;
  if (block.type === 'note') return (
    <div key={key} className="flex items-start gap-2 text-[12px] text-[var(--text-muted)] leading-relaxed bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg pl-3 pr-2.5 py-2">
      <Info size={11} className="shrink-0 mt-0.5 text-[var(--text-muted)]" />
      <span>{renderInline(block.text || '', { interactive: false })}</span>
    </div>
  );
  return null;
}

function TeachingCodeBlock({ code, language = 'javascript' }: { code: string; language?: string }) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [traceShown, setTraceShown] = useState(false);
  const lines = useMemo(() => String(code || '').split('\n'), [code]);
  const explanations = useMemo(() => explainCode(code, language).lineByLine, [code, language]);
  const trace = useMemo(() => traceCode(code, language), [code, language]);
  const explanationByLine = useMemo(() => {
    const map = new Map<number, string>(); let idx = 0;
    lines.forEach((line, i) => { if (!line.trim()) return; const item = explanations[idx]; if (item) map.set(i, item.explanation); idx++; }); return map;
  }, [lines, explanations]);
  const activeExplanation = selectedLine == null ? null : explanationByLine.get(selectedLine);
  const hasTrace = trace.steps.length > 0;
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="flex flex-col">
        {lines.map((line, i) => {
          const hasExplanation = explanationByLine.has(i);
          const active = selectedLine === i;
          return (
            <button key={i} type="button" className={cn(
              'grid gap-2 w-full bg-transparent border-none text-[var(--text-primary)] text-left py-0.5 px-3 cursor-default font-mono text-[11.5px] leading-relaxed transition-colors duration-100',
              hasExplanation && 'cursor-pointer hover:bg-[var(--bg-secondary)]',
              active && 'bg-[var(--algorithm)]/8'
            )} onClick={() => hasExplanation && setSelectedLine(active ? null : i)} disabled={!hasExplanation} title={hasExplanation ? 'Explain this line' : undefined}>
              <span className="text-[var(--text-muted)] select-none text-right text-[10px] tabular-nums">{i + 1}</span>
              <span className="whitespace-pre overflow-x-auto">{line || ' '}</span>
            </button>
          );
        })}
      </div>
      {activeExplanation && (
        <div className="flex gap-2 border-t border-[var(--border)] py-2 px-3 text-[var(--text-secondary)] text-[11.5px] leading-relaxed bg-[var(--algorithm)]/3">
          <Info size={11} className="shrink-0 mt-0.5 text-[var(--algorithm)]" />
          <span>{activeExplanation}</span>
        </div>
      )}
      {hasTrace && (
        <button type="button" className="inline-flex items-center gap-1.5 mx-3 mb-2.5 mt-2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg py-1 px-2.5 text-[11px] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-all" onClick={() => setTraceShown((v) => !v)}>
          <ListTree size={11} /><span>{traceShown ? 'Hide steps' : 'Step through'}</span>
        </button>
      )}
      {traceShown && hasTrace && (
        <div className="border-t border-[var(--border)] p-3 overflow-x-auto">
          <div className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">Line-by-line state</div>
          <table className="w-full border-collapse text-[11px]">
            <thead><tr>{['line', 'what happens', 'state', 'output'].map((h) => <th key={h} className="text-[var(--text-muted)] font-bold text-left border-b border-[var(--border)] py-1.5 px-2">{h}</th>)}</tr></thead>
            <tbody>{trace.steps.map((step: any, i: number) => (
              <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="text-[var(--text-secondary)] border-b border-[var(--border)]/50 py-1.5 px-2 align-top font-mono text-[10.5px]">{step.lineNumber}</td>
                <td className="text-[var(--text-secondary)] border-b border-[var(--border)]/50 py-1.5 px-2 align-top">{step.note}</td>
                <td className="text-[var(--text-secondary)] border-b border-[var(--border)]/50 py-1.5 px-2 align-top"><code className="text-[10.5px]">{formatState(step.state)}</code></td>
                <td className="text-[var(--text-secondary)] border-b border-[var(--border)]/50 py-1.5 px-2 align-top"><code className="text-[10.5px]">{step.output || '—'}</code></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatState(state: any): string {
  const entries = Object.entries(state || {}); if (entries.length === 0) return '—';
  return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
}
