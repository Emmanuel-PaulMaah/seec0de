import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Trap Tab focus inside `ref` while `active`, then return focus to whatever
 * had it before — the same contract as <Dialog>, for the hand-rolled modals
 * (ProfileGate, OnboardingModal, WorkspaceTour, StartBuildDialog,
 * LearningLibraryModal) that predate it.
 *
 * `initialFocusRef` picks the element focused on open (defaults to the first
 * focusable inside, else the container). Pass a stable ref; `active` is the
 * only value that re-runs the trap. Escape handling stays with the component
 * — it owns its own close rules.
 */
export function useFocusTrap(ref, active, { initialFocusRef } = {}) {
  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;
    const previouslyFocused = document.activeElement;
    // A child may already have claimed focus (OTPInput autoFocus); stealing it
    // back to the container would fight that. Otherwise start at the first
    // focusable (or the caller's pick).
    const alreadyInside = previouslyFocused instanceof HTMLElement
      && container.contains(previouslyFocused);
    if (!alreadyInside) {
      const initial = initialFocusRef?.current
        || container.querySelector(FOCUSABLE)
        || container;
      initial.focus();
    }

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(container.querySelectorAll(FOCUSABLE))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // Capture phase so the trap sees Tab before anything inside can swallow it.
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [ref, active, initialFocusRef]);
}
