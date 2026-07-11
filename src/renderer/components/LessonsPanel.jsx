import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  BookOpen,
  ChevronDown,
  Code2,
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

function formatLanguage(id) {
  return LANGUAGE_LABELS[id] || id;
}

export default function LessonsPanel({ completedLessons = [], onSelectLesson, activeLessonId }) {
  const { tracks } = lessonsData;

  const uniqueLanguages = useMemo(() => {
    return Array.from(new Set(tracks.map(t => t.language).filter(Boolean)));
  }, [tracks]);

  const [selectedLanguage, setSelectedLanguage] = useState(uniqueLanguages[0] || 'javascript');
  const [collapsedTracks, setCollapsedTracks] = useState({});

  function toggleTrack(trackId) {
    setCollapsedTracks((current) => ({
      ...current,
      [trackId]: !current[trackId],
    }));
  }

  const visibleTracks = tracks.filter((track) => track.language === selectedLanguage);

  return (
    <div style={styles.container}>
      {uniqueLanguages.length > 0 && (
        <div style={styles.languageSelectorRow}>
          {uniqueLanguages.map((lang) => {
            const isActive = lang === selectedLanguage;
            return (
              <button
                key={lang}
                type="button"
                style={{
                  ...styles.langPill,
                  ...(isActive ? styles.langPillActive : {}),
                }}
                onClick={() => setSelectedLanguage(lang)}
              >
                {formatLanguage(lang)}
              </button>
            );
          })}
        </div>
      )}

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
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  languageSelectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  langPill: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'all var(--motion-fast) var(--ease-out)',
  },

  langPillActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--text-secondary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
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
