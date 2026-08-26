import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  selector: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  { selector: '[data-tour="mode-switch"]', title: 'Move around seec0de', body: 'Use Home for your dashboard, Workspace to build freely, and Learn for guided lessons.' },
  { selector: '[data-workspace-panel="guide"]', title: 'Describe what you want to build', body: 'Write an instruction here and Generate turns it into pseudocode and working code in your chosen languages or open your local folders.' },
  { selector: '[data-workspace-panel="editor"]', title: 'Read, edit, save, and run', body: 'Your generated code and open files live in the editor. Select code when you want a focused explanation.' },
  { selector: '[data-workspace-panel="result"]', title: 'See the result immediately', body: 'Preview web output, inspect console messages, and read runtime errors beside your code.' },
  { selector: '[data-workspace-panel="explanation"]', title: 'Understand unfamiliar code', body: 'The explanation panel breaks selected code down line by line so you can learn what each part does.' },
  { selector: '[data-workspace-panel="terminal"]', title: 'Use the built-in terminal', body: 'Run project commands without leaving the workspace. You can reopen it any time with Ctrl + `.' },
];

const PADDING = 6;
const CARD_WIDTH = 340;
const CARD_HEIGHT = 210;
const GAP = 14;

interface WorkspaceTourProps {
  open?: boolean;
  onClose?: () => void;
}

export default function WorkspaceTour({ open, onClose }: WorkspaceTourProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setStepIdx(0); }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const target = document.querySelector(STEPS[stepIdx].selector);
    if (!target) { setTargetRect(null); return undefined; }
    const update = () => {
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: Math.max(0, rect.top - PADDING), left: Math.max(0, rect.left - PADDING), right: Math.min(window.innerWidth, rect.right + PADDING), bottom: Math.min(window.innerHeight, rect.bottom + PADDING), width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 });
    };
    update();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [open, stepIdx]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStepIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => { if (open) cardRef.current?.focus(); }, [open, stepIdx]);

  if (!open || !targetRect) return null;

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const cardPosition = positionCard(targetRect);
  const shade = 'rgba(5, 8, 12, 0.76)';

  return (
    <div className="fixed inset-0 z-[1200] pointer-events-none" aria-live="polite">
      {/*遮罩 */}
      <div className="fixed pointer-events-auto" style={{ top: 0, left: 0, right: 0, height: targetRect.top, background: shade }} />
      <div className="fixed pointer-events-auto" style={{ top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height, background: shade }} />
      <div className="fixed pointer-events-auto" style={{ top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height, background: shade }} />
      <div className="fixed pointer-events-auto" style={{ top: targetRect.bottom, left: 0, right: 0, bottom: 0, background: shade }} />
      <div className="fixed pointer-events-auto border-2 border-[var(--accent)] rounded-lg" style={{ ...targetRect, boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 0 24px var(--accent-soft)', transition: 'all var(--motion-base) var(--ease-out)' }} />

      {/* Card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-tour-title"
        className="fixed z-[1] min-h-[190px] p-[18px] rounded-[10px] outline-none pointer-events-auto bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-[var(--shadow-lg)] animate-[seec0de-pop-in_var(--motion-base)_var(--ease-out)]"
        style={{ width: CARD_WIDTH, ...cardPosition }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[var(--accent)] text-[11px] font-bold tracking-[0.5px] uppercase">Workspace tour · {stepIdx + 1} of {STEPS.length}</span>
          <button type="button" onClick={onClose} aria-label="Skip workspace tour" className="w-7 h-7 border-none rounded-md bg-transparent text-[var(--text-muted)] grid place-items-center hover:text-[var(--text-primary)]">
            <X size={15} />
          </button>
        </div>
        <h2 id="workspace-tour-title" className="m-0 mb-2 text-[var(--text-primary)] text-[19px] leading-normal">{step.title}</h2>
        <p className="m-0 text-[var(--text-secondary)] text-[13px] leading-relaxed">{step.body}</p>
        <div className="flex justify-between items-center mt-5">
          <Button variant="outline" size="sm" onClick={() => setStepIdx((i) => i - 1)} disabled={stepIdx === 0} className={cn(stepIdx === 0 && 'invisible')}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
          <Button size="sm" onClick={() => (isLast ? onClose?.() : setStepIdx((i) => i + 1))}>
            {isLast ? 'Start building' : 'Next'} {!isLast && <ArrowRight size={14} className="ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function positionCard(rect: { top: number; left: number; right: number; bottom: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(GAP, Math.min(rect.top, vh - CARD_HEIGHT - GAP));
  if (vw - rect.right >= CARD_WIDTH + GAP) return { top, left: rect.right + GAP };
  if (rect.left >= CARD_WIDTH + GAP) return { top, left: rect.left - CARD_WIDTH - GAP };
  const left = Math.max(GAP, Math.min(rect.left, vw - CARD_WIDTH - GAP));
  if (vh - rect.bottom >= CARD_HEIGHT + GAP) return { top: rect.bottom + GAP, left };
  return { top: Math.max(GAP, rect.top - CARD_HEIGHT - GAP), left };
}
