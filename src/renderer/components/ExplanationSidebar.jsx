import React, { useState, useEffect } from 'react';
import { MessageSquareText, ChevronLeft, ChevronRight, ChevronDown, Loader } from 'lucide-react';

// ExplanationSidebar — the right-most column. Shows the result of the
// "Explain" action (offline glossary or AI). Collapsible since v2.4 so
// the live preview can claim more screen real-estate when explanations
// aren't the focus.
//
// The line-by-line breakdown is rendered as a single-open accordion:
// every line starts collapsed; clicking a line opens its explanation
// and closes whichever was previously open. This stops the panel from
// dumping every explanation at once and lets the learner focus on one
// line at a time.

export default function ExplanationSidebar({
  explanation,
  loading = false,
  collapsed = false,
  onToggleCollapsed,
}) {
  // Index of the currently-open accordion item (-1 = all collapsed).
  const [openIndex, setOpenIndex] = useState(-1);

  // Whenever a fresh explanation arrives, collapse everything so the
  // learner starts from a clean slate instead of inheriting whatever
  // index happened to be open for the previous selection.
  useEffect(() => {
    setOpenIndex(-1);
  }, [explanation]);

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

      {loading && (
        <div style={styles.loadingBlock}>
          <Loader
            size={16}
            style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }}
          />
          <span style={styles.loadingText}>Thinking…</span>
          <span style={styles.loadingHint}>
            Asking the AI to explain the selection.
          </span>
        </div>
      )}

      {!loading && explanation && (
        <div style={styles.section}>
          <div style={styles.summary}>{explanation.summary}</div>

          {explanation.lineByLine && explanation.lineByLine.length > 0 && (
            <>
              <div style={styles.subLabelRow}>
                <span style={styles.subLabel}>Line by Line</span>
                <span style={styles.subLabelHint}>
                  click a line to expand
                </span>
              </div>
              <div style={styles.lines}>
                {explanation.lineByLine.map((item, i) => {
                  const isOpen = openIndex === i;
                  return (
                    <div key={i} style={styles.lineItem}>
                      <button
                        type="button"
                        style={{
                          ...styles.lineHeader,
                          ...(isOpen ? styles.lineHeaderOpen : {}),
                        }}
                        onClick={() => setOpenIndex(isOpen ? -1 : i)}
                        aria-expanded={isOpen}
                        title={isOpen ? 'Hide explanation' : 'Show explanation'}
                      >
                        <span style={styles.lineChevron}>
                          {isOpen
                            ? <ChevronDown size={12} />
                            : <ChevronRight size={12} />}
                        </span>
                        <pre style={styles.lineCode}>{item.line}</pre>
                      </button>
                      {isOpen && (
                        <div style={styles.lineExplanation}>
                          {item.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {!loading && !explanation && (
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
  subLabelRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  subLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: 0.8,
  },
  subLabelHint: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
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
    gap: 6,
  },
  lineItem: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border)',
    borderRadius: 4,
    overflow: 'hidden',
    background: 'var(--bg-input)',
  },
  lineHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    textAlign: 'left',
    padding: '6px 8px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background var(--motion-fast) var(--ease-out)',
  },
  lineHeaderOpen: {
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
  },
  lineChevron: {
    color: 'var(--text-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    paddingTop: 3,
    flexShrink: 0,
  },
  lineCode: {
    background: 'transparent',
    border: 'none',
    color: 'var(--function-highlight)',
    fontSize: 12,
    padding: 0,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    margin: 0,
    flex: 1,
    minWidth: 0,
  },
  lineExplanation: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    padding: '8px 10px 10px 26px',
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
  loadingBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '24px 16px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  loadingHint: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
};
