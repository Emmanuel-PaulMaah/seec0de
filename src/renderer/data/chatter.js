// Chatter — a full-stack realtime chat build project.
//
// The point is the plumbing behind a chat product: validation, an in-memory
// store, a fan-out hub, Server-Sent Events, a small JSON API, and a browser
// client that reconnects. No frameworks, no websocket dependency — just Node's
// HTTP server and the platform APIs learners already have.

const chatter = {
  id: 'chatter',
  title: 'Chatter',
  language: 'javascript',
  level: 'expert',
  summary: 'Build a realtime chat server with Server-Sent Events, rooms, presence, and a reconnecting browser client.',
  brief: 'Store and validate messages, fan them out to SSE subscribers, expose a small JSON API, then build a chat UI that stays live when the connection drops.',
  concepts: ['node', 'http', 'sse', 'events', 'validation', 'testing', 'dom', 'css'],
  scaffold: [
    {
      file: 'package.json',
      content: `{
  "name": "chatter",
  "version": "1.0.0",
  "private": true,
  "description": "A small realtime chat server built on Server-Sent Events.",
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
      file: 'lib/store.js',
      content: `const DEFAULT_ROOMS = [
  { id: 'general', name: 'General', topic: 'Introduce yourself and talk shop.' },
  { id: 'build', name: 'Build Lab', topic: 'Share what you are making right now.' },
  { id: 'random', name: 'Off Topic', topic: 'The water cooler.' },
];

class ChatError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ChatError';
    this.status = status;
  }
}

function createStore(options = {}) {
  // TODO: validate a room, trim an author and message, cap history, assign ids
  throw new Error('The message store is not implemented yet.');
}

module.exports = { ChatError, createStore, DEFAULT_ROOMS };
`,
    },
    {
      file: 'lib/hub.js',
      content: `// Fan-out for Server-Sent Events. One subscriber per open browser tab.
function createHub(options = {}) {
  // TODO: subscribe, publish, presence, and a heartbeat
  throw new Error('The SSE hub is not implemented yet.');
}

module.exports = { createHub };
`,
    },
    {
      file: 'server.js',
      content: `const http = require('node:http');

function createChatServer() {
  return http.createServer((req, res) => {
    res.writeHead(501, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Chatter is not implemented yet.');
  });
}

module.exports = { createChatServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createChatServer().listen(port, () => {
    console.log('Chatter listening on http://localhost:' + port);
  });
}
`,
    },
    {
      file: 'public/index.html',
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chatter</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <main class="app-shell">
      <!-- TODO: build the room list, message log, and composer -->
      <p>Chatter is not implemented yet.</p>
    </main>
    <script src="/app.js" defer></script>
  </body>
</html>
`,
    },
    {
      file: 'public/app.js',
      content: `// Browser state, rendering, and the EventSource connection.
// TODO: load rooms, render messages, send messages, and reconnect.
`,
    },
    {
      file: 'public/styles.css',
      content: `/* TODO: make the chat readable, responsive, and clearly interactive. */
`,
    },
    {
      file: 'test/store.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, ChatError } = require('../lib/store');

test('ships with three rooms', () => {
  const store = createStore();
  assert.deepEqual(store.listRooms().map((room) => room.id), ['general', 'build', 'random']);
});

test('lists rooms with a message count', () => {
  const store = createStore();
  store.addMessage('general', { author: 'Ada', text: 'Hello' });
  const room = store.listRooms().find((item) => item.id === 'general');
  assert.equal(room.messageCount, 1);
});

test('rejects an unknown room', () => {
  const store = createStore();
  assert.throws(() => store.addMessage('missing', { author: 'Ada', text: 'Hi' }), (err) => {
    assert.ok(err instanceof ChatError);
    assert.equal(err.status, 404);
    return true;
  });
});

test('trims the author and message', () => {
  const store = createStore();
  const message = store.addMessage('general', { author: '  Ada  ', text: '  Hello  ' });
  assert.equal(message.author, 'Ada');
  assert.equal(message.text, 'Hello');
  assert.equal(message.roomId, 'general');
  assert.match(message.at, /^\\d{4}-\\d{2}-\\d{2}T/);
});

test('rejects blank and oversized fields', () => {
  const store = createStore();
  assert.throws(() => store.addMessage('general', { author: ' ', text: 'Hi' }), ChatError);
  assert.throws(() => store.addMessage('general', { author: 'Ada', text: '   ' }), ChatError);
  assert.throws(() => store.addMessage('general', { author: 'A'.repeat(25), text: 'Hi' }), ChatError);
  assert.throws(() => store.addMessage('general', { author: 'Ada', text: 'x'.repeat(501) }), ChatError);
});

test('assigns increasing ids', () => {
  const store = createStore();
  const first = store.addMessage('general', { author: 'Ada', text: 'One' });
  const second = store.addMessage('general', { author: 'Ada', text: 'Two' });
  assert.notEqual(first.id, second.id);
  assert.match(second.id, /^m\\d+$/);
});

test('history is oldest first and respects a limit', () => {
  const store = createStore();
  for (const text of ['one', 'two', 'three']) {
    store.addMessage('build', { author: 'Ada', text });
  }
  const history = store.history('build', { limit: 2 });
  assert.deepEqual(history.map((message) => message.text), ['two', 'three']);
});

test('history is capped so memory cannot grow forever', () => {
  const store = createStore({ maxMessages: 2 });
  for (const text of ['one', 'two', 'three']) {
    store.addMessage('random', { author: 'Ada', text });
  }
  assert.deepEqual(store.history('random').map((message) => message.text), ['two', 'three']);
});
`,
    },
    {
      file: 'test/hub.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createHub } = require('../lib/hub');

function fakeResponse() {
  const chunks = [];
  return {
    chunks,
    write(chunk) {
      chunks.push(String(chunk));
      return true;
    },
    end() {},
  };
}

test('tracks presence per room', () => {
  const hub = createHub();
  const res = fakeResponse();
  const leave = hub.subscribe('general', res);
  assert.equal(hub.presence('general'), 1);
  leave();
  assert.equal(hub.presence('general'), 0);
  hub.close();
});

test('publishes an SSE frame to every subscriber in a room', () => {
  const hub = createHub();
  const one = fakeResponse();
  const two = fakeResponse();
  const offOne = hub.subscribe('build', one);
  const offTwo = hub.subscribe('build', two);
  assert.equal(hub.publish('build', 'message', { text: 'hi' }), 2);
  assert.ok(one.chunks.join('').includes('event: message'));
  assert.ok(one.chunks.join('').includes('data: {"text":"hi"}'));
  assert.equal(one.chunks.join(''), two.chunks.join(''));
  offOne();
  offTwo();
  hub.close();
});

test('does not publish across rooms', () => {
  const hub = createHub();
  const res = fakeResponse();
  const leave = hub.subscribe('general', res);
  assert.equal(hub.publish('random', 'message', { text: 'elsewhere' }), 0);
  assert.equal(res.chunks.length, 0);
  leave();
  hub.close();
});

test('sends a heartbeat comment to keep proxies awake', async () => {
  const hub = createHub({ heartbeatMs: 10 });
  const res = fakeResponse();
  const leave = hub.subscribe('general', res);
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.ok(res.chunks.some((chunk) => chunk.includes(': ping')));
  leave();
  hub.close();
});
`,
    },
    {
      file: 'test/api.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatServer } = require('../server');

async function start(t) {
  const server = createChatServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

test('GET /api/rooms lists the rooms', async (t) => {
  const base = await start(t);
  const res = await fetch(base + '/api/rooms');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.rooms.length, 3);
  assert.equal(data.rooms[0].id, 'general');
});

test('POST /api/rooms/:id/messages creates a message', async (t) => {
  const base = await start(t);
  const res = await fetch(base + '/api/rooms/general/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author: ' Ada ', text: ' Hello room ' }),
  });
  assert.equal(res.status, 201);
  const message = await res.json();
  assert.equal(message.author, 'Ada');
  assert.equal(message.text, 'Hello room');
  assert.equal(message.roomId, 'general');
});

test('GET /api/rooms/:id/messages returns history', async (t) => {
  const base = await start(t);
  await fetch(base + '/api/rooms/build/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author: 'Ada', text: 'First' }),
  });
  const res = await fetch(base + '/api/rooms/build/messages?limit=10');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.room.id, 'build');
  assert.equal(data.messages.length, 1);
  assert.equal(data.messages[0].text, 'First');
});

