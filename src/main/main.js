const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Pipe electron-updater logs to a file you can inspect on the user's machine
// (Windows: %USERPROFILE%\AppData\Roaming\seec0de\logs\main.log)
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

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
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:9000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

function setupAutoUpdates() {
  if (!app.isPackaged) return; // never run the updater in dev

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available.');
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-update error:', err == null ? 'unknown' : (err.stack || err).toString());
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'seec0de update ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'Restart seec0de to apply the update.',
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => log.error(err));
}

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
