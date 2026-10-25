// seec0de billing + license service.
//
// Runs beside the existing app server (or standalone behind a reverse proxy).
// It is the only place that talks to Bachs with a secret key. The desktop app
// calls this service, stores the signed entitlement locally, and gates premium
// features from that entitlement.
//
// No Bachs key? The service starts in mock mode and serves a local checkout
// page so the full purchase -> entitlement flow can be tested offline.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8787);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
const BACHS_API_KEY = String(process.env.BACHS_API_KEY || '').trim();
const BACHS_API_BASE = String(
  process.env.BACHS_API_BASE
  || (BACHS_API_KEY.startsWith('sk_live_') ? 'https://api.bachs.io' : 'https://sandbox-api.bachs.io')
).replace(/\/+$/, '');
const BACHS_WEBHOOK_SECRET = String(process.env.BACHS_WEBHOOK_SECRET || '').trim();
const MOCK_MODE = !BACHS_API_KEY;
const DATA_DIR = path.resolve(process.env.BILLING_DATA_DIR || path.join(__dirname, 'data'));
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const KEY_PATH = path.join(DATA_DIR, 'signing-key.json');
const LICENSE_GRACE_DAYS = Number(process.env.LICENSE_GRACE_DAYS || 7);
const REQUEST_LIMIT = Number(process.env.CHECKOUT_RATE_LIMIT || 30);
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_API_BASE = String(process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta/models').replace(/\/+$/, '');
const MANAGED_AI_MONTHLY_LIMIT = Number(process.env.MANAGED_AI_MONTHLY_LIMIT || 300);

const PRO_FEATURES = Object.freeze([
  'managedAI',
  'aiTutor',
  'premiumCourses',
  'portfolio',
  'interview',
  'cloudSync',
]);

const PLANS = Object.freeze([
  {
    id: 'pro-monthly-usd',
    name: 'Pro Monthly',
    tier: 'pro',
    interval: 'month',
    currency: 'USD',
    amount: '7.00',
    autoRenew: true,
    days: 30,
    productEnv: 'BACHS_PRODUCT_PRO_MONTHLY_USD',
  },
  {
    id: 'pro-annual-usd',
    name: 'Pro Annual',
    tier: 'pro',
    interval: 'year',
    currency: 'USD',
    amount: '59.00',
    autoRenew: true,
    days: 365,
    productEnv: 'BACHS_PRODUCT_PRO_ANNUAL_USD',
  },
  {
    id: 'pro-30d-ngn',
    name: 'Pro 30-Day Pass',
    tier: 'pro',
    interval: '30 days',
    currency: 'NGN',
    amount: '9500.00',
    autoRenew: false,
    days: 30,
    productEnv: 'BACHS_PRODUCT_PRO_30D_NGN',
  },
  {
    id: 'pro-annual-ngn',
    name: 'Pro Annual Pass',
    tier: 'pro',
    interval: 'year',
    currency: 'NGN',
    amount: '79000.00',
    autoRenew: false,
    days: 365,
    productEnv: 'BACHS_PRODUCT_PRO_ANNUAL_NGN',
  },
]);

function planById(id) {
  return PLANS.find((plan) => plan.id === id) || null;
}

// ---------------------------------------------------------------------------
// Tiny JSON store. Swap this file for your existing database when wiring the
// service into a real backend. Every write is atomic enough for a single node.
// ---------------------------------------------------------------------------

fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`[billing] failed to read ${file}:`, err.message);
    return fallback;
  }
}

function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

let store = readJson(STORE_PATH, {
  checkouts: {},
  entitlements: {},
  processedEvents: {},
  customers: {},
  aiUsage: {},
});
store.aiUsage = store.aiUsage || {};

function saveStore() {
  writeJson(STORE_PATH, store);
}

// ---------------------------------------------------------------------------
// Ed25519 license keys. The desktop app verifies the payload with the public
// key returned alongside the license, so a modded local file cannot mint a
// different plan without replacing both values.
// ---------------------------------------------------------------------------

let signingKeys = readJson(KEY_PATH, null);
if (!signingKeys || !signingKeys.privateKey || !signingKeys.publicKey) {
  const pair = crypto.generateKeyPairSync('ed25519');
  signingKeys = {
    privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }),
  };
  writeJson(KEY_PATH, signingKeys);
}

