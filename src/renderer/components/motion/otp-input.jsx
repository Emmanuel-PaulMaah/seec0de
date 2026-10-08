"use client";
// Adapted from beui.dev/components/blocks/otp-input for this JSX renderer.

import { AnimatePresence, LayoutGroup, animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

function sanitize(raw, length) {
  return raw.replace(/\D/g, "").slice(0, length);
}

function toSlots(raw, length) {
  const digits = sanitize(raw, length);
  return Array.from({ length }, (_, index) => digits[index] ?? "");
}

export function OTPInput({
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  label,
  hint,
  successMessage,
  errorMessage,
  status = "idle",
  mask = false,
  disabled = false,
  autoFocus = false,
  "aria-label": ariaLabel = "One-time passcode",
  className,
}) {
  const uid = useId();
  const reduce = useReducedMotion();
  const inputRef = useRef(null);
  const slotsRef = useRef(null);
  const controlled = value !== undefined;
  const [slots, setSlots] = useState(() => toSlots(controlled ? value : defaultValue, length));
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const joined = slots.join("");
  const joinedRef = useRef(joined);

  useEffect(() => {
    joinedRef.current = joined;
  }, [joined]);

  useEffect(() => {
    if (!controlled) return;
    const incoming = sanitize(value, length);
    if (incoming !== joinedRef.current) setSlots(toSlots(incoming, length));
  }, [controlled, length, value]);

  useEffect(() => {
    if (status !== "error" || reduce || !slotsRef.current) return;
    animate(slotsRef.current, { x: [0, -5, 5, -3, 3, -1, 0] }, { duration: 0.45, ease: EASE_OUT });
  }, [reduce, status]);

  const commit = (next) => {
    const wasComplete = slots.every(Boolean);
    setSlots(next);
    const nextValue = next.join("");
    onChange?.(nextValue);
    if (!wasComplete && next.every(Boolean)) onComplete?.(nextValue);
  };

  const insert = (raw, from = active) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const next = [...slots];
    let index = from;
    for (const digit of digits) {
      if (index >= length) break;
      next[index] = digit;
      index += 1;
    }
    commit(next);
    setActive(Math.min(index, length - 1));
  };

  const clearSlot = (index) => {
    const next = [...slots];
    next[index] = "";
    commit(next);
  };

  const handleKeyDown = (event) => {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      insert(event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      if (slots[active]) clearSlot(active);
      else if (active > 0) {
        clearSlot(active - 1);
        setActive((current) => Math.max(current - 1, 0));
      }
    } else if (event.key === "Delete") {
      event.preventDefault();
      clearSlot(active);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, length - 1));
    }
  };

  const slotFromClientX = (clientX) => {
    const elements = slotsRef.current?.children;
    if (!elements) return 0;
    for (let index = 0; index < elements.length; index += 1) {
      if (clientX < elements[index].getBoundingClientRect().right) return index;
    }
    return length - 1;
  };

  const showSuccess = status === "success";
  const message = showSuccess ? successMessage : status === "error" ? errorMessage : hint;

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      {label ? <label htmlFor={`${uid}-input`} className="text-xs font-medium text-foreground">{label}</label> : null}
      <fieldset
        className="relative m-0 inline-flex w-max border-0 p-0"
        onMouseDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          const firstEmpty = slots.indexOf("");
          const lastAvailable = firstEmpty === -1 ? length - 1 : firstEmpty;
          setActive(Math.min(slotFromClientX(event.clientX), lastAvailable));
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          id={`${uid}-input`}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={status === "error"}
          value=""
          maxLength={length}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            const digits = sanitize(event.target.value, length);
            if (!digits) return;
            commit(toSlots(digits, length));
            setActive(Math.min(digits.length, length - 1));
          }}
          onPaste={(event) => {
            if (disabled) return;
            event.preventDefault();
            insert(event.clipboardData.getData("text"));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 z-20 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
        />

        <LayoutGroup id={`${uid}-slots`}>
          <div ref={slotsRef} className="flex items-center gap-2">
            {slots.map((character, index) => {
              const isActive = focused && active === index;
              return (
                <div
                  key={`${uid}-${index}`}
                  className={cn(
                    "relative grid h-14 w-12 place-items-center overflow-hidden rounded-lg border text-xl font-semibold tabular-nums transition-colors",
                    showSuccess ? "border-emerald-500/60" : status === "error" ? "border-destructive/60" : character ? "border-border-strong" : "border-border",
                    disabled && "opacity-50",
                  )}
                >
                  {isActive && !showSuccess && status !== "error" ? (
                    <motion.span
                      layoutId={`${uid}-focus`}
                      className="pointer-events-none absolute inset-[-1px] rounded-lg border-2 border-foreground"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                    />
                  ) : null}
                  <AnimatePresence initial={false}>
                    {character ? (
                      <motion.span
                        key={character}
                        initial={reduce ? { opacity: 0 } : { y: 14, opacity: 0, filter: "blur(4px)" }}
                        animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1, filter: "blur(0px)" }}
                        exit={reduce ? { opacity: 0 } : { y: -14, opacity: 0, filter: "blur(4px)" }}
                        transition={reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
                        className="absolute inset-0 grid place-items-center leading-none"
                      >
                        {mask ? "•" : character}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </LayoutGroup>

        <AnimatePresence>
          {showSuccess ? (
            <motion.span
              initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="pointer-events-none absolute -right-7 top-1/2 -translate-y-1/2 text-emerald-500"
              aria-hidden="true"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} />
              </svg>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </fieldset>

      {message ? (
        <p aria-live="polite" className={cn("text-xs", showSuccess ? "text-emerald-500" : status === "error" ? "text-destructive" : "text-muted-foreground")}>{message}</p>
      ) : null}
    </div>
  );
}
