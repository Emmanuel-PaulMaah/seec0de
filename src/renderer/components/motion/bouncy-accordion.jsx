// beui.dev/components/motion/bouncy-accordion

import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

// Local springs keep the accordion's connected groups moving together while
// avoiding scale projection on text-heavy row contents.
// Gap spring: must not overshoot y — positive y overshoot drifts items below
// their mt-3 resting point and briefly overlaps the next item.
const ROW_TRANSITION = {
  type: "spring",
  duration: 0.55,
  bounce: 0.38,
};

const CONTENT_OPEN_TRANSITION = {
  type: "spring",
  duration: 0.58,
  bounce: 0.32,
};

const CONTENT_CLOSE_TRANSITION = {
  type: "spring",
  duration: 0.46,
  bounce: 0.26,
};

const DESCRIPTION_TRANSITION = {
  duration: 0.18,
  ease: EASE_OUT,
};

const CHEVRON_TRANSITION = {
  type: "spring",
  duration: 0.42,
  bounce: 0.28,
};


function useControllableAccordionValue({
  value,
  defaultValue,
  onValueChange
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? null);
  const isControlled = value !== undefined;
  const currentValue = value ?? internalValue;

  const setValue = useCallback((next) => {
    if (!isControlled) {
      setInternalValue(next);
    }

    onValueChange?.(next);
  }, [isControlled, onValueChange]);

  return [currentValue, setValue];
}

function BouncyAccordionRow({
  item,
  open,
  contentId,
  triggerId,
  reduce,
  classNames,
  onToggle
}) {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const updateHeight = () => {
      setContentHeight(node.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <motion.div
      layout="position"
      initial={false}
      transition={reduce ? { duration: 0 } : ROW_TRANSITION}>
      <div
        data-state={open ? "open" : "closed"}
        className={cn(
          "overflow-hidden bg-card text-card-foreground",
          item.disabled && "opacity-50",
          classNames?.item
        )}>
        <button
          id={triggerId}
          type="button"
          disabled={item.disabled}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={onToggle}
          className={cn(
            "flex min-h-[54px] w-full items-center gap-4 px-5 text-left outline-none transition-colors",
            "focus-visible:bg-muted/25",
            "disabled:pointer-events-none",
            classNames?.trigger
          )}>
          {item.icon ? (
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center text-muted-foreground",
                classNames?.icon
              )}>
              {item.icon}
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[15px] font-medium text-foreground",
              classNames?.title
            )}>
            {item.title}
          </span>
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : CHEVRON_TRANSITION}
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center text-muted-foreground",
              classNames?.chevron
            )}>
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>

        <motion.div
          layout="size"
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          aria-hidden={!open}
          inert={!open ? "" : undefined}
          initial={false}
          style={{ height: open && item.description ? contentHeight : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : open
                ? CONTENT_OPEN_TRANSITION
                : CONTENT_CLOSE_TRANSITION
          }
          className={cn("overflow-hidden", classNames?.content)}>
          <motion.div
            ref={contentRef}
            animate={{
              opacity: open ? 1 : 0,
            }}
            transition={reduce ? { duration: 0 } : DESCRIPTION_TRANSITION}
            className="px-5 pb-5">
            <div
              className={cn("text-[15px] leading-6 text-muted-foreground", classNames?.description)}>
              {item.description}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function BouncyAccordion({
  items,
  value,
  defaultValue = null,
  onValueChange,
  collapsible = true,
  className,
  classNames
}) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [activeValue, setActiveValue] = useControllableAccordionValue({
    value,
    defaultValue,
    onValueChange,
  });
  const toggleItem = useCallback((id) => {
    if (activeValue === id) {
      if (collapsible) {
        setActiveValue(null);
      }
      return;
    }

    setActiveValue(id);
  }, [activeValue, collapsible, setActiveValue]);

  return (
    <div className={cn("w-full", className, classNames?.root)}>
      {items.map((item) => {
        const open = activeValue === item.id;
        const contentId = `${baseId}-${item.id}-content`;
        const triggerId = `${baseId}-${item.id}-trigger`;

        return (
          <BouncyAccordionRow
            key={item.id}
            item={item}
            open={open}
            contentId={contentId}
            triggerId={triggerId}
            reduce={reduce}
            classNames={classNames}
            onToggle={() => toggleItem(item.id)} />
        );
      })}
    </div>
  );
}
