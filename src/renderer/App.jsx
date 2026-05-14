import React, { useState, useCallback, useEffect, useRef } from 'react';
import TitleBar from './components/TitleBar';
import InstructionPanel from './components/InstructionPanel';
import CodePanel from './components/CodePanel';
import ExplanationSidebar from './components/ExplanationSidebar';
import FileExplorer from './components/FileExplorer';
import TerminalPanel from './components/TerminalPanel';
import OnboardingModal from './components/OnboardingModal';
import SettingsDrawer from './components/SettingsDrawer';
import { generateCode } from './engine/codeGenerator';
import { explainCode } from './engine/codeExplainer';
import { generateCodeWithAI, explainCodeWithAI } from './engine/aiService';
import { loadSettings } from './engine/settings';

// Persist a couple of small bits of session state outside settings.json:
//   - lastFolder              → path of the last opened folder (file explorer)
//   - terminalSessionVisible  → whether the bottom terminal was last open
// Settings.showTerminal/showFileExplorer act as the *default* for fresh
// installs; once the user toggles them in a session, the per-session
// keys take over so we don't fight their last action.
const STORAGE_KEY_FOLDER          = 'seec0de.lastFolder';
const STORAGE_KEY_TERMINAL_OPEN   = 'seec0de.terminalVisible';
const STORAGE_KEY_EXPLORER_OPEN   = 'seec0de.explorerVisible';

export default function App() {
  // ---- settings + onboarding -------------------------------------------
  // Single source of truth for user preferences. Loaded once on mount;
  // re-loaded when the SettingsDrawer reports a change.
  const [settings, setSettings] = useState(() => loadSettings());
  const [showOnboarding, setShowOnboarding] = useState(() => !loadSettings().onboardingComplete);
  const [showSettings, setShowSettings] = useState(false);

  // ---- generator state -------------------------------------------------
  // selectedLanguages = the practical language followed by every comparison
  // language. Recomputed whenever settings change.
  const [selectedLanguages, setSelectedLanguages] = useState(() => deriveLanguages(loadSettings()));
  const [instruction, setInstruction] = useState('');
  const [generatedCode, setGeneratedCode] = useState({ pseudocode: '', code: {} });
  const [explanation, setExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  // ---- terminal state --------------------------------------------------
  const [terminalVisible, setTerminalVisible] = useState(() => initialPanelVisible(
    STORAGE_KEY_TERMINAL_OPEN, loadSettings().showTerminal,
  ));
  const terminalApi = useRef(null);
  const [runLoading, setRunLoading] = useState(false);

  // ---- persistence -----------------------------------------------------
  useEffect(() => {
    if (rootPath) localStorage.setItem(STORAGE_KEY_FOLDER, rootPath);
    else          localStorage.removeItem(STORAGE_KEY_FOLDER);
  }, [rootPath]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TERMINAL_OPEN, terminalVisible ? '1' : '0');
  }, [terminalVisible]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPLORER_OPEN, explorerVisible ? '1' : '0');
  }, [explorerVisible]);

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
    setOpenFiles((prev) => {
      if (prev.some((f) => f.path === filePath)) return prev;
      return [...prev, { path: filePath, content: '', dirty: false, loading: true }];
    });
    setActivePath(filePath);
    try {
      const { content } = await window.seecode.fs.readFile(filePath);
      setOpenFiles((prev) => prev.map((f) =>
        f.path === filePath ? { path: filePath, content, dirty: false, loading: false } : f
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

  // ---- generator flows -------------------------------------------------
  const handleGenerate = useCallback(() => {
    if (!instruction.trim()) return;
    const result = generateCode(instruction, selectedLanguages);
    setGeneratedCode(result);
    setActivePath(null);
  }, [instruction, selectedLanguages]);

  const handleAiGenerate = useCallback(async () => {
    if (!instruction.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await generateCodeWithAI(instruction, selectedLanguages);
      setGeneratedCode(result);
      setActivePath(null);
    } catch (err) {
      setExplanation({ summary: `AI Error: ${err.message}`, lineByLine: [] });
    } finally {
      setAiLoading(false);
    }
  }, [instruction, selectedLanguages, aiLoading]);

  const handleCodeChange = useCallback((tab, value) => {
    setGeneratedCode((prev) => {
      if (tab === 'pseudocode') return { ...prev, pseudocode: value };
      return { ...prev, code: { ...prev.code, [tab]: value } };
    });
  }, []);

  const handleSelectionExplain = useCallback((selectedCode, language) => {
    const result = explainCode(selectedCode, language);
    setExplanation(result);
  }, []);

  const handleAiExplain = useCallback(async (selectedCode, language) => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const result = await explainCodeWithAI(selectedCode, language);
      setExplanation(result);
    } catch (err) {
      setExplanation({ summary: `AI Error: ${err.message}`, lineByLine: [] });
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading]);

  // ---- run code --------------------------------------------------------
  const handleRunCode = useCallback(async (payload) => {
    if (!payload || !payload.source || runLoading) return;
    setRunLoading(true);
    setTerminalVisible(true);
    try {
      const result = await window.seecode.runner.run(payload);
      const explanation = result.error
        ? result.error
        : `Ran ${payload.language}${payload.filename ? ' · ' + payload.filename : ''} with ${result.tool || 'system runtime'}.`;
      terminalApi.current?.pushEntry({
        command: result.command || `run ${payload.language}`,
        explanation,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode ?? -1,
        durationMs: result.durationMs ?? 0,
      });
    } catch (err) {
      terminalApi.current?.pushEntry({
        command: `run ${payload.language}`,
        explanation: 'Runner failed before producing output.',
        stderr: `[seec0de] ${err.message}\n`,
        exitCode: -1,
      });
    } finally {
      setRunLoading(false);
    }
  }, [runLoading]);

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
    // SettingsDrawer has already flipped onboardingComplete=false in the
    // store; we just reflect that here and surface the modal.
    setSettings(loadSettings());
    setShowOnboarding(true);
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
            onAiGenerate={handleAiGenerate}
            aiLoading={aiLoading}
            practicalLanguage={settings.practicalLanguage}
            comparisonLanguages={settings.comparisonLanguages}
            onOpenSettings={() => setShowSettings(true)}
          />
          <CodePanel
            generatedCode={generatedCode}
            selectedLanguages={selectedLanguages}
            onCodeChange={handleCodeChange}
            onSelectionExplain={handleSelectionExplain}
            onAiExplain={handleAiExplain}
            aiLoading={aiLoading}
            openFiles={openFiles}
            activePath={activePath}
            onActivatePath={setActivePath}
            onCloseFile={handleCloseFile}
            onFileContentChange={handleFileContentChange}
            onSaveActiveFile={handleSaveActiveFile}
            onRunCode={handleRunCode}
            runLoading={runLoading}
          />
          <ExplanationSidebar explanation={explanation} />
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