test('rejects an unknown room', async (t) => {
  const base = await start(t);
  const res = await fetch(base + '/api/rooms/missing/messages');
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.match(data.error, /room/i);
});

test('rejects invalid JSON and invalid messages', async (t) => {
  const base = await start(t);
  const badJson = await fetch(base + '/api/rooms/general/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(badJson.status, 400);

  const blank = await fetch(base + '/api/rooms/general/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author: 'Ada', text: '  ' }),
  });
  assert.equal(blank.status, 400);
});

test('serves the browser entry point', async (t) => {
  const base = await start(t);
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Chatter/);
  assert.match(html, /\\/app\\.js/);
});
`,
    },
    {
      file: 'test/sse.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatServer } = require('../server');

async function start(t) {
  const server = createChatServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

function readerFor(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  return async function nextFrame() {
    while (true) {
      const split = buffer.indexOf('\\n\\n');
      if (split !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        return frame;
      }
      const { value, done } = await reader.read();
      if (done) throw new Error('SSE stream closed');
      buffer += decoder.decode(value, { stream: true });
    }
  };
}

test('the events endpoint sends ready, presence, and new messages', async (t) => {
  const base = await start(t);
  const controller = new AbortController();
  const res = await fetch(base + '/events?room=general', { signal: controller.signal });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\\/event-stream/);

  const nextFrame = readerFor(res);
  let frame = await nextFrame();
  while (!frame.includes('event: ready')) frame = await nextFrame();
  assert.match(frame, /general/);

  frame = await nextFrame();
  while (!frame.includes('event: presence')) frame = await nextFrame();
  assert.match(frame, /"count":1/);

  await fetch(base + '/api/rooms/general/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author: 'Ada', text: 'Hello SSE' }),
  });

  frame = await nextFrame();
  while (!frame.includes('event: message')) frame = await nextFrame();
  assert.match(frame, /Hello SSE/);
  controller.abort();
});

test('the events endpoint rejects an unknown room', async (t) => {
  const base = await start(t);
  const res = await fetch(base + '/events?room=missing');
  assert.equal(res.status, 404);
});
`,
    },
    {
      file: 'test/markup.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('has the regions the client needs', () => {
  for (const id of ['room-list', 'room-title', 'room-topic', 'messages', 'message-form', 'message-input', 'presence', 'status']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing #' + id);
  }
});

