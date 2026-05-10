// Preload script — runs in an isolated world with access to a limited
// set of Node/Electron APIs, and exposes a small, explicit surface to
// the renderer via contextBridge. This is the only safe way to talk to
// the main process while keeping nodeIntegration off + contextIsolation on.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seecode', {
  updates: {
    // One-shot: fetch the current updater status.
    // Returns { appVersion, status, info, lastChecked, error, releaseNotes }.
    getStatus: () => ipcRenderer.invoke('update:get-status'),

    // Ask the main process to check GitHub right now.
    checkNow: () => ipcRenderer.invoke('update:check-now'),

    // Quit the app and install the downloaded update.
    installNow: () => ipcRenderer.invoke('update:install-now'),

    // Subscribe to lifecycle events. Callback receives the same shape as
    // getStatus(). Returns an unsubscribe function.
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    },
  },
});
