import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader,
} from 'lucide-react';

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
}) {  // Index of the currently-open accordion item (-1 = all collapsed).
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
            style={{
              animation: 'spin 1s linear infinite',
              color: 'var(--text-secondary)',
            }}
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

          {explanation.lineByLine?.length > 0 && (
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
                        onClick={() =>
                          setOpenIndex(isOpen ? -1 : i)
                        }
                        aria-expanded={isOpen}
                      >
                        <span style={styles.lineChevron}>
                          {isOpen ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </span>

                        <pre style={styles.lineCode}>
                          {item.line}
                        </pre>
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
          <MessageSquareText
            size={20}
            color="var(--text-muted)"
          />
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
    gap: 6,
    paddingTop: 16,
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
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
    width: '100%',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    padding: 20,
    gap: 28,
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
    letterSpacing: 1.2,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },

  collapseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 4,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },

  summary: {
    fontSize: 14,
    lineHeight: 1.85,
    color: 'var(--text-primary)',
    borderLeft: '3px solid var(--border-strong)',
    paddingLeft: 14,
  },

  subLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    borderTop: '1px solid var(--border)',
  },

  subLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },

  subLabelHint: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },

  lines: {
    display: 'flex',
    flexDirection: 'column',
  },

  lineItem: {
    borderTop: '1px solid var(--border)',
  },

  lineHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '18px 0',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
  },

  lineHeaderOpen: {
    paddingBottom: 12,
  },

  lineChevron: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-muted)',
    marginTop: 2,
    flexShrink: 0,
  },

  lineCode: {
    margin: 0,
    flex: 1,
    background: 'transparent',
    border: 'none',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    fontSize: 12,
    lineHeight: 1.7,
    color: 'var(--function-highlight)',
  },

  lineExplanation: {
    padding: '0 0 22px 26px',
    fontSize: 13,
    lineHeight: 1.8,
    color: 'var(--text-secondary)',
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
    padding: 24,
    gap: 10,
  },

  loadingBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 28,
    border: '1px solid var(--border)',
    borderRadius: 6,
    textAlign: 'center',
  },

  loadingText: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },

  loadingHint: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.7,
  },
};
