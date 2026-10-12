// beui.dev/components/motion/text-animation — TextReveal
// CSS-animation variant for Electron (motion/react mount animations unreliable here).

import { useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { cn } from '../../lib/utils';

function toWordGroups(line) {
  const chunks = line.match(/\S+\s*|\s+/g) ?? [];
  return chunks.map((chunk) => {
    const text = chunk.replace(/\s+$/, '');
    return { text, trailing: chunk.slice(text.length) };
  });
}

export function TextReveal({
  text,
  as: Comp = 'span',
  className,
  split = 'word',
  stagger = 0.09,
  delay = 0,
  yOffset = 8,
  spring,
  once = true,
  whileInView = false,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  const lines = Array.isArray(text) ? text : [text];

  let unitIndex = 0;

  return (
    <Comp ref={ref} className={cn('block', className)} {...rest}>
      {lines.map((line, lineIdx) => {
        const lineKey = `${line}-${lineIdx}`;

        const renderUnit = (unit) => {
          const d = delay + unitIndex * stagger;
          unitIndex += 1;
          const unitKey = `${unit}-${unitIndex}`;

          if (reduce) {
            return (
              <span
                key={unitKey}
                className="inline-block whitespace-pre"
                style={{ opacity: 1 }}
              >
                {unit}
              </span>
            );
          }

          return (
            <span
              key={unitKey}
              className="inline-block whitespace-pre beui-text-reveal-word"
              style={{
                '--ty': `${yOffset}px`,
                opacity: 0,
                animation: `beui-text-reveal-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${d}s forwards`,
              }}
            >
              {unit}
            </span>
          );
        };

        const groups = toWordGroups(line);

        return (
          <span key={lineKey} className="block">
            {groups.map((group) => {
              const whole = group.text + group.trailing;
              if (split !== 'char') return renderUnit(whole);

              return (
                <span
                  key={whole}
                  className="inline-block whitespace-pre"
                >
                  {Array.from(whole).map((char) => renderUnit(char))}
                </span>
              );
            })}
          </span>
        );
      })}
      {children}
    </Comp>
  );
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('beui-text-reveal-keyframes')) {
  const style = document.createElement('style');
  style.id = 'beui-text-reveal-keyframes';
  style.textContent = `
@keyframes beui-text-reveal-in {
  from {
    opacity: 0;
    transform: translateY(var(--ty, 8px));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .beui-text-reveal-word {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}`;
  document.head.appendChild(style);
}
