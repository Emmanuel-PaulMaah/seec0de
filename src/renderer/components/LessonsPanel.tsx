import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, BookOpen, ChevronDown, Code2, Sparkles } from 'lucide-react';
import lessonsData from '../data/lessons/index.js';
import { cn } from '@/lib/utils';

const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
  py: 'Python', python: 'Python', java: 'Java', cpp: 'C++', csharp: 'C#', go: 'Go', nodejs: 'Node.js', rust: 'Rust', git: 'Git & GitHub',
};

export function formatLanguage(id: string): string { return LANGUAGE_LABELS[id] || id; }

interface LessonsPanelProps {
  completedLessons?: string[];
  onSelectLesson?: (lesson: any) => void;
  activeLessonId?: string | null;
  selectedLanguage?: string | null;
  onSelectLanguage?: (lang: string | null) => void;
}

export default function LessonsPanel({ completedLessons = [], onSelectLesson, activeLessonId, selectedLanguage = null, onSelectLanguage }: LessonsPanelProps) {
  const { tracks } = lessonsData as any;
  const uniqueLanguages = useMemo(() => {
    const available = Array.from(new Set(tracks.map((t: any) => t.language).filter(Boolean))) as string[];
    const preferredOrder = ['python', 'javascript', 'typescript', 'react', 'git', 'nodejs'];
    return available.sort((a, b) => { const ai = preferredOrder.indexOf(a); const bi = preferredOrder.indexOf(b); if (ai === -1 && bi === -1) return formatLanguage(a).localeCompare(formatLanguage(b)); if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi; });
  }, [tracks]);
  const [collapsedTracks, setCollapsedTracks] = useState<Record<string, boolean>>({});
  const toggleTrack = (id: string) => setCollapsedTracks((c) => ({ ...c, [id]: !c[id] }));
  const visibleTracks = tracks.filter((t: any) => t.language === selectedLanguage);

  if (!selectedLanguage) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-2">
          {uniqueLanguages.map((language) => {
            const langTracks = tracks.filter((t: any) => t.language === language);
            const lessons = langTracks.flatMap((t: any) => t.lessons || []);
            const done = lessons.filter((l: any) => completedLessons.includes(l.id)).length;
            return (
              <button key={language} type="button" className="flex items-center gap-2.5 w-full py-3 px-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-left transition-all duration-[var(--motion-fast)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={() => onSelectLanguage?.(language)}>
                <span className="flex items-center justify-center w-[38px] h-[38px] shrink-0 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-[var(--accent)]"><Code2 size={20} /></span>
                <span className="flex flex-1 min-w-0 flex-col gap-0.5">
                  <strong className="text-[var(--text-primary)] text-[13.5px] font-semibold">{formatLanguage(language)}</strong>
                  <span className="text-[var(--text-secondary)] text-[11px]">{langTracks.length} {langTracks.length === 1 ? 'course' : 'courses'} · {lessons.length} lessons</span>
                  <span className="text-[var(--text-muted)] text-[10.5px]">{done}/{lessons.length} lessons complete</span>
                </span>
                <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button type="button" className="self-start inline-flex items-center gap-1 p-0 border-none bg-transparent text-[var(--text-muted)] text-[11px] hover:text-[var(--text-primary)]" onClick={() => onSelectLanguage?.(null)}>
        <ChevronLeft size={13} /> All languages
      </button>
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-[38px] h-[38px] shrink-0 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-[var(--accent)]"><Code2 size={20} /></span>
        <div>
          <h3 className="m-0 text-[var(--text-primary)] text-base font-semibold">{formatLanguage(selectedLanguage)}</h3>
          <p className="mt-0.5 text-[var(--text-muted)] text-[10.5px] leading-normal">Choose a course now, or return later for focused challenges.</p>
        </div>
      </div>

      <section aria-labelledby="learn-courses-heading">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 id="learn-courses-heading" className="m-0 text-[var(--text-primary)] text-[13px]">Courses</h3>
            <p className="mt-0.5 text-[var(--text-muted)] text-[10.5px] leading-normal">Guided lessons that build one skill at a time.</p>
          </div>
          <span className="px-[7px] py-0.5 border border-[var(--border)] rounded-full text-[var(--text-muted)] text-[10px] font-bold">{visibleTracks.length}</span>
        </div>
        <div className="flex flex-col gap-4">
          {visibleTracks.map((track: any) => {
            const lessons = track.lessons || [];
            const total = lessons.length;
            const done = lessons.filter((l: any) => completedLessons.includes(l.id)).length;
            const isCollapsed = !!collapsedTracks[track.id];
            return (
              <div key={track.id} className="flex flex-col">
                <button type="button" className="flex items-center gap-2 mb-1 w-full bg-transparent border-none p-0 cursor-pointer text-left" onClick={() => toggleTrack(track.id)} aria-expanded={!isCollapsed}>
                  <BookOpen size={13} className="text-[var(--accent)]" />
                  <span className="text-[12px] font-semibold text-[var(--text-primary)] uppercase tracking-[0.5px] flex-1">{track.name}</span>
                  <span className="text-[10.5px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] border border-[var(--border)] px-[7px] py-0.5 rounded-full tabular-nums font-semibold">{done}/{total}</span>
                  <ChevronDown size={14} className={cn('text-[var(--text-muted)] shrink-0 transition-transform duration-[var(--motion-fast)]', isCollapsed && '-rotate-90')} />
                </button>
                {!isCollapsed && track.description && <p className="text-[11.5px] text-[var(--text-muted)] leading-normal m-0 mb-2.5">{track.description}</p>}
                {!isCollapsed && (
                  <div className="flex flex-col gap-1">
                    {lessons.map((lesson: any) => {
                      const isCompleted = completedLessons.includes(lesson.id);
                      const isActive = activeLessonId === lesson.id;
                      return (
                        <button key={lesson.id} className={cn('flex items-center gap-2.5 py-2 px-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-md cursor-pointer text-left transition-all duration-[var(--motion-fast)]', isActive && 'border-[var(--accent)] bg-[var(--accent-soft)]')} onClick={() => onSelectLesson({ ...lesson, language: track.language })} title={lesson.summary || lesson.title}>
                          <span className="flex items-center justify-center shrink-0">
                            {isCompleted ? <CheckCircle2 size={14} className="text-[var(--success)]" /> : <Circle size={14} className="text-[var(--text-muted)]" />}
                          </span>
                          <span className={cn('text-[12.5px] flex-1', isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]')}>{lesson.title}</span>
                          {isActive && <ChevronRight size={14} className="text-[var(--accent)]" />}
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

      <section aria-labelledby="learn-challenges-heading" className="pt-0.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 id="learn-challenges-heading" className="m-0 text-[var(--text-primary)] text-[13px]">Challenges</h3>
            <p className="mt-0.5 text-[var(--text-muted)] text-[10.5px] leading-normal">Language-specific practice outside the course path.</p>
          </div>
          <span className="px-[7px] py-0.5 rounded-full bg-[var(--algorithm-soft)] text-[var(--algorithm)] text-[9.5px] font-bold whitespace-nowrap">Coming soon</span>
        </div>
        <div className="flex items-start gap-2 p-2.5 border border-dashed border-[var(--border-strong)] rounded-lg bg-[var(--bg-tertiary)]">
          <Sparkles size={17} className="text-[var(--algorithm)] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[var(--text-secondary)] text-[11.5px]">Practice in new ways</strong>
            <p className="mt-0.5 text-[var(--text-muted)] text-[10.5px] leading-[1.45]">Debugging drills, output-first builds, refactoring tasks, and mini-projects will live here.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
