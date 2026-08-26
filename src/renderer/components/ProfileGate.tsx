import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Lock, ArrowLeft, X } from 'lucide-react';
import { Avatar } from './ProfileForm';
import { profileHasPin, verifyProfilePin } from '../engine/settings';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  username?: string;
  avatar?: string;
}

interface ProfileGateProps {
  profiles?: Profile[];
  autoSelectId?: string | null;
  onEnter?: (id: string) => void;
  onAddProfile?: () => void;
  allowClose?: boolean;
  onClose?: () => void;
}

export default function ProfileGate({ profiles = [], autoSelectId = null, onEnter, onAddProfile, allowClose = false, onClose }: ProfileGateProps) {
  const initialUnlock = autoSelectId && profileHasPin(autoSelectId) ? autoSelectId : null;
  const [unlockId, setUnlockId] = useState<string | null>(initialUnlock);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  const unlockProfile = profiles.find((p) => p.id === unlockId) || null;

  useEffect(() => {
    if (unlockId) { setPin(''); setError(''); const t = setTimeout(() => pinRef.current?.focus(), 40); return () => clearTimeout(t); }
    return undefined;
  }, [unlockId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (unlockId) setUnlockId(null); else if (allowClose) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlockId, allowClose, onClose]);

  const pickProfile = useCallback((profile: Profile) => { if (profileHasPin(profile.id)) setUnlockId(profile.id); else onEnter?.(profile.id); }, [onEnter]);

  const submitPin = useCallback(async () => {
    if (!unlockId || checking) return;
    setChecking(true);
    try {
      const ok = await verifyProfilePin(unlockId, pin);
      if (ok) onEnter?.(unlockId);
      else { setError('That PIN is incorrect.'); setPin(''); pinRef.current?.focus(); }
    } finally { setChecking(false); }
  }, [unlockId, pin, checking, onEnter]);

  return (
    <div className="fixed inset-0 z-[1100] bg-[var(--bg-primary)] flex items-center justify-center p-6 animate-[seec0de-fade-in_var(--motion-base)_var(--ease-out)]" role="dialog" aria-modal="true" aria-label="Choose profile">
      {allowClose && (
        <button onClick={onClose} title="Cancel (Esc)" className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-transparent border border-[var(--border)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:text-[var(--text-primary)]">
          <X size={18} />
        </button>
      )}

      {!unlockId ? (
        <div className="w-full max-w-[640px] flex flex-col items-center text-center animate-[seec0de-pop-in_var(--motion-slow)_var(--ease-out)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[15px] text-[var(--text-secondary)] font-mono">⟨/⟩</span>
            <span className="font-mono text-[13px] tracking-wider text-[var(--text-secondary)]">seec0de</span>
          </div>
          <h1 className="text-[30px] font-bold text-[var(--text-primary)] tracking-tight mb-2">Who's learning?</h1>
          <p className="text-[13.5px] text-[var(--text-secondary)] mb-7">Pick your profile. Everything stays on this device.</p>
          <div className="flex flex-wrap gap-6 justify-center items-start">
            {profiles.map((p) => (
              <button key={p.id} className="flex flex-col items-center gap-3 bg-transparent border-none p-2 rounded-xl w-[132px] hover:bg-[var(--bg-tertiary)] transition-colors" onClick={() => pickProfile(p)} title={p.username}>
                <div className="relative inline-flex">
                  <Avatar profile={p} size={88} />
                  {profileHasPin(p.id) && <span className="absolute right-[-2px] bottom-[-2px] w-6 h-6 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--bg-primary)] inline-flex items-center justify-center"><Lock size={11} color="#fff" /></span>}
                </div>
                <span className="text-sm text-[var(--text-secondary)] font-medium max-w-[128px] overflow-hidden text-ellipsis whitespace-nowrap">{p.username || 'Unnamed'}</span>
              </button>
            ))}
            <button className="flex flex-col items-center gap-3 bg-transparent border-none p-2 rounded-xl w-[132px] hover:bg-[var(--bg-tertiary)] transition-colors" onClick={() => onAddProfile?.()} title="Add a new profile">
              <span className="w-[88px] h-[88px] rounded-full border-2 border-dashed border-[var(--border-strong)] inline-flex items-center justify-center bg-[var(--bg-secondary)]">
                <Plus size={30} color="var(--text-secondary)" />
              </span>
              <span className="text-sm text-[var(--text-secondary)] font-medium">Add profile</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[340px] flex flex-col items-center text-center gap-3.5 relative animate-[seec0de-pop-in_var(--motion-slow)_var(--ease-out)]">
          <button className="absolute top-[-48px] left-0 inline-flex items-center bg-transparent border border-[var(--border)] rounded-md text-[var(--text-secondary)] text-[12.5px] px-3 py-1.5 hover:text-[var(--text-primary)]" onClick={() => setUnlockId(null)}>
            <ArrowLeft size={13} className="mr-1.5" /> Back
          </button>
          <Avatar profile={unlockProfile} size={92} />
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)] m-0">{unlockProfile?.username || 'Profile'}</h2>
          <p className="text-[13.5px] text-[var(--text-secondary)]">Enter your PIN to continue.</p>
          <input ref={pinRef} type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') submitPin(); }} placeholder="••••" className={cn('w-[200px] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-[22px] tracking-[8px] text-center py-3 px-3.5 outline-none font-mono', error && 'border-[var(--danger)]')} maxLength={12} autoComplete="off" />
          {error && <p className="text-xs text-[var(--danger-text-soft)] m-0">{error}</p>}
          <button onClick={submitPin} disabled={pin.length === 0 || checking} className={cn('w-[200px] border rounded-lg text-sm font-semibold py-2.5 px-3.5 mt-1', pin.length === 0 || checking ? 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-muted)] opacity-80 cursor-not-allowed' : 'bg-[var(--accent)] border-[var(--accent)] text-[var(--text-on-accent)] cursor-pointer hover:bg-[var(--accent-hover)]')}>
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      )}
    </div>
  );
}
