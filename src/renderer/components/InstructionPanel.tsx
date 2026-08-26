import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Loader, Settings as SettingsIcon, Wand2, ChevronLeft, ChevronRight, MessageSquareCode, Shuffle, AlertCircle, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { hasApiKey, subscribeHasApiKey } from '../engine/aiService';
import { pickSuggestions } from '../engine/codeGenerator';
import FileExplorer from './FileExplorer';
import BuildPanel from './BuildPanel';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const LABELS: Record<string, string> = { js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript', py: 'Python', python: 'Python', java: 'Java', cpp: 'C++', csharp: 'C#', go: 'Go', rust: 'Rust' };
function labelFor(id: string): string { return LABELS[id] || id; }

const fadeSlide = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } }, exit: { opacity: 0, y: -4, transition: { duration: 0.15 } } };
const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
const chipIn = { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } } };

interface InstructionPanelProps {
  instruction: string;
  onInstructionChange: (v: string) => void;
  onGenerate?: (text?: string, opts?: any) => void;
  aiLoading?: boolean;
  aiError?: { message: string; kind: string } | null;
  onClearAiError?: () => void;
  practicalLanguage?: string;
  comparisonLanguages?: string[];
  onOpenSettings?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  rootPath?: string | null;
  onPickFolder?: () => void;
  onCloseFolder?: () => void;
  onOpenFile?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  activeFilePath?: string | null;
  refreshKey?: number;
  buildSession?: any;
  buildCheck?: any;
  onStartBuild?: () => void;
  onExitBuild?: () => void;
  recentBuilds?: any[];
  onResumeBuild?: (build: any) => void;
  onCompleteStep?: () => void;
  onCheckStep?: () => void;
  onGoBackStep?: () => void;
  buildSetup?: any;
}

