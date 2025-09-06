import { ipcMain, shell, dialog, Notification, BrowserWindow, systemPreferences } from 'electron';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import * as os from 'os';
import { OpenAI } from 'openai';
// Import database and evaluator services
import { DatabaseService } from '../services/database.service';
import { EvaluatorService } from '../services/evaluator.service';
import { InterviewSessionService } from '../services/interview-session.service';
import { PortManager } from '../services/port-manager.service';
import { databaseQueue } from '../database/database-queue';

export class IPCHandlers {
  private settings: Map<string, any> = new Map();
  private settingsPath: string;
  private databaseService: DatabaseService;
  private evaluatorService: EvaluatorService;
  private interviewSessionService: InterviewSessionService;
  private portManager: PortManager;

  constructor() {
    this.settingsPath = join(app.getPath('userData'), 'settings.json');
    this.databaseService = new DatabaseService();
    this.loadSettings();
    // Pass settings reference to evaluator service for API key access
    this.evaluatorService = new EvaluatorService('http://localhost:3001', this.settings);
    // Initialize interview session service with API base URL
    this.interviewSessionService = new InterviewSessionService(this.settings.get('apiUrl') || 'http://localhost:3000');
    this.portManager = PortManager.getInstance();
    this.registerHandlers();
  }

  private async loadSettings() {
    try {
      const settingsData = await readFile(this.settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      // Update existing Map instead of replacing it to maintain the reference
      this.settings.clear();
      Object.entries(settings).forEach(([key, value]) => {
        this.settings.set(key, value);
      });
    } catch (error) {
      // Settings file doesn't exist or is invalid, start with defaults
      this.settings.clear();
      this.settings.set('theme', 'system');
      this.settings.set('notifications', true);
      this.settings.set('autoStart', false);
      this.settings.set('alwaysOnTop', false);
      this.settings.set('apiUrl', 'http://localhost:3000');
      this.settings.set('evaluatorUrl', 'http://localhost:3001');
    }
  }

  private async saveSettings() {
    try {
      const settingsObject = Object.fromEntries(this.settings);
      await writeFile(this.settingsPath, JSON.stringify(settingsObject, null, 2));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  private registerHandlers() {
    // Remove existing handlers for specific channels to avoid conflicts
    const channels = [
      'get-app-version', 'window-minimize', 'window-maximize', 'window-close', 
      'window-is-maximized', 'window-set-always-on-top', 'file-save', 'file-open',
      'export-results', 'import-questions', 'show-notification', 'open-external',
      'show-in-folder', 'get-system-info', 'settings-get', 'settings-set',
      'settings-get-all', 'settings-reset', 'get-media-devices', 
      'check-media-permissions', 'request-media-permissions', 'updater-check',
      'updater-download', 'updater-install',
      // Database IPC channels
      'db-initialize', 'db-get-technologies', 'db-get-random-questions', 
      'db-get-questions-by-technology',
      // Evaluator IPC channels
      'evaluator-transcribe', 'evaluator-evaluate-answer', 'evaluator-evaluate-audio-answer',
      'evaluator-batch-evaluate', 'evaluator-generate-summary', 'evaluator-validate-key',
      // Interview Session IPC channels
      'interview-session-create', 'interview-session-get', 'interview-session-update-progress',
      'interview-session-complete', 'interview-session-create-response', 'interview-session-update-evaluation',
      'interview-session-get-history', 'interview-session-get-details', 'interview-session-delete',
      'interview-session-get-statistics', 'interview-session-export', 'interview-session-import',
      'interview-session-clear-all'
    ];
    
    channels.forEach(channel => {
      ipcMain.removeHandler(channel);
    });
    
    // App version
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // Window management
    ipcMain.handle('window-minimize', () => {
      const window = BrowserWindow.getFocusedWindow();
      window?.minimize();
    });

    ipcMain.handle('window-maximize', () => {
      const window = BrowserWindow.getFocusedWindow();
      if (window?.isMaximized()) {
        window.unmaximize();
      } else {
        window?.maximize();
      }
    });

    ipcMain.handle('window-close', () => {
      const window = BrowserWindow.getFocusedWindow();
      window?.close();
    });

    ipcMain.handle('window-is-maximized', () => {
      const window = BrowserWindow.getFocusedWindow();
      return window?.isMaximized() || false;
    });

    ipcMain.handle('window-set-always-on-top', (_, flag: boolean) => {
      const window = BrowserWindow.getFocusedWindow();
      window?.setAlwaysOnTop(flag);
      this.settings.set('alwaysOnTop', flag);
      this.saveSettings();
    });

    // File system operations
    ipcMain.handle('file-save', async (_, content: string, defaultPath: string, filters: any[]) => {
      const window = BrowserWindow.getFocusedWindow();
      const result = await dialog.showSaveDialog(window!, {
        defaultPath,
        filters,
      });

      if (!result.canceled && result.filePath) {
        try {
          await writeFile(result.filePath, content, 'utf8');
          return { success: true, filePath: result.filePath };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      return { success: false, canceled: true };
    });

    ipcMain.handle('file-open', async (_, filters: any[]) => {
      const window = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(window!, {
        filters,
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        try {
          const content = await readFile(result.filePaths[0], 'utf8');
          return { success: true, content, filePath: result.filePaths[0] };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      return { success: false, canceled: true };
    });

    ipcMain.handle('export-results', async (_, data: any, filename: string) => {
      const window = BrowserWindow.getFocusedWindow();
      const result = await dialog.showSaveDialog(window!, {
        defaultPath: filename,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePath) {
        try {
          let content: string;
          const ext = result.filePath.split('.').pop()?.toLowerCase();
          
          if (ext === 'csv') {
            // Convert to CSV format
            content = this.convertToCSV(data);
          } else {
            // Default to JSON
            content = JSON.stringify(data, null, 2);
          }

          await writeFile(result.filePath, content, 'utf8');
          return { success: true, filePath: result.filePath };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      return { success: false, canceled: true };
    });

    ipcMain.handle('import-questions', async () => {
      const window = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(window!, {
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        try {
          const content = await readFile(result.filePaths[0], 'utf8');
          const questions = JSON.parse(content);
          return { success: true, questions, filePath: result.filePaths[0] };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      return { success: false, canceled: true };
    });

    // System integration
    ipcMain.handle('show-notification', (_, title: string, body: string, options: any = {}) => {
      if (this.settings.get('notifications')) {
        const notification = new Notification({
          title,
          body,
          ...options,
        });
        notification.show();
        return true;
      }
      return false;
    });

    ipcMain.handle('open-external', async (_, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('show-in-folder', async (_, path: string) => {
      try {
        shell.showItemInFolder(path);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-system-info', () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        nodeVersion: process.versions.node,
        osType: os.type(),
        osRelease: os.release(),
        osArch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        uptime: os.uptime(),
      };
    });

    // Settings management
    ipcMain.handle('settings-get', (_, key: string) => {
      return this.settings.get(key);
    });

    ipcMain.handle('settings-set', async (_, key: string, value: any) => {
      this.settings.set(key, value);
      await this.saveSettings();
      return true;
    });

    ipcMain.handle('settings-get-all', () => {
      return Object.fromEntries(this.settings);
    });

    ipcMain.handle('settings-reset', async () => {
      this.settings.clear();
      await this.loadSettings(); // Reload defaults
      return true;
    });

    // Media permissions and devices
    ipcMain.handle('get-media-devices', async () => {
      try {
        // This would need to be implemented with additional libraries
        // For now, return basic info
        return {
          audioInputs: [],
          videoInputs: [],
          audioOutputs: [],
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    ipcMain.handle('check-media-permissions', async () => {
      try {
        if (process.platform === 'darwin') {
          const micStatus = await systemPreferences.getMediaAccessStatus('microphone');
          const cameraStatus = await systemPreferences.getMediaAccessStatus('camera');
          return {
            microphone: micStatus,
            camera: cameraStatus,
          };
        }
        return { microphone: 'granted', camera: 'granted' };
      } catch (error) {
        return { error: error.message };
      }
    });

    ipcMain.handle('request-media-permissions', async () => {
      try {
        if (process.platform === 'darwin') {
          const micPermission = await systemPreferences.askForMediaAccess('microphone');
          return { microphone: micPermission ? 'granted' : 'denied' };
        }
        return { microphone: 'granted' };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Database IPC handlers (using queue to prevent concurrent access)
    ipcMain.handle('db-initialize', async () => {
      try {
        
        const startTime = Date.now();
        const result = await databaseQueue.execute(async () => {
          await this.databaseService.initialize();
          return true;
        }, 30000); // 30 second timeout for initialization
        
        const endTime = Date.now();
        return { success: true, message: 'Database initialized successfully' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-technologies', async () => {
      try {
        console.log('IPC Handler: db-get-technologies called');
        
        const technologies = await databaseQueue.execute(async () => {
          return await this.databaseService.getTechnologies();
        }, 10000); // 10 second timeout
        
        console.log(`IPC Handler: Retrieved ${technologies.length} technologies`);
        return { success: true, data: technologies };
      } catch (error) {
        console.error('IPC Handler: Failed to get technologies:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-random-questions', async (_, filters) => {
      try {
        console.log('IPC Handler: db-get-random-questions called with filters:', filters);
        
        const questions = await databaseQueue.execute(async () => {
          return await this.databaseService.getRandomQuestions(filters);
        }, 15000); // 15 second timeout
        
        console.log(`IPC Handler: Retrieved ${questions.length} random questions`);
        return { success: true, data: questions };
      } catch (error) {
        console.error('IPC Handler: Failed to get random questions:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-questions-by-technology', async (_, technology) => {
      try {
        console.log('IPC Handler: db-get-questions-by-technology called with technology:', technology);
        
        const questions = await databaseQueue.execute(async () => {
          return await this.databaseService.getQuestionsByTechnology(technology);
        }, 15000); // 15 second timeout
        
        console.log(`IPC Handler: Retrieved ${questions.length} questions for technology: ${technology}`);
        return { success: true, data: questions };
      } catch (error) {
        console.error('IPC Handler: Failed to get questions by technology:', error);
        return { success: false, error: error.message };
      }
    });

    // Expose service configuration for HTTP API calls
    ipcMain.handle('get-service-config', async () => {
      try {
        console.log('IPC Handler: get-service-config called - providing service ports');
        const ports = this.portManager.getAllocatedPorts();
        if (!ports) {
          return { success: false, error: 'Service ports not allocated yet' };
        }
        
        return {
          success: true,
          data: {
            apiUrl: `http://localhost:${ports.api}/api`,
            evaluatorUrl: `http://localhost:${ports.evaluator}/api`,
            ports: ports
          }
        };
      } catch (error) {
        console.error('IPC Handler: Failed to get service config:', error);
        return { success: false, error: error.message };
      }
    });

    // Evaluator IPC handlers
    ipcMain.handle('evaluator-transcribe', async (_, audioData) => {
      try {
        const result = await this.evaluatorService.transcribeAudio(audioData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Audio transcription failed:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('evaluator-evaluate-answer', async (_, evaluationData) => {
      try {
        const result = await this.evaluatorService.evaluateAnswer(evaluationData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Answer evaluation failed:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('evaluator-evaluate-audio-answer', async (_, audioEvaluationData) => {
      try {
        const result = await this.evaluatorService.evaluateAudioAnswer(audioEvaluationData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Audio answer evaluation failed:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('evaluator-batch-evaluate', async (_, evaluations) => {
      try {
        const results = await this.evaluatorService.batchEvaluateAnswers(evaluations);
        return { success: true, data: results };
      } catch (error) {
        console.error('Batch evaluation failed:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('evaluator-generate-summary', async (_, summaryData) => {
      try {
        const summary = await this.evaluatorService.generateInterviewSummary(summaryData);
        return { success: true, data: summary };
      } catch (error) {
        console.error('Summary generation failed:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('evaluator-validate-key', async () => {
      try {
        // Step 1: Check if API key exists
        const apiKey = this.settings.get('openai_api_key');
        if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
          return { 
            success: true, 
            valid: false, 
            message: 'No API key configured. Please set your OpenAI API key in Settings.' 
          };
        }
        
        // Step 2: Format validation
        const trimmedKey = apiKey.trim();
        if (!trimmedKey.startsWith('sk-') || trimmedKey.length <= 20) {
          return {
            success: true,
            valid: false,
            message: 'Invalid API key format. OpenAI API keys should start with "sk-" and be longer than 20 characters.',
            keyPreview: `${trimmedKey.substring(0, Math.min(7, trimmedKey.length))}...${trimmedKey.slice(-Math.min(4, trimmedKey.length))}`
          };
        }

        // Step 3: Actual API validation with OpenAI
        try {
          const openai = new OpenAI({ apiKey: trimmedKey });
          
          // Make lightweight API call to verify key works
          await openai.models.list();
          
          return {
            success: true,
            valid: true,
            message: 'API key is valid and authenticated with OpenAI',
            keyPreview: `${trimmedKey.substring(0, 7)}...${trimmedKey.slice(-4)}`
          };
        } catch (apiError: any) {
          // Handle specific OpenAI API errors
          if (apiError?.status === 401 || apiError?.code === 'invalid_api_key') {
            return {
              success: true,
              valid: false,
              message: 'Invalid API key. The key was rejected by OpenAI. Please check your key and try again.',
              keyPreview: `${trimmedKey.substring(0, 7)}...${trimmedKey.slice(-4)}`
            };
          } else if (apiError?.status === 429) {
            return {
              success: true,
              valid: false,
              message: 'OpenAI API rate limit exceeded. Please try again in a few minutes.'
            };
          } else if (apiError?.message?.toLowerCase().includes('quota')) {
            return {
              success: true,
              valid: false,
              message: 'OpenAI API quota exceeded. Please check your account usage and billing.'
            };
          } else {
            // For other API errors, assume key might be valid but there's a service issue
            return {
              success: true,
              valid: false,
              message: `Unable to verify API key: ${apiError?.message || 'Unknown OpenAI API error'}. Please try again later.`
            };
          }
        }
      } catch (error: any) {
        console.error('API key validation failed:', error);
        return { 
          success: false, 
          error: `Failed to validate API key: ${error?.message || 'Unknown error'}` 
        };
      }
    });

    // Interview Session IPC handlers
    ipcMain.handle('interview-session-create', async (_, data) => {
      try {
        console.log('IPC Handler: interview-session-create called with data:', data);
        const session = await this.interviewSessionService.createSession(data);
        console.log('IPC Handler: Session created successfully:', session);
        return { success: true, data: session };
      } catch (error: any) {
        console.error('IPC Handler: Failed to create session:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-get', async (_, sessionId) => {
      try {
        console.log('IPC Handler: interview-session-get called with sessionId:', sessionId);
        const session = await this.interviewSessionService.getSession(sessionId);
        console.log('IPC Handler: Session retrieved:', session ? 'found' : 'not found');
        return { success: true, data: session };
      } catch (error: any) {
        console.error('IPC Handler: Failed to get session:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-update-progress', async (_, sessionId, completedQuestions) => {
      try {
        console.log('IPC Handler: interview-session-update-progress called:', { sessionId, completedQuestions });
        await this.interviewSessionService.updateSessionProgress(sessionId, completedQuestions);
        console.log('IPC Handler: Session progress updated successfully');
        return { success: true };
      } catch (error: any) {
        console.error('IPC Handler: Failed to update session progress:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-complete', async (_, sessionId, data) => {
      try {
        console.log('IPC Handler: interview-session-complete called:', { sessionId, data });
        await this.interviewSessionService.completeSession(sessionId, data);
        console.log('IPC Handler: Session completed successfully');
        return { success: true };
      } catch (error: any) {
        console.error('IPC Handler: Failed to complete session:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-create-response', async (_, data) => {
      try {
        console.log('IPC Handler: interview-session-create-response called with data:', data);
        const response = await this.interviewSessionService.createResponse(data);
        console.log('IPC Handler: Response created successfully:', response);
        return { success: true, data: response };
      } catch (error: any) {
        console.error('IPC Handler: Failed to create response:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-update-evaluation', async (_, responseId, evaluation) => {
      try {
        console.log('IPC Handler: interview-session-update-evaluation called:', { responseId, evaluation });
        await this.interviewSessionService.updateResponseEvaluation(responseId, evaluation);
        console.log('IPC Handler: Response evaluation updated successfully');
        return { success: true };
      } catch (error: any) {
        console.error('IPC Handler: Failed to update response evaluation:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-get-history', async (_, limit, offset) => {
      try {
        console.log('IPC Handler: interview-session-get-history called:', { limit, offset });
        const history = await this.interviewSessionService.getSessionHistory(limit, offset);
        console.log('IPC Handler: Session history retrieved:', history.length, 'sessions');
        return { success: true, data: history };
      } catch (error: any) {
        console.error('IPC Handler: Failed to get session history:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-get-details', async (_, sessionId) => {
      try {
        console.log('IPC Handler: interview-session-get-details called with sessionId:', sessionId);
        const details = await this.interviewSessionService.getSessionDetails(sessionId);
        console.log('IPC Handler: Session details retrieved:', details ? 'found' : 'not found');
        return { success: true, data: details };
      } catch (error: any) {
        console.error('IPC Handler: Failed to get session details:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-delete', async (_, sessionId) => {
      try {
        console.log('IPC Handler: interview-session-delete called with sessionId:', sessionId);
        await this.interviewSessionService.deleteSession(sessionId);
        console.log('IPC Handler: Session deleted successfully');
        return { success: true };
      } catch (error: any) {
        console.error('IPC Handler: Failed to delete session:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-get-statistics', async () => {
      try {
        console.log('IPC Handler: interview-session-get-statistics called');
        const statistics = await this.interviewSessionService.getStatistics();
        console.log('IPC Handler: Statistics retrieved successfully');
        return { success: true, data: statistics };
      } catch (error: any) {
        console.error('IPC Handler: Failed to get statistics:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-export', async () => {
      try {
        console.log('IPC Handler: interview-session-export called');
        const exportData = await this.interviewSessionService.exportUserData();
        console.log('IPC Handler: User data exported successfully');
        return { success: true, data: exportData };
      } catch (error: any) {
        console.error('IPC Handler: Failed to export user data:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-import', async (_, data) => {
      try {
        console.log('IPC Handler: interview-session-import called');
        const importResult = await this.interviewSessionService.importUserData(data);
        console.log('IPC Handler: User data imported successfully:', importResult);
        return { success: true, data: importResult };
      } catch (error: any) {
        console.error('IPC Handler: Failed to import user data:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('interview-session-clear-all', async () => {
      try {
        console.log('IPC Handler: interview-session-clear-all called');
        await this.interviewSessionService.clearAllData();
        console.log('IPC Handler: All user data cleared successfully');
        return { success: true };
      } catch (error: any) {
        console.error('IPC Handler: Failed to clear all user data:', error);
        return { success: false, error: error.message };
      }
    });

    // Auto-updater (placeholder - would need actual implementation)
    ipcMain.handle('updater-check', () => {
      // Placeholder for auto-updater check
      return { available: false };
    });

    ipcMain.handle('updater-download', () => {
      // Placeholder for auto-updater download
      return { success: false, message: 'Auto-updater not implemented' };
    });

    ipcMain.handle('updater-install', () => {
      // Placeholder for auto-updater install
      return { success: false, message: 'Auto-updater not implemented' };
    });
  }

  private convertToCSV(data: any): string {
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvHeaders = headers.join(',');
      const csvRows = data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return String(value || '');
        }).join(',')
      );
      return [csvHeaders, ...csvRows].join('\n');
    }
    return '';
  }

  // Cleanup method to remove all handlers
  public cleanup() {
    const channels = [
      'get-app-version', 'window-minimize', 'window-maximize', 'window-close', 
      'window-is-maximized', 'window-set-always-on-top', 'file-save', 'file-open',
      'export-results', 'import-questions', 'show-notification', 'open-external',
      'show-in-folder', 'get-system-info', 'settings-get', 'settings-set',
      'settings-get-all', 'settings-reset', 'get-media-devices', 
      'check-media-permissions', 'request-media-permissions', 'updater-check',
      'updater-download', 'updater-install',
      // Database and evaluator channels
      'db-initialize', 'db-get-technologies', 'db-get-random-questions', 
      'db-get-questions-by-technology', 'get-service-config', 'evaluator-transcribe', 
      'evaluator-evaluate-answer', 'evaluator-evaluate-audio-answer',
      'evaluator-batch-evaluate', 'evaluator-generate-summary', 'evaluator-validate-key',
      // Interview Session IPC channels
      'interview-session-create', 'interview-session-get', 'interview-session-update-progress',
      'interview-session-complete', 'interview-session-create-response', 'interview-session-update-evaluation',
      'interview-session-get-history', 'interview-session-get-details', 'interview-session-delete',
      'interview-session-get-statistics', 'interview-session-export', 'interview-session-import',
      'interview-session-clear-all'
    ];
    
    channels.forEach(channel => {
      ipcMain.removeHandler(channel);
    });

    // Close database connection on cleanup
    if (this.databaseService) {
      this.databaseService.close().catch(console.error);
    }
  }

  // Broadcast app state changes to renderer
  public broadcastAppState(state: string) {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('app-state-change', state);
    });
  }
}