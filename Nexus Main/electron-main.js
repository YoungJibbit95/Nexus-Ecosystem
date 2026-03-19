const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
let mainWindow = null;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
      webSecurity: false,
      sandbox: false,
        },
    });
    const isDev = !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    }
    else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0)
    createWindow(); });
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('fs:read', async (_, filePath) => {
    try {
        return { ok: true, data: fs.readFileSync(filePath, 'utf-8') };
    }
    catch (e) {
        return { ok: false, error: e.message };
    }
});
ipcMain.handle('fs:write', async (_, filePath, content) => {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf-8');
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e.message };
    }
});
ipcMain.handle('notify', (_, title, body) => {
    if (Notification.isSupported())
        new Notification({ title, body }).show();
});
