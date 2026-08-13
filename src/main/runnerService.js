// Code runner — compiles/executes a source snippet in a sandboxed temp dir
// and returns its stdout/stderr/exit code. Supported now: javascript,
// typescript, python, c, cpp.
//
// Toolchain strategy:
//   - JavaScript : system `node` on PATH.
//   - TypeScript : `tsx` or `ts-node` on PATH; otherwise we tell the user
//                  one-shot how to install (`npm i -g tsx`).
//   - Python     : Windows `py`/`python`/`python3`; elsewhere `python3`/`python`.
//   - C / C++    : MSVC `cl.exe` if found, else `g++`/`gcc`, else
//                  `clang++`/`clang`. Compile to .exe in the temp dir, run.
//
// Sandboxing:
//   - Each run gets its own `os.tmpdir()/seec0de-run-<uuid>` directory.
//   - Hard timeout per phase (compile + execute), default 15s each.
//   - Output capped at 1 MB per stream (then truncated with a notice).
//   - Temp dir is removed after the run completes (or after a fail).
//
// IPC channels:
//   runner:run({ language, source, filename?, input? }) →
//     { stdout, stderr, exitCode, durationMs, command, tool, error? }

const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs   = require('fs').promises;
const path = require('path');
const os   = require('os');
const crypto = require('crypto');
const { getSafeEnv } = require('./envUtils');
const { transform } = require('sucrase');

const COMPILE_TIMEOUT_MS = 15_000;
const RUN_TIMEOUT_MS     = 15_000;
const MAX_OUTPUT_BYTES   = 1_000_000;
const IS_WINDOWS         = process.platform === 'win32';

// Interactive runs need longer so a learner can read a prompt and type
// input without the process being killed mid-thought.
const INTERACTIVE_TIMEOUT_MS = 60_000;
const MAX_ACTIVE_RUNS = 4;

// ---------------------------------------------------------------------------
// helpers

function uniqueDir() {
  const id = crypto.randomBytes(6).toString('hex');
  return path.join(os.tmpdir(), `seec0de-run-${id}`);
}

async function rmDir(dir) {
  try { await fs.rm(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

// `where` on Windows / `which` elsewhere — returns first matching path or null.
function whichTool(name) {
  return new Promise((resolve) => {
    const cmd = IS_WINDOWS ? 'where' : 'which';
    const child = spawn(cmd, [name], { windowsHide: true });
    let out = '';
    child.stdout.on('data', (b) => { out += b.toString('utf8'); });
    child.on('close', (code) => {
      if (code !== 0) return resolve(null);
      const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      resolve(first || null);
    });
    child.on('error', () => resolve(null));
  });
}

async function firstAvailable(names) {
  for (const n of names) {
    // eslint-disable-next-line no-await-in-loop
    const found = await whichTool(n);
    if (found) return n;
  }
  return null;
}

function execProcess({ cmd, args, cwd, timeout, input }) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let truncated = false;

    const child = spawn(cmd, args, {
      cwd,
      windowsHide: true,
      env: getSafeEnv(),
    });

    // Feed stdin so `input()`-style programs can read user input. Always end
    // the stream so readers get EOF instead of hanging until the timeout.
    child.stdin.on('error', () => { /* child already exited */ });
    try {
      if (input) child.stdin.write(input);
    } catch { /* ignore */ }
    try { child.stdin.end(); } catch { /* ignore */ }

    const cap = (acc, buf) => {
      const next = acc + buf.toString('utf8');
      if (next.length > MAX_OUTPUT_BYTES) {
        truncated = true;
        return next.slice(0, MAX_OUTPUT_BYTES);
      }
      return next;
    };

    child.stdout.on('data', (b) => { stdout = cap(stdout, b); });
    child.stderr.on('data', (b) => { stderr = cap(stderr, b); });

    const killer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      stderr += `\n[seec0de] killed after ${timeout}ms`;
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(killer);
      if (truncated) stderr += `\n[seec0de] output truncated at ${MAX_OUTPUT_BYTES} bytes`;
      resolve({
        stdout, stderr,
        exitCode: code ?? -1,
        durationMs: Date.now() - start,
      });
    });

    child.on('error', (err) => {
      clearTimeout(killer);
      resolve({
        stdout,
        stderr: stderr + `\n[seec0de] failed to spawn ${cmd}: ${err.message}`,
        exitCode: -1,
        durationMs: Date.now() - start,
      });
    });
  });
}

