// Provider registry for AI requests.
//
// Two adapter families cover everything we ship:
//   'gemini' — Google's native Generative Language API schema
//   'openai' — any OpenAI-compatible POST {base}/chat/completions endpoint
//              (Groq today; OpenRouter, Cerebras, Mistral, DeepSeek, a local
//              Ollama/LM Studio server … are the same adapter + a base URL)
//
// Adding a provider is one object below plus a matching display entry in
// src/renderer/engine/aiProviders.js (label, key placeholder, signup link).
// The renderer never sees apiBase or models — it only needs the id.

const PROVIDERS = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/models',
    // Ordered: first model is primary, the rest are overload/network
    // fallbacks (same pattern as before multi-provider support).
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    keyEntryUrl: 'https://aistudio.google.com/app/apikey',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    kind: 'openai',
    apiBase: 'https://api.groq.com/openai/v1',
    // Free-tier catalogs churn (a model can disappear overnight), so the
    // second entry is a real fallback: a 404/missing-model error moves on.
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    maxOutputTokens: 8192,
    keyEntryUrl: 'https://console.groq.com/keys',
  },
};

const DEFAULT_PROVIDER = 'gemini';

function getProvider(id) {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, id) ? PROVIDERS[id] : null;
}

function listProviders() {
  return Object.values(PROVIDERS).map(({ id, label, kind, keyEntryUrl }) => ({
    id, label, kind, keyEntryUrl,
  }));
}

function normaliseProviderId(id) {
  return getProvider(id) ? id : DEFAULT_PROVIDER;
}

module.exports = {
  PROVIDERS,
  DEFAULT_PROVIDER,
  getProvider,
  listProviders,
  normaliseProviderId,
};
