const { ipcMain, safeStorage, app } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const KEY_PATH = path.join(app.getPath('userData'), 'gemini.key');

let encryptedApiKey = null;

// Load key on boot
try {
  if (fs.existsSync(KEY_PATH)) {
    encryptedApiKey = fs.readFileSync(KEY_PATH);
  }
} catch (err) {
  console.error('Failed to load API key:', err);
}

function setApiKey(key) {
  if (!key) {
    encryptedApiKey = null;
    if (fs.existsSync(KEY_PATH)) fs.unlinkSync(KEY_PATH);
    return;
  }
  if (safeStorage.isEncryptionAvailable()) {
    encryptedApiKey = safeStorage.encryptString(key);
  } else {
    encryptedApiKey = Buffer.from(key).toString('base64');
  }
  // Persist
  try {
    fs.writeFileSync(KEY_PATH, encryptedApiKey);
  } catch (err) {
    console.error('Failed to save API key:', err);
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

async function tryModel(model, apiKey, body) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/${model}:generateContent?key=${apiKey}`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return reject(new Error('No response from Gemini'));
            resolve(text);
          } catch (err) {
            reject(new Error('Failed to parse Gemini response'));
          }
        } else {
          try {
            const errJson = JSON.parse(data);
            const msg = errJson?.error?.message || `Gemini API error (${res.status})`;
            const isOverloaded = res.statusCode === 429 || res.statusCode === 503 || /overloaded|demand|capacity|quota/i.test(msg);
            const error = new Error(msg);
            error.isOverloaded = isOverloaded;
            reject(error);
          } catch {
            reject(new Error(`Gemini API error (${res.statusCode})`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function callGemini(prompt, systemInstruction) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key set. Add your Gemini API key in Settings.');

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

function registerAiServiceHandlers() {
  ipcMain.handle('ai:set-key', (_e, key) => {
    setApiKey(key);
    return { ok: true };
  });

  ipcMain.handle('ai:has-key', () => {
    return !!encryptedApiKey;
  });

  ipcMain.handle('ai:call', async (_e, { prompt, systemInstruction }) => {
    return await callGemini(prompt, systemInstruction);
  });
}

module.exports = { registerAiServiceHandlers };
