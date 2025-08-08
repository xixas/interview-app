import { Injectable, inject, Optional } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ENVIRONMENT } from '../tokens/environment.token';

export interface AppEnvironment {
  production: boolean;
  apiUrl: string;
  evaluatorUrl: string;
  appName: string;
  version: string;
  features: {
    audioRecording: boolean;
    aiAnalysis: boolean;
    darkMode: boolean;
    electronIntegration: boolean;
  };
  limits: {
    maxQuestions: number;
    maxSessionTime: number;
    maxFileSize: number;
  };
  electron?: {
    isDevelopment: boolean;
    autoStart: boolean;
    showDevTools: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly env: AppEnvironment = inject(ENVIRONMENT, { optional: true }) ?? environment;

  // Environment properties
  get production(): boolean {
    return this.env.production;
  }

  get development(): boolean {
    return !this.env.production;
  }

  get apiUrl(): string {
    return this.env.apiUrl;
  }

  get evaluatorUrl(): string {
    return this.env.evaluatorUrl;
  }

  get appName(): string {
    return this.env.appName;
  }

  get version(): string {
    return this.env.version;
  }

  // Feature flags
  get features() {
    return this.env.features;
  }

  isFeatureEnabled(feature: keyof AppEnvironment['features']): boolean {
    return this.env.features[feature] === true;
  }

  // Application limits
  get limits() {
    return this.env.limits;
  }

  // Electron specific
  get electron() {
    return this.env.electron;
  }

  get isElectron(): boolean {
    return this.env.features.electronIntegration && !!this.env.electron;
  }

  // API endpoint builders
  getApiEndpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${cleanPath}`;
  }

  getEvaluatorEndpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.evaluatorUrl}${cleanPath}`;
  }

  // Validation helpers
  validateQuestionCount(count: number): boolean {
    return count > 0 && count <= this.limits.maxQuestions;
  }

  validateSessionTime(seconds: number): boolean {
    return seconds > 0 && seconds <= this.limits.maxSessionTime;
  }

  validateFileSize(bytes: number): boolean {
    return bytes > 0 && bytes <= this.limits.maxFileSize;
  }

  // Debug information
  getEnvironmentInfo(): Record<string, any> {
    return {
      production: this.production,
      apiUrl: this.apiUrl,
      evaluatorUrl: this.evaluatorUrl,
      appName: this.appName,
      version: this.version,
      features: this.features,
      limits: this.limits,
      isElectron: this.isElectron,
      electron: this.electron
    };
  }
}