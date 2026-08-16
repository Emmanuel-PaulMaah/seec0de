// Renderer-side AI bridge.
//
// The actual Gemini call and the API key live in the main process (see
// src/main/aiService.js — uses Electron `safeStorage` to encrypt the key
// on disk, and runs the HTTPS request from Node so the renderer never
// touches the network directly).
//
// This module exposes a small façade so the rest of the renderer can
// keep its existing call sites unchanged:
//
//   hasApiKey()                     → sync boolean   (cached)
//   refreshHasApiKey()              → async, re-reads from main
//   generateCodeWithAI(...)         → async string-of-JSON parsed
//   explainCodeWithAI(...)          → async string-of-JSON parsed
//   explainErrorWithAI(...)         → async string-of-JSON parsed
//
// `hasApiKey()` is intentionally synchronous because dozens of UI sites
// branch on it during render. We hydrate the cache on module load and
// also refresh it whenever the key is saved (see engine/settings.js).

let cachedHasKey = false;
const subscribers = new Set();

function notify() {
  for (const fn of subscribers) {
    try { fn(cachedHasKey); } catch { /* ignore subscriber errors */ }
  }
}

// One-time migration: pre-v3.2.0 installs stored the Gemini key in
// localStorage under 'seec0de_gemini_key' (plain text). Move it into
// the encrypted main-process store on first boot of v3.2.0+, then wipe
// the localStorage copy so the plaintext key isn't left lying around.
async function migrateLegacyKey() {
  try {
    const legacy = localStorage.getItem('seec0de_gemini_key');
    if (!legacy) return;
    const alreadySet = await window.seecode.ai.hasKey();
    if (!alreadySet) {
      await window.seecode.ai.setKey(legacy);
    }
    localStorage.removeItem('seec0de_gemini_key');
  } catch {
    // best-effort migration — never blocks app boot
  }
}

// Hydrate on module load. Best-effort: the first render may see
// `false` even when a key exists, but the second tick fixes it and
// any subscriber (SettingsDrawer, InstructionPanel) re-renders.
if (typeof window !== 'undefined' && window.seecode?.ai) {
  (async () => {
    await migrateLegacyKey();
    try {
      cachedHasKey = !!(await window.seecode.ai.hasKey());
    } catch {
      cachedHasKey = false;
    }
    notify();
  })();
}

export function hasApiKey() {
  return cachedHasKey;
}

export async function refreshHasApiKey() {
  try {
    cachedHasKey = !!(await window.seecode.ai.hasKey());
  } catch {
    cachedHasKey = false;
  }
  notify();
  return cachedHasKey;
}

