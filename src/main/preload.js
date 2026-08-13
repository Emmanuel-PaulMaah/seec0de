// Preload script — runs in an isolated world with access to a limited
// set of Node/Electron APIs, and exposes a small, explicit surface to
// the renderer via contextBridge. This is the only safe way to talk to
// the main process while keeping nodeIntegration off + contextIsolation on.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seecode', {
  fs: {
    openFolderDialog: () => ipcRenderer.invoke('fs:open-folder-dialog'),
    readDir:    (p)            => ipcRenderer.invoke('fs:read-dir', p),
    readFile:   (p)            => ipcRenderer.invoke('fs:read-file', p),
    writeFile:  (p, content)   => ipcRenderer.invoke('fs:write-file', p, content),
    createFile: (p)            => ipcRenderer.invoke('fs:create-file', p),
    createDir:  (p)            => ipcRenderer.invoke('fs:create-dir', p),
    rename:     (oldP, newP)   => ipcRenderer.invoke('fs:rename', oldP, newP),
    copy:       (oldP, newP)   => ipcRenderer.invoke('fs:copy', oldP, newP),
    delete:     (p)            => ipcRenderer.invoke('fs:delete', p),
    pathExists: (p)            => ipcRenderer.invoke('fs:path-exists', p),
    setProjectRoot: (p)        => ipcRenderer.invoke('fs:set-project-root', p),
  },
  terminal: {
    home:      ()              => ipcRenderer.invoke('term:home'),
    exec:      (payload)       => ipcRenderer.invoke('term:exec', payload),
    resolveCd: (payload)       => ipcRenderer.invoke('term:resolve-cd', payload),
  },
  runner: {
    run: (payload) => ipcRenderer.invoke('runner:run', payload),
    // Interactive runner. start() spawns the process and returns { id };
    // output streams in via onOutput(), the final result arrives via
    // onExit(), and typing goes back through sendStdin(id, chunk).
    start: (payload) => ipcRenderer.invoke('runner:start', payload),
    sendStdin: (id, chunk) => ipcRenderer.send('runner:stdin', { id, chunk }),
    stop: (id) => ipcRenderer.send('runner:stop', { id }),
    onOutput: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('runner:output', listener);
      return () => ipcRenderer.removeListener('runner:output', listener);
    },
    // Fired ({ id }) the instant the running program blocks reading stdin,
    // so the UI can show its input row exactly when needed.
    onInputWanted: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('runner:input-wanted', listener);
      return () => ipcRenderer.removeListener('runner:input-wanted', listener);
    },
    onExit: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('runner:exit', listener);
      return () => ipcRenderer.removeListener('runner:exit', listener);
    },
    // Returns { python, javascript, typescript, c, cpp }, each
    // { installed: bool, tool: string|null, version: string|null }.
    checkToolchains: () => ipcRenderer.invoke('runner:check-toolchains'),
  },
  ai: {
    setKey: (key) => ipcRenderer.invoke('ai:set-key', key),
    hasKey: ()    => ipcRenderer.invoke('ai:has-key'),
    call:   (payload) => ipcRenderer.invoke('ai:call', payload),
  },
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
