// Linkbox — a junior full-stack build project.
//
// A small "read later" service: an HTTP JSON API on node:http, a store that
// persists to disk atomically, input validation, a duplicate-link conflict
// rule, and a browser client that renders with textContent. Tests are supplied
// as the specification, so every step is verified by running real code.

const linkbox = {
  id: 'linkbox',
  title: 'Linkbox',
  language: 'javascript',
  level: 'junior',
  summary: 'Build a read-later service: a validating JSON API, an atomic file store, and a safe browser client.',
  brief: 'Model bookmarks, reject bad input, persist to disk without corrupting the file, expose HTTP routes with honest status codes, and render untrusted links without innerHTML.',
  concepts: ['node', 'http', 'json', 'validation', 'testing', 'filesystem', 'dom', 'security'],
  scaffold: [
    {
      file: 'package.json',
      content: `{
  "name": "linkbox",
  "version": "1.0.0",
  "private": true,
  "description": "A read-later service with a JSON API and a file-backed store.",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test"
  },
  "engines": {
    "node": ">=20"
  }
}
`,
    },
    {
      file: 'src/store.js',
      content: `const { randomUUID } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync, renameSync } = require('node:fs');

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.field = field;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

function createStore() {
  const bookmarks = [];

  function list() {
    return [];
  }

  function add(input) {
    // TODO: validate the title, url, and tags, then store the bookmark.
    throw new ValidationError('saving bookmarks is not implemented yet');
  }

  function remove(id) {
    return false;
  }

  return { list, add, remove };
}

module.exports = { createStore, ValidationError, ConflictError };
`,
    },
    {
      file: 'src/server.js',
      content: `const http = require('node:http');
const { createStore } = require('./store');

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function createServer(options = {}) {
  const store = options.store || createStore();

  return http.createServer(async (req, res) => {
    // TODO: route GET /api/bookmarks and POST /api/bookmarks
    return sendJson(res, 501, { error: 'the Linkbox API is not implemented yet' });
  });
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log('Linkbox listening on http://localhost:' + port);
  });
}
`,
    },
    {
      file: 'test/store.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, ValidationError } = require('../src/store');

test('starts empty', () => {
  const store = createStore();
  assert.deepEqual(store.list(), []);
});

test('saves a bookmark, trims text, and normalizes tags', () => {
  const store = createStore();
  const bookmark = store.add({
    title: '  Design systems  ',
    url: 'https://example.com/design',
    tags: ['Design', 'design', ' UI '],
  });

  assert.equal(bookmark.title, 'Design systems');
  assert.equal(bookmark.url, 'https://example.com/design');
  assert.deepEqual(bookmark.tags, ['design', 'ui']);
  assert.match(bookmark.id, /^[0-9a-f-]{36}$/);
  assert.equal(Number.isNaN(Date.parse(bookmark.createdAt)), false);
  assert.equal(store.list().length, 1);
});

test('the client cannot choose the id or the created date', () => {
  const store = createStore();
  const bookmark = store.add({
    id: 'mine',
    createdAt: '1999-01-01T00:00:00.000Z',
    title: 'Safe',
    url: 'https://example.com',
  });

  assert.notEqual(bookmark.id, 'mine');
  assert.notEqual(bookmark.createdAt, '1999-01-01T00:00:00.000Z');
});

test('rejects missing and invalid fields', () => {
  const store = createStore();
  assert.throws(() => store.add({ url: 'https://example.com' }), ValidationError);
  assert.throws(() => store.add({ title: '   ', url: 'https://example.com' }), ValidationError);
  assert.throws(() => store.add({ title: 'Ok', url: 'not a url' }), ValidationError);
  assert.throws(() => store.add({ title: 'Ok', url: 'javascript:alert(1)' }), ValidationError);
  assert.throws(() => store.add({ title: 'Ok', url: 'https://example.com', tags: 'design' }), ValidationError);
  assert.throws(
    () => store.add({ title: 'Ok', url: 'https://example.com', tags: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ValidationError,
  );
});
`,
    },
    {
      file: 'test/persist.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore, ConflictError } = require('../src/store');

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkbox-'));
  return path.join(dir, 'bookmarks.json');
}

test('writes bookmarks to disk and loads them again', () => {
  const filePath = tempFile();
  const first = createStore({ filePath });
  first.add({ title: 'Node timers', url: 'https://nodejs.org/api/timers.html', tags: ['node'] });

  assert.equal(fs.existsSync(filePath), true);
  const second = createStore({ filePath });
  const items = second.list();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Node timers');
  assert.deepEqual(items[0].tags, ['node']);
});

test('the saved file is versioned JSON and leaves no temp file behind', () => {
  const filePath = tempFile();
  const store = createStore({ filePath });
  store.add({ title: 'Spec', url: 'https://example.com/spec' });

  const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(saved.version, 1);
  assert.equal(saved.bookmarks.length, 1);
  assert.equal(fs.existsSync(filePath + '.tmp'), false);
});

test('rejects a duplicate link with a conflict', () => {
  const store = createStore();
  store.add({ title: 'One', url: 'https://example.com/one' });
  assert.throws(
    () => store.add({ title: 'Two', url: 'https://example.com/one' }),
    (error) => error instanceof ConflictError && error.status === 409,
  );
});
`,
    },
    {
      file: 'test/search.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../src/store');

function seed() {
  const store = createStore();
  store.add({ title: 'CSS Grid guide', url: 'https://example.com/grid', tags: ['css', 'layout'] });
  store.add({ title: 'HTTP caching', url: 'https://example.com/cache', tags: ['http'] });
  store.add({ title: 'Grid systems', url: 'https://example.com/systems', tags: ['design'] });
  return store;
}

test('filters by tag', () => {
  const store = seed();
  const items = store.list({ tag: 'CSS' });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'CSS Grid guide');
});

test('searches the title and the link', () => {
  const store = seed();
  assert.equal(store.list({ q: 'grid' }).length, 1 + 1);
  assert.equal(store.list({ q: 'cache' }).length, 1);
});

test('removes a bookmark and reports unknown ids', () => {
  const store = seed();
  const id = store.list()[0].id;
  assert.equal(store.remove(id), true);
  assert.equal(store.list().length, 2);
  assert.equal(store.remove(id), false);
});

test('list returns copies, not the stored arrays', () => {
  const store = seed();
  const copy = store.list()[0];
  copy.tags.push('mutated');
  assert.deepEqual(store.list()[0].tags, ['css', 'layout']);
});
`,
    },
    {
      file: 'test/server.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');
const { createStore } = require('../src/store');

async function withServer(run) {
  const store = createStore();
  const server = createServer({ store });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    await run(base, store);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('POST saves a bookmark and GET returns it', async () => {
  await withServer(async (base) => {
    const created = await fetch(base + '/api/bookmarks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Fetch API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
        tags: ['web'],
      }),
    });

    assert.equal(created.status, 201);
    assert.match(created.headers.get('location'), /^\\/api\\/bookmarks\\//);
    const bookmark = await created.json();

    const list = await fetch(base + '/api/bookmarks').then((res) => res.json());
    assert.equal(list.count, 1);
    assert.equal(list.items[0].id, bookmark.id);
  });
});

test('the query string filters the list', async () => {
  await withServer(async (base, store) => {
    store.add({ title: 'Grid guide', url: 'https://example.com/grid', tags: ['css'] });
    store.add({ title: 'Caching', url: 'https://example.com/cache', tags: ['http'] });

    const byTag = await fetch(base + '/api/bookmarks?tag=css').then((res) => res.json());
    assert.equal(byTag.count, 1);
    assert.equal(byTag.items[0].title, 'Grid guide');

    const byQuery = await fetch(base + '/api/bookmarks?q=cache').then((res) => res.json());
    assert.equal(byQuery.count, 1);
  });
});
`,
    },
    {
      file: 'test/hardening.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');
const { createStore } = require('../src/store');

async function withServer(run) {
  const store = createStore();
  const server = createServer({ store });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    await run(base, store);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('unknown routes are a JSON 404', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/api/nope');
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type'), /application\\/json/);
    assert.equal(typeof (await res.json()).error, 'string');
  });
});