// Subscribe to key-presence changes. Returns an unsubscribe function.
// Components can wire this into a `useState` + `useEffect` pair to
// re-render when the key is saved/cleared.
export function subscribeHasApiKey(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

async function callGemini(prompt, systemInstruction) {
  return await window.seecode.ai.call({ prompt, systemInstruction });
}

const CODE_SYSTEM_PROMPT = `You are SEEC0DE, an expert programming instructor and code generator. Your purpose is to help people learn to code by generating clear, well-structured, production-quality code.

RULES:
- Generate pseudocode that is language-agnostic, uses clear English keywords (PROGRAM, FUNCTION, IF/THEN/ELSE, FOR, WHILE, RETURN, DISPLAY, SET, CALL), and is INDENTED for readability.
- Pseudocode should be detailed enough that a beginner can map it line-by-line to the actual code.
- For each requested language, generate IDIOMATIC, PRODUCTION-QUALITY code:
  * Use proper naming conventions for that language
  * Include necessary imports/includes/using statements
  * Wrap in a main function/entry point where appropriate
  * Use type hints/annotations where idiomatic (Python type hints, TypeScript types, etc.)
  * Add docstrings/comments for functions
  * Handle obvious edge cases (empty input, etc.)
- Code MUST be runnable as-is (no placeholders like "// your code here").
- Ensure pseudocode and all language implementations are LOGICALLY EQUIVALENT — they solve the exact same problem with the same approach.

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no extra text. The JSON must have this exact structure:
{
  "pseudocode": "the pseudocode as a string",
  "code": {
    "python": "the python code as a string",
    "javascript": "the javascript code as a string"
  }
}

Language IDs you may receive: python, javascript, typescript, java, cpp, c, csharp, go, rust.
Only include languages that are requested in the prompt.`;

const ERROR_SYSTEM_PROMPT = `You are SEEC0DE, an expert programming tutor who translates raw compiler/interpreter errors into plain English a beginner can act on.

RULES:
- Read the user's source code AND the raw stderr together. Your explanation must reference the user's ACTUAL variable names, function names, line numbers, and values — not generic textbook examples.
- Title: ≤ 9 words, plain English, says what went wrong in this code's context (e.g. "Tried to read .name on undefined"). No error-class jargon ("ReferenceError", "TS2322") in the title.
- Plain: 1–3 sentences, conversational, no jargon. Explain WHY this error happened in the user's code, not what the error class means in general. If a line number is in the stderr, reference it.
- Fixes: 2–5 concrete, imperative actions ("Add a guard like \`if (user) { … }\` before line 7"). Each fix should be directly applicable to the user's actual code. Use single backticks for inline code/values.
- If the error is a runtime crash with a stack trace, focus on the deepest user-code frame, not framework internals.
- If the stderr is empty, malformed, or clearly not an error (e.g. just a warning), still produce a best-effort explanation — never refuse.
- Never invent error messages the user didn't actually hit. Stay grounded in the stderr you were given.

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no extra text. The JSON must have this exact structure:
{
  "title": "short plain-English headline",
  "plain": "1–3 sentence explanation referencing the user's actual code",
  "fixes": ["concrete fix #1", "concrete fix #2", "concrete fix #3"]
}`;

const EXPLAIN_SYSTEM_PROMPT = `You are SEEC0DE, an expert programming tutor who explains code in plain English so beginners can truly understand it.

RULES:
- Be conversational and encouraging — write like you're explaining to a curious friend, not lecturing.
- "summary" should be 1–2 brief sentences covering: (1) what the code does (the GOAL), (2) the approach it takes, (3) any noteworthy technique. Always avoid jargon when a simpler word works.
- "lineByLine" should explain EVERY non-trivial line. Group consecutive trivial lines (imports, blank lines, closing braces) into one entry where helpful. Do not start explanation by saying "this line", just explain.
- Each line entry's "explanation" should be 1 sentence. Reference variables/functions by name. If it's a tricky concept, briefly explain WHY (not just what).
- Skip pure whitespace, comment-only lines, and language boilerplate (like \`public class\` or \`int main\`) unless they're conceptually important.

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no extra text. The JSON must have this exact structure:
{
  "summary": "1-2 sentence plain-English summary of what the code does",
  "lineByLine": [
    { "line": <line_number>, "code": "<the actual line>", "explanation": "<plain English explanation>" }
  ]
}`;

export async function generateCodeWithAI(instruction, languages) {
  const langList = languages.join(', ');
  const prompt = `Generate code for this instruction in the following languages: ${langList}.

Instruction: "${instruction}"

Remember: respond with ONLY valid JSON matching the required format. Include pseudocode and code for each of these languages: ${langList}.`;

  const raw = await callGemini(prompt, CODE_SYSTEM_PROMPT);

  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned);
  return {
    pseudocode: parsed.pseudocode || '',
    code: parsed.code || {},
  };
}

// Caps so the prompt stays small, fast, and cheap. The error translator is
// a best-effort enhancement on top of the always-visible raw stderr, so we
// don't need to ship the entire log/source — just enough context for the
// model to point at the right line.
const ERROR_STDERR_CAP = 4000;
const ERROR_SOURCE_CAP = 8000;

