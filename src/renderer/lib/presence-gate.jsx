"use client";;
import { useIsPresent } from "motion/react";

/**
 * Reads the presence of the subtree it renders and hands it down.
 *
 * `useIsPresent` only answers inside the `AnimatePresence` subtree, and the
 * components that own an overlay render the `AnimatePresence` themselves, so
 * the boolean has to be read one component further down: this is that
 * component, and the render prop is how it reaches the layers.
 */
export function PresenceGate({
  children
}) {
  const isPresent = useIsPresent();

  return children({
    isPresent,
    gate: {
      inert: !isPresent,
      style: { pointerEvents: isPresent ? "auto" : "none" },
    },
  });
}
