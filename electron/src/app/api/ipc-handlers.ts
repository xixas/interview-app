import { ipcMain, shell, dialog, Notification, BrowserWindow, systemPreferences } from 'electron';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import * as os from 'os';

// Import database and evaluator services
import { DatabaseService } from '../services/database.service';
import { EvaluatorService } from '../services/evaluator.service';

export class IPCHandlers {
  private settings: Map<string, any> = new Map();
  private settingsPath: string;
  private databaseService: DatabaseService;
  private evaluatorService: EvaluatorService;

  constructor() {
    this.settingsPath = join(app.getPath('userData'), 'settings.json');
    this.databaseService = new DatabaseService();
    this.loadSettings();
    // Pass settings reference to evaluator service for API key access
    this.evaluatorService = new EvaluatorService('http://localhost:3001', this.settings);
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
      'evaluator-transcribe', 'evaluator-evaluate-answer', 'evaluator-batch-evaluate', 
      'evaluator-generate-summary', 'evaluator-validate-key'
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

    // Database IPC handlers
    ipcMain.handle('db-initialize', async () => {
      try {
        console.log('IPC Handler: db-initialize called');
        await this.databaseService.initialize();
        console.log('IPC Handler: Database initialized successfully');
        return { success: true, message: 'Database initialized successfully' };
      } catch (error) {
        console.error('IPC Handler: Database initialization failed:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-technologies', async () => {
      try {
        console.log('IPC Handler: db-get-technologies called');
        const technologies = await this.databaseService.getTechnologies();
        console.log('IPC Handler: Got technologies:', technologies);
        return { success: true, data: technologies };
      } catch (error) {
        console.error('IPC Handler: Failed to get technologies:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-random-questions', async (_, filters) => {
      try {
        const questions = await this.databaseService.getRandomQuestions(filters);
        return { success: true, data: questions };
      } catch (error) {
        console.error('Failed to get random questions:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-questions-by-technology', async (_, technology) => {
      try {
        const questions = await this.databaseService.getQuestionsByTechnology(technology);
        return { success: true, data: questions };
      } catch (error) {
        console.error('Failed to get questions by technology:', error);
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
          const { OpenAI } = await import('openai');
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
      'db-get-questions-by-technology', 'evaluator-transcribe', 
      'evaluator-evaluate-answer', 'evaluator-batch-evaluate', 
      'evaluator-generate-summary', 'evaluator-validate-key'
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