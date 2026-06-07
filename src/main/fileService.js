// File-system IPC handlers — exposed to the renderer through preload.js
// as `window.seecode.fs`. Kept deliberately small: just the operations a
// VS-Code-style left sidebar + a Monaco editor need.
//
// Channels:
//   fs:open-folder-dialog   → show native folder picker, return chosen path or null
//   fs:read-dir(path)       → [{ name, path, isDir }]   (sorted: dirs first, then files)
//   fs:read-file(path)      → { path, content }         (utf8)
//   fs:write-file(path,str) → { ok: true }
//   fs:create-file(path)    → creates empty file
//   fs:create-dir(path)     → creates directory (recursive)
//   fs:rename(old, new)     → renames/moves a file or folder
//   fs:copy(old, new)       → copies a file or folder
//   fs:delete(path)         → moves to OS trash (shell.trashItem) for safety
//   fs:path-exists(path)    → boolean
//
// All handlers return either the value or throw — IPC will surface that as
// a rejected promise on the renderer side, which is what we want.

const { ipcMain, dialog, shell, BrowserWindow, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Current project root, updated when the user picks a folder.
let currentProjectRoot = null;

/**
 * Ensures a path is safe to access: either inside the current project root
 * or inside the OS temp directory (for the runner service).
 *
 * When no project root has been established yet (boot before the renderer
 * has had a chance to call setProjectRoot, or no folder open at all), we
 * fall through permissively — this is a single-user desktop app where the
 * renderer is trusted code shipped by us. The restriction exists to catch
 * obvious bugs (e.g. an IPC fuzzed with a `..` path), not as a sandbox.
 */
function validatePath(target) {
  if (!currentProjectRoot) return;
  const resolved = path.resolve(target);
  const isTemp = resolved.startsWith(path.resolve(os.tmpdir()));
  const isProject = resolved.startsWith(path.resolve(currentProjectRoot));
  if (!isTemp && !isProject) {
    throw new Error(`Access denied: ${resolved} is outside the open project.`);
  }
}

// Hidden / heavy directories we never want to enumerate by default.
const NEVER_AUTO_EXPAND = new Set([
  'node_modules', '.git', 'dist', 'build', 'release', '.next', '.cache',
  '.idea', '.vscode',
]);

function getFocusedWindow() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
}

function registerFileServiceHandlers() {
  ipcMain.handle('fs:open-folder-dialog', async () => {
    const win = getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Open folder',
    });
    if (result.canceled || !result.filePaths.length) return null;
    currentProjectRoot = result.filePaths[0];
    return currentProjectRoot;
  });

  ipcMain.handle('fs:read-dir', async (_e, dirPath) => {
    validatePath(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const items = entries.map((entry) => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDir: entry.isDirectory(),
      hidden: entry.name.startsWith('.') || NEVER_AUTO_EXPAND.has(entry.name),
    }));
    items.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return items;
  });

  ipcMain.handle('fs:read-file', async (_e, filePath) => {
    validatePath(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    return { path: filePath, content };
  });

  ipcMain.handle('fs:write-file', async (_e, filePath, content) => {
    validatePath(filePath);
    await fs.writeFile(filePath, content, 'utf8');
    return { ok: true };
  });

  ipcMain.handle('fs:create-file', async (_e, filePath) => {
    validatePath(filePath);
    const handle = await fs.open(filePath, 'wx');
    await handle.close();
    return { ok: true };
  });

  ipcMain.handle('fs:create-dir', async (_e, dirPath) => {
    validatePath(dirPath);
    await fs.mkdir(dirPath, { recursive: true });
    return { ok: true };
  });

  ipcMain.handle('fs:rename', async (_e, oldPath, newPath) => {
    validatePath(oldPath);
    validatePath(newPath);
    await fs.rename(oldPath, newPath);
    return { ok: true };
  });

  ipcMain.handle('fs:copy', async (_e, oldPath, newPath) => {
    validatePath(oldPath);
    validatePath(newPath);
    await fs.cp(oldPath, newPath, { recursive: true, errorOnExist: true });
    return { ok: true };
});

  ipcMain.handle('fs:delete', async (_e, targetPath) => {
    validatePath(targetPath);
    await shell.trashItem(targetPath);
    return { ok: true };
  });

  ipcMain.handle('fs:path-exists', async (_e, targetPath) => {
    try {
      validatePath(targetPath);
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  });

  // Allow the renderer to signal a project root (e.g. from localStorage on boot).
  ipcMain.handle('fs:set-project-root', (_e, rootPath) => {
    currentProjectRoot = rootPath || null;
    return { ok: true };
  });
}

module.exports = { registerFileServiceHandlers };