/**
 * Ask Gemini to translate an unfamiliar stderr blob into a beginner-friendly
 * card. Used as a fallback when the offline regex translator returns no
 * matches. Returns `{ title, plain, fixes }` shaped the same as offline cards
 * so the UI can render them through the exact same component.
 */
export async function explainErrorWithAI(stderr, code, language) {
  const trimmedErr  = String(stderr || '').slice(0, ERROR_STDERR_CAP);
  const trimmedSrc  = String(code   || '').slice(0, ERROR_SOURCE_CAP);
  const lang = language || 'unknown';

  const prompt = `A learner ran this ${lang} code and it failed. Translate the error into a beginner-friendly card that points at THEIR code.

--- their ${lang} source ---
${trimmedSrc || '(no source provided)'}

--- raw stderr from the runtime/compiler ---
${trimmedErr || '(empty stderr)'}

Remember: respond with ONLY valid JSON matching the required {title, plain, fixes} format. Reference the learner's actual names and line numbers — no generic textbook explanations.`;

  const raw = await callGemini(prompt, ERROR_SYSTEM_PROMPT);

  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned);
  return {
    title: String(parsed.title || 'Something went wrong').trim(),
    plain: String(parsed.plain || '').trim(),
    fixes: Array.isArray(parsed.fixes) ? parsed.fixes.map((f) => String(f).trim()).filter(Boolean) : [],
  };
}

// ---------------------------------------------------------------------------
// Build projects (Build Panel → “Build with AI”)
//
// The learner types “build a calculator” and Gemini designs a guided project
// on the spot. The system prompt demands the exact buildProjects.js schema
// (see data/buildProjects.js), and sanitizeGeneratedProject() there re-checks
// the shape, so a sloppy AI response degrades to a friendly error instead of
// a broken build. The returned object is the raw parsed JSON; the data layer
// owns validation.

const BUILD_PROJECT_SYSTEM_PROMPT = `You are SEEC0DE, an expert programming instructor who designs guided, step-by-step build projects for beginners.

The learner will build a real project in an open folder. Every step you design must be objectively VERIFIABLE: its \`checks\` must be true once the learner finishes that step and false before it.

RULES:
- Language: pick exactly ONE of: python, javascript, typescript. Default to python for CLI-style apps; javascript/typescript for anything with npm packages or multiple modules.
- Projects can be MULTI-FILE: \`scaffold\` may contain several starter files (an LMS, a to-do web app, a note-taking CLI with a storage module, …). Keep it to 2-5 files, each with 1-2 TODO comments. Simple builds (calculator, quiz) stay single-file.
- Each step targets exactly ONE file (its \`file\`), and the step's \`solution\` is that file's COMPLETE new content after the step (cumulative for that file). Never list more than one file per step.
- \`scaffold\` is a tiny starter file with 1-2 TODO comments. The first step's task starts from the scaffold.
- Produce 3-7 steps. Each step adds ONE clear skill: a function, a data structure, a fix, a feature, or a package install.
- When a step needs a dependency or shell setup (e.g. \`npm init -y\`, \`npm install express\`), add \`setup\`: an array of shell command strings run ONCE in the project folder when that step becomes current. Project-level \`setup\` (also an array) runs once at the very start — use it for \`npm init -y\` or pip installs the whole project needs.
- Each step must include:
  * \`task\` — plain English; tells the learner exactly what to add and what output to expect (e.g. "expect Score: 2/3").
  * \`file\` — the target file (any scaffold file, or a new file the learner must create).
  * \`examples\` — 1-2 small code snippets ({label, code}) showing the key lines.
  * \`hints\` — 1-3 short plain-English hints.
  * \`checks\` — 2-4 checks verifying the step. Prefer content checks (fileContains, hasFunction, fileCount) plus one runOutput or runCommand check.
  * \`solution\` — the COMPLETE target file content after this step. Every check MUST pass against this solution.
- check types you may use (all JSON objects):
  {"type": "fileExists", "file": "server.js"}
  {"type": "fileContains", "file": "server.js", "pattern": "const express", "mode": "string"}   — pattern is a REGEX unless \`mode\` is \"string\"
  {"type": "fileCount", "file": "models/lesson.js", "pattern": "class ", "atLeast": 1}
  {"type": "hasFunction", "file": "server.js", "name": "startServer"}
  {"type": "runOutput", "file": "server.js", "expect": "Listening on 3000", "match": "contains"}   — expect must appear VERBATIM in stdout
  {"type": "runPasses", "file": "main.py"}
  {"type": "runCommand", "command": "npm ls express --depth=0", "expect": "express", "match": "contains"}   — run a shell command in the project folder, compare stdout; great for verifying installs
- runOutput \`expect\` values MUST appear verbatim in what the step's solution prints, using a literal string in the print/console.log call (e.g. print("Total: 15")) so output is deterministic.
- runCommand is for setup verification ("is the package installed?") — keep the command simple and idempotent, and set \`expect\` to the literal stdout it prints (empty string when it prints nothing).
- Patterns must be simple, literal-ish regexes matching the learner's likely code. Escape regex special characters properly.
- Keep all text short and beginner-friendly.

RESPONSE FORMAT:
Respond with ONLY a valid JSON object — no markdown, no code fences, no extra text. Exact structure:
{
  "title": "short project name",
  "language": "python", "javascript" or "typescript",
  "summary": "one sentence",
  "brief": "what the learner builds, in one sentence",
  "concepts": ["functions", "loops"],
  "scaffold": [{ "file": "main.py", "content": "..." }, { "file": "models/lesson.py", "content": "..." }],
  "setup": ["npm init -y", "npm install express"],
  "steps": [
    {
      "title": "step title",
      "task": "...",
      "file": "main.py",
      "examples": [{ "label": "...", "code": "..." }],
      "hints": ["...", "..."],
      "setup": ["npm install express"],
      "checks": [ ... ],
      "solution": "complete target file content after this step"
    }
  ]
}`;

