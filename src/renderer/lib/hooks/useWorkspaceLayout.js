// useWorkspaceLayout — the Workspace panel rules that used to live in
// scattered useStates in App.jsx (UI audit 2026-10-08, "adaptive panel layout").
//
// 1. Editor width budget: the code editor never drops below MIN_EDITOR_WIDTH.
//    Opening or expanding a panel that would break the budget collapses the
//    least-recently-used open side panel and shows a toast offering Restore.
// 2. Focus mode (Ctrl+.): hides every side panel; toggling back restores
//    exactly what was open, because the raw state is never mutated.
// 3. Persistence: visibility flags and widths live in localStorage, same keys
//    as before, so existing users keep their layout.

import { useCallback, useEffect, useRef, useState } from 'react';

const K = {
  terminal: 'seec0de.terminalVisible',
  previewOpen: 'seec0de.previewVisible',
  previewWidth: 'seec0de.previewWidth',
  instructionCollapsed: 'seec0de.instructionCollapsed',
  instructionWidth: 'seec0de.instructionWidth',
  learnGuideWidth: 'seec0de.learnGuideWidth',
  explanationCollapsed: 'seec0de.explanationCollapsed',
  explanationWidth: 'seec0de.explanationWidth',
};

// Collapsed sidebars still occupy a 32 px rail; the editor keeps the rest.
const RAIL = 32;
const MIN_EDITOR_WIDTH = 520;

export const PANEL_LABELS = {
  instruction: 'Guide',
  preview: 'Preview',
  explanation: 'Explanation',
};

function readNumber(key, min, max, fallback) {
  const saved = Number(localStorage.getItem(key));
  return Number.isFinite(saved) && saved > 0 ? Math.max(min, Math.min(max, saved)) : fallback;
}

function readFlag(key) {
  return localStorage.getItem(key) === '1';
}

// Settings.showTerminal/showFileExplorer act as the default for fresh
// installs; once the user toggles, the per-session key takes over.
function initialPanelVisible(storageKey, defaultFromSettings) {
  const saved = localStorage.getItem(storageKey);
  if (saved === null) return !!defaultFromSettings;
  return saved === '1';
}