function mkResult(extras) {
  return {
    stdout: '', stderr: '', exitCode: -1, durationMs: 0,
    command: '', tool: null, error: null,
    ...extras,
  };
}

function notInstalled(label, hint) {
  return mkResult({
    exitCode: -1,
    error: `${label} not found on PATH. ${hint}`,
    stderr: `${label} not found on PATH.\n${hint}\n`,
  });
}

// ---------------------------------------------------------------------------
// per-language runners

async function runJavaScript(dir, source, filename, input) {
  const file = path.join(dir, filename || 'main.js');
  await fs.writeFile(file, source, 'utf8');
  // process.execPath is Electron itself in production. Prefer system node.
  const node = await firstAvailable(['node']);
  if (!node) {
    return notInstalled('Node.js', 'Install from https://nodejs.org and reopen seec0de.');
  }
  const result = await execProcess({ cmd: node, args: [file], cwd: dir, timeout: RUN_TIMEOUT_MS, input });
  return { ...result, command: `node ${path.basename(file)}`, tool: 'node' };
}

async function runTypeScript(dir, source, filename, input) {
  const file = path.join(dir, filename || 'main.ts');
  await fs.writeFile(file, source, 'utf8');
  // `tsx` is the modern, fast choice. `ts-node` is the legacy fallback.
  const tool = await firstAvailable(['tsx', 'ts-node']);
  if (!tool) {
    return notInstalled('tsx / ts-node', 'Install with `npm i -g tsx` to run TypeScript here.');
  }
  const result = await execProcess({ cmd: tool, args: [file], cwd: dir, timeout: RUN_TIMEOUT_MS, input });
  return { ...result, command: `${tool} ${path.basename(file)}`, tool };
}

function resolveDep(name) {
  // Absolute path, JSON-stringified so it can be dropped straight into
  // generated source as a string literal. Required because the runner
  // writes user code into a throwaway temp dir with no node_modules of
  // its own — bare `require('jsdom')` would fail there even though the
  // package is installed at the project root.
  return JSON.stringify(require.resolve(name));
}

async function runReact(dir, source, filename, input) {
  const outFile = path.join(dir, (filename || 'main.jsx').replace(/\.jsx?$/, '.js'));

  let compiled;
  try {
    compiled = transform(source, { transforms: ['jsx'] }).code;
  } catch (err) {
    return mkResult({
      exitCode: -1,
      error: 'JSX compile error',
      stderr: `JSX compile error: ${err.message}\n`,
    });
  }

  const preamble = `
const { JSDOM } = require(${resolveDep('jsdom')});
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.getComputedStyle = dom.window.getComputedStyle;
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = require(${resolveDep('react')});
global.React = React;
const { render, screen, fireEvent, within, waitFor } = require(${resolveDep('@testing-library/react')});
global.render = render;
global.screen = screen;
global.fireEvent = fireEvent;
global.within = within;
global.waitFor = waitFor;
`;

  await fs.writeFile(outFile, preamble + '\n' + compiled, 'utf8');

  const node = await firstAvailable(['node']);
  if (!node) {
    return notInstalled('Node.js', 'Install from https://nodejs.org and reopen seec0de.');
  }
  const result = await execProcess({ cmd: node, args: [outFile], cwd: dir, timeout: RUN_TIMEOUT_MS, input });
  return { ...result, command: `node ${path.basename(outFile)}`, tool: 'node (react)' };
}

async function runPython(dir, source, filename, input) {
  const file = path.join(dir, filename || 'main.py');
  await fs.writeFile(file, source, 'utf8');
  // `py` is the Windows launcher that resolves to the latest installed Python.
  const tool = await firstAvailable(IS_WINDOWS ? ['py', 'python', 'python3'] : ['python3', 'python']);
  if (!tool) {
    return notInstalled('Python', 'Install from https://www.python.org and reopen seec0de.');
  }
  const result = await execProcess({ cmd: tool, args: [file], cwd: dir, timeout: RUN_TIMEOUT_MS, input });
  return { ...result, command: `${tool} ${path.basename(file)}`, tool };
}

