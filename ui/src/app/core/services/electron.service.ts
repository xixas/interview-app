import { Injectable, NgZone } from '@angular/core';

// Type definitions for the Electron API exposed through the preload script
export interface ElectronAPI {
  getAppVersion(): Promise<string>;
  platform: string;
  
  window: {
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
    isMaximized(): Promise<boolean>;
    setAlwaysOnTop(flag: boolean): Promise<void>;
  };
  
  fileSystem: {
    saveFile(content: string, defaultPath: string, filters: FileFilter[]): Promise<FileResult>;
    openFile(filters: FileFilter[]): Promise<FileResult>;
    exportResults(data: any, filename: string): Promise<FileResult>;
    importQuestions(): Promise<ImportResult>;
  };
  
  system: {
    showNotification(title: string, body: string, options?: NotificationOptions): Promise<boolean>;
    openExternal(url: string): Promise<{ success: boolean; error?: string }>;
    showInFolder(path: string): Promise<{ success: boolean; error?: string }>;
    getSystemInfo(): Promise<SystemInfo>;
  };
  
  settings: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<boolean>;
    getAll(): Promise<Record<string, any>>;
    reset(): Promise<boolean>;
  };
  
  media: {
    getMediaDevices(): Promise<MediaDevicesInfo>;
    checkPermissions(): Promise<MediaPermissions>;
    requestPermissions(): Promise<MediaPermissions>;
  };
  
  updater: {
    checkForUpdates(): Promise<{ available: boolean }>;
    downloadUpdate(): Promise<{ success: boolean; message?: string }>;
    installUpdate(): Promise<{ success: boolean; message?: string }>;
    onUpdateAvailable(callback: (info: any) => void): void;
    onUpdateDownloaded(callback: () => void): void;
  };
  
  onAppStateChange(callback: (state: string) => void): void;
  removeAllListeners(): void;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileResult {
  success: boolean;
  filePath?: string;
  content?: string;
  error?: string;
  canceled?: boolean;
}

export interface ImportResult {
  success: boolean;
  questions?: any[];
  filePath?: string;
  error?: string;
  canceled?: boolean;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  osType: string;
  osRelease: string;
  osArch: string;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  uptime: number;
}

export interface MediaDevicesInfo {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  error?: string;
}

export interface MediaPermissions {
  microphone?: 'granted' | 'denied' | 'unknown';
  camera?: 'granted' | 'denied' | 'unknown';
  error?: string;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  private ipcRenderer?: ElectronAPI;

  constructor(private ngZone: NgZone) {
    if (this.isElectron) {
      this.ipcRenderer = window.electron;
      
      // Listen for menu events
      if (typeof window !== 'undefined' && window.electron) {
        // Set up menu event listeners
        this.setupMenuListeners();
      }
    }
  }

  get isElectron(): boolean {
    return !!(window && window.electron);
  }

  get api(): ElectronAPI | undefined {
    return this.ipcRenderer;
  }

  // Convenience methods for common operations
  async getAppVersion(): Promise<string> {
    if (!this.api) return 'Web Version';
    return this.api.getAppVersion();
  }

  async showNotification(title: string, body: string, options?: NotificationOptions): Promise<boolean> {
    if (!this.api) {
      // Fallback to web notification
      if ('Notification' in window) {
        const notification = new Notification(title, { body, ...options });
        return true;
      }
      return false;
    }
    return this.api.system.showNotification(title, body, options);
  }

  async exportData(data: any, filename = 'interview-results.json'): Promise<FileResult> {
    if (!this.api) {
      // Fallback for web - trigger download
      this.downloadAsFile(data, filename);
      return { success: true, filePath: filename };
    }
    return this.api.fileSystem.exportResults(data, filename);
  }

  async openExternalLink(url: string): Promise<boolean> {
    if (!this.api) {
      window.open(url, '_blank');
      return true;
    }
    const result = await this.api.system.openExternal(url);
    return result.success;
  }

  async getSetting(key: string, defaultValue?: any): Promise<any> {
    if (!this.api) {
      // Fallback to localStorage
      const stored = localStorage.getItem(`setting_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    }
    const value = await this.api.settings.get(key);
    return value !== undefined ? value : defaultValue;
  }

  async setSetting(key: string, value: any): Promise<boolean> {
    if (!this.api) {
      // Fallback to localStorage
      localStorage.setItem(`setting_${key}`, JSON.stringify(value));
      return true;
    }
    return this.api.settings.set(key, value);
  }

  async getSystemInfo(): Promise<SystemInfo | null> {
    if (!this.api) {
      return {
        platform: navigator.platform,
        arch: 'unknown',
        version: 'unknown',
        electronVersion: 'N/A',
        chromeVersion: this.getChromeVersion(),
        nodeVersion: 'N/A',
        osType: navigator.platform,
        osRelease: 'unknown',
        osArch: 'unknown',
        totalMemory: (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 * 1024 * 1024 : 0,
        freeMemory: 0,
        cpuCount: navigator.hardwareConcurrency || 1,
        uptime: 0
      };
    }
    return this.api.system.getSystemInfo();
  }

  async checkMediaPermissions(): Promise<MediaPermissions> {
    if (!this.api) {
      // Web API fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return { microphone: 'granted' };
      } catch {
        return { microphone: 'denied' };
      }
    }
    return this.api.media.checkPermissions();
  }

  async requestMediaPermissions(): Promise<MediaPermissions> {
    if (!this.api) {
      return this.checkMediaPermissions();
    }
    return this.api.media.requestPermissions();
  }

  private setupMenuListeners(): void {
    // Listen for menu events from Electron
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.source === window && event.data.type) {
          this.ngZone.run(() => {
            this.handleMenuEvent(event.data.type);
          });
        }
      });
    }
  }

  private handleMenuEvent(eventType: string): void {
    // Emit custom events that Angular components can listen to
    const customEvent = new CustomEvent('electron-menu', {
      detail: { action: eventType }
    });
    window.dispatchEvent(customEvent);
  }

  private downloadAsFile(data: any, filename: string): void {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private getChromeVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    return match ? match[1] : 'unknown';
  }

  // Window management methods
  async minimizeWindow(): Promise<void> {
    if (this.api) {
      await this.api.window.minimize();
    }
  }

  async maximizeWindow(): Promise<void> {
    if (this.api) {
      await this.api.window.maximize();
    }
  }

  async closeWindow(): Promise<void> {
    if (this.api) {
      await this.api.window.close();
    }
  }

  async isWindowMaximized(): Promise<boolean> {
    if (!this.api) return false;
    return this.api.window.isMaximized();
  }

  async setAlwaysOnTop(flag: boolean): Promise<void> {
    if (this.api) {
      await this.api.window.setAlwaysOnTop(flag);
    }
  }
}