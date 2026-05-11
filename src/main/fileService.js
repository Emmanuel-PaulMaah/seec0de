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
//   fs:rename(old, new)     → renames a file or folder
//   fs:delete(path)         → moves to OS trash (shell.trashItem) for safety
//   fs:path-exists(path)    → boolean
//
// All handlers return either the value or throw — IPC will surface that as
// a rejected promise on the renderer side, which is what we want.

const { ipcMain, dialog, shell, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// Hidden / heavy directories we never want to enumerate by default. The user
// can still drill into them by clicking, but we skip auto-traversal.
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
    return result.filePaths[0];
  });

  ipcMain.handle('fs:read-dir', async (_e, dirPath) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const items = entries.map((entry) => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDir: entry.isDirectory(),
      hidden: entry.name.startsWith('.') || NEVER_AUTO_EXPAND.has(entry.name),
    }));
    // Folders first, then files, both alphabetical.
    items.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return items;
  });

  ipcMain.handle('fs:read-file', async (_e, filePath) => {
    const content = await fs.readFile(filePath, 'utf8');
    return { path: filePath, content };
  });

  ipcMain.handle('fs:write-file', async (_e, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf8');
    return { ok: true };
  });

  ipcMain.handle('fs:create-file', async (_e, filePath) => {
    // 'wx' fails if the file already exists — protects against silent overwrite.
    const handle = await fs.open(filePath, 'wx');
    await handle.close();
    return { ok: true };
  });

  ipcMain.handle('fs:create-dir', async (_e, dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
    return { ok: true };
  });

  ipcMain.handle('fs:rename', async (_e, oldPath, newPath) => {
    await fs.rename(oldPath, newPath);
    return { ok: true };
  });

  ipcMain.handle('fs:delete', async (_e, targetPath) => {
    // shell.trashItem moves to the OS recycle bin instead of a hard delete.
    await shell.trashItem(targetPath);
    return { ok: true };
  });

  ipcMain.handle('fs:path-exists', async (_e, targetPath) => {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  });
}

module.exports = { registerFileServiceHandlers };
