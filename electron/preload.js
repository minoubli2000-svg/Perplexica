const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onWindowMaximized: (cb) => ipcRenderer.on('window-maximized', cb),
  onWindowUnmaximized: (cb) => ipcRenderer.on('window-unmaximized', cb),
  selectFile: () => ipcRenderer.invoke('select-file'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform')
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload (electron/preload.js) chargé : API exposée');
});

