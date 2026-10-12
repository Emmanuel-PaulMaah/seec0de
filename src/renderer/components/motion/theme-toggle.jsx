// beui.dev/components/motion/theme-toggle — adapted for Electron
// No next-themes dependency; reads/writes colorMode via props.

import { Moon, Sun } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ActionSwapIcon } from "@/components/motion/action-swap";
import { EASE_OUT_CSS } from "@/lib/ease";
import { cn } from "@/lib/utils";

const VT_STYLE_ID = "beui-theme-toggle-vt";

// View transitions animate in CSS, not motion springs, so easing here is
// either EASE_OUT_CSS or a keyword. The circle variants keep the Material
// standard curve because their reveal expands symmetrically rather than
// decelerating. Durations differ per variant to match native OS mode switches.
const VT_CSS = `
html[data-beui-vt="rect"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
html[data-beui-vt="rect"]::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: beui-rect-reveal 400ms ease-out;
}
html[data-beui-vt="circle"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
html[data-beui-vt="circle"]::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: beui-circle-reveal 400ms cubic-bezier(0.4, 0, 0.2, 1);
}
html[data-beui-vt="blinds"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
@property --beui-vt-slat {
  syntax: "<length>";
  inherits: false;
  initial-value: 72px;
}
html[data-beui-vt="blinds"]::view-transition-new(root) {
  mix-blend-mode: normal;
  mask-image: linear-gradient(
    90deg,
    #000 0 var(--beui-vt-slat),
    transparent calc(var(--beui-vt-slat) + 20px)
  );
  mask-size: 72px 100%;
  mask-repeat: repeat;
  animation: beui-blinds-reveal 700ms ${EASE_OUT_CSS};
}
@keyframes beui-rect-reveal {
  from { clip-path: var(--beui-vt-from, inset(100% 0 0 0)); }
  to   { clip-path: inset(0 0 0 0); }
}
@keyframes beui-circle-reveal {
  from { clip-path: circle(0% at var(--beui-vt-origin, 50% 100%)); }
  to   { clip-path: circle(150% at var(--beui-vt-origin, 50% 100%)); }
}
@keyframes beui-blinds-reveal {
  from { --beui-vt-slat: -20px; }
  to   { --beui-vt-slat: 72px; }
}
`;

const RECT_FROM = {
  "top-left":    "inset(0 100% 100% 0)",
  "top-right":   "inset(0 0 100% 100%)",
  "bottom-left": "inset(100% 100% 0 0)",
  "bottom-right":"inset(100% 0 0 100%)",
  center:        "inset(50% 50% 50% 50%)",
  "bottom-up":   "inset(100% 0 0 0)",
};

const CIRCLE_ORIGIN = {
  "top-left":    "0% 0%",
  "top-right":   "100% 0%",
  "bottom-left": "0% 100%",
  "bottom-right":"100% 100%",
  center:        "50% 50%",
  "bottom-up":   "50% 100%",
};

/**
 * useThemeToggle — Electron-adapted version.
 * Accepts `colorMode` ('dark' | 'light') and `onColorModeChange` callback
 * instead of next-themes' useTheme().
 */
export function useThemeToggle({
  variant = "rectangle",
  start = "bottom-up",
  colorMode = "dark",
  onColorModeChange,
} = {}) {
  const reduce = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (document.getElementById(VT_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = VT_STYLE_ID;
    el.textContent = VT_CSS;
    document.head.appendChild(el);
  }, []);

  const isDark = mounted && colorMode === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";

    if (reduce || !("startViewTransition" in document)) {
      onColorModeChange?.(next);
      return;
    }

    const root = document.documentElement;

    if (variant === "rectangle") {
      root.style.setProperty("--beui-vt-from", RECT_FROM[start]);
      root.dataset.beuiVt = "rect";
    } else if (variant === "blinds") {
      root.dataset.beuiVt = "blinds";
    } else {
      root.style.setProperty("--beui-vt-origin", CIRCLE_ORIGIN[start]);
      root.dataset.beuiVt = variant;
    }

    const vt = document.startViewTransition(() => onColorModeChange?.(next));

    vt.finished.finally(() => {
      delete root.dataset.beuiVt;
    });
  };

  return { isDark, mounted, toggle };
}

export function ThemeToggle({
  variant = "circle",
  start = "bottom-up",
  colorMode = "dark",
  onColorModeChange,
  className,
  iconClassName,
  ...rest
}) {
  const { isDark, mounted, toggle } = useThemeToggle({
    variant,
    start,
    colorMode,
    onColorModeChange,
  });

  return (
    <button
      type="button"
      aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={cn("flex items-center justify-center", className)}
      {...rest}>
      {mounted ? (
        <ActionSwapIcon
          value={isDark ? "dark" : "light"}
          animation="roll"
          className={iconClassName}>
          {isDark ? (
            <Sun className={iconClassName} />
          ) : (
            <Moon className={iconClassName} />
          )}
        </ActionSwapIcon>
      ) : (
        <span className={iconClassName} aria-hidden="true" />
      )}
    </button>
  );
}
