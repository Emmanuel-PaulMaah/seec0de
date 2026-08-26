import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Code2,
  GraduationCap,
  Hammer,
  Sparkles,
  Wrench,
} from 'lucide-react';
import lessonsData from '../data/lessons/index.js';
import { challengeTypesFor, flattenExercises } from '../data/exerciseCatalog';
import projects, { projectCheckpoint } from '../data/projects';
import { renderInline } from './InlineCode';

const LANGUAGE_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  react: 'React',
  html: 'HTML',
  css: 'CSS',
  git: 'Git & GitHub',
  nodejs: 'Node.js',
};

function languageLabel(language) {
  return LANGUAGE_LABELS[language] || language;
}

const ICON_COLORS = {
  courses: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  exercises: { bg: 'var(--algorithm-soft)', color: 'var(--algorithm)' },
  projects: { bg: 'var(--string-highlight)', color: 'var(--text-primary)' },
};

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
}) {
  const headingRef = useRef(null);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [activeChallengeTypeId, setActiveChallengeTypeId] = useState(null);
  const tracks = lessonsData.tracks || [];
  const exercises = useMemo(() => flattenExercises(lessonsData), []);
  const languages = useMemo(() => {
    const available = Array.from(new Set(tracks.map((track) => track.language).filter(Boolean)));
    return ['python', 'javascript', 'typescript', 'react', 'html', 'css', 'git', 'nodejs'].filter((language) => available.includes(language));
  }, [tracks]);
  const languageTracks = tracks.filter((track) => track.language === selectedLanguage);
  const languageExercises = exercises.filter((exercise) => exercise.language === selectedLanguage);
  const challengeTypes = challengeTypesFor(exercises, selectedLanguage);
  const activeChallengeType = challengeTypes.find((type) => type.id === activeChallengeTypeId) || null;
  const visibleExercises = activeChallengeType
    ? languageExercises.filter((exercise) => exercise.challengeType === activeChallengeType.id)
    : [];
  const languageProjects = projects.filter((project) => project.language === selectedLanguage);
  const activeTrack = languageTracks.find((track) => track.id === activeTrackId) || null;
  const activeProject = languageProjects.find((project) => project.id === selectedProjectId) || null;

  useEffect(() => {
    headingRef.current?.focus();
  }, [selectedLanguage, selectedSection, activeTrackId, selectedProjectId, activeChallengeTypeId]);

  useEffect(() => {
    setActiveTrackId(null);
    setActiveChallengeTypeId(null);
  }, [selectedLanguage, selectedSection]);

  const chooseLanguage = (language) => {
    onSelectProject(null);
    onSelectLanguage(language);
    onSelectSection(null);
  };

  const chooseSection = (section) => {
    onSelectProject(null);
    onSelectSection(section);
  };

  const goBack = () => {
    if (activeTrack) {
      setActiveTrackId(null);
    } else if (activeProject) {
      onSelectProject(null);
    } else if (activeChallengeType) {
      setActiveChallengeTypeId(null);
    } else if (selectedSection) {
      onSelectSection(null);
    } else {
      onSelectLanguage(null);
    }
  };

  const heading = !selectedLanguage
    ? 'Choose a language.'
    : activeTrack
      ? activeTrack.name
      : activeProject
        ? activeProject.title
      : activeChallengeType
        ? activeChallengeType.title
        : selectedSection === 'courses'
          ? `${languageLabel(selectedLanguage)} courses.`
          : selectedSection === 'exercises'
            ? `${languageLabel(selectedLanguage)} exercises.`
            : selectedSection === 'projects'
              ? `${languageLabel(selectedLanguage)} projects.`
            : `Learn ${languageLabel(selectedLanguage)}.`;

  const backLabel = activeTrack
    ? 'All courses'
    : activeProject
      ? 'All projects'
      : activeChallengeType
        ? 'All challenge types'
        : selectedSection ? languageLabel(selectedLanguage) : 'All languages';

  /* ── Sub-renders ── */

  const renderLanguageGrid = () => (
    <>
      <p style={{ maxWidth: 540, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        Start with one language. Your courses, exercises, and saved progress stay together.
      </p>
      <div className="learn-home-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 28 }}>
        {languages.map((language) => {
          const matchingTracks = tracks.filter((t) => t.language === language);
          const lessons = matchingTracks.flatMap((t) => t.lessons || []);
          const done = lessons.filter((l) => completedLessons.includes(l.id)).length;
          const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
          return (
            <button key={language} type="button" className="learn-card" style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 14, padding: '16px 18px' }} onClick={() => chooseLanguage(language)}>
              <span style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}>
                <Code2 size={18} />
              </span>
              <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Language</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{languageLabel(language)}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>{matchingTracks.length} courses · {lessons.length} lessons · {done} complete</span>
              </span>
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              {lessons.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }} className="learn-progress-track">
                  <div className="learn-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const renderSectionPicker = () => (
    <>
      <p style={{ maxWidth: 540, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        Choose guided lessons, focused practice, or build a complete project through tested checkpoints.
      </p>
      <div className="learn-home-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 28 }}>
        {[
          { section: 'courses', label: 'Courses', eyebrow: 'Guided path', desc: 'Structured lessons that introduce and combine the language foundations.', Icon: BookOpen, ...ICON_COLORS.courses },
          { section: 'exercises', label: 'Exercises', eyebrow: 'Focused practice', desc: 'Debugging drills, output-first builds, refactoring, and mini-projects.', Icon: Wrench, ...ICON_COLORS.exercises },
          { section: 'projects', label: 'Projects', eyebrow: 'Applied learning', desc: 'Plan, build, debug, and modify useful programs with verified milestones.', Icon: Hammer, ...ICON_COLORS.projects },
        ].map(({ section, label, eyebrow, desc, Icon, bg, color }) => (
          <button key={section} type="button" className="learn-section-btn" onClick={() => chooseSection(section)}>
            <span style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 9, background: bg, color }}>
              <Icon size={17} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{eyebrow}</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{label}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{desc}</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, color: 'var(--text-secondary)', fontSize: 10.5, fontWeight: 700 }}>
              Open {label.toLowerCase()} <ArrowRight size={12} />
            </span>
          </button>
        ))}
      </div>
    </>
  );

  const renderCourseGrid = () => (
    <>
      <p style={{ maxWidth: 540, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        Open a course to see its lessons and continue your progress.
      </p>
      <div className="learn-home-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 11, marginTop: 28 }}>
        {languageTracks.map((track) => {
          const lessons = track.lessons || [];
          const done = lessons.filter((l) => completedLessons.includes(l.id)).length;
          const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
          return (
            <button key={track.id} type="button" className="learn-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 148, padding: 17 }} onClick={() => setActiveTrackId(track.id)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 10.5, fontWeight: 700 }}>
                <BookOpen size={14} /> {done}/{lessons.length}
              </span>
              <strong style={{ marginTop: 12, color: 'var(--text-primary)', fontSize: 14 }}>{track.name}</strong>
              <span style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{track.description}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 14, color: 'var(--text-secondary)', fontSize: 10.5, fontWeight: 700 }}>
                Open course <ArrowRight size={12} />
              </span>
              {lessons.length > 0 && (
                <div style={{ width: '100%', marginTop: 8 }} className="learn-progress-track">
                  <div className="learn-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const renderLessonList = () => (
    <>
      <p style={{ maxWidth: 620, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        {activeTrack.description}
      </p>
      <div style={{ display: 'grid', gap: 7, marginTop: 24 }}>
        {(activeTrack.lessons || []).map((lesson) => {
          const complete = completedLessons.includes(lesson.id);
          return (
            <button key={lesson.id} type="button" className="learn-lesson-row" onClick={() => onSelectLesson({ ...lesson, language: activeTrack.language })}>
              {complete
                ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                : <Circle size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
              <span style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', gap: 2 }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: 12.5 }}>{lesson.title}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.4 }}>{lesson.summary}</span>
              </span>
              <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
    </>
  );

  const renderChallengeTypeGrid = () => (
    <>
      <p style={{ maxWidth: 540, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        Choose how you want to practise. Each challenge type contains deterministic exercises that run offline.
      </p>
      <div className="learn-home-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 11, marginTop: 28 }}>
        {challengeTypes.map((type) => (
          <button key={type.id} type="button" className="learn-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 148, padding: 17 }} onClick={() => setActiveChallengeTypeId(type.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--algorithm)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              <Wrench size={13} /> {type.count} {type.count === 1 ? 'challenge' : 'challenges'}
            </span>
            <strong style={{ marginTop: 12, color: 'var(--text-primary)', fontSize: 14 }}>{type.title}</strong>
            <span style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{type.description}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 14, color: 'var(--text-secondary)', fontSize: 10.5, fontWeight: 700 }}>
              Open challenges <ArrowRight size={12} />
            </span>
          </button>
        ))}
      </div>
    </>
  );

  const renderExerciseGrid = () => (
    <>
      <p style={{ maxWidth: 620, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        {activeChallengeType.description} Open a challenge to write, run, and verify your solution.
      </p>
      <div className="learn-home-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 11, marginTop: 28 }}>
        {visibleExercises.map((exercise) => {
          const complete = completedLessons.includes(exercise.id);
          return (
            <button key={exercise.id} type="button" className="learn-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 174, padding: 17 }} onClick={() => onSelectExercise(exercise)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--algorithm)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {complete
                  ? <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                  : exercise.exerciseType === 'code-along'
                    ? <Sparkles size={13} />
                    : <Wrench size={13} />}
                {activeChallengeType.title}
              </span>
              <strong style={{ marginTop: 12, color: 'var(--text-primary)', fontSize: 14 }}>{exercise.concept}</strong>
              <span style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{renderInline(exercise.task)}</span>
              <span style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 9.5 }}>
                {exercise.sourceLessonId ? `From ${exercise.sourceLessonTitle}` : exercise.summary}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 14, color: 'var(--text-secondary)', fontSize: 10.5, fontWeight: 700 }}>
                {complete ? 'Practise again' : 'Start exercise'} <ArrowRight size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  const renderProjectGrid = () => (
    <>
      <p style={{ maxWidth: 620, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        Each project ends with a transfer task. Checkpoints are complete only after your code passes and you explain one decision.
      </p>
      <div className="learn-home-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 11, marginTop: 28 }}>
        {languageProjects.map((project) => {
          const done = project.checkpoints.filter((cp) => completedProjectCheckpoints.includes(cp.id)).length;
          const pct = project.checkpoints.length > 0 ? Math.round((done / project.checkpoints.length) * 100) : 0;
          return (
            <button key={project.id} type="button" className="learn-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 148, padding: 17 }} onClick={() => onSelectProject(project.id)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--string-highlight)', fontSize: 10.5, fontWeight: 700 }}>
                <Hammer size={13} /> {done}/{project.checkpoints.length} checkpoints
              </span>
              <strong style={{ marginTop: 12, color: 'var(--text-primary)', fontSize: 14 }}>{project.title}</strong>
              <span style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{project.summary}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 14, color: 'var(--text-secondary)', fontSize: 10.5, fontWeight: 700 }}>
                {done === project.checkpoints.length ? 'Build again' : 'Open project'} <ArrowRight size={12} />
              </span>
              <div style={{ width: '100%', marginTop: 8 }} className="learn-progress-track">
                <div className="learn-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  const renderCheckpointList = () => (
    <>
      <p style={{ maxWidth: 620, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        {activeProject.brief}
      </p>
      <div style={{ display: 'grid', gap: 7, marginTop: 24 }}>
        {activeProject.checkpoints.map((checkpoint, checkpointIndex) => {
          const complete = completedProjectCheckpoints.includes(checkpoint.id);
          return (
            <button key={checkpoint.id} type="button" className="learn-lesson-row" onClick={() => onSelectProjectCheckpoint(projectCheckpoint(activeProject, checkpoint, checkpointIndex))}>
              {complete ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <Circle size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, flexShrink: 0 }}>{String(checkpointIndex + 1).padStart(2, '0')}</span>
              <span style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', gap: 2 }}>
                <span style={{ width: 'fit-content', color: 'var(--string-highlight)', fontSize: 8.5, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' }}>{checkpoint.phase}</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: 12.5 }}>{checkpoint.title}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.4 }}>{checkpoint.task}</span>
              </span>
              <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
    </>
  );

  /* ── Main render ── */

  return (
    <main style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--bg-primary)', isolation: 'isolate' }} aria-labelledby="learn-home-heading">
      <div style={{ position: 'fixed', inset: 0, zIndex: -3, opacity: 0.18, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'linear-gradient(to bottom, black, transparent 82%)' }} aria-hidden="true" />

      <section className="learn-home-content" style={{ width: 'min(960px, calc(100% - 64px))', margin: '0 auto', padding: 'clamp(48px, 8vh, 84px) 0 120px' }}>
        {(selectedLanguage || selectedSection || activeTrack || activeProject || activeChallengeType) && (
          <button type="button" className="learn-chip" onClick={goBack} style={{ marginBottom: 24 }}>
            <ChevronLeft size={13} /> {backLabel}
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent)', fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          <GraduationCap size={12} /> Learn
        </div>
        <h1 ref={headingRef} tabIndex={-1} id="learn-home-heading" style={{ maxWidth: 760, margin: '12px 0 0', color: 'var(--text-primary)', fontSize: 'clamp(34px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {heading}
        </h1>

        {/* Language picker */}
        {!selectedLanguage && renderLanguageGrid()}

        {/* Section picker */}
        {selectedLanguage && !selectedSection && renderSectionPicker()}

        {/* Course grid */}
        {selectedLanguage && selectedSection === 'courses' && !activeTrack && renderCourseGrid()}

        {/* Lesson list */}
        {selectedLanguage && selectedSection === 'courses' && activeTrack && renderLessonList()}

        {/* Challenge type grid */}
        {selectedLanguage && selectedSection === 'exercises' && !activeChallengeType && renderChallengeTypeGrid()}

        {/* Exercise grid */}
        {selectedLanguage && selectedSection === 'exercises' && activeChallengeType && renderExerciseGrid()}

        {/* Project grid */}
        {selectedLanguage && selectedSection === 'projects' && !activeProject && renderProjectGrid()}

        {/* Checkpoint list */}
        {selectedLanguage && selectedSection === 'projects' && activeProject && renderCheckpointList()}
      </section>

      <div style={{ position: 'fixed', left: '50%', bottom: '-0.18em', zIndex: -1, transform: 'translateX(-50%)', color: 'var(--text-primary)', opacity: 0.04, fontSize: 'clamp(130px, 24vw, 360px)', fontWeight: 700, letterSpacing: '-0.09em', lineHeight: 0.78, userSelect: 'none', WebkitTextStroke: '1px rgba(242, 240, 233, 0.06)' }} aria-hidden="true">
        learn
      </div>
    </main>
  );
}