async function runCFamily(dir, source, filename, isCpp, input) {
  const ext  = isCpp ? '.cpp' : '.c';
  const file = path.join(dir, filename || `main${ext}`);
  const exe  = path.join(dir, IS_WINDOWS ? 'main.exe' : 'main.out');
  await fs.writeFile(file, source, 'utf8');

  // Pick a compiler. MSVC `cl.exe` needs a Developer Command Prompt env to
  // work — we still try, but g++/clang are more reliable on Windows.
  const candidates = isCpp ? ['g++', 'clang++', 'cl'] : ['gcc', 'clang', 'cl'];
  const tool = await firstAvailable(candidates);
  if (!tool) {
    return notInstalled(
      isCpp ? 'A C++ compiler (g++, clang++, or cl)' : 'A C compiler (gcc, clang, or cl)',
      'On Windows, install MSYS2 (`pacman -S mingw-w64-ucrt-x86_64-gcc`) or LLVM/Clang.'
    );
  }

  // Compile.
  let compileArgs;
  let compileCmd;
  if (tool === 'cl') {
    // MSVC: `cl /nologo /Fe:main.exe main.cpp`
    compileCmd = 'cl';
    compileArgs = ['/nologo', `/Fe:${exe}`, `/Fo:${path.join(dir, 'main.obj')}`, file];
  } else {
    compileCmd = tool;
    compileArgs = [file, '-o', exe];
    if (isCpp) compileArgs.push('-std=c++17');
  }

  const compile = await execProcess({
    cmd: compileCmd,
    args: compileArgs,
    cwd: dir,
    timeout: COMPILE_TIMEOUT_MS,
  });

  if (compile.exitCode !== 0) {
    return {
      ...compile,
      command: `${compileCmd} ${compileArgs.join(' ')}`,
      tool,
      error: 'Compilation failed.',
    };
  }

  // Execute.
  const run = await execProcess({ cmd: exe, args: [], cwd: dir, timeout: RUN_TIMEOUT_MS, input });
  return {
    stdout: (compile.stdout ? compile.stdout : '') + run.stdout,
    stderr: (compile.stderr ? compile.stderr : '') + run.stderr,
    exitCode: run.exitCode,
    durationMs: compile.durationMs + run.durationMs,
    command: `${tool} ${path.basename(file)} && ./${path.basename(exe)}`,
    tool,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// dispatcher

async function run({ language, source, filename, input }) {
  if (typeof source !== 'string' || !source.trim()) {
    return mkResult({ error: 'No source code to run.', stderr: 'No source code to run.\n' });
  }
  const dir = uniqueDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    switch ((language || '').toLowerCase()) {
      case 'javascript': return await runJavaScript(dir, source, filename, input);
      case 'typescript': return await runTypeScript(dir, source, filename, input);
      case 'react':      return await runReact(dir, source, filename, input);
      case 'python':     return await runPython(dir, source, filename, input);
      case 'c':          return await runCFamily(dir, source, filename, false, input);
      case 'cpp':        return await runCFamily(dir, source, filename, true, input);
      default:
        return mkResult({
          error: `Language "${language}" isn't runnable yet.`,
          stderr: `Language "${language}" isn't runnable yet. Supported: JavaScript, TypeScript, Python, C, C++.\n`,
        });
    }
  } finally {
    rmDir(dir);
  }
}

// ---------------------------------------------------------------------------
// Interactive runner — streams stdout/stderr to the renderer while the
// process runs and keeps stdin open so the learner can type input live.
// Lifecycle: runner:start → { id }, then a stream of runner:output events
// ({ id, stream: 'stdout'|'stderr', chunk }), runner:input-wanted events
// ({ id }) the moment the program blocks reading stdin, and one
// runner:exit event ({ id, stdout, stderr, exitCode, durationMs, command,
// tool, error }). The learner's typing arrives via runner:stdin ({ id, chunk }).

const activeRuns = new Map(); // id -> { child, timer }

class CompilationError extends Error {
  constructor(result) {
    super('Compilation failed.');
    this.result = result;
  }
}

// Emitted on stderr (and stripped before the learner sees it) the instant a
// program blocks reading stdin. Instrumentation wrappers write this token
// right before they read, so the renderer can show the input row exactly
// when it's needed — and never otherwise.
const STDIN_WANTED_MARKER = '\u0000SEEC0DE_INPUT_NEEDED\u0000';

// Removes marker tokens from a stderr chunk and returns the clean text.
// Emits one `runner:input-wanted` event per token found. `buf` is a per-run
// { s: '' } holder that survives chunk splits so a token never leaks.
function stripStdinWantedMarkers(buf, chunk, id, emit) {
  buf.s += chunk;
  let cleaned = '';
  let searchFrom = 0;
  let idx;
  while ((idx = buf.s.indexOf(STDIN_WANTED_MARKER, searchFrom)) !== -1) {
    cleaned += buf.s.slice(searchFrom, idx);
    emit('runner:input-wanted', { id });
    searchFrom = idx + STDIN_WANTED_MARKER.length;
  }
  cleaned += buf.s.slice(searchFrom);

  // Keep a possible partial marker at the tail for the next chunk.
  let keep = 0;
  for (let i = 1; i < STDIN_WANTED_MARKER.length; i += 1) {
    if (cleaned.endsWith(STDIN_WANTED_MARKER.slice(0, i))) keep = Math.max(keep, i);
  }
  buf.s = cleaned.slice(cleaned.length - keep);
  return cleaned.slice(0, cleaned.length - keep);
}

// Spawns a process and streams output live; keeps stdin open. Resolves when
// the process exits (never rejects — failures surface via runner:exit).
function execProcessLive({ cmd, args, cwd, timeout, sender, id, command, tool }) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let truncated = false;

    const child = spawn(cmd, args, {
      cwd,
      windowsHide: true,
      env: getSafeEnv(),
    });

    // stdin stays open so the renderer can write to it while the program
    // waits for input. Errors are expected when the child exits first.
    child.stdin.on('error', () => { /* child already exited */ });

    const emit = (channel, data) => {
      try { sender.send(channel, data); } catch { /* window closed */ }
    };

    const markerBuf = { s: '' };
    const onData = (stream, buf) => {
      let text = buf.toString('utf8');
      if (stream === 'stderr') {
        text = stripStdinWantedMarkers(markerBuf, text, id, emit);
      }
      const next = (stream === 'stdout' ? stdout : stderr) + text;
      if (next.length > MAX_OUTPUT_BYTES) {
        truncated = true;
        if (stream === 'stdout') stdout = next.slice(0, MAX_OUTPUT_BYTES);
        else stderr = next.slice(0, MAX_OUTPUT_BYTES);
      } else if (stream === 'stdout') {
        stdout = next;
      } else {
        stderr = next;
      }
      emit('runner:output', { id, stream, chunk: text });
    };
    child.stdout.on('data', (b) => onData('stdout', b));
    child.stderr.on('data', (b) => onData('stderr', b));

    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      const note = `\n[seec0de] killed after ${timeout}ms`;
      stderr += note;
      emit('runner:output', { id, stream: 'stderr', chunk: note });
    }, timeout);

    const finish = (exitCode, durationMs, error) => {
      clearTimeout(timer);
      activeRuns.delete(id);
      if (truncated) stderr += `\n[seec0de] output truncated at ${MAX_OUTPUT_BYTES} bytes`;
      emit('runner:exit', { id, stdout, stderr, exitCode, durationMs, command, tool, error: error ?? null });
      resolve();
    };

    child.on('close', (code) => finish(code ?? -1, Date.now() - start, null));
    child.on('error', (err) => {
      const note = `[seec0de] failed to spawn ${cmd}: ${err.message}`;
      stderr += `\n${note}\n`;
      finish(-1, Date.now() - start, note);
    });

    activeRuns.set(id, { child, timer });
  });
}