function signLicense(payload) {
  const body = Buffer.from(JSON.stringify(payload));
  const signature = crypto.sign(null, body, signingKeys.privateKey);
  return `${body.toString('base64url')}.${signature.toString('base64url')}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso() {
  return new Date().toISOString();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000).toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function validInstallId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function activeEntitlement(installId) {
  const record = store.entitlements[installId];
  if (!record) return null;
  const end = record.currentPeriodEnd ? Date.parse(record.currentPeriodEnd) : 0;
  const graceMs = LICENSE_GRACE_DAYS * 86400000;
  const billable = record.status === 'active' || record.status === 'trialing' || record.status === 'past_due';
  if (!billable || !Number.isFinite(end) || end + graceMs < Date.now()) return null;
  return record;
}

function entitlementPayload(record) {
  return {
    v: 1,
    plan: record.plan || 'pro',
    planName: 'Pro',
    tier: 'pro',
    status: record.status,
    features: PRO_FEATURES,
    installId: record.installId,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: !!record.cancelAtPeriodEnd,
    source: record.source || 'subscription',
    issuedAt: nowIso(),
    email: record.email || null,
  };
}

function publicPlan(plan) {
  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    interval: plan.interval,
    currency: plan.currency,
    amount: plan.amount,
    autoRenew: plan.autoRenew,
    features: PRO_FEATURES,
  };
}

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title, body, extraHead = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | seec0de</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 28px;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
    background: #0a0a0a; color: #f4f4f5; }
  main { width: min(520px, 100%); border: 1px solid #27272a; border-radius: 16px;
    background: #111113; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,.45); }
  h1 { margin: 0 0 8px; font-size: 22px; letter-spacing: -.02em; }
  p { margin: 0 0 14px; color: #a1a1aa; line-height: 1.6; font-size: 14px; }
  .price { font-size: 34px; font-weight: 700; letter-spacing: -.03em; margin: 18px 0 4px; }
  .meta { color: #71717a; font-size: 12px; margin-bottom: 22px; }
  button { width: 100%; border: 0; border-radius: 10px; padding: 13px 16px;
    font: inherit; font-weight: 650; cursor: pointer; background: #f4f4f5; color: #09090b; }
  button:hover { background: #fff; }
  a { color: #a5b4fc; }
  code { background: #1f1f23; padding: 2px 5px; border-radius: 4px; font-size: 12px; }
</style>
${extraHead}
</head>
<body><main>${body}</main></body>
</html>`;
}

// ---------------------------------------------------------------------------
// Bachs API
// ---------------------------------------------------------------------------

