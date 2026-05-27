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
import { generateCodeWithAI, explainCodeWithAI, hasApiKey } from './engine/aiService';
import { loadSettings, updateSettings } from './engine/settings';
import { fileInfo, basename, joinPath } from './engine/fileLanguage';

// Per-session UI state lives in localStorage so the layout the user shaped
// last time comes back the next time. Settings.showTerminal/showFileExplorer
// act as the *default* for fresh installs; once the user toggles, the
// per-session keys take over so we don't fight their last action.
const STORAGE_KEY_FOLDER             = 'seec0de.lastFolder';
const STORAGE_KEY_TERMINAL_OPEN      = 'seec0de.terminalVisible';
const STORAGE_KEY_EXPLORER_OPEN      = 'seec0de.explorerVisible';
const STORAGE_KEY_PREVIEW_OPEN       = 'seec0de.previewVisible';
const STORAGE_KEY_INSTRUCTION_COLLAPSED = 'seec0de.instructionCollapsed';
const STORAGE_KEY_EXPLANATION_COLLAPSED = 'seec0de.explanationCollapsed';

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
  const [activeLesson, setActiveLesson] = useState(null);

  // ---- settings + completion -------------------------------------------
  const completedLessons = useMemo(() => settings.completedLessons || [], [settings.completedLessons]);

  const handleSelectLesson = useCallback((lesson) => {
    setActiveLesson(lesson);
    if (lesson) {
      setInstruction(lesson.instruction);
    }
  }, []);

  // Lifted from CodePanel so the LivePreviewPanel can read the same active
  // tab without prop-drilling editor state up on every keystroke.
  const [activeGeneratedTab, setActiveGeneratedTab] = useState('pseudocode');

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

  // ---- panel visibility ------------------------------------------------
  const [terminalVisible, setTerminalVisible] = useState(() => initialPanelVisible(
    STORAGE_KEY_TERMINAL_OPEN, loadSettings().showTerminal,
  ));
  // Live preview is the headline feature post-v2.4 — defaults ON unless
  // the user has explicitly hidden it before.
  const [previewVisible, setPreviewVisible] = useState(() => initialPanelVisible(
    STORAGE_KEY_PREVIEW_OPEN, true,
  ));
  // Sidebars default expanded but can be collapsed to a 32 px rail to
  // give the editor + preview more room.
  const [instructionCollapsed, setInstructionCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY_INSTRUCTION_COLLAPSED) === '1'
  );
  const [explanationCollapsed, setExplanationCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY_EXPLANATION_COLLAPSED) === '1'
  );

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
    localStorage.setItem(STORAGE_KEY_PREVIEW_OPEN, previewVisible ? '1' : '0');
  }, [previewVisible]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INSTRUCTION_COLLAPSED, instructionCollapsed ? '1' : '0');
  }, [instructionCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPLANATION_COLLAPSED, explanationCollapsed ? '1' : '0');
  }, [explanationCollapsed]);

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

  // Single unified Generate flow. If we have an API key AND we're online,
  // try the AI generator first; on any failure (or when offline/no key),
  // silently fall back to the built-in template generator so the learner
  // always gets *something*.
  const handleGenerate = useCallback(async (instructionOverride) => {
    const text = (typeof instructionOverride === 'string' ? instructionOverride : instruction).trim();
    if (!text || aiLoading) return;
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

    // Skip AI when the instruction matches one of the offline templates
    // (typically the suggestion chips). The hand-tuned template is the
    // canonical lesson for that prompt — paying for a network round-trip
    // just to get a less consistent answer adds latency without value.
    const isTemplate = matchesTemplate(text);
    const canUseAi = !isTemplate && hasApiKey() && (typeof navigator === 'undefined' || navigator.onLine);

    if (canUseAi) {
      setAiLoading(true);
      try {
        const result = await generateCodeWithAI(text, languagesForGen);
        await applyResult(result);
        return;
      } catch (err) {
        // AI failed — fall through to the offline generator below.
        console.warn('[seec0de] AI generate failed, falling back to offline:', err?.message || err);
      } finally {
        setAiLoading(false);
      }
    }

    try {
      const result = generateCode(text, languagesForGen);
      await applyResult(result);
    } catch (err) {
      setExplanation({ summary: `Couldn't generate: ${err.message}`, lineByLine: [] });
    }
  }, [instruction, selectedLanguages, aiLoading, rootPath, settings.practicalLanguage, writeScratchFromResult]);

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
    const tabs = ['pseudocode', ...selectedLanguages];
    const tab = tabs.includes(activeGeneratedTab) ? activeGeneratedTab : 'pseudocode';
    if (tab === 'pseudocode') {
      return { code: generatedCode.pseudocode || '', language: 'plaintext', filename: null };
    }
    return {
      code: (generatedCode.code || {})[tab] || '',
      language: tab,
      filename: DEFAULT_FILENAME_FOR_LANG[tab] || null,
    };
  }, [activePath, openFiles, activeGeneratedTab, selectedLanguages, generatedCode]);

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
      setRunnerOutput({
        command: result.command || `run ${payload.language}`,
        stdout: result.stdout || '',
        stderr: result.stderr || (result.error ? `[seec0de] ${result.error}\n` : ''),
        exitCode: result.exitCode ?? -1,
        durationMs: result.durationMs ?? 0,
        language: payload.language,
      });

      // If a lesson is active and it just ran successfully, mark it complete.
      if (activeLesson && (result.exitCode === 0 || (!result.error && !result.stderr))) {
        if (!completedLessons.includes(activeLesson.id)) {
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
  }, [livePreview, runLoading, previewVisible]);

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
            <FileExplorer
              rootPath={rootPath}
              onPickFolder={handlePickFolder}
              onCloseFolder={handleCloseFolder}
              onOpenFile={handleOpenFile}
              activeFilePath={activePath}
              refreshKey={0}
            />
          )}

          <InstructionPanel
            instruction={instruction}
            onInstructionChange={setInstruction}
            onGenerate={handleGenerate}
            aiLoading={aiLoading}
            practicalLanguage={settings.practicalLanguage}
            comparisonLanguages={settings.comparisonLanguages}
            onOpenSettings={() => setShowSettings(true)}
            collapsed={instructionCollapsed}
            onToggleCollapsed={() => setInstructionCollapsed((v) => !v)}
            completedLessons={completedLessons}
            onSelectLesson={handleSelectLesson}
            activeLesson={activeLesson}
          />

          <CodePanel
            generatedCode={generatedCode}
            selectedLanguages={selectedLanguages}
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
          />

          <LivePreviewPanel
            visible={previewVisible}
            onToggle={() => setPreviewVisible((v) => !v)}
            code={livePreview.code}
            language={livePreview.language}
            filename={livePreview.filename}
            runnerOutput={runnerOutput}
            runLoading={runLoading}
          />

          <ExplanationSidebar
            explanation={explanation}
            loading={aiLoading}
            collapsed={explanationCollapsed}
            onToggleCollapsed={() => setExplanationCollapsed((v) => !v)}
          />
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
};
