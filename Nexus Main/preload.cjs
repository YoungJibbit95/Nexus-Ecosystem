const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
    },
    fs: {
        pickDirectory: () => ipcRenderer.invoke('fs:pickDirectory'),
        read: (p) => ipcRenderer.invoke('fs:read', p),
        readDir: (p, recursive = true) => ipcRenderer.invoke('fs:readDir', p, recursive),
        write: (p, c) => ipcRenderer.invoke('fs:write', p, c),
    },
    code: {
        execute: (payload) => ipcRenderer.invoke('code:execute', payload),
    },
    notify: (title, body) => ipcRenderer.invoke('notify', title, body),
});
