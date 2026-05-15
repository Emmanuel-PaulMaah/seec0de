import React from 'react';
import { MessageSquareText, ChevronLeft, ChevronRight } from 'lucide-react';

// ExplanationSidebar — the right-most column. Shows the result of the
// "Explain" action (offline glossary or AI). Collapsible since v2.4 so
// the live preview can claim more screen real-estate when explanations
// aren't the focus.

export default function ExplanationSidebar({
  explanation,
  collapsed = false,
  onToggleCollapsed,
}) {
  // ---- collapsed rail (32 px) ------------------------------------------
  if (collapsed) {
    return (
      <button
        type="button"
        style={styles.rail}
        onClick={onToggleCollapsed}
        title="Show explanation panel"
        aria-label="Show explanation panel"
      >
        <ChevronLeft size={12} />
        <MessageSquareText size={14} style={{ marginTop: 6 }} />
        <span style={styles.railText}>EXPLANATION</span>
      </button>
    );
  }

  // ---- expanded panel --------------------------------------------------
  return (
    <div style={styles.sidebar}>
      <div style={styles.headerRow}>
        <div style={styles.headerLabel}>Explanation</div>
        {onToggleCollapsed && (
          <button
            type="button"
            style={styles.collapseBtn}
            onClick={onToggleCollapsed}
            title="Collapse explanation panel"
            aria-label="Collapse explanation panel"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {explanation && (
        <div style={styles.section}>
          <div style={styles.summary}>{explanation.summary}</div>

          {explanation.lineByLine && explanation.lineByLine.length > 0 && (
            <>
              <div style={styles.subLabel}>Line by Line</div>
              <div style={styles.lines}>
                {explanation.lineByLine.map((item, i) => (
                  <div key={i} style={styles.lineItem}>
                    <pre style={styles.lineCode}>{item.line}</pre>
                    <div style={styles.lineExplanation}>{item.explanation}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!explanation && (
        <div style={styles.placeholder}>
          <MessageSquareText size={20} color="var(--text-muted)" />
          <span>Select code to see explanations</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  rail: {
    width: 32,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 14,
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  railText: {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'var(--text-muted)',
    marginTop: 8,
  },

  sidebar: {
    width: 320,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    padding: 14,
    gap: 16,
    overflow: 'auto',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    flex: 1,
    fontSize: 11,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: 1,
    fontWeight: 600,
  },
  collapseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  subLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  summary: {
    fontSize: 13,
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    borderLeft: '3px solid var(--border-strong)',
    paddingLeft: 10,
  },
  lines: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  lineItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  lineCode: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--function-highlight)',
    fontSize: 12,
    padding: '4px 8px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  lineExplanation: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    paddingLeft: 8,
  },
  placeholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: 13,
    textAlign: 'center',
    padding: 20,
    gap: 8,
  },
};
