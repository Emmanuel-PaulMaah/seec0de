const { ipcMain, safeStorage, app } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { API_BASE } = require('./billingConfig');

const INSTALL_FILE = 'billing-install.json';
const LICENSE_FILE = 'billing-license.json';
const PRIMARY_DIR = app.getPath('userData');
const FALLBACK_DIR = path.join(os.homedir(), '.seec0de');
const OFFLINE_GRACE_MS = 7 * 86400000;
const REQUEST_TIMEOUT_MS = 15000;

const FREE_ENTITLEMENT = Object.freeze({
  plan: 'free',
  planName: 'Free',
  status: 'none',
  features: [],
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  source: null,
  email: null,
  cached: false,
});

function isPermissionError(err) {
  return err && (err.code === 'EACCES' || err.code === 'EPERM');
}

function readFileFrom(dir, name) {
  const file = path.join(dir, name);
  try {
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

function writeFileWithFallback(name, buffer) {
  const targets = [PRIMARY_DIR, FALLBACK_DIR];
  let lastError = null;
  for (const dir of targets) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), buffer);
      return path.join(dir, name);
    } catch (err) {
      lastError = err;
      if (!isPermissionError(err)) throw err;
    }
  }
  throw lastError || new Error(`Could not write ${name}`);
}

function removeFile(name) {
  for (const dir of [PRIMARY_DIR, FALLBACK_DIR]) {
    try {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch { }
  }
}

function validInstallId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

function loadInstallId() {
  for (const dir of [PRIMARY_DIR, FALLBACK_DIR]) {
    const raw = readFileFrom(dir, INSTALL_FILE);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw.toString('utf8'));
      if (validInstallId(parsed.installId)) return parsed.installId;
    } catch { }
  }
  const installId = `inst_${crypto.randomBytes(18).toString('hex')}`;
  writeFileWithFallback(INSTALL_FILE, Buffer.from(JSON.stringify({ installId, createdAt: new Date().toISOString() }, null, 2)));
  return installId;
}

let cachedInstallId = null;
function installId() {
  if (!cachedInstallId) cachedInstallId = loadInstallId();
  return cachedInstallId;
}

function encodeLicenseStore(value) {
  const json = JSON.stringify(value);
  if (safeStorage.isEncryptionAvailable()) {
    return Buffer.from(JSON.stringify({
      mode: 'encrypted',
      data: safeStorage.encryptString(json).toString('base64'),
    }));
  }
  return Buffer.from(JSON.stringify({
    mode: 'plain',
    data: Buffer.from(json, 'utf8').toString('base64'),
  }));
}

function decodeLicenseStore(buffer) {
  try {
    const wrapper = JSON.parse(buffer.toString('utf8'));
    if (wrapper.mode === 'encrypted') {
      if (!safeStorage.isEncryptionAvailable()) return null;
      return JSON.parse(safeStorage.decryptString(Buffer.from(wrapper.data, 'base64')));
    }
    if (wrapper.mode === 'plain') {
      return JSON.parse(Buffer.from(wrapper.data, 'base64').toString('utf8'));
    }
  } catch { }
  return null;
}

function loadLicenseStore() {
  for (const dir of [PRIMARY_DIR, FALLBACK_DIR]) {
    const raw = readFileFrom(dir, LICENSE_FILE);
    if (!raw) continue;
    const parsed = decodeLicenseStore(raw);
    if (parsed) return parsed;
  }
  return null;
}

function saveLicenseStore(value) {
  if (!value) {
    removeFile(LICENSE_FILE);
    return;
  }
  writeFileWithFallback(LICENSE_FILE, encodeLicenseStore(value));
}

function verifyLicense(license, publicKey) {
  if (!license || !publicKey) return null;
  const dot = String(license).indexOf('.');
  if (dot <= 0) return null;
  const payloadPart = String(license).slice(0, dot);
  const signaturePart = String(license).slice(dot + 1);
  let payloadBuffer;
  let signature;
  try {
    payloadBuffer = Buffer.from(payloadPart, 'base64url');
    signature = Buffer.from(signaturePart, 'base64url');
  } catch {
    return null;
  }
  try {
    if (!crypto.verify(null, payloadBuffer, publicKey, signature)) return null;
    const payload = JSON.parse(payloadBuffer.toString('utf8'));
    if (!payload || payload.installId !== installId()) return null;
    return payload;
  } catch {
    return null;
  }
}

