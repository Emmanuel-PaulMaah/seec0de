// EditorFindWidget — a beUI-styled replacement for Monaco's native find
// widget. The native one is hidden in global.css and its shortcuts are
// re-bound in CodePanel, so this is the only find UI a learner ever sees.
//
// Everything here is driven by Monaco's public-ish editor API:
//   model.findMatches(...)        → match ranges (capture groups included)
//   editor.createDecorationsCollection(...) → highlight matches
//   editor.executeEdits(...)      → replace / replace all (undoable)
//
// Feature parity with the native widget: match case, whole word, regex,
// search inside selection, preserve case, next/prev with wraparound, live
// match count, replace one, replace all, and invalid-regex feedback.

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Replace as ReplaceIcon,
  Search,
  TextSelect,
  X,
} from 'lucide-react';
import { EASE_OUT } from '../lib/ease';

// Monaco's default word separators — used when "whole word" is on.
const WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';

// Cap the highlight work on very large files; the count shows a "+" past it.
const MAX_MATCHES = 5000;

const NEAREST_RESET = '\u0000';

function nearestIndex(matches, position) {
  if (!position) return 0;
  const index = matches.findIndex(({ range }) => {
    const start = range.getStartPosition();
    return start.lineNumber > position.lineNumber
      || (start.lineNumber === position.lineNumber && start.column >= position.column);
  });
  return index === -1 ? 0 : index;
}

