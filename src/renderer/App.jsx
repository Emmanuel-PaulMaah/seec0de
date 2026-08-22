import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import TitleBar from './components/TitleBar';
import InstructionPanel from './components/InstructionPanel';
import LearnModePanel, { TEACHING_STEP_ID, WRITING_ACTIVITY_TYPES } from './components/LearnModePanel';
import CodePanel from './components/CodePanel';
import ExplanationSidebar from './components/ExplanationSidebar';
import FileExplorer from './components/FileExplorer';
import TerminalPanel from './components/TerminalPanel';
import LivePreviewPanel from './components/LivePreviewPanel';
import OnboardingModal from './components/OnboardingModal';
import SettingsDrawer, { ProfileManagerCard } from './components/SettingsDrawer';
import ProfileGate from './components/ProfileGate';
import HomeScreen from './components/HomeScreen';
import LearnHomeScreen from './components/LearnHomeScreen';
import LearningLibraryModal from './components/LearningLibraryModal';
import LearningPulseBar from './components/LearningPulseBar';
import WorkspaceTour from './components/WorkspaceTour';
import { generateCode, matchesTemplate, findTemplateMatch } from './engine/codeGenerator';
import { explainCode } from './engine/codeExplainer';
import { generateCodeWithAI, explainCodeWithAI, hasApiKey, refreshHasApiKey } from './engine/aiService';
import { loadSettings, updateSettings, listProfiles, switchProfile, deleteProfile } from './engine/settings';
import { fileInfo, basename, joinPath } from './engine/fileLanguage';
import { verifyLessonOutput, verifyLessonSource, nextLessonAfter, flattenLessons } from './engine/lessonVerifier';
import { translateError } from './engine/errorTranslator';
import { playLessonSound, playProjectCompleteSound } from './engine/sounds';
import lessonsData from './data/lessons/index.js';
import { findExercise, isCourseActivity } from './data/exerciseCatalog';
import { findProjectCheckpoint, nextProjectCheckpoint } from './data/projects';
import { findBuildProject } from './data/buildProjects';
import { evaluateStep } from './engine/buildVerifier';
import { registerTerminal } from './engine/editorBridge';
// Confetti burst when a build's final step completes.
import confetti from 'canvas-confetti';

// Per-session UI state lives in localStorage so the layout the user shaped
// last time comes back the next time. Settings.showTerminal/showFileExplorer
// act as the *default* for fresh installs; once the user toggles, the
// per-session keys take over so we don't fight their last action.
const STORAGE_KEY_FOLDER             = 'seec0de.lastFolder';
const STORAGE_KEY_TERMINAL_OPEN      = 'seec0de.terminalVisible';
const STORAGE_KEY_EXPLORER_OPEN      = 'seec0de.explorerVisible';
const STORAGE_KEY_EXPLORER_WIDTH     = 'seec0de.explorerWidth';
const STORAGE_KEY_INSTRUCTION_WIDTH  = 'seec0de.instructionWidth';
const STORAGE_KEY_LEARN_GUIDE_WIDTH  = 'seec0de.learnGuideWidth';
const STORAGE_KEY_PREVIEW_OPEN       = 'seec0de.previewVisible';
const STORAGE_KEY_PREVIEW_WIDTH      = 'seec0de.previewWidth';
const STORAGE_KEY_INSTRUCTION_COLLAPSED = 'seec0de.instructionCollapsed';
const STORAGE_KEY_EXPLANATION_COLLAPSED = 'seec0de.explanationCollapsed';
const STORAGE_KEY_EXPLANATION_WIDTH  = 'seec0de.explanationWidth';

// Languages the runner service can actually execute. Mirrors runnerService.js.
const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'c', 'cpp', 'react']);

const DEFAULT_FILENAME_FOR_LANG = {
  javascript: 'main.js',
  typescript: 'main.ts',
  python:     'main.py',
  c:          'main.c',
  cpp:        'main.cpp',
};

// File extensions used when Generate writes scratch files into an open
// folder. Covers every language the generator supports; falls back to
// `.txt` for anything unknown.
const EXT_FOR_LANG = {
  python: 'py',  javascript: 'js', typescript: 'ts',
  java:   'java', cpp: 'cpp', c: 'c',
  csharp: 'cs',   go: 'go', rust: 'rs',
};

const LEARN_PHASES = new Set(['learn', 'run', 'fix', 'complete']);

function learningSectionFor(item) {
  if (item?.kind === 'exercise') return 'exercises';
  if (item?.kind === 'project-checkpoint') return 'projects';
  return 'courses';
}

function reminderDueAt(days = 1, time = '18:00') {
  const [hours, minutes] = /^\d{2}:\d{2}$/.test(time) ? time.split(':').map(Number) : [18, 0];
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + days);
  dueAt.setHours(hours, minutes, 0, 0);
  return dueAt.toISOString();
}

function scheduleLearningReminder(reminders = [], item, days = 1, time = '18:00') {
  if (!item?.id || !item?.title) return reminders;
  const sourceId = item.kind === 'postcard' ? `postcard:${item.id}` : `learning:${item.id}`;
  const existing = reminders.find((reminder) => reminder.sourceId === sourceId && !reminder.dismissedAt);
  if (existing) return reminders;
  const dueAt = reminderDueAt(days, time);
  return [...reminders, {
    id: `${sourceId}:${Date.now()}`,
    sourceId,
    title: item.title,
    message: item.kind === 'postcard'
      ? 'Explain this postcard, then change one small part without looking at the original first.'
      : 'Try to rebuild the key idea or explain why your solution worked before looking back.',
    dueAt,
    createdAt: new Date().toISOString(),
    openLearnMode: item.kind !== 'postcard',
    dismissedAt: null,
  }];
}

function restoredLearningState(settings = loadSettings()) {
  const session = settings?.learningSession;
  const lesson = session?.lessonId
    ? flattenLessons(lessonsData).find((item) => item.id === session.lessonId)
      || findExercise(lessonsData, session.lessonId)
      || findProjectCheckpoint(session.lessonId)
      || null
    : null;
  const language = lesson?.language || 'javascript';
  const status = lesson && ['idle', 'pass', 'fail'].includes(session?.status) ? session.status : 'idle';
  const savedPhase = lesson && LEARN_PHASES.has(session?.phase) ? session.phase : 'learn';
  const phase = savedPhase === 'run'
    ? (status === 'fail' ? 'fix' : 'run')
    : status === 'pass'
      ? 'complete'
      : status === 'fail'
        ? 'fix'
        : 'learn';
  const restorableActivities = lesson?.kind === 'exercise'
    ? lesson.activities || []
    : (lesson?.activities || []).filter(isCourseActivity);
  return {
    lesson,
    phase,
    status,
    attempts: lesson && Number.isFinite(session?.attempts) ? Math.max(0, session.attempts) : 0,
    revealedHints: lesson && Number.isFinite(session?.revealedHints) ? Math.max(0, session.revealedHints) : 0,
    verification: lesson ? session?.verification || null : null,
    reflection: lesson?.kind === 'project-checkpoint'
      ? (typeof session?.reflection === 'string' ? session.reflection : settings.projectReflections?.[lesson.id] || '')
      : '',
    errorCoaching: lesson && Array.isArray(session?.errorCoaching) ? session.errorCoaching : [],
    activityId: lesson && restorableActivities.some((activity) => activity.id === session?.activityId)
      ? session.activityId
      : restorableActivities[0]?.id || null,
    generatedCode: lesson
      ? { pseudocode: '', code: { [language]: typeof session?.draftCode === 'string' ? session.draftCode : lesson.starterCode ?? '' } }
      : { pseudocode: '', code: {} },
  };
}

// Build a filename like "scratch-1.py" / "scratch-2.py" that doesn't
// collide with anything already on disk. Async because we check existence
// against the OS via the fs bridge.
async function uniqueScratchPath(rootPath, language) {
  const ext = EXT_FOR_LANG[language] || 'txt';
  for (let n = 1; n < 1000; n++) {
    const candidate = joinPath(rootPath, `scratch-${n}.${ext}`);
    // eslint-disable-next-line no-await-in-loop
    const exists = await window.seecode.fs.pathExists(candidate);
    if (!exists) return candidate;
  }
  // Fall back to a timestamp if 1000 scratches somehow exist.
  return joinPath(rootPath, `scratch-${Date.now()}.${ext}`);
}

