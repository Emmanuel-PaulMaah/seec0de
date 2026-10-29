const { ipcMain, safeStorage, app } = require('electron');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { API_BASE: BILLING_API_BASE } = require('./billingConfig');
const {
  DEFAULT_PROVIDER,
  getProvider,
  listProviders,
  normaliseProviderId,
} = require('./aiProviders');

// ---------------------------------------------------------------------------
// Storage
//
// One encrypted blob holds every provider key plus which provider is active:
//
//   { version: 2, active: 'groq', keys: { gemini: 'AIza…', groq: 'gsk_…' } }
//
// Primary path: Electron's per-user data dir (e.g. %AppData%\seec0de\).
// Fallback path: a folder we own under the user's home dir, for the case
// where Windows/AV/policy denies writes to %AppData% with EACCES/EPERM.
//
// Pre-4.4.2 installs stored a single key in `gemini.key`; loadStore migrates
// that into the new format on first boot and removes the old file.
// ---------------------------------------------------------------------------

const PRIMARY_STORE_PATH = path.join(app.getPath('userData'), 'ai-keys.bin');
const FALLBACK_KEY_DIR = path.join(os.homedir(), '.seec0de');
const FALLBACK_STORE_PATH = path.join(FALLBACK_KEY_DIR, 'ai-keys.bin');
const LEGACY_KEY_PATHS = [
  path.join(app.getPath('userData'), 'gemini.key'),
  path.join(FALLBACK_KEY_DIR, 'gemini.key'),
];

const GEMINI_KEY_PATTERN = /^(?:AIza[\w-]{10,}|AQ\.[\w.-]{10,})$/;

let store = { active: DEFAULT_PROVIDER, keys: {} };

function isPermissionError(err) {
  return err && (err.code === 'EACCES' || err.code === 'EPERM');
}

function encryptText(text) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(text);
  }
  return Buffer.from(text, 'utf8').toString('base64');
}

function decryptText(buf) {
  if (!buf || !buf.length) return null;
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(buf);
    } catch {
      // Fall through — the value may predate safeStorage being available
      // (written as base64), so try that encoding below.
    }
  }
  try {
    return Buffer.from(buf.toString('utf8'), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function readFirst(paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch (err) {
      console.error(`Failed to read ${p}:`, err);
    }
  }
  return null;
}

function tryWrite(p, buf) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, buf);
}

function tryUnlink(p) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (err) {
    if (!isPermissionError(err)) throw err;
  }
}

// Persists the whole store. Returns { ok, path } or
// { ok: false, sessionOnly: true, error } when both paths are denied — the
// in-memory store still works for the rest of the session.
function persistStore() {
  const payload = encryptText(JSON.stringify({
    version: 2,
    active: store.active,
    keys: store.keys,
  }));
  try {
    tryWrite(PRIMARY_STORE_PATH, payload);
    // Clean any stale fallback copy so we have one source of truth.
    tryUnlink(FALLBACK_STORE_PATH);
    return { ok: true, path: PRIMARY_STORE_PATH };
  } catch (err) {
    if (!isPermissionError(err)) {
      console.error('Failed to save AI keys:', err);
      return { ok: false, sessionOnly: true, error: err.message || String(err) };
    }
    console.warn(`Primary AI key path denied (${err.code}); falling back to home dir.`);
    try {
      tryWrite(FALLBACK_STORE_PATH, payload);
      return { ok: true, path: FALLBACK_STORE_PATH };
    } catch (fallbackErr) {
      console.error('Failed to save AI keys:', fallbackErr);
      return {
        ok: false,
        sessionOnly: true,
        error: fallbackErr.message || String(fallbackErr),
      };
    }
  }
}

function migrateLegacyGeminiKey() {
  const raw = readFirst(LEGACY_KEY_PATHS);
  if (!raw) return;
  const key = String(decryptText(raw) || '').trim();
  if (!GEMINI_KEY_PATTERN.test(key)) return;
  store = { active: 'gemini', keys: { gemini: key } };
  if (persistStore().ok) {
    for (const p of LEGACY_KEY_PATHS) tryUnlink(p);
  }
}

