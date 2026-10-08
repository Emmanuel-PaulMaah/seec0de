import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from './button';

// Modal dialog: traps Tab focus inside, closes on Esc or scrim click, and
// returns focus to whatever opened it. aria-modal also pauses the global
// workspace shortcuts in App.jsx. Styling: .ui-dialog* in global.css.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Dialog({
  open,
  onClose,
  title,
  description,
  initialFocusRef,
  className,
  children,
  footer,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const first = initialFocusRef?.current || panel.querySelector(FOCUSABLE) || panel;
    first.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) { e.preventDefault(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    // Capture phase so Esc doesn't also reach window-level listeners
    // (e.g. the drawer or panel underneath).
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      className="ui-dialog-scrim"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCloseRef.current?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn('ui-dialog', className)}
      >
        {title && <h2 id={titleId} className="ui-dialog__title">{title}</h2>}
        {description && <p id={descId} className="ui-dialog__body">{description}</p>}
        {children}
        {footer && <div className="ui-dialog__actions">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// useConfirm — promise-based confirmation for destructive actions:
//
//   const confirm = useConfirm();
//   if (!(await confirm({ title: 'Delete project?', confirmLabel: 'Delete', danger: true }))) return;
//
// Danger confirmations focus Cancel first so Enter can't destroy by accident.
// ---------------------------------------------------------------------------

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ ...options, resolve });
  }), []);

  const settle = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!request}
        onClose={() => settle(false)}
        title={request?.title}
        description={request?.description}
        initialFocusRef={request?.danger ? cancelRef : confirmRef}
        footer={(
          <>
            <Button ref={cancelRef} variant="ghost" onClick={() => settle(false)}>
              {request?.cancelLabel || 'Cancel'}
            </Button>
            <Button
              ref={confirmRef}
              variant={request?.danger ? 'danger' : 'primary'}
              onClick={() => settle(true)}
            >
              {request?.confirmLabel || 'Confirm'}
            </Button>
          </>
        )}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}
