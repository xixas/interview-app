import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';

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
export class QuestionsApiService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private baseUrl = 'http://localhost:3000/api/questions';

  constructor() {
    console.log('QuestionsApiService: Service initialized');
    this.initializeServiceConfig();
  }

  private configInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private async initializeServiceConfig(): Promise<void> {
    if (this.configInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitializeServiceConfig();
    return this.initializationPromise;
  }

  private async doInitializeServiceConfig(): Promise<void> {
    try {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron?.system?.getServiceConfig) {
        const configResult = await (window as any).electron.system.getServiceConfig();
        if (configResult.success && configResult.data) {
          this.baseUrl = `${configResult.data.apiUrl}/questions`;
          console.log('QuestionsApiService: Using dynamic API URL:', this.baseUrl);
        } else {
          console.warn('QuestionsApiService: Failed to get service config, using default ports');
        }
      } else {
        console.log('QuestionsApiService: Not in Electron environment, using default URL');
      }
      this.configInitialized = true;
    } catch (error) {
      console.error('QuestionsApiService: Failed to initialize service config:', error);
      this.configInitialized = true; // Mark as initialized to avoid infinite retry
    }
  }

  private async ensureConfigReady(): Promise<void> {
    if (!this.configInitialized) {
      await this.initializeServiceConfig();
    }
  }

  async getTechnologies(): Promise<TechnologyStats[]> {
    try {
      console.log('QuestionsApiService: Getting technologies...');
      
      // Ensure service config is ready
      await this.ensureConfigReady();
      
      const response = await firstValueFrom(
        this.http.get<TechnologyStats[]>(`${this.baseUrl}/technologies`)
      );

      console.log('QuestionsApiService: Technologies retrieved:', response);
      return response || [];
    } catch (error) {
      console.error('QuestionsApiService: Error getting technologies:', error);
      throw new Error(`Failed to get technologies from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRandomQuestions(filters: {
    count?: number;
    technology?: string;
    difficulty?: string;
  }): Promise<Question[]> {
    try {
      console.log('QuestionsApiService: Getting random questions with filters:', filters);
      
      // Ensure service config is ready
      await this.ensureConfigReady();
      
      const params: any = {};
      if (filters.count) params.count = filters.count.toString();
      if (filters.technology && filters.technology !== 'ALL') params.technology = filters.technology;
      if (filters.difficulty && filters.difficulty !== 'ALL') params.difficulty = filters.difficulty;
      
      const response = await firstValueFrom(
        this.http.get<Question[]>(`${this.baseUrl}/random`, { params })
      );

      console.log('QuestionsApiService: Random questions retrieved:', response.length);
      return response || [];
    } catch (error) {
      console.error('QuestionsApiService: Error getting random questions:', error);
      throw new Error(`Failed to get random questions from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQuestionsByTechnology(technology: string): Promise<Question[]> {
    try {
      console.log('QuestionsApiService: Getting questions by technology:', technology);
      
      // Ensure service config is ready
      await this.ensureConfigReady();
      
      const response = await firstValueFrom(
        this.http.get<Question[]>(`${this.baseUrl}/technology/${encodeURIComponent(technology)}`)
      );

      console.log('QuestionsApiService: Questions by technology retrieved:', response.length);
      return response || [];
    } catch (error) {
      console.error('QuestionsApiService: Error getting questions by technology:', error);
      throw new Error(`Failed to get questions by technology '${technology}' from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if service is available
  async isServiceAvailable(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(`${this.baseUrl}/../health`)
      );
      return true;
    } catch (error) {
      console.error('QuestionsApiService: Service unavailable:', error);
      return false;
    }
  }

  // Get environment info
  getEnvironmentInfo(): { isAPIMode: boolean; hasService: boolean } {
    return {
      isAPIMode: true, // This service always uses API
      hasService: true // Will be validated by calling isServiceAvailable()
    };
  }
}