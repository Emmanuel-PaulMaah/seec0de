import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Circle,
  GraduationCap,
  Hammer,
  Sparkles,
  Wrench,
} from 'lucide-react';
import lessonsData from '../data/lessons/index.js';
import { challengeTypesFor, flattenExercises } from '../data/exerciseCatalog';
import { ProjectFolder } from './motion/project-folder';
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

// One tone per section, carried by the card's glyph. Projects matches the
// --string-highlight used for its checkpoint phase labels.
const SECTION_TONES = {
  courses: 'var(--accent)',
  exercises: 'var(--algorithm)',
  projects: 'var(--string-highlight)',
};

// Course folders cycle through the palette so a wall of them reads as a set of
// distinct courses instead of N identical accent-tinted folders.
const COURSE_TONES = [
  'var(--accent)',
  'var(--algorithm)',
  'var(--string-highlight)',
  'var(--function-highlight)',
];

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
        Your lessons, exercises, and progress are saved here.
      </p>
      <div className="learn-home-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 28 }}>
        {languages.map((language) => {
          const matchingTracks = tracks.filter((t) => t.language === language);
          const lessons = matchingTracks.flatMap((t) => t.lessons || []);
          const done = lessons.filter((l) => completedLessons.includes(l.id)).length;
          const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
          return (
            <button key={language} type="button" className="learn-card learn-opt-card" onClick={() => chooseLanguage(language)}>
              <span className="learn-opt-head">
                <span className="learn-opt-name">{languageLabel(language)}</span>
                <ArrowRight size={14} className="learn-opt-go" aria-hidden="true" />
              </span>
              <span className="learn-opt-meta">
                {matchingTracks.length} {matchingTracks.length === 1 ? 'course' : 'courses'} · {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
              </span>
              <span className="learn-opt-progress">
                <span className="learn-progress-track">
                  <span className="learn-progress-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="learn-opt-count">{done}/{lessons.length}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  const renderSectionPicker = () => (
    <>
      <p style={{ maxWidth: 540, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        Pick how you want to learn — guided lessons, hands-on practice, or a full project.
      </p>
      <div className="learn-home-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 28 }}>
        {[
          { section: 'courses', label: 'Courses', desc: 'Step-by-step lessons that teach you the basics.', Icon: BookOpen },
          { section: 'exercises', label: 'Exercises', desc: 'Short challenges to build specific skills.', Icon: Wrench },
          { section: 'projects', label: 'Projects', desc: 'Build something real, step by step, with checkpoints.', Icon: Hammer },
        ].map(({ section, label, desc, Icon }) => (
          <button
            key={section}
            type="button"
            className="learn-card learn-opt-card"
            style={{ '--opt-tone': SECTION_TONES[section] }}
            onClick={() => chooseSection(section)}
          >
            <span className="learn-opt-head">
              <Icon size={15} className="learn-opt-icon" aria-hidden="true" />
              <span className="learn-opt-name">{label}</span>
              <ArrowRight size={14} className="learn-opt-go" aria-hidden="true" />
            </span>
            <span className="learn-opt-meta">{desc}</span>
          </button>
        ))}
      </div>
    </>
  );

  const renderCourseGrid = () => (
    <>
      <p style={{ maxWidth: 540, margin: '14px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        Pick a course to see its lessons and pick up where you left off.
      </p>
      <div className="learn-course-wall" style={{ marginTop: 32 }}>
        {languageTracks.map((track, trackIndex) => {
          const lessons = track.lessons || [];
          const previews = lessons.map((l) => ({
            id: l.id,
            content: (
              <div style={{ padding: '12px 10px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                    {completedLessons.includes(l.id) ? '✓ Done' : `Lesson ${lessons.indexOf(l) + 1}`}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{l.title}</div>
                  {l.summary && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{l.summary}</div>}
                </div>
              </div>
            ),
          }));
          return (
            <ProjectFolder
              key={track.id}
              tone={COURSE_TONES[trackIndex % COURSE_TONES.length]}
              title={track.name}
              description={track.description}
              previews={previews}
              count={lessons.length}
              itemLabel="lesson"
              onPreviewClick={(preview) => {
                const lesson = lessons.find((l) => l.id === preview.id);
                if (lesson) onSelectLesson({ ...lesson, language: track.language });
              }}
            />
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
        Pick a type of exercise. All exercises run offline — no internet needed.
      </p>
      <div className="learn-home-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 11, marginTop: 28 }}>
        {challengeTypes.map((type) => (
          <button key={type.id} type="button" className="learn-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 0, padding: '13px 14px' }} onClick={() => setActiveChallengeTypeId(type.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              <Wrench size={12} /> {type.count} {type.count === 1 ? 'challenge' : 'challenges'}
            </span>
            <strong style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 13 }}>{type.title}</strong>
            <span style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{type.description}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 10, color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}>
              Open challenges <ArrowRight size={11} />
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
          <button key={exercise.id} type="button" className="learn-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 0, padding: '13px 14px' }} onClick={() => onSelectExercise(exercise)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              {complete
                ? <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
                : exercise.exerciseType === 'code-along'
                  ? <Sparkles size={12} />
                  : <Wrench size={12} />}
              {activeChallengeType.title}
            </span>
            <strong style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 13 }}>{exercise.concept}</strong>
            <span style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{renderInline(exercise.task)}</span>
            <span style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 9.5 }}>
              {exercise.sourceLessonId ? `From ${exercise.sourceLessonTitle}` : exercise.summary}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 10, color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}>
              {complete ? 'Practise again' : 'Start exercise'} <ArrowRight size={11} />
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
        Each project has checkpoints. You finish a checkpoint when your code works and you explain why.
      </p>
      <div className="learn-home-course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 11, marginTop: 28 }}>
        {languageProjects.map((project) => {
          const done = project.checkpoints.filter((cp) => completedProjectCheckpoints.includes(cp.id)).length;
          const pct = project.checkpoints.length > 0 ? Math.round((done / project.checkpoints.length) * 100) : 0;
          return (
          <button key={project.id} type="button" className="learn-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 0, padding: '13px 14px' }} onClick={() => onSelectProject(project.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}>
              <Hammer size={12} /> {done}/{project.checkpoints.length} checkpoints
            </span>
            <strong style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 13 }}>{project.title}</strong>
            <span style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.45 }}>{project.summary}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 10, color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}>
              {done === project.checkpoints.length ? 'Build again' : 'Open project'} <ArrowRight size={11} />
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
    <main style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--bg-primary)' }} aria-labelledby="learn-home-heading">
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

    </main>
  );
}
