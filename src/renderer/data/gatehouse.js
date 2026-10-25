// Gatehouse — an expert full-stack security build project.
//
// The project is deliberately split into the layers a real authentication
// service has: crypto primitives, session storage, abuse control, audit
// logging, authorization, a user store, HTTP routes, a hardened HTTP layer,
// and the artifacts that ship it. Each step has its own test file, so the
// learner proves one security property at a time instead of grepping for a
// magic line.

const gatehouse = {
  id: 'gatehouse',
  title: 'Gatehouse',
  language: 'javascript',
  level: 'expert',
  summary: 'Build an authentication service layer by layer: scrypt hashing, hashed sessions, throttle keys, CSRF, RBAC, audit logs, hardened HTTP, Docker, and CI.',
  brief: 'Harden passwords, make session theft useless, throttle distributed guessing, log without secrets, enforce roles and CSRF, expose the routes, then ship the result as a non-root container through a least-privilege pipeline.',
  concepts: ['security', 'auth', 'crypto', 'sessions', 'csrf', 'rate-limiting', 'audit', 'rbac', 'docker', 'ci', 'testing'],
  scaffold: [
    {
      file: 'package.json',
      content: `{
  "name": "gatehouse",
  "version": "1.0.0",
  "private": true,
  "description": "An authentication service with hardened sessions, CSRF, authorization, and audit logging.",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "engines": {
    "node": ">=20"
  }
}
`,
    },
    {
      file: 'package-lock.json',
      content: `{
  "name": "gatehouse",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "gatehouse",
      "version": "1.0.0",
      "engines": {
        "node": ">=20"
      }
    }
  }
}
`,
    },
    {
      file: 'lib/passwords.js',
      content: `const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };
const MIN_LENGTH = 12;
const MAX_LENGTH = 200;

function hashPassword(password) {
  // TODO (step 1): validate, salt, derive, and return an encoded hash.
  throw new Error('hashPassword is not implemented yet');
}

function verifyPassword(password, stored) {
  // TODO (step 2): re-derive with the stored parameters and compare safely.
  return false;
}

module.exports = { hashPassword, verifyPassword };
`,
    },
    {
      file: 'lib/sessions.js',
      content: `const { createHash, randomBytes } = require('node:crypto');

function createSessionStore(options = {}) {
  // TODO (step 3): create and verify sessions.
  // TODO (step 4): add revoke, revokeAllForUser, sweep.
  throw new Error('the session store is not implemented yet');
}

module.exports = { createSessionStore };
`,
    },
    {
      file: 'lib/rate-limit.js',
      content: `function createRateLimiter(options = {}) {
  // TODO (step 6): count attempts per key inside a fixed window.
  return {
    check() {
      return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
    },
    reset() {},
    size() {
      return 0;
    },
  };
}

module.exports = { createRateLimiter };
`,
    },
    {
      file: 'lib/login-throttle.js',
      content: `const { createRateLimiter } = require('./rate-limit');

function createLoginThrottle(options = {}) {
  // TODO (step 7): limit both the client and the targeted account.
  return {
    check() {
      return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
    },
    succeed() {},
  };
}

module.exports = { createLoginThrottle };
`,
    },
    {
      file: 'lib/audit.js',
      content: `function createAuditLog(options = {}) {
  // TODO (step 5): write one JSON line per event with secrets redacted.
  return {
    record(event, fields) {
      return { event, ...fields };
    },
    lines() {
      return [];
    },
  };
}

module.exports = { createAuditLog };
`,
    },
    {
      file: 'lib/authz.js',
      content: `const { createHash, timingSafeEqual } = require('node:crypto');

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function requireUser(session) {
  // TODO (step 8): reject a missing session with 401.
  return session;
}

function requireRole(user, role) {
  // TODO (step 8): reject anonymous users (401) and the wrong role (403).
  return user;
}

function verifyCsrf(session, token) {
  // TODO (step 9): compare the submitted token with the session token.
  return false;
}

module.exports = { AuthError, requireUser, requireRole, verifyCsrf };
`,
    },
    {
      file: 'lib/users.js',
      content: `const { hashPassword, verifyPassword } = require('./passwords');

const ROLES = new Set(['member', 'admin']);

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    ...(user.passwordChangedAt ? { passwordChangedAt: user.passwordChangedAt } : {}),
  };
}

function createUserStore(seed = []) {
  const users = new Map();
  let nextId = 1;

  function create() {
    // TODO (step 10): normalise the email, validate, hash, and store.
    throw new Error('create is not implemented yet');
  }

  function findByEmail() {
    // TODO (step 10)
    return null;
  }

  function findById() {
    // TODO (step 10)
    return null;
  }

  function list() {
    // TODO (step 10)
    return [];
  }

  function changePassword() {
    // TODO (step 11)
    throw new Error('changePassword is not implemented yet');
  }

  for (const entry of seed) create(entry);

  return { create, findByEmail, findById, list, changePassword };
}

module.exports = { createUserStore, toPublicUser };
`,
    },
    {
      file: 'lib/http.js',
      content: `const { httpError } = require('./http-errors');

const MAX_BODY_BYTES = 16 * 1024;
const SESSION_COOKIE = 'gatehouse_session';

function readCookie(header, name) {
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

function sessionCookie(token, expiresAt, secure) {
  const seconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return SESSION_COOKIE + '=' + token
    + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + seconds
    + (secure ? '; Secure' : '');
}

function clearCookie(secure) {
  return SESSION_COOKIE + '=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
    + (secure ? '; Secure' : '');
}

function setSecurityHeaders() {
  // TODO (step 15): nosniff, frame denial, no referrer, no-store, and a CSP.
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req) {
  // TODO (step 15): require application/json, cap the body, reject 413.
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(httpError(400, 'request body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

module.exports = {
  MAX_BODY_BYTES,
  SESSION_COOKIE,
  clearCookie,
  readCookie,
  readJson,
  sendJson,
  sessionCookie,
  setSecurityHeaders,
};
`,
    },
    {
      file: 'lib/http-errors.js',
      content: `class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function httpError(status, message) {
  return new HttpError(status, message);
}

module.exports = { HttpError, httpError };
`,
    },
    {
      file: 'routes/login.js',
      content: `const { httpError } = require('../lib/http-errors');

async function login() {
  // TODO (step 12): authenticate, throttle, audit, and set the session cookie.
  throw httpError(501, 'sign-in is not implemented yet');
}

module.exports = { login };
`,
    },
    {
      file: 'routes/session.js',
      content: `const { httpError } = require('../lib/http-errors');

async function me() {
  // TODO (step 13)
  throw httpError(501, 'session lookup is not implemented yet');
}

async function logout() {
  // TODO (step 13)
  throw httpError(501, 'sign-out is not implemented yet');
}

async function changePassword() {
  // TODO (step 13)
  throw httpError(501, 'password changes are not implemented yet');
}

module.exports = { me, logout, changePassword };
`,
    },
    {
      file: 'routes/admin.js',
      content: `const { httpError } = require('../lib/http-errors');

async function listUsers() {
  // TODO (step 14)
  throw httpError(501, 'the admin list is not implemented yet');
}

async function createUser() {
  // TODO (step 14)
  throw httpError(501, 'creating users is not implemented yet');
}

module.exports = { listUsers, createUser };
`,
    },
    {
      file: 'server.js',
      content: `const http = require('node:http');

const { createAuditLog } = require('./lib/audit');
const { readCookie, sendJson, setSecurityHeaders, SESSION_COOKIE } = require('./lib/http');
const { createLoginThrottle } = require('./lib/login-throttle');
const { createSessionStore } = require('./lib/sessions');
const { createUserStore } = require('./lib/users');
const { login } = require('./routes/login');
const { me, logout, changePassword } = require('./routes/session');
const { listUsers, createUser } = require('./routes/admin');

function createApp(options = {}) {
  const users = options.users || createUserStore();
  const sessions = options.sessions || createSessionStore();
  const throttle = options.throttle || createLoginThrottle();
  const audit = options.audit || createAuditLog({ sink: () => {} });
  const secureCookies = options.secureCookies === true;

  const routes = new Map([
    ['POST /auth/login', login],
    ['GET /auth/me', me],
    ['POST /auth/logout', logout],
    ['POST /auth/password', changePassword],
    ['GET /admin/users', listUsers],
    ['POST /admin/users', createUser],
  ]);

  return http.createServer(async (req, res) => {
    setSecurityHeaders(res);
    const ip = req.socket.remoteAddress || 'unknown';

    try {
      const url = new URL(req.url, 'http://localhost');
      const token = readCookie(req.headers.cookie, SESSION_COOKIE);
      const session = token ? sessions.verify(token) : null;
      const user = session ? users.findById(session.userId) : null;
      const handler = routes.get(req.method + ' ' + url.pathname);
      if (!handler) return sendJson(res, 404, { error: 'not found' });

      return await handler({
        req,
        res,
        url,
        ip,
        token,
        session,
        user,
        users,
        sessions,
        throttle,
        audit,
        secureCookies,
      });
    } catch (error) {
      const status = error.status || 500;
      return sendJson(res, status, {
        error: status === 500 ? 'something went wrong' : error.message,
      });
    }
  });
}

module.exports = { createApp };

if (require.main === module) {
  const users = createUserStore();
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    try {
      users.create({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log('Seeded the admin account from the environment.');
    } catch (error) {
      console.error('Could not seed the admin account: ' + error.message);
      process.exitCode = 1;
    }
  }

  const port = Number(process.env.PORT) || 3000;
  createApp({ users, secureCookies: process.env.COOKIE_SECURE === 'true' }).listen(port, () => {
    console.log('Gatehouse listening on http://localhost:' + port);
  });
}
`,
    },
    {
      file: 'test/helpers.js',
      content: `const { createApp } = require('../server');
const { createAuditLog } = require('../lib/audit');
const { createUserStore } = require('../lib/users');

const ADMIN = {
  email: 'ada@example.com',
  password: 'correct horse battery staple',
  role: 'admin',
};
const MEMBER = {
  email: 'sam@example.com',
  password: 'a long member password',
  role: 'member',
};

async function withApp(run, options = {}) {
  const users = options.users || createUserStore();
  if (!options.users) {
    users.create(ADMIN);
    users.create(MEMBER);
  }

  const auditLines = [];
  const audit = createAuditLog({ sink: (line) => auditLines.push(line) });
  const app = createApp({ users, audit, ...options });
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + app.address().port;

  try {
    await run({ base, users, auditLines, audit, app });
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
}

function tokenFrom(response) {
  const header = response.headers.get('set-cookie') || '';
  const first = header.split(';')[0];
  if (!first.startsWith('gatehouse_session=')) return null;
  return first.slice('gatehouse_session='.length);
}

async function call(base, path, { method = 'GET', body, token, csrf, contentType = 'application/json' } = {}) {
  const headers = {};
  if (token) headers.cookie = 'gatehouse_session=' + token;
  if (csrf) headers['x-csrf-token'] = csrf;
  let payload;
  if (body !== undefined) {
    headers['content-type'] = contentType;
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(base + path, { method, headers, body: payload });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  return { status: response.status, headers: response.headers, body: parsed };
}

async function login(base, email, password) {
  const response = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  return { status: response.status, response, body, token: tokenFrom(response) };
}

module.exports = { ADMIN, MEMBER, call, login, tokenFrom, withApp };
`,
    },
    {
      file: 'test/passwords-hash.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword } = require('../lib/passwords');

const PASSWORD = 'correct horse battery staple';

test('encodes scrypt parameters, a fresh salt, and a 64-byte hash', () => {
  const first = hashPassword(PASSWORD);
  const second = hashPassword(PASSWORD);
  const parts = first.split('$');

  assert.equal(parts.length, 6);
  assert.equal(parts[0], 'scrypt');
  assert.deepEqual(parts.slice(1, 4), ['16384', '8', '1']);
  assert.ok(parts[4].length >= 20);
  assert.ok(parts[5].length >= 80);
  assert.notEqual(parts[4], second.split('$')[4]);
  assert.notEqual(first, second);
  assert.equal(first.includes(PASSWORD), false);
});

test('enforces the password policy in code points', () => {
  assert.doesNotThrow(() => hashPassword('x'.repeat(12)));
  assert.doesNotThrow(() => hashPassword('x'.repeat(200)));
  assert.throws(() => hashPassword('x'.repeat(11)));
  assert.throws(() => hashPassword('x'.repeat(201)));
  assert.throws(() => hashPassword(123456789012));
  assert.throws(() => hashPassword(undefined));
});
`,
    },
    {
      file: 'test/passwords-verify.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../lib/passwords');

const PASSWORD = 'correct horse battery staple';

test('verifies the right password and rejects the wrong one', () => {
  const stored = hashPassword(PASSWORD);
  assert.equal(verifyPassword(PASSWORD, stored), true);
  assert.equal(verifyPassword(PASSWORD + '!', stored), false);
  assert.equal(verifyPassword('', stored), false);
});

test('malformed or hostile stored hashes never verify', () => {
  const stored = hashPassword(PASSWORD);
  const parts = stored.split('$');
  const tampered = [parts[0], parts[1], parts[2], parts[3], parts[4], parts[5].slice(0, -4) + 'AAAA'].join('$');

  assert.equal(verifyPassword(PASSWORD, 'not-a-hash'), false);
  assert.equal(verifyPassword(PASSWORD, tampered), false);
  assert.equal(verifyPassword(PASSWORD, null), false);
  assert.equal(verifyPassword(PASSWORD, ['bcrypt', parts[1], parts[2], parts[3], parts[4], parts[5]].join('$')), false);
  assert.equal(verifyPassword(PASSWORD, ['scrypt', '999999999', parts[2], parts[3], parts[4], parts[5]].join('$')), false);
  assert.equal(verifyPassword(PASSWORD, ['scrypt', '16384', '99', parts[3], parts[4], parts[5]].join('$')), false);
  assert.equal(verifyPassword(PASSWORD, ['scrypt', parts[1], parts[2], parts[3], parts[4]].join('$')), false);
});
`,
    },
    {
      file: 'test/sessions-core.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessionStore } = require('../lib/sessions');

test('creates an opaque token, a separate CSRF token, and an expiry', () => {
  const store = createSessionStore();
  const session = store.create(7);

  assert.ok(session.token.length >= 40);
  assert.ok(session.csrfToken.length >= 40);
  assert.notEqual(session.token, session.csrfToken);
  assert.ok(session.expiresAt > Date.now());

  const found = store.verify(session.token);
  assert.equal(found.userId, 7);
  assert.equal(found.csrfToken, session.csrfToken);
  assert.equal(found.expiresAt, session.expiresAt);
});

test('two sessions never share a token', () => {
  const store = createSessionStore();
  const first = store.create(1);
  const second = store.create(1);
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.csrfToken, second.csrfToken);
  assert.equal(store.verify(first.token).userId, 1);
  assert.equal(store.verify(second.token).userId, 1);
});

test('tampered, empty, and unknown tokens never verify', () => {
  const store = createSessionStore();
  const session = store.create(7);
  const last = session.token.slice(-1);
  const tampered = session.token.slice(0, -1) + (last === 'A' ? 'B' : 'A');

  assert.equal(store.verify(tampered), null);
  assert.equal(store.verify(''), null);
  assert.equal(store.verify(undefined), null);
  assert.equal(store.verify(session.token + 'x'), null);
});

test('expired sessions are removed on lookup', () => {
  let clock = 1000;
  const store = createSessionStore({ ttlMs: 5000, now: () => clock });
  const session = store.create(7);

  clock = 5000;
  assert.ok(store.verify(session.token));
  clock = 6000;
  assert.equal(store.verify(session.token), null);
  assert.equal(store.size(), 0);
});
`,
    },
    {
      file: 'test/sessions-revoke.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessionStore } = require('../lib/sessions');

test('logout revokes one session and leaves the others alone', () => {
  const store = createSessionStore();
  const first = store.create(1);
  const second = store.create(1);
  const other = store.create(2);

  assert.equal(store.revoke(first.token), true);
  assert.equal(store.verify(first.token), null);
  assert.equal(store.verify(second.token).userId, 1);
  assert.equal(store.revoke('missing-token'), false);
  assert.equal(store.revoke(undefined), false);
  assert.ok(store.verify(other.token));
});

test('revokeAllForUser ends every session for one account', () => {
  const store = createSessionStore();
  const first = store.create(1);
  const second = store.create(1);
  const other = store.create(2);

  assert.equal(store.revokeAllForUser(1), 2);
  assert.equal(store.verify(first.token), null);
  assert.equal(store.verify(second.token), null);
  assert.ok(store.verify(other.token));
  assert.equal(store.revokeAllForUser(1), 0);
});

test('sweep removes only expired sessions', () => {
  let clock = 0;
  const store = createSessionStore({ ttlMs: 100, now: () => clock });
  const old = store.create(1);
  clock = 50;
  const fresh = store.create(2);
  clock = 120;

  assert.equal(store.sweep(), 1);
  assert.equal(store.verify(old.token), null);
  assert.ok(store.verify(fresh.token));
  assert.equal(store.size(), 1);
});
`,
    },
    {
      file: 'test/audit.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuditLog } = require('../lib/audit');

test('writes one JSON line per event', () => {
  const lines = [];
  const audit = createAuditLog({
    sink: (line) => lines.push(line),
    now: () => '2026-01-01T00:00:00.000Z',
  });
  const entry = audit.record('login_ok', { userId: 1 });

  assert.deepEqual(entry, { ts: '2026-01-01T00:00:00.000Z', event: 'login_ok', userId: 1 });
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).event, 'login_ok');
  assert.equal(audit.lines().length, 1);
});

