import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarClock, Check, Download, Image, Plus, Trash2, X,
} from 'lucide-react';

export default function LearningLibraryModal({
  open,
  postcards = [],
  codeCandidate,
  onClose,
  onCreatePostcard,
  onDeletePostcard,
  onSchedulePostcard,
}) {
  const titleRef = useRef(null);
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    titleRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canCreate = !!codeCandidate?.code?.trim() && !!title.trim() && !!explanation.trim();
  const createPostcard = () => {
    if (!canCreate) return;
    onCreatePostcard?.({ title: title.trim(), explanation: explanation.trim() });
    setTitle('');
    setExplanation('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div style={styles.scrim} role="presentation" onClick={onClose}>
      <section style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="learning-library-title" onClick={(event) => event.stopPropagation()}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>Private · stored on this device</div>
            <h2 ref={titleRef} tabIndex={-1} id="learning-library-title" style={styles.title}>
              Code postcards
            </h2>
          </div>
          <button type="button" style={styles.iconButton} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div style={styles.body}>
          <>
              <section style={styles.createCard}>
                <div style={styles.sectionHeading}><Plus size={13} /> Make a postcard from the current editor</div>
                {codeCandidate?.code?.trim() ? (
                  <>
                    <div style={styles.candidateMeta}>{codeCandidate.language} · {codeCandidate.filename || 'current snippet'}{codeCandidate.output ? ' · latest output included' : ''}</div>
                    <input style={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give this program a title" maxLength={80} />
                    <textarea style={styles.textarea} value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="What does it do, and what did you learn while making it?" rows={4} maxLength={600} />
                    <button type="button" style={{ ...styles.primaryButton, ...(!canCreate ? styles.disabled : {}) }} disabled={!canCreate} onClick={createPostcard}>
                      {saved ? <><Check size={13} /> Saved</> : <><Image size={13} /> Create postcard</>}
                    </button>
                  </>
                ) : (
                  <p style={styles.emptyText}>Write or open some code in Workspace or Learn Mode, then return here to turn it into a postcard.</p>
                )}
              </section>

              <div style={styles.list}>
                {postcards.length === 0 && <EmptyState icon={<Image size={18} />} title="No postcards yet" text="Capture a small program you are proud of—not an entire workspace." />}
                {postcards.map((postcard) => (
                  <article key={postcard.id} style={styles.postcard}>
                    <div style={styles.postcardTopline}>
                      <span>{postcard.language}</span>
                      <time>{formatDate(postcard.createdAt)}</time>
                    </div>
                    <h3 style={styles.postcardTitle}>{postcard.title}</h3>
                    <p style={styles.postcardExplanation}>{postcard.explanation}</p>
                    <pre style={styles.code}>{postcard.code}</pre>
                    {postcard.output && <pre style={styles.output}>Output{`\n`}{postcard.output}</pre>}
                    <div style={styles.actions}>
                      <button type="button" style={styles.actionButton} onClick={() => exportPostcard(postcard)}><Download size={12} /> Export .md</button>
                      <button type="button" style={styles.actionButton} onClick={() => onSchedulePostcard?.(postcard, 3)}><CalendarClock size={12} /> Review in 3 days</button>
                      <button type="button" style={styles.dangerButton} onClick={() => onDeletePostcard?.(postcard.id)} aria-label={`Delete ${postcard.title}`}><Trash2 size={12} /></button>
                    </div>
                  </article>
                ))}
              </div>
          </>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return <div style={styles.empty}><span style={styles.emptyIcon}>{icon}</span><div><strong style={styles.emptyTitle}>{title}</strong><p style={styles.emptyText}>{text}</p></div></div>;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function exportPostcard(postcard) {
  const output = postcard.output ? `\n\n## Output\n\n\`\`\`text\n${postcard.output}\n\`\`\`` : '';
  const markdown = `# ${postcard.title}\n\n${postcard.explanation}\n\n## Code\n\n\`\`\`\`${postcard.language}\n${postcard.code}\n\`\`\`\`${output}\n\n_Created with seec0de on ${formatDate(postcard.createdAt)}._\n`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename(postcard.title)}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value) {
  return String(value || 'code-postcard').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'code-postcard';
}

const styles = {
  scrim: { position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--scrim)', backdropFilter: 'blur(5px)' },
  modal: { width: 760, maxWidth: '100%', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-strong)', borderRadius: 14, background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' },
  kicker: { color: 'var(--accent)', fontSize: 9, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { margin: '5px 0 0', color: 'var(--text-primary)', fontSize: 21, letterSpacing: '-0.025em' },
  iconButton: { display: 'inline-flex', padding: 7, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  body: { minHeight: 0, overflowY: 'auto', padding: 20 },
  createCard: { display: 'flex', flexDirection: 'column', gap: 9, padding: 15, border: '1px solid var(--border-strong)', borderRadius: 10, background: 'var(--bg-secondary)' },
  sectionHeading: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 },
  candidateMeta: { color: 'var(--text-muted)', fontSize: 9.5, textTransform: 'capitalize' },
  input: { padding: '8px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 11.5 },
  textarea: { resize: 'vertical', padding: 9, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-primary)', font: 'inherit', fontSize: 11.5, lineHeight: 1.5 },
  primaryButton: { alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', border: 0, borderRadius: 6, background: 'var(--accent)', color: 'var(--text-on-accent)', fontSize: 10.5, fontWeight: 700 },
  disabled: { opacity: 0.42, cursor: 'not-allowed' },
  list: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 },
  postcard: { padding: 15, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-secondary)' },
  postcardTopline: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7 },
  postcardTitle: { margin: '8px 0 0', color: 'var(--text-primary)', fontSize: 15 },
  postcardExplanation: { margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.5 },
  code: { maxHeight: 190, overflow: 'auto', margin: '11px 0 0', padding: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  output: { maxHeight: 110, overflow: 'auto', margin: '7px 0 0', padding: 9, borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 9.5, lineHeight: 1.45, whiteSpace: 'pre-wrap' },
  actions: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 },
  actionButton: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 7px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 9.5 },
  dangerButton: { marginLeft: 'auto', display: 'inline-flex', padding: 6, border: '1px solid var(--border)', borderRadius: 5, background: 'transparent', color: 'var(--danger)' },
  empty: { display: 'flex', gap: 11, alignItems: 'flex-start', padding: 17, border: '1px dashed var(--border-strong)', borderRadius: 9, background: 'var(--bg-secondary)' },
  emptyIcon: { color: 'var(--text-muted)' },
  emptyTitle: { color: 'var(--text-primary)', fontSize: 11.5 },
  emptyText: { margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.5 },
};
