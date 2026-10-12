const { ipcMain, safeStorage, app } = require('electron');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Primary path: Electron's per-user data dir (e.g. %AppData%\seec0de\).
// Fallback path: a folder we own under the user's home dir, for the
// case where Windows/AV/policy denies writes to %AppData% with EACCES/EPERM.
const PRIMARY_KEY_PATH = path.join(app.getPath('userData'), 'gemini.key');
const FALLBACK_KEY_DIR = path.join(os.homedir(), '.seec0de');
const FALLBACK_KEY_PATH = path.join(FALLBACK_KEY_DIR, 'gemini.key');

let encryptedApiKey = null;

function isPermissionError(err) {
  return err && (err.code === 'EACCES' || err.code === 'EPERM');
}

// Load key on boot. try primary, then fallback.
function loadKeyFromDisk() {
  for (const p of [PRIMARY_KEY_PATH, FALLBACK_KEY_PATH]) {
    try {
      if (fs.existsSync(p)) {
        encryptedApiKey = fs.readFileSync(p);
        return;
      }
    } catch (err) {
      console.error(`Failed to load API key from ${p}:`, err);
    }
  }
}

loadKeyFromDisk();

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

// Persists the encrypted key, returning the path it was written to.
// Throws if both primary and fallback paths fail.
function persistKey(buf) {
  try {
    tryWrite(PRIMARY_KEY_PATH, buf);
    // Clean any stale fallback copy so we have one source of truth.
    tryUnlink(FALLBACK_KEY_PATH);
    return PRIMARY_KEY_PATH;
  } catch (err) {
    if (!isPermissionError(err)) throw err;
    console.warn(
      `Primary key path denied (${err.code}); falling back to home dir.`
    );
    tryWrite(FALLBACK_KEY_PATH, buf);
    return FALLBACK_KEY_PATH;
  }
}

function setApiKey(key) {
  if (!key) {
    encryptedApiKey = null;
    tryUnlink(PRIMARY_KEY_PATH);
    tryUnlink(FALLBACK_KEY_PATH);
    return { ok: true };
  }
  if (safeStorage.isEncryptionAvailable()) {
    encryptedApiKey = safeStorage.encryptString(key);
  } else {
    encryptedApiKey = Buffer.from(key).toString('base64');
  }
  try {
    const writtenTo = persistKey(encryptedApiKey);
    return { ok: true, path: writtenTo };
  } catch (err) {
    console.error('Failed to save API key:', err);
    // Key is still usable for this session (held in memory), but warn caller.
    return {
      ok: false,
      sessionOnly: true,
      error: err.message || String(err),
    };
  }
}

function getApiKey() {
  if (!encryptedApiKey) return null;
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(encryptedApiKey);
    } catch {
      return null;
    }
  }
  return Buffer.from(encryptedApiKey.toString(), 'base64').toString();
}

// Hard ceiling for a single Gemini round-trip. Our prompts produce ~2–10s
// responses; if the socket is still silent after a minute it's almost
// certainly wedged behind an AV/proxy doing TLS inspection, so we fail
// fast and let the model-fallback / IPv4 retry kick in.
const REQUEST_TIMEOUT_MS = 60_000;

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

async function tryModel(model, apiKey, bodyObj, { ipFamily } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(`${API_BASE}/${model}:generateContent?key=${apiKey}`);
    const bodyStr = JSON.stringify(bodyObj);

    const options = {
      method: 'POST',
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || 443,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Explicit Content-Length avoids chunked-encoding edge cases
        // that some intercepting proxies/AVs choke on.
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': `seec0de/${app.getVersion()} (Electron ${process.versions.electron})`,
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
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return reject(new Error('The AI came back empty — try again.'));
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

    req.on('error', (err) => {
      const friendly = classifyNetworkError(err);
      if (friendly) {
        const wrapped = new Error(friendly);
        wrapped.isNetwork = true;
        wrapped.originalCode = err.code;
        return reject(wrapped);
      }
      reject(err);
    });

    req.write(bodyStr);
    req.end();
  });
}

async function callGemini(prompt, systemInstruction) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No Gemini API key found. Add one in Settings to use AI features.');

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
      maxOutputTokens: 8192,
    },
  };

  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];

    // Attempt 1: default dual-stack (system picks IPv4 or IPv6).
    try {
      return await tryModel(model, apiKey, body);
    } catch (err) {
      lastError = err;

      // Attempt 2 (same model, IPv4 only): only worth doing for network
      // failures. Cures the broken-IPv6-on-Windows class of errors
      // without slowing down the happy path.
      if (err.isNetwork) {
        try {
          return await tryModel(model, apiKey, body, { ipFamily: 4 });
        } catch (ipv4Err) {
          lastError = ipv4Err;
        }
      }

      // Fall back to the next (smaller / different) model on overload
      // OR persistent network failure. Bail immediately on 4xx auth
      // errors, malformed-body errors, parse errors, etc.
      const fallbackEligible = lastError.isOverloaded || lastError.isNetwork;
      if (fallbackEligible && i < MODELS.length - 1) continue;
      throw lastError;
    }
  }

  throw lastError || new Error('Something went wrong with the AI. Try again in a moment.');
}

// Validate a candidate key against the API without touching the stored
// key. Always resolves — network failures come back as
// { ok: false, reason: 'unreachable', message } so the UI can distinguish
// "bad key" from "no internet".
function validateApiKey(key) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(`${API_BASE}?key=${encodeURIComponent(key)}&pageSize=1`);
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
        'User-Agent': `seec0de/${app.getVersion()} (Electron ${process.versions.electron})`,
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

function registerAiServiceHandlers() {
  ipcMain.handle('ai:set-key', (_e, key) => {
    return setApiKey(key);
  });

  ipcMain.handle('ai:has-key', () => {
    return !!encryptedApiKey;
  });

  // Cheap probe for a *candidate* key (Onboarding / Settings), independent
  // of the stored key: list one page of models. 200 → the key works;
  // 400/401/403 → Google rejected it; anything else explains itself.
  ipcMain.handle('ai:validate-key', async (_e, key) => {
    if (!key || typeof key !== 'string') return { ok: false, reason: 'invalid' };
    return await validateApiKey(key.trim());
  });

  ipcMain.handle('ai:call', async (_e, { prompt, systemInstruction }) => {
    return await callGemini(prompt, systemInstruction);
  });
}

module.exports = { registerAiServiceHandlers };
