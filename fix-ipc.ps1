@"
# fix-ipc.ps1
(Get-Content main.js) -replace "const { app, BrowserWindow, Menu, shell } = require\('electron'\);", "const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');" | Set-Content main.js

Add-Content main.js -Value "
ipcMain.handle('minimize-window', () => mainWindow.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) { mainWindow.unmaximize(); } else { mainWindow.maximize(); }
});
ipcMain.handle('close-window', () => mainWindow.close());
"