test('has a real form, labelled input, and template', () => {
  assert.match(html, /<form[^>]+id="message-form"/);
  assert.match(html, /<label[^>]+for="message-input"/);
  assert.ok(html.includes('id="message-template"'));
  assert.ok(html.includes('autocomplete="off"'));
});

test('links the stylesheet and client script', () => {
  assert.ok(html.includes('href="/styles.css"'));
  assert.ok(html.includes('src="/app.js"'));
  assert.ok(html.includes('defer'));
});
`,
    },
    {
      file: 'test/client.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('connects with EventSource and names the room', () => {
  assert.ok(js.includes('EventSource'));
  assert.ok(js.includes('/events?room='));
  assert.ok(js.includes('addEventListener'));
});

test('uses the rooms, history, and message endpoints', () => {
  assert.ok(js.includes('/api/rooms'));
  assert.ok(js.includes('/messages'));
  assert.ok(js.includes('POST'));
});

test('renders user text safely', () => {
  assert.ok(js.includes('textContent'));
  assert.ok(!js.includes('innerHTML'));
});

test('reconnects when the stream drops', () => {
  assert.ok(js.includes('onerror'));
  assert.ok(js.includes('reconnect') || js.includes('setStatus'));
});
`,
    },
    {
      file: 'test/styles.test.js',
      content: `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');

test('lays out the room rail and message column', () => {
  assert.match(css, /\\.app-shell\\s*\\{/);
  assert.match(css, /grid-template-columns/);
  assert.match(css, /\\.message-list\\s*\\{/);
});

test('styles messages, presence, and focus', () => {
  assert.match(css, /\\.message\\s*\\{/);
  assert.match(css, /\\.presence/);
  assert.match(css, /:focus-visible/);
});

test('adapts to narrow screens and reduced motion', () => {
  assert.match(css, /@media\\s*\\(max-width/);
  assert.match(css, /prefers-reduced-motion/);
});
`,
    },
  ],
  steps: [
    {
      id: 'chat-0-package',
      title: 'Inspect the project scripts',
      file: 'package.json',
      task: 'Chatter uses only Node built-ins, so there is nothing to install. Read `package.json`, then press Check step. `npm start` runs the server and `npm test` runs the whole suite.',
      examples: [
        { label: 'Start the server', code: 'npm start' },
        { label: 'Run the tests', code: 'npm test' },
        { label: 'Ask npm what start does', code: 'npm pkg get scripts.start' },
      ],
      hints: [
        'No dependencies means no node_modules folder is needed.',
        'Node 20 is required for the built-in test runner and fetch.',
      ],
      checks: [
        { id: 'start-script', type: 'runCommand', command: 'npm pkg get scripts.start', expect: 'node server.js', match: 'contains' },
      ],
      solution: `{
  "name": "chatter",
  "version": "1.0.0",
  "private": true,
  "description": "A small realtime chat server built on Server-Sent Events.",
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
      id: 'chat-1-store',
      title: 'Build the message store',
      file: 'lib/store.js',
      task: 'Implement `createStore`: three default rooms, `listRooms()` with a `messageCount`, `history(roomId, { limit })` oldest-first, and `addMessage(roomId, { author, text })`. Trim both fields, reject blanks, cap the author at 24 characters and the message at 500, throw `ChatError` with status 404 for an unknown room, and keep only the newest `maxMessages` messages. Run `node --test test/store.test.js`.',
      examples: [
        { label: 'The shape', code: `const store = createStore({ maxMessages: 50 });
store.listRooms();
store.history('general', { limit: 20 });
store.addMessage('general', { author: 'Ada', text: 'Hello' });` },
        { label: 'Trim and reject', code: `const author = String(rawAuthor || '').trim();
if (!author) throw new ChatError('Author is required.');
if (author.length > 24) throw new ChatError('Author is too long.');` },
        { label: 'Cap history', code: `bucket.push(message);
if (bucket.length > maxMessages) bucket.shift();` },
      ],
      hints: [
        'Keep one array of messages per room in a Map.',
        'ChatError should carry a numeric status so the HTTP layer can reuse it.',
        'history() should return copies, not the live array, so callers cannot mutate the store.',
      ],
      checks: [
        { id: 'store-tests', type: 'runCommand', command: 'node --test test/store.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `const DEFAULT_ROOMS = [
  { id: 'general', name: 'General', topic: 'Introduce yourself and talk shop.' },
  { id: 'build', name: 'Build Lab', topic: 'Share what you are making right now.' },
  { id: 'random', name: 'Off Topic', topic: 'The water cooler.' },
];

class ChatError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ChatError';
    this.status = status;
  }
}