export default function App() {
  // ---- settings + onboarding + profiles --------------------------------
  const [settings, setSettings] = useState(() => loadSettings());
  const [learnMode, setLearnMode] = useState(() => !!loadSettings().learnMode);
  const [showOnboarding, setShowOnboarding] = useState(() => !loadSettings().onboardingComplete);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [learningLibraryView, setLearningLibraryView] = useState(null);
  const [reminderClock, setReminderClock] = useState(() => Date.now());
  const notifiedRemindersRef = useRef(new Set());
  const [showWorkspaceTour, setShowWorkspaceTour] = useState(false);
  const tourLayoutRef = useRef(null);
  const [showHome, setShowHome] = useState(true);
  const [learnCatalogLanguage, setLearnCatalogLanguage] = useState(
    () => restoredLearningState().lesson?.language || null
  );
  const [learnCatalogSection, setLearnCatalogSection] = useState(
    () => {
      const restoredItem = restoredLearningState().lesson;
      return restoredItem ? learningSectionFor(restoredItem) : null;
    }
  );
  const [learnCatalogProjectId, setLearnCatalogProjectId] = useState(
    () => restoredLearningState().lesson?.projectId || null
  );

  useEffect(() => {
    const theme = settings.theme || 'seec0de-dark';
    document.documentElement.dataset.theme = theme;
  }, [settings.theme]);

  useEffect(() => {
    const timer = setInterval(() => setReminderClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    notifiedRemindersRef.current.clear();
  }, [settings.activeProfileId]);

  // Local profiles ("accounts") + which auth surface is showing.
  //   onboardingMode 'setup'       — create/edit the first (active) profile.
  //   onboardingMode 'new-profile' — "Add profile": always make a fresh one.
  //   gate  null       — signed in, app is usable.
  //         'launch'   — must pick/unlock a profile before using the app
  //                       (multiple profiles, or the single one is PIN-locked).
  //         'switch'   — mid-session profile switch (cancellable).
  const [profiles, setProfiles] = useState(() => listProfiles());
  const [onboardingMode, setOnboardingMode] = useState('setup');
  const [gate, setGate] = useState(() => (computeInitialGate() ? 'launch' : null));

  // ---- generator state -------------------------------------------------
  const [selectedLanguages, setSelectedLanguages] = useState(() => deriveLanguages(loadSettings()));
  const [instruction, setInstruction] = useState('');
  const [generatedCode, setGeneratedCode] = useState(() => {
    const current = loadSettings();
    return current.learnMode ? restoredLearningState(current).generatedCode : { pseudocode: '', code: {} };
  });
  const [explanation, setExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Surfaced to InstructionPanel as a small inline card so the learner
  // sees *why* a Generate click didn't produce a real answer (invalid
  // key, overloaded model, offline, etc.) instead of silently getting
  // the generic "PROGRAM CustomTask" offline placeholder and assuming
  // the button is broken. Shape: { message: string, kind: 'no-key' |
  // 'invalid-key' | 'overloaded' | 'network' | 'parse' | 'offline' |
  // 'generic' }. Cleared on the next Generate click and on any edit
  // to the instruction textarea.
  const [aiError, setAiError] = useState(null);

  // ---- lesson state ----------------------------------------------------
  // `activeLesson` is the lesson object the user is currently working on.
  // `lessonStatus` flips to 'pass' / 'fail' after each Run (see
  // handleRunCode). `lessonVerification` carries the diff payload so the
  // ActiveLessonCard can show expected-vs-actual on a failed attempt.
  const [activeLesson, setActiveLesson] = useState(() => restoredLearningState().lesson);
  const [lessonStatus, setLessonStatus] = useState(() => restoredLearningState().status);
  const [lessonVerification, setLessonVerification] = useState(() => restoredLearningState().verification);
  const [lessonErrorCoaching, setLessonErrorCoaching] = useState(() => restoredLearningState().errorCoaching);
  const [learnPhase, setLearnPhase] = useState(() => restoredLearningState().phase);
  const [lessonAttempts, setLessonAttempts] = useState(() => restoredLearningState().attempts);
  const [revealedHints, setRevealedHints] = useState(() => restoredLearningState().revealedHints);
  const [activeActivityId, setActiveActivityId] = useState(() => restoredLearningState().activityId);
  const [activeReflection, setActiveReflection] = useState(() => restoredLearningState().reflection);
  const [learnAnnouncement, setLearnAnnouncement] = useState('');
  const learnDraftRef = useRef(restoredLearningState().generatedCode);
  const workspaceGeneratedCodeRef = useRef({ pseudocode: '', code: {} });

  // Sandbox command history for Git lessons — tracks all commands and their
  // output so they can be verified against sourceChecks.
  const sandboxCommandsRef = useRef([]);
  const [sandboxResetTrigger, setSandboxResetTrigger] = useState(0);
  const addSandboxCommand = useCallback((cmd, output) => {
    sandboxCommandsRef.current = [...sandboxCommandsRef.current, cmd + '\n' + output];
  }, []);
  const resetSandboxCommands = useCallback(() => {
    sandboxCommandsRef.current = [];
    setSandboxResetTrigger((n) => n + 1);
  }, []);

  // ---- settings + completion -------------------------------------------
  const completedLessons = useMemo(() => settings.completedLessons || [], [settings.completedLessons]);
  const completedProjectCheckpoints = useMemo(
    () => settings.completedProjectCheckpoints || [],
    [settings.completedProjectCheckpoints]
  );

  // Lifted from CodePanel so the LivePreviewPanel can read the same active
  // tab without prop-drilling editor state up on every keystroke.
  const [activeGeneratedTab, setActiveGeneratedTab] = useState(
    () => restoredLearningState().lesson?.language || 'pseudocode'
  );

  // Picking a lesson loads its starter code into the editor, focuses the
  // JavaScript tab, and resets pass/fail state. Picking `null` clears
  // the lesson but leaves the editor as-is (so the learner can still
  // tinker with their last attempt).
  const handleSelectLesson = useCallback((lesson) => {
    if (lesson?.language) {
      setLearnCatalogLanguage(lesson.language);
      setLearnCatalogSection(learningSectionFor(lesson));
      if (lesson.kind === 'project-checkpoint') setLearnCatalogProjectId(lesson.projectId);
    }
    setActiveLesson(lesson);
    setLessonStatus('idle');
    setLessonVerification(null);
    setLessonErrorCoaching([]);
    setLearnPhase('learn');
    setLessonAttempts(0);
    setRevealedHints(0);
    setLessonCheck(null);
    setActiveReflection(lesson?.kind === 'project-checkpoint'
      ? loadSettings().projectReflections?.[lesson.id] || ''
      : '');
    const initialActivities = lesson?.kind === 'exercise'
      ? lesson.activities || []
      : (lesson?.activities || []).filter(isCourseActivity);
    setActiveActivityId(
      lesson && lesson.kind !== 'exercise' && (lesson.teaching || []).length > 0
        ? TEACHING_STEP_ID
        : initialActivities[0]?.id || null);
    setLearnAnnouncement(lesson
      ? `${lesson.title} opened. ${lesson.kind === 'exercise' ? 'Complete the standalone exercise.' : 'Start with the first activity.'}`
      : 'Learning catalog opened.');
    runOwnerRef.current += 1;
    setRunLoading(false);
    resetSandboxCommands();
    if (lesson?.language === 'git') setPreviewVisible(false);
    if (lesson) {
      const lessonCode = { pseudocode: '', code: { [lesson.language || 'javascript']: lesson.starterCode || '' } };
      learnDraftRef.current = lessonCode;
      setGeneratedCode(lessonCode);
      setActiveGeneratedTab(lesson.language || 'javascript');
      setActivePath(null);
      setInstruction('');
    }
  }, []);

  const handleResetLessonCode = useCallback(() => {
    if (!activeLesson) return;
    const lessonCode = { pseudocode: '', code: { [activeLesson.language || 'javascript']: activeLesson.starterCode || '' } };
    learnDraftRef.current = lessonCode;
    setGeneratedCode(lessonCode);
    setActiveGeneratedTab(activeLesson.language || 'javascript');
    setLessonStatus('idle');
    setLessonVerification(null);
    setLessonErrorCoaching([]);
    setLessonCheck(null);
    setLearnPhase('run');
    setRunnerOutput(null);
    resetSandboxCommands();
    setLearnAnnouncement('Starter code restored.');
  }, [activeLesson]);

  const handleRevealSolution = useCallback(() => {
    // Just acknowledge the click — ActiveLessonCard renders the solution
    // text itself. We intentionally don't overwrite the user's editor
    // buffer; they can copy the solution in manually (or hit Reset code
    // then paste).
  }, []);

  const handleNextLesson = useCallback(() => {
    if (!activeLesson) return;
    const next = activeLesson.kind === 'project-checkpoint'
      ? nextProjectCheckpoint(activeLesson.id)
      : nextLessonAfter(lessonsData, activeLesson.id);
    if (next) handleSelectLesson(next);
  }, [activeLesson, handleSelectLesson]);

  // While Learn has an active lesson, the editor / preview behaves as
  // if the lesson language is the only language — hides comparison
  // tabs in CodePanel and routes livePreview to the JS tab. The user's
  // real `selectedLanguages` setting stays untouched and returns the
  // moment they leave lesson mode.
  //
  // Switching back to Workspace exits the lesson presentation without
  // discarding the resumable Learn Mode session.
  const inLessonMode = learnMode && !!activeLesson;

  const effectiveLanguages = useMemo(
    () => (inLessonMode ? [activeLesson?.language || 'javascript'] : selectedLanguages),
    [inLessonMode, selectedLanguages, activeLesson?.language]
  );

  const hasNextLesson = useMemo(
    () => !!(activeLesson && activeLesson.kind !== 'exercise' && (
      activeLesson.kind === 'project-checkpoint'
        ? nextProjectCheckpoint(activeLesson.id)
        : nextLessonAfter(lessonsData, activeLesson.id)
    )),
    [activeLesson]
  );

  const handleCompleteCheckpoint = useCallback(() => {
    if (activeLesson?.kind !== 'project-checkpoint' || lessonStatus !== 'pass' || !activeReflection.trim()) return;
    const checkpointIds = settings.completedProjectCheckpoints || [];
    const nextSettings = updateSettings({
      completedProjectCheckpoints: checkpointIds.includes(activeLesson.id)
        ? checkpointIds
        : [...checkpointIds, activeLesson.id],
      projectReflections: {
        ...(settings.projectReflections || {}),
        [activeLesson.id]: activeReflection.trim(),
      },
      learningReminders: settings.practiceRemindersEnabled
        ? scheduleLearningReminder(settings.learningReminders, activeLesson, 1, settings.practiceReminderTime)
        : settings.learningReminders,
    });
    setSettings(nextSettings);
    setActiveReflection(activeReflection.trim());
    setLearnAnnouncement('Checkpoint complete. Your verified code and reflection are saved.');
  }, [activeLesson, activeReflection, lessonStatus, settings.completedProjectCheckpoints, settings.projectReflections, settings.learningReminders]);

  useEffect(() => {
    setSelectedLanguages(deriveLanguages(settings));
  }, [settings.practicalLanguage, settings.comparisonLanguages]);

  // ---- file manager state ----------------------------------------------
  const [rootPath, setRootPath] = useState(() => localStorage.getItem(STORAGE_KEY_FOLDER));
  const [openFiles, setOpenFiles] = useState([]);

  // ---- Build Panel state (guided project building) ----------------------
  // `buildSession` is the resumable step progress for the active project;
  // `buildCheck` is the last verification result for the current step
  // ({ stepId, pass, details }). A ref mirrors the session so async
  // verification callbacks never act on a stale copy.
  const [buildSession, setBuildSession] = useState(() => loadSettings().buildSession || null);
  const [buildCheck, setBuildCheck] = useState(null);
  // Live status of the current build's setup commands (project or step setup),
  // rendered by BuildPanel's step card: { running, label, stepId, lines }.
  const [buildSetup, setBuildSetup] = useState(null);
  const buildSessionRef = useRef(null);
  useEffect(() => { buildSessionRef.current = buildSession; }, [buildSession]);

  // ---- Learn project files + checks --------------------------------------
  // Lesson projects (data/projects.js) are build-style steps: each
  // checkpoint targets a real file in an auto-created per-project folder
  // (see fileService.js → fs:learn-projects-dir) and declares content
  // `checks` that run live as the learner edits. `learnProjectDir` is the
  // folder for the active project; `lessonCheck` is the last check result
  // ({ stepId, pass, details }) shown in the Learn guide. Run-to-verify
  // behaviour is unchanged — expectedOutput still gates the pass verdict.
  const [learnProjectDir, setLearnProjectDir] = useState(null);
  const [lessonCheck, setLessonCheck] = useState(null);
  const learnProjectsRootRef = useRef(null);
  const [activePath, setActivePath] = useState(null);
  const workspaceCodePanelViewRef = useRef({
    activeGeneratedTab: 'pseudocode',
    activePath: null,
  });
  const [explorerVisible, setExplorerVisible] = useState(() => initialPanelVisible(
    STORAGE_KEY_EXPLORER_OPEN, loadSettings().showFileExplorer,
  ));

  const [explorerWidth, setExplorerWidth] = useState(() => {
  const saved = Number(localStorage.getItem(STORAGE_KEY_EXPLORER_WIDTH));
  if (Number.isFinite(saved)) return Math.max(180, Math.min(420, saved));
  return 240;
});

  // ---- panel visibility ------------------------------------------------
  const [terminalVisible, setTerminalVisible] = useState(() => initialPanelVisible(
    STORAGE_KEY_TERMINAL_OPEN, loadSettings().showTerminal,
  ));
  // Live preview is the headline feature post-v2.4 — defaults ON unless
  // the user has explicitly hidden it before.
  const [previewVisible, setPreviewVisible] = useState(() => initialPanelVisible(
    STORAGE_KEY_PREVIEW_OPEN, true,
  ));
  const [previewWidth, setPreviewWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY_PREVIEW_WIDTH));
    if (Number.isFinite(saved) && saved > 0) return Math.max(300, Math.min(680, saved));
    return 440;
  });
  // Sidebars default expanded but can be collapsed to a 32 px rail to
  // give the editor + preview more room.
  const [instructionCollapsed, setInstructionCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY_INSTRUCTION_COLLAPSED) === '1'
  );

  const [instructionWidth, setInstructionWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY_INSTRUCTION_WIDTH));
    if (Number.isFinite(saved)) return Math.max(240, Math.min(520, saved));
    return 320;
  });

  const [learnGuideWidth, setLearnGuideWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY_LEARN_GUIDE_WIDTH));
    if (Number.isFinite(saved)) return Math.max(300, Math.min(640, saved));
    return 400;
  });

  const [explanationCollapsed, setExplanationCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY_EXPLANATION_COLLAPSED) === '1'
  );

  const [explanationWidth, setExplanationWidth] = useState(() => {
  const saved = Number(localStorage.getItem(STORAGE_KEY_EXPLANATION_WIDTH));
  if (Number.isFinite(saved)) return Math.max(240, Math.min(520, saved));
  return 320;
});

  // ---- runner state ----------------------------------------------------
  const terminalApi = useRef(null);
  // Register the terminal with the editor bridge so click-to-insert can
  // route text to whichever panel has focus (terminal input or code editor).
  useEffect(() => { registerTerminal(terminalApi); }, []);
  const runOwnerRef = useRef(0);
  const [runLoading, setRunLoading] = useState(false);
  // Each run produces a fresh object (never mutated); LivePreviewPanel
  // pushes it into its Console tab via reference identity check.
  const [runnerOutput, setRunnerOutput] = useState(null);
  // Live stdout/stderr chunks streamed from the interactive runner, e.g.
  // [{ level: 'stdout'|'stderr', text }]. Cleared at the start of every run.
  const [runnerStream, setRunnerStream] = useState([]);
  const activeRunIdRef = useRef(null);
  // The Console input row is shown only while the program blocks reading
  // stdin — driven by the runner's `input-wanted` signal (never guessed).
  const [runnerInputReady, setRunnerInputReady] = useState(false);

  // ---- persistence -----------------------------------------------------
  useEffect(() => {
    if (rootPath) {
      localStorage.setItem(STORAGE_KEY_FOLDER, rootPath);
      window.seecode.fs.setProjectRoot(rootPath);
    } else {
      localStorage.removeItem(STORAGE_KEY_FOLDER);
      window.seecode.fs.setProjectRoot(null);
    }
  }, [rootPath]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TERMINAL_OPEN, terminalVisible ? '1' : '0');
  }, [terminalVisible]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPLORER_OPEN, explorerVisible ? '1' : '0');
  }, [explorerVisible]);

  useEffect(() => {
  localStorage.setItem(STORAGE_KEY_EXPLORER_WIDTH, String(explorerWidth));
}, [explorerWidth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREVIEW_OPEN, previewVisible ? '1' : '0');
  }, [previewVisible]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREVIEW_WIDTH, String(previewWidth));
  }, [previewWidth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INSTRUCTION_COLLAPSED, instructionCollapsed ? '1' : '0');
  }, [instructionCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INSTRUCTION_WIDTH, String(instructionWidth));
  }, [instructionWidth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEARN_GUIDE_WIDTH, String(learnGuideWidth));
  }, [learnGuideWidth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPLANATION_COLLAPSED, explanationCollapsed ? '1' : '0');
  }, [explanationCollapsed]);

  useEffect(() => {
  localStorage.setItem(STORAGE_KEY_EXPLANATION_WIDTH, String(explanationWidth));
}, [explanationWidth]);

  // Learn Mode state is saved with the active profile. Debouncing keeps
  // editor keystrokes responsive while still making drafts crash-resilient.
  useEffect(() => {
    if (!settings.activeProfileId) return undefined;
    const ownerProfileId = settings.activeProfileId;
    const language = activeLesson?.language || 'javascript';
    const savedLessonCode = learnMode ? generatedCode : learnDraftRef.current;
    const learningSession = activeLesson ? {
      lessonId: activeLesson.id,
      phase: learnPhase,
      draftCode: savedLessonCode.code?.[language] || '',
      attempts: lessonAttempts,
      revealedHints,
      activityId: activeActivityId,
      status: lessonStatus,
      verification: lessonVerification,
      errorCoaching: lessonErrorCoaching,
      reflection: activeLesson.kind === 'project-checkpoint' ? activeReflection : '',
    } : null;
    const timer = setTimeout(() => {
      if (loadSettings().activeProfileId === ownerProfileId) {
        updateSettings({ learnMode, learningSession });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [
    settings.activeProfileId,
    learnMode,
    activeLesson?.id,
    activeLesson?.language,
    generatedCode,
    learnPhase,
    lessonAttempts,
    revealedHints,
    activeActivityId,
    lessonStatus,
    lessonVerification,
    lessonErrorCoaching,
    activeReflection,
  ]);

  // A mode, profile, or lesson change invalidates any run that is still in
  // flight. Its process may finish, but it must not update the new context.
  useEffect(() => {
    runOwnerRef.current += 1;
  }, [settings.activeProfileId, learnMode, activeLesson?.id]);

  // ---- keyboard shortcuts ---------------------------------------------
  // Ctrl+` toggles Terminal, Ctrl+B toggles Explorer, and F6 cycles the
  // visible workspace panels. Text inputs keep ownership of Ctrl+B.
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('[aria-modal="true"]')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setTerminalVisible((v) => !v);
        return;
      }

      const target = e.target;
      const inMonaco = target instanceof Element && !!target.closest('.monaco-editor');
      const typing = target instanceof HTMLElement && (
        target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      ) && !inMonaco;

      if (!showHome && !learnMode && !typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setExplorerVisible((v) => !v);
        return;
      }

      if (!showHome && e.key === 'F6' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const panels = Array.from(document.querySelectorAll('[data-workspace-panel]'))
          .filter((panel) => panel instanceof HTMLElement && panel.offsetParent !== null);
        if (panels.length === 0) return;
        e.preventDefault();
        const current = panels.findIndex((panel) => panel.contains(document.activeElement));
        panels[(current + 1) % panels.length].focus();
      }

      // Ctrl+= zoom in, Ctrl+- zoom out, Ctrl+0 reset zoom.
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          window.seecode?.zoom?.in();
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          window.seecode?.zoom?.out();
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          window.seecode?.zoom?.reset();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showHome, learnMode]);

  // ---- file actions ----------------------------------------------------
  const handlePickFolder = useCallback(async () => {
    const picked = await window.seecode.fs.openFolderDialog();
    if (picked) setRootPath(picked);
  }, []);

  const handleCloseFolder = useCallback(() => {
    setRootPath(null);
    setOpenFiles([]);
    setActivePath(null);
  }, []);

  const handleOpenFile = useCallback(async (filePath) => {
    // If the file is already open, just activate the tab — never re-read
    // the file from disk. Previously we re-read unconditionally, which
    // would silently overwrite unsaved edits when the user clicked the
    // tab again (the async read landed AFTER their keystrokes). This is
    // the bug behind "code i type into files disappears".
    let alreadyOpen = false;
    setOpenFiles((prev) => {
      if (prev.some((f) => f.path === filePath)) {
        alreadyOpen = true;
        return prev;
      }
      return [...prev, { path: filePath, content: '', dirty: false, loading: true }];
    });
    setActivePath(filePath);
    if (alreadyOpen) return;
    try {
      const { content } = await window.seecode.fs.readFile(filePath);
      setOpenFiles((prev) => prev.map((f) =>
        // Guard: if the user typed in the brief window before the read
        // resolved (f.dirty === true), keep their content; just flip the
        // loading flag off. Disk wins only when the buffer is pristine.
        f.path === filePath
          ? (f.dirty
              ? { ...f, loading: false }
              : { path: filePath, content, dirty: false, loading: false })
          : f
      ));
    } catch (err) {
      setOpenFiles((prev) => prev.map((f) =>
        f.path === filePath ? { ...f, content: `// Failed to read file: ${err.message}`, loading: false } : f
      ));
    }
  }, []);

  const handleCloseFile = useCallback((filePath) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== filePath);
      if (activePath === filePath) {
        setActivePath(next.length ? next[next.length - 1].path : null);
      }
      return next;
    });
  }, [activePath]);

  const handleFileContentChange = useCallback((filePath, newContent) => {
    setOpenFiles((prev) => prev.map((f) =>
      f.path === filePath ? { ...f, content: newContent, dirty: true } : f
    ));
  }, []);

  const handleSaveActiveFile = useCallback(async () => {
    if (!activePath) return;
    const file = openFiles.find((f) => f.path === activePath);
    if (!file || !file.dirty) return;
    try {
      await window.seecode.fs.writeFile(file.path, file.content);
      setOpenFiles((prev) => prev.map((f) =>
        f.path === activePath ? { ...f, dirty: false } : f
      ));
    } catch (err) {
      setExplanation({ summary: `Save failed: ${err.message}`, lineByLine: [] });
    }
  }, [activePath, openFiles]);

  // Ctrl+S → save active file.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (activePath) {
          e.preventDefault();
          handleSaveActiveFile();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePath, handleSaveActiveFile]);

  // ---- auto-save -------------------------------------------------------
  // Any file with `dirty: true` is flushed to disk ~600ms after the last
  // keystroke. This is the "permanence" the user expects: typing into a
  // file means it is saved — they should never have to think about Ctrl+S
  // again. We still keep the dirty marker visible until the save lands so
  // the user sees the round-trip.
  //
  // Ref-tracked flight set prevents two concurrent writes for the same
  // path; we always re-check the in-memory content after the write
  // resolves and only clear the dirty flag if it still matches what we
  // wrote (otherwise the user typed more — leave it dirty for the next
  // pass).
  const inFlightSaves = useRef(new Set());
  useEffect(() => {
    const dirtyFiles = openFiles.filter((f) => f.dirty && !f.loading);
    if (dirtyFiles.length === 0) return undefined;

    const timer = setTimeout(() => {
      dirtyFiles.forEach((file) => {
        if (inFlightSaves.current.has(file.path)) return;
        inFlightSaves.current.add(file.path);
        const snapshot = file.content;
        window.seecode.fs.writeFile(file.path, snapshot)
          .then(() => {
            setOpenFiles((prev) => prev.map((f) =>
              f.path === file.path && f.content === snapshot
                ? { ...f, dirty: false }
                : f
            ));
          })
          .catch((err) => {
            // Surface a quiet error in the explanation panel — don't
            // wipe their content, just tell them something's wrong.
            setExplanation({
              summary: `Auto-save failed for ${file.path}: ${err.message}. Your changes are still in memory; try Ctrl+S.`,
              lineByLine: [],
            });
          })
          .finally(() => {
            inFlightSaves.current.delete(file.path);
          });
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [openFiles]);

  // ---- generator flows -------------------------------------------------
  // `instructionOverride` lets the suggestion chips fire Generate
  // immediately with their own text, bypassing the controlled-input
  // round-trip delay (otherwise the click handler would race React's
  // state update and read the stale `instruction`).
  //
  // Folder-open vs folder-closed split:
  //   • No folder open → behaves like before: fills the in-memory
  //     pseudocode + language tabs in the central editor.
  //   • Folder open    → the central editor is "your project", so the
  //     generator writes a real scratch file in the open folder (using
  //     the practical language) and opens it as a file tab. No more
  //     in-memory generated tabs competing with on-disk files.
  const writeScratchFromResult = useCallback(async (result, language) => {
    if (!rootPath) return;
    const source = (result.code && result.code[language]) || '';
    if (!source.trim()) return;
    const target = await uniqueScratchPath(rootPath, language);
    await window.seecode.fs.writeFile(target, source);
    await handleOpenFile(target);
  }, [rootPath, handleOpenFile]);

  // Single unified Generate flow.
  //
  // Two entry points feed this, distinguished by `opts.source`:
  //   • Suggestion chip in InstructionPanel  → opts.source === 'suggestion'
  //   • Manual "Generate" button             → opts is undefined
  //
  // Decision tree per click:
  //   1. Suggestion chip AND prompt matches a built-in template?
  //      → use the offline generator. Suggestion chips are hand-tuned
  //        to map onto a template; that template is the canonical
  //        lesson for that prompt, no network round-trip needed.
  //   2. Manual button (or suggestion with no template hit)?
  //      → key present + online → call Gemini. On success: apply. On
  //        failure: surface the actual error to the learner via
  //        `aiError`. NEVER silently fall back to the generic offline
  //        "PROGRAM CustomTask" scaffold — the manual button is for
  //        novel prompts and the learner deserves a real answer or a
  //        real explanation of why they didn't get one.
  //   3. Manual button, no key OR offline?
  //      → surface a clear "add a key" / "you're offline" prompt
  //        instead of silently emitting the generic placeholder.
  //
  // The cached `hasApiKey()` hydrates asynchronously on module load, so
  // we re-check via `refreshHasApiKey()` whenever the cache says "no" —
  // otherwise a fast click after launch would skip AI even with a saved
  // key.
  const handleGenerate = useCallback(async (instructionOverride, opts) => {
    const text = (typeof instructionOverride === 'string' ? instructionOverride : instruction).trim();
    if (!text || aiLoading) return;

    setAiError(null);

    const language = settings.practicalLanguage || selectedLanguages[0] || 'python';
    const languagesForGen = rootPath ? [language] : selectedLanguages;

    const applyResult = async (result) => {
      if (rootPath) {
        await writeScratchFromResult(result, language);
      } else {
        setGeneratedCode(result);
        setActivePath(null);
      }
    };

    // Only consult the offline-template heuristic when the click came
    // from a suggestion chip. The manual Generate button must always go
    // through AI so the learner's free-form prompts are honoured — even
    // if the wording happens to overlap a built-in template's regex.
    const fromSuggestion = opts?.source === 'suggestion';
    const isTemplate = fromSuggestion && matchesTemplate(text);
    const online = typeof navigator === 'undefined' || navigator.onLine;

    // Re-verify the key when the synchronous cache says "no". Avoids
    // the launch-race where a saved key hasn't hydrated yet and we
    // wrongly fall through to the offline path.
    let keyPresent = hasApiKey();
    if (!keyPresent && !isTemplate) {
      try {
        keyPresent = await refreshHasApiKey();
      } catch {
        keyPresent = false;
      }
    }

    const canUseAi = !isTemplate && keyPresent && online;

    if (canUseAi) {
      setAiLoading(true);
      try {
        const result = await generateCodeWithAI(text, languagesForGen);
        await applyResult(result);
        return;
      } catch (err) {
        // Surface the real reason. For novel prompts we don't fall back
        // to the offline placeholder — the learner deserves to know AI
        // failed instead of getting a meaningless "Task completed" stub.
        console.warn('[seec0de] AI generate failed:', err?.message || err);
        setAiError(describeAiError(err));
        return;
      } finally {
        setAiLoading(false);
      }
    }

    // No AI path available. If the offline generator has nothing real
    // to say either (novel prompt, no template match), surface a clear
    // explanation instead of silently writing the generic scaffold.
    if (!isTemplate) {
      if (!keyPresent) {
        setAiError({
          message: 'Add a free Gemini key in Settings to generate code for novel prompts. The built-in templates only cover a handful of starter exercises — try one of the suggestion chips above.',
          kind: 'no-key',
        });
        return;
      }
      if (!online) {
        setAiError({
          message: "You're offline. Reconnect and click Generate again — the built-in templates only cover a handful of starter exercises.",
          kind: 'offline',
        });
        return;
      }
    }

    try {
      const result = generateCode(text, languagesForGen);
      await applyResult(result);
    } catch (err) {
      setExplanation({ summary: `Couldn't generate: ${err.message}`, lineByLine: [] });
    }
  }, [instruction, selectedLanguages, aiLoading, rootPath, settings.practicalLanguage, writeScratchFromResult]);

  // ---- Build Panel handlers ---------------------------------------------
  // Builds are verified against the learner's actual files. Content checks
  // read the live editor buffer (open tab first, disk fallback); output
  // checks reuse the normal Run pipeline's result.
  const resolveBuildFile = useCallback(async (file) => {
    if (!rootPath) return null;
    const projectDir = buildSessionRef.current?.projectDir || '';
    const full = joinPath(rootPath, projectDir, file);
    const tab = openFiles.find((f) => f.path === full);
    if (tab) return tab.content;
    try {
      const { content } = await window.seecode.fs.readFile(full);
      return content;
    } catch {
      return null; // file not created yet
    }
  }, [rootPath, openFiles]);

  // File resolver for Learn project checkpoints. Content checks read the
  // live editor draft for the checkpoint's target file (the learner is
  // editing it right now), falling back to the on-disk project file.
  const resolveLessonFile = useCallback(async (file) => {
    if (activeLesson?.kind === 'project-checkpoint' && file === activeLesson.file) {
      const draft = generatedCode.code?.[activeLesson.language || 'javascript'];
      if (typeof draft === 'string' && draft.trim()) return draft;
    }
    if (!learnProjectDir) return null;
    try {
      const { content } = await window.seecode.fs.readFile(joinPath(learnProjectDir, file));
      return content;
    } catch {
      return null; // file not created yet
    }
  }, [activeLesson, learnProjectDir, generatedCode]);

  const currentBuildStepInfo = useCallback(() => {
    const session = buildSessionRef.current;
    if (!session) return null;
    const project = findBuildProject(session.projectId);
    if (!project) return null;
    const step = project.steps.find((s) => !session.completedStepIds.includes(s.id)) || null;
    if (!step) return null;
    return { step, projectId: project.id };
  }, []);

  // Confetti + fanfare when the learner finishes a project.
  const fireCompletionConfetti = useCallback(() => {
    try {
      playProjectCompleteSound();
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 } });
      setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 180);
      setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 320);
    } catch { /* celebration is decorative — never break the flow */ }
  }, []);

  const completeBuildStep = useCallback((stepId) => {
    const session = buildSessionRef.current;
    if (!session || !rootPath) return;
    const project = findBuildProject(session.projectId);
    if (!project) return;
    if (session.completedStepIds.includes(stepId)) return;
    const steps = project.steps;
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const finished = idx === steps.length - 1;
    const next = {
      ...session,
      completedStepIds: [...session.completedStepIds, stepId],
      completedAt: finished ? new Date().toISOString() : null,
    };
    buildSessionRef.current = next;
    setBuildSession(next);
    setBuildCheck(null);
    setBuildSetup(null);
    setSettings(updateSettings({ buildSession: next }));
    if (finished) fireCompletionConfetti();
    const nextStep = steps[idx + 1];
    if (nextStep) {
      const base = session.projectDir ? joinPath(rootPath, session.projectDir) : rootPath;
      const p = joinPath(base, nextStep.file);
      handleOpenFile(p);
      setActivePath(p);
      ensureStepSetup(nextStep, session.projectDir || '');
    }
  }, [rootPath, handleOpenFile, setSettings, ensureStepSetup, fireCompletionConfetti]);

  // The "My Projects" list is a lightweight history of builds the learner has
  // started (sample or AI-generated). Kept in settings so it survives restarts
  // and is per-profile; the entry's stepIndex lets resume jump back to the
  // first unfinished step.
  const recordRecentBuild = useCallback((project, stepIndex, extra = {}) => {
    if (!project) return;
    const list = Array.isArray(settings.recentBuilds) ? settings.recentBuilds : [];
    const rest = list.filter((r) => r.projectId !== project.id);
    const entry = {
      projectId: project.id,
      title: project.title,
      language: project.language,
      stepCount: project.steps?.length || 0,
      stepIndex,
      updatedAt: new Date().toISOString(),
      ...extra,
    };
    setSettings(updateSettings({ recentBuilds: [entry, ...rest].slice(0, 20) }));
  }, [settings.recentBuilds, setSettings]);

  // Start a build. `options` comes from the Build Panel's start dialog:
  //   { projectDir: relative subfolder ('' = open folder root),
  //     writeScaffold: false to skip writing the starter files }
  const handleStartBuild = useCallback(async (project, options = {}) => {
    if (!rootPath || !project) return;
    const projectDir = typeof options.projectDir === 'string'
      ? options.projectDir.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/')
      : '';
    const writeScaffold = options.writeScaffold !== false;
    const base = projectDir ? joinPath(rootPath, projectDir) : rootPath;

    setBuildSetup(null);
    if (projectDir) {
      try { await window.seecode.fs.createDir(base); } catch (err) {
        console.warn('[seec0de] build dir create failed:', err?.message || err);
      }
    }
    for (const f of project.scaffold || []) {
      try {
        // With starter files off we still create EMPTY files so the editor
        // opens cleanly — the learner writes everything from scratch.
        await window.seecode.fs.writeFile(joinPath(base, f.file), writeScaffold ? f.content : '');
      } catch (err) {
        console.warn('[seec0de] build scaffold write failed:', err?.message || err);
      }
    }
    const firstStep = project.steps[0];
    if (firstStep) {
      const p = joinPath(base, firstStep.file);
      await handleOpenFile(p);
      setActivePath(p);
    }
    const session = {
      projectId: project.id,
      projectDir,
      completedStepIds: [],
      setupDoneStepIds: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    buildSessionRef.current = session;
    setBuildSession(session);
    setBuildCheck(null);
    setSettings(updateSettings({ buildSession: session }));
    recordRecentBuild(project, 0, { projectDir });
    // Project-level setup runs once at the very start (npm init, pip install…).
    if (project.setup?.length) {
      await runSetupCommands(`Setup: ${project.title}`, project.setup, projectDir);
    }
    if (firstStep?.setup?.length) await ensureStepSetup(firstStep, projectDir);
  }, [rootPath, handleOpenFile, setSettings, recordRecentBuild, runSetupCommands, ensureStepSetup]);

  // Resume a previous build from "My Projects". Unlike handleStartBuild this
  // does NOT rewrite the scaffold — the files should already be in the folder
  // from the earlier session — it just re-opens the first unfinished step.
  const handleResumeBuild = useCallback(async (projectId) => {
    if (!rootPath) return;
    const project = findBuildProject(projectId);
    if (!project) return;
    const entry = (settings.recentBuilds || []).find((r) => r.projectId === projectId);
    const projectDir = entry?.projectDir || '';
    const base = projectDir ? joinPath(rootPath, projectDir) : rootPath;
    const completedIds = project.steps.slice(0, Math.max(0, entry?.stepIndex || 0)).map((s) => s.id);
    const allDone = completedIds.length >= project.steps.length;
    const session = {
      projectId: project.id,
      projectDir,
      completedStepIds: completedIds,
      setupDoneStepIds: [],
      startedAt: entry?.updatedAt || new Date().toISOString(),
      completedAt: allDone ? new Date().toISOString() : null,
    };
    buildSessionRef.current = session;
    setBuildSession(session);
    setBuildCheck(null);
    setBuildSetup(null);
    setSettings(updateSettings({ buildSession: session }));
    const nextStep = project.steps.find((s) => !completedIds.includes(s.id));
    if (nextStep) {
      const p = joinPath(base, nextStep.file);
      await handleOpenFile(p);
      setActivePath(p);
      if (nextStep?.setup?.length) await ensureStepSetup(nextStep, projectDir);
    }
  }, [rootPath, settings.recentBuilds, handleOpenFile, setSettings, ensureStepSetup]);

  // ---- Build setup commands (npm install, pip install, …) --------------
  // Runs shell commands inside the build's project folder and surfaces live
  // progress in BuildPanel. Used for project-level `setup` (once, at start)
  // and per-step `setup` (the first time a step becomes current).
  const execInProject = useCallback(async (command, projectDir) => {
    if (!rootPath) return { stdout: '', stderr: '[seec0de] no project folder', exitCode: -1 };
    const cwd = projectDir ? joinPath(rootPath, projectDir) : rootPath;
    try {
      return await window.seecode.terminal.exec({ command, cwd });
    } catch (err) {
      return { stdout: '', stderr: `[seec0de] ${err.message}`, exitCode: -1 };
    }
  }, [rootPath]);

  // Command executor for runCommand checks — runs in the build's project
  // folder so `npm ls express` verifies the learner's actual install.
  const execCommand = useCallback((command) => {
    const session = buildSessionRef.current;
    return execInProject(command, session?.projectDir || '');
  }, [execInProject]);

  const runSetupCommands = useCallback(async (label, commands, projectDir, stepId) => {
    if (!commands?.length) return;
    const lines = [];
    const emit = () => setBuildSetup({ running: true, label, stepId: stepId ?? null, lines: [...lines] });
    emit();
    for (const command of commands) {
      const res = await execInProject(command, projectDir);
      lines.push({ command, exitCode: res.exitCode });
      if ((res.stdout || '').trim()) lines.push({ text: res.stdout.trim() });
      if ((res.stderr || '').trim()) lines.push({ text: res.stderr.trim() });
      emit();
    }
    setBuildSetup({ running: false, label, stepId: stepId ?? null, lines: [...lines] });
  }, [execInProject]);

  // Runs the current step's setup commands the first time that step becomes
  // current (tracked in the session so a re-render can't double-run them).
  const ensureStepSetup = useCallback(async (step, projectDir) => {
    const session = buildSessionRef.current;
    if (!session || !step?.setup?.length) return;
    if ((session.setupDoneStepIds || []).includes(step.id)) return;
    const next = { ...session, setupDoneStepIds: [...(session.setupDoneStepIds || []), step.id] };
    buildSessionRef.current = next;
    setBuildSession(next);
    setSettings(updateSettings({ buildSession: next }));
    await runSetupCommands(`Setup: ${step.title}`, step.setup, projectDir || '', step.id);
  }, [runSetupCommands, setSettings]);

  const handleExitBuild = useCallback(() => {
    // Capture where the learner left off so "My Projects" can resume it.
    const session = buildSessionRef.current;
    if (session) {
      const project = findBuildProject(session.projectId);
      if (project) recordRecentBuild(project, session.completedStepIds.length, { projectDir: session.projectDir || '' });
    }
    setBuildSession(null);
    setBuildCheck(null);
    setBuildSetup(null);
    setSettings(updateSettings({ buildSession: null }));
  }, [recordRecentBuild, setSettings]);

  const handleBuildRunResult = useCallback((output, filename) => {
    const info = currentBuildStepInfo();
    if (!info) return;
    const { step, projectId } = info;
    // Only judge a run against the step's target file — running some other
    // tab must not move the build forward.
    if (filename && filename !== step.file) return;
    // runCommand checks (e.g. "is express installed?") run in the project
    // folder now that the learner pressed Run — content checks were already
    // checked live on edit.
    evaluateStep(step, { resolveFile: resolveBuildFile, output, execCommand }).then((result) => {
      if (buildSessionRef.current?.projectId !== projectId) return; // session changed mid-check
      setBuildCheck({ stepId: step.id, pass: result.pass, details: result.details });
      if (result.pass) completeBuildStep(step.id);
    });
  }, [currentBuildStepInfo, resolveBuildFile, execCommand, completeBuildStep]);

  // "Check step" — verify the current step's content + runCommand checks
  // WITHOUT a file run. Needed for steps with no runnable output (e.g. the
  // npm scaffold step, whose target is package.json): the learner types the
  // commands in the Terminal, then clicks Check step to verify them.
  const handleCheckBuildStep = useCallback(async (stepId) => {
    const session = buildSessionRef.current;
    if (!session || !rootPath) return;
    const project = findBuildProject(session.projectId);
    const step = project?.steps.find((s) => s.id === stepId);
    if (!step) return;
    const result = await evaluateStep(step, { resolveFile: resolveBuildFile, output: null, execCommand });
    if (buildSessionRef.current?.projectId !== session.projectId) return; // session changed mid-check
    setBuildCheck({ stepId: step.id, pass: result.pass, details: result.details });
    if (result.pass) completeBuildStep(step.id);
  }, [rootPath, resolveBuildFile, execCommand, completeBuildStep]);

  // Go back to an already-completed step: it becomes current again and every
  // step after it reopens (steps are cumulative — editing an earlier file can
  // break what later steps built on). The learner re-verifies from there.
  const handleGoBackBuildStep = useCallback((stepId) => {
    const session = buildSessionRef.current;
    if (!session || !rootPath) return;
    const project = findBuildProject(session.projectId);
    if (!project) return;
    const idx = project.steps.findIndex((s) => s.id === stepId);
    if (idx < 0 || !session.completedStepIds.includes(stepId)) return;
    const next = {
      ...session,
      completedStepIds: session.completedStepIds.slice(0, idx),
      completedAt: null,
    };
    buildSessionRef.current = next;
    setBuildSession(next);
    setBuildCheck(null);
    setBuildSetup(null);
    setSettings(updateSettings({ buildSession: next }));
    const step = project.steps[idx];
    const base = session.projectDir ? joinPath(rootPath, session.projectDir) : rootPath;
    const p = joinPath(base, step.file);
    handleOpenFile(p);
    setActivePath(p);
    ensureStepSetup(step, session.projectDir || ''); // skips if its setup already ran
  }, [rootPath, handleOpenFile, setSettings, ensureStepSetup]);

  // Debounced content check: as the learner edits the target file, re-run
  // the current step's content checks. Steps that also need output stay
  // open until the learner presses Run (evaluateStep marks those pending),
  // so a step only auto-advances when its checks are fully content-based.
  useEffect(() => {
    if (!buildSession || !rootPath) return undefined;
    const info = currentBuildStepInfo();
    if (!info) return undefined;
    const { step } = info;
    const timer = setTimeout(async () => {
      const result = await evaluateStep(step, { resolveFile: resolveBuildFile, output: null, contentOnly: true });
      if (buildSessionRef.current?.projectId !== buildSession.projectId) return;
      setBuildCheck({ stepId: step.id, pass: result.pass, details: result.details });
      if (result.pass) completeBuildStep(step.id);
    }, 800);
    return () => clearTimeout(timer);
  }, [openFiles, buildSession, rootPath, currentBuildStepInfo, resolveBuildFile, completeBuildStep]);

  // Restore a saved build on launch: re-open the current step's file so the
  // learner lands where they left off (and run that step's setup if it never
  // ran — the session records which ones have).
  useEffect(() => {
    if (!buildSession || !rootPath) return;
    const project = findBuildProject(buildSession.projectId);
    const step = project?.steps.find((s) => !buildSession.completedStepIds.includes(s.id));
    if (step) {
      const base = buildSession.projectDir ? joinPath(rootPath, buildSession.projectDir) : rootPath;
      const p = joinPath(base, step.file);
      handleOpenFile(p);
      setActivePath(p);
      ensureStepSetup(step, buildSession.projectDir || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Learn project folder + live checks --------------------------------
  // Derive the active project's folder from the active lesson so switching
  // checkpoints/projects swaps folders naturally.
  useEffect(() => {
    if (activeLesson?.kind !== 'project-checkpoint') {
      setLearnProjectDir(null);
      return undefined;
    }
    let cancelled = false;
    const resolveRoot = learnProjectsRootRef.current
      ? Promise.resolve(learnProjectsRootRef.current)
      : window.seecode.fs.learnProjectsDir().then((root) => {
        learnProjectsRootRef.current = root;
        return root;
      });
    resolveRoot
      .then((base) => { if (!cancelled) setLearnProjectDir(joinPath(base, activeLesson.projectId)); })
      .catch((err) => console.warn('[seec0de] learn projects dir failed:', err?.message || err));
    return () => { cancelled = true; };
  }, [activeLesson?.kind, activeLesson?.projectId]);

  // Keep the project file on disk in sync with the lesson editor draft, so
  // the auto-created folder always contains what the learner has written
  // (mirrors the workspace auto-save rhythm).
  useEffect(() => {
    if (!inLessonMode || !learnProjectDir || activeLesson?.kind !== 'project-checkpoint') return undefined;
    const file = activeLesson.file;
    if (!file) return undefined;
    const content = generatedCode.code?.[activeLesson.language || 'javascript'] || '';
    const timer = setTimeout(async () => {
      try {
        await window.seecode.fs.createDir(learnProjectDir);
        await window.seecode.fs.writeFile(joinPath(learnProjectDir, file), content);
      } catch (err) {
        console.warn('[seec0de] lesson project file write failed:', err?.message || err);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [inLessonMode, learnProjectDir, activeLesson?.kind, activeLesson?.language, activeLesson?.file, generatedCode]);

  // Live content check: as the learner edits the checkpoint's file, re-run
  // its content checks (debounced) so the guide shows "not yet — this is
  // missing" feedback before they even press Run. Output gating stays with
  // the Run verdict (run-to-verify), exactly like the lesson loop.
  useEffect(() => {
    if (!inLessonMode || activeLesson?.kind !== 'project-checkpoint') return undefined;
    const checkpoint = activeLesson;
    if (!checkpoint.checks?.length) return undefined;
    const timer = setTimeout(async () => {
      const result = await evaluateStep(checkpoint, { resolveFile: resolveLessonFile, output: null, contentOnly: true });
      setLessonCheck({ stepId: checkpoint.id, pass: result.pass, details: result.details });
    }, 700);
    return () => clearTimeout(timer);
  }, [inLessonMode, activeLesson, resolveLessonFile, generatedCode]);

  // Clear any stale AI-error card the moment the learner edits the
  // instruction. Keeps the panel from showing a red banner that refers
  // to a prompt they've already moved on from.
  const handleInstructionChange = useCallback((value) => {
    setInstruction(value);
    setAiError((prev) => (prev ? null : prev));
  }, []);

  const handleCodeChange = useCallback((tab, value) => {
    setGeneratedCode((prev) => {
      const next = tab === 'pseudocode'
        ? { ...prev, pseudocode: value }
        : { ...prev, code: { ...prev.code, [tab]: value } };
      if (inLessonMode) learnDraftRef.current = next;
      return next;
    });
  }, [inLessonMode]);

  // Single unified Explain flow. If we have an API key AND we're online,
  // try the AI explainer first; on any failure (or when offline/no key),
  // fall back to the built-in line-by-line explainer.
  const handleSelectionExplain = useCallback(async (selectedCode, language) => {
    if (aiLoading) return;

    const reveal = (result) => {
      setExplanation(result);
      // If the explanation panel is collapsed, pop it open so the user
      // actually sees what they asked for. (Same pattern as run→preview.)
      if (explanationCollapsed) setExplanationCollapsed(false);
    };

    // Skip AI when the selected code is verbatim from one of the offline
    // templates — the hand-tuned offline explainer already has a bespoke
    // summary + line-by-line for it (see codeExplainer.js → findTemplateMatch).
    // Mirrors the same short-circuit in handleGenerate above so template
    // round-trips stay 100% local even with a key + connection.
    const isTemplate = !!findTemplateMatch(selectedCode);
    const canUseAi = !isTemplate && hasApiKey() && (typeof navigator === 'undefined' || navigator.onLine);

    if (canUseAi) {
      // Clear the previous result and pop the sidebar open BEFORE the
      // network call so the spinner inside ExplanationSidebar is visible
      // while we wait — otherwise the only feedback is the tiny floating
      // button on the editor selection, which is easy to miss.
      setExplanation(null);
      if (explanationCollapsed) setExplanationCollapsed(false);
      setAiLoading(true);
      try {
        const result = await explainCodeWithAI(selectedCode, language);
        reveal(result);
        return;
      } catch (err) {
        console.warn('[seec0de] AI explain failed, falling back to offline:', err?.message || err);
      } finally {
        setAiLoading(false);
      }
    }

    try {
      const result = explainCode(selectedCode, language);
      reveal(result);
    } catch (err) {
      reveal({ summary: `Couldn't explain: ${err.message}`, lineByLine: [] });
    }
  }, [aiLoading, explanationCollapsed]);

  // ---- live preview source --------------------------------------------
  // Whatever the editor is showing right now is also what the live preview
  // renders. Computed from authoritative state (openFiles + generatedCode +
  // activePath + activeGeneratedTab) so updates flow naturally as the user
  // types — no extra plumbing through CodePanel.
  const livePreview = useMemo(() => {
    if (!inLessonMode && activePath) {
      const file = openFiles.find((f) => f.path === activePath);
      if (!file) return { code: '', language: 'plaintext', filename: null };
      const info = fileInfo(file.path);
      return {
        code: file.content || '',
        language: info.run || info.monaco || 'plaintext',
        filename: basename(file.path),
      };
    }
    // In lesson mode the editor is single-tab of the lesson's language; in normal mode
    // we honour the user's selected practical + comparison languages.
    const tabs = inLessonMode ? [activeLesson.language || 'javascript'] : ['pseudocode', ...effectiveLanguages];
    const tab = tabs.includes(activeGeneratedTab) ? activeGeneratedTab : tabs[0];
    if (tab === 'pseudocode') {
      return { code: generatedCode.pseudocode || '', language: 'plaintext', filename: null };
    }
    return {
      code: (generatedCode.code || {})[tab] || '',
      language: tab,
      filename: DEFAULT_FILENAME_FOR_LANG[tab] || null,
    };
  }, [activePath, openFiles, activeGeneratedTab, effectiveLanguages, generatedCode, activeLesson, inLessonMode]);

  // ---- run code --------------------------------------------------------
  // Runs are interactive: the process starts, stdout/stderr streams live
  // into the Console tab, and the learner can type input into the Console
  // while the program runs (the input is fed to the process's stdin).
  const handleRunnerInput = useCallback((chunk) => {
    if (!activeRunIdRef.current) return;
    window.seecode.runner.sendStdin(activeRunIdRef.current, chunk);
    // Input submitted — hide the row until the program asks again.
    setRunnerInputReady(false);
  }, []);

  const handleRunCode = useCallback(async (payloadOverride) => {
    const base = payloadOverride || (
      RUNNABLE.has(livePreview.language)
        ? { language: livePreview.language, source: livePreview.code, filename: livePreview.filename }
        : null
    );
    const payload = base ? { ...base } : null;
    if (!payload || runLoading) return;
    // Git lessons have no source code -- verification uses sandboxCommands instead
    if (!payload.source && payload.language !== 'git') return;

    // Build mode: when the learner runs a file inside the build's project
    // folder, execute it IN PLACE (instead of a temp sandbox) so multi-file
    // projects can require() their sibling modules. The filename becomes the
    // path relative to the build folder, so nested step files (e.g.
    // models/lesson.js) land in the right place. Running a file outside the
    // build folder keeps the normal sandbox behaviour.
    if (buildSessionRef.current && !inLessonMode && activePath) {
      const pd = buildSessionRef.current.projectDir || '';
      const base = pd ? joinPath(rootPath, pd) : rootPath;
      const sep = base.includes('\\') ? '\\' : '/';
      if (activePath === base || activePath.startsWith(base + sep)) {
        const rel = activePath === base
          ? (currentBuildStepInfo()?.step?.file || payload.filename)
          : activePath.slice(base.length + 1);
        payload.filename = rel.replace(/\\/g, '/');
        payload.projectDir = base;
      }
    }

    const runOwner = runOwnerRef.current;
    const runProfileId = settings.activeProfileId;
    const isGitLesson = activeLesson?.language === 'git';
    setRunLoading(true);
    setRunnerStream([]);
    setRunnerInputReady(false);
    if (!previewVisible && !isGitLesson) setPreviewVisible(true);
    if (inLessonMode) {
      setLearnPhase('run');
      setLessonAttempts((count) => count + 1);
      setLearnAnnouncement(`Checking ${payload.language} ${activeLesson.kind === 'exercise' ? 'exercise' : 'lesson'}…`);

      // Source-based lessons (HTML, CSS, Git) don't produce stdout — verify the
      // editor source directly instead of invoking the runner.
      // For Git lessons, use the sandbox command history as the source.
      const isSourceLesson = activeLesson?.language === 'html'
        || (activeLesson?.matchType || '').startsWith('source-');
      if (isSourceLesson) {
        setRunLoading(false);
        // For Git lessons, combine sandbox commands into a single source string
        const sourceToVerify = activeLesson?.language === 'git'
          ? sandboxCommandsRef.current.join('\n')
          : payload.source;
        const verdict = verifyLessonSource(sourceToVerify, activeLesson);
        playLessonSound(verdict.pass);
        setLessonVerification(verdict);
        setLessonStatus(verdict.pass ? 'pass' : 'fail');
        setLearnPhase(verdict.pass ? 'complete' : 'fix');
        setLearnAnnouncement(verdict.pass
          ? `${activeLesson.kind === 'exercise' ? 'Exercise' : 'Lesson'} passed. Your progress is saved.`
          : 'Your code doesn\'t match what the lesson expects. Check the diff below, then try again.');
        if (verdict.pass) {
          setLessonErrorCoaching([]);
          if (activeLesson.kind !== 'project-checkpoint' && !completedLessons.includes(activeLesson.id)) {
            const next = [...completedLessons, activeLesson.id];
            const nextSettings = updateSettings({ completedLessons: next });
            setSettings(nextSettings);
          }
        } else {
          const missing = (verdict.expected || '').replace(/^Must contain: /gm, '').split('\n').filter(Boolean);
          setLessonErrorCoaching([{
            title: 'Your code is missing required content',
            plain: `Compare your code against the lesson task. The following ${missing.length === 1 ? 'pattern was' : 'patterns were'} not found:`,
            fixes: missing.map((m) => `Must contain: ${m}`),
          }]);
        }
        return;
      }
    }

    // Applies the final result (from the runner:exit event or a start
    // failure) and runs lesson verification against it.
    const applyResult = (result) => {
      if (runOwner !== runOwnerRef.current || loadSettings().activeProfileId !== runProfileId) return;
      setRunLoading(false);
      const normalisedOutput = {
        command: result.command || `run ${payload.language}`,
        stdout: result.stdout || '',
        stderr: result.stderr || (result.error ? `[seec0de] ${result.error}\n` : ''),
        exitCode: result.exitCode ?? -1,
        durationMs: result.durationMs ?? 0,
        language: payload.language,
      };
      setRunnerOutput(normalisedOutput);

      // Lesson verification: compare the program's actual stdout against
      // the lesson's expectedOutput. Passing requires the program to
      // both (a) exit cleanly with no stderr AND (b) match the expected
      // output per the lesson's matchType (exact/contains/regex). On
      // pass we mark the lesson complete and show the green status; on
      // fail we surface a diff so the learner can see *what* didn't
      // match instead of just "wrong, try again".
      if (inLessonMode) {
        // HTML/Git lessons don't produce stdout — verify source code instead.
        // For Git lessons, use the sandbox command history as the source.
        const isSourceLesson = activeLesson?.language === 'html'
          || (activeLesson?.matchType || '').startsWith('source-');
        const sourceToVerify = isSourceLesson && activeLesson?.language === 'git'
          ? sandboxCommandsRef.current.join('\n')
          : livePreview.code;
        const verdict = isSourceLesson
          ? verifyLessonSource(sourceToVerify, activeLesson)
          : verifyLessonOutput(normalisedOutput, activeLesson);
        playLessonSound(verdict.pass);
        setLessonVerification(verdict);
        setLessonStatus(verdict.pass ? 'pass' : 'fail');
        setLessonErrorCoaching(verdict.pass ? [] : buildLessonErrorCoaching(
          normalisedOutput.stderr,
          normalisedOutput.language,
          activeLesson
        ));
        setLearnPhase(verdict.pass ? 'complete' : 'fix');
        setLearnAnnouncement(verdict.pass
          ? activeLesson.kind === 'project-checkpoint'
            ? 'Code passed. Write and save your reflection to complete this checkpoint.'
            : `${activeLesson.kind === 'exercise' ? 'Exercise' : 'Lesson'} passed. Your progress is saved.`
          : describeLessonRunFailure(normalisedOutput.stderr, payload.language));
        if (verdict.pass && activeLesson.kind !== 'project-checkpoint' && !completedLessons.includes(activeLesson.id)) {
          const next = [...completedLessons, activeLesson.id];
          const nextStreak = activeLesson.kind !== 'exercise' && revealedHints === 0
            ? (settings.guidanceSuccessStreak || 0) + 1
            : activeLesson.kind === 'exercise' ? (settings.guidanceSuccessStreak || 0) : 0;
          const nextSettings = updateSettings({
            completedLessons: next,
            guidanceSuccessStreak: nextStreak,
            learningReminders: settings.practiceRemindersEnabled
              ? scheduleLearningReminder(settings.learningReminders, activeLesson, 1, settings.practiceReminderTime)
              : settings.learningReminders,
          });
          setSettings(nextSettings);
        }
      }

      // Learn project checkpoints: refresh the step's check details with the
      // real run result (content checks plus any runOutput checks resolve
      // now, mirroring the Build Panel's Run hook).
      if (inLessonMode && activeLesson?.kind === 'project-checkpoint') {
        evaluateStep(activeLesson, { resolveFile: resolveLessonFile, output: normalisedOutput }).then((result) => {
          if (runOwner !== runOwnerRef.current) return; // context changed mid-check
          setLessonCheck({ stepId: activeLesson.id, pass: result.pass, details: result.details });
        });
      }

      // Build Panel: a Run also verifies the current build step's output
      // checks (content checks were already checked on edit).
      if (buildSessionRef.current && !inLessonMode) {
        handleBuildRunResult(normalisedOutput, payload.filename);
      }
    };

    let runId = null;
    const unsubOutput = window.seecode.runner.onOutput(({ id, stream, chunk }) => {
      if (id !== runId) return;
      setRunnerStream((prev) => [...prev, { level: stream === 'stderr' ? 'stderr' : 'stdout', text: chunk || '' }]);
      // Note: we deliberately do NOT hide the input row here. The prompt
      // and the input-wanted signal arrive on separate streams (stdout vs
      // stderr) and can be delivered in either order; hiding on output
      // would race the signal and swallow the requested input row. The row
      // hides on submit, on program exit, and on run-failure only.
    });
    const unsubInputWanted = window.seecode.runner.onInputWanted(({ id }) => {
      if (id !== runId) return;
      setRunnerInputReady(true);
    });
    const unsubExit = window.seecode.runner.onExit((result) => {
      if (result.id !== runId) return;
      unsubOutput();
      unsubInputWanted();
      unsubExit();
      setRunnerInputReady(false);
      activeRunIdRef.current = null;
      applyResult(result);
    });
    const unsubscribe = () => { unsubOutput(); unsubInputWanted(); unsubExit(); };

    try {
      const resp = await window.seecode.runner.start(payload);
      runId = resp?.id ?? null;
      activeRunIdRef.current = runId;
      // If start failed, main already emitted runner:exit with id null
      // (runId is still null here), so the listener above applies it.
    } catch (err) {
      unsubscribe();
      setRunnerInputReady(false);
      activeRunIdRef.current = null;
      if (runOwner === runOwnerRef.current || loadSettings().activeProfileId === runProfileId) setRunLoading(false);
      const stderr = `[seec0de] ${err.message}\n`;
      setRunnerOutput({
        command: `run ${payload.language}`,
        stdout: '',
        stderr,
        exitCode: -1,
        durationMs: 0,
        language: payload.language,
      });
      if (inLessonMode) {
        playLessonSound(false);
        setLessonStatus('fail');
        setLearnPhase('fix');
        setLessonVerification({
          pass: false,
          expected: activeLesson.expectedOutput || '',
          actual: '',
          reason: 'Your code did not run — check the Fix-it coach, then try again.',
        });
        setLessonErrorCoaching(buildLessonErrorCoaching(stderr, payload.language, activeLesson));
        setLearnAnnouncement(describeLessonRunFailure(stderr, payload.language));
      }

      if (buildSessionRef.current && !inLessonMode) {
        handleBuildRunResult({
          command: `run ${payload.language}`,
          stdout: '',
          stderr,
          exitCode: -1,
          durationMs: 0,
          language: payload.language,
        }, payload.filename);
      }
    }
  }, [
    livePreview,
    runLoading,
    previewVisible,
    activeLesson,
    completedLessons,
    inLessonMode,
    rootPath,
    currentBuildStepInfo,
    settings.activeProfileId,
    settings.guidanceSuccessStreak,
    settings.learningReminders,
    revealedHints,
    handleBuildRunResult,
    resolveLessonFile,
  ]);

  const handleGuidanceChange = useCallback((guidanceLevel) => {
    if (!['supported', 'guided', 'independent'].includes(guidanceLevel)) return;
    const next = updateSettings({ guidanceLevel, guidanceSuccessStreak: 0 });
    setSettings(next);
    const activities = activeLesson?.activities || [];
    const availableActivities = activeLesson?.kind === 'exercise'
      ? activities
      : activities.filter(isCourseActivity);
    const visible = guidanceLevel === 'supported'
      ? availableActivities
      : guidanceLevel === 'guided'
        ? availableActivities.filter((activity) => activity.type !== 'worked-example')
        : availableActivities.filter((activity) => WRITING_ACTIVITY_TYPES.has(activity.type));
    setActiveActivityId(visible[0]?.id || null);
  }, [activeLesson]);

  const handleGuidanceSuggestionLater = useCallback(() => {
    const next = updateSettings({ guidanceSuccessStreak: 0 });
    setSettings(next);
  }, []);

  // ---- onboarding / settings / profile handlers ------------------------
  const hydrateLearningProfile = useCallback((nextSettings) => {
    const restored = restoredLearningState(nextSettings);
    setLearnMode(!!nextSettings.learnMode);
    setBuildSession(nextSettings.buildSession || null);
    setBuildCheck(null);
    setLessonCheck(null);
    setActiveLesson(restored.lesson);
    setLearnCatalogLanguage(restored.lesson?.language || null);
    setLearnCatalogSection(restored.lesson
      ? learningSectionFor(restored.lesson)
      : null);
    setLearnCatalogProjectId(restored.lesson?.projectId || null);
    setLearnPhase(restored.phase);
    setLessonStatus(restored.status);
    setLessonVerification(restored.verification);
    setLessonErrorCoaching(restored.errorCoaching);
    setLessonAttempts(restored.attempts);
    setRevealedHints(restored.revealedHints);
    setActiveActivityId(restored.activityId);
    setActiveReflection(restored.reflection);
    learnDraftRef.current = restored.generatedCode;
    workspaceGeneratedCodeRef.current = { pseudocode: '', code: {} };
    workspaceCodePanelViewRef.current = { activeGeneratedTab: 'pseudocode', activePath: null };
    setGeneratedCode(nextSettings.learnMode ? restored.generatedCode : workspaceGeneratedCodeRef.current);
    setActiveGeneratedTab(nextSettings.learnMode && restored.lesson ? restored.lesson.language : 'pseudocode');
    setActivePath(null);
    setRunnerOutput(null);
    resetSandboxCommands();
    setLearnAnnouncement(nextSettings.learnMode && restored.lesson
      ? `${restored.lesson.title} resumed.`
      : nextSettings.learnMode ? 'Course list opened.' : '');
    runOwnerRef.current += 1;
    setRunLoading(false);
  }, []);

  // Fires after onboarding finishes in either mode. In 'setup' it created or
  // edited the active profile; in 'new-profile' it created + activated a new
  // one. Either way we're now signed into an active profile, so clear the
  // gate and refresh the profile-derived state.
  const handleOnboardingComplete = useCallback(() => {
    const next = loadSettings();
    setSettings(next);
    hydrateLearningProfile(next);
    setProfiles(listProfiles());
    setShowOnboarding(false);
    setOnboardingMode('setup');
    setGate(null);
    if (onboardingMode === 'setup') {
      startWorkspaceTour();
    } else {
      setShowHome(true);
    }
  }, [hydrateLearningProfile, onboardingMode, startWorkspaceTour]);

  const handleCloseWorkspaceTour = useCallback(() => {
    const previous = tourLayoutRef.current;
    if (previous) {
      setTerminalVisible(previous.terminalVisible);
      setPreviewVisible(previous.previewVisible);
      setInstructionCollapsed(previous.instructionCollapsed);
      setExplanationCollapsed(previous.explanationCollapsed);
    }
    tourLayoutRef.current = null;
    setShowWorkspaceTour(false);
  }, []);

  const handleSettingsChange = useCallback((next) => {
    setSettings(next);
    // Profile edits (name/avatar/bio/PIN) happen in the drawer; keep the
    // gate + title-bar chip in sync.
    setProfiles(listProfiles());
  }, []);

  const handleRerunOnboarding = useCallback(() => {
    setSettings(loadSettings());
    setOnboardingMode('setup');
    setShowOnboarding(true);
  }, []);

  // Sign in as `id` (from the gate). PIN verification, if any, already
  // happened inside ProfileGate before this fires.
  const handleEnterProfile = useCallback((id) => {
    const next = switchProfile(id);
    setSettings(next);
    hydrateLearningProfile(next);
    setProfiles(listProfiles());
    setGate(null);
  }, [hydrateLearningProfile]);

  // "Add profile" from the gate, the title-bar menu, or Settings. Runs
  // onboarding in new-profile mode (which creates + activates on finish).
  const handleAddProfile = useCallback(() => {
    setShowSettings(false);
    setShowProfileManager(false);
    setOnboardingMode('new-profile');
    setShowOnboarding(true);
  }, []);

  // Open the picker mid-session (cancellable — Esc / X keeps you signed in).
  const handleSwitchProfile = useCallback(() => {
    setShowSettings(false);
    setShowProfileManager(false);
    setGate('switch');
  }, []);

  // Delete a profile from Settings. Deleting your own identity is
  // disorienting to do silently, so afterwards we drop back to the picker
  // (launch gate) to re-establish who's signed in.
  const handleDeleteProfile = useCallback((id) => {
    deleteProfile(id);
    const next = loadSettings();
    setSettings(next);
    hydrateLearningProfile(next);
    setProfiles(listProfiles());
    setShowSettings(false);
    setShowProfileManager(false);
    setGate('launch');
  }, [hydrateLearningProfile]);

  // Used by Settings → Toolchains "Install" buttons: pops the bottom
  // terminal open (so the user actually sees it work), then pushes the
  // install command into it as if they had typed it. Walks them through
  // the link between Settings and the Terminal.
  const handleRunInTerminal = useCallback((command) => {
    if (!command) return;
    setTerminalVisible(true);
    // Give the terminal a tick to mount before we drive it.
    setTimeout(() => {
      terminalApi.current?.runCommand?.(command);
    }, 60);
  }, []);

  const beginExplorerResize = useCallback((event) => {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = explorerWidth;

  function handleMouseMove(moveEvent) {
    const delta = moveEvent.clientX - startX;
    const nextWidth = Math.max(180, Math.min(420, startWidth + delta));
    setExplorerWidth(nextWidth);
  }

  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}, [explorerWidth]);

const beginInstructionResize = useCallback((event) => {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = instructionWidth;

  function handleMouseMove(moveEvent) {
    const delta = moveEvent.clientX - startX;
    const nextWidth = Math.max(240, Math.min(520, startWidth + delta));
    setInstructionWidth(nextWidth);
  }

  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}, [instructionWidth]);

const beginLearnGuideResize = useCallback((event) => {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = learnGuideWidth;

  function handleMouseMove(moveEvent) {
    const delta = moveEvent.clientX - startX;
    setLearnGuideWidth(Math.max(300, Math.min(640, startWidth + delta)));
  }

  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}, [learnGuideWidth]);

const beginPreviewResize = useCallback((event) => {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = previewWidth;

  function handleMouseMove(moveEvent) {
    const delta = moveEvent.clientX - startX;
    // Handle sits on the preview's left edge: dragging left widens it.
    const nextWidth = Math.max(300, Math.min(680, startWidth - delta));
    setPreviewWidth(nextWidth);
  }

  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}, [previewWidth]);

const beginExplanationResize = useCallback((event) => {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = explanationWidth;

  function handleMouseMove(moveEvent) {
    const delta = moveEvent.clientX - startX;
    const nextWidth = Math.max(240, Math.min(520, startWidth - delta));
    setExplanationWidth(nextWidth);
  }

  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}, [explanationWidth]);

  const resizePanelWithKeyboard = useCallback((event, setWidth, direction, min, max) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? 32 : 8;
    const arrowDirection = event.key === 'ArrowRight' ? 1 : -1;
    setWidth((width) => Math.max(min, Math.min(max, width + arrowDirection * direction * step)));
  }, []);

  const isGitLesson = activeLesson?.language === 'git';
  const learnResultVisible = learnMode && !!activeLesson && ['run', 'fix', 'complete'].includes(learnPhase);
  const resultVisible = learnMode ? (isGitLesson ? false : learnResultVisible) : previewVisible;
  const guidanceLevel = ['supported', 'guided', 'independent'].includes(settings.guidanceLevel)
    ? settings.guidanceLevel
    : 'supported';
  const lessonTeachingVisible = learnMode && !!activeLesson && learnPhase === 'learn';

  const handleStartLessonExercise = useCallback(() => {
    setLearnPhase('run');
    setLearnAnnouncement('Teaching complete. Write the exercise in the editor, then run your code.');
  }, []);

  function handleModeChange(mode) {
    if (mode === 'home') {
      runOwnerRef.current += 1;
      setRunLoading(false);
      setShowHome(true);
      return;
    }

    setShowHome(false);
    const enteringLearnMode = mode === 'learn';
    if (enteringLearnMode === learnMode) return;

    runOwnerRef.current += 1;
    setRunLoading(false);
    setRunnerOutput(null);
    if (enteringLearnMode) {
      workspaceGeneratedCodeRef.current = generatedCode;
      workspaceCodePanelViewRef.current = { activeGeneratedTab, activePath };
      setGeneratedCode(activeLesson ? learnDraftRef.current : { pseudocode: '', code: {} });
      setActiveGeneratedTab(activeLesson?.language || 'pseudocode');
      setActivePath(null);
      if (!activeLesson) {
        setLearnCatalogLanguage(null);
        setLearnCatalogSection(null);
      }
      setLearnAnnouncement(activeLesson ? `${activeLesson.title} resumed.` : 'Learn opened. Choose a course.');
    } else {
      if (activeLesson) learnDraftRef.current = generatedCode;
      setGeneratedCode(workspaceGeneratedCodeRef.current);
      setActiveGeneratedTab(workspaceCodePanelViewRef.current.activeGeneratedTab);
      setActivePath(workspaceCodePanelViewRef.current.activePath);
    }
    setLearnMode(enteringLearnMode);
  }

  function startWorkspaceTour() {
    if (showWorkspaceTour) return;
    tourLayoutRef.current = {
      terminalVisible,
      previewVisible,
      instructionCollapsed,
      explanationCollapsed,
    };
    handleModeChange('workspace');
    setTerminalVisible(true);
    setPreviewVisible(true);
    setInstructionCollapsed(false);
    setExplanationCollapsed(false);
    setShowWorkspaceTour(true);
  }

  const saveLearningLibrary = (patch) => {
    const next = updateSettings(patch);
    setSettings(next);
  };

  const handleCreatePostcard = ({ title, explanation: postcardExplanation }) => {
    if (!livePreview.code?.trim()) return;
    const postcard = {
      id: `postcard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      explanation: postcardExplanation,
      language: livePreview.language || 'plaintext',
      filename: livePreview.filename || null,
      code: livePreview.code,
      output: runnerOutput?.stdout?.trim() || '',
      createdAt: new Date().toISOString(),
    };
    saveLearningLibrary({ codePostcards: [postcard, ...(settings.codePostcards || [])] });
  };

  const handleDeletePostcard = (postcardId) => {
    saveLearningLibrary({ codePostcards: (settings.codePostcards || []).filter((postcard) => postcard.id !== postcardId) });
  };

  const handleSchedulePostcard = (postcard, days) => {
    saveLearningLibrary({
      learningReminders: settings.practiceRemindersEnabled
        ? scheduleLearningReminder(settings.learningReminders, { ...postcard, kind: 'postcard' }, days, settings.practiceReminderTime)
        : settings.learningReminders,
    });
  };

  const handleDismissReminder = (reminderId) => {
    saveLearningLibrary({
      learningReminders: (settings.learningReminders || []).map((reminder) => reminder.id === reminderId
        ? { ...reminder, dismissedAt: new Date().toISOString() }
        : reminder),
    });
  };

  const handleSnoozeReminder = (reminderId, days) => {
    const dueAt = reminderDueAt(days, settings.practiceReminderTime);
    saveLearningLibrary({
      learningReminders: (settings.learningReminders || []).map((reminder) => reminder.id === reminderId
        ? { ...reminder, dueAt }
        : reminder),
    });
  };

  const handleContinueLearningReminder = (reminder) => {
    const itemId = reminder?.sourceId?.startsWith('learning:')
      ? reminder.sourceId.slice('learning:'.length)
      : null;
    const item = itemId
      ? flattenLessons(lessonsData).find((lesson) => lesson.id === itemId)
        || findExercise(lessonsData, itemId)
        || findProjectCheckpoint(itemId)
      : null;
    setLearningLibraryView(null);
    handleModeChange('learn');
    if (item) handleSelectLesson(item);
  };

  const activeReminders = useMemo(() => (
    (settings.learningReminders || [])
      .filter((reminder) => !reminder.dismissedAt)
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  ), [settings.learningReminders]);
  const dueReminders = useMemo(() => (
    settings.practiceRemindersEnabled
      ? activeReminders.filter((reminder) => new Date(reminder.dueAt).getTime() <= reminderClock)
      : []
  ), [settings.practiceRemindersEnabled, activeReminders, reminderClock]);

  useEffect(() => {
    if (!settings.practiceNotificationsEnabled || typeof window.Notification === 'undefined' || window.Notification.permission !== 'granted') return;
    dueReminders.forEach((reminder) => {
      const notificationKey = `${reminder.id}:${reminder.dueAt}`;
      if (notifiedRemindersRef.current.has(notificationKey)) return;
      notifiedRemindersRef.current.add(notificationKey);
      const notification = new window.Notification('Learning Pulse', {
        body: `${reminder.title} is ready for a short practice review.`,
      });
      notification.onclick = () => {
        window.focus();
        if (reminder.openLearnMode) handleContinueLearningReminder(reminder);
      };
    });
  }, [dueReminders, settings.practiceNotificationsEnabled]);

  return (
    <div style={styles.container}>
      <TitleBar
        explorerVisible={explorerVisible}
        onToggleExplorer={showHome || learnMode ? undefined : () => setExplorerVisible((v) => !v)}
        terminalVisible={terminalVisible}
        onToggleTerminal={showHome || learnMode ? undefined : () => setTerminalVisible((v) => !v)}
        onStartTour={startWorkspaceTour}
        onOpenSettings={() => setShowSettings(true)}
        activeProfile={settings.activeProfileId ? { username: settings.username, avatar: settings.avatar } : null}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
        onManageProfile={() => setShowProfileManager(true)}
        reminders={activeReminders}
        reminderNow={reminderClock}
        onDismissReminder={handleDismissReminder}
        onSnoozeReminder={handleSnoozeReminder}
        onContinueReminder={handleContinueLearningReminder}
        mode={showHome ? 'home' : learnMode ? 'learn' : 'workspace'}
        onModeChange={handleModeChange}
      />

      <LearningPulseBar
        reminders={dueReminders}
        onDismiss={handleDismissReminder}
        onSnooze={handleSnoozeReminder}
        onContinue={handleContinueLearningReminder}
      />

      {showHome ? (
        <HomeScreen
          username={settings.username}
          hasActiveLesson={!!activeLesson}
          postcardCount={(settings.codePostcards || []).length}
          onOpenWorkspace={() => handleModeChange('workspace')}
          onOpenLearnMode={() => handleModeChange('learn')}
          onOpenPostcards={() => setLearningLibraryView('postcards')}
          hideWordmark={!!gate}
        />
      ) : learnMode && !activeLesson ? (
        <LearnHomeScreen
          selectedLanguage={learnCatalogLanguage}
          selectedSection={learnCatalogSection}
          selectedProjectId={learnCatalogProjectId}
          completedLessons={completedLessons}
          completedProjectCheckpoints={completedProjectCheckpoints}
          onSelectLanguage={setLearnCatalogLanguage}
          onSelectSection={setLearnCatalogSection}
          onSelectProject={setLearnCatalogProjectId}
          onSelectLesson={handleSelectLesson}
          onSelectExercise={handleSelectLesson}
          onSelectProjectCheckpoint={handleSelectLesson}
        />
      ) : (
      <div style={styles.body}>
        <div style={styles.workspace} className={learnMode ? 'app-workspace learn-mode-workspace' : 'app-workspace'}>
          <div
            className={learnMode ? 'learn-mode-guide-shell' : undefined}
            data-workspace-panel="guide"
            tabIndex={-1}
            aria-label={learnMode ? 'Learn guide panel' : 'Instruction panel'}
            style={{
              ...styles.instructionShell,
              width: lessonTeachingVisible ? '100%' : learnMode ? learnGuideWidth : (instructionCollapsed ? 32 : instructionWidth),
              maxWidth: lessonTeachingVisible ? 'none' : learnMode ? 640 : 520,
            }}
          >
            {learnMode ? (
              <LearnModePanel
                activeLesson={activeLesson}
                phase={learnPhase}
                completedLessons={completedLessons}
                lessonStatus={lessonStatus}
                lessonVerification={lessonVerification}
                lessonErrorCoaching={lessonErrorCoaching}
                lessonHasNext={hasNextLesson}
                attempts={lessonAttempts}
                revealedHints={revealedHints}
                activeActivityId={activeActivityId}
                guidanceLevel={guidanceLevel}
                guidanceSuccessStreak={settings.guidanceSuccessStreak || 0}
                reflection={activeReflection}
                lessonCheck={lessonCheck}
                learnProjectDir={learnProjectDir}
                checkpointComplete={completedProjectCheckpoints.includes(activeLesson?.id)}
                announcement={learnAnnouncement}
                onSelectLesson={handleSelectLesson}
                onResetLessonCode={handleResetLessonCode}
                onRevealSolution={handleRevealSolution}
                onHintIndexChange={setRevealedHints}
                onActivityChange={setActiveActivityId}
                onGuidanceChange={handleGuidanceChange}
                onGuidanceSuggestionLater={handleGuidanceSuggestionLater}
                onReflectionChange={setActiveReflection}
                onCompleteCheckpoint={handleCompleteCheckpoint}
                onNextLesson={handleNextLesson}
                onStartExercise={handleStartLessonExercise}
                focused={lessonTeachingVisible}
              />
            ) : (
              <InstructionPanel
                instruction={instruction}
                onInstructionChange={handleInstructionChange}
                onGenerate={handleGenerate}
                aiLoading={aiLoading}
                aiError={aiError}
                onClearAiError={() => setAiError(null)}
                practicalLanguage={settings.practicalLanguage}
                comparisonLanguages={settings.comparisonLanguages}
                onOpenSettings={() => setShowSettings(true)}
                collapsed={instructionCollapsed}
                onToggleCollapsed={() => setInstructionCollapsed((v) => !v)}
                rootPath={rootPath}
                onPickFolder={handlePickFolder}
                onCloseFolder={handleCloseFolder}
                onOpenFile={handleOpenFile}
                onDeleteFile={handleCloseFile}
                activeFilePath={activePath}
                refreshKey={0}
                buildSession={buildSession}
                buildCheck={buildCheck}
                buildSetup={buildSetup}
                onStartBuild={handleStartBuild}
                onExitBuild={handleExitBuild}
                recentBuilds={settings.recentBuilds || []}
                onResumeBuild={handleResumeBuild}
                onCompleteStep={completeBuildStep}
                onCheckStep={handleCheckBuildStep}
                onGoBackStep={handleGoBackBuildStep}
              />
            )}
          </div>

          {!learnMode && !instructionCollapsed && (
            <div
              className="workspace-resize-handle"
              style={styles.verticalResizeHandle}
              onMouseDown={beginInstructionResize}
              onKeyDown={(event) => resizePanelWithKeyboard(event, setInstructionWidth, 1, 240, 520)}
              title="Resize instruction panel (Arrow keys)"
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="Resize instruction panel"
              aria-valuemin={240}
              aria-valuemax={520}
              aria-valuenow={Math.round(instructionWidth)}
            />
          )}

          {learnMode && !lessonTeachingVisible && (
            <div
              className="workspace-resize-handle"
              style={styles.verticalResizeHandle}
              onMouseDown={beginLearnGuideResize}
              onKeyDown={(event) => resizePanelWithKeyboard(event, setLearnGuideWidth, 1, 300, 640)}
              title="Resize lesson panel (Arrow keys)"
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="Resize lesson panel"
              aria-valuemin={300}
              aria-valuemax={640}
              aria-valuenow={Math.round(learnGuideWidth)}
            />
          )}

          {!lessonTeachingVisible && <div
            className={learnMode ? 'workspace-editor-shell learn-mode-editor-shell' : 'workspace-editor-shell'}
            data-workspace-panel="editor"
            tabIndex={-1}
            aria-label="Code editor panel"
          >
            <CodePanel
              generatedCode={generatedCode}
              selectedLanguages={effectiveLanguages}
              appTheme={settings.theme}
              onCodeChange={handleCodeChange}
              onSelectionExplain={learnMode ? undefined : handleSelectionExplain}
              aiLoading={aiLoading}
              openFiles={learnMode ? [] : openFiles}
              activePath={learnMode ? null : activePath}
              onActivatePath={setActivePath}
              onCloseFile={handleCloseFile}
              onFileContentChange={handleFileContentChange}
              onRunCode={handleRunCode}
              runLoading={runLoading}
              activeGeneratedTab={activeGeneratedTab}
              onActivateGeneratedTab={setActiveGeneratedTab}
              folderOpen={!learnMode && !!rootPath}
              lessonMode={inLessonMode}
              lessonLanguage={activeLesson?.language}
              lessonId={activeLesson?.id}
              sandboxResetTrigger={sandboxResetTrigger}
              onSandboxCommand={addSandboxCommand}
            />
          </div>}

          {resultVisible && !learnMode && (
            <div
              className="workspace-resize-handle"
              style={styles.verticalResizeHandle}
              onMouseDown={beginPreviewResize}
              onKeyDown={(event) => resizePanelWithKeyboard(event, setPreviewWidth, -1, 300, 680)}
              title="Resize live preview (Arrow keys)"
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="Resize live preview"
              aria-valuemin={300}
              aria-valuemax={680}
              aria-valuenow={Math.round(previewWidth)}
            />
          )}

          {(!learnMode || resultVisible) && (
            <div
              className={learnMode ? 'learn-mode-result-shell' : undefined}
              data-workspace-panel="result"
              tabIndex={-1}
              aria-label="Preview and console panel"
              style={{
                ...styles.previewShell,
                width: resultVisible ? (learnMode ? 360 : previewWidth) : 32,
              }}
            >
              <LivePreviewPanel
                visible={resultVisible}
                onToggle={() => setPreviewVisible((v) => !v)}
                collapsible={!learnMode}
                code={livePreview.code}
                language={livePreview.language}
                filename={livePreview.filename}
                projectRoot={rootPath}
                runnerOutput={runnerOutput}
                runnerStream={runnerStream}
                runnerInputEnabled={runnerInputReady}
                onRunnerInput={handleRunnerInput}
                runLoading={runLoading}
                showErrorExplanations={!learnMode}
              />
            </div>
          )}


          {!learnMode && !explanationCollapsed && (
            <div
              className="workspace-resize-handle"
              style={styles.verticalResizeHandle}
              onMouseDown={beginExplanationResize}
              onKeyDown={(event) => resizePanelWithKeyboard(event, setExplanationWidth, -1, 240, 520)}
              title="Resize explanation panel (Arrow keys)"
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="Resize explanation panel"
              aria-valuemin={240}
              aria-valuemax={520}
              aria-valuenow={Math.round(explanationWidth)}
            />
          )}

          {!learnMode && (
            <div
              data-workspace-panel="explanation"
              tabIndex={-1}
              aria-label="Explanation panel"
              style={{
                ...styles.explanationShell,
                width: explanationCollapsed ? 32 : explanationWidth,
              }}
            >
              <ExplanationSidebar
                explanation={explanation}
                loading={aiLoading}
                collapsed={explanationCollapsed}
                onToggleCollapsed={() => setExplanationCollapsed((v) => !v)}
                onClear={() => setExplanation(null)}
              />
            </div>
          )}
        </div>

        {!learnMode && (
          <TerminalPanel
            visible={terminalVisible}
            onToggle={() => setTerminalVisible((v) => !v)}
            projectRoot={rootPath}
            apiRef={terminalApi}
          />
        )}
      </div>
      )}

      <OnboardingModal
        open={showOnboarding}
        initialSettings={settings}
        onComplete={handleOnboardingComplete}
        mode={onboardingMode}
      />

      <WorkspaceTour open={showWorkspaceTour} onClose={handleCloseWorkspaceTour} />

      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
        onRerunOnboarding={handleRerunOnboarding}
        onRunInTerminal={handleRunInTerminal}
      />

      <ProfileManagerCard
        open={showProfileManager}
        onClose={() => setShowProfileManager(false)}
        onSettingsChange={handleSettingsChange}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      <LearningLibraryModal
        open={!!learningLibraryView}
        postcards={settings.codePostcards || []}
        codeCandidate={{
          ...livePreview,
          output: runnerOutput?.stdout?.trim() || '',
        }}
        onClose={() => setLearningLibraryView(null)}
        onCreatePostcard={handleCreatePostcard}
        onDeletePostcard={handleDeletePostcard}
        onSchedulePostcard={handleSchedulePostcard}
      />

      {/* Auth gate — the "who's learning?" picker + PIN unlock. Sits above
          everything. Hidden while onboarding is open (add-profile flow) so
          the two overlays don't stack. */}
      {gate && !showOnboarding && (
        <ProfileGate
          profiles={profiles}
          autoSelectId={gate === 'launch' && profiles.length === 1 ? profiles[0].id : null}
          onEnter={handleEnterProfile}
          onAddProfile={handleAddProfile}
          allowClose={gate === 'switch'}
          onClose={() => setGate(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// helpers

// Translate a raw error from `generateCodeWithAI` into a card the
// InstructionPanel can render. The `kind` field decides whether the
// panel shows an "Open Settings" CTA (key issues) vs a plain dismiss
// (transient issues like overload / network)

function describeAiError(err) {
  const raw = err?.message ? String(err.message) : String(err ?? '');
  if (/no api key/i.test(raw)) {
    return {
      message: 'No Gemini key found. Add one in Settings to enable AI generation for novel prompts.',
      kind: 'no-key',
    };
  }
  if (/api key not valid|invalid.*api key|api key.*invalid|permission denied|forbidden|unauthor/i.test(raw)) {
    return {
      message: 'Gemini rejected your API key. Open Settings and paste a fresh key — you can grab a free one at aistudio.google.com/apikey.',
      kind: 'invalid-key',
    };
  }
  if (err?.isOverloaded || /overload|capacity|quota|rate.?limit|429|503/i.test(raw)) {
    return {
      message: "Gemini is overloaded right now. Wait a few seconds and click Generate again.",
      kind: 'overloaded',
    };
  }
  if (/network|enotfound|econnrefused|econnreset|fetch|timeout|getaddrinfo|offline/i.test(raw)) {
    return {
      message: "Couldn't reach Gemini. Check your internet connection and try again.",
      kind: 'network',
    };
  }
  if (/json|parse|unexpected response|no response/i.test(raw)) {
    return {
      message: 'Gemini returned an unexpected response. Click Generate again to retry.',
      kind: 'parse',
    };
  }
  return {
    message: `Generate failed: ${raw || 'unknown error'}`,
    kind: 'generic',
  };
}

function deriveLanguages(settings) {
  const practical = settings?.practicalLanguage || 'python';
  const comparisons = (settings?.comparisonLanguages || []).filter((c) => c !== practical);
  return [practical, ...comparisons];
}

function buildLessonErrorCoaching(stderr, language, lesson) {
  if (!stderr || !String(stderr).trim()) {
    if (!lesson) return [];
    return [{
      title: 'Your code ran, but the result differs',
      plain: `There is no runtime error to fix. Trace the values used for ${lesson.concept || 'this lesson'} and compare the order and formatting of each printed line.`,
      fixes: buildLessonContextFixes('', lesson).slice(0, 3),
    }];
  }
  const raw = String(stderr);
  if (/not found on PATH/i.test(raw)) {
    const runtime = language === 'python' ? 'Python' : language === 'javascript' ? 'Node.js' : 'the required toolchain';
    return [{
      title: `${runtime} is not installed`,
      plain: `Your lesson code is safe. seec0de cannot run it until ${runtime} is available on this computer.`,
      fixes: [
        `Install ${runtime} using the link or command in Settings → Toolchains.`,
        'Close and reopen seec0de after installation so it can find the new tool.',
        'Return to this lesson and press Run again.',
      ],
    }];
  }
  const translated = translateError(stderr, language);
  const contextFixes = buildLessonContextFixes(raw, lesson);
  if (translated.length > 0) {
    return translated.map((item) => ({
      ...item,
      plain: lesson?.concept
        ? `${item.plain} In this lesson, keep your attention on ${lesson.concept}.`
        : item.plain,
      fixes: [...contextFixes, ...(item.fixes || [])].filter((fix, index, all) => all.indexOf(fix) === index).slice(0, 3),
    }));
  }
  return [{
    title: 'Runtime error',
    plain: lesson?.concept
      ? `The program stopped before its output could be checked. This lesson is practising ${lesson.concept}, so inspect the first failing line in that part of your code.`
      : 'The program stopped before the lesson could check its output. Read the first error line, fix that line, then run again.',
    fixes: [
      ...contextFixes,
      'Check for missing quotes, brackets, parentheses, or punctuation near the first error line.',
      'Make sure each required variable is created before the line that uses it.',
    ].slice(0, 3),
  }];
}

function buildLessonContextFixes(stderr, lesson) {
  if (!lesson) return [];
  const fixes = [];
  const raw = String(stderr || '');
  const solution = String(lesson.solution || '');
  const missingName = raw.match(/(?:ReferenceError:\s*)?([A-Za-z_$][\w$]*) is not defined/i)
    || raw.match(/name ['"]([A-Za-z_$][\w$]*)['"] is not defined/i);

  if (missingName?.[1]) {
    const name = missingName[1];
    fixes.push(solution.includes(name)
      ? `\`${name}\` belongs in this lesson. Check that you created it before using it and kept the spelling exactly the same.`
      : `\`${name}\` is not one of the names the lesson runner can currently find. Check it against the names in the task and starter code.`);
  } else {
    const requiredNames = Array.from(String(lesson.task || '').matchAll(/`([A-Za-z_$][\w$]*)`/g))
      .map((match) => match[1])
      .filter((name, index, all) => all.indexOf(name) === index)
      .slice(0, 3);
    if (requiredNames.length > 0) {
      fixes.push(`Check the lesson's required names: ${requiredNames.map((name) => `\`${name}\``).join(', ')}. Spelling and capitalization must match.`);
    }
  }

  const firstHint = (lesson.hints || []).find((hint) => String(hint).trim());
  if (firstHint) fixes.push(`Use this nudge without copying the solution: ${firstHint}`);
  fixes.push('Compare the failing line with the starter code structure, then change one thing and run again.');
  return fixes;
}

function describeLessonRunFailure(stderr, language) {
  if (/not found on PATH/i.test(String(stderr || ''))) {
    const runtime = language === 'python' ? 'Python' : language === 'javascript' ? 'Node.js' : 'The required toolchain';
    return `${runtime} is not available. Your lesson is saved. Open Settings, then Toolchains, for installation help.`;
  }
  return 'Run failed. Fix guidance is available before you try again.';
}

// Decide whether the app should open behind the "who's learning?" gate.
// We only force a pick when it's ambiguous or locked:
//   • onboarding not done            → false (onboarding creates profile 1)
//   • no profiles yet                → false (same)
//   • exactly one, no PIN            → false (nothing to choose — sign straight in)
//   • more than one, or a PIN lock   → true  (pick / unlock first)
function computeInitialGate() {
  const s = loadSettings();
  if (!s.onboardingComplete) return false;
  const list = listProfiles();
  if (list.length === 0) return false;
  if (list.length === 1 && !(list[0].pinHash && list[0].pinHash.hash)) return false;
  return true;
}

// Read the per-session "is this panel open" key, falling back to the
// settings default for fresh installs.
function initialPanelVisible(storageKey, defaultFromSettings) {
  const saved = localStorage.getItem(storageKey);
  if (saved === null) return !!defaultFromSettings;
  return saved === '1';
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-primary)',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  explorerShell: {
  flexShrink: 0,
  display: 'flex',
  minWidth: 180,
  maxWidth: 420,
  overflow: 'hidden',
},

instructionShell: {
  flexShrink: 0,
  display: 'flex',
  minWidth: 32,
  maxWidth: 520,
  overflow: 'hidden',
},

explanationShell: {
  flexShrink: 0,
  display: 'flex',
  minWidth: 32,
  maxWidth: 520,
  overflow: 'hidden',
},

previewShell: {
  flexShrink: 0,
  display: 'flex',
  minWidth: 32,
  maxWidth: 680,
  overflow: 'hidden',
},

verticalResizeHandle: {
  width: 5,
  flexShrink: 0,
  cursor: 'col-resize',
  background: 'transparent',
  borderRight: '1px solid var(--border)',
},
};
