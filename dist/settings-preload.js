const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onInitApp: (callback) => ipcRenderer.on('initApp', callback),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openScreenSaverFile: () => ipcRenderer.invoke('dialog:openScreenSaverFile'),
  openPowershellFile: () => ipcRenderer.invoke('dialog:openPowershellFile'),
  quitSettings: (arg) => ipcRenderer.invoke('quit-settings', arg),
  applyProperties: (arg) => ipcRenderer.invoke('applyProperties', arg),
  getMsg: (arg) => ipcRenderer.invoke('get-msg', arg),
  testVoice: (arg) => ipcRenderer.invoke('testVoice', arg),
  getVoices: (arg) => ipcRenderer.invoke('getVoices', arg),
  errorVoices: (arg) => ipcRenderer.invoke('errorVoices', arg),
  setRemoteVoices: (arg) => ipcRenderer.on('setRemoteVoices', arg),
  setLocalVoices: (arg) => ipcRenderer.on('setLocalVoices', arg)
})