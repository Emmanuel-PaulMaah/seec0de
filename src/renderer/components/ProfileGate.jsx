import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Lock, ArrowLeft, X } from 'lucide-react';
import { Avatar } from './ProfileForm';
import { profileHasPin, verifyProfilePin } from '../engine/settings';

// ProfileGate — the "sign in" surface. Two states:
//   1. Picker  ("Who's learning?")   — a grid of local profiles + "Add".
//   2. Unlock  (a profile has a PIN) — enter the PIN to continue.
//
// This is the app's authentication gesture. It's fully local/offline: PIN
// checks run against a salted hash in localStorage (see settings.js). It is a
// courtesy lock for shared machines, not real cross-device security.
//
// Props:
//   profiles      — array of profile objects
//   autoSelectId  — jump straight to unlocking this profile (single-user+PIN)
//   onEnter(id)   — a profile was chosen and unlocked; sign in as it
//   onAddProfile  — user wants to create a new profile
//   allowClose    — show an X / allow Esc (used when switching mid-session)
//   onClose       — cancel and keep the current profile
export default function ProfileGate({
  profiles = [],
  autoSelectId = null,
  onEnter,
  onAddProfile,
  allowClose = false,
  onClose,
}) {
  const initialUnlock = autoSelectId && profileHasPin(autoSelectId) ? autoSelectId : null;
  const [unlockId, setUnlockId] = useState(initialUnlock);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const pinRef = useRef(null);

  const unlockProfile = profiles.find((p) => p.id === unlockId) || null;

  // Focus the PIN field when we enter unlock view.
  useEffect(() => {
    if (unlockId) {
      setPin('');
      setError('');
      const t = setTimeout(() => pinRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [unlockId]);

  // Esc: back out of unlock, or close the gate when allowed.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (unlockId) setUnlockId(null);
      else if (allowClose) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlockId, allowClose, onClose]);

  const pickProfile = useCallback((profile) => {
    if (profileHasPin(profile.id)) {
      setUnlockId(profile.id);
    } else {
      onEnter?.(profile.id);
    }
  }, [onEnter]);

  const submitPin = useCallback(async () => {
    if (!unlockId || checking) return;
    setChecking(true);
    try {
      const ok = await verifyProfilePin(unlockId, pin);
      if (ok) {
        onEnter?.(unlockId);
      } else {
        setError('That PIN is incorrect.');
        setPin('');
        pinRef.current?.focus();
      }
    } finally {
      setChecking(false);
    }
  }, [unlockId, pin, checking, onEnter]);

  return (
    <div style={styles.scrim} role="dialog" aria-modal="true" aria-label="Choose profile">
      {allowClose && (
        <button style={styles.closeBtn} onClick={onClose} title="Cancel (Esc)" aria-label="Cancel">
          <X size={18} />
        </button>
      )}

      {!unlockId ? (
        // -------- Picker --------
        <div style={styles.pickerWrap}>
          <div style={styles.brandRow}>
            <span style={styles.logo}>⟨/⟩</span>
            <span style={styles.brandWord}>seec0de</span>
          </div>
          <h1 style={styles.heading}>Who's learning?</h1>
          <p style={styles.sub}>Pick your profile. Everything stays on this device.</p>

          <div style={styles.grid}>
            {profiles.map((p) => (
              <button key={p.id} style={styles.tile} onClick={() => pickProfile(p)} title={p.username}>
                <div style={styles.avatarWrap}>
                  <Avatar profile={p} size={88} />
                  {profileHasPin(p.id) && (
                    <span style={styles.lockBadge}><Lock size={11} color="#fff" /></span>
                  )}
                </div>
                <span style={styles.tileName}>{p.username || 'Unnamed'}</span>
              </button>
            ))}

            <button style={styles.tile} onClick={() => onAddProfile?.()} title="Add a new profile">
              <span style={styles.addCircle}><Plus size={30} color="var(--text-secondary)" /></span>
              <span style={styles.tileName}>Add profile</span>
            </button>
          </div>
        </div>
      ) : (
        // -------- Unlock --------
        <div style={styles.unlockWrap}>
          <button style={styles.backBtn} onClick={() => setUnlockId(null)}>
            <ArrowLeft size={13} style={{ marginRight: 6 }} /> Back
          </button>

          <Avatar profile={unlockProfile} size={92} />
          <h2 style={styles.unlockName}>{unlockProfile?.username || 'Profile'}</h2>
          <p style={styles.sub}>Enter your PIN to continue.</p>

          <input
            ref={pinRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submitPin(); }}
            placeholder="••••"
            style={{ ...styles.pinInput, ...(error ? styles.pinInputError : {}) }}
            maxLength={12}
            autoComplete="off"
          />
          {error && <p style={styles.errorText}>{error}</p>}

          <button
            style={{ ...styles.unlockBtn, ...(pin.length === 0 || checking ? styles.btnDisabled : {}) }}
            onClick={submitPin}
            disabled={pin.length === 0 || checking}
          >
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'var(--bg-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    animation: 'seec0de-fade-in var(--motion-base) var(--ease-out)',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 8,
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },

  pickerWrap: {
    width: '100%', maxWidth: 640,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center',
    animation: 'seec0de-pop-in var(--motion-slow) var(--ease-out)',
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 },
  logo: { fontSize: 15, color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace' },
  brandWord: {
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: 13, letterSpacing: 1, color: 'var(--text-secondary)',
  },
  heading: {
    fontSize: 30, fontWeight: 700, color: 'var(--text-primary)',
    letterSpacing: '-0.02em', marginBottom: 8,
  },
  sub: { fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 28 },

  grid: {
    display: 'flex', flexWrap: 'wrap', gap: 24,
    justifyContent: 'center', alignItems: 'flex-start',
  },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    background: 'transparent', border: 'none',
    padding: 8, borderRadius: 12,
    width: 132,
  },
  avatarWrap: { position: 'relative', display: 'inline-flex' },
  lockBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 24, height: 24, borderRadius: '50%',
    background: 'var(--bg-tertiary)', border: '2px solid var(--bg-primary)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  addCircle: {
    width: 88, height: 88, borderRadius: '50%',
    border: '2px dashed var(--border-strong)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-secondary)',
  },
  tileName: {
    fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500,
    maxWidth: 128, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  unlockWrap: {
    width: '100%', maxWidth: 340,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', gap: 14, position: 'relative',
    animation: 'seec0de-pop-in var(--motion-slow) var(--ease-out)',
  },
  backBtn: {
    position: 'absolute', top: -48, left: 0,
    display: 'inline-flex', alignItems: 'center',
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text-secondary)',
    fontSize: 12.5, padding: '6px 12px',
  },
  unlockName: {
    fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0,
  },
  pinInput: {
    width: 200,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    padding: '12px 14px',
    outline: 'none',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
  },
  pinInputError: { borderColor: 'var(--danger)' },
  errorText: { fontSize: 12, color: '#fca5a5', margin: 0 },
  unlockBtn: {
    width: 200,
    background: 'var(--accent)', border: '1px solid var(--accent)',
    borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600,
    padding: '10px 14px', marginTop: 4,
  },
  btnDisabled: {
    background: 'var(--bg-tertiary)', borderColor: 'var(--border)',
    color: 'var(--text-muted)', opacity: 0.8,
  },
};
