import { Injectable, inject } from '@angular/core';
import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class DebugService {
  private env = inject(EnvironmentService);

  constructor() {
    if (!this.env.production) {
      this.logEnvironmentInfo();
    }
  }

  private logEnvironmentInfo() {
    const info = this.env.getEnvironmentInfo();
    
    console.group('🔧 Interview App Environment Configuration');
    console.log('Environment:', info['production'] ? 'Production' : 'Development');
    console.log('API URL:', info['apiUrl']);
    console.log('Evaluator URL:', info['evaluatorUrl']);
    console.log('App Name:', info['appName']);
    console.log('Version:', info['version']);
    
    console.group('🎛️ Feature Flags');
    Object.entries(info['features']).forEach(([key, value]) => {
      console.log(`${key}:`, value ? '✅ Enabled' : '❌ Disabled');
    });
    console.groupEnd();
    
    console.group('⚖️ Limits');
    console.log('Max Questions:', info['limits']['maxQuestions']);
    console.log('Max Session Time:', `${info['limits']['maxSessionTime'] / 60} minutes`);
    console.log('Max File Size:', `${(info['limits']['maxFileSize'] / 1024 / 1024).toFixed(1)} MB`);
    console.groupEnd();
    
    if (info['isElectron']) {
      console.group('🖥️ Electron Configuration');
      console.log('Is Development:', info['electron']?.['isDevelopment']);
      console.log('Auto Start:', info['electron']?.['autoStart']);
      console.log('Show Dev Tools:', info['electron']?.['showDevTools']);
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  logApiCall(endpoint: string, method: string = 'GET') {
    if (!this.env.production) {
      console.log(`🌐 API Call: ${method} ${endpoint}`);
    }
  }

  logFeatureUsage(feature: string, enabled: boolean) {
    if (!this.env.production) {
      console.log(`🎛️ Feature ${feature}: ${enabled ? '✅ Used' : '❌ Skipped'}`);
    }
  }

  logPerformance(operation: string, startTime: number) {
    if (!this.env.production) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ Performance: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  warn(message: string, ...args: any[]) {
    if (!this.env.production) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  error(message: string, error?: any) {
    console.error(`❌ ${message}`, error);
  }
}