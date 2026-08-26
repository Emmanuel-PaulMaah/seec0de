import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FolderOpen, Play, CheckCircle2, Circle, Lock, ChevronDown, ChevronUp, X, Lightbulb, Code2, Eye, EyeOff, Loader, Wand2, AlertCircle, ArrowRight, Filter, Check, Folder, Terminal, Undo2 } from 'lucide-react';
import { listBuildProjects, listGeneratedProjects, findBuildProject, sanitizeGeneratedProject, registerGeneratedProject, deleteGeneratedProject } from '../data/buildProjects';
import { hasApiKey, subscribeHasApiKey, generateBuildProjectWithAI } from '../engine/aiService';
import { LANGUAGES } from '../engine/languages';
import { renderInline } from './InlineCode';
import { insertIntoEditor } from '../engine/editorBridge';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const AI_STACKS = ['auto', 'python', 'javascript', 'typescript'];
const labelFor = (id: string) => (LANGUAGES as any)[id]?.label || id;
const slugify = (text: string) => (text || '').trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'project';

interface BuildPanelProps {
  rootPath?: string | null;
  onPickFolder?: () => void;
  buildSession?: any;
  onStartBuild?: (project: any, opts: any) => void;
  onExitBuild?: () => void;
  check?: any;
  buildSetup?: any;
  onOpenSettings?: () => void;
  recentBuilds?: any[];
  onResumeBuild?: (id: string) => void;
  onCompleteStep?: (stepId: string) => void;
  onCheckStep?: (stepId: string) => void;
  onGoBackStep?: (stepId: string) => void;
}