async function bachsRequest(method, apiPath, body) {
  const response = await fetch(`${BACHS_API_BASE}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${BACHS_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { }
  if (!response.ok) {
    const message = json?.error?.message || json?.message || `Bachs returned ${response.status}`;
    throw Object.assign(new Error(message), { status: 502, bachsStatus: response.status });
  }
  return json;
}

function verifyBachsSignature(rawBody, headers) {
  if (!BACHS_WEBHOOK_SECRET) {
    return { ok: false, reason: 'BACHS_WEBHOOK_SECRET is not set' };
  }
  const raw = rawBody.toString('utf8');
  const toleranceSeconds = 300;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const v2 = headers['x-bachs-signature-v2'];

  if (v2) {
    const parts = String(v2).split(',').map((part) => part.trim()).filter(Boolean);
    const values = new Map();
    for (const part of parts) {
      const index = part.indexOf('=');
      if (index === -1) continue;
      const key = part.slice(0, index);
      const value = part.slice(index + 1);
      if (key === 'v1') {
        if (!values.has('v1')) values.set('v1', []);
        values.get('v1').push(value);
      } else {
        values.set(key, value);
      }
    }
    const timestamp = Number(values.get('t'));
    const signatures = values.get('v1') || [];
    if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
      return { ok: false, reason: 'Webhook timestamp is outside the tolerance window' };
    }
    const expected = crypto
      .createHmac('sha256', BACHS_WEBHOOK_SECRET)
      .update(`${timestamp}.${raw}`, 'utf8')
      .digest('hex');
    const match = signatures.some((signature) => {
      const a = Buffer.from(expected);
      const b = Buffer.from(String(signature));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
    return match ? { ok: true } : { ok: false, reason: 'Invalid webhook signature' };
  }

  const timestamp = Number(headers['x-bachs-timestamp']);
  const signature = String(headers['x-bachs-signature'] || '');
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: 'Webhook timestamp is outside the tolerance window' };
  }
  const expected = crypto
    .createHmac('sha256', BACHS_WEBHOOK_SECRET)
    .update(`${timestamp}.${raw}`, 'utf8')
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  return match ? { ok: true } : { ok: false, reason: 'Invalid webhook signature' };
}

// ---------------------------------------------------------------------------
// Managed AI
// ---------------------------------------------------------------------------

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

async function geminiGenerate(prompt, systemInstruction) {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 16384,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body,
        signal: AbortSignal.timeout(60_000),
      });
      const raw = await response.text();
      let json = null;
      try { json = raw ? JSON.parse(raw) : null; } catch { }

      if (!response.ok) {
        const message = json?.error?.message || `Gemini returned ${response.status}`;
        const retryable = response.status === 429 || response.status === 503;
        const error = Object.assign(new Error(message), {
          status: retryable ? 503 : 502,
          retryable,
          upstreamStatus: response.status,
        });
        throw error;
      }

      const candidate = json?.candidates?.[0];
      const text = (candidate?.content?.parts || [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join('');
      if (candidate?.finishReason === 'MAX_TOKENS') {
        throw Object.assign(new Error('The AI reply was cut off before it finished. Try a smaller request.'), { status: 502 });
      }
      if (!text) {
        const blocked = json?.promptFeedback?.blockReason;
        throw Object.assign(new Error(blocked ? 'The AI declined this request.' : 'The AI came back empty.'), { status: 502 });
      }
      return { text, model };
    } catch (err) {
      lastError = err;
      if (!err.retryable) throw err;
    }
  }
  throw lastError || Object.assign(new Error('Managed AI is unavailable.'), { status: 503 });
}

async function handleManagedAi(req, res) {
  const body = await readJsonBody(req, 64 * 1024);
  const installId = body.installId;
  if (!validInstallId(installId)) return sendJson(res, 400, { error: 'Missing install id.' });
  const record = activeEntitlement(installId);
  if (!record) return sendJson(res, 402, { error: 'An active Pro plan is required for managed AI.' });
  if (!PRO_FEATURES.includes('managedAI')) {
    return sendJson(res, 403, { error: 'Managed AI is not included in this plan.' });
  }
  if (!GEMINI_API_KEY) {
    return sendJson(res, 503, { error: 'Managed AI is not configured on this server.' });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const systemInstruction = typeof body.systemInstruction === 'string' ? body.systemInstruction : '';
  if (!prompt.trim()) return sendJson(res, 400, { error: 'Prompt is required.' });
  if (prompt.length > 32_000 || systemInstruction.length > 16_000) {
    return sendJson(res, 413, { error: 'The AI request is too large.' });
  }

  const period = new Date().toISOString().slice(0, 7);
  const usage = store.aiUsage[installId] || { period, count: 0 };
  if (usage.period !== period) {
    usage.period = period;
    usage.count = 0;
  }
  const limit = Number.isFinite(MANAGED_AI_MONTHLY_LIMIT) && MANAGED_AI_MONTHLY_LIMIT > 0
    ? MANAGED_AI_MONTHLY_LIMIT
    : Infinity;
  if (usage.count >= limit) {
    return sendJson(res, 429, {
      error: `Managed AI limit reached for this month (${limit} requests). Use your own Gemini key or try again next month.`,
      limit,
      used: usage.count,
      remaining: 0,
    });
  }

  const result = await geminiGenerate(prompt, systemInstruction);
  usage.count += 1;
  store.aiUsage[installId] = usage;
  saveStore();

  return sendJson(res, 200, {
    ok: true,
    text: result.text,
    model: result.model,
    limit: Number.isFinite(limit) ? limit : null,
    used: usage.count,
    remaining: Number.isFinite(limit) ? Math.max(0, limit - usage.count) : null,
  });
}

// ---------------------------------------------------------------------------
// Entitlement mutations
// ---------------------------------------------------------------------------

function grantEntitlement({ installId, plan, email, source, customerId, subscriptionId, currentPeriodEnd, status = 'active', cancelAtPeriodEnd = false }) {
  const previous = store.entitlements[installId] || {};
  const end = currentPeriodEnd || addDays(new Date(), plan?.days || 30);
  store.entitlements[installId] = {
    ...previous,
    installId,
    plan: 'pro',
    planId: plan?.id || previous.planId || null,
    status,
    features: PRO_FEATURES,
    source: source || previous.source || 'pass',
    currentPeriodEnd: end,
    cancelAtPeriodEnd: !!cancelAtPeriodEnd,
    email: email || previous.email || null,
    customerId: customerId || previous.customerId || null,
    subscriptionId: subscriptionId || previous.subscriptionId || null,
    updatedAt: nowIso(),
  };
  saveStore();
  return store.entitlements[installId];
}

function checkoutForEvent(event) {
  const data = event.data || {};
  const candidates = [
    data.checkout_id,
    data.checkoutId,
    data.checkout?.id,
    data.checkout?.checkout_id,
  ].filter(Boolean);
  for (const id of candidates) {
    const found = Object.values(store.checkouts).find((entry) => (
      entry.id === id || entry.bachsCheckoutId === id
    ));
    if (found) return found;
  }
  const localId = data.metadata?.local_checkout_id || data.checkout?.metadata?.local_checkout_id;
  if (localId && store.checkouts[localId]) return store.checkouts[localId];
  return null;
}

function applyCheckoutPaid(event) {
  const checkout = checkoutForEvent(event);
  if (!checkout) {
    console.warn('[billing] paid event has no matching checkout:', event.id, event.type);
    return;
  }
  if (checkout.status === 'paid') return;
  const plan = planById(checkout.planId);
  const data = event.data || {};
  const customerId = data.customer?.customer_id || data.customer_id || checkout.customerId || null;

  checkout.status = 'paid';
  checkout.paidAt = nowIso();
  checkout.customerId = customerId;
  saveStore();

  if (!checkout.installId || !validInstallId(checkout.installId)) {
    console.warn('[billing] checkout has no valid install id:', checkout.id);
    return;
  }

  grantEntitlement({
    installId: checkout.installId,
    plan,
    email: checkout.email,
    source: plan?.autoRenew ? 'subscription' : 'pass',
    customerId,
    currentPeriodEnd: addDays(new Date(), plan?.days || 30),
    status: 'active',
  });
}

function subscriptionFromEvent(event) {
  const data = event.data || {};
  return data.subscription || data;
}

function applySubscriptionEvent(event) {
  const subscription = subscriptionFromEvent(event);
  if (!subscription || typeof subscription !== 'object') return;
  const metadata = subscription.metadata || {};
  const installId = metadata.install_id || metadata.installId;
  const customerId = subscription.customer?.customer_id
    || subscription.customer_id
    || null;
  const subscriptionId = subscription.id || subscription.subscription_id || null;
  const status = String(subscription.status || '').toLowerCase();
  const currentPeriodEnd = subscription.current_period_end || subscription.currentPeriodEnd;
  const plan = PLANS.find((entry) => entry.autoRenew && metadata.plan_id === entry.id)
    || PLANS.find((entry) => entry.autoRenew && entry.currency === subscription.currency)
    || PLANS.find((entry) => entry.autoRenew);

  let targetInstallId = installId;
  if (!targetInstallId && subscriptionId) {
    targetInstallId = Object.keys(store.entitlements).find(
      (key) => store.entitlements[key].subscriptionId === subscriptionId
    );
  }
  if (!targetInstallId && customerId) {
    targetInstallId = Object.keys(store.entitlements).find(
      (key) => store.entitlements[key].customerId === customerId
    );
  }
  if (!targetInstallId || !validInstallId(targetInstallId)) {
    console.warn('[billing] subscription event has no matching install id:', event.id);
    return;
  }

  grantEntitlement({
    installId: targetInstallId,
    plan,
    email: subscription.customer?.email,
    source: 'subscription',
    customerId,
    subscriptionId,
    currentPeriodEnd,
    status: status || 'active',
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
  });
}

function applySubscriptionDeleted(event) {
  const subscription = subscriptionFromEvent(event);
  const subscriptionId = subscription?.id || subscription?.subscription_id;
  const installId = subscription?.metadata?.install_id
    || Object.keys(store.entitlements).find(
      (key) => subscriptionId && store.entitlements[key].subscriptionId === subscriptionId
    );
  if (!installId || !store.entitlements[installId]) return;
  store.entitlements[installId] = {
    ...store.entitlements[installId],
    status: 'canceled',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: subscription?.current_period_end || nowIso(),
    updatedAt: nowIso(),
  };
  saveStore();
}

function applyInvoicePaid(event) {
  const data = event.data || {};
  const subscriptionId = data.subscription_id
    || data.subscription?.id
    || data.invoice?.subscription_id
    || null;
  if (!subscriptionId) return;
  const installId = Object.keys(store.entitlements).find(
    (key) => store.entitlements[key].subscriptionId === subscriptionId
  );
  if (!installId) return;
  const end = data.period_end
    || data.current_period_end
    || data.subscription?.current_period_end
    || store.entitlements[installId].currentPeriodEnd;
  store.entitlements[installId] = {
    ...store.entitlements[installId],
    status: 'active',
    currentPeriodEnd: end,
    updatedAt: nowIso(),
  };
  saveStore();
}

function handleEvent(event) {
  switch (event.type) {
    case 'checkout.completed':
    case 'collection.succeeded':
      applyCheckoutPaid(event);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      applySubscriptionEvent(event);
      break;
    case 'customer.subscription.deleted':
      applySubscriptionDeleted(event);
      break;
    case 'invoice.paid':
      applyInvoicePaid(event);
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting (checkout only, per remote address)
// ---------------------------------------------------------------------------

const rateBuckets = new Map();

function rateLimited(key) {
  const now = Date.now();
  const windowMs = 60000;
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt > windowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > REQUEST_LIMIT;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function handleCheckout(req, res, remoteKey) {
  if (rateLimited(remoteKey)) {
    return sendJson(res, 429, { error: 'Too many checkout attempts. Try again in a minute.' });
  }
  const body = await readJsonBody(req);
  const plan = planById(body.planId);
  if (!plan) return sendJson(res, 400, { error: 'Unknown plan.' });
  if (!validInstallId(body.installId)) return sendJson(res, 400, { error: 'Missing install id.' });
  if (body.email && !validEmail(body.email)) return sendJson(res, 400, { error: 'Enter a valid email.' });

  const checkout = {
    id: makeId('chk_local'),
    installId: body.installId,
    planId: plan.id,
    email: body.email || null,
    name: body.name || null,
    status: 'open',
    createdAt: nowIso(),
    bachsCheckoutId: null,
  };
  store.checkouts[checkout.id] = checkout;
  saveStore();

  if (MOCK_MODE) {
    return sendJson(res, 200, {
      checkoutId: checkout.id,
      checkoutUrl: `${PUBLIC_BASE_URL}/mock/checkout?session=${encodeURIComponent(checkout.id)}`,
      mock: true,
    });
  }

  const productId = String(process.env[plan.productEnv] || '').trim();
  if (!productId) {
    return sendJson(res, 500, {
      error: `Missing ${plan.productEnv}. Create the product in Bachs and set its id.`,
    });
  }

  const session = await bachsRequest('POST', '/v1/checkout-sessions', {
    product_cart: [{ product_id: productId, quantity: 1 }],
    ...(checkout.email ? { customer: { email: checkout.email, ...(checkout.name ? { name: checkout.name } : {}) } } : {}),
    success_url: `${PUBLIC_BASE_URL}/billing/success`,
    cancel_url: `${PUBLIC_BASE_URL}/billing/cancel`,
    metadata: {
      install_id: checkout.installId,
      plan_id: plan.id,
      local_checkout_id: checkout.id,
    },
  });

  checkout.bachsCheckoutId = session?.checkout_id || null;
  checkout.checkoutUrl = session?.checkout_url || null;
  saveStore();

  if (!checkout.bachsCheckoutId || !checkout.checkoutUrl) {
    return sendJson(res, 502, { error: 'Bachs did not return a checkout URL.' });
  }

  return sendJson(res, 200, {
    checkoutId: checkout.id,
    checkoutUrl: checkout.checkoutUrl,
    mock: false,
  });
}

async function handlePortal(req, res) {
  const body = await readJsonBody(req);
  const installId = body.installId;
  if (!validInstallId(installId)) return sendJson(res, 400, { error: 'Missing install id.' });
  const entitlement = store.entitlements[installId] || null;

  if (MOCK_MODE) {
    return sendJson(res, 200, {
      url: `${PUBLIC_BASE_URL}/mock/portal?installId=${encodeURIComponent(installId)}`,
      mock: true,
    });
  }

  if (!entitlement?.customerId) {
    return sendJson(res, 400, {
      error: 'No Bachs customer is linked to this install yet. Complete a checkout first.',
    });
  }

  const session = await bachsRequest('POST', '/v1/customer-sessions', {
    customer_id: entitlement.customerId,
  });
  const url = session?.url || session?.session_url || session?.portal_url;
  if (!url) return sendJson(res, 502, { error: 'Bachs did not return a portal URL.' });
  return sendJson(res, 200, { url, mock: false });
}

async function route(req, res) {
  const url = new URL(req.url, PUBLIC_BASE_URL);
  const remoteKey = req.socket.remoteAddress || 'unknown';

  if (req.method === 'GET' && url.pathname === '/api/billing/health') {
    return sendJson(res, 200, {
      ok: true,
      mode: MOCK_MODE ? 'mock' : 'live',
      environment: MOCK_MODE ? 'mock' : BACHS_API_BASE,
      plans: PLANS.length,
      managedAI: !!GEMINI_API_KEY,
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/billing/plans') {
    const currency = String(url.searchParams.get('currency') || '').toUpperCase();
    const plans = PLANS.filter((plan) => !currency || plan.currency === currency).map(publicPlan);
    return sendJson(res, 200, { mode: MOCK_MODE ? 'mock' : 'live', plans });
  }

  if (req.method === 'GET' && url.pathname === '/api/billing/public-key') {
    return sendJson(res, 200, { publicKey: signingKeys.publicKey });
  }

  if (req.method === 'POST' && url.pathname === '/api/billing/checkout') {
    return handleCheckout(req, res, remoteKey);
  }

  if (req.method === 'POST' && url.pathname === '/api/billing/portal') {
    return handlePortal(req, res);
  }

  if (req.method === 'POST' && url.pathname === '/api/billing/ai') {
    return handleManagedAi(req, res);
  }

  if (req.method === 'GET' && url.pathname === '/api/billing/entitlement') {
    const installId = url.searchParams.get('installId');
    if (!validInstallId(installId)) return sendJson(res, 400, { error: 'Missing install id.' });
    const record = activeEntitlement(installId);
    if (!record) {
      return sendJson(res, 200, {
        entitlement: { plan: 'free', status: 'none', features: [] },
        license: null,
        publicKey: signingKeys.publicKey,
      });
    }
    const payload = entitlementPayload(record);
    return sendJson(res, 200, {
      entitlement: payload,
      license: signLicense(payload),
      publicKey: signingKeys.publicKey,
    });
  }

  if (
    req.method === 'POST'
    && (url.pathname === '/api/billing/webhooks/bachs' || url.pathname === '/webhooks/bachs')
  ) {
    const raw = await readBody(req);
    if (!MOCK_MODE) {
      const verdict = verifyBachsSignature(raw, req.headers);
      if (!verdict.ok) {
        console.warn('[billing] rejected webhook:', verdict.reason);
        return sendJson(res, 400, { error: verdict.reason });
      }
    }
    let event;
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
    if (!event?.id || !event?.type) return sendJson(res, 400, { error: 'Invalid event envelope' });
    if (store.processedEvents[event.id]) return sendJson(res, 200, { received: true, duplicate: true });
    try {
      handleEvent(event);
      store.processedEvents[event.id] = nowIso();
      saveStore();
      return sendJson(res, 200, { received: true });
    } catch (err) {
      console.error('[billing] webhook handling failed:', err);
      return sendJson(res, 500, { error: 'Webhook handling failed' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/mock/checkout') {
    const checkout = store.checkouts[url.searchParams.get('session')];
    if (!checkout) return sendHtml(res, 404, page('Checkout not found', '<h1>Checkout not found</h1><p>This mock session has expired.</p>'));
    const plan = planById(checkout.planId);
    if (!plan) return sendHtml(res, 404, page('Plan not found', '<h1>Plan not found</h1>'));
    return sendHtml(res, 200, page('Mock checkout', `
      <p style="color:#71717a;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:700;margin-bottom:10px">seec0de sandbox</p>
      <h1>${escapeHtml(plan.name)}</h1>
      <div class="price">${escapeHtml(plan.currency)} ${escapeHtml(plan.amount)}</div>
      <div class="meta">${escapeHtml(plan.interval)}${plan.autoRenew ? ' - renews automatically' : ' - one-time pass'}</div>
      <p>This is a mock checkout. No real payment is taken. In live mode this button opens the Bachs hosted checkout.</p>
      <form method="POST" action="/api/billing/mock/pay">
        <input type="hidden" name="session" value="${escapeHtml(checkout.id)}">
        <button type="submit">Pay ${escapeHtml(plan.currency)} ${escapeHtml(plan.amount)}</button>
      </form>
    `));
  }

  if (req.method === 'POST' && url.pathname === '/api/billing/mock/pay') {
    const raw = await readBody(req);
    let session = null;
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
      try { session = JSON.parse(raw.toString('utf8')).session; } catch { /* ignore */ }
    } else {
      session = new URLSearchParams(raw.toString('utf8')).get('session');
    }
    const checkout = store.checkouts[session];
    if (!checkout) return sendJson(res, 404, { error: 'Unknown mock session.' });
    const plan = planById(checkout.planId);
    if (!plan) return sendJson(res, 404, { error: 'Unknown plan.' });
    grantEntitlement({
      installId: checkout.installId,
      plan,
      email: checkout.email,
      source: plan.autoRenew ? 'subscription' : 'pass',
      currentPeriodEnd: addDays(new Date(), plan.days),
      status: 'active',
    });
    checkout.status = 'paid';
    checkout.paidAt = nowIso();
    saveStore();
    res.writeHead(303, { Location: `/billing/success?checkout_id=${encodeURIComponent(checkout.id)}` });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/mock/portal') {
    const installId = url.searchParams.get('installId');
    const record = store.entitlements[installId] || null;
    return sendHtml(res, 200, page('Mock billing portal', `
      <h1>Billing portal</h1>
      <p>This is the mock customer portal. Live mode opens the Bachs customer portal.</p>
      <p><strong>Install:</strong> <code>${escapeHtml(installId)}</code></p>
      <p><strong>Plan:</strong> ${record ? 'Pro' : 'Free'}</p>
      <p><strong>Status:</strong> ${escapeHtml(record?.status || 'none')}</p>
      <p><strong>Renews / ends:</strong> ${escapeHtml(record?.currentPeriodEnd || '-')}</p>
      ${record && record.status !== 'canceled' ? `
        <form method="POST" action="/api/billing/mock/cancel" style="margin-top:18px">
          <input type="hidden" name="installId" value="${escapeHtml(installId)}">
          <button type="submit">Cancel subscription (mock)</button>
        </form>` : ''}
    `));
  }

  if (req.method === 'POST' && url.pathname === '/api/billing/mock/cancel') {
    const raw = await readBody(req);
    const installId = new URLSearchParams(raw.toString('utf8')).get('installId');
    if (store.entitlements[installId]) {
      store.entitlements[installId] = {
        ...store.entitlements[installId],
        status: 'canceled',
        currentPeriodEnd: nowIso(),
        updatedAt: nowIso(),
      };
      saveStore();
    }
    res.writeHead(303, { Location: `/mock/portal?installId=${encodeURIComponent(installId || '')}` });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/billing/success') {
    return sendHtml(res, 200, page('Payment complete', `
      <h1>Payment complete</h1>
      <p>Your purchase is confirmed. Return to seec0de and the app will refresh your plan automatically.</p>
      <p style="font-size:12px">You can close this window.</p>
      <button type="button" onclick="window.close()">Close window</button>
    `));
  }

  if (req.method === 'GET' && url.pathname === '/billing/cancel') {
    return sendHtml(res, 200, page('Checkout cancelled', `
      <h1>Checkout cancelled</h1>
      <p>No payment was taken. You can close this window and try again from seec0de.</p>
      <button type="button" onclick="window.close()">Close window</button>
    `));
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  route(req, res).catch((err) => {
    console.error('[billing] request failed:', err);
    if (res.headersSent) return res.end();
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const message = status >= 500 ? 'Billing service error. Try again.' : (err.message || 'Request failed');
    sendJson(res, status, { error: message });
  });
});

server.listen(PORT, () => {
  console.log(`[billing] seec0de billing service on ${PUBLIC_BASE_URL}`);
  console.log(`[billing] mode: ${MOCK_MODE ? 'MOCK (no BACHS_API_KEY)' : `LIVE against ${BACHS_API_BASE}`}`);
  console.log(`[billing] data: ${DATA_DIR}`);
});
