// Settings store — single source of truth for user preferences that
// persist between launches. Backed by localStorage (renderer-only).
//
// Schema is versioned so we can migrate cleanly. Bump SCHEMA_VERSION when
// the shape changes meaningfully and add a `migrate()` branch.
//
// IMPORTANT: the Gemini API key keeps using its legacy key
// (`seec0de_gemini_key`) so aiService.js continues to work without changes.
// Settings.apiKey is just a convenience pass-through that reads/writes the
// same legacy key under the hood.

import { getApiKey, setApiKey } from './aiService';

const STORAGE_KEY    = 'seec0de.settings';
const SCHEMA_VERSION = 1;

const DEFAULTS = Object.freeze({
  schemaVersion:       SCHEMA_VERSION,
  // True once the user has completed (or explicitly skipped) onboarding.
  // Until this flips, the OnboardingModal shows on every launch.
  onboardingComplete:  false,
  // 'none' = "I haven't coded before" → chattier explanations.
  // 'some' = "I've written some code"  → terser, more idiomatic.
  experienceLevel:     null,
  // The language the user is *building in* — drives Run, default new-file
  // extension, and the first language tab in the generator.
  practicalLanguage:   'python',
  // Additional generator tabs shown alongside the practical language so the
  // learner can see "the same algorithm in another syntax." Keep this short
  // (1–2 entries) — multi-language is pedagogy, not a checkbox of doom.
  comparisonLanguages: ['javascript'],
  // Whether the file explorer + terminal are visible by default. Off for
  // beginners — they have no files yet. Power users flip these on.
  showFileExplorer:    false,
  showTerminal:        false,
});

// Languages currently supported by runnerService.js. The onboarding picker
// is scoped to these so the Run button works on day one for whichever
// language a learner picks.
export const RUNNABLE_LANGUAGES = Object.freeze([
  { id: 'python',     label: 'Python',     blurb: 'Beginner-friendly, huge ecosystem.' },
  { id: 'javascript', label: 'JavaScript', blurb: 'Runs everywhere — web, server, scripts.' },
  { id: 'typescript', label: 'TypeScript', blurb: 'JavaScript with type-checking.' },
  { id: 'cpp',        label: 'C++',        blurb: 'Compiled, fast, used in games & systems.' },
  { id: 'c',          label: 'C',          blurb: 'The language most other languages are built on.' },
]);

// Sensible default comparison partner for each practical language. Picked
// to maximise the "look — same algorithm, different syntax" lesson.
const DEFAULT_COMPARISON = {
  python:     ['javascript'],
  javascript: ['python'],
  typescript: ['javascript'],
  c:          ['cpp'],
  cpp:        ['c'],
};

export function defaultComparisonFor(practicalLang) {
  return DEFAULT_COMPARISON[practicalLang] || ['javascript'];
}

// ---------------------------------------------------------------------------
// load / save / update

function migrate(parsed) {
  // No migrations yet (we are at v1). Future:
  //   if (parsed.schemaVersion < 2) { ...rename/move fields... }
  return { ...DEFAULTS, ...parsed, schemaVersion: SCHEMA_VERSION };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(next) {
  const cleaned = { ...DEFAULTS, ...next, schemaVersion: SCHEMA_VERSION };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function updateSettings(patch) {
  return saveSettings({ ...loadSettings(), ...patch });
}

export function resetOnboarding() {
  return updateSettings({ onboardingComplete: false });
}

// ---------------------------------------------------------------------------
// API key passthrough — keeps the legacy storage key for backwards compat.

export function getSettingsApiKey() {
  return getApiKey();
}

export function setSettingsApiKey(key) {
  setApiKey(key || '');
}
