const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const https = require('https');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Pipe electron-updater logs to a file you can inspect on the user's machine
// (Windows: %USERPROFILE%\AppData\Roaming\seec0de\logs\main.log)
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

// ---------------------------------------------------------------------------
// Update status — single source of truth shared with the renderer over IPC.
// `status` is one of:
//   'idle' | 'checking' | 'available' | 'not-available'
//   'downloading' | 'downloaded' | 'error' | 'disabled-in-dev'
// ---------------------------------------------------------------------------
const updateState = {
  appVersion: app.getVersion(),
  status: 'idle',
  info: null,           // raw info object from electron-updater
  lastChecked: null,    // ISO string
  error: null,          // string message
  releaseNotes: null,   // markdown string fetched from GitHub release body
  progress: null,       // { percent, transferred, total, bytesPerSecond }
};

function broadcastStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', updateState);
  }
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

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:9000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Re-broadcast current status to the renderer once it's ready, so the
  // UI can render the correct state on first paint after a reload.
  mainWindow.webContents.on('did-finish-load', () => {
    broadcastStatus();
  });
}

// ---------------------------------------------------------------------------
// Release notes — fetched from the GitHub Releases API when an update is
// downloaded, so the UpdatePill can show users what's new before they
// restart. Public repo, no auth needed.
// ---------------------------------------------------------------------------
function fetchReleaseNotes(version) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/Emmanuel-PaulMaah/seec0de/releases/tags/v${version}`,
      method: 'GET',
      headers: {
        'User-Agent': 'seec0de-app',
        Accept: 'application/vnd.github+json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
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
    });

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
    const message = err == null ? 'unknown' : (err.stack || err).toString();
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

  autoUpdater.checkForUpdates().catch((err) => log.error(err));
}

// ---------------------------------------------------------------------------
// IPC — the renderer talks to the updater through these three handlers,
// exposed via the preload script as `window.seecode.updates`.
// ---------------------------------------------------------------------------
ipcMain.handle('update:get-status', () => updateState);

ipcMain.handle('update:check-now', async () => {
  if (!app.isPackaged) {
    setStatus({ status: 'disabled-in-dev' });
    return updateState;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    setStatus({ status: 'error', error: err.message });
  }
  return updateState;
});

ipcMain.handle('update:install-now', () => {
  if (updateState.status !== 'downloaded') return false;
  // setImmediate so the IPC reply can flush before the app quits.
  setImmediate(() => autoUpdater.quitAndInstall());
  return true;
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