export default function InstructionPanel(props: InstructionPanelProps) {
  const { instruction, onInstructionChange, onGenerate, aiLoading, aiError, onClearAiError, practicalLanguage, comparisonLanguages = [], onOpenSettings, collapsed, onToggleCollapsed, rootPath, onPickFolder, onCloseFolder, onOpenFile, onDeleteFile, activeFilePath, refreshKey, buildSession, buildCheck, onStartBuild, onExitBuild, recentBuilds, onResumeBuild, onCompleteStep, onCheckStep, onGoBackStep, buildSetup } = props;
  const [aiReady, setAiReady] = useState(() => hasApiKey());
  useEffect(() => { const unsub = subscribeHasApiKey(setAiReady); return () => unsub(); }, []);
  const [mode, setMode] = useState<'generate' | 'build'>('generate');
  const [seed, setSeed] = useState(0);
  const suggestions = useMemo(() => pickSuggestions(4), [seed]);
  const handleSuggestion = useCallback((text: string) => { onInstructionChange(text); onGenerate?.(text, { source: 'suggestion' }); }, [onInstructionChange, onGenerate]);
  const prefersReduced = useReducedMotion();

  if (collapsed) {
    return (
      <motion.div
        initial={prefersReduced ? {} : { width: 200 }}
        animate={{ width: 32 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-8 shrink-0 flex flex-col items-center pt-4 bg-[var(--bg-secondary)] border-r border-[var(--border)] gap-3"
        style={{ WebkitAppRegion: 'no-drag' as any }}
      >
        <button type="button" className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors" onClick={onToggleCollapsed} title="Show panel" aria-label="Show instruction panel">
          <ChevronRight size={14} />
        </button>
        <div className="w-5 h-px bg-[var(--border)]" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold tracking-widest uppercase text-[var(--text-muted)]">{mode === 'generate' ? 'Generate' : 'Build'}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="w-full shrink-0 flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)]"
    >
      {/* Header */}
      <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border)]">
        <motion.div
          className="flex items-center gap-2"
          initial={prefersReduced ? {} : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Sparkles size={14} className="text-[var(--accent)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">{mode === 'generate' ? 'Generate' : 'Build'}</span>
        </motion.div>
        <button type="button" className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors" onClick={onToggleCollapsed} title="Collapse panel">
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-1 px-3 pt-2 pb-0 border-b border-[var(--border)]" role="tablist">
        {(['generate', 'build'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={cn(
              'relative flex-1 py-2 border-b-2 bg-transparent text-[11px] font-semibold tracking-wider uppercase transition-colors z-10',
              mode === m ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'
            )}
            onClick={() => setMode(m)}
          >
            {m === 'generate' ? (rootPath ? 'Files' : 'Generate') : 'Build'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'build' ? (
            <motion.div key="build" {...fadeSlide} className="flex-1 overflow-y-auto">
              <BuildPanel rootPath={rootPath} onPickFolder={onPickFolder} buildSession={buildSession} onStartBuild={onStartBuild} onExitBuild={onExitBuild} check={buildCheck} onOpenSettings={onOpenSettings} recentBuilds={recentBuilds} onResumeBuild={onResumeBuild} onCompleteStep={onCompleteStep} onCheckStep={onCheckStep} onGoBackStep={onGoBackStep} buildSetup={buildSetup} />
            </motion.div>
          ) : rootPath ? (
            <motion.div key="files" {...fadeSlide} className="flex-1 overflow-y-auto">
              <FileExplorer rootPath={rootPath} onPickFolder={onPickFolder} onCloseFolder={onCloseFolder} onOpenFile={onOpenFile} onDeleteFile={onDeleteFile} activeFilePath={activeFilePath} refreshKey={refreshKey} />
            </motion.div>
          ) : (
            <motion.div key="generate" {...fadeSlide} className="flex-1 overflow-y-auto flex flex-col gap-4">
              {/* Language badges */}
              <motion.button
                variants={chipIn}
                initial="initial"
                animate="animate"
                className="flex items-center flex-wrap gap-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-secondary)] text-xs text-left hover:border-[var(--accent)]/30 transition-colors"
                onClick={onOpenSettings}
                title="Manage languages in Settings"
              >
                <span className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[10px] font-medium px-2 py-0.5 rounded-full">Pseudocode</span>
                {practicalLanguage && <><span className="text-[var(--text-muted)] text-[10px]">+</span><span className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-[10px] font-semibold px-2 py-0.5 rounded-full">{labelFor(practicalLanguage)}</span></>}
                {comparisonLanguages.map((id) => <React.Fragment key={id}><span className="text-[var(--text-muted)] text-[10px]">+</span><span className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[10px] font-medium px-2 py-0.5 rounded-full">{labelFor(id)}</span></React.Fragment>)}
                <span className="ml-auto text-[var(--text-muted)]"><SettingsIcon size={10} /></span>
              </motion.button>

              {/* Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Try one of these</span>
                  <motion.button
                    type="button"
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => setSeed((s) => s + 1)}
                    title="Shuffle suggestions"
                  >
                    <Shuffle size={11} />
                  </motion.button>
                </div>
                <motion.div
                  className="flex flex-wrap gap-1.5"
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                >
                  {suggestions.map((s) => (
                    <motion.button
                      key={s.label}
                      type="button"
                      variants={chipIn}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[var(--bg-elevated)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] transition-colors"
                      onClick={() => handleSuggestion(s.instruction)}
                      title={s.instruction}
                    >
                      {s.label}
                    </motion.button>
                  ))}
                </motion.div>
              </div>

              {/* Instruction textarea */}
              <div className="relative">
                <textarea
                  className="w-full min-h-[160px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-[13px] px-4 py-3 resize-none outline-none leading-relaxed focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all placeholder:text-[var(--text-muted)]"
                  value={instruction}
                  onChange={(e) => onInstructionChange(e.target.value)}
                  placeholder={'e.g. "read a CSV of student grades and print the top 5 averages"'}
                  aria-label="Instruction for the program"
                />
              </div>

              {/* Generate button */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  className={cn(
                    'w-full h-11 text-sm font-semibold rounded-xl transition-all',
                    aiLoading && 'opacity-70 cursor-not-allowed'
                  )}
                  disabled={aiLoading}
                  onClick={() => onGenerate?.()}
                >
                  {aiLoading ? (
                    <><Loader size={14} className="animate-spin mr-2" /> Thinking…</>
                  ) : (
                    <><Wand2 size={14} className="mr-2" /> Generate</>
                  )}
                </Button>
              </motion.div>

              {/* AI error */}
              <AnimatePresence>
                {aiError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 bg-[var(--danger-soft)]/50 border border-[var(--danger)]/20 rounded-xl px-4 py-3" role="alert">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={14} className="text-[var(--danger)] shrink-0 mt-0.5" />
                        <div className="flex-1 text-[var(--text-primary)] text-xs leading-relaxed">{aiError.message}</div>
                        <button type="button" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors" onClick={onClearAiError} title="Dismiss">
                          <X size={12} />
                        </button>
                      </div>
                      {(aiError.kind === 'no-key' || aiError.kind === 'invalid-key') && (
                        <button type="button" className="inline-flex items-center self-start gap-1.5 text-[var(--accent)] text-xs font-medium hover:underline" onClick={() => { onClearAiError?.(); onOpenSettings?.(); }}>
                          <SettingsIcon size={11} /> Open Settings
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!aiReady && !aiError && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[var(--text-secondary)] text-xs text-left p-0 hover:text-[var(--text-primary)] transition-colors"
                  onClick={onOpenSettings}
                >
                  Add a free Gemini key in Settings for smarter AI generation →
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
