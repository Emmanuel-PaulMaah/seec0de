"use client";;
// beui.dev/components/motion/expanding-arrow-button
//
// Local change: the registry version hides the label on hover/focus so the
// accent tile can sweep the full width. Here the label stays readable instead —
// it sits above the tile (z-20) and its ink crossfades to `activeLabelClassName`
// once the tile has swept underneath it. The dotted trail moves into a reserved
// lane at the trailing edge (`--arrow-trail-lane`) so no chevron lands on top of
// the text. Resting geometry is unchanged.

import { motion, useReducedMotion } from "motion/react";
import { forwardRef, useState } from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

// Three chevrons, not five: they fan out inside the reserved lane rather than
// across the whole tile, which is what keeps them clear of the label.
const ARROW_OPACITY = [1, 0.6, 0.3];

// The trail fades by colour alpha rather than element opacity, because motion
// owns `opacity` for the reveal. Derived from `currentColor` so it tracks the
// tile's own ink: dark on the lime accent in dark mode, white on the indigo
// accent in light mode. A fixed dark ink only worked while the accent was lime.
const trailInk = (opacity) =>
  `color-mix(in srgb, currentColor ${Math.round(opacity * 100)}%, transparent)`;

function DottedChevron({
  className
}) {
  return (
    <svg viewBox="0 0 20 28" fill="none" aria-hidden="true" className={className}>
      <circle cx="4" cy="4" r="2" fill="currentColor" />
      <circle cx="10" cy="9" r="2" fill="currentColor" />
      <circle cx="16" cy="14" r="2" fill="currentColor" />
      <circle cx="10" cy="19" r="2" fill="currentColor" />
      <circle cx="4" cy="24" r="2" fill="currentColor" />
    </svg>
  );
}

export const ExpandingArrowButton = forwardRef(function ExpandingArrowButton(
  {
    children,
    className,
    accentClassName,
    activeLabelClassName,
    labelClassName,
    disabled,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = !disabled && ((canHover && hovered) || focused);
  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;

  const handleMouseEnter = (event) => {
    setHovered(true);
    onMouseEnter?.(event);
  };

  const handleMouseLeave = (event) => {
    setHovered(false);
    onMouseLeave?.(event);
  };

  const handleFocus = (event) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      whileTap={reduce || disabled ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative inline-flex h-16 min-w-72 items-center overflow-hidden rounded-[22px] bg-neutral-950 p-1.5 text-white select-none",
        "outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...rest}>
      <motion.span
        layout="size"
        aria-hidden="true"
        transition={layoutTransition}
        style={{
          width: active ? "calc(100% - 12px)" : 52,
          borderRadius: 16,
        }}
        className={cn(
          "absolute inset-y-1.5 left-1.5 z-10 overflow-hidden bg-lime-300 text-neutral-950",
          accentClassName
        )}>
        <motion.span
          animate={{ opacity: active ? 0 : 1 }}
          transition={{ duration: reduce ? 0 : 0.1, ease: EASE_OUT }}
          className="absolute inset-0 grid place-items-center">
          <DottedChevron className="h-7 w-5" />
        </motion.span>

        <span className="absolute inset-y-0 right-0 flex w-[var(--arrow-trail-lane,120px)] items-center justify-around">
          {ARROW_OPACITY.map((opacity, index) => (
            <motion.span
              key={opacity}
              animate={{
                opacity: active ? 1 : 0,
                transform:
                  active && !reduce ? "translateX(0px)" : "translateX(-6px)",
              }}
              transition={{
                duration: reduce ? 0 : 0.18,
                delay: active && !reduce ? 0.04 + index * 0.025 : 0,
                ease: EASE_OUT,
              }}
              style={{ color: trailInk(opacity) }}
              className="inline-grid place-items-center">
              <DottedChevron className="h-7 w-5" />
            </motion.span>
          ))}
        </span>
      </motion.span>
      {/* Above the tile, never faded. The ink flip is delayed ~80ms so it lands
          as the tile's leading edge reaches the text, instead of painting dark
          ink on the dark shell a beat too early. */}
      <span
        className={cn(
          "relative z-20 ml-[76px] mr-[var(--arrow-trail-lane,120px)] whitespace-nowrap text-lg font-medium tracking-[-0.02em]",
          !reduce && "transition-colors duration-150 delay-[80ms]",
          active && activeLabelClassName,
          labelClassName
        )}>
        {children}
      </span>
    </motion.button>
  );
});