test('secrets are redacted at any depth', () => {
  const audit = createAuditLog({ sink: () => {} });
  const entry = audit.record('login_failed', {
    email: 'ada@example.com',
    password: 'hunter2',
    token: 'raw-session-token',
    headers: { authorization: 'Bearer x', cookie: 'a=b' },
  });

  assert.equal(entry.password, '[redacted]');
  assert.equal(entry.token, '[redacted]');
  assert.equal(entry.headers.authorization, '[redacted]');
  assert.equal(entry.headers.cookie, '[redacted]');
  assert.equal(entry.email, 'ada@example.com');
});

test('an event needs a name', () => {
  const audit = createAuditLog({ sink: () => {} });
  assert.throws(() => audit.record(''));
  assert.throws(() => audit.record('   '));
});
`,
    },
    {
      file: 'test/rate-limit.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../lib/rate-limit');

test('allows exactly the limit inside one window', () => {
  let clock = 0;
  const limiter = createRateLimiter({ limit: 3, windowMs: 60000, now: () => clock });
  const results = [1, 2, 3].map(() => limiter.check('ip'));

  assert.deepEqual(results.map((result) => result.allowed), [true, true, true]);
  assert.deepEqual(results.map((result) => result.remaining), [2, 1, 0]);

  const blocked = limiter.check('ip');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 60);
});

test('a new window starts over', () => {
  let clock = 0;
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => clock });
  assert.equal(limiter.check('ip').allowed, true);
  assert.equal(limiter.check('ip').allowed, false);
  clock = 1001;
  assert.equal(limiter.check('ip').allowed, true);
});

test('keys are independent and reset clears one key', () => {
  const limiter = createRateLimiter({ limit: 1 });
  assert.equal(limiter.check('one').allowed, true);
  assert.equal(limiter.check('two').allowed, true);
  assert.equal(limiter.check('one').allowed, false);

  limiter.reset('one');
  assert.equal(limiter.check('one').allowed, true);
  assert.equal(limiter.size(), 2);
});
`,
    },
    {
      file: 'test/login-throttle.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../lib/rate-limit');
const { createLoginThrottle } = require('../lib/login-throttle');

function makeThrottle(limit = 3) {
  const limiter = createRateLimiter({ limit, windowMs: 60000 });
  return createLoginThrottle({ limiter });
}

test('one client cannot try unlimited accounts', () => {
  const throttle = makeThrottle(3);
  assert.equal(throttle.check('1.1.1.1', 'a@example.com').allowed, true);
  assert.equal(throttle.check('1.1.1.1', 'b@example.com').allowed, true);
  assert.equal(throttle.check('1.1.1.1', 'c@example.com').allowed, true);

  const blocked = throttle.check('1.1.1.1', 'd@example.com');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
});

test('one account cannot be guessed from many clients', () => {
  const throttle = makeThrottle(3);
  assert.equal(throttle.check('1.1.1.1', 'ada@example.com').allowed, true);
  assert.equal(throttle.check('2.2.2.2', 'ada@example.com').allowed, true);
  assert.equal(throttle.check('3.3.3.3', 'ada@example.com').allowed, true);

  const blocked = throttle.check('4.4.4.4', 'ada@example.com');
  assert.equal(blocked.allowed, false);
});

test('the account key ignores email case and surrounding space', () => {
  const throttle = makeThrottle(2);
  throttle.check('1.1.1.1', 'Ada@Example.com');
  throttle.check('2.2.2.2', '  ada@example.COM ');
  assert.equal(throttle.check('3.3.3.3', 'ADA@EXAMPLE.COM').allowed, false);
});

