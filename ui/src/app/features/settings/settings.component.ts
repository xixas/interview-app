import { Component, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { EvaluatorIpcService } from '../../core/services/evaluator-ipc.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface ApiKeyStatus {
  status: 'none' | 'testing' | 'valid' | 'invalid' | 'error';
  message: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    SelectModule,
    PasswordModule,
    TooltipModule,
    ProgressSpinnerModule,
    PageHeaderComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private evaluatorService = inject(EvaluatorIpcService);

  // Signals for component state
  apiKey = signal<string>('');
  apiKeyStatus = signal<ApiKeyStatus>({ status: 'none', message: '' });
  isSaving = signal<boolean>(false);

  constructor() {
    // Load saved API key on initialization
    this.loadApiKey();
  }

  async loadApiKey() {
    try {
      if (this.isElectronMode()) {
        const result = await window.electron?.settings?.get('openai_api_key');
        if (result) {
          this.apiKey.set(result);
          // Set status to show that key is loaded but not tested
          this.apiKeyStatus.set({ 
            status: 'none', 
            message: 'API key loaded. Click Test to verify.' 
          });
        }
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  }

  async testApiKey() {
    if (!this.apiKey().trim()) return;

    this.apiKeyStatus.set({ status: 'testing', message: 'Validating API key format and authenticating with OpenAI...' });

    try {
      if (this.isElectronMode()) {
        // Use IPC to validate API key through Electron (format + actual API call)
        const result = await this.evaluatorService.validateApiKey();
        
        if (result.valid) {
          this.apiKeyStatus.set({ 
            status: 'valid', 
            message: result.keyPreview 
              ? `${result.message} Key: ${result.keyPreview}` 
              : result.message
          });
        } else {
          this.apiKeyStatus.set({ 
            status: 'invalid', 
            message: result.message 
          });
        }
      } else {
        // Web mode - can't test directly, just validate format
        if (this.apiKey().startsWith('sk-') && this.apiKey().length > 20) {
          this.apiKeyStatus.set({ 
            status: 'valid', 
            message: 'API key format is valid (testing requires desktop mode).' 
          });
        } else {
          this.apiKeyStatus.set({ 
            status: 'invalid', 
            message: 'API key format appears invalid. Should start with "sk-".' 
          });
        }
      }
    } catch (error) {
      console.error('API key test failed:', error);
      this.apiKeyStatus.set({ 
        status: 'error', 
        message: 'Failed to test API key. Please check your connection.' 
      });
    }
  }

  async saveApiKey() {
    if (!this.apiKey().trim()) return;

    this.isSaving.set(true);

    try {
      if (this.isElectronMode()) {
        const success = await window.electron?.settings?.set('openai_api_key', this.apiKey().trim());
        if (success) {
          this.apiKeyStatus.set({ 
            status: 'valid', 
            message: 'API key saved successfully!' 
          });
          
          // Update the evaluator service with the new API key
          await this.notifyEvaluatorService();
        } else {
          throw new Error('Failed to save API key');
        }
      } else {
        // Web mode - save to localStorage as fallback
        localStorage.setItem('openai_api_key', this.apiKey());
        this.apiKeyStatus.set({ 
          status: 'valid', 
          message: 'API key saved (web mode - limited functionality)' 
        });
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      this.apiKeyStatus.set({ 
        status: 'error', 
        message: 'Failed to save API key. Please try again.' 
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  async notifyEvaluatorService() {
    // Notify the evaluator service that the API key has been updated
    try {
      if (window.electronAPI?.evaluator) {
        // The evaluator will automatically use the new key from settings
        console.log('API key updated - evaluator service will use new key');
      }
    } catch (error) {
      console.error('Failed to notify evaluator service:', error);
    }
  }

  clearApiKey() {
    this.apiKey.set('');
    this.apiKeyStatus.set({ status: 'none', message: '' });
    
    // Also clear from storage
    if (this.isElectronMode()) {
      window.electron?.settings?.set('openai_api_key', '');
    } else {
      localStorage.removeItem('openai_api_key');
    }
  }

  openOpenAIWebsite() {
    const url = 'https://platform.openai.com/api-keys';
    if (this.isElectronMode()) {
      window.electron?.system?.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }

  isElectronMode(): boolean {
    return !!(window.electronAPI || window.electron);
  }

  hasValidApiKey(): boolean {
    return this.apiKeyStatus().status === 'valid' && this.apiKey().trim().length > 0;
  }
}