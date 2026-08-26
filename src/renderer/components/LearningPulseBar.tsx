import React from 'react';
import { Bell, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface Reminder {
  id: string;
  title: string;
  message?: string;
  openLearnMode?: boolean;
}

interface LearningPulseBarProps {
  reminders?: Reminder[];
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string, days: number) => void;
  onContinue?: (reminder: Reminder) => void;
}

export default function LearningPulseBar({
  reminders = [],
  onDismiss,
  onSnooze,
  onContinue,
}: LearningPulseBarProps) {
  if (reminders.length === 0) return null;

  const reminder = reminders[0];
  const remaining = reminders.length - 1;

  return (
    <section
      className={cn(
        'z-20 shrink-0 flex items-center gap-2.5 min-h-[48px] px-3.5 py-2',
        'border-b border-[var(--border-strong)]',
        'text-[var(--text-primary)]'
      )}
      style={{ background: 'color-mix(in srgb, var(--algorithm-soft) 68%, var(--bg-elevated))' }}
      role="status"
      aria-label="Learning Pulse practice reminder"
    >
      <span className="w-[30px] h-[30px] shrink-0 inline-flex items-center justify-center rounded-[7px] bg-[var(--bg-elevated)] text-[var(--algorithm)]">
        <Bell size={15} />
      </span>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="text-[var(--algorithm)] text-[9px] font-bold tracking-wider uppercase">Learning Pulse · ready to practice</span>
        <span className="min-w-0 flex items-baseline gap-1.5 text-[var(--text-secondary)] text-[10.5px]">
          <strong>{reminder.title}</strong>
          <span>{reminder.message || 'Try to rebuild or explain this without looking first.'}</span>
          {remaining > 0 && <span className="shrink-0 text-[var(--text-muted)] text-[9.5px]">+{remaining} more</span>}
        </span>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {reminder.openLearnMode && (
          <Button
            size="sm"
            className="h-auto py-1.5 px-2.5 text-[9.5px] font-bold"
            onClick={() => onContinue?.(reminder)}
          >
            Practice now
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="h-auto py-1 px-[7px] text-[9.5px]"
          onClick={() => onSnooze?.(reminder.id, 1)}
        >
          <Clock3 size={12} className="mr-1" /> Tomorrow
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-[7px] text-[9.5px]"
          onClick={() => onDismiss?.(reminder.id)}
        >
          Dismiss
        </Button>
      </div>
    </section>
  );
}