// "preserve case" mirrors VS Code: ALL CAPS → uppercase, all lower →
// lowercase, Capitalised → capitalise the replacement, otherwise leave it.
function applyPreserveCase(text, reference) {
  if (!reference || !/[a-zA-Z]/.test(reference)) return text;
  if (reference === reference.toUpperCase()) return text.toUpperCase();
  if (reference === reference.toLowerCase()) return text.toLowerCase();
  if (reference[0] === reference[0].toUpperCase()) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

function IconButton({ label, onClick, disabled = false, active = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{
        ...styles.iconBtn,
        ...(active ? styles.iconBtnActive : {}),
        ...(disabled ? styles.iconBtnDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

function OptionChip({ label, active, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={label}
      aria-label={label}
      style={{
        ...styles.optChip,
        ...(active ? styles.optChipActive : {}),
        ...(disabled ? styles.iconBtnDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

const EditorFindWidget = forwardRef(function EditorFindWidget(
  { editor, readOnly = false },
  ref,
) {
  const reduce = useReducedMotion();
  const findInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const decorationsRef = useRef(null);
  const decorationsOwnerRef = useRef(null);
  const lastQueryRef = useRef(NEAREST_RESET);
  const selectionRangeRef = useRef(null);
  // The selection the user had when they opened find. Navigation moves the
  // editor selection onto each match, so this is what "search in selection"
  // should capture if no fresh selection was made after opening.
  const openedSelectionRef = useRef(null);
  const focusTimerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('find');
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [inSelection, setInSelection] = useState(false);
  const [preserveCase, setPreserveCase] = useState(false);
  const [matches, setMatches] = useState([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [revision, setRevision] = useState(0);
  const [focusedField, setFocusedField] = useState(null);

  const replaceOpen = mode === 'replace' && !readOnly;

  // ---- search -----------------------------------------------------------

  const computeMatches = useCallback(() => {
    if (!editor) return { found: [], error: '', truncated: false };
    const model = editor.getModel();
    if (!model || !query) return { found: [], error: '', truncated: false };

    const scope = inSelection ? selectionRangeRef.current : false;
    try {
      const raw = model.findMatches(
        query,
        scope || false,
        regex,
        matchCase,
        wholeWord ? WORD_SEPARATORS : null,
        true,
        MAX_MATCHES + 1,
      );
      const overflow = raw.length > MAX_MATCHES;
      return {
        found: overflow ? raw.slice(0, MAX_MATCHES) : raw,
        error: '',
        truncated: overflow,
      };
    } catch {
      return { found: [], error: 'Invalid regular expression', truncated: false };
    }
  }, [editor, query, regex, matchCase, wholeWord, inSelection]);

  // Re-search when the query, options, or the document change. Typing in the
  // editor debounces so a fast typist does not re-scan per keystroke.
  useEffect(() => {
    if (!editor) return undefined;
    let timer = null;
    const sub = editor.onDidChangeModelContent(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setRevision((v) => v + 1), 90);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.dispose();
    };
  }, [editor]);

  useEffect(() => {
    const { found, error: nextError, truncated: nextTruncated } = computeMatches();
    setError(nextError);
    setTruncated(nextTruncated);
    setMatches(found);
    setActive((prev) => {
      if (!found.length) return 0;
      if (lastQueryRef.current !== query) {
        lastQueryRef.current = query;
        return nearestIndex(found, editor?.getPosition());
      }
      return Math.min(prev, found.length - 1);
    });
  }, [computeMatches, revision, query, editor]);

  // ---- highlights + reveal ---------------------------------------------

  useEffect(() => {
    if (!editor) return undefined;

    if (decorationsOwnerRef.current !== editor) {
      try { decorationsRef.current?.clear(); } catch { /* previous editor disposed */ }
      decorationsRef.current = null;
      decorationsOwnerRef.current = editor;
    }

    try {
      if (!decorationsRef.current) {
        decorationsRef.current = editor.createDecorationsCollection([]);
      }

      if (!open || !matches.length) {
        decorationsRef.current.clear();
        return undefined;
      }

      decorationsRef.current.set(matches.map((match, index) => ({
        range: match.range,
        options: {
          inlineClassName: index === active
            ? 'seec0de-find-match-active'
            : 'seec0de-find-match',
          stickiness: 1,
        },
      })));

      const target = matches[active];
      if (target) {
        editor.setSelection(target.range);
        editor.revealRangeInCenterIfOutsideViewport(target.range);
      }
    } catch {
      // The editor was disposed mid-render (tab switch) — the next mount
      // rebuilds the collection.
    }
    return undefined;
  }, [editor, matches, active, open]);

  // Drop the highlight layer when the widget unmounts.
  useEffect(() => () => {
    try { decorationsRef.current?.clear(); } catch { /* disposed */ }
    decorationsRef.current = null;
  }, []);

  // ---- open / step / focus ---------------------------------------------

  const focusInput = useCallback((nextMode) => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      const target = nextMode === 'replace' ? replaceInputRef.current : findInputRef.current;
      target?.focus();
      target?.select();
    }, 0);
  }, []);

  const openWidget = useCallback((nextMode = 'find') => {
    if (!editor) return;
    try {
      const selection = editor.getSelection();
      openedSelectionRef.current = selection && !selection.isEmpty() ? selection : null;
    } catch {
      openedSelectionRef.current = null;
    }
    setMode(nextMode);
    setOpen(true);
    lastQueryRef.current = NEAREST_RESET;
    setRevision((v) => v + 1);
    focusInput(nextMode);
  }, [editor, focusInput]);

  const close = useCallback(() => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    setOpen(false);
    setFocusedField(null);
    try {
      decorationsRef.current?.clear();
      editor?.focus();
    } catch {
      // Editor already disposed — nothing to restore focus to.
    }
  }, [editor]);

  const step = useCallback((direction = 1) => {
    if (!open) {
      openWidget('find');
      return;
    }
    setActive((prev) => {
      if (!matches.length) return 0;
      return (prev + direction + matches.length) % matches.length;
    });
  }, [open, openWidget, matches.length]);

  useImperativeHandle(ref, () => ({
    open: openWidget,
    close,
    step,
  }), [openWidget, close, step]);

  // A different Monaco instance (tab switch) has a different model, so a
  // captured "search in selection" range from the old file is meaningless.
  useEffect(() => {
    selectionRangeRef.current = null;
    openedSelectionRef.current = null;
    setInSelection(false);
  }, [editor]);

  // Escape closes from the editor too, matching the native widget — the
  // find inputs handle their own Escape; this covers focus still in Monaco.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      const inWidget = target instanceof Element && !!target.closest('[data-find-widget]');
      const inEditor = target instanceof Element && !!target.closest('.monaco-editor');
      if (!inWidget && !inEditor) return;
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  // ---- replace ----------------------------------------------------------

  const textForMatch = useCallback((match) => {
    if (!editor) return '';
    const model = editor.getModel();
    if (!model) return '';
    const matched = model.getValueInRange(match.range);
    let text = replacement;

    if (regex && query) {
      try {
        // Re-running the user's pattern against the exact matched text gives
        // us $1…$9 expansion without duplicating Monaco's internals.
        const re = new RegExp(query, matchCase ? '' : 'i');
        text = matched.replace(re, replacement);
      } catch {
        text = replacement;
      }
    }

    return preserveCase ? applyPreserveCase(text, matched) : text;
  }, [editor, replacement, regex, query, matchCase, preserveCase]);

  const replaceCurrent = useCallback((direction = 1) => {
    if (!editor || readOnly) return;
    const match = matches[active];
    if (!match) return;

    try {
      editor.pushUndoStop();
      editor.executeEdits('seec0de-find', [{
        range: match.range,
        text: textForMatch(match),
        forceMoveMarkers: true,
      }]);
      editor.pushUndoStop();
    } catch {
      return;
    }

    const { found, error: nextError, truncated: nextTruncated } = computeMatches();
    setError(nextError);
    setTruncated(nextTruncated);
    setMatches(found);
    if (!found.length) {
      setActive(0);
      return;
    }
    // The following match slides into the replaced slot; Shift+Enter walks
    // backwards from there.
    const slot = Math.min(active, found.length - 1);
    setActive(direction < 0 ? (slot - 1 + found.length) % found.length : slot);
  }, [editor, readOnly, matches, active, textForMatch, computeMatches]);

  const replaceAll = useCallback(() => {
    if (!editor || readOnly || !matches.length) return;
    const model = editor.getModel();
    if (!model) return;

    // Build every replacement first (reads the pre-edit model), then apply
    // in reverse so earlier ranges stay valid.
    const edits = matches
      .map((match) => ({ range: match.range, text: textForMatch(match), forceMoveMarkers: true }))
      .sort((a, b) => b.range.getStartPosition().lineNumber - a.range.getStartPosition().lineNumber
        || b.range.getStartPosition().column - a.range.getStartPosition().column);

    try {
      editor.pushUndoStop();
      editor.executeEdits('seec0de-find', edits);
      editor.pushUndoStop();
    } catch {
      return;
    }

    const { found, error: nextError, truncated: nextTruncated } = computeMatches();
    setError(nextError);
    setTruncated(nextTruncated);
    setMatches(found);
    setActive(0);
    lastQueryRef.current = query;
  }, [editor, readOnly, matches, textForMatch, computeMatches, query]);

  // ---- keyboard ---------------------------------------------------------

  const onFindKeyDown = (event) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      const toggles = {
        KeyC: setMatchCase,
        KeyW: setWholeWord,
        KeyR: setRegex,
        KeyP: setPreserveCase,
      };
      const toggle = toggles[event.code];
      if (toggle) {
        event.preventDefault();
        toggle((v) => !v);
        return;
      }
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if ((event.ctrlKey || event.metaKey) && event.altKey && replaceOpen) replaceAll();
      else step(event.shiftKey ? -1 : 1);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'h') {
        event.preventDefault();
        openWidget('replace');
        focusInput('replace');
      } else if (key === 'f') {
        event.preventDefault();
        findInputRef.current?.select();
      }
    }
  };

  const onReplaceKeyDown = (event) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      const toggles = { KeyC: setMatchCase, KeyW: setWholeWord, KeyR: setRegex, KeyP: setPreserveCase };
      const toggle = toggles[event.code];
      if (toggle) {
        event.preventDefault();
        toggle((v) => !v);
        return;
      }
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if ((event.ctrlKey || event.metaKey) && event.altKey) replaceAll();
      else replaceCurrent(event.shiftKey ? -1 : 1);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }
  };

  // ---- in-selection option ---------------------------------------------

  const toggleInSelection = () => {
    if (inSelection) {
      selectionRangeRef.current = null;
      setInSelection(false);
      return;
    }
    const current = editor?.getSelection();
    const candidate = current && !current.isEmpty()
      ? current
      : openedSelectionRef.current;
    if (!candidate || candidate.isEmpty()) return; // nothing to scope to
    selectionRangeRef.current = candidate;
    setInSelection(true);
    lastQueryRef.current = NEAREST_RESET;
    setRevision((v) => v + 1);
  };

  // ---- render -----------------------------------------------------------

  const countText = error
    ? 'Invalid regex'
    : !query
      ? ''
      : matches.length
        ? `${active + 1} of ${matches.length}${truncated ? '+' : ''}`
        : 'No results';

  const hasSelection = (() => {
    try {
      return Boolean(editor?.getSelection() && !editor.getSelection().isEmpty());
    } catch {
      return false;
    }
  })();
  const canScope = hasSelection || Boolean(openedSelectionRef.current);

  const variants = {
    hidden: { opacity: 0, y: -8, scale: 0.985 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 460, damping: 34, mass: 0.7 },
    },
    exit: { opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.12, ease: EASE_OUT } },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="editor-find"
          role="search"
          aria-label="Find in file"
          data-find-widget
          variants={reduce ? undefined : variants}
          initial={reduce ? { opacity: 0 } : 'hidden'}
          animate={reduce ? { opacity: 1 } : 'show'}
          exit={reduce ? { opacity: 0 } : 'exit'}
          transition={reduce ? { duration: 0.12 } : undefined}
          style={styles.wrap}
        >
          <div style={styles.row}>
            <div
              style={{
                ...styles.field,
                ...(error ? styles.fieldError : {}),
                ...(focusedField === 'find' ? styles.fieldFocus : {}),
              }}
            >
              <Search size={12} style={styles.fieldIcon} aria-hidden />
              <input
                ref={findInputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onFindKeyDown}
                onFocus={() => setFocusedField('find')}
                onBlur={() => setFocusedField(null)}
                placeholder="Find"
                aria-label="Find"
                aria-invalid={Boolean(error)}
                spellCheck={false}
                autoComplete="off"
                // The surrounding .field box carries the focus border, so the
                // input must not draw a second ring inside it.
                className="ui-focus-none"
                style={styles.input}
              />
            </div>

            <span
              role="status"
              aria-live="polite"
              style={{
                ...styles.count,
                ...(error ? styles.countError : {}),
                ...(!error && query && !matches.length ? styles.countEmpty : {}),
              }}
            >
              {countText}
            </span>

            <IconButton
              label="Previous match (Shift+Enter)"
              onClick={() => step(-1)}
              disabled={!matches.length}
            >
              <ChevronUp size={14} />
            </IconButton>
            <IconButton
              label="Next match (Enter)"
              onClick={() => step(1)}
              disabled={!matches.length}
            >
              <ChevronDown size={14} />
            </IconButton>
            {!readOnly && (
              <IconButton
                label={replaceOpen ? 'Hide replace' : 'Show replace (Ctrl+H)'}
                onClick={() => {
                  const next = replaceOpen ? 'find' : 'replace';
                  setMode(next);
                  focusInput(next);
                }}
                active={replaceOpen}
              >
                <ChevronRight
                  size={14}
                  style={{ ...styles.chevron, transform: replaceOpen ? 'rotate(90deg)' : 'none' }}
                />
              </IconButton>
            )}
            <IconButton label="Close find (Esc)" onClick={close}>
              <X size={14} />
            </IconButton>
          </div>

          <div style={styles.optionsRow}>
            <OptionChip
              label="Match case (Alt+C)"
              active={matchCase}
              onClick={() => setMatchCase((v) => !v)}
            >
              Aa
            </OptionChip>
            <OptionChip
              label="Match whole word (Alt+W)"
              active={wholeWord}
              onClick={() => setWholeWord((v) => !v)}
            >
              ab
            </OptionChip>
            <OptionChip
              label="Use regular expression (Alt+R)"
              active={regex}
              onClick={() => setRegex((v) => !v)}
            >
              .*
            </OptionChip>
            <OptionChip
              label={canScope
                ? 'Search inside the selection'
                : 'Select code first to search inside it'}
              active={inSelection}
              onClick={toggleInSelection}
              disabled={!canScope && !inSelection}
            >
              <TextSelect size={12} />
            </OptionChip>
            <span style={styles.shortcutHint}>Enter · Shift+Enter · Esc</span>
          </div>

          {replaceOpen && (
            <div style={styles.row}>
              <div
                style={{
                  ...styles.field,
                  ...(focusedField === 'replace' ? styles.fieldFocus : {}),
                }}
              >
                <ReplaceIcon size={12} style={styles.fieldIcon} aria-hidden />
                <input
                  ref={replaceInputRef}
                  type="text"
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                  onKeyDown={onReplaceKeyDown}
                  onFocus={() => setFocusedField('replace')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Replace"
                  aria-label="Replace with"
                  spellCheck={false}
                  autoComplete="off"
                  className="ui-focus-none"
                  style={styles.input}
                />
              </div>

              <OptionChip
                label="Preserve case (Alt+P)"
                active={preserveCase}
                onClick={() => setPreserveCase((v) => !v)}
              >
                AB
              </OptionChip>
              <button
                type="button"
                onClick={() => replaceCurrent(1)}
                disabled={!matches.length}
                title="Replace (Enter)"
                style={{
                  ...styles.actionBtn,
                  ...(!matches.length ? styles.actionBtnDisabled : {}),
                }}
              >
                Replace
              </button>
              <button
                type="button"
                onClick={replaceAll}
                disabled={!matches.length}
                title="Replace all (Ctrl+Alt+Enter)"
                style={{
                  ...styles.actionBtn,
                  ...styles.actionBtnPrimary,
                  ...(!matches.length ? styles.actionBtnDisabled : {}),
                }}
              >
                All
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default EditorFindWidget;

const styles = {
  wrap: {
    position: 'absolute',
    top: 8,
    right: 18,
    zIndex: 60,
    width: 372,
    maxWidth: 'calc(100% - 36px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 8,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-strong)',
    background: 'var(--bg-elevated)',
    boxShadow: 'var(--shadow-lg)',
    color: 'var(--text-primary)',
    WebkitAppRegion: 'no-drag',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  field: {
    flex: 1,
    minWidth: 0,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 8px',
    borderRadius: 'var(--radius-control)',
    // Longhands, not the `border` shorthand: fieldFocus/fieldError override
    // borderColor, and React warns when both forms appear in one style object.
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    background: 'var(--bg-input)',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  fieldFocus: {
    // Neutral, not the accent: lime around a search box reads as a warning.
    // Matches the global text-field ring in global.css.
    borderColor: 'var(--border-focus-field)',
  },
  fieldError: {
    borderColor: 'var(--danger)',
  },
  fieldIcon: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    padding: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-ui)',
    fontSize: 12.5,
  },
  count: {
    minWidth: 58,
    textAlign: 'right',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  countEmpty: {
    color: 'var(--text-muted)',
  },
  countError: {
    color: 'var(--danger-text)',
  },
  iconBtn: {
    width: 24,
    height: 24,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: 'none',
    borderRadius: 5,
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  iconBtnActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  iconBtnDisabled: {
    opacity: 0.4,
    cursor: 'default',
  },
  chevron: {
    transition: 'transform var(--motion-fast) var(--ease-out)',
  },
  optionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 2,
  },
  optChip: {
    height: 22,
    minWidth: 24,
    padding: '0 6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: 5,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    fontWeight: 600,
    lineHeight: 1,
    cursor: 'pointer',
  },
  optChipActive: {
    background: 'var(--accent-soft)',
    borderColor: 'var(--accent)',
    color: 'var(--text-primary)',
  },
  shortcutHint: {
    marginLeft: 'auto',
    paddingRight: 2,
    color: 'var(--text-muted)',
    fontSize: 9.5,
    whiteSpace: 'nowrap',
  },
  actionBtn: {
    height: 24,
    flexShrink: 0,
    padding: '0 9px',
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 10.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    borderColor: 'var(--accent)',
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
  },
  actionBtnDisabled: {
    opacity: 0.45,
    cursor: 'default',
  },
};