test('bad JSON is a 400, not a crash', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/api/bookmarks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
  });
});

test('a non-JSON content type is refused with 415', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/api/bookmarks', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ title: 'Nope', url: 'https://example.com' }),
    });
    assert.equal(res.status, 415);
  });
});

test('an oversized body is refused with 413', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/api/bookmarks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'x'.repeat(9000), url: 'https://example.com' }),
    });
    assert.equal(res.status, 413);
  });
});

test('DELETE removes a bookmark, then reports 404', async () => {
  await withServer(async (base, store) => {
    const bookmark = store.add({ title: 'Temporary', url: 'https://example.com/temp' });

    const first = await fetch(base + '/api/bookmarks/' + bookmark.id, { method: 'DELETE' });
    assert.equal(first.status, 204);

    const second = await fetch(base + '/api/bookmarks/' + bookmark.id, { method: 'DELETE' });
    assert.equal(second.status, 404);
  });
});

test('every response forbids content sniffing', async () => {
  await withServer(async (base) => {
    const ok = await fetch(base + '/api/bookmarks');
    assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');

    const missing = await fetch(base + '/api/nope');
    assert.equal(missing.headers.get('x-content-type-options'), 'nosniff');
  });
});

test('the server serves the client page', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\\/html/);
    assert.match(await res.text(), /Linkbox/);
  });
});
`,
    },
    {
      file: 'test/client.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('the page has the form, search, and list the client needs', () => {
  assert.match(html, /id="bookmark-form"/);
  assert.match(html, /id="search"/);
  assert.match(html, /id="bookmarks"/);
  assert.match(html, /id="status"/);
  assert.match(html, /type="url"/);
  assert.match(html, /src="\\/app.js"/);
});

test('the client talks to the API with encoded search text', () => {
  assert.ok(js.includes('fetch('));
  assert.match(js, /\\/api\\/bookmarks/);
  assert.match(js, /encodeURIComponent/);
  assert.ok(js.includes("addEventListener('submit'"));
});

test('untrusted bookmark text is rendered with textContent, never innerHTML', () => {
  assert.match(js, /textContent/);
  assert.doesNotMatch(js, /innerHTML/);
  assert.ok(js.includes("addEventListener('click'"));
  assert.match(js, /rel = 'noreferrer noopener'/);
});
`,
    },
    {
      file: 'public/index.html',
      content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Linkbox</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="shell">
    <p class="eyebrow">Read later</p>
    <h1>Linkbox</h1>
    <p class="lede">Save the links worth keeping. Everything lives in one JSON file.</p>
  </header>

  <main class="shell">
    <form id="bookmark-form" class="card" novalidate>
      <label>Title <input name="title" required maxlength="120" autocomplete="off" /></label>
      <label>Link <input name="url" type="url" required placeholder="https://..." /></label>
      <label>Tags <input name="tags" placeholder="design, reading" /></label>
      <button type="submit">Save link</button>
    </form>

    <label class="search">
      Search
      <input id="search" type="search" placeholder="Search a title or link" />
    </label>

    <p id="status" role="status"></p>
    <ul id="bookmarks"></ul>
  </main>

  <script src="/app.js" defer></script>
</body>
</html>
`,
    },
    {
      file: 'public/styles.css',
      content: `:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

body {
  margin: 0;
  padding: 2rem 1rem 4rem;
}

.shell {
  max-width: 42rem;
  margin: 0 auto;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.6;
}

h1 {
  margin: 0.25rem 0;
}

.lede {
  margin-top: 0;
  opacity: 0.75;
}

.card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid currentColor;
  border-radius: 0.75rem;
}

