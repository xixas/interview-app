import { Injectable, signal } from '@angular/core';

export interface AppSettings {
  openaiApiKey?: string;
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  notifications: boolean;
  autoStart: boolean;
  apiUrl: string;
  evaluatorUrl: string;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  message: string;
  hasCredits?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly _settings = signal<AppSettings>({
    theme: 'system',
    accentColor: 'purple',
    notifications: true,
    autoStart: false,
    apiUrl: 'http://localhost:3000',
    evaluatorUrl: 'http://localhost:3001'
  });

  settings = this._settings.asReadonly();

  constructor() {
    this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    try {
      if (this.isElectronMode()) {
        // Load from Electron secure storage
        const electronSettings = await window.electron?.settings?.getAll();
        if (electronSettings) {
          this._settings.update(current => ({
            ...current,
            ...electronSettings,
            openaiApiKey: electronSettings['openai_api_key'] || current.openaiApiKey
          }));
        }
      } else {
        // Load from localStorage for web mode
        const webSettings = this.loadWebSettings();
        if (webSettings) {
          this._settings.update(current => ({ ...current, ...webSettings }));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings(newSettings: Partial<AppSettings>): Promise<boolean> {
    try {
      this._settings.update(current => ({ ...current, ...newSettings }));

      if (this.isElectronMode()) {
        // Save to Electron secure storage
        for (const [key, value] of Object.entries(newSettings)) {
          if (key === 'openaiApiKey') {
            await window.electron?.settings?.set('openai_api_key', value);
          } else {
            await window.electron?.settings?.set(key, value);
          }
        }
      } else {
        // Save to localStorage for web mode
        this.saveWebSettings(this._settings());
      }

      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  async getApiKey(): Promise<string | null> {
    try {
      if (this.isElectronMode()) {
        return await window.electron?.settings?.get('openai_api_key') || null;
      } else {
        return localStorage.getItem('openai_api_key');
      }
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    try {
      if (this.isElectronMode()) {
        const success = await window.electron?.settings?.set('openai_api_key', apiKey);
        if (success) {
          this._settings.update(current => ({ ...current, openaiApiKey: apiKey }));
          return true;
        }
        return false;
      } else {
        localStorage.setItem('openai_api_key', apiKey);
        this._settings.update(current => ({ ...current, openaiApiKey: apiKey }));
        return true;
      }
    } catch (error) {
      console.error('Failed to set API key:', error);
      return false;
    }
  }

  async clearApiKey(): Promise<boolean> {
    try {
      if (this.isElectronMode()) {
        const success = await window.electron?.settings?.set('openai_api_key', '');
        if (success) {
          this._settings.update(current => ({ ...current, openaiApiKey: undefined }));
          return true;
        }
        return false;
      } else {
        localStorage.removeItem('openai_api_key');
        this._settings.update(current => ({ ...current, openaiApiKey: undefined }));
        return true;
      }
    } catch (error) {
      console.error('Failed to clear API key:', error);
      return false;
    }
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    // Basic format validation
    if (!apiKey || !apiKey.trim()) {
      return { isValid: false, message: 'API key is required' };
    }

    if (!apiKey.startsWith('sk-')) {
      return { isValid: false, message: 'API key should start with "sk-"' };
    }

    if (apiKey.length < 40) {
      return { isValid: false, message: 'API key appears too short' };
    }

    try {
      if (this.isElectronMode() && window.electronAPI?.evaluator) {
        // Test with actual API call
        const testResult = await window.electronAPI.evaluator.evaluateAnswer({
          questionId: 'api_test',
          question: 'Test question for API validation',
          answer: 'Test answer to validate API key functionality',
          technology: 'General'
        });

        if (testResult.success) {
          return { 
            isValid: true, 
            message: 'API key is valid and working',
            hasCredits: true
          };
        } else {
          return { 
            isValid: false, 
            message: testResult.error || 'API key validation failed'
          };
        }
      } else {
        // Basic format validation for web mode
        return { 
          isValid: true, 
          message: 'API key format is valid (full validation requires desktop mode)'
        };
      }
    } catch (error) {
      console.error('API key validation error:', error);
      return { 
        isValid: false, 
        message: 'Failed to validate API key - please check your connection'
      };
    }
  }

  async testApiConnection(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return false;
      }

      const validationResult = await this.validateApiKey(apiKey);
      return validationResult.isValid;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  hasApiKey(): boolean {
    const settings = this._settings();
    return !!(settings.openaiApiKey && settings.openaiApiKey.trim().length > 0);
  }

  async resetSettings(): Promise<boolean> {
    try {
      const defaultSettings: AppSettings = {
        theme: 'system',
        accentColor: 'purple',
        notifications: true,
        autoStart: false,
        apiUrl: 'http://localhost:3000',
        evaluatorUrl: 'http://localhost:3001'
      };

      if (this.isElectronMode()) {
        const success = await window.electron?.settings?.reset();
        if (success) {
          this._settings.set(defaultSettings);
          return true;
        }
        return false;
      } else {
        localStorage.clear();
        this._settings.set(defaultSettings);
        return true;
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  }

  async exportSettings(): Promise<string | null> {
    try {
      const settings = this._settings();
      // Don't export the API key for security
      const exportData = {
        ...settings,
        openaiApiKey: undefined,
        exportedAt: new Date().toISOString(),
        version: '2.0'
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export settings:', error);
      return null;
    }
  }

  async importSettings(settingsData: string): Promise<boolean> {
    try {
      const importedSettings = JSON.parse(settingsData);
      
      // Validate imported settings structure
      if (typeof importedSettings !== 'object' || !importedSettings) {
        throw new Error('Invalid settings format');
      }

      // Remove sensitive data and metadata
      const { openaiApiKey, exportedAt, version, ...validSettings } = importedSettings;
      
      return await this.saveSettings(validSettings);
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  private isElectronMode(): boolean {
    return !!(window.electronAPI || window.electron);
  }

  private loadWebSettings(): Partial<AppSettings> | null {
    try {
      const stored = localStorage.getItem('app_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Also check for API key in separate storage
        const apiKey = localStorage.getItem('openai_api_key');
        return {
          ...parsed,
          openaiApiKey: apiKey || parsed.openaiApiKey
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to load web settings:', error);
      return null;
    }
  }

  private saveWebSettings(settings: AppSettings): void {
    try {
      // Save settings without API key
      const { openaiApiKey, ...settingsToSave } = settings;
      localStorage.setItem('app_settings', JSON.stringify(settingsToSave));
      
      // Save API key separately for security
      if (openaiApiKey) {
        localStorage.setItem('openai_api_key', openaiApiKey);
      }
    } catch (error) {
      console.error('Failed to save web settings:', error);
    }
  }

  // Get environment information
  getEnvironmentInfo(): {
    mode: 'desktop' | 'web';
    hasApiKey: boolean;
    apiKeyValid?: boolean;
    services: {
      database: boolean;
      evaluator: boolean;
    };
  } {
    const isElectron = this.isElectronMode();
    const hasApiKey = this.hasApiKey();

    return {
      mode: isElectron ? 'desktop' : 'web',
      hasApiKey,
      services: {
        database: isElectron,
        evaluator: isElectron
      }
    };
  }
}