// Writes the source into the sandbox dir and returns the { cmd, args } that
// would run it, plus a human `command` for display. Compiles C/C++ first.
async function prepareInteractiveProcess(language, dir, source, filename) {
  switch ((language || '').toLowerCase()) {
    case 'javascript': {
      const file = path.join(dir, filename || 'main.js');
      // Instrumentation preamble: signals the renderer whenever the program
      // asks for input — on attaching a stdin reader, and on every
      // readline question (so multi-question scripts re-show the row).
      const preamble = `
const __seec0deSignal = () => process.stderr.write(${JSON.stringify(STDIN_WANTED_MARKER + '\n')});
const __hook = (fn) => function (event, ...args) {
  if (event === 'data' || event === 'readable') __seec0deSignal();
  return fn.call(this, event, ...args);
};
if (process.stdin && typeof process.stdin.on === 'function') {
  const on = process.stdin.on.bind(process.stdin);
  const add = (process.stdin.addListener || on).bind(process.stdin);
  const pre = (process.stdin.prependListener || on).bind(process.stdin);
  const once = (process.stdin.once || on).bind(process.stdin);
  process.stdin.on = __hook(on);
  process.stdin.addListener = __hook(add);
  process.stdin.prependListener = __hook(pre);
  process.stdin.once = __hook(once);
}
try {
  const readline = require('readline');
  if (readline && readline.Interface && readline.Interface.prototype) {
    const origQuestion = readline.Interface.prototype.question;
    readline.Interface.prototype.question = function (query, cb) {
      __seec0deSignal();
      return origQuestion.call(this, query, cb);
    };
  }
} catch (e) { /* readline unavailable — fine */ }
`;
      await fs.writeFile(file, preamble + '\n' + source, 'utf8');
      const node = await firstAvailable(['node']);
      if (!node) throw new Error('Node.js not found on PATH. Install from https://nodejs.org and reopen seec0de.');
      return { cmd: node, args: [file], command: `node ${path.basename(file)}`, tool: 'node' };
    }
    case 'typescript': {
      const file = path.join(dir, filename || 'main.ts');
      // Same stdin instrumentation as JavaScript (valid TS too).
      const preamble = `
const __seec0deSignal = () => process.stderr.write(${JSON.stringify(STDIN_WANTED_MARKER + '\n')});
const __hook = (fn) => function (event, ...args) {
  if (event === 'data' || event === 'readable') __seec0deSignal();
  return fn.call(this, event, ...args);
};
if (process.stdin && typeof process.stdin.on === 'function') {
  const on = process.stdin.on.bind(process.stdin);
  const add = (process.stdin.addListener || on).bind(process.stdin);
  const pre = (process.stdin.prependListener || on).bind(process.stdin);
  const once = (process.stdin.once || on).bind(process.stdin);
  process.stdin.on = __hook(on);
  process.stdin.addListener = __hook(add);
  process.stdin.prependListener = __hook(pre);
  process.stdin.once = __hook(once);
}
try {
  const readline = require('readline');
  if (readline && readline.Interface && readline.Interface.prototype) {
    const origQuestion = readline.Interface.prototype.question;
    readline.Interface.prototype.question = function (query, cb) {
      __seec0deSignal();
      return origQuestion.call(this, query, cb);
    };
  }
} catch (e) { /* readline unavailable — fine */ }
`;
      await fs.writeFile(file, preamble + '\n' + source, 'utf8');
      const tool = await firstAvailable(['tsx', 'ts-node']);
      if (!tool) throw new Error('tsx / ts-node not found on PATH. Install with `npm i -g tsx` to run TypeScript here.');
      return { cmd: tool, args: [file], command: `${tool} ${path.basename(file)}`, tool };
    }
    case 'react': {
      const outFile = path.join(dir, (filename || 'main.jsx').replace(/\.jsx?$/, '.js'));
      let compiled;
      try {
        compiled = transform(source, { transforms: ['jsx'] }).code;
      } catch (err) {
        throw new Error(`JSX compile error: ${err.message}`);
      }
      const preamble = `
const { JSDOM } = require(${resolveDep('jsdom')});
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.getComputedStyle = dom.window.getComputedStyle;
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = require(${resolveDep('react')});
global.React = React;
const { render, screen, fireEvent, within, waitFor } = require(${resolveDep('@testing-library/react')});
global.render = render;
global.screen = screen;
global.fireEvent = fireEvent;
global.within = within;
global.waitFor = waitFor;
`;
      await fs.writeFile(outFile, preamble + '\n' + compiled, 'utf8');
      const node = await firstAvailable(['node']);
      if (!node) throw new Error('Node.js not found on PATH. Install from https://nodejs.org and reopen seec0de.');
      return { cmd: node, args: [outFile], command: `node ${path.basename(outFile)}`, tool: 'node (react)' };
    }
    case 'python': {
      const file = path.join(dir, filename || 'main.py');
      await fs.writeFile(file, source, 'utf8');
      // Instrumentation wrapper: emits STDIN_WANTED_MARKER on stderr the
      // instant builtins.input() blocks, then delegates to the learner's
      // file. The marker is stripped before the learner ever sees it.
      const wrapper = path.join(dir, 'seec0de_run.py');
      await fs.writeFile(wrapper, `
import builtins, sys, runpy

_real_input = builtins.input
def _seec0de_input(prompt=""):
    sys.stderr.write(${JSON.stringify(STDIN_WANTED_MARKER + '\n')})
    sys.stderr.flush()
    try:
        return _real_input(prompt)
    except EOFError:
        return ""
builtins.input = _seec0de_input
runpy.run_path(${JSON.stringify(path.basename(file))}, run_name="__main__")
`, 'utf8');
      const tool = await firstAvailable(IS_WINDOWS ? ['py', 'python', 'python3'] : ['python3', 'python']);
      if (!tool) throw new Error('Python not found on PATH. Install from https://www.python.org and reopen seec0de.');
      return { cmd: tool, args: ['-u', 'seec0de_run.py'], command: `${tool} ${path.basename(file)}`, tool };
    }
    case 'c':
    case 'cpp': {
      const isCpp = language.toLowerCase() === 'cpp';
      const ext = isCpp ? '.cpp' : '.c';
      const file = path.join(dir, filename || `main${ext}`);
      const exe = path.join(dir, IS_WINDOWS ? 'main.exe' : 'main.out');
      await fs.writeFile(file, source, 'utf8');
      const candidates = isCpp ? ['g++', 'clang++', 'cl'] : ['gcc', 'clang', 'cl'];
      const tool = await firstAvailable(candidates);
      if (!tool) {
        throw new Error(isCpp
          ? 'A C++ compiler (g++, clang++, or cl) not found on PATH.'
          : 'A C compiler (gcc, clang, or cl) not found on PATH.');
      }
      let compileArgs;
      if (tool === 'cl') {
        compileArgs = ['/nologo', `/Fe:${exe}`, `/Fo:${path.join(dir, 'main.obj')}`, file];
      } else {
        compileArgs = [file, '-o', exe];
        if (isCpp) compileArgs.push('-std=c++17');
      }
      const compiled = await execProcess({ cmd: tool, args: compileArgs, cwd: dir, timeout: COMPILE_TIMEOUT_MS });
      if (compiled.exitCode !== 0) throw new CompilationError(compiled);
      return {
        cmd: exe, args: [],
        command: `${tool} ${path.basename(file)} && ./${path.basename(exe)}`,
        tool,
      };
    }
    default:
      throw new Error(`Language "${language}" isn't runnable yet. Supported: JavaScript, TypeScript, Python, C, C++.`);
  }
}