test('a success clears the account budget but not the client budget', () => {
  const throttle = makeThrottle(3);
  throttle.check('1.1.1.1', 'ada@example.com');
  throttle.check('2.2.2.2', 'ada@example.com');
  throttle.check('3.3.3.3', 'ada@example.com');
  assert.equal(throttle.check('4.4.4.4', 'ada@example.com').allowed, false);

  throttle.succeed('ada@example.com');
  assert.equal(throttle.check('5.5.5.5', 'ada@example.com').allowed, true);

  const busyClient = makeThrottle(2);
  busyClient.check('9.9.9.9', 'a@example.com');
  busyClient.check('9.9.9.9', 'b@example.com');
  busyClient.succeed('b@example.com');
  assert.equal(busyClient.check('9.9.9.9', 'c@example.com').allowed, false);
});
`,
    },
    {
      file: 'test/authz-roles.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { AuthError, requireUser, requireRole } = require('../lib/authz');

test('anonymous requests are unauthorized', () => {
  assert.throws(() => requireUser(null), (error) => error instanceof AuthError && error.status === 401);
  assert.throws(() => requireUser({}), (error) => error instanceof AuthError && error.status === 401);
  assert.throws(() => requireRole(null, 'admin'), (error) => error instanceof AuthError && error.status === 401);
});

test('a member cannot reach an admin route', () => {
  assert.throws(
    () => requireRole({ role: 'member' }, 'admin'),
    (error) => error instanceof AuthError && error.status === 403,
  );
  assert.equal(requireRole({ role: 'admin' }, 'admin').role, 'admin');
  assert.equal(requireRole({ role: 'member' }, 'member').role, 'member');
});

test('the returned user is the same record, so callers read the stored role', () => {
  const user = { id: 1, role: 'admin' };
  assert.equal(requireRole(user, 'admin'), user);
  const session = { userId: 1 };
  assert.equal(requireUser(session), session);
});
`,
    },
    {
      file: 'test/authz-csrf.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyCsrf } = require('../lib/authz');

test('the submitted token must equal the session token exactly', () => {
  const session = { csrfToken: 'token-a' };
  assert.equal(verifyCsrf(session, 'token-a'), true);
  assert.equal(verifyCsrf(session, 'token-b'), false);
  assert.equal(verifyCsrf(session, 'token-a '), false);
  assert.equal(verifyCsrf(session, ''), false);
  assert.equal(verifyCsrf(session, null), false);
  assert.equal(verifyCsrf(session, undefined), false);
});

test('a session without a CSRF token never verifies', () => {
  assert.equal(verifyCsrf({}, 'token-a'), false);
  assert.equal(verifyCsrf({ csrfToken: '' }, ''), false);
  assert.equal(verifyCsrf(null, 'token-a'), false);
  assert.equal(verifyCsrf(undefined, 'token-a'), false);
});

test('two sessions do not share a CSRF token', () => {
  const first = { csrfToken: 'first-token' };
  const second = { csrfToken: 'second-token' };
  assert.equal(verifyCsrf(first, first.csrfToken), true);
  assert.equal(verifyCsrf(first, second.csrfToken), false);
});
`,
    },
    {
      file: 'test/users.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createUserStore } = require('../lib/users');

const PASSWORD = 'a long enough password';

test('normalises the email and returns a public user', () => {
  const store = createUserStore();
  const user = store.create({ email: '  Ada@Example.COM ', password: PASSWORD });

  assert.equal(user.email, 'ada@example.com');
  assert.equal(user.role, 'member');
  assert.equal(typeof user.id, 'number');
  assert.ok(user.createdAt);
  assert.equal('passwordHash' in user, false);
});

test('lookup is case-insensitive and internal records keep the hash', () => {
  const store = createUserStore();
  const created = store.create({ email: 'ada@example.com', password: PASSWORD });
  const found = store.findByEmail('ADA@EXAMPLE.COM');

  assert.equal(found.id, created.id);
  assert.ok(found.passwordHash.startsWith('scrypt$'));
  assert.equal(store.findById(created.id).email, 'ada@example.com');
  assert.equal(store.findById(999), null);
});

test('rejects invalid emails, roles, duplicates, and weak passwords', () => {
  const store = createUserStore();
  store.create({ email: 'ada@example.com', password: PASSWORD });

  assert.throws(() => store.create({ email: 'nope', password: PASSWORD }));
  assert.throws(() => store.create({ email: 'a@b.c', password: PASSWORD, role: 'owner' }));
  assert.throws(() => store.create({ email: 'ADA@example.com', password: PASSWORD }));
  assert.throws(() => store.create({ email: 'new@example.com', password: 'short' }));
  assert.throws(() => createUserStore([{ email: 'nope', password: PASSWORD }]));
});

test('list exposes only public fields', () => {
  const store = createUserStore();
  store.create({ email: 'ada@example.com', password: PASSWORD, role: 'admin' });
  store.create({ email: 'sam@example.com', password: PASSWORD });
  const listed = store.list();

  assert.equal(listed.length, 2);
  assert.equal(listed.some((user) => user.email === 'ada@example.com' && user.role === 'admin'), true);
  assert.equal(JSON.stringify(listed).includes('passwordHash'), false);
});
`,
    },
    {
      file: 'test/users-password.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createUserStore } = require('../lib/users');
const { verifyPassword } = require('../lib/passwords');

const OLD = 'the original long password';
const NEW = 'a completely new password';

function makeStore() {
  const store = createUserStore();
  const user = store.create({ email: 'ada@example.com', password: OLD });
  return { store, user };
}

test('changes the hash, not the identity', () => {
  const { store, user } = makeStore();
  const updated = store.changePassword(user.id, OLD, NEW);
  const record = store.findById(user.id);

  assert.equal(updated.id, user.id);
  assert.equal(updated.email, 'ada@example.com');
  assert.equal(updated.role, 'member');
  assert.equal('passwordHash' in updated, false);
  assert.ok(updated.passwordChangedAt);
  assert.equal(verifyPassword(OLD, record.passwordHash), false);
  assert.equal(verifyPassword(NEW, record.passwordHash), true);
});

test('rejects the wrong current password with 403', () => {
  const { store, user } = makeStore();
  assert.throws(
    () => store.changePassword(user.id, 'the wrong long password', NEW),
    (error) => error.status === 403,
  );
});

test('rejects a weak new password with 400', () => {
  const { store, user } = makeStore();
  assert.throws(
    () => store.changePassword(user.id, OLD, 'short'),
    (error) => error.status === 400,
  );
});

test('rejects an unknown account with 404', () => {
  const { store } = makeStore();
  assert.throws(
    () => store.changePassword(999, OLD, NEW),
    (error) => error.status === 404,
  );
});
`,
    },
    {
      file: 'test/server-login.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN, login, withApp } = require('./helpers');

test('login sets a hardened cookie and returns a CSRF token', async () => {
  await withApp(async ({ base }) => {
    const result = await login(base, ADMIN.email, ADMIN.password);
    const cookie = result.response.headers.get('set-cookie');

    assert.equal(result.status, 200);
    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(cookie.includes('SameSite=Strict'));
    assert.ok(cookie.includes('Path=/'));
    assert.equal(cookie.includes('Secure'), false);
    assert.ok(result.token.length >= 40);

    assert.equal(result.body.user.email, ADMIN.email);
    assert.equal(result.body.user.role, 'admin');
    assert.equal('passwordHash' in result.body.user, false);
    assert.ok(result.body.csrfToken.length >= 40);
  });
});

test('secure cookies are opt-in for HTTPS deployments', async () => {
  await withApp(async ({ base }) => {
    const result = await login(base, ADMIN.email, ADMIN.password);
    assert.ok(result.response.headers.get('set-cookie').includes('Secure'));
  }, { secureCookies: true });
});

test('unknown emails and wrong passwords are indistinguishable', async () => {
  await withApp(async ({ base, auditLines }) => {
    const unknown = await login(base, 'nobody@example.com', 'a long wrong password');
    const wrong = await login(base, ADMIN.email, 'a long wrong password');

    assert.equal(unknown.status, 401);
    assert.deepEqual(unknown.body, wrong.body);
    assert.equal(unknown.body.error, 'invalid email or password');
    assert.ok(auditLines.some((line) => line.includes('login_failed')));
    assert.equal(auditLines.some((line) => line.includes(ADMIN.password)), false);
  });
});

test('repeated failures are rate limited with Retry-After', async () => {
  await withApp(async ({ base }) => {
    let last = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      last = await login(base, ADMIN.email, 'a long wrong password');
    }
    assert.equal(last.status, 401);

    const blocked = await login(base, ADMIN.email, ADMIN.password);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.response.headers.get('retry-after')) > 0);
  });
});
`,
    },
    {
      file: 'test/server-session.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN, call, login, withApp } = require('./helpers');

test('/auth/me requires a session and never returns the hash', async () => {
  await withApp(async ({ base }) => {
    const anonymous = await call(base, '/auth/me');
    assert.equal(anonymous.status, 401);

    const result = await login(base, ADMIN.email, ADMIN.password);
    const me = await call(base, '/auth/me', { token: result.token });

    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, result.body.user.id);
    assert.equal(me.body.csrfToken, result.body.csrfToken);
    assert.equal(JSON.stringify(me.body).includes('passwordHash'), false);
  });
});

test('logout needs the matching CSRF token and revokes only that session', async () => {
  await withApp(async ({ base }) => {
    const first = await login(base, ADMIN.email, ADMIN.password);
    const second = await login(base, ADMIN.email, ADMIN.password);

    const noCsrf = await call(base, '/auth/logout', { method: 'POST', token: first.token });
    assert.equal(noCsrf.status, 403);

    const fromOtherSession = await call(base, '/auth/logout', {
      method: 'POST',
      token: first.token,
      csrf: second.body.csrfToken,
    });
    assert.equal(fromOtherSession.status, 403);

    const ok = await call(base, '/auth/logout', {
      method: 'POST',
      token: first.token,
      csrf: first.body.csrfToken,
    });
    assert.equal(ok.status, 200);
    assert.ok(ok.headers.get('set-cookie').includes('Max-Age=0'));

    assert.equal((await call(base, '/auth/me', { token: first.token })).status, 401);
    assert.equal((await call(base, '/auth/me', { token: second.token })).status, 200);
  });
});

test('changing a password revokes every session and reissues one', async () => {
  await withApp(async ({ base }) => {
    const first = await login(base, ADMIN.email, ADMIN.password);
    const second = await login(base, ADMIN.email, ADMIN.password);
    const NEW = 'a replacement long password';

    const noCsrf = await call(base, '/auth/password', {
      method: 'POST',
      token: first.token,
      body: { currentPassword: ADMIN.password, newPassword: NEW },
    });
    assert.equal(noCsrf.status, 403);

    const wrongCurrent = await call(base, '/auth/password', {
      method: 'POST',
      token: first.token,
      csrf: first.body.csrfToken,
      body: { currentPassword: 'not the current password', newPassword: NEW },
    });
    assert.equal(wrongCurrent.status, 403);

    const weak = await call(base, '/auth/password', {
      method: 'POST',
      token: first.token,
      csrf: first.body.csrfToken,
      body: { currentPassword: ADMIN.password, newPassword: 'short' },
    });
    assert.equal(weak.status, 400);

    const changed = await call(base, '/auth/password', {
      method: 'POST',
      token: first.token,
      csrf: first.body.csrfToken,
      body: { currentPassword: ADMIN.password, newPassword: NEW },
    });
    assert.equal(changed.status, 200);
    assert.ok(changed.body.csrfToken);
    assert.equal(changed.body.user.email, ADMIN.email);
    assert.equal(changed.body.user.passwordChangedAt.length > 0, true);

    const newToken = (changed.headers.get('set-cookie') || '').split(';')[0]
      .replace('gatehouse_session=', '');
    assert.equal((await call(base, '/auth/me', { token: first.token })).status, 401);
    assert.equal((await call(base, '/auth/me', { token: second.token })).status, 401);
    assert.equal((await call(base, '/auth/me', { token: newToken })).status, 200);

    assert.equal((await login(base, ADMIN.email, ADMIN.password)).status, 401);
    assert.equal((await login(base, ADMIN.email, NEW)).status, 200);
  });
});
`,
    },
    {
      file: 'test/server-admin.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN, MEMBER, call, login, withApp } = require('./helpers');

async function signIn(base, account) {
  const result = await login(base, account.email, account.password);
  assert.equal(result.status, 200);
  return result;
}

test('members are forbidden from every admin route', async () => {
  await withApp(async ({ base }) => {
    const member = await signIn(base, MEMBER);

    assert.equal((await call(base, '/admin/users', { token: member.token })).status, 403);
    assert.equal((await call(base, '/admin/users', {
      method: 'POST',
      token: member.token,
      csrf: member.body.csrfToken,
      body: { email: 'new@example.com', password: 'another long password' },
    })).status, 403);
  });
});

test('admins can list users, and the list never contains hashes', async () => {
  await withApp(async ({ base }) => {
    const admin = await signIn(base, ADMIN);
    const list = await call(base, '/admin/users', { token: admin.token });

    assert.equal(list.status, 200);
    assert.ok(list.body.users.length >= 2);
    assert.equal(JSON.stringify(list.body).includes('passwordHash'), false);
  });
});

test('creating a user needs admin rights and CSRF', async () => {
  await withApp(async ({ base }) => {
    const admin = await signIn(base, ADMIN);
    const payload = { email: 'new@example.com', password: 'another long password' };

    const anonymous = await call(base, '/admin/users', { method: 'POST', body: payload });
    assert.equal(anonymous.status, 401);

    const noCsrf = await call(base, '/admin/users', {
      method: 'POST',
      token: admin.token,
      body: payload,
    });
    assert.equal(noCsrf.status, 403);

    const created = await call(base, '/admin/users', {
      method: 'POST',
      token: admin.token,
      csrf: admin.body.csrfToken,
      body: payload,
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.email, 'new@example.com');
    assert.equal(created.body.user.role, 'member');
    assert.equal('passwordHash' in created.body.user, false);

    assert.equal((await login(base, payload.email, payload.password)).status, 200);
  });
});

test('invalid new users are rejected with 400 and no internals', async () => {
  await withApp(async ({ base }) => {
    const admin = await signIn(base, ADMIN);
    const cases = [
      { email: 'nope', password: 'another long password' },
      { email: 'new@example.com', password: 'short' },
      { email: ADMIN.email, password: 'another long password' },
      { email: 'new@example.com', password: 'another long password', role: 'owner' },
    ];

    for (const body of cases) {
      const result = await call(base, '/admin/users', {
        method: 'POST',
        token: admin.token,
        csrf: admin.body.csrfToken,
        body,
      });
      assert.equal(result.status, 400);
      assert.equal(JSON.stringify(result.body).includes('    at '), false);
    }

    const arrayBody = await call(base, '/admin/users', {
      method: 'POST',
      token: admin.token,
      csrf: admin.body.csrfToken,
      body: [{ email: 'x@example.com', password: 'another long password' }],
    });
    assert.equal(arrayBody.status, 400);
  });
});
`,
    },
    {
      file: 'test/server-hardening.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN, call, withApp } = require('./helpers');

test('every response carries the security headers', async () => {
  await withApp(async ({ base }) => {
    const missing = await call(base, '/nope');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(missing.headers.get('x-frame-options'), 'DENY');
    assert.equal(missing.headers.get('cache-control'), 'no-store');
    assert.equal(missing.headers.get('referrer-policy'), 'no-referrer');
    assert.ok(missing.headers.get('content-security-policy'));

    const ok = await call(base, '/auth/me');
    assert.equal(ok.status, 401);
    assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
  });
});

test('unknown routes are a JSON 404 with no stack trace', async () => {
  await withApp(async ({ base }) => {
    const response = await call(base, '/api/secret');
    assert.equal(response.status, 404);
    assert.equal(response.body.error, 'not found');
    assert.equal(JSON.stringify(response.body).includes('    at '), false);
  });
});

test('only JSON bodies are parsed', async () => {
  await withApp(async ({ base }) => {
    const response = await call(base, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
      contentType: 'text/plain',
    });
    assert.equal(response.status, 415);
  });
});