function createStore(options = {}) {
  const rooms = (options.rooms || DEFAULT_ROOMS).map((room) => ({ ...room }));
  const maxMessages = Number.isInteger(options.maxMessages) ? options.maxMessages : 100;
  const buckets = new Map(rooms.map((room) => [room.id, []]));
  let nextId = 1;

  function roomFor(roomId) {
    if (!buckets.has(roomId)) throw new ChatError('Unknown room.', 404);
    return buckets.get(roomId);
  }

  function listRooms() {
    return rooms.map((room) => ({
      ...room,
      messageCount: buckets.get(room.id).length,
    }));
  }

  function history(roomId, options = {}) {
    const bucket = roomFor(roomId);
    const requested = Number(options.limit);
    const limit = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 50;
    return bucket.slice(-limit).map((message) => ({ ...message }));
  }

  function addMessage(roomId, input = {}) {
    const bucket = roomFor(roomId);
    const author = String(input.author || '').trim();
    const text = String(input.text || '').trim();

    if (!author) throw new ChatError('Author is required.');
    if (author.length > 24) throw new ChatError('Author must be 24 characters or fewer.');
    if (!text) throw new ChatError('Message is required.');
    if (text.length > 500) throw new ChatError('Message must be 500 characters or fewer.');

    const message = {
      id: 'm' + nextId++,
      roomId,
      author,
      text,
      at: new Date().toISOString(),
    };
    bucket.push(message);
    while (bucket.length > maxMessages) bucket.shift();
    return { ...message };
  }

  return { listRooms, history, addMessage, hasRoom: (roomId) => buckets.has(roomId) };
}

module.exports = { ChatError, createStore, DEFAULT_ROOMS };
`,
    },
    {
      id: 'chat-2-hub',
      title: 'Fan messages out with an SSE hub',
      file: 'lib/hub.js',
      task: 'Implement `createHub`: `subscribe(roomId, res)` returns a leave function, `publish(roomId, event, data)` writes a properly framed SSE event to every subscriber and returns how many received it, `presence(roomId)` counts open subscribers, and a heartbeat writes `: ping` on an interval. Stop the heartbeat when the last subscriber leaves or `close()` is called. Run `node --test test/hub.test.js`.',
      examples: [
        { label: 'An SSE frame', code: `res.write('event: ' + event + '\\n');
res.write('data: ' + JSON.stringify(data) + '\\n\\n');` },
        { label: 'Subscribe', code: `const clients = new Map();
function subscribe(roomId, res) {
  if (!clients.has(roomId)) clients.set(roomId, new Set());
  clients.get(roomId).add(res);
  return () => clients.get(roomId).delete(res);
}` },
      ],
      hints: [
        'A Set of open response objects is enough for fan-out.',
        'Delete empty room entries so presence does not leak.',
        'The heartbeat should only run while someone is subscribed.',
      ],
      checks: [
        { id: 'hub-tests', type: 'runCommand', command: 'node --test test/hub.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `// Fan-out for Server-Sent Events. One subscriber per open browser tab.
function createHub(options = {}) {
  const heartbeatMs = Number.isInteger(options.heartbeatMs) ? options.heartbeatMs : 15000;
  const rooms = new Map();
  let timer = null;

  function frame(event, data) {
    return 'event: ' + event + '\\ndata: ' + JSON.stringify(data) + '\\n\\n';
  }

  function ensureTimer() {
    if (timer || heartbeatMs <= 0) return;
    timer = setInterval(() => {
      for (const clients of rooms.values()) {
        for (const res of clients) {
          try {
            res.write(': ping\\n\\n');
          } catch {
            clients.delete(res);
          }
        }
      }
    }, heartbeatMs);
    if (typeof timer.unref === 'function') timer.unref();
  }

  function maybeStopTimer() {
    if (timer && presence() === 0) {
      clearInterval(timer);
      timer = null;
    }
  }

  function subscribe(roomId, res) {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    const clients = rooms.get(roomId);
    clients.add(res);
    ensureTimer();
    let active = true;
    return function leave() {
      if (!active) return;
      active = false;
      clients.delete(res);
      if (clients.size === 0) rooms.delete(roomId);
      maybeStopTimer();
    };
  }

  function publish(roomId, event, data) {
    const clients = rooms.get(roomId);
    if (!clients) return 0;
    let delivered = 0;
    for (const res of clients) {
      try {
        res.write(frame(event, data));
        delivered += 1;
      } catch {
        clients.delete(res);
      }
    }
    return delivered;
  }

  function presence(roomId) {
    if (roomId) return rooms.get(roomId)?.size || 0;
    let total = 0;
    for (const clients of rooms.values()) total += clients.size;
    return total;
  }

  function close() {
    if (timer) clearInterval(timer);
    timer = null;
    rooms.clear();
  }

  return { subscribe, publish, presence, close };
}

