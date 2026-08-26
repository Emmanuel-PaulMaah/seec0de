import React, { useState, useRef, useCallback } from 'react';
import { Eye, Check } from 'lucide-react';
import { insertIntoEditor } from '../engine/editorBridge';
import { cn } from '@/lib/utils';

interface InlineCodeProps {
  children: React.ReactNode;
  interactive?: boolean;
}

export function InlineCode({ children, interactive = true }: InlineCodeProps) {
  const [inserted, setInserted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInsert = useCallback(() => {
    if (!interactive) return;
    if (!insertIntoEditor(String(children ?? ''), { insert: 'cursor' })) return;
    setInserted(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setInserted(false), 1200);
  }, [children, interactive]);

  if (!interactive) {
    return (
      <code className="font-mono text-[0.92em] px-[5px] py-[1px] rounded-[3px] bg-[var(--keyword-soft)] text-[var(--keyword-highlight)] whitespace-nowrap select-none">
        {children}
      </code>
    );
  }

  return (
    <code
      className={cn(
        'inline-flex items-center font-mono text-[0.92em] px-[5px] py-[1px] rounded-[3px]',
        'bg-[var(--keyword-soft)] text-[var(--keyword-highlight)] whitespace-nowrap cursor-pointer outline-none',
        'transition-all duration-[var(--motion-fast)] ease-[var(--ease-out)]',
        hovered && 'shadow-[0_0_0_1px_var(--keyword-highlight)]'
      )}
      onClick={handleInsert}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleInsert();
        }
      }}
      role="button"
      tabIndex={0}
      title={inserted ? 'Inserted into the code panel' : 'Insert into the code panel'}
      aria-label={inserted ? 'Inserted' : `Insert ${children} into the code panel`}
    >
      {inserted ? (
        <Check size={9} className="mr-[3px] shrink-0 text-[var(--success)]" aria-hidden="true" />
      ) : (
        <Eye size={9} className={cn('mr-[3px] shrink-0 text-[var(--text-muted)] transition-opacity duration-[var(--motion-fast)]', hovered ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
      )}
      {children}
    </code>
  );
}

export function renderInline(text: string | null | undefined, options?: { interactive?: boolean }): React.ReactNode {
  if (!text) return null;
  const interactive = options?.interactive ?? true;
  const tokens = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return <InlineCode key={i} interactive={interactive}>{tok.slice(1, -1)}</InlineCode>;
    }
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}
