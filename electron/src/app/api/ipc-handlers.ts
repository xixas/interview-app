import { ipcMain, shell, dialog, Notification, BrowserWindow, systemPreferences } from 'electron';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import * as os from 'os';

export class IPCHandlers {
  private settings: Map<string, any> = new Map();
  private settingsPath: string;

  constructor() {
    this.settingsPath = join(app.getPath('userData'), 'settings.json');
    this.loadSettings();
    this.registerHandlers();
  }

  private async loadSettings() {
    try {
      const settingsData = await readFile(this.settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      this.settings = new Map(Object.entries(settings));
    } catch (error) {
      // Settings file doesn't exist or is invalid, start with defaults
      this.settings = new Map();
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
    // Remove any existing handlers first
    ipcMain.removeAllListeners();
    
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

  // Broadcast app state changes to renderer
  public broadcastAppState(state: string) {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('app-state-change', state);
    });
  }
}