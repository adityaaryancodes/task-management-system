const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agent', {
  login: (payload) => ipcRenderer.invoke('agent:login', payload),
  logout: () => ipcRenderer.invoke('agent:logout'),
  getStatus: () => ipcRenderer.invoke('agent:status'),
  startTracking: () => ipcRenderer.invoke('agent:start'),
  stopTracking: () => ipcRenderer.invoke('agent:stop'),
  getTasks: () => ipcRenderer.invoke('agent:getTasks'),
  updateTask: (taskId, status) => ipcRenderer.invoke('agent:updateTask', { taskId, status }),
  onStatus: (cb) => ipcRenderer.on('agent:status-update', (_, state) => cb(state))
});