async function startInteractiveRun(payload, sender) {
  const { language, source, filename } = payload || {};
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('No source code to run.');
  }
  if (activeRuns.size >= MAX_ACTIVE_RUNS) {
    throw new Error(`Too many runs at once (max ${MAX_ACTIVE_RUNS}). Wait for one to finish.`);
  }

  const id = crypto.randomUUID();
  const dir = uniqueDir();
  await fs.mkdir(dir, { recursive: true });
  let spec;
  try {
    spec = await prepareInteractiveProcess((language || '').toLowerCase(), dir, source, filename);
  } catch (err) {
    await rmDir(dir);
    throw err;
  }
  // Keep the dir alive until the process closes, then clean it up.
  activeRuns.set(id, { pendingDir: dir });
  execProcessLive({ ...spec, cwd: dir, timeout: INTERACTIVE_TIMEOUT_MS, sender, id }).then(() => rmDir(dir));
  return { id };
}

// ---------------------------------------------------------------------------
// Toolchain detection — used by Settings → Toolchains so the user can see
// which language compilers/interpreters are actually on PATH and get a
// one-click install command for the missing ones.

// Order matters: the first found tool is reported. Keep these in sync with
// the runners above so the "installed?" view matches what Run will actually
// pick when the user hits the Run button.
const LANGUAGE_TOOLS = {
  python:     IS_WINDOWS ? ['py', 'python', 'python3'] : ['python3', 'python'],
  javascript: ['node'],
  typescript: ['tsx', 'ts-node'],
  c:          ['gcc', 'clang', 'cl'],
  cpp:        ['g++', 'clang++', 'cl'],
};

