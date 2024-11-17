const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateLogger: (callback) => ipcRenderer.on('update-logger', callback),
  onUpdateLoggerConsole: (callback) => ipcRenderer.on('update-loggerConsole', callback),
  onInitApp: (callback) => ipcRenderer.on('initApp', callback),
  toAppReload: (callback) => ipcRenderer.on('to-appReload', callback),
  toAppExit: (callback) => ipcRenderer.on('to-appExit', callback),
  toConsole: (callback) => ipcRenderer.on('to-console', callback),
  toVisualizer: (callback) => ipcRenderer.on('to-visualizer', callback),
  propertiesChanged: (callback) => ipcRenderer.on('properties-changed', callback),
  updateBackground: (callback) => ipcRenderer.on('update-background', callback),
  isCloseApp: () => ipcRenderer.invoke('isCloseApp'),
  closeApp: (arg) => ipcRenderer.invoke('closeApp', arg),
  reloadApp: (arg) => ipcRenderer.invoke('reloadApp', arg),
  getMsg: (arg) => ipcRenderer.invoke('get-msg', arg),
  showMenu: (arg) => ipcRenderer.invoke('showMenu', arg),
  newVersion: (callback) => ipcRenderer.on('newVersion', callback),
  showRestartBox: (callback) => ipcRenderer.on('showRestartBox', callback),
  
  // Widgets
  initWidgets: (callback) => ipcRenderer.on('initWidgets', callback),
  readyToMenu: (callback) => ipcRenderer.on('readyToMenu', callback),
  newPluginWidgetInfo: (callback) => ipcRenderer.on('newPluginWidgetInfo', callback),
  createWidget: (callback) => ipcRenderer.on('createWidget', callback),
  pluginWidgetAction: (arg) => ipcRenderer.invoke('pluginWidgetAction', arg),
  refreshPluginWidgetInfo: (arg) => ipcRenderer.invoke('refreshPluginWidgetInfo', arg),
  getNewValuePluginWidgetById: (arg) => ipcRenderer.invoke('getNewValuePluginWidgetById', arg),
  getPluginWidgets: (arg) => ipcRenderer.invoke('getPluginWidgets', arg),
  readyToShow: (arg) => ipcRenderer.invoke('readyToShow', arg),
  setNewVersion: (arg) => ipcRenderer.invoke('setNewVersion', arg)
});
