import React from 'react';
import { CheckCircle2, Circle, ChevronRight, BookOpen } from 'lucide-react';
import lessonsData from '../data/lessons.json';

// LessonsPanel — the directory of available lessons.
//
// Pure list view: one section per track, one row per lesson. The row
// shows a completion glyph + the lesson title; clicking it asks the
// parent to make that lesson active.
//
// The active-lesson teaching surface (with task, hints, status, solution)
// is rendered separately by ActiveLessonCard inside InstructionPanel.

export default function LessonsPanel({ completedLessons = [], onSelectLesson, activeLessonId }) {
  const { tracks } = lessonsData;

  return (
    <div style={styles.container}>
      {tracks.map((track) => {
        const total = (track.lessons || []).length;
        const done  = (track.lessons || []).filter((l) => completedLessons.includes(l.id)).length;

        return (
          <div key={track.id} style={styles.track}>
            <div style={styles.trackHeader}>
              <BookOpen size={13} style={{ color: 'var(--accent)' }} />
              <div style={styles.trackTitle}>{track.name}</div>
              <span style={styles.trackProgress}>{done}/{total}</span>
            </div>
            {track.description && <p style={styles.trackDesc}>{track.description}</p>}

            <div style={styles.lessonList}>
              {(track.lessons || []).map((lesson) => {
                const isCompleted = completedLessons.includes(lesson.id);
                const isActive    = activeLessonId === lesson.id;

                return (
                  <button
                    key={lesson.id}
                    style={{
                      ...styles.lessonItem,
                      ...(isActive ? styles.lessonItemActive : {}),
                    }}
                    onClick={() => onSelectLesson(lesson)}
                    title={lesson.summary || lesson.title}
                  >
                    <span style={styles.statusIcon}>
                      {isCompleted ? (
                        <CheckCircle2 size={14} style={{ color: 'var(--success, #4ade80)' }} />
                      ) : (
                        <Circle size={14} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </span>
                    <span style={{
                      ...styles.lessonTitle,
                      ...(isActive ? styles.lessonTitleActive : {}),
                    }}>
                      {lesson.title}
                    </span>
                    {isActive && <ChevronRight size={14} style={styles.activeIndicator} />}
                  </button>
                );
              })}
            </div>
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
  track: {
    display: 'flex',
    flexDirection: 'column',
  },
  trackHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
