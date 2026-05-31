const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const { registerFileServiceHandlers } = require('./fileService');
const { registerTerminalServiceHandlers } = require('./terminalService');
const { registerRunnerServiceHandlers } = require('./runnerService');

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

app.whenReady().then(() => {
  registerFileServiceHandlers();
  registerTerminalServiceHandlers();
  registerRunnerServiceHandlers();

  if (typeof registerAiServiceHandlers === 'function') {
    registerAiServiceHandlers();
  }

  createWindow();
  setupAutoUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
