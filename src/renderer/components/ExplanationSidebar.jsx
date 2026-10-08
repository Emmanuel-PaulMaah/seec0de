import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { Loader } from './motion/loader';
import { BouncyAccordion } from './motion/bouncy-accordion';
import { ScrollProgress } from './motion/scroll-progress';

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
  onClear,
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
        className="ui-panel-rail"
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

        {explanation && (
          <button
            type="button"
            className="ui-icon-button"
            style={styles.collapseBtn}
            onClick={onClear}
            title="Clear explanation"
            aria-label="Clear explanation"
          >
            <Trash2 size={12} />
          </button>
        )}

        {onToggleCollapsed && (
          <button
            type="button"
            className="ui-icon-button"
            style={styles.collapseBtn}
            onClick={onToggleCollapsed}
            title="Collapse explanation panel"
            aria-label="Collapse explanation panel"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <ScrollProgress style={styles.content}>
        {loading && (
          <div style={styles.loadingBlock}>
            <Loader
              size={16}
              variant="scramble"
              className="text-[var(--text-secondary)]"
            />
            <span style={styles.loadingText}>Thinking…</span>
          </div>
        )}

        {!loading && explanation && (
          <div style={styles.section}>
            <div style={styles.summary}>{explanation.summary}</div>

            {explanation.lineByLine?.length > 0 && (
              <BouncyAccordion
                value={openIndex >= 0 ? String(openIndex) : null}
                onValueChange={(id) => setOpenIndex(id != null ? Number(id) : -1)}
                collapsible
                classNames={{
                  trigger: 'min-h-[40px] px-3 text-xs',
                  content: 'text-xs',
                  description: 'text-xs leading-5 text-muted-foreground px-3 pb-3',
                  title: 'text-xs font-mono',
                }}
                items={explanation.lineByLine.map((item, i) => ({
                  id: String(i),
                  title: (
                    <pre style={styles.lineCode}>{item.line}</pre>
                  ),
                  description: item.explanation,
                }))}
              />
            )}
          </div>
        )}

        {!loading && !explanation && (
          <div style={styles.placeholder}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Highlight code to see what it does
            </span>
          </div>
        )}
      </ScrollProgress>
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
    fontSize: 'var(--text-xs)',
    letterSpacing: 1,
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
    overflow: 'hidden',
  },

  headerRow: {
    height: 'var(--panel-header-height)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: '0 var(--space-3)',
    borderBottom: '1px solid var(--border)',
  },

  headerLabel: {
    flex: 1,
    fontSize: 'var(--text-sm)',
    letterSpacing: 0.2,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },

  collapseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    justifyContent: 'center',
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },

  content: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    padding: 'var(--space-4)',
    overflow: 'auto',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },

  summary: {
    fontSize: 'var(--text-md)',
    lineHeight: 1.6,
    color: 'var(--text-primary)',
    borderLeft: '3px solid var(--border-strong)',
    paddingLeft: 'var(--space-3)',
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
};
