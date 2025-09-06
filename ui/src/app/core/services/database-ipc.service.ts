import { Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import '../types/electron.types';

export interface TechnologyStats {
  name: string;
  totalQuestions: number;
}

export interface Question {
  id: number;
  question: string;
  answer: string; // Reference answer from database
  difficulty: 'Fundamental' | 'Advanced' | 'Extensive';
  category: string;
  example?: string;
  expectedTopics?: string[];
  hints?: string[];
  timeLimit?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseIpcService {
  private readonly notificationService = inject(NotificationService);
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[FRONTEND-DB] Already initialized, skipping...');
      return;
    }

    if (!window.electronAPI?.database) {
      throw new Error('Database IPC not available. Are you running in Electron?');
    }

    const startTime = Date.now();
    
    try {
      const result = await window.electronAPI.database.initialize();
      const endTime = Date.now();
      
      
      if (!result.success) {
        throw new Error(result.error || 'Database initialization failed');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[FRONTEND-DB] Error during IPC call:', error);
      throw error;
    }
  }

  async getTechnologies(): Promise<TechnologyStats[]> {
    try {
      console.log('DatabaseIpcService: Getting technologies...');
      
      if (!this.initialized) {
        console.log('DatabaseIpcService: Not initialized, initializing...');
        await this.initialize();
      }

      if (!window.electronAPI?.database) {
        throw new Error('Database not available. Please ensure you are running in desktop mode.');
      }

      console.log('DatabaseIpcService: Calling electronAPI.database.getTechnologies()');
      const result = await this.executeWithTimeout(
        window.electronAPI.database.getTechnologies(),
        15000,
        'Get technologies'
      );
      console.log('DatabaseIpcService: IPC result:', result);
      
      if (!result.success) {
        throw new Error(`Failed to get technologies from database: ${result.error}`);
      }

      console.log('DatabaseIpcService: Returning data:', result.data);
      return result.data || [];
    } catch (error) {
      console.error('DatabaseIpcService: Error in getTechnologies:', error);
      throw error;
    }
  }

  async getRandomQuestions(filters: {
    count?: number;
    technology?: string;
    difficulty?: string;
  }): Promise<Question[]> {
    console.log('DatabaseIpcService: Getting random questions with filters:', filters);
    if (!this.initialized) {
      await this.initialize();
    }

    if (!window.electronAPI?.database) {
      throw new Error('Database not available. Please ensure you are running in desktop mode.');
    }

    const result = await this.executeWithTimeout(
      window.electronAPI.database.getRandomQuestions(filters),
      20000,
      'Get random questions'
    );
    console.log('DatabaseIpcService: Random questions result:', result);
    
    if (!result.success) {
      throw new Error(`Failed to get random questions from database: ${result.error}`);
    }

    return result.data || [];
  }

  async getQuestionsByTechnology(technology: string): Promise<Question[]> {
    console.log('DatabaseIpcService: Getting questions by technology:', technology);
    if (!this.initialized) {
      await this.initialize();
    }

    if (!window.electronAPI?.database) {
      throw new Error('Database not available. Please ensure you are running in desktop mode.');
    }

    const result = await this.executeWithTimeout(
      window.electronAPI.database.getQuestionsByTechnology(technology),
      20000,
      'Get questions by technology'
    );
    console.log('DatabaseIpcService: Questions by technology result:', result);
    
    if (!result.success) {
      throw new Error(`Failed to get questions by technology '${technology}': ${result.error}`);
    }

    return result.data || [];
  }


  /**
   * Execute IPC operation with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<any>,
    timeout: number,
    operationName: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeout}ms`));
      }, timeout);

      promise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // Check if running in Electron environment
  isElectronAvailable(): boolean {
    return !!(window.electronAPI && window.electronAPI.database);
  }

  // Get environment info
  getEnvironmentInfo(): { isElectron: boolean; hasDatabase: boolean } {
    const isElectron = this.isElectronAvailable();
    return {
      isElectron,
      hasDatabase: isElectron && this.initialized,
    };
  }
}