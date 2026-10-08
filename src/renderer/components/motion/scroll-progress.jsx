"use client";
// beui-inspired scroll reading-progress indicator.
// Wraps a scrollable container and renders a thin animated bar at the top
// that fills as the user scrolls down.

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ScrollProgress({ children, className, barClassName }) {
  const reduce = useReducedMotion();
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: reduce ? 0 : 100,
    damping: reduce ? 0 : 30,
    restDelta: 0.001,
  });

  return (
    <div ref={containerRef} className={cn("relative h-full overflow-auto", className)}>
      <motion.div
        style={{ scaleX, transformOrigin: "0%" }}
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px] z-10 bg-primary",
          barClassName
        )}
      />
      {children}
    </div>
  );
}
