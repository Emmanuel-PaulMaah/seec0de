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
};

function languageLabel(language) {
  return LANGUAGE_LABELS[language] || language;
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
}) {
  const headingRef = useRef(null);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [activeChallengeTypeId, setActiveChallengeTypeId] = useState(null);
  const tracks = lessonsData.tracks || [];
  const exercises = useMemo(() => flattenExercises(lessonsData), []);
  const languages = useMemo(() => {
    const available = Array.from(new Set(tracks.map((track) => track.language).filter(Boolean)));
    return ['python', 'javascript', 'typescript', 'react', 'html', 'css', 'git'].filter((language) => available.includes(language));
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

  return (
    <main style={styles.screen} aria-labelledby="learn-home-heading">
      <div style={styles.grid} aria-hidden="true" />
      <div style={styles.glow} aria-hidden="true" />

      <section className="learn-home-content" style={styles.content}>
        {(selectedLanguage || selectedSection || activeTrack || activeProject || activeChallengeType) && (
          <button type="button" style={styles.backButton} onClick={goBack}>
            <ChevronLeft size={14} />
            {activeTrack
              ? 'All courses'
              : activeProject
                ? 'All projects'
                : activeChallengeType
                  ? 'All challenge types'
                  : selectedSection ? languageLabel(selectedLanguage) : 'All languages'}
          </button>
        )}

        <div style={styles.kicker}><GraduationCap size={12} /> Learn </div>
        <h1 ref={headingRef} tabIndex={-1} id="learn-home-heading" style={styles.heading}>{heading}</h1>

        {!selectedLanguage && (
          <>
            <p style={styles.intro}>Start with one language. Your courses, exercises, and saved progress stay together.</p>
            <div className="learn-home-card-grid" style={styles.cardGrid}>
              {languages.map((language) => {
                const matchingTracks = tracks.filter((track) => track.language === language);
                const lessons = matchingTracks.flatMap((track) => track.lessons || []);
                const done = lessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
                return (
                  <button key={language} type="button" className="learn-home-card" style={styles.launchCard} onClick={() => chooseLanguage(language)}>
                    <span style={styles.cardIcon}><Code2 size={20} /></span>
                    <span style={styles.cardCopy}>
                      <span style={styles.cardEyebrow}>Language</span>
                      <strong style={styles.cardTitle}>{languageLabel(language)}</strong>
                      <span style={styles.cardText}>{matchingTracks.length} courses · {lessons.length} lessons · {done} complete</span>
                    </span>
                    <ArrowRight size={18} style={styles.arrow} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedLanguage && !selectedSection && (
          <>
            <p style={styles.intro}>Choose guided lessons, focused practice, or build a complete project through tested checkpoints.</p>
            <div className="learn-home-card-grid" style={styles.cardGrid}>
              <button type="button" className="learn-home-card" style={styles.launchCard} onClick={() => chooseSection('courses')}>
                <span style={styles.cardIcon}><BookOpen size={20} /></span>
                <span style={styles.cardCopy}>
                  <span style={styles.cardEyebrow}>Guided path</span>
                  <strong style={styles.cardTitle}>Courses</strong>
                  <span style={styles.cardText}>Structured lessons that introduce and combine the language foundations.</span>
                </span>
                <ArrowRight size={18} style={styles.arrow} />
              </button>

              <button type="button" className="learn-home-card" style={styles.launchCard} onClick={() => chooseSection('exercises')}>
                <span style={{ ...styles.cardIcon, ...styles.exerciseIcon }}><Wrench size={20} /></span>
                <span style={styles.cardCopy}>
                  <span style={styles.cardEyebrow}>Focused practice</span>
                  <strong style={styles.cardTitle}>Exercises</strong>
                  <span style={styles.cardText}>Debugging drills, output-first builds, refactoring, and mini-projects.</span>
                </span>
                <ArrowRight size={18} style={styles.arrow} />
              </button>

              <button type="button" className="learn-home-card" style={styles.launchCard} onClick={() => chooseSection('projects')}>
                <span style={{ ...styles.cardIcon, ...styles.projectIcon }}><Hammer size={20} /></span>
                <span style={styles.cardCopy}>
                  <span style={styles.cardEyebrow}>Applied learning</span>
                  <strong style={styles.cardTitle}>Projects</strong>
                  <span style={styles.cardText}>Plan, build, debug, and modify useful programs with verified milestones.</span>
                </span>
                <ArrowRight size={18} style={styles.arrow} />
              </button>
            </div>
          </>
        )}

        {selectedLanguage && selectedSection === 'courses' && !activeTrack && (
          <>
            <p style={styles.intro}>Open a course to see its lessons and continue your progress.</p>
            <div className="learn-home-course-grid" style={styles.courseGrid}>
              {languageTracks.map((track) => {
                const lessons = track.lessons || [];
                const done = lessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
                return (
                  <button key={track.id} type="button" className="learn-home-card" style={styles.courseCard} onClick={() => setActiveTrackId(track.id)}>
                    <span style={styles.courseTopline}>
                      <BookOpen size={15} /> {done}/{lessons.length}
                    </span>
                    <strong style={styles.courseTitle}>{track.name}</strong>
                    <span style={styles.courseText}>{track.description}</span>
                    <span style={styles.openCourse}>Open course <ArrowRight size={13} /></span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedLanguage && selectedSection === 'courses' && activeTrack && (
          <>
            <p style={styles.intro}>{activeTrack.description}</p>
            <div style={styles.lessonList}>
              {(activeTrack.lessons || []).map((lesson) => {
                const complete = completedLessons.includes(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    style={styles.lessonButton}
                    onClick={() => onSelectLesson({ ...lesson, language: activeTrack.language })}
                  >
                    {complete
                      ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      : <Circle size={16} style={{ color: 'var(--text-muted)' }} />}
                    <span style={styles.lessonCopy}>
                      <strong style={styles.lessonTitle}>{lesson.title}</strong>
                      <span style={styles.lessonSummary}>{lesson.summary}</span>
                    </span>
                    <ArrowRight size={15} style={styles.arrow} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedLanguage && selectedSection === 'exercises' && !activeChallengeType && (
          <>
            <p style={styles.intro}>Choose how you want to practise. Each challenge type contains deterministic exercises that run offline.</p>
            <div className="learn-home-course-grid" style={styles.courseGrid}>
              {challengeTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className="learn-home-card"
                  style={styles.challengeTypeCard}
                  onClick={() => setActiveChallengeTypeId(type.id)}
                >
                  <span style={styles.challengeTypeTopline}>
                    <Wrench size={14} /> {type.count} {type.count === 1 ? 'challenge' : 'challenges'}
                  </span>
                  <strong style={styles.courseTitle}>{type.title}</strong>
                  <span style={styles.courseText}>{type.description}</span>
                  <span style={styles.openCourse}>Open challenges <ArrowRight size={13} /></span>
                </button>
              ))}
            </div>
          </>
        )}

        {selectedLanguage && selectedSection === 'exercises' && activeChallengeType && (
          <>
            <p style={styles.intro}>{activeChallengeType.description} Open a challenge to write, run, and verify your solution.</p>
            <div className="learn-home-course-grid" style={styles.courseGrid}>
              {visibleExercises.map((exercise) => {
                const complete = completedLessons.includes(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    className="learn-home-card"
                    style={styles.exerciseCard}
                    onClick={() => onSelectExercise(exercise)}
                  >
                    <span style={styles.exerciseTopline}>
                      {complete
                        ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                        : exercise.exerciseType === 'code-along'
                          ? <Sparkles size={14} />
                          : <Wrench size={14} />}
                      {activeChallengeType.title}
                    </span>
                    <strong style={styles.courseTitle}>{exercise.concept}</strong>
                    <span style={styles.courseText}>{renderInline(exercise.task)}</span>
                    <span style={styles.exerciseSource}>
                      {exercise.sourceLessonId ? `From ${exercise.sourceLessonTitle}` : exercise.summary}
                    </span>
                    <span style={styles.openCourse}>{complete ? 'Practise again' : 'Start exercise'} <ArrowRight size={13} /></span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedLanguage && selectedSection === 'projects' && !activeProject && (
          <>
            <p style={styles.intro}>Each project ends with a transfer task. Checkpoints are complete only after your code passes and you explain one decision.</p>
            <div className="learn-home-course-grid" style={styles.courseGrid}>
              {languageProjects.map((project) => {
                const done = project.checkpoints.filter((checkpoint) => completedProjectCheckpoints.includes(checkpoint.id)).length;
                return (
                  <button key={project.id} type="button" className="learn-home-card" style={styles.courseCard} onClick={() => onSelectProject(project.id)}>
                    <span style={{ ...styles.courseTopline, color: 'var(--string)' }}><Hammer size={14} /> {done}/{project.checkpoints.length} checkpoints</span>
                    <strong style={styles.courseTitle}>{project.title}</strong>
                    <span style={styles.courseText}>{project.summary}</span>
                    <span style={styles.openCourse}>{done === project.checkpoints.length ? 'Build again' : 'Open project'} <ArrowRight size={13} /></span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedLanguage && selectedSection === 'projects' && activeProject && (
          <>
            <p style={styles.intro}>{activeProject.brief}</p>
            <div style={styles.lessonList}>
              {activeProject.checkpoints.map((checkpoint, checkpointIndex) => {
                const complete = completedProjectCheckpoints.includes(checkpoint.id);
                return (
                  <button
                    key={checkpoint.id}
                    type="button"
                    style={styles.lessonButton}
                    onClick={() => onSelectProjectCheckpoint(projectCheckpoint(activeProject, checkpoint, checkpointIndex))}
                  >
                    {complete ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <Circle size={16} style={{ color: 'var(--text-muted)' }} />}
                    <span style={styles.checkpointNumber}>{String(checkpointIndex + 1).padStart(2, '0')}</span>
                    <span style={styles.lessonCopy}>
                      <span style={styles.phaseBadge}>{checkpoint.phase}</span>
                      <strong style={styles.lessonTitle}>{checkpoint.title}</strong>
                      <span style={styles.lessonSummary}>{checkpoint.task}</span>
                    </span>
                    <ArrowRight size={15} style={styles.arrow} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <div style={styles.wordmark} aria-hidden="true">learn</div>
    </main>
  );
}

const styles = {
  screen: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    background: 'var(--bg-primary)',
    isolation: 'isolate',
  },
  grid: {
    position: 'fixed',
    inset: 0,
    zIndex: -3,
    opacity: 0.18,
    backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
    backgroundSize: '64px 64px',
    maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
  },
  glow: {
    position: 'fixed',
    zIndex: -2,
    top: '-30%',
    right: '-12%',
    width: '60vw',
    height: '60vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--accent-soft), transparent 68%)',
  },
  content: {
    width: 'min(960px, calc(100% - 64px))',
    margin: '0 auto',
    padding: 'clamp(48px, 8vh, 84px) 0 120px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 28,
    padding: '6px 9px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 11,
  },
  kicker: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: 'var(--accent)',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heading: {
    maxWidth: 760,
    margin: '14px 0 0',
    color: 'var(--text-primary)',
    fontSize: 'clamp(34px, 5vw, 64px)',
    fontWeight: 700,
    letterSpacing: '-0.05em',
    lineHeight: 1,
  },
  intro: {
    maxWidth: 620,
    margin: '17px 0 0',
    color: 'var(--text-secondary)',
    fontSize: 13,
    lineHeight: 1.65,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginTop: 30,
  },
  launchCard: {
    display: 'grid',
    gridTemplateColumns: '42px 1fr auto',
    alignItems: 'center',
    gap: 13,
    minWidth: 0,
    padding: 18,
    border: '1px solid var(--border-strong)',
    borderRadius: 11,
    background: 'color-mix(in srgb, var(--bg-elevated) 92%, transparent)',
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  cardIcon: {
    width: 42,
    height: 42,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border)',
    borderRadius: 9,
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
  },
  exerciseIcon: {
    background: 'var(--algorithm-soft)',
    color: 'var(--algorithm)',
  },
  projectIcon: { background: 'color-mix(in srgb, var(--string) 14%, transparent)', color: 'var(--string)' },
  cardCopy: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  cardEyebrow: { color: 'var(--text-muted)', fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { color: 'var(--text-primary)', fontSize: 14 },
  cardText: { color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 },
  arrow: { color: 'var(--text-muted)', flexShrink: 0 },
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 11,
    marginTop: 28,
  },
  courseCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 148,
    padding: 17,
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  challengeTypeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 148,
    padding: 17,
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  challengeTypeTopline: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--algorithm)',
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  exerciseCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 174,
    padding: 17,
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  exerciseTopline: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--algorithm)',
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  exerciseSource: {
    marginTop: 8,
    color: 'var(--text-muted)',
    fontSize: 9.5,
  },
  courseTopline: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 10.5, fontWeight: 700 },
  courseTitle: { marginTop: 13, color: 'var(--text-primary)', fontSize: 14 },
  courseText: { marginTop: 5, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 },
  openCourse: { display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 14, color: 'var(--text-secondary)', fontSize: 10.5, fontWeight: 700 },
  lessonList: { display: 'grid', gap: 7, marginTop: 28 },
  lessonButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-elevated)',
    textAlign: 'left',
  },
  lessonCopy: { display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', gap: 3 },
  checkpointNumber: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 },
  phaseBadge: { width: 'fit-content', color: 'var(--string)', fontSize: 8.5, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' },
  lessonTitle: { color: 'var(--text-primary)', fontSize: 12.5 },
  lessonSummary: { color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.4 },
  emptyState: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    maxWidth: 680,
    marginTop: 28,
    padding: 20,
    border: '1px dashed var(--border-strong)',
    borderRadius: 11,
    background: 'var(--bg-elevated)',
  },
  emptyTitle: { color: 'var(--text-primary)', fontSize: 13.5 },
  emptyText: { margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.55 },
  wordmark: {
    position: 'fixed',
    left: '50%',
    bottom: '-0.18em',
    zIndex: -1,
    transform: 'translateX(-50%)',
    color: 'var(--text-primary)',
    opacity: 0.04,
    fontSize: 'clamp(130px, 24vw, 360px)',
    fontWeight: 700,
    letterSpacing: '-0.09em',
    lineHeight: 0.78,
    userSelect: 'none',
  },
};
