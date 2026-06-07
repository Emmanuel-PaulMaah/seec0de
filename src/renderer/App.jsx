import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import TitleBar from './components/TitleBar';
import InstructionPanel from './components/InstructionPanel';
import CodePanel from './components/CodePanel';
import ExplanationSidebar from './components/ExplanationSidebar';
import FileExplorer from './components/FileExplorer';
import TerminalPanel from './components/TerminalPanel';
import LivePreviewPanel from './components/LivePreviewPanel';
import OnboardingModal from './components/OnboardingModal';
import SettingsDrawer from './components/SettingsDrawer';
import { generateCode, matchesTemplate, findTemplateMatch } from './engine/codeGenerator';
import { explainCode } from './engine/codeExplainer';
import { generateCodeWithAI, explainCodeWithAI, hasApiKey, refreshHasApiKey } from './engine/aiService';
import { loadSettings, updateSettings } from './engine/settings';
import { fileInfo, basename, joinPath } from './engine/fileLanguage';
import { verifyLessonOutput, nextLessonAfter } from './engine/lessonVerifier';
import lessonsData from './data/lessons.json';

// Per-session UI state lives in localStorage so the layout the user shaped
// last time comes back the next time. Settings.showTerminal/showFileExplorer
// act as the *default* for fresh installs; once the user toggles, the
// per-session keys take over so we don't fight their last action.
const STORAGE_KEY_FOLDER             = 'seec0de.lastFolder';
const STORAGE_KEY_TERMINAL_OPEN      = 'seec0de.terminalVisible';
const STORAGE_KEY_EXPLORER_OPEN      = 'seec0de.explorerVisible';
const STORAGE_KEY_EXPLORER_WIDTH     = 'seec0de.explorerWidth';
const STORAGE_KEY_INSTRUCTION_WIDTH  = 'seec0de.instructionWidth';
const STORAGE_KEY_PREVIEW_OPEN       = 'seec0de.previewVisible';
const STORAGE_KEY_PREVIEW_WIDTH      = 'seec0de.previewWidth';
const STORAGE_KEY_INSTRUCTION_COLLAPSED = 'seec0de.instructionCollapsed';
const STORAGE_KEY_EXPLANATION_COLLAPSED = 'seec0de.explanationCollapsed';
const STORAGE_KEY_EXPLANATION_WIDTH  = 'seec0de.explanationWidth';