module.exports = { createHub };
`,
    },
    {
      id: 'chat-3-api',
      title: 'Serve rooms, history, and new messages',
      file: 'server.js',
      task: 'Turn the HTTP server into a JSON API. `GET /api/rooms` returns `{ rooms }`; `GET /api/rooms/:id/messages?limit=` returns `{ room, messages }`; `POST /api/rooms/:id/messages` reads a small JSON body and returns the created message with status 201. Reject invalid JSON, unknown rooms, and bad messages with the right status. Serve `public/` for everything else. Run `node --test test/api.test.js`.',
      examples: [
        { label: 'Parse the URL', code: `const url = new URL(req.url, 'http://localhost');
const parts = url.pathname.split('/').filter(Boolean);` },
        { label: 'Reuse ChatError', code: `catch (err) {
  const status = err instanceof ChatError ? err.status : 500;
  sendJson(res, status, { error: err.message });
}` },
        { label: 'Create a message', code: `const message = store.addMessage(roomId, body);
sendJson(res, 201, message);` },
      ],
      hints: [
        'Check the method and the path shape before reading a body.',
        'Keep a size limit on request bodies; chat messages are small.',
        'For static files, resolve the path and confirm it stays inside public/.',
      ],
      checks: [
        { id: 'api-tests', type: 'runCommand', command: 'node --test test/api.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { ChatError, createStore } = require('./lib/store');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > limit) return reject(new ChatError('Request body is too large.', 413));
      if (size === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ChatError('Invalid JSON body.', 400));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\\/+/, '');
  const target = path.resolve(PUBLIC_DIR, relative);
  if (!target.startsWith(PUBLIC_DIR + path.sep) && target !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const type = MIME[path.extname(target)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(data);
  });
}

function createChatServer(options = {}) {
  const store = options.store || createStore();

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);

    try {
      if (req.method === 'GET' && url.pathname === '/api/rooms') {
        sendJson(res, 200, { rooms: store.listRooms() });
        return;
      }

      if (parts[0] === 'api' && parts[1] === 'rooms' && parts[3] === 'messages') {
        const roomId = decodeURIComponent(parts[2]);
        if (!store.hasRoom(roomId)) throw new ChatError('Unknown room.', 404);

        if (req.method === 'GET') {
          const limit = Number(url.searchParams.get('limit')) || 50;
          const room = store.listRooms().find((item) => item.id === roomId);
          sendJson(res, 200, { room, messages: store.history(roomId, { limit }) });
          return;
        }

        if (req.method === 'POST') {
          const body = await readJson(req);
          sendJson(res, 201, store.addMessage(roomId, body));
          return;
        }
      }

      if (parts[0] === 'api') {
        sendJson(res, 404, { error: 'API route not found.' });
        return;
      }

      if (req.method === 'GET') {
        serveStatic(req, res, url.pathname);
        return;
      }

      res.writeHead(405, { allow: 'GET' });
      res.end();
    } catch (err) {
      const status = err instanceof ChatError ? err.status : 500;
      if (status >= 500) console.error('[chatter]', err);
      sendJson(res, status, { error: err.message || 'Server error.' });
    }
  });
}

module.exports = { createChatServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createChatServer().listen(port, () => {
    console.log('Chatter listening on http://localhost:' + port);
  });
}
`,
    },
    {
      id: 'chat-4-sse',
      title: 'Add the live event stream',
      file: 'server.js',
      task: 'Add `GET /events?room=`. Set the SSE headers, write a retry hint, subscribe the response to the hub, send a `ready` event and a `presence` event, publish each new chat message as a `message` event, and publish presence again when the tab closes. Run `node --test test/sse.test.js`.',
      examples: [
        { label: 'SSE headers', code: `res.writeHead(200, {
  'content-type': 'text/event-stream',
  'cache-control': 'no-cache',
  connection: 'keep-alive',
});
res.write('retry: 2000\\n\\n');` },
        { label: 'Stay open', code: `req.on('close', () => {
  leave();
  hub.publish(roomId, 'presence', { count: hub.presence(roomId) });
});` },
      ],
      hints: [
        'Do not call res.end() on an event stream.',
        'Subscribers should be removed when the request closes.',
        'Publishing presence on join and leave lets the client show a live count.',
      ],
      checks: [
        { id: 'sse-tests', type: 'runCommand', command: 'node --test test/sse.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { ChatError, createStore } = require('./lib/store');
const { createHub } = require('./lib/hub');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > limit) return reject(new ChatError('Request body is too large.', 413));
      if (size === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ChatError('Invalid JSON body.', 400));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\\/+/, '');
  const target = path.resolve(PUBLIC_DIR, relative);
  if (!target.startsWith(PUBLIC_DIR + path.sep) && target !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const type = MIME[path.extname(target)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(data);
  });
}

