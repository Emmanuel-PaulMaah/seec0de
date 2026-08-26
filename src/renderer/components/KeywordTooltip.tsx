import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface KeywordTooltipProps {
  keyword: string;
  description: string;
  children?: React.ReactNode;
}

export default function KeywordTooltip({ keyword, description, children }: KeywordTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">
          {children || (
            <span className="font-mono text-[var(--keyword-highlight)] bg-[var(--keyword-soft)] px-1 py-0.5 rounded text-xs">
              {keyword}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        <p className="font-mono text-[var(--keyword-highlight)] text-xs mb-1">{keyword}</p>
        <p className="text-[var(--text-secondary)] text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