function normalizeEntitlement(payload, { cached = false } = {}) {
  if (!payload) return { ...FREE_ENTITLEMENT, cached };
  const end = Date.parse(payload.currentPeriodEnd || '');
  const billable = ['active', 'trialing', 'past_due'].includes(String(payload.status || '').toLowerCase());
  if (!billable || !Number.isFinite(end) || end + OFFLINE_GRACE_MS < Date.now()) {
    return { ...FREE_ENTITLEMENT, cached };
  }
  return {
    plan: payload.plan || 'pro',
    planName: payload.planName || 'Pro',
    status: payload.status,
    features: Array.isArray(payload.features) ? payload.features : [],
    currentPeriodEnd: payload.currentPeriodEnd,
    cancelAtPeriodEnd: !!payload.cancelAtPeriodEnd,
    source: payload.source || null,
    email: payload.email || null,
    cached,
  };
}

function currentStoredEntitlement({ cached = false } = {}) {
  const stored = loadLicenseStore();
  if (!stored?.license || !stored?.publicKey) return { ...FREE_ENTITLEMENT, cached };
  const payload = verifyLicense(stored.license, stored.publicKey);
  if (!payload) return { ...FREE_ENTITLEMENT, cached };
  return normalizeEntitlement(payload, { cached });
}

function requestJson(method, pathname, body) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(pathname, `${API_BASE}/`);
    } catch {
      reject(new Error('Billing service URL is invalid.'));
      return;
    }
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = lib.request({
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        Accept: 'application/json',
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
        } : {}),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch { }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = json?.error || `Billing service returned ${res.statusCode}`;
          const error = new Error(message);
          error.statusCode = res.statusCode;
          reject(error);
          return;
        }
        resolve(json || {});
      });
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error('The billing service took too long to respond.'));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function registerBillingServiceHandlers({ openCheckout, openPortal } = {}) {
  ipcMain.handle('billing:get-install-id', () => installId());

  ipcMain.handle('billing:get-entitlement', () => ({
    ok: true,
    entitlement: currentStoredEntitlement({ cached: true }),
    installId: installId(),
    serviceUrl: API_BASE,
  }));

  ipcMain.handle('billing:refresh-entitlement', async () => {
    const id = installId();
    try {
      const data = await requestJson('GET', `api/billing/entitlement?installId=${encodeURIComponent(id)}`);
      if (data?.license && data?.publicKey) {
        const payload = verifyLicense(data.license, data.publicKey);
        if (!payload) {
          saveLicenseStore(null);
          return { ok: false, error: 'The billing service returned an invalid license.' };
        }
        saveLicenseStore({ license: data.license, publicKey: data.publicKey, savedAt: new Date().toISOString() });
        return { ok: true, entitlement: normalizeEntitlement(payload), installId: id };
      }
      if (data?.entitlement?.plan === 'free') saveLicenseStore(null);
      return { ok: true, entitlement: { ...FREE_ENTITLEMENT }, installId: id };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || 'Could not reach the billing service.',
        entitlement: currentStoredEntitlement({ cached: true }),
        installId: id,
        offline: true,
      };
    }
  });

  ipcMain.handle('billing:get-plans', async () => {
    try {
      return await requestJson('GET', 'api/billing/plans');
    } catch (err) {
      return { ok: false, error: err?.message || 'Could not load plans.', plans: [] };
    }
  });

  ipcMain.handle('billing:start-checkout', async (_event, payload = {}) => {
    try {
      const result = await requestJson('POST', 'api/billing/checkout', {
        planId: payload.planId,
        installId: installId(),
        email: payload.email || undefined,
        name: payload.name || undefined,
      });
      if (result?.checkoutUrl && typeof openCheckout === 'function') {
        openCheckout(result.checkoutUrl);
      }
      return { ok: true, ...result, installId: installId() };
    } catch (err) {
      return { ok: false, error: err?.message || 'Could not start checkout.' };
    }
  });

  ipcMain.handle('billing:open-portal', async () => {
    try {
      const result = await requestJson('POST', 'api/billing/portal', { installId: installId() });
      if (result?.url && typeof openPortal === 'function') {
        openPortal(result.url);
      }
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: err?.message || 'Could not open the billing portal.' };
    }
  });

  ipcMain.handle('billing:clear-license', () => {
    saveLicenseStore(null);
    return { ok: true, entitlement: { ...FREE_ENTITLEMENT } };
  });
}

module.exports = {
  registerBillingServiceHandlers,
  getStoredEntitlement: () => currentStoredEntitlement({ cached: true }),
  getInstallId: () => installId(),
  _verifyLicense: verifyLicense,
  _normalizeEntitlement: normalizeEntitlement,
};
