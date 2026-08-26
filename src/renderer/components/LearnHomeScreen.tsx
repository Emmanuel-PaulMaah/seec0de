import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, Circle, Code2, GraduationCap, Hammer, Sparkles, Wrench } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import lessonsData from '../data/lessons/index.js';
import { challengeTypesFor, flattenExercises } from '../data/exerciseCatalog';
import projects, { projectCheckpoint } from '../data/projects';
import { renderInline } from './InlineCode';
import { cn } from '@/lib/utils';

const LANGUAGE_LABELS: Record<string, string> = { python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', html: 'HTML', css: 'CSS', git: 'Git & GitHub', nodejs: 'Node.js' };
function languageLabel(l: string): string { return LANGUAGE_LABELS[l] || l; }

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } } };
const pageTransition = { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } }, exit: { opacity: 0, x: 12, transition: { duration: 0.15 } } };

interface LearnHomeScreenProps {
  selectedLanguage?: string | null;
  selectedSection?: string | null;
  selectedProjectId?: string | null;
  completedLessons: string[];
  completedProjectCheckpoints: string[];
  onSelectLanguage?: (lang: string | null) => void;
  onSelectSection?: (section: string | null) => void;
  onSelectProject?: (id: string | null) => void;
  onSelectLesson?: (lesson: any) => void;
  onSelectExercise?: (exercise: any) => void;
  onSelectProjectCheckpoint?: (checkpoint: any) => void;
}

