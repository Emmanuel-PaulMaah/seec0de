import React from 'react';
import UpdatePill from './UpdatePill';

export default function TitleBar() {
  return (
    <div style={styles.titleBar}>
      <div style={styles.side} />

      <div style={styles.center}>
        <span style={styles.logo}>⟨/⟩</span>
        <span style={styles.title}>SEEC0DE</span>
      </div>

      <div style={{ ...styles.side, ...styles.right }}>
        <UpdatePill />
      </div>
    </div>
  );
}

const styles = {
  titleBar: {
    height: 30,
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    WebkitAppRegion: 'drag',
    userSelect: 'none',
    paddingLeft: 8,
    paddingRight: 8,
  },
  side: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  right: {
    justifyContent: 'flex-end',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
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
