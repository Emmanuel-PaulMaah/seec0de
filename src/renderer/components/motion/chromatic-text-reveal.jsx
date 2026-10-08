// beui.dev/components/motion/text-animation — ChromaticName
// Colorful gradient sweep across text. CSS-animation variant for Electron.

import { useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { cn } from '../../lib/utils';

export function ChromaticName({
  children,
  className,
  duration = 1.2,
  delay = 0,
  foregroundColor = 'var(--text-primary)',
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const text = typeof children === 'string' ? children : '';

  return (
    <span ref={ref} className={cn('inline-block relative', className)}>
      <span aria-hidden className="invisible">{text}</span>
      <span
        aria-hidden
        className="absolute inset-0 beui-chromatic-name"
        style={{
          background: `linear-gradient(90deg, ${foregroundColor} 0%, #60a5fa 15%, #818cf8 30%, #c084fc 50%, #fb7185 70%, #fbbf24 85%, ${foregroundColor} 100%)`,
          backgroundSize: '250% 100%',
          backgroundPosition: reduce ? '50% 0' : '100% 0',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          animation: reduce
            ? 'none'
            : `beui-chromatic-name-sweep ${duration}s cubic-bezier(0.77, 0, 0.175, 1) ${delay}s forwards`,
        }}
      >
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('beui-chromatic-name-kf')) {
  const style = document.createElement('style');
  style.id = 'beui-chromatic-name-kf';
  style.textContent = `
@keyframes beui-chromatic-name-sweep {
  from { background-position: 100% 0; }
  to   { background-position: -150% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .beui-chromatic-name {
    animation: none !important;
    background-position: 50% 0 !important;
  }
}`;
  document.head.appendChild(style);
}
