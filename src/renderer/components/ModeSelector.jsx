import React from 'react';
import { Code2, BookOpen } from 'lucide-react';

export default function ModeSelector({ mode, onModeChange }) {
  return (
    <div style={styles.bar}>
      <button
        style={{
          ...styles.tab,
          ...(mode === 'instruct' ? styles.activeTab : {}),
        }}
        onClick={() => onModeChange('instruct')}
      >
        <Code2 size={14} /> Code
      </button>
      <button
        style={{
          ...styles.tab,
          ...(mode === 'paste' ? styles.activeTab : {}),
        }}
        onClick={() => onModeChange('paste')}
      >
        <BookOpen size={14} /> Explain
      </button>
    </div>
  );
}

const styles = {
  bar: {
    height: 40,
    display: 'flex',
    alignItems: 'stretch',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    paddingLeft: 12,
    gap: 0,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    padding: '0 16px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  activeTab: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--accent)',
  },
};
