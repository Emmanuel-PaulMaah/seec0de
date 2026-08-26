import React, { useState, useEffect } from 'react';
import { MessageSquareText, ChevronLeft, ChevronRight, ChevronDown, Loader, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface ExplanationLine { line: string; explanation: string; }
interface Explanation { summary: string; lineByLine?: ExplanationLine[]; }

interface ExplanationSidebarProps {
  explanation?: Explanation | null;
  loading?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onClear?: () => void;
}

export default function ExplanationSidebar({ explanation, loading = false, collapsed = false, onToggleCollapsed, onClear }: ExplanationSidebarProps) {
  const [openIndex, setOpenIndex] = useState(-1);
  useEffect(() => { setOpenIndex(-1); }, [explanation]);

  if (collapsed) {
    return (
      <button
        type="button"
        className="flex flex-col items-center gap-1.5 pt-4 bg-[var(--bg-secondary)] border-l border-[var(--border)] text-[var(--text-muted)] w-[36px] shrink-0 cursor-pointer hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200"
        onClick={onToggleCollapsed}
        title="Show explanation panel"
        aria-label="Show explanation panel"
      >
        <ChevronLeft size={12} />
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mt-1">
          <MessageSquareText size={13} className="text-[var(--accent)]" />
        </div>
        <span className="[writing-mode:vertical-rl] rotate-180 text-[9.5px] tracking-wider text-[var(--text-muted)] mt-2 font-medium">EXPLAIN</span>
      </button>
    );
  }

  return (
    <div className="w-full shrink-0 flex flex-col bg-[var(--bg-secondary)] border-l border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="h-[42px] shrink-0 flex items-center gap-2 px-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-5 h-5 rounded-md bg-[var(--accent)]/10 flex items-center justify-center">
            <Sparkles size={10} className="text-[var(--accent)]" />
          </div>
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">Explanation</span>
        </div>
        {explanation && (
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center bg-transparent border-none text-[var(--text-muted)] rounded-md p-0 cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-150"
            onClick={onClear}
            title="Clear explanation"
            aria-label="Clear explanation"
          >
            <Trash2 size={11} />
          </button>
        )}
        {onToggleCollapsed && (
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center bg-transparent border-none text-[var(--text-muted)] rounded-md p-0 cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-150"
            onClick={onToggleCollapsed}
            title="Collapse explanation panel"
            aria-label="Collapse explanation panel"
          >
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-4 overflow-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-8 border border-[var(--border)] rounded-xl text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
              <Loader size={18} className="animate-spin text-[var(--accent)]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[13px] font-semibold text-[var(--text-primary)] block">Thinking…</span>
              <span className="text-[11.5px] text-[var(--text-muted)] leading-relaxed block">AI is analyzing your code.</span>
            </div>
          </div>
        )}

        {/* Explanation content */}
        {!loading && explanation && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="relative pl-3.5">
              <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/30 rounded-full" />
              <p className="text-[13px] leading-relaxed text-[var(--text-primary)] m-0">{explanation.summary}</p>
            </div>

            {/* Line by line */}
            {explanation.lineByLine && explanation.lineByLine.length > 0 && (
              <>
                <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Line by Line</span>
                  <span className="text-[10px] text-[var(--text-muted)]/60 italic">click a line</span>
                </div>
                <div className="flex flex-col rounded-xl border border-[var(--border)] overflow-hidden">
                  {explanation.lineByLine.map((item, i) => {
                    const isOpen = openIndex === i;
                    return (
                      <div key={i} className={cn("border-b border-[var(--border)] last:border-b-0", i === 0 && "animate-[explanation-slide-in_200ms_ease-out_both]")} style={{ animationDelay: `${i * 40}ms` }}>
                        <button
                          type="button"
                          className={cn(
                            'w-full flex items-start gap-2 py-2.5 px-3 border-none bg-transparent cursor-pointer text-left transition-colors duration-100',
                            isOpen ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-primary)]'
                          )}
                          onClick={() => setOpenIndex(isOpen ? -1 : i)}
                          aria-expanded={isOpen}
                        >
                          <span className="flex items-center text-[var(--text-muted)] mt-0.5 shrink-0 transition-transform duration-150" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)' }}>
                            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                          <pre className="m-0 flex-1 bg-transparent border-none whitespace-pre-wrap break-all text-[11px] leading-[1.7] text-[var(--function-highlight)] font-mono">{item.line}</pre>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pl-[36px] text-[12.5px] leading-relaxed text-[var(--text-secondary)] animate-in slide-in-from-top-1 duration-150">
                            {item.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !explanation && (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-6 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <MessageSquareText size={20} className="text-[var(--text-muted)]/50" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[13px] font-medium text-[var(--text-muted)] block">Select code to explain</span>
              <span className="text-[11px] text-[var(--text-muted)]/60 leading-relaxed block">Highlight any code in the editor and click Explain</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
