// beui.dev/components/blocks/project-folder
//
// Local deviation from the registry version: an optional `tone` prop tints
// the folder (and its overlay) with any CSS color instead of the fixed
// `primary` lime. The default — no `tone` — reproduces the registry look
// exactly. The tint is applied by the `pf-*` marker classes in global.css so
// the tone can use color-mix rather than fighting the utility classes here.
import { X } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

const MAX_FAN_PREVIEWS = 5;
const MAX_OVERLAY_PREVIEWS = 10;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getPreviewTransform(index, count) {
  const offset = index - (count - 1) / 2;
  const distance = Math.abs(offset);
  const centerLift = Math.max(0, 2 - distance) * 8;

  return {
    x: offset * 44,
    y: 8 - centerLift,
    rotate: offset * 6,
    scale: distance === 0 ? 1.04 : distance === 1 ? 0.95 : 0.88,
    opacity: distance === 0 ? 1 : distance === 1 ? 0.78 : 0.58,
    zIndex: 10 - distance,
  };
}

export function ProjectFolder({
  title,
  description = "Updated recently",
  previews = [],
  count = previews.length,
  itemLabel = "lesson",
  open,
  defaultOpen = false,
  onOpenChange,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onClick,
  onPreviewClick,
  disabled = false,
  ariaLabel,
  tone,
  className,
}) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const layoutGroupId = useId();
  const dialogTitleId = `${layoutGroupId}-title`;
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const restoringFocusRef = useRef(false);
  const folderButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [isClosing, setIsClosing] = useState(false);

  const openControlled = open !== undefined;
  const expandedControlled = expanded !== undefined;
  const isExpanded = expanded ?? internalExpanded;
  const isOpen = (open ?? internalOpen) || isExpanded;

  const fanItems = previews.slice(0, MAX_FAN_PREVIEWS);
  const overlayItems = previews.slice(0, MAX_OVERLAY_PREVIEWS);
  const transition = reduce ? { duration: 0 } : SPRING_LAYOUT;
  const countText = `${count} ${itemLabel}${count === 1 ? "" : "s"}`;

  const setOpen = useCallback(
    (next) => {
      if (disabled) return;
      if (!openControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [disabled, onOpenChange, openControlled],
  );

  const setExpanded = useCallback(
    (next) => {
      if (disabled || previews.length === 0) return;
      if (!expandedControlled) setInternalExpanded(next);
      onExpandedChange?.(next);
    },
    [disabled, expandedControlled, onExpandedChange, previews.length],
  );

  const finishClose = useCallback(() => {
    setIsClosing(false);
    restoringFocusRef.current = true;
    requestAnimationFrame(() => folderButtonRef.current?.focus());
  }, []);

  const closeOverlay = useCallback(() => {
    setIsClosing(true);
    setOpen(false);
    setExpanded(false);
  }, [setExpanded, setOpen]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduce && isClosing) finishClose();
  }, [finishClose, isClosing, reduce]);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR),
      ).filter((element) => element.tabIndex >= 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeOverlay, isExpanded]);

  const handleFolderClick = () => {
    setIsClosing(false);
    setExpanded(true);
    setOpen(true);
    onClick?.();
  };

  const overlay = isExpanded || isClosing ? (
    <>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.button
            key="project-files-backdrop"
            type="button"
            tabIndex={-1}
            aria-label="Close file overlay"
            onClick={closeOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.18 }}
            className={cn(
              "fixed inset-0 z-50 cursor-default bg-background",
              isClosing && "pointer-events-none",
            )}
          />
        ) : null}
      </AnimatePresence>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-hidden={isExpanded ? undefined : "true"}
        style={{ "--folder-tone": tone || "var(--accent)" }}
        className="pointer-events-none fixed inset-x-6 inset-y-8 z-50 flex items-start justify-center overflow-y-auto sm:items-center"
      >
        <div
          className={cn(
            "pointer-events-auto relative z-10 w-full max-w-[61rem]",
            isClosing && "pointer-events-none",
          )}
        >
          <AnimatePresence initial={false}>
            {isExpanded ? (
              <motion.div
                key="project-files-header"
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={reduce ? { duration: 0 } : { duration: 0.18 }}
                className="mb-6 flex items-center justify-between gap-4"
              >
                <div>
                  <h2 id={dialogTitleId} className="text-xl font-medium text-foreground">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{countText}</p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeOverlay}
                  aria-label={`Close ${title}`}
                  className="flex size-10 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[var(--bg-secondary)] text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="grid grid-cols-2 place-items-center gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {isExpanded
              ? overlayItems.map((preview) => (
                  <motion.button
                    key={preview.id}
                    type="button"
                    layoutId={`file-${preview.id}`}
                    transition={transition}
                    onClick={() => onPreviewClick?.(preview)}
                    className="pf-preview aspect-[3/4] w-full max-w-40 cursor-pointer overflow-hidden rounded-xl border border-primary/15 bg-card text-left transition-colors hover:border-primary/30 hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {preview.content}
                  </motion.button>
                ))
              : null}
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.button
        ref={folderButtonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isExpanded}
        data-open={isOpen ? "true" : "false"}
        data-expanded={isExpanded ? "true" : "false"}
        tabIndex={isExpanded ? -1 : undefined}
        onPointerEnter={() => {
          if (!canHover) return;
          hoveredRef.current = true;
          setOpen(true);
        }}
        onPointerLeave={() => {
          if (!canHover) return;
          hoveredRef.current = false;
          if (!isExpanded && !isClosing) setOpen(focusedRef.current);
        }}
        onFocus={() => {
          if (restoringFocusRef.current) {
            restoringFocusRef.current = false;
            focusedRef.current = false;
            return;
          }
          focusedRef.current = true;
          setOpen(true);
        }}
        onBlur={() => {
          focusedRef.current = false;
          if (!isExpanded && !isClosing) setOpen(hoveredRef.current);
        }}
        onClick={handleFolderClick}
        whileTap={reduce || disabled ? undefined : { scale: 0.98 }}
        transition={reduce ? { duration: 0 } : SPRING_PRESS}
        style={{ "--folder-tone": tone || "var(--accent)" }}
        className={cn(
          "project-folder relative block h-56 w-72 select-none rounded-2xl text-left outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {/* Folder back face — tilts up when open */}
        <motion.span
          aria-hidden="true"
          animate={{ rotateX: isOpen && !reduce ? 15 : 0 }}
          transition={transition}
          className="pf-back absolute inset-0 rounded-2xl border border-primary/20 bg-primary/8 backdrop-blur-xl [transform-origin:center_bottom]"
        />

        {/* Preview cards fanning out from inside the folder */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <span className="absolute left-1/2 top-0 block h-0 w-0">
            <AnimatePresence initial={false}>
              {!isExpanded
                ? fanItems.map((preview, index) => {
                    const opened = getPreviewTransform(
                      index,
                      fanItems.length,
                    );
                    return (
                      <motion.span
                        key={preview.id}
                        layoutId={`file-${preview.id}`}
                        initial={false}
                        animate={
                          isOpen && !reduce
                            ? {
                                x: opened.x * 1.4,
                                y: opened.y - 8,
                                rotate: opened.rotate * 1.3,
                                scale: opened.scale * 1.02,
                                opacity: Math.min(1, opened.opacity + 0.18),
                              }
                            : {
                                x: opened.x,
                                y: opened.y,
                                rotate: opened.rotate,
                                scale: opened.scale,
                                opacity: opened.opacity,
                              }
                        }
                        transition={transition}
                        onLayoutAnimationComplete={() => {
                          if (isClosing && index === 0) finishClose();
                        }}
                        className="pf-preview absolute left-0 top-0 -ml-12 block h-40 w-24 overflow-hidden rounded-lg border border-primary/15 bg-primary/5 backdrop-blur-lg"
                        style={{ zIndex: opened.zIndex }}
                      >
                        {preview.content}
                      </motion.span>
                    );
                  })
                : null}
            </AnimatePresence>
          </span>
        </span>

        {/* Folder front face — tilts down when open */}
        <motion.span
          initial={false}
          animate={{ rotateX: isOpen && !reduce ? -25 : 0 }}
          transition={transition}
          className="pf-front absolute inset-x-0 bottom-0 z-20 overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 backdrop-blur-2xl [backface-visibility:hidden] [transform-origin:center_bottom]"
        >
          <span className="flex h-16 items-center px-4">
            <span className="line-clamp-2 text-xl font-medium leading-tight text-foreground">
              {title}
            </span>
          </span>
          <span className="flex h-12 items-center justify-between gap-3 border-t border-[color:var(--border)] px-4">
            <span className="shrink-0 text-sm font-medium text-foreground/70">
              {countText}
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {description}
            </span>
          </span>
        </motion.span>
      </motion.button>

      {mounted ? createPortal(overlay, document.body) : null}
    </LayoutGroup>
  );
}
