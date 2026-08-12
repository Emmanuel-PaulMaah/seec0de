import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

const STEPS = [
  {
    selector: '[data-tour="mode-switch"]',
    title: 'Move around seec0de',
    body: 'Use Home for your dashboard, Workspace to build freely, and Learn for guided lessons.',
  },
  {
    selector: '[data-workspace-panel="guide"]',
    title: 'Describe what you want to build',
    body: 'Write an instruction here and Generate turns it into pseudocode and working code in your chosen languages or open your local folders.',
  },
  {
    selector: '[data-workspace-panel="editor"]',
    title: 'Read, edit, save, and run',
    body: 'Your generated code and open files live in the editor. Select code when you want a focused explanation.',
  },
  {
    selector: '[data-workspace-panel="result"]',
    title: 'See the result immediately',
    body: 'Preview web output, inspect console messages, and read runtime errors beside your code.',
  },
  {
    selector: '[data-workspace-panel="explanation"]',
    title: 'Understand unfamiliar code',
    body: 'The explanation panel breaks selected code down line by line so you can learn what each part does.',
  },
  {
    selector: '[data-workspace-panel="terminal"]',
    title: 'Use the built-in terminal',
    body: 'Run project commands without leaving the workspace. You can reopen it any time with Ctrl + `.',
  },
];

const PADDING = 6;
const CARD_WIDTH = 340;
const CARD_HEIGHT = 210;
const GAP = 14;

export default function WorkspaceTour({ open, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const cardRef = useRef(null);

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
  const isLast = stepIdx === STEPS.length - 1;
  const cardPosition = positionCard(targetRect);
  const shade = 'rgba(5, 8, 12, 0.76)';

  return (
    <div style={styles.root} aria-live="polite">
      <div style={{ ...styles.blocker, top: 0, left: 0, right: 0, height: targetRect.top, background: shade }} />
      <div style={{ ...styles.blocker, top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height, background: shade }} />
      <div style={{ ...styles.blocker, top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height, background: shade }} />
      <div style={{ ...styles.blocker, top: targetRect.bottom, left: 0, right: 0, bottom: 0, background: shade }} />
      <div style={{ ...styles.highlight, ...targetRect }} />

      <section
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-tour-title"
        style={{ ...styles.card, ...cardPosition }}
      >
        <div style={styles.cardTop}>
          <span style={styles.progress}>Workspace tour · {stepIdx + 1} of {STEPS.length}</span>
          <button type="button" className="ui-icon-button" style={styles.close} onClick={onClose} aria-label="Skip workspace tour">
            <X size={15} />
          </button>
        </div>
        <h2 id="workspace-tour-title" style={styles.title}>{step.title}</h2>
        <p style={styles.body}>{step.body}</p>
        <div style={styles.actions}>
          <button
            type="button"
            style={{ ...styles.secondary, ...(stepIdx === 0 ? styles.hidden : {}) }}
            onClick={() => setStepIdx((index) => index - 1)}
            disabled={stepIdx === 0}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            type="button"
            className="ui-primary-button"
            style={styles.primary}
            onClick={() => (isLast ? onClose?.() : setStepIdx((index) => index + 1))}
          >
            {isLast ? 'Start building' : 'Next'} {!isLast && <ArrowRight size={14} />}
          </button>
        </div>
      </section>
    </div>
  );
}

function positionCard(rect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const top = Math.max(GAP, Math.min(rect.top, viewportHeight - CARD_HEIGHT - GAP));

  if (viewportWidth - rect.right >= CARD_WIDTH + GAP) return { top, left: rect.right + GAP };
  if (rect.left >= CARD_WIDTH + GAP) return { top, left: rect.left - CARD_WIDTH - GAP };

  const left = Math.max(GAP, Math.min(rect.left, viewportWidth - CARD_WIDTH - GAP));
  if (viewportHeight - rect.bottom >= CARD_HEIGHT + GAP) return { top: rect.bottom + GAP, left };
  return { top: Math.max(GAP, rect.top - CARD_HEIGHT - GAP), left };
}

const styles = {
  root: { position: 'fixed', inset: 0, zIndex: 1200, pointerEvents: 'none' },
  blocker: { position: 'fixed', pointerEvents: 'auto' },
  highlight: {
    position: 'fixed',
    border: '2px solid var(--accent)',
    borderRadius: 8,
    boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 0 24px var(--accent-soft)',
    pointerEvents: 'auto',
    transition: 'all var(--motion-base) var(--ease-out)',
  },
  card: {
    position: 'fixed', width: CARD_WIDTH, minHeight: 190, zIndex: 1,
    padding: 18, borderRadius: 10, outline: 'none', pointerEvents: 'auto',
    background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
    boxShadow: 'var(--shadow-lg)', animation: 'seec0de-pop-in var(--motion-base) var(--ease-out)',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  progress: { color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' },
  close: { width: 28, height: 28, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center' },
  title: { margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 19, lineHeight: 1.3 },
  body: { margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.55 },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  secondary: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)' },
  hidden: { visibility: 'hidden' },
  primary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', border: '1px solid var(--accent)', borderRadius: 6, background: 'var(--accent)', color: 'var(--text-on-accent)', fontWeight: 600 },
};
