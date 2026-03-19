const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
    },
    fs: {
        read: (p) => ipcRenderer.invoke('fs:read', p),
        write: (p, c) => ipcRenderer.invoke('fs:write', p, c),
    },
    notify: (title, body) => ipcRenderer.invoke('notify', title, body),
});