async function probeVersion(tool) {
  // `cl` (MSVC) doesn't support --version and writes its banner to stderr.
  // We try a couple of common flags and capture whichever returns first.
  const tryFlag = (flag) => new Promise((resolve) => {
    const child = spawn(tool, [flag], { windowsHide: true });
    let out = '';
    child.stdout?.on('data', (b) => { out += b.toString('utf8'); });
    child.stderr?.on('data', (b) => { out += b.toString('utf8'); });
    child.on('close', () => resolve(out.trim().split(/\r?\n/)[0] || ''));
    child.on('error', () => resolve(''));
    setTimeout(() => { try { child.kill(); } catch { /* ignore */ } resolve(out); }, 2000);
  });

  const v1 = await tryFlag('--version');
  if (v1) return v1;
  return tryFlag('-v');
}

async function checkToolchains() {
  const out = {};
  for (const [lang, candidates] of Object.entries(LANGUAGE_TOOLS)) {
    // eslint-disable-next-line no-await-in-loop
    const tool = await firstAvailable(candidates);
    if (!tool) {
      out[lang] = { installed: false, tool: null, version: null };
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const version = await probeVersion(tool);
    out[lang] = { installed: true, tool, version: version || null };
  }
  return out;
}

function registerRunnerServiceHandlers() {
  ipcMain.handle('runner:run', async (_e, payload) => {
    try {
      const { language, source, filePath } = payload || {};
      if (!['javascript', 'typescript', 'python', 'c', 'cpp', 'react'].includes(language)) {
        throw new Error(`Unsupported runner language: ${language}`);
      }
      return await run(payload || {});
    } catch (err) {
      return mkResult({ error: err.message, stderr: `[seec0de] runner crashed: ${err.message}\n` });
    }
  });
  ipcMain.handle('runner:start', async (event, payload) => {
    try {
      return await startInteractiveRun(payload, event.sender);
    } catch (err) {
      if (err instanceof CompilationError) {
        const { result } = err;
        event.sender.send('runner:exit', {
          id: null, stdout: '', stderr: result.stderr,
          exitCode: -1, durationMs: 0,
          command: result.command || 'compile', tool: null, error: err.message,
        });
        return { id: null, error: err.message };
      }
      event.sender.send('runner:exit', {
        id: null, stdout: '', stderr: `[seec0de] ${err.message}\n`,
        exitCode: -1, durationMs: 0,
        command: `run ${(payload || {}).language}`, tool: null, error: err.message,
      });
      return { id: null, error: err.message };
    }
  });
  ipcMain.on('runner:stdin', (_e, { id, chunk }) => {
    const entry = activeRuns.get(id);
    if (!entry || !entry.child) return;
    try { entry.child.stdin.write(String(chunk ?? '')); } catch { /* ignore */ }
  });
  ipcMain.on('runner:stop', (_e, { id }) => {
    const entry = activeRuns.get(id);
    if (!entry || !entry.child) return;
    try { entry.child.kill('SIGTERM'); } catch { /* ignore */ }
  });
  ipcMain.handle('runner:check-toolchains', async () => {
    try { return await checkToolchains(); }
    catch (err) { return { error: err.message }; }
  });
}

module.exports = { registerRunnerServiceHandlers };
