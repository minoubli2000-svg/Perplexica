const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');

let mainWindow = null;

function log(message) {
  console.log([THEMIS] );
}

async function startServices() {
  return new Promise((resolve) => {
    log('🚀 Démarrage services Docker...');
    exec('docker-compose down', { cwd: __dirname }, () => {
      const process = spawn('docker-compose', ['up', '-d'], {
        cwd: __dirname,
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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    backgroundColor: '#0f0f10',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron', 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:3000').catch(() => {
    mainWindow.loadURL('http://localhost:3001');
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
}

// IPC Handlers
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('close-window', () => mainWindow?.close());

ipcMain.handle('minimize-window', () => mainWindow.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) { mainWindow.unmaximize() } else { mainWindow.maximize() }
});
ipcMain.handle('close-window', () => mainWindow.close());
app.whenReady()"@ | Set-Content main.js

# 2. Preload.js : expose correctement
(Get-Content electron\preload.js) -replace 'contextBridge.exposeInMainWorld\(.*\{', @"
contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow:    () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow:    () => ipcRenderer.invoke('maximize-window'),
  closeWindow:       () => ipcRenderer.invoke('close-window'),
}  .then(async () => {
  Menu.setApplicationMenu(null);
  await startServices();
  setTimeout(createWindow, 5000);
});

app.on('window-all-closed', () => {
  exec('docker-compose down', { cwd: __dirname });
  app.quit();
});

log('🏛️ THEMIS - Assistant IA Documentaire');
