import { contextBridge, ipcRenderer } from 'electron';

// Also expose the electronAPI interface for compatibility with the backup pattern
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    initialize: () => ipcRenderer.invoke('db-initialize'),
    getTechnologies: () => ipcRenderer.invoke('db-get-technologies'),
    getRandomQuestions: (filters: any) => ipcRenderer.invoke('db-get-random-questions', filters),
    getQuestionsByTechnology: (technology: string) => ipcRenderer.invoke('db-get-questions-by-technology', technology),
  },

  // AI Evaluator operations
  evaluator: {
    transcribeAudio: (audioData: string) => ipcRenderer.invoke('evaluator-transcribe', audioData),
    evaluateAnswer: (data: any) => ipcRenderer.invoke('evaluator-evaluate-answer', data),
    batchEvaluate: (evaluations: any[]) => ipcRenderer.invoke('evaluator-batch-evaluate', evaluations),
    generateSummary: (data: any) => ipcRenderer.invoke('evaluator-generate-summary', data),
    validateKey: () => ipcRenderer.invoke('evaluator-validate-key'),
  },
});

contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
  
  // Window management
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('window-set-always-on-top', flag),
  },
  
  // File system
  fileSystem: {
    saveFile: (content: string, defaultPath: string, filters: any[]) => 
      ipcRenderer.invoke('file-save', content, defaultPath, filters),
    openFile: (filters: any[]) => ipcRenderer.invoke('file-open', filters),
    exportResults: (data: any, filename: string) => 
      ipcRenderer.invoke('export-results', data, filename),
    importQuestions: () => ipcRenderer.invoke('import-questions'),
  },
  
  // System integration
  system: {
    showNotification: (title: string, body: string, options?: any) =>
      ipcRenderer.invoke('show-notification', title, body, options),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    showInFolder: (path: string) => ipcRenderer.invoke('show-in-folder', path),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  },
  
  // Application settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings-set', key, value),
    getAll: () => ipcRenderer.invoke('settings-get-all'),
    reset: () => ipcRenderer.invoke('settings-reset'),
  },
  
  // Audio/Media
  media: {
    getMediaDevices: () => ipcRenderer.invoke('get-media-devices'),
    checkPermissions: () => ipcRenderer.invoke('check-media-permissions'),
    requestPermissions: () => ipcRenderer.invoke('request-media-permissions'),
  },
  
  // Database operations
  database: {
    initialize: () => ipcRenderer.invoke('db-initialize'),
    getTechnologies: () => ipcRenderer.invoke('db-get-technologies'),
    getRandomQuestions: (filters: any) => ipcRenderer.invoke('db-get-random-questions', filters),
    getQuestionsByTechnology: (technology: string) => ipcRenderer.invoke('db-get-questions-by-technology', technology),
  },

  // AI Evaluator operations
  evaluator: {
    transcribeAudio: (audioData: string) => ipcRenderer.invoke('evaluator-transcribe', audioData),
    evaluateAnswer: (data: any) => ipcRenderer.invoke('evaluator-evaluate-answer', data),
    batchEvaluate: (evaluations: any[]) => ipcRenderer.invoke('evaluator-batch-evaluate', evaluations),
    generateSummary: (data: any) => ipcRenderer.invoke('evaluator-generate-summary', data),
    validateKey: () => ipcRenderer.invoke('evaluator-validate-key'),
  },

  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater-check'),
    downloadUpdate: () => ipcRenderer.invoke('updater-download'),
    installUpdate: () => ipcRenderer.invoke('updater-install'),
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-available', (_, info) => callback(info));
    },
    onUpdateDownloaded: (callback: () => void) => {
      ipcRenderer.on('update-downloaded', callback);
    },
  },
  
  // Event listeners for app state changes
  onAppStateChange: (callback: (state: string) => void) => {
    ipcRenderer.on('app-state-change', (_, state) => callback(state));
  },
  
  // Cleanup
  removeAllListeners: () => ipcRenderer.removeAllListeners(),
});
