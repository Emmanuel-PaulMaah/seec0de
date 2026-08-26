import React from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpdatePillProps {
  version?: string;
  onDismiss?: () => void;
}

export default function UpdatePill({ version, onDismiss }: UpdatePillProps) {
  return (
    <div className="flex items-center gap-2 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-full px-3 py-1 text-xs font-medium animate-[seec0de-pop-in_0.2s_ease-out]">
      <Download size={12} />
      <span>Update available{version ? ` v${version}` : ''}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Dismiss update notification"
        >
          ×
        </button>
      )}
    </div>
  );
}
