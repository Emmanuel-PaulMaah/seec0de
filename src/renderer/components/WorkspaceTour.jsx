import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Lottie } from 'lottie-react';
import { useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useFocusTrap } from '../lib/hooks/use-focus-trap';
import navScene from '../assets/lottie/tour-nav.json';
import englishScene from '../assets/lottie/stage-english.json';
import codeScene from '../assets/lottie/stage-code.json';
import previewScene from '../assets/lottie/tour-preview.json';
import explainScene from '../assets/lottie/tour-explain.json';
import terminalScene from '../assets/lottie/tour-terminal.json';

// Each stop in the tour gets its own transform-only Lottie scene. The art is
// deliberately dark in both themes (same rule as LottieStage): it is a code
// surface, not a panel, so one palette is enough. The step copy, not the art,
// carries the explanation.
const SCENES = {
  nav: { animationData: navScene, file: 'workspace' },
  english: { animationData: englishScene, file: 'plain-english.txt' },
  code: { animationData: codeScene, file: 'main.py' },
  preview: { animationData: previewScene, file: 'preview.html' },
  explain: { animationData: explainScene, file: 'explanation' },
  terminal: { animationData: terminalScene, file: 'workspace — zsh' },
};

const STEPS = [
  {
    selector: '[data-tour="mode-switch"]',
    scene: 'nav',
    title: 'Move around seec0de',
    body: 'Use Home for your dashboard, Workspace to build freely, and Learn for guided lessons.',
  },
  {
    selector: '[data-workspace-panel="guide"]',
    scene: 'english',
    title: 'Describe what you want to build',
    body: 'Generate turns a plain-English prompt into pseudocode and code in your languages. Open a folder to browse your files, or switch to Build for a guided project — sample or AI-made — checked step by step.',
  },
  {
    selector: '[data-workspace-panel="editor"]',
    scene: 'code',
    title: 'Read, edit, save, and run',
    body: 'Your generated code and open files live in the editor. Select code when you want a focused explanation.',
  },
  {
    selector: '[data-workspace-panel="result"]',
    scene: 'preview',
    title: 'See the result immediately',
    body: 'Preview web output, inspect console messages, and read runtime errors beside your code.',
  },
  {
    selector: '[data-workspace-panel="explanation"]',
    scene: 'explain',
    title: 'Understand unfamiliar code',
    body: 'The explanation panel breaks selected code down line by line so you can learn what each part does.',
  },
  {
    selector: '[data-workspace-panel="terminal"]',
    scene: 'terminal',
    title: 'Use the built-in terminal',
    body: 'Run project commands without leaving the workspace. You can reopen it any time with Ctrl + `.',
  },
];

const PADDING = 6;
const CARD_WIDTH = 368;
// Tall enough for the art header plus the longest body copy. Only used to keep
// the card inside the viewport when choosing a placement.
const CARD_HEIGHT = 380;
const GAP = 14;

