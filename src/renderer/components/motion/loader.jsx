// beui.dev/components/motion/loader — trimmed to the three variants this
// app actually renders (spinner, dots, scramble).

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { EASE_IN_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

// Reduced motion keeps a calm opacity pulse and drops every transform.
const REDUCED = {
  animate: { opacity: [1, 0.4, 1] },
  transition: { duration: 1.4, ease: EASE_IN_OUT, repeat: Infinity },
};

export function Loader({
  variant = "spinner",
  size = 32,
  speed = 1,
  label = "Loading",
  className
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center text-foreground", className)}>
      {variant === "dots" && <Dots size={size} speed={speed} reduce={reduce} />}
      {variant === "scramble" && (
        <Scramble size={size} speed={speed} reduce={reduce} />
      )}
      {/* Anything else — including the default — falls back to the spinner. */}
      {variant === "spinner" || !["dots", "scramble"].includes(variant) ? (
        <Spinner size={size} speed={speed} reduce={reduce} />
      ) : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Spinner({
  size,
  speed,
  reduce
}) {
  const stroke = Math.max(2, size * 0.09);
  const r = (size - stroke) / 2;
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      animate={reduce ? REDUCED.animate : { rotate: 360 }}
      transition={
        reduce
          ? REDUCED.transition
          : { duration: speed, ease: "linear", repeat: Infinity }
      }>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={stroke} />
      <path
        d={`M ${size / 2} ${size / 2 - r} A ${r} ${r} 0 0 1 ${size / 2 + r} ${size / 2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round" />
    </motion.svg>
  );
}

function Dots({
  size,
  speed,
  reduce
}) {
  const dot = size * 0.24;
  return (
    <span className="flex items-center" style={{ gap: size * 0.14 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="rounded-full bg-current"
          style={{ width: dot, height: dot }}
          animate={
            reduce
              ? { opacity: [0.4, 1, 0.4] }
              : { y: [0, -size * 0.3, 0], opacity: [0.5, 1, 0.5] }
          }
          transition={{
            duration: speed,
            ease: EASE_IN_OUT,
            repeat: Infinity,
            delay: i * speed * 0.16,
          }} />
      ))}
    </span>
  );
}

const SCRAMBLE_TARGET = "LOADING";
const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/*#@";

function Scramble({
  size,
  speed,
  reduce
}) {
  const [text, setText] = useState(SCRAMBLE_TARGET);
  useEffect(() => {
    if (reduce) {
      setText(SCRAMBLE_TARGET);
      return;
    }
    let tick = 0;
    const total = SCRAMBLE_TARGET.length + 4;
    const id = setInterval(() => {
      const reveal = tick % total;
      let s = "";
      for (let i = 0; i < SCRAMBLE_TARGET.length; i++) {
        s +=
          i < reveal
            ? SCRAMBLE_TARGET[i]
            : SCRAMBLE_GLYPHS[
                Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)
              ];
      }
      setText(s);
      tick++;
    }, (speed / SCRAMBLE_TARGET.length) * 1000 * 0.55);
    return () => clearInterval(id);
  }, [speed, reduce]);

  return (
    <span
      className="font-mono font-medium tracking-[0.2em] tabular-nums"
      style={{ fontSize: size * 0.42 }}>
      {text}
    </span>
  );
}

