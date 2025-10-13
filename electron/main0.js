"use strict";

const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
const path = require("path");
const http = require("node:http");
const https = require("node:https");

let mainWindow = null;

function log(message, type = "INFO") {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${type}] ${message}`);
}

function waitForUrl(targetUrl, timeoutMs = 30000, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(targetUrl);
      const client = u.protocol === "https:" ? https : http;
      const start = Date.now();

      const tick = () => {
        const req = client.request(
          { method: "GET", hostname: u.hostname, port: u.port, path: u.pathname || "/" },
          (res) => {
            if (res.statusCode && res.statusCode < 400) {
              res.resume();
              resolve();
            } else {
              res.resume();
              if (Date.now() - start > timeoutMs) reject(new Error(`Timeout ${targetUrl} (${res.statusCode})`));
              else setTimeout(tick, intervalMs);
            }
          }
        );
        req.on("error", () => {
          if (Date.now() - start > timeoutMs) reject(new Error(`Timeout ${targetUrl}`));
          else setTimeout(tick, intervalMs);
        });
        req.end();
      };
      tick();
    } catch (e) {
      reject(e);
    }
  });
}

function createWindow(startURL) {
  log("Création de la fenêtre Themis...");
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#ffffff",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true
    },
    icon: path.join(__dirname, "assets", "themis-icon.png")
  });

  mainWindow.loadURL(startURL).catch((error) => {
    log(`Erreur loadURL (${startURL}): ${error.message}`, "ERROR");
  });

  mainWindow.webContents.once("did-finish-load", () => {
    log("Interface chargée, affichage de la fenêtre");
    mainWindow.show();
    mainWindow.webContents.openDevTools();

  });

  mainWindow.webContents.on("did-fail-load", (e, code, desc, url) => {
    log(`did-fail-load code=${code} desc=${desc} url=${url}`, "ERROR");
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

ipcMain.handle("window-minimize", () => { if (mainWindow) { mainWindow.minimize(); return true; } return false; });
ipcMain.handle("window-maximize", () => {
  if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); return true; }
  return false;
});
ipcMain.handle("window-close", () => { if (mainWindow) { mainWindow.close(); return true; } return false; });

ipcMain.handle("get-version", () => app.getVersion());
ipcMain.handle("get-platform", () => process.platform);
const fs = require('fs').promises;


ipcMain.handle('save-extracted-text', async (event, { profil, filename, text }) => {
  const outDir = path.join(__dirname, 'documents', profil, 'extraction');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, filename);
  await fs.writeFile(outPath, text, "utf8");
  return { success: true, path: outPath };
});

ipcMain.on('window-control', (event, cmd) => {
  if (!mainWindow) return;
  switch (cmd) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
      break;
    case 'close':
      mainWindow.close();
      break;
  }
});


app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const startURL = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";
  try { await waitForUrl(startURL); } catch (e) { log(`Front pas prêt: ${e.message}`, "WARN"); }
  createWindow(startURL);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const startURL = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";
    createWindow(startURL);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.removeHandler('window-minimize');
ipcMain.handle('window-minimize', () => { if (mainWindow) mainWindow.minimize(); return true; });
ipcMain.removeHandler('window-maximize');
ipcMain.handle('window-maximize', () => { if (!mainWindow) return false; if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); return true; });
ipcMain.removeHandler('window-close');
ipcMain.handle('window-close', () => { if (mainWindow) mainWindow.close(); return true; });


