export const environment = {
  production: true,
  apiUrl: '/api',
  evaluatorUrl: '/evaluator',
  appName: 'Mock Interview Assistant',
  version: '2.0.0',
  features: {
    audioRecording: true,
    aiAnalysis: true,
    darkMode: true,
    electronIntegration: true
  },
  limits: {
    maxQuestions: 50,
    maxSessionTime: 7200, // 2 hours in seconds
    maxFileSize: 10485760 // 10MB in bytes
  }
};