// beui-inspired scroll reading-progress indicator.
// Wraps a scrollable container and renders a thin bar pinned to the top of
// the panel that fills as the user scrolls down.
//
// The bar lives on a structural OUTSIDE wrapper, not inside the scroller:
// an absolutely-positioned child of a scroll container scrolls away with
// the content, which is exactly the bug this rewrite fixes. `className` /
// `style` size the scroller itself (callers use them for flex sizing and
// padding), and the wrapper takes over the remaining panel height via flex.

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ScrollProgress({ children, className, style, barClassName }) {
  const reduce = useReducedMotion();
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({ container: containerRef });
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });
  // A spring with stiffness 0 never moves, so reduced-motion users would get
  // a permanently-empty bar. Feed them the raw progress instead: the fill
  // still tracks the scroll, just without easing.
  const scaleX = reduce ? scrollYProgress : springProgress;

  return (
    <div className="relative flex-1 min-h-0">
      <motion.div
        aria-hidden="true"
        style={{ scaleX, transformOrigin: "0%" }}
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px] z-10 bg-primary",
          barClassName
        )}
      />
      <div
        ref={containerRef}
        className={cn("relative h-full overflow-auto", className)}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