function createChatServer(options = {}) {
  const store = options.store || createStore();
  const hub = options.hub || createHub();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);

    try {
      if (req.method === 'GET' && url.pathname === '/api/rooms') {
        sendJson(res, 200, { rooms: store.listRooms() });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/events') {
        const roomId = url.searchParams.get('room') || 'general';
        if (!store.hasRoom(roomId)) throw new ChatError('Unknown room.', 404);

        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
        });
        res.write('retry: 2000\\n\\n');

        const leave = hub.subscribe(roomId, res);
        hub.publish(roomId, 'ready', { room: roomId, presence: hub.presence(roomId) });
        hub.publish(roomId, 'presence', { count: hub.presence(roomId) });

        req.on('close', () => {
          leave();
          hub.publish(roomId, 'presence', { count: hub.presence(roomId) });
        });
        return;
      }

      if (parts[0] === 'api' && parts[1] === 'rooms' && parts[3] === 'messages') {
        const roomId = decodeURIComponent(parts[2]);
        if (!store.hasRoom(roomId)) throw new ChatError('Unknown room.', 404);

        if (req.method === 'GET') {
          const limit = Number(url.searchParams.get('limit')) || 50;
          const room = store.listRooms().find((item) => item.id === roomId);
          sendJson(res, 200, { room, messages: store.history(roomId, { limit }) });
          return;
        }

        if (req.method === 'POST') {
          const body = await readJson(req);
          const message = store.addMessage(roomId, body);
          hub.publish(roomId, 'message', message);
          sendJson(res, 201, message);
          return;
        }
      }

      if (parts[0] === 'api') {
        sendJson(res, 404, { error: 'API route not found.' });
        return;
      }

      if (req.method === 'GET') {
        serveStatic(req, res, url.pathname);
        return;
      }

      res.writeHead(405, { allow: 'GET' });
      res.end();
    } catch (err) {
      const status = err instanceof ChatError ? err.status : 500;
      if (status >= 500) console.error('[chatter]', err);
      if (!res.headersSent) sendJson(res, status, { error: err.message || 'Server error.' });
      else res.end();
    }
  });

  server.on('close', () => hub.close());
  return server;
}

module.exports = { createChatServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createChatServer().listen(port, () => {
    console.log('Chatter listening on http://localhost:' + port);
  });
}
`,
    },
    {
      id: 'chat-5-markup',
      title: 'Build the chat shell',
      file: 'public/index.html',
      task: 'Replace the placeholder with the chat layout: a room list, the current room title and topic, a live presence count, a status line, a message log, and a labelled composer form with a 500-character input. Include `<template id="message-template">` for one message. Link `/styles.css` and `/app.js` with `defer`. Run `node --test test/markup.test.js`.',
      examples: [
        { label: 'Composer', code: `<form id="message-form" autocomplete="off">
  <label for="message-input">Message</label>
  <input id="message-input" name="message" maxlength="500" required>
  <button type="submit">Send</button>
</form>` },
        { label: 'Message template', code: `<template id="message-template">
  <article class="message">
    <header><strong data-author></strong><time data-time></time></header>
    <p data-text></p>
  </article>
