const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agent', {
  login: (payload) => ipcRenderer.invoke('agent:login', payload),
  logout: () => ipcRenderer.invoke('agent:logout'),
  getStatus: () => ipcRenderer.invoke('agent:status'),
  startTracking: () => ipcRenderer.invoke('agent:start'),
  stopTracking: () => ipcRenderer.invoke('agent:stop'),
  startBreak: () => ipcRenderer.invoke('agent:break:start'),
  endBreak: () => ipcRenderer.invoke('agent:break:end'),
  getTasks: () => ipcRenderer.invoke('agent:getTasks'),
  updateTask: (taskId, status) => ipcRenderer.invoke('agent:updateTask', { taskId, status }),
  saveProof: (payload) => ipcRenderer.invoke('agent:saveProof', payload),
  onStatus: (cb) => {
    const listener = (_, state) => cb(state);
    ipcRenderer.on('agent:status-update', listener);
    return () => ipcRenderer.removeListener('agent:status-update', listener);
  }
});
