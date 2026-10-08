import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Settings as SettingsIcon, Wand2,
  ChevronLeft, ChevronRight, MessageSquareCode, Shuffle,
  AlertCircle, X, FolderOpen, Hammer,
} from 'lucide-react';
import { hasApiKey, subscribeHasApiKey } from '../engine/aiService';
import { pickSuggestions } from '../engine/codeGenerator';
import { PromptInput } from './agents/prompt-input';
import FileExplorer from './FileExplorer';
import BuildPanel from './BuildPanel';
import { Tabs, TabsList, TabsTrigger } from './motion/tabs';
import { Button } from './motion/button/base';
import { Loader as BeuiLoader } from './motion/loader';

// ... (LANGUAGE_LABELS and labelFor unchanged)

export default function InstructionPanel({
  instruction,
  onInstructionChange,
  onGenerate,
  aiLoading,
  aiError = null,
  onClearAiError,
  practicalLanguage,
  comparisonLanguages = [],
  onOpenSettings,
  collapsed = false,
  onToggleCollapsed,
  rootPath,
  onPickFolder,
  onCloseFolder,
  onOpenFile,
  onDeleteFile,
  activeFilePath,
  refreshKey,
  buildSession = null,
  buildCheck = null,
  onStartBuild,
  onExitBuild,
  recentBuilds = [],
  onResumeBuild,
  onCompleteStep,
  onCheckStep,
  onGoBackStep,
  buildSetup = null,
}) {
  // Track key-presence reactively. The cached `hasApiKey()` hydrates
  // asynchronously on module load AND flips whenever the SettingsDrawer
  // saves a key, so a one-shot render-time read can be stale. Subscribe
  // so the "Add a Gemini key" hint disappears the instant the user adds
  // one in Settings — no need to interact with this panel first.
  const [aiReady, setAiReady] = useState(() => hasApiKey());
  useEffect(() => {
    const unsub = subscribeHasApiKey(setAiReady);
    return () => { unsub(); };
  }, []);

  // Which surface the panel shows: the classic Generate flow (prompt →
  // code in many languages) or the guided Build flow (project steps).
  const [mode, setMode] = useState('generate');

  const labelFor = (id) => {
  const labels = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    py: 'Python',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
  };

  return labels[id] || id;
};

  // ---- suggestions -----------------------------------------------------
  const [seed, setSeed] = useState(0);
  const suggestions = useMemo(() => pickSuggestions(4), [seed]);

  // Suggestion chips are hand-tuned prompts that map onto a built-in
  // offline template. Pass a `source: 'suggestion'` marker so App.jsx
  // can keep the template-first short-circuit for these — while the
  // manual Generate button (which calls onGenerate with no args) always
  // goes through AI.
  const handleSuggestion = useCallback((text) => {
    onInstructionChange(text);
    onGenerate?.(text, { source: 'suggestion' });
  }, [onInstructionChange, onGenerate]);

  const handleGenerateClick = useCallback(() => {
    onGenerate?.();
  }, [onGenerate]);

  // ---- collapsed rail (32 px) ------------------------------------------
  if (collapsed) {
    return (
      <button
        type="button"
        className="ui-panel-rail"
        style={styles.rail}
        onClick={onToggleCollapsed}
        title="Show instruction panel"
        aria-label="Show instruction panel"
      >
        <ChevronRight size={12} />
        <MessageSquareCode size={14} style={{ marginTop: 6 }} />
        <span style={styles.railText}>BUILD</span>
      </button>
    );
  }

  // ---- expanded panel --------------------------------------------------
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerText}>
          <span style={styles.headerLabel}>Build</span>
        </div>
        {onToggleCollapsed && (
          <button
            type="button"
            className="ui-icon-button"
            style={styles.collapseBtn}
            onClick={onToggleCollapsed}
            title="Collapse instruction panel"
            aria-label="Collapse instruction panel"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      <Tabs value={mode} onValueChange={setMode} variant="underline" className="border-b border-border bg-[var(--bg-secondary)]">
        <TabsList className="w-full border-b-0 bg-transparent">
          <TabsTrigger value="generate" className="min-h-[var(--panel-header-height)] gap-1.5 px-[var(--space-3)] py-0 text-[var(--text-sm)] data-[state=active]:bg-[var(--bg-primary)]" indicatorClassName="h-0.5 bg-foreground">
            {rootPath ? <FolderOpen className="size-3.5" aria-hidden="true" /> : <Wand2 className="size-3.5" aria-hidden="true" />}
            {rootPath ? 'Files' : 'Generate'}
          </TabsTrigger>
          <TabsTrigger value="build" className="min-h-[var(--panel-header-height)] gap-1.5 px-[var(--space-3)] py-0 text-[var(--text-sm)] data-[state=active]:bg-[var(--bg-primary)]" indicatorClassName="h-0.5 bg-foreground">
            <Hammer className="size-3.5" aria-hidden="true" />
            Build
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div style={{ ...styles.inner, ...(mode !== 'build' && rootPath ? styles.innerFlush : null) }}>
        {mode === 'build' ? (
          <BuildPanel
            rootPath={rootPath}
            onPickFolder={onPickFolder}
            buildSession={buildSession}
            onStartBuild={onStartBuild}
            onExitBuild={onExitBuild}
            check={buildCheck}
            onOpenSettings={onOpenSettings}
            recentBuilds={recentBuilds}
            onResumeBuild={onResumeBuild}
            onCompleteStep={onCompleteStep}
            onCheckStep={onCheckStep}
            onGoBackStep={onGoBackStep}
            buildSetup={buildSetup}
          />
        ) : rootPath ? (
          <FileExplorer
            rootPath={rootPath}
            onPickFolder={onPickFolder}
            onCloseFolder={onCloseFolder}
            onOpenFile={onOpenFile}
            onDeleteFile={onDeleteFile}
            activeFilePath={activeFilePath}
            refreshKey={refreshKey}
          />
        ) : (
          <div style={styles.scrollContent}>
            <div className="flex flex-1 flex-col gap-[var(--space-5)]">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <Wand2 className="size-3" /> Code generator
                </div>
                <h2 className="text-lg font-semibold tracking-[-0.025em] text-foreground">Turn an idea into working code.</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Describe the behavior in your own words. You’ll get pseudocode and code you can compare.</p>
              </div>

              <button className="group flex w-full items-center gap-3 border-y border-border px-1 py-3 text-left" onClick={onOpenSettings} title="Manage languages in Settings">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Output</span>
                <span className="h-3 w-px bg-border" />
                <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                  Pseudocode{practicalLanguage ? ` · ${labelFor(practicalLanguage)}` : ''}{comparisonLanguages.map((id) => ` · ${labelFor(id)}`).join('')}
                </span>
                <SettingsIcon className="size-3 text-muted-foreground transition-transform group-hover:rotate-45" />
              </button>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Quick starts</span>
                  <Button variant="ghost" size="icon" onClick={() => setSeed((value) => value + 1)} title="Shuffle suggestions" aria-label="Shuffle suggestions" className="size-7 rounded-md">
                    <Shuffle className="size-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                {suggestions.map((s) => (
                  <Button
                    key={s.label}
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-10 justify-start rounded-md border-border bg-transparent px-3 py-2.5 text-left text-[11px] leading-4 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => handleSuggestion(s.instruction)}
                    title={s.instruction}
                  >
                    {s.label}
                  </Button>
                ))}
                </div>
              </div>

              <PromptInput
                value={instruction}
                onValueChange={onInstructionChange}
                onSubmit={handleGenerateClick}
                loading={aiLoading}
                leadingAction={aiLoading ? <BeuiLoader variant="scramble" size={16} label="Generating code" className="text-muted-foreground" /> : null}
                placeholder="Read a CSV of student grades and print the top 5 averages…"
                aria-label="Instruction for the program"
                className="rounded-lg border-border bg-card shadow-none"
              />

              {aiError ? (
                <div style={styles.errorCard} role="alert">
                  <div style={styles.errorRow}>
                    <AlertCircle size={13} style={styles.errorIcon} />
                    <div style={styles.errorMessage}>{aiError.message}</div>
                    <button
                      type="button"
                      className="ui-icon-button"
                      style={styles.errorClose}
                      onClick={onClearAiError}
                      title="Dismiss"
                      aria-label="Dismiss error"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  {(aiError.kind === 'no-key' || aiError.kind === 'invalid-key') && (
                    <button
                      type="button"
                      className="ui-toolbar-button"
                      style={styles.errorAction}
                      onClick={() => { onClearAiError?.(); onOpenSettings?.(); }}
                    >
                      <SettingsIcon size={11} />
                      <span style={{ marginLeft: 6 }}>Open Settings</span>
                    </button>
                  )}
                </div>
              ) : (
                !aiReady && (
                  <button style={styles.subtleLink} onClick={onOpenSettings}>
                    Add a free Gemini key in Settings to unlock AI features →
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  rail: {
    width: 32,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 14,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  railText: {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    fontSize: 'var(--text-xs)',
    letterSpacing: 1,
    color: 'var(--text-muted)',
    marginTop: 8,
  },

  panel: {
    width: '100%',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    borderRight: '1px solid var(--border)',
  },
  inner: {
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    flex: 1,
    overflow: 'hidden',
  },
  innerFlush: {
    padding: 0,
  },

  header: {
    height: 'var(--panel-header-height)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: '0 var(--space-3)',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  headerText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  headerLabel: {
    fontSize: 'var(--text-sm)',
    letterSpacing: 0.2,
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  headerHint: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  headerHint: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  collapseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    borderRadius: 'var(--radius-control)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },

  scrollContent: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  buildStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    flex: 1,
  },
  langStrip: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    minHeight: 'var(--control-standard)',
    borderRadius: 'var(--radius-group)',
    padding: 'var(--space-2) var(--space-3)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
    textAlign: 'left',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  langStripIntro: {
    color: 'var(--text-muted)',
    fontSize: 11,
    marginRight: 2,
  },
  langStripChip: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 999,
  },
  langStripChipPractical: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--text-secondary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  langStripPlus: {
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  langStripGear: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    display: 'inline-flex',
    alignItems: 'center',
  },

  suggestionsHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  suggestionsLabel: {
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  shuffleBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    justifyContent: 'center',
    borderRadius: 'var(--radius-control)',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    minHeight: 'var(--control-compact)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 var(--space-3)',
    borderRadius: 999,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },

  textarea: {
    flex: 1,
    minHeight: 200,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-md)',
    padding: 'var(--space-3)',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.55,
    transition: 'border-color var(--motion-fast) var(--ease-out), box-shadow var(--motion-fast) var(--ease-out)',
  },
  textareaFocus: {
    borderColor: 'var(--accent)',
    animation: 'textarea-focus-glow 0.6s ease-out 1',
  },

  actions: {
    display: 'flex',
    gap: 8,
  },
  generateBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'var(--control-primary)',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-on-accent)',
    fontSize: 'var(--text-md)',
    fontWeight: 600,
    padding: 0,
  },
  disabledBtn: {
    background: 'var(--bg-tertiary)',
    borderColor: 'var(--border)',
    color: 'var(--text-muted)',
    opacity: 0.7,
    cursor: 'not-allowed',
  },

  subtleLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    textAlign: 'left',
    padding: 0,
    textDecoration: 'underline',
    textDecorationColor: 'var(--border-strong)',
    textUnderlineOffset: 3,
  },

  // Inline error card surfaced under the Generate button whenever the
  // AI call fails (invalid key, overload, network) OR when we have no
  // way to satisfy a novel prompt (no key + no template match). Kept
  // monochrome to fit the rest of the panel; the AlertCircle icon is
  // the only colour cue.
  errorCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    padding: '10px 12px',
  },
  errorRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorIcon: {
    color: 'var(--danger-text)',
    flexShrink: 0,
    marginTop: 1,
  },
  errorMessage: {
    flex: 1,
    color: 'var(--text-primary)',
    fontSize: 11.5,
    lineHeight: 1.5,
  },
  errorClose: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 2,
    borderRadius: 4,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  errorAction: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)',
    fontSize: 11.5,
    fontWeight: 500,
    padding: '5px 10px',
    borderRadius: 6,
    cursor: 'pointer',
  },

  modeSwitch: {
    display: 'flex',
    gap: 2,
    padding: '6px 12px 0',
    borderBottom: '1px solid var(--border)',
  },
  modeBtn: {
    flex: 1,
    padding: '5px 0',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'color var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out)',
  },
  modeBtnActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
  },
};