label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.875rem;
}

input,
button {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border: 1px solid currentColor;
  border-radius: 0.4rem;
  background: transparent;
  color: inherit;
}

button {
  cursor: pointer;
  justify-self: start;
}

.search {
  margin: 1.25rem 0;
}

#status {
  min-height: 1.5rem;
  font-size: 0.875rem;
}

#status[data-tone='error'] {
  color: #b42318;
}

#bookmarks {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

#bookmarks li {
  padding: 0.85rem 0;
  border-bottom: 1px solid color-mix(in srgb, currentColor 25%, transparent);
}

#bookmarks a {
  color: inherit;
  font-weight: 600;
}

#bookmarks p {
  margin: 0.25rem 0;
  font-size: 0.8rem;
  opacity: 0.7;
}
`,
    },
    {
      file: 'public/app.js',
      content: `// Browser client for the Linkbox API.
// TODO: render bookmarks with textContent, wire the form, search, and Remove.
`,
    },
  ],
  steps: [
    {
      id: 'linkbox-1-store',
      title: 'Validate and save bookmarks',
      file: 'src/store.js',
      task: 'Implement `createStore` so `add(input)` trims the title, requires an http(s) URL, normalizes tags (trim, lowercase, dedupe, at most 5), and creates the `id` and `createdAt` itself. `list()` returns the saved bookmarks in insertion order. Run `node --test test/store.test.js` — those tests are the specification.',
      examples: [
        {
          label: 'Reject anything that is not http(s)',
          code: `let parsed;
