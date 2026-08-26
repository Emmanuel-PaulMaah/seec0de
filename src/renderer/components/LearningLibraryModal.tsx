import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, Download, Image, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface Postcard { id: string; title: string; explanation: string; code: string; language: string; output?: string; createdAt: string; }

interface LearningLibraryModalProps {
  open?: boolean;
  postcards?: Postcard[];
  codeCandidate?: { code?: string; language?: string; filename?: string; output?: string } | null;
  onClose?: () => void;
  onCreatePostcard?: (data: { title: string; explanation: string }) => void;
  onDeletePostcard?: (id: string) => void;
  onSchedulePostcard?: (postcard: Postcard, days: number) => void;
}

export default function LearningLibraryModal({ open, postcards = [], codeCandidate, onClose, onCreatePostcard, onDeletePostcard, onSchedulePostcard }: LearningLibraryModalProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    titleRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canCreate = !!codeCandidate?.code?.trim() && !!title.trim() && !!explanation.trim();
  const createPostcard = () => {
    if (!canCreate) return;
    onCreatePostcard?.({ title: title.trim(), explanation: explanation.trim() });
    setTitle(''); setExplanation(''); setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center p-6 bg-[var(--scrim)] backdrop-blur-sm" role="presentation" onClick={onClose}>
      <section className="w-[760px] max-w-full max-h-[calc(100vh-48px)] flex flex-col border border-[var(--border-strong)] rounded-[14px] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="learning-library-title" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between px-5 pt-4 pb-3.5 border-b border-[var(--border)]">
          <div>
            <div className="text-[var(--accent)] text-[9px] font-bold tracking-[1.1px] uppercase">Private · stored on this device</div>
            <h2 ref={titleRef} tabIndex={-1} id="learning-library-title" className="mt-1.5 m-0 text-[var(--text-primary)] text-[21px] tracking-tight">Postcards</h2>
          </div>
          <button type="button" className="inline-flex p-[7px] border border-[var(--border)] rounded-[7px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">
          <section className="flex flex-col gap-2 p-3.5 border border-[var(--border-strong)] rounded-[10px] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-1.5 text-[var(--text-primary)] text-xs font-bold"><Plus size={13} /> Make a postcard from the current editor</div>
            {codeCandidate?.code?.trim() ? (
              <>
                <div className="text-[var(--text-muted)] text-[9.5px] capitalize">{codeCandidate.language} · {codeCandidate.filename || 'current snippet'}{codeCandidate.output ? ' · latest output included' : ''}</div>
                <input className="py-2 px-[9px] border border-[var(--border)] rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] text-[11.5px] outline-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give this program a title" maxLength={80} />
                <textarea className="resize-y p-[9px] border border-[var(--border)] rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] font-sans text-[11.5px] leading-relaxed outline-none" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="What does it do, and what did you learn while making it?" rows={4} maxLength={600} />
                <Button size="sm" className="self-start" disabled={!canCreate} onClick={createPostcard}>
                  {saved ? <><Check size={13} className="mr-1.5" /> Saved</> : <><Image size={13} className="mr-1.5" /> Create postcard</>}
                </Button>
              </>
            ) : (
              <p className="text-[var(--text-muted)] text-[10.5px] leading-normal">Write or open some code in Workspace or Learn, then return here to turn it into a postcard.</p>
            )}
          </section>

          <div className="flex flex-col gap-3 mt-3.5">
            {postcards.length === 0 && (
              <div className="flex gap-2.5 items-start p-4 border border-dashed border-[var(--border-strong)] rounded-[9px] bg-[var(--bg-secondary)]">
                <span className="text-[var(--text-muted)]"><Image size={18} /></span>
                <div><strong className="text-[var(--text-primary)] text-[11.5px]">No postcards yet</strong><p className="mt-1 text-[var(--text-muted)] text-[10.5px] leading-normal">Capture a small program you are proud of—not an entire workspace.</p></div>
              </div>
            )}
            {postcards.map((postcard) => (
              <article key={postcard.id} className="p-3.5 border border-[var(--border)] rounded-[10px] bg-[var(--bg-secondary)]">
                <div className="flex justify-between text-[var(--text-muted)] text-[9px] uppercase tracking-wider">
                  <span>{postcard.language}</span>
                  <time>{formatDate(postcard.createdAt)}</time>
                </div>
                <h3 className="mt-2 m-0 text-[var(--text-primary)] text-[15px]">{postcard.title}</h3>
                <p className="mt-1.5 m-0 text-[var(--text-secondary)] text-[11px] leading-relaxed">{postcard.explanation}</p>
                <pre className="max-h-[190px] overflow-auto mt-[11px] p-[11px] border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap">{postcard.code}</pre>
                {postcard.output && <pre className="max-h-[110px] overflow-auto mt-[7px] p-[9px] rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-mono text-[9.5px] leading-[1.45] whitespace-pre-wrap">Output{'\n'}{postcard.output}</pre>}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <button type="button" className="inline-flex items-center gap-1 px-[7px] py-[5px] border border-[var(--border)] rounded-[5px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[9.5px] hover:text-[var(--text-primary)]" onClick={() => exportPostcard(postcard)}><Download size={12} /> Export .md</button>
                  <button type="button" className="inline-flex items-center gap-1 px-[7px] py-[5px] border border-[var(--border)] rounded-[5px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[9.5px] hover:text-[var(--text-primary)]" onClick={() => onSchedulePostcard?.(postcard, 3)}><CalendarClock size={12} /> Review in 3 days</button>
                  <button type="button" className="ml-auto inline-flex p-1.5 border border-[var(--border)] rounded-[5px] bg-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)]" onClick={() => onDeletePostcard?.(postcard.id)} aria-label={`Delete ${postcard.title}`}><Trash2 size={12} /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function exportPostcard(postcard: Postcard) {
  const output = postcard.output ? `\n\n## Output\n\n\`\`\`text\n${postcard.output}\n\`\`\`` : '';
  const markdown = `# ${postcard.title}\n\n${postcard.explanation}\n\n## Code\n\n\`\`\`${postcard.language}\n${postcard.code}\n\`\`\`${output}\n\n_Created with seec0de on ${formatDate(postcard.createdAt)}._\n`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${String(postcard.title || 'code-postcard').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'code-postcard'}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
