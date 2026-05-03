import React from 'react';
import { MessageSquareText } from 'lucide-react';

export default function ExplanationSidebar({ explanation }) {
  return (
    <div style={styles.sidebar}>
      {explanation && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Explanation</div>
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
  sidebar: {
    width: 320,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    padding: 14,
    gap: 16,
    overflow: 'auto',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: 1,
    fontWeight: 600,
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
    borderLeft: '3px solid var(--accent)',
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