function loadStore() {
  const raw = readFirst([PRIMARY_STORE_PATH, FALLBACK_STORE_PATH]);
  if (raw) {
    const text = decryptText(raw);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.keys && typeof parsed.keys === 'object') {
        const keys = {};
        for (const [id, key] of Object.entries(parsed.keys)) {
          if (getProvider(id) && typeof key === 'string' && key.trim()) {
            keys[id] = key.trim();
          }
        }
        store = { active: normaliseProviderId(parsed.active), keys };
        return;
      }
    } catch (err) {
      console.error('Failed to read the AI key store:', err.message);
    }
  }
  migrateLegacyGeminiKey();
}

loadStore();

function setApiKey(key, providerId) {
  const id = normaliseProviderId(providerId);
  const trimmed = String(key || '').trim();

  if (!trimmed) {
    delete store.keys[id];
    const saved = persistStore();
    return { ...saved, provider: id };
  }

  store.keys[id] = trimmed;
  // Saving a key makes that provider the one AI requests use.
  store.active = id;
  const saved = persistStore();
  return { ...saved, provider: id };
}

function setActiveProvider(providerId) {
  const provider = getProvider(providerId);
  if (!provider) return { ok: false, error: 'Unknown AI provider.' };
  store.active = provider.id;
  const saved = persistStore();
  return { ...saved, ok: true, active: provider.id };
}

function getStatus() {
  return {
    active: store.active,
    hasKey: !!store.keys[store.active],
    providers: listProviders().map((provider) => ({
      ...provider,
      hasKey: !!store.keys[provider.id],
    })),
  };
}

function getApiKey(providerId) {
  return store.keys[normaliseProviderId(providerId)] || null;
}

// Hard ceiling for a single round-trip. Our prompts produce ~2–10s
// responses; if the socket is still silent after a minute it's almost
// certainly wedged behind an AV/proxy doing TLS inspection, so we fail
// fast and let the model-fallback / IPv4 retry kick in.
const REQUEST_TIMEOUT_MS = 60_000;

function userAgent() {
  return `seec0de/${app.getVersion()} (Electron ${process.versions.electron})`;
}

// Translate raw Node socket errors into a message the learner can act on.
// Returns null for anything we don't recognise (caller passes the raw
// error through unchanged).
function classifyNetworkError(err) {
  const code = err && err.code;
  const msg = (err && err.message) || String(err);

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return "Can't reach AI right now — looks like your internet is disconnected. Check your Wi-Fi or try turning it off and on.";
  }
  if (code === 'ECONNRESET' || /socket hang up/i.test(msg)) {
    return "The connection dropped while talking to AI. If you're on a school or work network, it might be blocking the connection — try a different network.";
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
    return "The AI took too long to respond. Your internet might be slow — try again in a moment.";
  }
  if (code === 'ECONNREFUSED') {
    return "Can't connect to AI right now — the service may be temporarily unavailable. Try again in a few seconds.";
  }
  if (code === 'EPROTO' || code === 'CERT_HAS_EXPIRED' || /tls|ssl|certificate/i.test(msg)) {
    return "Can't establish a secure connection. Check that your computer's clock is correct, or try a different network.";
  }
  return null;
}

function wrapNetworkError(err) {
  const friendly = classifyNetworkError(err);
  if (!friendly) return err;
  const wrapped = new Error(friendly);
  wrapped.isNetwork = true;
  wrapped.originalCode = err.code;
  return wrapped;
}

// ---------------------------------------------------------------------------
// Gemini adapter (native schema)
// ---------------------------------------------------------------------------

