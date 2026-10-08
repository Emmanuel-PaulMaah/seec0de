import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import BulletinSection from './BulletinSection';
import { ExpandingArrowButton } from './motion/expanding-arrow-button';
import { TextReveal } from './motion/text-reveal';
import { ChromaticName } from './motion/chromatic-text-reveal';

// Language ids come from the lesson data; only a handful ever appear here.
const LANGUAGE_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  css: 'CSS',
  html: 'HTML',
  git: 'Git & GitHub',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
};

export default function HomeScreen({
  username,
  hasActiveLesson,
  activeLessonTitle,
  activeLessonLanguage,
  onOpenWorkspace,
  onOpenLearnMode,
  hideWordmark,
}) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const lessonMeta = LANGUAGE_LABELS[activeLessonLanguage] || 'Guided lesson';

  // The shell is a flat solid surface; only the accent tile animates. The tile
  // is the expanding-arrow CTA's whole idea, so it carries the brand colour on
  // the primary and stays neutral on the secondary.
  const ctaShell =
    'home-cta w-full min-w-0 rounded-[18px] border border-[color:var(--border-strong)] ' +
    'bg-[var(--bg-secondary)] text-[color:var(--text-primary)] ' +
    'focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-[var(--bg-primary)]';

  // min-w-0 so long lesson titles ellipsize instead of clipping at the edge.
  const ctaLabel = 'min-w-0 truncate text-[15px]';

  return (
    <main className="home-screen">
      <section className="home-content" aria-labelledby="home-heading">
        <div className="home-kicker"><Sparkles size={12} /> Your coding home</div>
        {username ? (
          <h1 ref={headingRef} tabIndex={-1} id="home-heading" className="home-heading">
            {'Welcome back,'.split(' ').map((word, i, arr) => (
              <span key={`w-${i}`} className="inline-block whitespace-pre beui-text-reveal-word" style={{
                '--ty': '20px', '--blur': '6px',
                opacity: 0, transform: 'translateY(20px)', filter: 'blur(6px)',
                animation: `beui-text-reveal-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s forwards`,
              }}>{word}{i < arr.length - 1 ? '\u00A0' : '\u00A0'}</span>
            ))}
            {'\u00A0'}
            <ChromaticName duration={2} delay={0.5}>{username}</ChromaticName>
            <span className="inline-block whitespace-pre beui-text-reveal-word" style={{
              '--ty': '20px', '--blur': '6px',
              opacity: 0, transform: 'translateY(20px)', filter: 'blur(6px)',
              animation: 'beui-text-reveal-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards',
            }}>.</span>
          </h1>
        ) : (
          <TextReveal
            as="h1"
            ref={headingRef}
            tabIndex={-1}
            id="home-heading"
            text="Welcome to seec0de."
            stagger={0.06}
            blur={6}
            yOffset={20}
            className="home-heading"
          />
        )}
        <div className="home-entry-grid">
          <ExpandingArrowButton
            onClick={onOpenLearnMode}
            className={ctaShell}
            accentClassName="bg-[var(--accent)] text-[color:var(--text-on-accent)]"
            activeLabelClassName="text-[color:var(--text-on-accent)]"
            labelClassName={ctaLabel}
            aria-label={
              hasActiveLesson
                ? `Continue ${lessonMeta} lesson: ${activeLessonTitle || 'your lesson'}`
                : 'Browse courses'
            }
          >
            {hasActiveLesson ? 'Continue lesson' : 'Browse courses'}
          </ExpandingArrowButton>

          <ExpandingArrowButton
            onClick={onOpenWorkspace}
            className={ctaShell}
            accentClassName="bg-neutral-300 text-neutral-950"
            activeLabelClassName="text-neutral-950"
            labelClassName={ctaLabel}
            aria-label="Open the workspace editor"
          >
            Open workspace
          </ExpandingArrowButton>
        </div>

        <BulletinSection />

        <div className="home-future">
          <span className="home-future-dot" />
          Community features coming soon
        </div>
      </section>

      {!hideWordmark && <div className="home-wordmark" aria-hidden="true">seec0de</div>}
    </main>
  );
}
