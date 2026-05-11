import React, { useState, useCallback, useEffect, useRef } from 'react';
import TitleBar from './components/TitleBar';
import InstructionPanel from './components/InstructionPanel';
import CodePanel from './components/CodePanel';
import ExplanationSidebar from './components/ExplanationSidebar';
import FileExplorer from './components/FileExplorer';
import TerminalPanel from './components/TerminalPanel';
import { generateCode } from './engine/codeGenerator';
import { explainCode } from './engine/codeExplainer';
import { generateCodeWithAI, explainCodeWithAI } from './engine/aiService';

const STORAGE_KEY_FOLDER   = 'seec0de.lastFolder';
const STORAGE_KEY_TERMINAL = 'seec0de.terminalVisible';

export default function App() {
  const [selectedLanguages, setSelectedLanguages] = useState(['python', 'javascript']);
  const [instruction, setInstruction] = useState('');
  const [generatedCode, setGeneratedCode] = useState({ pseudocode: '', code: {} });
  const [explanation, setExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ---- file manager state ------------------------------------------------
  const [rootPath, setRootPath] = useState(() => localStorage.getItem(STORAGE_KEY_FOLDER));
  const [openFiles, setOpenFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [refreshKey] = useState(0);

  // ---- terminal state ----------------------------------------------------
  const [terminalVisible, setTerminalVisible] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TERMINAL);
    return saved === null ? false : saved === '1';
  });
  // Imperative handle for the TerminalPanel: { runCommand, pushEntry }.
  const terminalApi = useRef(null);
  // Track whether a code run is in progress, so the Run button can show a spinner.
  const [runLoading, setRunLoading] = useState(false);

  useEffect(() => {
    if (rootPath) localStorage.setItem(STORAGE_KEY_FOLDER, rootPath);
    else localStorage.removeItem(STORAGE_KEY_FOLDER);
  }, [rootPath]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TERMINAL, terminalVisible ? '1' : '0');
  }, [terminalVisible]);

  // Ctrl+` to toggle terminal — same as VS Code.
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

  // ---- file actions ------------------------------------------------------
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

  // ---- generator flows ---------------------------------------------------

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

  const handleSelectionExplain = useCallback((code, language) => {
    if (!code.trim()) return;
    const result = explainCode(code, language);
    setExplanation(result);
  }, []);

  const handleAiExplain = useCallback(async (code, language) => {
    if (!code.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await explainCodeWithAI(code, language);
      setExplanation(result);
    } catch (err) {
      setExplanation({ summary: `AI Error: ${err.message}`, lineByLine: [] });
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading]);

  // ---- run code ----------------------------------------------------------
  // Called by CodePanel's Run button. `payload` carries language + source
  // (and optionally a filename for nicer terminal output).
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

  const toggleLanguage = useCallback((lang) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        if (prev.length <= 1) return prev;
        return prev.filter((l) => l !== lang);
      }
      return [...prev, lang];
    });
  }, []);

  return (
    <div style={styles.container}>
      <TitleBar
        explorerVisible={explorerVisible}
        onToggleExplorer={() => setExplorerVisible((v) => !v)}
        terminalVisible={terminalVisible}
        onToggleTerminal={() => setTerminalVisible((v) => !v)}
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
              refreshKey={refreshKey}
            />
          )}
          <InstructionPanel
            instruction={instruction}
            onInstructionChange={setInstruction}
            onGenerate={handleGenerate}
            onAiGenerate={handleAiGenerate}
            aiLoading={aiLoading}
            selectedLanguages={selectedLanguages}
            onToggleLanguage={toggleLanguage}
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
    </div>
  );
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