</template>` },
      ],
      hints: [
        'Use a nav or aside for the room list and buttons with data-room ids.',
        'The message log should be its own scrollable region with aria-live.',
        'The presence element can say "1 online" and update from JavaScript.',
      ],
      checks: [
        { id: 'markup-tests', type: 'runCommand', command: 'node --test test/markup.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chatter</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <main class="app-shell">
      <aside class="room-rail">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">C</span>
          <div>
            <strong>Chatter</strong>
            <span>a tiny realtime room</span>
          </div>
        </div>
        <nav id="room-list" aria-label="Chat rooms"></nav>
        <p class="rail-note">Built with Server-Sent Events. Open a second tab to see it live.</p>
      </aside>

      <section class="chat">
        <header class="chat-header">
          <div>
            <h1 id="room-title">General</h1>
            <p id="room-topic">Loading the room...</p>
          </div>
          <div class="chat-meta">
            <span id="presence" class="presence">0 online</span>
            <span id="status" class="status" role="status">Connecting</span>
          </div>
        </header>

        <div id="messages" class="message-list" aria-live="polite" aria-relevant="additions"></div>

        <form id="message-form" class="composer" autocomplete="off">
          <label for="message-input">Message</label>
          <input id="message-input" name="message" maxlength="500" placeholder="Say something..." required>
          <button type="submit">Send</button>
        </form>
      </section>
    </main>

    <template id="message-template">
      <article class="message">
        <header>
          <strong data-author></strong>
          <time data-time></time>
        </header>
        <p data-text></p>
      </article>
    </template>

    <script src="/app.js" defer></script>
  </body>
</html>
`,
    },
    {
      id: 'chat-6-client',
      title: 'Make the client live',
      file: 'public/app.js',
      task: 'Load the room list, select a room, fetch its history, and connect an `EventSource` to `/events?room=`. Append `message` events without duplicates, update presence, show connecting/live/reconnecting states, and submit new messages with `fetch`. Render every user string with `textContent` — never `innerHTML`. Reconnect when the stream errors. Run `node --test test/client.test.js`.',
      examples: [
        { label: 'Connect', code: `const source = new EventSource('/events?room=' + encodeURIComponent(state.roomId));
source.addEventListener('message', (event) => {
  appendMessage(JSON.parse(event.data));
});` },
        { label: 'Send', code: `await fetch('/api/rooms/' + state.roomId + '/messages', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ author: state.author, text }),
});` },
        { label: 'Render safely', code: `node.querySelector('[data-author]').textContent = message.author;
node.querySelector('[data-text]').textContent = message.text;` },
      ],
      hints: [
        'Close the previous EventSource before opening a new one when the room changes.',
        'Keep a Set of message ids so history plus live events cannot show duplicates.',
        'EventSource reconnects on its own; use onerror to show a reconnecting state, not to loop manually.',
      ],
      checks: [
        { id: 'client-tests', type: 'runCommand', command: 'node --test test/client.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `// Browser state, rendering, and the EventSource connection.
const state = {
  rooms: [],
  roomId: localStorage.getItem('chatter.room') || 'general',
  messages: [],
  seen: new Set(),
  source: null,
  author: localStorage.getItem('chatter.author') || 'Guest',
};

const els = {
  roomList: document.getElementById('room-list'),
  roomTitle: document.getElementById('room-title'),
  roomTopic: document.getElementById('room-topic'),
  presence: document.getElementById('presence'),
  status: document.getElementById('status'),
  messages: document.getElementById('messages'),
  form: document.getElementById('message-form'),
  input: document.getElementById('message-input'),
  template: document.getElementById('message-template'),
};

function setStatus(text, tone = '') {
  els.status.textContent = text;
  if (tone) els.status.dataset.tone = tone;
  else delete els.status.dataset.tone;
}

function formatTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function nearBottom() {
  return els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight < 80;
}

function messageNode(message) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.dataset.id = message.id;
  node.querySelector('[data-author]').textContent = message.author;
  node.querySelector('[data-time]').dateTime = message.at;
  node.querySelector('[data-time]').textContent = formatTime(message.at);
  node.querySelector('[data-text]').textContent = message.text;
  if (message.author === state.author) node.classList.add('is-mine');
  return node;
}

function appendMessage(message) {
  if (state.seen.has(message.id)) return;
  state.seen.add(message.id);
  const stick = nearBottom();
  els.messages.append(messageNode(message));
  state.messages.push(message);
  if (stick) els.messages.scrollTop = els.messages.scrollHeight;
}

function renderRooms() {
  els.roomList.replaceChildren();
  for (const room of state.rooms) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'room-button';
    button.dataset.room = room.id;
    button.textContent = room.name;
    const count = document.createElement('span');
    count.textContent = room.messageCount;
    button.append(count);
    if (room.id === state.roomId) button.classList.add('is-active');
    button.addEventListener('click', () => selectRoom(room.id));
    els.roomList.append(button);
  }
}

function renderRoom() {
  const room = state.rooms.find((item) => item.id === state.roomId);
  els.roomTitle.textContent = room ? room.name : state.roomId;
  els.roomTopic.textContent = room ? room.topic : '';
  document.title = (room ? room.name : 'Chatter') + ' · Chatter';
}

function renderMessages() {
  els.messages.replaceChildren();
  for (const message of state.messages) els.messages.append(messageNode(message));
  els.messages.scrollTop = els.messages.scrollHeight;
}

async function loadRooms() {
  const res = await fetch('/api/rooms');
  if (!res.ok) throw new Error('Could not load rooms.');
  const data = await res.json();
  state.rooms = data.rooms;
  if (!state.rooms.some((room) => room.id === state.roomId)) state.roomId = state.rooms[0].id;
  renderRooms();
  renderRoom();
}

async function loadHistory() {
  const res = await fetch('/api/rooms/' + encodeURIComponent(state.roomId) + '/messages?limit=50');
  if (!res.ok) throw new Error('Could not load messages.');
  const data = await res.json();
  state.messages = data.messages;
  state.seen = new Set(data.messages.map((message) => message.id));
  renderMessages();
}

function connect() {
  if (state.source) state.source.close();
  setStatus('Connecting', 'pending');
  const source = new EventSource('/events?room=' + encodeURIComponent(state.roomId));
  state.source = source;

  source.onopen = () => setStatus('Live', 'live');
  source.onerror = () => setStatus('Reconnecting', 'pending');

  source.addEventListener('ready', (event) => {
    const data = JSON.parse(event.data);
    els.presence.textContent = data.presence + ' online';
    setStatus('Live', 'live');
  });

  source.addEventListener('presence', (event) => {
    const data = JSON.parse(event.data);
    els.presence.textContent = data.count + ' online';
  });

  source.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.roomId === state.roomId) appendMessage(message);
  });
}