test('oversized bodies are refused before hashing', async () => {
  await withApp(async ({ base }) => {
    const response = await call(base, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN.email, password: 'x'.repeat(20000) }),
    });
    assert.equal(response.status, 413);
  });
});

test('invalid JSON and empty bodies are 400s', async () => {
  await withApp(async ({ base }) => {
    const invalid = await call(base, '/auth/login', { method: 'POST', body: '{not json' });
    assert.equal(invalid.status, 400);
    assert.equal(JSON.stringify(invalid.body).includes('    at '), false);

    const empty = await call(base, '/auth/login', { method: 'POST', body: '' });
    assert.equal(empty.status, 400);
  });
});
`,
    },
    {
      file: 'test/security.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN, MEMBER, call, login, withApp } = require('./helpers');

// TODO (step 18): replace this placeholder with the adversarial tests described
// in the step. Use withApp, login, and call from ./helpers.
test('the security regression suite is written', () => {
  assert.fail('Replace this placeholder with real attack tests.');
});
`,
    },
    {
      file: 'test/infra.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const dockerignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8');

test('the image is built on a pinned Node 20 Alpine base', () => {
  assert.match(dockerfile, /^FROM node:20/m);
  assert.ok(dockerfile.includes('alpine'));
});

test('the container runs as a non-root user', () => {
  assert.ok(dockerfile.includes('USER node'));
  assert.equal(dockerfile.includes('USER root'), false);
});

test('dependencies install reproducibly from the lockfile', () => {
  assert.ok(dockerfile.includes('npm ci --omit=dev'));
  assert.equal(dockerfile.includes('npm install'), false);
});

test('secrets and build junk are not baked into the image', () => {
  assert.equal(/ENV [A-Z_]*(PASSWORD|SECRET|TOKEN)/.test(dockerfile), false);
  assert.ok(dockerignore.includes('.env'));
  assert.ok(dockerignore.includes('node_modules'));
});

