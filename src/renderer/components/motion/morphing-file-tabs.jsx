// Compact file-tab adaptation of beui.dev/components/blocks/morphing-tabs.

import { File, FileCode, FileJson, FileText, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';
import { basename } from '../../engine/fileLanguage';
import { cn } from '../../lib/utils';

const EXT_ICONS = {
  js: FileCode, jsx: FileCode, mjs: FileCode, cjs: FileCode,
  ts: FileCode, tsx: FileCode, py: FileCode,
  html: FileCode, htm: FileCode,
  css: FileText, md: FileText, txt: FileText,
  json: FileJson,
  c: FileCode, h: FileCode, cpp: FileCode, cc: FileCode,
  cxx: FileCode, hpp: FileCode, java: FileCode, cs: FileCode,
  go: FileCode, rs: FileCode,
};

function getFileIcon(path) {
  const dot = path.lastIndexOf('.');
  const extension = dot >= 0 ? path.slice(dot + 1).toLowerCase() : '';
  return EXT_ICONS[extension] || File;
}

export function MorphingFileTabs({ files, activePath, onSelect, onClose, className, style }) {
  const reduce = useReducedMotion();
  const uid = useId();
  const tabRefs = useRef({});

  useEffect(() => {
    tabRefs.current[activePath]?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activePath, reduce]);

  const selectAt = (index) => {
    const next = files[index];
    if (!next) return;
    onSelect?.(next.path);
    requestAnimationFrame(() => tabRefs.current[next.path]?.focus());
  };

  const handleKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % files.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + files.length) % files.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = files.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    selectAt(nextIndex);
  };

  return (
    <LayoutGroup id={`${uid}-file-tabs`}>
      <div
        role="tablist"
        aria-label="Open files"
        className={cn('flex min-w-0 items-end gap-0.5 overflow-x-auto overflow-y-hidden', className)}
        style={{ height: 'var(--panel-header-height)', ...style }}
      >
        {files.map((file, index) => {
          const active = activePath === file.path;
          const Icon = getFileIcon(file.path);
          const name = basename(file.path);

          return (
            <motion.div
              key={file.path}
              layout={reduce ? false : 'position'}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.55 }}
              className="group relative flex h-8 shrink-0 items-center"
            >
              {active ? (
                <motion.span
                  layoutId={`${uid}-active-surface`}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-[-1px] top-0 rounded-t-lg bg-[var(--bg-primary)]"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.55 }}
                />
              ) : null}

              <button
                ref={(node) => { tabRefs.current[file.path] = node; }}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                title={file.path}
                onClick={() => onSelect?.(file.path)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  'relative z-10 flex h-full max-w-40 min-w-0 items-center gap-1.5 rounded-t-lg py-0 pl-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--text-muted)]',
                  active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]',
                  onClose ? 'pr-7' : 'pr-2.5',
                )}
              >
                <Icon aria-hidden="true" size={13} className="shrink-0" />
                <span className="min-w-0 truncate">{name}</span>
                {file.dirty ? <span className="shrink-0 text-[var(--accent)]" aria-label="Unsaved changes">•</span> : null}
              </button>

              <AnimatePresence initial={false}>
                {onClose ? (
                  <motion.button
                    key="close"
                    initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                    animate={{ opacity: active ? 0.72 : 0.35, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.7 }}
                    transition={{ duration: reduce ? 0 : 0.16 }}
                    type="button"
                    aria-label={`Close ${name}`}
                    title={`Close ${name}`}
                    onClick={(event) => { event.stopPropagation(); onClose(file.path); }}
                    className="absolute right-1 z-20 grid size-5 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--text-muted)] group-hover:opacity-100"
                  >
                    <X aria-hidden="true" size={10} />
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
