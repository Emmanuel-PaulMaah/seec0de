// Settings + profiles store — single source of truth for everything that
// persists between launches. Backed by localStorage (renderer-only), so it
// works fully offline: no server, no network, nothing leaves the machine.
//
// ---------------------------------------------------------------------------
// Data model (schema v3)
// ---------------------------------------------------------------------------
// The store is now multi-profile ("local accounts"). One machine can hold
// several profiles; exactly one is "active" (logged in) at a time.
//
//   {
//     schemaVersion,          // 3
//     onboardingComplete,     // app-level: has the first profile been made
//     activeProfileId,        // which profile is currently signed in
//     profiles: [ Profile ]   // every local account on this machine
//   }
//
//   Profile = {
//     id, username, avatar, bio,
//     languagesUsing, languagesLearning,   // "languages I use / I'm learning"
//     pinHash,                              // optional local lock (see below)
//     experienceLevel, practicalLanguage, comparisonLanguages,
//     showFileExplorer, showTerminal, completedLessons,
//     createdAt, updatedAt,
//   }
//
// ---------------------------------------------------------------------------
// Backwards compatibility
// ---------------------------------------------------------------------------
// Older code (and most of the app) reads a *flat* settings object like
// `settings.practicalLanguage` / `settings.completedLessons`. `loadSettings()`
// still returns that exact flat shape — it's just the active profile's fields
// spread on top of the app-level ones. `updateSettings(patch)` routes each key
// to the right place (app-level vs active profile). So nothing downstream had
// to change to become profile-aware.
//
// ---------------------------------------------------------------------------
// PIN locks — honest framing
// ---------------------------------------------------------------------------
// A profile can be locked with a PIN so casual co-users of a *shared machine*
// can't open each other's progress. This is NOT real security: anyone with
// disk access can clear localStorage. We still never store the PIN in plain
// text — we keep a salted SHA-256 hash via the Web Crypto API. Treat it as a
// "please knock" lock, not a vault.
//
// ---------------------------------------------------------------------------
// Cloud sync later (option B)
// ---------------------------------------------------------------------------
// Every mutation funnels through the small createProfile/updateProfile/…
// helpers below, and each Profile already carries id/createdAt/updatedAt.
// That's the seam a future opt-in cloud-sync layer would hook into — it can
// push/pull whole profiles without the rest of the app knowing.

import { refreshHasApiKey } from './aiService';

const STORAGE_KEY    = 'seec0de.settings';
const SCHEMA_VERSION = 3;

// Fields that live on the app/store level, not on a profile.
const APP_LEVEL_KEYS = new Set(['schemaVersion', 'onboardingComplete', 'activeProfileId', 'profiles']);

// Default field values for a brand-new profile. `id`/`createdAt`/`updatedAt`
// are filled in by createProfile / normalizeProfile.
export const PROFILE_FIELD_DEFAULTS = Object.freeze({
  username:            '',
  avatar:             null,   // resized data-URL string, or null
  bio:                 '',
  languagesUsing:      [],     // language ids the learner already uses
  languagesLearning:   [],     // language ids the learner wants to learn
  pinHash:            null,   // { salt, hash, algo } | null
  // 'none' = "I haven't coded before" → chattier explanations.
  // 'some' = "I've written some code"  → terser, more idiomatic.
  experienceLevel:    null,
  // The language the user is *building in* — drives Run, default new-file
  // extension, and the first language tab in the generator.
  practicalLanguage:   'python',
  // Additional generator tabs shown alongside the practical language.
  comparisonLanguages: ['javascript'],
  // Whether the file explorer + terminal are visible by default.
  showFileExplorer:    false,
  showTerminal:        false,
  // List of lesson IDs the user has completed.
  completedLessons:    [],
});