test('the image exposes its port and reports its own health', () => {
  assert.ok(dockerfile.includes('EXPOSE 3000'));
  assert.ok(dockerfile.includes('HEALTHCHECK'));
  assert.ok(dockerfile.includes('CMD ["node", "server.js"]'));
});
`,
    },
    {
      file: 'test/ci.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ci = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'), 'utf8');

test('runs on pushes and pull requests', () => {
  assert.ok(ci.includes('pull_request'));
  assert.ok(ci.includes('push'));
});

test('tests more than one supported Node version', () => {
  assert.ok(ci.includes('matrix:'));
  assert.ok(ci.includes('20'));
  assert.ok(ci.includes('22'));
});

test('installs from the lockfile and runs the suite', () => {
  assert.ok(ci.includes('npm ci'));
  assert.equal(/npm install(?!-)/.test(ci), false);
  assert.ok(ci.includes('node --test'));
});

test('fails on a high-severity production dependency audit', () => {
  assert.ok(ci.includes('npm audit --omit=dev --audit-level=high'));
});

test('the workflow token is read-only', () => {
  assert.ok(ci.includes('permissions:'));
  assert.ok(ci.includes('contents: read'));
});

test('the pipeline never echoes a secret', () => {
  assert.equal(/echo.*secrets\\./.test(ci), false);
});
`,
    },
    {
      file: '.dockerignore',
      content: `node_modules
npm-debug.log*
.env
.env.*
.git
.github
test
release
coverage
`,
    },
    {
      file: 'SECURITY.md',
      content: `# Security notes

- Passwords are hashed with scrypt and a per-password salt; they are never logged.
- Session tokens are random, stored hashed, sent only in an HttpOnly cookie, and
  expire. They never travel in a URL.
- State-changing requests need a double-submit CSRF token that matches the
  session it was issued with.
- Login attempts are limited per client and per targeted account.
- Audit events carry ids and outcomes, never credentials, tokens, or raw headers.
- Report a vulnerability privately to the maintainers; do not open a public issue.
`,
    },
  ],
  steps: [
    {
      id: 'gatehouse-1-hash',
      title: 'Hash passwords with a policy and a fresh salt',
      file: 'lib/passwords.js',
      task: 'Implement `hashPassword`. Reject non-text passwords and anything outside 12–200 characters (count code points, not UTF-16 units). Generate a fresh 16-byte salt per password, derive 64 bytes with scrypt (`N=16384`, `r=8`, `p=1`), and return a self-describing string: `scrypt$N$r$p$salt$hash`, both base64. The cost parameters travel with the hash so a future upgrade can verify old hashes. Run `node --test test/passwords-hash.test.js`.',
      examples: [
        {
          label: 'Derive and encode',
          code: `const salt = randomBytes(16);
const hash = scryptSync(password, salt, PARAMS.keylen, PARAMS);
return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$');`,
        },
        {
          label: 'Count code points, not length',
          code: `const length = Array.from(password).length;
if (length < MIN_LENGTH) throw new Error('passwords must be at least 12 characters');
if (length > MAX_LENGTH) throw new Error('passwords are limited to 200 characters');`,
        },
      ],
      hints: [
        'A salt makes two identical passwords hash differently; it must be random per call and stored beside the hash.',
        'Never trim, lowercase, or otherwise normalise a password — every character is significant.',
        'The hash string is the database format: the verifier must be able to read the algorithm and cost from it.',
        'scrypt is deliberately slow. The test file hashes several passwords, so expect the command to take a moment.',
      ],
      checks: [
        { id: 'fresh-salt', type: 'fileContains', file: 'lib/passwords.js', pattern: 'randomBytes', mode: 'string' },
        { id: 'hash-tests', type: 'runCommand', command: 'node --test test/passwords-hash.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };
const MIN_LENGTH = 12;
const MAX_LENGTH = 200;

function hashPassword(password) {
  if (typeof password !== 'string') {
    throw new TypeError('password must be text');
  }
  const length = Array.from(password).length;
  if (length < MIN_LENGTH) {
    throw new Error('passwords must be at least 12 characters');
  }
  if (length > MAX_LENGTH) {
    throw new Error('passwords are limited to 200 characters');
  }

  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, PARAMS.keylen, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

function verifyPassword(password, stored) {
  // Implemented in step 2.
  void timingSafeEqual;
  void stored;
  return false;
}

module.exports = { hashPassword, verifyPassword };
`,
    },
    {
      id: 'gatehouse-2-verify',
      title: 'Verify without leaking or crashing',
      file: 'lib/passwords.js',
      task: 'Implement `verifyPassword`. Parse the six-part hash, accept only the `scrypt` scheme, and bound the stored parameters (`N` between 1024 and 131072 and even, `r` 1–16, `p` 1–4) so a hostile database row cannot turn verification into a denial of service. Re-derive with the stored salt and length, compare with `timingSafeEqual`, and return `false` — never throw — for malformed input. Run `node --test test/passwords-verify.test.js`.',
      examples: [
        {
          label: 'Parse and bound',
          code: `const parts = stored.split('$');
if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
const N = Number(parts[1]);
const r = Number(parts[2]);
const p = Number(parts[3]);
if (!Number.isInteger(N) || N < 1024 || N > 131072 || N % 2 !== 0) return false;
if (!Number.isInteger(r) || r < 1 || r > 16) return false;
if (!Number.isInteger(p) || p < 1 || p > 4) return false;`,
        },
        {
          label: 'Compare the full digest',
          code: `const actual = scryptSync(password, Buffer.from(parts[4], 'base64'), expected.length, { N, r, p });
return timingSafeEqual(actual, expected);`,
        },
      ],
      hints: [
        'A hash from another algorithm is not your hash: check the scheme before parsing numbers.',
        'Bound the key length too — a short stored hash must not be compared with a full-length digest.',
        '`timingSafeEqual` throws on buffers of different lengths, so check the length before calling it.',
        'Wrap the derivation in `try`/`catch`: malformed base64 or absurd parameters must return false, not crash the login route.',
      ],
      checks: [
        { id: 'timing-safe', type: 'fileContains', file: 'lib/passwords.js', pattern: 'timingSafeEqual', mode: 'string' },
        { id: 'verify-tests', type: 'runCommand', command: 'node --test test/passwords-verify.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };
const MIN_LENGTH = 12;
const MAX_LENGTH = 200;

function hashPassword(password) {
  if (typeof password !== 'string') {
    throw new TypeError('password must be text');
  }
  const length = Array.from(password).length;
  if (length < MIN_LENGTH) {
    throw new Error('passwords must be at least 12 characters');
  }
  if (length > MAX_LENGTH) {
    throw new Error('passwords are limited to 200 characters');
  }

  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, PARAMS.keylen, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || N < 1024 || N > 131072 || N % 2 !== 0) return false;
  if (!Number.isInteger(r) || r < 1 || r > 16) return false;
  if (!Number.isInteger(p) || p < 1 || p > 4) return false;

  let expected;
  try {
    expected = Buffer.from(parts[5], 'base64');
  } catch {
    return false;
  }
  if (expected.length !== PARAMS.keylen) return false;

  try {
    const actual = scryptSync(password, Buffer.from(parts[4], 'base64'), expected.length, {
      N,
      r,
      p,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
`,
    },
    {
      id: 'gatehouse-3-sessions',
      title: 'Create sessions that survive a memory leak',
      file: 'lib/sessions.js',
      task: 'Build `createSessionStore` with `create`, `verify`, `size`, and an injectable `ttlMs`/`now` clock. Each session gets a 32-byte URL-safe token and a separate 32-byte CSRF token, plus an expiry. Store only the SHA-256 of the session token as the map key; a dump of the store must not contain a usable cookie. `verify` returns a copy for a live token, deletes and rejects an expired one, and rejects tampered or empty input. Run `node --test test/sessions-core.test.js`.',
      examples: [
        {
          label: 'Create the pair and store the hash',
          code: `const token = randomBytes(32).toString('base64url');
const csrfToken = randomBytes(32).toString('base64url');
const expiresAt = now() + ttlMs;
sessions.set(hashToken(token), { userId, csrfToken, expiresAt });
return { token, csrfToken, expiresAt };`,
        },
        {
          label: 'Verify without trusting the raw token',
          code: `const session = sessions.get(hashToken(token));
if (!session) return null;
if (session.expiresAt <= now()) {
  sessions.delete(hashToken(token));
  return null;
}
return { userId: session.userId, csrfToken: session.csrfToken, expiresAt: session.expiresAt };`,
        },
      ],
      hints: [
        'Hashing the token at rest means a stolen database snapshot cannot be replayed as a cookie.',
        'The CSRF token is separate from the session token so neither can be derived from the other.',
        '`randomBytes(32).toString("base64url")` gives 256 bits in a cookie-safe alphabet.',
        'Injected `now` is what makes expiry testable without sleeping; default it to `Date.now`.',
        'Return a fresh object from `verify`, not the stored reference — callers must not be able to mutate the session.',
      ],
      checks: [
        { id: 'hashes-tokens', type: 'fileContains', file: 'lib/sessions.js', pattern: 'createHash', mode: 'string' },
        { id: 'session-core-tests', type: 'runCommand', command: 'node --test test/sessions-core.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { createHash, randomBytes } = require('node:crypto');

const DEFAULT_TTL_MS = 30 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createSessionStore(options = {}) {
  const ttlMs = Number.isInteger(options.ttlMs) && options.ttlMs > 0
    ? options.ttlMs
    : DEFAULT_TTL_MS;
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const sessions = new Map();

  function create(userId) {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const expiresAt = now() + ttlMs;
    sessions.set(hashToken(token), { userId, csrfToken, expiresAt });
    return { token, csrfToken, expiresAt };
  }

  function verify(token) {
    if (typeof token !== 'string' || token.length < 20) return null;
    const key = hashToken(token);
    const session = sessions.get(key);
    if (!session) return null;
    if (session.expiresAt <= now()) {
      sessions.delete(key);
      return null;
    }
    return {
      userId: session.userId,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  }

  function revoke() {
    // Implemented in step 4.
    return false;
  }

  function revokeAllForUser() {
    // Implemented in step 4.
    return 0;
  }

  function sweep() {
    // Implemented in step 4.
    return 0;
  }

  return {
    create,
    verify,
    revoke,
    revokeAllForUser,
    sweep,
    size: () => sessions.size,
  };
}

module.exports = { createSessionStore, hashToken };
`,
    },
    {
      id: 'gatehouse-4-revoke',
      title: 'Revoke sessions deliberately',
      file: 'lib/sessions.js',
      task: 'Finish the lifecycle: `revoke(token)` deletes one session and reports whether it existed, `revokeAllForUser(userId)` ends every session for an account and returns the count, and `sweep()` removes expired entries on a schedule. All three must be exact — one user’s logout must never end another user’s session. Run `node --test test/sessions-revoke.test.js`.',
      examples: [
        {
          label: 'Revoke one hashed key',
          code: `function revoke(token) {
  if (typeof token !== 'string' || !token) return false;
  return sessions.delete(hashToken(token));
}`,
        },
        {
          label: 'Revoke a user, count the damage',
          code: `function revokeAllForUser(userId) {
  let removed = 0;
  for (const [key, session] of sessions) {
    if (session.userId === userId) {
      sessions.delete(key);
      removed += 1;
    }
  }
  return removed;
}`,
        },
      ],
      hints: [
        'Deleting from a Map while iterating it is safe in JavaScript, so revokeAllForUser does not need a copied array.',
        '`Map.delete` returns a boolean — use it instead of checking existence and then deleting.',
        'Sweep compares against the injected clock, not `Date.now()`, or the expiry tests will drift.',
        'Returning the number revoked makes a password-change audit line meaningful.',
      ],
      checks: [
        { id: 'revoke-method', type: 'fileContains', file: 'lib/sessions.js', pattern: 'revokeAllForUser', mode: 'string' },
        { id: 'session-revoke-tests', type: 'runCommand', command: 'node --test test/sessions-revoke.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { createHash, randomBytes } = require('node:crypto');

const DEFAULT_TTL_MS = 30 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createSessionStore(options = {}) {
  const ttlMs = Number.isInteger(options.ttlMs) && options.ttlMs > 0
    ? options.ttlMs
    : DEFAULT_TTL_MS;
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const sessions = new Map();

  function create(userId) {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const expiresAt = now() + ttlMs;
    sessions.set(hashToken(token), { userId, csrfToken, expiresAt });
    return { token, csrfToken, expiresAt };
  }

  function verify(token) {
    if (typeof token !== 'string' || token.length < 20) return null;
    const key = hashToken(token);
    const session = sessions.get(key);
    if (!session) return null;
    if (session.expiresAt <= now()) {
      sessions.delete(key);
      return null;
    }
    return {
      userId: session.userId,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  }

  function revoke(token) {
    if (typeof token !== 'string' || !token) return false;
    return sessions.delete(hashToken(token));
  }

  function revokeAllForUser(userId) {
    let removed = 0;
    for (const [key, session] of sessions) {
      if (session.userId === userId) {
        sessions.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  function sweep() {
    const time = now();
    let removed = 0;
    for (const [key, session] of sessions) {
      if (session.expiresAt <= time) {
        sessions.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  return {
    create,
    verify,
    revoke,
    revokeAllForUser,
    sweep,
    size: () => sessions.size,
  };
}

module.exports = { createSessionStore, hashToken };
`,
    },
    {
      id: 'gatehouse-5-audit',
      title: 'Write audit events that keep their secrets',
      file: 'lib/audit.js',
      task: 'Implement `createAuditLog({ sink, now })`. Every `record(event, fields)` emits exactly one JSON line with `ts`, `event`, and the supplied fields; a missing or blank event name throws. Redact sensitive keys (`password`, `passwordHash`, `token`, `authorization`, `cookie`, `secret`, `apiKey`, `csrf`, `csrfToken`, and friends) at every depth, case-insensitively, because a logged header object can hide a session cookie one level down. Run `node --test test/audit.test.js`.',
      examples: [
        {
          label: 'One structured line',
          code: `const entry = { ts: now(), event: event.trim(), ...redact(fields) };
const line = JSON.stringify(entry);
written.push(line);
sink(line);
return entry;`,
        },
        {
          label: 'Redact recursively, by key',
          code: `if (SENSITIVE.has(key.toLowerCase())) {
  safe[key] = '[redacted]';
} else if (value && typeof value === 'object' && !Array.isArray(value)) {
  safe[key] = redact(value);
} else {
  safe[key] = value;
}`,
        },
      ],
      hints: [
        'An audit log is for investigation: ids, actions, outcomes, durations, request ids — never request bodies.',
        'Redaction is by key name, and the key may arrive capitalised. Lowercase it only for the comparison.',
        'Arrays can contain objects with secrets; do not assume a one-level redaction is enough for arbitrary input.',
        'Inject both `sink` and `now` so tests can capture lines and freeze the timestamp.',
        'Keep the in-memory `lines()` copy for tests, but treat the sink as the real destination.',
      ],
      checks: [
        { id: 'redacts', type: 'fileContains', file: 'lib/audit.js', pattern: '[redacted]', mode: 'string' },
        { id: 'audit-tests', type: 'runCommand', command: 'node --test test/audit.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const SENSITIVE = new Set([
  'password',
  'passphrase',
  'passwordhash',
  'token',
  'session',
  'sessionid',
  'cookie',
  'set-cookie',
  'authorization',
  'secret',
  'apikey',
  'csrf',
  'csrftoken',
]);

function redact(fields) {
  const safe = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE.has(key.toLowerCase())) {
      safe[key] = '[redacted]';
    } else if (Array.isArray(value)) {
      safe[key] = value.map((item) => (
        item && typeof item === 'object' ? redact(item) : item
      ));
    } else if (value && typeof value === 'object') {
      safe[key] = redact(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function createAuditLog(options = {}) {
  const sink = typeof options.sink === 'function' ? options.sink : (line) => console.log(line);
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const written = [];

  function record(event, fields = {}) {
    if (typeof event !== 'string' || !event.trim()) {
      throw new Error('an audit event needs a name');
    }
    const entry = { ts: now(), event: event.trim(), ...redact(fields) };
    const line = JSON.stringify(entry);
    written.push(line);
    sink(line);
    return entry;
  }

  return { record, lines: () => written.slice() };
}

module.exports = { createAuditLog };
`,
    },
    {
      id: 'gatehouse-6-rate-limit',
      title: 'Count attempts in a fixed window',
      file: 'lib/rate-limit.js',
      task: 'Implement a fixed-window limiter. `check(key)` returns `{ allowed, remaining, retryAfterSeconds }`; the first `limit` attempts in a window are allowed, the next are refused until the window expires. Allow `limit`, `windowMs`, and `now` to be injected, and add `reset(key)` plus `size()`. Round the retry advice up: telling a client to retry too early just earns another refusal. Run `node --test test/rate-limit.test.js`.',
      examples: [
        {
          label: 'A bucket that expires',
          code: `let bucket = buckets.get(key);
if (!bucket || bucket.resetAt <= time) {
  bucket = { count: 0, resetAt: time + windowMs };
  buckets.set(key, bucket);
}`,
        },
        {
          label: 'Refuse without incrementing',
          code: `if (bucket.count >= limit) {
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - time) / 1000)),
  };
}`,
        },
      ],
      hints: [
        'Count the attempt before returning `remaining`, or the caller gets an off-by-one budget.',
        'A refused attempt must not extend the window, or a determined client can never recover.',
        '`Math.ceil` is deliberate: `retryAfterSeconds` is a promise about the earliest safe retry.',
        'An in-memory limiter is per process. In a fleet this belongs in Redis or the platform gateway; the interface stays the same.',
      ],
      checks: [
        { id: 'retry-after', type: 'fileContains', file: 'lib/rate-limit.js', pattern: 'retryAfterSeconds', mode: 'string' },
        { id: 'rate-limit-tests', type: 'runCommand', command: 'node --test test/rate-limit.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `function createRateLimiter(options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? options.limit
    : 5;
  const windowMs = Number.isInteger(options.windowMs) && options.windowMs > 0
    ? options.windowMs
    : 60000;
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const buckets = new Map();

  function check(key) {
    const time = now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= time) {
      bucket = { count: 0, resetAt: time + windowMs };
      buckets.set(key, bucket);
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - time) / 1000)),
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      remaining: limit - bucket.count,
      retryAfterSeconds: 0,
    };
  }

  function reset(key) {
    buckets.delete(key);
  }

  return { check, reset, size: () => buckets.size };
}

module.exports = { createRateLimiter };
`,
    },
    {
      id: 'gatehouse-7-login-throttle',
      title: 'Throttle the client and the account',
      file: 'lib/login-throttle.js',
      task: 'A per-IP limit alone lets a botnet spray one password across thousands of accounts; a per-account limit alone lets one client try every account. Build `createLoginThrottle({ limiter })` so `check(ip, email)` consumes both buckets and allows only when both allow. Normalise the email (trim + lowercase) for the account key, report the minimum remaining budget and the maximum retry, and let `succeed(email)` reset the account bucket. Run `node --test test/login-throttle.test.js`.',
      examples: [
        {
          label: 'Both buckets must allow',
          code: `const byIp = limiter.check('ip:' + (ip || 'unknown'));
const byAccount = limiter.check(accountKey(email));
return {
  allowed: byIp.allowed && byAccount.allowed,
  remaining: Math.min(byIp.remaining, byAccount.remaining),
  retryAfterSeconds: Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds),
};`,
        },
        {
          label: 'Reset only the account',
          code: `function succeed(email) {
  limiter.reset(accountKey(email));
}`,
        },
      ],
      hints: [
        'Prefix the bucket keys (`ip:` and `account:`) so the two spaces cannot collide.',
        'A successful login should clear the account budget; it should not wipe the client’s history.',
        'Return the stricter retry advice — if either bucket refuses, the client must wait.',
        'An IP-only attacker still fills its own bucket; a distributed attack still fills the account bucket.',
        'Email casing is not a security boundary: `Ada@` and `ada@` are the same account.',
      ],
      checks: [
        { id: 'both-buckets', type: 'fileContains', file: 'lib/login-throttle.js', pattern: 'byIp.allowed && byAccount.allowed', mode: 'string' },
        { id: 'throttle-tests', type: 'runCommand', command: 'node --test test/login-throttle.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { createRateLimiter } = require('./rate-limit');

function accountKey(email) {
  const value = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return 'account:' + value;
}

function createLoginThrottle(options = {}) {
  const limiter = options.limiter || createRateLimiter({ limit: 5, windowMs: 60000 });

  function check(ip, email) {
    const byIp = limiter.check('ip:' + (ip || 'unknown'));
    const byAccount = limiter.check(accountKey(email));
    return {
      allowed: byIp.allowed && byAccount.allowed,
      remaining: Math.min(byIp.remaining, byAccount.remaining),
      retryAfterSeconds: Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds),
    };
  }

  function succeed(email) {
    limiter.reset(accountKey(email));
  }

  return { check, succeed };
}

module.exports = { createLoginThrottle };
`,
    },
    {
      id: 'gatehouse-8-roles',
      title: 'Authorize every request on the server',
      file: 'lib/authz.js',
      task: 'Implement `requireUser(session)` and `requireRole(user, role)`. Missing sessions are `401`; a member asking for an admin route is `403`. Both throw `AuthError`, the one error type the server maps, and both return the original record so callers can read the stored role rather than a value from the request. Leave `verifyCsrf` for the next step. Run `node --test test/authz-roles.test.js`.',
      examples: [
        {
          label: 'Two refusals, one error type',
          code: `if (!user) {
  throw new AuthError(401, 'authentication required');
}
if (role === 'admin' && user.role !== 'admin') {
  throw new AuthError(403, 'forbidden');
}
return user;`,
        },
        {
          label: 'The session check',
          code: `if (!session || !session.userId) {
  throw new AuthError(401, 'authentication required');
}
return session;`,
        },
      ],
      hints: [
        '401 means “we do not know who you are”; 403 means “we know, and you may not”. Do not collapse them.',
        'The role comes from the stored user record. Never read a role from a request body or header.',
        'Throwing one error type keeps the route and server error mapping simple.',
        'Returning the record (not a boolean) keeps the role check composable with later checks.',
      ],
      checks: [
        { id: 'auth-error', type: 'fileContains', file: 'lib/authz.js', pattern: 'new AuthError(403', mode: 'string' },
        { id: 'role-tests', type: 'runCommand', command: 'node --test test/authz-roles.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { createHash, timingSafeEqual } = require('node:crypto');

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function requireUser(session) {
  if (!session || !session.userId) {
    throw new AuthError(401, 'authentication required');
  }
  return session;
}

function requireRole(user, role) {
  if (!user) {
    throw new AuthError(401, 'authentication required');
  }
  if (role === 'admin' && user.role !== 'admin') {
    throw new AuthError(403, 'forbidden');
  }
  return user;
}

function verifyCsrf() {
  // Implemented in step 9.
  return false;
}

module.exports = { AuthError, requireUser, requireRole, verifyCsrf };
`,
    },
    {
      id: 'gatehouse-9-csrf',
      title: 'Make CSRF really constant-time',
      file: 'lib/authz.js',
      task: 'Implement `verifyCsrf(session, token)`: reject a missing session token or submitted token, hash both with SHA-256, and compare with `timingSafeEqual`. Hashing first makes the comparison length-independent, so a short guess cannot throw and a wrong-but-long guess cannot leak through timing. The token belongs to one session; a token from another session must fail. Run `node --test test/authz-csrf.test.js`.',
      examples: [
        {
          label: 'Digest, then compare',
          code: `function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}
return timingSafeEqual(digest(session.csrfToken), digest(token));`,
        },
      ],
      hints: [
        '`timingSafeEqual` needs equal-length buffers; hashing both sides guarantees that.',
        'Do not use `===` for a secret comparison. It can stop at the first differing byte.',
        'A missing or empty CSRF token is a refusal, not an empty-string comparison.',
        'The CSRF token is checked against the session that owns the cookie — not against a cookie of its own.',
      ],
      checks: [
        { id: 'timing-safe-csrf', type: 'fileContains', file: 'lib/authz.js', pattern: 'timingSafeEqual', mode: 'string' },
        { id: 'csrf-tests', type: 'runCommand', command: 'node --test test/authz-csrf.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { createHash, timingSafeEqual } = require('node:crypto');

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function requireUser(session) {
  if (!session || !session.userId) {
    throw new AuthError(401, 'authentication required');
  }
  return session;
}

function requireRole(user, role) {
  if (!user) {
    throw new AuthError(401, 'authentication required');
  }
  if (role === 'admin' && user.role !== 'admin') {
    throw new AuthError(403, 'forbidden');
  }
  return user;
}

function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}

function verifyCsrf(session, token) {
  if (!session || typeof session.csrfToken !== 'string' || session.csrfToken.length === 0) {
    return false;
  }
  if (typeof token !== 'string' || token.length === 0) return false;
  return timingSafeEqual(digest(session.csrfToken), digest(token));
}

module.exports = { AuthError, requireUser, requireRole, verifyCsrf };
`,
    },
    {
      id: 'gatehouse-10-users',
      title: 'Store users without ever looking back at a hash',
      file: 'lib/users.js',
      task: 'Implement the user store: normalise emails (trim, lowercase), reject malformed addresses and unknown roles, reject a duplicate email, and hash the password through `hashPassword` before storing. `findByEmail` is case-insensitive and returns the internal record (the login route needs the hash); `findById` and `list` are for the rest of the app. `create` returns `toPublicUser`, so no caller can accidentally serialise a hash. Seed entries go through the same validation. Run `node --test test/users.test.js`.',
      examples: [
        {
          label: 'Normalise before storing',
          code: `const normalised = normaliseEmail(email);
if (!normalised) throw new Error('a valid email address is required');
if (!ROLES.has(role)) throw new Error('unknown role');
if (findByEmail(normalised)) throw new Error('that email is already registered');`,
        },
        {
          label: 'Two projections, one rule',
          code: `const user = {
  id: nextId,
  email: normalised,
  role,
  passwordHash: hashPassword(password),
  createdAt: new Date().toISOString(),
};
nextId += 1;
users.set(user.id, user);
return toPublicUser(user);`,
        },
      ],
      hints: [
        'Email casing is presentation, not identity: store one canonical lowercase form.',
        'Validate the role against an allow-list; never trust a `role` string from a request.',
        'Return the public projection from the store boundary. The internal record stays internal.',
        '`findByEmail` must return the hash because login has to verify it; the route is responsible for not sending it.',
        'Seeding is not a back door: the seed loop should call `create` so it gets the same rules.',
      ],
      checks: [
        { id: 'public-projection', type: 'fileContains', file: 'lib/users.js', pattern: 'toPublicUser', mode: 'string' },
        { id: 'users-tests', type: 'runCommand', command: 'node --test test/users.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { hashPassword, verifyPassword } = require('./passwords');

const ROLES = new Set(['member', 'admin']);

function normaliseEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 120) return null;
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  if (!email.includes('.', at)) return null;
  return email;
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    ...(user.passwordChangedAt ? { passwordChangedAt: user.passwordChangedAt } : {}),
  };
}

function createUserStore(seed = []) {
  const users = new Map();
  let nextId = 1;

  function findByEmail(email) {
    const wanted = normaliseEmail(email);
    if (!wanted) return null;
    for (const user of users.values()) {
      if (user.email === wanted) return user;
    }
    return null;
  }

  function findById(id) {
    return users.get(Number(id)) || null;
  }

  function create({ email, password, role = 'member' } = {}) {
    const normalised = normaliseEmail(email);
    if (!normalised) throw new Error('a valid email address is required');
    if (!ROLES.has(role)) throw new Error('unknown role');
    if (findByEmail(normalised)) throw new Error('that email is already registered');

    const user = {
      id: nextId,
      email: normalised,
      role,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    nextId += 1;
    users.set(user.id, user);
    return toPublicUser(user);
  }

  function list() {
    return Array.from(users.values()).map(toPublicUser);
  }

  function changePassword() {
    // Implemented in step 11.
    throw new Error('changePassword is not implemented yet');
  }

  for (const entry of seed) create(entry);

  return { create, findByEmail, findById, list, changePassword };
}

module.exports = { createUserStore, toPublicUser };
`,
    },
    {
      id: 'gatehouse-11-password-change',
      title: 'Change a password without leaving old sessions alive',
      file: 'lib/users.js',
      task: 'Add `changePassword(userId, currentPassword, newPassword)`. Unknown users are `404`; a wrong current password is `403`; a new password that fails the policy is `400` (wrap the `hashPassword` error). On success replace the hash, stamp `passwordChangedAt`, and return the public user. Do not change the email, role, or id. Revoking other sessions happens in the route, not here — the store changes credentials, the route controls sessions. Run `node --test test/users-password.test.js`.',
      examples: [
        {
          label: 'Prove the old password first',
          code: `const user = findById(userId);
if (!user) throw Object.assign(new Error('account not found'), { status: 404 });
if (!verifyPassword(currentPassword, user.passwordHash)) {
  throw Object.assign(new Error('current password is incorrect'), { status: 403 });
}`,
        },
        {
          label: 'Re-hash, stamp, project',
          code: `try {
  user.passwordHash = hashPassword(newPassword);
} catch (error) {
  throw Object.assign(new Error(error.message), { status: 400 });
}
user.passwordChangedAt = new Date().toISOString();
return toPublicUser(user);`,
        },
      ],
      hints: [
        'Requiring the current password stops a stolen session from silently taking over the account.',
        'A wrong current password is a 403, not a 401 — the caller is authenticated but not allowed to make this change.',
        'The policy error comes from `hashPassword`; wrap it with a 400 so the route can return a useful message.',
        'Stamping `passwordChangedAt` is what lets a later step or a security review reason about credential age.',
        'Changing a password does not log the user out by itself; session revocation is the route’s decision.',
      ],
      checks: [
        { id: 'verifies-current', type: 'fileContains', file: 'lib/users.js', pattern: 'verifyPassword(currentPassword', mode: 'string' },
        { id: 'password-change-tests', type: 'runCommand', command: 'node --test test/users-password.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { hashPassword, verifyPassword } = require('./passwords');

const ROLES = new Set(['member', 'admin']);

function normaliseEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 120) return null;
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  if (!email.includes('.', at)) return null;
  return email;
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    ...(user.passwordChangedAt ? { passwordChangedAt: user.passwordChangedAt } : {}),
  };
}

function createUserStore(seed = []) {
  const users = new Map();
  let nextId = 1;

  function findByEmail(email) {
    const wanted = normaliseEmail(email);
    if (!wanted) return null;
    for (const user of users.values()) {
      if (user.email === wanted) return user;
    }
    return null;
  }

  function findById(id) {
    return users.get(Number(id)) || null;
  }

  function create({ email, password, role = 'member' } = {}) {
    const normalised = normaliseEmail(email);
    if (!normalised) throw new Error('a valid email address is required');
    if (!ROLES.has(role)) throw new Error('unknown role');
    if (findByEmail(normalised)) throw new Error('that email is already registered');

    const user = {
      id: nextId,
      email: normalised,
      role,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    nextId += 1;
    users.set(user.id, user);
    return toPublicUser(user);
  }

  function list() {
    return Array.from(users.values()).map(toPublicUser);
  }

  function changePassword(userId, currentPassword, newPassword) {
    const user = findById(userId);
    if (!user) throw Object.assign(new Error('account not found'), { status: 404 });

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw Object.assign(new Error('current password is incorrect'), { status: 403 });
    }

    try {
      user.passwordHash = hashPassword(newPassword);
    } catch (error) {
      throw Object.assign(new Error(error.message), { status: 400 });
    }

    user.passwordChangedAt = new Date().toISOString();
    return toPublicUser(user);
  }

  for (const entry of seed) create(entry);

  return { create, findByEmail, findById, list, changePassword };
}

module.exports = { createUserStore, toPublicUser };
`,
    },
    {
      id: 'gatehouse-12-login-route',
      title: 'Sign in without revealing who exists',
      file: 'routes/login.js',
      task: 'Implement `login(ctx)`. Read a JSON object, check the login throttle before doing expensive work, and verify the password. For an unknown email, verify against a module-level dummy hash so the response time does not reveal whether the account exists. Every failure returns the same `401` message and writes an audit event with the email but no password. On success reset the account throttle, create a session, set the HttpOnly SameSite=Strict cookie, audit `login_ok`, and return the public user plus the CSRF token. Run `node --test test/server-login.test.js`.',
      examples: [
        {
          label: 'Same work for unknown accounts',
          code: `const record = users.findByEmail(email);
const ok = record
  ? verifyPassword(password, record.passwordHash)
  : verifyPassword(password, DUMMY_HASH);`,
        },
        {
          label: 'Throttle before the hash',
          code: `const limit = throttle.check(ip, email);
if (!limit.allowed) {
  res.setHeader('retry-after', String(limit.retryAfterSeconds));
  return sendJson(res, 429, { error: 'too many attempts, try again later' });
}`,
        },
        {
          label: 'Success sets exactly one session cookie',
          code: `const created = sessions.create(record.id);
throttle.succeed(email);
res.setHeader('set-cookie', sessionCookie(created.token, created.expiresAt, secureCookies));
return sendJson(res, 200, { user: toPublicUser(record), csrfToken: created.csrfToken });`,
        },
      ],
      hints: [
        'The dummy hash must be a real scrypt hash of a throwaway value, produced once at module load — not an empty string.',
        'Throttle before verification so an attacker cannot burn CPU with guesses.',
        'A successful login resets only the account budget (`throttle.succeed`), not the client budget.',
        'Do not set `Secure` unconditionally in development; the flag is a deployment decision (`secureCookies`).',
        'The response never includes `passwordHash`, and the audit line never includes the password or the raw token.',
      ],
      checks: [
        { id: 'dummy-hash', type: 'fileContains', file: 'routes/login.js', pattern: 'DUMMY_HASH', mode: 'string' },
        { id: 'generic-failure', type: 'fileContains', file: 'routes/login.js', pattern: 'invalid email or password', mode: 'string' },
        { id: 'login-tests', type: 'runCommand', command: 'node --test test/server-login.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { hashPassword, verifyPassword } = require('../lib/passwords');
const { httpError } = require('../lib/http-errors');
const { readJson, sendJson, sessionCookie } = require('../lib/http');
const { toPublicUser } = require('../lib/users');

const DUMMY_HASH = hashPassword('dummy-password-that-nobody-knows');

async function login(ctx) {
  const { req, res, users, sessions, throttle, audit, ip, secureCookies } = ctx;

  const body = await readJson(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'send a JSON object');
  }

  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const limit = throttle.check(ip, email);
  if (!limit.allowed) {
    res.setHeader('retry-after', String(limit.retryAfterSeconds));
    return sendJson(res, 429, { error: 'too many attempts, try again later' });
  }

  const record = users.findByEmail(email);
  const ok = record
    ? verifyPassword(password, record.passwordHash)
    : verifyPassword(password, DUMMY_HASH);

  if (!ok) {
    audit.record('login_failed', { ip, email });
    return sendJson(res, 401, { error: 'invalid email or password' });
  }

  throttle.succeed(email);
  const created = sessions.create(record.id);
  audit.record('login_ok', { ip, userId: record.id });

  res.setHeader('set-cookie', sessionCookie(created.token, created.expiresAt, secureCookies));
  return sendJson(res, 200, {
    user: toPublicUser(record),
    csrfToken: created.csrfToken,
  });
}

module.exports = { login };
`,
    },
    {
      id: 'gatehouse-13-session-routes',
      title: 'Build the session and password lifecycle',
      file: 'routes/session.js',
      task: 'Implement three routes. `me`: require a session, return the public user and the session CSRF token. `logout`: require a session and the matching CSRF header, revoke that one session, audit it, clear the cookie with Max-Age=0, and return 200. `changePassword`: require a session and CSRF, read the current and new passwords, update the hash, revoke every session for the user, issue a fresh session and cookie, and return the updated user plus the new CSRF token. Run `node --test test/server-session.test.js`.',
      examples: [
        {
          label: 'Logout revokes one token',
          code: `requireUser(ctx.session);
if (!verifyCsrf(ctx.session, ctx.req.headers['x-csrf-token'])) {
  throw new AuthError(403, 'invalid csrf token');
}
ctx.sessions.revoke(ctx.token);
ctx.res.setHeader('set-cookie', clearCookie(ctx.secureCookies));`,
        },
        {
          label: 'Password change rotates the session',
          code: `const updated = ctx.users.changePassword(ctx.session.userId, body.currentPassword, body.newPassword);
ctx.sessions.revokeAllForUser(ctx.session.userId);
const created = ctx.sessions.create(ctx.user.id);
ctx.res.setHeader('set-cookie', sessionCookie(created.token, created.expiresAt, ctx.secureCookies));
return sendJson(ctx.res, 200, { user: updated, csrfToken: created.csrfToken });`,
        },
      ],
      hints: [
        'A logout is state-changing, so it needs CSRF protection too — otherwise another site can silently end the session.',
        'Clear the cookie after revoking; an old cookie that no longer verifies should not stay in the browser.',
        'For a password change, revoke all sessions before issuing the replacement — the new session must be the only one.',
        'The user id comes from the verified session, never from the request body.',
        'Return the updated public user, not the internal record, and audit the change without any credential.',
      ],
      checks: [
        { id: 'rotates-sessions', type: 'fileContains', file: 'routes/session.js', pattern: 'revokeAllForUser', mode: 'string' },
        { id: 'session-route-tests', type: 'runCommand', command: 'node --test test/server-session.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { AuthError, requireUser, verifyCsrf } = require('../lib/authz');
const { httpError } = require('../lib/http-errors');
const {
  clearCookie,
  readJson,
  sendJson,
  sessionCookie,
} = require('../lib/http');
const { toPublicUser } = require('../lib/users');

async function me(ctx) {
  requireUser(ctx.session);
  if (!ctx.user) throw new AuthError(401, 'authentication required');
  return sendJson(ctx.res, 200, {
    user: toPublicUser(ctx.user),
    csrfToken: ctx.session.csrfToken,
  });
}

async function logout(ctx) {
  requireUser(ctx.session);
  if (!verifyCsrf(ctx.session, ctx.req.headers['x-csrf-token'])) {
    throw new AuthError(403, 'invalid csrf token');
  }

  ctx.sessions.revoke(ctx.token);
  ctx.audit.record('logout', { userId: ctx.session.userId });
  ctx.res.setHeader('set-cookie', clearCookie(ctx.secureCookies));
  return sendJson(ctx.res, 200, { ok: true });
}

async function changePassword(ctx) {
  requireUser(ctx.session);
  if (!verifyCsrf(ctx.session, ctx.req.headers['x-csrf-token'])) {
    throw new AuthError(403, 'invalid csrf token');
  }

  const body = await readJson(ctx.req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'send a JSON object');
  }

  const updated = ctx.users.changePassword(
    ctx.session.userId,
    body.currentPassword,
    body.newPassword,
  );

  ctx.sessions.revokeAllForUser(ctx.session.userId);
  const created = ctx.sessions.create(ctx.user.id);
  ctx.audit.record('password_changed', { userId: ctx.user.id });

  ctx.res.setHeader(
    'set-cookie',
    sessionCookie(created.token, created.expiresAt, ctx.secureCookies),
  );
  return sendJson(ctx.res, 200, {
    user: updated,
    csrfToken: created.csrfToken,
  });
}

module.exports = { me, logout, changePassword };
`,
    },
    {
      id: 'gatehouse-14-admin-routes',
      title: 'Administer users without trusting the request',
      file: 'routes/admin.js',
      task: 'Implement `listUsers` and `createUser`. Both require a session and the admin role; the create route also requires the CSRF header. Read a JSON object, pass the email/password/role through the user store (which validates and hashes), map validation failures to 400, audit the creation with ids only, and return `201` with the public user. `listUsers` returns `{ users }` with no hashes. Run `node --test test/server-admin.test.js`.',
      examples: [
        {
          label: 'The gate, in order',
          code: `requireUser(ctx.session);
requireRole(ctx.user, 'admin');
if (!verifyCsrf(ctx.session, ctx.req.headers['x-csrf-token'])) {
  throw new AuthError(403, 'invalid csrf token');
}`,
        },
        {
          label: 'A store error becomes a 400',
          code: `let created;
try {
  created = ctx.users.create({
    email: body.email,
    password: body.password,
    role: body.role === undefined ? 'member' : body.role,
  });
} catch (error) {
  throw httpError(400, error.message);
}`,
        },
      ],
      hints: [
        'Check the role before reading the body: an unauthorized caller should not get to send you a payload.',
        '`users.create` already rejects invalid emails, roles, duplicates, and weak passwords — let it be the single validator.',
        'The role defaults to member; do not let an omitted role become admin.',
        'Return `201` with the public projection, and audit `user_created` with the actor and target id.',
      ],
      checks: [
        { id: 'role-gate', type: 'fileContains', file: 'routes/admin.js', pattern: "requireRole(ctx.user, 'admin')", mode: 'string' },
        { id: 'admin-tests', type: 'runCommand', command: 'node --test test/server-admin.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { AuthError, requireRole, requireUser, verifyCsrf } = require('../lib/authz');
const { httpError } = require('../lib/http-errors');
const { readJson, sendJson } = require('../lib/http');

async function listUsers(ctx) {
  requireUser(ctx.session);
  requireRole(ctx.user, 'admin');
  return sendJson(ctx.res, 200, { users: ctx.users.list() });
}

async function createUser(ctx) {
  requireUser(ctx.session);
  requireRole(ctx.user, 'admin');
  if (!verifyCsrf(ctx.session, ctx.req.headers['x-csrf-token'])) {
    throw new AuthError(403, 'invalid csrf token');
  }

  const body = await readJson(ctx.req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'send a JSON object');
  }

  let created;
  try {
    created = ctx.users.create({
      email: body.email,
      password: body.password,
      role: body.role === undefined ? 'member' : body.role,
    });
  } catch (error) {
    throw httpError(400, error.message);
  }

  ctx.audit.record('user_created', {
    actorId: ctx.session.userId,
    userId: created.id,
  });
  return sendJson(ctx.res, 201, { user: created });
}

module.exports = { listUsers, createUser };
`,
    },
    {
      id: 'gatehouse-15-http',
      title: 'Harden the HTTP layer itself',
      file: 'lib/http.js',
      task: 'Finish the shared HTTP helpers. `setSecurityHeaders` must send `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: no-referrer`, `cache-control: no-store`, and a restrictive CSP. `readJson` must accept only `application/json` (415), refuse bodies over 16 KB while streaming (413), reject an empty body (400), and turn malformed JSON into 400 — never let a parser exception become a 500. Run `node --test test/server-hardening.test.js`.',
      examples: [
        {
          label: 'The header set',
          code: `res.setHeader('x-content-type-options', 'nosniff');
res.setHeader('x-frame-options', 'DENY');
res.setHeader('referrer-policy', 'no-referrer');
res.setHeader('cache-control', 'no-store');
res.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'");`,
        },
        {
          label: 'Cap while streaming',
          code: `let size = 0;
let tooLarge = false;
req.on('data', (chunk) => {
  size += chunk.length;
  if (size > MAX_BODY_BYTES) {
    tooLarge = true;
    chunks.length = 0;
    return;
  }
  chunks.push(chunk);
});`,
        },
      ],
      hints: [
        'Check `content-type` before consuming the body; a non-JSON request gets a 415 without wasting the cap.',
        'A `Content-Length` header can lie, so count bytes as they arrive.',
        'Do not destroy the socket on the first oversized chunk — drain and respond with 413 so the client sees the reason.',
        'The CSP can be strict because this service returns JSON, never HTML.',
        '`no-store` matters for auth responses: a shared cache must not keep a session-bearing body.',
      ],
      checks: [
        { id: 'security-headers', type: 'fileContains', file: 'lib/http.js', pattern: 'x-content-type-options', mode: 'string' },
        { id: 'hardening-tests', type: 'runCommand', command: 'node --test test/server-hardening.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { httpError } = require('./http-errors');

const MAX_BODY_BYTES = 16 * 1024;
const SESSION_COOKIE = 'gatehouse_session';

function readCookie(header, name) {
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

function sessionCookie(token, expiresAt, secure) {
  const seconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return SESSION_COOKIE + '=' + token
    + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + seconds
    + (secure ? '; Secure' : '');
}

function clearCookie(secure) {
  return SESSION_COOKIE + '=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
    + (secure ? '; Secure' : '');
}

function setSecurityHeaders(res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      return reject(httpError(415, 'send application/json'));
    }

    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) return reject(httpError(413, 'request body is too large'));
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return reject(httpError(400, 'a JSON body is required'));
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(httpError(400, 'request body must be valid JSON'));
      }
    });

    req.on('error', reject);
  });
}

