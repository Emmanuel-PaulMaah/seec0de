import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check, User } from 'lucide-react';
import { LANGUAGE_LIST } from '../engine/languages';

// Shared profile UI — used by onboarding (create first profile), the profile
// gate ("add profile"), and Settings → Profile (edit). Everything here is
// 100% offline: the avatar is read from the chosen file, resized in a canvas,
// and stored as a small data-URL string. Nothing is uploaded anywhere.

// Resize + compress an image File into a square data-URL. Keeps localStorage
// small (a 256px JPEG is ~15–40 KB) while looking crisp on retina displays.
export function resizeImageToDataUrl(file, size = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be loaded.'));
      img.onload = () => {
        // Cover-crop to a centered square, then draw at `size`.
        const side = Math.min(img.width, img.height);
        const sx = (img.width  - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Deterministic accent colour from a name, so initials avatars feel personal
// and stable across sessions.
const AVATAR_COLOURS = [
  '#2f6fed', '#b48dff', '#22c55e', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f97316',
];
function colourFor(name) {
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}
function initialOf(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '';
}

// Avatar — shows the photo if present, else a coloured initials circle, else
// a neutral user glyph. Reused in the gate, the title-bar chip, and settings.
export function Avatar({ profile, size = 48, style }) {
  const dim = { width: size, height: size, borderRadius: '50%', flexShrink: 0 };
  if (profile && profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt={profile.username ? `${profile.username}'s avatar` : 'avatar'}
        style={{ ...dim, objectFit: 'cover', display: 'block', ...style }}
      />
    );
  }
  const initial = initialOf(profile && profile.username);
  return (
    <span
      aria-hidden={!initial}
      style={{
        ...dim,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: initial ? colourFor(profile && profile.username) : 'var(--bg-tertiary)',
        color: '#fff',
        fontSize: size * 0.42,
        fontWeight: 600,
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      {initial || <User size={size * 0.5} color="var(--text-muted)" />}
    </span>
  );
}

// A round avatar with a camera overlay that opens a file picker and resizes
// the chosen image. `onChange(dataUrl|null)` fires with the new avatar.
export function AvatarPicker({ value, username, size = 84, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handlePick = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onChange?.(dataUrl);
    } catch (err) {
      setError(err.message || 'Could not use that image.');
    } finally {
      setBusy(false);
    }
  }, [onChange]);

  return (
    <div style={styles.avatarPickerWrap}>
      <button
        type="button"
        style={{ ...styles.avatarPickerBtn, width: size, height: size }}
        onClick={() => inputRef.current?.click()}
        title="Choose a profile photo"
        aria-label="Choose a profile photo"
        disabled={busy}
      >
        <Avatar profile={{ avatar: value, username }} size={size} />
        <span style={styles.avatarOverlay}>
          <Camera size={16} color="#fff" />
        </span>
      </button>

      {value && (
        <button
          type="button"
          style={styles.avatarRemove}
          onClick={() => onChange?.(null)}
          title="Remove photo"
          aria-label="Remove photo"
        >
          <X size={12} />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handlePick}
        style={{ display: 'none' }}
      />
      {error && <p style={styles.avatarError}>{error}</p>}
    </div>
  );
}

// Multi-select language pills. `selected` is an array of language ids;
// `onToggle(id)` flips membership.
export function LanguageMultiSelect({ selected = [], onToggle, exclude = [] }) {
  const excludeSet = new Set(exclude);
  return (
    <div style={styles.langGrid}>
      {LANGUAGE_LIST.filter((l) => !excludeSet.has(l.id)).map((lang) => {
        const on = selected.includes(lang.id);
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => onToggle(lang.id)}
            aria-pressed={on}
            style={{ ...styles.pill, ...(on ? styles.pillOn : {}) }}
          >
            {on && <Check size={10} style={{ marginRight: 4 }} />}
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}

// The core editable profile fields. Controlled: pass `values` +
// `onChange(patch)`. `usernameError` is rendered inline when provided.
// `showLanguages` toggles the "languages I use / learning" blocks (onboarding
// hides them to stay short; Settings shows them).
export function ProfileFields({
  values,
  onChange,
  usernameError,
  showLanguages = true,
  showBio = true,
  autoFocusUsername = false,
}) {
  const v = values || {};
  const set = (patch) => onChange?.({ ...v, ...patch });

  const toggleUsing = (id) => {
    const has = (v.languagesUsing || []).includes(id);
    set({ languagesUsing: has ? v.languagesUsing.filter((x) => x !== id) : [...(v.languagesUsing || []), id] });
  };
  const toggleLearning = (id) => {
    const has = (v.languagesLearning || []).includes(id);
    set({ languagesLearning: has ? v.languagesLearning.filter((x) => x !== id) : [...(v.languagesLearning || []), id] });
  };

  return (
    <div style={styles.fields}>
      <div style={styles.identityRow}>
        <AvatarPicker
          value={v.avatar}
          username={v.username}
          onChange={(avatar) => set({ avatar })}
        />
        <div style={styles.identityCol}>
          <label style={styles.label} htmlFor="pf-username">Username</label>
          <input
            id="pf-username"
            type="text"
            value={v.username || ''}
            onChange={(e) => set({ username: e.target.value })}
            placeholder="e.g. ada"
            style={{ ...styles.input, ...(usernameError ? styles.inputError : {}) }}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocusUsername}
          />
          {usernameError
            ? <p style={styles.errorText}>{usernameError}</p>
            : <p style={styles.hint}>This is how you'll show up in seec0de.</p>}
        </div>
      </div>

      {showBio && (
        <div style={styles.block}>
          <label style={styles.label} htmlFor="pf-bio">Bio <span style={styles.optional}>optional</span></label>
          <textarea
            id="pf-bio"
            value={v.bio || ''}
            onChange={(e) => set({ bio: e.target.value })}
            placeholder="A line about what you're building or why you're learning to code."
            style={styles.textarea}
            rows={3}
            maxLength={240}
          />
        </div>
      )}

      {showLanguages && (
        <>
          <div style={styles.block}>
            <label style={styles.label}>Languages I use <span style={styles.optional}>optional</span></label>
            <LanguageMultiSelect selected={v.languagesUsing || []} onToggle={toggleUsing} />
          </div>
          <div style={styles.block}>
            <label style={styles.label}>Languages I'm learning <span style={styles.optional}>optional</span></label>
            <LanguageMultiSelect selected={v.languagesLearning || []} onToggle={toggleLearning} />
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  fields: { display: 'flex', flexDirection: 'column', gap: 18 },
  identityRow: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  identityCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  block: { display: 'flex', flexDirection: 'column', gap: 8 },

  label: {
    fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  optional: {
    fontSize: 10.5, fontWeight: 500, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  hint: { fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 },
  errorText: { fontSize: 11.5, color: '#fca5a5', lineHeight: 1.5 },

  input: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '9px 11px',
    outline: 'none',
  },
  inputError: { borderColor: 'var(--danger)' },
  textarea: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '9px 11px',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.5,
    fontFamily: 'inherit',
  },

  langGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '5px 12px',
  },
  pillOn: {
    background: 'var(--accent-soft)',
    borderColor: 'var(--accent)',
    color: 'var(--text-primary)',
  },

  avatarPickerWrap: { position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' },
  avatarPickerBtn: {
    position: 'relative',
    padding: 0,
    border: 'none',
    background: 'transparent',
    borderRadius: '50%',
    overflow: 'visible',
  },
  avatarOverlay: {
    position: 'absolute', right: -2, bottom: -2,
    width: 26, height: 26, borderRadius: '50%',
    background: 'var(--accent)',
    border: '2px solid var(--bg-elevated)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarRemove: {
    position: 'absolute', right: -6, top: -6,
    width: 20, height: 20, borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarError: {
    position: 'absolute', top: '100%', marginTop: 6,
    fontSize: 10.5, color: '#fca5a5', width: 140, textAlign: 'center',
  },
};
