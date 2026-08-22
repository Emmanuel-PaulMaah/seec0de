// Minimal preload for the detached preview BrowserWindow.
// Exposes a single method so the preview toolbar can open external links
// in the system browser without needing full Node access.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('previewApi', {
  openExternal: (url) => ipcRenderer.invoke('preview:open-external', url),
});