async function tryGeminiModel(provider, model, apiKey, bodyObj, { ipFamily } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(`${provider.apiBase}/${model}:generateContent`);
    const bodyStr = JSON.stringify(bodyObj);

    const options = {
      method: 'POST',
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || 443,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Header auth works for both legacy (AIza…) and new auth (AQ.…) keys,
        // and keeps the key out of URLs/logs.
        'x-goog-api-key': apiKey,
        // Explicit Content-Length avoids chunked-encoding edge cases
        // that some intercepting proxies/AVs choke on.
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': userAgent(),
      },
    };
    // Optional IP-family pin. Forcing family:4 sidesteps the common
    // Windows pattern where DNS returns AAAA records the network can't
    // actually route, producing ENOTFOUND/ECONNRESET on the first try.
    if (ipFamily === 4 || ipFamily === 6) options.family = ipFamily;

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            const candidate = json?.candidates?.[0];
            const text = (candidate?.content?.parts || [])
              .map((part) => part?.text)
              .filter(Boolean)
              .join('');
            if (candidate?.finishReason === 'MAX_TOKENS') {
              const err = new Error("The AI's reply was cut off before it finished. Try again, or ask for something a little smaller.");
              err.isTruncated = true;
              return reject(err);
            }
            if (!text) {
              if (json?.promptFeedback?.blockReason) {
                return reject(new Error('The AI declined this request. Try rephrasing it.'));
              }
              return reject(new Error('The AI came back empty — try again.'));
            }
            resolve(text);
          } catch {
            reject(new Error('The AI returned something unexpected — try again.'));
          }
        } else {
          let msg;
          try {
            const errJson = JSON.parse(data);
            msg = errJson?.error?.message || `Gemini API error (${res.statusCode})`;
          } catch {
            msg = `Gemini API error (${res.statusCode})`;
          }
          const isOverloaded =
            res.statusCode === 429 ||
            res.statusCode === 503 ||
            /overloaded|demand|capacity|quota/i.test(msg);
          const error = new Error(msg);
          error.isOverloaded = isOverloaded;
          if (res.statusCode === 401 || res.statusCode === 403) error.isAuth = true;
          error.statusCode = res.statusCode;
          error.rawApiMessage = msg;
          reject(error);
        }
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const err = new Error('The AI took too long to respond — try again.');
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });

    req.on('error', (err) => reject(wrapNetworkError(err)));

    req.write(bodyStr);
    req.end();
  });
}

async function callGemini(provider, apiKey, prompt, systemInstruction) {
  const body = {
    // NOTE: `parts` must be an ARRAY per Gemini's schema. The old code
    // shipped `parts: { text: ... }` (an object) which some endpoints
    // silently accepted and others rejected.
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 16384,
      // Every caller expects strict JSON. Asking for it at the API level
      // removes fences/preamble, and disabling thinking keeps the whole
      // budget for the answer — thinking tokens were truncating replies
      // mid-JSON, which surfaced as "sent back something unexpected".
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  let lastError = null;

  for (let i = 0; i < provider.models.length; i++) {
    const model = provider.models[i];

    // Attempt 1: default dual-stack (system picks IPv4 or IPv6).
    try {
      return await tryGeminiModel(provider, model, apiKey, body);
    } catch (err) {
      lastError = err;

      // Attempt 2 (same model, IPv4 only): only worth doing for network
      // failures. Cures the broken-IPv6-on-Windows class of errors
      // without slowing down the happy path.
      if (err.isNetwork) {
        try {
          return await tryGeminiModel(provider, model, apiKey, body, { ipFamily: 4 });
        } catch (ipv4Err) {
          lastError = ipv4Err;
        }
      }

      // Fall back to the next (smaller / different) model on overload
      // OR persistent network failure. Bail immediately on 4xx auth
      // errors, malformed-body errors, parse errors, etc.
      const fallbackEligible = lastError.isOverloaded || lastError.isNetwork;
      if (fallbackEligible && i < provider.models.length - 1) continue;
      throw lastError;
    }
  }

  throw lastError || new Error('Something went wrong with the AI. Try again in a moment.');
}

// ---------------------------------------------------------------------------
// OpenAI-compatible adapter (Groq, and anything else with the same schema)
// ---------------------------------------------------------------------------

function openAiBody(provider, model, prompt, systemInstruction, jsonMode) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemInstruction || '' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_tokens: provider.maxOutputTokens || 8192,
    stream: false,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };
  return body;
}

function requestOpenAi(provider, apiKey, bodyObj, { ipFamily } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(`${provider.apiBase.replace(/\/+$/, '')}/chat/completions`);
    } catch {
      reject(new Error(`${provider.label} is not configured correctly.`));
      return;
    }

    const bodyStr = JSON.stringify(bodyObj);
    const options = {
      method: 'POST',
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': userAgent(),
      },
    };
    if (ipFamily === 4 || ipFamily === 6) options.family = ipFamily;

    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch { /* handled below */ }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const choice = json?.choices?.[0];
          const text = choice?.message?.content;
          if (choice?.finish_reason === 'length') {
            const err = new Error("The AI's reply was cut off before it finished. Try again, or ask for something a little smaller.");
            err.isTruncated = true;
            reject(err);
            return;
          }
          if (!text) {
            reject(new Error(json?.error?.message || 'The AI came back empty — try again.'));
            return;
          }
          resolve(text);
          return;
        }

        const rawMessage = json?.error?.message || `${provider.label} API error (${res.statusCode})`;
        const missingModel = res.statusCode === 404
          || (/model/i.test(rawMessage) && /not found|decommission|does not exist|no longer/i.test(rawMessage));
        const error = new Error(rawMessage);
        error.statusCode = res.statusCode;
        error.rawApiMessage = rawMessage;
        error.isAuth = res.statusCode === 401 || res.statusCode === 403;
        error.isMissingModel = missingModel;
        error.isOverloaded =
          res.statusCode === 429 ||
          res.statusCode === 503 ||
          /rate.?limit|too many requests|overloaded|capacity|quota/i.test(rawMessage);

        if (error.isAuth) {
          error.message = `${provider.label} didn't accept that key. Paste a fresh one in Settings.`;
        } else if (error.isOverloaded) {
          error.message = `${provider.label} is receiving too many requests right now. Wait a few seconds and try again.`;
        }
        reject(error);
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const err = new Error('The AI took too long to respond — try again.');
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });

    req.on('error', (err) => reject(wrapNetworkError(err)));

    req.write(bodyStr);
    req.end();
  });
}

