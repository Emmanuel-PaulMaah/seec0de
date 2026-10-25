const { app, BrowserWindow, ipcMain, webFrame, shell } = require('electron');
const path = require('path');
const https = require('https');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const { registerFileServiceHandlers } = require('./fileService');
const { registerTerminalServiceHandlers } = require('./terminalService');
const { registerRunnerServiceHandlers } = require('./runnerService');
const fileServer = require('./fileServer');

// Optional AI handlers. App should not crash if this file does not exist yet.
let registerAiServiceHandlers = null;

try {
  ({ registerAiServiceHandlers } = require('./aiService'));
} catch (err) {
  log.warn('AI service handlers not loaded:', err.message);
}

// Suppress harmless but noisy Chromium GPU shader disk-cache errors on
// Windows ("Access is denied. (0x5) / Unable to move the cache"). These
// come from Chromium trying to relocate the GPUCache folder inside
// %AppData%\seec0de\ and have no effect on app or AI features.
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

const updateState = {
  appVersion: app.getVersion(),
  status: 'idle',
  info: null,
  lastChecked: null,
  error: null,
  releaseNotes: null,
  progress: null,
};

function broadcastStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('update:status', updateState);
}

function setStatus(patch) {
  Object.assign(updateState, patch);
  broadcastStatus();
}

// ---- In-app browser window for external links -----------------------------
// Bulletin articles, "Get a free key", and toolchain download links open in a
// reusable seec0de window (stock Chromium, no Node, no address bar) instead of
// handing the URL to the system browser. The default session is shared, so
// logins (e.g. Google AI Studio) survive app restarts.
let browserWindow = null;

// Google sign-in refuses Electron's default user agent, so the in-app browser
// identifies as plain Chrome for the current platform.
const BROWSER_UA = process.platform === 'darwin'
  ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  : process.platform === 'linux'
    ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function openInBrowserWindow(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return { ok: false };

  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.loadURL(url);
    if (browserWindow.isMinimized()) browserWindow.restore();
    browserWindow.focus();
    return { ok: true, reused: true, url };
  }

  browserWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 420,
    minHeight: 320,
    title: 'seec0de Preview',
    backgroundColor: '#1a1d23',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  browserWindow.webContents.setUserAgent(BROWSER_UA);

  // Links with target="_blank" inside the page load here too — one window,
  // no popups. Non-http targets are refused.
  browserWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    openInBrowserWindow(target);
    return { action: 'deny' };
  });
  browserWindow.webContents.on('will-navigate', (event, target) => {
    if (!/^https?:\/\//i.test(target)) event.preventDefault();
  });
  // Keep a stable, trustworthy title rather than whatever the page sets.
  browserWindow.webContents.on('page-title-updated', (event) => event.preventDefault());

  browserWindow.loadURL(url);
  browserWindow.on('closed', () => { browserWindow = null; });

  return { ok: true, url };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'Seec0de',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Any target="_blank" link in the renderer (bulletin articles, "Get a free
  // AI key", toolchain downloads) opens in a seec0de browser window, never in
  // the user's external browser and never as an address-bar-less app popup.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openInBrowserWindow(url);
    return { action: 'deny' };
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:9000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', broadcastStatus);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function fetchReleaseNotes(version) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/Emmanuel-PaulMaah/seec0de/releases/tags/v${version}`,
        method: 'GET',
        headers: {
          'User-Agent': 'seec0de-app',
          Accept: 'application/vnd.github+json',
        },
      },
      (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            log.warn(`Release notes fetch returned ${res.statusCode} for v${version}`);
            resolve(null);
            return;
          }

          try {
            const json = JSON.parse(body);
            resolve(json.body || null);
          } catch (err) {
            log.warn('Failed to parse release notes JSON:', err.message);
            resolve(null);
          }
        });
      }
    );

    req.on('error', (err) => {
      log.warn('Release notes fetch error:', err.message);
      resolve(null);
    });

    req.end();
  });
}