try {
  parsed = new URL(value.trim());
} catch {
  throw new ValidationError('url must be a full address', 'url');
}
if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
  throw new ValidationError('only http and https links can be saved', 'url');
}
return parsed.toString();`,
        },
        {
          label: 'Build the bookmark yourself',
          code: `const bookmark = {
  id: randomUUID(),
  title,
  url,
  tags,
  createdAt: new Date().toISOString(),
};
bookmarks.push(bookmark);
return bookmark;`,
        },
      ],
      hints: [
        'Never copy `id` or `createdAt` from the request — those are server decisions.',
        'Tags arrive as an array. Check `Array.isArray(value)` before looping.',
        'A `javascript:` URL is a valid URL object, so check the protocol as well as parsing.',
        'Use a Set to drop duplicate tags while keeping the first spelling.',
      ],
      checks: [
        { id: 'uses-randomuuid', type: 'fileContains', file: 'src/store.js', pattern: 'randomUUID', mode: 'string' },
        { id: 'store-tests', type: 'runCommand', command: 'node --test test/store.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { randomUUID } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync, renameSync } = require('node:fs');

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.field = field;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('url is required', 'url');
  }
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ValidationError('url must be a full address starting with http:// or https://', 'url');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('only http and https links can be saved', 'url');
  }
  return parsed.toString();
}

function normalizeTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ValidationError('tags must be a list of words', 'tags');
  }
  const seen = new Set();
  const tags = [];
  for (const raw of value) {
    if (typeof raw !== 'string') {
      throw new ValidationError('every tag must be text', 'tags');
    }
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    if (tag.length > 24) {
      throw new ValidationError('tags are limited to 24 characters', 'tags');
    }
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  if (tags.length > 5) {
    throw new ValidationError('use at most 5 tags', 'tags');
  }
  return tags;
}

function createStore() {
  const bookmarks = [];

  function list() {
    return bookmarks.slice();
  }

  function add(input) {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('send a bookmark object');
    }
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) throw new ValidationError('title is required', 'title');
    if (title.length > 120) {
      throw new ValidationError('titles are limited to 120 characters', 'title');
    }
    const url = normalizeUrl(input.url);
    const tags = normalizeTags(input.tags);
    const bookmark = { id: randomUUID(), title, url, tags, createdAt: new Date().toISOString() };
    bookmarks.push(bookmark);
    return bookmark;
  }

  function remove(id) {
    return false;
  }

  return { list, add, remove };
}

module.exports = { createStore, ValidationError, ConflictError };
`,
    },
    {
      id: 'linkbox-2-persist',
      title: 'Persist to disk without corrupting the file',
      file: 'src/store.js',
      task: 'Make the store survive a restart: accept `{ filePath }`, load existing bookmarks, and write after every change using a `.tmp` file plus `renameSync` (a crash must never leave half-written JSON). Reject a second bookmark with the same URL using `ConflictError`. Run `node --test test/persist.test.js`.',
      examples: [
        {
          label: 'Atomic write',
          code: `const temp = filePath + '.tmp';
writeFileSync(temp, JSON.stringify({ version: 1, bookmarks }, null, 2) + '\\n');
renameSync(temp, filePath);`,
        },
        {
          label: 'Duplicate check',
          code: `if (bookmarks.some((bookmark) => bookmark.url === url)) {
  throw new ConflictError('that link is already saved');
}`,
        },
      ],
      hints: [
        'Read the file when the store is created, not on every list call.',
        'A missing or empty file means an empty store, not an error.',
        'renameSync is atomic on the same filesystem — write to a sibling temp file first.',
        '`JSON.parse` the whole file once; do not append lines to it.',
      ],
      checks: [
        { id: 'uses-rename', type: 'fileContains', file: 'src/store.js', pattern: 'renameSync', mode: 'string' },
        { id: 'persist-tests', type: 'runCommand', command: 'node --test test/persist.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { randomUUID } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync, renameSync } = require('node:fs');

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.field = field;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

function readBookmarks(filePath) {
  if (!filePath || !existsSync(filePath)) return [];
  const raw = readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.bookmarks)) {
    throw new Error('This file is not a Linkbox store: ' + filePath);
  }
  return data.bookmarks;
}

function writeBookmarks(filePath, bookmarks) {
  if (!filePath) return;
  const temp = filePath + '.tmp';
  writeFileSync(temp, JSON.stringify({ version: 1, bookmarks }, null, 2) + '\\n');
  renameSync(temp, filePath);
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('url is required', 'url');
  }
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ValidationError('url must be a full address starting with http:// or https://', 'url');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('only http and https links can be saved', 'url');
  }
  return parsed.toString();
}

function normalizeTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ValidationError('tags must be a list of words', 'tags');
  }
  const seen = new Set();
  const tags = [];
  for (const raw of value) {
    if (typeof raw !== 'string') {
      throw new ValidationError('every tag must be text', 'tags');
    }
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    if (tag.length > 24) {
      throw new ValidationError('tags are limited to 24 characters', 'tags');
    }
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  if (tags.length > 5) {
    throw new ValidationError('use at most 5 tags', 'tags');
  }
  return tags;
}

function createStore(options = {}) {
  const filePath = options.filePath || null;
  const bookmarks = readBookmarks(filePath);

  function save() {
    writeBookmarks(filePath, bookmarks);
  }

  function list() {
    return bookmarks.slice();
  }

  function add(input) {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('send a bookmark object');
    }
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) throw new ValidationError('title is required', 'title');
    if (title.length > 120) {
      throw new ValidationError('titles are limited to 120 characters', 'title');
    }
    const url = normalizeUrl(input.url);
    const tags = normalizeTags(input.tags);
    if (bookmarks.some((bookmark) => bookmark.url === url)) {
      throw new ConflictError('that link is already saved');
    }
    const bookmark = { id: randomUUID(), title, url, tags, createdAt: new Date().toISOString() };
    bookmarks.push(bookmark);
    save();
    return bookmark;
  }

  function remove(id) {
    return false;
  }

  return { list, add, remove };
}

module.exports = { createStore, ValidationError, ConflictError };
`,
    },
    {
      id: 'linkbox-3-search',
      title: 'Filter, search, and remove',
      file: 'src/store.js',
      task: 'Give `list({ tag, q })` real filtering — an exact tag match and a case-insensitive search over title and URL — and make `remove(id)` delete the bookmark, persist, and return `true` only when something was removed. Return copies so a caller cannot mutate stored data. Run `node --test test/search.test.js`, then the whole store suite.',
      examples: [
        {
          label: 'Filter while copying',
          code: `return bookmarks
  .filter((bookmark) => {
    if (tag && !bookmark.tags.includes(tag)) return false;
    if (query && !(bookmark.title + ' ' + bookmark.url).toLowerCase().includes(query)) return false;
    return true;
  })
  .map((bookmark) => ({ ...bookmark, tags: [...bookmark.tags] }));`,
        },
        {
          label: 'Remove by id',
          code: `const index = bookmarks.findIndex((bookmark) => bookmark.id === id);
