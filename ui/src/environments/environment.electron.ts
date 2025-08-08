import { AppEnvironment } from '../app/core/services/environment.service';

export const environment: AppEnvironment = {
  production: true,
  apiUrl: 'http://localhost:3000',
  evaluatorUrl: 'http://localhost:3001',
  appName: 'Interview App Desktop',
  version: '1.0.0',
  features: {
    audioRecording: true,
    aiAnalysis: true,
    darkMode: true,
    electronIntegration: true, // Enable Electron-specific features
  },
  limits: {
    maxQuestions: 50,
    maxSessionTime: 7200, // 2 hours
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  electron: {
    isDevelopment: false,
    autoStart: false,
    showDevTools: false,
  }
};