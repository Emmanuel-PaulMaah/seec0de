import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FolderOpen, Play, CheckCircle2, Circle, Lock,
  X, Lightbulb, Code2, Eye, EyeOff, Wand2, AlertCircle, ArrowRight,
  Check, Folder, Terminal, Undo2, ArrowLeft, Search, LibraryBig, FolderKanban,
  Sparkles,
} from 'lucide-react';
import { Loader } from './motion/loader';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  listBuildProjects, listGeneratedProjects, findBuildProject,
  sanitizeGeneratedProject, registerGeneratedProject, deleteGeneratedProject,
} from '../data/buildProjects';
import { hasApiKey, subscribeHasApiKey, generateBuildProjectWithAI } from '../engine/aiService';
import { LANGUAGES } from '../engine/languages';
import { PromptInput } from './agents/prompt-input';
import { renderInline } from './InlineCode';
import { insertIntoEditor } from '../engine/editorBridge';
import { Button } from './motion/button/base';
import { BouncyAccordion } from './motion/bouncy-accordion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './motion/select';
import { useFocusTrap } from '../lib/hooks/use-focus-trap';
import { useConfirm } from './ui/dialog';

// Stack choices for the "Build with AI" dropdown — Auto lets the AI pick.
const AI_STACKS = [
  { id: 'auto', label: 'Auto' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
];

// BuildPanel — the "Build" mode of the left panel.
//
// Two screens:
//   1. No active build → project picker. A "Build with AI" chat box designs
//      a project on the spot (Gemini writes the steps), and the sample
//      projects below it filter live (type "quiz" to find the Quiz Engine);
//      each card has a Start button.
//   2. Active build      → the step list. The current step shows its task,
//      target file, expandable example lines / hints / solution, and the
//      live check status from the verifier (via the `check` prop).
//
// The learner edits the target file in the central editor; App.jsx
// re-verifies on edit (content checks) and on Run (output checks) and
// advances the step when everything passes.

export default function BuildPanel({
  rootPath,
  onPickFolder,
  buildSession,
  onStartBuild,
  onExitBuild,
  check = null,       // { stepId, pass, details } — last verification result
  buildSetup = null,  // { running, label, stepId, lines } — setup command progress
  onOpenSettings,
  recentBuilds = [],  // [{ projectId, title, language, stepCount, stepIndex, updatedAt }]
  onResumeBuild,
  onCompleteStep,     // (stepId) => void — manually advance to the next step
  onCheckStep,        // (stepId) => void — verify content + runCommand checks without a run
  onGoBackStep,       // (stepId) => void — reopen a completed step (steps after it reopen too)
}) {
  const [query, setQuery] = useState('');
  const [pickerTick, setPickerTick] = useState(0);
  // Project discovery lives in separate rooms so the AI composer, personal
  // projects, and sample library do not compete in one long scroll.
  const [pickerPage, setPickerPage] = useState('home');
  // Stack filter for the Sample Projects list ('all' = every language).
  const [langFilter, setLangFilter] = useState('all');
  // Accordion: which sample project's card is expanded (one at a time).
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  // Start-build dialog: the project awaiting the learner's answers to
  // "a few questions" (name, folder, starter files) before onStartBuild.
  const [pendingStart, setPendingStart] = useState(null);

  // Languages that have at least one sample project, for the stack filter.
  const sampleLanguages = useMemo(() => {
    const langs = new Set(
      listBuildProjects()
        .filter((p) => !p.generated)
        .map((p) => p.language)
        .filter(Boolean)
    );
    return ['all', ...langs];
  }, []);

  const labelFor = (id) => LANGUAGES[id]?.label || id;

  // ---- Start-build dialog ----------------------------------------------
  // Both sample "Start build" and AI "Build it" funnel through a few quick
  // questions before anything is written: where the files go (open folder or
  // a new subfolder named after the project) and whether to pre-fill starter
  // files. The confirmed options are passed to App's onStartBuild.
  const slugify = (text) => (text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'project';

  const confirm = useConfirm();

  const openStartDialog = useCallback((project) => {
    if (!project) return;
    setPendingStart({
      project,
      name: project.title || 'My Project',
      location: 'subfolder', // 'subfolder' | 'root'
      writeScaffold: true,
      error: null,
    });
  }, []);

  const confirmStart = useCallback((form) => {
    if (!pendingStart) return;
    const name = (form.name || '').trim();
    const projectDir = form.location === 'root'
      ? ''
      : slugify(name || pendingStart.project.title);
    onStartBuild?.(pendingStart.project, { projectDir, writeScaffold: form.writeScaffold });
    setPendingStart(null);
  }, [pendingStart, onStartBuild]);

  // ---- Build with AI ---------------------------------------------------
  // The learner types "build a calculator"; Gemini designs a project and it
  // starts through the exact same pipeline as a sample project. Key presence
  // is tracked reactively so the "add a key" hint disappears on save.
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStack, setAiStack] = useState('auto'); // 'auto' | 'python' | 'javascript'
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiReady, setAiReady] = useState(() => hasApiKey());
  const reduce = useReducedMotion();
  useEffect(() => {
    const unsub = subscribeHasApiKey(setAiReady);
    return () => { unsub(); };
  }, []);

  const handleAiBuild = useCallback(async () => {
    const promptText = aiPrompt.trim();
    if (!promptText || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      // A chosen stack (Python/JavaScript) is passed as an explicit nudge
      // so the AI builds in that language even if the prompt doesn't say.
      const stackHint = aiStack === 'auto' ? '' : ` Build it in ${labelFor(aiStack)}.`;
      const raw = await generateBuildProjectWithAI(promptText + stackHint);
      const project = sanitizeGeneratedProject(raw, promptText);
      registerGeneratedProject(project);
      setAiPrompt('');
      // The project is designed — now ask the start questions before writing
      // anything into the folder.
      openStartDialog(project);
    } catch (err) {
      setAiError(err?.message || 'Could not create this project — try again.');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiStack, aiLoading, openStartDialog]);

  const handleDeleteGenerated = useCallback(async (projectId) => {
    // Destructive: removes the AI-generated project (its steps and files
    // registered with the app) with no undo.
    const project = listGeneratedProjects().find((p) => p.id === projectId);
    const ok = await confirm({
      title: 'Delete this project?',
      description: project
        ? `"${project.title}" will be removed from your projects. Files it wrote to disk stay where they are.`
        : 'The project will be removed from your projects list.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    deleteGeneratedProject(projectId);
    setPickerTick((t) => t + 1);
  }, [confirm]);

  // ---- no folder yet ------------------------------------------------
  if (!rootPath) {
    return (
      <div style={styles.pane} className="justify-center">
        <div className="px-2 py-6 text-center">
          <FolderOpen className="mx-auto size-6 text-primary" />
          <h2 className="mt-4 text-base font-semibold tracking-[-0.02em] text-foreground">Choose a project</h2>
          <p className="mx-auto mt-2 max-w-[30ch] text-xs leading-5 text-muted-foreground">
            Open the folder where you want to build. Your steps and code will stay together there.
          </p>
          <Button onClick={onPickFolder} ripple className="mt-5 rounded-lg">
            <FolderOpen className="size-3.5" /> Open a folder
          </Button>
        </div>
      </div>
    );
  }

  // ---- project picker -----------------------------------------------
  if (!buildSession) {
    const projects = listBuildProjects()
      .filter((p) => !p.generated) // generated ones live under "My Projects"
      .filter((p) => langFilter === 'all' || p.language === langFilter)
      .filter((p) => {
        const hay = `${p.title} ${p.summary} ${(p.concepts || []).join(' ')} ${p.language}`.toLowerCase();
        return hay.includes(query.trim().toLowerCase());
      });

    // "My Creations" — AI-generated projects ONLY. Sample projects stay in the
    // Sample Projects tab; the recent-build history is still used to restore
    // where the learner left off, but a sample started earlier is not listed
    // here. Generated-but-never-started projects still appear (entry null).
    const myProjects = [];
    const seenMy = new Set();
    for (const entry of recentBuilds) {
      const project = findBuildProject(entry.projectId);
      if (!project || !project.generated || seenMy.has(project.id)) continue;
      seenMy.add(project.id);
      myProjects.push({ project, entry });
    }
    for (const project of listGeneratedProjects()) {
      if (seenMy.has(project.id)) continue;
      seenMy.add(project.id);
      myProjects.push({ project, entry: null });
    }

    const sampleItems = projects.map((project) => ({
      id: project.id,
      icon: <Code2 className="size-4" />,
      title: (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{project.title}</span>
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            {labelFor(project.language)}
          </span>
        </span>
      ),
      description: (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-muted-foreground">{project.summary}</p>
          {(project.concepts || []).length > 0 ? (
            <p className="text-[10px] leading-5 text-muted-foreground">
              {(project.concepts || []).join(' · ')}
            </p>
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-[11px] text-muted-foreground">{project.steps.length} guided steps</span>
            <Button size="sm" ripple onClick={() => openStartDialog(project)} className="rounded-md">
              <Play className="size-3" />
              Start
            </Button>
          </div>
        </div>
      ),
    }));

    const pageMotion = reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : {
          initial: { opacity: 0, x: 18 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -12 },
        };

    return (
      <div style={styles.pane} className="relative">
        <AnimatePresence mode="wait" initial={false}>
          {pickerPage === 'home' ? (
            <motion.section key="build-home" {...pageMotion} transition={{ duration: reduce ? 0 : 0.22 }}>
              <div className="relative py-1">
                <div className="relative z-10 mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <Sparkles className="size-3" /> Projects</div>
                    <h2 className="text-xl font-semibold tracking-[-0.025em] text-foreground">What are we building?</h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      Describe the outcome — AI turns it into guided steps.
                    </p>
                  </div>
                </div>
                <div className="relative z-10">
                  <PromptInput
                    value={aiPrompt}
                    onValueChange={setAiPrompt}
                    onSubmit={handleAiBuild}
                    loading={aiLoading}
                    placeholder="e.g. a habit tracker…"
                    aria-label="Describe the project to build"
                    models={AI_STACKS.map((stack) => ({ value: stack.id, label: stack.label }))}
                    model={aiStack}
                    onModelChange={setAiStack}
                    className="rounded-[15px] border-border bg-card shadow-none"
                  />
                </div>
              </div>

              {aiError ? (
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs leading-5 text-[var(--danger-text)]" role="alert">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              ) : !aiReady ? (
                <button className="mt-3 text-left text-[11px] text-muted-foreground underline decoration-border-strong underline-offset-4 hover:text-foreground" onClick={onOpenSettings}>
                  Add a free AI key in Settings
                </button>
              ) : null}

              <div className="mt-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or resume
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PickerCard
                  onClick={() => setPickerPage('my')}
                  icon={<FolderKanban className="size-3.5" />}
                  title="My projects"
                  count={myProjects.length}
                />
                <PickerCard
                  onClick={() => setPickerPage('samples')}
                  icon={<LibraryBig className="size-3.5" />}
                  title="Sample library"
                  count={listBuildProjects().filter((project) => !project.generated).length}
                  accent
                />
              </div>
            </motion.section>
          ) : pickerPage === 'my' ? (
            <motion.section key="my-projects" {...pageMotion} transition={{ duration: reduce ? 0 : 0.22 }} className="space-y-4">
              <PickerPageHeader title="My projects" subtitle="Projects designed for you" onBack={() => setPickerPage('home')} />
              {myProjects.length > 0 ? (
                <div className="divide-y divide-border border-y border-border">
                  {myProjects.map(({ project, entry }) => (
                    <div key={`my:${project.id}:${pickerTick}`} className="group px-1 py-5">
                      <div className="flex items-start gap-4">
                        <Wand2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-foreground">{project.title}</h3>
                            <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">{labelFor(project.language)}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{project.summary}</p>
                        </div>
                        <button type="button" className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-[var(--danger-text)]" onClick={() => handleDeleteGenerated(project.id)} aria-label={`Delete ${project.title}`}>
                          <X className="size-3" />
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                        <span className="text-[10px] text-muted-foreground">
                          {entry?.stepIndex > 0 ? `Step ${Math.min(entry.stepIndex + 1, entry.stepCount)} of ${entry.stepCount}` : `${project.steps.length} steps`}
                        </span>
                        <Button size="sm" onClick={() => onResumeBuild?.(project.id)} className="rounded-md">
                          <Play className="size-3" /> {entry?.stepIndex > 0 ? 'Resume' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyProjects onBrowse={() => setPickerPage('samples')} />
              )}
            </motion.section>
          ) : (
            <motion.section key="samples" {...pageMotion} transition={{ duration: reduce ? 0 : 0.22 }} className="space-y-4">
              <PickerPageHeader title="Sample library" subtitle="Choose a sample project, then make it yours" onBack={() => setPickerPage('home')} />
              <div className="flex items-center gap-2">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" aria-label="Search sample projects" className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground outline-none transition focus:border-border-strong focus:ring-2 focus:ring-foreground/5" />
                </label>
                <Select value={langFilter} onValueChange={setLangFilter} className="shrink-0">
                  <SelectTrigger className="h-10 w-[112px] rounded-lg border-border bg-card px-3 text-xs">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className="w-40">
                    {sampleLanguages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {language === 'all' ? 'All languages' : labelFor(language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {sampleItems.length > 0 ? (
                <BouncyAccordion
                  key={pickerTick}
                  items={sampleItems}
                  value={expandedProjectId}
                  onValueChange={setExpandedProjectId}
                  classNames={{
                    item: 'border-x-0 border-b-0 border-t border-border bg-transparent',
                    trigger: 'min-h-[58px] gap-3 px-2',
                    icon: 'size-5 bg-transparent',
                    title: 'text-xs',
                    content: 'border-t border-border/70',
                    description: 'px-0 pt-4',
                  }}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Search className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-3 text-xs font-medium text-foreground">No matching project</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Try a broader name or another language.</p>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {pendingStart && (
          <StartBuildDialog
            form={pendingStart}
            onChange={(patch) => setPendingStart((prev) => ({ ...prev, ...patch }))}
            onCancel={() => setPendingStart(null)}
            onConfirm={() => confirmStart(pendingStart)}
          />
        )}
      </div>
    );
  }

  // ---- active build -------------------------------------------------
  const project = findBuildProject(buildSession.projectId);
  if (!project) {
    return (
      <div style={styles.pane}>
        <p style={styles.muted}>This project is no longer available.</p>
        <button type="button" className="ui-toolbar-button" style={styles.folderBtn} onClick={onExitBuild}>
          <X size={13} />
          <span style={{ marginLeft: 6 }}>Exit build</span>
        </button>
      </div>
    );
  }

  const steps = project.steps;
  const currentIndex = steps.findIndex((s) => !buildSession.completedStepIds.includes(s.id));
  const doneCount = currentIndex === -1 ? steps.length : currentIndex;
  const complete = currentIndex === -1;

  return (
    <div style={styles.pane} className="relative">
      <div className="border-b border-border px-1 pb-5">
        <div className="flex items-start gap-4">
          {complete
            ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            : <Code2 className="mt-0.5 size-4 shrink-0 text-primary" />}
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {complete ? 'Build complete' : `Now building · ${doneCount + 1}/${steps.length}`}
            </div>
            <h2 className="mt-1 truncate text-base font-semibold tracking-[-0.02em] text-foreground">{project.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onExitBuild} title="Exit build (files stay)" aria-label="Exit build" className="shrink-0 rounded-md">
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-4 flex gap-1" aria-label={`${doneCount} of ${steps.length} steps complete`}>
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={`h-1 flex-1 rounded-full transition-colors ${index < doneCount ? 'bg-primary' : index === currentIndex ? 'bg-primary/40' : 'bg-muted'}`}
            />
          ))}
        </div>
      </div>

      {complete && (
        <div className="flex gap-4 border-l-2 border-[var(--success)] bg-[var(--success-soft)] px-4 py-5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
          <div>
            <div className="text-sm font-semibold text-foreground">You built the whole thing.</div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {steps.length} steps verified. The files are yours—run them, change them, break them, improve them.
            </p>
            <Button variant="outline" size="sm" onClick={onExitBuild} className="mt-3 rounded-md">Build something else</Button>
          </div>
        </div>
      )}
      {/* The step list stays visible even when complete, so any finished step
          can be clicked to go back and redo it. */}
      <div style={styles.stepList}>
        {steps.map((step, index) => {
          const isDone = buildSession.completedStepIds.includes(step.id);
          const isCurrent = index === currentIndex;
          return (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              isDone={isDone}
              isCurrent={isCurrent}
              check={isCurrent ? check : null}
              projectDir={buildSession.projectDir || ''}
              buildSetup={buildSetup}
              onNextStep={onCompleteStep}
              onCheckStep={onCheckStep}
              onGoBackStep={onGoBackStep}
              prevStepId={index > 0 ? steps[index - 1].id : null}
            />
          );
        })}
      </div>
    </div>
  );
}

// Compact destination tile on the Projects home: icon tile + mono count
// pill, title with a slide-in arrow on hover. Keeps the home screen
// scannable where the old full-width list rows spelled everything out.
function PickerCard({ onClick, icon, title, count, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-border-strong hover:bg-muted/40">
      <span className="flex items-center justify-between">
        <span className={`grid size-7 place-items-center rounded-lg border border-border bg-background ${accent ? 'text-[var(--algorithm)]' : 'text-primary'}`}>
          {icon}
        </span>
        <span className="rounded-full border border-border px-1.5 font-mono text-[10px] text-muted-foreground">{count}</span>
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {title}
        <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function PickerPageHeader({ title, subtitle, onBack }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to projects" className="shrink-0 rounded-md">
        <ArrowLeft className="size-4" />
      </Button>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyProjects({ onBrowse }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
      <FolderKanban className="mx-auto size-5 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">Your projects are ready</h3>
      <p className="mx-auto mt-1 max-w-[28ch] text-[11px] leading-5 text-muted-foreground">
        Create a project with AI, or adapt a sample to make your first one.
      </p>
      <Button variant="outline" size="sm" onClick={onBrowse} className="mt-4 rounded-md">
        <LibraryBig className="size-3" /> Browse samples
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StartBuildDialog — the "a few questions" before a build begins: the project
// name, where the files go (open folder or a new subfolder named after the
// project), and whether to pre-fill starter files. `form` is the live dialog
// state ({ name, location, writeScaffold, error }); onChange patches it.

function StartBuildDialog({ form, onChange, onCancel, onConfirm }) {
  // Modal contract: Esc cancels, Tab stays inside, focus returns to the
  // Start button that opened the dialog when it closes.
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const slug = (text) => (text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'project';
  const folderSlug = slug(form.name || form.project?.title);
  const invalidName = !(form.name || '').trim()
    || /[\\/:*?"<>|]/.test(form.name || '')
    || form.name.trim() === '.'
    || form.name.trim() === '..';

  const submit = () => {
    if (form.location === 'subfolder' && invalidName) {
      onChange({ error: "That name can't be a folder — remove characters like / \\ : * ? \" < > |." });
      return;
    }
    onConfirm();
  };

  return (
    <div style={styles.dialogOverlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Start ${form.project?.title || 'project'}`}
      >
        <div style={styles.dialogHeader}>
          <div style={styles.dialogTitle}>Start project — {form.project?.title}</div>
          <button type="button" className="ui-icon-button" style={styles.headerBtn} onClick={onCancel} aria-label="Close">
            <X size={13} />
          </button>
        </div>

        {/* Q1 — project name (also the subfolder name) */}
        <label style={styles.dialogQ} htmlFor="start-name">1. Project name</label>
        <input
          id="start-name"
          style={styles.dialogInput}
          value={form.name || ''}
          onChange={(e) => onChange({ name: e.target.value, error: null })}
          placeholder="e.g. My LMS"
          autoFocus
        />

        {/* Q2 — where */}
        <div style={styles.dialogQ}>2. Where should the files go?</div>
        <div style={styles.dialogOptions}>
          <button
            type="button"
            aria-pressed={form.location === 'root'}
            style={{ ...styles.dialogOption, ...(form.location === 'root' ? styles.dialogOptionActive : {}) }}
            onClick={() => onChange({ location: 'root', error: null })}
          >
            <FolderOpen size={12} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left', marginLeft: 6 }}>In the open folder</span>
            {form.location === 'root' && <Check size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          </button>
          <button
            type="button"
            aria-pressed={form.location === 'subfolder'}
            style={{ ...styles.dialogOption, ...(form.location === 'subfolder' ? styles.dialogOptionActive : {}) }}
            onClick={() => onChange({ location: 'subfolder', error: null })}
          >
            <Folder size={12} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left', marginLeft: 6 }}>In a new subfolder</span>
            {form.location === 'subfolder' && <Check size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          </button>
        </div>
        {form.location === 'subfolder' && (
          <div style={styles.dialogFolderPreview}>
            <span style={styles.dialogFolderLabel}>Folder:</span>
            <code style={styles.dialogFolderName}>{folderSlug}</code>
          </div>
        )}

        {/* Q3 — starter files */}
        <div style={styles.dialogQ}>3. Starter files</div>
        <label style={styles.dialogCheckRow}>
          <input
            type="checkbox"
            checked={form.writeScaffold !== false}
            onChange={(e) => onChange({ writeScaffold: e.target.checked })}
          />
          <span style={{ marginLeft: 8 }}>Pre-fill the folder with starter files</span>
        </label>
        <p style={styles.dialogHint}>
          Starter files give every step a scaffold to build on. Turn this off to
          start from completely empty files.
        </p>

        {form.location === 'subfolder' && invalidName && form.error && (
          <div style={styles.dialogError} role="alert">{form.error}</div>
        )}

        <div style={styles.dialogActions}>
          <button type="button" className="ui-toolbar-button" style={styles.dialogCancel} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="ui-primary-button" style={styles.dialogConfirm} onClick={submit}>
            <Play size={11} />
            <span style={{ marginLeft: 5 }}>Start project</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepCard — one build step. Done steps collapse to a ✓ row; the current
// step expands its task, examples / hints / solution, and check status.

function StepCard({ step, index, isDone, isCurrent, check, projectDir = '', buildSetup = null, onNextStep, onCheckStep, onGoBackStep, prevStepId = null }) {
  const [show, setShow] = useState({ examples: false, hints: false, solution: false });
  // Which example/solution block was just "typed" into the editor (flash ✓).
  const [typed, setTyped] = useState(null);
  const typedTimer = useRef(null);

  // Inserts a code block into the active editor (appended at the end of the
  // file) through the normal editing pipeline — no clipboard paste.
  const insertBlock = useCallback((code, id) => {
    if (!insertIntoEditor(code, { insert: 'end' })) return;
    setTyped(id);
    clearTimeout(typedTimer.current);
    typedTimer.current = setTimeout(() => setTyped(null), 1500);
  }, []);

  if (!isCurrent) {
    // Done steps are clickable — going back reopens this step (and the steps
    // after it). Upcoming steps stay locked.
    if (isDone && onGoBackStep) {
      return (
        <button
          type="button"
          style={{ ...styles.stepCard, ...styles.stepCardLocked, ...styles.stepCardDone }}
          onClick={() => onGoBackStep(step.id)}
          title="Go back to this step"
          aria-label={`Go back to step ${index + 1}: ${step.title}`}
        >
          <span style={styles.stepIcon}>
            <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
          </span>
          <span style={styles.stepTitle}>{renderInline(step.title)}</span>
          <Undo2 size={12} style={styles.stepBackIcon} />
        </button>
      );
    }
    return (
      <div style={{ ...styles.stepCard, ...styles.stepCardLocked }}>
        <span style={styles.stepIcon}>
          <Lock size={12} style={{ color: 'var(--text-muted)' }} />
        </span>
        <span style={styles.stepTitle}>{renderInline(step.title)}</span>
      </div>
    );
  }

  const anyPending = check?.details?.some((d) => d.pending) || false;
  const failures = check?.details?.filter((d) => !d.pass && !d.pending) || [];

  return (
    <div style={{ ...styles.stepCard, ...styles.stepCardCurrent }}>
      <div style={styles.stepHead}>
        <span style={styles.stepIcon}>
          <Circle size={12} style={{ color: 'var(--accent)' }} />
        </span>
        <span style={styles.stepTitle}>{renderInline(step.title)}</span>
        <span style={styles.stepNum}>Step {index + 1}</span>
      </div>

      <p style={styles.task}>{renderInline(step.task)}</p>

      <div style={styles.fileChip} title={projectDir ? `${projectDir}/${step.file}` : step.file}>
        <Code2 size={11} />
        <span style={{ marginLeft: 5 }}>{projectDir ? `${projectDir}/${step.file}` : step.file}</span>
      </div>

      {/* setup command progress — npm install & co (project or this step) */}
      {buildSetup && (!buildSetup.stepId || buildSetup.stepId === step.id) && (
        <div style={styles.setupBox}>
          <div style={styles.setupHead}>
            <Terminal size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ marginLeft: 6 }}>{buildSetup.label}</span>
            {buildSetup.running && <Loader size={11} variant="dots" style={{ marginLeft: 'auto' }} />}
            {!buildSetup.running && <CheckCircle2 size={11} style={{ marginLeft: 'auto', color: 'var(--success)' }} />}
          </div>
          {buildSetup.lines.map((line, i) => (
            <div key={i} style={styles.setupLine}>
              {line.command ? (
                <>
                  <span style={styles.setupPrompt}>{line.exitCode === 0 ? '$' : '!'}</span>
                  <code style={styles.setupCmd}>{line.command}</code>
                </>
              ) : (
                <span style={styles.setupOut}>{line.text}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* actions */}
      <div style={styles.actionRow}>
        {step.examples?.length > 0 && (
          <button type="button" className="ui-toolbar-button" style={styles.actionBtn} onClick={() => setShow((s) => ({ ...s, examples: !s.examples }))}>
            {show.examples ? <EyeOff size={11} /> : <Code2 size={11} />}
            <span style={{ marginLeft: 5 }}>{show.examples ? 'Hide examples' : 'Show example lines'}</span>
          </button>
        )}
        {step.hints?.length > 0 && (
          <button type="button" className="ui-toolbar-button" style={styles.actionBtn} onClick={() => setShow((s) => ({ ...s, hints: !s.hints }))}>
            <Lightbulb size={11} />
            <span style={{ marginLeft: 5 }}>{show.hints ? 'Hide hints' : 'Hints'}</span>
          </button>
        )}
        {step.solution && (
          <button type="button" className="ui-toolbar-button" style={styles.actionBtn} onClick={() => setShow((s) => ({ ...s, solution: !s.solution }))}>
            <Eye size={11} />
            <span style={{ marginLeft: 5 }}>{show.solution ? 'Hide solution' : 'Solution'}</span>
          </button>
        )}
      </div>

      {show.examples && step.examples?.length > 0 && (
        <div style={styles.expandBlock}>
          {step.examples.map((ex) => (
            <div key={ex.label} style={styles.example}>
              <div style={styles.exampleHead}>
                <div style={styles.exampleLabel}>{ex.label}</div>
                <button
                  type="button"
                  className="ui-toolbar-button"
                  style={styles.typeBtn}
                  onClick={() => insertBlock(ex.code, ex.label)}
                  title="Insert this example into your code"
                >
                  {typed === ex.label
                    ? <Check size={10} style={{ color: 'var(--success)' }} />
                    : <Eye size={10} />}
                  <span style={{ marginLeft: 4 }}>{typed === ex.label ? 'Inserted' : 'Insert'}</span>
                </button>
              </div>
              <pre style={styles.codeBlock}>{ex.code}</pre>
            </div>
          ))}
        </div>
      )}

      {show.hints && step.hints?.length > 0 && (
        <div style={styles.expandBlock}>
          {step.hints.map((hint, i) => (
            <div key={i} style={styles.hintRow}>
              <span style={styles.hintBullet} />
              <span style={styles.hintText}>{renderInline(hint)}</span>
            </div>
          ))}
        </div>
      )}

      {show.solution && step.solution && (
        <div style={styles.expandBlock}>
          <div style={styles.exampleHead}>
            <div style={styles.exampleLabel}>Full solution — write it yourself first</div>
            <button
              type="button"
              className="ui-toolbar-button"
              style={styles.typeBtn}
              onClick={() => insertBlock(step.solution, 'solution')}
              title="Insert the solution into your code"
            >
              {typed === 'solution'
                ? <Check size={10} style={{ color: 'var(--success)' }} />
                : <Eye size={10} />}
              <span style={{ marginLeft: 4 }}>{typed === 'solution' ? 'Inserted' : 'Insert'}</span>
            </button>
          </div>
          <pre style={styles.codeBlock}>{step.solution}</pre>
        </div>
      )}

      {/* check status */}
      {check && check.stepId === step.id && (
        <div style={{ ...styles.checkBox, ...(check.pass ? styles.checkBoxPass : styles.checkBoxFail) }}>
          {check.pass ? (
            <div style={styles.checkLine}>
              <CheckCircle2 size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span style={{ marginLeft: 6 }}>Step checks out.</span>
            </div>
          ) : (
            <>
              {anyPending && (
                <div style={styles.checkLine}>
                  <Play size={11} style={{ flexShrink: 0 }} />
                  <span style={{ marginLeft: 6 }}>Code shape looks right — press Run to verify the output.</span>
                </div>
              )}
              {failures.map((f) => (
                <div key={f.id} style={styles.checkLine}>
                  <X size={11} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <span style={{ marginLeft: 6 }}>{f.message}</span>
                </div>
              ))}
              {/* Terminal-style steps (npm install etc.) have no runnable
                  output — Check step verifies them without a file run. */}
              {anyPending && onCheckStep && step.checks?.some((c) => c.type === 'runCommand') && (
                <button type="button" className="ui-toolbar-button" style={styles.checkStepBtn} onClick={() => onCheckStep(step.id)}>
                  <Check size={11} />
                  <span style={{ marginLeft: 5 }}>Check step</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Step navigation — go back to the previous step, or advance without
          a perfect match. Going back reopens that step (and the steps after it). */}
      {(prevStepId || onNextStep) && (
        <div style={styles.nextStepRow}>
          {prevStepId && onGoBackStep && (
            <button
              type="button"
              className="ui-toolbar-button"
              style={{ ...styles.actionBtn, marginRight: 'auto' }}
              onClick={() => onGoBackStep(prevStepId)}
              title="Go back to the previous step (steps after it reopen)"
            >
              <Undo2 size={11} />
              <span style={{ marginLeft: 5 }}>Back</span>
            </button>
          )}
          {onNextStep && (
            <button
              type="button"
              className="ui-toolbar-button"
              style={styles.nextStepBtn}
              onClick={() => onNextStep(step.id)}
              title="Move to the next step without verifying (your code stays as it is)"
            >
              <ArrowRight size={11} />
              <span style={{ marginLeft: 5 }}>Next</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// styles

const styles = {
  pane: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: 1,
    minHeight: 0,
    // The panel's outer container clips overflow (overflow: hidden), so the
    // pane owns scrolling — long project/step lists scroll instead of being
    // cut off. `overflow-y` needs a block-level scroll container, which the
    // flex column already is.
    overflowY: 'auto',
  },
  paneHeading: {
    fontSize: 13.5,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  projectCardClickable: {
    cursor: 'pointer',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  muted: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.55,
    margin: 0,
  },
  folderBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 var(--space-3)',
    minHeight: 'var(--control-standard)',
    cursor: 'pointer',
  },
  filterInput: {
    flex: 1,
    minWidth: 0,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    padding: '11px 14px',
    outline: 'none',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  aiPromptCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
    transition: 'border-color var(--motion-fast) var(--ease-out), box-shadow var(--motion-fast) var(--ease-out)',
  },
  aiPromptHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
  },
  aiPromptIcon: {
    width: 26,
    height: 26,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    flexShrink: 0,
  },
  aiPromptTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  aiPromptBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  aiPromptFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 12px',
    borderTop: '1px solid var(--border)',
  },
  aiLangSelect: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  aiLangLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginRight: 6,
  },
  aiLangDropdown: {
    appearance: 'none',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 11.5,
    fontWeight: 500,
    padding: '5px 24px 5px 10px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
    fontFamily: 'inherit',
  },
  aiLangChevron: {
    position: 'absolute',
    right: 8,
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  aiSendBtn: {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    background: 'var(--accent)',
    border: 'none',
    color: 'var(--text-on-accent)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background var(--motion-fast) var(--ease-out), opacity var(--motion-fast) var(--ease-out)',
  },
  aiSendBtnDisabled: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  aiInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 12.5,
    padding: '12px 14px',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.55,
    fontFamily: 'inherit',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  aiActions: {
    display: 'flex',
  },
  aiBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'var(--control-standard)',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-on-accent)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    padding: 0,
    cursor: 'pointer',
  },
  aiBtnDisabled: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border)',
    color: 'var(--text-muted)',
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  aiError: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: 10.5,
    color: 'var(--danger-text)',
    lineHeight: 1.45,
  },
  subtleLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: 11,
    textAlign: 'left',
    padding: 0,
    textDecoration: 'underline',
    textDecorationColor: 'var(--border-strong)',
    textUnderlineOffset: 3,
    cursor: 'pointer',
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    fontWeight: 600,
    padding: '6px 14px',
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  pillActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'var(--text-on-accent)',
  },
  pillCount: {
    fontSize: 9.5,
    fontWeight: 700,
    lineHeight: 1,
    padding: '2px 6px',
    borderRadius: 999,
    background: 'rgba(128,128,128,0.18)',
    color: 'inherit',
  },

  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  langMenuWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  filterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 'var(--control-standard)',
    padding: '0 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
    cursor: 'pointer',
    transition: 'border-color var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  filterChip: {
    fontSize: 10.5,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 999,
    padding: '1px 7px',
    whiteSpace: 'nowrap',
  },
  filterChevron: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  langMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: 160,
    padding: 4,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.25)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  langMenuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    padding: '7px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    textAlign: 'left',
    cursor: 'pointer',
  },
  langMenuItemActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  langMenuLabel: {
    flex: 1,
    whiteSpace: 'nowrap',
  },
  menuOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 5,
    background: 'transparent',
  },
  aiStackRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  generatedRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  generatedChip: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 600,
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 999,
    padding: '1px 7px',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-control)',
    cursor: 'pointer',
  },
  projectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  projectCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
  },
  projectTopline: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  projectTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  langChip: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 10.5,
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectSummary: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
  },
  conceptRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  conceptChip: {
    fontSize: 10,
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    padding: '2px 8px',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stepCount: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 'var(--control-compact)',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-on-accent)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    padding: '0 10px',
    cursor: 'pointer',
  },

  buildHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  buildHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  buildTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  buildMeta: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  headerBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-control)',
    cursor: 'pointer',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    background: 'var(--accent)',
    transition: 'width var(--motion-base) var(--ease-out)',
  },

  completeBox: {
    display: 'flex',
    gap: 12,
    padding: 16,
    background: 'var(--success-soft, rgba(34,197,94,0.1))',
    border: '1px solid var(--success, #22c55e)',
    borderRadius: 'var(--radius-card)',
    alignItems: 'flex-start',
  },
  completeTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 5,
  },

  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  stepCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '14px 4px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    borderRadius: 0,
  },
  stepCardLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.55,
  },
  // Completed steps are clickable rows that rewind to that step.
  stepCardDone: {
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    transition: 'opacity var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out)',
  },
  stepBackIcon: {
    color: 'var(--text-muted)',
    flexShrink: 0,
    marginLeft: 2,
  },
  stepCardCurrent: {
    padding: '16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    boxShadow: 'var(--shadow-sm)',
  },
  stepHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stepIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 18,
  },
  stepTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  stepNum: {
    fontSize: 10,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  task: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: 0,
  },
  fileChip: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    fontSize: 11,
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '3px 9px',
    fontFamily: 'var(--font-mono)',
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    fontWeight: 500,
    padding: '5px 11px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  expandBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 2,
  },
  example: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  exampleHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: 5,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'color var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out)',
  },
  exampleLabel: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 600,
  },
  codeBlock: {
    margin: 0,
    padding: 12,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowX: 'auto',
  },
  hintRow: {
    display: 'flex',
    gap: 7,
    alignItems: 'flex-start',
  },
  hintBullet: {
    width: 5,
    height: 5,
    borderRadius: 999,
    background: 'var(--text-muted)',
    flexShrink: 0,
    marginTop: 5,
  },
  hintText: {
    fontSize: 11.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  checkBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 11,
  },
  checkBoxPass: {
    background: 'var(--success-soft, rgba(34,197,94,0.1))',
    border: '1px solid var(--success, #22c55e)',
  },
  checkBoxFail: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
  },
  checkLine: {
    display: 'flex',
    alignItems: 'flex-start',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
  checkStepBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
    fontSize: 11,
    fontWeight: 600,
    padding: '5px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 2,
  },
  nextStepRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  nextStepBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px dashed var(--border-strong)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'border-color var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  // Sample projects accordion — name rows that expand into full cards
  projectRow: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    overflow: 'hidden',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  projectRowExpanded: {
    borderColor: 'var(--border-strong)',
  },
  projectRowHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '11px 14px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 12.5,
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
  },
  projectRowTitle: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectRowBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '0 14px 14px',
    borderTop: '1px solid var(--border)',
    paddingTop: 12,
  },
  accordionChevron: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  // Start-build dialog
  dialogOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: 18,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-card)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dialogTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  dialogQ: {
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
  dialogInput: {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    padding: '10px 14px',
    outline: 'none',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  dialogOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  dialogOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out)',
  },
  dialogOptionActive: {
    borderColor: 'var(--accent)',
    background: 'var(--bg-elevated)',
  },
  dialogFolderPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11.5,
    color: 'var(--text-muted)',
  },
  dialogFolderLabel: {
    flexShrink: 0,
  },
  dialogFolderName: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '3px 8px',
  },
  dialogCheckRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 'var(--text-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  dialogHint: {
    margin: 0,
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  dialogError: {
    fontSize: 11,
    color: 'var(--danger-text)',
    lineHeight: 1.45,
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  dialogCancel: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    padding: '0 14px',
    minHeight: 'var(--control-standard)',
    cursor: 'pointer',
  },
  dialogConfirm: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 'var(--control-standard)',
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-on-accent)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    padding: '0 16px',
    cursor: 'pointer',
  },
  // Setup command progress (StepCard)
  setupBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  },
  setupHead: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  setupLine: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: 10.5,
    lineHeight: 1.45,
  },
  setupPrompt: {
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  setupCmd: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
  },
  setupOut: {
    color: 'var(--text-muted)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
