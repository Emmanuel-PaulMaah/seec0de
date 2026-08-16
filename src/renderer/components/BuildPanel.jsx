import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FolderOpen, Play, CheckCircle2, Circle, Lock, ChevronDown, ChevronUp,
  X, Lightbulb, Code2, Eye, EyeOff, Loader, Wand2, AlertCircle, ArrowRight,
  Filter, Check, Folder, Terminal, Undo2,
} from 'lucide-react';
import {
  listBuildProjects, listGeneratedProjects, findBuildProject,
  sanitizeGeneratedProject, registerGeneratedProject, deleteGeneratedProject,
} from '../data/buildProjects';
import { hasApiKey, subscribeHasApiKey, generateBuildProjectWithAI } from '../engine/aiService';
import { LANGUAGES } from '../engine/languages';
import { renderInline } from './InlineCode';
import { insertIntoEditor } from '../engine/editorBridge';

// Stack choices for the "Build with AI" box — Auto lets the AI pick.
const AI_STACKS = ['auto', 'python', 'javascript', 'typescript'];

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
  // Which picker surface is visible: 'my' (My Creations) or 'sample'.
  const [pickerTab, setPickerTab] = useState('sample');
  // Stack filter for the Sample Projects list ('all' = every language).
  const [langFilter, setLangFilter] = useState('all');
  // The "Build with AI" box is collapsed behind a toggle by default so the
  // picker stays light — expand it only when you actually want to describe
  // an idea.
  const [aiOpen, setAiOpen] = useState(false);
  // Sample Projects language filter — a compact icon button that opens a
  // dropdown menu of languages (replaces the old row of filter pills).
  const [langMenuOpen, setLangMenuOpen] = useState(false);
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
      setAiError(err?.message || 'Something went wrong — try again.');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiStack, aiLoading, openStartDialog]);

  const handleDeleteGenerated = useCallback((projectId) => {
    deleteGeneratedProject(projectId);
    setPickerTick((t) => t + 1);
  }, []);

  // ---- no folder yet ------------------------------------------------
  if (!rootPath) {
    return (
      <div style={styles.pane}>
        <div style={styles.paneHeading}>Build a project</div>
        <p style={styles.muted}>
          The Build Panel turns your folder into a guided project. Open or
          create a folder first — that folder becomes your project.
        </p>
        <button type="button" className="ui-toolbar-button" style={styles.folderBtn} onClick={onPickFolder}>
          <FolderOpen size={13} />
          <span style={{ marginLeft: 6 }}>Open a folder</span>
        </button>
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
    return (
      <div style={styles.pane}>
        <div style={styles.paneHeading}>Build a project</div>
        <p style={styles.muted}>
          Type any idea and AI designs the steps for you — or start from a
          sample project below.
        </p>

        {/* Build with AI — collapsed behind a toggle so the picker stays light */}
        <div style={styles.aiToggleRow}>
          <button
            type="button"
            style={styles.aiToggle}
            onClick={() => setAiOpen((v) => !v)}
            aria-expanded={aiOpen}
            aria-controls="build-ai-box"
          >
            <Wand2 size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={styles.aiToggleLabel}>Build with AI</span>
            {aiOpen
              ? <ChevronUp size={13} style={styles.aiToggleChevron} />
              : <ChevronDown size={13} style={styles.aiToggleChevron} />}
          </button>
        </div>

        {aiOpen && (
          <div id="build-ai-box" style={styles.aiBox}>
            <textarea
              style={styles.aiInput}
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiBuild(); }
              }}
              placeholder={'e.g. "build a calculator"'}
              aria-label="Describe the project to build"
            />
            {/* Stack — pick the language the AI should build in (Auto lets it decide) */}
            <div style={styles.aiStackRow}>
              {AI_STACKS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={aiStack === s}
                  style={{ ...styles.langPill, ...(aiStack === s ? styles.langPillActive : {}) }}
                  onClick={() => setAiStack(s)}
                >
                  {s === 'auto' ? 'Auto' : labelFor(s)}
                </button>
              ))}
            </div>
            <div style={styles.aiActions}>
              <button
                type="button"
                className="ui-primary-button"
                style={{ ...styles.aiBtn, ...(aiLoading || !aiPrompt.trim() ? styles.aiBtnDisabled : {}) }}
                onClick={handleAiBuild}
                disabled={aiLoading || !aiPrompt.trim()}
              >
                {aiLoading
                  ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ marginLeft: 5 }}>Planning…</span></>
                  : <><Wand2 size={12} /><span style={{ marginLeft: 5 }}>Build it</span></>}
              </button>
            </div>
            {aiError && (
              <div style={styles.aiError} role="alert">
                <AlertCircle size={11} style={{ flexShrink: 0 }} />
                <span style={{ marginLeft: 5 }}>{aiError}</span>
              </div>
            )}
            {!aiReady && !aiError && (
              <button style={styles.subtleLink} onClick={onOpenSettings}>
                Add a free Gemini key in Settings for AI builds →
              </button>
            )}
          </div>
        )}

        {/* My Creations / Sample Projects — pill tabs: click one to see it */}
        <div style={styles.pillRow} role="tablist" aria-label="Project picker">
          <button
            type="button"
            role="tab"
            aria-selected={pickerTab === 'my'}
            style={{ ...styles.pill, ...(pickerTab === 'my' ? styles.pillActive : {}) }}
            onClick={() => setPickerTab('my')}
          >
            My Creations
            {myProjects.length > 0 && <span style={styles.pillCount}>{myProjects.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pickerTab === 'sample'}
            style={{ ...styles.pill, ...(pickerTab === 'sample' ? styles.pillActive : {}) }}
            onClick={() => setPickerTab('sample')}
          >
            Sample Projects
            <span style={styles.pillCount}>{projects.length}</span>
          </button>
        </div>

        {pickerTab === 'my' ? (
          myProjects.length > 0 ? (
            <div style={styles.projectList}>
              {myProjects.map(({ project, entry }) => (
                <div
                  key={`my:${project.id}:${pickerTick}`}
                  style={{ ...styles.projectCard, ...styles.projectCardClickable }}
                  onClick={() => onResumeBuild?.(project.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onResumeBuild?.(project.id); }}
                >
                  <div style={styles.projectTopline}>
                    <span style={styles.projectTitle}>{project.title}</span>
                    <span style={styles.langChip}>{labelFor(project.language)}</span>
                  </div>
                  {project.generated && (
                    <div style={styles.generatedRow}>
                      <span style={styles.generatedChip}>AI-generated</span>
                      <button
                        type="button"
                        className="ui-icon-button"
                        style={styles.deleteBtn}
                        onClick={(e) => { e.stopPropagation(); handleDeleteGenerated(project.id); }}
                        title="Delete this generated project"
                        aria-label="Delete generated project"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  <p style={styles.projectSummary}>{project.summary}</p>
                  <div style={styles.cardActions}>
                    <span style={styles.stepCount}>
                      {entry && entry.stepIndex > 0
                        ? (entry.stepIndex >= entry.stepCount
                            ? `${entry.stepCount}/${entry.stepCount} steps done`
                            : `step ${entry.stepIndex + 1} of ${entry.stepCount}`)
                        : `${project.steps.length} steps`}
                    </span>
                    <button
                      type="button"
                      className="ui-primary-button"
                      style={styles.startBtn}
                      onClick={(e) => { e.stopPropagation(); onResumeBuild?.(project.id); }}
                    >
                      <Play size={11} />
                      <span style={{ marginLeft: 5 }}>{entry && entry.stepIndex > 0 ? 'Resume' : 'Start'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.muted}>
              Nothing here yet. start a sample project or build one with AI and
              it will show up here.
            </p>
          )
        ) : (
          <>
            {/* Language filter + search — the filter icon opens a dropdown */}
            <div style={styles.filterRow}>
              <div style={styles.langMenuWrap}>
                <button
                  type="button"
                  style={styles.filterBtn}
                  onClick={() => setLangMenuOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={langMenuOpen}
                  title="Filter by language"
                  aria-label="Filter by language"
                >
                  <Filter size={12} style={{ flexShrink: 0 }} />
                  {langFilter !== 'all' && (
                    <span style={styles.filterChip}>{labelFor(langFilter)}</span>
                  )}
                  <ChevronDown size={11} style={styles.filterChevron} />
                </button>
                {langMenuOpen && (
                  <div style={styles.langMenu} role="listbox" aria-label="Languages">
                    {sampleLanguages.map((lang) => {
                      const active = langFilter === lang;
                      return (
                        <button
                          key={lang}
                          type="button"
                          role="option"
                          aria-selected={active}
                          style={{ ...styles.langMenuItem, ...(active ? styles.langMenuItemActive : {}) }}
                          onClick={() => { setLangFilter(lang); setLangMenuOpen(false); }}
                        >
                          <span style={styles.langMenuLabel}>
                            {lang === 'all' ? 'All languages' : labelFor(lang)}
                          </span>
                          {active && <Check size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <input
                style={styles.filterInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={'Type to find a project — e.g. "quiz" or "study log"'}
                aria-label="Filter build projects"
              />
            </div>
            {langMenuOpen && (
              <div style={styles.menuOverlay} onClick={() => setLangMenuOpen(false)} />
            )}

            {projects.length === 0 && (
              <p style={styles.muted}>No project matches — try “quiz” or “study log”.</p>
            )}

            {/* Sample projects — a list of names; click one to expand its card */}
            <div style={styles.projectList}>
              {projects.map((project) => {
                const expanded = expandedProjectId === project.id;
                return (
                  <div
                    key={`${project.id}:${pickerTick}`}
                    style={{ ...styles.projectRow, ...(expanded ? styles.projectRowExpanded : {}) }}
                  >
                    <button
                      type="button"
                      style={styles.projectRowHead}
                      onClick={() => setExpandedProjectId(expanded ? null : project.id)}
                      aria-expanded={expanded}
                    >
                      <span style={styles.projectRowTitle}>{project.title}</span>
                      <span style={styles.langChip}>{labelFor(project.language)}</span>
                      {expanded
                        ? <ChevronUp size={13} style={styles.accordionChevron} />
                        : <ChevronDown size={13} style={styles.accordionChevron} />}
                    </button>
                    {expanded && (
                      <div style={styles.projectRowBody}>
                        <p style={styles.projectSummary}>{project.summary}</p>
                        <div style={styles.conceptRow}>
                          {(project.concepts || []).map((c) => (
                            <span key={c} style={styles.conceptChip}>{c}</span>
                          ))}
                        </div>
                        <div style={styles.cardActions}>
                          <span style={styles.stepCount}>{project.steps.length} steps</span>
                          <button
                            type="button"
                            className="ui-primary-button"
                            style={styles.startBtn}
                            onClick={() => openStartDialog(project)}
                          >
                            <Play size={11} />
                            <span style={{ marginLeft: 5 }}>Build it</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </>
        )}

        {/* Start-build questions dialog — visible on either tab */}
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
    <div style={styles.pane}>
      {/* progress header */}
      <div style={styles.buildHeader}>
        <div style={styles.buildHeaderText}>
          <div style={styles.buildTitle}>{project.title}</div>
          <div style={styles.buildMeta}>
            {complete ? 'Project complete' : `Step ${doneCount + 1} of ${steps.length}`}
          </div>
        </div>
        <button type="button" className="ui-icon-button" style={styles.headerBtn} onClick={onExitBuild} title="Exit build (files stay)">
          <X size={13} />
        </button>
      </div>

      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      {complete && (
        <div style={styles.completeBox}>
          <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div>
            <div style={styles.completeTitle}>Project complete</div>
            <p style={styles.muted}>
              {steps.length} steps verified. Your files are in the open folder —
              open them, run them, change them.
            </p>
            <button type="button" className="ui-toolbar-button" style={styles.folderBtn} onClick={onExitBuild}>
              Build another project
            </button>
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

// ---------------------------------------------------------------------------
// StartBuildDialog — the "a few questions" before a build begins: the project
// name, where the files go (open folder or a new subfolder named after the
// project), and whether to pre-fill starter files. `form` is the live dialog
// state ({ name, location, writeScaffold, error }); onChange patches it.

function StartBuildDialog({ form, onChange, onCancel, onConfirm }) {
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
      onChange({ error: 'That name can’t be a folder — avoid / \\ : * ? " < > | characters.' });
      return;
    }
    onConfirm();
  };

  return (
    <div style={styles.dialogOverlay} onClick={onCancel}>
      <div
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Start ${form.project?.title || 'project'}`}
      >
        <div style={styles.dialogHeader}>
          <div style={styles.dialogTitle}>Start build — {form.project?.title}</div>
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
            <span style={{ marginLeft: 5 }}>Start build</span>
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
            {buildSetup.running && <Loader size={11} style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />}
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
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    padding: '10px 12px',
    outline: 'none',
    transition: 'border-color var(--motion-fast) var(--ease-out)',
  },
  aiToggleRow: {
    display: 'flex',
  },
  aiToggle: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-secondary)',
    fontSize: 11.5,
    fontWeight: 600,
    padding: '9px 12px',
    cursor: 'pointer',
    transition: 'border-color var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  aiToggleLabel: {
    flex: 1,
    textAlign: 'left',
  },
  aiToggleChevron: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  aiBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-card)',
  },
  aiInput: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    padding: '10px 12px',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
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
    color: '#e06c75',
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
  langPill: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  langPillActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--text-secondary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
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
    gap: 12,
  },
  stepCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
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
    borderColor: 'var(--accent)',
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
    borderRadius: 6,
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
    padding: 11,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
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
    borderRadius: 6,
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
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    padding: '9px 12px',
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
    color: '#e06c75',
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