export default function LearnHomeScreen({
  selectedLanguage,
  selectedSection,
  selectedProjectId,
  completedLessons = [],
  completedProjectCheckpoints = [],
  onSelectLanguage,
  onSelectSection,
  onSelectProject,
  onSelectLesson,
  onSelectExercise,
  onSelectProjectCheckpoint,
}: LearnHomeScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeChallengeTypeId, setActiveChallengeTypeId] = useState<string | null>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => { headingRef.current?.focus(); }, [selectedLanguage, selectedSection, activeTrackId, selectedProjectId, activeChallengeTypeId]);
  useEffect(() => { setActiveTrackId(null); setActiveChallengeTypeId(null); }, [selectedLanguage, selectedSection]);

  const languages = useMemo(() => {
    const langs = new Set<string>();
    (lessonsData?.tracks || []).forEach((track: any) => langs.add(track.language));
    (projects || []).forEach((p: any) => langs.add(p.language));
    flattenExercises(lessonsData).forEach((ex: any) => langs.add(ex.language));
    return Array.from(langs).sort();
  }, []);

  const allLessons = useMemo(() => {
    if (!selectedLanguage) return [];
    return (lessonsData?.tracks || []).filter((track: any) => track.language === selectedLanguage);
  }, [selectedLanguage]);

  const exercises = useMemo(() => {
    if (!selectedLanguage) return [];
    return flattenExercises(lessonsData).filter((ex: any) => ex.language === selectedLanguage);
  }, [selectedLanguage]);

  const challengeTypes = useMemo(() => challengeTypesFor(exercises, selectedLanguage || ''), [exercises, selectedLanguage]);

  const projectList = useMemo(() => {
    if (!selectedLanguage) return [];
    return (projects || []).filter((p: any) => p.language === selectedLanguage);
  }, [selectedLanguage]);

  const filteredExercises = useMemo(() => {
    if (!activeChallengeTypeId) return exercises;
    return exercises.filter((ex: any) => ex.challengeType === activeChallengeTypeId);
  }, [exercises, activeChallengeTypeId]);

  // --- Language picker ---
  if (!selectedLanguage) {
    return (
      <main className="learn-home-screen flex-1 min-h-0 overflow-y-auto bg-[var(--bg-primary)] flex flex-col items-center px-8 py-16">
        <div className="max-w-[800px] w-full">
          <motion.div variants={prefersReduced ? {} : stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-[var(--text-secondary)] mb-6">
              <GraduationCap size={12} className="text-[var(--accent)]" />
              <span>Learn by doing</span>
            </motion.div>
            <motion.h1 variants={fadeUp} ref={headingRef} tabIndex={-1} className="text-[var(--text-primary)] text-4xl font-bold tracking-tight mb-3">
              Choose a language
            </motion.h1>
            <motion.p variants={fadeUp} className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8 max-w-md">
              Each language has guided courses, focused exercises, and build projects. Pick one to start.
            </motion.p>
            <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {languages.map((lang) => {
                const trackCount = allLessons.filter((t: any) => t.language === lang).length;
                const exerciseCount = exercises.filter((e: any) => e.language === lang).length;
                const projectCount = projectList.filter((p: any) => p.language === lang).length;
                return (
                  <motion.button
                    key={lang}
                    type="button"
                    variants={scaleIn}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="text-left p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 transition-colors duration-200 group"
                    onClick={() => onSelectLanguage?.(lang)}
                  >
                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors">{languageLabel(lang)}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {trackCount > 0 && `${trackCount} course${trackCount > 1 ? 's' : ''}`}
                      {exerciseCount > 0 && ` · ${exerciseCount} exercises`}
                      {projectCount > 0 && ` · ${projectCount} project${projectCount > 1 ? 's' : ''}`}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </main>
    );
  }

  // --- Language selected ---
  return (
    <main className="learn-home-screen flex-1 min-h-0 overflow-y-auto bg-[var(--bg-primary)] flex flex-col px-8 py-12">
      <div className="max-w-[900px] w-full mx-auto">
        {/* Header */}
        <motion.div variants={prefersReduced ? {} : stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <button type="button" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => onSelectLanguage?.(null)}>
              <ChevronLeft size={14} /> Languages
            </button>
          </motion.div>
          <motion.h1 variants={fadeUp} ref={headingRef} tabIndex={-1} className="text-[var(--text-primary)] text-2xl font-bold tracking-tight mb-1">
            {languageLabel(selectedLanguage)}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[var(--text-secondary)] text-sm mb-8">
            {!selectedSection ? 'Choose what to work on today.' : selectedSection === 'courses' ? 'Structured lessons with teaching and exercises.' : selectedSection === 'exercises' ? 'Focused challenges to build skill.' : 'Build real projects step by step.'}
          </motion.p>

          {/* Section tabs */}
          <AnimatePresence mode="wait">
            {!selectedSection && (
              <motion.div
                key="sections"
                initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-3 gap-3 mb-8"
              >
                <SectionCard icon={<BookOpen size={18} />} title="Courses" text="Guided lessons with teaching, activities, and progress tracking." onClick={() => onSelectSection?.('courses')} />
                <SectionCard icon={<Wrench size={18} />} title="Exercises" text="Focused challenges — fix, parson, fade, drill." onClick={() => onSelectSection?.('exercises')} />
                <SectionCard icon={<Hammer size={18} />} title="Projects" text="Build real things step by step with verification." onClick={() => onSelectSection?.('projects')} />
              </motion.div>
            )}

            {/* Courses */}
            {selectedSection === 'courses' && (
              <motion.div
                key="courses"
                initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
              >
                {allLessons.length === 0 && <EmptyState text="No courses available for this language yet." />}
                {allLessons.map((track: any, trackIdx: number) => (
                  <motion.div
                    key={track.id}
                    initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: trackIdx * 0.06 }}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-[var(--border)]">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{track.name || track.id}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{track.lessons?.length || 0} lessons</div>
                    </div>
                    <div className="p-2">
                      {(track.lessons || []).map((lesson: any, i: number) => {
                        const done = completedLessons.includes(lesson.id);
                        return (
                          <motion.button
                            key={lesson.id}
                            type="button"
                            initial={prefersReduced ? {} : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            whileHover={{ x: 2 }}
                            className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors group"
                            onClick={() => onSelectLesson?.({ ...lesson, trackId: track.id, language: track.language })}
                          >
                            <span className="flex items-center justify-center w-5 h-5 shrink-0">
                              {done ? <CheckCircle2 size={14} className="text-[var(--success)]" /> : <Circle size={14} className="text-[var(--text-muted)]" />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{lesson.title}</span>
                              {lesson.concept && <span className="ml-2 text-[10px] text-[var(--text-muted)] font-mono">{lesson.concept}</span>}
                            </span>
                            <ArrowRight size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Exercises */}
            {selectedSection === 'exercises' && (
              <motion.div
                key="exercises"
                initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
              >
                {/* Challenge type filter */}
                <motion.div className="flex flex-wrap gap-1.5">
                  <button type="button" className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', !activeChallengeTypeId ? 'bg-[var(--accent)] text-[var(--text-on-accent)] border-[var(--accent)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/30')} onClick={() => setActiveChallengeTypeId(null)}>
                    All ({exercises.length})
                  </button>
                  {challengeTypes.map((ct: any) => (
                    <motion.button
                      key={ct.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', activeChallengeTypeId === ct.id ? 'bg-[var(--accent)] text-[var(--text-on-accent)] border-[var(--accent)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/30')}
                      onClick={() => setActiveChallengeTypeId(ct.id)}
                    >
                      {ct.title} ({ct.count})
                    </motion.button>
                  ))}
                </motion.div>
                {/* Exercise cards */}
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3" variants={prefersReduced ? {} : stagger} initial="hidden" animate="visible">
                  {filteredExercises.map((exercise: any) => {
                    const done = completedLessons.includes(exercise.id);
                    return (
                      <motion.button
                        key={exercise.id}
                        type="button"
                        variants={scaleIn}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-left p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 transition-colors group"
                        onClick={() => onSelectExercise?.(exercise)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {done && <CheckCircle2 size={12} className="text-[var(--success)]" />}
                          <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{exercise.title}</span>
                        </div>
                        {exercise.concept && <div className="text-[10px] text-[var(--text-muted)] font-mono mb-1">{exercise.concept}</div>}
                        {exercise.summary && <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">{renderInline(exercise.summary)}</div>}
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border)]">{exercise.challengeType}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
                {filteredExercises.length === 0 && <EmptyState text="No exercises match this filter." />}
              </motion.div>
            )}

            {/* Projects */}
            {selectedSection === 'projects' && (
              <motion.div
                key="projects"
                initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-3"
              >
                {projectList.length === 0 && <EmptyState text="No projects available for this language yet." />}
                {projectList.map((project: any, idx: number) => {
                  const totalCheckpoints = project.checkpoints?.length || 0;
                  const doneCheckpoints = (project.checkpoints || []).filter((cp: any) => completedProjectCheckpoints.includes(cp.id)).length;
                  const allDone = totalCheckpoints > 0 && doneCheckpoints === totalCheckpoints;
                  return (
                    <motion.button
                      key={project.id}
                      type="button"
                      initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.06 }}
                      whileHover={{ y: -2, scale: 1.005 }}
                      whileTap={{ scale: 0.99 }}
                      className="text-left p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 transition-colors group"
                      onClick={() => {
                        const firstUndone = (project.checkpoints || []).find((cp: any) => !completedProjectCheckpoints.includes(cp.id));
                        if (firstUndone) onSelectProjectCheckpoint?.(firstUndone);
                        else if (project.checkpoints?.length) onSelectProjectCheckpoint?.(project.checkpoints[0]);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {allDone && <CheckCircle2 size={12} className="text-[var(--success)]" />}
                        <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{project.title}</span>
                      </div>
                      {project.description && <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2">{project.description}</div>}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">{doneCheckpoints}/{totalCheckpoints} checkpoints</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[var(--accent)]"
                            initial={{ width: 0 }}
                            animate={{ width: totalCheckpoints > 0 ? `${(doneCheckpoints / totalCheckpoints) * 100}%` : '0%' }}
                            transition={{ duration: 0.6, delay: idx * 0.06 + 0.2, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}

function SectionCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="text-left p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 transition-colors group"
      onClick={onClick}
    >
      <motion.span
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-colors mb-3"
        whileHover={{ rotate: -5 }}
      >
        {icon}
      </motion.span>
      <div className="text-sm font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors">{title}</div>
      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{text}</div>
    </motion.button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-[var(--text-muted)]">
      {text}
    </div>
  );
}
