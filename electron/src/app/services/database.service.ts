import { join } from 'path';
import { app } from 'electron';
import { existsSync, statSync, constants, accessSync } from 'fs';

// Define Question interface matching current API structure
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

export interface Technology {
  id: number;
  name: string;
  totalQuestions?: number;
}

export class DatabaseService {
  private initialized = false;
  private apiUrl = 'http://localhost:3000/api';

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if the database file exists (for validation)
      const dbPath = this.getDatabasePath();
      if (!existsSync(dbPath)) {
        console.error('[DB-INIT] Database file not found!');
        throw new Error(`Database file not found at: ${dbPath}. Please ensure the database file is properly placed.`);
      }
      // Test API server connectivity
      try {
        const response = await fetch(`${this.apiUrl}/health`);
        if (!response.ok) {
          throw new Error(`API server responded with status ${response.status}`);
        }
      } catch (apiError) {
        console.error('[DB-INIT] API server connection failed:', apiError);
        throw new Error(`Cannot connect to API server: ${apiError.message}`);
      }

      this.initialized = true;
      
    } catch (error) {
      console.error('[DB-INIT] Database initialization failed:', error);
      console.error('[DB-INIT] Error details:', {
        name: error.name,
        message: error.message
      });
      throw error;
    }
  }


  private getDatabasePath(): string {
    if (app.isPackaged || process.env.APPIMAGE || process.env.APPDIR) {
      // In packaged app or AppImage, use the questions.db from resources/assets
      return join(process.resourcesPath, 'assets', 'questions.db');
    } else {
      // In development, use the questions.db path
      return join(__dirname, '..', '..', 'api', 'src', 'assets', 'questions.db');
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
  }

async getTechnologies(): Promise<Array<{ name: string; totalQuestions: number }>> {
  this.ensureInitialized();
  
  try {
    const response = await fetch(`${this.apiUrl}/questions/technologies`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const technologies = await response.json();
    
    return technologies.map((tech: any) => ({
      name: tech.name,
      totalQuestions: tech.totalQuestions || 0
    }));
  } catch (error) {
    console.error('[DB-SERVICE] Error fetching technologies:', error);
    throw error;
  }
}
async getRandomQuestions(filters: { count?: number; technology?: string; difficulty?: string; }): Promise<Question[]> {
  this.ensureInitialized();
  
  try {
    // Build query parameters
    const searchParams = new URLSearchParams();
    if (filters.count) searchParams.append('count', filters.count.toString());
    if (filters.technology && filters.technology !== 'ALL') searchParams.append('technology', filters.technology);
    if (filters.difficulty && filters.difficulty !== 'ALL') searchParams.append('difficulty', filters.difficulty);
    
    const response = await fetch(`${this.apiUrl}/questions/random?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const questions = await response.json();
    
    return questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      answer: q.answer || '',
      difficulty: q.difficulty || 'Advanced',
      category: q.category || 'General',
      example: q.example,
      expectedTopics: q.expectedTopics || [],
      hints: q.hints || [],
      timeLimit: q.timeLimit || 300,
      createdAt: q.createdAt ? new Date(q.createdAt) : undefined,
      updatedAt: q.updatedAt ? new Date(q.updatedAt) : undefined
    }));
  } catch (error) {
    console.error('[DB-SERVICE] Error fetching random questions:', error);
    throw error;
  }
}


  async getQuestionsByTechnology(technology: string): Promise<Question[]> {
    this.ensureInitialized();
    console.log(`[DB-SERVICE] Fetching questions for technology: ${technology}`);

    try {
      const response = await fetch(`${this.apiUrl}/questions/technology/${encodeURIComponent(technology)}`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const questions = await response.json();
      console.log(`[DB-SERVICE] Successfully fetched ${questions.length} questions for ${technology}`);
      
      return questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        answer: q.answer || '',
        difficulty: q.difficulty || 'Advanced',
        category: q.category || technology,
        example: q.example,
        expectedTopics: q.expectedTopics || [],
        hints: q.hints || [],
        timeLimit: q.timeLimit || 300,
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
        updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date()
      }));

    } catch (error) {
      console.error(`[DB-SERVICE] Error getting questions for technology '${technology}':`, error);
      throw error;
    }
  }


  async close(): Promise<void> {
    if (this.initialized) {
      this.initialized = false;
      console.log('[DB-SERVICE] HTTP-based database service closed');
    }
  }
}