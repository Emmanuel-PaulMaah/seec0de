import React from 'react';

export default function TitleBar() {
  return (
    <div style={styles.titleBar}>
      <span style={styles.logo}>⟨/⟩</span>
      <span style={styles.title}>SEEC0DE</span>
    </div>
  );
}

const styles = {
  titleBar: {
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    WebkitAppRegion: 'drag',
    userSelect: 'none',
    gap: 6,
  },
  logo: {
    fontSize: 14,
    color: 'var(--accent)',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    letterSpacing: 1.5,
    fontWeight: 400,
  },
};
