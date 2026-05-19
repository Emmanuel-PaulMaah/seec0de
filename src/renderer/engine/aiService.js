const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function getApiKey() {
  return localStorage.getItem('seec0de_gemini_key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('seec0de_gemini_key', key);
}

export function hasApiKey() {
  return !!getApiKey();
}

async function tryModel(model, apiKey, body) {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Gemini API error (${res.status})`;
    const isOverloaded = res.status === 429 || res.status === 503 || /overloaded|demand|capacity|quota/i.test(msg);
    throw Object.assign(new Error(msg), { isOverloaded });
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}

async function callGemini(prompt, systemInstruction) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key set. Add your free Gemini API key in Settings.');

  const body = {
    system_instruction: {
      parts: { text: systemInstruction }
    },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  };

  for (let i = 0; i < MODELS.length; i++) {
    try {
      return await tryModel(MODELS[i], apiKey, body);
    } catch (err) {
      if (err.isOverloaded && i < MODELS.length - 1) continue;
      throw err;
    }
  }
}

const CODE_SYSTEM_PROMPT = `You are SEEC0DE, an expert programming instructor and code generator. Your purpose is to help people learn to code by generating clear, well-structured, production-quality code.

RULES:
- Generate REAL, WORKING, COMPLETE code — never pseudocode, never placeholders, never "TODO" stubs.
- Write idiomatic code that follows each language's conventions and best practices.
- DO NOT write explanatory or teaching comments. The code itself, with good names, must be the lesson. A separate "Explainer" panel handles natural-language explanations — you must not duplicate it inside the source.
- The ONLY comments you may include are short SECTION-MARKER comments that label clearly separable phases of the program (e.g. \`# --- setup ---\`, \`// === main ===\`, \`// --- helpers ---\`). Use them sparingly and only when the program has 2+ distinct phases. Never inline-comment a single line.
- No "WHY" comments, no "WHAT" comments, no descriptive comments above functions, no TODOs, no shebang explanations, no licence headers.
- Include a main entry point so the code can run immediately.
- Use meaningful variable and function names so the code reads naturally without comments.
- Handle edge cases where it's natural to do so (e.g., empty input, division by zero).
- Keep code focused and readable — avoid over-engineering.

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no extra text. The JSON must have this exact structure:
{
  "pseudocode": "A clear, step-by-step pseudocode breakdown of the algorithm/logic using PROGRAM, FUNCTION, SET, IF/THEN, FOR, WHILE, RETURN, DISPLAY, END keywords",
  "code": {
    "<language_id>": "complete working code for that language"
  }
}

Language IDs you may receive: python, javascript, typescript, java, cpp, c, csharp, go, rust.
Only include languages that are requested in the prompt.`;

const EXPLAIN_SYSTEM_PROMPT = `You are SEEC0DE, an expert programming tutor who explains code in plain English so beginners can truly understand it.

RULES:
- Start with a high-level summary of what this SPECIFIC code accomplishes — mention actual function names, variable names, and what the program does in context (1-3 sentences).
- Then provide a line-by-line breakdown — every meaningful line gets its own explanation.
- Skip blank lines and lone closing braces/brackets in the breakdown.
- Be CONTEXTUAL and SPECIFIC: say "defines a function named 'viewTasks' that retrieves and displays the user's task list" — NOT "defines a function — functions are reusable blocks of code."
- Reference actual names, values, and purpose from the code. If a variable is called 'maxRetries', say "sets the maximum number of retry attempts to 3" not "assigns a value to a variable."
- Explain HOW each line connects to the bigger picture of what this code does.
- If the code has bugs or anti-patterns, mention them kindly with the correct approach.
- Do NOT give generic textbook definitions of language features. The user can hover keywords for that.

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no extra text. The JSON must have this exact structure:
{
  "summary": "A plain-English overview of what this specific code does",
  "lineByLine": [
    { "line": "the exact code line", "explanation": "what this specific line does in context" }
  ]
}`;

export async function generateCodeWithAI(instruction, selectedLanguages) {
  const languageList = selectedLanguages.join(', ');
  const prompt = `Generate code for the following instruction in these languages: ${languageList}.

Instruction: "${instruction}"

Remember: respond with ONLY valid JSON matching the required format. Include pseudocode and code for each requested language.`;

  const raw = await callGemini(prompt, CODE_SYSTEM_PROMPT);

  // Strip markdown fences if present
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