const STORE_DEFAULTS = Object.freeze({
  schemaVersion:      SCHEMA_VERSION,
  // True once the user has completed (or explicitly skipped) onboarding for
  // the first time. Until this flips, the OnboardingModal shows on launch.
  onboardingComplete: false,
  activeProfileId:    null,
  profiles:           [],
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

// User-facing install + verification guides for Settings -> Toolchains.
// Keep these in sync with runnerService.js: the verification commands should
// prove the same executables the Run button will use.
export const TOOLCHAIN_GUIDES = Object.freeze({
  python: {
    label: 'Python',
    why: 'Runs .py files. seec0de uses the first working Python command it can find.',
    detects: {
      win: 'py, python, then python3',
      macos: 'python3, then python',
      linux: 'python3, then python',
    },
    install: {
      win: 'winget install --id Python.Python.3.14 -e --source winget --accept-package-agreements --accept-source-agreements',
      macos: 'brew install python',
      linux: 'sudo apt install python3 python3-pip',
    },
    verify: {
      win: [
        'where.exe py',
        'py --version',
        'py -c "print(\\"Python works\\")"',
      ],
      macos: [
        'which python3',
        'python3 --version',
        'python3 -c "print(\\"Python works\\")"',
      ],
      linux: [
        'which python3',
        'python3 --version',
        'python3 -c "print(\\"Python works\\")"',
      ],
    },
    pathHelp: {
      win: 'If Re-check still misses Python, close and reopen seec0de. If it still fails, reinstall Python with "Add python.exe to PATH" enabled or add the Python install folder to your user PATH.',
      macos: 'If Re-check still misses Python, restart seec0de. Homebrew usually prints the PATH line to add when its bin folder is not already on PATH.',
      linux: 'If Re-check still misses Python, restart seec0de and confirm python3 is available from a normal terminal.',
    },
    smokeTest: 'Create main.py with print("hello from Python"), press Run, and expect that text in Console.',
  },

  javascript: {
    label: 'Node.js (for JavaScript)',
    why: 'Runs .js files. seec0de looks for node on PATH.',
    detects: {
      win: 'node',
      macos: 'node',
      linux: 'node',
    },
    install: {
      win: 'winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements',
      macos: 'brew install node',
      linux: 'sudo apt install nodejs npm',
    },
    verify: {
      win: [
        'where.exe node',
        'node --version',
        'npm.cmd --version',
        'node -e "console.log(\\"Node works\\")"',
      ],
      macos: [
        'which node',
        'node --version',
        'npm --version',
        'node -e "console.log(\\"Node works\\")"',
      ],
      linux: [
        'which node',
        'node --version',
        'npm --version',
        'node -e "console.log(\\"Node works\\")"',
      ],
    },
    pathHelp: {
      win: 'If Re-check still misses Node, close and reopen seec0de. If node works in a new PowerShell but not here, restart seec0de so it inherits the updated PATH.',
      macos: 'If Re-check still misses Node, restart seec0de and follow any PATH line Homebrew printed after install.',
      linux: 'If Re-check still misses Node, restart seec0de and confirm node is available from a normal terminal.',
    },
    smokeTest: 'Create main.js with console.log("hello from Node"), press Run, and expect that text in Console.',
  },

  typescript: {
    label: 'tsx (for TypeScript)',
    why: 'Runs .ts files directly. Install Node.js first, then install tsx globally.',
    detects: {
      win: 'tsx or ts-node',
      macos: 'tsx or ts-node',
      linux: 'tsx or ts-node',
    },
    install: {
      win: 'npm.cmd install -g tsx',
      macos: 'npm install -g tsx',
      linux: 'npm install -g tsx',
    },
    verify: {
      win: [
        'where.exe tsx',
        'tsx.cmd --version',
        'tsx.cmd -e "console.log(\\"TypeScript works\\")"',
      ],
      macos: [
        'which tsx',
        'tsx --version',
        'tsx -e "console.log(\\"TypeScript works\\")"',
      ],
      linux: [
        'which tsx',
        'tsx --version',
        'tsx -e "console.log(\\"TypeScript works\\")"',
      ],
    },
    pathHelp: {
      win: 'If npm says it installed tsx but Re-check misses it, restart seec0de. If PowerShell blocks tsx.ps1, use tsx.cmd; seec0de can still run the command shim.',
      macos: 'If npm installs tsx but Re-check misses it, add the npm global bin folder to PATH, then restart seec0de.',
      linux: 'If npm installs tsx but Re-check misses it, add the npm global bin folder to PATH, then restart seec0de.',
    },
    smokeTest: 'Create main.ts with const msg: string = "hello from TypeScript"; console.log(msg), press Run, and expect that text in Console.',
  },

  c: {
    label: 'C compiler',
    why: 'Compiles and runs .c files. seec0de looks for gcc, clang, then MSVC cl.',
    detects: {
      win: 'gcc, clang, then cl',
      macos: 'gcc, clang, then cl',
      linux: 'gcc, clang, then cl',
    },
    install: {
      win: 'winget install --id MSYS2.MSYS2 -e --source winget --accept-package-agreements --accept-source-agreements; & "C:\\msys64\\usr\\bin\\bash.exe" -lc "pacman -S --needed --noconfirm mingw-w64-ucrt-x86_64-gcc"',
      macos: 'xcode-select --install',
      linux: 'sudo apt install build-essential',
    },
    verify: {
      win: [
        'where.exe gcc',
        'gcc --version',
      ],
      macos: [
        'which clang',
        'clang --version',
      ],
      linux: [
        'which gcc',
        'gcc --version',
      ],
    },
    pathCommand: {
      win: '$p="C:\\msys64\\ucrt64\\bin"; $u=[Environment]::GetEnvironmentVariable("Path","User"); if (-not $u) { $u="" }; if ($u -notlike "*$p*") { [Environment]::SetEnvironmentVariable("Path", (($u.TrimEnd(";") + ";" + $p).TrimStart(";")), "User") }',
    },
    pathHelp: {
      win: 'MSYS2 installs gcc under C:\\msys64\\ucrt64\\bin. If Re-check misses it, run the PATH command below, close seec0de, then reopen it.',
      macos: 'If Re-check still misses a compiler, finish the Command Line Tools installer and restart seec0de.',
      linux: 'If Re-check still misses gcc, restart seec0de and confirm gcc is available from a normal terminal.',
    },
    smokeTest: 'Create main.c with #include <stdio.h> and int main(){ printf("hello from C\\n"); }, press Run, and expect that text in Console.',
  },

  cpp: {
    label: 'C++ compiler',
    why: 'Compiles and runs .cpp files. seec0de looks for g++, clang++, then MSVC cl.',
    detects: {
      win: 'g++, clang++, then cl',
      macos: 'g++, clang++, then cl',
      linux: 'g++, clang++, then cl',
    },
    install: {
      win: 'winget install --id MSYS2.MSYS2 -e --source winget --accept-package-agreements --accept-source-agreements; & "C:\\msys64\\usr\\bin\\bash.exe" -lc "pacman -S --needed --noconfirm mingw-w64-ucrt-x86_64-gcc"',
      macos: 'xcode-select --install',
      linux: 'sudo apt install build-essential',
    },
    verify: {
      win: [
        'where.exe g++',
        'g++ --version',
      ],
      macos: [
        'which clang++',
        'clang++ --version',
      ],
      linux: [
        'which g++',
        'g++ --version',
      ],
    },
    pathCommand: {
      win: '$p="C:\\msys64\\ucrt64\\bin"; $u=[Environment]::GetEnvironmentVariable("Path","User"); if (-not $u) { $u="" }; if ($u -notlike "*$p*") { [Environment]::SetEnvironmentVariable("Path", (($u.TrimEnd(";") + ";" + $p).TrimStart(";")), "User") }',
    },
    pathHelp: {
      win: 'MSYS2 installs g++ under C:\\msys64\\ucrt64\\bin. If Re-check misses it, run the PATH command below, close seec0de, then reopen it.',
      macos: 'If Re-check still misses a compiler, finish the Command Line Tools installer and restart seec0de.',
      linux: 'If Re-check still misses g++, restart seec0de and confirm g++ is available from a normal terminal.',
    },
    smokeTest: 'Create main.cpp with #include <iostream> and int main(){ std::cout << "hello from C++\\n"; }, press Run, and expect that text in Console.',
  },
});

// Sensible default comparison partner for each practical language.
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
// small utils

const now = () => new Date().toISOString();
const clone = (obj) => (obj == null ? obj : JSON.parse(JSON.stringify(obj)));

function genId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `p_${crypto.randomUUID()}`;
    }
  } catch { /* fall through */ }
  return `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Coerce an arbitrary parsed object into a well-formed profile: known fields
// only, defaults filled in, stable id/timestamps.
function normalizeProfile(p = {}) {
  const out = { ...PROFILE_FIELD_DEFAULTS };
  for (const key of Object.keys(PROFILE_FIELD_DEFAULTS)) {
    if (p[key] !== undefined) out[key] = p[key];
  }
  out.id        = p.id || genId();
  out.createdAt = p.createdAt || now();
  out.updatedAt = p.updatedAt || now();
  return out;
}

// ---------------------------------------------------------------------------
// load / migrate / save (raw store)

function migrate(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ...STORE_DEFAULTS, profiles: [] };

  // Already v3+: just normalize shape.
  if ((parsed.schemaVersion || 0) >= 3) {
    return {
      ...STORE_DEFAULTS,
      ...parsed,
      schemaVersion:   SCHEMA_VERSION,
      profiles:        Array.isArray(parsed.profiles) ? parsed.profiles.map(normalizeProfile) : [],
      activeProfileId: parsed.activeProfileId || null,
    };
  }

  // v1 / v2 → v3. The old store was a single flat settings blob. If the user
  // had actually set the app up (finished onboarding, or has progress), fold
  // that into one default profile so nothing is lost. Otherwise start clean
  // and let onboarding create the first profile.
  const hadRealData =
    !!parsed.onboardingComplete ||
    (Array.isArray(parsed.completedLessons) && parsed.completedLessons.length > 0);

  if (!hadRealData) {
    return { ...STORE_DEFAULTS, profiles: [] };
  }

  const profile = normalizeProfile({
    username:            'you',
    experienceLevel:     parsed.experienceLevel ?? null,
    practicalLanguage:   parsed.practicalLanguage || 'python',
    comparisonLanguages: parsed.comparisonLanguages || defaultComparisonFor(parsed.practicalLanguage || 'python'),
    languagesUsing:      dedupeLangs([parsed.practicalLanguage, ...(parsed.comparisonLanguages || [])]),
    showFileExplorer:    !!parsed.showFileExplorer,
    showTerminal:        !!parsed.showTerminal,
    completedLessons:    parsed.completedLessons || [],
  });

  return {
    schemaVersion:   SCHEMA_VERSION,
    onboardingComplete: true,
    activeProfileId: profile.id,
    profiles:        [profile],
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...STORE_DEFAULTS, profiles: [] };
    return migrate(JSON.parse(raw));
  } catch {
    return { ...STORE_DEFAULTS, profiles: [] };
  }
}

function saveStore(store) {
  const cleaned = {
    schemaVersion:   SCHEMA_VERSION,
    onboardingComplete: !!store.onboardingComplete,
    activeProfileId: store.activeProfileId || null,
    profiles:        Array.isArray(store.profiles) ? store.profiles.map(normalizeProfile) : [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  return cleaned;
}

// Resolve the active profile object *inside* a given store (mutable ref).
function activeProfileRef(store) {
  if (!store.profiles || store.profiles.length === 0) return null;
  return store.profiles.find((p) => p.id === store.activeProfileId) || store.profiles[0];
}

// Flatten the store into the legacy flat settings object the rest of the app
// consumes. When no profile exists yet we still return a valid shape so the
// UI behind the onboarding/gate overlays never crashes.
function flatten(store) {
  const active = activeProfileRef(store);
  const base = active ? active : { ...PROFILE_FIELD_DEFAULTS };
  return {
    ...base,
    schemaVersion:      SCHEMA_VERSION,
    onboardingComplete: !!store.onboardingComplete,
    activeProfileId:    active ? active.id : null,
  };
}

// ---------------------------------------------------------------------------
// public: flat settings (backwards-compatible surface)

export function loadSettings() {
  return flatten(loadStore());
}

// Apply a patch, routing each key to app-level or the active profile. Creates
// a default profile on demand if a profile-level key is written before any
// profile exists (defensive — normal flows create the profile in onboarding).
export function updateSettings(patch = {}) {
  const store = loadStore();

  const profilePatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'schemaVersion' || key === 'profiles') continue;
    if (key === 'onboardingComplete') { store.onboardingComplete = !!value; continue; }
    if (key === 'activeProfileId')    { store.activeProfileId = value || null; continue; }
    profilePatch[key] = value;
  }

  if (Object.keys(profilePatch).length > 0) {
    let active = activeProfileRef(store);
    if (!active) {
      active = normalizeProfile({});
      store.profiles.push(active);
      store.activeProfileId = active.id;
    }
    Object.assign(active, profilePatch, { updatedAt: now() });
  }

  saveStore(store);
  return flatten(store);
}

// Kept for compatibility — behaves like updateSettings (apply these fields).
export function saveSettings(next = {}) {
  return updateSettings(next);
}

export function resetOnboarding() {
  const store = loadStore();
  store.onboardingComplete = false;
  saveStore(store);
  return flatten(store);
}

// ---------------------------------------------------------------------------
// public: profile management

export function listProfiles() {
  return loadStore().profiles.map(clone);
}

export function getActiveProfile() {
  const active = activeProfileRef(loadStore());
  return active ? clone(active) : null;
}

export function getActiveProfileId() {
  const active = activeProfileRef(loadStore());
  return active ? active.id : null;
}

export function createProfile(fields = {}, { activate = true } = {}) {
  const store = loadStore();
  const profile = normalizeProfile({ ...fields, id: genId(), createdAt: now(), updatedAt: now() });
  store.profiles.push(profile);
  if (activate) store.activeProfileId = profile.id;
  saveStore(store);
  return clone(profile);
}

export function updateProfile(id, patch = {}) {
  const store = loadStore();
  const profile = store.profiles.find((p) => p.id === id);
  if (!profile) return null;
  const { id: _ignoreId, createdAt: _ignoreCreated, ...rest } = patch;
  Object.assign(profile, rest, { updatedAt: now() });
  saveStore(store);
  return clone(profile);
}

export function deleteProfile(id) {
  const store = loadStore();
  const idx = store.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return flatten(store);
  store.profiles.splice(idx, 1);
  if (store.activeProfileId === id) {
    store.activeProfileId = store.profiles[0] ? store.profiles[0].id : null;
  }
  saveStore(store);
  return flatten(store);
}

export function switchProfile(id) {
  const store = loadStore();
  if (store.profiles.some((p) => p.id === id)) {
    store.activeProfileId = id;
    saveStore(store);
  }
  return flatten(store);
}

// Case-insensitive username collision check (optionally excluding one id, so
// a profile can keep its own name while editing).
export function usernameExists(name, exceptId = null) {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return false;
  return loadStore().profiles.some(
    (p) => p.id !== exceptId && String(p.username || '').trim().toLowerCase() === target
  );
}

// Suggest a unique username from a base (used when a learner skips naming).
export function suggestUsername(base = 'learner') {
  const root = String(base || 'learner').trim() || 'learner';
  if (!usernameExists(root)) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}${n}`;
    if (!usernameExists(candidate)) return candidate;
  }
  return `${root}${Date.now().toString(36)}`;
}

