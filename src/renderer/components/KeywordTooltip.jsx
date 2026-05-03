import React from 'react';
import { X } from 'lucide-react';

export default function KeywordTooltip({ keyword, definition, example, language, position, onClose }) {
  if (!keyword || !position) return null;

  return (
    <div style={{ ...styles.overlay }} onClick={onClose}>
      <div
        style={{
          ...styles.tooltip,
          top: position.top,
          left: position.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <span style={styles.keyword}>{keyword}</span>
          <span style={styles.lang}>{language}</span>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={12} />
          </button>
        </div>
        <div style={styles.definition}>{definition}</div>
        {example && (
          <pre style={styles.example}>{example}</pre>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 20,
  },
  tooltip: {
    position: 'absolute',
    zIndex: 21,
    background: '#151515',
    border: '1px solid #2a2a2a',
    borderRadius: 4,
    padding: 10,
    maxWidth: 340,
    minWidth: 200,
    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  keyword: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--keyword-highlight)',
  },
  lang: {
    fontSize: 10,
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '1px 6px',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
  },
  definition: {
    fontSize: 12,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  example: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--string-highlight)',
    fontSize: 11,
    padding: 8,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
};
