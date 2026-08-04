import React, { useEffect, useRef } from 'react';
import { ArrowRight, Code2, GraduationCap, Image, Sparkles } from 'lucide-react';

export default function HomeScreen({
  username,
  hasActiveLesson,
  postcardCount = 0,
  onOpenWorkspace,
  onOpenLearnMode,
  onOpenPostcards,
}) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="home-screen" style={styles.screen}>
      <div style={styles.grid} aria-hidden="true" />
      <div style={styles.glow} aria-hidden="true" />

      <section className="home-content" style={styles.content} aria-labelledby="home-heading">
        <div style={styles.kicker}><Sparkles size={12} /> Your coding home</div>
        <h1 ref={headingRef} tabIndex={-1} id="home-heading" style={styles.heading}>
          {username ? `Welcome back, ${username}.` : 'Welcome to seec0de.'}
        </h1>
        <p style={styles.intro}>
          Learn with a guide or open the full workspace. Your drafts and progress stay where you left them.
        </p>

        <div className="home-launch-grid" style={styles.launchGrid}>
          <button type="button" className="home-launch-card" style={styles.launchCard} onClick={onOpenLearnMode}>
            <span style={styles.cardIcon}><GraduationCap size={18} /></span>
            <span style={styles.cardCopy}>
              <span style={styles.cardEyebrow}>Guided path</span>
              <strong style={styles.cardTitle}>{hasActiveLesson ? 'Continue learning' : 'Start Learn Mode'}</strong>
              <span style={styles.cardText}>Lessons, activities, feedback, and saved progress.</span>
            </span>
            <ArrowRight size={17} style={styles.arrow} />
          </button>

          <button type="button" className="home-launch-card" style={styles.launchCard} onClick={onOpenWorkspace}>
            <span style={styles.cardIcon}><Code2 size={18} /></span>
            <span style={styles.cardCopy}>
              <span style={styles.cardEyebrow}>Build freely</span>
              <strong style={styles.cardTitle}>Open Workspace</strong>
              <span style={styles.cardText}>Files, editor, terminal, runner, and explanations.</span>
            </span>
            <ArrowRight size={17} style={styles.arrow} />
          </button>

           {/*<button type="button" className="home-launch-card" style={styles.launchCard} onClick={onOpenPostcards}>
            <span style={{ ...styles.cardIcon, ...styles.postcardIcon }}><Image size={18} /></span>
            <span style={styles.cardCopy}>
              <span style={styles.cardEyebrow}>Your creations</span>
              <strong style={styles.cardTitle}>Postcards</strong>
              <span style={styles.cardText}>{postcardCount > 0 ? `${postcardCount} saved · capture or export a snippet.` : 'Save code, output, and what you learned.'}</span>
            </span>
            <ArrowRight size={17} style={styles.arrow} />
          </button>*/}

        </div>

        <div style={styles.futureLine}>
          <span style={styles.futureDot} />
          Community features coming soon
        </div>
      </section>

      <div className="home-wordmark" style={styles.wordmark} aria-hidden="true">seec0de</div>
    </main>
  );
}

const styles = {
  screen: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-primary)',
    isolation: 'isolate',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    zIndex: -3,
    opacity: 0.2,
    backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
    backgroundSize: '64px 64px',
    maskImage: 'linear-gradient(to bottom, black, transparent 76%)',
  },
  glow: {
    position: 'absolute',
    zIndex: -2,
    top: '-28%',
    right: '-12%',
    width: '60vw',
    height: '60vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--accent-soft), transparent 68%)',
  },
  content: {
    width: 'min(880px, calc(100% - 64px))',
    margin: '0 auto',
    padding: 'clamp(42px, 8vh, 80px) 0 clamp(110px, 17vh, 170px)',
  },
  kicker: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    color: 'var(--accent)',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heading: {
    maxWidth: 720,
    margin: '14px 0 0',
    color: 'var(--text-primary)',
    fontSize: 'clamp(34px, 5.4vw, 68px)',
    fontWeight: 700,
    letterSpacing: '-0.055em',
    lineHeight: 0.98,
  },
  intro: {
    maxWidth: 570,
    margin: '18px 0 0',
    color: 'var(--text-secondary)',
    fontSize: 13,
    lineHeight: 1.65,
  },
  launchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginTop: 30,
  },
  launchCard: {
    display: 'grid',
    gridTemplateColumns: '38px 1fr auto',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    padding: 16,
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    background: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
    color: 'var(--text-primary)',
    textAlign: 'left',
  },
  cardIcon: {
    width: 38,
    height: 38,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
  },
  postcardIcon: { color: 'var(--string)', background: 'color-mix(in srgb, var(--string) 14%, transparent)' },
  cardCopy: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  cardEyebrow: {
    color: 'var(--text-muted)',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: { color: 'var(--text-primary)', fontSize: 13.5 },
  cardText: { color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.4 },
  arrow: { color: 'var(--text-muted)' },
  futureLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    color: 'var(--text-muted)',
    fontSize: 10.5,
  },
  futureDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 12px var(--accent)',
  },
  wordmark: {
    position: 'absolute',
    left: '50%',
    bottom: '-0.24em',
    zIndex: -1,
    transform: 'translateX(-50%)',
    color: 'var(--text-primary)',
    opacity: 0.055,
    fontSize: 'clamp(120px, 23vw, 360px)',
    fontWeight: 700,
    letterSpacing: '-0.095em',
    lineHeight: 0.78,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
};
