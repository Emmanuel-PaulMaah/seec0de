// Terminal command runner — executes a single shell command per IPC call
// and returns its stdout/stderr/exit code. Not a full PTY: each command
// runs in its own short-lived shell, and there's no persistent session
// state (no `cd` carry-over). The renderer keeps a `cwd` and passes it in
// so users can still navigate the filesystem.
//
// Channels:
//   term:exec({ command, cwd, shell? }) →
//     { stdout, stderr, exitCode, durationMs, cwd }
//   term:home() → user home dir (renderer's initial cwd)
//   term:resolve-cd({ cwd, target }) →
//     { cwd: <new resolved cwd> }   for client-side `cd` handling
//
// Why client-side cd? Because each exec spawns a fresh shell, a child-
// process `cd foo` would have no effect. We intercept `cd` in the renderer
// and ask the main process to validate the target path, then update the
// stored cwd. Same mental model the user expects.

const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES   = 1_000_000;     // 1 MB per stream

function pickShell() {
  if (process.platform === 'win32') {
    // Prefer PowerShell 7 (`pwsh`) if present, fall back to Windows PowerShell.
    return { cmd: 'powershell.exe', flag: '-NoLogo -NoProfile -Command' };
  }
  return { cmd: '/bin/sh', flag: '-c' };
}

function runCommand({ command, cwd }) {
  return new Promise((resolve) => {
    const { cmd, flag } = pickShell();
    const args = flag.split(' ').concat([command]);
    const startedAt = Date.now();

    let stdout = '';
    let stderr = '';
    let truncated = false;

    const child = spawn(cmd, args, {
      cwd: cwd || os.homedir(),
      windowsHide: true,
      env: process.env,
    });

    const onData = (buf, target) => {
      const next = target + buf.toString('utf8');
      if (next.length > MAX_OUTPUT_BYTES) {
        truncated = true;
        return next.slice(0, MAX_OUTPUT_BYTES);
      }
      return next;
    };

    child.stdout.on('data', (buf) => { stdout = onData(buf, stdout); });
    child.stderr.on('data', (buf) => { stderr = onData(buf, stderr); });

    const killTimer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      stderr += `\n[seec0de] command timed out after ${DEFAULT_TIMEOUT_MS}ms`;
    }, DEFAULT_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(killTimer);
      if (truncated) {
        stderr += `\n[seec0de] output truncated at ${MAX_OUTPUT_BYTES} bytes`;
      }
      resolve({
        stdout,
        stderr,
        exitCode: code ?? -1,
        durationMs: Date.now() - startedAt,
        cwd: cwd || os.homedir(),
      });
    });

    child.on('error', (err) => {
      clearTimeout(killTimer);
      resolve({
        stdout,
        stderr: stderr + `\n[seec0de] failed to spawn shell: ${err.message}`,
        exitCode: -1,
        durationMs: Date.now() - startedAt,
        cwd: cwd || os.homedir(),
      });
    });
  });
}

async function resolveCd({ cwd, target }) {
  const base = cwd || os.homedir();
  let next;
  if (!target || target === '~') {
    next = os.homedir();
  } else if (target.startsWith('~')) {
    next = path.join(os.homedir(), target.slice(1));
  } else if (path.isAbsolute(target)) {
    next = target;
  } else {
    next = path.resolve(base, target);
  }
  // Validate destination exists and is a directory.
  const stat = await fs.stat(next);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${next}`);
  }
  return { cwd: next };
}

function registerTerminalServiceHandlers() {
  ipcMain.handle('term:exec', async (_e, payload) => runCommand(payload || {}));
  ipcMain.handle('term:home', () => os.homedir());
  ipcMain.handle('term:resolve-cd', async (_e, payload) => resolveCd(payload || {}));
}

module.exports = { registerTerminalServiceHandlers };