async function selectRoom(roomId) {
  state.roomId = roomId;
  localStorage.setItem('chatter.room', roomId);
  renderRooms();
  renderRoom();
  els.messages.replaceChildren();
  state.messages = [];
  state.seen = new Set();
  try {
    await loadHistory();
    connect();
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

async function sendMessage(text) {
  const res = await fetch('/api/rooms/' + encodeURIComponent(state.roomId) + '/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ author: state.author, text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not send that message.');
  appendMessage(data);
  return data;
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;
  els.input.value = '';
  setStatus('Sending', 'pending');
  try {
    await sendMessage(text);
    setStatus('Live', 'live');
  } catch (err) {
    els.input.value = text;
    setStatus(err.message, 'error');
  }
});

(async function boot() {
  setStatus('Connecting', 'pending');
  try {
    await loadRooms();
    await selectRoom(state.roomId);
  } catch (err) {
    setStatus(err.message, 'error');
  }
})();
`,
    },
    {
      id: 'chat-7-styles',
      title: 'Style the room',
      file: 'public/styles.css',
      task: 'Style a two-column app shell: a room rail and a message column. Make messages readable, mark your own messages, show live status and presence, style the composer, add visible focus states, and collapse to one column on narrow screens. Include a `prefers-reduced-motion` rule. Run `node --test test/styles.test.js`.',
      examples: [
        { label: 'App shell', code: `.app-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}` },
        { label: 'Scrollable log', code: `.message-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
}` },
        { label: 'Narrow screens', code: `@media (max-width: 720px) {
  .app-shell { grid-template-columns: 1fr; }
}` },
      ],
      hints: [
        'Give the message column a fixed viewport height so the composer stays visible.',
        'Use a CSS variable for the accent color.',
        'The status and presence dots can share a small state style.',
      ],
      checks: [
        { id: 'style-tests', type: 'runCommand', command: 'node --test test/styles.test.js', expect: '# fail 0', match: 'contains' },
      ],
      solution: `:root {
  color-scheme: dark;
  --bg: #0f1419;
  --panel: #171e26;
  --panel-2: #1e2833;
  --line: #2b3947;
  --text: #e8eef5;
  --muted: #8da2b5;
  --accent: #6ee7b7;
  --accent-ink: #06281d;
  --danger: #fca5a5;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.5 Inter, ui-sans-serif, system-ui, sans-serif;
}

button,
input { font: inherit; }

.app-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  height: 100vh;
}

.room-rail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 22px 18px;
  border-right: 1px solid var(--line);
  background: var(--panel);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 800;
}

.brand strong { display: block; }
.brand span { color: var(--muted); font-size: 12px; }

#room-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  text-align: left;
}

.room-button:hover { background: var(--panel-2); color: var(--text); }
.room-button.is-active { background: var(--panel-2); color: var(--text); }
.room-button span { font-size: 11px; color: var(--muted); }

.rail-note {
  margin-top: auto;
  color: var(--muted);
  font-size: 12px;
}

.chat {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  height: 100vh;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
}

.chat-header h1 { margin: 0; font-size: 20px; }
.chat-header p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }

.chat-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.presence,
.status {
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
}

.status[data-tone='live'] { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.status[data-tone='error'] { color: var(--danger); }

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 24px;
}

.message {
  max-width: 68ch;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
}

.message.is-mine {
  align-self: flex-end;
  border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
  background: color-mix(in srgb, var(--accent) 8%, var(--panel));
}

.message header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.message strong { font-size: 13px; color: var(--accent); }
.message time { color: var(--muted); font-size: 11px; }
.message p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }

.composer {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}

.composer label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.composer input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
}

.composer button {
  padding: 12px 20px;
  border: 0;
  border-radius: 10px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 700;
  cursor: pointer;
}

button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .app-shell { grid-template-columns: 1fr; }
  .room-rail { display: none; }
  .chat-header { padding: 14px 16px; }
  .message-list { padding: 16px; }
  .composer { padding: 12px 16px; }
}

@media (prefers-reduced-motion: reduce) {
  * { scroll-behavior: auto !important; }
}
`,
    },
    {
      id: 'chat-8-suite',
      title: 'Run the whole suite',
      file: 'package.json',
      task: 'Everything should now work together. Press Check step to run `npm test` — store, hub, API, SSE, markup, client, and style tests must all pass. Then run `npm start` and open two browser tabs to watch presence and messages update live.',
      examples: [
        { label: 'Run everything', code: 'npm test' },
        { label: 'Start Chatter', code: 'npm start' },
      ],
      hints: [
        'If one file fails, open its test output and fix the source file it names.',
        'Open the same room in two tabs; close one and the presence count should drop.',
      ],
      checks: [
        { id: 'full-suite', type: 'runCommand', command: 'npm test', expect: '# fail 0', match: 'contains' },
      ],
    },
  ],
  reflectionPrompt: 'Why is Server-Sent Events a good fit for chat messages from server to browser, and what still needs a normal POST request?',
};

export default chatter;
