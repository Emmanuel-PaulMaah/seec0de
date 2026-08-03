import React from 'react';
import { Bell, Clock3 } from 'lucide-react';

export default function LearningPulseBar({
  reminders = [],
  onDismiss,
  onSnooze,
  onContinue,
}) {
  if (reminders.length === 0) return null;

  const reminder = reminders[0];
  const remaining = reminders.length - 1;

  return (
    <section style={styles.bar} role="status" aria-label="Learning Pulse practice reminder">
      <span style={styles.icon}><Bell size={15} /></span>
      <div style={styles.copy}>
        <span style={styles.eyebrow}>Learning Pulse · ready to practice</span>
        <span style={styles.message}>
          <strong>{reminder.title}</strong>
          <span>{reminder.message || 'Try to rebuild or explain this without looking first.'}</span>
          {remaining > 0 && <span style={styles.more}>+{remaining} more</span>}
        </span>
      </div>
      <div style={styles.actions}>
        {reminder.openLearnMode && (
          <button type="button" style={styles.primaryButton} onClick={() => onContinue?.(reminder)}>
            Practice now
          </button>
        )}
        <button type="button" style={styles.actionButton} onClick={() => onSnooze?.(reminder.id, 1)}>
          <Clock3 size={12} /> Tomorrow
        </button>
        <button type="button" style={styles.actionButton} onClick={() => onDismiss?.(reminder.id)}>
          Dismiss
        </button>
      </div>
    </section>
  );
}

const styles = {
  bar: {
    zIndex: 20,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    padding: '8px 14px',
    borderBottom: '1px solid var(--border-strong)',
    background: 'color-mix(in srgb, var(--algorithm-soft) 68%, var(--bg-elevated))',
    color: 'var(--text-primary)',
  },
  icon: {
    width: 30,
    height: 30,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    background: 'var(--bg-elevated)',
    color: 'var(--algorithm)',
  },
  copy: { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  eyebrow: { color: 'var(--algorithm)', fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' },
  message: { minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 7, color: 'var(--text-secondary)', fontSize: 10.5 },
  more: { flexShrink: 0, color: 'var(--text-muted)', fontSize: 9.5 },
  actions: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 },
  primaryButton: { padding: '6px 9px', border: 0, borderRadius: 6, background: 'var(--accent)', color: 'var(--text-on-accent)', fontSize: 9.5, fontWeight: 700 },
  actionButton: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 7px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 9.5 },
};