export function useWorkspaceLayout(defaultTerminalOpen) {
  // Raw state — this is what gets persisted and what focus mode reads from.
  const [terminalVisible, setTerminalVisibleRaw] = useState(() => initialPanelVisible(K.terminal, defaultTerminalOpen));
  const [previewVisible, setPreviewVisibleRaw] = useState(() => initialPanelVisible(K.previewOpen, true));
  const [previewWidth, setPreviewWidth] = useState(() => readNumber(K.previewWidth, 300, 680, 440));
  const [instructionCollapsed, setInstructionCollapsedRaw] = useState(() => readFlag(K.instructionCollapsed));
  const [instructionWidth, setInstructionWidth] = useState(() => readNumber(K.instructionWidth, 240, 520, 320));
  const [learnGuideWidth, setLearnGuideWidth] = useState(() => readNumber(K.learnGuideWidth, 300, 640, 400));
  const [explanationCollapsed, setExplanationCollapsedRaw] = useState(() => readFlag(K.explanationCollapsed));
  const [explanationWidth, setExplanationWidth] = useState(() => readNumber(K.explanationWidth, 240, 520, 320));

  const [focusMode, setFocusMode] = useState(false);
  // { panel: 'instruction' | 'preview' | 'explanation' } while the toast is up.
  const [movedAside, setMovedAside] = useState(null);

  // Persist raw values (never focus-mode-derived ones) synchronously with
  // state changes — replaces the eight per-value effects App.jsx used to run.
  useEffect(() => { localStorage.setItem(K.terminal, terminalVisible ? '1' : '0'); }, [terminalVisible]);
  useEffect(() => { localStorage.setItem(K.previewOpen, previewVisible ? '1' : '0'); }, [previewVisible]);
  useEffect(() => { localStorage.setItem(K.previewWidth, String(previewWidth)); }, [previewWidth]);
  useEffect(() => { localStorage.setItem(K.instructionCollapsed, instructionCollapsed ? '1' : '0'); }, [instructionCollapsed]);
  useEffect(() => { localStorage.setItem(K.instructionWidth, String(instructionWidth)); }, [instructionWidth]);
  useEffect(() => { localStorage.setItem(K.learnGuideWidth, String(learnGuideWidth)); }, [learnGuideWidth]);
  useEffect(() => { localStorage.setItem(K.explanationCollapsed, explanationCollapsed ? '1' : '0'); }, [explanationCollapsed]);
  useEffect(() => { localStorage.setItem(K.explanationWidth, String(explanationWidth)); }, [explanationWidth]);

  // Side panels in least-recently-used order. The terminal is excluded: it
  // sits below the editor and never competes for horizontal budget.
  const lruRef = useRef(['instruction', 'preview', 'explanation']);
  const touch = (name) => {
    lruRef.current = [name, ...lruRef.current.filter((n) => n !== name)];
  };

  // Latest raw state for use inside stable callbacks.
  const stateRef = useRef(null);
  stateRef.current = { previewVisible, previewWidth, instructionCollapsed, instructionWidth, explanationCollapsed, explanationWidth };

  // Width each side panel currently occupies (rail when collapsed, 0 when hidden).
  const currentWidths = (s) => ({
    instruction: s.instructionCollapsed ? RAIL : s.instructionWidth,
    preview: s.previewVisible ? s.previewWidth : 0,
    explanation: s.explanationCollapsed ? RAIL : s.explanationWidth,
  });

  // Open `incoming` at full width; if that would push the editor below the
  // budget, collapse the least-recently-used other open panel first.
  const applyBudget = useCallback((incoming, open) => {
    const s = stateRef.current;
    const opened = { ...currentWidths(s) };
    opened[incoming] = incoming === 'preview' ? s.previewWidth
      : incoming === 'instruction' ? s.instructionWidth
      : s.explanationWidth;
    const editorWidth = window.innerWidth - opened.instruction - opened.preview - opened.explanation;
    if (editorWidth >= MIN_EDITOR_WIDTH) {
      open();
      touch(incoming);
      return;
    }

    const isOpen = (name) => (
      name === 'preview' ? s.previewVisible
        : name === 'instruction' ? !s.instructionCollapsed
          : !s.explanationCollapsed
    );
    const victim = lruRef.current.find((name) => name !== incoming && isOpen(name));
    if (!victim) {
      // Nothing left to yield — open anyway rather than refuse the action.
      open();
      touch(incoming);
      return;
    }
    if (victim === 'preview') setPreviewVisibleRaw(false);
    else if (victim === 'instruction') setInstructionCollapsedRaw(true);
    else setExplanationCollapsedRaw(true);
    open();
    touch(incoming);
    setMovedAside({ panel: victim });
  }, []);

  // Public setters. Toggles and direct sets both flow through the budget
  // rule when the result is "open"; closing is never guarded. Each accepts
  // a value or an updater, matching useState semantics App.jsx relies on.
  const setPreviewVisible = useCallback((value) => {
    const next = typeof value === 'function' ? value(stateRef.current.previewVisible) : value;
    if (next) applyBudget('preview', () => setPreviewVisibleRaw(true));
    else setPreviewVisibleRaw(false);
  }, [applyBudget]);

  const setInstructionCollapsed = useCallback((value) => {
    const next = typeof value === 'function' ? value(stateRef.current.instructionCollapsed) : value;
    if (!next) applyBudget('instruction', () => setInstructionCollapsedRaw(false));
    else setInstructionCollapsedRaw(true);
  }, [applyBudget]);

  const setExplanationCollapsed = useCallback((value) => {
    const next = typeof value === 'function' ? value(stateRef.current.explanationCollapsed) : value;
    if (!next) applyBudget('explanation', () => setExplanationCollapsedRaw(false));
    else setExplanationCollapsedRaw(true);
  }, [applyBudget]);

  const setTerminalVisible = useCallback((value) => {
    const next = typeof value === 'function' ? value(terminalVisible) : value;
    setTerminalVisibleRaw(next);
  }, [terminalVisible]);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((on) => !on);
    setMovedAside(null);
  }, []);

  const restoreMovedAside = useCallback(() => {
    if (!movedAside) return;
    if (movedAside.panel === 'preview') setPreviewVisibleRaw(true);
    else if (movedAside.panel === 'instruction') setInstructionCollapsedRaw(false);
    else setExplanationCollapsedRaw(false);
    setMovedAside(null);
  }, [movedAside]);

  const dismissMovedAside = useCallback(() => setMovedAside(null), []);

  // Focus mode hides the side panels for rendering only; raw state (and its
  // persistence) is untouched, so toggling back restores the exact layout.
  const visible = focusMode
    ? { terminalVisible: false, previewVisible: false, instructionCollapsed: true, explanationCollapsed: true }
    : { terminalVisible, previewVisible, instructionCollapsed, explanationCollapsed };

  return {
    ...visible,
    previewWidth,
    instructionWidth,
    learnGuideWidth,
    explanationWidth,
    setTerminalVisible,
    setPreviewVisible,
    setPreviewWidth,
    setInstructionCollapsed,
    setInstructionWidth,
    setExplanationCollapsed,
    setExplanationWidth,
    setLearnGuideWidth,
    focusMode,
    toggleFocusMode,
    movedAside: focusMode ? null : movedAside,
    restoreMovedAside,
    dismissMovedAside,
    // Unguarded setters for callers that must force the layout open (the
    // workspace tour) — the budget guard would fight a deliberate override.
    force: {
      setTerminalVisible: setTerminalVisibleRaw,
      setPreviewVisible: setPreviewVisibleRaw,
      setInstructionCollapsed: setInstructionCollapsedRaw,
      setExplanationCollapsed: setExplanationCollapsedRaw,
    },
  };
}
