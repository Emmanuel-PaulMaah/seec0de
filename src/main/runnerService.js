// Code runner — compiles/executes a source snippet in a sandboxed temp dir
// and returns its stdout/stderr/exit code. Supported now: javascript,
// typescript, python, c, cpp.
//
// Toolchain strategy:
//   - JavaScript : `node` (always present — bundled with Electron's runtime).
//   - TypeScript : `tsx` or `ts-node` on PATH; otherwise we tell the user
//                  one-shot how to install (`npm i -g tsx`).
//   - Python     : `python3` then `python` on PATH.
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
//   runner:run({ language, source, filename? }) →
//     { stdout, stderr, exitCode, durationMs, command, tool, error? }

const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs   = require('fs').promises;
const path = require('path');
const os   = require('os');
const crypto = require('crypto');
const { getSafeEnv } = require('./envUtils');

const COMPILE_TIMEOUT_MS = 15_000;
const RUN_TIMEOUT_MS     = 15_000;
const MAX_OUTPUT_BYTES   = 1_000_000;
const IS_WINDOWS         = process.platform === 'win32';

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

function execProcess({ cmd, args, cwd, timeout }) {
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

async function runJavaScript(dir, source, filename) {
  const file = path.join(dir, filename || 'main.js');
  await fs.writeFile(file, source, 'utf8');
  // process.execPath is Electron itself in production. Prefer system node.
  const node = await firstAvailable(['node']);
  if (!node) {
    return notInstalled('Node.js', 'Install from https://nodejs.org and reopen seec0de.');
  }
  const result = await execProcess({ cmd: node, args: [file], cwd: dir, timeout: RUN_TIMEOUT_MS });
  return { ...result, command: `node ${path.basename(file)}`, tool: 'node' };
}

async function runTypeScript(dir, source, filename) {
  const file = path.join(dir, filename || 'main.ts');
  await fs.writeFile(file, source, 'utf8');
  // `tsx` is the modern, fast choice. `ts-node` is the legacy fallback.
  const tool = await firstAvailable(['tsx', 'ts-node']);
  if (!tool) {
    return notInstalled('tsx / ts-node', 'Install with `npm i -g tsx` to run TypeScript here.');
  }
  const result = await execProcess({ cmd: tool, args: [file], cwd: dir, timeout: RUN_TIMEOUT_MS });
  return { ...result, command: `${tool} ${path.basename(file)}`, tool };
}

async function runPython(dir, source, filename) {
  const file = path.join(dir, filename || 'main.py');
  await fs.writeFile(file, source, 'utf8');
  // `py` is the Windows launcher that resolves to the latest installed Python.
  const tool = await firstAvailable(IS_WINDOWS ? ['python', 'py', 'python3'] : ['python3', 'python']);
  if (!tool) {
    return notInstalled('Python', 'Install from https://www.python.org and reopen seec0de.');
  }
  const result = await execProcess({ cmd: tool, args: [file], cwd: dir, timeout: RUN_TIMEOUT_MS });
  return { ...result, command: `${tool} ${path.basename(file)}`, tool };
}

async function runCFamily(dir, source, filename, isCpp) {
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
  const run = await execProcess({ cmd: exe, args: [], cwd: dir, timeout: RUN_TIMEOUT_MS });
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

async function run({ language, source, filename }) {
  if (typeof source !== 'string' || !source.trim()) {
    return mkResult({ error: 'No source code to run.', stderr: 'No source code to run.\n' });
  }
  const dir = uniqueDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    switch ((language || '').toLowerCase()) {
      case 'javascript': return await runJavaScript(dir, source, filename);
      case 'typescript': return await runTypeScript(dir, source, filename);
      case 'python':     return await runPython(dir, source, filename);
      case 'c':          return await runCFamily(dir, source, filename, false);
      case 'cpp':        return await runCFamily(dir, source, filename, true);
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
// Toolchain detection — used by Settings → Toolchains so the user can see
// which language compilers/interpreters are actually on PATH and get a
// one-click install command for the missing ones.

// Order matters: the first found tool is reported. Keep these in sync with
// the runners above so the "installed?" view matches what Run will actually
// pick when the user hits the Run button.
const LANGUAGE_TOOLS = {
  python:     IS_WINDOWS ? ['python', 'py', 'python3'] : ['python3', 'python'],
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
      if (!['javascript', 'typescript', 'python', 'c', 'cpp'].includes(language)) {
        throw new Error(`Unsupported runner language: ${language}`);
      }
      return await run(payload || {});
    } catch (err) {
      return mkResult({ error: err.message, stderr: `[seec0de] runner crashed: ${err.message}\n` });
    }
  });
  ipcMain.handle('runner:check-toolchains', async () => {
    try { return await checkToolchains(); }
    catch (err) { return { error: err.message }; }
  });
}

module.exports = { registerRunnerServiceHandlers };
