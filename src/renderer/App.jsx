import React, { useState, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import ModeSelector from './components/ModeSelector';
import InstructionPanel from './components/InstructionPanel';
import CodePanel from './components/CodePanel';
import ExplanationSidebar from './components/ExplanationSidebar';
import PasteCodePanel from './components/PasteCodePanel';
import { generateCode } from './engine/codeGenerator';
import { explainCode } from './engine/codeExplainer';
import { generateCodeWithAI, explainCodeWithAI } from './engine/aiService';

export default function App() {
  const [mode, setMode] = useState('instruct');
  const [selectedLanguages, setSelectedLanguages] = useState(['python', 'javascript']);
  const [instruction, setInstruction] = useState('');
  const [generatedCode, setGeneratedCode] = useState({ pseudocode: '', code: {} });
  const [pastedCode, setPastedCode] = useState('');
  const [pasteLanguage, setPasteLanguage] = useState('javascript');
  const [explanation, setExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleGenerate = useCallback(() => {
    if (!instruction.trim()) return;
    const result = generateCode(instruction, selectedLanguages);
    setGeneratedCode(result);
  }, [instruction, selectedLanguages]);

  const handleAiGenerate = useCallback(async () => {
    if (!instruction.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await generateCodeWithAI(instruction, selectedLanguages);
      setGeneratedCode(result);
    } catch (err) {
      setExplanation({ summary: `AI Error: ${err.message}`, lineByLine: [] });
    } finally {
      setAiLoading(false);
    }
  }, [instruction, selectedLanguages, aiLoading]);

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
      <TitleBar />
      <ModeSelector mode={mode} onModeChange={setMode} />

      <div style={styles.workspace}>
        {mode === 'instruct' ? (
          <>
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
            />
          </>
        ) : (
          <PasteCodePanel
            code={pastedCode}
            onCodeChange={setPastedCode}
            language={pasteLanguage}
            onLanguageChange={setPasteLanguage}
            onSelectionExplain={handleSelectionExplain}
            onAiExplain={handleAiExplain}
            aiLoading={aiLoading}
          />
        )}

        <ExplanationSidebar explanation={explanation} />
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
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
};