module.exports = {
  MAX_BODY_BYTES,
  SESSION_COOKIE,
  clearCookie,
  readCookie,
  readJson,
  sendJson,
  sessionCookie,
  setSecurityHeaders,
};
`,
    },
    {
      id: 'gatehouse-16-docker',
      title: 'Ship a container that assumes it is hostile territory',
      file: 'Dockerfile',
      task: 'Write the image. Use `node:20.11-alpine`, production `NODE_ENV`, copy the lockfile first and `npm ci --omit=dev`, copy the app with `--chown=node:node`, drop to `USER node`, expose 3000, add a healthcheck that treats the expected 401 from `/auth/me` as healthy, and make `node server.js` the command. No secrets in `ENV`. Run `node --test test/infra.test.js`.',
      examples: [
        {
          label: 'Dependencies first, then the app',
          code: `COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
USER node`,
        },
        {
          label: 'The healthcheck',
          code: `HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "fetch('http://127.0.0.1:3000/auth/me').then((r) => process.exit(r.status === 401 ? 0 : 1)).catch(() => process.exit(1))"`,
        },
      ],
      hints: [
        'Copy `package.json` and the lockfile before the source so the dependency layer is cached.',
        '`npm ci` (not `npm install`) is reproducible and fails when the lockfile drifts.',
        'A non-root user turns a container escape into a much smaller incident.',
        'The health endpoint returns 401 without a cookie — that is success for a healthcheck.',
        'Never bake a password, token, or private key into `ENV`; inject it at run time.',
      ],
      checks: [
        { id: 'non-root', type: 'fileContains', file: 'Dockerfile', pattern: 'USER node', mode: 'string' },
        { id: 'lockfile-install', type: 'fileContains', file: 'Dockerfile', pattern: 'npm ci --omit=dev', mode: 'string' },
        { id: 'infra-tests', type: 'runCommand', command: 'node --test test/infra.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `# syntax=docker/dockerfile:1
