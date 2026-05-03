import React from 'react';
import { Sparkles, Loader } from 'lucide-react';
import ApiKeySettings from './ApiKeySettings';
import { hasApiKey } from '../engine/aiService';

const LANGUAGE_OPTIONS = [
  'python', 'javascript', 'java', 'cpp', 'csharp', 'go', 'rust', 'typescript',
];

const LANGUAGE_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  typescript: 'TypeScript',
};

export default function InstructionPanel({
  instruction,
  onInstructionChange,
  onGenerate,
  onAiGenerate,
  aiLoading,
  selectedLanguages,
  onToggleLanguage,
}) {
  return (
    <div style={styles.panel}>
      <ApiKeySettings />

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Languages</div>
          <div style={styles.chips}>
            {LANGUAGE_OPTIONS.map((lang) => {
              const active = selectedLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  style={{
                    ...styles.chip,
                    ...(active ? styles.chipActive : {}),
                  }}
                  onClick={() => onToggleLanguage(lang)}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>Instruction</div>
          <textarea
            style={styles.textarea}
            value={instruction}
            onChange={(e) => onInstructionChange(e.target.value)}
            placeholder="Describe what you want the code to do..."
          />
        </div>

        <div style={styles.buttons}>
          <button style={styles.generateBtn} onClick={onGenerate}>
            Generate
          </button>
          <button
            style={{
              ...styles.generateBtn,
              ...styles.aiBtn,
              ...(aiLoading || !hasApiKey() ? styles.disabledBtn : {}),
            }}
            onClick={onAiGenerate}
            disabled={aiLoading || !hasApiKey()}
          >
            {aiLoading
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
              : <><Sparkles size={13} /> AI Generate</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflow: 'auto',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: 1,
    fontWeight: 600,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '4px 10px',
    transition: 'all 0.15s',
  },
  chipActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#ffffff',
  },
  textarea: {
    flex: 1,
    minHeight: 160,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: 10,
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
  },
  buttons: {
    display: 'flex',
    gap: 6,
  },
  generateBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 3,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 0',
    transition: 'background 0.15s',
  },
  aiBtn: {
    background: '#1a6b3c',
  },
  disabledBtn: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};