export default function WorkspaceTour({ open, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const reduce = useReducedMotion();
  const cardRef = useRef(null);

  // Modal contract: Tab stays inside the card (it renders only once the
  // target rect is measured) and focus returns to the trigger on close. The
  // per-step card.focus() below still wins because focus is already inside.
  useFocusTrap(cardRef, open && !!targetRect);

  useEffect(() => {
    if (open) setStepIdx(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const target = document.querySelector(STEPS[stepIdx].selector);
    if (!target) {
      setTargetRect(null);
      return undefined;
    }

    const update = () => {
      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: Math.max(0, rect.top - PADDING),
        left: Math.max(0, rect.left - PADDING),
        right: Math.min(window.innerWidth, rect.right + PADDING),
        bottom: Math.min(window.innerHeight, rect.bottom + PADDING),
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      });
    };

    update();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [open, stepIdx]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowRight') {
        setStepIdx((index) => Math.min(index + 1, STEPS.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setStepIdx((index) => Math.max(index - 1, 0));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, stepIdx]);

  if (!open || !targetRect) return null;

  const step = STEPS[stepIdx];
  const scene = SCENES[step.scene] || SCENES.english;
  const isLast = stepIdx === STEPS.length - 1;
  const cardPosition = positionCard(targetRect);
  const shade = 'rgba(5, 8, 12, 0.76)';
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <div style={styles.root} aria-live="polite">
      <div style={{ ...styles.blocker, top: 0, left: 0, right: 0, height: targetRect.top, background: shade }} />
      <div style={{ ...styles.blocker, top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height, background: shade }} />
      <div style={{ ...styles.blocker, top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height, background: shade }} />
      <div style={{ ...styles.blocker, top: targetRect.bottom, left: 0, right: 0, bottom: 0, background: shade }} />
      <div className="workspace-tour__spotlight" style={{ ...styles.highlight, ...targetRect }} />

      <section
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-tour-title"
        aria-describedby="workspace-tour-body"
        style={{ ...styles.card, ...cardPosition }}
      >
        <div style={styles.art} aria-hidden="true">
          <div style={styles.grid} />
          <div style={styles.glow} />

          <div style={styles.artMeta}>
            <span style={styles.eyebrow}>Workspace tour</span>
            <span style={styles.counter}>
              {String(stepIdx + 1).padStart(2, '0')}
              <span style={styles.counterTotal}> / {String(STEPS.length).padStart(2, '0')}</span>
            </span>
            <span style={styles.artFile}>{scene.file}</span>
          </div>

          <div style={styles.artCanvas}>
            <div style={styles.artZoom}>
              {reduce ? (
                <StaticArt scene={step.scene} />
              ) : (
                <Lottie
                  key={step.scene}
                  src={scene.animationData}
                  loop
                  autoplay
                  rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </div>
          </div>

          <span style={styles.progressTrack}>
            <span style={{ ...styles.progressFill, width: `${progress}%` }} />
          </span>
        </div>

        <button
          type="button"
          className="workspace-tour__close"
          style={styles.close}
          onClick={onClose}
          aria-label="Skip workspace tour"
        >
          <X size={14} />
        </button>

        <div
          key={stepIdx}
          style={{
            ...styles.content,
            animation: stepIdx === 0 ? 'none' : 'seec0de-pop-in var(--motion-base) var(--ease-out)',
          }}
        >
          <h2 id="workspace-tour-title" style={styles.title}>{step.title}</h2>
          <p id="workspace-tour-body" style={styles.body}>{step.body}</p>

          <div style={styles.actions}>
            <button
              type="button"
              style={{ ...styles.secondary, ...(stepIdx === 0 ? styles.hidden : {}) }}
              onClick={() => setStepIdx((index) => index - 1)}
              disabled={stepIdx === 0}
            >
              <ArrowLeft size={14} /> Back
            </button>

            <span style={styles.hint} aria-hidden="true">← → move · Esc skip</span>

            <button
              type="button"
              className="ui-primary-button"
              style={styles.primary}
              onClick={() => (isLast ? onClose?.() : setStepIdx((index) => index + 1))}
            >
              {isLast ? 'Start building' : 'Next'} {!isLast && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function positionCard(rect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const top = Math.max(GAP, Math.min(rect.top, viewportHeight - CARD_HEIGHT - GAP));
  const clampLeft = (candidate) => Math.max(
    GAP,
    Math.min(candidate, viewportWidth - CARD_WIDTH - GAP),
  );

  if (viewportWidth - rect.right >= CARD_WIDTH + GAP) return { top, left: clampLeft(rect.right + GAP) };
  if (rect.left >= CARD_WIDTH + GAP) return { top, left: clampLeft(rect.left - CARD_WIDTH - GAP) };

  const left = clampLeft(rect.left);
  if (viewportHeight - rect.bottom >= CARD_HEIGHT + GAP) return { top: rect.bottom + GAP, left };
  return { top: Math.max(GAP, rect.top - CARD_HEIGHT - GAP), left };
}

// ── Reduced-motion stills ───────────────────────────────────────────────────
// Under `prefers-reduced-motion` the Lottie player never plays, so it would sit
// on frame 0 — nothing at all. Draw the settled state instead, exactly like
// LottieStage does for onboarding.

const ART_ACCENT = '#c8ff4d';
const ART_MUTED = 'rgba(255, 255, 255, 0.16)';
const ART_FAINT = 'rgba(255, 255, 255, 0.09)';

const ENGLISH_BARS = [
  { x: 48, y: 96, w: 150, h: 14, tone: 'muted' },
  { x: 48, y: 126, w: 196, h: 14, tone: 'muted' },
  { x: 48, y: 156, w: 124, h: 14, tone: 'muted' },
  { x: 48, y: 186, w: 170, h: 14, tone: 'accent' },
];

const CODE_BARS = [
  { x: 48, y: 96, w: 132, h: 12, tone: 'muted' },
  { x: 48, y: 126, w: 100, h: 12, tone: 'accent' },
  { x: 48, y: 156, w: 156, h: 12, tone: 'muted' },
  { x: 48, y: 186, w: 88, h: 12, tone: 'muted' },
];

function ArtBar({ x, y, w, h = 10, tone = 'muted' }) {
  const fill = tone === 'accent' ? ART_ACCENT : tone === 'faint' ? ART_FAINT : ART_MUTED;
  return <rect x={x} y={y - h / 2} width={w} height={h} rx={h / 2} fill={fill} />;
}

function StaticArt({ scene }) {
  const svg = { viewBox: '0 0 320 320', style: styles.staticArt, 'aria-hidden': 'true' };

  if (scene === 'nav') {
    return (
      <svg {...svg}>
        <ellipse cx={160} cy={160} rx={58} ry={36} fill={ART_ACCENT} opacity={0.08} />
        {[88, 160, 232].map((cx, index) => (
          <g key={cx}>
            <rect x={cx - 41} y={138} width={82} height={44} rx={22} fill="rgba(255,255,255,0.08)" />
            <rect
              x={cx - [13, 17, 11][index]}
              y={157}
              width={[26, 34, 22][index]}
              height={6}
              rx={3}
              fill="rgba(255,255,255,0.26)"
            />
          </g>
        ))}
        <rect x={115} y={134} width={90} height={52} rx={26} fill="none" stroke={ART_ACCENT} strokeWidth={2.5} />
      </svg>
    );
  }

  if (scene === 'preview') {
    return (
      <svg {...svg}>
        <rect x={56} y={103} width={208} height={130} rx={14} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.20)" strokeWidth={2.5} />
        <circle cx={68} cy={120} r={2.5} fill="rgba(255,255,255,0.26)" />
        <circle cx={78} cy={120} r={2.5} fill="rgba(255,255,255,0.26)" />
        <circle cx={88} cy={120} r={2.5} fill={ART_ACCENT} />
        <rect x={62} y={129.25} width={196} height={1.5} rx={0.75} fill={ART_FAINT} />
        <ArtBar x={76} y={154} w={62} h={9} />
        <ArtBar x={76} y={174} w={82} h={9} />
        <ArtBar x={76} y={194} w={48} h={9} />
        <path d="M198 154 L198 198 L234 176 Z" fill={ART_ACCENT} />
      </svg>
    );
  }

  if (scene === 'explain') {
    return (
      <svg {...svg}>
        <rect x={34} y={156} width={112} height={24} rx={7} fill={ART_ACCENT} opacity={0.09} />
        <rect x={231} y={118} width={62} height={92} rx={12} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
        <polyline points="188,170 212,170 224,158 232,158" fill="none" stroke={ART_ACCENT} strokeOpacity={0.6} strokeWidth={1.5} />
        <ArtBar x={42} y={112} w={120} h={10} />
        <ArtBar x={42} y={140} w={150} h={10} />
        <ArtBar x={42} y={168} w={96} h={10} tone="accent" />
        <ArtBar x={42} y={196} w={132} h={10} />
        <ArtBar x={246} y={136} w={26} h={5} tone="accent" />
        <ArtBar x={246} y={154} w={32} h={5} />
        <ArtBar x={246} y={172} w={18} h={5} />
        <ArtBar x={246} y={190} w={24} h={5} />
      </svg>
    );
  }

  if (scene === 'terminal') {
    return (
      <svg {...svg}>
        <rect x={52} y={98} width={216} height={136} rx={12} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.18)" strokeWidth={2.5} />
        <circle cx={64} cy={114} r={2.5} fill="rgba(255,255,255,0.26)" />
        <circle cx={74} cy={114} r={2.5} fill="rgba(255,255,255,0.26)" />
        <circle cx={84} cy={114} r={2.5} fill={ART_ACCENT} />
        <rect x={56} y={123.25} width={208} height={1.5} rx={0.75} fill={ART_FAINT} />
        <polyline points="62,144 72,152 62,160" fill="none" stroke={ART_ACCENT} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={88} y={148} width={86} height={8} rx={4} fill="rgba(255,255,255,0.62)" />
        <rect x={180} y={146} width={4} height={11} rx={1} fill={ART_ACCENT} />
        <ArtBar x={66} y={178} w={128} h={7} />
        <ArtBar x={66} y={196} w={96} h={7} />
        <ArtBar x={66} y={214} w={70} h={7} />
      </svg>
    );
  }

  const bars = scene === 'code' ? CODE_BARS : ENGLISH_BARS;
  return (
    <svg {...svg}>
      {bars.map((bar) => (
        <ArtBar key={`${bar.y}-${bar.w}`} {...bar} />
      ))}
    </svg>
  );
}

const styles = {
  root: { position: 'fixed', inset: 0, zIndex: 1200, pointerEvents: 'none' },
  blocker: { position: 'fixed', pointerEvents: 'auto' },
  highlight: {
    position: 'fixed',
    border: '2px solid var(--accent)',
    borderRadius: 9,
    boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 0 24px var(--accent-soft)',
    pointerEvents: 'auto',
    transition: 'all var(--motion-base) var(--ease-out)',
  },
  card: {
    position: 'fixed',
    width: CARD_WIDTH,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    borderRadius: 14,
    outline: 'none',
    pointerEvents: 'auto',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    animation: 'seec0de-pop-in var(--motion-base) var(--ease-out)',
  },
  art: {
    position: 'relative',
    height: 138,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    background: '#0b0b0c',
    overflow: 'hidden',
    boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px),'
      + 'linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    maskImage: 'radial-gradient(120% 100% at 24% 30%, #000 24%, transparent 76%)',
    WebkitMaskImage: 'radial-gradient(120% 100% at 24% 30%, #000 24%, transparent 76%)',
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    right: -74,
    bottom: -126,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(200,255,77,0.11) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  artMeta: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minWidth: 0,
    padding: '16px 0 15px 17px',
    fontFamily: 'var(--font-mono)',
  },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.42)',
    whiteSpace: 'nowrap',
  },
  counter: {
    fontSize: 25,
    lineHeight: 1,
    letterSpacing: -1,
    color: '#ffffff',
    fontVariantNumeric: 'tabular-nums',
  },
  counterTotal: {
    fontSize: 13,
    letterSpacing: 0,
    color: 'rgba(255,255,255,0.28)',
  },
  artFile: {
    fontSize: 9.5,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.30)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artCanvas: {
    position: 'relative',
    width: 158,
    height: 138,
    flexShrink: 0,
    overflow: 'hidden',
  },
  // The square scenes carry generous empty margins; cropping the frame to a
  // wider box lets the drawing itself fill the banner.
  artZoom: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 188,
    height: 188,
    transform: 'translate(-50%, -50%)',
  },
  staticArt: { width: '100%', height: '100%', display: 'block' },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    background: 'rgba(255,255,255,0.07)',
  },
  progressFill: {
    display: 'block',
    height: '100%',
    borderRadius: '0 2px 2px 0',
    background: ART_ACCENT,
    transition: 'width var(--motion-base) var(--ease-out)',
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 999,
    background: 'rgba(0,0,0,0.24)',
    color: 'rgba(255,255,255,0.62)',
    cursor: 'pointer',
    zIndex: 2,
    WebkitBackdropFilter: 'blur(6px)',
    backdropFilter: 'blur(6px)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 18px 14px',
  },
  title: {
    margin: '0 0 7px',
    color: 'var(--text-primary)',
    fontSize: 18.5,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  body: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: 12.8,
    lineHeight: 1.55,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 32,
    padding: '0 11px',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-control)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  hidden: { visibility: 'hidden' },
  hint: {
    marginInline: 'auto',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: 0.2,
    whiteSpace: 'nowrap',
  },
  primary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 32,
    padding: '0 13px',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-control)',
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