FROM node:20.11-alpine AS base

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "fetch('http://127.0.0.1:3000/auth/me').then((r) => process.exit(r.status === 401 ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
`,
    },
    {
      id: 'gatehouse-17-ci',
      title: 'Make the pipeline catch what review misses',
      file: '.github/workflows/ci.yml',
      task: 'Add a GitHub Actions workflow: on push and pull_request, a matrix over Node 20 and 22, `npm ci`, `node --test`, and `npm audit --omit=dev --audit-level=high`. Grant only `contents: read`, cache npm, and never echo a secret. Run `node --test test/ci.test.js`.',
      examples: [
        {
          label: 'Least privilege at the top',
          code: `permissions:
  contents: read`,
        },
        {
          label: 'The matrix job',
          code: `strategy:
  fail-fast: false
  matrix:
    node: [20, 22]
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: npm
  - run: npm ci
  - run: node --test`,
        },
      ],
      hints: [
        '`npm ci` fails when package.json and the lockfile disagree — that is the point.',
        'A matrix proves the code on every version you claim to support.',
        'Audit production dependencies (`--omit=dev`) so a dev-only advisory does not block a release.',
        'The default `GITHUB_TOKEN` is broad; set `permissions` explicitly.',
        'A secret printed in a workflow log is leaked to everyone who can read the run.',
      ],
      checks: [
        { id: 'read-only-token', type: 'fileContains', file: '.github/workflows/ci.yml', pattern: 'contents: read', mode: 'string' },
        { id: 'ci-tests', type: 'runCommand', command: 'node --test test/ci.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: npm
      - name: Install from the lockfile
        run: npm ci
      - name: Test
        run: node --test
      - name: Audit production dependencies
        run: npm audit --omit=dev --audit-level=high
`,
    },
    {
      id: 'gatehouse-18-regression-suite',
      title: 'Write the attacks down as tests',
      file: 'test/security.test.js',
      task: 'Replace the placeholder with at least six adversarial tests using `withApp`, `login`, and `call`: a tampered session cookie cannot read `/auth/me`; a member cannot create users even with a valid CSRF token; a CSRF token from another session is rejected; the session cookie is HttpOnly and SameSite=Strict; unknown-email and wrong-password logins are indistinguishable; a password change revokes every other session. Run `node --test test/security.test.js`, then `npm test`.',
      examples: [
        {
          label: 'Tamper with one character',
          code: `const last = result.token.slice(-1);
const tampered = result.token.slice(0, -1) + (last === 'A' ? 'B' : 'A');
assert.equal((await call(base, '/auth/me', { token: tampered })).status, 401);`,
        },
        {
          label: 'Cross-session CSRF',
          code: `const first = await login(base, ADMIN.email, ADMIN.password);
const second = await login(base, ADMIN.email, ADMIN.password);
const rejected = await call(base, '/admin/users', {
  method: 'POST',
  token: first.token,
  csrf: second.body.csrfToken,
  body: { email: 'new@example.com', password: 'another long password' },
});
assert.equal(rejected.status, 403);`,
        },
      ],
      hints: [
        'Write the expectation first: what must be true even if the attacker controls the request?',
        'Use a fresh `withApp` per test so throttle counters and sessions never bleed between cases.',
        'Capture the token from the login response before tampering with it.',
        'Test the failure status and, where it matters, the absence of a secret in the body.',
        'A password-change test needs two live sessions: the one changing the password and the one that must die.',
      ],
      checks: [
        { id: 'regression-tests', type: 'runCommand', command: 'node --test test/security.test.js', expect: 'fail 0', match: 'contains' },
        { id: 'full-suite', type: 'runCommand', command: 'npm test', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const test = require('node:test');
const assert = require('node:assert/strict');
const { ADMIN, MEMBER, call, login, withApp } = require('./helpers');

test('a tampered session cookie cannot authenticate', async () => {
  await withApp(async ({ base }) => {
    const result = await login(base, ADMIN.email, ADMIN.password);
    const last = result.token.slice(-1);
    const tampered = result.token.slice(0, -1) + (last === 'A' ? 'B' : 'A');

    assert.equal((await call(base, '/auth/me', { token: tampered })).status, 401);
  });
});

test('a member cannot create users, even with a valid CSRF token', async () => {
  await withApp(async ({ base }) => {
    const member = await login(base, MEMBER.email, MEMBER.password);
    const response = await call(base, '/admin/users', {
      method: 'POST',
      token: member.token,
      csrf: member.body.csrfToken,
      body: { email: 'new@example.com', password: 'another long password' },
    });

    assert.equal(response.status, 403);
    assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);
  });
});

test('a CSRF token from another session is rejected', async () => {
  await withApp(async ({ base }) => {
    const first = await login(base, ADMIN.email, ADMIN.password);
    const second = await login(base, ADMIN.email, ADMIN.password);
    const response = await call(base, '/admin/users', {
      method: 'POST',
      token: first.token,
      csrf: second.body.csrfToken,
      body: { email: 'new@example.com', password: 'another long password' },
    });

    assert.equal(response.status, 403);
  });
});

test('the session cookie is HttpOnly, SameSite=Strict, and path-scoped', async () => {
  await withApp(async ({ base }) => {
    const result = await login(base, ADMIN.email, ADMIN.password);
    const cookie = result.response.headers.get('set-cookie');

    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(cookie.includes('SameSite=Strict'));
    assert.ok(cookie.includes('Path=/'));
  });
});

test('unknown emails and wrong passwords are indistinguishable', async () => {
  await withApp(async ({ base }) => {
    const unknown = await login(base, 'nobody@example.com', 'a long wrong password');
    const wrong = await login(base, ADMIN.email, 'a long wrong password');

    assert.equal(unknown.status, 401);
    assert.deepEqual(unknown.body, wrong.body);
  });
});

test('a password change revokes every other session', async () => {
  await withApp(async ({ base }) => {
    const first = await login(base, ADMIN.email, ADMIN.password);
    const second = await login(base, ADMIN.email, ADMIN.password);
    const NEW = 'a replacement long password';

    const changed = await call(base, '/auth/password', {
      method: 'POST',
      token: first.token,
      csrf: first.body.csrfToken,
      body: { currentPassword: ADMIN.password, newPassword: NEW },
    });
    assert.equal(changed.status, 200);

    assert.equal((await call(base, '/auth/me', { token: first.token })).status, 401);
    assert.equal((await call(base, '/auth/me', { token: second.token })).status, 401);
    assert.equal((await login(base, ADMIN.email, NEW)).status, 200);
  });
});

test('a JSON array is not a valid user payload', async () => {
  await withApp(async ({ base }) => {
    const admin = await login(base, ADMIN.email, ADMIN.password);
    const response = await call(base, '/admin/users', {
      method: 'POST',
      token: admin.token,
      csrf: admin.body.csrfToken,
      body: [{ email: 'new@example.com', password: 'another long password' }],
    });

    assert.equal(response.status, 400);
  });
});
`,
    },
  ],
  reflectionPrompt: 'Why must login take the same time for an unknown email and a wrong password, and why does a password change revoke sessions instead of only replacing the hash?',
};

export default gatehouse;
