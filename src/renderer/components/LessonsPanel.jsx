import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  ChevronDown,
  Code2,
  Sparkles,
} from 'lucide-react';
import lessonsData from '../data/lessons/index.js';

// LessonsPanel — the directory of available lessons.
//
// Accordion list view: one section per track, one row per lesson. The row
// shows a completion glyph + the lesson title; clicking it asks the
// parent to make that lesson active.
//
// The active-lesson teaching surface (with task, hints, status, solution)
// is rendered separately by ActiveLessonCard inside InstructionPanel.

const LANGUAGE_LABELS = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
};

export function formatLanguage(id) {
  return LANGUAGE_LABELS[id] || id;
}

export default function LessonsPanel({
  completedLessons = [],
  onSelectLesson,
  activeLessonId,
  selectedLanguage = null,
  onSelectLanguage,
}) {
  const { tracks } = lessonsData;

  const uniqueLanguages = useMemo(() => {
    const available = Array.from(new Set(tracks.map(t => t.language).filter(Boolean)));
    const preferredOrder = ['python', 'javascript', 'typescript'];
    return available.sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) return formatLanguage(left).localeCompare(formatLanguage(right));
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
  }, [tracks]);

  const [collapsedTracks, setCollapsedTracks] = useState({});

  function toggleTrack(trackId) {
    setCollapsedTracks((current) => ({
      ...current,
      [trackId]: !current[trackId],
    }));
  }

  const visibleTracks = tracks.filter((track) => track.language === selectedLanguage);

  if (!selectedLanguage) {
    return (
      <div style={styles.container}>
        <div style={styles.languageGrid}>
          {uniqueLanguages.map((language) => {
            const languageTracks = tracks.filter((track) => track.language === language);
            const lessons = languageTracks.flatMap((track) => track.lessons || []);
            const done = lessons.filter((lesson) => completedLessons.includes(lesson.id)).length;

            return (
              <button
                key={language}
                type="button"
                style={styles.languageCard}
                onClick={() => onSelectLanguage?.(language)}
                aria-label={`Open ${formatLanguage(language)} learning`}
              >
                <span style={styles.languageIcon}><Code2 size={20} /></span>
                <span style={styles.languageCardBody}>
                  <strong style={styles.languageName}>{formatLanguage(language)}</strong>
                  <span style={styles.languageMeta}>
                    {languageTracks.length} {languageTracks.length === 1 ? 'course' : 'courses'} · {lessons.length} lessons
                  </span>
                  <span style={styles.languageProgress}>{done}/{lessons.length} lessons complete</span>
                </span>
                <ChevronRight size={16} style={styles.languageArrow} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button type="button" style={styles.backButton} onClick={() => onSelectLanguage?.(null)}>
        <ChevronLeft size={13} /> All languages
      </button>

      <div style={styles.languageHeading}>
        <span style={styles.languageIcon}><Code2 size={20} /></span>
        <div>
          <h3 style={styles.languagePageTitle}>{formatLanguage(selectedLanguage)}</h3>
          <p style={styles.languagePageCopy}>Choose a course now, or return later for focused challenges.</p>
        </div>
      </div>

      <section aria-labelledby="learn-courses-heading">
        <div style={styles.sectionHeadingRow}>
          <div>
            <h3 id="learn-courses-heading" style={styles.sectionTitle}>Courses</h3>
            <p style={styles.sectionCopy}>Guided lessons that build one skill at a time.</p>
          </div>
          <span style={styles.sectionCount}>{visibleTracks.length}</span>
        </div>

        <div style={styles.courseList}>
          {visibleTracks.map((track) => {
            const lessons = track.lessons || [];
            const total = lessons.length;
            const done = lessons.filter((l) => completedLessons.includes(l.id)).length;
            const isCollapsed = !!collapsedTracks[track.id];

            return (
              <div key={track.id} style={styles.track}>
                <button
                  type="button"
                  style={styles.trackHeader}
                  onClick={() => toggleTrack(track.id)}
                  aria-expanded={!isCollapsed}
                  title={isCollapsed ? `Expand ${track.name}` : `Collapse ${track.name}`}
                >
                  <BookOpen size={13} style={{ color: 'var(--accent)' }} />

                  <div style={styles.trackTitle}>{track.name}</div>

                  <span style={styles.trackProgress}>
                    {done}/{total}
                  </span>

                  <ChevronDown
                    size={14}
                    style={{
                      ...styles.trackChevron,
                      ...(isCollapsed ? styles.trackChevronCollapsed : {}),
                    }}
                  />
                </button>

                {!isCollapsed && track.description && (
                  <p style={styles.trackDesc}>{track.description}</p>
                )}

                {!isCollapsed && (
                  <div style={styles.lessonList}>
                    {lessons.map((lesson) => {
                      const isCompleted = completedLessons.includes(lesson.id);
                      const isActive = activeLessonId === lesson.id;

                      return (
                        <button
                          key={lesson.id}
                          style={{
                            ...styles.lessonItem,
                            ...(isActive ? styles.lessonItemActive : {}),
                          }}
                          onClick={() => onSelectLesson({ ...lesson, language: track.language })}
                          title={lesson.summary || lesson.title}
                        >
                          <span style={styles.statusIcon}>
                            {isCompleted ? (
                              <CheckCircle2
                                size={14}
                                style={{ color: 'var(--success, #4ade80)' }}
                              />
                            ) : (
                              <Circle
                                size={14}
                                style={{ color: 'var(--text-muted)' }}
                              />
                            )}
                          </span>

                          <span
                            style={{
                              ...styles.lessonTitle,
                              ...(isActive ? styles.lessonTitleActive : {}),
                            }}
                          >
                            {lesson.title}
                          </span>

                          {isActive && (
                            <ChevronRight
                              size={14}
                              style={styles.activeIndicator}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="learn-challenges-heading" style={styles.challengesSection}>
        <div style={styles.sectionHeadingRow}>
          <div>
            <h3 id="learn-challenges-heading" style={styles.sectionTitle}>Challenges</h3>
            <p style={styles.sectionCopy}>Language-specific practice outside the course path.</p>
          </div>
          <span style={styles.comingSoon}>Coming soon</span>
        </div>
        <div style={styles.challengePlaceholder}>
          <Sparkles size={17} style={{ color: 'var(--algorithm)' }} />
          <div>
            <strong style={styles.challengeTitle}>Practice in new ways</strong>
            <p style={styles.challengeCopy}>Debugging drills, output-first builds, refactoring tasks, and mini-projects will live here.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  languageGrid: {
    display: 'grid',
    gap: 9,
  },
  languageCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    padding: '13px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--motion-fast) var(--ease-out)',
  },
  languageIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    flexShrink: 0,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    color: 'var(--accent)',
  },
  languageCardBody: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    gap: 2,
  },
  languageName: {
    color: 'var(--text-primary)',
    fontSize: 13.5,
    fontWeight: 600,
  },
  languageMeta: {
    color: 'var(--text-secondary)',
    fontSize: 11,
  },
  languageProgress: {
    color: 'var(--text-muted)',
    fontSize: 10.5,
  },
  languageArrow: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  backButton: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  languageHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  languagePageTitle: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 16,
  },
  languagePageCopy: {
    margin: '3px 0 0',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    lineHeight: 1.4,
  },
  sectionHeadingRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 9,
  },
  sectionTitle: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  sectionCopy: {
    margin: '2px 0 0',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    lineHeight: 1.4,
  },
  sectionCount: {
    padding: '2px 7px',
    border: '1px solid var(--border)',
    borderRadius: 999,
    color: 'var(--text-muted)',
    fontSize: 10,
    fontWeight: 700,
  },
  courseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  challengesSection: {
    paddingTop: 2,
  },
  comingSoon: {
    padding: '2px 7px',
    borderRadius: 999,
    background: 'var(--algorithm-soft)',
    color: 'var(--algorithm)',
    fontSize: 9.5,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  challengePlaceholder: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 9,
    padding: 11,
    border: '1px dashed var(--border-strong)',
    borderRadius: 8,
    background: 'var(--bg-tertiary)',
  },
  challengeTitle: {
    color: 'var(--text-secondary)',
    fontSize: 11.5,
  },
  challengeCopy: {
    margin: '3px 0 0',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    lineHeight: 1.45,
  },

  track: {
    display: 'flex',
    flexDirection: 'column',
  },

  trackHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
  },

  trackTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },

  trackProgress: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    padding: '1px 7px',
    borderRadius: 999,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
  },

  trackChevron: {
    color: 'var(--text-muted)',
    transition: 'transform var(--motion-fast) var(--ease-out)',
    flexShrink: 0,
  },

  trackChevronCollapsed: {
    transform: 'rotate(-90deg)',
  },

  trackDesc: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    lineHeight: 1.4,
    margin: '0 0 10px',
  },

  lessonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--motion-fast) var(--ease-out)',
  },

  lessonItemActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-soft, rgba(37, 99, 235, 0.12))',
  },

  statusIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  lessonTitle: {
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    flex: 1,
  },

  lessonTitleActive: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },

  activeIndicator: {
    color: 'var(--accent)',
  },
};
