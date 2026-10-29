// Display metadata for every AI provider the app can talk to.
//
// The network side lives in src/main/aiProviders.js; this file is purely
// what the UI needs to render a picker and guide the user to a key. Keep the
// `id`s in sync between the two — that's the only contract.
//
// `keyPattern` / `keyFromText` are a fast local gate so obviously-partial
// pastes never hit the network. They are intentionally lenient: a key that
// passes still has to survive the live probe before Save unlocks.

export const AI_PROVIDERS = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    privacyLabel: 'Google',
    keyPlaceholder: 'AIza… or AQ…',
    keyHint: 'Keys start with “AIza” (legacy) or “AQ.” (new). Make sure you copied the whole key.',
    keyPattern: /^(?:AIza[\w-]{10,}|AQ\.[\w.-]{10,})$/,
    keyFromText: /AIza[\w-]{10,}|AQ\.[\w.-]{10,}/,
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    getKeyLabel: 'Get a free key',
    steps: [
      'Sign in with any Google account',
      'Click Create API key',
      'Copy it, then come back here',
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    shortLabel: 'Groq',
    privacyLabel: 'Groq',
    keyPlaceholder: 'gsk_…',
    keyHint: 'Groq keys start with “gsk_”. Make sure you copied the whole key.',
    // Groq keys are `gsk_` + ~52 alphanumerics. Stay lenient on length so a
    // future format change doesn't lock users out of the field.
    keyPattern: /^gsk_[A-Za-z0-9]{20,}$/,
    keyFromText: /gsk_[A-Za-z0-9]{20,}/,
    getKeyUrl: 'https://console.groq.com/keys',
    getKeyLabel: 'Get a free key',
    steps: [
      'Sign in at console.groq.com',
      'Click Create API Key',
      'Copy it, then come back here',
    ],
  },
];

export const DEFAULT_AI_PROVIDER = 'gemini';

export function getAiProvider(id) {
  return AI_PROVIDERS.find((provider) => provider.id === id) || AI_PROVIDERS[0];
}