function setupAutoUpdates() {
  if (!app.isPackaged) {
    setStatus({ status: 'disabled-in-dev' });
    return;
  }

  autoUpdater.on('checking-for-update', () => {
    setStatus({
      status: 'checking',
      lastChecked: new Date().toISOString(),
      error: null,
    });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    setStatus({ status: 'available', info, error: null });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available.');
    setStatus({ status: 'not-available', info, error: null });
  });

  autoUpdater.on('download-progress', (progress) => {
    setStatus({ status: 'downloading', progress });
  });

  autoUpdater.on('error', (err) => {
    const message = err?.stack || err?.message || String(err);
    log.error('Auto-update error:', message);
    setStatus({ status: 'error', error: message });
  });

  autoUpdater.on('update-downloaded', async (info) => {
    log.info('Update downloaded:', info.version);

    const releaseNotes = await fetchReleaseNotes(info.version);

    setStatus({
      status: 'downloaded',
      info,
      releaseNotes,
      progress: null,
    });
  });

  autoUpdater.checkForUpdates().catch((err) => {
    log.error('Initial update check failed:', err);
  });
}

ipcMain.handle('update:get-status', () => updateState);

ipcMain.handle('update:check-now', async () => {
  if (!app.isPackaged) {
    setStatus({ status: 'disabled-in-dev' });
    return updateState;
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    setStatus({
      status: 'error',
      error: err?.message || String(err),
    });
  }

  return updateState;
});

ipcMain.handle('update:install-now', () => {
  if (updateState.status !== 'downloaded') return false;

  setImmediate(() => {
    autoUpdater.quitAndInstall();
  });

  return true;
});

// ---- zoom handlers --------------------------------------------------
ipcMain.on('zoom:in', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const current = mainWindow.webContents.getZoomFactor();
    mainWindow.webContents.setZoomFactor(Math.min(current + 0.1, 3.0));
  }
});

ipcMain.on('zoom:out', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const current = mainWindow.webContents.getZoomFactor();
    mainWindow.webContents.setZoomFactor(Math.max(current - 0.1, 0.3));
  }
});

ipcMain.on('zoom:reset', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.setZoomFactor(1.0);
  }
});

app.whenReady().then(() => {
  registerFileServiceHandlers();
  registerTerminalServiceHandlers();
  registerRunnerServiceHandlers();
  registerPreviewHandlers();

  if (typeof registerAiServiceHandlers === 'function') {
    registerAiServiceHandlers();
  }

  const { registerBillingServiceHandlers } = require('./billingService');
  registerBillingServiceHandlers({
    openCheckout: openInBrowserWindow,
    openPortal: openInBrowserWindow,
  });

  createWindow();
  setupAutoUpdates();
});

app.on('window-all-closed', () => {
  fileServer.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---- Preview server + detached browser window ----------------------------
let detachedPreview = null;

function registerPreviewHandlers() {
  ipcMain.handle('preview:start-server', async (_e, rootPath) => {
    try {
      return await fileServer.start(rootPath);
    } catch (err) {
      return { error: err.message || String(err) };
    }
  });

  ipcMain.handle('preview:stop-server', () => {
    fileServer.stop();
    return true;
  });

  ipcMain.handle('preview:get-status', () => {
    return fileServer.getStatus();
  });

  ipcMain.handle('preview:open-external', (_e, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
    }
  });

  ipcMain.handle('preview:open-detached', (_e, { url } = {}) => {
    // Close existing detached preview if any.
    if (detachedPreview && !detachedPreview.isDestroyed()) {
      detachedPreview.focus();
      return { ok: true, focused: true };
    }

    const previewUrl = url || fileServer.getStatus().url || 'about:blank';

    detachedPreview = new BrowserWindow({
      width: 1024,
      height: 700,
      minWidth: 400,
      minHeight: 300,
      title: 'seec0de Preview',
      backgroundColor: '#1a1d23',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, 'previewPreload.js'),
      },
    });

    // Load the viewport-toolbar template, passing the project URL as a query param.
    const templatePath = path.join(__dirname, 'previewWindow.html');
    const templateUrl = `file://${templatePath}?url=${encodeURIComponent(previewUrl)}`;
    detachedPreview.loadURL(templateUrl);

    // Clean up reference when closed.
    detachedPreview.on('closed', () => { detachedPreview = null; });

    return { ok: true, url: previewUrl };
  });
}
