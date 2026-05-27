// Settings store — single source of truth for user preferences that
// persist between launches. Backed by localStorage (renderer-only).
//
// Schema is versioned so we can migrate cleanly. Bump SCHEMA_VERSION when
// the shape changes meaningfully and add a `migrate()` branch.
//
// The Gemini API key itself lives in the main process (encrypted via
// safeStorage). The setSettingsApiKey passthrough below just forwards to
// the IPC bridge and refreshes the renderer-side hasApiKey() cache.

import { refreshHasApiKey } from './aiService';

const STORAGE_KEY    = 'seec0de.settings';
const SCHEMA_VERSION = 2;

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
  // List of lesson IDs the user has completed.
  completedLessons:    [],
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
  if (parsed && parsed.schemaVersion < 2) {
    // v1 -> v2: Add completedLessons
    parsed.completedLessons = parsed.completedLessons || [];
  }
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
// API key passthrough — stored securely in the main process via safeStorage.

export function getSettingsApiKey() {
  // We no longer return the raw key to the renderer for security.
  // The UI will just show "••••••••" if hasKey() is true.
  return '';
}

// Async under the hood but safe to call without `await` — fires the IPC
// then refreshes the sync `hasApiKey()` cache so the UI updates the next
// time it re-renders. Returns the promise for callers who want to await.
export function setSettingsApiKey(key) {
  return window.seecode.ai.setKey(key || '').then(() => refreshHasApiKey());
}