// Languages the runner service can actually execute. Mirrors runnerService.js.
const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'c', 'cpp']);

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
  // ---- settings + onboarding -------------------------------------------
  const [settings, setSettings] = useState(() => loadSettings());
  const [showOnboarding, setShowOnboarding] = useState(() => !loadSettings().onboardingComplete);
  const [showSettings, setShowSettings] = useState(false);

  // ---- generator state -------------------------------------------------
  const [selectedLanguages, setSelectedLanguages] = useState(() => deriveLanguages(loadSettings()));
  const [instruction, setInstruction] = useState('');
  const [generatedCode, setGeneratedCode] = useState({ pseudocode: '', code: {} });
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
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonStatus, setLessonStatus] = useState('idle');
  const [lessonVerification, setLessonVerification] = useState(null);

  // ---- settings + completion -------------------------------------------
  const completedLessons = useMemo(() => settings.completedLessons || [], [settings.completedLessons]);

  // Lifted from CodePanel so the LivePreviewPanel can read the same active
  // tab without prop-drilling editor state up on every keystroke.
  const [activeGeneratedTab, setActiveGeneratedTab] = useState('pseudocode');

  // Picking a lesson loads its starter code into the editor, focuses the
  // JavaScript tab, and resets pass/fail state. Picking `null` clears
  // the lesson but leaves the editor as-is (so the learner can still
  // tinker with their last attempt).
  const handleSelectLesson = useCallback((lesson) => {
    setActiveLesson(lesson);
    setLessonStatus('idle');
    setLessonVerification(null);
    if (lesson) {
      setGeneratedCode({ pseudocode: '', code: { javascript: lesson.starterCode || '' } });
      setActiveGeneratedTab('javascript');
      setActivePath(null);
      setInstruction('');
    }
  }, []);

  const handleResetLessonCode = useCallback(() => {
    if (!activeLesson) return;
    setGeneratedCode({ pseudocode: '', code: { javascript: activeLesson.starterCode || '' } });
    setActiveGeneratedTab('javascript');
    setLessonStatus('idle');
    setLessonVerification(null);
  }, [activeLesson]);

  const handleRevealSolution = useCallback(() => {
    // Just acknowledge the click — ActiveLessonCard renders the solution
    // text itself. We intentionally don't overwrite the user's editor
    // buffer; they can copy the solution in manually (or hit Reset code
    // then paste).
  }, []);

  const handleNextLesson = useCallback(() => {
    if (!activeLesson) return;
    const next = nextLessonAfter(lessonsData, activeLesson.id);
    if (next) handleSelectLesson(next);
  }, [activeLesson, handleSelectLesson]);

  // While a lesson is active, force the editor / preview to behave as if
  // JavaScript is the only language — hides the pseudocode + comparison
  // tabs in CodePanel and routes livePreview to the JS tab. The user's
  // real `selectedLanguages` setting stays untouched and returns the
  // moment they leave the lesson.
  const effectiveLanguages = useMemo(
    () => (activeLesson ? ['javascript'] : selectedLanguages),
    [activeLesson, selectedLanguages]
  );

  const hasNextLesson = useMemo(
    () => !!(activeLesson && nextLessonAfter(lessonsData, activeLesson.id)),
    [activeLesson]
  );

  useEffect(() => {
    setSelectedLanguages(deriveLanguages(settings));
  }, [settings.practicalLanguage, settings.comparisonLanguages]);

  // ---- file manager state ----------------------------------------------
  const [rootPath, setRootPath] = useState(() => localStorage.getItem(STORAGE_KEY_FOLDER));
  const [openFiles, setOpenFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);
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
  const [runLoading, setRunLoading] = useState(false);
  // Each run produces a fresh object (never mutated); LivePreviewPanel
  // pushes it into its Console tab via reference identity check.
  const [runnerOutput, setRunnerOutput] = useState(null);

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
    localStorage.setItem(STORAGE_KEY_EXPLANATION_COLLAPSED, explanationCollapsed ? '1' : '0');
  }, [explanationCollapsed]);

  useEffect(() => {
  localStorage.setItem(STORAGE_KEY_EXPLANATION_WIDTH, String(explanationWidth));
}, [explanationWidth]);

  // ---- keyboard shortcuts ---------------------------------------------
  // Ctrl+`  → toggle terminal (matches VS Code).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setTerminalVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Clear any stale AI-error card the moment the learner edits the
  // instruction. Keeps the panel from showing a red banner that refers
  // to a prompt they've already moved on from.
  const handleInstructionChange = useCallback((value) => {
    setInstruction(value);
    setAiError((prev) => (prev ? null : prev));
  }, []);

  const handleCodeChange = useCallback((tab, value) => {
    setGeneratedCode((prev) => {
      if (tab === 'pseudocode') return { ...prev, pseudocode: value };
      return { ...prev, code: { ...prev.code, [tab]: value } };
    });
  }, []);

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
    if (activePath) {
      const file = openFiles.find((f) => f.path === activePath);
      if (!file) return { code: '', language: 'plaintext', filename: null };
      const info = fileInfo(file.path);
      return {
        code: file.content || '',
        language: info.run || info.monaco || 'plaintext',
        filename: basename(file.path),
      };
    }
    // In lesson mode the editor is single-tab JavaScript; in normal mode
    // we honour the user's selected practical + comparison languages.
    const tabs = activeLesson ? ['javascript'] : ['pseudocode', ...effectiveLanguages];
    const tab = tabs.includes(activeGeneratedTab) ? activeGeneratedTab : tabs[0];
    if (tab === 'pseudocode') {
      return { code: generatedCode.pseudocode || '', language: 'plaintext', filename: null };
    }
    return {
      code: (generatedCode.code || {})[tab] || '',
      language: tab,
      filename: DEFAULT_FILENAME_FOR_LANG[tab] || null,
    };
  }, [activePath, openFiles, activeGeneratedTab, effectiveLanguages, generatedCode, activeLesson]);

  // ---- run code --------------------------------------------------------
  // Runner output flows into the LivePreviewPanel's Console tab — the
  // bottom terminal stays reserved for typed shell commands.
  const handleRunCode = useCallback(async (payloadOverride) => {
    const payload = payloadOverride || (
      RUNNABLE.has(livePreview.language)
        ? { language: livePreview.language, source: livePreview.code, filename: livePreview.filename }
        : null
    );
    if (!payload || !payload.source || runLoading) return;

    setRunLoading(true);
    if (!previewVisible) setPreviewVisible(true);

    try {
      const result = await window.seecode.runner.run(payload);
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
      if (activeLesson) {
        const verdict = verifyLessonOutput(normalisedOutput, activeLesson);
        setLessonVerification(verdict);
        setLessonStatus(verdict.pass ? 'pass' : 'fail');
        if (verdict.pass && !completedLessons.includes(activeLesson.id)) {
          const next = [...completedLessons, activeLesson.id];
          const nextSettings = updateSettings({ completedLessons: next });
          setSettings(nextSettings);
        }
      }
    } catch (err) {
      setRunnerOutput({
        command: `run ${payload.language}`,
        stdout: '',
        stderr: `[seec0de] ${err.message}\n`,
        exitCode: -1,
        durationMs: 0,
        language: payload.language,
      });
    } finally {
      setRunLoading(false);
    }
  }, [livePreview, runLoading, previewVisible, activeLesson, completedLessons]);

  // ---- onboarding / settings handlers ----------------------------------
  const handleOnboardingComplete = useCallback(() => {
    const next = loadSettings();
    setSettings(next);
    setShowOnboarding(false);
  }, []);

  const handleSettingsChange = useCallback((next) => {
    setSettings(next);
  }, []);

  const handleRerunOnboarding = useCallback(() => {
    setSettings(loadSettings());
    setShowOnboarding(true);
  }, []);

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

  return (
    <div style={styles.container}>
      <TitleBar
        explorerVisible={explorerVisible}
        onToggleExplorer={() => setExplorerVisible((v) => !v)}
        terminalVisible={terminalVisible}
        onToggleTerminal={() => setTerminalVisible((v) => !v)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div style={styles.body}>
        <div style={styles.workspace}>
          {explorerVisible && (
  <>
    <div style={{ ...styles.explorerShell, width: explorerWidth }}>
      <FileExplorer
        rootPath={rootPath}
        onPickFolder={handlePickFolder}
        onCloseFolder={handleCloseFolder}
        onOpenFile={handleOpenFile}
        activeFilePath={activePath}
        refreshKey={0}
      />
    </div>

    <div
      style={styles.verticalResizeHandle}
      onMouseDown={beginExplorerResize}
      title="Resize file explorer"
      role="separator"
      aria-orientation="vertical"
    />
  </>
)}

          <div
            style={{
              ...styles.instructionShell,
              width: instructionCollapsed ? 32 : instructionWidth,
            }}
          >
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
              completedLessons={completedLessons}
              onSelectLesson={handleSelectLesson}
              activeLesson={activeLesson}
              lessonStatus={lessonStatus}
              lessonVerification={lessonVerification}
              lessonHasNext={hasNextLesson}
              onResetLessonCode={handleResetLessonCode}
              onRevealSolution={handleRevealSolution}
              onNextLesson={handleNextLesson}
            />
          </div>

          {!instructionCollapsed && (
            <div
              style={styles.verticalResizeHandle}
              onMouseDown={beginInstructionResize}
              title="Resize instruction panel"
              role="separator"
              aria-orientation="vertical"
            />
          )}

          <CodePanel
            generatedCode={generatedCode}
            selectedLanguages={effectiveLanguages}
            onCodeChange={handleCodeChange}
            onSelectionExplain={handleSelectionExplain}
            aiLoading={aiLoading}
            openFiles={openFiles}
            activePath={activePath}
            onActivatePath={setActivePath}
            onCloseFile={handleCloseFile}
            onFileContentChange={handleFileContentChange}
            onSaveActiveFile={handleSaveActiveFile}
            onRunCode={handleRunCode}
            runLoading={runLoading}
            activeGeneratedTab={activeGeneratedTab}
            onActivateGeneratedTab={setActiveGeneratedTab}
            folderOpen={!!rootPath}
            lessonMode={!!activeLesson}
          />

          {previewVisible && (
            <div
              style={styles.verticalResizeHandle}
              onMouseDown={beginPreviewResize}
              title="Resize live preview"
              role="separator"
              aria-orientation="vertical"
            />
          )}

          <div
            style={{
              ...styles.previewShell,
              width: previewVisible ? previewWidth : 32,
            }}
          >
            <LivePreviewPanel
              visible={previewVisible}
              onToggle={() => setPreviewVisible((v) => !v)}
              code={livePreview.code}
              language={livePreview.language}
              filename={livePreview.filename}
              runnerOutput={runnerOutput}
              runLoading={runLoading}
            />
          </div>


          {!explanationCollapsed && (
            <div
              style={styles.verticalResizeHandle}
              onMouseDown={beginExplanationResize}
              title="Resize explanation sidebar"
              role="separator"
              aria-orientation="vertical"
            />
          )}

          <div
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
            />
          </div>
        </div>

        <TerminalPanel
          visible={terminalVisible}
          onToggle={() => setTerminalVisible((v) => !v)}
          apiRef={terminalApi}
        />
      </div>

      <OnboardingModal
        open={showOnboarding}
        initialSettings={settings}
        onComplete={handleOnboardingComplete}
      />

      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
        onRerunOnboarding={handleRerunOnboarding}
        onRunInTerminal={handleRunInTerminal}
      />
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
