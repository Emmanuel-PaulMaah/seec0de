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
- "summary" should be 2–3 sentences covering: (1) what the code does (the GOAL), (2) the approach it takes, (3) any noteworthy technique. Avoid jargon when a simpler word works.
- "lineByLine" should explain EVERY non-trivial line. Group consecutive trivial lines (imports, blank lines, closing braces) into one entry where helpful.
- Each line entry's "explanation" should be 1–2 sentences. Reference variables/functions by name. If it's a tricky concept, briefly explain WHY (not just what).
- Skip pure whitespace, comment-only lines, and language boilerplate (like \`public class\` or \`int main\`) unless they're conceptually important.

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no extra text. The JSON must have this exact structure:
{
  "summary": "2-3 sentence plain-English summary of what the code does",
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
  return {
    summary: parsed.summary || '',
    lineByLine: parsed.lineByLine || [],
  };
}
