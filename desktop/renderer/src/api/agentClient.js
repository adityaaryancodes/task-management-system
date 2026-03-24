const agent = window.agent;

export const agentClient = {
  login(payload) {
    return agent.login(payload);
  },
  logout() {
    return agent.logout();
  },
  getStatus() {
    return agent.getStatus();
  },
  startTracking() {
    return agent.startTracking();
  },
  stopTracking() {
    return agent.stopTracking();
  },
  startBreak() {
    return agent.startBreak();
  },
  endBreak() {
    return agent.endBreak();
  },
  getTasks() {
    return agent.getTasks();
  },
  updateTask(taskId, status) {
    return agent.updateTask(taskId, status);
  },
  saveProof(payload) {
    return agent.saveProof(payload);
  },
  subscribeStatus(callback) {
    return agent.onStatus(callback);
  }
};