/**
 * Ask Gemini to design a guided build project from a plain-English request
 * (e.g. “build a calculator”). Returns the parsed JSON project object;
 * validation happens in data/buildProjects.js (sanitizeGeneratedProject).
 * Throws a friendly error when the response isn’t usable JSON.
 */
export async function generateBuildProjectWithAI(prompt) {
  const p = `Design a guided build project for this request: "${prompt}"

Remember: respond with ONLY valid JSON matching the required format.`;

  const raw = await callGemini(p, BUILD_PROJECT_SYSTEM_PROMPT);

  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned an invalid response — try again or rephrase your request.');
  }
}

export async function explainCodeWithAI(code, language) {
  const prompt = `Explain the following ${language} code in plain English, line by line.

\`\`\`${language}
${code}
\`\`\`

Remember: respond with ONLY valid JSON matching the required format.`;

  const raw = await callGemini(prompt, EXPLAIN_SYSTEM_PROMPT);

  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned);

  // Normalise the AI's per-line shape to the offline explainer's shape so
  // ExplanationSidebar can render either source uniformly.
  //
  //   AI emits     → { line: <number>, code: "<actual line>", explanation }
  //   Offline emits → { line: "<actual line>", explanation }
  //
  // The sidebar's accordion header reads `item.line`, so without this
  // mapping the AI path showed bare line numbers in the header instead
  // of the code being explained. Prefer the AI's `code` field; fall
  // back to `line` if it's already a string (so a future AI prompt
  // change or an offline-style input passes through unchanged).
  const lineByLine = (Array.isArray(parsed.lineByLine) ? parsed.lineByLine : []).map((item) => {
    const codeText =
      typeof item?.code === 'string' && item.code.length > 0
        ? item.code
        : typeof item?.line === 'string'
          ? item.line
          : String(item?.line ?? '');
    return {
      line: codeText,
      explanation: String(item?.explanation ?? ''),
    };
  });

  return {
    summary: parsed.summary || '',
    lineByLine,
  };
}
