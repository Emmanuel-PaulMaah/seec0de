import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check, User } from 'lucide-react';
import { LANGUAGE_LIST } from '../engine/languages';
import { cn } from '@/lib/utils';

export function resizeImageToDataUrl(file: File, size = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Please choose an image file.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be loaded.'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const AVATAR_COLOURS = ['#2f6fed', '#b48dff', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f97316'];
function colourFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}
function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : '';
}

export function Avatar({ profile, size = 48, style }: { profile: any; size?: number; style?: React.CSSProperties }) {
  const dim = { width: size, height: size, borderRadius: '50%', flexShrink: 0 };
  if (profile?.avatar) {
    return <img src={profile.avatar} alt={profile.username ? `${profile.username}'s avatar` : 'avatar'} style={{ ...dim, objectFit: 'cover', display: 'block', ...style }} />;
  }
  const initial = initialOf(profile?.username || '');
  return (
    <span aria-hidden={!initial} style={{ ...dim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: initial ? colourFor(profile?.username || '') : 'var(--bg-tertiary)', color: 'var(--text-on-accent)', fontSize: size * 0.42, fontWeight: 600, border: '1px solid var(--border)', ...style }}>
      {initial || <User size={size * 0.5} color="var(--text-muted)" />}
    </span>
  );
}

export function AvatarPicker({ value, username, size = 84, onChange }: { value?: string; username?: string; size?: number; onChange?: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handlePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try { onChange?.(await resizeImageToDataUrl(file)); } catch (err: any) { setError(err.message || 'Could not use that image.'); } finally { setBusy(false); }
  }, [onChange]);
  return (
    <div className="relative inline-flex flex-col items-center">
      <button type="button" className="relative p-0 border-none bg-transparent rounded-full overflow-visible" style={{ width: size, height: size }} onClick={() => inputRef.current?.click()} title="Choose a profile photo" disabled={busy}>
        <Avatar profile={{ avatar: value, username }} size={size} />
        <span className="absolute right-[-2px] bottom-[-2px] w-[26px] h-[26px] rounded-full bg-[var(--accent)] border-2 border-[var(--bg-elevated)] inline-flex items-center justify-center">
          <Camera size={16} color="#fff" />
        </span>
      </button>
      {value && <button type="button" className="absolute right-[-6px] top-[-6px] w-5 h-5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-strong)] text-[var(--text-secondary)] inline-flex items-center justify-center" onClick={() => onChange?.(null)} title="Remove photo"><X size={12} /></button>}
      <input ref={inputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
      {error && <p className="absolute top-full mt-1.5 text-[10.5px] text-[var(--danger-text-soft)] w-[140px] text-center">{error}</p>}
    </div>
  );
}

export function LanguageMultiSelect({ selected = [], onToggle, exclude = [] }: { selected?: string[]; onToggle: (id: string) => void; exclude?: string[] }) {
  const excludeSet = new Set(exclude);
  return (
    <div className="flex flex-wrap gap-1.5">
      {LANGUAGE_LIST.filter((l) => !excludeSet.has(l.id)).map((lang) => {
        const on = selected.includes(lang.id);
        return (
          <button key={lang.id} type="button" onClick={() => onToggle(lang.id)} aria-pressed={on} className={cn('inline-flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-full text-[var(--text-secondary)] text-xs px-3 py-1', on && 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]')}>
            {on && <Check size={10} className="mr-1" />} {lang.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileFields({ values, onChange, usernameError, showLanguages = true, showBio = true, autoFocusUsername = false }: {
  values: any; onChange?: (patch: any) => void; usernameError?: string; showLanguages?: boolean; showBio?: boolean; autoFocusUsername?: boolean;
}) {
  const v = values || {};
  const set = (patch: any) => onChange?.({ ...v, ...patch });
  const toggleUsing = (id: string) => { const has = (v.languagesUsing || []).includes(id); set({ languagesUsing: has ? v.languagesUsing.filter((x: string) => x !== id) : [...(v.languagesUsing || []), id] }); };
  const toggleLearning = (id: string) => { const has = (v.languagesLearning || []).includes(id); set({ languagesLearning: has ? v.languagesLearning.filter((x: string) => x !== id) : [...(v.languagesLearning || []), id] }); };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-start">
        <AvatarPicker value={v.avatar} username={v.username} onChange={(avatar) => set({ avatar })} />
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <label className="text-[12.5px] font-semibold text-[var(--text-primary)]" htmlFor="pf-username">Username</label>
          <input id="pf-username" type="text" value={v.username || ''} onChange={(e) => set({ username: e.target.value })} placeholder="e.g. ada" className={cn('bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[13px] px-[11px] py-2 outline-none', usernameError && 'border-[var(--danger)]')} maxLength={32} autoComplete="off" spellCheck={false} autoFocus={autoFocusUsername} />
          {usernameError ? <p className="text-[11.5px] text-[var(--danger-text-soft)] leading-normal">{usernameError}</p> : <p className="text-[11.5px] text-[var(--text-muted)] leading-normal">This is how you'll show up in seec0de.</p>}
        </div>
      </div>
      {showBio && (
        <div className="flex flex-col gap-2">
          <label className="text-[12.5px] font-semibold text-[var(--text-primary)]">Bio <span className="text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-wider">optional</span></label>
          <textarea id="pf-bio" value={v.bio || ''} onChange={(e) => set({ bio: e.target.value })} placeholder="A line about what you're building or why you're learning to code." className="bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[13px] px-[11px] py-2 outline-none resize-y leading-relaxed font-sans" rows={3} maxLength={240} />
        </div>
      )}
      {showLanguages && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[12.5px] font-semibold text-[var(--text-primary)]">Languages I use <span className="text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-wider">optional</span></label>
            <LanguageMultiSelect selected={v.languagesUsing || []} onToggle={toggleUsing} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12.5px] font-semibold text-[var(--text-primary)]">Languages I'm learning <span className="text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-wider">optional</span></label>
            <LanguageMultiSelect selected={v.languagesLearning || []} onToggle={toggleLearning} />
          </div>
        </>
      )}
    </div>
  );
}
