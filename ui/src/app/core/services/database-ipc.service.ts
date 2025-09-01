import { Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

// Global type declarations for electron API
declare global {
  interface Window {
    electronAPI?: {
      database: {
        initialize: () => Promise<{ success: boolean; error?: string; message?: string }>;
        getTechnologies: () => Promise<{ success: boolean; data?: Array<{ name: string; totalQuestions: number }>; error?: string }>;
        getRandomQuestions: (filters: any) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getQuestionsByTechnology: (technology: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };
      evaluator: {
        transcribeAudio: (audioData: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        evaluateAnswer: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        evaluateAudioAnswer: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        batchEvaluate: (evaluations: any[]) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        generateSummary: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        validateKey: () => Promise<{ success: boolean; valid?: boolean; message?: string; keyPreview?: string; error?: string }>;
      };
    };
  }
}

export interface TechnologyStats {
  name: string;
  totalQuestions: number;
}

export interface Question {
  id: number;
  question: string;
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
    if (this.initialized) return;

    if (!window.electronAPI?.database) {
      throw new Error('Database IPC not available. Are you running in Electron?');
    }

    const result = await window.electronAPI.database.initialize();
    if (!result.success) {
      throw new Error(result.error || 'Database initialization failed');
    }

    this.initialized = true;
    console.log('Database IPC service initialized successfully');
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
      const result = await window.electronAPI.database.getTechnologies();
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
    console.log({filters})
    if (!this.initialized) {
      await this.initialize();
    }

    if (!window.electronAPI?.database) {
      throw new Error('Database not available. Please ensure you are running in desktop mode.');
    }

    const result = await window.electronAPI.database.getRandomQuestions(filters);
    console.log({result})
    if (!result.success) {
      throw new Error(`Failed to get random questions from database: ${result.error}`);
    }

    return result.data || [];
  }

  async getQuestionsByTechnology(technology: string): Promise<Question[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!window.electronAPI?.database) {
      throw new Error('Database not available. Please ensure you are running in desktop mode.');
    }

    const result = await window.electronAPI.database.getQuestionsByTechnology(technology);
    if (!result.success) {
      throw new Error(`Failed to get questions by technology '${technology}': ${result.error}`);
    }

    return result.data || [];
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