async function tryOpenAiModel(provider, model, apiKey, prompt, systemInstruction, opts = {}) {
  try {
    return await requestOpenAi(
      provider,
      apiKey,
      openAiBody(provider, model, prompt, systemInstruction, true),
      opts,
    );
  } catch (err) {
    // Some OpenAI-compatible models reject `response_format`. Our prompts
    // already demand JSON, so retry once without it rather than failing.
    if (err.statusCode === 400 && /response_format|json_object/i.test(err.rawApiMessage || err.message)) {
      return await requestOpenAi(
        provider,
        apiKey,
        openAiBody(provider, model, prompt, systemInstruction, false),
        opts,
      );
    }
    throw err;
  }
}

async function callOpenAiCompatible(provider, apiKey, prompt, systemInstruction) {
  let lastError = null;

  for (let i = 0; i < provider.models.length; i++) {
    const model = provider.models[i];
    try {
      return await tryOpenAiModel(provider, model, apiKey, prompt, systemInstruction);
    } catch (err) {
      lastError = err;

      if (err.isNetwork) {
        try {
          return await tryOpenAiModel(provider, model, apiKey, prompt, systemInstruction, { ipFamily: 4 });
        } catch (ipv4Err) {
          lastError = ipv4Err;
        }
      }

      const fallbackEligible = lastError.isOverloaded || lastError.isNetwork || lastError.isMissingModel;
      if (fallbackEligible && i < provider.models.length - 1) continue;
      throw lastError;
    }
  }

  throw lastError || new Error('Something went wrong with the AI. Try again in a moment.');
}

// ---------------------------------------------------------------------------
// Managed AI (Pro plan, no user key) — stays on the billing server's key
// ---------------------------------------------------------------------------

function callManagedAi(prompt, systemInstruction) {
  const { getInstallId } = require('./billingService');
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL('api/billing/ai', `${BILLING_API_BASE}/`);
    } catch {
      reject(new Error('The managed AI service URL is invalid.'));
      return;
    }
    const bodyStr = JSON.stringify({
      installId: getInstallId(),
      prompt,
      systemInstruction,
    });
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      method: 'POST',
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': userAgent(),
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch { }
        if (res.statusCode >= 200 && res.statusCode < 300 && json?.text) {
          resolve(json.text);
          return;
        }
        const message = json?.error
          || (res.statusCode === 402 || res.statusCode === 403
            ? 'Managed AI needs an active Pro plan.'
            : res.statusCode === 429
              ? 'Your managed AI limit is used up for this month. Add your own AI key or try again next month.'
              : `Managed AI returned ${res.statusCode}. Try again in a moment.`);
        const error = new Error(message);
        error.statusCode = res.statusCode;
        error.isOverloaded = res.statusCode === 429 || res.statusCode === 503;
        error.isPlanRequired = res.statusCode === 402 || res.statusCode === 403;
        reject(error);
      });
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const err = new Error('Managed AI took too long to respond — try again.');
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });
    req.on('error', (err) => reject(wrapNetworkError(err)));
    req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function callAi(prompt, systemInstruction) {
  const provider = getProvider(store.active) || getProvider(DEFAULT_PROVIDER);
  const apiKey = store.keys[provider.id];

  if (!apiKey) {
    const { getStoredEntitlement } = require('./billingService');
    const entitlement = getStoredEntitlement();
    if (entitlement.plan === 'pro' && entitlement.features.includes('managedAI')) {
      return await callManagedAi(prompt, systemInstruction);
    }
    throw new Error('No AI key found. Add one in Settings to use AI features.');
  }

  if (provider.kind === 'openai') {
    return await callOpenAiCompatible(provider, apiKey, prompt, systemInstruction);
  }
  return await callGemini(provider, apiKey, prompt, systemInstruction);
}