if (index === -1) return false;
bookmarks.splice(index, 1);
save();
return true;`,
        },
      ],
      hints: [
        'Normalize `filters.tag` and `filters.q` before comparing — the tests pass "CSS" with capitals.',
        'Search both title and url, lowercased.',
        'Map to a copy; `slice()` alone still shares each bookmark object and its tags array.',
        'Call `save()` after removing so the change survives a restart.',
      ],
      checks: [
        { id: 'filters', type: 'fileContains', file: 'src/store.js', pattern: 'filters.tag', mode: 'string' },
        { id: 'store-suite', type: 'runCommand', command: 'node --test test/store.test.js test/persist.test.js test/search.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const { randomUUID } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync, renameSync } = require('node:fs');

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.field = field;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

function readBookmarks(filePath) {
  if (!filePath || !existsSync(filePath)) return [];
  const raw = readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.bookmarks)) {
    throw new Error('This file is not a Linkbox store: ' + filePath);
  }
  return data.bookmarks;
}

function writeBookmarks(filePath, bookmarks) {
  if (!filePath) return;
  const temp = filePath + '.tmp';
  writeFileSync(temp, JSON.stringify({ version: 1, bookmarks }, null, 2) + '\\n');
  renameSync(temp, filePath);
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('url is required', 'url');
  }
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ValidationError('url must be a full address starting with http:// or https://', 'url');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('only http and https links can be saved', 'url');
  }
  return parsed.toString();
}

function normalizeTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ValidationError('tags must be a list of words', 'tags');
  }
  const seen = new Set();
  const tags = [];
  for (const raw of value) {
    if (typeof raw !== 'string') {
      throw new ValidationError('every tag must be text', 'tags');
    }
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    if (tag.length > 24) {
      throw new ValidationError('tags are limited to 24 characters', 'tags');
    }
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  if (tags.length > 5) {
    throw new ValidationError('use at most 5 tags', 'tags');
  }
  return tags;
}

function createStore(options = {}) {
  const filePath = options.filePath || null;
  const bookmarks = readBookmarks(filePath);

  function save() {
    writeBookmarks(filePath, bookmarks);
  }

  function list(filters = {}) {
    const tag = typeof filters.tag === 'string' ? filters.tag.trim().toLowerCase() : '';
    const query = typeof filters.q === 'string' ? filters.q.trim().toLowerCase() : '';
    return bookmarks
      .filter((bookmark) => {
        if (tag && !bookmark.tags.includes(tag)) return false;
        if (query && !(bookmark.title + ' ' + bookmark.url).toLowerCase().includes(query)) return false;
        return true;
      })
      .map((bookmark) => ({ ...bookmark, tags: [...bookmark.tags] }));
  }

  function add(input) {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('send a bookmark object');
    }
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) throw new ValidationError('title is required', 'title');
    if (title.length > 120) {
      throw new ValidationError('titles are limited to 120 characters', 'title');
    }
    const url = normalizeUrl(input.url);
    const tags = normalizeTags(input.tags);
    if (bookmarks.some((bookmark) => bookmark.url === url)) {
      throw new ConflictError('that link is already saved');
    }
    const bookmark = { id: randomUUID(), title, url, tags, createdAt: new Date().toISOString() };
    bookmarks.push(bookmark);
    save();
    return { ...bookmark, tags: [...bookmark.tags] };
  }

  function remove(id) {
    const index = bookmarks.findIndex((bookmark) => bookmark.id === id);
    if (index === -1) return false;
    bookmarks.splice(index, 1);
    save();
    return true;
  }

  return { list, add, remove };
}

module.exports = { createStore, ValidationError, ConflictError };
`,
    },
    {
      id: 'linkbox-4-routes',
      title: 'Expose the API with honest status codes',
      file: 'src/server.js',
      task: 'Route `GET /api/bookmarks` (accepting `?tag=` and `?q=`) and `POST /api/bookmarks`. A create returns `201`, a `Location` header pointing at the new bookmark, and the bookmark JSON. Read the JSON body without trusting it. Run `node --test test/server.test.js`.',
      examples: [
        {
          label: 'The two routes',
          code: `if (req.method === 'GET' && url.pathname === '/api/bookmarks') {
  const items = store.list({
    tag: url.searchParams.get('tag') || undefined,
    q: url.searchParams.get('q') || undefined,
  });
  return sendJson(res, 200, { count: items.length, items });
}`,
        },
        {
          label: 'Read the body',
          code: `function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('request body must be valid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}`,
        },
      ],
      hints: [
        'The URL parsing helper is global: `new URL(req.url, "http://localhost")`.',
        'Collection responses use `{ count, items }` so the client has one shape to render.',
        'Set `Location` with `res.setHeader` before `writeHead` runs inside sendJson.',
        'A body is streamed in chunks; concatenate them before `JSON.parse`.',
      ],
      checks: [
        { id: 'post-route', type: 'fileContains', file: 'src/server.js', pattern: "req.method === 'POST'", mode: 'string' },
        { id: 'server-tests', type: 'runCommand', command: 'node --test test/server.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const http = require('node:http');
const { createStore } = require('./store');

const MAX_BODY_BYTES = 8 * 1024;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function readJsonBody(req) {
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

function createServer(options = {}) {
  const store = options.store || createStore();

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/api/bookmarks') {
        const items = store.list({
          tag: url.searchParams.get('tag') || undefined,
          q: url.searchParams.get('q') || undefined,
        });
        return sendJson(res, 200, { count: items.length, items });
      }

      if (req.method === 'POST' && url.pathname === '/api/bookmarks') {
        const bookmark = store.add(await readJsonBody(req));
        res.setHeader('location', '/api/bookmarks/' + bookmark.id);
        return sendJson(res, 201, bookmark);
      }

      return sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      const status = error.status || 500;
      return sendJson(res, status, { error: status === 500 ? 'something went wrong' : error.message });
    }
  });
}

