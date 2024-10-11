const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onInitApp: (callback) => ipcRenderer.on('initApp', callback),
  applyWelcomeProperties: (arg) => ipcRenderer.invoke('applyWelcomeProperties', arg),
  getMsg: (arg) => ipcRenderer.invoke('get-msg', arg)
})