// ---------------------------------------------------------------------------
// Key validation
//
// Always resolves — network failures come back as
// { ok: false, reason: 'unreachable', message } so the UI can distinguish
// "bad key" from "no internet".
// ---------------------------------------------------------------------------

function validateGeminiKey(key) {
  return new Promise((resolve) => {
    const provider = getProvider('gemini');
    let parsed;
    try {
      parsed = new URL(`${provider.apiBase}?pageSize=1`);
    } catch {
      resolve({ ok: false, reason: 'invalid' });
      return;
    }

    const req = https.request({
      method: 'GET',
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: 443,
      headers: {
        Accept: 'application/json',
        'x-goog-api-key': key,
        'User-Agent': userAgent(),
      },
    }, (res) => {
      res.resume(); // body is irrelevant; the status code is the answer
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403) {
          resolve({ ok: false, reason: 'invalid' });
        } else {
          resolve({ ok: false, reason: 'unreachable', message: `Google replied with status ${res.statusCode}. Try again in a moment.` });
        }
      });
    });
    req.setTimeout(15_000, () => {
      req.destroy();
      resolve({ ok: false, reason: 'unreachable', message: 'The key check timed out. Check your internet and try again.' });
    });
    req.on('error', (err) => {
      resolve({
        ok: false,
        reason: 'unreachable',
        message: classifyNetworkError(err) || "Couldn't reach Google to check the key. Check your internet and try again.",
      });
    });
    req.end();
  });
}

function validateOpenAiKey(provider, key) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(`${provider.apiBase.replace(/\/+$/, '')}/models`);
    } catch {
      resolve({ ok: false, reason: 'invalid' });
      return;
    }

    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      method: 'GET',
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
        'User-Agent': userAgent(),
      },
    }, (res) => {
      res.resume(); // body is irrelevant; the status code is the answer
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403) {
          resolve({
            ok: false,
            reason: 'invalid',
            message: `${provider.label} didn't accept that key. Get a fresh one and try again.`,
          });
        } else {
          resolve({
            ok: false,
            reason: 'unreachable',
            message: `${provider.label} replied with status ${res.statusCode}. Try again in a moment.`,
          });
        }
      });
    });
    req.setTimeout(15_000, () => {
      req.destroy();
      resolve({ ok: false, reason: 'unreachable', message: 'The key check timed out. Check your internet and try again.' });
    });
    req.on('error', (err) => {
      resolve({
        ok: false,
        reason: 'unreachable',
        message: classifyNetworkError(err) || `Couldn't reach ${provider.label} to check the key. Check your internet and try again.`,
      });
    });
    req.end();
  });
}

function validateApiKey(key, providerId) {
  const provider = getProvider(providerId) || getProvider(store.active);
  if (!provider) return Promise.resolve({ ok: false, reason: 'invalid' });
  return provider.kind === 'openai'
    ? validateOpenAiKey(provider, key)
    : validateGeminiKey(key);
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerAiServiceHandlers() {
  ipcMain.handle('ai:set-key', (_e, key, providerId) => {
    return setApiKey(key, providerId);
  });

  ipcMain.handle('ai:set-provider', (_e, providerId) => {
    return setActiveProvider(providerId);
  });

  ipcMain.handle('ai:status', () => getStatus());

  // Back-compat: no provider argument means "the active provider".
  ipcMain.handle('ai:has-key', (_e, providerId) => {
    if (!providerId) return !!store.keys[store.active];
    return !!getApiKey(providerId);
  });

  // Cheap probe for a *candidate* key (Onboarding / Settings), independent
  // of the stored key: list one page of models, or the provider's /models.
  ipcMain.handle('ai:validate-key', async (_e, key, providerId) => {
    if (!key || typeof key !== 'string') return { ok: false, reason: 'invalid' };
    return await validateApiKey(key.trim(), providerId);
  });

  ipcMain.handle('ai:call', async (_e, { prompt, systemInstruction }) => {
    return await callAi(prompt, systemInstruction);
  });
}

module.exports = { registerAiServiceHandlers };