module.exports = { createServer, MAX_BODY_BYTES };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log('Linkbox listening on http://localhost:' + port);
  });
}
`,
    },
    {
      id: 'linkbox-5-hardening',
      title: 'Harden the API and serve the client',
      file: 'src/server.js',
      task: 'Treat the request as hostile: cap the body at 8 KB (`413`), require `application/json` (`415`), answer unknown routes with JSON `404`, add `DELETE /api/bookmarks/:id` (`204` / `404`), and send `x-content-type-options: nosniff` on every response. Then serve `public/` for `GET /`, refusing path traversal. Run `node --test test/hardening.test.js`.',
      examples: [
        {
          label: 'Refuse a huge or non-JSON body',
          code: `if (!contentType.toLowerCase().startsWith('application/json')) {
  return sendJson(res, 415, { error: 'send application/json' });
}
const bookmark = store.add(await readJsonBody(req));`,
        },
        {
          label: 'Static files, without traversal',
          code: `const name = pathname === '/' ? 'index.html' : pathname.slice(1);
if (!/^[A-Za-z0-9._-]+$/.test(name)) return false;
const body = await readFile(path.join(PUBLIC_DIR, name));`,
        },
      ],
      hints: [
        'Count bytes while reading and reject at the end if the total exceeds the limit.',
        'A name containing `/`, `%`, or `..` can step outside public/ — allow only a simple filename.',
        'The DELETE id is a route parameter; match it with a regex before calling store.remove.',
        'Keep 500 responses generic — never send a stack trace or an internal path to the client.',
      ],
      checks: [
        { id: 'body-cap', type: 'fileContains', file: 'src/server.js', pattern: 'MAX_BODY_BYTES', mode: 'string' },
        { id: 'nosniff', type: 'fileContains', file: 'src/server.js', pattern: 'nosniff', mode: 'string' },
        { id: 'hardening-tests', type: 'runCommand', command: 'node --test test/hardening.test.js', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const http = require('node:http');
const path = require('node:path');
const { readFile } = require('node:fs/promises');
const { createStore } = require('./store');

const MAX_BODY_BYTES = 8 * 1024;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
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

async function serveStatic(res, pathname) {
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return false;
  try {
    const body = await readFile(path.join(PUBLIC_DIR, name));
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[path.extname(name)] || 'application/octet-stream',
      'content-length': body.length,
      'x-content-type-options': 'nosniff',
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

function createServer(options = {}) {
  const store = options.store || createStore();

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;

      if (req.method === 'GET' && pathname === '/api/bookmarks') {
        const items = store.list({
          tag: url.searchParams.get('tag') || undefined,
          q: url.searchParams.get('q') || undefined,
        });
        return sendJson(res, 200, { count: items.length, items });
      }

      if (req.method === 'POST' && pathname === '/api/bookmarks') {
        const contentType = String(req.headers['content-type'] || '');
        if (!contentType.toLowerCase().startsWith('application/json')) {
          return sendJson(res, 415, { error: 'send application/json' });
        }
        const bookmark = store.add(await readJsonBody(req));
        res.setHeader('location', '/api/bookmarks/' + bookmark.id);
        return sendJson(res, 201, bookmark);
      }

      const match = pathname.match(/^\\/api\\/bookmarks\\/([A-Za-z0-9-]+)$/);
      if (match && req.method === 'DELETE') {
        if (!store.remove(match[1])) {
          return sendJson(res, 404, { error: 'that bookmark does not exist' });
        }
        res.writeHead(204, { 'x-content-type-options': 'nosniff' });
        return res.end();
      }

      if (req.method === 'GET' && await serveStatic(res, pathname)) return undefined;

      return sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      const status = error.status || 500;
      return sendJson(res, status, { error: status === 500 ? 'something went wrong' : error.message });
    }
  });
}

module.exports = { createServer, MAX_BODY_BYTES };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log('Linkbox listening on http://localhost:' + port);
  });
}
`,
    },
    {
      id: 'linkbox-6-client',
      title: 'Build the browser client safely',
      file: 'public/app.js',
      task: 'Wire the page to the API: render each bookmark with `textContent` (never `innerHTML`), set `rel="noreferrer noopener"` on outbound links, send the form as JSON, debounce-free search on input, and Remove with a DELETE. Run the whole suite — `npm test` — when it works.',
      examples: [
        {
          label: 'Create elements, do not inject HTML',
          code: `const link = document.createElement('a');
link.href = bookmark.url;
link.textContent = bookmark.title;
link.rel = 'noreferrer noopener';
link.target = '_blank';`,
        },
        {
          label: 'Send the form',
          code: `const bookmark = await request('/api/bookmarks', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: data.get('title'), url: data.get('url'), tags }),
});`,
        },
      ],
      hints: [
        'A shared `request()` helper keeps status handling in one place.',
        'Split the tags input on commas, trim each value, and drop the blanks before sending.',
        'Set `data-tone="error"` on #status for failures so the stylesheet can style it.',
        'Search text belongs in `encodeURIComponent(...)` — a tag with an ampersand must not break the URL.',
      ],
      checks: [
        { id: 'client-syntax', type: 'runCommand', command: 'node --check public/app.js && echo syntax-ok', expect: 'syntax-ok', match: 'contains' },
        { id: 'client-tests', type: 'runCommand', command: 'npm test', expect: 'fail 0', match: 'contains' },
      ],
      solution: `const form = document.querySelector('#bookmark-form');
const list = document.querySelector('#bookmarks');
const status = document.querySelector('#status');
const search = document.querySelector('#search');

function setStatus(message, tone = 'info') {
  status.textContent = message;
  status.dataset.tone = tone;
}

async function request(path, options = {}) {
  const response = await fetch(path, options);
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function renderBookmark(bookmark) {
  const item = document.createElement('li');

  const link = document.createElement('a');
  link.href = bookmark.url;
  link.textContent = bookmark.title;
  link.rel = 'noreferrer noopener';
  link.target = '_blank';

  const meta = document.createElement('p');
  meta.textContent = bookmark.tags.length > 0 ? bookmark.tags.join(' · ') : 'untagged';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.addEventListener('click', async () => {
    try {
      await request('/api/bookmarks/' + bookmark.id, { method: 'DELETE' });
      item.remove();
      setStatus('Removed ' + bookmark.title);
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  item.append(link, meta, remove);
  return item;
}

async function loadBookmarks() {
  const query = search.value.trim();
  const suffix = query ? '?q=' + encodeURIComponent(query) : '';
  try {
    const data = await request('/api/bookmarks' + suffix);
    list.replaceChildren(...data.items.map(renderBookmark));
    if (data.items.length === 0) setStatus('Nothing saved yet.');
    else setStatus(data.count + ' saved link' + (data.count === 1 ? '' : 's'));
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const tags = String(data.get('tags') || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  try {
    const bookmark = await request('/api/bookmarks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: data.get('title'), url: data.get('url'), tags }),
    });
    list.prepend(renderBookmark(bookmark));
    form.reset();
    setStatus('Saved ' + bookmark.title);
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

search.addEventListener('input', loadBookmarks);
loadBookmarks();
`,
    },
  ],
  reflectionPrompt: 'Why does the store generate the id and timestamp itself, and why write to a temp file before renaming it?',
};

export default linkbox;
