"use strict";

const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require("electron");
const { spawn, exec } = require('child_process');
const path = require("path");

let mainWindow = null;

function log(message) {
  console.log(`[THEMIS] ${message}`);
}

async function startServices() {
  return new Promise((resolve) => {
    log('🚀 Démarrage services Docker...');
    exec('docker-compose down', { cwd: path.join(__dirname, '..') }, () => {  // Cwd racine projet (docker-compose.yml ?)
      const process = spawn('docker-compose', ['up', '-d'], {
        cwd: path.join(__dirname, '..'),  // Racine pour docker-compose
        stdio: 'pipe',
        shell: true
      });
      process.on('close', (code) => {
        if (code === 0) log('✅ Services Docker démarrés');
        setTimeout(resolve, 10000);
      });
    });
  });
}

function createWindow() {
  log("Création de la fenêtre Themis...");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,  // Frameless pour custom React
    titleBarStyle: "hidden",
    backgroundColor: "#191F38",  // Match layout
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),  // Fix : siblings en electron/ (main.js et preload.js)
      webSecurity: true
    },
    icon: path.join(__dirname, '..', 'assets', 'themis-icon.png'),  // Racine pour icon
    title: "Themis"
  });

  // LoadURL React dev (fallback 3001 si fail)
  mainWindow.loadURL('http://localhost:3000').catch((err) => {
    log(`Erreur load 3000: ${err.message}, fallback 3001`);
    mainWindow.loadURL('http://localhost:3001');
  });

  mainWindow.once('ready-to-show', () => {
    log("Fenêtre prête, affichage");
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    log(`did-fail-load: code=${code}, desc=${desc}, url=${url}`);
    mainWindow.show();  // Montre même si fail
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Events pour toggle icon layout (max/restore)
  mainWindow.on('maximize', () => {
    log('Maximize → send event renderer');
    mainWindow.webContents.send('window-maximized');
  });
  mainWindow.on('unmaximize', () => {
    log('Unmaximize → send event renderer');
    mainWindow.webContents.send('window-unmaximized');
  });

  // External links (shell si pas local)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC Handlers boutons (retourne boolean pour Promise types layout.d.ts)
ipcMain.handle('minimize-window', () => {
  log('IPC minimize');
  if (mainWindow) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('maximize-window', () => {
  log('IPC maximize');
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return true;
  }
  return false;
});

ipcMain.handle('close-window', () => {
  log('IPC close');
  if (mainWindow) {
    mainWindow.close();
    return true;
  }
  return false;
});

// Bonus (pour types)
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
  return result.canceled ? null : result.filePaths[0];
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await startServices();  // Docker
  setTimeout(createWindow, 5000);  // Wait services
  log('🏛️ THEMIS démarré (electron/main.js)');
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  exec('docker-compose down', { cwd: path.join(__dirname, '..') });  // Stop Docker racine
  if (process.platform !== 'darwin') app.quit();
});





