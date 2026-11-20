const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gml', {
  getLibrary: () => ipcRenderer.invoke('library:get'),
  addGame: () => ipcRenderer.invoke('game:add'),
  playGame: (id) => ipcRenderer.invoke('game:play', id),
  toggleFavorite: (id) => ipcRenderer.invoke('game:toggle-favorite', id),
  removeGame: (id) => ipcRenderer.invoke('game:remove', id),
  getWineVersion: () => ipcRenderer.invoke('system:wine-version'),
  getLibraryPath: () => ipcRenderer.invoke('system:library-path'),
  openPath: (target) => ipcRenderer.invoke('system:open-path', target),
  onLaunchError: (callback) => ipcRenderer.on('game:launch-error', (_event, message) => callback(message))
});
