// editorBridge — a tiny module-level bridge between leaf UI (inline code
// chips, example/solution blocks in the Build panel) and the central Monaco
// editor, without prop-drilling through the component tree.
//
// CodePanel registers the live editor instance (and a `setContent` callback
// that writes the active tab through React state). Anything can then ask the
// editor to insert text — the learner sees exactly what gets added, and it
// flows through the normal file-editing pipeline (dirty flag, save, live
// build checks) instead of an instant clipboard paste.
//
// IMPORTANT: insertion NEVER mutates the Monaco model directly. The editor is
// a controlled component (@monaco-editor/react re-syncs the model to the
// `value` prop whenever it changes), so writing through `setContent` (React
// state → value prop → model) keeps the app state the single source of truth.

let currentEditor = null;
let setContentFn = null;
let terminalApiRef = null;

// Which panel last gained focus: 'editor' | 'terminal' | null.
// Updated by focus/blur handlers registered from CodePanel and
// TerminalPanel.  This persists across click events that steal
// focus (e.g. clicking an InlineCode chip), so we always know
// where the user was last typing.
let lastFocusTarget = null;

export function setFocusTarget(target) {
  lastFocusTarget = target;
}

export function registerEditor(editor, { setContent } = {}) {
  currentEditor = editor;
  setContentFn = typeof setContent === 'function' ? setContent : null;
}

export function unregisterEditor() {
  currentEditor = null;
  setContentFn = null;
}

export function registerTerminal(apiRef) {
  terminalApiRef = apiRef;
}

export function unregisterTerminal() {
  terminalApiRef = null;
}

// Inserts `text` into the active editor.
//
//   insert: 'cursor' — at the cursor position (single tokens)
//   insert: 'end'    — appended to the end of the file (code blocks)
//
// Returns true when the insert went through (false when there's no live
// editor or no way to push content — the caller then shows no feedback).
export function insertIntoEditor(text, { insert = 'cursor' } = {}) {
  // Focus-aware routing: if the terminal last had focus, insert there.
  // We use lastFocusTarget (set by focus/blur events) instead of
  // document.activeElement, because clicking an InlineCode chip steals
  // focus before the click handler fires.
  if (lastFocusTarget === 'terminal') {
    const termApi = terminalApiRef?.current;
    if (termApi) {
      const content = String(text ?? '');
      if (!content) return true;
      termApi.setText(content);
      return true;
    }
  }

  const editor = currentEditor;
  if (!editor) return false;
  const model = editor.getModel?.();
  if (!model || model.isDisposed?.()) return false;
  if (typeof setContentFn !== 'function') return false;

  const content = String(text ?? '');
  if (!content) return true;

  const original = model.getValue();

  let insertAt;
  if (insert === 'end') {
    insertAt = original.length;
  } else {
    const sel = editor.getSelection();
    const pos = sel
      ? { lineNumber: sel.positionLineNumber, column: sel.positionColumn }
      : { lineNumber: 1, column: 1 };
    insertAt = model.getOffsetAt(pos);
  }

  // Appending to a file that doesn't end with a newline starts on a fresh
  // line (the leading "\n" is part of the insert, like a real paste).
  const needsNewline = insert === 'end' && original.length > 0 && !original.endsWith('\n');
  const toInsert = needsNewline ? '\n' + content : content;

  try {
    // The only write: through React state → value prop → model.
    setContentFn(original.slice(0, insertAt) + toInsert + original.slice(insertAt));
  } catch {
    return false;
  }

  // Put the caret after the inserted text. The value-sync applies the new
  // content to the model slightly after render, so wait a beat.
  setTimeout(() => {
    try {
      const live = currentEditor;
      const m = live?.getModel?.();
      if (!m || m.isDisposed?.()) return;
      const pos = m.getPositionAt(insertAt + toInsert.length);
      live.setPosition(pos);
      live.revealPositionInCenterIfOutsideViewport(pos);
    } catch { /* ignore */ }
  }, 40);
  return true;
}
