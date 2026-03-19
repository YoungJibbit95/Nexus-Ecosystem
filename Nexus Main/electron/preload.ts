import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close:    () => ipcRenderer.invoke('window:close'),
  },
  fs: {
    read:  (p: string)                => ipcRenderer.invoke('fs:read', p),
    write: (p: string, c: string)     => ipcRenderer.invoke('fs:write', p, c),
  },
  notify: (title: string, body: string) => ipcRenderer.invoke('notify', title, body),
})
