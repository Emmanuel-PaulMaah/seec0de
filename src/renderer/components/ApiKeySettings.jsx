import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Circle, Check } from 'lucide-react';
import { getApiKey, setApiKey, hasApiKey } from '../engine/aiService';

export default function ApiKeySettings() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={styles.container}>
      <button style={styles.toggle} onClick={() => setOpen(!open)}>
        <Circle size={8} fill={hasApiKey() ? '#4ade80' : '#f87171'} color={hasApiKey() ? '#4ade80' : '#f87171'} />
        <span style={{ marginLeft: 6 }}>AI Settings</span>
        {open ? <ChevronUp size={12} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={12} style={{ marginLeft: 'auto' }} />}
      </button>
      {open && (
        <div style={styles.panel}>
          <div style={styles.info}>
            Free API key from{' '}
            <span style={styles.link}>aistudio.google.com</span>
          </div>
          <div style={styles.row}>
            <input
              type="password"
              style={styles.input}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste Gemini API key..."
            />
            <button style={styles.saveBtn} onClick={handleSave}>
              {saved ? <><Check size={12} /> Saved</> : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    borderBottom: '1px solid var(--border)',
  },
  toggle: {
    width: '100%',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 11,
    padding: '6px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  panel: {
    padding: '0 12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  info: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  link: {
    color: 'var(--accent)',
  },
  row: {
    display: 'flex',
    gap: 6,
  },
  input: {
    flex: 1,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-primary)',
    fontSize: 11,
    padding: '4px 8px',
    outline: 'none',
  },
  saveBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 3,
    color: '#ffffff',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};