export default function BuildPanel(props: BuildPanelProps) {
  const { rootPath, onPickFolder, buildSession, onStartBuild, onExitBuild, check = null, buildSetup = null, onOpenSettings, recentBuilds = [], onResumeBuild, onCompleteStep, onCheckStep, onGoBackStep } = props;
  const [query, setQuery] = useState('');
  const [pickerTick, setPickerTick] = useState(0);
  const [pickerTab, setPickerTab] = useState<'my' | 'sample'>('sample');
  const [langFilter, setLangFilter] = useState('all');
  const [aiOpen, setAiOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStack, setAiStack] = useState('auto');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState(() => hasApiKey());
  useEffect(() => { const unsub = subscribeHasApiKey(setAiReady); return () => unsub(); }, []);

  const sampleLanguages = useMemo(() => { const langs = new Set(listBuildProjects().filter((p: any) => !p.generated).map((p: any) => p.language).filter(Boolean)); return ['all', ...langs]; }, []);

  const openStartDialog = useCallback((project: any) => { if (!project) return; setPendingStart({ project, name: project.title || 'My Project', location: 'subfolder', writeScaffold: true, error: null }); }, []);
  const confirmStart = useCallback(() => { if (!pendingStart) return; const name = (pendingStart.name || '').trim(); const projectDir = pendingStart.location === 'root' ? '' : slugify(name || pendingStart.project.title); onStartBuild?.(pendingStart.project, { projectDir, writeScaffold: pendingStart.writeScaffold }); setPendingStart(null); }, [pendingStart, onStartBuild]);

  const handleAiBuild = useCallback(async () => {
    const promptText = aiPrompt.trim(); if (!promptText || aiLoading) return;
    setAiLoading(true); setAiError(null);
    try { const stackHint = aiStack === 'auto' ? '' : ` Build it in ${labelFor(aiStack)}.`; const raw = await generateBuildProjectWithAI(promptText + stackHint); const project = sanitizeGeneratedProject(raw, promptText); registerGeneratedProject(project); setAiPrompt(''); openStartDialog(project); }
    catch (err: any) { setAiError(err?.message || 'Something went wrong — try again.'); } finally { setAiLoading(false); }
  }, [aiPrompt, aiStack, aiLoading, openStartDialog]);

  const handleDeleteGenerated = useCallback((projectId: string) => { deleteGeneratedProject(projectId); setPickerTick((t) => t + 1); }, []);

  // No folder
  if (!rootPath) {
    return (
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        <div className="text-[13.5px] font-bold text-[var(--text-primary)]">Build a project</div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed m-0">The Build Panel turns your folder into a guided project. Open or create a folder first — that folder becomes your project.</p>
        <button type="button" className="ui-toolbar-button self-start inline-flex items-center bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-[var(--radius-group)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium px-3 min-h-[var(--control-standard)] cursor-pointer" onClick={onPickFolder}><FolderOpen size={13} /><span className="ml-1.5">Open a folder</span></button>
      </div>
    );
  }

  // Project picker
  if (!buildSession) {
    const projects = listBuildProjects().filter((p: any) => !p.generated).filter((p: any) => langFilter === 'all' || p.language === langFilter).filter((p: any) => { const hay = `${p.title} ${p.summary} ${(p.concepts || []).join(' ')} ${p.language}`.toLowerCase(); return hay.includes(query.trim().toLowerCase()); });
    const myProjects: { project: any; entry: any }[] = []; const seenMy = new Set<string>();
    for (const entry of recentBuilds) { const project = findBuildProject(entry.projectId); if (!project || !project.generated || seenMy.has(project.id)) continue; seenMy.add(project.id); myProjects.push({ project, entry }); }
    for (const project of listGeneratedProjects()) { if (seenMy.has(project.id)) continue; seenMy.add(project.id); myProjects.push({ project, entry: null }); }

    return (
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        <div className="text-[13.5px] font-bold text-[var(--text-primary)]">Build a project</div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed m-0">Type any idea and AI designs the steps for you — or start from a sample project below.</p>

        {/* AI toggle */}
        <button type="button" className="flex-1 inline-flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-[var(--radius-group)] text-[var(--text-secondary)] text-[11.5px] font-semibold py-[9px] px-3 cursor-pointer" onClick={() => setAiOpen((v) => !v)} aria-expanded={aiOpen}>
          <Wand2 size={12} className="text-[var(--accent)] shrink-0" />
          <span className="flex-1 text-left">Build with AI</span>
          {aiOpen ? <ChevronUp size={13} className="text-[var(--text-muted)] shrink-0" /> : <ChevronDown size={13} className="text-[var(--text-muted)] shrink-0" />}
        </button>

        {aiOpen && (
          <div className="flex flex-col gap-2.5 p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-[var(--radius-card)]">
            <textarea className="bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-group)] text-[var(--text-primary)] text-[var(--text-sm)] px-3 py-2.5 resize-none outline-none leading-relaxed font-sans" rows={2} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiBuild(); } }} placeholder={'e.g. "build a calculator"'} aria-label="Describe the project to build" />
            <div className="flex flex-wrap gap-2">{AI_STACKS.map((s) => <button key={s} type="button" aria-pressed={aiStack === s} className={cn('inline-flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)] text-[11px] font-medium py-[5px] px-3 rounded-full cursor-pointer', aiStack === s && 'bg-[var(--bg-elevated)] border-[var(--text-secondary)] text-[var(--text-primary)] font-semibold')} onClick={() => setAiStack(s)}>{s === 'auto' ? 'Auto' : labelFor(s)}</button>)}</div>
            <Button className="flex-1 min-h-[var(--control-standard)]" disabled={aiLoading || !aiPrompt.trim()} onClick={handleAiBuild}>
              {aiLoading ? <><Loader size={12} className="animate-spin" /><span className="ml-1">Planning…</span></> : <><Wand2 size={12} /><span className="ml-1">Build it</span></>}
            </Button>
            {aiError && <div className="flex items-start text-[10.5px] text-[var(--danger-text)] leading-[1.45]"><AlertCircle size={11} className="shrink-0" /><span className="ml-1">{aiError}</span></div>}
            {!aiReady && !aiError && <button className="bg-transparent border-none text-[var(--text-secondary)] text-[11px] text-left p-0 underline decoration-[var(--border-strong)] underline-offset-[3px] cursor-pointer" onClick={onOpenSettings}>Add a free Gemini key in Settings for AI builds →</button>}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Project picker">
          <button type="button" role="tab" aria-selected={pickerTab === 'my'} className={cn('inline-flex items-center gap-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[11.5px] font-semibold py-1.5 px-3.5 rounded-full cursor-pointer', pickerTab === 'my' && 'bg-[var(--accent)] border-[var(--accent)] text-[var(--text-on-accent)]')} onClick={() => setPickerTab('my')}>My Creations{myProjects.length > 0 && <span className="text-[9.5px] font-bold leading-none py-0.5 px-1.5 rounded-full bg-[rgba(128,128,128,0.18)] text-inherit">{myProjects.length}</span>}</button>
          <button type="button" role="tab" aria-selected={pickerTab === 'sample'} className={cn('inline-flex items-center gap-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[11.5px] font-semibold py-1.5 px-3.5 rounded-full cursor-pointer', pickerTab === 'sample' && 'bg-[var(--accent)] border-[var(--accent)] text-[var(--text-on-accent)]')} onClick={() => setPickerTab('sample')}>Sample Projects<span className="text-[9.5px] font-bold leading-none py-0.5 px-1.5 rounded-full bg-[rgba(128,128,128,0.18)] text-inherit">{projects.length}</span></button>
        </div>

        {pickerTab === 'my' ? (
          myProjects.length > 0 ? (
            <div className="flex flex-col gap-3.5">
              {myProjects.map(({ project, entry }) => (
                <div key={`my:${project.id}:${pickerTick}`} className="flex flex-col gap-2.5 p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-card)] cursor-pointer transition-colors hover:border-[var(--accent)]" onClick={() => onResumeBuild?.(project.id)} role="button" tabIndex={0}>
                  <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-bold text-[var(--text-primary)]">{project.title}</span><span className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[10.5px] font-semibold px-[9px] py-[3px] rounded-full uppercase tracking-wider">{labelFor(project.language)}</span></div>
                  {project.generated && <div className="flex items-center justify-between gap-2"><span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-full px-[7px] py-px">AI-generated</span><button type="button" className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] p-0 inline-flex items-center justify-center rounded-[var(--radius-control)] bg-transparent border-none text-[var(--text-muted)] cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDeleteGenerated(project.id); }} title="Delete"><X size={11} /></button></div>}
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed m-0">{project.summary}</p>
                  <div className="flex items-center justify-between mt-1.5"><span className="text-[11px] text-[var(--text-muted)]">{entry && entry.stepIndex > 0 ? (entry.stepIndex >= entry.stepCount ? `${entry.stepCount}/${entry.stepCount} steps done` : `step ${entry.stepIndex + 1} of ${entry.stepCount}`) : `${project.steps.length} steps`}</span><button type="button" className="ui-primary-button inline-flex items-center min-h-[var(--control-compact)] bg-[var(--accent)] border border-[var(--accent)] rounded-[var(--radius-group)] text-[var(--text-on-accent)] text-[var(--text-sm)] font-semibold px-2.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); onResumeBuild?.(project.id); }}><Play size={11} /><span className="ml-1">{entry && entry.stepIndex > 0 ? 'Resume' : 'Start'}</span></button></div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-[var(--text-muted)] leading-relaxed m-0">Nothing here yet. Start a sample project or build one with AI.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <button type="button" className="inline-flex items-center gap-1.5 min-h-[var(--control-standard)] px-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-group)] text-[var(--text-secondary)] text-[var(--text-sm)] cursor-pointer" onClick={() => setLangMenuOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={langMenuOpen} title="Filter by language"><Filter size={12} className="shrink-0" />{langFilter !== 'all' && <span className="text-[10.5px] font-semibold text-[var(--accent)] bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-full px-[7px] py-px whitespace-nowrap">{labelFor(langFilter)}</span>}<ChevronDown size={11} className="text-[var(--text-muted)] shrink-0" /></button>
                {langMenuOpen && <div className="absolute top-[calc(100%+4px)] left-0 min-w-[160px] p-1 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg shadow-[0_6px_18px_rgba(0,0,0,0.25)] z-10 flex flex-col gap-0.5" role="listbox" aria-label="Languages">
                  {sampleLanguages.map((lang: string) => <button key={lang} type="button" role="option" aria-selected={langFilter === lang} className={cn('flex items-center justify-between gap-2.5 w-full py-[7px] px-2.5 bg-transparent border-none rounded-md text-[var(--text-secondary)] text-[11.5px] text-left cursor-pointer', langFilter === lang && 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold')} onClick={() => { setLangFilter(lang); setLangMenuOpen(false); }}><span className="flex-1 whitespace-nowrap">{lang === 'all' ? 'All languages' : labelFor(lang)}</span>{langFilter === lang && <Check size={12} className="text-[var(--accent)] shrink-0" />}</button>)}
                </div>}
              </div>
              <input className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-group)] text-[var(--text-primary)] text-[var(--text-sm)] px-3 py-2.5 outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={'Type to find a project — e.g. "quiz" or "study log"'} aria-label="Filter build projects" />
            </div>
            {langMenuOpen && <div className="fixed inset-0 z-5 bg-transparent" onClick={() => setLangMenuOpen(false)} />}
            {projects.length === 0 && <p className="text-xs text-[var(--text-muted)] leading-relaxed m-0">No project matches — try "quiz" or "study log".</p>}
            <div className="flex flex-col gap-3.5">
              {projects.map((project: any) => {
                const expanded = expandedProjectId === project.id;
                return (
                  <div key={`${project.id}:${pickerTick}`} className={cn('flex flex-col bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-card)] overflow-hidden transition-colors', expanded && 'border-[var(--border-strong)]')}>
                    <button type="button" className="flex items-center gap-2 w-full py-[11px] px-3.5 bg-transparent border-none text-[var(--text-primary)] text-[12.5px] font-semibold text-left cursor-pointer" onClick={() => setExpandedProjectId(expanded ? null : project.id)} aria-expanded={expanded}>
                      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{project.title}</span>
                      <span className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[10.5px] font-semibold px-[9px] py-[3px] rounded-full uppercase tracking-wider">{labelFor(project.language)}</span>
                      {expanded ? <ChevronUp size={13} className="text-[var(--text-muted)] shrink-0" /> : <ChevronDown size={13} className="text-[var(--text-muted)] shrink-0" />}
                    </button>
                    {expanded && (
                      <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 border-t border-[var(--border)] pt-3">
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed m-0">{project.summary}</p>
                        <div className="flex flex-wrap gap-1.5">{(project.concepts || []).map((c: string) => <span key={c} className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] rounded-full px-2 py-0.5">{c}</span>)}</div>
                        <div className="flex items-center justify-between mt-1.5"><span className="text-[11px] text-[var(--text-muted)]">{project.steps.length} steps</span><Button size="sm" onClick={() => openStartDialog(project)}><Play size={11} className="mr-1" />Build it</Button></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {pendingStart && <StartBuildDialog form={pendingStart} onChange={(patch: any) => setPendingStart((prev: any) => ({ ...prev, ...patch }))} onCancel={() => setPendingStart(null)} onConfirm={confirmStart} />}
      </div>
    );
  }

  // Active build
  const project = findBuildProject(buildSession.projectId);
  if (!project) return <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto"><p className="text-xs text-[var(--text-muted)] leading-relaxed m-0">This project is no longer available.</p><Button variant="secondary" className="self-start" onClick={onExitBuild}><X size={13} className="mr-1.5" />Exit build</Button></div>;

  const steps = project.steps;
  const currentIndex = steps.findIndex((s: any) => !buildSession.completedStepIds.includes(s.id));
  const doneCount = currentIndex === -1 ? steps.length : currentIndex;
  const complete = currentIndex === -1;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 min-w-0"><div className="text-[13px] font-bold text-[var(--text-primary)]">{project.title}</div><div className="text-[11px] text-[var(--text-muted)] mt-0.5">{complete ? 'Project complete' : `Step ${doneCount + 1} of ${steps.length}`}</div></div>
        <button type="button" className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] p-0 inline-flex items-center justify-center rounded-[var(--radius-control)] bg-transparent border-none text-[var(--text-muted)] cursor-pointer" onClick={onExitBuild} title="Exit build"><X size={13} /></button>
      </div>
      <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-[var(--motion-base)]" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      {complete && <div className="flex gap-3 p-4 bg-[rgba(34,197,94,0.1)] border border-[var(--success)] rounded-[var(--radius-card)] items-start"><CheckCircle2 size={16} className="text-[var(--success)] shrink-0" /><div><div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">Project complete</div><p className="text-xs text-[var(--text-muted)] leading-relaxed m-0 mb-2">{steps.length} steps verified. Your files are in the open folder.</p><Button variant="secondary" size="sm" onClick={onExitBuild}>Build another project</Button></div></div>}
      <div className="flex flex-col gap-3">{steps.map((step: any, index: number) => { const isDone = buildSession.completedStepIds.includes(step.id); const isCurrent = index === currentIndex; return <StepCard key={step.id} step={step} index={index} isDone={isDone} isCurrent={isCurrent} check={isCurrent ? check : null} projectDir={buildSession.projectDir || ''} buildSetup={buildSetup} onNextStep={onCompleteStep} onCheckStep={onCheckStep} onGoBackStep={onGoBackStep} prevStepId={index > 0 ? steps[index - 1].id : null} />; })}</div>
    </div>
  );
}

function StartBuildDialog({ form, onChange, onCancel, onConfirm }: { form: any; onChange: (p: any) => void; onCancel: () => void; onConfirm: () => void }) {
  const folderSlug = slugify(form.name || form.project?.title);
  const invalidName = !(form.name || '').trim() || /[\\/:*?"<>|]/.test(form.name || '') || form.name.trim() === '.' || form.name.trim() === '..';
  return (
    <div className="fixed inset-0 z-[100] bg-[rgba(0,0,0,0.55)] flex items-center justify-center p-5" onClick={onCancel}>
      <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto p-[18px] bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[var(--radius-card)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] flex flex-col gap-3" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Start ${form.project?.title || 'project'}`}>
        <div className="flex items-center gap-2"><div className="flex-1 min-w-0 text-sm font-bold text-[var(--text-primary)]">Start build — {form.project?.title}</div><button type="button" className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] p-0 inline-flex items-center justify-center rounded-[var(--radius-control)] bg-transparent border-none text-[var(--text-muted)] cursor-pointer" onClick={onCancel} aria-label="Close"><X size={13} /></button></div>
        <label className="text-[11.5px] font-semibold text-[var(--text-secondary)] mt-1" htmlFor="start-name">1. Project name</label>
        <input id="start-name" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-group)] text-[var(--text-primary)] text-[var(--text-sm)] px-3 py-[9px] outline-none" value={form.name || ''} onChange={(e) => onChange({ name: e.target.value, error: null })} placeholder="e.g. My LMS" autoFocus />
        <div className="text-[11.5px] font-semibold text-[var(--text-secondary)] mt-1">2. Where should the files go?</div>
        <div className="flex flex-col gap-2">
          <button type="button" aria-pressed={form.location === 'root'} className={cn('flex items-center gap-1 w-full py-2.5 px-3 bg-[var(--bg-tertiary)] border rounded-[var(--radius-group)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium cursor-pointer', form.location === 'root' ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border)]')} onClick={() => onChange({ location: 'root', error: null })}><FolderOpen size={12} className="shrink-0" /><span className="flex-1 text-left ml-1.5">In the open folder</span>{form.location === 'root' && <Check size={12} className="text-[var(--accent)] shrink-0" />}</button>
          <button type="button" aria-pressed={form.location === 'subfolder'} className={cn('flex items-center gap-1 w-full py-2.5 px-3 bg-[var(--bg-tertiary)] border rounded-[var(--radius-group)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium cursor-pointer', form.location === 'subfolder' ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border)]')} onClick={() => onChange({ location: 'subfolder', error: null })}><Folder size={12} className="shrink-0" /><span className="flex-1 text-left ml-1.5">In a new subfolder</span>{form.location === 'subfolder' && <Check size={12} className="text-[var(--accent)] shrink-0" />}</button>
        </div>
        {form.location === 'subfolder' && <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]"><span className="shrink-0">Folder:</span><code className="font-mono text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-md py-[3px] px-2">{folderSlug}</code></div>}
        <div className="text-[11.5px] font-semibold text-[var(--text-secondary)] mt-1">3. Starter files</div>
        <label className="flex items-center text-[var(--text-sm)] text-[var(--text-secondary)] cursor-pointer"><input type="checkbox" checked={form.writeScaffold !== false} onChange={(e) => onChange({ writeScaffold: e.target.checked })} /><span className="ml-2">Pre-fill the folder with starter files</span></label>
        <p className="m-0 text-[11px] text-[var(--text-muted)] leading-relaxed">Starter files give every step a scaffold to build on.</p>
        {form.location === 'subfolder' && invalidName && form.error && <div className="text-[11px] text-[var(--danger-text)] leading-[1.45]" role="alert">{form.error}</div>}
        <div className="flex justify-end gap-2 mt-1.5">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => { if (form.location === 'subfolder' && invalidName) { onChange({ error: 'That name cannot be a folder — avoid special characters.' }); return; } onConfirm(); }}><Play size={11} className="mr-1" />Start build</Button>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, index, isDone, isCurrent, check, projectDir = '', buildSetup = null, onNextStep, onCheckStep, onGoBackStep, prevStepId = null }: {
  step: any; index: number; isDone: boolean; isCurrent: boolean; check: any; projectDir: string; buildSetup: any; onNextStep?: (id: string) => void; onCheckStep?: (id: string) => void; onGoBackStep?: (id: string) => void; prevStepId: string | null;
}) {
  const [show, setShow] = useState({ examples: false, hints: false, solution: false });
  const [typed, setTyped] = useState<string | null>(null);
  const typedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insertBlock = useCallback((code: string, id: string) => { if (!insertIntoEditor(code, { insert: 'end' })) return; setTyped(id); if (typedTimer.current) clearTimeout(typedTimer.current); typedTimer.current = setTimeout(() => setTyped(null), 1500); }, []);

  if (!isCurrent) {
    if (isDone && onGoBackStep) return <button type="button" className="flex flex-row items-center gap-2 w-full p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-card)] opacity-55 cursor-pointer font-sans text-left hover:border-[var(--accent)] transition-colors" onClick={() => onGoBackStep(step.id)} title="Go back to this step"><span className="inline-flex items-center justify-center w-[18px] shrink-0"><CheckCircle2 size={14} className="text-[var(--success)]" /></span><span className="flex-1 text-[12.5px] font-semibold text-[var(--text-primary)]">{renderInline(step.title)}</span><Undo2 size={12} className="text-[var(--text-muted)] shrink-0 ml-0.5" /></button>;
    return <div className="flex flex-row items-center gap-2 p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-card)] opacity-55"><span className="inline-flex items-center justify-center w-[18px] shrink-0"><Lock size={12} className="text-[var(--text-muted)]" /></span><span className="flex-1 text-[12.5px] font-semibold text-[var(--text-primary)]">{renderInline(step.title)}</span></div>;
  }

  const anyPending = check?.details?.some((d: any) => d.pending) || false;
  const failures = check?.details?.filter((d: any) => !d.pass && !d.pending) || [];

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-card)] border-[var(--accent)]">
      <div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-[18px] shrink-0"><Circle size={12} className="text-[var(--accent)]" /></span><span className="flex-1 text-[12.5px] font-semibold text-[var(--text-primary)]">{renderInline(step.title)}</span><span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Step {index + 1}</span></div>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed m-0">{renderInline(step.task)}</p>
      <div className="inline-flex items-center self-start text-[11px] text-[var(--text-muted)] border border-[var(--border)] rounded-md py-[3px] px-[9px] font-mono" title={projectDir ? `${projectDir}/${step.file}` : step.file}><Code2 size={11} /><span className="ml-1">{projectDir ? `${projectDir}/${step.file}` : step.file}</span></div>

      {buildSetup && (!buildSetup.stepId || buildSetup.stepId === step.id) && (
        <div className="flex flex-col gap-[5px] p-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md">
          <div className="flex items-center text-[11px] font-semibold text-[var(--text-secondary)]"><Terminal size={11} className="text-[var(--accent)] shrink-0" /><span className="ml-1.5">{buildSetup.label}</span>{buildSetup.running ? <Loader size={11} className="ml-auto animate-spin" /> : <CheckCircle2 size={11} className="ml-auto text-[var(--success)]" />}</div>
          {buildSetup.lines.map((line: any, i: number) => <div key={i} className="flex items-start gap-1.5 text-[10.5px] leading-[1.45]">{line.command ? <><span className="text-[var(--text-muted)] font-mono shrink-0">{line.exitCode === 0 ? '$' : '!'}</span><code className="font-mono text-[var(--text-primary)] break-all">{line.command}</code></> : <span className="text-[var(--text-muted)] whitespace-pre-wrap break-all">{line.text}</span>}</div>)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {step.examples?.length > 0 && <button type="button" className="ui-toolbar-button inline-flex items-center bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[11px] font-medium py-[5px] px-[11px] rounded-md cursor-pointer" onClick={() => setShow((s) => ({ ...s, examples: !s.examples }))}>{show.examples ? <EyeOff size={11} /> : <Code2 size={11} />}<span className="ml-1">{show.examples ? 'Hide examples' : 'Show example lines'}</span></button>}
        {step.hints?.length > 0 && <button type="button" className="ui-toolbar-button inline-flex items-center bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[11px] font-medium py-[5px] px-[11px] rounded-md cursor-pointer" onClick={() => setShow((s) => ({ ...s, hints: !s.hints }))}><Lightbulb size={11} /><span className="ml-1">{show.hints ? 'Hide hints' : 'Hints'}</span></button>}
        {step.solution && <button type="button" className="ui-toolbar-button inline-flex items-center bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[11px] font-medium py-[5px] px-[11px] rounded-md cursor-pointer" onClick={() => setShow((s) => ({ ...s, solution: !s.solution }))}><Eye size={11} /><span className="ml-1">{show.solution ? 'Hide solution' : 'Solution'}</span></button>}
      </div>

      {show.examples && step.examples?.length > 0 && <div className="flex flex-col gap-2.5 pt-0.5">{step.examples.map((ex: any) => <div key={ex.label} className="flex flex-col gap-[5px]"><div className="flex items-center justify-between gap-2"><div className="text-[10.5px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">{ex.label}</div><button type="button" className="ui-toolbar-button inline-flex items-center shrink-0 bg-transparent border border-[var(--border)] text-[var(--text-muted)] text-[10.5px] font-medium py-[3px] px-2 rounded-[5px] cursor-pointer whitespace-nowrap" onClick={() => insertBlock(ex.code, ex.label)} title="Insert">{typed === ex.label ? <><Check size={10} className="text-[var(--success)]" /><span className="ml-1">Inserted</span></> : <><Eye size={10} /><span className="ml-1">Insert</span></>}</button></div><pre className="m-0 p-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-word overflow-x-auto">{ex.code}</pre></div>)}</div>}

      {show.hints && step.hints?.length > 0 && <div className="flex flex-col gap-2.5 pt-0.5">{step.hints.map((hint: string, i: number) => <div key={i} className="flex gap-[7px] items-start"><span className="w-[5px] h-[5px] rounded-full bg-[var(--text-muted)] shrink-0 mt-[5px]" /><span className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">{renderInline(hint)}</span></div>)}</div>}

      {show.solution && step.solution && <div className="flex flex-col gap-2.5 pt-0.5"><div className="flex items-center justify-between gap-2"><div className="text-[10.5px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Full solution</div><button type="button" className="ui-toolbar-button inline-flex items-center shrink-0 bg-transparent border border-[var(--border)] text-[var(--text-muted)] text-[10.5px] font-medium py-[3px] px-2 rounded-[5px] cursor-pointer whitespace-nowrap" onClick={() => insertBlock(step.solution, 'solution')} title="Insert solution">{typed === 'solution' ? <><Check size={10} className="text-[var(--success)]" /><span className="ml-1">Inserted</span></> : <><Eye size={10} /><span className="ml-1">Insert</span></>}</button></div><pre className="m-0 p-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-word overflow-x-auto">{step.solution}</pre></div>}

      {check && check.stepId === step.id && (
        <div className={cn('flex flex-col gap-1.5 p-2.5 rounded-md text-[11px]', check.pass ? 'bg-[rgba(34,197,94,0.1)] border border-[var(--success)]' : 'bg-[var(--bg-elevated)] border border-[var(--border)]')}>
          {check.pass ? <div className="flex items-start text-[var(--text-secondary)] leading-[1.45]"><CheckCircle2 size={12} className="text-[var(--success)] shrink-0" /><span className="ml-1.5">Step checks out.</span></div> : <>
            {anyPending && <div className="flex items-start text-[var(--text-secondary)] leading-[1.45]"><Play size={11} className="shrink-0" /><span className="ml-1.5">Code shape looks right — press Run to verify the output.</span></div>}
            {failures.map((f: any) => <div key={f.id} className="flex items-start text-[var(--text-secondary)] leading-[1.45]"><X size={11} className="text-[var(--danger)] shrink-0" /><span className="ml-1.5">{f.message}</span></div>)}
            {anyPending && onCheckStep && step.checks?.some((c: any) => c.type === 'runCommand') && <button type="button" className="ui-toolbar-button inline-flex items-center self-start bg-[var(--bg-elevated)] border border-[var(--accent)] text-[var(--accent)] text-[11px] font-semibold py-[5px] px-3 rounded-md cursor-pointer mt-0.5" onClick={() => onCheckStep(step.id)}><Check size={11} /><span className="ml-1">Check step</span></button>}
          </>}
        </div>
      )}

      {(prevStepId || onNextStep) && (
        <div className="flex justify-end pt-1">
          {prevStepId && onGoBackStep && <button type="button" className="ui-toolbar-button inline-flex items-center bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] text-[11px] font-semibold py-[5px] px-3 rounded-md cursor-pointer mr-auto" onClick={() => onGoBackStep(prevStepId)} title="Go back"><Undo2 size={11} /><span className="ml-1">Back</span></button>}
          {onNextStep && <button type="button" className="ui-toolbar-button inline-flex items-center bg-transparent border border-dashed border-[var(--border-strong)] text-[var(--text-secondary)] text-[11px] font-semibold py-[6px] px-3 rounded-md cursor-pointer" onClick={() => onNextStep(step.id)} title="Next step"><ArrowRight size={11} /><span className="ml-1">Next</span></button>}
        </div>
      )}
    </div>
  );
}
