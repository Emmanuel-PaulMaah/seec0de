import React, { useState, useRef, useCallback } from 'react';
import { Eye, Check } from 'lucide-react';
import { insertIntoEditor } from '../engine/editorBridge';

// InlineCode — a backticked code span that hints it's interactive on hover.
// Clicking inserts the token into the central code panel at the cursor,
// flowing through the normal file-editing pipeline (dirty flag, save, build
// checks) instead of dumping it on the clipboard.
export function InlineCode({ children }) {
  const [inserted, setInserted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  const handleInsert = useCallback(() => {
    if (!insertIntoEditor(String(children ?? ''), { insert: 'cursor' })) return;
    setInserted(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setInserted(false), 1200);
  }, [children]);

  return (
    <code
      style={{ ...styles.code, boxShadow: hovered ? `0 0 0 1px var(--keyword-highlight)` : 'none' }}
      onClick={handleInsert}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleInsert(); }
      }}
      role="button"
      tabIndex={0}
      title={inserted ? 'Inserted into the code panel' : 'Insert into the code panel'}
      aria-label={inserted ? 'Inserted' : `Insert ${children} into the code panel`}
    >
      {inserted ? (
        <Check size={9} style={{ ...styles.icon, color: 'var(--success)' }} aria-hidden="true" />
      ) : (
        <Eye size={9} style={{ ...styles.icon, opacity: hovered ? 1 : 0 }} aria-hidden="true" />
      )}
      {children}
    </code>
  );
}

// Splits `text` on backticked code spans and **bold** markers: `code` renders
// as an InlineCode chip that inserts itself into the code panel on click,
// **bold** as <strong>. React nodes only — never dangerouslySetInnerHTML, so
// untrusted lesson/build JSON can't inject markup.
export function renderInline(text) {
  if (!text) return null;
  const tokens = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return <InlineCode key={i}>{tok.slice(1, -1)}</InlineCode>;
    }
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

const styles = {
  code: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.92em',
    padding: '1px 5px',
    // Syntax-colored like an editor token instead of a plain bordered chip;
    // the tint comes from the theme (--keyword-soft) so it matches both
    // themes; hovering draws a thin ring (token color) to invite the click.
    background: 'var(--keyword-soft)',
    borderRadius: 3,
    color: 'var(--keyword-highlight)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out), box-shadow var(--motion-fast) var(--ease-out)',
  },
  icon: {
    marginRight: 3,
    flexShrink: 0,
    color: 'var(--text-muted)',
    transition: 'opacity var(--motion-fast) var(--ease-out)',
  },
};
