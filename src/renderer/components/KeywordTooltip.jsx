import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { SPRING_PANEL, EASE_OUT } from '../lib/ease';

const MORPH_CLIP_TRANSITION = { duration: 0.32, ease: EASE_OUT };

function clipHidden(radius) {
  return `inset(92% 0% 0% 0% round ${radius}px)`;
}
function clipShown(radius) {
  return `inset(0% 0% 0% 0% round ${radius}px)`;
}

export default function KeywordTooltip({ keyword, definition, example, language, position, onClose }) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });

  const measureRef = useCallback((node) => {
    if (node) {
      panelRef.current = node;
      setPanelSize({ width: node.offsetWidth, height: node.offsetHeight });
    }
  }, []);

  useEffect(() => {
    if (!panelRef.current) return;
    const observer = new ResizeObserver(() => {
      if (panelRef.current) {
        setPanelSize({
          width: panelRef.current.offsetWidth,
          height: panelRef.current.offsetHeight,
        });
      }
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [keyword]);

  useEffect(() => {
    if (!keyword) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onPointer = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [keyword, onClose]);

  if (!keyword || !position) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const panelW = panelSize.width || 300;
  const panelH = panelSize.height || 120;
  const gap = 10;

  let left = position.left;
  let top = position.top + gap;
  if (left + panelW > vw - 16) left = vw - panelW - 16;
  if (left < 16) left = 16;
  if (top + panelH > vh - 16) top = position.top - panelH - gap;
  if (top < 16) top = 16;

  const radius = 12;

  const wrap = reduce
    ? undefined
    : {
        hidden: { opacity: 0, scale: 0.96, transition: SPRING_PANEL },
        show: { opacity: 1, scale: 1, transition: SPRING_PANEL },
      };
  const clip = reduce
    ? undefined
    : {
        hidden: { clipPath: clipHidden(radius), transition: MORPH_CLIP_TRANSITION },
        show: { clipPath: clipShown(radius), transition: MORPH_CLIP_TRANSITION },
      };

  return createPortal(
    <AnimatePresence>
      {keyword ? (
        <motion.div
          key="kw-tooltip-wrap"
          variants={wrap}
          initial={reduce ? { opacity: 0 } : 'hidden'}
          animate={reduce ? { opacity: 1 } : 'show'}
          exit={reduce ? { opacity: 0 } : 'hidden'}
          transition={reduce ? { duration: 0.12 } : undefined}
          style={{
            position: 'fixed',
            left,
            top,
            zIndex: 9999,
            transformOrigin: 'top left',
            filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.18))',
          }}
        >
          <motion.div
            ref={measureRef}
            variants={clip}
            style={{
              borderRadius: radius,
              overflow: 'hidden',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              padding: 12,
              maxWidth: 340,
              minWidth: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={styles.header}>
              <span style={styles.keyword}>{keyword}</span>
              <span style={styles.lang}>{language}</span>
              <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
                <X size={12} />
              </button>
            </div>
            <div style={styles.definition}>{definition}</div>
            {example && <pre style={styles.example}>{example}</pre>}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  keyword: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--keyword-highlight)',
  },
  lang: {
    fontSize: 10,
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '1px 6px',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
  },
  definition: {
    fontSize: 12,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  example: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--string-highlight)',
    fontSize: 11,
    padding: 8,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
};