// Finalise onboarding: edit the active profile if one exists (rerun), else
// create + activate the first profile. Always flips onboardingComplete on.
export function commitOnboarding(fields = {}) {
  const store = loadStore();
  let active = activeProfileRef(store);
  if (active) {
    const { id: _i, createdAt: _c, ...rest } = fields;
    Object.assign(active, rest, { updatedAt: now() });
  } else {
    active = normalizeProfile({ ...fields, id: genId(), createdAt: now(), updatedAt: now() });
    store.profiles.push(active);
    store.activeProfileId = active.id;
  }
  store.onboardingComplete = true;
  saveStore(store);
  return flatten(store);
}

// ---------------------------------------------------------------------------
// public: PIN locks (salted SHA-256 via Web Crypto — a lock, not a vault)

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSaltHex(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function profileHasPin(id) {
  const profile = loadStore().profiles.find((p) => p.id === id);
  return !!(profile && profile.pinHash && profile.pinHash.hash);
}

export async function setProfilePin(id, pin) {
  const salt = randomSaltHex();
  const hash = await sha256Hex(`${salt}:${String(pin)}`);
  return updateProfile(id, { pinHash: { salt, hash, algo: 'sha256' } });
}

export function clearProfilePin(id) {
  return updateProfile(id, { pinHash: null });
}

export async function verifyProfilePin(id, pin) {
  const profile = loadStore().profiles.find((p) => p.id === id);
  if (!profile || !profile.pinHash || !profile.pinHash.hash) return true; // no lock
  const hash = await sha256Hex(`${profile.pinHash.salt}:${String(pin)}`);
  return hash === profile.pinHash.hash;
}

// ---------------------------------------------------------------------------
// helpers

function dedupeLangs(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

// ---------------------------------------------------------------------------
// API key passthrough — stored securely in the main process via safeStorage.
// The key is machine-level (shared by every local profile), not per-profile.

export function getSettingsApiKey() {
  // We no longer return the raw key to the renderer for security.
  return '';
}

// Async under the hood but safe to call without `await` — fires the IPC then
// refreshes the sync `hasApiKey()` cache so the UI updates on next render.
export function setSettingsApiKey(key) {
  return window.seecode.ai.setKey(key || '').then(() => refreshHasApiKey());
}
